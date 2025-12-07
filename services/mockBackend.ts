import { Attendee, DailyStats, CheckInResponse } from '../types';
import * as firebaseApp from 'firebase/app';
import { getDatabase, ref, get, runTransaction, child } from 'firebase/database';

/**
 * ------------------------------------------------------------------
 * [필수 설정] Firebase 콘솔에서 발급받은 설정값을 아래에 입력하세요.
 * ------------------------------------------------------------------
 */
const firebaseConfig = {
  apiKey: "AIzaSyCegAEDOMzPmoYfHGD5n8o5Lwc_jLHNL4A",
  authDomain: "no-login-daily-checkin.firebaseapp.com",
  databaseURL: "https://no-login-daily-checkin-default-rtdb.firebaseio.com",
  projectId: "no-login-daily-checkin",
  storageBucket: "no-login-daily-checkin.firebasestorage.app",
  messagingSenderId: "458264098406",
  appId: "1:458264098406:web:eda4fbbb4ac0941b569fa7",
  measurementId: "G-Z4XHY7KYKH"
};

// Check if Firebase is configured
const isFirebaseConfigured = true;

let db: any = null;

// Firebase initialization logic
if (isFirebaseConfigured) {
  try {
    const app = firebaseApp.initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("🔥 Firebase Connected");
  } catch (e) {
    console.error("Firebase Initialization Error:", e);
  }
} else {
  console.warn("⚠️ Firebase config missing. Falling back to LocalStorage (Offline Mode).");
}

/**
 * UTILITIES
 */
const getTodayString = (): string => {
  // Returns YYYY-MM-DD in local time
  return new Date().toLocaleDateString('en-CA');
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Firebase sometimes stores arrays as objects (if keys are sparse).
// This ensures we always get an Array.
const normalizeAttendees = (data: any): Attendee[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
};

/**
 * ==========================================
 * MODE 1: FIREBASE BACKEND (Real Sync)
 * ==========================================
 */

const fetchAttendeesFirebase = async (): Promise<Attendee[]> => {
  if (!db) return [];
  const dateKey = getTodayString();
  try {
    const snapshot = await get(child(ref(db), `checkins/${dateKey}`));
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const attendees = normalizeAttendees(data.attendees);
      // Sort by timestamp descending
      return attendees.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
  }
  return [];
};

const checkInUserFirebase = async (userId: string, nickname: string): Promise<CheckInResponse> => {
  if (!db) return { success: false, message: "DB 연결 오류" };

  const dateKey = getTodayString();
  const dateRef = ref(db, `checkins/${dateKey}`);

  try {
    // Use transaction to prevent race conditions and duplicates safely
    const result = await runTransaction(dateRef, (currentData) => {
      // If no data exists for today, initialize
      if (currentData === null) {
        return {
          date: dateKey,
          count: 1,
          attendees: [{ userId, nickname, timestamp: Date.now() }]
        };
      }

      // Safe parse attendees
      const attendees = normalizeAttendees(currentData.attendees);

      // 1. Check ID duplicate
      if (attendees.some(a => a.userId === userId)) {
        return; // Abort transaction (return undefined)
      }

      // 2. Check Nickname duplicate
      if (attendees.some(a => a.nickname.toLowerCase() === nickname.toLowerCase())) {
        return; // Abort
      }

      // Add new attendee
      attendees.push({ userId, nickname, timestamp: Date.now() });
      
      // Update state
      currentData.attendees = attendees;
      currentData.count = attendees.length;
      
      return currentData;
    });

    if (result.committed) {
      const updatedData = result.snapshot.val();
      const sortedAttendees = normalizeAttendees(updatedData.attendees).sort((a: Attendee, b: Attendee) => b.timestamp - a.timestamp);
      return { success: true, data: sortedAttendees };
    } else {
      // Transaction aborted means duplicate found (usually)
      return { success: false, message: "이미 출석했거나 중복된 닉네임입니다." };
    }

  } catch (error) {
    console.error("Firebase Checkin Error", error);
    return { success: false, message: "서버 연결에 실패했습니다." };
  }
};

const cancelCheckInUserFirebase = async (userId: string): Promise<CheckInResponse> => {
  if (!db) return { success: false, message: "DB 연결 오류" };

  const dateKey = getTodayString();
  const dateRef = ref(db, `checkins/${dateKey}`);

  try {
    const result = await runTransaction(dateRef, (currentData) => {
      // If data is null, treat as success (already empty)
      if (currentData === null) {
        return { date: dateKey, count: 0, attendees: [] };
      }

      // Safely parse attendees
      const attendees = normalizeAttendees(currentData.attendees);
      
      const index = attendees.findIndex(a => a.userId === userId);

      // If user not found, DO NOT ABORT. 
      // Return the current data as-is so the transaction "commits" successfully.
      // This ensures the client receives the latest list (without the user).
      if (index === -1) {
        currentData.attendees = attendees;
        currentData.count = attendees.length;
        return currentData;
      }

      // Remove item
      attendees.splice(index, 1);
      
      // Update data
      currentData.attendees = attendees;
      currentData.count = attendees.length;
      return currentData;
    });

    // Since we handled the "not found" case inside, committed should be true
    if (result.committed) {
      const updatedData = result.snapshot.val();
      const sortedAttendees = normalizeAttendees(updatedData?.attendees).sort((a: Attendee, b: Attendee) => b.timestamp - a.timestamp);
      return { success: true, data: sortedAttendees };
    } else {
      console.warn("Transaction aborted unexpectedly");
      return { success: false, message: "출석 취소 중 오류가 발생했습니다." };
    }
  } catch (error) {
    console.error("Cancel Check-in Error:", error);
    return { success: false, message: "취소 처리에 실패했습니다." };
  }
};


/**
 * ==========================================
 * MODE 2: LOCAL STORAGE (Fallback)
 * ==========================================
 */
const DB_KEY = 'mock_server_db';

const getLocalDb = (): DailyStats => {
  const today = getTodayString();
  const json = localStorage.getItem(DB_KEY);
  
  if (json) {
    const data = JSON.parse(json) as DailyStats;
    if (data.date !== today) {
      const newData: DailyStats = { date: today, count: 0, attendees: [] };
      saveLocalDb(newData);
      return newData;
    }
    return data;
  }
  const initial: DailyStats = { date: today, count: 0, attendees: [] };
  saveLocalDb(initial);
  return initial;
};

const saveLocalDb = (data: DailyStats) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};

const fetchAttendeesLocal = async (): Promise<Attendee[]> => {
  await delay(400);
  const db = getLocalDb();
  return db.attendees.sort((a, b) => b.timestamp - a.timestamp);
};

const checkInUserLocal = async (userId: string, nickname: string): Promise<CheckInResponse> => {
  await delay(600);
  const db = getLocalDb();

  const existingId = db.attendees.find(a => a.userId === userId);
  if (existingId) return { success: false, message: '이미 오늘 출석을 완료하셨습니다.' };

  const existingName = db.attendees.find(a => a.nickname.toLowerCase() === nickname.toLowerCase());
  if (existingName) return { success: false, message: '이미 사용 중인 닉네임입니다.' };

  const newAttendee: Attendee = { userId, nickname, timestamp: Date.now() };
  db.attendees.push(newAttendee);
  db.count = db.attendees.length;
  saveLocalDb(db);

  return { success: true, data: db.attendees };
};

const cancelCheckInUserLocal = async (userId: string): Promise<CheckInResponse> => {
  await delay(500);
  const db = getLocalDb();
  const index = db.attendees.findIndex(a => a.userId === userId);
  if (index === -1) return { success: false, message: '출석 기록을 찾을 수 없습니다.' };

  db.attendees.splice(index, 1);
  db.count = db.attendees.length;
  saveLocalDb(db);

  return { success: true, data: db.attendees };
};


/**
 * ==========================================
 * MAIN EXPORTS (Switch Logic)
 * ==========================================
 */

export const fetchAttendees = async (): Promise<Attendee[]> => {
  if (isFirebaseConfigured && db) return fetchAttendeesFirebase();
  return fetchAttendeesLocal();
};

export const checkInUser = async (userId: string, nickname: string): Promise<CheckInResponse> => {
  if (isFirebaseConfigured && db) return checkInUserFirebase(userId, nickname);
  return checkInUserLocal(userId, nickname);
};

export const cancelCheckInUser = async (userId: string): Promise<CheckInResponse> => {
  if (isFirebaseConfigured && db) return cancelCheckInUserFirebase(userId);
  return cancelCheckInUserLocal(userId);
};