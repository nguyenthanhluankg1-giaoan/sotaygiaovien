export interface UserAccount {
  id: string;
  username: string; // Tên đăng nhập (ví dụ: admin, gv_abc)
  email: string;
  name: string; // Họ và tên
  role: 'admin' | 'teacher';
  teacherType?: 'GVCN' | 'GVBM'; // Chức năng: Giáo viên chủ nhiệm hoặc Giáo viên bộ môn
  password: string; // Mật khẩu đăng nhập
  subject?: string; // Môn giảng dạy
  school?: string; // Trường học
  year?: string; // Niên khóa
  assignedClassIds?: string[]; // Danh sách lớp phân công
  status: 'active' | 'locked'; // Trạng thái hoạt động
  avatar?: string;
  phone?: string;
  note?: string;
  createdAt: string;
  lastLogin?: string;
  activeDays?: number; // Số ngày được cấp phép hoạt động
  expiresAt?: string; // Mốc thời gian ISO hết hạn hoạt động
  apiKey?: string; // Gemini API Key cá nhân đồng bộ đám mây cho tài khoản Giáo viên
}

export interface ContactInfo {
  title?: string;
  phone?: string;
  zalo?: string;
  qrCode?: string;
  note?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  gender: 'Nam' | 'Nữ' | 'Khác' | string;
  coins: number;
  avatar: string;
  favorite: boolean;
  note: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  year: string;
  color: string;
  bannerUrl?: string;
  slogan?: string;
  hideBannerText?: boolean;
}

export interface TeacherProfile {
  name: string;
  role: string;
  teacherType?: 'GVCN' | 'GVBM';
  subject: string;
  school: string;
  year: string;
  avatar: string;
}

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'unexcused';

export interface SeatingConfig {
  lanes: number;
  seats: number;
  mode: '2d' | '3d';
  deskType?: 'single' | 'double';
  assignments: Record<number, string>; // seatIndex -> studentId
}

export interface TimetableEntry {
  id: string;
  classId: string;
  day: number; // 0 = Thứ Hai, 4 = Thứ Sáu
  slot: string; // S1, S2... C1, C2...
  subject: string;
  time: string;
}

export interface TimetableConfig {
  morning: boolean;
  afternoon: boolean;
  morningCount: number;
  afternoonCount: number;
  entries: TimetableEntry[];
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  image?: string;
  stock: number;
}

export interface Redemption {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  rewardName: string;
  cost: number;
  time: string;
}

export interface CoinTransaction {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  amount: number;
  reason: string;
  subject: string;
  time: string;
}

export interface WheelHistoryItem {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  effect: string;
  time: string;
}

export interface FilmHistoryItem {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  time: string;
}

export interface LinkItem {
  id: string;
  name: string;
  url: string;
  category: string;
  desc: string;
  pinned: boolean;
}

export interface QuestionFolder {
  id: string;
  name: string;
  description?: string;
  color?: string; // HEX color or tailwind color code
  createdAt?: string;
  subject?: string; // Môn học áp dụng (Tin học, Công nghệ, Toán...)
  grade?: number | string; // Khối lớp áp dụng (1, 2, 3, 4, 5 hoặc 'all')
  classId?: string; // Lớp học áp dụng cụ thể (classId hoặc 'all')
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[]; // 4 options
  correctIndex: number; // 0, 1, 2, 3
  subject?: string;
  grade?: number | string; // Khối lớp áp dụng: 1, 2, 3, 4, 5 hoặc 'all' (Tất cả các khối)
  classId?: string; // Lớp học cụ thể: classId hoặc 'all'
  folderId?: string; // ID of QuestionFolder
  rewardCoins?: number; // default 2 xu
  explanation?: string;
}

export interface AppSettings {
  wheelExclude: boolean;
  filmExclude: boolean;
  tickLast10: boolean;
  timerColor: string;
}

export interface AppState {
  version: number;
  ownerUserId?: string; // ID của tài khoản giáo viên sở hữu không gian làm việc này
  ownerName?: string; // Tên giáo viên sở hữu
  updatedAt?: string; // Thời gian cập nhật ISO string
  activeClassId: string;
  currentPage: string;
  teacher: TeacherProfile;
  classes: ClassInfo[];
  students: Student[];
  attendance: Record<string, Record<string, AttendanceStatus>>; // classId_YYYY-MM-DD -> { studentId: status }
  attendanceDate: string;
  seating: Record<string, SeatingConfig>; // classId -> config
  timetable: TimetableConfig;
  rewards: Reward[];
  redemptions: Redemption[];
  transactions: CoinTransaction[];
  wheelHistory: WheelHistoryItem[];
  filmHistory: FilmHistoryItem[];
  links: LinkItem[];
  subjects: string[];
  settings: AppSettings;
  wheelExcluded: string[];
  filmExcluded: string[];
  wheelEffect?: string;
  wheelGroup?: 'all' | 'favorite';
  quizQuestions?: QuizQuestion[];
  questionFolders?: QuestionFolder[];
  wheelQuizEnabled?: boolean;
  wheelQuizTimer?: number; // seconds, e.g. 15
  wheelQuizSubject?: string; // 'all' or specific subject
  wheelQuizGrade?: string | number; // 'auto' (tự động theo lớp đang chọn), 'all' (tất cả các khối), 1, 2, 3, 4, 5
  wheelQuizClassId?: string; // 'all' hoặc classId cụ thể
  wheelQuizFolderId?: string; // 'all', 'uncategorized', or specific folder ID
  wheelQuizShuffleOptions?: boolean; // Tự động đảo thứ tự các đáp án A B C D khi hiển thị
  usedQuizQuestionIds?: string[]; // IDs of questions already asked, to ensure no duplicates
  worksheets?: WorksheetItem[];
  dragDropGames?: DragDropGameItem[];
  personalMeetings?: PersonalMeetingItem[];
  departmentMeetings?: DepartmentMeetingItem[];
  meetingFolders?: MeetingFolder[];
}

export interface MeetingFolder {
  id: string;
  name: string;
  description?: string;
  color?: string; // HEX color or tailwind color
  type: 'personal' | 'department'; // 'personal' for Sổ họp cá nhân, 'department' for BIÊN BẢN TỔ KHỐI
  createdAt?: string;
}

export interface PersonalMeetingItem {
  id: string;
  title: string;
  meetingDate: string;
  location?: string;
  chairperson?: string;
  attendees?: string;
  category: string; // 'Họp Hội đồng' | 'Họp Chuyên môn' | 'Họp Chủ nhiệm' | 'Họp Khối' | 'Khác'
  folderId?: string; // ID of MeetingFolder
  content: string;
  actionItems?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentMeetingItem {
  id: string;
  title: string;
  department: string; // 'Tổ Khối 1' | 'Tổ Khối 2' | 'Tổ Khối 3' | 'Tổ Khối 4' | 'Tổ Khối 5' | 'Tổ Bộ môn'
  meetingDate: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  chairperson: string;
  secretary: string;
  totalMembers?: number;
  presentMembers?: number;
  absentMembers?: string;
  purpose?: string;
  folderId?: string; // ID of MeetingFolder
  reviewPastWork?: string;
  upcomingPlan?: string;
  discussions?: string;
  resolutions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DragDropPair {
  id: string;
  image: string; // Base64 data URL, image URL, or emoji/SVG
  imageType?: 'url' | 'emoji' | 'upload';
  caption?: string; // Optional caption
  targetLabel: string; // Correct answer text or target slot name
  targetGroupId?: string; // Target category/bucket ID if mode is 'sorting'
  hint?: string; // Optional hint for students
  xPercent?: number; // 0-100% position on central background image
  yPercent?: number; // 0-100% position on central background image
}

export interface DragDropTargetZone {
  id: string;
  label: string; // Group/category name
  description?: string;
  color?: string; // 'emerald' | 'sky' | 'rose' | 'amber' | 'purple' | 'indigo'
}

export interface DragDropGameItem {
  id: string;
  title: string;
  description?: string;
  subject: string; // 'Toán', 'Tiếng Việt', 'Tiếng Anh', 'Tự nhiên & Xã hội', 'Khoa học', 'Tin học'...
  grade: string; // 'Khối 1', 'Khối 2', 'Khối 3', 'Khối 4', 'Khối 5', 'Tất cả'
  mode: 'matching' | 'sorting'; // 'matching': 1-to-1 matching; 'sorting': categorize into buckets
  centerImage?: string; // Central background illustration image (e.g. Tree, Clock, Human Body, Solar System)
  centerImageCaption?: string; // Optional caption for central background image
  timerSeconds?: number; // 0 = no timer
  pairs: DragDropPair[];
  targetZones?: DragDropTargetZone[];
  rewardFlowers?: number; // Default 3 🌺
  createdAt: string;
  isPreset?: boolean;
}

export interface WorksheetQuestion {
  id: string;
  type: 'mcq' | 'essay' | 'fill' | 'matching';
  questionText: string;
  options?: string[]; // Dùng cho trắc nghiệm
  correctAnswer?: string;
  score?: number;
  explanation?: string;
}

export interface WorksheetItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  schoolName?: string;
  teacherName?: string;
  createdDate: string;
  note?: string;
  questions: WorksheetQuestion[];
}

export const DEFAULT_SUBJECTS: string[] = [
  'Ghi chung / Nề nếp',
  'Toán',
  'Tiếng Việt',
  'Tiếng Anh',
  'Tự nhiên & Xã hội',
  'Khoa học',
  'Lịch sử & Địa lý',
  'Tin học',
  'Công nghệ',
  'Mĩ thuật',
  'Âm nhạc',
  'Giáo dục thể chất',
  'Đạo đức',
  'Hoạt động trải nghiệm',
  'Sinh hoạt lớp',
  'Chào cờ'
];

export const DAYS_OF_WEEK = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu'
];

export const WHEEL_EFFECTS = [
  'Xoáy tròn',
  'Tung nảy',
  'Hút vào tâm',
  'Bay theo quỹ đạo',
  'Mưa bóng',
  'Sân khấu ánh sáng',
  'Sóng bồng bềnh'
];

// ==========================================
// KẾ HOẠCH DẠY HỌC (KHDH) / LỊCH BÁO GIẢNG
// ==========================================

export interface PpctItem {
  id: string;
  grade: number | string; // Khối lớp (1, 2, 3, 4, 5...)
  subject: string; // Tên môn học (Tiếng Việt, Lịch sử và Địa lí...)
  subSubject?: string; // Phân môn (Tập đọc, LTVC, Tập làm văn, Lịch sử, Địa lí...)
  week: number; // Tuần (1 -> 35)
  periodIndex: number; // Tiết theo PPCT
  lessonName: string; // Tên bài dạy
  integrationNote?: string; // Tích hợp (STEM, GDQP, Chuyển đổi số...)
  notes?: string; // Ghi chú thêm
}

export interface TimetableSlot {
  id: string;
  dayOfWeek: number; // 2: Thứ Hai, 3: Thứ Ba, ..., 6: Thứ Sáu, 7: Thứ Bảy
  session: 'morning' | 'afternoon' | string; // 'morning' (Sáng) hoặc 'afternoon' (Chiều)
  period: number; // Tiết 1 -> 5
  className: string; // Lớp (3A1, 4A2...)
  subject: string; // Môn học (Tiếng Việt, Toán...)
  subSubject?: string; // Phân môn (Tập đọc, LTVC, Tập làm văn...)
  grade: number | string; // Khối lớp
}

export interface SchoolConfig {
  schoolName: string;
  departmentName: string;
  republicTitleTop: string;
  republicTitleSub: string;
  documentTitle: string;
  subjectTitle: string;
  academicYear: string;
  startDateWeek1: string; // YYYY-MM-DD (Thứ Hai tuần 1)
  weekStartOverrides?: Record<number, string>; // Tùy chỉnh ngày bắt đầu theo tuần (ví dụ: { 22: '2025-02-10' } sau khi nghỉ Tết)
  location: string;
  principalTitle: string;
  principalName: string;
  headTeacherTitle: string;
  headTeacherName: string;
  teacherTitle: string;
  teacherName: string;
}

export interface LessonPlanRow {
  id: string;
  dayOfWeek: number; // 2 -> 7
  dateStr: string; // DD/MM/YYYY
  session: string; // 'Sáng' | 'Chiều'
  period: number; // 1 -> 5
  className: string;
  subject: string;
  subSubject?: string;
  lessonName: string;
  integrationNote?: string;
  isCustomized?: boolean;
}

export interface LessonPlanWeek {
  weekNumber: number;
  startDate: string; // DD/MM/YYYY
  endDate: string; // DD/MM/YYYY
  rows: LessonPlanRow[];
}

export interface ConfiguredClass {
  id: string;
  name: string;
  grade: number;
}

export interface KhdhDataState {
  config: SchoolConfig;
  ppctList: PpctItem[];
  timetable: TimetableSlot[];
  customizedWeeks: Record<number, LessonPlanRow[]>;
  configuredClasses?: ConfiguredClass[];
}

// ==========================================
// SOẠN GIÁO ÁN / KẾ HOẠCH BÀI DẠY CHI TIẾT
// ==========================================

export interface LessonTaskStep {
  stepNumber: number; // 1 -> 4
  stepName: string; // "Bước 1: Chuyển giao nhiệm vụ", "Bước 2: Thực hiện nhiệm vụ", "Bước 3: Báo cáo kết quả", "Bước 4: Đánh giá, kết luận"
  teacherAction: string; // Hoạt động của Giáo viên (lệnh, câu hỏi, hướng dẫn chi tiết)
  studentAction: string; // Hoạt động của Học sinh (thao tác, lời thoại, câu trả lời)
}

export interface LessonTask {
  taskId: string;
  taskTitle: string; // "* Nhiệm vụ 1: [Tên nhiệm vụ]" (in nghiêng)
  integrationNote?: string; // Ghi rõ nội dung tích hợp (NLS, STEM, Công dân số) tại nhiệm vụ này
  steps: LessonTaskStep[];
}

export interface LessonActivity {
  activityNumber: number; // 1 -> 4
  activityName: string; // "1. Khởi động (khoảng 5 phút)", "2. Hình thành kiến thức mới (khoảng 15 phút)", "3. Luyện tập, thực hành (khoảng 10 phút)", "4. Vận dụng, trải nghiệm (khoảng 5 phút)"
  timeEstimate?: string;
  integrationNote?: string; // Ghi rõ nội dung tích hợp (NLS, STEM, Công dân số) được phân bổ vào hoạt động này
  tasks: LessonTask[];
}

export interface PeriodPlan {
  periodIndex: number; // 1, 2, 3...
  subSubject?: string; // Phân môn (ví dụ: Đọc, Luyện từ và câu, Viết, Đọc mở rộng, Lịch sử, Địa lí...)
  lessonTitle?: string; // Tên bài dạy trực tiếp của tiết học đó
  weekNumber?: number; // Tuần thứ mấy (ví dụ: Tuần 1, Tuần 2)
  ppctPeriodIndex?: number; // Tiết theo PPCT (ví dụ: Tiết 1, Tiết 2, Tiết 3...)
  ppctPeriodsText?: string;
  timeRange?: string;
  header: {
    subject: string;
    grade: number | string;
    title: string; // Tên bài dạy chung và tổng số tiết (vd: "Bài 1: Cổng trường mở ra (2 tiết)")
    subSubject?: string;
    lessonTitle?: string;
    timeRange?: string; // vd: "từ 09/09/2024 đến 13/09/2024"
    weekNumber?: number;
  };
  objectives: {
    specificCompetencies: string[]; // 1. Năng lực đặc thù
    generalCompetencies: string[]; // 2. Năng lực chung
    qualities: string[]; // 3. Phẩm chất
    integrationContent?: string[]; // 4. Nội dung tích hợp (NLS CV 3456, STEM CV 909, Công dân số CV 3899)
  };
  teachingTools: {
    teacher: string[];
    student: string[];
  };
  activities: LessonActivity[]; // Đúng 4 hoạt động
  postLessonAdjustment?: string; // IV. Điều chỉnh sau bài dạy
}

export interface UploadedFileInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
}

export interface DetailedLessonPlan {
  id: string;
  topic: string;
  subject: string;
  grade: number | string;
  totalPeriods: number;
  weekNumber?: number; // Tuần thứ mấy theo PPCT
  ppctPeriodsText?: string; // vd: "Tiết 1, 2 theo PPCT"
  timeRange?: string; // vd: "từ 09/09/2024 đến 13/09/2024"
  bookSeries?: string;
  createdAt: string;
  periodPlans: PeriodPlan[];
}

export type Level = string;
export interface QuizResponse {
  questions: QuizQuestion[];
}


