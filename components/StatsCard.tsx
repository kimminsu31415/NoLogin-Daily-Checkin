import React from 'react';
import { Users } from 'lucide-react';

interface StatsCardProps {
  count: number;
}

const StatsCard: React.FC<StatsCardProps> = ({ count }) => {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 mb-8 transform transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-blue-100 font-medium text-sm uppercase tracking-wider mb-1">
            총 출석 인원
          </p>
          <div className="text-5xl font-bold tabular-nums">
            {count}
          </div>
        </div>
        <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
          <Users className="w-8 h-8 text-white" />
        </div>
      </div>
      <div className="mt-4 text-sm text-blue-100/80">
        매일 자정(00:00) 자동 초기화
      </div>
    </div>
  );
};

export default StatsCard;