import React, { useRef } from 'react';
import {
  Home,
  School,
  GraduationCap,
  ClipboardCheck,
  LayoutGrid,
  CalendarDays,
  FileCheck,
  Gift,
  Sparkles,
  Swords,
  VolumeX,
  Timer,
  Link as LinkIcon,
  BarChart3,
  Database,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';
import { UserAccount } from '../types';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

interface ClassroomNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  studentCount: number;
  currentUser?: UserAccount | null;
  activeClassName?: string;
}

export const ClassroomNavBar: React.FC<ClassroomNavBarProps> = ({
  currentPage,
  onNavigate,
  studentCount,
  currentUser,
  activeClassName
}) => {
  const { isMobile, deviceCategory, isTouch } = useDeviceDetect();
  const navRef = useRef<HTMLDivElement>(null);
  const isAdmin = currentUser?.role === 'admin';

  const scrollNav = (direction: 'left' | 'right') => {
    if (navRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      navRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const navItems = isAdmin
    ? [
        { id: 'accounts', label: 'Quản trị TK', icon: ShieldCheck, badge: 'ADMIN' },
        { id: 'home', label: 'Tổng quan hệ thống', icon: Home, badge: '' },
        { id: 'data', label: 'Dữ liệu hệ thống', icon: Database, badge: '' },
        { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings, badge: '' }
      ]
    : [
        { id: 'home', label: 'Trang chủ', icon: Home, badge: '' },
        { id: 'classes', label: 'Lớp học', icon: School, badge: '' },
        { id: 'students', label: 'Học sinh', icon: GraduationCap, badge: studentCount > 0 ? `${studentCount}` : '' },
        { id: 'attendance', label: 'Điểm danh', icon: ClipboardCheck, badge: '' },
        { id: 'seating', label: 'Sơ đồ lớp', icon: LayoutGrid, badge: '' },
        { id: 'timetable', label: 'Thời khóa biểu', icon: CalendarDays, badge: '' },
        { id: 'rewards', label: 'Đổi quà', icon: Gift, badge: 'HOT' },
        { id: 'film', label: 'Kéo co', icon: Swords, badge: 'HOT' },
        { id: 'noise', label: 'Chống ồn', icon: VolumeX, badge: '' },
        { id: 'countdown', label: 'Đếm ngược', icon: Timer, badge: '' },
        { id: 'links', label: 'Liên kết', icon: LinkIcon, badge: '' },
        { id: 'stats', label: 'Thống kê', icon: BarChart3, badge: '' },
        { id: 'data', label: 'Dữ liệu', icon: Database, badge: '' },
        { id: 'settings', label: 'Cài đặt', icon: Settings, badge: '' }
      ];

  return (
    <div className="sticky top-2 z-20 bg-white/95 backdrop-blur-md border border-teal-200/90 rounded-2xl shadow-md shadow-teal-900/5 p-1.5 sm:p-2 mb-3 transition-all">
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Title badge & device indicator */}
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-200/80">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-teal-600/20">
            <School className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </div>
          <div className="hidden md:block">
            <h3 className="text-xs font-black text-slate-800 tracking-tight leading-none">
              QUẢN LÝ LỚP HỌC
            </h3>
            {activeClassName && (
              <span className="text-[10px] font-bold text-teal-700 block mt-0.5">
                Lớp {activeClassName}
              </span>
            )}
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-600/20 font-black scale-[1.02]'
                    : 'text-slate-600 hover:text-teal-800 hover:bg-teal-50/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : item.badge === 'HOT'
                        ? 'bg-rose-100 text-rose-600'
                        : item.badge === 'NEW'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-teal-100 text-teal-700'
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
          title="Cuộn sang phải"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
