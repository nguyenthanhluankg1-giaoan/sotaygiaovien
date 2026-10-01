import React, { useRef } from 'react';
import {
  Gamepad2,
  Sparkles,
  Swords,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Gift,
  Trophy
} from 'lucide-react';

interface GamesNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const GamesNavBar: React.FC<GamesNavBarProps> = ({
  currentPage,
  onNavigate
}) => {
  const navRef = useRef<HTMLDivElement>(null);

  const scrollNav = (direction: 'left' | 'right') => {
    if (navRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      navRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const gameNavItems = [
    { id: 'games', label: 'Tất cả trò chơi', icon: Gamepad2, badge: '' },
    { id: 'wheel', label: 'Vòng quay may mắn', icon: Sparkles, badge: 'HOT' },
    { id: 'film', label: 'Trò chơi Kéo co', icon: Swords, badge: 'HOT' },
    { id: 'worksheets', label: 'Ngân hàng câu hỏi', icon: FileCheck, badge: 'TẠO CH' }
  ];

  return (
    <div className="sticky top-2 z-20 bg-white/95 backdrop-blur-md border border-teal-200/90 rounded-2xl shadow-md shadow-teal-900/5 p-1.5 sm:p-2 mb-3 transition-all">
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Title badge & Folder indicator */}
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-200/80">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-amber-500/20">
            <Gamepad2 className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="hidden md:block">
            <h3 className="text-xs font-black text-teal-800 tracking-tight leading-none uppercase">
              THƯ MỤC TRÒ CHƠI
            </h3>
            <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
              {gameNavItems.length - 1} trò chơi lớp học
            </span>
          </div>
        </div>

        {/* Scroll Left Button for small screens */}
        <button
          type="button"
          onClick={() => scrollNav('left')}
          className="p-1 rounded-lg bg-teal-50/80 text-teal-700 hover:bg-teal-100 shrink-0 cursor-pointer hidden sm:flex items-center justify-center border border-teal-200/60"
          title="Cuộn sang trái"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Horizontal navbar selection list with smooth touch scrolling */}
        <nav
          ref={navRef}
          className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 touch-scroll-x flex-1 min-w-0"
        >
          {gameNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-amber-500/20 font-black scale-[1.02]'
                    : 'text-slate-700 hover:text-amber-700 hover:bg-amber-50/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-amber-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Scroll Right Button for small screens */}
        <button
          type="button"
          onClick={() => scrollNav('right')}
          className="p-1 rounded-lg bg-teal-50/80 text-teal-700 hover:bg-teal-100 shrink-0 cursor-pointer hidden sm:flex items-center justify-center border border-teal-200/60"
          title="Cuộn sang phía phải"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
