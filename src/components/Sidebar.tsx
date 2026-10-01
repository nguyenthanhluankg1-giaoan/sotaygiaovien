import React, { useState, useEffect, useRef } from 'react';
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
  BookOpen,
  ShieldCheck,
  LogOut,
  X,
  Folder,
  FolderOpen,
  FileText,
  Calendar,
  PhoneCall
} from 'lucide-react';
import { UserAccount } from '../types';
import { Avatar } from './Avatar';
import { compressImageFile } from '../utils/helpers';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  studentCount: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide: () => void;
  onOpenContact?: () => void;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  systemLogo?: string;
  onUpdateLogo?: (logo: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  studentCount,
  isOpen,
  onClose,
  onOpenGuide,
  onOpenContact,
  currentUser,
  onLogout,
  systemLogo,
  onUpdateLogo
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Thư mục hiện tại
  const [activeFolderState, setActiveFolderState] = useState<'classroom' | 'khdh' | 'games'>(
    currentPage === 'khdh' ? 'khdh' : 'classroom'
  );

  useEffect(() => {
    if (currentPage === 'khdh') {
      setActiveFolderState('khdh');
    } else if (['games', 'wheel', 'film', 'worksheets'].includes(currentPage)) {
      setActiveFolderState('games');
    } else if (activeFolderState === 'khdh' || activeFolderState === 'games') {
      setActiveFolderState('classroom');
    }
  }, [currentPage]);

  const activeFolder = activeFolderState;

  const gameItems = [
    { id: 'wheel', label: 'Vòng quay may mắn', icon: Sparkles, badge: 'HOT' },
    { id: 'film', label: 'Trò chơi Kéo co', icon: Swords, badge: 'HOT' },
    { id: 'worksheets', label: 'Ngân hàng câu hỏi', icon: FileCheck, badge: 'TẠO CH' }
  ];

  const [khdhTab, setKhdhTab] = useState<string>(() => {
    try {
      return localStorage.getItem('khdh_active_tab_v1') || 'document';
    } catch {
      return 'document';
    }
  });

  useEffect(() => {
    const handleTabUpdated = (e: any) => {
      if (e.detail) setKhdhTab(e.detail);
    };
    window.addEventListener('khdh_tab_updated', handleTabUpdated);
    return () => window.removeEventListener('khdh_tab_updated', handleTabUpdated);
  }, []);

  const khdhItems = [
    { id: 'document', label: 'Kế hoạch dạy học', icon: FileText },
    { id: 'ppct', label: 'Phân phối CT', icon: BookOpen },
    { id: 'tkb', label: 'Thời khóa biểu', icon: Calendar },
    { id: 'settings', label: 'Cấu hình văn bản', icon: Settings }
  ];

  const handleSelectClassroomFolder = () => {
    setActiveFolderState('classroom');
    if (currentPage === 'khdh') {
      onNavigate('home');
    }
  };

  const handleSelectKhdhFolder = () => {
    setActiveFolderState('khdh');
    onNavigate('khdh');
    onClose();
  };

  const handleSelectGamesFolder = () => {
    setActiveFolderState('games');
    onNavigate('games');
    onClose();
  };

  const handleSelectKhdhItem = (tabId: string) => {
    setKhdhTab(tabId);
    try {
      localStorage.setItem('khdh_active_tab_v1', tabId);
      window.dispatchEvent(new CustomEvent('khdh_change_tab', { detail: tabId }));
    } catch {}
    onNavigate('khdh');
    onClose();
  };

  const handleLogoClick = () => {
    if (isAdmin && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateLogo) {
      try {
        // Compress to 400px max dimension, 0.7 quality to stay well under 1MB limit
        const compressed = await compressImageFile(file, 400, 0.7);
        onUpdateLogo(compressed);
      } catch (err) {
        console.error('Error compressing logo image:', err);
      }
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
        { id: 'students', label: 'Học sinh', icon: GraduationCap, badge: `${studentCount}` },
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
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-3.5 left-0 lg:left-3.5 bottom-0 lg:bottom-3.5 z-50 w-[260px] flex-shrink-0 bg-white/95 backdrop-blur-md border-r lg:border-2 border-teal-200/90 lg:rounded-3xl shadow-xl shadow-teal-900/10 p-3.5 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } h-full lg:max-h-[calc(100vh-28px)]`}
      >
        <div>
          {/* Brand header */}
          <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div 
                onClick={handleLogoClick}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white bg-gradient-to-br from-teal-700 via-teal-600 to-teal-400 shadow-md shadow-teal-700/20 border-2 border-white text-base tracking-tight overflow-hidden ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-teal-500 transition-all' : ''}`}
                title={isAdmin ? 'Nhấn để thay đổi logo trường' : undefined}
              >
                {systemLogo ? (
                  <img src={systemLogo} alt="School Logo" className="w-full h-full object-cover" />
                ) : (
                  'TY1'
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div>
                <h2 className="font-extrabold text-teal-800 text-[15px] leading-tight tracking-tight">
                  SỔ TAY GIÁO VIÊN
                </h2>
                <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                  Bảng điều khiển giáo viên
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 lg:hidden"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Danh sách các thư mục sắp xếp theo HÀNG DỌC */}
          <div className="space-y-1.5 mt-1 mb-2.5">
            {/* 1. Thư mục QUẢN LÝ LỚP HỌC */}
            <button
              type="button"
              onClick={handleSelectClassroomFolder}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all text-left cursor-pointer border ${
                activeFolder === 'classroom'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white border-teal-600 shadow-md shadow-teal-600/20 font-black'
                  : 'bg-white hover:bg-teal-50/80 text-slate-700 border-slate-200/90 font-bold hover:border-teal-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FolderOpen
                  className={`w-4 h-4 shrink-0 ${
                    activeFolder === 'classroom' ? 'text-white' : 'text-teal-600'
                  }`}
                />
                <span className="text-[13px] tracking-tight truncate">Quản lý lớp học</span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  activeFolder === 'classroom'
                    ? 'bg-white/25 text-white'
                    : 'bg-teal-100 text-teal-800'
                }`}
              >
                {navItems.length}
              </span>
            </button>

            {/* 2. Thư mục KHDH / Báo giảng xếp theo HÀNG DỌC ngay bên dưới */}
            <button
              type="button"
              onClick={handleSelectKhdhFolder}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all text-left cursor-pointer border ${
                activeFolder === 'khdh'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white border-teal-600 shadow-md shadow-teal-600/20 font-black'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 font-bold hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Folder
                  className={`w-4 h-4 shrink-0 ${
                    activeFolder === 'khdh' ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="text-[13px] tracking-tight truncate">
                  {currentUser?.teacherType === 'GVBM' ? 'Kế hoạch dạy học (GVBM)' : 'Lịch báo giảng (GVCN)'}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeFolder === 'khdh'
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {currentUser?.teacherType === 'GVBM' ? 'GVBM' : 'GVCN'}
              </span>
            </button>

            {/* 3. Thư mục TRÒ CHƠI */}
            <button
              type="button"
              onClick={handleSelectGamesFolder}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all text-left cursor-pointer border ${
                activeFolder === 'games'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white border-teal-600 shadow-md shadow-teal-600/20 font-black'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 font-bold hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Folder
                  className={`w-4 h-4 shrink-0 ${
                    activeFolder === 'games' ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="text-[13px] tracking-tight truncate font-extrabold uppercase">TRÒ CHƠI</span>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeFolder === 'games'
                    ? 'bg-white/25 text-white'
                    : 'bg-teal-100 text-teal-800'
                }`}
              >
                {gameItems.length}
              </span>
            </button>
          </div>

          {/* Nội dung nạp vào theo thư mục đang chọn */}
          {activeFolder === 'classroom' ? (
            <div className="space-y-2 animate-in fade-in duration-150 p-1">
              <div className="p-3 rounded-2xl bg-teal-50/80 border border-teal-200/80 text-teal-900 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-teal-800">
                  <School className="w-4 h-4 text-teal-600" />
                  <span>Quản lý lớp học</span>
                </div>
                <p className="text-[11px] font-medium text-slate-600 leading-snug">
                  Tất cả <span className="font-bold text-teal-700">{navItems.length} công cụ</span> được hiển thị đầy đủ trên thanh chọn phía trên bên phải.
                </p>
              </div>
            </div>
          ) : activeFolder === 'khdh' ? (
            <div className="space-y-2 animate-in fade-in duration-150 p-1">
              <div className="p-3 rounded-2xl bg-teal-50/80 border border-teal-200/80 text-teal-900 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-teal-800">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Kế hoạch dạy học (KHDH)</span>
                </div>
                <p className="text-[11px] font-medium text-slate-600 leading-snug">
                  Tất cả <span className="font-bold text-teal-700">{khdhItems.length} công cụ</span> được hiển thị đầy đủ trên thanh chọn phía trên bên phải.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 animate-in fade-in duration-150 p-1">
              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-teal-800 tracking-wider">
                  DANH SÁCH TRÒ CHƠI
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded-full">
                  {gameItems.length} trò chơi
                </span>
              </div>
              {gameItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-600/20 font-black'
                        : 'text-slate-700 hover:bg-teal-50/80 hover:text-teal-800 bg-white border border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-amber-500'}`} />
                      <span className="text-[12.5px] tracking-tight">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          isActive ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom actions & User Profile */}
        <div className="pt-3 border-t border-slate-100 space-y-2 mt-3">
          {/* Privacy badge */}
          <div className="px-2.5 py-1.5 rounded-xl bg-teal-50/90 border border-teal-200/70 text-[10px] text-teal-800 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">
              {isAdmin ? 'Quản trị hệ thống · Bảo mật phân quyền' : 'Không gian riêng tư · Độc lập 100%'}
            </span>
          </div>

          {currentUser && (
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={currentUser.name} avatar={currentUser.avatar} size="sm" />
                <div className="min-w-0">
                  <span className="block text-xs font-black text-slate-800 truncate">
                    {currentUser.name}
                  </span>
                  <span
                    className={`inline-block text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {currentUser.role === 'admin' ? 'Quản Trị Viên' : 'Giáo Viên'}
                  </span>
                </div>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={onOpenGuide}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Xem hướng dẫn</span>
          </button>

          {onOpenContact && (
            <button
              onClick={onOpenContact}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Liên hệ gia hạn & QR</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

