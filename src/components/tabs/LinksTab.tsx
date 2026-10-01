import React, { useState } from 'react';
import { Link as LinkIcon, Plus, ExternalLink, Edit3, Trash2, Pin } from 'lucide-react';
import { AppState, LinkItem } from '../../types';
import { uid } from '../../utils/helpers';

interface LinksTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const LinksTab: React.FC<LinksTabProps> = ({ state, onUpdateState }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('https://');
  const [formCategory, setFormCategory] = useState('Học liệu & SGK');
  const [formDesc, setFormDesc] = useState('');
  const [formPinned, setFormPinned] = useState(false);

  const categories = [
    'Học liệu & SGK',
    'Google Meet / Zoom',
    'Bài tập',
    'Trò chơi học tập',
    'Tài liệu giáo viên',
    'Khác'
  ];

  const sortedLinks = [...state.links].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const openModal = (item?: LinkItem) => {
    if (item) {
      setEditingLink(item);
      setFormName(item.name);
      setFormUrl(item.url);
      setFormCategory(item.category);
      setFormDesc(item.desc);
      setFormPinned(item.pinned);
    } else {
      setEditingLink(null);
      setFormName('');
      setFormUrl('https://');
      setFormCategory('Học liệu & SGK');
      setFormDesc('');
      setFormPinned(false);
    }
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    const url = formUrl.trim();
    if (!name || !url) return;

    if (editingLink) {
      onUpdateState((prev) => ({
        ...prev,
        links: prev.links.map((l) =>
          l.id === editingLink.id
            ? {
                ...l,
                name,
                url,
                category: formCategory,
                desc: formDesc.trim(),
                pinned: formPinned
              }
            : l
        )
      }));
    } else {
      const newLink: LinkItem = {
        id: uid('link'),
        name,
        url,
        category: formCategory,
        desc: formDesc.trim(),
        pinned: formPinned
      };
      onUpdateState((prev) => ({
        ...prev,
        links: [newLink, ...prev.links]
      }));
    }

    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa liên kết này?')) return;
    onUpdateState((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l.id !== id)
    }));
  };

  const openUrl = (rawUrl: string) => {
    let target = rawUrl;
    if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
              <LinkIcon className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800">Liên kết Tiện ích Lớp học</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lưu trữ các trang web học tập, tài liệu trực tuyến, phần mềm kiểm tra và phòng học online.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm liên kết mới</span>
        </button>
      </div>

      {/* Grid of Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedLinks.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-3xl bg-white border-2 transition-all duration-200 shadow-md hover:shadow-lg flex flex-col justify-between ${
              item.pinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-teal-100'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 flex-shrink-0">
                  <LinkIcon className="w-5 h-5" />
                </div>
                {item.pinned && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black">
                    <Pin className="w-3 h-3 text-amber-700 fill-current" />
                    Đã ghim
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-base text-slate-800 mt-3 truncate">{item.name}</h3>
              <span className="inline-block px-2.5 py-0.5 mt-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                {item.category}
              </span>

              {item.desc && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => openUrl(item.url)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <span>Mở liên kết</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => openModal(item)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition-colors"
                title="Sửa liên kết"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors"
                title="Xóa liên kết"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {sortedLinks.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
            <LinkIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <div className="text-sm font-bold text-slate-600">Chưa có liên kết nào</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Bấm &quot;Thêm liên kết mới&quot; để lưu lại các địa chỉ hữu ích cho lớp.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Link Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-teal-200">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              {editingLink ? 'Chỉnh sửa liên kết' : 'Thêm liên kết mới'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên liên kết / Trang web *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: SGK Hành Trang Số, Quizizz..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Địa chỉ URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Danh mục
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú nội dung của trang..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={formPinned}
                  onChange={(e) => setFormPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="pinCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Ghim liên kết này lên đầu trang
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
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
                  {editingLink ? 'Cập nhật' : 'Thêm liên kết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
