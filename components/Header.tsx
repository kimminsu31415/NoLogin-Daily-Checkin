import React from 'react';

const Header: React.FC = () => {
  const today = new Date().toLocaleDateString('ko-KR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="mb-6 text-center">
      <div className="inline-flex items-center justify-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mb-3">
        <span>아라 배드민턴 클럽</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
        일일 출석 체크
      </h1>
      <p className="text-slate-500 mt-2 text-sm md:text-base font-medium">
        {today}
      </p>
    </header>
  );
};

export default Header;