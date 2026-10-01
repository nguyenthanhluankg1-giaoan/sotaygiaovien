import React, { useState, useRef, useEffect } from 'react';
import {
  FileCheck,
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  Search,
  Trash2,
  Edit2,
  Edit3,
  CheckCircle2,
  HelpCircle,
  Printer,
  Sparkles,
  BookOpen,
  Filter,
  X,
  Save,
  Check,
  AlertCircle,
  FileCode,
  Layers,
  Folder,
  FolderPlus,
  FolderOpen,
  Tag,
  GraduationCap,
  Shuffle,
  Paperclip,
  CheckSquare,
  Square,
  MoveRight
} from 'lucide-react';
import { AppState, QuizQuestion, QuestionFolder, UploadedFileInfo } from '../../types';
import { DEFAULT_QUIZ_QUESTIONS } from '../../data/defaultQuestions';
import {
  downloadSampleQuizExcel,
  exportQuizQuestionsToExcel,
  parseQuizFile,
  SAMPLE_QUIZ_QUESTIONS
} from '../../utils/quizExcelHelper';
import { DEFAULT_QUESTION_FOLDERS, uid, readFileAsDataURL } from '../../utils/helpers';
import { WheelTab } from './WheelTab';

interface WorksheetsTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onNavigate?: (page: string) => void;
  initialSubTab?: 'list' | 'wheel' | 'print';
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const FOLDER_COLORS = [
  { hex: '#0284c7', name: 'Xanh biển' },
  { hex: '#10b981', name: 'Xanh lá' },
  { hex: '#f59e0b', name: 'Vàng cam' },
  { hex: '#8b5cf6', name: 'Tím' },
  { hex: '#ec4899', name: 'Hồng' },
  { hex: '#6366f1', name: 'Chàm' },
  { hex: '#ef4444', name: 'Đỏ' },
  { hex: '#14b8a6', name: 'Xanh ngọc' }
];

export const WorksheetsTab: React.FC<WorksheetsTabProps> = ({
  state,
  onUpdateState,
  onNavigate,
  initialSubTab = 'list'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'wheel' | 'print'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const questions: QuizQuestion[] =
    Array.isArray(state.quizQuestions) && state.quizQuestions.length > 0
      ? state.quizQuestions
      : DEFAULT_QUIZ_QUESTIONS;

  const currentFolders: QuestionFolder[] =
    Array.isArray(state.questionFolders) && state.questionFolders.length > 0
      ? state.questionFolders
      : DEFAULT_QUESTION_FOLDERS;

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all'); // 'all', 'uncategorized', or folderId
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  // Excel & File Upload States
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Batch selection state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Manual Question Edit Modal
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  // Printable Worksheet Modal
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);

  // Folder Add/Edit Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState<boolean>(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>('');
  const [folderDesc, setFolderDesc] = useState<string>('');
  const [folderColor, setFolderColor] = useState<string>('#0284c7');
  const [folderSubject, setFolderSubject] = useState<string>('all');
  const [folderGrade, setFolderGrade] = useState<string>('all');

  // AI Quiz Generator Modal State
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [aiTopic, setAiTopic] = useState<string>('');
  const [aiSubject, setAiSubject] = useState<string>('Tin học');
  const [aiGrade, setAiGrade] = useState<string>('3');
  const [aiFolderId, setAiFolderId] = useState<string>('');
  const [aiNumQuestions, setAiNumQuestions] = useState<number>(10);
  const [aiDifficulty, setAiDifficulty] = useState<string>('Tổng hợp');
  const [aiUploadedFiles, setAiUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    // 1. Folder match
    let matchFolder = true;
    if (selectedFolder === 'uncategorized') {
      matchFolder = !q.folderId;
    } else if (selectedFolder !== 'all') {
      matchFolder = q.folderId === selectedFolder;
    }

    // 2. Search match
    const query = searchQuery.toLowerCase().trim();
    const qText = (q.question || '').toLowerCase();
    const qOptions = Array.isArray(q.options) ? q.options.map((o) => (o || '').toLowerCase()) : [];
    const qExp = (q.explanation || '').toLowerCase();

    const matchSearch =
      !query ||
      qText.includes(query) ||
      qOptions.some((opt) => opt.includes(query)) ||
      qExp.includes(query);

    // 3. Subject match
    const matchSubject =
      selectedSubject === 'all' ||
      !q.subject ||
      q.subject === 'all' ||
      q.subject.trim() === selectedSubject;

    // 4. Grade match
    const matchGrade =
      selectedGrade === 'all' ||
      !q.grade ||
      q.grade === 'all' ||
      String(q.grade) === String(selectedGrade);

    return matchFolder && matchSearch && matchSubject && matchGrade;
  });

  // Unique subjects and grades list for filter dropdowns
  const availableSubjects = Array.from(
    new Set(['Tin học', 'Công nghệ', 'Toán', 'Tiếng Việt', 'Khoa học', 'Tự nhiên & Xã hội', 'Lịch sử & Địa lý', 'Tiếng Anh', 'Đạo đức', 'Đố vui', ...questions.map((q) => q.subject || '').filter(Boolean)])
  );

  const availableGrades = Array.from(
    new Set(
      questions
        .map((q) => (q.grade === undefined || q.grade === null ? 'all' : String(q.grade)))
        .filter((g) => g !== 'all' && g !== 'undefined' && g !== '')
    )
  ).sort();

  // Excel File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadMessage(null);

    try {
      const { questions: newQuestions, errors } = await parseQuizFile(file);

      if (newQuestions.length > 0) {
        onUpdateState((prev) => {
          const currentList = prev.quizQuestions || DEFAULT_QUIZ_QUESTIONS;
          return {
            ...prev,
            quizQuestions: [...newQuestions, ...currentList]
          };
        });

        setUploadMessage({
          type: 'success',
          text: `Đã nhập thành công ${newQuestions.length} câu hỏi và đáp án từ file "${file.name}"!`
        });
      } else {
        setUploadMessage({
          type: 'error',
          text: errors.join(' | ') || 'Không tìm thấy câu hỏi hợp lệ trong file.'
        });
      }
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: `Lỗi đọc file: ${err?.message || 'Không thể xử lý dữ liệu.'}`
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // AI File Upload Attachment Handler
  const handleAiFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUploaded: UploadedFileInfo[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > 100 * 1024 * 1024) {
        alert(`Tệp "${f.name}" vượt quá 100MB!`);
        continue;
      }
      try {
        const base64 = await readFileAsDataURL(f);
        newUploaded.push({
          id: uid('file'),
          name: f.name,
          type: f.type,
          size: f.size,
          base64
        });
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    if (newUploaded.length > 0) {
      setAiUploadedFiles((prev) => [...prev, ...newUploaded]);
    }
    if (aiFileInputRef.current) aiFileInputRef.current.value = '';
  };

  // AI Generation Handler
  const handleGenerateAiQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim() && aiUploadedFiles.length === 0) {
      setAiError('Vui lòng gõ tên bài học hoặc tải tệp PDF/Ảnh đính kèm.');
      return;
    }

    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim() || 'Bài học trắc nghiệm',
          subject: aiSubject,
          grade: aiGrade,
          numQuestions: aiNumQuestions,
          difficulty: aiDifficulty,
          folderId: aiFolderId || undefined,
          attachedFiles: aiUploadedFiles
        })
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        onUpdateState((prev) => {
          const currentList = prev.quizQuestions || DEFAULT_QUIZ_QUESTIONS;
          return {
            ...prev,
            quizQuestions: [...data.questions, ...currentList]
          };
        });

        if (aiFolderId) {
          setSelectedFolder(aiFolderId);
        }

        setUploadMessage({
          type: 'success',
          text: `Đã dùng AI soạn thành công ${data.questions.length} câu hỏi trắc nghiệm cho bài "${aiTopic.trim() || 'đã chọn'}"!`
        });
        setAiModalOpen(false);
        setAiTopic('');
        setAiUploadedFiles([]);
      } else {
        setAiError(data.message || data.error || 'Không thể tạo câu hỏi tự động. Vui lòng kiểm tra lại.');
      }
    } catch (err: any) {
      setAiError(`Lỗi kết nối AI: ${err?.message || 'Không thể kết nối đến máy chủ.'}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Save Manual Question
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.question.trim()) return;

    if (editingQuestion.options.some((opt) => !opt.trim())) {
      alert('Vui lòng nhập đủ 4 phương án A, B, C, D!');
      return;
    }

    if (editingQuestion.id) {
      // Edit existing
      onUpdateState((prev) => ({
        ...prev,
        quizQuestions: (prev.quizQuestions || DEFAULT_QUIZ_QUESTIONS).map((q) =>
          q.id === editingQuestion.id ? editingQuestion : q
        )
      }));
    } else {
      // Create new
      const newQ = { ...editingQuestion, id: uid('quiz') };
      onUpdateState((prev) => ({
        ...prev,
        quizQuestions: [newQ, ...(prev.quizQuestions || DEFAULT_QUIZ_QUESTIONS)]
      }));
    }

    setEditModalOpen(false);
    setEditingQuestion(null);
  };

  // Delete Question
  const handleDeleteQuestion = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng dữ liệu?')) return;
    onUpdateState((prev) => ({
      ...prev,
      quizQuestions: (prev.quizQuestions || DEFAULT_QUIZ_QUESTIONS).filter((q) => q.id !== id)
    }));
    setSelectedQuestionIds((prev) => prev.filter((i) => i !== id));
  };

  // Reset to default sample bank
  const handleResetSampleBank = () => {
    if (!confirm('Khôi phục toàn bộ Ngân hàng câu hỏi về bộ câu hỏi chuẩn (30+ câu hỏi)?')) return;
    onUpdateState((prev) => ({
      ...prev,
      quizQuestions: [...DEFAULT_QUIZ_QUESTIONS],
      questionFolders: [...DEFAULT_QUESTION_FOLDERS]
    }));
  };

  // Folder Management Handlers
  const handleOpenNewFolder = () => {
    setEditingFolderId(null);
    setFolderName('');
    setFolderDesc('');
    setFolderColor('#0284c7');
    setFolderSubject(selectedSubject !== 'all' ? selectedSubject : 'all');
    setFolderGrade(selectedGrade !== 'all' ? selectedGrade : 'all');
    setIsFolderModalOpen(true);
  };

  const handleOpenEditFolder = (f: QuestionFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(f.id);
    setFolderName(f.name);
    setFolderDesc(f.description || '');
    setFolderColor(f.color || '#0284c7');
    setFolderSubject(f.subject || 'all');
    setFolderGrade(f.grade !== undefined && f.grade !== null ? String(f.grade) : 'all');
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    const assignedSubject = folderSubject && folderSubject !== 'all' ? folderSubject : undefined;
    const assignedGrade = folderGrade && folderGrade !== 'all' ? (Number(folderGrade) || folderGrade) : undefined;

    if (editingFolderId) {
      const updatedFolders = currentFolders.map((f) =>
        f.id === editingFolderId
          ? {
              ...f,
              name: folderName.trim(),
              description: folderDesc.trim(),
              color: folderColor,
              subject: assignedSubject,
              grade: assignedGrade
            }
          : f
      );
      onUpdateState((prev) => ({ ...prev, questionFolders: updatedFolders }));
    } else {
      const newFolder: QuestionFolder = {
        id: uid('folder'),
        name: folderName.trim(),
        description: folderDesc.trim(),
        color: folderColor,
        subject: assignedSubject,
        grade: assignedGrade,
        createdAt: new Date().toISOString()
      };
      onUpdateState((prev) => ({ ...prev, questionFolders: [...currentFolders, newFolder] }));
      setSelectedFolder(newFolder.id);
    }

    setIsFolderModalOpen(false);
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa thư mục này? Các câu hỏi thuộc thư mục sẽ chuyển sang "Chưa xếp thư mục".')) {
      const updatedFolders = currentFolders.filter((f) => f.id !== folderId);
      const updatedQuestions = questions.map((q) =>
        q.folderId === folderId ? { ...q, folderId: undefined } : q
      );
      onUpdateState((prev) => ({
        ...prev,
        questionFolders: updatedFolders,
        quizQuestions: updatedQuestions
      }));

      if (selectedFolder === folderId) {
        setSelectedFolder('all');
      }
    }
  };

  // Batch Selection Handlers
  const toggleSelectAll = () => {
    if (selectedQuestionIds.length === filteredQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(filteredQuestions.map((q) => q.id));
    }
  };

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchMoveToFolder = (targetFolderId: string) => {
    if (selectedQuestionIds.length === 0) return;
    const updated = questions.map((q) =>
      selectedQuestionIds.includes(q.id)
        ? { ...q, folderId: targetFolderId === 'uncategorized' ? undefined : targetFolderId }
        : q
    );
    onUpdateState((prev) => ({ ...prev, quizQuestions: updated }));
    setSelectedQuestionIds([]);
  };

  const handleBatchDeleteQuestions = () => {
    if (selectedQuestionIds.length === 0) return;
    if (confirm(`Bạn có chắc muốn xóa ${selectedQuestionIds.length} câu hỏi đã chọn?`)) {
      const updated = questions.filter((q) => !selectedQuestionIds.includes(q.id));
      onUpdateState((prev) => ({ ...prev, quizQuestions: updated }));
      setSelectedQuestionIds([]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv, .json"
        className="hidden"
      />

      <input
        type="file"
        ref={aiFileInputRef}
        onChange={handleAiFileAttachment}
        accept="application/pdf,image/*"
        multiple
        className="hidden"
      />

      {/* Main Sub-tab Navigation Bar */}
      <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl border-2 border-teal-200/90 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('list')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'list'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/20 scale-[1.02]'
                : 'text-slate-700 hover:text-teal-800 hover:bg-teal-50'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>📋 Danh Sách CH & Thư Mục</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
              {questions.length} CH
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('wheel')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'wheel'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-700 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>🎡 Vòng Quay May Mắn</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
              HOT
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('print');
              setPrintModalOpen(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'print'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]'
                : 'text-slate-700 hover:text-indigo-800 hover:bg-indigo-50'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ In Phiếu Bài Tập</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer ml-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Soạn CH Bằng AI ✨</span>
        </button>
      </div>

      {activeSubTab === 'wheel' ? (
        <WheelTab state={state} onUpdateState={onUpdateState} onNavigate={onNavigate} />
      ) : (
        <>
          {/* Upload Toast Message */}
          {uploadMessage && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold border animate-in slide-in-from-top-2 duration-200 ${
                uploadMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {uploadMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{uploadMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadMessage(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* FOLDERS NAVIGATION BAR */}
          <div className="p-3.5 bg-white rounded-3xl border border-teal-200/90 shadow-sm space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span>
                    Thư mục câu hỏi {selectedSubject !== 'all' ? `môn ${selectedSubject}` : '(Tất cả môn)'}:
                  </span>
                </span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-full border border-teal-200">
                  {currentFolders.filter((f) => selectedSubject === 'all' || !f.subject || f.subject === 'all' || f.subject === selectedSubject).length} thư mục
                </span>
              </div>

              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenNewFolder}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ Tạo thư mục</span>
                </button>

                <button
                  type="button"
                  onClick={downloadSampleQuizExcel}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
                  title="Tải file Excel mẫu chuẩn"
                >
                  <Download className="w-3 h-3" />
                  <span>Excel Mẫu</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black text-white bg-teal-700 hover:bg-teal-800 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title="Tải file câu hỏi lên"
                >
                  <Upload className="w-3 h-3" />
                  <span>{isUploading ? 'Đang đọc...' : 'Tải File Lên'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportQuizQuestionsToExcel(filteredQuestions)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                  title="Xuất câu hỏi ra file Excel"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>Xuất File</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion({
                      id: '',
                      question: '',
                      options: ['', '', '', ''],
                      correctIndex: 0,
                      subject: 'Tin học',
                      grade: '3',
                      explanation: ''
                    });
                    setEditModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm CH</span>
                </button>
              </div>
            </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {/* All Folder pill */}
          <button
            type="button"
            onClick={() => setSelectedFolder('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              selectedFolder === 'all'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Tất cả câu hỏi</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedFolder === 'all'
                  ? 'bg-slate-700 text-slate-100'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {filteredQuestions.length}
            </span>
          </button>

          {/* Uncategorized Folder pill */}
          <button
            type="button"
            onClick={() => setSelectedFolder('uncategorized')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              selectedFolder === 'uncategorized'
                ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Chưa xếp thư mục</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedFolder === 'uncategorized'
                  ? 'bg-teal-800 text-teal-100'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {questions.filter((q) => !q.folderId).length}
            </span>
          </button>

          {/* Custom Folders */}
          {currentFolders
            .filter((f) => {
              if (selectedSubject !== 'all' && f.subject && f.subject !== 'all' && f.subject !== selectedSubject) {
                return false;
              }
              if (selectedGrade !== 'all' && f.grade && f.grade !== 'all' && String(f.grade) !== String(selectedGrade)) {
                return false;
              }
              return true;
            })
            .map((f) => {
              const count = questions.filter((q) => q.folderId === f.id).length;
              const isSelected = selectedFolder === f.id;
              const colorHex = f.color || '#0284c7';

              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFolder(f.id)}
                  className={`group relative px-3 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'text-white shadow-xs border-transparent'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                  style={{
                    backgroundColor: isSelected ? colorHex : undefined
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40"
                    style={{ backgroundColor: isSelected ? '#ffffff' : colorHex }}
                  />
                  <span>{f.name}</span>
                  {f.grade && f.grade !== 'all' && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-black ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      K{f.grade}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>

                  <div className="flex items-center gap-1 ml-1 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditFolder(f, e)}
                      className={`p-1 rounded-md transition-all ${
                        isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-100 text-slate-500'
                      }`}
                      title="Chỉnh sửa thư mục"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFolder(f.id, e)}
                      className={`p-1 rounded-md transition-all ${
                        isSelected ? 'hover:bg-rose-500/30 text-rose-100' : 'hover:bg-rose-50 text-rose-500'
                      }`}
                      title="Xóa thư mục"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm câu hỏi, đáp án, giải thích..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Môn:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="all">Tất cả môn học</option>
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-600">Khối:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="all">Tất cả khối lớp</option>
              <option value="1">Khối 1</option>
              <option value="2">Khối 2</option>
              <option value="3">Khối 3</option>
              <option value="4">Khối 4</option>
              <option value="5">Khối 5</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 shrink-0 cursor-pointer ml-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Phiếu Bài Tập</span>
          </button>
        </div>
      </div>

      {/* BATCH SELECTION TOOLBAR */}
      {filteredQuestions.length > 0 && (
        <div className="p-3 bg-teal-50/80 rounded-2xl border border-teal-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 font-black text-teal-900 cursor-pointer hover:text-teal-700"
            >
              {selectedQuestionIds.length === filteredQuestions.length ? (
                <CheckSquare className="w-4 h-4 text-teal-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedQuestionIds.length > 0
                  ? `Đã chọn ${selectedQuestionIds.length}/${filteredQuestions.length} câu`
                  : 'Chọn tất cả câu hỏi'}
              </span>
            </button>
          </div>

          {selectedQuestionIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <MoveRight className="w-3.5 h-3.5" />
                <span>Chuyển sang:</span>
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchMoveToFolder(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-2.5 py-1 rounded-xl border border-teal-300 bg-white text-xs font-bold text-teal-950 focus:outline-none"
              >
                <option value="">-- Chọn thư mục --</option>
                <option value="uncategorized">🏷️ Chưa xếp thư mục</option>
                {currentFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleBatchDeleteQuestions}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black transition-all cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedQuestionIds.length} câu</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Question List View */}
      {filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-dashed border-teal-200 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-600">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-slate-800">Không tìm thấy câu hỏi nào phù hợp</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Không tìm thấy câu hỏi cho bộ lọc hiện tại. Thầy/Cô có thể bấm xóa bộ lọc, tự soạn bằng AI, hoặc khôi phục ngân hàng câu hỏi mẫu (30+ câu).
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {(selectedSubject !== 'all' || selectedGrade !== 'all' || selectedFolder !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSubject('all');
                  setSelectedGrade('all');
                  setSelectedFolder('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer"
              >
                Xóa Bộ Lọc Search
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Soạn Bằng AI ✨</span>
            </button>
            <button
              type="button"
              onClick={handleResetSampleBank}
              className="px-4 py-2 rounded-xl text-xs font-black text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 cursor-pointer"
            >
              Khôi Phục 30+ Câu Hỏi Mặc Định
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q, index) => {
            const correctLetter = ['A', 'B', 'C', 'D'][q.correctIndex] || 'A';
            const folderObj = currentFolders.find((f) => f.id === q.folderId);
            const isSelected = selectedQuestionIds.includes(q.id);

            return (
              <div
                key={q.id || index}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all space-y-3 ${
                  isSelected ? 'border-teal-500 bg-teal-50/20 shadow-md' : 'border-slate-200/90 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelectQuestion(q.id)}
                      className="mt-0.5 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-teal-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                      )}
                    </button>

                    <span className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {q.question}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold text-[10px] border border-teal-200">
                          {q.subject || 'Tin học'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                          {q.grade === 'all' || !q.grade ? 'Tất cả khối' : `Khối ${q.grade}`}
                        </span>
                        {folderObj && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1"
                            style={{ backgroundColor: folderObj.color || '#0284c7' }}
                          >
                            <Folder className="w-3 h-3" />
                            <span>{folderObj.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuestion(q);
                        setEditModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt, oIdx) => {
                    const letter = ['A', 'B', 'C', 'D'][oIdx];
                    const isCorrect = q.correctIndex === oIdx;

                    return (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-extrabold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="truncate">{opt}</span>
                        </div>
                        {isCorrect && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black shrink-0">
                            ĐÁP ÁN ĐÚNG
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-[11px] font-medium text-amber-900 flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Giải thích:</strong> {q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Manual Edit/Add Question Modal */}
      {editModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-teal-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-teal-400" />
                <span>{editingQuestion.id ? 'Chỉnh Sửa Câu Hỏi' : 'Thêm Câu Hỏi Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung câu hỏi</label>
                <textarea
                  rows={2}
                  required
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  4 Phương án trả lời (chọn nút chọn để đánh dấu đáp án đúng):
                </label>
                <div className="space-y-2">
                  {OPTION_LETTERS.map((letter, idx) => (
                    <div key={letter} className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`modal_opt_${letter}`}
                        name="modalCorrect"
                        checked={editingQuestion.correctIndex === idx}
                        onChange={() => setEditingQuestion({ ...editingQuestion, correctIndex: idx })}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="w-6 text-xs font-black text-slate-700">{letter}.</span>
                      <input
                        type="text"
                        required
                        value={editingQuestion.options[idx] || ''}
                        onChange={(e) => {
                          const nextOpts = [...editingQuestion.options];
                          nextOpts[idx] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: nextOpts });
                        }}
                        placeholder={`Phương án ${letter}`}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Môn học</label>
                  <select
                    value={editingQuestion.subject || 'Tin học'}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-teal-500 bg-white"
                  >
                    {availableSubjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp</label>
                  <select
                    value={editingQuestion.grade || '3'}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, grade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="1">Khối 1</option>
                    <option value="2">Khối 2</option>
                    <option value="3">Khối 3</option>
                    <option value="4">Khối 4</option>
                    <option value="5">Khối 5</option>
                    <option value="all">Tất cả khối</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thư mục</label>
                  <select
                    value={editingQuestion.folderId || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, folderId: e.target.value || undefined })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="">🏷️ Chưa xếp thư mục</option>
                    {currentFolders.map((f) => (
                      <option key={f.id} value={f.id}>📁 {f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Giải thích / Lời giải chi tiết</label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  placeholder="Ghi chú thêm đáp án chi tiết..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Câu Hỏi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folder CRUD Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden">
            <div className="px-6 py-4 bg-amber-500 text-white flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                <span>{editingFolderId ? 'Chỉnh Sửa Thư Mục' : 'Tạo Thư Mục Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tên thư mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Ví dụ: Ôn tập Giữa kỳ 1, Bài 3 - Mạng máy tính..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-extrabold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  placeholder="Mô tả bộ câu hỏi trong thư mục..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Môn học áp dụng</label>
                  <select
                    value={folderSubject}
                    onChange={(e) => setFolderSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                  >
                    <option value="all">Tất cả môn học</option>
                    {availableSubjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Khối lớp áp dụng</label>
                  <select
                    value={folderGrade}
                    onChange={(e) => setFolderGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                  >
                    <option value="all">Tất cả khối</option>
                    <option value="1">Khối 1</option>
                    <option value="2">Khối 2</option>
                    <option value="3">Khối 3</option>
                    <option value="4">Khối 4</option>
                    <option value="5">Khối 5</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Màu sắc nhận diện</label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setFolderColor(c.hex)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        folderColor === c.hex ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {folderColor === c.hex && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-md cursor-pointer"
                >
                  Lưu Thư Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Quiz Question Generator Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-indigo-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight">
                    Soạn Câu Hỏi Trắc Nghiệm Bằng AI
                  </h3>
                  <p className="text-[11px] text-indigo-100 font-medium">
                    Tự động tạo câu hỏi từ Tên bài, Môn học, Khối lớp hoặc Tệp PDF / Ảnh trang sách
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateAiQuestions} className="p-6 space-y-4">
              {aiError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* 1. Tên bài học */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  1. Tên bài học / Chủ đề câu hỏi
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ví dụ: Bài 3: Mạng máy tính và Internet, Bài 12: Phép cộng trừ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-bold self-center">Gợi ý nhanh:</span>
                  {[
                    'Bài 1: Thông tin và quyết định',
                    'Bài 4: Phép nhân và phép chia',
                    'Bài 2: Môi trường sống thực vật'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setAiTopic(chip)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[10px] font-bold text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* PDF/Image Attachment */}
              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <span>Đính kèm tệp PDF hoặc Ảnh trang sách (tùy chọn):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => aiFileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer"
                  >
                    + Chọn tệp PDF/Ảnh
                  </button>
                </div>

                {aiUploadedFiles.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {aiUploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-slate-800"
                      >
                        <span className="truncate max-w-[240px]">📄 {file.name}</span>
                        <button
                          type="button"
                          onClick={() => setAiUploadedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                          className="text-rose-500 hover:text-rose-700 text-[11px] font-bold"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Môn học & Khối lớp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">Môn học</label>
                  <select
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value="Tin học">Tin học</option>
                    <option value="Toán">Toán</option>
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Khoa học">Khoa học</option>
                    <option value="Lịch sử & Địa lý">Lịch sử & Địa lý</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Công nghệ">Công nghệ</option>
                    <option value="Tự nhiên & Xã hội">Tự nhiên & Xã hội</option>
                    <option value="Đạo đức">Đạo đức</option>
                    <option value="Đố vui">Đố vui</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">Khối lớp</label>
                  <select
                    value={aiGrade}
                    onChange={(e) => setAiGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value="1">Khối 1</option>
                    <option value="2">Khối 2</option>
                    <option value="3">Khối 3</option>
                    <option value="4">Khối 4</option>
                    <option value="5">Khối 5</option>
                    <option value="all">Tất cả khối lớp</option>
                  </select>
                </div>
              </div>

              {/* Số lượng câu & Thư mục */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">Số lượng câu hỏi</label>
                  <select
                    value={aiNumQuestions}
                    onChange={(e) => setAiNumQuestions(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value={5}>5 câu hỏi</option>
                    <option value={10}>10 câu hỏi</option>
                    <option value={15}>15 câu hỏi</option>
                    <option value={20}>20 câu hỏi</option>
                    <option value={25}>25 câu hỏi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">Lưu vào thư mục</label>
                  <select
                    value={aiFolderId}
                    onChange={(e) => setAiFolderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value="">🏷️ Chưa xếp thư mục</option>
                    {currentFolders.map((f) => (
                      <option key={f.id} value={f.id}>📁 {f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  disabled={isGeneratingAi}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={isGeneratingAi || (!aiTopic.trim() && aiUploadedFiles.length === 0)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAi ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>AI Đang Soạn Câu Hỏi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Tạo Câu Hỏi AI ✨</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Worksheet Modal */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-teal-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-400" />
                <span>Xem Trước & In Phiếu Học Tập ({filteredQuestions.length} câu)</span>
              </h3>
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-slate-900 bg-slate-50 print:bg-white print:p-0">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:shadow-none print:border-none">
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase text-slate-500">
                      {state.teacher.school || 'TRƯỜNG TIỂU HỌC AN GIANG'}
                    </h4>
                    <p className="text-xs font-medium text-slate-500">
                      Giáo viên: {state.teacher.name || 'Thầy/Cô'}
                    </p>
                  </div>
                  <div className="text-right">
                    <h2 className="font-black text-base text-teal-900">PHIẾU BÀI TẬP RÈN LUYỆN</h2>
                    <p className="text-xs font-bold text-slate-600">
                      Môn: {selectedSubject === 'all' ? 'Tổng hợp' : selectedSubject}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span>Họ và tên học sinh: ................................................................</span>
                  <span>Lớp: .............</span>
                </div>

                <div className="space-y-4 pt-2">
                  {filteredQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="space-y-1.5 text-xs">
                      <p className="font-bold text-slate-900">
                        Câu {idx + 1}: {q.question}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pl-4 text-slate-700 font-medium">
                        {q.options.map((opt, oIdx) => (
                          <span key={oIdx}>
                            <strong>{['A', 'B', 'C', 'D'][oIdx]}.</strong> {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Mẹo: Bấm Ctrl + P hoặc phím bên phải để thực hiện in phiếu.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Trực Tiếp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
