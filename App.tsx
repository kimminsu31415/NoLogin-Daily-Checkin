import React, { useEffect, useState, useCallback } from 'react';
import { getDeviceId, getStoredNickname, setStoredNickname } from './services/storageService';
import { fetchAttendees, checkInUser, cancelCheckInUser } from './services/mockBackend';
import { Attendee } from './types';

// Components
import Header from './components/Header';
import StatsCard from './components/StatsCard';
import CheckInForm from './components/CheckInForm';
import AttendeeList from './components/AttendeeList';

const App: React.FC = () => {
  // Application State
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // User State
  const deviceId = getDeviceId(); // Stable ID from localStorage
  const [nickname, setNickname] = useState<string>('');
  
  // Derived State
  const currentUserRecord = attendees.find(a => a.userId === deviceId);
  const isCheckedIn = !!currentUserRecord;

  // Initialize
  useEffect(() => {
    const savedName = getStoredNickname();
    if (savedName) setNickname(savedName);
    loadData();
    
    // Auto-refresh every 30 seconds to simulate real-time
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchAttendees();
      setAttendees(data);
    } catch (err) {
      console.error("Failed to fetch attendees", err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCheckIn = useCallback(async (name: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await checkInUser(deviceId, name);
      
      if (response.success && response.data) {
        setAttendees(response.data);
        setNickname(name);
        setStoredNickname(name); // Persist nickname for next time
      } else {
        setError(response.message || '출석 처리에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  }, [deviceId]);

  const handleCancel = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await cancelCheckInUser(deviceId);
      if (response.success && response.data) {
        setAttendees(response.data);
      } else {
        setError(response.message || '취소 처리에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  }, [deviceId]);

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-md">
        
        <Header />

        <main>
          <StatsCard count={attendees.length} />

          <CheckInForm 
            isCheckedIn={isCheckedIn}
            userNickname={nickname}
            isProcessing={isProcessing}
            onCheckIn={handleCheckIn}
            onCancel={handleCancel}
            serverError={error}
          />

          <AttendeeList 
            attendees={attendees} 
            currentUserId={deviceId} 
          />
        </main>

        <footer className="mt-12 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} 아라 배드민턴 클럽.</p>
          <p className="mt-1">익명 출석 체크 시스템</p>
        </footer>

      </div>
    </div>
  );
};

export default App;