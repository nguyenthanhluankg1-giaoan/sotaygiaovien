import React from 'react';
import {
  CheckCircle2,
  Menu,
  Database,
  LogOut,
  ShieldCheck,
  UserCheck,
  Smartphone,
  Clock,
  AlertTriangle,
  Infinity,
  Cloud,
  Sparkles,
  Key,
  RefreshCw
} from 'lucide-react';
import { ClassInfo, TeacherProfile, UserAccount } from '../types';
import { Avatar } from './Avatar';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { getAccountExpirationInfo } from '../utils/helpers';

interface TopbarProps {
  title: string;
  subtitle: string;
  savedTime: string;
  isSaving?: boolean;
  classes: ClassInfo[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  teacher: TeacherProfile;
  studentCount: number;
  onOpenMobileSidebar: () => void;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  dbConnected?: boolean;
  hasApiKey?: boolean;
  onOpenApiKeyModal?: () => void;
  onForceCloudSync?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  savedTime,
  isSaving = false,
  classes,
  activeClassId,
  onSelectClass,
  teacher,
  studentCount,
  onOpenMobileSidebar,
  currentUser,
  onLogout,
  dbConnected = true,
  hasApiKey = false,
  onOpenApiKeyModal,
  onForceCloudSync
}) => {
  const { isMobile, isTablet, screenWidth } = useDeviceDetect();

  return (
    <header className="sticky top-2 z-30 bg-white/95 backdrop-blur-md border-2 border-teal-200/80 rounded-2xl sm:rounded-3xl shadow-lg shadow-teal-900/5 p-2 sm:px-5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 transition-all">
      {/* Page titles & mobile menu trigger */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl border border-teal-200 text-teal-700 lg:hidden hover:bg-teal-50 cursor-pointer shrink-0"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-black text-slate-800 tracking-tight truncate">
              {title}
            </h1>
            {isMobile && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1 shrink-0" title={`Nhận diện thiết bị di động (${screenWidth}px) - Tự động co giãn giao diện`}>
                <Smartphone className="w-2.5 h-2.5 text-teal-600" />
                <span>Auto-Fit</span>
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate hidden sm:block mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Top right actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Active Days Remaining Badge */}
        {(() => {
          const expInfo = getAccountExpirationInfo(currentUser);
          if (currentUser?.role === 'admin' || expInfo.remainingDays === null) {
            return (
              <div
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-extrabold text-[11px]"
                title="Tài khoản hoạt động vĩnh viễn (Không giới hạn số ngày)"
              >
                <Infinity className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">Thời hạn: Vĩnh viễn</span>
                <span className="sm:hidden">Vĩnh viễn</span>
              </div>
            );
          }
          if (expInfo.remainingDays > 7) {
            return (
              <div
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 font-extrabold text-[11px]"
                title={`Mốc hết hạn: ${expInfo.formattedExpiresAt}. Hãy liên hệ Quản trị viên để gia hạn khi hết hạn.`}
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Còn {expInfo.remainingDays} ngày</span>
              </div>
            );
          }
          if (expInfo.remainingDays > 0) {
            return (
              <div
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-black text-[11px] animate-pulse"
                title={`Cảnh báo: Tài khoản sẽ hết hạn vào ngày ${expInfo.formattedExpiresAt}. Vui lòng liên hệ Admin để gia hạn!`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>Còn {expInfo.remainingDays} ngày (Sắp hết)</span>
              </div>
            );
          }
          return (
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-100 border border-rose-300 text-rose-900 font-black text-[11px] animate-pulse"
              title={`Tài khoản đã hết hạn từ ngày ${expInfo.formattedExpiresAt}. Cần gia hạn để tiếp tục sử dụng.`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Hết quyền sử dụng</span>
            </div>
          );
        })()}

        {/* Workspace isolation indicator */}
        {currentUser?.role !== 'admin' ? (
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800"
            title="Dữ liệu lớp học của Thầy/Cô được bảo mật độc lập, các giáo viên khác và quản trị viên không thể xem hay sửa."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Riêng tư</span>
          </div>
        ) : (
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-800"
            title="Tài khoản quản trị viên: chỉ quản lý tài khoản và hệ thống, không can thiệp hay hiển thị thao tác của giáo viên."
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Quản trị</span>
          </div>
        )}

        {/* Gemini AI Status Badge */}
        {onOpenApiKeyModal && (
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer ${
              hasApiKey
                ? 'bg-teal-50 hover:bg-teal-100/80 border-teal-200 text-teal-800'
                : 'bg-amber-100 hover:bg-amber-200/90 border-amber-300 text-amber-900 animate-pulse'
            }`}
            title={
              hasApiKey
                ? 'Mô hình Gemini 3.8 Flash đã nhận diện và sẵn sàng. Bấm để quản lý hoặc kiểm tra kết nối.'
                : 'Chưa cấu hình API Key. Bấm để cài đặt và đồng bộ ngay!'
            }
          >
            {hasApiKey ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden lg:inline">Gemini 3.8 Flash</span>
                <span className="lg:hidden">AI</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-amber-700" />
                <span>Cài API Key</span>
              </>
            )}
          </button>
        )}

        {/* Firestore Database Live Status (Clickable to force sync) */}
        <button
          type="button"
          onClick={onForceCloudSync}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-extrabold transition-all cursor-pointer ${
            isSaving
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800'
          }`}
          title="Bấm để đồng bộ dữ liệu ngay lập tức lên Google Cloud Firestore (kết nối giữa Vercel và Google Studio)"
        >
          {isSaving ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>Đang lưu Cloud...</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Cloud className="w-3 h-3 text-emerald-600" />
              <span className="hidden md:inline">Đồng bộ Cloud ({savedTime})</span>
              <span className="md:hidden">{savedTime}</span>
            </>
          )}
        </button>

        {/* Class switcher or Admin mode */}
        {currentUser?.role === 'admin' ? (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-100/70 border border-purple-200 text-purple-900 font-extrabold text-xs sm:text-sm">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Chế độ Quản trị</span>
          </div>
        ) : classes && classes.length > 0 ? (
          <div className="relative">
            <select
              value={activeClassId}
              onChange={(e) => onSelectClass(e.target.value)}
              className="appearance-none bg-purple-50 hover:bg-purple-100/80 text-purple-900 font-extrabold text-xs sm:text-sm py-2 px-3 sm:px-4 pr-7 sm:pr-8 rounded-2xl border border-purple-200 shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-purple-400 transition-all"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} · {cls.id === activeClassId ? `${studentCount} HS` : cls.grade}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-700 text-xs">
              ▼
            </span>
          </div>
        ) : null}

        {/* User profile & Logout */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
          <Avatar
            name={currentUser ? currentUser.name : teacher.name}
            avatar={currentUser?.avatar || teacher.avatar}
            size="sm"
          />
          <div className="hidden xl:block leading-tight text-left">
            <div className="flex items-center gap-1">
              <strong className="block text-xs sm:text-sm font-extrabold text-slate-800 max-w-[130px] truncate">
                {currentUser ? currentUser.name : teacher.name}
              </strong>
            </div>
            <span className="text-[11px] text-teal-700 font-bold max-w-[130px] truncate flex items-center gap-1">
              {currentUser?.role === 'admin' ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-purple-600 inline" />
                  <span className="text-purple-700">Quản trị viên</span>
                </>
              ) : currentUser?.teacherType === 'GVCN' ? (
                <>
                  <UserCheck className="w-3 h-3 text-teal-600 inline" />
                  <span>Giáo viên chủ nhiệm</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3 h-3 text-teal-600 inline" />
                  <span>{currentUser?.subject || teacher.role || 'Giáo viên bộ môn'}</span>
                </>
              )}
            </span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

