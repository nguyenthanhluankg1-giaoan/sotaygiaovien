import React, { useState } from 'react';
import {
  LogIn,
  KeyRound,
  User,
  AlertCircle,
  Database,
  Sparkles,
  School,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserAccount } from '../types';
import { getAccountExpirationInfo } from '../utils/helpers';
import { fetchUsersFromFirestore } from '../services/dbService';

interface LoginScreenProps {
  onLogin: (user: UserAccount) => void | Promise<void>;
  users: UserAccount[];
  dbConnected: boolean;
  systemLogo?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  users,
  dbConnected,
  systemLogo
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setError('Vui lòng nhập tên đăng nhập hoặc email');
      return;
    }
    if (!cleanPassword) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);

    try {
      // Find matching user
      let found = users.find(
        (u) =>
          (u.username.toLowerCase() === cleanUsername ||
            u.email.toLowerCase() === cleanUsername) &&
          u.password === cleanPassword
      );

      // If not found in memory prop, fetch latest accounts directly from Cloud Firestore (e.g. freshly opened on Vercel)
      if (!found) {
        try {
          const freshList = await fetchUsersFromFirestore();
          found = freshList.find(
            (u) =>
              (u.username.toLowerCase() === cleanUsername ||
                u.email.toLowerCase() === cleanUsername) &&
              u.password === cleanPassword
          );
        } catch {
          // ignore network error
        }
      }

      if (!found) {
        setError('Tên đăng nhập hoặc mật khẩu không chính xác!');
        setLoading(false);
        return;
      }

      if (found.status === 'locked') {
        setError('Tài khoản này đã bị khóa bởi Quản trị viên. Vui lòng liên hệ ban giám hiệu.');
        setLoading(false);
        return;
      }

      // Check active days expiration for teacher accounts
      const expInfo = getAccountExpirationInfo(found);
      if (found.role !== 'admin' && expInfo.isExpired) {
        setError(`Tài khoản đã HẾT HẠN SỬ DỤNG (Hết hạn từ ngày ${expInfo.formattedExpiresAt}). Vui lòng liên hệ Quản trị viên để đăng ký gia hạn thêm số ngày hoạt động!`);
        setLoading(false);
        return;
      }

      await onLogin(found);
    } catch (err: any) {
      setError('Có lỗi xảy ra khi đồng bộ dữ liệu tài khoản từ Cloud Firestore. Vui lòng kiểm tra kết nối mạng!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-emerald-800 to-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/40 border border-teal-100/50 p-6 sm:p-8 relative z-10">
        {/* App Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-36 h-36 sm:w-48 sm:h-48 rounded-[2.5rem] bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-400 text-white font-black text-5xl shadow-2xl shadow-teal-900/40 border-4 border-white mb-6 overflow-hidden mx-auto transition-transform hover:scale-105 duration-300">
            {systemLogo ? (
              <img src={systemLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              'TY1'
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            SỔ TAY GIÁO VIÊN
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-teal-700 mt-1 flex items-center justify-center gap-1.5">
            <School className="w-4 h-4" />
            Hệ Thống Quản Trị & Giảng Dạy Đám Mây
          </p>
        </div>

        {/* Database status banner */}
        <div className="mb-5 px-3 py-2 rounded-xl bg-teal-50/90 border border-teal-200/80 flex items-center justify-between text-xs text-teal-900 font-bold">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600 animate-pulse" />
            <span>Cơ sở dữ liệu:</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              dbConnected
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}
          >
            {dbConnected ? 'Cloud Firestore Đã kết nối' : 'Đang kết nối...'}
          </span>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên đăng nhập / Email giáo viên
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-sm font-medium text-slate-800 transition-all bg-slate-50/50"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-sm font-medium text-slate-800 transition-all bg-slate-50/50"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin mr-2">◌</span>
                <span>Đang đồng bộ dữ liệu Cloud...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập Vào Hệ Thống</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            Hệ thống phân quyền bảo mật: Thao tác của từng giáo viên được lưu trữ độc lập. Giáo viên khác và Quản trị viên không thể can thiệp.
          </p>
        </div>
      </div>
    </div>
  );
};
