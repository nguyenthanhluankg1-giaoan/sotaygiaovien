import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  Search,
  BookOpen,
  Upload,
  Link as LinkIcon,
  Tag,
  Clock,
  Sparkles,
  FileUp,
  FolderPlus,
  Check,
  Edit3
} from 'lucide-react';
import { UserAccount } from '../../types';

interface DocItem {
  id: string;
  title: string;
  category: string;
  type: 'file' | 'link' | 'note';
  url?: string;
  content?: string;
  fileSize?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocsTabProps {
  currentUser?: UserAccount | null;
}

const DEFAULT_DOCS: DocItem[] = [
  {
    id: 'doc-1',
    title: 'Mẫu Kế hoạch bài dạy (Giáo án) chuẩn Thông tư 27/2020',
    category: 'Mẫu biểu chuyên môn',
    type: 'note',
    content: 'Mẫu cấu trúc giáo án gồm 4 bước: 1. Mở đầu/Khởi động, 2. Hình thành kiến thức mới, 3. Luyện tập/Thực hành, 4. Vận dụng/Mở rộng.',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'doc-2',
    title: 'Quy chế đánh giá học sinh Tiểu học theo Thông tư 27',
    category: 'Văn bản quy phạm',
    type: 'note',
    content: 'Tổng hợp đánh giá thường xuyên (bằng nhận xét) và đánh giá định kỳ (bằng điểm số) các môn học và hoạt động giáo dục.',
    createdAt: '2026-09-05',
    updatedAt: '2026-09-05'
  },
  {
    id: 'doc-3',
    title: 'Trang quản lý học tập & Cơ sở dữ liệu ngành GDĐT',
    category: 'Liên kết tra cứu',
    type: 'link',
    url: 'https://csdl.moet.gov.vn',
    createdAt: '2026-09-10',
    updatedAt: '2026-09-10'
  },
  {
    id: 'doc-4',
    title: 'Biên bản sinh hoạt tổ chuyên môn định kỳ',
    category: 'Mẫu biểu chuyên môn',
    type: 'note',
    content: 'Nội dung họp: Đánh giá thực hiện kế hoạch tuần qua, triển khai kế hoạch tuần tới, thống nhất nội dung giảng dạy và đổi mới PPDH.',
    createdAt: '2026-09-15',
    updatedAt: '2026-09-15'
  }
];

export const DocsTab: React.FC<DocsTabProps> = ({ currentUser }) => {
  const storageKey = `docs_list_${currentUser?.id || 'shared'}`;

  const [docs, setDocs] = useState<DocItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_DOCS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [showAddModal, setShowAddModal] = useState(false);

  // New doc state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Mẫu biểu chuyên môn');
  const [newType, setNewType] = useState<'note' | 'link' | 'file'>('note');
  const [newUrl, setNewUrl] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(docs));
    } catch (e) {
      console.error('Error saving docs:', e);
    }
  }, [docs, storageKey]);

  const categories = ['Tất cả', 'Mẫu biểu chuyên môn', 'Văn bản quy phạm', 'Giáo án & Bài giảng', 'Liên kết tra cứu', 'Ghi chú & Khác'];

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.content && doc.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Tất cả' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: DocItem = {
      id: `doc-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      type: newType,
      url: newUrl.trim() || undefined,
      content: newContent.trim() || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setDocs([newItem, ...docs]);
    setNewTitle('');
    setNewUrl('');
    setNewContent('');
    setShowAddModal(false);
  };

  const handleDeleteDoc = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài liệu/ghi chú này?')) {
      setDocs(docs.filter((d) => d.id !== id));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileDataUrl = event.target?.result as string;
        const newItem: DocItem = {
          id: `doc-file-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          title: file.name,
          category: 'Giáo án & Bài giảng',
          type: 'file',
          url: fileDataUrl,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0]
        };
        setDocs((prev) => [newItem, ...prev]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 rounded-3xl p-6 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 backdrop-blur-3xl -skew-x-12 translate-x-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-teal-100 mb-1">
              <FolderOpen className="w-3.5 h-3.5 text-teal-200" />
              <span>Thư mục 3: Sổ tay & Tài liệu chuyên môn</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Kho Tài Liệu & Sổ Tay Chuyên Môn
            </h1>
            <p className="text-sm text-teal-100 max-w-2xl font-medium">
              Nơi lưu trữ, tra cứu biểu mẫu giáo án, văn bản chỉ đạo, ghi chú cuộc họp và liên kết nghiệp vụ giảng dạy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer backdrop-blur-sm">
              <Upload className="w-4 h-4" />
              <span>Tải file lên</span>
              <input type="file" onChange={handleFileUpload} multiple className="hidden" />
            </label>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm ghi chú/Liên kết</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white rounded-3xl p-4 border-2 border-teal-100 shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu, ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-teal-200">
          <FolderOpen className="w-12 h-12 text-teal-300 mx-auto mb-3 animate-bounce" />
          <h3 className="text-base font-extrabold text-slate-700">Chưa tìm thấy tài liệu nào</h3>
          <p className="text-xs text-slate-500 mt-1">
            Hãy bấm nút "Tải file lên" hoặc "Thêm ghi chú/Liên kết" để bổ sung vào kho tài liệu chuyên môn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl p-5 border-2 border-teal-100/80 shadow-md hover:shadow-lg transition-all flex flex-col justify-between group relative"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                    <Tag className="w-3 h-3 text-teal-600" />
                    {doc.category}
                  </span>

                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-extrabold text-slate-800 text-sm leading-snug mb-2 group-hover:text-teal-700 transition-colors">
                  {doc.title}
                </h3>

                {doc.content && (
                  <p className="text-xs text-slate-600 line-clamp-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium leading-relaxed">
                    {doc.content}
                  </p>
                )}

                {doc.url && doc.type === 'link' && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-800 hover:underline mt-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở trang web liên kết</span>
                  </a>
                )}

                {doc.url && doc.type === 'file' && (
                  <a
                    href={doc.url}
                    download={doc.title}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 hover:underline mt-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về máy ({doc.fileSize || 'File'})</span>
                  </a>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {doc.createdAt}
                </span>

                <span className="capitalize font-bold text-slate-500">
                  {doc.type === 'file' ? '📁 Tập tin' : doc.type === 'link' ? '🔗 Trang web' : '📝 Ghi chú'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-teal-200 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-teal-600" />
              <span>Thêm Tài Liệu / Ghi Chú Mới</span>
            </h2>

            <form onSubmit={handleAddDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Tên tài liệu / Tiêu đề ghi chú <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kế hoạch kiểm tra giữa kỳ 1..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Danh mục
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {categories.filter((c) => c !== 'Tất cả').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Loại dữ liệu
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="note">📝 Ghi chú văn bản</option>
                    <option value="link">🔗 Đường dẫn Web</option>
                  </select>
                </div>
              </div>

              {newType === 'link' && (
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Địa chỉ Web (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Nội dung chi tiết / Ghi chú
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập nội dung văn bản, trích yếu hoặc ghi chú công việc..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  Lưu vào Sổ tay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
