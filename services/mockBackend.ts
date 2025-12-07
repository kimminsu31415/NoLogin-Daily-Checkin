import { Attendee, DailyStats, CheckInResponse } from '../types';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, runTransaction, child } from 'firebase/database';

/**
 * ------------------------------------------------------------------
 * [필수 설정] Firebase 콘솔에서 발급받은 설정값을 아래에 입력하세요.
 * 설정값이 비어있으면 자동으로 '로컬 스토리지(기존 방식)'로 동작합니다.
 * ------------------------------------------------------------------
 */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if Firebase is configured (Simple validation)
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && !firebaseConfig.databaseURL.includes("YOUR_PROJECT_ID");

let db: any = null;
if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
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

/**
 * ==========================================
 * MODE 1: FIREBASE BACKEND (Real Sync)
 * ==========================================
 */

const fetchAttendeesFirebase = async (): Promise<Attendee[]> => {
  if (!db) return [];
  const dateKey = getTodayString();
  const snapshot = await get(child(ref(db), `checkins/${dateKey}`));
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    const attendees: Attendee[] = data.attendees || [];
    // Sort by timestamp descending
    return attendees.sort((a, b) => b.timestamp - a.timestamp);
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

      const attendees: Attendee[] = currentData.attendees || [];

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
      const sortedAttendees = (updatedData.attendees || []).sort((a: Attendee, b: Attendee) => b.timestamp - a.timestamp);
      return { success: true, data: sortedAttendees };
    } else {
      // Transaction aborted means duplicate found (usually)
      // We need to fetch current data to know WHICH duplicate it was, or just generic error
      // Ideally we check snapshot, but for simplicity:
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
      if (currentData === null || !currentData.attendees) return;

      const attendees: Attendee[] = currentData.attendees;
      const index = attendees.findIndex(a => a.userId === userId);

      if (index === -1) return; // Not found, abort

      // Remove
      attendees.splice(index, 1);
      
      currentData.attendees = attendees;
      currentData.count = attendees.length;
      return currentData;
    });

    if (result.committed) {
      const updatedData = result.snapshot.val();
      const sortedAttendees = (updatedData?.attendees || []).sort((a: Attendee, b: Attendee) => b.timestamp - a.timestamp);
      return { success: true, data: sortedAttendees };
    } else {
      return { success: false, message: "출석 기록을 찾을 수 없습니다." };
    }
  } catch (error) {
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
  if (isFirebaseConfigured) return fetchAttendeesFirebase();
  return fetchAttendeesLocal();
};

export const checkInUser = async (userId: string, nickname: string): Promise<CheckInResponse> => {
  if (isFirebaseConfigured) return checkInUserFirebase(userId, nickname);
  return checkInUserLocal(userId, nickname);
};

export const cancelCheckInUser = async (userId: string): Promise<CheckInResponse> => {
  if (isFirebaseConfigured) return cancelCheckInUserFirebase(userId);
  return cancelCheckInUserLocal(userId);
};
