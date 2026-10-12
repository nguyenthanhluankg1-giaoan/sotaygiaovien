import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Settings2,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Bell
} from 'lucide-react';
import { AppState, DAYS_OF_WEEK, DepartmentMeetingSchedule, UserAccount } from '../types';
import { getWeeklyDepartmentMeetingStatus } from '../utils/meetingScheduleHelper';

interface DepartmentMeetingReminderBannerProps {
  state: AppState;
  onNavigate: (page: string) => void;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  currentUser?: UserAccount | null;
}

export const DepartmentMeetingReminderBanner: React.FC<DepartmentMeetingReminderBannerProps> = ({
  state,
  onNavigate,
  onUpdateState,
  currentUser
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isForceExpanded, setIsForceExpanded] = useState(false);

  const status = getWeeklyDepartmentMeetingStatus(state, currentUser);
  const { schedule } = status;

  // Edit form state
  const [editDay, setEditDay] = useState<number>(status.dayIndex);
  const [editSession, setEditSession] = useState<'morning' | 'afternoon'>(schedule.session || 'afternoon');
  const [editTime, setEditTime] = useState<string>(status.time);
  const [editLocation, setEditLocation] = useState<string>(status.location);
  const [editDeptName, setEditDeptName] = useState<string>(status.departmentName);
  const [editFocusTopic, setEditFocusTopic] = useState<string>(status.focusTopic);
  const [editEnabled, setEditEnabled] = useState<boolean>(schedule.enabled ?? true);

  const handleOpenEdit = () => {
    setEditDay(status.dayIndex);
    setEditSession(schedule.session || 'afternoon');
    setEditTime(status.time);
    setEditLocation(status.location);
    setEditDeptName(status.departmentName);
    setEditFocusTopic(status.focusTopic);
    setEditEnabled(schedule.enabled ?? true);
    setIsEditModalOpen(true);
  };

  // Nếu người dùng đã tắt nhắc nhở trong cấu hình: Hiển thị thanh nhỏ gọn để vẫn thấy và có thể bật lại
  if (schedule.enabled === false) {
    return (
      <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 transition-all hover:bg-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-slate-200 text-slate-600">
            <Bell className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold">Lịch sinh hoạt chuyên môn Tổ:</span>
          <span className="text-slate-500">Đang tạm tắt nhắc nhở tự động</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('meeting_schedule')}
            className="text-[11px] font-black text-teal-700 hover:text-teal-900 cursor-pointer underline flex items-center gap-1"
          >
            <span>Mở Lịch họp</span>
          </button>
          <span className="text-slate-300">·</span>
          <button
            onClick={handleOpenEdit}
            className="text-[11px] font-black text-indigo-700 hover:text-indigo-900 cursor-pointer flex items-center gap-1"
          >
            <Settings2 className="w-3 h-3" />
            <span>Cấu hình / Bật lại</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSchedule: DepartmentMeetingSchedule = {
      enabled: editEnabled,
      dayOfWeek: editDay,
      time: editTime.trim() || '14:00 - 16:30',
      session: editSession,
      location: editLocation.trim() || 'Phòng họp chuyên môn',
      departmentName: editDeptName.trim() || 'Tổ chuyên môn',
      focusTopic: editFocusTopic.trim() || 'Sinh hoạt chuyên môn theo hướng nghiên cứu bài học'
    };

    onUpdateState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        departmentMeetingSchedule: updatedSchedule
      }
    }));

    setIsEditModalOpen(false);
  };

  const handleDismissToday = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    onUpdateState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        departmentMeetingSchedule: {
          ...(prev.timetable.departmentMeetingSchedule || status.schedule),
          dismissedUntil: todayStr
        }
      }
    }));
    setIsForceExpanded(false);
  };

  const handleReExpand = () => {
    setIsForceExpanded(true);
  };

  // Nếu đã bấm ẩn hôm nay và không bấm mở lại: Hiển thị thanh pill nhỏ gọn nhẹ nhàng
  if (status.isDismissedToday && !isForceExpanded) {
    return (
      <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-900 transition-all hover:bg-indigo-100/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-indigo-200/70 text-indigo-800">
            <Bell className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold">
            Lịch sinh hoạt chuyên môn Tổ:
          </span>
          <span className="font-semibold text-indigo-700">
            {status.sessionName} {status.dayName} ({status.time}) · {status.location}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReExpand}
            className="text-[11px] font-black text-indigo-700 hover:text-indigo-900 cursor-pointer underline flex items-center gap-1"
          >
            <span>Mở chi tiết</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-50/95 via-purple-50/90 to-sky-50/90 border-2 border-indigo-100/90 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md animate-in fade-in duration-300">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-200/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3.5">
          {/* Top row: Title, badges, and controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-2xl bg-indigo-600 text-white shadow-xs shrink-0 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-indigo-950 flex items-center gap-1.5">
                    <span>Nhắc Nhở Lịch Họp Tổ Chuyên Môn</span>
                    <span className="text-[11px] font-bold text-indigo-600 hidden sm:inline">
                      ({status.departmentName})
                    </span>
                  </h3>

                  {/* Status badges */}
                  {status.isToday ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      🔔 Hôm nay diễn ra
                    </span>
                  ) : status.isTomorrow ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300">
                      ⏰ Diễn ra ngày mai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      📅 Còn {status.daysRemaining} ngày nữa
                    </span>
                  )}

                  {status.hasRecordedMinutesThisWeek ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Đã có biên bản tuần này</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100/80 text-purple-800 border border-purple-200">
                      <span>Chưa ghi biên bản tuần này</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-indigo-800/85 font-medium mt-0.5">
                  Lịch sinh hoạt chuyên môn định kỳ hàng tuần được đồng bộ cùng thời khóa biểu giảng dạy.
                </p>
              </div>
            </div>

            {/* Top right quick controls */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={handleOpenEdit}
                className="p-1.5 rounded-xl text-indigo-700 hover:text-indigo-950 hover:bg-white/80 transition-colors cursor-pointer"
                title="Tùy chỉnh lịch họp tổ"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDismissToday}
                className="p-1.5 rounded-xl text-indigo-500 hover:text-indigo-800 hover:bg-white/80 transition-colors cursor-pointer"
                title="Tạm ẩn thông báo hôm nay"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Middle info block: Schedule details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white/75 border border-indigo-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-700 shrink-0">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                  Thời gian
                </span>
                <strong className="text-slate-800 font-black">
                  {status.sessionName} {status.dayName} · {status.time}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                  Địa điểm
                </span>
                <strong className="text-slate-800 font-black truncate block">
                  {status.location}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-50 text-sky-700 shrink-0">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                  Trọng tâm sinh hoạt
                </span>
                <span className="text-slate-700 font-semibold truncate block" title={status.focusTopic}>
                  {status.focusTopic}
                </span>
              </div>
            </div>
          </div>

          {/* Pedagogical friendly reminder text & actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-0.5">
            <div className="text-xs text-indigo-900 leading-relaxed font-medium">
              {status.isToday ? (
                <span>
                  💡 <b>Lưu ý hôm nay:</b> Thầy/Cô chuẩn bị sẵn kế hoạch bài dạy minh họa, phiếu quan sát học sinh và sổ ghi chép để sinh hoạt tổ đạt hiệu quả tốt nhất nhé!
                </span>
              ) : status.isTomorrow ? (
                <span>
                  💡 <b>Nhắc nhở ngày mai:</b> Buổi họp tổ chuyên môn sẽ diễn ra vào ngày mai. Thầy/Cô có thể ghi nhận trước các ý kiến đóng góp hoặc nội dung cần thảo luận.
                </span>
              ) : (
                <span>
                  💡 <b>Gợi ý sư phạm:</b> Lịch họp tổ định kỳ vào mỗi <b>{status.sessionName.toLowerCase()} {status.dayName}</b>. Thầy/Cô có thể mở Sổ Họp để tra cứu các biên bản trước hoặc tạo mới biên bản tuần.
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => onNavigate('meeting_schedule')}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-800 font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                title="Mở toàn bộ mục Lịch họp và tiến trình 35 tuần"
              >
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mục Lịch Họp</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('timetable')}
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-800 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Xem TKB</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('department_meeting')}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/25"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{status.hasRecordedMinutesThisWeek ? 'Xem Biên Bản Tổ' : 'Ghi Biên Bản Tổ'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tùy chỉnh lịch họp tổ chuyên môn */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-indigo-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Cấu Hình Lịch Họp Tổ Chuyên Môn
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lên lịch định kỳ hàng tuần nhắc nhở trên bảng điều khiển chính
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs sm:text-sm">
              {/* Bật/Tắt nhắc nhở */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <div>
                  <strong className="block text-xs font-bold text-indigo-950">
                    Bật thông báo nhắc nhở hàng tuần
                  </strong>
                  <span className="text-[11px] text-indigo-700">
                    Hiển thị thông báo nhẹ nhàng trên trang Tổng quan bảng điều khiển
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Tên Tổ Chuyên Môn */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Tổ Chuyên Môn
                </label>
                <input
                  type="text"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  placeholder="Ví dụ: Tổ chuyên môn Khối 3, Tổ Tin học - Công nghệ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                />
              </div>

              {/* Thứ trong tuần & Buổi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ngày họp trong tuần
                  </label>
                  <select
                    value={editDay}
                    onChange={(e) => setEditDay(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs bg-white"
                  >
                    {DAYS_OF_WEEK.map((dName, idx) => (
                      <option key={dName} value={idx}>
                        {dName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Buổi sinh hoạt
                  </label>
                  <select
                    value={editSession}
                    onChange={(e) => setEditSession(e.target.value as 'morning' | 'afternoon')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs bg-white"
                  >
                    <option value="afternoon">Buổi Chiều</option>
                    <option value="morning">Buổi Sáng</option>
                  </select>
                </div>
              </div>

              {/* Khung giờ & Địa điểm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Khung giờ họp
                  </label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    placeholder="Ví dụ: 14:00 - 16:30"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Địa điểm họp
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Ví dụ: Phòng họp chuyên môn"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Nội dung trọng tâm */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung trọng tâm / Ghi chú
                </label>
                <input
                  type="text"
                  value={editFocusTopic}
                  onChange={(e) => setEditFocusTopic(e.target.value)}
                  placeholder="Ví dụ: Sinh hoạt chuyên môn theo hướng nghiên cứu bài học..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer shadow-md shadow-indigo-600/25"
                >
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
