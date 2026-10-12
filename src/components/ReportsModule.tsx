import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Upload,
  Download,
  Share2,
  QrCode,
  Copy,
  Check,
  Search,
  Filter,
  Trash2,
  Edit3,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  Send,
  Eye,
  RefreshCw,
  ExternalLink,
  Save,
  X,
  FileCheck,
  Sparkles,
  ChevronRight,
  TrendingUp,
  School,
  CheckCircle2,
  Calendar,
  Layers,
  TableProperties
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  AppState,
  UserAccount,
  UrgentReportItem,
  ReportColumn,
  ReportRow
} from '../types';
import {
  saveUrgentReportToFirestore,
  fetchUrgentReportFromFirestore,
  subscribeToUrgentReport,
  deleteUrgentReportFromFirestore,
  submitReportRowToFirestore
} from '../services/dbService';

interface ReportsModuleProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  currentUser?: UserAccount | null;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  state,
  onUpdateState,
  currentUser
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string>(() => {
    return state.urgentReports && state.urgentReports.length > 0 ? state.urgentReports[0].id : '';
  });

  const [activeTab, setActiveTab] = useState<'detail' | 'list'>('detail');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isInputFormModalOpen, setIsInputFormModalOpen] = useState<boolean>(false);
  const [isEditingReportInfo, setIsEditingReportInfo] = useState<boolean>(false);

  // Upload wizard state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedWorkbook, setParsedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [wizardSheetNames, setWizardSheetNames] = useState<string[]>([]);
  const [wizardSelectedSheet, setWizardSelectedSheet] = useState<string>('');
  const [wizardTitle, setWizardTitle] = useState<string>('');
  const [wizardDescription, setWizardDescription] = useState<string>('');
  const [wizardUrgentLevel, setWizardUrgentLevel] = useState<'normal' | 'urgent' | 'very_urgent'>('urgent');
  const [wizardDeadline, setWizardDeadline] = useState<string>('');
  const [wizardColumns, setWizardColumns] = useState<ReportColumn[]>([]);
  const [wizardRows, setWizardRows] = useState<ReportRow[]>([]);
  const [wizardIdentifierColId, setWizardIdentifierColId] = useState<string>('');
  const [wizardAllowNewRows, setWizardAllowNewRows] = useState<boolean>(false);
  const [isParsingExcel, setIsParsingExcel] = useState<boolean>(false);

  // Form input inside modal
  const [formSelectedRowId, setFormSelectedRowId] = useState<string>('');
  const [formIsNewRow, setFormIsNewRow] = useState<boolean>(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formSubmitterName, setFormSubmitterName] = useState<string>(currentUser?.name || '');
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);

  // Inline editing in table
  const [inlineEditingCell, setInlineEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [inlineEditingValue, setInlineEditingValue] = useState<any>('');

  // Share Modal state
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current selected report
  const currentReport = (state.urgentReports || []).find((r) => r.id === selectedReportId) || (state.urgentReports || [])[0] || null;

  // Real-time synchronization for selected report
  useEffect(() => {
    if (!currentReport) return;
    const unsub = subscribeToUrgentReport(currentReport.id, (remoteReport) => {
      if (remoteReport && remoteReport.updatedAt !== currentReport.updatedAt) {
        onUpdateState((prev) => ({
          ...prev,
          urgentReports: (prev.urgentReports || []).map((r) =>
            r.id === remoteReport.id ? remoteReport : r
          )
        }));
      }
    });

    return () => unsub();
  }, [currentReport?.id]);

  // Handle uploading and parsing Excel file
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsParsingExcel(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      setParsedWorkbook(wb);
      setWizardSheetNames(wb.SheetNames);

      const firstSheet = wb.SheetNames[0] || 'Sheet1';
      setWizardSelectedSheet(firstSheet);

      // Auto title from filename
      const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[_–-]/g, ' ');
      setWizardTitle(`Báo cáo ${rawName}`);

      // Parse first sheet
      parseSheetData(wb, firstSheet);
    } catch (err: any) {
      console.error('Error parsing excel file:', err);
      alert('Không thể đọc file Excel này: ' + (err?.message || 'Vui lòng kiểm tra lại định dạng file .xlsx hoặc .xls'));
    } finally {
      setIsParsingExcel(false);
    }
  };

  const parseSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) return;

    // Convert sheet to 2D array
    const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!raw2D || raw2D.length === 0) {
      alert('Sheet này không có dữ liệu!');
      return;
    }

    // Smart Header Row Detection: Find the row with the most text columns or keyword columns
    let bestHeaderRowIndex = 0;
    let maxColsFound = 0;

    for (let r = 0; r < Math.min(10, raw2D.length); r++) {
      const row = raw2D[r];
      if (!Array.isArray(row)) continue;
      const nonEmptyStrings = row.filter((c) => typeof c === 'string' && c.trim().length > 0);
      if (nonEmptyStrings.length > maxColsFound) {
        maxColsFound = nonEmptyStrings.length;
        bestHeaderRowIndex = r;
      }
    }

    const headerRow = raw2D[bestHeaderRowIndex] || [];
    const generatedColumns: ReportColumn[] = [];

    // Build columns
    for (let c = 0; c < headerRow.length; c++) {
      const headerVal = headerRow[c];
      const name = headerVal !== undefined && headerVal !== null && String(headerVal).trim() !== ''
        ? String(headerVal).trim()
        : `Cột ${c + 1}`;

      const lowerName = name.toLowerCase();

      // Detect type
      let colType: 'text' | 'number' | 'date' = 'text';
      if (
        lowerName.includes('số') ||
        lowerName.includes('tiền') ||
        lowerName.includes('lượng') ||
        lowerName.includes('học sinh') ||
        lowerName.includes('hs') ||
        lowerName.includes('stt') ||
        lowerName.includes('thu') ||
        lowerName.includes('nộp')
      ) {
        colType = 'number';
      }

      // Detect if this is an identifier column (Lớp, Họ và tên, STT, Đơn vị)
      const isIdCol = lowerName === 'lớp' || lowerName.includes('lớp') || lowerName.includes('họ và tên') || lowerName.includes('họ tên') || lowerName === 'stt';

      // Detect if this column should be an input field in the form
      // Default: numeric columns and remarks that teachers need to fill
      const isInputField = !isIdCol && !lowerName.includes('tổng số') && !lowerName.includes('gvcn');

      generatedColumns.push({
        id: `col_${c}`,
        name,
        type: colType,
        required: isIdCol || colType === 'number',
        isIdentifier: isIdCol,
        isInputField: isInputField || lowerName.includes('ghi chú'),
        description: isInputField ? `Điền ${name}` : undefined
      });
    }

    // Find best identifier column
    const idCol = generatedColumns.find((c) => c.isIdentifier) || generatedColumns[1] || generatedColumns[0];
    if (idCol) {
      setWizardIdentifierColId(idCol.id);
    }

    // Build rows from subsequent rows
    const generatedRows: ReportRow[] = [];
    for (let r = bestHeaderRowIndex + 1; r < raw2D.length; r++) {
      const row = raw2D[r];
      if (!Array.isArray(row)) continue;
      // Skip row if completely empty
      const hasAnyVal = row.some((val) => val !== undefined && val !== null && String(val).trim() !== '');
      if (!hasAnyVal) continue;

      const rowObj: ReportRow = {
        id: `row_${r}`
      };

      generatedColumns.forEach((col, cIdx) => {
        rowObj[col.id] = row[cIdx] !== undefined ? row[cIdx] : '';
      });

      // Check completeness
      const isComplete = generatedColumns
        .filter((col) => col.isInputField && col.required)
        .every((col) => rowObj[col.id] !== undefined && rowObj[col.id] !== null && String(rowObj[col.id]).trim() !== '');

      rowObj._isComplete = isComplete;
      generatedRows.push(rowObj);
    }

    setWizardColumns(generatedColumns);
    setWizardRows(generatedRows);
  };

  const handleSheetChangeInWizard = (sheetName: string) => {
    setWizardSelectedSheet(sheetName);
    if (parsedWorkbook) {
      parseSheetData(parsedWorkbook, sheetName);
    }
  };

  const handleToggleColumnInputField = (colId: string) => {
    setWizardColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, isInputField: !c.isInputField } : c))
    );
  };

  const handleSaveNewReport = async () => {
    if (!wizardTitle.trim()) {
      alert('Vui lòng nhập tên cho mẫu báo cáo!');
      return;
    }

    if (wizardColumns.length === 0 || wizardRows.length === 0) {
      alert('Không có dữ liệu trong file Excel. Vui lòng kiểm tra lại!');
      return;
    }

    const newReport: UrgentReportItem = {
      id: `report_${Date.now()}`,
      title: wizardTitle.trim(),
      description: wizardDescription.trim(),
      urgentLevel: wizardUrgentLevel,
      deadline: wizardDeadline || undefined,
      creatorId: currentUser?.id || 'usr_admin',
      creatorName: currentUser?.name || 'Giáo viên',
      status: 'open',
      fileName: uploadedFile?.name || 'Bao_Cao.xlsx',
      sheetNames: wizardSheetNames,
      activeSheetName: wizardSelectedSheet,
      columns: wizardColumns,
      rows: wizardRows,
      allowNewRows: wizardAllowNewRows,
      identifierColumnId: wizardIdentifierColId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submissionsCount: 0
    };

    // Save to Firestore & local state
    try {
      await saveUrgentReportToFirestore(newReport);
    } catch (saveErr) {
      console.warn('Notice saving report to Firestore:', saveErr);
    }

    onUpdateState((prev) => ({
      ...prev,
      urgentReports: [newReport, ...(prev.urgentReports || [])]
    }));

    setSelectedReportId(newReport.id);
    setIsUploadModalOpen(false);
    setActiveTab('detail');

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Export current report back to complete Excel file
  const handleExportExcel = () => {
    if (!currentReport) return;

    try {
      // Build headers
      const headers = currentReport.columns.map((c) => c.name);
      const dataRows = currentReport.rows.map((row) => {
        return currentReport.columns.map((c) => {
          return row[c.id] !== undefined ? row[c.id] : '';
        });
      });

      const fullData = [headers, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(fullData);

      // Set column widths
      ws['!cols'] = currentReport.columns.map((c) => ({
        wch: Math.max(c.name.length + 4, 14)
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, currentReport.activeSheetName || 'Bao_Cao');

      const safeTitle = currentReport.title.replace(/[\\/:*?"<>|]/g, '_');
      XLSX.writeFile(wb, `${safeTitle}_Hoan_Thanh.xlsx`);
    } catch (err: any) {
      console.error('Error exporting excel:', err);
      alert('Không thể xuất file Excel: ' + (err?.message || 'Lỗi không xác định'));
    }
  };

  // Open Form modal for row
  const handleOpenFormForRow = (row?: ReportRow) => {
    if (!currentReport) return;
    if (row) {
      setFormSelectedRowId(row.id);
      setFormIsNewRow(false);
      setFormData({ ...row });
      const idCol = currentReport.columns.find((c) => c.id === currentReport.identifierColumnId || c.isIdentifier);
      if (idCol && row[idCol.id]) {
        setFormSubmitterName(String(row[idCol.id]));
      }
    } else {
      // Pick first row
      if (currentReport.rows[0]) {
        setFormSelectedRowId(currentReport.rows[0].id);
        setFormIsNewRow(false);
        setFormData({ ...currentReport.rows[0] });
      } else {
        setFormIsNewRow(true);
        setFormSelectedRowId(`row_${Date.now()}`);
        setFormData({});
      }
    }
    setIsInputFormModalOpen(true);
  };

  // Submit from internal modal form
  const handleInternalFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReport) return;

    setIsSubmittingForm(true);
    try {
      const rowToSubmit: ReportRow = {
        id: formIsNewRow ? `row_${Date.now()}` : formSelectedRowId,
        ...formData
      };

      const res = await submitReportRowToFirestore(
        currentReport.id,
        rowToSubmit,
        formIsNewRow,
        formSubmitterName || currentUser?.name || 'Giáo viên'
      );

      if (res.success && res.report) {
        onUpdateState((prev) => ({
          ...prev,
          urgentReports: (prev.urgentReports || []).map((r) =>
            r.id === res.report!.id ? res.report! : r
          )
        }));
        setIsInputFormModalOpen(false);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } else {
        alert(res.error || 'Có lỗi xảy ra khi lưu số liệu.');
      }
    } catch (err: any) {
      alert('Không thể lưu số liệu: ' + (err?.message || 'Lỗi'));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Direct Inline Cell Edit
  const handleInlineSave = async (rowId: string, colId: string, value: any) => {
    if (!currentReport) return;
    setInlineEditingCell(null);

    const targetRow = currentReport.rows.find((r) => r.id === rowId);
    if (!targetRow) return;

    const updatedRow = {
      ...targetRow,
      [colId]: value
    };

    const res = await submitReportRowToFirestore(
      currentReport.id,
      updatedRow,
      false,
      currentUser?.name || 'Giáo viên'
    );

    if (res.success && res.report) {
      onUpdateState((prev) => ({
        ...prev,
        urgentReports: (prev.urgentReports || []).map((r) =>
          r.id === res.report!.id ? res.report! : r
        )
      }));
    }
  };

  // Toggle report status (Open / Closed)
  const handleToggleStatus = async () => {
    if (!currentReport) return;
    const newStatus = currentReport.status === 'open' ? 'closed' : 'open';
    const updated = {
      ...currentReport,
      status: newStatus as 'open' | 'closed',
      updatedAt: new Date().toISOString()
    };

    await saveUrgentReportToFirestore(updated);
    onUpdateState((prev) => ({
      ...prev,
      urgentReports: (prev.urgentReports || []).map((r) =>
        r.id === updated.id ? updated : r
      )
    }));
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Thầy/Cô có chắc chắn muốn xóa mẫu báo cáo này không? Dữ liệu đã thu thập sẽ không thể khôi phục.')) {
      return;
    }

    await deleteUrgentReportFromFirestore(reportId);
    onUpdateState((prev) => {
      const remaining = (prev.urgentReports || []).filter((r) => r.id !== reportId);
      return {
        ...prev,
        urgentReports: remaining
      };
    });

    const nextOne = (state.urgentReports || []).find((r) => r.id !== reportId);
    if (nextOne) setSelectedReportId(nextOne.id);
  };

  // Share URL
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?page=report_form&reportId=${currentReport?.id || ''}`
    : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyZaloMessage = () => {
    if (!currentReport) return;
    const msg = `📢 [BÁO CÁO GẤP] ${currentReport.title}\n` +
      (currentReport.deadline ? `⏰ Hạn chót: ${new Date(currentReport.deadline).toLocaleString('vi-VN')}\n` : '') +
      `Kính gửi quý Thầy/Cô bấm vào đường link sau để nhập số liệu:\n${shareUrl}\n(Biểu mẫu tự động đồng bộ vào file Excel của trường)`;

    navigator.clipboard.writeText(msg);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Filter rows
  const filteredRows = currentReport
    ? currentReport.rows.filter((row) => {
        // Status filter
        if (statusFilter === 'completed' && !row._isComplete) return false;
        if (statusFilter === 'pending' && row._isComplete) return false;

        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matches = currentReport.columns.some((col) => {
            const val = row[col.id];
            return val !== undefined && String(val).toLowerCase().includes(term);
          });
          if (!matches) return false;
        }
        return true;
      })
    : [];

  // Summary statistics
  const totalRows = currentReport?.rows.length || 0;
  const completedRows = currentReport?.rows.filter((r) => r._isComplete).length || 0;
  const completionPercentage = totalRows > 0 ? Math.round((completedRows / totalRows) * 100) : 0;

  // Numeric column sums
  const numericSums: Record<string, number> = {};
  if (currentReport) {
    currentReport.columns.forEach((col) => {
      if (col.type === 'number' && col.id !== 'col_stt') {
        const sum = currentReport.rows.reduce((acc, row) => {
          const val = Number(row[col.id]);
          return !isNaN(val) ? acc + val : acc;
        }, 0);
        numericSums[col.id] = sum;
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 rounded-3xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="flex items-center justify-between gap-4 flex-wrap relative z-10">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-white/20 text-teal-100 font-extrabold text-[11px] tracking-wide uppercase flex items-center gap-1.5 backdrop-blur-xs">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>THƯ MỤC BÁO CÁO GẤP SỐ LIỆU</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-teal-950 font-black text-[10px]">
                EXCEL & ONLINE FORM
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Quản Lý Báo Cáo Gấp & Tự Động Tạo Form Nhập Liệu
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed font-normal">
              Chỉ cần tải file Excel mẫu lên, hệ thống sẽ hiển thị trọn vẹn bảng tính ra màn hình, tự động sinh Form nhập liệu thông minh và tạo liên kết / mã QR chia sẻ để giáo viên, phụ huynh điền số liệu siêu tốc.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setUploadedFile(null);
                setParsedWorkbook(null);
                setWizardSheetNames([]);
                setWizardColumns([]);
                setWizardRows([]);
                setIsUploadModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-white text-teal-900 hover:bg-teal-50 font-black text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Upload className="w-4 h-4 text-teal-700" />
              <span>+ Thêm Mẫu Báo Cáo (Tải Excel)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: Report List / Selector */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white rounded-3xl border border-teal-200/90 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Danh Sách Mẫu Báo Cáo</span>
              </span>
              <span className="text-[11px] font-bold text-teal-700 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200">
                {(state.urgentReports || []).length} mẫu
              </span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {(state.urgentReports || []).map((rep) => {
                const isSelected = rep.id === selectedReportId;
                const tot = rep.rows.length;
                const comp = rep.rows.filter((r) => r._isComplete).length;
                const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;

                return (
                  <div
                    key={rep.id}
                    onClick={() => {
                      setSelectedReportId(rep.id);
                      setActiveTab('detail');
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 text-left ${
                      isSelected
                        ? 'bg-teal-50/90 border-teal-500 shadow-sm ring-1 ring-teal-500'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          {rep.urgentLevel === 'very_urgent' && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-600 text-white">
                              ⚡ HỎA TỐC
                            </span>
                          )}
                          {rep.urgentLevel === 'urgent' && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-white">
                              🔥 GẤP
                            </span>
                          )}
                          {rep.status === 'closed' ? (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-600 text-white">
                              ĐÃ KHÓA
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              ĐANG MỞ
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-tight">
                          {rep.title}
                        </h4>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>Tiến độ thu thập:</span>
                        <span className="text-teal-700 font-black">{comp}/{tot} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span className="truncate">{rep.fileName || 'Excel'}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReport(rep.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        title="Xóa mẫu báo cáo này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detail View - Excel Spreadsheet & Control Panel */}
        <div className="lg:col-span-3 space-y-3">
          {currentReport ? (
            <div className="bg-white rounded-3xl border border-teal-200/90 p-4 sm:p-5 shadow-sm space-y-4">
              {/* Header with Title and Control Buttons */}
              <div className="pb-3 border-b border-slate-100 space-y-3">
                {/* Title & Badges Row */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-teal-800 uppercase px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 whitespace-nowrap shrink-0">
                      {currentReport.activeSheetName || 'Sheet1'}
                    </span>
                    {currentReport.urgentLevel === 'very_urgent' && (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-600 text-white animate-pulse whitespace-nowrap shrink-0">
                        ⚡ BÁO CÁO HỎA TỐC
                      </span>
                    )}
                    {currentReport.status === 'closed' ? (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-700 text-white flex items-center gap-1 whitespace-nowrap shrink-0">
                        <Lock className="w-3 h-3" />
                        <span>ĐÃ KHÓA THU THẬP</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>ĐANG MỞ NHẬN SỐ LIỆU</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug break-words">
                    {currentReport.title}
                  </h2>

                  {currentReport.description && (
                    <p className="text-xs text-slate-600 font-normal leading-relaxed">
                      {currentReport.description}
                    </p>
                  )}

                  {currentReport.deadline && (
                    <div className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Hạn chót nộp số liệu: {new Date(currentReport.deadline).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons Bar */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-2.5 border-t border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Share Link & QR Button */}
                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="px-3.5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                      title="Mở link chia sẻ & mã QR để gửi cho giáo viên nhập"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Chia Sẻ Form & Mã QR</span>
                    </button>

                    {/* Open Dynamic Form Modal */}
                    <button
                      type="button"
                      onClick={() => handleOpenFormForRow()}
                      className="px-3.5 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                      title="Mở form nhập liệu để nhập trực tiếp"
                    >
                      <Edit3 className="w-4 h-4 text-purple-600" />
                      <span>📝 Nhập Liệu Form</span>
                    </button>

                    {/* Export Excel (.xlsx) */}
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                      title="Tải file Excel đã hoàn thiện về máy tính"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>📥 Xuất Excel (.xlsx)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Lock / Unlock */}
                    <button
                      type="button"
                      onClick={handleToggleStatus}
                      className={`px-3 py-2 rounded-2xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                        currentReport.status === 'open'
                          ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                      title={currentReport.status === 'open' ? 'Bấm để Khóa nhận số liệu' : 'Bấm để Mở lại nhận số liệu'}
                    >
                      {currentReport.status === 'open' ? (
                        <>
                          <Lock className="w-4 h-4 text-slate-600" />
                          <span>Khóa nhận số liệu</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 text-emerald-600" />
                          <span>Mở lại thu thập</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-100 text-teal-950 space-y-1">
                  <span className="text-[10px] font-bold text-teal-700 block">TỔNG SỐ ĐỐI TƯỢNG</span>
                  <div className="text-lg font-black text-teal-900">{totalRows}</div>
                </div>
                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-emerald-950 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 block">ĐÃ HOÀN THÀNH</span>
                  <div className="text-lg font-black text-emerald-800">{completedRows} ({completionPercentage}%)</div>
                </div>
                <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 text-amber-950 space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 block">CHƯA ĐỦ SỐ LIỆU</span>
                  <div className="text-lg font-black text-amber-800">{totalRows - completedRows}</div>
                </div>
                <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 text-purple-950 space-y-1">
                  <span className="text-[10px] font-bold text-purple-700 block">SỐ CỘT DỮ LIỆU</span>
                  <div className="text-lg font-black text-purple-900">{currentReport.columns.length} cột</div>
                </div>
              </div>

              {/* Table Toolbar (Search, Filter, Sheet Tabs) */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm dòng, lớp, tên..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('completed')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Đã hoàn thành ({completedRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Chưa nộp ({totalRows - completedRows})
                  </button>
                </div>
              </div>

              {/* Excel Spreadsheet Table Display */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-[550px] overflow-x-auto overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    {/* Header */}
                    <thead className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-black text-slate-700 whitespace-nowrap border-r border-slate-200 w-12 text-center">
                          #
                        </th>
                        {currentReport.columns.map((col) => (
                          <th
                            key={col.id}
                            className={`py-2.5 px-3 font-black whitespace-nowrap border-r border-slate-200 text-slate-800 ${
                              col.isInputField ? 'bg-teal-50/70 text-teal-900' : ''
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{col.name}</span>
                              {col.isInputField && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-teal-200/80 text-teal-800 font-extrabold" title="Cột này có trong Form để người dùng điền">
                                  FORM
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="py-2.5 px-3 font-black text-slate-700 whitespace-nowrap text-center w-20">
                          Thao tác
                        </th>
                      </tr>
                    </thead>

                    {/* Body */}
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={currentReport.columns.length + 2} className="py-8 text-center text-slate-400">
                            Không có dòng nào phù hợp với bộ lọc tìm kiếm.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, index) => {
                          const isComplete = row._isComplete;
                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors hover:bg-teal-50/30 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                              }`}
                            >
                              {/* Row Index */}
                              <td className="py-2 px-3 text-center font-bold text-slate-400 border-r border-slate-100 text-[11px]">
                                {index + 1}
                              </td>

                              {/* Column values */}
                              {currentReport.columns.map((col) => {
                                const val = row[col.id];
                                const isEditing = inlineEditingCell?.rowId === row.id && inlineEditingCell?.colId === col.id;
                                const isEmpty = val === undefined || val === null || String(val).trim() === '';

                                return (
                                  <td
                                    key={col.id}
                                    onDoubleClick={() => {
                                      setInlineEditingCell({ rowId: row.id, colId: col.id });
                                      setInlineEditingValue(val !== undefined ? val : '');
                                    }}
                                    className={`py-2 px-3 border-r border-slate-100 whitespace-nowrap ${
                                      col.type === 'number' ? 'text-right' : 'text-left'
                                    } ${col.isInputField && isEmpty ? 'bg-amber-50/60' : ''}`}
                                  >
                                    {isEditing ? (
                                      <input
                                        type={col.type === 'number' ? 'number' : 'text'}
                                        autoFocus
                                        value={inlineEditingValue}
                                        onChange={(e) => setInlineEditingValue(e.target.value)}
                                        onBlur={() => handleInlineSave(row.id, col.id, inlineEditingValue)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleInlineSave(row.id, col.id, inlineEditingValue);
                                          if (e.key === 'Escape') setInlineEditingCell(null);
                                        }}
                                        className="w-full px-2 py-0.5 border border-teal-500 rounded bg-white text-xs font-bold"
                                      />
                                    ) : (
                                      <span
                                        className={`cursor-pointer ${
                                          isEmpty
                                            ? 'text-amber-500/80 font-normal italic text-[11px]'
                                            : col.type === 'number' && typeof val === 'number'
                                            ? 'font-bold text-slate-800'
                                            : 'text-slate-800'
                                        }`}
                                        title="Nháy đúp chuột để sửa nhanh ô này"
                                      >
                                        {isEmpty
                                          ? col.isInputField ? '— chưa điền —' : ''
                                          : col.type === 'number' && typeof val === 'number' && val > 999
                                          ? val.toLocaleString('vi-VN')
                                          : String(val)}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Actions */}
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenFormForRow(row)}
                                  className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-extrabold text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  title="Mở form điền cho dòng này"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Điền</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Footer Row (Sum of numeric columns) */}
                    <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                      <tr>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          Σ
                        </td>
                        {currentReport.columns.map((col, idx) => {
                          const sum = numericSums[col.id];
                          return (
                            <td
                              key={col.id}
                              className={`py-2.5 px-3 border-r border-slate-200 ${
                                col.type === 'number' ? 'text-right' : 'text-left'
                              }`}
                            >
                              {idx === 0 || (idx === 1 && !col.type) ? (
                                <span>TỔNG CỘNG</span>
                              ) : sum !== undefined ? (
                                <span className="text-teal-900">
                                  {sum > 999 ? sum.toLocaleString('vi-VN') : sum}
                                </span>
                              ) : (
                                ''
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-center">
                          —
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Table bottom instruction */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>💡 <b>Mẹo thao tác:</b> Nháy đúp chuột vào bất kỳ ô nào trên bảng để sửa trực tiếp, hoặc bấm nút "Điền" để mở form. Mọi thay đổi sẽ tự động đồng bộ lên Cloud Firestore.</span>
                <span className="text-teal-700 font-bold">Lần cập nhật cuối: {new Date(currentReport.updatedAt).toLocaleTimeString('vi-VN')}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-800">Chưa có mẫu báo cáo nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Thầy/Cô hãy bấm vào nút "+ Thêm Mẫu Báo Cáo" phía trên để tải file Excel mẫu lên và khởi tạo bảng tính tự động.
              </p>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all"
              >
                + Tải Lên File Excel Mẫu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: UPLOAD & CONFIGURE EXCEL TEMPLATE WIZARD              */}
      {/* ============================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-teal-200 w-full max-w-3xl my-6 p-5 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Tải File Excel Mẫu Lên & Tạo Form Tự Động
                  </h3>
                  <span className="text-[11px] font-semibold text-teal-700">
                    Tự động nhận diện cột, dòng và sinh trường nhập liệu
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Upload Excel File Dropzone */}
            {!parsedWorkbook ? (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-3xl p-8 sm:p-12 text-center bg-teal-50/40 hover:bg-teal-50/70 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="w-16 h-16 rounded-3xl bg-white shadow-md text-teal-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">
                      Bấm vào đây để chọn file Excel mẫu (.xlsx, .xls)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Hoặc kéo và thả file Excel báo cáo cần thu thập số liệu vào khung này
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[11px] inline-block">
                    Hỗ trợ: .xlsx, .xls, .csv
                  </span>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">💡 File Excel mẫu nên có cấu trúc như thế nào?</div>
                  <p>
                    Hàng tiêu đề nên chứa các cột như: <b>STT, Lớp, Họ và tên</b> (để định danh người nộp) và các cột số liệu cần điền như: <b>Số lượng, Đã nộp, Còn thiếu, Ghi chú</b>. Hệ thống sẽ tự động quét và tạo form nhập liệu tương ứng.
                  </p>
                </div>
              </div>
            ) : (
              /* Step 2: Configure Report Metadata & Form Columns */
              <div className="space-y-5">
                {/* File info bar */}
                <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                    <span className="font-bold text-teal-900">{uploadedFile?.name}</span>
                    <span className="text-slate-500 font-medium">({wizardRows.length} dòng, {wizardColumns.length} cột)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedWorkbook(null);
                      setUploadedFile(null);
                    }}
                    className="text-teal-700 underline font-bold cursor-pointer hover:text-teal-900"
                  >
                    Đổi file khác
                  </button>
                </div>

                {/* Sheet Selector if multiple sheets */}
                {wizardSheetNames.length > 1 && (
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700">Chọn Sheet cần nạp:</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {wizardSheetNames.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSheetChangeInWizard(s)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            wizardSelectedSheet === s
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Report Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Tên báo cáo gấp: <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={wizardTitle}
                      onChange={(e) => setWizardTitle(e.target.value)}
                      placeholder="Ví dụ: Báo cáo số lượng học sinh tham gia BHYT đợt 1"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Ghi chú / Chỉ đạo thực hiện:</label>
                    <textarea
                      rows={2}
                      value={wizardDescription}
                      onChange={(e) => setWizardDescription(e.target.value)}
                      placeholder="Hướng dẫn giáo viên, yêu cầu nộp gấp..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Mức độ khẩn:</label>
                    <select
                      value={wizardUrgentLevel}
                      onChange={(e) => setWizardUrgentLevel(e.target.value as any)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="normal">Bình thường</option>
                      <option value="urgent">🔥 Khẩn cấp</option>
                      <option value="very_urgent">⚡ Hỏa tốc</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Hạn chót nộp báo cáo:</label>
                    <input
                      type="datetime-local"
                      value={wizardDeadline}
                      onChange={(e) => setWizardDeadline(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Configure Form Columns */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-teal-900 tracking-wide">
                      Cấu hình các trường trong Form nhập liệu
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tích chọn cột người dùng cần điền
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {wizardColumns.map((col) => (
                      <div
                        key={col.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${
                          col.isInputField ? 'bg-teal-50/80 border-teal-200 text-teal-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={col.isInputField}
                            onChange={() => handleToggleColumnInputField(col.id)}
                            className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                          />
                          <span>{col.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-normal text-slate-400">
                            {col.type === 'number' ? 'Kiểu Số' : 'Kiểu Chữ'}
                          </span>
                          {col.id === wizardIdentifierColId && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-extrabold">
                              ĐỊNH DANH (CHỌN LỚP/TÊN)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewReport}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs shadow-md shadow-teal-700/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>🚀 Khởi Tạo Mẫu Báo Cáo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: SHARE FORM LINK & QR CODE MODAL                       */}
      {/* ============================================================== */}
      {isShareModalOpen && currentReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-teal-200 w-full max-w-lg p-5 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 text-left">
                  Chia Sẻ Biểu Mẫu Nhập Liệu
                </h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-left">
              <span className="text-[10px] font-bold text-teal-700 uppercase">TÊN BÁO CÁO:</span>
              <h4 className="text-sm font-black text-slate-900">{currentReport.title}</h4>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-teal-50/60 rounded-3xl border border-teal-100 flex flex-col items-center justify-center space-y-2">
              <div className="w-52 h-52 bg-white p-2.5 rounded-2xl shadow-md border border-teal-200 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`}
                  alt="Mã QR Form Nhập Liệu"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Quét mã QR bằng Camera điện thoại hoặc Zalo để mở Form
              </p>
            </div>

            {/* Link Copy Box */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-700">Đường dẫn liên kết (Link):</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            {/* Pre-written Zalo Message */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-700">Mẫu tin nhắn gửi vào nhóm Zalo:</label>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans space-y-2">
                <p>
                  📢 <b>[BÁO CÁO GẤP]</b> {currentReport.title}<br />
                  {currentReport.deadline && `⏰ Hạn chót: ${new Date(currentReport.deadline).toLocaleString('vi-VN')}<br />`}
                  Kính gửi quý Thầy/Cô truy cập vào link hoặc quét QR để nhập số liệu.
                </p>
                <button
                  type="button"
                  onClick={handleCopyZaloMessage}
                  className="w-full py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold text-xs border border-teal-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMessage ? 'Đã sao chép tin nhắn Zalo' : 'Sao chép tin nhắn mẫu Zalo'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở thử giao diện Form trên tab mới</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: AUTO-GENERATED INPUT FORM MODAL                       */}
      {/* ============================================================== */}
      {isInputFormModalOpen && currentReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-teal-200 w-full max-w-lg p-5 sm:p-7 space-y-4 animate-in fade-in zoom-in-95 duration-200 my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Form Nhập Liệu Báo Cáo
                  </h3>
                  <span className="text-[10px] text-teal-700 font-semibold">{currentReport.title}</span>
                </div>
              </div>
              <button
                onClick={() => setIsInputFormModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInternalFormSubmit} className="space-y-4">
              {/* Row selector */}
              <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="text-xs font-black text-slate-800">
                  Chọn dòng đối tượng cần điền số liệu:
                </label>
                <select
                  value={formSelectedRowId}
                  onChange={(e) => {
                    const rowId = e.target.value;
                    setFormSelectedRowId(rowId);
                    setFormIsNewRow(false);
                    const r = currentReport.rows.find((x) => x.id === rowId);
                    if (r) setFormData({ ...r });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                >
                  {currentReport.rows.map((row, i) => {
                    const idCol = currentReport.columns.find((c) => c.id === currentReport.identifierColumnId || c.isIdentifier) || currentReport.columns[1];
                    const label = idCol && row[idCol.id] ? String(row[idCol.id]) : `Dòng ${i + 1}`;
                    return (
                      <option key={row.id} value={row.id}>
                        {row._isComplete ? '✅ ' : '⏳ '} {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Dynamic input fields */}
              <div className="space-y-3">
                {currentReport.columns
                  .filter((c) => c.isInputField)
                  .map((col) => {
                    const val = formData[col.id] !== undefined ? formData[col.id] : '';
                    return (
                      <div key={col.id} className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span>{col.name} {col.required && <span className="text-rose-500">*</span>}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{col.type === 'number' ? 'Số' : 'Chữ'}</span>
                        </label>
                        {col.type === 'number' ? (
                          <input
                            type="number"
                            value={val}
                            onChange={(e) => setFormData((prev) => ({ ...prev, [col.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                            required={col.required}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => setFormData((prev) => ({ ...prev, [col.id]: e.target.value }))}
                            required={col.required}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-500"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInputFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingForm ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Lưu & Cập Nhật</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
