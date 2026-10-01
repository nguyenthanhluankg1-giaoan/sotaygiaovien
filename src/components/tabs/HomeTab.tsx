import React from 'react';
import {
  Users,
  ClipboardCheck,
  Coins,
  Gift,
  Sparkles,
  UserPlus,
  ArrowRight,
  Clock,
  LayoutGrid,
  Timer,
  ShieldCheck,
  Database,
  Lock,
  UserCheck,
  School,
  Settings,
  CheckCircle2
} from 'lucide-react';
import { AppState, Student, UserAccount } from '../../types';
import { Avatar } from '../Avatar';
import { ClassBannerBar } from '../ClassBannerBar';

interface HomeTabProps {
  state: AppState;
  onNavigate: (page: string) => void;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  currentUser?: UserAccount | null;
  users?: UserAccount[];
}

export const HomeTab: React.FC<HomeTabProps> = ({ state, onNavigate, onUpdateState, currentUser, users = [] }) => {
  const isAdmin = currentUser?.role === 'admin';

  // If currentUser is Admin, render the Admin System Overview (does not display teacher classroom operations)
  if (isAdmin) {
    const teachersList = users.filter((u) => u.role === 'teacher');
    const activeTeachers = teachersList.filter((u) => u.status === 'active');

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Admin Welcome Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-700 text-white shadow-xl shadow-purple-900/15">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-white/20 backdrop-blur-sm">
                <ShieldCheck className="w-6 h-6 text-amber-300" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Tổng Quan Quản Trị Hệ Thống
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-purple-100 mt-1.5 max-w-2xl">
              Cổng quản trị tập trung: Quản lý cấp phát tài khoản giáo viên, theo dõi trạng thái đồng bộ Firestore và bảo mật phân lập dữ liệu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('accounts')}
              className="px-4 py-2.5 rounded-2xl bg-white text-purple-900 font-extrabold text-xs sm:text-sm shadow-md hover:bg-purple-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-purple-700" />
              <span>Quản trị tài khoản</span>
            </button>
          </div>
        </div>

        {/* Security & Isolation Notice Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200/80 flex items-start sm:items-center gap-3.5 shadow-sm">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
              <span>Chính Sách Phân Lập Dữ Liệu Riêng Biệt (Data Isolation)</span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded-full uppercase">
                Kích hoạt 100%
              </span>
            </h4>
            <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
              Các thao tác lớp học (điểm danh, sơ đồ lớp, chấm điểm hoa thi đua 🌺, vòng quay ngẫu nhiên, cuộn phim...) của từng giáo viên được lưu trữ trong không gian dữ liệu riêng biệt. Quản trị viên chỉ quản lý tài khoản và cấu hình hệ thống, không hiển thị hay can thiệp vào các hoạt động riêng tư của giáo viên.
            </p>
          </div>
        </div>

        {/* Metric Cards for Admin */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-5 rounded-2xl bg-white border border-purple-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold block">Tổng GV</span>
              <strong className="text-lg sm:text-2xl font-black text-slate-800">
                {teachersList.length}
              </strong>
            </div>
          </div>

          <div className="p-3 sm:p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold block">Đang trực tuyến</span>
              <strong className="text-lg sm:text-2xl font-black text-emerald-600">
                {activeTeachers.length}
              </strong>
            </div>
          </div>

          <div className="p-3 sm:p-5 rounded-2xl bg-white border border-teal-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
              <Database className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold block">Cloud Firestore</span>
              <strong className="text-[10px] sm:text-sm font-black text-teal-700 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Đồng bộ
              </strong>
            </div>
          </div>

          <div className="p-3 sm:p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold block">Phân quyền</span>
              <strong className="text-[10px] sm:text-sm font-black text-indigo-700 block mt-0.5">
                Admin
              </strong>
            </div>
          </div>
        </div>

        {/* Teachers Overview Table */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-black text-slate-800">
                Danh Sách Tài Khoản Giáo Viên ({teachersList.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('accounts')}
              className="text-xs font-black text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Quản lý tài khoản chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Giáo viên</th>
                  <th className="py-3 px-4">Tên đăng nhập</th>
                  <th className="py-3 px-4">Bộ môn</th>
                  <th className="py-3 px-4">Trường</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Không gian dữ liệu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachersList.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2.5">
                      <Avatar name={teacher.name} avatar={teacher.avatar} size="sm" />
                      <div>
                        <span className="block font-black text-slate-800">{teacher.name}</span>
                        <span className="text-[11px] text-slate-400">{teacher.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-purple-700 font-bold">
                      {teacher.username}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {teacher.teacherType === 'GVCN'
                        ? 'GVCN (Chủ nhiệm)'
                        : teacher.subject || 'Đang cập nhật'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {teacher.school || 'TH Thạnh Yên 1'}
                    </td>
                    <td className="py-3 px-4">
                      {teacher.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                        <Lock className="w-3 h-3 text-teal-600" />
                        <span>workspace_{teacher.id}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Admin Navigation Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('accounts')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <strong className="block text-sm font-black text-slate-800 group-hover:text-purple-700">
              Quản trị tài khoản giáo viên
            </strong>
            <p className="text-xs text-slate-500 mt-1">
              Thêm mới thầy cô, phân môn giảng dạy, đổi mật khẩu và phân quyền.
            </p>
          </button>

          <button
            onClick={() => onNavigate('data')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Database className="w-5 h-5" />
            </div>
            <strong className="block text-sm font-black text-slate-800 group-hover:text-teal-700">
              Dữ liệu hệ thống & Sao lưu
            </strong>
            <p className="text-xs text-slate-500 mt-1">
              Kiểm tra kết nối đám mây, sao lưu JSON và quản lý kho lưu trữ.
            </p>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-400 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <strong className="block text-sm font-black text-slate-800 group-hover:text-slate-900">
              Cài đặt hệ thống
            </strong>
            <p className="text-xs text-slate-500 mt-1">
              Thông tin trường học, môn học mặc định và thông số ứng dụng.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // If currentUser is a Teacher: Render teacher's isolated classroom dashboard
  const activeClass = state.classes.find((c) => c.id === state.activeClassId) || state.classes[0];
  const students = state.students.filter((s) => s.classId === state.activeClassId);

  const attKey = `${state.activeClassId}_${state.attendanceDate}`;
  const todayAtt = state.attendance[attKey] || {};
  const presentCount = students.filter(
    (s) => (todayAtt[s.id] || 'present') === 'present'
  ).length;
  const attendanceRate = students.length ? Math.round((presentCount / students.length) * 100) : 0;

  const totalCoins = students.reduce((sum, s) => sum + (s.coins || 0), 0);
  const classTransactions = state.transactions.filter((tx) => tx.classId === state.activeClassId);
  const classRedemptions = state.redemptions.filter((r) => r.classId === state.activeClassId);

  const sortedStudents = [...students].sort((a, b) => (b.coins || 0) - (a.coins || 0));
  const topStudents = sortedStudents.slice(0, 5);
  const maxCoins = Math.max(1, ...students.map((s) => s.coins || 0));

  // Today's lessons (day of week: 0 for Monday ... 4 for Friday)
  const currentDayIndex = Math.max(0, Math.min(4, new Date().getDay() - 1));
  const todayLessons = state.timetable.entries
    .filter((e) => e.classId === state.activeClassId && e.day === currentDayIndex)
    .sort((a, b) => a.slot.localeCompare(b.slot));

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Interactive Classroom Banner Bar */}
      <ClassBannerBar
        activeClass={activeClass}
        onUpdateClass={(classId, updates) => {
          onUpdateState((prev) => ({
            ...prev,
            classes: prev.classes.map((c) => (c.id === classId ? { ...c, ...updates } : c))
          }));
        }}
        studentCount={students.length}
        teacherName={state.teacher.name}
        onNavigate={onNavigate}
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Sĩ số */}
        <div className="relative overflow-hidden p-3.5 sm:p-5 rounded-3xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-700/15">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-100">
              Sĩ số
            </span>
            <span className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-white/20">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
          <div className="text-xl sm:text-3xl font-black mt-1 sm:mt-2 tracking-tight">{students.length}</div>
          <div className="text-[10px] sm:text-xs text-teal-100 font-semibold mt-1">
            Lớp {activeClass?.name || '---'}
          </div>
        </div>

        {/* Card 2: Chuyên cần */}
        <div className="relative overflow-hidden p-3.5 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-700/15">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-100">
              Đi học
            </span>
            <span className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-white/20">
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
          <div className="text-xl sm:text-3xl font-black mt-1 sm:mt-2 tracking-tight">
            {presentCount}<span className="text-sm font-normal opacity-70">/{students.length}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-emerald-100 font-semibold mt-1">
            {attendanceRate}% có mặt
          </div>
        </div>

        {/* Card 3: Hoa thi đua */}
        <div className="relative overflow-hidden p-3.5 sm:p-5 rounded-3xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-600/15">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-100">
              Hoa thưởng 🌺
            </span>
            <span className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-white/20 text-lg flex items-center justify-center leading-none">
              🌺
            </span>
          </div>
          <div className="text-xl sm:text-3xl font-black mt-1 sm:mt-2 tracking-tight">{totalCoins}</div>
          <div className="text-[10px] sm:text-xs text-rose-100 font-semibold mt-1">
            Tổng tích lũy
          </div>
        </div>

        {/* Card 4: Quà tặng */}
        <div className="relative overflow-hidden p-3.5 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-700/15">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-100">
              Đổi quà
            </span>
            <span className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-white/20">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
          <div className="text-xl sm:text-3xl font-black mt-1 sm:mt-2 tracking-tight">{classRedemptions.length}</div>
          <div className="text-[10px] sm:text-xs text-indigo-100 font-semibold mt-1">
            Lượt nhận quà
          </div>
        </div>
      </div>

      {/* Main Grid: Thi đua visualizer & Top students */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Competition visualizer with independent scroll */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md flex flex-col max-h-[480px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <span>Biểu đồ thi đua học sinh</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800">
                  {students.length} HS
                </span>
              </h3>
              <p className="text-xs text-slate-500">Học sinh có số bông hoa tích lũy cao nhất hiện tại</p>
            </div>
            <button
              onClick={() => onNavigate('stats')}
              className="text-xs font-extrabold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {sortedStudents.map((student, idx) => {
              const safeMax = Math.max(1, maxCoins || 0);
              const rawPct = Math.round(((student.coins || 0) / safeMax) * 100);
              const pct = isNaN(rawPct) ? 8 : Math.max(8, Math.min(100, rawPct));
              return (
                <div key={student.id} className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-5 text-xs font-bold text-slate-400 text-center">{idx + 1}</div>
                  <Avatar name={student.name} avatar={student.avatar} size="md" />
                  <div className="w-28 sm:w-36 truncate font-bold text-xs text-slate-800">
                    {student.name}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-14 text-right text-xs font-black text-rose-600 flex items-center justify-end gap-1 shrink-0">
                    <span>🌺</span>
                    <span>{student.coins || 0}</span>
                  </div>
                </div>
              );
            })}
            {students.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa có học sinh trong lớp này. Hãy thêm học sinh!
              </div>
            )}
          </div>
        </div>

        {/* Right: Top Rank list & Activity Feed with independent scroll */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md flex flex-col max-h-[480px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-800">Bảng Vàng Thi Đua</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                Thanh trượt riêng 📜
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800">
              Top {topStudents.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 custom-scrollbar">
            {topStudents.map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-slate-50 to-teal-50/40 border border-teal-50 hover:border-teal-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/30'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-600 text-white'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <Avatar name={s.name} avatar={s.avatar} size="md" />
                  <div>
                    <div className="font-bold text-xs text-slate-800">{s.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {s.gender || 'Học sinh'} {s.note ? `· ${s.note}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-extrabold text-xs shrink-0">
                  <span>🌺</span>
                  <span>{s.coins || 0}</span>
                </div>
              </div>
            ))}

            {topStudents.length === 0 && (
              <div className="py-6 text-center text-slate-400 text-xs">
                Chưa có thông tin học sinh
              </div>
            )}

            {/* Recent star transaction logs */}
            {classTransactions.length > 0 && (
              <div className="pt-3 mt-2 border-t border-slate-100">
                <span className="block text-[11px] font-extrabold text-slate-600 mb-2">
                  Lịch sử thưởng hoa mới nhất:
                </span>
                <div className="space-y-1.5">
                  {classTransactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-teal-50/40 border border-teal-100/60 text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-800">{tx.studentName}: </span>
                        <span className="text-slate-600 text-[11px]">{tx.reason}</span>
                      </div>
                      <span className={`font-black text-xs shrink-0 ${tx.amount >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {tx.amount >= 0 ? `+${tx.amount}🌺` : `${tx.amount}🌺`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('students')}
            className="w-full mt-3 py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Xem và cộng/trừ hoa cho học sinh</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Grid: Today's lessons & Quick shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Today's lessons */}
        <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md flex flex-col max-h-[320px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <h3 className="text-base font-black text-slate-800">Thời khóa biểu hôm nay</h3>
            </div>
            <button
              onClick={() => onNavigate('timetable')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
            >
              Xem cả tuần
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar">
            {todayLessons.length > 0 ? (
              <div className="space-y-2">
                {todayLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-teal-50/50 border-l-4 border-teal-600"
                  >
                    <div>
                      <strong className="text-sm font-extrabold text-slate-800">
                        {lesson.subject}
                      </strong>
                      <div className="text-xs text-slate-500 mt-0.5">Tiết: {lesson.slot}</div>
                    </div>
                    <span className="text-xs font-bold text-teal-800 bg-teal-100/70 px-2.5 py-1 rounded-xl">
                      {lesson.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Hôm nay chưa có tiết học được lên lịch. Bạn có thể vào mục Thời khóa biểu để xếp lịch dạy!
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md flex flex-col justify-between max-h-[320px]">
          <div className="overflow-y-auto pr-1 custom-scrollbar">
            <div className="pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800">Thao tác lớp học nhanh</h3>
              <p className="text-xs text-slate-500">Các công cụ hỗ trợ trực tiếp trong giờ dạy</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => onNavigate('attendance')}
                className="p-3.5 rounded-2xl border-2 border-teal-100 hover:border-teal-400 bg-teal-50/50 hover:bg-teal-50 text-slate-800 font-bold text-xs flex flex-col items-center text-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <ClipboardCheck className="w-6 h-6 text-teal-600" />
                <span>Điểm danh lớp</span>
              </button>

              <button
                onClick={() => onNavigate('seating')}
                className="p-3.5 rounded-2xl border-2 border-sky-100 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-50 text-slate-800 font-bold text-xs flex flex-col items-center text-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <LayoutGrid className="w-6 h-6 text-sky-600" />
                <span>Sơ đồ chỗ ngồi</span>
              </button>

              <button
                onClick={() => onNavigate('countdown')}
                className="p-3.5 rounded-2xl border-2 border-amber-100 hover:border-amber-400 bg-amber-50/50 hover:bg-amber-50 text-slate-800 font-bold text-xs flex flex-col items-center text-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Timer className="w-6 h-6 text-amber-600" />
                <span>Đồng hồ đếm ngược</span>
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-600 font-medium">Bạn muốn tổ chức trò chơi?</span>
            <button
              onClick={() => onNavigate('wheel')}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer transition-colors"
            >
              Mở Lồng Cầu May Mắn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
