import React, { useState, useEffect } from 'react';
import { UserCheck, XCircle, Loader2 } from 'lucide-react';

interface CheckInFormProps {
  isCheckedIn: boolean;
  userNickname: string;
  isProcessing: boolean;
  onCheckIn: (nickname: string) => void;
  onCancel: () => void;
  serverError: string | null;
}

const CheckInForm: React.FC<CheckInFormProps> = ({
  isCheckedIn,
  userNickname,
  isProcessing,
  onCheckIn,
  onCancel,
  serverError
}) => {
  const [nicknameInput, setNicknameInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Pre-fill nickname if user has checked in previously or has a stored nickname
  useEffect(() => {
    if (userNickname) {
      setNicknameInput(userNickname);
    }
  }, [userNickname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!nicknameInput.trim()) {
      setLocalError('닉네임을 입력해주세요.');
      return;
    }
    
    if (nicknameInput.length > 10) {
      setLocalError('닉네임은 10글자 이하로 입력해주세요.');
      return;
    }

    onCheckIn(nicknameInput.trim());
  };

  // If checked in, show the cancellation state
  if (isCheckedIn) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCheck size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-1">출석이 완료되었습니다!</h3>
        <p className="text-slate-500 mb-6">
          닉네임: <span className="font-semibold text-slate-700">{userNickname}</span>
        </p>

        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border-2 border-red-100 text-red-600 font-semibold hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <XCircle size={20} />
              <span>출석 취소하기</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // If not checked in, show the form
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4">오늘 모임 참석하기</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-slate-500 mb-1">
            닉네임
          </label>
          <input
            id="nickname"
            type="text"
            placeholder="예: 민턴왕"
            value={nicknameInput}
            onChange={(e) => {
                setNicknameInput(e.target.value);
                setLocalError(null);
            }}
            disabled={isProcessing}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {localError && <p className="mt-2 text-sm text-red-500">{localError}</p>}
          {serverError && <p className="mt-2 text-sm text-red-500">{serverError}</p>}
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-slate-200 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center space-x-2"
        >
           {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>처리 중...</span>
            </>
          ) : (
            <span>출석하기</span>
          )}
        </button>
      </form>
    </div>
  );
};

export default CheckInForm;