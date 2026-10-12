import React, { useRef } from 'react';
import {
  BookOpen,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  FileText,
  Cloud
} from 'lucide-react';

interface MeetingsNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const MeetingsNavBar: React.FC<MeetingsNavBarProps> = ({
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

  const meetingNavItems = [
    { id: 'personal_meeting', label: 'Sổ họp cá nhân', icon: BookOpen, badge: 'SỔ HỌP' },
    { id: 'department_meeting', label: 'BIÊN BẢN TỔ KHỐI', icon: ClipboardList, badge: 'BIÊN BẢN' }
  ];

  return (
    <div className="sticky top-2 z-20 bg-white/95 backdrop-blur-md border border-teal-200/90 rounded-2xl shadow-md shadow-teal-900/5 p-1.5 sm:p-2 mb-3 transition-all">
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Title badge & Folder indicator */}
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-200/80">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-teal-600/20">
            <BookOpen className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="hidden md:block">
            <h3 className="text-xs font-black text-teal-800 tracking-tight leading-none uppercase">
              THƯ MỤC SỔ HỌP
            </h3>
            <span className="text-[10px] font-bold text-teal-600 block mt-0.5">
              2 mục họp & biên bản
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
          {meetingNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || (currentPage === 'meetings' && item.id === 'personal_meeting');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/20 font-black scale-[1.02]'
                    : 'text-slate-700 hover:text-teal-800 hover:bg-teal-50/80 bg-slate-50 border border-slate-200/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-teal-600'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Scroll Right Button */}
        <button
          type="button"
          onClick={() => scrollNav('right')}
          className="p-1 rounded-lg bg-teal-50/80 text-teal-700 hover:bg-teal-100 shrink-0 cursor-pointer hidden sm:flex items-center justify-center border border-teal-200/60"
          title="Cuộn sang phải"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
