import React from 'react';
import { FileText, Calendar, BookOpen, Sparkles, Settings, CalendarDays, Cloud } from 'lucide-react';

export type KhdhTabId = 'document' | 'ppct' | 'tkb' | 'settings';

interface NavbarProps {
  activeTab: KhdhTabId;
  onTabChange: (tab: KhdhTabId) => void;
  title?: string;
  academicYear?: string;
  teacherType?: 'GVCN' | 'GVBM';
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  title,
  academicYear = '2026 - 2027',
  teacherType = 'GVCN'
}) => {
  const isGvcn = teacherType === 'GVCN';

  const displayTitle = title || (isGvcn ? 'LỊCH BÁO GIẢNG' : 'KẾ HOẠCH DẠY HỌC');

  const tabs: { id: KhdhTabId; label: string; icon: any; badge?: string }[] = [
    {
      id: 'document' as KhdhTabId,
      label: isGvcn ? 'Lịch báo giảng' : 'Kế hoạch dạy học',
      icon: isGvcn ? CalendarDays : FileText
    },
    {
      id: 'ppct' as KhdhTabId,
      label: 'Phân phối CT',
      icon: BookOpen
    },
    {
      id: 'tkb' as KhdhTabId,
      label: 'Thời khóa biểu',
      icon: Calendar
    },
    { id: 'settings' as KhdhTabId, label: 'Cấu hình', icon: Settings }
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-teal-100 shadow-2xs sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5">
        <div className="flex flex-col lg:flex-row items-center justify-between py-2.5 gap-2.5">
          {/* Brand & Identity */}
          <div className="flex items-center gap-2.5 min-w-0 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                {isGvcn ? <CalendarDays className="w-4 h-4 stroke-[2.2]" /> : <FileText className="w-4 h-4 stroke-[2.2]" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight whitespace-nowrap">
                    {displayTitle}
                  </h1>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs ${
                    isGvcn ? 'bg-teal-100 text-teal-900 border-teal-300' : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                  }`}>
                    {isGvcn ? 'DÀNH CHO GVCN' : 'DÀNH CHO GVBM'}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                    {academicYear}
                  </span>
                </div>
                <p className="text-[10.5px] font-medium text-slate-500 truncate hidden sm:block">
                  {isGvcn
                    ? 'Hệ thống Quản lý Lịch báo giảng, Phân phối chương trình & TKB Lớp chủ nhiệm'
                    : 'Hệ thống Quản lý Kế hoạch dạy học, Phân phối chương trình & TKB Bộ môn'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none shrink-0 justify-start lg:justify-end">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-xs font-black'
                      : 'text-slate-700 hover:text-teal-800 hover:bg-teal-50/80 bg-slate-50/80 border border-slate-200/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Live Cloud Auto-Sync Indicator */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold shrink-0 shadow-2xs"
              title="Mọi nội dung kế hoạch dạy học được tự động lưu lên Cloud Firestore tức thì"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Cloud className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline">Tự động lưu Cloud</span>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
