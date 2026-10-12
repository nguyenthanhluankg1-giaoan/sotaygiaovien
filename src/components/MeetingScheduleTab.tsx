import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Settings2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  Printer,
  BookOpen,
  ChevronRight,
  Search,
  Bell,
  Sliders,
  ExternalLink
} from 'lucide-react';
import {
  AppState,
  DAYS_OF_WEEK,
  DepartmentMeetingSchedule,
  DepartmentMeetingItem,
  UserAccount,
  TimetableEntry
} from '../types';
import { getWeeklyDepartmentMeetingStatus, getCurrentWeekRange } from '../utils/meetingScheduleHelper';

interface MeetingScheduleTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  currentUser?: UserAccount | null;
  onNavigate?: (page: string) => void;
  onOpenCreateDepartmentMeeting?: (prefillDate?: string) => void;
  onOpenEditDepartmentMeeting?: (meeting: DepartmentMeetingItem) => void;
}

// 35 tuần năm học chuẩn Bộ GD&ĐT với chủ đề sinh hoạt chuyên môn theo Công văn 1315/BGDĐT
const ACADEMIC_WEEKS_THEMES = [
  { week: 1, title: 'Tuần 1: Ổn định nền nếp, phân công chuyên môn & kế hoạch tổ năm học mới' },
  { week: 2, title: 'Tuần 2: Thống nhất quy chế chuyên môn, kế hoạch dạy học (PPCT) các môn' },
  { week: 3, title: 'Tuần 3: Sinh hoạt NCBH Bước 1: Thống nhất bài học nghiên cứu Khối lớp' },
  { week: 4, title: 'Tuần 4: Đánh giá tháng 9, sinh hoạt NCBH Bước 1: Thảo luận kế hoạch bài dạy' },
  { week: 5, title: 'Tuần 5: Sinh hoạt NCBH Bước 2: Dạy minh họa & Dự giờ quan sát học sinh' },
  { week: 6, title: 'Tuần 6: Sinh hoạt NCBH Bước 3: Phân tích, suy ngẫm sau tiết dạy minh họa' },
  { week: 7, title: 'Tuần 7: Sinh hoạt NCBH Bước 4: Vận dụng bài học vào dạy học hàng ngày' },
  { week: 8, title: 'Tuần 8: Đánh giá chuyên môn giữa Học kỳ I, thống nhất ma trận kiểm tra' },
  { week: 9, title: 'Tuần 9: Rà soát tiến độ chương trình, bồi dưỡng học sinh gặp khó khăn' },
  { week: 10, title: 'Tuần 10: Chuyên đề đổi mới phương pháp dạy học & ứng dụng CNTT/AI' },
  { week: 11, title: 'Tuần 11: Sinh hoạt NCBH đợt 2: Xây dựng kế hoạch bài dạy liên môn/STEM' },
  { week: 12, title: 'Tuần 12: Sinh hoạt NCBH đợt 2: Dạy minh họa bài học STEM & dự giờ' },
  { week: 13, title: 'Tuần 13: Sinh hoạt NCBH đợt 2: Phân tích hoạt động học của học sinh' },
  { week: 14, title: 'Tuần 14: Đánh giá chuyên môn tháng 11, chuẩn bị kiểm tra cuối Học kỳ I' },
  { week: 15, title: 'Tuần 15: Thống nhất nội dung ôn tập & đề cương kiểm tra định kỳ HK I' },
  { week: 16, title: 'Tuần 16: Trao đổi kinh nghiệm rèn chữ viết và giữ vở sạch cho học sinh' },
  { week: 17, title: 'Tuần 17: Kiểm tra chéo hồ sơ sổ sách giáo viên, đánh giá nề nếp tổ' },
  { week: 18, title: 'Tuần 18: Sơ kết công tác chuyên môn Học kỳ I, triển khai nhiệm vụ HK II' },
  { week: 19, title: 'Tuần 19: Triển khai kế hoạch dạy học Học kỳ II, sinh hoạt tổ khối đầu kỳ' },
  { week: 20, title: 'Tuần 20: Sinh hoạt NCBH đợt 3 Bước 1: Chọn bài học nghiên cứu môn Toán/TV' },
  { week: 21, title: 'Tuần 21: Sinh hoạt NCBH đợt 3 Bước 1: Thảo luận xây dựng tiến trình dạy học' },
  { week: 22, title: 'Tuần 22: Sinh hoạt NCBH đợt 3 Bước 2: Dạy minh họa & Quan sát học sinh học' },
  { week: 23, title: 'Tuần 23: Sinh hoạt NCBH đợt 3 Bước 3: Phân tích và chia sẻ kết quả quan sát' },
  { week: 24, title: 'Tuần 24: Đánh giá công tác chuyên môn tháng 2, đẩy mạnh nề nếp sau Tết' },
  { week: 25, title: 'Tuần 25: Chuyên đề nâng cao chất lượng dạy học môn Tiếng Việt/Toán' },
  { week: 26, title: 'Tuần 26: Thảo luận xây dựng ngân hàng câu hỏi và bài tập củng cố kiến thức' },
  { week: 27, title: 'Tuần 27: Đánh giá chuyên môn giữa HK II, chuẩn bị kiểm tra định kỳ giữa kỳ' },
  { week: 28, title: 'Tuần 28: Sinh hoạt NCBH đợt 4: Bài dạy minh họa tích hợp giáo dục kĩ năng sống' },
  { week: 29, title: 'Tuần 29: Phân tích sau tiết dạy minh họa đợt 4 và ứng dụng thực tiễn' },
  { week: 30, title: 'Tuần 30: Đánh giá chuyên môn tháng 4, chuẩn bị ôn tập cuối năm học' },
  { week: 31, title: 'Tuần 31: Thống nhất kế hoạch ôn tập & đề kiểm tra đánh giá cuối năm' },
  { week: 32, title: 'Tuần 32: Hoàn thành chương trình các môn học, rà soát hồ sơ học sinh' },
  { week: 33, title: 'Tuần 33: Tổ chức kiểm tra cuối năm, chấm bài và đánh giá học sinh' },
  { week: 34, title: 'Tuần 34: Hoàn thành đánh giá học sinh theo TT27/22, tổng hợp báo cáo tổ' },
  { week: 35, title: 'Tuần 35: Tổng kết công tác chuyên môn tổ khối cả năm học 2026 - 2027' }
];

export const MeetingScheduleTab: React.FC<MeetingScheduleTabProps> = ({
  state,
  onUpdateState,
  currentUser,
  onNavigate,
  onOpenCreateDepartmentMeeting,
  onOpenEditDepartmentMeeting
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'recorded' | 'unrecorded'>('all');
  const [searchSchedule, setSearchSchedule] = useState('');
  const [prepChecklist, setPrepChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('meeting_prep_checklist_v1');
      return saved ? JSON.parse(saved) : {
        'prep_1': true,
        'prep_2': true,
        'prep_3': false,
        'prep_4': false,
        'prep_5': false
      };
    } catch {
      return {};
    }
  });

  const toggleChecklist = (id: string) => {
    setPrepChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('meeting_prep_checklist_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const status = getWeeklyDepartmentMeetingStatus(state, currentUser);
  const { schedule } = status;

  // Edit schedule form state
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

  const handlePrintSchedule = () => {
    window.print();
  };

  // Tính ngày cụ thể cho từng tuần dựa vào ngày đầu năm học (ước tính tuần hiện tại)
  const currentWeekRange = getCurrentWeekRange();
  const departmentMeetings = state.departmentMeetings || [];

  // Lập bản đồ biên bản theo ngày và tuần
  const weeksWithMeetings = useMemo(() => {
    return ACADEMIC_WEEKS_THEMES.map((item) => {
      // Tìm xem có biên bản nào trong tuần này hoặc khớp tiêu đề không
      const matched = departmentMeetings.find((dm) => {
        const titleLower = (dm.title || '').toLowerCase();
        const purposeLower = (dm.purpose || '').toLowerCase();
        const searchWord = `tuần ${item.week}`;
        return titleLower.includes(searchWord) || purposeLower.includes(searchWord);
      });
      return {
        ...item,
        meetingRecord: matched
      };
    });
  }, [departmentMeetings]);

  const filteredWeeks = useMemo(() => {
    return weeksWithMeetings.filter((w) => {
      if (scheduleFilter === 'recorded' && !w.meetingRecord) return false;
      if (scheduleFilter === 'unrecorded' && w.meetingRecord) return false;
      if (searchSchedule.trim()) {
        const term = searchSchedule.toLowerCase();
        return (
          w.title.toLowerCase().includes(term) ||
          (w.meetingRecord?.title || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [weeksWithMeetings, scheduleFilter, searchSchedule]);

  // Timetable entries related to department meetings
  const timetableEntries = state.timetable?.entries || [];
  const deptEntries = timetableEntries.filter((e) => {
    const s = (e.subject || '').toLowerCase();
    return s.includes('chuyên môn') || s.includes('họp tổ') || s.includes('shcm');
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Header Banner & Quick Summary */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-800 via-teal-700 to-indigo-800 text-white p-5 sm:p-7 shadow-xl shadow-teal-900/15">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-2xl bg-white/20 backdrop-blur-md text-amber-300">
                <CalendarDays className="w-6 h-6" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>LỊCH HỌP & SINH HOẠT CHUYÊN MÔN TỔ</span>
              </h2>

              {/* Status badges */}
              {status.isToday ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-amber-400 text-amber-950 shadow-md animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-900" />
                  🔔 HÔM NAY DIỄN RA
                </span>
              ) : status.isTomorrow ? (
                <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-sky-300 text-sky-950 shadow-sm">
                  ⏰ DIỄN RA NGÀY MAI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-white/25 text-white backdrop-blur-sm">
                  📅 CÒN {status.daysRemaining} NGÀY NỮA
                </span>
              )}

              {status.hasRecordedMinutesThisWeek ? (
                <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-emerald-400 text-emerald-950 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ĐÃ CÓ BIÊN BẢN TUẦN NÀY
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-300/40 text-indigo-100 border border-white/20">
                  CHƯA GHI BIÊN BẢN TUẦN
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-teal-100 max-w-3xl leading-relaxed">
              Kế hoạch sinh hoạt chuyên môn định kỳ hàng tuần của <b className="text-white">{status.departmentName}</b> được đồng bộ theo Thời khóa biểu, đảm bảo đúng quy định của Bộ Giáo dục & Đào tạo và Nghị định 30/2020/NĐ-CP.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
              title="Cài đặt lịch họp tổ hàng tuần"
            >
              <Settings2 className="w-4 h-4 text-teal-200" />
              <span>Thiết lập lịch họp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenCreateDepartmentMeeting) {
                  onOpenCreateDepartmentMeeting();
                } else if (onNavigate) {
                  onNavigate('department_meeting');
                }
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi biên bản họp Tổ ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Highlight Cards: Lịch Họp Định Kỳ Chi Tiết */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Thời gian */}
        <div className="p-4 rounded-3xl bg-white border-2 border-teal-100 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Thời gian định kỳ
            </span>
            <strong className="text-sm font-black text-slate-800 block truncate mt-0.5">
              {status.sessionName} {status.dayName}
            </strong>
            <span className="text-xs font-bold text-teal-700 block mt-0.5">
              {status.time}
            </span>
          </div>
        </div>

        {/* Card 2: Địa điểm */}
        <div className="p-4 rounded-3xl bg-white border-2 border-indigo-100 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Địa điểm sinh hoạt
            </span>
            <strong className="text-sm font-black text-slate-800 block truncate mt-0.5" title={status.location}>
              {status.location}
            </strong>
            <span className="text-xs font-bold text-indigo-600 block mt-0.5">
              Trực tiếp / Tại trường
            </span>
          </div>
        </div>

        {/* Card 3: Tổ chuyên môn */}
        <div className="p-4 rounded-3xl bg-white border-2 border-purple-100 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Đơn vị tổ chức
            </span>
            <strong className="text-sm font-black text-slate-800 block truncate mt-0.5" title={status.departmentName}>
              {status.departmentName}
            </strong>
            <span className="text-xs font-bold text-purple-600 block mt-0.5">
              Toàn thể giáo viên tổ
            </span>
          </div>
        </div>

        {/* Card 4: Trọng tâm sinh hoạt */}
        <div className="p-4 rounded-3xl bg-white border-2 border-amber-100 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Trọng tâm nghiên cứu
            </span>
            <strong className="text-xs font-bold text-slate-800 block line-clamp-2 mt-0.5" title={status.focusTopic}>
              {status.focusTopic}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Checklist chuẩn bị & Đồng bộ Thời khóa biểu */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Checklist chuẩn bị trước buổi họp (Sư phạm) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
                <CheckSquare className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  Chuẩn Bị Trước Buổi Họp Tổ
                </h3>
                <span className="text-[11px] text-slate-500">
                  Danh mục kiểm tra trước giờ sinh hoạt
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded-full">
              Sư phạm
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { id: 'prep_1', label: 'Soạn sẵn kế hoạch bài dạy minh họa hoặc nội dung bài học nghiên cứu' },
              { id: 'prep_2', label: 'Chuẩn bị phiếu quan sát hoạt động học của học sinh' },
              { id: 'prep_3', label: 'Ghi chú các vướng mắc, khó khăn trong tuần qua cần tổ giải đáp' },
              { id: 'prep_4', label: 'Đọc trước văn bản chỉ đạo chuyên môn mới từ BGH / Phòng GD&ĐT' },
              { id: 'prep_5', label: 'Mang theo Sổ ghi chép cá nhân hoặc máy tính xách tay' }
            ].map((item) => {
              const isChecked = Boolean(prepChecklist[item.id]);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isChecked
                      ? 'bg-teal-50/60 border-teal-200 text-teal-900'
                      : 'bg-slate-50/80 border-slate-200/80 text-slate-700 hover:bg-slate-100/70'
                  }`}
                >
                  <button type="button" className="mt-0.5 shrink-0 cursor-pointer text-teal-600">
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-teal-600 fill-teal-100" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <span className={`text-xs font-semibold leading-relaxed ${isChecked ? 'line-through opacity-75' : ''}`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Tip Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-1">
            <strong className="font-black flex items-center gap-1.5 text-amber-950">
              <span>💡 Hướng dẫn Sinh hoạt Chuyên môn:</span>
            </strong>
            <p className="text-[11px] font-medium text-amber-800/90">
              Tập trung quan sát <b>hoạt động học của học sinh</b> (học sinh học như thế nào, gặp khó khăn ở đâu, có hào hứng không), tránh nhận xét đánh giá cá nhân giáo viên dạy minh họa.
            </p>
          </div>
        </div>

        {/* Right Column: Đồng bộ Thời Khóa Biểu & Tiết Họp */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border-2 border-indigo-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-100 text-indigo-800">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  Thời Khóa Biểu & Tiết Sinh Hoạt Chuyên Môn
                </h3>
                <span className="text-[11px] text-slate-500">
                  Đồng bộ tiết họp chuyên môn trên Thời khóa biểu trường
                </span>
              </div>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('timetable')}
                className="text-xs font-black text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Xem TKB đầy đủ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mini Timetable Highlight */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-950">
                Lịch xếp trên Thời Khóa Biểu:
              </span>
              <span className="text-[11px] font-extrabold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-full">
                {deptEntries.length > 0 ? `${deptEntries.length} tiết ghi nhận` : 'Khớp lịch định kỳ'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DAYS_OF_WEEK.map((dName, dIdx) => {
                const isMeetingDay = dIdx === status.dayIndex;
                const entriesOnDay = timetableEntries.filter((e) => e.day === dIdx);
                const isCurrentDay = dIdx === status.currentDayOfWeek;

                return (
                  <div
                    key={dName}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      isMeetingDay
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-black scale-102 ring-2 ring-indigo-300'
                        : isCurrentDay
                        ? 'bg-amber-50 border-amber-300 text-slate-800 font-bold'
                        : 'bg-white border-slate-200/80 text-slate-600'
                    }`}
                  >
                    <span className="block text-xs font-black">{dName}</span>
                    <span className={`block text-[10px] mt-1 ${isMeetingDay ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {isMeetingDay ? '🗓️ Sinh hoạt Tổ' : `${entriesOnDay.length} tiết`}
                    </span>
                    {isMeetingDay && (
                      <span className="inline-block mt-1 text-[9px] bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full font-black">
                        {schedule.session === 'morning' ? 'Sáng' : 'Chiều'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-200/70 text-indigo-900">
              <span className="font-semibold">
                🔔 Thông báo nhẹ nhàng trên Bảng điều khiển:
              </span>
              <strong className="font-black text-indigo-800">
                {schedule.enabled ? 'Đang bật (Tự động)' : 'Đã tắt'}
              </strong>
            </div>
          </div>

          {/* Quick link to department meeting minutes */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span className="font-bold text-slate-700">
                Đã có <b className="text-teal-800 font-black">{departmentMeetings.length} biên bản</b> họp tổ khối được lưu trữ
              </span>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('department_meeting')}
                className="font-black text-teal-700 hover:text-teal-900 cursor-pointer flex items-center gap-1"
              >
                <span>Xem tất cả biên bản</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Chương Trình Sinh Hoạt Chuyên Môn 35 Tuần Năm Học */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-teal-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <span>Chương Trình & Kế Hoạch Sinh Hoạt Chuyên Môn 35 Tuần</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800">
                Năm học 2026 - 2027
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Tiến trình họp tổ, sinh hoạt nghiên cứu bài học theo Công văn 1315/BGDĐT & hồ sơ biên bản tương ứng
            </p>
          </div>

          {/* Controls: Search & Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchSchedule}
                onChange={(e) => setSearchSchedule(e.target.value)}
                placeholder="Tìm kiếm tuần / chủ đề..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:outline-none focus:border-teal-500 w-44"
              />
            </div>

            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 cursor-pointer focus:outline-none focus:border-teal-500"
            >
              <option value="all">Tất cả 35 tuần</option>
              <option value="recorded">Đã có biên bản</option>
              <option value="unrecorded">Chưa có biên bản</option>
            </select>

            <button
              type="button"
              onClick={handlePrintSchedule}
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="In lịch sinh hoạt chuyên môn"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline table of weeks */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-3 w-16 text-center">Tuần</th>
                <th className="py-3 px-4">Nội Dung / Chủ Đề Sinh Hoạt Chuyên Môn</th>
                <th className="py-3 px-4 w-40">Thời gian định kỳ</th>
                <th className="py-3 px-4 w-44">Hồ sơ biên bản</th>
                <th className="py-3 px-3 w-32 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWeeks.map((item) => {
                const hasMinutes = Boolean(item.meetingRecord);
                return (
                  <tr key={item.week} className="hover:bg-teal-50/40 transition-colors">
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block w-8 h-8 leading-8 rounded-xl bg-slate-100 font-black text-slate-700">
                        {item.week}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-slate-800 block text-xs">
                        {item.title}
                      </span>
                      {item.meetingRecord && (
                        <span className="text-[11px] text-teal-700 font-semibold block mt-0.5 truncate max-w-md">
                          📄 Biên bản: {item.meetingRecord.title}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <span>{status.sessionName} {status.dayName}</span>
                      <span className="block text-[10px] text-slate-400">{status.time}</span>
                    </td>
                    <td className="py-3 px-4">
                      {hasMinutes ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đã lưu biên bản</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                          <span>Chưa tạo biên bản</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {hasMinutes ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenEditDepartmentMeeting && item.meetingRecord) {
                              onOpenEditDepartmentMeeting(item.meetingRecord);
                            } else if (onNavigate) {
                              onNavigate('department_meeting');
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-extrabold text-[11px] cursor-pointer transition-colors"
                        >
                          Xem / Sửa
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenCreateDepartmentMeeting) {
                              onOpenCreateDepartmentMeeting();
                            } else if (onNavigate) {
                              onNavigate('department_meeting');
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer transition-colors"
                        >
                          + Ghi biên bản
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cài Đặt Lịch Họp Chuyên Môn */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-teal-100 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <Settings2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Cài Đặt Lịch Họp Tổ Chuyên Môn
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lịch họp định kỳ hàng tuần sẽ được nhắc nhở nhẹ nhàng trên Bảng điều khiển
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              {/* Bật/Tắt nhắc nhở */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-50 border border-teal-200">
                <div>
                  <strong className="block font-black text-teal-950">
                    Bật nhắc nhở lịch họp tổ hàng tuần
                  </strong>
                  <span className="text-[11px] text-teal-700">
                    Hiển thị thông báo nhẹ nhàng và đếm ngược trên Bảng điều khiển chính
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                  className="w-5 h-5 accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Ngày trong tuần & Buổi */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">Thứ trong tuần</label>
                  <select
                    value={editDay}
                    onChange={(e) => setEditDay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value={0}>Thứ Hai</option>
                    <option value={1}>Thứ Ba</option>
                    <option value={2}>Thứ Tư</option>
                    <option value={3}>Thứ Năm (Mặc định)</option>
                    <option value={4}>Thứ Sáu</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">Buổi họp</label>
                  <select
                    value={editSession}
                    onChange={(e) => setEditSession(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="afternoon">Buổi Chiều (Phổ biến)</option>
                    <option value="morning">Buổi Sáng</option>
                  </select>
                </div>
              </div>

              {/* Khung giờ & Địa điểm */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">Khung giờ</label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    placeholder="14:00 - 16:30"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">Địa điểm họp</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Phòng họp chuyên môn"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Tên Tổ chuyên môn */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">Tên Tổ chuyên môn</label>
                <input
                  type="text"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  placeholder="Tổ chuyên môn Khối 3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              {/* Trọng tâm sinh hoạt */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">Trọng tâm sinh hoạt mặc định</label>
                <input
                  type="text"
                  value={editFocusTopic}
                  onChange={(e) => setEditFocusTopic(e.target.value)}
                  placeholder="Sinh hoạt chuyên môn theo hướng nghiên cứu bài học"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black shadow-md shadow-teal-600/20"
                >
                  Lưu thiết lập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
