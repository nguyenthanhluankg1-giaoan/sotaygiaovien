import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Upload, Check, Eye, Maximize2 } from 'lucide-react';
import { ClassInfo } from '../types';

interface ClassBannerBarProps {
  activeClass?: ClassInfo | null;
  onUpdateClass: (classId: string, updates: Partial<ClassInfo>) => void;
  studentCount: number;
  teacherName: string;
  onNavigate: (page: string) => void;
}

export const ClassBannerBar: React.FC<ClassBannerBarProps> = ({
  activeClass,
  onUpdateClass,
  studentCount: _studentCount,
  teacherName: _teacherName,
  onNavigate
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewFullImage, setViewFullImage] = useState(false);
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formHideText, setFormHideText] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If no class is configured or available, show a friendly prompt to add or select a class
  if (!activeClass) {
    return (
      <div
        id="class-banner-empty-container"
        className="relative w-full rounded-3xl overflow-hidden border-2 border-teal-200/80 p-6 sm:p-8 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-teal-900/5"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black">Chưa chọn lớp học</h3>
            <p className="text-xs sm:text-sm text-teal-100 mt-0.5">
              Hãy tạo lớp học mới hoặc chọn một lớp từ danh sách để quản lý hình ảnh và dữ liệu thi đua.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('classes')}
          className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer hover:scale-105"
        >
          <Camera className="w-4 h-4 text-amber-900" />
          <span>Đến quản lý lớp</span>
        </button>
      </div>
    );
  }

  // Default to hiding text on banner if user hasn't set it, or if set to true
  const isTextHidden = activeClass.hideBannerText !== false;

  const openModal = () => {
    setFormBannerUrl(activeClass.bannerUrl || '');
    setFormHideText(activeClass.hideBannerText !== false);
    setModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Dung lượng hình ảnh tối đa là 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormBannerUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateClass(activeClass.id, {
      bannerUrl: formBannerUrl.trim() || undefined,
      hideBannerText: formHideText
    });
    setModalOpen(false);
  };

  return (
    <>
      {/* Main Banner Bar Component */}
      <div
        id="class-banner-container"
        className="relative w-full rounded-3xl overflow-hidden border-2 border-teal-200/80 shadow-lg shadow-teal-900/5 group transition-all"
      >
        {activeClass.bannerUrl ? (
          /* When class banner image exists: Display image clearly without dark obscure overlays or blocking texts */
          <div className="relative w-full h-52 sm:h-64 md:h-72 lg:h-80 bg-slate-900 overflow-hidden flex items-center justify-center">
            <img
              src={activeClass.bannerUrl}
              alt={`Hình ảnh tập thể Lớp ${activeClass.name}`}
              className="w-full h-full object-cover object-center select-none"
            />

            {/* If text is not hidden (optional legacy mode), render subtle text, otherwise keep completely clear */}
            {!isTextHidden && (
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                <h2 className="text-xl sm:text-2xl font-black drop-shadow-md">
                  Lớp {activeClass.name} {activeClass.year ? `(${activeClass.year})` : ''}
                </h2>
                {activeClass.slogan && (
                  <p className="text-xs sm:text-sm text-teal-100 italic mt-0.5 drop-shadow">
                    "{activeClass.slogan}"
                  </p>
                )}
              </div>
            )}

            {/* Subtle floating control badge in the top right corner - doesn't block the photo */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <button
                type="button"
                onClick={() => setViewFullImage(true)}
                className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900/85 backdrop-blur-md border border-white/20 text-white shadow-md transition-all hover:scale-105 cursor-pointer"
                title="Xem hình ảnh phóng to"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={openModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900/85 backdrop-blur-md border border-white/20 text-xs font-extrabold text-white shadow-md transition-all hover:scale-105 cursor-pointer"
                title="Đổi hoặc chỉnh sửa ảnh banner lớp"
              >
                <Camera className="w-3.5 h-3.5 text-amber-300" />
                <span>Đổi ảnh</span>
              </button>
            </div>
          </div>
        ) : (
          /* Placeholder when no class photo has been uploaded yet */
          <div className="relative w-full p-6 sm:p-8 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <ImageIcon className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black">
                  Ảnh tập thể Lớp {activeClass.name}
                </h3>
                <p className="text-xs sm:text-sm text-teal-100 mt-0.5">
                  Tải ảnh kỷ niệm, hoạt động hoặc ảnh chụp tập thể để làm hình nền lớp học rõ nét.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openModal}
              className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer hover:scale-105"
            >
              <Camera className="w-4 h-4 text-amber-900" />
              <span>Tải ảnh lớp học</span>
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {viewFullImage && activeClass.bannerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setViewFullImage(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewFullImage(false)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeClass.bannerUrl}
              alt={`Lớp ${activeClass.name}`}
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/15"
            />
            <div className="mt-3 text-center text-xs font-semibold text-slate-300">
              Hình ảnh tập thể Lớp {activeClass.name}
            </div>
          </div>
        </div>
      )}

      {/* Banner Configuration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-teal-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <ImageIcon className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-800">
                  Cài Đặt Banner Lớp {activeClass.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Image Upload Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tải lên ảnh chụp tập thể lớp học
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="relative h-44 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 hover:border-teal-500 transition-all overflow-hidden flex flex-col items-center justify-center p-3 text-center">
                  {formBannerUrl ? (
                    <>
                      <img
                        src={formBannerUrl}
                        alt="Preview banner"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-white text-slate-900 font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
                        >
                          <Upload className="w-3.5 h-3.5 text-teal-600" />
                          <span>Thay ảnh khác</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormBannerUrl('')}
                          className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Xóa ảnh</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-700">
                          Bấm để chọn file ảnh chụp lớp học từ máy tính
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Định dạng PNG, JPG, WEBP (Tối đa 8MB)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Chọn hình ảnh</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Option to hide/show text over banner */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-teal-700" />
                    <span>Tắt dòng chữ trên banner</span>
                  </div>
                  <p className="text-[11px] text-teal-700 font-medium">
                    Giữ hình ảnh tập thể rõ nét, không bị chữ và nền tối che khuất hình
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formHideText}
                    onChange={(e) => setFormHideText(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu cài đặt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
