import {
  AppState,
  UserAccount,
  DAYS_OF_WEEK,
  DEFAULT_DEPARTMENT_MEETING_SCHEDULE,
  DepartmentMeetingSchedule,
  DepartmentMeetingItem,
  TimetableEntry
} from '../types';

export interface WeeklyMeetingStatus {
  schedule: DepartmentMeetingSchedule;
  dayIndex: number; // 0 = Thứ Hai, 1 = Thứ Ba, 2 = Thứ Tư, 3 = Thứ Năm, 4 = Thứ Sáu
  dayName: string; // 'Thứ Năm'
  time: string; // '14:00 - 16:30'
  sessionName: string; // 'Buổi Chiều' | 'Buổi Sáng'
  location: string;
  departmentName: string;
  focusTopic: string;

  // Timing relative to current day
  currentDayOfWeek: number; // 0 = Thứ Hai ... 6 = Chủ Nhật
  isToday: boolean;
  isTomorrow: boolean;
  isPastThisWeek: boolean;
  daysRemaining: number; // Số ngày còn lại tới buổi họp tiếp theo

  // Timetable integration
  hasTimetableMatch: boolean;
  matchingTimetableEntry?: TimetableEntry;

  // Meeting record in current week
  hasRecordedMinutesThisWeek: boolean;
  recordedMinutesList: DepartmentMeetingItem[];

  // User dismissal state
  isDismissedToday: boolean;
}

/**
 * Lấy thứ hiện tại trong tuần (0: Thứ Hai -> 6: Chủ Nhật)
 */
export function getCurrentDayIndex(): number {
  const jsDay = new Date().getDay(); // 0 is Sunday
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Lấy khoảng ngày Thứ Hai - Chủ Nhật của tuần hiện tại dạng YYYY-MM-DD
 */
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayIdx = getCurrentDayIndex();

  const monday = new Date(now);
  monday.setDate(now.getDate() - dayIdx);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {
    start: format(monday),
    end: format(sunday)
  };
}

/**
 * Phân tích và lấy trạng thái lịch họp tổ chuyên môn hàng tuần dựa trên thời khóa biểu và cấu hình
 */
export function getWeeklyDepartmentMeetingStatus(
  state: AppState,
  currentUser?: UserAccount | null
): WeeklyMeetingStatus {
  // 1. Lấy cấu hình lịch họp hoặc mặc định
  const baseSchedule: DepartmentMeetingSchedule =
    state.timetable?.departmentMeetingSchedule || {
      ...DEFAULT_DEPARTMENT_MEETING_SCHEDULE,
      departmentName: currentUser?.subject
        ? `Tổ ${currentUser.subject}`
        : DEFAULT_DEPARTMENT_MEETING_SCHEDULE.departmentName
    };

  // 2. Tìm kiếm tiết họp tổ chuyên môn trong Thời Khóa Biểu
  const timetableEntries = state.timetable?.entries || [];
  const timetableMatch = timetableEntries.find((entry) => {
    const s = (entry.subject || '').toLowerCase();
    return (
      s.includes('chuyên môn') ||
      s.includes('họp tổ') ||
      s.includes('shcm') ||
      s.includes('sinh hoạt chuyên môn')
    );
  });

  // Nếu có tiết chuyên môn trên thời khóa biểu, có thể đồng bộ thứ & giờ nếu chưa đổi tùy chỉnh
  let dayIndex = baseSchedule.dayOfWeek ?? 3;
  let time = baseSchedule.time || '14:00 - 16:30';
  let session = baseSchedule.session || 'afternoon';

  if (timetableMatch && !state.timetable?.departmentMeetingSchedule) {
    dayIndex = timetableMatch.day;
    if (timetableMatch.time) time = timetableMatch.time;
    session = timetableMatch.slot?.startsWith('S') ? 'morning' : 'afternoon';
  }

  // Đảm bảo dayIndex trong phạm vi 0-4 (Thứ 2 đến Thứ 6)
  dayIndex = Math.max(0, Math.min(4, dayIndex));

  const dayName = DAYS_OF_WEEK[dayIndex] || 'Thứ Năm';
  const sessionName = session === 'morning' ? 'Buổi Sáng' : 'Buổi Chiều';
  const location = baseSchedule.location || 'Phòng họp chuyên môn';
  const departmentName =
    baseSchedule.departmentName ||
    (currentUser?.subject ? `Tổ ${currentUser.subject}` : 'Tổ chuyên môn Khối 3');
  const focusTopic =
    baseSchedule.focusTopic ||
    'Sinh hoạt chuyên môn theo hướng nghiên cứu bài học & đánh giá tuần';

  // 3. Tính toán thời gian tương đối
  const currentDayOfWeek = getCurrentDayIndex(); // 0..6
  const isToday = currentDayOfWeek === dayIndex;
  const isTomorrow =
    currentDayOfWeek === (dayIndex - 1 + 7) % 7 && currentDayOfWeek <= 4;
  const isPastThisWeek = currentDayOfWeek > dayIndex;

  let daysRemaining = 0;
  if (currentDayOfWeek <= dayIndex) {
    daysRemaining = dayIndex - currentDayOfWeek;
  } else {
    daysRemaining = 7 - currentDayOfWeek + dayIndex;
  }

  // 4. Kiểm tra xem tuần này đã có biên bản họp tổ được tạo chưa
  const { start, end } = getCurrentWeekRange();
  const departmentMeetings = state.departmentMeetings || [];
  const recordedMinutesList = departmentMeetings.filter((item) => {
    if (!item.meetingDate) return false;
    return item.meetingDate >= start && item.meetingDate <= end;
  });
  const hasRecordedMinutesThisWeek = recordedMinutesList.length > 0;

  // 5. Kiểm tra trạng thái tạm ẩn hôm nay
  const todayStr = new Date().toISOString().slice(0, 10);
  const isDismissedToday = baseSchedule.dismissedUntil === todayStr;

  return {
    schedule: {
      ...baseSchedule,
      dayOfWeek: dayIndex,
      time,
      session,
      location,
      departmentName,
      focusTopic
    },
    dayIndex,
    dayName,
    time,
    sessionName,
    location,
    departmentName,
    focusTopic,
    currentDayOfWeek,
    isToday,
    isTomorrow,
    isPastThisWeek,
    daysRemaining,
    hasTimetableMatch: Boolean(timetableMatch),
    matchingTimetableEntry: timetableMatch,
    hasRecordedMinutesThisWeek,
    recordedMinutesList,
    isDismissedToday
  };
}
