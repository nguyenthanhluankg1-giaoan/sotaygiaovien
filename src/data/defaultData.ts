import { SchoolConfig, PpctItem, TimetableSlot } from '../types';

export const defaultSchoolConfig: SchoolConfig = {
  schoolName: 'TRƯỜNG TIỂU HỌC THẠNH YÊN 1',
  departmentName: 'TỔ CHUYÊN MÔN 3',
  republicTitleTop: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  republicTitleSub: 'Độc lập – Tự do – Hạnh phúc',
  documentTitle: 'LỊCH BÁO GIẢNG',
  subjectTitle: '',
  academicYear: 'Năm học 2026 - 2027',
  startDateWeek1: '2026-09-07',
  location: 'Vĩnh Hòa',
  principalTitle: 'DUYỆT CỦA P.HIỆU TRƯỜNG',
  principalName: '',
  headTeacherTitle: 'TỔ TRƯỜNG',
  headTeacherName: '',
  teacherTitle: 'GIÁO VIÊN CHỦ NHIỆM',
  teacherName: 'Nguyễn Thị Thu Hà'
};

// Danh mục PPCT mẫu chuẩn GDPT 2018 dành cho Giáo viên chủ nhiệm Tiểu học (Khối 3, Khối 4, Khối 5)
export const defaultPpctList: PpctItem[] = [
  // --- KHỐI 3: MÔN TIẾNG VIỆT ---
  {
    id: 'ppct-tv-3-1',
    grade: 3,
    subject: 'Tiếng Việt',
    subSubject: 'Đọc (Tập đọc)',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Cổng trường mở ra (Tiết 1 - Đọc)',
    integrationNote: '[NLS] Đọc diễn cảm vần thơ rộn rã khai trường',
    notes: 'Chủ đề 1. Mái trường em yêu'
  },
  {
    id: 'ppct-tv-3-2',
    grade: 3,
    subject: 'Tiếng Việt',
    subSubject: 'Luyện từ và câu (LTVC)',
    week: 1,
    periodIndex: 2,
    lessonName: 'Bài 1: Từ ngữ chỉ sự vật, hoạt động học tập',
    integrationNote: '[STEM] Phân loại các từ ngữ chỉ dụng cụ học tập',
    notes: 'Tiết LTVC Tuần 1'
  },
  {
    id: 'ppct-tv-3-3',
    grade: 3,
    subject: 'Tiếng Việt',
    subSubject: 'Viết (Tập làm văn)',
    week: 1,
    periodIndex: 3,
    lessonName: 'Bài 1: Viết đoạn văn ngắn giới thiệu về bản thân (Tiết 1)',
    integrationNote: '[CĐS] Tạo khung hồ sơ cá nhân số',
    notes: 'Tập làm văn'
  },
  {
    id: 'ppct-tv-3-4',
    grade: 3,
    subject: 'Tiếng Việt',
    subSubject: 'Nói và nghe',
    week: 1,
    periodIndex: 4,
    lessonName: 'Kể chuyện: Bạn mới của em',
    integrationNote: '[GDKN] Lắng nghe tích cực và giao tiếp tự tin',
    notes: 'Nói và nghe'
  },
  {
    id: 'ppct-tv-3-4b',
    grade: 3,
    subject: 'Tiếng Việt',
    subSubject: 'Đọc mở rộng',
    week: 1,
    periodIndex: 5,
    lessonName: 'Đọc mở rộng: Tìm đọc bài văn, câu chuyện hoặc bài thơ về chủ đề Mái trường & Bạn bè',
    integrationNote: '[ĐMR] Viết phiếu đọc sách và chia sẻ câu chuyện yêu thích với bạn',
    notes: 'Đọc mở rộng Tuần 1'
  },
  {
    id: 'ppct-tv-3-5',
    grade: 3,
    subject: 'Tiếng Việt',
    subSubject: 'Đọc (Tập đọc)',
    week: 2,
    periodIndex: 5,
    lessonName: 'Bài 2: Chiếc nhãn vở đặc biệt (Tiết 1 - Đọc)',
    integrationNote: '[NLS] Đọc đúng và hiểu ý nghĩa chiếc nhãn vở',
    notes: 'Chủ đề 1'
  },
  {
    id: 'ppct-tv-3-6',
    grade: 3,
    subject: 'Tiếng Việt',
    subSubject: 'Luyện từ và câu (LTVC)',
    week: 2,
    periodIndex: 6,
    lessonName: 'Bài 2: Câu giới thiệu và câu nêu hoạt động',
    integrationNote: 'Thực hành đặt câu nêu hoạt động ở trường',
    notes: 'Tiết LTVC Tuần 2'
  },

  // --- KHỐI 3: MÔN TOÁN ---
  {
    id: 'ppct-toan-3-1',
    grade: 3,
    subject: 'Toán',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Ôn tập các số đến 1000 (Tiết 1)',
    integrationNote: 'Ôn tập cấu tạo số và so sánh',
    notes: 'Chủ đề 1. Ôn tập & Bổ sung'
  },
  {
    id: 'ppct-toan-3-2',
    grade: 3,
    subject: 'Toán',
    subSubject: '',
    week: 1,
    periodIndex: 2,
    lessonName: 'Bài 2: Ôn tập phép cộng, phép trừ trong phạm vi 1000',
    integrationNote: '[STEM] Tính nhẩm nhanh kết quả mua sắm dụng cụ',
    notes: 'Mạch kiến thức Số học'
  },
  {
    id: 'ppct-toan-3-3',
    grade: 3,
    subject: 'Toán',
    subSubject: '',
    week: 1,
    periodIndex: 3,
    lessonName: 'Bài 3: Điểm ở giữa. Trung điểm của đoạn thẳng',
    integrationNote: '[Thực hành] Dùng thước thẳng đo và xác định trung điểm',
    notes: 'Hình học'
  },
  {
    id: 'ppct-toan-3-4',
    grade: 3,
    subject: 'Toán',
    subSubject: '',
    week: 2,
    periodIndex: 4,
    lessonName: 'Bài 4: Bảng nhân 3, Bảng chia 3',
    integrationNote: 'Thực hành hình thành bảng nhân 3',
    notes: 'Phép nhân & chia'
  },

  // --- KHỐI 3: TỰ NHIÊN VÀ XÃ HỘI ---
  {
    id: 'ppct-tnxh-3-1',
    grade: 3,
    subject: 'Tự nhiên và Xã hội',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Họ hàng nội, ngoại của em (Tiết 1)',
    integrationNote: '[GDDS] Yêu thương và xưng hô chuẩn mực trong gia đình',
    notes: 'Chủ đề Gia đình'
  },
  {
    id: 'ppct-tnxh-3-2',
    grade: 3,
    subject: 'Tự nhiên và Xã hội',
    subSubject: '',
    week: 2,
    periodIndex: 2,
    lessonName: 'Bài 1: Họ hàng nội, ngoại của em (Tiết 2)',
    integrationNote: 'Vẽ sơ đồ cây gia đình',
    notes: 'Chủ đề Gia đình'
  },

  // --- KHỐI 3: ĐẠO ĐỨC ---
  {
    id: 'ppct-dd-3-1',
    grade: 3,
    subject: 'Đạo đức',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Em yêu quê hương (Tiết 1)',
    integrationNote: '[GDQP] Tự hào truyền thống văn hóa quê hương',
    notes: 'Chủ đề Yêu quê hương'
  },

  // --- KHỐI 3: HOẠT ĐỘNG TRẢI NGHIỆM ---
  {
    id: 'ppct-hdtn-3-1',
    grade: 3,
    subject: 'Hoạt động trải nghiệm',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Sinh hoạt dưới cờ: Lễ khai giảng năm học mới',
    integrationNote: '[GDAN] Nghi thức chào cờ và phát động thi đua',
    notes: 'Tiết 1 - Đầu tuần'
  },
  {
    id: 'ppct-hdtn-3-2',
    grade: 3,
    subject: 'Hoạt động trải nghiệm',
    subSubject: '',
    week: 1,
    periodIndex: 2,
    lessonName: 'Chủ đề 1: Lập kế hoạch học tập cá nhân',
    integrationNote: '[CĐS] Sử dụng ứng dụng quản lý thời gian biểu',
    notes: 'Hoạt động nhóm'
  },
  {
    id: 'ppct-hdtn-3-3',
    grade: 3,
    subject: 'Hoạt động trải nghiệm',
    subSubject: '',
    week: 1,
    periodIndex: 3,
    lessonName: 'Sinh hoạt lớp: Bầu ban cán sự lớp và cam kết thi đua',
    integrationNote: '[Nề nếp] Rèn luyện nội quy lớp học hạnh phúc',
    notes: 'Tiết cuối tuần'
  },

  // --- KHỐI 4: LỊCH SỬ VÀ ĐỊA LÍ ---
  {
    id: 'ppct-lsdl-4-1',
    grade: 4,
    subject: 'Lịch sử và Địa lí',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Làm quen với phương tiện học tập môn Lịch sử và Địa lí',
    integrationNote: '[CĐS] Khai thác bản đồ và mốc lịch sử tương tác',
    notes: 'Chủ đề Mở đầu'
  },
  {
    id: 'ppct-lsdl-4-2',
    grade: 4,
    subject: 'Lịch sử và Địa lí',
    subSubject: '',
    week: 1,
    periodIndex: 2,
    lessonName: 'Bài 2: Địa hình và khoáng sản Vùng Trung đồi và miền núi Bắc Bộ',
    integrationNote: '[GDMT] Bảo vệ tài nguyên thiên nhiên và khoáng sản',
    notes: 'Địa lí tự nhiên'
  },

  // --- KHỐI 5: LỊCH SỬ VÀ ĐỊA LÍ ---
  {
    id: 'ppct-lsdl-5-1',
    grade: 5,
    subject: 'Lịch sử và Địa lí',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Vị trí địa lí, lãnh thổ, biển đảo Việt Nam (Tiết 1)',
    integrationNote: '[GDQP] Giáo dục chủ quyền biển đảo Tổ quốc',
    notes: 'Tiết 1 Lịch sử K5'
  },
  {
    id: 'ppct-lsdl-5-2',
    grade: 5,
    subject: 'Lịch sử và Địa lí',
    subSubject: '',
    week: 1,
    periodIndex: 2,
    lessonName: 'Bài 1: Vị trí địa lí, lãnh thổ, biển đảo Việt Nam (Tiết 2)',
    integrationNote: '[Thực hành] Xác định vị trí các quần đảo Hoàng Sa & Trường Sa',
    notes: 'Tiết 2 K5'
  },

  // --- BỘ MÔN: TIN HỌC (KHỐI 3, 4, 5) ---
  {
    id: 'ppct-th-3-1',
    grade: 3,
    subject: 'Tin học',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Thông tin và xử lý thông tin (Tiết 1)',
    integrationNote: '[CĐS] Nhận biết thông tin số và vật mang tin',
    notes: 'Chủ đề A. Máy tính và em'
  },
  {
    id: 'ppct-th-3-2',
    grade: 3,
    subject: 'Tin học',
    subSubject: '',
    week: 1,
    periodIndex: 2,
    lessonName: 'Bài 1: Thông tin và xử lý thông tin (Tiết 2)',
    integrationNote: '[CĐS] Thực hành nhận biết thông tin dạng văn bản, hình ảnh, âm thanh',
    notes: 'Chủ đề A. Máy tính và em'
  },
  {
    id: 'ppct-th-3-3',
    grade: 3,
    subject: 'Tin học',
    subSubject: '',
    week: 2,
    periodIndex: 3,
    lessonName: 'Bài 2: Khám phá máy tính (Tiết 1)',
    integrationNote: '[STEM] Phân loại các bộ phận cơ bản của máy tính để bàn',
    notes: 'Chủ đề A'
  },
  {
    id: 'ppct-th-3-4',
    grade: 3,
    subject: 'Tin học',
    subSubject: '',
    week: 2,
    periodIndex: 4,
    lessonName: 'Bài 2: Khám phá máy tính (Tiết 2 - Thực hành sử dụng chuột)',
    integrationNote: '[Thực hành] Rèn luyện thao tác di chuyển và nhấp chuột',
    notes: 'Chủ đề A'
  },
  {
    id: 'ppct-th-4-1',
    grade: 4,
    subject: 'Tin học',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Phần cứng và phần mềm máy tính (Tiết 1)',
    integrationNote: '[CĐS] Phân biệt thiết bị vào/ra và phần mềm ứng dụng',
    notes: 'Tin học Khối 4'
  },
  {
    id: 'ppct-th-4-2',
    grade: 4,
    subject: 'Tin học',
    subSubject: '',
    week: 1,
    periodIndex: 2,
    lessonName: 'Bài 1: Phần cứng và phần mềm máy tính (Tiết 2)',
    integrationNote: '[CĐS] Thực hành bật/tắt máy tính và khởi động ứng dụng',
    notes: 'Tin học Khối 4'
  },
  {
    id: 'ppct-th-5-1',
    grade: 5,
    subject: 'Tin học',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Máy tính và thông tin trong cuộc sống (Tiết 1)',
    integrationNote: '[CĐS] An toàn thông tin trên mạng Internet',
    notes: 'Tin học Khối 5'
  },
  {
    id: 'ppct-th-5-2',
    grade: 5,
    subject: 'Tin học',
    subSubject: '',
    week: 1,
    periodIndex: 2,
    lessonName: 'Bài 1: Máy tính và thông tin trong cuộc sống (Tiết 2)',
    integrationNote: '[CĐS] Thực hành tìm kiếm thông tin an toàn',
    notes: 'Tin học Khối 5'
  },

  // --- BỘ MÔN: CÔNG NGHỆ (KHỐI 3, 4, 5) ---
  {
    id: 'ppct-cn-3-1',
    grade: 3,
    subject: 'Công nghệ',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Tự nhiên và công nghệ (Tiết 1)',
    integrationNote: '[STEM] Phân biệt sản phẩm tự nhiên và sản phẩm công nghệ',
    notes: 'Công nghệ Khối 3'
  },
  {
    id: 'ppct-cn-3-2',
    grade: 3,
    subject: 'Công nghệ',
    subSubject: '',
    week: 2,
    periodIndex: 2,
    lessonName: 'Bài 1: Tự nhiên và công nghệ (Tiết 2)',
    integrationNote: '[STEM] Kể tên các đồ dùng công nghệ trong gia đình',
    notes: 'Công nghệ Khối 3'
  },
  {
    id: 'ppct-cn-4-1',
    grade: 4,
    subject: 'Công nghệ',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Lợi ích của hoa và cây cảnh đối với đời sống (Tiết 1)',
    integrationNote: '[GDMT] Trồng và chăm sóc hoa làm đẹp cảnh quan trường học',
    notes: 'Công nghệ Khối 4'
  },
  {
    id: 'ppct-cn-5-1',
    grade: 5,
    subject: 'Công nghệ',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Vai trò của công nghệ đối với đời sống (Tiết 1)',
    integrationNote: '[STEM] Thiết kế mô hình sản phẩm công nghệ tái chế',
    notes: 'Công nghệ Khối 5'
  },

  // --- BỘ MÔN: TIẾNG ANH (KHỐI 3, 4, 5) ---
  {
    id: 'ppct-ta-3-1',
    grade: 3,
    subject: 'Tiếng Anh',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Unit 1: Hello - Lesson 1 (Period 1)',
    integrationNote: '[GDKN] Lời chào hỏi thân thiện và tự giới thiệu tên bằng Tiếng Anh',
    notes: 'Tiếng Anh Khối 3'
  },
  {
    id: 'ppct-ta-3-2',
    grade: 3,
    subject: 'Tiếng Anh',
    subSubject: '',
    week: 1,
    periodIndex: 2,
    lessonName: 'Unit 1: Hello - Lesson 2 (Period 2)',
    integrationNote: 'Thực hành hội thoại hỏi thăm sức khỏe',
    notes: 'Tiếng Anh Khối 3'
  },
  {
    id: 'ppct-ta-4-1',
    grade: 4,
    subject: 'Tiếng Anh',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Unit 1: My Friends - Lesson 1 (Period 1)',
    integrationNote: 'Giới thiệu bạn bè và quốc tịch',
    notes: 'Tiếng Anh Khối 4'
  },
  {
    id: 'ppct-ta-5-1',
    grade: 5,
    subject: 'Tiếng Anh',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Unit 1: All About Me - Lesson 1 (Period 1)',
    integrationNote: 'Mô tả địa chỉ và thông tin cá nhân',
    notes: 'Tiếng Anh Khối 5'
  },

  // --- BỘ MÔN: ÂM NHẠC & MỸ THUẬT & GIÁO DỤC THỂ CHẤT ---
  {
    id: 'ppct-an-3-1',
    grade: 3,
    subject: 'Âm nhạc',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Chủ đề 1: Rộn ràng ngày mới - Hát bài Vui đến trường (Tiết 1)',
    integrationNote: 'Hát kết hợp gõ đệm theo nhịp',
    notes: 'Âm nhạc Khối 3'
  },
  {
    id: 'ppct-mt-3-1',
    grade: 3,
    subject: 'Mỹ thuật',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Chủ đề 1: Trường tiểu học thân yêu - Vẽ tranh mái trường (Tiết 1)',
    integrationNote: 'Sử dụng chấm, nét và màu sắc thể hiện tình cảm với mái trường',
    notes: 'Mỹ thuật Khối 3'
  },
  {
    id: 'ppct-gdtc-3-1',
    grade: 3,
    subject: 'Giáo dục thể chất',
    subSubject: '',
    week: 1,
    periodIndex: 1,
    lessonName: 'Bài 1: Đội hình đội ngũ - Biến đổi đội hình từ một hàng ngang thành hai hàng ngang (Tiết 1)',
    integrationNote: '[GDKN] Rèn luyện ý thức kỉ luật và tinh thần tập thể',
    notes: 'GDTC Khối 3'
  }
];

// Thời khóa biểu mẫu chuẩn Lớp 3A1 của Giáo viên chủ nhiệm
export const defaultTimetable: TimetableSlot[] = [
  // THỨ HAI
  { id: 't-2-m1', dayOfWeek: 2, session: 'morning', period: 1, className: '3A1', subject: 'Hoạt động trải nghiệm', subSubject: '', grade: 3 },
  { id: 't-2-m2', dayOfWeek: 2, session: 'morning', period: 2, className: '3A1', subject: 'Tiếng Việt', subSubject: 'Đọc (Tập đọc)', grade: 3 },
  { id: 't-2-m3', dayOfWeek: 2, session: 'morning', period: 3, className: '3A1', subject: 'Tiếng Việt', subSubject: 'Đọc (Tập đọc)', grade: 3 },
  { id: 't-2-m4', dayOfWeek: 2, session: 'morning', period: 4, className: '3A1', subject: 'Toán', subSubject: '', grade: 3 },

  // THỨ BA
  { id: 't-3-m1', dayOfWeek: 3, session: 'morning', period: 1, className: '3A1', subject: 'Toán', subSubject: '', grade: 3 },
  { id: 't-3-m2', dayOfWeek: 3, session: 'morning', period: 2, className: '3A1', subject: 'Tiếng Việt', subSubject: 'Luyện từ và câu (LTVC)', grade: 3 },
  { id: 't-3-m3', dayOfWeek: 3, session: 'morning', period: 3, className: '3A1', subject: 'Đạo đức', subSubject: '', grade: 3 },
  { id: 't-3-m4', dayOfWeek: 3, session: 'morning', period: 4, className: '3A1', subject: 'Tự nhiên và Xã hội', subSubject: '', grade: 3 },

  // THỨ TƯ
  { id: 't-4-m1', dayOfWeek: 4, session: 'morning', period: 1, className: '3A1', subject: 'Tiếng Việt', subSubject: 'Viết (Tập làm văn)', grade: 3 },
  { id: 't-4-m2', dayOfWeek: 4, session: 'morning', period: 2, className: '3A1', subject: 'Tiếng Việt', subSubject: 'Viết (Tập làm văn)', grade: 3 },
  { id: 't-4-m3', dayOfWeek: 4, session: 'morning', period: 3, className: '3A1', subject: 'Toán', subSubject: '', grade: 3 },
  { id: 't-4-m4', dayOfWeek: 4, session: 'morning', period: 4, className: '3A1', subject: 'Lịch sử và Địa lí', subSubject: '', grade: 3 },

  // THỨ NĂM
  { id: 't-5-m1', dayOfWeek: 5, session: 'morning', period: 1, className: '3A1', subject: 'Toán', subSubject: '', grade: 3 },
  { id: 't-5-m2', dayOfWeek: 5, session: 'morning', period: 2, className: '3A1', subject: 'Tiếng Việt', subSubject: 'Nói và nghe', grade: 3 },
  { id: 't-5-m3', dayOfWeek: 5, session: 'morning', period: 3, className: '3A1', subject: 'Lịch sử và Địa lí', subSubject: '', grade: 3 },
  { id: 't-5-m4', dayOfWeek: 5, session: 'morning', period: 4, className: '3A1', subject: 'Hoạt động trải nghiệm', subSubject: '', grade: 3 },

  // THỨ SÁU
  { id: 't-6-m1', dayOfWeek: 6, session: 'morning', period: 1, className: '3A1', subject: 'Tiếng Việt', subSubject: 'Đọc mở rộng', grade: 3 },
  { id: 't-6-m2', dayOfWeek: 6, session: 'morning', period: 2, className: '3A1', subject: 'Toán', subSubject: '', grade: 3 },
  { id: 't-6-m3', dayOfWeek: 6, session: 'morning', period: 3, className: '3A1', subject: 'Hoạt động trải nghiệm', subSubject: '', grade: 3 }
];
