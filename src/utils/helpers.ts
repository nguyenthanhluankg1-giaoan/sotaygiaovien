import { AppState, DEFAULT_SUBJECTS, Student, UserAccount, QuestionFolder } from '../types';
import { DEFAULT_QUIZ_QUESTIONS } from '../data/defaultQuestions';

export const DEFAULT_QUESTION_FOLDERS: QuestionFolder[] = [
  {
    id: 'folder-gk1',
    name: 'Ôn tập Giữa kỳ 1',
    description: 'Bộ câu hỏi ôn tập kiểm tra giữa học kỳ 1',
    color: '#0284c7'
  },
  {
    id: 'folder-ck1',
    name: 'Ôn tập Cuối kỳ 1',
    description: 'Bộ câu hỏi tổng hợp kiến thức học kỳ 1',
    color: '#10b981'
  },
  {
    id: 'folder-dv',
    name: 'Đố vui khởi động',
    description: 'Các câu hỏi khởi động vui nhộn đầu tiết học',
    color: '#f59e0b'
  }
];

export const STORAGE_KEY = 'lopHocVuiVeTeal_lop91_v2';

export function getUserStorageKey(user?: UserAccount | null | string): string {
  if (!user) return 'lopHoc_state_guest';
  const userId = typeof user === 'string' ? user : user.id;
  return `lopHoc_state_${userId}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function today(): string {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function nowTime(): string {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function cleanLessonTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^([A-Th-ưa-zA-ZÀ-ỹ\s]+)\s*\((Phân môn|phân môn|PM):\s*[^)]+\)\s*[-:]\s*/gi, '')
    .replace(/^([A-Th-ưa-zA-ZÀ-ỹ\s]+)\s*[-:]\s*(Phân môn|phân môn|PM):\s*[^)]+\s*[-:]\s*/gi, '')
    .trim();
}

export function cleanSubSubjectLessonTitle(title: string): string {
  if (!title) return '';
  let cleaned = cleanLessonTitle(title);
  // Remove trailing "tiết X", "(tiết X)", "tiết 1/2", "- tiết X", ", tiết X", "(1 tiết)", etc.
  cleaned = cleaned
    .replace(/[\s,–-]*\(?\s*tiết\s*\d+(\/\d+)?\s*\)?$/gi, '')
    .replace(/[\s,–-]*\(?\s*\d+\s*tiết\s*\)?$/gi, '')
    .trim();
  return cleaned;
}

export function initials(name = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function getAccountExpirationInfo(user?: UserAccount | null): {
  remainingDays: number | null;
  isExpired: boolean;
  formattedExpiresAt: string | null;
  activeDaysTotal: number | null;
} {
  if (!user || user.role === 'admin' || !user.expiresAt) {
    return {
      remainingDays: null,
      isExpired: false,
      formattedExpiresAt: 'Vĩnh viễn',
      activeDaysTotal: user?.activeDays || null
    };
  }

  const expTime = new Date(user.expiresAt).getTime();
  if (isNaN(expTime)) {
    return {
      remainingDays: null,
      isExpired: false,
      formattedExpiresAt: 'Vĩnh viễn',
      activeDaysTotal: user?.activeDays || null
    };
  }

  const diffMs = expTime - Date.now();
  const rawRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const remainingDays = isNaN(rawRemaining) ? 0 : rawRemaining;
  const isExpired = remainingDays <= 0;

  const d = new Date(expTime);
  const z = (n: number) => String(n).padStart(2, '0');
  const formattedExpiresAt = `${z(d.getDate())}/${z(d.getMonth() + 1)}/${d.getFullYear()}`;

  return {
    remainingDays,
    isExpired,
    formattedExpiresAt,
    activeDaysTotal: user.activeDays || null
  };
}

export const DEFAULT_MEETING_FOLDERS = [
  {
    id: 'mf-hd',
    name: 'Họp Hội đồng Sư phạm',
    description: 'Thư mục chứa các cuộc họp Hội đồng định kỳ hàng tháng',
    color: '#0d9488',
    type: 'personal' as const,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mf-cm',
    name: 'Họp Chuyên môn Tuần',
    description: 'Thư mục chứa các buổi sinh hoạt chuyên môn tuần',
    color: '#0284c7',
    type: 'personal' as const,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mf-tk3',
    name: 'Biên bản Họp Tổ Khối 3 - HK1',
    description: 'Tất cả biên bản họp Tổ chuyên môn Khối 3 Học kỳ 1',
    color: '#4f46e5',
    type: 'department' as const,
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_PERSONAL_MEETINGS = [
  {
    id: 'pm-1',
    title: 'Họp Hội đồng Sư phạm tháng 10/2026',
    meetingDate: today(),
    location: 'Hội trường lớn',
    chairperson: 'Hiệu trưởng - Nguyễn Văn A',
    attendees: 'Toàn thể Cán bộ - Giáo viên - Nhân viên',
    category: 'Họp Hội đồng',
    folderId: 'mf-hd',
    content: '1. Đánh giá công tác tháng 9: Hoàn thành triển khai KHDH, các lớp ổn định nề nếp.\n2. Phương hướng tháng 10: Đẩy mạnh sinh hoạt chuyên môn, kiểm tra định kỳ học kỳ 1.\n3. Nhắc nhở giáo viên cập nhật sổ báo giảng & điểm danh học sinh hàng ngày.',
    actionItems: '- Nộp lịch báo giảng trước 17h thứ Sáu.\n- Chuẩn bị hồ sơ thao giảng mừng ngày 20/11.\n- Kiểm tra nề nếp thi đua các lớp.',
    note: 'Cần chú ý đôn đốc phong trào hoa thi đua.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_DEPARTMENT_MEETINGS = [
  {
    id: 'dm-1',
    title: 'BIÊN BẢN SINH HOẠT TỔ KHỐI',
    department: 'Tổ Khối 3',
    meetingDate: today(),
    timeStart: '14:00',
    timeEnd: '16:30',
    location: 'Phòng họp Chuyên môn',
    chairperson: 'Nguyễn Thị B (Tổ trưởng)',
    secretary: 'Trần Văn C (Thư ký)',
    totalMembers: 6,
    presentMembers: 6,
    absentMembers: 'Không',
    folderId: 'mf-tk3',

    // II. NỘI DUNG SINH HOẠT TỔ KHỐI
    pastWorkPros: '100% giáo viên thực hiện đúng quy chế chuyên môn, hoàn thành kế hoạch dạy học tuần qua, chuẩn bị hồ sơ giáo án đầy đủ.',
    pastWorkCons: 'Một số học sinh chưa tập trung cao trong hoạt động nhóm môn Toán.',
    upcomingTasks: 'Tiếp tục thực hiện chương trình giảng dạy tuần tới, đổi mới phương pháp tổ chức hoạt động học cho học sinh.',
    documentsDeployment: 'Triển khai công văn hướng dẫn thực hiện sinh hoạt chuyên môn theo nghiên cứu bài học.',
    memberFeedback: 'Đồng chí B nhất trí với đánh giá và đề xuất bổ sung thiết bị dạy học số.',
    section2Conclusion: '100% thành viên thống nhất với nội dung đánh giá và kế hoạch công tác.',

    // III. SINH HOẠT CHUYÊN MÔN THEO HƯỚNG NGHIÊN CỨU BÀI HỌC
    lessonSubject: 'Toán',
    lessonClass: 'Khối 3 (Lớp 3A1)',
    lessonName: 'Bài dạy minh họa môn Toán Khối 3',
    lessonTeacher: 'Nguyễn Văn A',
    lessonExpectedTime: 'Tuần tới',
    lessonReason: 'Cần nâng cao năng lực tính toán và ứng dụng phương pháp dạy học trực quan cho học sinh.',
    lessonPlanDiscussion: 'Các thành viên đóng góp ý kiến về tiến trình các hoạt động học và dự kiến tình huống phát sinh.',
    lessonPlanAgreedContent: 'Thống nhất cấu trúc 4 hoạt động của Kế hoạch bài dạy theo đúng hướng dẫn.',
    obsGoodActivities: 'Học sinh tích cực tham gia thảo luận nhóm, tự tin báo cáo kết quả.',
    obsDifficulties: 'Một vài em thao tác còn chậm ở bài tập vận dụng.',
    obsSupportNeeded: 'Giáo viên cần hướng dẫn chi tiết hơn trước khi giao nhiệm vụ.',
    obsEmergingSituations: 'Học sinh phản hồi tốt khi sử dụng đồ dùng trực quan.',
    postLessonDiscussion: 'Phân tích diễn biến hoạt động học của học sinh qua tiết dạy minh họa.',
    postLessonConclusion: 'Rút kinh nghiệm và vận dụng linh hoạt các giải pháp vào bài dạy tiếp theo.',

    // IV. KẾT LUẬN CHUNG VÀ PHÂN CÔNG THỰC HIỆN
    generalConclusionPoints: '1. Tiếp tục thực hiện nghiêm túc kế hoạch giáo dục và nhiệm vụ chuyên môn.\n2. Vận dụng những kinh nghiệm, giải pháp đã thống nhất vào quá trình giảng dạy.\n3. Điều chỉnh, hoàn thiện kế hoạch bài dạy trên cơ sở phân tích hoạt động học của học sinh.\n4. Tăng cường trao đổi, hỗ trợ đồng nghiệp và quan tâm đến sự tiến bộ của từng đối tượng học sinh.',
    assignmentsList: 'Đồng chí A: Chuẩn bị bài dạy minh họa.\nĐồng chí B: Tổng hợp hồ sơ chuyên môn tổ.\nĐồng chí C: Chuẩn bị thiết bị và ghi biên bản.',

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function getDefaultState(): AppState {
  const cls = 'class_default';

  return {
    version: 1,
    activeClassId: cls,
    currentPage: 'home',
    teacher: {
      name: '',
      role: '',
      subject: '',
      school: '',
      year: '2026 - 2027',
      avatar: ''
    },
    classes: [],
    students: [],
    attendance: {},
    attendanceDate: today(),
    seating: {},
    timetable: {
      morning: true,
      afternoon: true,
      morningCount: 5,
      afternoonCount: 4,
      entries: []
    },
    rewards: [],
    redemptions: [],
    transactions: [],
    wheelHistory: [],
    filmHistory: [],
    links: [],
    subjects: [...DEFAULT_SUBJECTS],
    settings: {
      wheelExclude: true,
      filmExclude: true,
      tickLast10: true,
      timerColor: '#0d9488'
    },
    wheelExcluded: [],
    filmExcluded: [],
    wheelEffect: 'Xoáy tròn',
    wheelGroup: 'all',
    quizQuestions: [...DEFAULT_QUIZ_QUESTIONS],
    wheelQuizEnabled: true,
    wheelQuizTimer: 15,
    wheelQuizSubject: 'all',
    wheelQuizShuffleOptions: true,
    usedQuizQuestionIds: [],
    worksheets: [],
    personalMeetings: [...DEFAULT_PERSONAL_MEETINGS],
    departmentMeetings: [...DEFAULT_DEPARTMENT_MEETINGS],
    meetingFolders: [...DEFAULT_MEETING_FOLDERS]
  };
}

export function getDefaultStateForUser(user?: UserAccount | null): AppState {
  if (!user) return getDefaultState();

  // If user is Admin (usr_admin)
  if (user.role === 'admin') {
    return {
      version: 1,
      ownerUserId: user.id,
      activeClassId: 'admin_overview',
      currentPage: 'accounts',
      teacher: {
        name: user.name,
        role: 'Quản Trị Viên Hệ Thống',
        subject: 'Quản trị & Phân quyền',
        school: user.school || 'Hệ Thống Lớp Học Thông Minh',
        year: user.year || '2026 - 2027',
        avatar: user.avatar || ''
      },
      classes: [],
      students: [],
      attendance: {},
      attendanceDate: today(),
      seating: {},
      timetable: {
        morning: true,
        afternoon: false,
        morningCount: 5,
        afternoonCount: 4,
        entries: []
      },
      rewards: [],
      redemptions: [],
      transactions: [],
      wheelHistory: [],
      filmHistory: [],
      links: [],
      subjects: [...DEFAULT_SUBJECTS],
      settings: {
        wheelExclude: true,
        filmExclude: true,
        tickLast10: true,
        timerColor: '#0d9488'
      },
      wheelExcluded: [],
      filmExcluded: [],
      wheelEffect: 'Xoáy tròn',
      wheelGroup: 'all',
      quizQuestions: [...DEFAULT_QUIZ_QUESTIONS],
      wheelQuizEnabled: true,
      wheelQuizTimer: 15,
      wheelQuizSubject: 'all',
      wheelQuizShuffleOptions: true,
      usedQuizQuestionIds: []
    };
  }

  // Default state for any teacher - starts completely empty
  return {
    version: 1,
    ownerUserId: user.id,
    activeClassId: 'default_class',
    currentPage: 'home',
    teacher: {
      name: user.name,
      role: `Giáo viên bộ môn ${user.subject || ''}`,
      subject: user.subject || 'Môn học',
      school: user.school || 'Trường TH Thạnh Yên 1',
      year: user.year || '2026 - 2027',
      avatar: user.avatar || ''
    },
    classes: [],
    students: [],
    attendance: {},
    attendanceDate: today(),
    seating: {},
    timetable: {
      morning: true,
      afternoon: true,
      morningCount: 5,
      afternoonCount: 4,
      entries: []
    },
    rewards: [],
    redemptions: [],
    transactions: [],
    wheelHistory: [],
    filmHistory: [],
    links: [],
    subjects: [...DEFAULT_SUBJECTS],
    settings: {
      wheelExclude: true,
      filmExclude: true,
      tickLast10: true,
      timerColor: '#0284c7'
    },
    wheelExcluded: [],
    filmExcluded: [],
    wheelEffect: 'Xoáy tròn',
    wheelGroup: 'all',
    quizQuestions: [...DEFAULT_QUIZ_QUESTIONS],
    questionFolders: [...DEFAULT_QUESTION_FOLDERS],
    wheelQuizEnabled: true,
    wheelQuizTimer: 15,
    wheelQuizSubject: user.subject || 'all',
    wheelQuizFolderId: 'all',
    wheelQuizShuffleOptions: true,
    usedQuizQuestionIds: [],
    personalMeetings: [...DEFAULT_PERSONAL_MEETINGS],
    departmentMeetings: [...DEFAULT_DEPARTMENT_MEETINGS],
    meetingFolders: [...DEFAULT_MEETING_FOLDERS]
  };
}

export function loadStoredState(user?: UserAccount | null): AppState {
  const userKey = getUserStorageKey(user);
  try {
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version) {
        if (Array.isArray(parsed.subjects)) {
          parsed.subjects = parsed.subjects.filter((s: string) => s !== 'Tin học và Công nghệ');
          if (!parsed.subjects.includes('Tin học')) parsed.subjects.push('Tin học');
          if (!parsed.subjects.includes('Công nghệ')) parsed.subjects.push('Công nghệ');
        }

        if (!Array.isArray(parsed.quizQuestions)) {
          parsed.quizQuestions = [...DEFAULT_QUIZ_QUESTIONS];
        } else {
          parsed.quizQuestions = parsed.quizQuestions.filter(
            (q: { subject?: string }) => q.subject !== 'Tin học và Công nghệ'
          );
        }
        if (parsed.wheelQuizSubject === 'Tin học và Công nghệ') {
          parsed.wheelQuizSubject = 'all';
        }
        if (parsed.wheelQuizEnabled === undefined) parsed.wheelQuizEnabled = true;
        if (parsed.wheelQuizTimer === undefined) parsed.wheelQuizTimer = 15;
        if (parsed.wheelQuizSubject === undefined) parsed.wheelQuizSubject = 'all';
        if (parsed.wheelQuizFolderId === undefined) parsed.wheelQuizFolderId = 'all';
        if (parsed.wheelQuizShuffleOptions === undefined) parsed.wheelQuizShuffleOptions = true;
        if (!Array.isArray(parsed.usedQuizQuestionIds)) parsed.usedQuizQuestionIds = [];
        if (!Array.isArray(parsed.classes)) parsed.classes = [];
        if (!Array.isArray(parsed.students)) parsed.students = [];
        if (!parsed.attendance || typeof parsed.attendance !== 'object') parsed.attendance = {};
        if (!parsed.seating || typeof parsed.seating !== 'object') parsed.seating = {};
        if (!parsed.timetable || typeof parsed.timetable !== 'object') {
          parsed.timetable = { morning: true, afternoon: true, morningCount: 5, afternoonCount: 4, entries: [] };
        }
        if (!Array.isArray(parsed.rewards)) parsed.rewards = [];
        if (!Array.isArray(parsed.redemptions)) parsed.redemptions = [];
        if (!Array.isArray(parsed.transactions)) parsed.transactions = [];
        if (!Array.isArray(parsed.wheelHistory)) parsed.wheelHistory = [];
        if (!Array.isArray(parsed.filmHistory)) parsed.filmHistory = [];
        if (!Array.isArray(parsed.links)) parsed.links = [];
        if (!Array.isArray(parsed.dragDropGames)) parsed.dragDropGames = [];
        if (!Array.isArray(parsed.worksheets)) parsed.worksheets = [];
        if (!Array.isArray(parsed.subjects)) parsed.subjects = [...DEFAULT_SUBJECTS];
        if (!Array.isArray(parsed.questionFolders)) {
          parsed.questionFolders = [...DEFAULT_QUESTION_FOLDERS];
        }
        if (!Array.isArray(parsed.personalMeetings)) {
          parsed.personalMeetings = [...DEFAULT_PERSONAL_MEETINGS];
        }
        if (!Array.isArray(parsed.departmentMeetings)) {
          parsed.departmentMeetings = [...DEFAULT_DEPARTMENT_MEETINGS];
        }
        if (!Array.isArray(parsed.meetingFolders)) {
          parsed.meetingFolders = [...DEFAULT_MEETING_FOLDERS];
        }
        return parsed;
      }
    }

    // Migration for default user from old single storage key
    if (!user) {
      const oldRaw = localStorage.getItem(STORAGE_KEY);
      if (oldRaw) {
        const parsedOld = JSON.parse(oldRaw);
        if (parsedOld && parsedOld.version) {
          localStorage.setItem(userKey, oldRaw);
          return parsedOld;
        }
      }
    }
  } catch (err) {
    console.warn('Could not parse localStorage state:', err);
  }

  return getDefaultStateForUser(user);
}

export function saveStoredState(
  arg1: AppState | UserAccount | null | undefined,
  arg2?: AppState
): void {
  let user: UserAccount | null | undefined = null;
  let state: AppState;

  if (arg2 !== undefined) {
    user = arg1 as UserAccount | null | undefined;
    state = arg2;
  } else {
    state = arg1 as AppState;
  }

  try {
    const userKey = getUserStorageKey(user || (state?.ownerUserId ? state.ownerUserId : undefined));
    localStorage.setItem(userKey, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function compressImageFile(
  file: File,
  maxDimension = 120,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
