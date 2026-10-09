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
  LayoutGrid
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

  const meetingFolders = state.meetingFolders || [];
  const activeTabFolders = meetingFolders.filter((f) => f.type === activeTab);

  React.useEffect(() => {
    setSelectedFolderId('all');
  }, [activeTab]);

  // Personal Meeting Modal state
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<PersonalMeetingItem | null>(null);

  // Department Meeting Modal state
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentMeetingItem | null>(null);

  // Detail View Modal
  const [viewingPersonal, setViewingPersonal] = useState<PersonalMeetingItem | null>(null);
  const [viewingDepartment, setViewingDepartment] = useState<DepartmentMeetingItem | null>(null);

  // Copied toast state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Summary State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummaryResult, setAiSummaryResult] = useState<string | null>(null);

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

    const newFolder: MeetingFolder = {
      id: editingFolder ? editingFolder.id : uid('mf'),
      name,
      description,
      color,
      type: activeTab,
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
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            title="Tải mẫu biên bản nhanh chuẩn cấu trúc ngành giáo dục"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            <span>⚡ Mẫu Biên Bản Nhanh</span>
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

      {/* Sub-Folders Filter Bar */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-2 sm:px-3 shadow-2xs flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5 text-teal-600" />
            <span>Thư mục:</span>
          </span>

          {/* All Folder Pill */}
          <button
            type="button"
            onClick={() => setSelectedFolderId('all')}
            className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedFolderId === 'all'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                selectedFolderId === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activeTab === 'personal' ? personalMeetings.length : departmentMeetings.length}
            </span>
          </button>

          {/* Custom Folders Pills */}
          {activeTabFolders.map((f) => {
            const count =
              activeTab === 'personal'
                ? personalMeetings.filter((pm) => pm.folderId === f.id).length
                : departmentMeetings.filter((dm) => dm.folderId === f.id).length;
            const isSelected = selectedFolderId === f.id;

            return (
              <div
                key={f.id}
                className={`group flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-r from-teal-700 to-teal-600 text-white border-teal-700 shadow-2xs'
                    : 'bg-white hover:bg-teal-50/80 text-slate-700 border-slate-200/90'
                }`}
                onClick={() => setSelectedFolderId(f.id)}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: f.color || '#0d9488' }}
                />
                <span className="truncate max-w-[140px]">{f.name}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>

                {/* Edit / Delete Folder triggers on hover */}
                <div className="hidden group-hover:flex items-center gap-0.5 ml-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(f);
                      setIsFolderModalOpen(true);
                    }}
                    className="p-0.5 rounded text-slate-400 hover:text-teal-600"
                    title="Sửa tên thư mục"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(f.id, f.name);
                    }}
                    className="p-0.5 rounded text-slate-400 hover:text-rose-600"
                    title="Xóa thư mục"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Uncategorized Pill */}
          <button
            type="button"
            onClick={() => setSelectedFolderId('uncategorized')}
            className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedFolderId === 'uncategorized'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
            }`}
          >
            <span>Chưa phân loại</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                selectedFolderId === 'uncategorized'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activeTab === 'personal'
                ? personalMeetings.filter((pm) => !pm.folderId || pm.folderId === 'uncategorized').length
                : departmentMeetings.filter((dm) => !dm.folderId || dm.folderId === 'uncategorized').length}
            </span>
          </button>
        </div>

        {/* Add Folder Button */}
        <button
          type="button"
          onClick={() => {
            setEditingFolder(null);
            setIsFolderModalOpen(true);
          }}
          className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100/90 text-teal-800 font-extrabold text-xs border border-teal-200/80 flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
          title="Tạo thư mục mới"
        >
          <FolderPlus className="w-3.5 h-3.5 text-teal-600" />
          <span className="hidden sm:inline">Tạo thư mục</span>
        </button>
      </div>

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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-teal-200 w-full max-w-2xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-teal-700 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-extrabold text-base">
                  {editingPersonal ? 'Chỉnh Sửa Sổ Họp Cá Nhân' : 'Thêm Mới Sổ Họp Cá Nhân'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-extrabold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                  title="Chọn mẫu biên bản có sẵn"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Mẫu nhanh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPersonalModalOpen(false)}
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
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

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nội dung cuộc họp (*)</label>
                <textarea
                  name="content"
                  rows={5}
                  defaultValue={editingPersonal?.content || ''}
                  required
                  placeholder="Ghi chép diễn biến, nội dung chỉ đạo, triển khai nhiệm vụ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal leading-relaxed focus:outline-none focus:border-teal-500"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-indigo-200 w-full max-w-3xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-teal-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                <h3 className="font-extrabold text-base">
                  {editingDepartment ? 'Chỉnh Sửa Biên Bản Tổ Khối' : 'Tạo Biên Bản Họp Tổ Khối Mới'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-extrabold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                  title="Chọn mẫu biên bản có sẵn"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Mẫu nhanh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDepartmentModalOpen(false)}
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveDepartment} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tên Biên Bản (*)</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingDepartment?.title || 'Biên bản họp Tổ chuyên môn Khối 3 - Tuần 8'}
                  required
                  placeholder="Ví dụ: Biên bản họp Tổ chuyên môn Khối 3 - Đánh giá công tác tuần 8 & Kế hoạch tuần 9"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Thuộc Tổ Khối</label>
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
                  <label className="text-xs font-bold text-slate-700">Thư mục lưu trữ</label>
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
                  <label className="text-xs font-bold text-slate-700">Ngày họp (*)</label>
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
                  <label className="text-xs font-bold text-slate-700">Giờ bắt đầu</label>
                  <input
                    type="time"
                    name="timeStart"
                    defaultValue={editingDepartment?.timeStart || '14:00'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Giờ kết thúc</label>
                  <input
                    type="time"
                    name="timeEnd"
                    defaultValue={editingDepartment?.timeEnd || '16:00'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Chủ trì (Tổ trưởng)</label>
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
                  <label className="text-xs font-bold text-slate-700">Thư ký họp</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Tổng số thành viên</label>
                  <input
                    type="number"
                    name="totalMembers"
                    defaultValue={editingDepartment?.totalMembers || 6}
                    min={1}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Số có mặt</label>
                  <input
                    type="number"
                    name="presentMembers"
                    defaultValue={editingDepartment?.presentMembers || 6}
                    min={0}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Số vắng mặt (Lý do)</label>
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
                <label className="text-xs font-bold text-slate-700">Mục đích cuộc họp</label>
                <input
                  type="text"
                  name="purpose"
                  defaultValue={editingDepartment?.purpose || 'Đánh giá rút kinh nghiệm tuần qua và triển khai kế hoạch chuyên môn tuần tới'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">I. Đánh giá công tác tuần/tháng qua</label>
                <textarea
                  name="reviewPastWork"
                  rows={3}
                  defaultValue={editingDepartment?.reviewPastWork || '1. Thực hiện chương trình: 100% giáo viên dạy đúng PPCT.\n2. Ưu điểm: Áp dụng hiệu quả đồ dùng dạy học và phần mềm tương tác.\n3. Tồn tại: Một số em học sinh viết chữ còn chưa đều.'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">II. Triển khai kế hoạch tuần/tháng tới</label>
                <textarea
                  name="upcomingPlan"
                  rows={3}
                  defaultValue={editingDepartment?.upcomingPlan || '1. Giảng dạy đúng tiến độ chương trình.\n2. Thống nhất ma trận và nội dung ôn tập kiểm tra.\n3. Tăng cường sinh hoạt chuyên môn theo nghiên cứu bài học.'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">III. Ý kiến thảo luận của các thành viên</label>
                <textarea
                  name="discussions"
                  rows={2}
                  defaultValue={editingDepartment?.discussions || ''}
                  placeholder="Ghi tóm tắt ý kiến đóng góp của các giáo viên trong tổ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">IV. Kết luận & Quyết nghị của Tổ khối</label>
                <textarea
                  name="resolutions"
                  rows={2}
                  defaultValue={editingDepartment?.resolutions || '100% các thành viên trong tổ nhất trí với các nội dung trên.'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepartmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20"
                >
                  Lưu Biên Bản
                </button>
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
    </div>
  );
};
