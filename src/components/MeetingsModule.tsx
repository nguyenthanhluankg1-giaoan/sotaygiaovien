import React, { useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  FileText,
  Trash2,
  Edit3,
  Printer,
  Sparkles,
  Download,
  Copy,
  Check,
  X,
  ChevronRight,
  Bookmark,
  Share2,
  FileCheck,
  ShieldCheck,
  Cloud,
  Folder,
  FolderPlus,
  FolderOpen,
  Tag,
  LayoutList,
  LayoutGrid,
  ArrowLeft,
  CornerUpLeft,
  Move,
  HardDrive,
  FolderTree,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  Wand2,
  Volume2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { AppState, PersonalMeetingItem, DepartmentMeetingItem, MeetingFolder, UserAccount } from '../types';
import { uid, today, nowTime } from '../utils/helpers';

interface MeetingsModuleProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  currentUser?: UserAccount | null;
  initialTab?: 'personal' | 'department';
}

const CATEGORY_OPTIONS = [
  'Họp Hội đồng',
  'Họp Chuyên môn',
  'Họp Chủ nhiệm',
  'Họp Khối',
  'Họp Chi bộ',
  'Họp Công đoàn',
  'Khác'
];

const DEPARTMENT_OPTIONS = [
  'Tổ Khối 1',
  'Tổ Khối 2',
  'Tổ Khối 3',
  'Tổ Khối 4',
  'Tổ Khối 5',
  'Tổ Bộ môn',
  'Tổ Văn phòng'
];

export interface MeetingTemplate {
  id: string;
  type: 'personal' | 'department';
  title: string;
  categoryOrDept: string;
  description: string;
  data: Partial<PersonalMeetingItem> & Partial<DepartmentMeetingItem>;
}

const QUICK_TEMPLATES: MeetingTemplate[] = [
  {
    id: 'tmpl-dept-shcm-ncbh',
    type: 'department',
    title: 'Biên bản Sinh hoạt Tổ khối (kết hợp Nghiên cứu Bài học)',
    categoryOrDept: 'Tổ Khối',
    description: 'Đánh giá chuyên môn -> Sinh hoạt NCBH -> Dạy minh họa & dự giờ -> Phân tích sau dạy -> Kết luận & Phân công.',
    data: {
      title: 'BIÊN BẢN SINH HOẠT TỔ KHỐI (KẾT HỢP NGHIÊN CỨU BÀI HỌC)',
      department: 'Tổ Khối 1',
      purpose: 'Đánh giá công tác chuyên môn tổ khối và thực hiện Sinh hoạt chuyên môn theo hướng nghiên cứu bài học.',
      reviewPastWork: `1. Đánh giá công tác chuyên môn trong thời gian qua:


2. Triển khai nhiệm vụ chuyên môn thời gian tới:


3. Triển khai văn bản:


4. Ý kiến đóng góp & Kết luận:
`,
      upcomingPlan: `1. Lựa chọn bài học nghiên cứu:
- Môn học: 
- Lớp: Khối ... (Lớp ......)
- Tên bài học: Bài ......
- Giáo viên chuẩn bị và dạy minh họa: Đồng chí .........
- Thời gian dự kiến thực hiện: Tiết ......, ngày ...... tháng ...... năm ......
- Lý do lựa chọn bài học: Bài học có nội dung trọng tâm đổi mới phương pháp dạy học, rèn năng lực tự chủ và hợp tác cho học sinh.

2. Thảo luận, xây dựng kế hoạch bài dạy:


3. Tổ chức dạy minh họa, dự giờ và quan sát học sinh:



4. Phân tích, thảo luận sau tiết dạy minh họa:
`,
      discussions: ``,
      resolutions: ``
    }
  },
  {
    id: 'tmpl-dept-1',
    type: 'department',
    title: 'Biên bản Họp Tổ Chuyên môn Đầu năm học',
    categoryOrDept: 'Tổ Khối 1',
    description: 'Cấu trúc chuẩn triển khai nhiệm vụ năm học, phân công giảng dạy, chỉ tiêu thi đua & thông qua KHDH.',
    data: {
      title: 'Biên bản Họp Tổ Chuyên môn Đầu năm học 2026 - 2027',
      department: 'Tổ Khối 1',
      purpose: 'Triển khai nhiệm vụ năm học mới, phân công chuyên môn, thảo luận KHDH và đăng ký chỉ tiêu thi đua tổ.',
      reviewPastWork: '1. Báo cáo đánh giá tổng kết rút kinh nghiệm công tác năm học vừa qua.\n2. Báo cáo công tác chuẩn bị cơ sở vật chất, trang thiết bị phòng học, tài liệu và kế hoạch giảng dạy đầu năm học mới.',
      upcomingPlan: '1. Phân công giảng dạy, công tác chủ nhiệm và nhiệm vụ kiêm nhiệm cho toàn thể giáo viên trong tổ.\n2. Thảo luận và thống nhất Kế hoạch dạy học, Phân phối chương trình các môn học thuộc khối.\n3. Đăng ký chỉ tiêu thi đua năm học: 100% Học sinh hoàn thành chương trình lớp học, trên 50% Học sinh khen thưởng.\n4. Thực hiện nghiêm túc quy chế chuyên môn, giờ giấc ra vào lớp, hồ sơ sổ sách.',
      discussions: '1. Ý kiến đ/c A: Đề xuất tăng cường ứng dụng công nghệ thông tin và học liệu số trong các tiết học.\n2. Ý kiến đ/c B: Nhất trí với phân công công tác, đề nghị BGH hỗ trợ thêm thiết bị máy chiếu phòng học.\n3. Đồng chí Tổ trưởng giải đáp và ghi nhận các ý kiến xây dựng.',
      resolutions: '1. 100% thành viên Tổ nhất trí với Kế hoạch công tác chuyên môn đầu năm học.\n2. Cam kết thực hiện đúng tiến độ chương trình, không cắt xẻ tiết học.\n3. Complete và nộp đầy đủ KHDH tuần 1 - 4 cho BGH duyệt đúng thời hạn.'
    }
  },
  {
    id: 'tmpl-dept-2',
    type: 'department',
    title: 'Biên bản Sinh hoạt Chuyên môn theo Nghiên cứu bài học',
    categoryOrDept: 'Tổ Khối 2',
    description: 'Cấu trúc 4 bước SHCM theo nghiên cứu bài học: Xây dựng bài dạy -> Dạy minh họa -> Phân tích bài học -> Áp dụng.',
    data: {
      title: 'Biên bản Sinh hoạt Chuyên môn theo Nghiên cứu Bài học (Tuần ...)',
      department: 'Tổ Khối 2',
      purpose: 'Đổi mới phương pháp dạy học, tập trung phân tích diễn biến học tập và thái độ của học sinh qua bài dạy minh họa.',
      reviewPastWork: '1. Đánh giá việc thực hiện chuyên môn tuần qua của các thành viên trong tổ.\n2. Rút kinh nghiệm việc ứng dụng thiết bị dạy học số và sơ đồ tư duy trong các bài học trước.',
      upcomingPlan: '1. Thiết kế kế hoạch bài dạy minh họa cho môn/bài dạy trọng tâm trong tuần.\n2. Phân công giáo viên thực hiện dạy minh họa, các giáo viên còn lại chuẩn bị sổ dự giờ quan sát học sinh.\n3. Tổ chức họp rút kinh nghiệm tập trung vào hành vi học tập của học sinh.',
      discussions: '1. Nhận xét bài dạy minh họa: Học sinh hăng hái phát biểu, tự tin hợp tác thảo luận nhóm.\n2. Tồn tại: Một số học sinh còn lúng túng khi thao tác kéo thả trên bảng tương tác.\n3. Giải pháp: Giáo viên cần hướng dẫn mẫu kĩ hơn trước khi giao nhiệm vụ nhóm.',
      resolutions: '1. Thống nhất áp dụng quy trình 4 bước sinh hoạt chuyên môn theo nghiên cứu bài học.\n2. Vận dụng linh hoạt các phương pháp tổ chức hoạt động nhóm hiệu quả cho các bài dạy tiếp theo.'
    }
  },
  {
    id: 'tmpl-dept-3',
    type: 'department',
    title: 'Biên bản Họp Tổ Đánh giá, Xếp loại Thi đua tháng',
    categoryOrDept: 'Tổ Khối 3',
    description: 'Đánh giá thực hiện nhiệm vụ công tác tháng, kiểm tra hồ sơ giáo án và bình xét thi đua công khai.',
    data: {
      title: 'Biên bản Họp Tổ đánh giá, xếp loại thi đua tháng ...',
      department: 'Tổ Khối 3',
      purpose: 'Đánh giá kết quả thực hiện nhiệm vụ công tác tháng và bình xét thi đua cho toàn thể giáo viên trong tổ.',
      reviewPastWork: '1. Công tác giảng dạy: 100% giáo viên hoàn thành đúng PPCT, không có trường hợp bỏ giờ, đi muộn.\n2. Hồ sơ sổ sách: Đã kiểm tra hồ sơ giáo án, 100% xếp loại Tốt.\n3. Công tác chủ nhiệm và phong trào: Lớp chủ nhiệm nề nếp tốt, tham gia đầy đủ phong trào của trường.',
      upcomingPlan: '1. Tiếp tục duy trì nề nếp dạy và học, đẩy mạnh phụ đạo học sinh chưa đạt.\n2. Chuẩn bị hồ sơ thao giảng mừng ngày Nhà giáo Việt Nam 20/11.',
      discussions: 'Tổ trưởng thông qua tiêu chí đánh giá thi đua tháng. 100% giáo viên trong tổ tự đánh giá và đóng góp ý kiến công khai, dân chủ.',
      resolutions: '100% thành viên nhất trí xếp loại thi đua tháng: các đồng chí đều đạt loại A (Xuất sắc).'
    }
  },
  {
    id: 'tmpl-pers-1',
    type: 'personal',
    title: 'Sổ ghi chép Họp Hội đồng Sư phạm tháng',
    categoryOrDept: 'Họp Hội đồng',
    description: 'Ghi chép nhanh các chỉ đạo của Ban Giám hiệu trong cuộc họp Hội đồng Sư phạm toàn trường.',
    data: {
      title: 'Sổ ghi chép Họp Hội đồng Sư phạm tháng ...',
      category: 'Họp Hội đồng',
      location: 'Hội trường lớn',
      chairperson: 'Hiệu trưởng - Chủ trì',
      attendees: 'Toàn thể Cán bộ - Giáo viên - Nhân viên nhà trường',
      content: '1. Đánh giá công tác tháng qua:\n- BGH biểu dương các tổ hoàn thành tốt tiến độ chuyên môn.\n- Đã tổ chức thành công Hội thi Giáo viên dạy giỏi cấp trường.\n\n2. Triển khai kế hoạch tháng tới:\n- Tập trung kiểm tra giữa kỳ / cuối kỳ theo đúng ma trận đề chuẩn.\n- Tăng cường an toàn trường học, phòng chống tai nạn thương tích.\n- Đẩy mạnh nhập điểm và cập nhật học bạ điện tử kịp thời.',
      actionItems: '1. Hoàn thành ra đề kiểm tra nộp về BGH trước ngày quy định.\n2. Cập nhật đầy đủ lịch báo giảng và điểm số trên hệ thống.',
      note: 'Chú ý đôn đốc học sinh tham gia phong trào kế hoạch nhỏ và giữ gìn vệ sinh lớp học.'
    }
  },
  {
    id: 'tmpl-pers-2',
    type: 'personal',
    title: 'Sổ ghi chép Họp Chuyên môn BGH chỉ đạo',
    categoryOrDept: 'Họp Chuyên môn',
    description: 'Nội dung triển khai công văn chuyên môn mới, hướng dẫn dạy học tích hợp và rà soát kế hoạch bài dạy.',
    data: {
      title: 'Sổ ghi chép Họp Chuyên môn định kỳ tuần ...',
      category: 'Họp Chuyên môn',
      location: 'Phòng họp Chuyên môn',
      chairperson: 'Phó Hiệu trưởng Chuyên môn',
      attendees: 'Tổ trưởng chuyên môn & Giáo viên bộ môn',
      content: '1. Quán quán triệt chỉ đạo chuyên môn của Phòng GD&ĐT:\n- Thực hiện đúng Công văn hướng dẫn điều chỉnh nội dung dạy học.\n- Chú trọng phát triển năng lực, phẩm chất học sinh theo Chương trình GDPT 2018.\n\n2. Kiểm tra hồ sơ giáo án tuần ...:\n- Nhắc nhở tích hợp kĩ năng sống, giáo dục STEM và công dân số vào kế hoạch bài dạy.',
      actionItems: '1. Rà soát lại toàn bộ kế hoạch bài dạy tích hợp STEM.\n2. Kiểm tra sổ theo dõi học sinh và chuẩn bị bài dạy minh họa tuần tới.',
      note: 'Chuẩn bị tài liệu tập huấn chuyên môn theo kế hoạch của Phòng.'
    }
  }
];

export const MeetingsModule: React.FC<MeetingsModuleProps> = ({
  state,
  onUpdateState,
  currentUser,
  initialTab = 'personal'
}) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'department'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [searchTerm, setSearchTerm] = useState('');
  // View mode state ('list' for table list view, 'grid' for card grid view)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Sub-Folder state
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MeetingFolder | null>(null);

  // Moving Target State (Move items / folders)
  const [movingTarget, setMovingTarget] = useState<{
    type: 'folder' | 'personal' | 'department';
    id: string;
    title: string;
    currentFolderId?: string;
  } | null>(null);

  const meetingFolders = state.meetingFolders || [];
  const activeTabFolders = meetingFolders.filter((f) => f.type === activeTab);

  React.useEffect(() => {
    setSelectedFolderId('all');
  }, [activeTab]);

  // Helper functions for desktop folder navigation
  const getSubfoldersCount = (folderId: string) => {
    return activeTabFolders.filter((f) => f.parentId === folderId).length;
  };

  const getFilesCount = (folderId: string) => {
    if (activeTab === 'personal') {
      return (state.personalMeetings || []).filter((pm) => pm.folderId === folderId).length;
    }
    return (state.departmentMeetings || []).filter((dm) => dm.folderId === folderId).length;
  };

  const getBreadcrumbs = () => {
    const rootName = activeTab === 'personal' ? 'Sổ họp cá nhân' : 'Biên bản Tổ khối';
    if (selectedFolderId === 'all') {
      return [{ id: 'all', name: rootName }];
    }
    if (selectedFolderId === 'uncategorized') {
      return [
        { id: 'all', name: rootName },
        { id: 'uncategorized', name: 'Chưa phân loại' }
      ];
    }

    const crumbs: { id: string; name: string }[] = [{ id: 'all', name: rootName }];
    const chain: MeetingFolder[] = [];
    let curr = meetingFolders.find((f) => f.id === selectedFolderId);
    while (curr) {
      chain.unshift(curr);
      curr = curr.parentId ? meetingFolders.find((f) => f.id === curr!.parentId) : undefined;
    }
    chain.forEach((f) => crumbs.push({ id: f.id, name: f.name }));
    return crumbs;
  };

  const handleGoUp = () => {
    if (selectedFolderId === 'all' || selectedFolderId === 'uncategorized') return;
    const current = meetingFolders.find((f) => f.id === selectedFolderId);
    if (current && current.parentId) {
      setSelectedFolderId(current.parentId);
    } else {
      setSelectedFolderId('all');
    }
  };

  // Compute subfolders in current view scope
  const currentSubfolders = activeTabFolders.filter((f) => {
    if (selectedFolderId === 'all') {
      return !f.parentId;
    }
    if (selectedFolderId === 'uncategorized') {
      return false;
    }
    return f.parentId === selectedFolderId;
  });

  // Personal Meeting Modal state
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isPersonalFullScreen, setIsPersonalFullScreen] = useState(true);
  const [editingPersonal, setEditingPersonal] = useState<PersonalMeetingItem | null>(null);

  // Department Meeting Modal state
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isDepartmentFullScreen, setIsDepartmentFullScreen] = useState(true);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentMeetingItem | null>(null);

  // Detail View Modal
  const [viewingPersonal, setViewingPersonal] = useState<PersonalMeetingItem | null>(null);
  const [viewingDepartment, setViewingDepartment] = useState<DepartmentMeetingItem | null>(null);

  // Copied toast state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Summary State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummaryResult, setAiSummaryResult] = useState<string | null>(null);

  // Controlled Form States for Direct Speech-to-Text Inline Editing
  const [personalFormContent, setPersonalFormContent] = useState('');
  const [deptFormReviewPastWork, setDeptFormReviewPastWork] = useState('');
  const [deptFormUpcomingPlan, setDeptFormUpcomingPlan] = useState('');
  const [deptFormDiscussions, setDeptFormDiscussions] = useState('');
  const [deptFormResolutions, setDeptFormResolutions] = useState('');

  // Sync controlled state when personal modal opens or editingPersonal changes
  React.useEffect(() => {
    if (isPersonalModalOpen) {
      setPersonalFormContent(editingPersonal?.content || '');
    }
  }, [isPersonalModalOpen, editingPersonal]);

  // Sync controlled state when department modal opens or editingDepartment changes
  React.useEffect(() => {
    if (isDepartmentModalOpen) {
      setDeptFormReviewPastWork(editingDepartment?.reviewPastWork || '');
      setDeptFormUpcomingPlan(editingDepartment?.upcomingPlan || '');
      setDeptFormDiscussions(editingDepartment?.discussions || '');
      setDeptFormResolutions(editingDepartment?.resolutions || '');
    }
  }, [isDepartmentModalOpen, editingDepartment]);

  // Direct Inline Voice Recording State (Records directly into form fields without opening modals)
  const [inlineRecordingField, setInlineRecordingField] = useState<string | null>(null);
  const [isInlineListening, setIsInlineListening] = useState(false);
  const inlineRecognitionRef = React.useRef<any>(null);

  const toggleInlineListening = (
    fieldKey: string,
    currentValue: string,
    setValueCallback: (val: string) => void
  ) => {
    if (isInlineListening && inlineRecordingField === fieldKey) {
      // Stop recording
      if (inlineRecognitionRef.current) {
        try {
          inlineRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsInlineListening(false);
      setInlineRecordingField(null);
    } else {
      // Stop existing recording
      if (inlineRecognitionRef.current) {
        try {
          inlineRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert(
          'Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói trực tiếp. Thầy/Cô có thể nhập hoặc dán nội dung cuộc họp.'
        );
        return;
      }

      try {
        const rec = new SpeechRecognition();
        rec.lang = 'vi-VN';
        rec.continuous = true;
        rec.interimResults = true;

        const baseText = currentValue ? currentValue.trim() + ' ' : '';

        rec.onstart = () => {
          setIsInlineListening(true);
          setInlineRecordingField(fieldKey);
        };

        rec.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setValueCallback((baseText + currentTranscript).trim());
        };

        rec.onerror = (err: any) => {
          console.warn('Inline speech error:', err);
          setIsInlineListening(false);
          setInlineRecordingField(null);
        };

        rec.onend = () => {
          setIsInlineListening(false);
          setInlineRecordingField(null);
        };

        inlineRecognitionRef.current = rec;
        rec.start();
      } catch (e) {
        console.error('Error starting inline speech recognition:', e);
        setIsInlineListening(false);
        setInlineRecordingField(null);
      }
    }
  };

  const handleInlineRefineAI = async (
    textToRefine: string,
    setValueCallback: (val: string) => void
  ) => {
    if (!textToRefine || !textToRefine.trim()) {
      alert('Chưa có nội dung văn bản trong ô để tinh lọc AI.');
      return;
    }

    setIsRefiningVoice(true);
    try {
      const res = await fetch('/api/ai/meeting-speech-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTranscript: textToRefine,
          meetingType: activeTab
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const refinedText =
          data.data.reviewPastWork ||
          data.data.content ||
          [
            data.data.reviewPastWork,
            data.data.upcomingPlan,
            data.data.discussions,
            data.data.resolutions
          ]
            .filter(Boolean)
            .join('\n\n');

        setValueCallback(refinedText);
      } else {
        alert(data.error || 'Có lỗi khi tinh lọc văn bản.');
      }
    } catch (err) {
      console.error('Inline refine error:', err);
      alert('Không thể kết nối dịch vụ AI.');
    } finally {
      setIsRefiningVoice(false);
    }
  };

  // Voice Recognition & AI Meeting Speech Refine State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isRefiningVoice, setIsRefiningVoice] = useState(false);
  const [refinedVoiceResult, setRefinedVoiceResult] = useState<{
    title?: string;
    reviewPastWork?: string;
    upcomingPlan?: string;
    discussions?: string;
    resolutions?: string;
    actionItems?: string;
  } | null>(null);
  const recognitionRef = React.useRef<any>(null);

  // Toggle Speech Recognition via Web Speech API
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
    } else {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert(
          'Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói trực tiếp. Thầy/Cô có thể nhập hoặc dán nội dung lời nói cuộc họp vào ô bên dưới để AI tự động tinh lọc chuẩn giáo dục.'
        );
        return;
      }

      try {
        const rec = new SpeechRecognition();
        rec.lang = 'vi-VN';
        rec.continuous = true;
        rec.interimResults = true;

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          let currentResult = '';
          for (let i = 0; i < event.results.length; i++) {
            currentResult += event.results[i][0].transcript + ' ';
          }
          setVoiceTranscript(currentResult.trim());
        };

        rec.onerror = (err: any) => {
          console.warn('Speech recognition error:', err);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (e) {
        console.error('Error starting speech recognition:', e);
        setIsListening(false);
      }
    }
  };

  // Clean up speech recognition on unmount
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Refine speech transcript using Gemini AI
  const handleRefineVoiceWithAI = async () => {
    if (!voiceTranscript || !voiceTranscript.trim()) {
      alert('Vui lòng bật ghi âm hoặc dán/nhập nội dung lời nói cuộc họp trước khi tinh lọc AI.');
      return;
    }

    setIsRefiningVoice(true);
    setRefinedVoiceResult(null);

    try {
      const res = await fetch('/api/ai/meeting-speech-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTranscript: voiceTranscript,
          meetingType: activeTab
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setRefinedVoiceResult(data.data);
      } else {
        alert(data.error || 'Có lỗi xảy ra khi xử lý nội dung giọng nói bằng AI.');
      }
    } catch (err: any) {
      console.error('Refine voice error:', err);
      alert('Không thể kết nối với hệ thống AI tinh lọc giọng nói.');
    } finally {
      setIsRefiningVoice(false);
    }
  };

  // Apply refined voice result to department meeting modal
  const handleApplyToDepartmentModal = () => {
    if (!refinedVoiceResult) return;
    setEditingDepartment({
      id: '',
      title: refinedVoiceResult.title || 'Biên bản Họp Tổ chuyên môn từ Giọng nói AI',
      department: 'Tổ Khối 1',
      meetingDate: today(),
      timeStart: '14:00',
      timeEnd: '16:00',
      chairperson: currentUser?.name || 'Tổ trưởng',
      secretary: 'Thư ký cuộc họp',
      totalMembers: 6,
      presentMembers: 6,
      absentMembers: 'Không',
      purpose: 'Nội dung triển khai chuyên môn được ghi nhận và tinh lọc tự động từ giọng nói AI',
      reviewPastWork: refinedVoiceResult.reviewPastWork || '',
      upcomingPlan: refinedVoiceResult.upcomingPlan || '',
      discussions: refinedVoiceResult.discussions || '',
      resolutions: refinedVoiceResult.resolutions || '',
      folderId: selectedFolderId !== 'all' && selectedFolderId !== 'uncategorized' ? selectedFolderId : 'uncategorized'
    });
    setIsVoiceModalOpen(false);
    setIsDepartmentModalOpen(true);
  };

  // Apply refined voice result to personal meeting modal
  const handleApplyToPersonalModal = () => {
    if (!refinedVoiceResult) return;
    const combinedContent = [
      `I. NỘI DUNG SINH HOẠT:\n${refinedVoiceResult.reviewPastWork || ''}`,
      `II. SINH HOẠT CHUYÊN MÔN / KẾ HOẠCH:\n${refinedVoiceResult.upcomingPlan || ''}`,
      `III. KẾT LUẬN CHUNG VÀ PHÂN CÔNG THỰC HIỆN:\n${refinedVoiceResult.discussions || ''}`,
      `IV. NGHỊ QUYẾT & KẾT THÚC:\n${refinedVoiceResult.resolutions || ''}`
    ].join('\n\n');

    setEditingPersonal({
      id: '',
      title: refinedVoiceResult.title || 'Sổ ghi chép cuộc họp từ Giọng nói AI',
      category: 'Họp Chuyên môn',
      meetingDate: today(),
      location: 'Phòng họp',
      chairperson: 'Chủ trì cuộc họp',
      attendees: 'Toàn thể giáo viên trong tổ',
      content: combinedContent,
      actionItems: refinedVoiceResult.actionItems || '',
      note: 'Ghi chép tự động từ lời nói cuộc họp (Đã tinh lọc chuẩn đạo đức & sư phạm bởi Gemini AI)',
      folderId: selectedFolderId !== 'all' && selectedFolderId !== 'uncategorized' ? selectedFolderId : 'uncategorized'
    });
    setIsVoiceModalOpen(false);
    setIsPersonalModalOpen(true);
  };

  // Quick Templates state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'department' | 'personal'>('all');

  const handleSelectTemplate = (tmpl: MeetingTemplate) => {
    if (tmpl.type === 'department') {
      setActiveTab('department');
      setEditingDepartment({
        id: '',
        title: tmpl.data.title || 'Biên bản họp tổ khối',
        department: tmpl.data.department || 'Tổ Khối 1',
        meetingDate: today(),
        timeStart: '14:00',
        timeEnd: '16:00',
        location: 'Phòng họp chuyên môn',
        chairperson: currentUser?.name || 'Tổ trưởng',
        secretary: 'Thư ký tổ khối',
        totalMembers: 5,
        presentMembers: 5,
        absentMembers: 'Không',
        purpose: tmpl.data.purpose || '',
        reviewPastWork: tmpl.data.reviewPastWork || '',
        upcomingPlan: tmpl.data.upcomingPlan || '',
        discussions: tmpl.data.discussions || '',
        resolutions: tmpl.data.resolutions || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsDepartmentModalOpen(true);
    } else {
      setActiveTab('personal');
      setEditingPersonal({
        id: '',
        title: tmpl.data.title || 'Sổ họp cá nhân',
        meetingDate: today(),
        category: tmpl.data.category || 'Họp Chuyên môn',
        location: tmpl.data.location || 'Phòng họp',
        chairperson: tmpl.data.chairperson || 'Hiệu trưởng',
        attendees: tmpl.data.attendees || '',
        content: tmpl.data.content || '',
        actionItems: tmpl.data.actionItems || '',
        note: tmpl.data.note || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsPersonalModalOpen(true);
    }
    setIsTemplateModalOpen(false);
  };

  const personalMeetings = state.personalMeetings || [];
  const departmentMeetings = state.departmentMeetings || [];

  // Filtered lists
  const filteredPersonal = personalMeetings.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.chairperson && item.chairperson.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesFolder =
      selectedFolderId === 'all' ||
      (selectedFolderId === 'uncategorized' && (!item.folderId || item.folderId === 'uncategorized')) ||
      item.folderId === selectedFolderId;
    return matchesSearch && matchesCategory && matchesFolder;
  });

  const filteredDepartment = departmentMeetings.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.chairperson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.secretary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' || item.department === departmentFilter;
    const matchesFolder =
      selectedFolderId === 'all' ||
      (selectedFolderId === 'uncategorized' && (!item.folderId || item.folderId === 'uncategorized')) ||
      item.folderId === selectedFolderId;
    return matchesSearch && matchesDept && matchesFolder;
  });

  // Handle Save Folder
  const handleSaveFolder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string) || 'Thư mục mới';
    const description = (formData.get('description') as string) || '';
    const color = (formData.get('color') as string) || '#0d9488';
    const parentIdForm = (formData.get('parentId') as string) || undefined;
    const finalParentId =
      parentIdForm === 'root' || parentIdForm === 'all'
        ? undefined
        : editingFolder?.parentId ?? (selectedFolderId !== 'all' && selectedFolderId !== 'uncategorized' ? selectedFolderId : parentIdForm);

    const newFolder: MeetingFolder = {
      id: editingFolder ? editingFolder.id : uid('mf'),
      name,
      description,
      color,
      type: activeTab,
      parentId: finalParentId,
      createdAt: editingFolder ? editingFolder.createdAt : new Date().toISOString()
    };

    onUpdateState((prev) => {
      const existing = prev.meetingFolders || [];
      if (editingFolder) {
        return {
          ...prev,
          meetingFolders: existing.map((f) => (f.id === editingFolder.id ? newFolder : f))
        };
      }
      return {
        ...prev,
        meetingFolders: [...existing, newFolder]
      };
    });

    setIsFolderModalOpen(false);
    setEditingFolder(null);
  };

  // Confirm Move item / folder to destination
  const handleConfirmMove = (destinationFolderId: string) => {
    if (!movingTarget) return;

    const targetFolderId =
      destinationFolderId === 'root' || destinationFolderId === 'all' ? undefined : destinationFolderId;

    if (movingTarget.type === 'folder') {
      onUpdateState((prev) => ({
        ...prev,
        meetingFolders: (prev.meetingFolders || []).map((f) =>
          f.id === movingTarget.id ? { ...f, parentId: targetFolderId } : f
        )
      }));
    } else if (movingTarget.type === 'personal') {
      onUpdateState((prev) => ({
        ...prev,
        personalMeetings: (prev.personalMeetings || []).map((pm) =>
          pm.id === movingTarget.id ? { ...pm, folderId: targetFolderId } : pm
        )
      }));
    } else if (movingTarget.type === 'department') {
      onUpdateState((prev) => ({
        ...prev,
        departmentMeetings: (prev.departmentMeetings || []).map((dm) =>
          dm.id === movingTarget.id ? { ...dm, folderId: targetFolderId } : dm
        )
      }));
    }

    setMovingTarget(null);
  };

  // Delete Folder
  const handleDeleteFolder = (folderId: string, folderName: string) => {
    if (
      confirm(
        `Thầy/Cô có chắc chắn muốn xóa thư mục "${folderName}"? Các ghi chép thuộc thư mục này sẽ tự động chuyển về trạng thái "Chưa phân loại".`
      )
    ) {
      onUpdateState((prev) => ({
        ...prev,
        meetingFolders: (prev.meetingFolders || []).filter((f) => f.id !== folderId),
        personalMeetings: (prev.personalMeetings || []).map((pm) =>
          pm.folderId === folderId ? { ...pm, folderId: undefined } : pm
        ),
        departmentMeetings: (prev.departmentMeetings || []).map((dm) =>
          dm.folderId === folderId ? { ...dm, folderId: undefined } : dm
        )
      }));
      if (selectedFolderId === folderId) {
        setSelectedFolderId('all');
      }
    }
  };

  // Handle Save Personal Meeting
  const handleSavePersonal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string) || 'Sổ họp cá nhân';
    const meetingDate = (formData.get('meetingDate') as string) || today();
    const location = (formData.get('location') as string) || '';
    const chairperson = (formData.get('chairperson') as string) || '';
    const attendees = (formData.get('attendees') as string) || '';
    const category = (formData.get('category') as string) || 'Họp Chuyên môn';
    const folderId = (formData.get('folderId') as string) || undefined;
    const content = (formData.get('content') as string) || '';
    const actionItems = (formData.get('actionItems') as string) || '';
    const note = (formData.get('note') as string) || '';

    const newItem: PersonalMeetingItem = {
      id: editingPersonal ? editingPersonal.id : uid('pm'),
      title,
      meetingDate,
      location,
      chairperson,
      attendees,
      category,
      folderId,
      content,
      actionItems,
      note,
      createdAt: editingPersonal ? editingPersonal.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onUpdateState((prev) => {
      const existing = prev.personalMeetings || [];
      if (editingPersonal) {
        return {
          ...prev,
          personalMeetings: existing.map((p) => (p.id === editingPersonal.id ? newItem : p))
        };
      }
      return {
        ...prev,
        personalMeetings: [newItem, ...existing]
      };
    });

    setIsPersonalModalOpen(false);
    setEditingPersonal(null);
  };

  // Handle Save Department Meeting
  const handleSaveDepartment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string) || 'Biên bản họp Tổ khối';
    const department = (formData.get('department') as string) || 'Tổ Khối 1';
    const meetingDate = (formData.get('meetingDate') as string) || today();
    const timeStart = (formData.get('timeStart') as string) || '14:00';
    const timeEnd = (formData.get('timeEnd') as string) || '16:00';
    const location = (formData.get('location') as string) || 'Phòng họp';
    const chairperson = (formData.get('chairperson') as string) || currentUser?.name || '';
    const secretary = (formData.get('secretary') as string) || '';
    const totalMembers = parseInt((formData.get('totalMembers') as string) || '0', 10);
    const presentMembers = parseInt((formData.get('presentMembers') as string) || '0', 10);
    const absentMembers = (formData.get('absentMembers') as string) || 'Không';
    const purpose = (formData.get('purpose') as string) || '';
    const folderId = (formData.get('folderId') as string) || undefined;
    const reviewPastWork = (formData.get('reviewPastWork') as string) || '';
    const upcomingPlan = (formData.get('upcomingPlan') as string) || '';
    const discussions = (formData.get('discussions') as string) || '';
    const resolutions = (formData.get('resolutions') as string) || '';

    const newItem: DepartmentMeetingItem = {
      id: editingDepartment ? editingDepartment.id : uid('dm'),
      title,
      department,
      meetingDate,
      timeStart,
      timeEnd,
      location,
      chairperson,
      secretary,
      totalMembers,
      presentMembers,
      absentMembers,
      purpose,
      folderId,
      reviewPastWork,
      upcomingPlan,
      discussions,
      resolutions,
      createdAt: editingDepartment ? editingDepartment.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onUpdateState((prev) => {
      const existing = prev.departmentMeetings || [];
      if (editingDepartment) {
        return {
          ...prev,
          departmentMeetings: existing.map((d) => (d.id === editingDepartment.id ? newItem : d))
        };
      }
      return {
        ...prev,
        departmentMeetings: [newItem, ...existing]
      };
    });

    setIsDepartmentModalOpen(false);
    setEditingDepartment(null);
  };

  // Delete Personal Item
  const handleDeletePersonal = (id: string) => {
    if (confirm('Thầy/Cô có chắc chắn muốn xóa sổ họp cá nhân này không?')) {
      onUpdateState((prev) => ({
        ...prev,
        personalMeetings: (prev.personalMeetings || []).filter((item) => item.id !== id)
      }));
      if (viewingPersonal?.id === id) setViewingPersonal(null);
    }
  };

  // Delete Department Item
  const handleDeleteDepartment = (id: string) => {
    if (confirm('Thầy/Cô có chắc chắn muốn xóa biên bản tổ khối này không?')) {
      onUpdateState((prev) => ({
        ...prev,
        departmentMeetings: (prev.departmentMeetings || []).filter((item) => item.id !== id)
      }));
      if (viewingDepartment?.id === id) setViewingDepartment(null);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Print Document
  const handlePrint = () => {
    window.print();
  };

  // Export Personal Meeting to Word file formatted according to Nghị định 30/2020/NĐ-CP
  const handleExportPersonalWord = (item: PersonalMeetingItem) => {
    const formattedDate = item.meetingDate
      ? (() => {
          const parts = item.meetingDate.split('-');
          if (parts.length === 3) {
            return `ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
          }
          return `ngày ${item.meetingDate}`;
        })()
      : 'ngày ... tháng ... năm ...';

    const day = item.meetingDate ? item.meetingDate.split('-')[2] || '...' : '...';
    const month = item.meetingDate ? item.meetingDate.split('-')[1] || '...' : '...';
    const year = item.meetingDate ? item.meetingDate.split('-')[0] || '...' : '...';

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${item.title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: 595.3pt 841.9pt; /* A4 */
            margin: 2.0cm 2.0cm 2.0cm 2.5cm;
          }
          div.WordSection1 { page: WordSection1; }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 13pt;
            line-height: 1.25;
            color: #000000;
          }
          table.admin-header {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-bottom: 18pt;
          }
          table.admin-header td {
            border: none;
            vertical-align: top;
            padding: 0;
          }
          .header-left {
            text-align: center;
            font-size: 12pt;
          }
          .header-right {
            text-align: center;
            font-size: 12pt;
          }
          .header-bold {
            font-weight: bold;
            text-transform: uppercase;
          }
          .header-line {
            width: 50%;
            border-bottom: 1px solid #000;
            margin: 3pt auto 6pt auto;
          }
          .doc-title {
            text-align: center;
            font-weight: bold;
            font-size: 15pt;
            text-transform: uppercase;
            margin-top: 12pt;
            margin-bottom: 6pt;
          }
          .section-heading {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 13pt;
            margin-top: 12pt;
            margin-bottom: 4pt;
          }
          .content-block {
            margin-left: 0pt;
            text-align: justify;
            white-space: pre-wrap;
            margin-bottom: 8pt;
          }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          <table class="admin-header">
            <tr>
              <td style="width: 45%;" class="header-left">
                TRƯỜNG TIỂU HỌC THẠNH YÊN 1<br/>
                <span class="header-bold">${(item.category || 'SỔ GHI CHÉP HỌP').toUpperCase()}</span>
              </td>
              <td style="width: 55%;" class="header-right">
                <span class="header-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br/>
                <span style="font-weight: bold;">Độc lập - Tự do - Hạnh phúc</span>
                <div class="header-line"></div>
                <span style="font-style: italic; font-size: 12pt;">Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}</span>
              </td>
            </tr>
          </table>

          <div class="doc-title">${item.title.toUpperCase()}</div>

          <div class="section-heading">I. THÔNG TIN CHUNG</div>
          <div style="margin-bottom: 4pt;">1. <b>Thời gian họp:</b> ${formattedDate}</div>
          <div style="margin-bottom: 4pt;">2. <b>Địa điểm:</b> ${item.location || 'Phòng họp'}</div>
          <div style="margin-bottom: 4pt;">3. <b>Chủ trì:</b> ${item.chairperson || 'Chủ tọa cuộc họp'}</div>
          ${item.attendees ? `<div style="margin-bottom: 12pt;">4. <b>Thành phần tham dự:</b> ${item.attendees}</div>` : '<div style="margin-bottom: 12pt;"></div>'}

          <div class="section-heading">II. NỘI DUNG GHI CHÉP CUỘC HỌP</div>
          <div class="content-block">${item.content || 'Chưa có nội dung ghi chép.'}</div>

          ${item.actionItems ? `
          <div class="section-heading">III. NHIỆM VỤ VÀ TRỌNG TÂM CẦN THỰC HIỆN</div>
          <div class="content-block">${item.actionItems}</div>
          ` : ''}

          ${item.note ? `
          <div style="margin-top: 12pt; font-style: italic;">
            <b>Ghi chú:</b> ${item.note}
          </div>
          ` : ''}

          <table style="width: 100%; border-collapse: collapse; margin-top: 30pt;">
            <tr>
              <td style="width: 50%;"></td>
              <td style="width: 50%; text-align: center;">
                <span style="font-style: italic; font-size: 11pt;">Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}</span><br/>
                <b>NGƯỜI GHI SỔ</b><br/>
                <span style="font-style: italic; font-size: 10pt;">(Ký và ghi rõ họ tên)</span>
                <br/><br/><br/><br/>
                <b>${currentUser?.name || 'Giáo viên'}</b>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8'
    });
    const link = document.createElement('a');
    const cleanFileName = item.title.replace(/[^a-zA-Z0-9_ -]/g, '_');
    link.href = URL.createObjectURL(blob);
    link.download = `${cleanFileName}_SoHop.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Department Meeting to Word file formatted according to Nghị định 30/2020/NĐ-CP
  const handleExportDepartmentWord = (item: DepartmentMeetingItem) => {
    const formattedDate = item.meetingDate
      ? (() => {
          const parts = item.meetingDate.split('-');
          if (parts.length === 3) {
            return `ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
          }
          return `ngày ${item.meetingDate}`;
        })()
      : 'ngày ... tháng ... năm ...';

    const day = item.meetingDate ? item.meetingDate.split('-')[2] || '...' : '...';
    const month = item.meetingDate ? item.meetingDate.split('-')[1] || '...' : '...';
    const year = item.meetingDate ? item.meetingDate.split('-')[0] || '...' : '...';

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${item.title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: 595.3pt 841.9pt; /* A4 */
            margin: 2.0cm 2.0cm 2.0cm 2.5cm; /* Standard admin margins */
          }
          div.WordSection1 { page: WordSection1; }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 13pt;
            line-height: 1.25;
            color: #000000;
          }
          table.admin-header {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-bottom: 18pt;
          }
          table.admin-header td {
            border: none;
            vertical-align: top;
            padding: 0;
          }
          .header-left {
            text-align: center;
            font-size: 12pt;
          }
          .header-right {
            text-align: center;
            font-size: 12pt;
          }
          .header-bold {
            font-weight: bold;
            text-transform: uppercase;
          }
          .header-line {
            width: 50%;
            border-bottom: 1px solid #000;
            margin: 3pt auto 6pt auto;
          }
          .doc-title {
            text-align: center;
            font-weight: bold;
            font-size: 15pt;
            text-transform: uppercase;
            margin-top: 12pt;
            margin-bottom: 4pt;
          }
          .doc-subtitle {
            text-align: center;
            font-style: italic;
            font-size: 12pt;
            margin-bottom: 18pt;
          }
          .section-heading {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 13pt;
            margin-top: 12pt;
            margin-bottom: 4pt;
          }
          .content-block {
            margin-left: 0pt;
            text-align: justify;
            white-space: pre-wrap;
            margin-bottom: 8pt;
          }
          table.sign-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-top: 24pt;
          }
          table.sign-table td {
            border: none;
            vertical-align: top;
            text-align: center;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          <!-- Administrative Header (Nghị định 30/2020/NĐ-CP) -->
          <table class="admin-header">
            <tr>
              <td style="width: 45%;" class="header-left">
                TRƯỜNG TIỂU HỌC THẠNH YÊN 1<br/>
                <span class="header-bold">${(item.department || 'TỔ KHỐI').toUpperCase()}</span><br/>
                <span style="font-size: 11pt; font-style: italic;">Số: ....../BB-TK</span>
              </td>
              <td style="width: 55%;" class="header-right">
                <span class="header-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br/>
                <span style="font-weight: bold;">Độc lập - Tự do - Hạnh phúc</span>
                <div class="header-line"></div>
                <span style="font-style: italic; font-size: 12pt;">Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}</span>
              </td>
            </tr>
          </table>

          <!-- Document Title -->
          <div class="doc-title">${item.title.toUpperCase()}</div>
          ${item.purpose ? `<div class="doc-subtitle">(V/v: ${item.purpose})</div>` : '<div style="margin-bottom: 12pt;"></div>'}

          <!-- Section I: General Info -->
          <div class="section-heading">I. THỜI GIAN, ĐỊA ĐIỂM VÀ THÀNH PHẦN THAM DỰ</div>
          <div style="margin-bottom: 4pt;">1. <b>Thời gian:</b> Từ ${item.timeStart || '14:00'} đến ${item.timeEnd || '16:00'}, ${formattedDate}</div>
          <div style="margin-bottom: 4pt;">2. <b>Địa điểm:</b> ${item.location || 'Phòng họp chuyên môn'}</div>
          <div style="margin-bottom: 4pt;">3. <b>Chủ trì:</b> Đồng chí ${item.chairperson} - Tổ trưởng</div>
          <div style="margin-bottom: 4pt;">4. <b>Thư ký:</b> Đồng chí ${item.secretary}</div>
          <div style="margin-bottom: 12pt;">5. <b>Thành phần tham dự:</b> Tổng số ${item.totalMembers || 6} đồng chí. Có mặt: ${item.presentMembers || 6} đ/c, Vắng mặt: ${item.absentMembers || 'Không'}.</div>

          <!-- Section II: Content -->
          <div class="section-heading">II. NỘI DUNG CUỘC HỌP</div>

          <div style="font-weight: bold; margin-top: 6pt; margin-bottom: 3pt;">1. Đánh giá công tác thời gian qua:</div>
          <div class="content-block">${item.reviewPastWork || 'Chưa có nội dung.'}</div>

          <div style="font-weight: bold; margin-top: 6pt; margin-bottom: 3pt;">2. Triển khai kế hoạch thời gian tới:</div>
          <div class="content-block">${item.upcomingPlan || 'Chưa có nội dung.'}</div>

          ${item.discussions ? `
          <div style="font-weight: bold; margin-top: 6pt; margin-bottom: 3pt;">3. Ý kiến thảo luận của các thành viên:</div>
          <div class="content-block">${item.discussions}</div>
          ` : ''}

          <div style="font-weight: bold; margin-top: 6pt; margin-bottom: 3pt;">4. Kết luận & Quyết nghị của Tổ khối:</div>
          <div class="content-block">${item.resolutions || '100% thành viên tham dự nhất trí thông qua nội dung cuộc họp.'}</div>

          <!-- Section III: Closing -->
          <div class="section-heading" style="margin-top: 14pt;">III. KẾT THÚC CUỘC HỌP</div>
          <div style="text-align: justify; margin-bottom: 12pt;">
            Biên bản cuộc họp đã được đọc lại cho toàn thể các thành viên tham dự cùng nghe, nhất trí hoàn toàn với các nội dung đã ghi và không có ý kiến bổ sung. Cuộc họp kết thúc vào lúc ${item.timeEnd || '16:00'} cùng ngày.
          </div>

          <!-- Signatures Table -->
          <table class="sign-table">
            <tr>
              <td style="width: 40%; text-align: left; font-size: 11pt;">
                <b><i>Nơi nhận:</i></b><br/>
                - BGH nhà trường (để b/c);<br/>
                - Các thành viên trong tổ;<br/>
                - Lưu: VT, Hồ sơ Tổ.
              </td>
              <td style="width: 30%; text-align: center;">
                <b>THƯ KÝ</b><br/>
                <span style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</span>
                <br/><br/><br/><br/>
                <b>${item.secretary}</b>
              </td>
              <td style="width: 30%; text-align: center;">
                <b>CHỦ TỌA / TỔ TRƯỞNG</b><br/>
                <span style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</span>
                <br/><br/><br/><br/>
                <b>${item.chairperson}</b>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8'
    });
    const link = document.createElement('a');
    const cleanFileName = item.title.replace(/[^a-zA-Z0-9_ -]/g, '_');
    link.href = URL.createObjectURL(blob);
    link.download = `${cleanFileName}_BienBan.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Legacy/Text Export
  const handleExportDoc = (title: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[^a-zA-Z0-9_ -]/g, '')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4">
      {/* Compact Streamlined Control Toolbar */}
      <div className="bg-white/95 backdrop-blur-md border border-teal-200/80 rounded-2xl p-2.5 sm:px-4 sm:py-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left: Search & Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'personal'
                  ? 'Tìm kiếm sổ họp...'
                  : 'Tìm kiếm biên bản...'
              }
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {activeTab === 'personal' ? (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 shrink-0 cursor-pointer"
            >
              <option value="all">Tất cả phân loại</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 shrink-0 cursor-pointer"
            >
              <option value="all">Tất cả Tổ Khối</option>
              {DEPARTMENT_OPTIONS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Toggle: List vs Grid */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng Danh sách"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Danh sách</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng Lưới thẻ"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Lưới thẻ</span>
            </button>
          </div>
        </div>

        {/* Right: Stat Badge, Quick Templates & Primary Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 flex-wrap sm:flex-nowrap">
          <span className="text-[11px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full whitespace-nowrap hidden lg:inline-block">
            {activeTab === 'personal'
              ? `${filteredPersonal.length} sổ họp`
              : `${filteredDepartment.length} biên bản`}
          </span>

          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            title="Chuyển giọng nói cuộc họp thành văn bản chuẩn mực đạo đức & sư phạm bởi Gemini AI"
          >
            <Mic className="w-3.5 h-3.5 text-rose-200 animate-pulse" />
            <span>🎙️ Giọng nói → Văn bản AI</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            title="Tải mẫu biên bản nhanh chuẩn cấu trúc ngành giáo dục"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            <span>⚡ Mẫu Nhanh</span>
          </button>

          {activeTab === 'personal' ? (
            <button
              type="button"
              onClick={() => {
                setEditingPersonal(null);
                setIsPersonalModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs shadow-sm shadow-teal-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Sổ Họp Cá Nhân</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingDepartment(null);
                setIsDepartmentModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs shadow-sm shadow-teal-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Biên Bản Tổ Khối</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Address Bar & Navigation */}
      <div className="bg-slate-900 text-white rounded-2xl p-2.5 sm:px-4 sm:py-3 shadow-md flex flex-col md:flex-row items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto flex-1 scrollbar-none">
          <button
            type="button"
            onClick={handleGoUp}
            disabled={selectedFolderId === 'all' || selectedFolderId === 'uncategorized'}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-teal-400 cursor-pointer transition-colors shrink-0 flex items-center gap-1 text-xs font-bold"
            title="Trở về thư mục cấp trên"
          >
            <CornerUpLeft className="w-4 h-4" />
            <span className="inline">Trở về</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold overflow-x-auto flex-1 min-w-0">
            <span className="text-slate-400 flex items-center gap-1 shrink-0">
              <HardDrive className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline font-bold">Máy tính</span>
              <span>/</span>
            </span>

            {getBreadcrumbs().map((crumb, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <React.Fragment key={crumb.id}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(crumb.id)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isLast
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setSelectedFolderId('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              selectedFolderId === 'all'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📁 Thư mục gốc
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingFolder(null);
              setIsFolderModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            title="Tạo thư mục con tại đây"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Tạo thư mục con</span>
          </button>
        </div>
      </div>

      {/* Desktop Subfolders Grid */}
      {currentSubfolders.length > 0 && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-500 tracking-wider px-1">
            <span className="flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-teal-600" />
              <span>Thư mục con ({currentSubfolders.length})</span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
              💡 Bấm đúp (hoặc bấm "Mở") để mở thư mục
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {currentSubfolders.map((f) => {
              const subCount = getSubfoldersCount(f.id);
              const fileCount = getFilesCount(f.id);

              return (
                <div
                  key={f.id}
                  onDoubleClick={() => setSelectedFolderId(f.id)}
                  className="group relative bg-gradient-to-b from-white to-slate-50/80 rounded-2xl border border-slate-200/90 hover:border-teal-400 p-3 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: `${f.color || '#0d9488'}20`, color: f.color || '#0d9488' }}
                      >
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-teal-700 truncate leading-snug">
                          {f.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1">
                          {f.description || 'Thư mục máy tính'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-1">
                      {subCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200/60">
                          {subCount} mục con
                        </span>
                      )}
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {fileCount} tập tin
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(f.id)}
                        className="px-2 py-0.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] cursor-pointer"
                        title="Mở thư mục"
                      >
                        Mở
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingTarget({
                            type: 'folder',
                            id: f.id,
                            title: f.name,
                            currentFolderId: f.parentId
                          });
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        title="Di chuyển thư mục"
                      >
                        <Move className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(f);
                          setIsFolderModalOpen(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-slate-100 cursor-pointer"
                        title="Sửa tên thư mục"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(f.id, f.name);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Xóa thư mục"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Area */}
      {activeTab === 'personal' ? (
        /* PERSONAL MEETINGS GRID */
        <div>
          {filteredPersonal.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Chưa có sổ họp cá nhân nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Nhấn nút "Thêm Sổ Họp Cá Nhân" để bắt đầu ghi chép cuộc họp Hội đồng, cuộc họp Chuyên môn hoặc cuộc họp Chủ nhiệm của Thầy/Cô.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingPersonal(null);
                  setIsPersonalModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-sm hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Sổ Họp Mới</span>
              </button>
            </div>
          ) : viewMode === 'list' ? (
            /* PERSONAL MEETINGS TABLE LIST VIEW */
            <div className="bg-white rounded-3xl border border-teal-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-teal-50/80 border-b border-teal-200/80 text-[11px] font-black uppercase text-teal-900 tracking-wider">
                      <th className="py-3 px-3.5 w-12 text-center">STT</th>
                      <th className="py-3 px-3.5">Tên Sổ Họp & Thư Mục</th>
                      <th className="py-3 px-3.5">Phân Loại</th>
                      <th className="py-3 px-3.5">Thời Gian & Chủ Trì</th>
                      <th className="py-3 px-3.5">Nội Dung / Trọng Tâm</th>
                      <th className="py-3 px-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredPersonal.map((item, idx) => {
                      const f = meetingFolders.find((folder) => folder.id === item.folderId);
                      return (
                        <tr key={item.id} className="hover:bg-teal-50/40 transition-colors group">
                          <td className="py-3.5 px-3.5 text-center font-extrabold text-slate-400">{idx + 1}</td>
                          <td className="py-3.5 px-3.5 font-extrabold text-slate-800 max-w-xs">
                            <div className="space-y-1">
                              <span
                                className="text-sm font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors cursor-pointer block leading-snug"
                                onClick={() => setViewingPersonal(item)}
                              >
                                {item.title}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{
                                    backgroundColor: f ? `${f.color}15` : '#f1f5f9',
                                    borderColor: f ? `${f.color}40` : '#e2e8f0',
                                    color: f ? f.color : '#64748b'
                                  }}
                                  onClick={() => setSelectedFolderId(f ? f.id : 'uncategorized')}
                                  title="Bấm để lọc theo thư mục này"
                                >
                                  <Folder className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[120px]">{f ? f.name : 'Chưa phân loại'}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                                <Calendar className="w-3 h-3 text-teal-600 shrink-0" />
                                <span>{item.meetingDate}</span>
                              </div>
                              {item.chairperson && (
                                <div className="text-[10px] text-slate-500">
                                  Chủ trì: <strong>{item.chairperson}</strong>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5 max-w-sm text-slate-600">
                            <p className="line-clamp-2 text-xs font-normal leading-relaxed">{item.content || 'Không có ghi chú chi tiết'}</p>
                            {item.actionItems && (
                              <span className="text-[10px] text-amber-800 font-bold line-clamp-1 mt-0.5 block">
                                📌 {item.actionItems}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingPersonal(item)}
                                className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Xem</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportPersonalWord(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                                title="Xuất file Word (.doc) chuẩn hành chính"
                              >
                                <Download className="w-4 h-4 text-teal-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setMovingTarget({
                                    type: 'personal',
                                    id: item.id,
                                    title: item.title,
                                    currentFolderId: item.folderId
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Di chuyển vào thư mục khác"
                              >
                                <Move className="w-4 h-4 text-indigo-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPersonal(item);
                                  setIsPersonalModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePersonal(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* PERSONAL MEETINGS GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPersonal.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-teal-100 hover:border-teal-300 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                          {item.category}
                        </span>
                        {(() => {
                          const f = meetingFolders.find((folder) => folder.id === item.folderId);
                          return (
                            <span
                              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                backgroundColor: f ? `${f.color}15` : '#f1f5f9',
                                borderColor: f ? `${f.color}40` : '#e2e8f0',
                                color: f ? f.color : '#64748b'
                              }}
                              onClick={() => setSelectedFolderId(f ? f.id : 'uncategorized')}
                              title="Bấm để lọc theo thư mục này"
                            >
                              <Folder className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[100px]">{f ? f.name : 'Chưa phân loại'}</span>
                            </span>
                          );
                        })()}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-teal-600" />
                        <span>{item.meetingDate}</span>
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">
                      {item.title}
                    </h3>

                    {item.chairperson && (
                      <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Chủ trì: <strong>{item.chairperson}</strong></span>
                      </p>
                    )}

                    <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 font-normal leading-relaxed">
                      {item.content || 'Không có ghi chú chi tiết.'}
                    </p>

                    {item.actionItems && (
                      <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-900 font-medium">
                        <strong className="block text-[10px] uppercase tracking-wider font-extrabold text-amber-800 mb-0.5">
                          📌 Nhiệm vụ trọng tâm:
                        </strong>
                        <p className="line-clamp-2">{item.actionItems}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewingPersonal(item)}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Xem toàn bộ</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleExportPersonalWord(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                        title="Xuất file Word (.doc) chuẩn hành chính"
                      >
                        <Download className="w-4 h-4 text-teal-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMovingTarget({
                            type: 'personal',
                            id: item.id,
                            title: item.title,
                            currentFolderId: item.folderId
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Di chuyển vào thư mục khác"
                      >
                        <Move className="w-4 h-4 text-indigo-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPersonal(item);
                          setIsPersonalModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePersonal(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* DEPARTMENT MEETINGS GRID */
        <div>
          {filteredDepartment.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <ClipboardList className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Chưa có biên bản họp tổ khối nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Nhấn nút "Tạo Biên Bản Tổ Khối" để khởi tạo biên bản họp đánh giá chuyên môn tuần/tháng đầy đủ thông tin chuẩn ngành giáo dục.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingDepartment(null);
                  setIsDepartmentModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-sm hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Biên Bản Mới</span>
              </button>
            </div>
          ) : viewMode === 'list' ? (
            /* DEPARTMENT MEETINGS TABLE LIST VIEW */
            <div className="bg-white rounded-3xl border border-indigo-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-indigo-50/80 border-b border-indigo-200/80 text-[11px] font-black uppercase text-indigo-950 tracking-wider">
                      <th className="py-3 px-3.5 w-12 text-center">STT</th>
                      <th className="py-3 px-3.5">Tên Biên Bản & Thư Mục</th>
                      <th className="py-3 px-3.5">Tổ Khối</th>
                      <th className="py-3 px-3.5">Thời Gian & Nhân Sự</th>
                      <th className="py-3 px-3.5">Quyết Nghị & Nội Dung</th>
                      <th className="py-3 px-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredDepartment.map((item, idx) => {
                      const f = meetingFolders.find((folder) => folder.id === item.folderId);
                      return (
                        <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="py-3.5 px-3.5 text-center font-extrabold text-slate-400">{idx + 1}</td>
                          <td className="py-3.5 px-3.5 font-extrabold text-slate-800 max-w-xs">
                            <div className="space-y-1">
                              <span
                                className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors cursor-pointer block leading-snug"
                                onClick={() => setViewingDepartment(item)}
                              >
                                {item.title}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{
                                    backgroundColor: f ? `${f.color}15` : '#f1f5f9',
                                    borderColor: f ? `${f.color}40` : '#e2e8f0',
                                    color: f ? f.color : '#64748b'
                                  }}
                                  onClick={() => setSelectedFolderId(f ? f.id : 'uncategorized')}
                                  title="Bấm để lọc theo thư mục này"
                                >
                                  <Folder className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[120px]">{f ? f.name : 'Chưa phân loại'}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200/80">
                              {item.department}
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                                <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span>{item.meetingDate}</span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Chủ trì: <strong>{item.chairperson}</strong> | Thư ký: <strong>{item.secretary}</strong>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5 max-w-sm text-slate-600">
                            {item.purpose && (
                              <p className="line-clamp-1 text-xs italic font-normal text-slate-500 mb-0.5">
                                "{item.purpose}"
                              </p>
                            )}
                            {item.resolutions ? (
                              <span className="text-[10px] text-emerald-900 font-bold line-clamp-2 block bg-emerald-50/80 p-1 rounded-lg border border-emerald-200/60">
                                ✅ {item.resolutions}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Chưa có kết luận</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingDepartment(item)}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>Xem</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportDepartmentWord(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Xuất biên bản Word (.doc) chuẩn hành chính"
                              >
                                <Download className="w-4 h-4 text-indigo-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setMovingTarget({
                                    type: 'department',
                                    id: item.id,
                                    title: item.title,
                                    currentFolderId: item.folderId
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Di chuyển vào thư mục khác"
                              >
                                <Move className="w-4 h-4 text-indigo-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDepartment(item);
                                  setIsDepartmentModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDepartment(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* DEPARTMENT MEETINGS GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredDepartment.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-teal-100 hover:border-teal-300 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200/80">
                          {item.department}
                        </span>
                        {(() => {
                          const f = meetingFolders.find((folder) => folder.id === item.folderId);
                          return (
                            <span
                              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                backgroundColor: f ? `${f.color}15` : '#f1f5f9',
                                borderColor: f ? `${f.color}40` : '#e2e8f0',
                                color: f ? f.color : '#64748b'
                              }}
                              onClick={() => setSelectedFolderId(f ? f.id : 'uncategorized')}
                              title="Bấm để lọc theo thư mục này"
                            >
                              <Folder className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[100px]">{f ? f.name : 'Chưa phân loại'}</span>
                            </span>
                          );
                        })()}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-600" />
                        <span>{item.meetingDate}</span>
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                      {item.title}
                    </h3>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 font-medium bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <div>
                        Chủ trì: <strong className="text-slate-800">{item.chairperson}</strong>
                      </div>
                      <div>
                        Thư ký: <strong className="text-slate-800">{item.secretary}</strong>
                      </div>
                    </div>

                    {item.purpose && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic font-normal">
                        " {item.purpose} "
                      </p>
                    )}

                    {item.resolutions && (
                      <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-[11px] text-emerald-950 font-medium">
                        <strong className="block text-[10px] uppercase tracking-wider font-extrabold text-emerald-800 mb-0.5">
                          ✅ Kết luận & Quyết nghị:
                        </strong>
                        <p className="line-clamp-2">{item.resolutions}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewingDepartment(item)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Xem toàn văn</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleExportDepartmentWord(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Xuất biên bản Word (.doc) chuẩn hành chính"
                      >
                        <Download className="w-4 h-4 text-indigo-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMovingTarget({
                            type: 'department',
                            id: item.id,
                            title: item.title,
                            currentFolderId: item.folderId
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Di chuyển vào thư mục khác"
                      >
                        <Move className="w-4 h-4 text-indigo-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDepartment(item);
                          setIsDepartmentModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 0: CREATE/EDIT SUB-FOLDER             */}
      {/* ========================================== */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-teal-200 w-full max-w-md my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-teal-700 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                <h3 className="font-extrabold text-base">
                  {editingFolder ? 'Chỉnh Sửa Thư Mục' : 'Tạo Thư Mục Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="p-4 space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tên thư mục (*)</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingFolder?.name || ''}
                  required
                  placeholder={
                    activeTab === 'personal'
                      ? 'Ví dụ: Họp Hội đồng Sư phạm năm 2026'
                      : 'Ví dụ: Biên bản Họp Khối 3 Học kỳ 1'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Mô tả thư mục</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingFolder?.description || ''}
                  placeholder="Mô tả ngắn gọn về các ghi chép lưu trong thư mục..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Thư mục mẹ (Vị trí lưu trữ)</label>
                <select
                  name="parentId"
                  defaultValue={
                    editingFolder?.parentId ||
                    (selectedFolderId !== 'all' && selectedFolderId !== 'uncategorized' ? selectedFolderId : 'root')
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="root">📁 Thư mục gốc (Gốc không gian làm việc)</option>
                  {activeTabFolders
                    .filter((f) => f.id !== editingFolder?.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Màu đại diện thư mục</label>
                <div className="flex items-center gap-2 pt-1">
                  {['#0d9488', '#0284c7', '#4f46e5', '#9333ea', '#e11d48', '#d97706', '#16a34a'].map((c) => (
                    <label key={c} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        value={c}
                        defaultChecked={editingFolder?.color ? editingFolder.color === c : c === '#0d9488'}
                        className="sr-only peer"
                      />
                      <span
                        className="w-6 h-6 rounded-full block peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-teal-600 transition-all"
                        style={{ backgroundColor: c }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20"
                >
                  Lưu Thư Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: ADD/EDIT PERSONAL MEETING          */}
      {/* ========================================== */}
      {isPersonalModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center overflow-hidden ${isPersonalFullScreen ? 'p-0 sm:p-2' : 'p-2 sm:p-4'}`}>
          <div className={`bg-white shadow-2xl border border-teal-200 w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isPersonalFullScreen 
              ? 'h-full sm:h-full sm:rounded-2xl' 
              : 'max-w-3xl h-[92vh] rounded-3xl my-auto'
          }`}>
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-xs shrink-0">
                  <BookOpen className="w-5 h-5 text-teal-100" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-lg leading-tight">
                    {editingPersonal ? 'Chỉnh Sửa Sổ Họp Cá Nhân' : 'Thêm Mới Sổ Họp Cá Nhân'}
                  </h3>
                  <p className="text-[11px] text-teal-100 font-medium hidden sm:block">Khung soạn thảo toàn màn hình rộng rãi, tối ưu việc nhập văn bản ghi chép cá nhân & chỉ đạo cuộc họp</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Chuyển giọng nói cuộc họp thành văn bản chuẩn giáo dục"
                >
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">🎙️ Ghi âm AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Chọn mẫu biên bản có sẵn"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">⚡ Mẫu nhanh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPersonalFullScreen(!isPersonalFullScreen)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all border border-white/20"
                  title={isPersonalFullScreen ? "Thu nhỏ cửa sổ" : "Phóng to toàn màn hình (Full khung)"}
                >
                  {isPersonalFullScreen ? (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Thu nhỏ</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Full khung</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPersonalModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePersonal} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tên/Tên cuộc họp (*)</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingPersonal?.title || ''}
                  required
                  placeholder="Ví dụ: Họp Hội đồng Sư phạm tháng 10 / Họp Chuyên môn tuần 8"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Phân loại cuộc họp</label>
                  <select
                    name="category"
                    defaultValue={editingPersonal?.category || 'Họp Chuyên môn'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Thư mục lưu trữ</label>
                  <select
                    name="folderId"
                    defaultValue={
                      editingPersonal?.folderId ||
                      (selectedFolderId !== 'all' && selectedFolderId !== 'uncategorized' ? selectedFolderId : 'uncategorized')
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                  >
                    <option value="uncategorized">📂 Mặc định (Chưa phân loại)</option>
                    {activeTabFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Ngày họp (*)</label>
                  <input
                    type="date"
                    name="meetingDate"
                    defaultValue={editingPersonal?.meetingDate || today()}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Địa điểm</label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={editingPersonal?.location || 'Phòng họp'}
                    placeholder="Ví dụ: Hội trường lớn / Phòng 3A1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Người chủ trì</label>
                  <input
                    type="text"
                    name="chairperson"
                    defaultValue={editingPersonal?.chairperson || 'Hiệu trưởng'}
                    placeholder="Ví dụ: BGH / Tổ trưởng"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Thành phần tham dự</label>
                <input
                  type="text"
                  name="attendees"
                  defaultValue={editingPersonal?.attendees || ''}
                  placeholder="Ví dụ: Toàn thể Cán bộ - Giáo viên - Nhân viên"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <label className="text-xs font-black text-slate-800">Nội dung cuộc họp (*)</label>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() =>
                        toggleInlineListening(
                          'personal_content',
                          personalFormContent,
                          setPersonalFormContent
                        )
                      }
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        isInlineListening && inlineRecordingField === 'personal_content'
                          ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                      title="Bấm để bắt đầu/dừng ghi âm giọng nói trực tiếp vào ô này"
                    >
                      {isInlineListening && inlineRecordingField === 'personal_content' ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 text-rose-200 animate-spin" />
                          <span>⏹️ Dừng ghi âm</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-rose-600" />
                          <span>🎙️ Ghi âm trực tiếp</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleInlineRefineAI(personalFormContent, setPersonalFormContent)
                      }
                      disabled={isRefiningVoice || !personalFormContent.trim()}
                      className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      title="Tinh lọc chữ trong ô này thành văn phong sư phạm chuẩn giáo dục"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                      <span>✨ Tinh lọc AI</span>
                    </button>
                  </div>
                </div>
                <textarea
                  name="content"
                  rows={5}
                  value={personalFormContent}
                  onChange={(e) => setPersonalFormContent(e.target.value)}
                  required
                  placeholder="Ghi chép diễn biến, nội dung chỉ đạo, triển khai nhiệm vụ... (Có thể bấm '🎙️ Ghi âm trực tiếp' để nói trực tiếp vào ô này)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-normal leading-relaxed focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nhiệm vụ / Trọng tâm phân công</label>
                <textarea
                  name="actionItems"
                  rows={2}
                  defaultValue={editingPersonal?.actionItems || ''}
                  placeholder="Các nhiệm vụ cần hoàn thành, thời hạn nộp..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal leading-relaxed focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ghi chú cá nhân</label>
                <input
                  type="text"
                  name="note"
                  defaultValue={editingPersonal?.note || ''}
                  placeholder="Ghi chú thêm cá nhân..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPersonalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20"
                >
                  Lưu Sổ Họp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: ADD/EDIT DEPARTMENT MEETING        */}
      {/* ========================================== */}
      {isDepartmentModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center overflow-hidden ${isDepartmentFullScreen ? 'p-0 sm:p-2' : 'p-2 sm:p-4'}`}>
          <div className={`bg-white shadow-2xl border border-indigo-200 w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDepartmentFullScreen 
              ? 'h-full sm:h-full sm:rounded-2xl' 
              : 'max-w-[98%] sm:max-w-6xl h-[92vh] rounded-3xl my-auto'
          }`}>
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-teal-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-xs shrink-0">
                  <ClipboardList className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-lg leading-tight">
                    {editingDepartment ? 'Chỉnh Sửa Biên Bản Họp Tổ Khối' : 'Soạn Thảo Biên Bản Họp Tổ Khối Mới'}
                  </h3>
                  <p className="text-[11px] text-indigo-100 font-medium hidden sm:block">Khung soạn thảo toàn màn hình rộng rãi, tối ưu việc nhập văn bản hành chính & sinh hoạt chuyên môn</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    toggleInlineListening(
                      'dept_reviewPastWork',
                      deptFormReviewPastWork,
                      setDeptFormReviewPastWork
                    )
                  }
                  className={`px-2.5 py-1.5 rounded-xl font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all ${
                    isInlineListening && inlineRecordingField === 'dept_reviewPastWork'
                      ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                      : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white'
                  }`}
                  title="Ghi âm trực tiếp vào khung nội dung cuộc họp"
                >
                  {isInlineListening && inlineRecordingField === 'dept_reviewPastWork' ? (
                    <>
                      <MicOff className="w-4 h-4 text-rose-200 animate-spin" />
                      <span>⏹️ Dừng ghi âm</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-rose-100" />
                      <span className="hidden sm:inline">🎙️ Ghi âm trực tiếp AI</span>
                      <span className="sm:hidden">🎙️ Mic</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDepartmentFullScreen(!isDepartmentFullScreen)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all border border-white/20"
                  title={isDepartmentFullScreen ? "Thu nhỏ cửa sổ" : "Phóng to toàn màn hình (Full khung)"}
                >
                  {isDepartmentFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span className="hidden md:inline">{isDepartmentFullScreen ? "Thu nhỏ" : "Full khung"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Chọn mẫu biên bản có sẵn"
                >
                  <Sparkles className="w-4 h-4 text-amber-900" />
                  <span className="hidden sm:inline">⚡ Chọn Mẫu Nhanh</span>
                  <span className="sm:hidden">⚡ Mẫu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDepartmentModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
                  title="Đóng cửa sổ"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveDepartment} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-black text-slate-800">Tên Biên Bản (*)</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingDepartment?.title || 'Biên bản họp Tổ chuyên môn Khối 3 - Tuần 8'}
                    required
                    placeholder="Ví dụ: Biên bản họp Tổ chuyên môn Khối 3 - Đánh giá công tác tuần 8 & Kế hoạch tuần 9"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Thuộc Tổ Khối</label>
                    <select
                      name="department"
                      defaultValue={editingDepartment?.department || 'Tổ Khối 1'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Thư mục lưu trữ</label>
                    <select
                      name="folderId"
                      defaultValue={
                        editingDepartment?.folderId ||
                        (selectedFolderId !== 'all' && selectedFolderId !== 'uncategorized' ? selectedFolderId : 'uncategorized')
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="uncategorized">📂 Mặc định (Chưa phân loại)</option>
                      {activeTabFolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Ngày họp (*)</label>
                    <input
                      type="date"
                      name="meetingDate"
                      defaultValue={editingDepartment?.meetingDate || today()}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Giờ bắt đầu</label>
                    <input
                      type="time"
                      name="timeStart"
                      defaultValue={editingDepartment?.timeStart || '14:00'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Giờ kết thúc</label>
                    <input
                      type="time"
                      name="timeEnd"
                      defaultValue={editingDepartment?.timeEnd || '16:00'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Chủ trì (Tổ trưởng)</label>
                    <input
                      type="text"
                      name="chairperson"
                      defaultValue={editingDepartment?.chairperson || currentUser?.name || ''}
                      required
                      placeholder="Họ và tên Tổ trưởng"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Thư ký họp</label>
                    <input
                      type="text"
                      name="secretary"
                      defaultValue={editingDepartment?.secretary || ''}
                      required
                      placeholder="Họ và tên Thư ký"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700">Tổng số thành viên</label>
                    <input
                      type="number"
                      name="totalMembers"
                      defaultValue={editingDepartment?.totalMembers || 6}
                      min={1}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700">Số có mặt</label>
                    <input
                      type="number"
                      name="presentMembers"
                      defaultValue={editingDepartment?.presentMembers || 6}
                      min={0}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700">Số vắng mặt (Lý do)</label>
                    <input
                      type="text"
                      name="absentMembers"
                      defaultValue={editingDepartment?.absentMembers || 'Không'}
                      placeholder="Ghi lý do vắng nếu có"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Mục đích cuộc họp</label>
                  <input
                    type="text"
                    name="purpose"
                    defaultValue={editingDepartment?.purpose || 'Đánh giá rút kinh nghiệm tuần qua và triển khai kế hoạch chuyên môn tuần tới'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Main Document Content Textareas */}
              <div className="space-y-4">
                <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <label className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block shrink-0" />
                      <span>I. NỘI DUNG SINH HOẠT</span>
                    </label>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() =>
                          toggleInlineListening(
                            'dept_reviewPastWork',
                            deptFormReviewPastWork,
                            setDeptFormReviewPastWork
                          )
                        }
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          isInlineListening && inlineRecordingField === 'dept_reviewPastWork'
                            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                        title="Bấm để Bắt đầu/Dừng ghi âm giọng nói trực tiếp vào phần I"
                      >
                        {isInlineListening && inlineRecordingField === 'dept_reviewPastWork' ? (
                          <>
                            <MicOff className="w-3.5 h-3.5 text-rose-200 animate-spin" />
                            <span>⏹️ Dừng ghi âm</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-rose-600" />
                            <span>🎙️ Ghi âm trực tiếp phần I</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInlineRefineAI(deptFormReviewPastWork, setDeptFormReviewPastWork)}
                        disabled={isRefiningVoice || !deptFormReviewPastWork.trim()}
                        className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                        title="Tinh lọc chữ trong phần I thành văn phong sư phạm chuẩn giáo dục"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>✨ Tinh lọc AI</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    name="reviewPastWork"
                    rows={5}
                    value={deptFormReviewPastWork}
                    onChange={(e) => setDeptFormReviewPastWork(e.target.value)}
                    placeholder="Nhập nội dung đánh giá công tác chuyên môn, ưu điểm, hạn chế... (Bấm '🎙️ Ghi âm trực tiếp phần I' để nói trực tiếp vào ô này)"
                    className="w-full p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                  />
                </div>

                <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <label className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block shrink-0" />
                      <span>II. SINH HOẠT CHUYÊN MÔN THEO HƯỚNG NGHIÊN CỨU BÀI HỌC</span>
                    </label>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() =>
                          toggleInlineListening(
                            'dept_upcomingPlan',
                            deptFormUpcomingPlan,
                            setDeptFormUpcomingPlan
                          )
                        }
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          isInlineListening && inlineRecordingField === 'dept_upcomingPlan'
                            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                        title="Bấm để Bắt đầu/Dừng ghi âm giọng nói trực tiếp vào phần II"
                      >
                        {isInlineListening && inlineRecordingField === 'dept_upcomingPlan' ? (
                          <>
                            <MicOff className="w-3.5 h-3.5 text-rose-200 animate-spin" />
                            <span>⏹️ Dừng ghi âm</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-rose-600" />
                            <span>🎙️ Ghi âm trực tiếp phần II</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInlineRefineAI(deptFormUpcomingPlan, setDeptFormUpcomingPlan)}
                        disabled={isRefiningVoice || !deptFormUpcomingPlan.trim()}
                        className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                        title="Tinh lọc chữ trong phần II thành văn phong sư phạm chuẩn giáo dục"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>✨ Tinh lọc AI</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    name="upcomingPlan"
                    rows={8}
                    value={deptFormUpcomingPlan}
                    onChange={(e) => setDeptFormUpcomingPlan(e.target.value)}
                    placeholder="Nhập chi tiết các bước nghiên cứu bài học... (Bấm '🎙️ Ghi âm trực tiếp phần II' để nói trực tiếp vào ô này)"
                    className="w-full p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                  />
                </div>

                <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <label className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block shrink-0" />
                      <span>III. KẾT LUẬN CHUNG VÀ PHÂN CÔNG THỰC HIỆN</span>
                    </label>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() =>
                          toggleInlineListening(
                            'dept_discussions',
                            deptFormDiscussions,
                            setDeptFormDiscussions
                          )
                        }
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          isInlineListening && inlineRecordingField === 'dept_discussions'
                            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                        title="Bấm để Bắt đầu/Dừng ghi âm giọng nói trực tiếp vào phần III"
                      >
                        {isInlineListening && inlineRecordingField === 'dept_discussions' ? (
                          <>
                            <MicOff className="w-3.5 h-3.5 text-rose-200 animate-spin" />
                            <span>⏹️ Dừng ghi âm</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-rose-600" />
                            <span>🎙️ Ghi âm trực tiếp phần III</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInlineRefineAI(deptFormDiscussions, setDeptFormDiscussions)}
                        disabled={isRefiningVoice || !deptFormDiscussions.trim()}
                        className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                        title="Tinh lọc chữ trong phần III thành văn phong sư phạm chuẩn giáo dục"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>✨ Tinh lọc AI</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    name="discussions"
                    rows={5}
                    value={deptFormDiscussions}
                    onChange={(e) => setDeptFormDiscussions(e.target.value)}
                    placeholder="Nhập kết luận chung & phân công nhiệm vụ... (Bấm '🎙️ Ghi âm trực tiếp phần III' để nói trực tiếp vào ô này)"
                    className="w-full p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                  />
                </div>

                <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <label className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block shrink-0" />
                      <span>IV. KẾT THÚC</span>
                    </label>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() =>
                          toggleInlineListening(
                            'dept_resolutions',
                            deptFormResolutions,
                            setDeptFormResolutions
                          )
                        }
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          isInlineListening && inlineRecordingField === 'dept_resolutions'
                            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                        title="Bấm để Bắt đầu/Dừng ghi âm giọng nói trực tiếp vào phần IV"
                      >
                        {isInlineListening && inlineRecordingField === 'dept_resolutions' ? (
                          <>
                            <MicOff className="w-3.5 h-3.5 text-rose-200 animate-spin" />
                            <span>⏹️ Dừng ghi âm</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-rose-600" />
                            <span>🎙️ Ghi âm trực tiếp phần IV</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInlineRefineAI(deptFormResolutions, setDeptFormResolutions)}
                        disabled={isRefiningVoice || !deptFormResolutions.trim()}
                        className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                        title="Tinh lọc chữ trong phần IV thành văn phong sư phạm chuẩn giáo dục"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>✨ Tinh lọc AI</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    name="resolutions"
                    rows={3}
                    value={deptFormResolutions}
                    onChange={(e) => setDeptFormResolutions(e.target.value)}
                    placeholder="Thời gian kết thúc cuộc họp & ghi chú... (Bấm '🎙️ Ghi âm trực tiếp phần IV' để nói trực tiếp vào ô này)"
                    className="w-full p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  💡 Khung soạn thảo rộng rãi giúp Thầy/Cô nhìn toàn cảnh và nhập nội dung biên bản dài một cách dễ dàng.
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsDepartmentModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/25 cursor-pointer transition-all"
                  >
                    Lưu Biên Bản
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: VIEW PERSONAL MEETING DETAIL       */}
      {/* ========================================== */}
      {viewingPersonal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-teal-200 w-full max-w-2xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-teal-700 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Chi Tiết Sổ Họp Cá Nhân</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingPersonal(null)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  {viewingPersonal.category}
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">{viewingPersonal.title}</h2>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>{viewingPersonal.meetingDate}</span>
                  </span>
                  {viewingPersonal.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      <span>{viewingPersonal.location}</span>
                    </span>
                  )}
                  {viewingPersonal.chairperson && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      <span>Chủ trì: {viewingPersonal.chairperson}</span>
                    </span>
                  )}
                </div>
              </div>

              {viewingPersonal.attendees && (
                <div className="text-xs text-slate-700 font-medium">
                  <strong>Thành phần tham dự:</strong> {viewingPersonal.attendees}
                </div>
              )}

              <div className="space-y-1">
                <strong className="text-xs uppercase tracking-wider text-teal-800 font-black block">
                  Nội dung cuộc họp:
                </strong>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-normal">
                  {viewingPersonal.content}
                </div>
              </div>

              {viewingPersonal.actionItems && (
                <div className="space-y-1">
                  <strong className="text-xs uppercase tracking-wider text-amber-800 font-black block">
                    📌 Nhiệm vụ & Trọng tâm:
                  </strong>
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs leading-relaxed text-amber-950 whitespace-pre-wrap font-medium">
                    {viewingPersonal.actionItems}
                  </div>
                </div>
              )}

              {viewingPersonal.note && (
                <div className="text-xs text-slate-500 italic">
                  <strong>Ghi chú:</strong> {viewingPersonal.note}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCopyToClipboard(
                    `${viewingPersonal.title}\nNgày: ${viewingPersonal.meetingDate}\nNội dung:\n${viewingPersonal.content}`,
                    viewingPersonal.id
                  )
                }
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                {copiedId === viewingPersonal.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === viewingPersonal.id ? 'Đã sao chép!' : 'Sao chép nội dung'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportPersonalWord(viewingPersonal)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-800 hover:to-teal-700 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Xuất file Word (.doc) đúng thể thức văn bản hành chính"
                >
                  <Download className="w-4 h-4" />
                  <span>📄 Xuất file Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPersonal(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 4: VIEW DEPARTMENT MEETING DETAIL     */}
      {/* ========================================== */}
      {viewingDepartment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-indigo-200 w-full max-w-3xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-teal-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Toàn Văn Biên Bản Họp Tổ Khối</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingDepartment(null)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 font-serif">
              {/* Standard Header for Vietnamese School Meeting Minutes */}
              <div className="text-center space-y-1 font-sans border-b border-slate-200 pb-4">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <div>
                    TRƯỜNG TIỂU HỌC THẠNH YÊN 1<br />
                    <strong className="text-indigo-900">{viewingDepartment.department.toUpperCase()}</strong>
                  </div>
                  <div className="text-center">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br />
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                </div>

                <div className="pt-3">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                    {viewingDepartment.title}
                  </h2>
                  <p className="text-xs text-slate-600 italic">
                    Thời gian: {viewingDepartment.timeStart || '14:00'} đến {viewingDepartment.timeEnd || '16:00'} ngày {viewingDepartment.meetingDate}
                  </p>
                </div>
              </div>

              {/* Members & Location */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs font-sans space-y-1.5 leading-relaxed">
                <div><strong>1. Địa điểm:</strong> {viewingDepartment.location || 'Phòng họp chuyên môn'}</div>
                <div><strong>2. Chủ trì:</strong> {viewingDepartment.chairperson} (Tổ trưởng)</div>
                <div><strong>3. Thư ký:</strong> {viewingDepartment.secretary}</div>
                <div>
                  <strong>4. Thành phần tham dự:</strong> Tổng số: {viewingDepartment.totalMembers || 6} | Có mặt: {viewingDepartment.presentMembers || 6} | Vắng: {viewingDepartment.absentMembers || 'Không'}
                </div>
                {viewingDepartment.purpose && (
                  <div><strong>5. Mục đích cuộc họp:</strong> {viewingDepartment.purpose}</div>
                )}
              </div>

              {/* Sections */}
              <div className="space-y-3 font-sans text-xs leading-relaxed text-slate-800">
                {viewingDepartment.reviewPastWork && (
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-indigo-900 uppercase">
                      I. ĐÁNH GIÁ CÔNG TÁC TUẦN/THÁNG QUA
                    </h4>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 whitespace-pre-wrap">
                      {viewingDepartment.reviewPastWork}
                    </div>
                  </div>
                )}

                {viewingDepartment.upcomingPlan && (
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-indigo-900 uppercase">
                      II. TRIỂN KHAI KẾ HOẠCH TUẦN/THÁNG TỚI
                    </h4>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 whitespace-pre-wrap">
                      {viewingDepartment.upcomingPlan}
                    </div>
                  </div>
                )}

                {viewingDepartment.discussions && (
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-indigo-900 uppercase">
                      III. Ý KIẾN THẢO LUẬN CỦA CÁC THÀNH VIÊN
                    </h4>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 whitespace-pre-wrap">
                      {viewingDepartment.discussions}
                    </div>
                  </div>
                )}

                {viewingDepartment.resolutions && (
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-indigo-900 uppercase">
                      IV. KẾT LUẬN & QUYẾT NGHỊ
                    </h4>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-medium whitespace-pre-wrap">
                      {viewingDepartment.resolutions}
                    </div>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 text-center pt-6 text-xs font-sans">
                <div>
                  <strong className="block">THƯ KÝ</strong>
                  <span className="text-slate-400 text-[10px] italic">(Ký và ghi rõ họ tên)</span>
                  <div className="h-16" />
                  <p className="font-extrabold text-slate-800">{viewingDepartment.secretary}</p>
                </div>
                <div>
                  <strong className="block">CHỦ TRÌ / TỔ TRƯỞNG</strong>
                  <span className="text-slate-400 text-[10px] italic">(Ký và ghi rõ họ tên)</span>
                  <div className="h-16" />
                  <p className="font-extrabold text-slate-800">{viewingDepartment.chairperson}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Biên Bản</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportDepartmentWord(viewingDepartment)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-800 hover:to-indigo-700 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Xuất biên bản họp sang file Word (.doc) đúng chuẩn hành chính"
                >
                  <Download className="w-4 h-4" />
                  <span>📄 Xuất Biên Bản Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDepartment(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: SPEECH-TO-TEXT & AI REFINEMENT       */}
      {/* ========================================== */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-rose-700 via-pink-700 to-purple-800 text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs shrink-0 animate-pulse">
                  <Mic className="w-5 h-5 text-rose-200" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg leading-tight flex items-center gap-2">
                    <span>Chuyển Giọng Nói Thành Văn Bản Biên Bản Họp AI</span>
                    <span className="text-[10px] bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                      Chuẩn Đạo Đức Ngành GD
                    </span>
                  </h3>
                  <p className="text-[11px] text-rose-100 font-medium hidden sm:block">
                    Ghi âm trực tiếp cuộc họp hoặc dán văn bản thô — AI tự động lọc bớt ý lan man, tổng hợp nội dung cốt lõi theo văn phong sư phạm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isListening) toggleListening();
                  setIsVoiceModalOpen(false);
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
                title="Đóng cửa sổ"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/50">
              {/* Voice Control & Status Panel */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/80 to-pink-50/80 p-3.5 rounded-2xl border border-rose-100">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`px-5 py-2.5 rounded-2xl font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                        isListening
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-4 ring-rose-300'
                          : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 text-rose-200 animate-spin" />
                          <span>🔴 Đang Ghi Âm... (Bấm để Dừng)</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>🎙️ Bắt Đầu Ghi Âm Giọng Nói</span>
                        </>
                      )}
                    </button>

                    {isListening && (
                      <span className="flex items-center gap-1.5 text-xs font-black text-rose-700 animate-pulse">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                        <span>Trình duyệt đang lắng nghe tiếng Việt (vi-VN)...</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleRefineVoiceWithAI}
                    disabled={isRefiningVoice || !voiceTranscript.trim()}
                    className={`px-5 py-2.5 rounded-2xl font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                      isRefiningVoice || !voiceTranscript.trim()
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-purple-700 via-indigo-700 to-teal-700 hover:from-purple-800 hover:to-teal-800 text-white shadow-indigo-500/25'
                    }`}
                  >
                    {isRefiningVoice ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Gemini AI Đang Tinh Lọc Đạo Đức & Sư Phạm...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 text-purple-200" />
                        <span>✨ Tinh Lọc AI Chuẩn Giáo Dục</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Raw Transcript Area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-rose-600" />
                      <span>Nội Dung Lời Nói / Văn Bản Cuộc Họp Thô:</span>
                    </label>
                    {voiceTranscript && (
                      <button
                        type="button"
                        onClick={() => setVoiceTranscript('')}
                        className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Xóa văn bản thô</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    value={voiceTranscript}
                    onChange={(e) => setVoiceTranscript(e.target.value)}
                    rows={5}
                    placeholder="Nói trực tiếp qua Micro hoặc dán đoạn ghi âm cuộc họp vào đây... (Ví dụ: Thưa các đồng chí, hôm nay tổ ta họp đánh giá tuần 8 và triển khai nghiên cứu bài học tiết Tin học lớp 3. Tuần qua 100% giáo viên dạy đúng phân môn. Bạn An vắng có lý do...)"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <p className="text-[11px] text-slate-500 font-medium italic">
                    💡 Mẹo: Thầy/Cô có thể nói tự do hoặc nói ngắt quãng. Bấm nút <b>"✨ Tinh Lọc AI Chuẩn Giáo Dục"</b>, hệ thống Gemini AI sẽ tự động loại bỏ câu nói đùa, lời lan man và chuẩn hóa toàn bộ thành ngôn từ chuẩn mực sư phạm!
                  </p>
                </div>
              </div>

              {/* AI Refined Output Preview Section */}
              {isRefiningVoice && (
                <div className="p-8 bg-white rounded-2xl border border-purple-200 shadow-xs text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                  <p className="font-extrabold text-sm text-purple-900">
                    Gemini AI đang phân tích lời nói, lọc bỏ nội dung lan man và tổng hợp thành Biên bản chuẩn mực sư phạm...
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Đang rà soát từ ngữ đảm bảo tính khách quan, tinh thần đoàn kết và chuẩn mực văn phong ngành Giáo dục.
                  </p>
                </div>
              )}

              {refinedVoiceResult && (
                <div className="bg-white p-5 rounded-2xl border-2 border-emerald-400 shadow-md space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="font-black text-slate-900 text-sm sm:text-base">
                        KẾT QUẢ TINH LỌC BIÊN BẢN CHUẨN MỰC GIÁO DỤC (AI)
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      ✓ Đã lọc bỏ lan man & chuẩn hóa văn phong
                    </span>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    {refinedVoiceResult.title && (
                      <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
                        <strong className="text-indigo-900 font-extrabold block text-xs">TÊN CUỘC HỌP TRANG TRỌNG:</strong>
                        <p className="font-black text-indigo-950 mt-0.5">{refinedVoiceResult.title}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {refinedVoiceResult.reviewPastWork && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <strong className="text-slate-900 font-black text-xs block text-teal-800">I. NỘI DUNG SINH HOẠT / ĐÁNH GIÁ:</strong>
                          <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{refinedVoiceResult.reviewPastWork}</p>
                        </div>
                      )}

                      {refinedVoiceResult.upcomingPlan && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <strong className="text-slate-900 font-black text-xs block text-indigo-800">II. SINH HOẠT CHUYÊN MÔN (NGHIÊN CỨU BÀI HỌC):</strong>
                          <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{refinedVoiceResult.upcomingPlan}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {refinedVoiceResult.discussions && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <strong className="text-slate-900 font-black text-xs block text-amber-800">III. KẾT LUẬN & PHÂN CÔNG:</strong>
                          <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{refinedVoiceResult.discussions}</p>
                        </div>
                      )}

                      {refinedVoiceResult.resolutions && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <strong className="text-slate-900 font-black text-xs block text-emerald-800">IV. NGHỊ QUYẾT & KẾT THÚC:</strong>
                          <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{refinedVoiceResult.resolutions}</p>
                        </div>
                      )}
                    </div>

                    {refinedVoiceResult.actionItems && (
                      <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1">
                        <strong className="text-amber-900 font-black text-xs block">TRỌNG TÂM NHIỆM VỤ PHÂN CÔNG GIÁO VIÊN:</strong>
                        <p className="text-amber-950 font-medium leading-relaxed whitespace-pre-wrap">{refinedVoiceResult.actionItems}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions to Insert to Modal */}
                  <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleApplyToPersonalModal}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>📘 Đưa vào Sổ họp Cá nhân</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyToDepartmentModal}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>📋 Đưa vào Biên bản Họp Tổ khối Mới</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                💡 Công nghệ nhận diện tiếng Việt & tinh lọc Gemini AI giúp chuyển đổi lời nói cuộc họp nhanh chóng, chính xác.
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isListening) toggleListening();
                  setIsVoiceModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer ml-auto"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: QUICK MEETING TEMPLATES             */}
      {/* ========================================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 w-full max-w-3xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-amber-600 via-orange-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-base">Mẫu Biên Bản & Sổ Họp Nhanh Chuẩn Ngành</h3>
                  <p className="text-[11px] text-amber-100 font-medium">Chọn mẫu để tự động điền cấu trúc chuẩn, tiết kiệm thời gian nhập liệu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
              {/* Category Filter Pills for Templates */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTemplateFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    templateFilter === 'all'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tất cả các mẫu ({QUICK_TEMPLATES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateFilter('department')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    templateFilter === 'department'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Biên bản Họp Tổ Khối ({QUICK_TEMPLATES.filter((t) => t.type === 'department').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateFilter('personal')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    templateFilter === 'personal'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Sổ họp Cá nhân ({QUICK_TEMPLATES.filter((t) => t.type === 'personal').length})
                </button>
              </div>

              {/* Template Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {QUICK_TEMPLATES.filter((tmpl) => templateFilter === 'all' || tmpl.type === templateFilter).map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                          tmpl.type === 'department'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}>
                          {tmpl.type === 'department' ? 'Biên bản Tổ khối' : 'Sổ họp Cá nhân'}
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {tmpl.categoryOrDept}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug group-hover:text-amber-600 transition-colors">
                        {tmpl.title}
                      </h4>

                      <p className="text-xs text-slate-600 font-normal leading-relaxed line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {tmpl.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate(tmpl)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sử dụng mẫu này</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 font-medium">💡 Thầy/Cô có thể chỉnh sửa mọi thông tin sau khi chọn mẫu.</span>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 5: MOVE ITEM / FOLDER TO DESTINATION */}
      {/* ========================================== */}
      {movingTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-teal-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-teal-700 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Move className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Di Chuyển Về Thư Mục Khác</h3>
              </div>
              <button
                type="button"
                onClick={() => setMovingTarget(null)}
                className="p-1 text-white/80 hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Tên đối tượng di chuyển:</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  {movingTarget.type === 'folder' ? '📁' : '📄'} {movingTarget.title}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Chọn thư mục đích (*)</label>
                <select
                  id="destinationFolderSelect"
                  defaultValue={movingTarget.currentFolderId || 'root'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  <option value="root">📁 Thư mục gốc (Root không gian làm việc)</option>
                  {activeTabFolders
                    .filter((f) => f.id !== movingTarget.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovingTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const select = document.getElementById('destinationFolderSelect') as HTMLSelectElement;
                    if (select) {
                      handleConfirmMove(select.value);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  Xác nhận Di chuyển
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
