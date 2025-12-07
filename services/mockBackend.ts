import { Attendee, DailyStats, CheckInResponse } from '../types';

/**
 * SIMULATED BACKEND
 * In a real app, this would be Firebase or a REST API.
 * Here, we use localStorage key 'mock_server_db' to simulate a shared database
 * so the data persists across refreshes for demonstration.
 */

const DB_KEY = 'mock_server_db';

const getTodayString = (): string => {
  const now = new Date();
  // Returns YYYY-MM-DD in local time
  return now.toLocaleDateString('en-CA');
};

const getDb = (): DailyStats => {
  const today = getTodayString();
  const json = localStorage.getItem(DB_KEY);
  
  if (json) {
    const data = JSON.parse(json) as DailyStats;
    // Auto-reset if the date stored is not today
    if (data.date !== today) {
      const newData: DailyStats = { date: today, count: 0, attendees: [] };
      saveDb(newData);
      return newData;
    }
    return data;
  }

  // Initialize if empty
  const initial: DailyStats = { date: today, count: 0, attendees: [] };
  saveDb(initial);
  return initial;
};

const saveDb = (data: DailyStats) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchAttendees = async (): Promise<Attendee[]> => {
  await delay(400); // Simulate API latency
  const db = getDb();
  // Sort by timestamp descending (newest first)
  return db.attendees.sort((a, b) => b.timestamp - a.timestamp);
};

export const checkInUser = async (userId: string, nickname: string): Promise<CheckInResponse> => {
  await delay(600); // Simulate API processing
  const db = getDb();

  // 1. Check if User ID already checked in today
  const existingId = db.attendees.find(a => a.userId === userId);
  if (existingId) {
    return { success: false, message: '이미 오늘 출석을 완료하셨습니다.' };
  }

  // 2. Check if Nickname is taken today (prevent impersonation/duplication by name)
  const existingName = db.attendees.find(a => a.nickname.toLowerCase() === nickname.toLowerCase());
  if (existingName) {
    return { success: false, message: '이미 사용 중인 닉네임입니다. (본인이 아니라면 다른 닉네임을 사용해주세요)' };
  }

  const newAttendee: Attendee = {
    userId,
    nickname,
    timestamp: Date.now()
  };

  db.attendees.push(newAttendee);
  db.count = db.attendees.length;
  saveDb(db);

  return { success: true, data: db.attendees };
};

export const cancelCheckInUser = async (userId: string): Promise<CheckInResponse> => {
  await delay(500);
  const db = getDb();

  const index = db.attendees.findIndex(a => a.userId === userId);
  if (index === -1) {
    return { success: false, message: '출석 기록을 찾을 수 없습니다.' };
  }

  db.attendees.splice(index, 1);
  db.count = db.attendees.length;
  saveDb(db);

  return { success: true, data: db.attendees };
};