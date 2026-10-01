import React, { useState, useRef } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Star,
  Coins,
  Edit3,
  Trash2,
  RotateCcw,
  ClipboardPaste,
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  LayoutGrid,
  List,
  X,
  AlertCircle,
  Eye,
  Filter,
  FileSpreadsheet,
  Download,
  Cloud,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppState, Student, SeatingConfig, UserAccount } from '../../types';
import { Avatar } from '../Avatar';
import { uid, compressImageFile, removeVietnameseTones } from '../../utils/helpers';
import { playCelebration } from '../../utils/audio';

interface StudentsTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onNavigate: (page: string) => void;
  currentUser?: UserAccount | null;
  onForceSync?: (updatedState: AppState) => Promise<boolean>;
}

interface BatchFileMatch {
  id: string;
  file: File;
  fileName: string;
  previewUrl: string;
  matchedStudentId: string;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  state,
  onUpdateState,
  onNavigate,
  currentUser,
  onForceSync
}) => {
  const activeClass = state.classes.find((c) => c.id === state.activeClassId) || state.classes[0];
  const students = state.students.filter((s) => s.classId === state.activeClassId);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'photos' | 'compact'>('photos');
  const [filterPhoto, setFilterPhoto] = useState<'all' | 'hasPhoto' | 'noPhoto'>('all');
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Hidden file input for quick direct upload on cards
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const [targetStudentForUpload, setTargetStudentForUpload] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Enlarged photo preview modal
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);

  // Batch upload modal state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchFileMatch[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'Nam' | 'Nữ' | 'Khác'>('Nữ');
  const [formCoins, setFormCoins] = useState(0);
  const [formAvatar, setFormAvatar] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formFavorite, setFormFavorite] = useState(false);

  // Quick coin adjust modal
  const [coinModalOpen, setCoinModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<Student | null>(null);
  const [adjustSign, setAdjustSign] = useState<1 | -1>(1);
  const [adjustAmount, setAdjustAmount] = useState(1);
  const [adjustSubject, setAdjustSubject] = useState(state.subjects[0] || 'Ghi chung / Nề nếp');
  const [adjustReason, setAdjustReason] = useState('');

  // Bulk paste modal
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const studentsWithPhotoCount = students.filter(
    (s) =>
      !!s.avatar &&
      (s.avatar.startsWith('data:') ||
        s.avatar.startsWith('http') ||
        s.avatar.startsWith('blob:') ||
        s.avatar.startsWith('/'))
  ).length;

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const hasPhoto =
      !!s.avatar &&
      (s.avatar.startsWith('data:') ||
        s.avatar.startsWith('http') ||
        s.avatar.startsWith('blob:') ||
        s.avatar.startsWith('/'));
    if (filterPhoto === 'hasPhoto') return matchesSearch && hasPhoto;
    if (filterPhoto === 'noPhoto') return matchesSearch && !hasPhoto;
    return matchesSearch;
  });

  const openStudentModal = (s?: Student) => {
    if (s) {
      setEditingStudent(s);
      setFormName(s.name);
      setFormGender(s.gender as 'Nam' | 'Nữ' | 'Khác');
      setFormCoins(s.coins || 0);
      setFormAvatar(s.avatar || '');
      setFormNote(s.note || '');
      setFormFavorite(!!s.favorite);
    } else {
      setEditingStudent(null);
      setFormName('');
      setFormGender('Nữ');
      setFormCoins(0);
      setFormAvatar('');
      setFormNote('');
      setFormFavorite(false);
    }
    setStudentModalOpen(true);
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImageFile(file, 300, 0.85);
        if (dataUrl) {
          setFormAvatar(dataUrl);
        }
      } catch (err) {
        console.error('Failed to read image:', err);
      }
    }
  };

  // Direct quick upload on student card
  const triggerQuickAvatarUpload = (studentId: string) => {
    setTargetStudentForUpload(studentId);
    cardFileInputRef.current?.click();
  };

  const handleCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && targetStudentForUpload) {
      try {
        const dataUrl = await compressImageFile(file, 300, 0.85);
        if (dataUrl) {
          const st = students.find((s) => s.id === targetStudentForUpload);
          onUpdateState((prev) => ({
            ...prev,
            students: prev.students.map((s) =>
              s.id === targetStudentForUpload ? { ...s, avatar: dataUrl } : s
            )
          }));
          setToastMessage(`Đã cập nhật ảnh đại diện cho học sinh ${st?.name || ''}!`);
          setTimeout(() => setToastMessage(null), 3500);
        }
      } catch (err) {
        console.error('Failed to compress avatar:', err);
      }
    }
    if (cardFileInputRef.current) {
      cardFileInputRef.current.value = '';
    }
    setTargetStudentForUpload(null);
  };

  // Batch upload handlers
  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files: File[] = Array.from(e.target.files);

    const newItems: BatchFileMatch[] = [];
    const availableStudents = [...students];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').trim();
      const normalizedFileName = removeVietnameseTones(nameWithoutExt).replace(/[^a-z0-9]/g, ' ');

      // 1. Try matching by order number: "1.jpg", "01.png"
      const numberMatch = nameWithoutExt.match(/^(\d+)/);
      let matchedStudent: Student | undefined;

      if (numberMatch) {
        const order = parseInt(numberMatch[1], 10) - 1;
        if (order >= 0 && order < students.length) {
          matchedStudent = students[order];
        }
      }

      // 2. Try matching by student name
      if (!matchedStudent) {
        matchedStudent = availableStudents.find((s) => {
          const normStudentName = removeVietnameseTones(s.name).replace(/[^a-z0-9]/g, ' ');
          return (
            normalizedFileName.includes(normStudentName) ||
            normStudentName.includes(normalizedFileName)
          );
        });
      }

      // 3. Fallback: match first student without photo
      if (!matchedStudent) {
        matchedStudent =
          availableStudents.find((s) => !s.avatar || s.avatar.length <= 4) ||
          availableStudents[0];
      }

      newItems.push({
        id: `batch_${Date.now()}_${i}_${Math.random()}`,
        file,
        fileName: file.name,
        previewUrl,
        matchedStudentId: matchedStudent ? matchedStudent.id : ''
      });
    }

    setBatchItems((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleApplyBatch = async () => {
    if (batchItems.length === 0) return;
    setBatchProcessing(true);

    try {
      const updates: Record<string, string> = {};

      for (const item of batchItems) {
        if (!item.matchedStudentId) continue;
        const compressed = await compressImageFile(item.file, 300, 0.85);
        if (compressed) {
          updates[item.matchedStudentId] = compressed;
        }
      }

      const appliedCount = Object.keys(updates).length;
      if (appliedCount > 0) {
        const nextState: AppState = {
          ...state,
          students: state.students.map((s) =>
            updates[s.id] ? { ...s, avatar: updates[s.id] } : s
          )
        };
        onUpdateState(() => nextState);
        if (onForceSync) {
          onForceSync(nextState);
        }
        playCelebration();
        setToastMessage(`Đã cập nhật ảnh đại diện cho ${appliedCount} học sinh và lưu lên Cloud Firestore!`);
        setTimeout(() => setToastMessage(null), 4000);
      }

      batchItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setBatchItems([]);
      setBatchModalOpen(false);
    } catch (err) {
      console.error('Batch upload error:', err);
      alert('Có lỗi xảy ra khi xử lý ảnh.');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;

    let nextState: AppState;

    if (editingStudent) {
      const updatedStudent: Student = {
        ...editingStudent,
        name,
        gender: formGender,
        coins: formCoins,
        avatar: formAvatar || '',
        note: formNote.trim() || '',
        favorite: !!formFavorite
      };

      nextState = {
        ...state,
        students: state.students.map((s) =>
          s.id === editingStudent.id ? updatedStudent : s
        )
      };
      onUpdateState(() => nextState);
      setToastMessage(`Đã cập nhật học sinh "${name}" lên Cloud Firestore!`);
    } else {
      const newStudent: Student = {
        id: uid('s'),
        classId: state.activeClassId,
        name,
        gender: formGender,
        coins: formCoins,
        avatar: formAvatar || '',
        note: formNote.trim() || '',
        favorite: !!formFavorite
      };

      nextState = {
        ...state,
        students: [...state.students, newStudent]
      };
      onUpdateState(() => nextState);
      setToastMessage(`Đã thêm học sinh "${name}" và lưu trữ trên Cloud Firestore!`);
    }

    setStudentModalOpen(false);
    setTimeout(() => setToastMessage(null), 3500);

    if (onForceSync) {
      await onForceSync(nextState);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const s = state.students.find((item) => item.id === id);
    if (!window.confirm(`Xóa học sinh "${s?.name}" khỏi lớp?`)) return;

    const updatedSeating: Record<string, SeatingConfig> = { ...state.seating };
    Object.values(updatedSeating).forEach((cfg: SeatingConfig) => {
      if (cfg && cfg.assignments) {
        Object.keys(cfg.assignments).forEach((k) => {
          const numK = Number(k);
          if (cfg.assignments[numK] === id) {
            delete cfg.assignments[numK];
          }
        });
      }
    });

    const nextState: AppState = {
      ...state,
      students: state.students.filter((item) => item.id !== id),
      seating: updatedSeating
    };

    onUpdateState(() => nextState);
    setToastMessage(`Đã xóa học sinh "${s?.name}" và cập nhật Cloud Firestore.`);
    setTimeout(() => setToastMessage(null), 3500);

    if (onForceSync) {
      await onForceSync(nextState);
    }
  };

  const handleToggleFavorite = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s))
    }));
  };

  const openAdjustCoinModal = (student: Student, sign: 1 | -1) => {
    setAdjustTarget(student);
    setAdjustSign(sign);
    setAdjustAmount(1);
    setAdjustReason(sign > 0 ? 'Phát biểu tốt và hăng hái xây dựng bài' : 'Nhắc nhở mất trật tự');
    setAdjustSubject(state.subjects[0] || 'Ghi chung / Nề nếp');
    setCoinModalOpen(true);
  };

  const submitCoinAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    const delta = adjustSign * adjustAmount;
    const finalReason = adjustReason.trim() || (adjustSign > 0 ? 'Khen thưởng hoa' : 'Trừ hoa nề nếp');

    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === adjustTarget.id
          ? { ...s, coins: Math.max(0, (s.coins || 0) + delta) }
          : s
      ),
      transactions: [
        {
          id: uid('tx'),
          classId: state.activeClassId,
          studentId: adjustTarget.id,
          studentName: adjustTarget.name,
          amount: delta,
          reason: finalReason,
          subject: adjustSubject,
          time: new Date().toISOString()
        },
        ...prev.transactions
      ]
    }));

    if (adjustSign > 0) {
      playCelebration();
    }
    setCoinModalOpen(false);
  };

  const handleBulkPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const newStudents: Student[] = lines.map((name) => ({
      id: uid('s'),
      classId: state.activeClassId,
      name,
      gender: 'Nữ',
      coins: 0,
      avatar: '',
      favorite: false,
      note: ''
    }));

    const nextState: AppState = {
      ...state,
      students: [...state.students, ...newStudents]
    };

    onUpdateState(() => nextState);
    setBulkText('');
    setPasteModalOpen(false);
    setToastMessage(`Đã thêm ${newStudents.length} học sinh và lưu trữ trên Cloud Firestore!`);
    setTimeout(() => setToastMessage(null), 3500);

    if (onForceSync) {
      await onForceSync(nextState);
    }
  };

  const handleDownloadSampleExcel = () => {
    const sampleRows = [
      {
        'STT': 1,
        'Họ và tên': 'Nguyễn Văn An',
        'Giới tính': 'Nam',
        'Ghi chú': 'Lớp trưởng'
      },
      {
        'STT': 2,
        'Họ và tên': 'Trần Thị Bích',
        'Giới tính': 'Nữ',
        'Ghi chú': 'Lớp phó học tập'
      },
      {
        'STT': 3,
        'Họ và tên': 'Lê Hoàng Cường',
        'Giới tính': 'Nam',
        'Ghi chú': 'Tổ trưởng tổ 1'
      },
      {
        'STT': 4,
        'Họ và tên': 'Phạm Mỹ Duyên',
        'Giới tính': 'Nữ',
        'Ghi chú': 'Thành viên'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 12 },
      { wch: 25 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh_Sach_Hoc_Sinh');
    XLSX.writeFile(workbook, `Mau_Danh_Sach_Hoc_Sinh_Lop_${activeClass?.name || 'Moi'}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
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

        const newStudents: Student[] = rows.map((r) => {
          const rawName = r['Họ và tên'] || r['HoVaTen'] || r['Họ tên'] || r['Name'] || '';
          const gender = (r['Giới tính'] || r['GioiTinh'] || 'Nữ').toString().trim();
          const note = (r['Ghi chú'] || r['GhiChu'] || '').toString().trim();
          return {
            id: uid('s'),
            classId: state.activeClassId,
            name: rawName.toString().trim(),
            gender: gender === 'Nam' ? 'Nam' : 'Nữ',
            coins: 0,
            avatar: '',
            favorite: false,
            note
          };
        }).filter((s) => s.name.length > 0);

        if (newStudents.length > 0) {
          const nextState: AppState = {
            ...state,
            students: [...state.students, ...newStudents]
          };
          onUpdateState(() => nextState);
          setToastMessage(`Đã nhập thành công ${newStudents.length} học sinh và lưu trữ trên Cloud Firestore!`);
          setTimeout(() => setToastMessage(null), 3500);

          if (onForceSync) {
            await onForceSync(nextState);
          }
        } else {
          alert('Không tìm thấy cột "Họ và tên" hợp lệ trong file Excel!');
        }
      } catch (err) {
        console.error('Import excel error:', err);
        alert('Có lỗi khi đọc file Excel. Vui lòng kiểm tra lại!');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleResetAllCoins = () => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn đặt lại số hoa thi đua của toàn bộ học sinh lớp ${activeClass?.name} về 0 không?`
      )
    ) {
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.classId === state.activeClassId ? { ...s, coins: 0 } : s
      )
    }));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Hidden input for direct card photo upload */}
      <input
        type="file"
        ref={cardFileInputRef}
        accept="image/*"
        onChange={handleCardFileChange}
        className="hidden"
      />

      {/* Toast feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top action bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800">
              Danh sách lớp {activeClass?.name} {activeClass?.year || state.teacher.year ? `(${activeClass?.year || state.teacher.year})` : ''}{' '}
              <span className="text-sm font-semibold text-slate-500">
                ({students.length} học sinh)
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý hồ sơ học sinh, ảnh đại diện nhận diện khuôn mặt và thi đua khen thưởng.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs shadow-2xs"
            title="Dữ liệu danh sách học sinh được tự động lưu và đồng bộ tức thì lên Cloud Firestore"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tự động lưu Cloud</span>
          </div>

          {/* Batch upload button */}
          <button
            onClick={() => setBatchModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-teal-50 hover:bg-teal-100 border-2 border-teal-200 text-teal-900 font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            title="Tải ảnh đại diện cho nhiều học sinh cùng lúc"
          >
            <Camera className="w-4 h-4 text-teal-700" />
            <span>Tải ảnh hàng loạt</span>
          </button>

          <button
            onClick={() => onNavigate('wheel')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-900" />
            <span>Vòng quay may mắn</span>
          </button>

          <button
            onClick={handleResetAllCoins}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Đặt hoa về 0</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSampleExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs transition-all cursor-pointer shadow-2xs"
            title="Tải file mẫu Excel để nhập danh sách học sinh nhanh"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>File mẫu Excel</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-teal-200 text-teal-800 hover:bg-teal-50 font-bold text-xs transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-teal-600" />
            <span>Nhập Excel</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setPasteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-teal-200 text-teal-800 hover:bg-teal-50 font-bold text-xs transition-all cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-teal-600" />
            <span>Dán danh sách</span>
          </button>

          <button
            onClick={() => openStudentModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm học sinh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter & Layout Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm học sinh theo tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white border-2 border-teal-100 focus:border-teal-500 focus:outline-none text-sm font-semibold shadow-sm"
          />
        </div>

        {/* Photo filter & Layout switcher */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Photo status filter */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-2xl border-2 border-teal-100 shadow-sm text-xs font-bold">
            <button
              onClick={() => setFilterPhoto('all')}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                filterPhoto === 'all'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-teal-800'
              }`}
            >
              Tất cả ({students.length})
            </button>
            <button
              onClick={() => setFilterPhoto('hasPhoto')}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                filterPhoto === 'hasPhoto'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>Đã có ảnh ({studentsWithPhotoCount})</span>
            </button>
            <button
              onClick={() => setFilterPhoto('noPhoto')}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                filterPhoto === 'noPhoto'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              Chưa có ảnh ({students.length - studentsWithPhotoCount})
            </button>
          </div>

          {/* View mode toggle: Photos vs Compact */}
          <div className="flex items-center p-1 bg-white rounded-2xl border-2 border-teal-100 shadow-sm">
            <button
              onClick={() => setViewMode('photos')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                viewMode === 'photos'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-teal-800'
              }`}
              title="Chế độ xem ảnh lớn - quan sát học sinh dễ dàng"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Thẻ ảnh lớn</span>
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                viewMode === 'compact'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-teal-800'
              }`}
              title="Chế độ danh sách gọn"
            >
              <List className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info notification regarding photos */}
      {studentsWithPhotoCount < students.length && (
        <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-teal-900 font-semibold">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>
              💡 <strong>Mẹo quan sát học sinh:</strong> Thầy/Cô có thể bấm trực tiếp vào biểu tượng{' '}
              <strong>Camera 📷</strong> trên từng học sinh hoặc dùng nút{' '}
              <strong>Tải ảnh hàng loạt</strong> để đưa ảnh đại diện lên giúp quan sát dễ dàng.
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-teal-200/70 text-teal-950 font-black text-[11px] whitespace-nowrap">
            Đã có ảnh: {studentsWithPhotoCount}/{students.length}
          </span>
        </div>
      )}

      {/* Student Cards Grid - Mode: 'photos' (Large Photo Cards) */}
      {viewMode === 'photos' ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border-2 border-teal-100 hover:border-teal-300 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Photo & Header */}
                <div className="flex flex-col items-center text-center">
                  {/* Avatar with Camera badge overlay */}
                  <div className="relative mb-3">
                    <div
                      onClick={() => triggerQuickAvatarUpload(student.id)}
                      className="relative group/avatar cursor-pointer block rounded-2xl overflow-hidden focus:outline-none ring-2 ring-teal-100 hover:ring-teal-400 transition-all"
                      title="Bấm để tải/đổi ảnh đại diện cho học sinh này"
                    >
                      <Avatar name={student.name} avatar={student.avatar} size="2xl" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span>Đổi ảnh</span>
                      </div>
                    </div>

                    {/* Quick Camera button at bottom-right of avatar */}
                    <button
                      type="button"
                      onClick={() => triggerQuickAvatarUpload(student.id)}
                      className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-md border-2 border-white transition-transform active:scale-90 cursor-pointer"
                      title="Bấm tải ảnh đại diện từ thiết bị"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>

                    {/* Preview enlarged button if has photo */}
                    {student.avatar && student.avatar.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setPreviewStudent(student)}
                        className="absolute -top-1 -left-1 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-900 text-white shadow-md border-2 border-white transition-transform active:scale-90 cursor-pointer"
                        title="Xem ảnh phóng to"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Student name & Favorite */}
                  <div className="w-full flex items-center justify-center gap-1.5 px-1">
                    <h4
                      className="font-black text-sm text-slate-800 truncate max-w-[180px]"
                      title={student.name}
                    >
                      {student.name}
                    </h4>
                    <button
                      onClick={() => handleToggleFavorite(student.id)}
                      className="text-slate-300 hover:text-amber-400 transition-colors flex-shrink-0 cursor-pointer"
                      title={student.favorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          student.favorite ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {activeClass?.name} · {student.gender || 'Học sinh'}
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 mt-2 rounded-full bg-rose-50 border border-rose-200 text-rose-900 font-black text-xs">
                    <span>🌺</span>
                    <span>{student.coins || 0} hoa</span>
                  </div>
                </div>

                {student.note && (
                  <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 text-center truncate">
                    {student.note}
                  </div>
                )}
              </div>

              {/* Card actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openAdjustCoinModal(student, 1)}
                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="Cộng hoa thưởng"
                  >
                    <span>+</span>
                    <span className="text-sm">🌺</span>
                  </button>

                  <button
                    onClick={() => openAdjustCoinModal(student, -1)}
                    className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-black text-xs border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="Trừ hoa"
                  >
                    <span>-</span>
                    <span className="text-sm">🌺</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openStudentModal(student)}
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition-colors cursor-pointer"
                    title="Sửa hồ sơ & ảnh đại diện"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteStudent(student.id)}
                    className="p-1.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Xóa học sinh"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mode: 'compact' (List Rows) */
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border-2 border-teal-100 hover:border-teal-300 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Card top */}
                <div className="flex items-start gap-3">
                  <div className="relative group/avatar">
                    <Avatar name={student.name} avatar={student.avatar} size="lg" />
                    <button
                      type="button"
                      onClick={() => triggerQuickAvatarUpload(student.id)}
                      className="absolute -bottom-1 -right-1 p-1 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow border border-white cursor-pointer"
                      title="Tải ảnh đại diện"
                    >
                      <Camera className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-extrabold text-sm text-slate-800 truncate">
                        {student.name}
                      </h4>
                      <button
                        onClick={() => handleToggleFavorite(student.id)}
                        className="text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                        title={student.favorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            student.favorite ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {activeClass?.name} · {student.gender || 'Học sinh'}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full bg-rose-50 border border-rose-200 text-rose-900 font-black text-xs">
                      <span>🌺</span>
                      <span>{student.coins || 0} hoa</span>
                    </div>
                  </div>
                </div>

                {student.note && (
                  <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 truncate">
                    {student.note}
                  </div>
                )}
              </div>

              {/* Card actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openAdjustCoinModal(student, 1)}
                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="Cộng hoa thưởng"
                  >
                    <span>+</span>
                    <span className="text-sm">🌺</span>
                  </button>

                  <button
                    onClick={() => openAdjustCoinModal(student, -1)}
                    className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-black text-xs border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="Trừ hoa"
                  >
                    <span>-</span>
                    <span className="text-sm">🌺</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openStudentModal(student)}
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition-colors cursor-pointer"
                    title="Sửa hồ sơ & ảnh"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteStudent(student.id)}
                    className="p-1.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Xóa học sinh"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredStudents.length === 0 && (
        <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
          <GraduationCap className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <div className="text-sm font-bold text-slate-600">Không tìm thấy học sinh phù hợp</div>
          <p className="text-xs text-slate-400 mt-0.5">
            Hãy kiểm tra lại từ khóa tìm kiếm hoặc bấm Thêm học sinh.
          </p>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-teal-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              {editingStudent ? 'Chỉnh sửa hồ sơ học sinh' : 'Thêm học sinh mới'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              {/* Avatar Section with Preview & Presets */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border-2 border-teal-200/80">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Live Avatar Preview */}
                  <div className="relative group/preview flex-shrink-0">
                    <Avatar name={formName || 'Học sinh'} avatar={formAvatar} gender={formGender} size="2xl" />
                    {formAvatar && (
                      <button
                        type="button"
                        onClick={() => setFormAvatar('')}
                        className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md cursor-pointer"
                        title="Dùng Icon mặc định tự động tạo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Upload Actions */}
                  <div className="flex-1 text-center sm:text-left space-y-1.5">
                    <label className="block text-xs font-black text-teal-950 uppercase tracking-wider">
                      Ảnh đại diện (Mặc định tự động tạo Icon đẹp mắt)
                    </label>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      ✨ Mặc định hệ thống tự động tạo <strong>Icon nhân vật đẹp mắt</strong> cho từng học sinh. Nếu muốn đổi ảnh riêng, Thầy/Cô có thể tự tải ảnh chân dung lên.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{formAvatar ? 'Đổi ảnh khác' : 'Tải ảnh từ máy tính/điện thoại'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFile}
                          className="hidden"
                        />
                      </label>

                      {formAvatar && (
                        <button
                          type="button"
                          onClick={() => setFormAvatar('')}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all cursor-pointer"
                        >
                          Dùng Icon mặc định
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Emoji Presets */}
                <div className="mt-3 pt-3 border-t border-teal-200/60">
                  <span className="block text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-1.5">
                    Hoặc chọn nhanh biểu tượng hoạt hình:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      '👦',
                      '👧',
                      '🧒',
                      '🧑',
                      '🎒',
                      '🌟',
                      '🦊',
                      '🐼',
                      '🐯',
                      '🚀',
                      '⚽',
                      '🎨',
                      '🎵',
                      '📚',
                      '🏆',
                      '🐱',
                      '🐶',
                      '🦁',
                      '👑',
                      '🦸‍♂️',
                      '🦸‍♀️'
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormAvatar(emoji)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-base hover:scale-110 transition-transform cursor-pointer ${
                          formAvatar === emoji
                            ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-400'
                            : 'bg-white hover:bg-teal-100 border border-teal-200'
                        }`}
                        title={`Chọn biểu tượng ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Giới tính
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'Nam' | 'Nữ' | 'Khác')}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                  >
                    <option value="Nữ">Nữ</option>
                    <option value="Nam">Nam</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số hoa hiện có
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={isNaN(formCoins) ? 0 : formCoins}
                    onChange={(e) => setFormCoins(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Link ảnh trực tiếp (tùy chọn)
                  </label>
                  <input
                    type="url"
                    placeholder="https://... ảnh đại diện trực tuyến"
                    value={formAvatar.startsWith('http') ? formAvatar : ''}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ghi chú về học sinh
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cán sự lớp, năng nổ, cần rèn thêm môn Toán..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="favCheck"
                  checked={formFavorite}
                  onChange={(e) => setFormFavorite(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="favCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Thêm vào nhóm Yêu thích (ưu tiên khi quay thưởng)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  {editingStudent ? 'Cập nhật' : 'Thêm học sinh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Coin/Flower Modal */}
      {coinModalOpen && adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-teal-200">
            <h3 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
              <span className="text-xl">🌺</span>
              <span>
                {adjustSign > 0 ? 'Cộng hoa thưởng cho' : 'Trừ hoa nề nếp của'}: {adjustTarget.name}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ghi nhận bông hoa thi đua vào nhật ký lịch sử của lớp.
            </p>

            <form onSubmit={submitCoinAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Số lượng bông hoa 🌺
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5, 10, 15, 20].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAdjustAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
                        adjustAmount === amt
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-50 hover:bg-rose-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>{adjustSign > 0 ? `+${amt}` : `-${amt}`}</span>
                      <span>🌺</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Môn học / Hoạt động
                </label>
                <select
                  value={adjustSubject}
                  onChange={(e) => setAdjustSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                >
                  {state.subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lý do ghi nhận
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàn thành tốt bài tập, phát biểu bài sôi nổi..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCoinModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-white font-black text-sm shadow-md transition-all ${
                    adjustSign > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  Xác nhận {adjustSign > 0 ? `+${adjustAmount}` : `-${adjustAmount}`} hoa 🌺
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Paste Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-teal-200">
            <h3 className="text-xl font-black text-slate-800 mb-1">Dán danh sách học sinh</h3>
            <p className="text-xs text-slate-500 mb-4">
              Mỗi dòng một tên học sinh. Hệ thống sẽ tự động tạo hồ sơ cho từng em vào lớp{' '}
              {activeClass?.name}.
            </p>

            <form onSubmit={handleBulkPaste} className="space-y-4">
              <textarea
                rows={8}
                required
                placeholder={`Nguyễn Văn A\nTrần Thị B\nLê Văn C\nPhạm Thị D...`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-mono leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  Thêm danh sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Avatar Upload Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-2 border-teal-200 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
                    <Camera className="w-5 h-5" />
                  </span>
                  <h3 className="text-xl font-black text-slate-800">
                    Tải ảnh đại diện hàng loạt
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Chọn cùng lúc nhiều file ảnh chân dung học sinh (theo số thứ tự hoặc tên file).
                  Hệ thống tự động khớp và nén ảnh tối ưu.
                </p>
              </div>
              <button
                onClick={() => {
                  batchItems.forEach((it) => URL.revokeObjectURL(it.previewUrl));
                  setBatchItems([]);
                  setBatchModalOpen(false);
                }}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden file input for batch select */}
            <input
              type="file"
              ref={batchFileInputRef}
              accept="image/*"
              multiple
              onChange={handleBatchFileSelect}
              className="hidden"
            />

            {/* Select files area */}
            <div
              onClick={() => batchFileInputRef.current?.click()}
              className="border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-2xl p-5 bg-teal-50/40 hover:bg-teal-50/80 transition-all text-center cursor-pointer mb-4"
            >
              <Upload className="w-8 h-8 text-teal-600 mx-auto mb-1" />
              <div className="text-sm font-extrabold text-teal-950">
                Bấm vào đây để chọn các file ảnh từ thiết bị
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                (Thầy/Cô có thể đặt tên ảnh như <code>1.jpg</code>, <code>2.jpg</code> theo STT hoặc theo tên như <code>NguyenVanAn.jpg</code>)
              </p>
            </div>

            {/* Match list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4 min-h-[150px]">
              {batchItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                  Chưa chọn ảnh nào. Hãy bấm vùng trên để chọn ảnh học sinh.
                </div>
              ) : (
                batchItems.map((item, idx) => {
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-slate-400 w-5 text-center">
                          #{idx + 1}
                        </span>
                        <img
                          src={item.previewUrl}
                          alt="preview"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-300 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-700 truncate max-w-[140px] sm:max-w-[200px]" title={item.fileName}>
                            {item.fileName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {(item.file.size / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      </div>

                      {/* Match selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-800 hidden sm:inline">
                          Gán cho:
                        </span>
                        <select
                          value={item.matchedStudentId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setBatchItems((prev) =>
                              prev.map((it) =>
                                it.id === item.id ? { ...it, matchedStudentId: newId } : it
                              )
                            );
                          }}
                          className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 max-w-[150px] sm:max-w-[200px]"
                        >
                          <option value="">-- Chưa chọn học sinh --</option>
                          {students.map((s, sIdx) => (
                            <option key={s.id} value={s.id}>
                              {sIdx + 1}. {s.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(item.previewUrl);
                            setBatchItems((prev) => prev.filter((it) => it.id !== item.id));
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white cursor-pointer"
                          title="Bỏ ảnh này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-semibold">
                Đã chọn: <strong>{batchItems.length}</strong> ảnh · Đã ghép:{' '}
                <strong className="text-emerald-600">
                  {batchItems.filter((it) => !!it.matchedStudentId).length}
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    batchItems.forEach((it) => URL.revokeObjectURL(it.previewUrl));
                    setBatchItems([]);
                    setBatchModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  disabled={batchItems.length === 0 || batchProcessing}
                  onClick={handleApplyBatch}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{batchProcessing ? 'Đang xử lý...' : 'Lưu ảnh cho học sinh'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Photo Preview Modal */}
      {previewStudent && (
        <div
          onClick={() => setPreviewStudent(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-teal-200 text-center relative"
          >
            <button
              onClick={() => setPreviewStudent(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex justify-center mb-4 mt-2">
              <Avatar name={previewStudent.name} avatar={previewStudent.avatar} size="2xl" />
            </div>

            <h3 className="text-xl font-black text-slate-800">{previewStudent.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Lớp {activeClass?.name} · {previewStudent.gender || 'Học sinh'}
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 my-3 rounded-full bg-rose-50 border border-rose-200 text-rose-900 font-extrabold text-xs">
              <span>🌺</span>
              <span>{previewStudent.coins || 0} hoa khen thưởng</span>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const s = previewStudent;
                  setPreviewStudent(null);
                  triggerQuickAvatarUpload(s.id);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-all flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Đổi ảnh</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const s = previewStudent;
                  onUpdateState((prev) => ({
                    ...prev,
                    students: prev.students.map((item) =>
                      item.id === s.id ? { ...item, avatar: '' } : item
                    )
                  }));
                  setPreviewStudent(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs cursor-pointer transition-all"
              >
                Gỡ ảnh
              </button>

              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
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
