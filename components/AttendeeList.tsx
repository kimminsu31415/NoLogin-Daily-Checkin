import React from 'react';
import { Attendee } from '../types';
import { User } from 'lucide-react';

interface AttendeeListProps {
  attendees: Attendee[];
  currentUserId: string;
}

const AttendeeList: React.FC<AttendeeListProps> = ({ attendees, currentUserId }) => {
  if (attendees.length === 0) {
    return (
      <div className="mt-8 text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <p className="text-slate-400">아직 출석한 인원이 없습니다.</p>
        <p className="text-sm text-slate-400 mt-1">가장 먼저 출석해보세요!</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
        현재 참석자 ({attendees.length})
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {attendees.map((attendee) => {
            const isMe = attendee.userId === currentUserId;
            
            return (
                <div 
                    key={attendee.userId}
                    className={`flex items-center space-x-3 p-3 rounded-xl border ${
                        isMe 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-slate-100'
                    }`}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isMe ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                        <User size={16} />
                    </div>
                    <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                            isMe ? 'text-blue-900' : 'text-slate-700'
                        }`}>
                            {attendee.nickname}
                        </p>
                        <p className="text-[10px] text-slate-400">
                            {new Date(attendee.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default AttendeeList;