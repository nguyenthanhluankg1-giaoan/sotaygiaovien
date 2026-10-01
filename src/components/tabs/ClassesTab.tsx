import React, { useState, useRef } from 'react';
import { School, Plus, Users, Edit3, Trash2, CheckCircle2, ArrowRight, Camera, Upload, X, Cloud, RefreshCw } from 'lucide-react';
import { AppState, ClassInfo, UserAccount } from '../../types';
import { uid, compressImageFile } from '../../utils/helpers';

interface ClassesTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onSwitchClass?: (id: string) => void;
  onNavigate?: (page: string) => void;
  currentUser?: UserAccount | null;
  onForceSync?: (updatedState: AppState) => Promise<boolean>;
}

export const ClassesTab: React.FC<ClassesTabProps> = ({
  state,
  onUpdateState,
  onSwitchClass,
  onNavigate,
  currentUser,
  onForceSync
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [formName, setFormName] = useState('');
  const [formGrade, setFormGrade] = useState('Khối 9');
  const [formYear, setFormYear] = useState('2026 - 2027');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formSlogan, setFormSlogan] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openModal = (cls?: ClassInfo) => {
    if (cls) {
      setEditingClass(cls);
      setFormName(cls.name);
      setFormGrade(cls.grade);
      setFormYear(cls.year);
      setFormBannerUrl(cls.bannerUrl || '');
      setFormSlogan(cls.slogan || '');
    } else {
      setEditingClass(null);
      setFormName('');
      setFormGrade('Khối 9');
      setFormYear('2026 - 2027');
      setFormBannerUrl('');
      setFormSlogan('');
    }
    setModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Dung lượng hình ảnh tối đa là 10MB.');
      return;
    }

    try {
      // Compress banner to max 800px width/height to guarantee Firestore document stays well within 1MB limit
      const compressed = await compressImageFile(file, 800, 0.75);
      if (compressed) {
        setFormBannerUrl(compressed);
      }
    } catch (err) {
      console.error('Error compressing banner:', err);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) return;

    let nextState: AppState;

    if (editingClass) {
      const updatedClasses = state.classes.map((c) =>
        c.id === editingClass.id
          ? {
              ...c,
              name: trimmedName,
              grade: formGrade,
              year: formYear,
              bannerUrl: formBannerUrl.trim() || '',
              slogan: formSlogan.trim() || ''
            }
          : c
      );

      nextState = {
        ...state,
        classes: updatedClasses
      };
      onUpdateState(() => nextState);
      showToast(`Đã lưu thay đổi lớp "${trimmedName}" lên Cloud Firestore!`);
    } else {
      const newId = uid('class');
      const newClass: ClassInfo = {
        id: newId,
        name: trimmedName,
        grade: formGrade,
        year: formYear,
        color: '#0d9488',
        bannerUrl: formBannerUrl.trim() || '',
        slogan: formSlogan.trim() || ''
      };

      nextState = {
        ...state,
        classes: [...state.classes, newClass],
        seating: {
          ...state.seating,
          [newId]: { lanes: 4, seats: 16, mode: '2d', assignments: {} }
        },
        activeClassId: newId
      };
      onUpdateState(() => nextState);
      showToast(`Đã tạo thành công lớp "${trimmedName}" và lưu trữ trên Cloud Firestore!`);
    }

    setModalOpen(false);

    // Instant direct sync to Firestore so data is saved immediately
    if (onForceSync) {
      await onForceSync(nextState);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (state.classes.length <= 1) {
      alert('Bạn phải giữ lại ít nhất một lớp học trong hệ thống.');
      return;
    }

    const cls = state.classes.find((c) => c.id === id);
    if (
      !window.confirm(
        `Xóa lớp "${cls?.name}"? Tất cả học sinh và dữ liệu liên quan của lớp này sẽ bị xóa.`
      )
    ) {
      return;
    }

    const remainingClasses = state.classes.filter((c) => c.id !== id);
    const nextActiveId =
      state.activeClassId === id ? remainingClasses[0].id : state.activeClassId;

    const newSeating = { ...state.seating };
    delete newSeating[id];

    const nextState: AppState = {
      ...state,
      classes: remainingClasses,
      students: state.students.filter((s) => s.classId !== id),
      transactions: state.transactions.filter((tx) => tx.classId !== id),
      seating: newSeating,
      activeClassId: nextActiveId
    };

    onUpdateState(() => nextState);
    showToast(`Đã xóa lớp "${cls?.name}" và cập nhật lên Cloud Firestore.`);

    if (onForceSync) {
      await onForceSync(nextState);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
              <School className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800">Quản lý Danh sách Lớp học</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tạo thêm các lớp giảng dạy mới hoặc chuyển đổi nhanh giữa các lớp. Dữ liệu được lưu trữ trực tuyến trên Firebase.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs shadow-2xs"
            title="Dữ liệu lớp học được tự động lưu và đồng bộ tức thì lên Cloud Firestore"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tự động lưu Cloud</span>
          </div>

          <button
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md shadow-teal-600/20 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo lớp học mới</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Grid of classes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.classes.map((cls) => {
          const studentCount = state.students.filter((s) => s.classId === cls.id).length;
          const isActive = cls.id === state.activeClassId;

          return (
            <div
              key={cls.id}
              className={`p-5 rounded-3xl bg-white border-2 transition-all duration-200 shadow-md hover:shadow-lg flex flex-col justify-between ${
                isActive ? 'border-teal-500 ring-2 ring-teal-200' : 'border-teal-100'
              }`}
            >
              <div className="overflow-hidden">
                {cls.bannerUrl ? (
                  <div className="relative h-28 -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-3xl bg-slate-900">
                    <img
                      src={cls.bannerUrl}
                      alt={cls.name}
                      className="w-full h-full object-cover"
                    />
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Đang chọn
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-400 text-white font-black text-lg flex items-center justify-center shadow-md shadow-teal-600/20">
                      {cls.name}
                    </div>
                    {isActive && (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Lớp đang chọn
                      </span>
                    )}
                  </div>
                )}

                <h3 className="text-xl font-black text-slate-800 mt-2">{cls.name}</h3>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                  {cls.grade} · Niên khóa {cls.year}
                </div>
                {cls.slogan && (
                  <p className="text-xs italic text-teal-700 font-medium mt-1 truncate">
                    "{cls.slogan}"
                  </p>
                )}

                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>{studentCount} học sinh</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    if (onSwitchClass) {
                      onSwitchClass(cls.id);
                    } else {
                      onUpdateState((prev) => ({ ...prev, activeClassId: cls.id }));
                    }
                    if (onNavigate) {
                      onNavigate('home');
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                      : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                  }`}
                >
                  <span>{isActive ? 'Đang mở' : 'Vào lớp này'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => openModal(cls)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition-colors"
                  title="Chỉnh sửa thông tin lớp"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteClass(cls.id)}
                  className="p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Xóa lớp học"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-teal-200">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              {editingClass ? 'Chỉnh sửa thông tin lớp' : 'Tạo lớp học mới'}
            </h3>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên lớp học *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 9/1, 6A, 12 chuyên Tin..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Khối lớp
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={`Khối ${g}`}>
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Niên khóa
                  </label>
                  <input
                    type="text"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md shadow-teal-600/20"
                >
                  {editingClass ? 'Cập nhật' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
