import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  RotateCcw,
  Download,
  Upload,
  Search,
  Filter,
  Save,
  X,
  BookOpen,
  AlertTriangle,
  FileSpreadsheet,
  FileDown,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PpctItem } from '../types';
import { defaultPpctList } from '../data/defaultData';
import { getSubSubjectsByGradeAndSubject } from '../utils/curriculum';

interface PpctManagerProps {
  ppctList: PpctItem[];
  onUpdatePpctList: (list: PpctItem[]) => void;
  onResetPpctList: () => void;
  teacherType?: 'GVCN' | 'GVBM';
}

export const PpctManager: React.FC<PpctManagerProps> = ({
  ppctList,
  onUpdatePpctList,
  onResetPpctList,
  teacherType = 'GVCN'
}) => {
  const isGvcn = teacherType === 'GVCN';
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedSubSubject, setSelectedSubSubject] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isAddingOrEditing, setIsAddingOrEditing] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PpctItem | null>(null);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  // Form state for add/edit
  const [formGrade, setFormGrade] = useState<number>(3);
  const [formSubject, setFormSubject] = useState<string>('Tiếng Việt');
  const [formSubSubject, setFormSubSubject] = useState<string>('Đọc (Tập đọc)');
  const [formWeek, setFormWeek] = useState<number>(1);
  const [formPeriodIndex, setFormPeriodIndex] = useState<number>(1);
  const [formLessonName, setFormLessonName] = useState<string>('');
  const [formIntegrationNote, setFormIntegrationNote] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Dynamically compute sub-subjects based on grade and subject
  const availableSubSubjects = useMemo(() => {
    return getSubSubjectsByGradeAndSubject(formGrade, formSubject);
  }, [formGrade, formSubject]);

  const availableFilterSubSubjects = useMemo(() => {
    if (selectedSubject === 'all') {
      const set = new Set<string>();
      ppctList.forEach((item) => {
        if (item.subSubject) set.add(item.subSubject);
      });
      return Array.from(set).sort();
    }
    return getSubSubjectsByGradeAndSubject(selectedGrade !== 'all' ? Number(selectedGrade) : 3, selectedSubject);
  }, [ppctList, selectedGrade, selectedSubject]);

  const grades = useMemo(() => {
    const set = new Set<string>();
    ppctList.forEach((item) => set.add(String(item.grade)));
    return Array.from(set).sort();
  }, [ppctList]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    ppctList.forEach((item) => set.add(item.subject));
    return Array.from(set).sort();
  }, [ppctList]);

  // Filtered list
  const filteredList = useMemo(() => {
    return ppctList.filter((item) => {
      const matchGrade = selectedGrade === 'all' || String(item.grade) === selectedGrade;
      const matchSubject = selectedSubject === 'all' || item.subject === selectedSubject;
      const matchSubSubject = selectedSubSubject === 'all' || item.subSubject === selectedSubSubject;
      const matchKeyword =
        !searchKeyword ||
        item.lessonName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (item.subSubject && item.subSubject.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (item.integrationNote && item.integrationNote.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchKeyword.toLowerCase()));
      return matchGrade && matchSubject && matchSubSubject && matchKeyword;
    }).sort((a, b) => {
      if (Number(a.grade) !== Number(b.grade)) return Number(a.grade) - Number(b.grade);
      if (a.week !== b.week) return a.week - b.week;
      return a.periodIndex - b.periodIndex;
    });
  }, [ppctList, selectedGrade, selectedSubject, selectedSubSubject, searchKeyword]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    const gr = selectedGrade !== 'all' ? Number(selectedGrade) : 3;
    const sj = selectedSubject !== 'all' ? selectedSubject : 'Tiếng Việt';
    setFormGrade(gr);
    setFormSubject(sj);
    const subs = getSubSubjectsByGradeAndSubject(gr, sj);
    setFormSubSubject(subs[0] || '');
    setFormWeek(1);
    setFormPeriodIndex(1);
    setFormLessonName('');
    setFormIntegrationNote('');
    setFormNotes('');
    setIsAddingOrEditing(true);
  };

  const handleOpenEditModal = (item: PpctItem) => {
    setEditingItem(item);
    setFormGrade(Number(item.grade));
    setFormSubject(item.subject);
    setFormSubSubject(item.subSubject || '');
    setFormWeek(item.week);
    setFormPeriodIndex(item.periodIndex);
    setFormLessonName(item.lessonName);
    setFormIntegrationNote(item.integrationNote || '');
    setFormNotes(item.notes || '');
    setIsAddingOrEditing(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLessonName.trim()) return;

    if (editingItem) {
      // Edit existing
      const updated = ppctList.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              grade: formGrade,
              subject: formSubject,
              subSubject: formSubSubject.trim(),
              week: formWeek,
              periodIndex: formPeriodIndex,
              lessonName: formLessonName,
              integrationNote: formIntegrationNote,
              notes: formNotes
            }
          : item
      );
      onUpdatePpctList(updated);
    } else {
      // Add new
      const newItem: PpctItem = {
        id: `ppct-${Date.now()}`,
        grade: formGrade,
        subject: formSubject,
        subSubject: formSubSubject.trim(),
        week: formWeek,
        periodIndex: formPeriodIndex,
        lessonName: formLessonName,
        integrationNote: formIntegrationNote,
        notes: formNotes
      };
      onUpdatePpctList([...ppctList, newItem]);
    }

    setIsAddingOrEditing(false);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tiết phân phối chương trình này?')) {
      onUpdatePpctList(ppctList.filter((item) => item.id !== id));
    }
  };

  const handleClearAllPpct = () => {
    onUpdatePpctList([]);
    setShowClearModal(false);
  };

  const handleClearFilteredPpct = () => {
    const filteredIds = new Set(filteredList.map((item) => item.id));
    onUpdatePpctList(ppctList.filter((item) => !filteredIds.has(item.id)));
    setShowClearModal(false);
  };

  const handleDownloadSampleExcel = () => {
    const sampleRows = isGvcn
      ? [
          {
            'STT': 1,
            'Khối lớp': 3,
            'Môn học': 'Tiếng Việt',
            'Phân môn': 'Đọc (Tập đọc)',
            'Tuần': 1,
            'Tiết theo PPCT': 1,
            'Tên bài dạy': 'Bài 1. Mùa thu của em (Tiết 1 - Đọc)',
            'Nội dung tích hợp / Điều chỉnh': '[NLS] Đọc diễn cảm bài thơ mùa thu',
            'Ghi chú': 'Chủ đề 1. Cổng trường mở ra'
          },
          {
            'STT': 2,
            'Khối lớp': 3,
            'Môn học': 'Tiếng Việt',
            'Phân môn': 'Luyện từ và câu (LTVC)',
            'Tuần': 1,
            'Tiết theo PPCT': 2,
            'Tên bài dạy': 'Bài 1. Mùa thu của em (Tiết 2 - LTVC: Từ ngữ chỉ sự vật)',
            'Nội dung tích hợp / Điều chỉnh': 'Thực hành mở rộng vốn từ',
            'Ghi chú': 'Luyện tập'
          }
        ]
      : [
          {
            'STT': 1,
            'Khối lớp': 3,
            'Môn học': 'Tin học',
            'Tuần': 1,
            'Tiết theo PPCT': 1,
            'Tên bài dạy': 'Bài 1. Thông tin và quyết định (Tiết 1)',
            'Nội dung tích hợp / Điều chỉnh': '[CĐS] Nhận biết thông tin số',
            'Ghi chú': 'Tiết 1'
          },
          {
            'STT': 2,
            'Khối lớp': 3,
            'Môn học': 'Tin học',
            'Tuần': 1,
            'Tiết theo PPCT': 2,
            'Tên bài dạy': 'Bài 1. Thông tin và quyết định (Tiết 2)',
            'Nội dung tích hợp / Điều chỉnh': '[STEM] Thực hành thiết kế sản phẩm số',
            'Ghi chú': 'Tiết 2'
          }
        ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 10 },
      { wch: 18 },
      ...(isGvcn ? [{ wch: 22 }] : []),
      { wch: 8 },
      { wch: 16 },
      { wch: 45 },
      { wch: 45 },
      { wch: 25 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Phan_Phoi_Chuong_Trinh');
    XLSX.writeFile(workbook, 'Mau_Phan_Phoi_Chuong_Trinh_Excel.xlsx');
  };

  const handleExportExcel = () => {
    const data = filteredList.map((item, idx) => {
      const row: any = {
        STT: idx + 1,
        'Khối lớp': item.grade,
        'Môn học': item.subject
      };
      if (isGvcn) {
        row['Phân môn'] = item.subSubject || '';
      }
      row['Tuần'] = item.week;
      row['Tiết theo PPCT'] = item.periodIndex;
      row['Tên bài dạy'] = item.lessonName;
      row['Nội dung tích hợp / Điều chỉnh'] = item.integrationNote || '';
      row['Ghi chú'] = item.notes || '';
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PPCT');
    XLSX.writeFile(workbook, `Phan_Phoi_Chuong_Trinh_${selectedGrade !== 'all' ? `Khoi_${selectedGrade}` : 'TatCa'}.xlsx`);
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

        const newItems: PpctItem[] = rows.map((r, i) => {
          const rawGrade = parseInt(r['Khối lớp'] || r['Khoi'] || r['Grade'] || '3', 10);
          const grade = isNaN(rawGrade) ? 3 : rawGrade;

          const rawWeek = parseInt(r['Tuần'] || r['Tuan'] || r['Week'] || '1', 10);
          const week = isNaN(rawWeek) ? 1 : rawWeek;

          const rawPeriodIndex = parseInt(r['Tiết theo PPCT'] || r['Tiet'] || r['Period'] || String(i + 1), 10);
          const periodIndex = isNaN(rawPeriodIndex) ? i + 1 : rawPeriodIndex;

          return {
            id: `ppct-import-${Date.now()}-${i}`,
            grade,
            subject: (r['Môn học'] || r['Mon'] || r['Subject'] || 'Tiếng Việt').toString().trim(),
            subSubject: (r['Phân môn'] || r['Phân Môn'] || r['SubSubject'] || '').toString().trim(),
            week,
            periodIndex,
            lessonName: (r['Tên bài dạy'] || r['BaiDay'] || r['Lesson'] || `Bài học ${i + 1}`).toString().trim(),
            integrationNote: (r['Nội dung tích hợp / Điều chỉnh'] || r['TichHop'] || '').toString().trim(),
            notes: (r['Ghi chú'] || r['GhiChu'] || '').toString().trim()
          };
        });

        onUpdatePpctList(newItems);
        alert(`Đã cập nhật mới toàn bộ ${newItems.length} tiết PPCT từ file Excel (đã thay thế toàn bộ dữ liệu cũ)!`);
      } catch (err) {
        console.error('Import error:', err);
        alert('Lỗi đọc file Excel. Vui lòng kiểm tra lại định dạng!');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header card with filters and action buttons */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border-2 border-teal-200/80 shadow-lg shadow-teal-900/5 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-800">
                  {isGvcn ? 'Phân Phối Chương Trình Lớp Chủ Nhiệm' : 'Phân Phối Chương Trình Giảng Dạy'}
                </h2>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  isGvcn ? 'bg-teal-100 text-teal-900 border-teal-300' : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                }`}>
                  {isGvcn ? 'DÀNH CHO GVCN' : 'DÀNH CHO GVBM'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {isGvcn
                  ? 'Quản lý danh mục bài dạy, phân môn (Đọc, LTVC, Tập làm văn, Lịch sử, Địa lí...) & tích hợp của Giáo viên chủ nhiệm.'
                  : 'Quản lý tiến trình bài dạy, tuần học, số tiết và nội dung tích hợp của Giáo viên bộ môn.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm tiết PPCT</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSampleExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-all cursor-pointer"
              title="Tải tệp Excel mẫu để nhập dữ liệu bài dạy nhanh chóng"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Tải file mẫu Excel</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
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
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              disabled={ppctList.length === 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ppctList.length === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs'
              }`}
              title="Xóa toàn bộ danh sách phân phối chương trình"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Xóa toàn bộ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Khôi phục danh sách PPCT mẫu ban đầu?')) {
                  onResetPpctList();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all cursor-pointer"
              title="Khôi phục dữ liệu mẫu chuẩn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Khôi phục mẫu</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isGvcn ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isGvcn ? 'Tìm bài dạy, phân môn, tích hợp...' : 'Tìm bài dạy, nội dung tích hợp...'}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setSelectedSubSubject('all');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="all">Tất cả khối lớp</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedSubSubject('all');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="all">Tất cả môn học</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    Môn {s}
                  </option>
                ))}
              </select>
            </div>

            {isGvcn && (
              <div>
                <select
                  value={selectedSubSubject}
                  onChange={(e) => setSelectedSubSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-teal-300 text-xs font-bold text-teal-900 bg-teal-50/60 focus:outline-none focus:border-teal-500"
                >
                  <option value="all">Tất cả phân môn (GVCN)</option>
                  {availableFilterSubSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      Phân môn: {sub}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Sub-subject Filter Chips for GVCN */}
          {isGvcn && availableFilterSubSubjects.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-black text-teal-800 uppercase tracking-tight flex items-center gap-1">
                <Layers className="w-3 h-3 text-teal-600" />
                <span>Lọc Phân môn GVCN:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubSubject('all')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                  selectedSubSubject === 'all'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                    : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-200'
                }`}
              >
                Tất cả ({filteredList.length})
              </button>
              {availableFilterSubSubjects.map((sub) => {
                const isSel = selectedSubSubject === sub;
                const count = ppctList.filter(
                  (item) =>
                    (selectedGrade === 'all' || String(item.grade) === selectedGrade) &&
                    (selectedSubject === 'all' || item.subject === selectedSubject) &&
                    item.subSubject === sub
                ).length;

                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubSubject(sub)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                      isSel
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {sub} {count > 0 ? `(${count})` : ''}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PPCT Table */}
      <div className="bg-white rounded-3xl border-2 border-teal-200/80 shadow-lg shadow-teal-900/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-teal-50/90 text-slate-800 border-b-2 border-teal-200 font-black text-center">
                <th className="py-3 px-3 w-16">KHỐI</th>
                <th className="py-3 px-3 w-28">MÔN HỌC</th>
                {isGvcn && <th className="py-3 px-3 w-36">PHÂN MÔN (GVCN)</th>}
                <th className="py-3 px-2 w-16">TUẦN</th>
                <th className="py-3 px-2 w-16">TIẾT</th>
                <th className="py-3 px-4 text-left">TÊN BÀI DẠY</th>
                <th className="py-3 px-4 text-left">TÍCH HỢP / ĐIỀU CHỈNH</th>
                <th className="py-3 px-3 w-24 text-left">GHI CHÚ</th>
                <th className="py-3 px-3 w-20 text-center">TÁC VỤ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {ppctList.length === 0 ? (
                <tr>
                  <td colSpan={isGvcn ? 9 : 8} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center border border-rose-100 shadow-xs">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        Danh sách Phân phối chương trình hiện đang trống
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Thầy/cô có thể thêm bài dạy mới, nạp danh sách từ file Excel hoặc bấm nút khôi phục lại dữ liệu mẫu chuẩn.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleOpenAddModal}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm bài dạy</span>
                        </button>
                        <label className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
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
                          onClick={() => {
                            if (window.confirm('Khôi phục danh sách PPCT mẫu ban đầu?')) {
                              onResetPpctList();
                            }
                          }}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Khôi phục mẫu</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={isGvcn ? 9 : 8} className="py-12 text-center text-slate-400">
                    Không tìm thấy bài dạy nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-teal-800">
                      Khối {item.grade}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {item.subject}
                    </td>
                    {isGvcn && (
                      <td className="py-3 px-3 text-center">
                        {item.subSubject ? (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-300 inline-block shadow-2xs">
                            {item.subSubject}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-2 text-center font-bold text-slate-600">
                      T{item.week}
                    </td>
                    <td className="py-3 px-2 text-center font-black text-slate-900">
                      {item.periodIndex}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.lessonName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {item.integrationNote ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          {item.integrationNote}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {item.notes || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 rounded-lg text-teal-600 hover:bg-teal-100 transition-colors cursor-pointer"
                          title="Sửa bài dạy"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddingOrEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-teal-100 overflow-hidden">
            <div className="px-6 py-4 bg-teal-600 text-white flex items-center justify-between">
              <h3 className="font-black text-sm">
                {editingItem ? 'Chỉnh sửa tiết PPCT' : 'Thêm mới tiết PPCT'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingOrEditing(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Khối lớp
                  </label>
                  <select
                    value={isNaN(formGrade) ? 3 : formGrade}
                    onChange={(e) => {
                      const newG = parseInt(e.target.value, 10) || 3;
                      setFormGrade(newG);
                      const subs = getSubSubjectsByGradeAndSubject(newG, formSubject);
                      if (subs.length > 0) setFormSubSubject(subs[0]);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Khối {g} (Tiểu học)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Môn học
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => {
                      const newS = e.target.value;
                      setFormSubject(newS);
                      const subs = getSubSubjectsByGradeAndSubject(formGrade, newS);
                      setFormSubSubject(subs[0] || '');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    {[
                      'Tiếng Việt',
                      'Toán',
                      'Tự nhiên và Xã hội',
                      'Khoa học',
                      'Lịch sử và Địa lí',
                      'Đạo đức',
                      'Tiếng Anh',
                      'Tin học và Công nghệ',
                      'Nghệ thuật',
                      'Giáo dục thể chất',
                      'Hoạt động trải nghiệm'
                    ].map((subj) => (
                      <option key={subj} value={subj}>
                        Môn {subj}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phân môn selector based on Grade & Subject (Chỉ hiển thị đối với GVCN khi có phân môn) */}
              {isGvcn && (availableSubSubjects.length > 0 || formSubject === 'Tiếng Việt') && (
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <span>Phân môn (Môn Tiếng Việt)</span>
                    </label>
                    <span className="text-[10px] text-teal-700 font-bold">
                      Khối {formGrade} • Môn {formSubject}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formSubSubject}
                      onChange={(e) => setFormSubSubject(e.target.value)}
                      placeholder="Chọn hoặc nhập tên phân môn (ví dụ: Tập đọc, LTVC, Tập làm văn...)"
                      className="w-full px-3 py-2 rounded-xl border border-teal-300 text-xs font-bold text-slate-800 bg-white"
                    />

                    {availableSubSubjects.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 mb-1">
                          Bấm chọn phân môn tương ứng của Khối {formGrade}:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {availableSubSubjects.map((sub) => {
                            const isSel = formSubSubject === sub;
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => setFormSubSubject(sub)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  isSel
                                    ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                    : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {sub}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tuần (1 - 35)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={35}
                    value={isNaN(formWeek) ? '' : formWeek}
                    onChange={(e) => setFormWeek(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tiết theo PPCT
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={isNaN(formPeriodIndex) ? '' : formPeriodIndex}
                    onChange={(e) => setFormPeriodIndex(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tên bài dạy
                </label>
                <textarea
                  rows={2}
                  value={formLessonName}
                  onChange={(e) => setFormLessonName(e.target.value)}
                  placeholder="Nhập tên bài dạy..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nội dung tích hợp / Điều chỉnh
                </label>
                <input
                  type="text"
                  value={formIntegrationNote}
                  onChange={(e) => setFormIntegrationNote(e.target.value)}
                  placeholder="STEM, chuyển đổi số, GDQP..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Chủ đề A, thực hành phòng máy..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingOrEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu tiết dạy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <h3 className="font-black text-sm sm:text-base">
                  Xác nhận xóa phân phối chương trình
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed">
                <p className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Cảnh báo hành động xóa dữ liệu</span>
                </p>
                <p>
                  Thao tác này sẽ xóa dữ liệu các tiết phân phối chương trình. Thầy/cô có thể dùng nút <strong className="text-rose-950 font-black">"Khôi phục mẫu"</strong> hoặc <strong className="text-rose-950 font-black">"Nhập Excel"</strong> bất cứ khi nào để nạp lại dữ liệu.
                </p>
              </div>

              <div className="text-xs text-slate-700 space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex justify-between font-semibold">
                  <span>Tổng số tiết hiện có:</span>
                  <span className="font-black text-slate-900">{ppctList.length} tiết</span>
                </div>
                {(selectedGrade !== 'all' || selectedSubject !== 'all' || searchKeyword) && (
                  <div className="flex justify-between font-semibold text-teal-800">
                    <span>Số tiết đang lọc hiển thị:</span>
                    <span className="font-black">{filteredList.length} tiết</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                {/* Nếu đang lọc thì cho tùy chọn chỉ xóa phần đang lọc */}
                {(selectedGrade !== 'all' || selectedSubject !== 'all' || searchKeyword) && filteredList.length > 0 && filteredList.length < ppctList.length && (
                  <button
                    type="button"
                    onClick={handleClearFilteredPpct}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4 text-amber-700" />
                    <span>Chỉ xóa {filteredList.length} tiết đang lọc</span>
                  </button>
                )}

                {/* Xóa sạch toàn bộ */}
                <button
                  type="button"
                  onClick={handleClearAllPpct}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa sạch toàn bộ ({ppctList.length} tiết)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="w-full py-2 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy thao tác
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
