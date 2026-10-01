import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  X,
  Info,
  Layers,
  Sun,
  Sunset,
  Settings,
  GraduationCap,
  Sparkles,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TimetableSlot } from '../types';
import { getDayOfWeekName } from '../utils/dateUtils';
import { getSubSubjectsByGradeAndSubject } from '../utils/curriculum';

export interface ConfiguredClass {
  id: string;
  name: string;
  grade: number;
}

const DEFAULT_CONFIGURED_CLASSES: ConfiguredClass[] = [
  { id: 'c-3a1', name: '3A1', grade: 3 },
  { id: 'c-3a2', name: '3A2', grade: 3 },
  { id: 'c-4a1', name: '4A1', grade: 4 },
  { id: 'c-4a2', name: '4A2', grade: 4 },
  { id: 'c-5a1', name: '5A1', grade: 5 },
  { id: 'c-5a2', name: '5A2', grade: 5 },
  { id: 'c-cc', name: 'Chào cờ', grade: 0 },
  { id: 'c-shl', name: 'Sinh hoạt lớp', grade: 0 }
];

// Danh mục môn học thống nhất cho toàn bộ các cấp học phổ thông (Tiểu học, THCS, THPT)
// Không chia tách rời rạc các cấp, sắp xếp khoa học theo lĩnh vực giáo dục phổ thông chuẩn Bộ GD&ĐT
const GENERAL_EDUCATION_SUBJECT_GROUPS = [
  {
    group: 'Toán & Công nghệ thông tin',
    subjects: [
      'Tin học',
      'Công nghệ',
      'Tin học và Công nghệ',
      'Toán',
      'Giáo dục STEM'
    ]
  },
  {
    group: 'Ngữ văn & Ngoại ngữ',
    subjects: [
      'Ngữ văn',
      'Tiếng Việt',
      'Tiếng Anh',
      'Ngoại ngữ'
    ]
  },
  {
    group: 'Khoa học tự nhiên',
    subjects: [
      'Khoa học tự nhiên',
      'Vật lí',
      'Hóa học',
      'Sinh học',
      'Khoa học',
      'Tự nhiên và Xã hội'
    ]
  },
  {
    group: 'Khoa học xã hội & Công dân',
    subjects: [
      'Lịch sử và Địa lí',
      'Lịch sử',
      'Địa lí',
      'Giáo dục công dân',
      'Đạo đức',
      'Giáo dục Kinh tế và Pháp luật'
    ]
  },
  {
    group: 'Nghệ thuật, Thể chất & Quốc phòng',
    subjects: [
      'Âm nhạc',
      'Mĩ thuật',
      'Nghệ thuật',
      'Giáo dục thể chất',
      'Giáo dục quốc phòng và an ninh'
    ]
  },
  {
    group: 'Hoạt động trải nghiệm & Giáo dục tập thể',
    subjects: [
      'Chào cờ',
      'Sinh hoạt lớp',
      'Hoạt động trải nghiệm',
      'Hoạt động trải nghiệm, hướng nghiệp',
      'Nội dung giáo dục địa phương',
      'Kĩ năng sống'
    ]
  },
  {
    group: 'Tự chọn & Bổ trợ',
    subjects: [
      'Tự học có hướng dẫn',
      'Tăng cường',
      'Ôn tập',
      'Chuyên đề học tập'
    ]
  }
];

const ALL_COMMON_SUBJECTS = GENERAL_EDUCATION_SUBJECT_GROUPS.flatMap((g) => g.subjects);

interface TkbManagerProps {
  timetable: TimetableSlot[];
  onUpdateTimetable: (slots: TimetableSlot[]) => void;
  onResetTimetable: () => void;
  configuredClasses?: ConfiguredClass[];
  onUpdateConfiguredClasses?: (classes: ConfiguredClass[]) => void;
  teacherType?: 'GVCN' | 'GVBM';
  activeClassName?: string;
}

export const TkbManager: React.FC<TkbManagerProps> = ({
  timetable,
  onUpdateTimetable,
  onResetTimetable,
  configuredClasses: propConfiguredClasses,
  onUpdateConfiguredClasses,
  teacherType = 'GVCN',
  activeClassName = '3A1'
}) => {
  const isGvcn = teacherType === 'GVCN';
  const days = [2, 3, 4, 5, 6, 7]; // Thứ Hai -> Thứ Bảy
  const periods = [1, 2, 3, 4, 5]; // Tiết 1 -> 5

  // Mặc định hiển thị toàn bộ sáng & chiều cùng lúc theo yêu cầu người dùng
  const [viewMode, setViewMode] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [selectedSlot, setSelectedSlot] = useState<{
    day: number;
    session: 'morning' | 'afternoon';
    period: number;
  } | null>(null);

  // Configured classes state for teacher
  const [localConfiguredClasses, setLocalConfiguredClasses] = useState<ConfiguredClass[]>(() => {
    try {
      const saved = localStorage.getItem('khdh_configured_classes_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading configured classes:', e);
    }
    return DEFAULT_CONFIGURED_CLASSES;
  });

  const configuredClasses = propConfiguredClasses || localConfiguredClasses;
  const setConfiguredClasses = (newClasses: ConfiguredClass[]) => {
    if (onUpdateConfiguredClasses) {
      onUpdateConfiguredClasses(newClasses);
    } else {
      setLocalConfiguredClasses(newClasses);
    }
  };

  const [showClassConfigModal, setShowClassConfigModal] = useState<boolean>(false);
  const [isCustomClass, setIsCustomClass] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassGrade, setNewClassGrade] = useState<number>(3);

  useEffect(() => {
    try {
      localStorage.setItem('khdh_configured_classes_v1', JSON.stringify(configuredClasses));
    } catch {}
  }, [configuredClasses]);

  // Group configured classes by Grade for nice optgroup rendering
  const groupedClasses = useMemo(() => {
    const groups: { label: string; classes: ConfiguredClass[] }[] = [];
    const sorted = [...configuredClasses].sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.name.localeCompare(b.name, 'vi', { numeric: true });
    });

    const map = new Map<number, ConfiguredClass[]>();
    sorted.forEach((c) => {
      if (!map.has(c.grade)) map.set(c.grade, []);
      map.get(c.grade)!.push(c);
    });

    for (let g = 1; g <= 12; g++) {
      if (map.has(g)) {
        groups.push({
          label: `Khối ${g}`,
          classes: map.get(g)!
        });
      }
    }

    if (map.has(0)) {
      groups.push({
        label: 'Hoạt động giáo dục tập thể',
        classes: map.get(0)!
      });
    }

    return groups;
  }, [configuredClasses]);

  // Form input state
  const [inputClass, setInputClass] = useState<string>('3A1');
  const [inputSubject, setInputSubject] = useState<string>('Tiếng Việt');
  const [inputSubSubject, setInputSubSubject] = useState<string>('Đọc (Tập đọc)');
  const [isCustomSubject, setIsCustomSubject] = useState<boolean>(false);
  const [inputGrade, setInputGrade] = useState<number>(3);

  // Compute available sub-subjects dynamically based on Grade & Subject
  const availableSubSubjects = useMemo(() => {
    return getSubSubjectsByGradeAndSubject(inputGrade, inputSubject);
  }, [inputGrade, inputSubject]);

  const getSlot = (day: number, session: 'morning' | 'afternoon', period: number) => {
    return timetable.find(
      (s) => s.dayOfWeek === day && s.session === session && s.period === period
    );
  };

  const handleCellClick = (day: number, session: 'morning' | 'afternoon', period: number) => {
    const existing = getSlot(day, session, period);
    setSelectedSlot({ day, session, period });
    if (existing) {
      setInputClass(existing.className);
      setInputSubject(existing.subject);
      setInputSubSubject(existing.subSubject || '');
      setInputGrade(Number(existing.grade) || (isGvcn ? Number(activeClassName.match(/\d+/)?.[0]) || 3 : 3));
      setIsCustomSubject(!ALL_COMMON_SUBJECTS.includes(existing.subject));
      setIsCustomClass(!configuredClasses.some((c) => c.name === existing.className));
    } else {
      const defaultCls = isGvcn ? activeClassName || '3A1' : (configuredClasses[0]?.name || '3A1');
      const gradeMatch = defaultCls.match(/^(1[0-2]|[1-9])/);
      const defaultGrd = gradeMatch ? Number(gradeMatch[1]) : (configuredClasses[0]?.grade || 3);
      const defaultSj = isGvcn ? 'Tiếng Việt' : 'Tin học';
      const subs = getSubSubjectsByGradeAndSubject(defaultGrd, defaultSj);
      setInputClass(defaultCls);
      setInputSubject(defaultSj);
      setInputSubSubject(subs[0] || '');
      setInputGrade(defaultGrd);
      setIsCustomSubject(false);
      setIsCustomClass(false);
    }
  };

  const handleSelectClass = (className: string) => {
    if (className === 'custom') {
      setIsCustomClass(true);
      return;
    }
    setIsCustomClass(false);
    setInputClass(className);

    const found = configuredClasses.find((c) => c.name === className);
    if (found) {
      setInputGrade(found.grade);
      if (className === 'Chào cờ') {
        setInputSubject('Chào cờ');
      } else if (className === 'Sinh hoạt lớp') {
        setInputSubject('Sinh hoạt lớp');
      }
    } else {
      const match = className.trim().match(/^(1[0-2]|[1-9])/);
      if (match) {
        setInputGrade(Number(match[1]));
      }
    }
  };

  const handleClassChange = (className: string) => {
    setInputClass(className);
    const match = className.trim().match(/^(1[0-2]|[1-9])/);
    if (match) {
      setInputGrade(Number(match[1]));
    }
  };

  const handleNewClassNameChange = (val: string) => {
    setNewClassName(val);
    const match = val.trim().match(/^(1[0-2]|[1-9])/);
    if (match) {
      setNewClassGrade(Number(match[1]));
    }
  };

  const handleAddConfiguredClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    if (configuredClasses.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Lớp "${trimmed}" đã có trong danh sách cấu hình!`);
      return;
    }
    const newCls: ConfiguredClass = {
      id: `cls-${Date.now()}`,
      name: trimmed,
      grade: newClassGrade
    };
    setConfiguredClasses([...configuredClasses, newCls]);
    setNewClassName('');
  };

  const handleDeleteConfiguredClass = (id: string) => {
    if (configuredClasses.length <= 1) {
      alert('Thầy/cô nên giữ lại ít nhất 1 lớp trong danh sách.');
      return;
    }
    setConfiguredClasses(configuredClasses.filter((c) => c.id !== id));
  };

  const handleLoadClassPreset = (presetType: 'primary' | 'secondary' | 'highschool' | 'default' | 'system') => {
    if (presetType === 'primary') {
      setConfiguredClasses([
        { id: 'c-1a1', name: '1A1', grade: 1 },
        { id: 'c-1a2', name: '1A2', grade: 1 },
        { id: 'c-2a1', name: '2A1', grade: 2 },
        { id: 'c-2a2', name: '2A2', grade: 2 },
        { id: 'c-3a1', name: '3A1', grade: 3 },
        { id: 'c-3a2', name: '3A2', grade: 3 },
        { id: 'c-4a1', name: '4A1', grade: 4 },
        { id: 'c-4a2', name: '4A2', grade: 4 },
        { id: 'c-5a1', name: '5A1', grade: 5 },
        { id: 'c-5a2', name: '5A2', grade: 5 },
        { id: 'c-cc', name: 'Chào cờ', grade: 0 },
        { id: 'c-shl', name: 'Sinh hoạt lớp', grade: 0 }
      ]);
    } else if (presetType === 'secondary') {
      setConfiguredClasses([
        { id: 'c-6a1', name: '6A1', grade: 6 },
        { id: 'c-6a2', name: '6A2', grade: 6 },
        { id: 'c-7a1', name: '7A1', grade: 7 },
        { id: 'c-7a2', name: '7A2', grade: 7 },
        { id: 'c-8a1', name: '8A1', grade: 8 },
        { id: 'c-8a2', name: '8A2', grade: 8 },
        { id: 'c-9a1', name: '9A1', grade: 9 },
        { id: 'c-9a2', name: '9A2', grade: 9 },
        { id: 'c-cc', name: 'Chào cờ', grade: 0 },
        { id: 'c-shl', name: 'Sinh hoạt lớp', grade: 0 }
      ]);
    } else if (presetType === 'highschool') {
      setConfiguredClasses([
        { id: 'c-10a1', name: '10A1', grade: 10 },
        { id: 'c-10a2', name: '10A2', grade: 10 },
        { id: 'c-11a1', name: '11A1', grade: 11 },
        { id: 'c-11a2', name: '11A2', grade: 11 },
        { id: 'c-12a1', name: '12A1', grade: 12 },
        { id: 'c-12a2', name: '12A2', grade: 12 },
        { id: 'c-cc', name: 'Chào cờ', grade: 0 },
        { id: 'c-shl', name: 'Sinh hoạt lớp', grade: 0 }
      ]);
    } else if (presetType === 'system') {
      try {
        let foundClasses: { name: string; grade: number }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('lopHoc_state_') || key.includes('smart_class'))) {
            try {
              const val = JSON.parse(localStorage.getItem(key) || '{}');
              if (Array.isArray(val?.classes) && val.classes.length > 0) {
                val.classes.forEach((c: any) => {
                  if (c?.name) {
                    const g = Number(c.grade) || Number(c.name.match(/^(1[0-2]|[1-9])/)?.[1]) || 3;
                    if (!foundClasses.some((fc) => fc.name === c.name)) {
                      foundClasses.push({ name: c.name, grade: g });
                    }
                  }
                });
              }
            } catch {}
          }
        }
        if (foundClasses.length > 0) {
          const list: ConfiguredClass[] = [
            ...foundClasses.map((fc, i) => ({ id: `sys-${i}-${Date.now()}`, name: fc.name, grade: fc.grade })),
            { id: 'c-cc', name: 'Chào cờ', grade: 0 },
            { id: 'c-shl', name: 'Sinh hoạt lớp', grade: 0 }
          ];
          setConfiguredClasses(list);
          alert(`Đã đồng bộ thành công ${foundClasses.length} lớp học từ hệ thống!`);
          return;
        } else {
          alert('Chưa tìm thấy lớp học trong bộ nhớ hệ thống. Thầy/cô có thể dùng các mẫu nạp sẵn hoặc tự thêm lớp!');
        }
      } catch (err) {
        console.error('Error syncing system classes:', err);
      }
    } else {
      setConfiguredClasses(DEFAULT_CONFIGURED_CLASSES);
    }
  };

  const handleSelectSubject = (subj: string) => {
    if (subj === 'custom') {
      setIsCustomSubject(true);
      return;
    }
    setIsCustomSubject(false);
    setInputSubject(subj);

    // Tự động gợi ý phân môn
    const subs = getSubSubjectsByGradeAndSubject(inputGrade, subj);
    if (subs.length > 0) {
      setInputSubSubject(subs[0]);
    } else {
      setInputSubSubject('');
    }

    // Tự động gợi ý tên lớp và khối nếu chọn Chào cờ hoặc Sinh hoạt lớp
    if (subj === 'Chào cờ') {
      setInputClass('Chào cờ');
      setInputGrade(0);
    } else if (subj === 'Sinh hoạt lớp') {
      setInputClass('Sinh hoạt lớp');
      setInputGrade(0);
    }
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const { day, session, period } = selectedSlot;
    const existingIndex = timetable.findIndex(
      (s) => s.dayOfWeek === day && s.session === session && s.period === period
    );

    const newSlot: TimetableSlot = {
      id: `tkb-${day}-${session}-${period}`,
      dayOfWeek: day,
      session,
      period,
      className: inputClass.trim(),
      subject: inputSubject.trim(),
      subSubject: inputSubSubject.trim(),
      grade: inputGrade
    };

    if (existingIndex >= 0) {
      const updated = [...timetable];
      updated[existingIndex] = newSlot;
      onUpdateTimetable(updated);
    } else {
      onUpdateTimetable([...timetable, newSlot]);
    }

    setSelectedSlot(null);
  };

  const handleDownloadSampleExcel = () => {
    const sampleRows = [
      {
        'Thứ': 2,
        'Buổi': 'Sáng',
        'Tiết': 1,
        'Tên Lớp': '3A1',
        'Môn Học': 'Tin học'
      },
      {
        'Thứ': 2,
        'Buổi': 'Sáng',
        'Tiết': 2,
        'Tên Lớp': '3A2',
        'Môn Học': 'Tin học'
      },
      {
        'Thứ': 2,
        'Buổi': 'Chiều',
        'Tiết': 1,
        'Tên Lớp': '4A1',
        'Môn Học': 'Tin học'
      },
      {
        'Thứ': 3,
        'Buổi': 'Sáng',
        'Tiết': 1,
        'Tên Lớp': '5A1',
        'Môn Học': 'Tin học'
      },
      {
        'Thứ': 3,
        'Buổi': 'Sáng',
        'Tiết': 2,
        'Tên Lớp': '5A2',
        'Môn Học': 'Tin học'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 10 },
      { wch: 8 },
      { wch: 15 },
      { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Thoi_Khoa_Bieu');
    XLSX.writeFile(workbook, 'Mau_Thoi_Khoa_Bieu_Excel.xlsx');
  };

  const handleExportExcel = () => {
    const exportData = timetable.map((s) => ({
      'Thứ': s.dayOfWeek,
      'Buổi': s.session === 'morning' ? 'Sáng' : 'Chiều',
      'Tiết': s.period,
      'Tên Lớp': s.className,
      'Môn Học': s.subject
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TKB');
    XLSX.writeFile(workbook, 'Thoi_Khoa_Bieu_Giang_Day.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          alert('File Excel không có dữ liệu!');
          return;
        }

        const newSlots: TimetableSlot[] = rows.map((r) => {
          const parsedDay = parseInt(r['Thứ'] || r['Thu'] || r['Day'] || '2', 10);
          const rawDay = isNaN(parsedDay) ? 2 : parsedDay;

          const rawSessionStr = (r['Buổi'] || r['Buoi'] || r['Session'] || 'Sáng').toString().toLowerCase();
          const session: 'morning' | 'afternoon' = rawSessionStr.includes('chiều') || rawSessionStr.includes('afternoon') ? 'afternoon' : 'morning';

          const parsedPeriod = parseInt(r['Tiết'] || r['Tiet'] || r['Period'] || '1', 10);
          const period = isNaN(parsedPeriod) ? 1 : parsedPeriod;

          const className = (r['Tên Lớp'] || r['Lớp'] || r['Lop'] || r['Class'] || '3A1').toString().trim();
          const subject = (r['Môn Học'] || r['Môn'] || r['Mon'] || r['Subject'] || 'Tin học').toString().trim();
          const gradeMatch = className.match(/^(1[0-2]|[1-9])/);
          const grade = gradeMatch ? (isNaN(Number(gradeMatch[1])) ? 3 : Number(gradeMatch[1])) : 3;

          return {
            id: `tkb-${rawDay}-${session}-${period}`,
            dayOfWeek: rawDay,
            session,
            period,
            className,
            subject,
            grade
          };
        });

        onUpdateTimetable(newSlots);
        alert(`Đã nhập thành công ${newSlots.length} tiết vào Thời khóa biểu!`);
      } catch (err) {
        console.error('Import TKB error:', err);
        alert('Có lỗi khi đọc file Excel TKB. Vui lòng kiểm tra định dạng!');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleClearSlot = () => {
    if (!selectedSlot) return;
    const { day, session, period } = selectedSlot;
    const filtered = timetable.filter(
      (s) => !(s.dayOfWeek === day && s.session === session && s.period === period)
    );
    onUpdateTimetable(filtered);
    setSelectedSlot(null);
  };

  const morningSlots = timetable.filter((s) => s.session === 'morning');
  const afternoonSlots = timetable.filter((s) => s.session === 'afternoon');
  const totalPeriods = timetable.length;

  const renderTableSection = (session: 'morning' | 'afternoon') => {
    const isMorning = session === 'morning';
    const sessionTitle = isMorning ? 'BUỔI SÁNG' : 'BUỔI CHIỀU';
    const sessionCount = isMorning ? morningSlots.length : afternoonSlots.length;
    const headerBg = isMorning
      ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500'
      : 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-teal-600';
    const badgeBg = isMorning
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-indigo-100 text-indigo-800 border-indigo-200';
    const cellBorder = isMorning ? 'border-amber-100' : 'border-indigo-100';

    return (
      <div
        key={session}
        className="bg-white rounded-3xl border-2 border-slate-200 shadow-md overflow-hidden transition-all"
      >
        {/* Session Sub-Header */}
        <div className={`px-5 py-3 ${headerBg} text-white flex flex-wrap items-center justify-between gap-2`}>
          <div className="flex items-center gap-2.5">
            {isMorning ? (
              <div className="p-1.5 rounded-xl bg-white/20 backdrop-blur-xs">
                <Sun className="w-5 h-5 text-amber-100" />
              </div>
            ) : (
              <div className="p-1.5 rounded-xl bg-white/20 backdrop-blur-xs">
                <Sunset className="w-5 h-5 text-indigo-100" />
              </div>
            )}
            <div>
              <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                {sessionTitle} (Tiết 1 đến Tiết 5)
              </h3>
              <p className="text-[11px] text-white/80 font-medium">
                {isMorning ? 'Giảng dạy các tiết sáng' : 'Giảng dạy các tiết chiều'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white border border-white/30">
              Đã xếp: {sessionCount} tiết
            </span>
          </div>
        </div>

        {/* Timetable Grid for this session */}
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3 w-20 border-r border-slate-200 uppercase text-[11px] tracking-wider">
                  TIẾT
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="py-3 px-2 border-r border-slate-200 last:border-r-0 font-extrabold text-slate-800 text-xs sm:text-sm"
                  >
                    {getDayOfWeekName(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {periods.map((period) => (
                <tr key={period} className="hover:bg-slate-50/70 transition-colors">
                  {/* Cột số tiết */}
                  <td className="py-3.5 px-3 font-black text-slate-800 bg-slate-50/80 border-r border-slate-200">
                    <div className="text-xs sm:text-sm font-black text-slate-900">Tiết {period}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{isMorning ? 'Sáng' : 'Chiều'}</div>
                  </td>

                  {/* Các ngày trong tuần */}
                  {days.map((day) => {
                    const slot = getSlot(day, session, period);
                    const isSelected =
                      selectedSlot?.day === day &&
                      selectedSlot?.session === session &&
                      selectedSlot?.period === period;

                    return (
                      <td
                        key={day}
                        onClick={() => handleCellClick(day, session, period)}
                        className={`py-2.5 px-2 border-r border-slate-200 last:border-r-0 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-teal-100/90 ring-2 ring-teal-500 inset-0'
                            : slot
                            ? isMorning
                              ? 'bg-amber-50/40 hover:bg-amber-100/50'
                              : 'bg-indigo-50/40 hover:bg-indigo-100/50'
                            : 'hover:bg-slate-100/70'
                        }`}
                      >
                        {slot ? (
                          <div className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-xs text-left group hover:border-teal-300 transition-colors">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-black text-slate-900 text-xs truncate">
                                {slot.subject}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md border ${badgeBg}`}
                              >
                                {isGvcn ? `Lớp ${slot.className}` : (slot.grade > 0 ? `K${slot.grade}` : 'ĐB')}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-teal-800 truncate">
                              {slot.subSubject ? slot.subSubject : (isGvcn ? `Khối ${slot.grade}` : slot.subject)}
                            </div>
                          </div>
                        ) : (
                          <div className="py-2.5 text-slate-300 hover:text-teal-600 font-bold text-xs flex items-center justify-center gap-1">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Trống</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border-2 border-teal-200/80 shadow-lg shadow-teal-900/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                {isGvcn
                  ? `Thời Khóa Biểu Lớp Chủ Nhiệm ${activeClassName ? `(${activeClassName})` : ''}`
                  : 'Thời Khóa Biểu Giảng Dạy'}
              </h2>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                isGvcn ? 'bg-teal-100 text-teal-900 border-teal-300' : 'bg-indigo-100 text-indigo-900 border-indigo-300'
              }`}>
                {isGvcn ? 'DÀNH CHO GVCN' : 'DÀNH CHO GVBM'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Tổng cộng: {totalPeriods} tiết
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {isGvcn
                ? `Thời khóa biểu tuần các tiết dạy dành riêng cho Lớp chủ nhiệm ${activeClassName}. Tự động xuất thành Lịch Báo Giảng.`
                : 'Tự động áp dụng và đồng bộ vào Kế hoạch dạy học theo tuần của Giáo viên bộ môn'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher: Hiển thị cả ngày (Sáng & Chiều) | Chỉ Buổi Sáng | Chỉ Buổi Chiều */}
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cả ngày (Sáng & Chiều)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('morning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'morning'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Buổi Sáng ({morningSlots.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('afternoon')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'afternoon'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sunset className="w-3.5 h-3.5" />
              <span>Buổi Chiều ({afternoonSlots.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSampleExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all cursor-pointer shadow-2xs"
            title="Tải tệp Excel mẫu để xếp Thời khóa biểu nhanh"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Tải file mẫu Excel</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-teal-600" />
            <span>Nhập Excel</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            title="Xuất Thời khóa biểu hiện tại ra file Excel"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setShowClassConfigModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all cursor-pointer shadow-2xs"
            title="Cấu hình danh sách các lớp học phụ trách giảng dạy"
          >
            <Settings className="w-4 h-4 text-teal-600" />
            <span>Cấu hình lớp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Khôi phục thời khóa biểu mẫu ban đầu?')) {
                onResetTimetable();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all cursor-pointer"
            title="Khôi phục TKB chuẩn"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Khôi phục</span>
          </button>
        </div>
      </div>

      {/* Info notice */}
      <div className="px-4 py-3 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3 text-xs text-teal-950 font-medium">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            Bấm trực tiếp vào từng ô tiết học ở <strong>Buổi Sáng</strong> hoặc <strong>Buổi Chiều</strong> để phân công Lớp, Môn học và Khối. Dữ liệu này sẽ tự động cập nhật vào Kế hoạch dạy học.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0 text-[11px] font-bold text-teal-800">
          <span>🌅 Sáng: {morningSlots.length} tiết</span>
          <span>•</span>
          <span>🌇 Chiều: {afternoonSlots.length} tiết</span>
        </div>
      </div>

      {/* Timetable Grids */}
      <div className="space-y-6">
        {(viewMode === 'all' || viewMode === 'morning') && renderTableSection('morning')}
        {(viewMode === 'all' || viewMode === 'afternoon') && renderTableSection('afternoon')}
      </div>

      {/* Slot Editor Modal / Drawer */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-teal-100 overflow-hidden my-auto">
            <div
              className={`px-5 py-3.5 text-white flex items-center justify-between ${
                selectedSlot.session === 'morning'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500'
                  : 'bg-gradient-to-r from-indigo-700 to-teal-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <h3 className="font-black text-xs sm:text-sm">
                  {`Phân công ${getDayOfWeekName(selectedSlot.day)}, Tiết ${selectedSlot.period} (${
                    selectedSlot.session === 'morning' ? 'Buổi Sáng' : 'Buổi Chiều'
                  })`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-4 sm:p-5 space-y-3.5 max-h-[85vh] overflow-y-auto">
              {/* 1. Môn học */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Môn học
                  </label>
                  <span className="text-[10px] font-semibold text-teal-700">
                    {isCustomSubject ? 'Đang nhập tùy chỉnh' : 'Chọn danh mục'}
                  </span>
                </div>

                <select
                  value={
                    isCustomSubject || !ALL_COMMON_SUBJECTS.includes(inputSubject)
                      ? 'custom'
                      : inputSubject
                  }
                  onChange={(e) => handleSelectSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400 bg-white shadow-2xs"
                >
                  {GENERAL_EDUCATION_SUBJECT_GROUPS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.subjects.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="custom">✏️ Môn học khác (Tự nhập tên)...</option>
                </select>

                {(isCustomSubject || !ALL_COMMON_SUBJECTS.includes(inputSubject)) && (
                  <input
                    type="text"
                    value={inputSubject}
                    onChange={(e) => setInputSubject(e.target.value)}
                    placeholder="Nhập tên môn học..."
                    className="w-full px-3 py-2 rounded-xl border border-teal-400 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-teal-50/40"
                    autoFocus
                    required
                  />
                )}

                {/* Phím chọn nhanh môn phổ biến */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    'Tiếng Việt',
                    'Toán',
                    'Lịch sử và Địa lí',
                    'Tự nhiên và Xã hội',
                    'Khoa học',
                    'Đạo đức',
                    'Tiếng Anh',
                    'Tin học',
                    'Công nghệ',
                    'Nghệ thuật',
                    'Chào cờ',
                    'Sinh hoạt lớp',
                    'Hoạt động trải nghiệm'
                  ].map((sub) => {
                    const isSelected = inputSubject === sub && !isCustomSubject;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleSelectSubject(sub)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                            : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {sub === 'Hoạt động trải nghiệm'
                          ? 'HĐTN'
                          : sub === 'Khoa học tự nhiên'
                          ? 'KHTN'
                          : sub === 'Lịch sử và Địa lí'
                          ? 'Lịch sử - Địa lí'
                          : sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Phân môn (Chỉ hiển thị cho môn Tiếng Việt hoặc môn có phân môn) */}
              {(availableSubSubjects.length > 0 || inputSubject === 'Tiếng Việt') && (
                <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-teal-700" />
                      <span>Phân môn (Môn Tiếng Việt)</span>
                    </label>
                    <span className="text-[10px] text-teal-800 font-bold">
                      Khối {inputGrade} • {inputSubject}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={inputSubSubject}
                    onChange={(e) => setInputSubSubject(e.target.value)}
                    placeholder="Nhập phân môn (ví dụ: Tập đọc, LTVC, Tập làm văn...)"
                    className="w-full px-3 py-1.5 rounded-xl border border-teal-300 text-xs font-bold text-slate-800 bg-white"
                  />

                  {availableSubSubjects.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] font-medium text-slate-500 mr-1">Gợi ý:</span>
                      {availableSubSubjects.map((sub) => {
                        const isSel = inputSubSubject === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setInputSubSubject(sub)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              isSel
                                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                : 'bg-white hover:bg-teal-100 text-slate-700 border-teal-200'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Lớp học & Khối lớp */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-teal-600" />
                    <span>Lớp học</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-200">
                      {inputGrade > 0 ? `Khối ${inputGrade}` : 'Tập thể'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowClassConfigModal(true)}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                    >
                      Cấu hình
                    </button>
                  </div>
                </div>

                <select
                  value={
                    isCustomClass || !configuredClasses.some((c) => c.name === inputClass)
                      ? 'custom'
                      : inputClass
                  }
                  onChange={(e) => handleSelectClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400 bg-white shadow-2xs"
                >
                  {groupedClasses.map((grp) => (
                    <optgroup key={grp.label} label={grp.label}>
                      {grp.classes.map((cls) => (
                        <option key={cls.id} value={cls.name}>
                          Lớp {cls.name} {cls.grade > 0 ? `(Khối ${cls.grade})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="custom">✏️ Lớp khác (Tự nhập tên)...</option>
                </select>

                {(isCustomClass || !configuredClasses.some((c) => c.name === inputClass)) && (
                  <input
                    type="text"
                    value={inputClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    placeholder="Nhập tên lớp..."
                    className="w-full px-3 py-2 rounded-xl border border-teal-400 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-teal-50/40"
                    autoFocus
                    required
                  />
                )}

                {/* Chọn nhanh lớp */}
                {configuredClasses.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                    {configuredClasses.map((cls) => {
                      const isSelected = inputClass === cls.name && !isCustomClass;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleSelectClass(cls.name)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                              : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {cls.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {getSlot(selectedSlot.day, selectedSlot.session, selectedSlot.period) ? (
                  <button
                    type="button"
                    onClick={handleClearSlot}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa tiết</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-teal-700 hover:bg-teal-800 text-white shadow-md transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu tiết</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cấu hình danh sách lớp học */}
      {showClassConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-teal-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-white/20">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    Cấu hình danh sách lớp học giảng dạy
                  </h3>
                  <p className="text-[11px] text-teal-100 font-medium">
                    Thiết lập để chọn nhanh khi xếp TKB, không phải gõ bàn phím
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClassConfigModal(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Form thêm lớp mới */}
              <form onSubmit={handleAddConfiguredClass} className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-teal-900">
                    + Thêm lớp học mới vào danh sách
                  </span>
                  <span className="text-[10px] text-teal-700 font-medium">
                    Tự động nhận diện khối khi nhập
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tên lớp
                    </label>
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => handleNewClassNameChange(e.target.value)}
                      placeholder="Ví dụ: 6A1, 10A2, 4A3..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Khối lớp
                    </label>
                    <select
                      value={isNaN(newClassGrade) ? 0 : newClassGrade}
                      onChange={(e) => setNewClassGrade(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                    >
                      <option value={0}>0 - Chung</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                        <option key={g} value={g}>
                          Khối {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm lớp</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Nạp mẫu nhanh theo từng cấp học */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Nạp nhanh danh sách lớp mẫu theo cấp học:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLoadClassPreset('primary')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-teal-50 text-slate-700 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer shadow-2xs"
                  >
                    🏫 Tiểu học (1A1 - 5A2)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadClassPreset('secondary')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-teal-50 text-slate-700 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer shadow-2xs"
                  >
                    🏫 THCS (6A1 - 9A2)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadClassPreset('highschool')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-teal-50 text-slate-700 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer shadow-2xs"
                  >
                    🏫 THPT (10A1 - 12A2)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadClassPreset('system')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title="Lấy danh sách các lớp đã tạo trong hệ thống lớp học"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>📥 Lấy từ hệ thống</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadClassPreset('default')}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Mặc định</span>
                  </button>
                </div>
              </div>

              {/* Danh sách lớp đã cấu hình hiện tại */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">
                    Danh sách các lớp đang cấu hình ({configuredClasses.length} lớp)
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Bấm biểu tượng thùng rác để xóa lớp không dạy
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {configuredClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between hover:border-teal-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-black text-[10px] flex items-center justify-center shrink-0">
                          {cls.grade > 0 ? `K${cls.grade}` : 'ĐB'}
                        </span>
                        <span className="font-black text-xs text-slate-800 truncate">
                          {cls.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteConfiguredClass(cls.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa lớp này khỏi danh sách chọn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Dữ liệu được lưu tự động trên trình duyệt
              </span>
              <button
                type="button"
                onClick={() => setShowClassConfigModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 cursor-pointer"
              >
                Hoàn tất & Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
