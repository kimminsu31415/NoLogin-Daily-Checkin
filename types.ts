export interface Attendee {
  userId: string;
  nickname: string;
  timestamp: number;
}

export interface CheckInResponse {
  success: boolean;
  message?: string;
  data?: Attendee[];
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  count: number;
  attendees: Attendee[];
}