import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  QrCode,
  Edit3,
  Upload,
  Check,
  Copy,
  Save,
  Sparkles,
  ExternalLink,
  Trash2,
  PhoneCall
} from 'lucide-react';
import { ContactInfo, UserAccount } from '../types';
import { compressImageFile } from '../utils/helpers';
import { saveContactInfoToFirestore } from '../services/dbService';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  contactInfo: ContactInfo;
  onUpdateContactInfo: (info: ContactInfo) => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  contactInfo,
  onUpdateContactInfo
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [isEditing, setIsEditing] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState<ContactInfo>(contactInfo);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullQr, setShowFullQr] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 600, 0.88);
        setEditForm((prev) => ({ ...prev, qrCode: compressed }));
      } catch (err) {
        console.error('Lỗi nén ảnh QR Code:', err);
      }
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const updated: ContactInfo = {
      ...editForm,
      updatedAt: new Date().toISOString()
    };
    const ok = await saveContactInfoToFirestore(updated);
    onUpdateContactInfo(updated);
    setIsSaving(false);
    setIsEditing(false);
    if (!ok) {
      alert('Đã lưu thông tin liên hệ cục bộ!');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-teal-200/90 w-full max-w-lg my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-white/20 backdrop-blur-sm text-amber-300">
              <PhoneCall className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight">
                {isEditing ? 'Cấu Hình Thông Tin Liên Hệ & QR Code' : (contactInfo.title || 'Thông Tin Liên Hệ & Gia Hạn')}
              </h3>
              <p className="text-[11px] text-teal-100 font-medium">
                {isAdmin
                  ? 'Trang quản trị: Cập nhật thông tin hỗ trợ & Mã QR cho tất cả người dùng'
                  : 'Liên hệ Admin / Ban Giám Hiệu để đăng ký cấp phép hoặc gia hạn tài khoản'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {isEditing ? (
            /* ADMIN EDIT FORM */
            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Nội dung và Mã QR được thiết lập ở đây sẽ tự động hiển thị cho <strong>tất cả các tài khoản giáo viên</strong> trong hệ thống.
                </span>
              </div>

              {/* QR CODE UPLOAD SECTION */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
                  Hình ảnh mã QR Code (Zalo / Chuyển khoản Banking)
                </label>
                <div className="p-4 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/50 text-center space-y-3">
                  {editForm.qrCode ? (
                    <div className="relative inline-block group">
                      <img
                        src={editForm.qrCode}
                        alt="Mã QR preview"
                        className="w-44 h-44 object-contain rounded-2xl border-2 border-white shadow-md mx-auto bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, qrCode: '' }))}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-all cursor-pointer"
                        title="Xóa ảnh QR này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-3 text-slate-500 space-y-1">
                      <QrCode className="w-10 h-10 text-teal-600 mx-auto opacity-70" />
                      <p className="text-xs font-bold text-slate-700">Chưa có ảnh mã QR Code</p>
                      <p className="text-[11px]">Tải lên hình ảnh QR Zalo, ngân hàng hoặc thông tin liên hệ</p>
                    </div>
                  )}

                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all">
                      <Upload className="w-4 h-4" />
                      <span>{editForm.qrCode ? 'Thay ảnh mã QR mới' : 'Tải lên ảnh Mã QR'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* TITLE INPUT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề khung liên hệ
                </label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Ví dụ: Thông Tin Liên Hệ Gia Hạn & Hỗ Trợ Kỹ Thuật"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-xs font-bold text-slate-800 outline-none"
                />
              </div>

              {/* PHONE & ZALO INPUTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="text"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="Ví dụ: 0912 345 678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-xs font-bold font-mono text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số / Link Zalo hỗ trợ
                  </label>
                  <input
                    type="text"
                    value={editForm.zalo || ''}
                    onChange={(e) => setEditForm({ ...editForm, zalo: e.target.value })}
                    placeholder="Ví dụ: 0912 345 678 hoặc https://zalo.me/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-xs font-bold font-mono text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* NOTE / INSTRUCTIONS TEXTAREA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung hướng dẫn & Ghi chú gia hạn
                </label>
                <textarea
                  rows={3}
                  value={editForm.note || ''}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="Mô tả cú pháp chuyển khoản, thông tin tài khoản hoặc hướng dẫn liên hệ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-xs font-medium text-slate-800 outline-none resize-none"
                />
              </div>

              {/* BUTTONS */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditForm(contactInfo);
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu Thông Tin Liên Hệ'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* USER DISPLAY VIEW */
            <div className="space-y-5">
              {/* QR CODE SECTION */}
              {contactInfo.qrCode ? (
                <div className="p-4 rounded-3xl bg-gradient-to-b from-teal-50/90 to-emerald-50/70 border-2 border-teal-200/80 text-center space-y-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-teal-900 bg-teal-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    <QrCode className="w-3.5 h-3.5 text-teal-700" />
                    Quét Mã QR Nhắn Zalo / Chuyển Khoản
                  </span>
                  
                  <div className="relative group inline-block">
                    <img
                      src={contactInfo.qrCode}
                      alt="Mã QR Liên Hệ"
                      onClick={() => setShowFullQr(true)}
                      className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-2xl border-4 border-white shadow-xl mx-auto bg-white cursor-pointer hover:scale-105 transition-transform"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFullQr(true)}
                      className="mt-1 text-[11px] font-bold text-teal-700 hover:underline block mx-auto cursor-pointer"
                    >
                      🔍 Phóng to mã QR
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-center text-amber-900 text-xs font-medium space-y-1">
                  <QrCode className="w-8 h-8 text-amber-600 mx-auto opacity-80" />
                  <p className="font-bold">Mã QR Code chưa được cập nhật</p>
                  <p className="text-[11px]">Thầy/Cô vui lòng liên hệ trực tiếp qua Số điện thoại hoặc Zalo bên dưới.</p>
                </div>
              )}

              {/* CONTACT DETAILS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PHONE CARD */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Số Điện Thoại
                      </span>
                      <strong className="text-sm font-black font-mono text-slate-800">
                        {contactInfo.phone || 'Chưa cập nhật'}
                      </strong>
                    </div>
                  </div>

                  {contactInfo.phone && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(contactInfo.phone || '', 'phone')}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedField === 'phone' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`tel:${contactInfo.phone}`}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Gọi</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* ZALO CARD */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Tài Khoản Zalo
                      </span>
                      <strong className="text-sm font-black font-mono text-slate-800 truncate block max-w-[150px]">
                        {contactInfo.zalo || 'Chưa cập nhật'}
                      </strong>
                    </div>
                  </div>

                  {contactInfo.zalo && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(contactInfo.zalo || '', 'zalo')}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedField === 'zalo' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-blue-700">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>

                      <a
                        href={
                          contactInfo.zalo.startsWith('http')
                            ? contactInfo.zalo
                            : `https://zalo.me/${contactInfo.zalo.replace(/\s+/g, '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở Zalo</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* NOTE / INSTRUCTIONS BOX */}
              {contactInfo.note && (
                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-teal-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-teal-900">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Hướng dẫn gia hạn & Thông tin:</span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-line text-slate-700 font-medium">
                    {contactInfo.note}
                  </p>
                </div>
              )}

              {/* ADMIN EDIT TRIGGER BUTTON */}
              {isAdmin && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-700">
                    👑 Bấm nút bên phải để cập nhật QR Code & SĐT cho cả hệ thống
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm(contactInfo);
                      setIsEditing(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-700" />
                    <span>Cấu hình QR / SĐT</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FULL ZOOM QR CODE MODAL */}
      {showFullQr && contactInfo.qrCode && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-4 rounded-3xl max-w-md w-full text-center space-y-3 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowFullQr(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="font-extrabold text-slate-800 text-sm">Mã QR Code - Phóng To</h4>
            <img
              src={contactInfo.qrCode}
              alt="Mã QR Phóng To"
              className="w-full max-h-[70vh] object-contain rounded-2xl border border-slate-200 mx-auto"
            />
            <button
              onClick={() => setShowFullQr(false)}
              className="px-6 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
            >
              Đóng xem ảnh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
