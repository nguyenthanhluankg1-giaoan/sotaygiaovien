import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  TableProperties,
  AlertTriangle,
  CheckSquare,
  Square,
  PlusCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { DEFAULT_URGENT_REPORTS } from '../utils/helpers';
import { buildPublicShareUrl } from '../utils/urlHelper';
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
  deleteMultipleUrgentReportsFromFirestore,
  deleteReportRowFromFirestore,
  submitReportRowToFirestore
} from '../services/dbService';
import {
  parseExcelSheetWithMerges,
  aiEnhanceExcelReportForm,
  isPersonNameOrTextColumn,
  getOrderedFormFieldBlocks
} from '../utils/excelReportHelper';

interface ReportsModuleProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState, immediateSave?: boolean) => void;
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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isSharingSyncing, setIsSharingSyncing] = useState<boolean>(false);
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
  const [isAiAnalyzingHeaders, setIsAiAnalyzingHeaders] = useState<boolean>(false);
  const [wizardHasMergedHeaders, setWizardHasMergedHeaders] = useState<boolean>(false);
  const [wizardMergedGroups, setWizardMergedGroups] = useState<string[]>([]);

  // Form input inside modal
  const [formSelectedRowId, setFormSelectedRowId] = useState<string>('');
  const [formIsNewRow, setFormIsNewRow] = useState<boolean>(true);
  const [editingRowLabel, setEditingRowLabel] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formSubmitterName, setFormSubmitterName] = useState<string>(currentUser?.name || '');
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);
  const [submittingAction, setSubmittingAction] = useState<'save_new' | 'save_close' | null>(null);
  const [duplicateMatchInfo, setDuplicateMatchInfo] = useState<{
    row: ReportRow;
    colName: string;
    value: string;
  } | null>(null);
  const [duplicateResolution, setDuplicateResolution] = useState<'create_new' | 'overwrite'>('create_new');

  // Inline editing in table
  const [inlineEditingCell, setInlineEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [inlineEditingValue, setInlineEditingValue] = useState<any>('');

  // Table sorting state: default to 'stt' ascending
  const [tableSortBy, setTableSortBy] = useState<string>('stt');
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('asc');

  // Share Modal state
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);

  // Bulk selection & smooth deletion state
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState<boolean>(false);
  const [selectedReportIdsForBulk, setSelectedReportIdsForBulk] = useState<string[]>([]);

  // Custom Modals for smooth deletion
  const [reportToDelete, setReportToDelete] = useState<UrgentReportItem | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [rowToDelete, setRowToDelete] = useState<{ rowId: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

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

  // Pre-sync all existing reports to Firestore so all share links work immediately without login
  useEffect(() => {
    const list = state.urgentReports || [];
    list.forEach((rep) => {
      saveUrgentReportToFirestore(rep).catch(() => {});
    });
  }, []);

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

    // Use robust merged & unmerged Excel parser
    const parsed = parseExcelSheetWithMerges(worksheet);
    if (!parsed.columns || parsed.columns.length === 0) {
      alert('Sheet này không có dữ liệu bảng tính!');
      return;
    }

    setWizardColumns(parsed.columns);
    setWizardRows(parsed.rows);
    setWizardHasMergedHeaders(parsed.hasMergedHeaders);
    setWizardMergedGroups(parsed.mergedGroupNames);

    // Find best identifier column (Lớp, Họ và tên...)
    const idCol = parsed.columns.find((c) => c.isIdentifier) || parsed.columns[1] || parsed.columns[0];
    if (idCol) {
      setWizardIdentifierColId(idCol.id);
    }
  };

  // AI Assistant: Analyze and optimize form structure & merged columns
  const handleAiEnhanceForm = async () => {
    if (wizardColumns.length === 0) return;
    setIsAiAnalyzingHeaders(true);
    try {
      const enhanced = await aiEnhanceExcelReportForm(wizardTitle, wizardColumns, wizardRows);
      setWizardColumns(enhanced);
      const groups = Array.from(new Set(enhanced.filter((c) => c.groupName).map((c) => c.groupName!)));
      setWizardMergedGroups(groups);
      setWizardHasMergedHeaders(groups.length > 0);
      showToast('✨ AI đã tạo form đầy đủ đúng như file Excel: bao gồm tất cả cột gộp và cột không gộp, cột Họ và tên mặc định kiểu chữ!');
    } catch (e: any) {
      console.warn('AI enhancement notice:', e);
      showToast('Đã tự động chuẩn hóa cấu trúc cột gộp và form');
    } finally {
      setIsAiAnalyzingHeaders(false);
    }
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

  const handleToggleColumnType = (colId: string) => {
    setWizardColumns((prev) =>
      prev.map((c) =>
        c.id === colId
          ? { ...c, type: c.type === 'number' ? 'text' : 'number' }
          : c
      )
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

    // Ensure all person name columns default to 'text'
    const sanitizedColumns = wizardColumns.map((c) => {
      const isName = isPersonNameOrTextColumn(c.name) || isPersonNameOrTextColumn(c.subName || '');
      return {
        ...c,
        type: isName ? ('text' as const) : c.type
      };
    });

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
      columns: sanitizedColumns,
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

  // Check duplicate matches in real-time when user types
  const checkDuplicate = (data: Record<string, any>, currentEditId: string | null) => {
    if (!currentReport || !currentReport.rows || currentReport.rows.length === 0) return null;

    // Check identifier column, class column, or name column
    const checkCols = currentReport.columns.filter((c) =>
      c.isIdentifier ||
      c.id === currentReport.identifierColumnId ||
      c.name.toLowerCase().includes('lớp') ||
      c.name.toLowerCase().includes('họ và tên') ||
      c.name.toLowerCase().includes('họ tên')
    );

    for (const col of checkCols) {
      const val = data[col.id];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const valStr = String(val).trim().toLowerCase();
        // Look for match in existing rows
        const matched = currentReport.rows.find((r) => {
          if (currentEditId && r.id === currentEditId) return false;
          const rowVal = r[col.id];
          return rowVal !== undefined && rowVal !== null && String(rowVal).trim().toLowerCase() === valStr;
        });
        if (matched) {
          return {
            row: matched,
            colName: col.subName || col.name,
            value: String(val).trim()
          };
        }
      }
    }
    return null;
  };

  // Handle form field change with real-time duplicate check
  const handleFormFieldChange = (colId: string, val: any) => {
    setFormData((prev) => {
      const next = { ...prev, [colId]: val };
      const dup = checkDuplicate(next, formIsNewRow ? null : formSelectedRowId);
      setDuplicateMatchInfo(dup);
      return next;
    });
  };

  // Open Form modal for fresh new row input
  const handleOpenFormNew = () => {
    if (!currentReport) return;
    const newId = `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setFormSelectedRowId(newId);
    setFormIsNewRow(true);
    setEditingRowLabel(null);
    setDuplicateMatchInfo(null);
    setDuplicateResolution('create_new');

    // Auto-fill STT if available
    const initialData: Record<string, any> = {};
    const sttCol = currentReport.columns.find((c) => c.id === 'col_stt' || c.name.toLowerCase() === 'stt');
    if (sttCol) {
      const maxStt = (currentReport.rows || []).reduce((max, r) => {
        const v = Number(r[sttCol.id]);
        return !isNaN(v) && v > max ? v : max;
      }, 0);
      initialData[sttCol.id] = maxStt + 1;
    }
    setFormData(initialData);
    setIsInputFormModalOpen(true);
  };

  // Open Form modal for row (or new if undefined)
  const handleOpenFormForRow = (row?: ReportRow) => {
    if (!currentReport) return;
    if (row) {
      setFormSelectedRowId(row.id);
      setFormIsNewRow(false);
      const idCol = currentReport.columns.find((c) => c.id === currentReport.identifierColumnId || c.isIdentifier) || currentReport.columns[1];
      setEditingRowLabel(idCol && row[idCol.id] ? String(row[idCol.id]) : `Dòng ID ${row.id}`);
      setFormData({ ...row });
      setDuplicateMatchInfo(null);
      setDuplicateResolution('overwrite');
      const submitterCol = currentReport.columns.find((c) => isPersonNameOrTextColumn(c.name));
      if (submitterCol && row[submitterCol.id]) {
        setFormSubmitterName(String(row[submitterCol.id]));
      }
    } else {
      handleOpenFormNew();
      return;
    }
    setIsInputFormModalOpen(true);
  };

  // Submit from internal modal form with option to Keep Open & Add New
  const handleInternalFormSubmit = async (e?: React.FormEvent, keepOpen: boolean = false) => {
    if (e) e.preventDefault();
    if (!currentReport) return;

    // Validate required fields
    const requiredCols = currentReport.columns.filter((c) => c.required && (c.isInputField || c.isIdentifier));
    for (const col of requiredCols) {
      const val = formData[col.id];
      if (val === undefined || val === null || String(val).trim() === '') {
        alert(`Vui lòng điền thông tin cho trường bắt buộc: "${col.subName || col.name}"`);
        return;
      }
    }

    setSubmittingAction(keepOpen ? 'save_new' : 'save_close');
    setIsSubmittingForm(true);

    try {
      // Determine target row ID & whether it is new
      let targetRowId = formSelectedRowId;
      let isNew = formIsNewRow;

      if (duplicateMatchInfo) {
        if (duplicateResolution === 'create_new') {
          isNew = true;
          targetRowId = `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        } else {
          isNew = false;
          targetRowId = duplicateMatchInfo.row.id;
        }
      }

      const rowToSubmit: ReportRow = {
        id: targetRowId || `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...formData
      };

      const res = await submitReportRowToFirestore(
        currentReport.id,
        rowToSubmit,
        isNew,
        formSubmitterName || currentUser?.name || 'Giáo viên'
      );

      if (res.success && res.report) {
        onUpdateState((prev) => ({
          ...prev,
          urgentReports: (prev.urgentReports || []).map((r) =>
            r.id === res.report!.id ? res.report! : r
          )
        }));

        const idCol = currentReport.columns.find((c) => c.id === currentReport.identifierColumnId || c.isIdentifier) || currentReport.columns[1];
        const rowLabel = idCol && rowToSubmit[idCol.id] ? String(rowToSubmit[idCol.id]) : 'số liệu';

        if (keepOpen) {
          // Keep form open for next input!
          showToast(`🎉 Đã lưu thành công dữ liệu cho "${rowLabel}"! Sẵn sàng nhập dòng tiếp theo.`);

          // Reset form for next entry with auto incremented STT
          const nextData: Record<string, any> = {};
          const sttCol = currentReport.columns.find((c) => c.id === 'col_stt' || c.name.toLowerCase() === 'stt');
          if (sttCol) {
            const maxStt = (res.report.rows || []).reduce((max, r) => {
              const v = Number(r[sttCol.id]);
              return !isNaN(v) && v > max ? v : max;
            }, 0);
            nextData[sttCol.id] = maxStt + 1;
          }

          setFormData(nextData);
          setFormSelectedRowId(`row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
          setFormIsNewRow(true);
          setEditingRowLabel(null);
          setDuplicateMatchInfo(null);
          setDuplicateResolution('create_new');
        } else {
          setIsInputFormModalOpen(false);
          showToast(`✅ Đã lưu thành công số liệu "${rowLabel}"!`);
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        }
      } else {
        alert(res.error || 'Có lỗi xảy ra khi lưu số liệu.');
      }
    } catch (err: any) {
      alert('Không thể lưu số liệu: ' + (err?.message || 'Lỗi'));
    } finally {
      setIsSubmittingForm(false);
      setSubmittingAction(null);
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

  // Toggle selection for bulk delete
  const toggleSelectReportForBulk = (reportId: string) => {
    setSelectedReportIdsForBulk((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const handleSelectAllBulk = () => {
    const allIds = (state.urgentReports || []).map((r) => r.id);
    if (selectedReportIdsForBulk.length === allIds.length) {
      setSelectedReportIdsForBulk([]);
    } else {
      setSelectedReportIdsForBulk(allIds);
    }
  };

  // Perform single report deletion smoothly with modal
  const handleConfirmDeleteSingleReport = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    const targetId = reportToDelete.id;
    const title = reportToDelete.title;

    try {
      await deleteUrgentReportFromFirestore(targetId);

      onUpdateState((prev) => {
        const remaining = (prev.urgentReports || []).filter((r) => r.id !== targetId);
        return {
          ...prev,
          urgentReports: remaining
        };
      }, true);

      const remainingReports = (state.urgentReports || []).filter((r) => r.id !== targetId);
      if (selectedReportId === targetId) {
        setSelectedReportId(remainingReports[0] ? remainingReports[0].id : '');
      }

      showToast(`Đã xóa thành công mẫu báo cáo "${title}"`);
    } catch (err: any) {
      alert('Không thể xóa báo cáo: ' + (err?.message || 'Lỗi hệ thống'));
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  // Perform bulk deletion smoothly with modal
  const handleConfirmDeleteBulk = async () => {
    if (selectedReportIdsForBulk.length === 0) return;
    setIsDeleting(true);
    const count = selectedReportIdsForBulk.length;

    try {
      await deleteMultipleUrgentReportsFromFirestore(selectedReportIdsForBulk);

      onUpdateState((prev) => {
        const remaining = (prev.urgentReports || []).filter(
          (r) => !selectedReportIdsForBulk.includes(r.id)
        );
        return {
          ...prev,
          urgentReports: remaining
        };
      }, true);

      const remainingReports = (state.urgentReports || []).filter(
        (r) => !selectedReportIdsForBulk.includes(r.id)
      );

      if (selectedReportIdsForBulk.includes(selectedReportId)) {
        setSelectedReportId(remainingReports[0] ? remainingReports[0].id : '');
      }

      setSelectedReportIdsForBulk([]);
      setIsBulkDeleteMode(false);
      showToast(`Đã xóa thành công ${count} mẫu báo cáo khỏi danh sách!`);
    } catch (err: any) {
      alert('Không thể xóa hàng loạt: ' + (err?.message || 'Lỗi'));
    } finally {
      setIsDeleting(false);
      setIsBulkDeleteModalOpen(false);
    }
  };

  // Delete individual row from spreadsheet table
  const handleConfirmDeleteRow = async () => {
    if (!currentReport || !rowToDelete) return;
    setIsDeleting(true);

    try {
      const updatedRows = (currentReport.rows || []).filter((r) => r.id !== rowToDelete.rowId);
      const updatedReport: UrgentReportItem = {
        ...currentReport,
        rows: updatedRows,
        submissionsCount: updatedRows.filter((r) => r._isComplete).length,
        updatedAt: new Date().toISOString()
      };

      await saveUrgentReportToFirestore(updatedReport);

      onUpdateState((prev) => ({
        ...prev,
        urgentReports: (prev.urgentReports || []).map((r) =>
          r.id === updatedReport.id ? updatedReport : r
        )
      }), true);

      showToast(`Đã xóa dòng "${rowToDelete.label}" thành công!`);
    } catch (err: any) {
      alert('Lỗi xóa dòng: ' + (err?.message || 'Lỗi'));
    } finally {
      setIsDeleting(false);
      setRowToDelete(null);
    }
  };

  // Legacy delete report trigger
  const handleDeleteReport = (reportId: string) => {
    const target = (state.urgentReports || []).find((r) => r.id === reportId);
    if (target) {
      setReportToDelete(target);
    }
  };

  // Share URL (Switches ais-dev- to ais-pre- in sandbox so link is publicly accessible)
  const shareUrl = currentReport?.id ? buildPublicShareUrl('report_form', currentReport.id) : '';

  // Dynamically generate QR code data URL whenever current report / shareUrl changes
  useEffect(() => {
    if (!shareUrl || !currentReport?.id) {
      setQrCodeDataUrl('');
      return;
    }
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f766e',
        light: '#ffffff'
      }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => {
        console.warn('QRCode generate notice, using fallback URL:', err);
        setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`);
      });
  }, [shareUrl, currentReport?.id]);

  // Open Share Modal with immediate Cloud Firestore sync & QR preparation
  const handleOpenShareModal = async (targetReport?: UrgentReportItem) => {
    const reportToShare = targetReport || currentReport;
    if (!reportToShare) {
      showToast('⚠️ Vui lòng chọn một mẫu báo cáo để chia sẻ.');
      return;
    }
    setSelectedReportId(reportToShare.id);
    setIsShareModalOpen(true);
    setIsSharingSyncing(true);

    const targetUrl = buildPublicShareUrl('report_form', reportToShare.id);

    if (targetUrl) {
      QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f766e',
          light: '#ffffff'
        }
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => {
          setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(targetUrl)}`);
        });
    }

    try {
      // 1. Cache locally
      try {
        localStorage.setItem(`urgent_report_cache_${reportToShare.id}`, JSON.stringify(reportToShare));
      } catch {}

      // 2. Upload to Cloud Firestore so the recipient can load and submit without logging in
      await saveUrgentReportToFirestore(reportToShare);
    } catch (err) {
      console.warn('Sync report on share notice:', err);
    } finally {
      setIsSharingSyncing(false);
    }
  };

  // Safe clipboard helper with execCommand fallback
  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    let ok = false;
    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (err) {
        console.warn('Clipboard writeText failed:', err);
      }
    }
    if (!ok) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        ok = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.error('execCommand copy error:', e);
      }
    }
    return ok;
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await copyTextToClipboard(shareUrl);
    setCopiedLink(true);
    showToast('📋 Đã sao chép đường link biểu mẫu!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyZaloMessage = async () => {
    if (!currentReport) return;
    const msg = `📢 [BÁO CÁO GẤP] ${currentReport.title}\n` +
      (currentReport.deadline ? `⏰ Hạn chót: ${new Date(currentReport.deadline).toLocaleString('vi-VN')}\n` : '') +
      `Kính gửi quý Thầy/Cô bấm vào đường link sau để nhập số liệu trực tiếp (KHÔNG CẦN ĐĂNG NHẬP TÀI KHOẢN):\n${shareUrl}\n(Biểu mẫu tự động đồng bộ vào bảng Excel tổng hợp của trường)`;

    await copyTextToClipboard(msg);
    setCopiedMessage(true);
    showToast('💬 Đã sao chép tin nhắn mẫu gửi nhóm Zalo!');
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `Ma_QR_${currentReport?.title?.replace(/[\\/:*?"<>|]/g, '_') || 'Bao_Cao'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('🖼️ Đã tải ảnh mã QR về máy!');
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

  // Smart sorted rows matching user's requested order
  const displayedRows = useMemo(() => {
    if (!currentReport || filteredRows.length === 0) return [];

    const sttCol = currentReport.columns.find(
      (c) => c.id === 'col_stt' || c.name.toLowerCase() === 'stt' || c.name.toLowerCase().includes('số tt')
    );
    const idCol = currentReport.columns.find(
      (c) => c.id === currentReport.identifierColumnId || c.isIdentifier
    ) || currentReport.columns[1] || currentReport.columns[0];

    return [...filteredRows].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (tableSortBy === 'stt') {
        if (sttCol) {
          valA = a[sttCol.id];
          valB = b[sttCol.id];
        } else {
          valA = a.id;
          valB = b.id;
        }
      } else if (tableSortBy === 'identifier') {
        if (idCol) {
          valA = a[idCol.id];
          valB = b[idCol.id];
        }
      } else if (tableSortBy === '_submittedAt') {
        valA = a._submittedAt || '';
        valB = b._submittedAt || '';
      } else if (tableSortBy === '_isComplete') {
        valA = a._isComplete ? 1 : 0;
        valB = b._isComplete ? 1 : 0;
      } else {
        // Specific column id
        valA = a[tableSortBy];
        valB = b[tableSortBy];
      }

      // Handle empty / null (sort to the end)
      const emptyA = valA === undefined || valA === null || String(valA).trim() === '';
      const emptyB = valB === undefined || valB === null || String(valB).trim() === '';
      if (emptyA && emptyB) return 0;
      if (emptyA) return 1;
      if (emptyB) return -1;

      // Numeric comparison
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean' && String(valA).trim() !== '' && String(valB).trim() !== '') {
        return tableSortOrder === 'asc' ? numA - numB : numB - numA;
      }

      // Natural Vietnamese collation
      const comp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base', numeric: true });
      return tableSortOrder === 'asc' ? comp : -comp;
    });
  }, [currentReport, filteredRows, tableSortBy, tableSortOrder]);

  const handleToggleColumnSort = (colId: string) => {
    if (tableSortBy === colId) {
      setTableSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortBy(colId);
      setTableSortOrder('asc');
    }
  };

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
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Danh Sách Mẫu Báo Cáo</span>
              </span>
              <div className="flex items-center gap-1.5">
                {(state.urgentReports || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkDeleteMode(!isBulkDeleteMode);
                      setSelectedReportIdsForBulk([]);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 ${
                      isBulkDeleteMode
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                    title="Bật chế độ chọn nhiều mẫu báo cáo để xóa hàng loạt"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isBulkDeleteMode ? 'Hủy chọn' : 'Xóa nhiều'}</span>
                  </button>
                )}
                <span className="text-[11px] font-bold text-teal-700 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200">
                  {(state.urgentReports || []).length} mẫu
                </span>
              </div>
            </div>

            {/* Bulk Delete Management Bar */}
            {isBulkDeleteMode && (state.urgentReports || []).length > 0 && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                  <button
                    type="button"
                    onClick={handleSelectAllBulk}
                    className="flex items-center gap-1.5 hover:underline cursor-pointer text-[11px]"
                  >
                    {selectedReportIdsForBulk.length === (state.urgentReports || []).length ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                        <span>Bỏ chọn tất cả</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5 text-rose-600" />
                        <span>Chọn tất cả ({selectedReportIdsForBulk.length}/{(state.urgentReports || []).length})</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={selectedReportIdsForBulk.length === 0}
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa {selectedReportIdsForBulk.length} Mẫu Báo Cáo Đã Chọn</span>
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {(state.urgentReports || []).map((rep) => {
                const isSelected = rep.id === selectedReportId;
                const tot = rep.rows.length;
                const comp = rep.rows.filter((r) => r._isComplete).length;
                const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
                const isCheckedInBulk = selectedReportIdsForBulk.includes(rep.id);

                return (
                  <div
                    key={rep.id}
                    onClick={() => {
                      if (isBulkDeleteMode) {
                        toggleSelectReportForBulk(rep.id);
                      } else {
                        setSelectedReportId(rep.id);
                        setActiveTab('detail');
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 text-left relative ${
                      isBulkDeleteMode && isCheckedInBulk
                        ? 'bg-rose-50/80 border-rose-400 shadow-sm ring-1 ring-rose-400'
                        : isSelected
                        ? 'bg-teal-50/90 border-teal-500 shadow-sm ring-1 ring-teal-500'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      {isBulkDeleteMode && (
                        <div className="pt-0.5 shrink-0">
                          {isCheckedInBulk ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                      )}
                      <div className="space-y-0.5 min-w-0 flex-1">
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
                      <span className="truncate max-w-[110px]">{rep.fileName || 'Excel'}</span>
                      {!isBulkDeleteMode && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenShareModal(rep);
                            }}
                            className="px-2 py-1 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 cursor-pointer transition-colors font-black text-[10px] flex items-center gap-1 shadow-2xs"
                            title="Chia sẻ đường link & mã QR cho giáo viên"
                          >
                            <Share2 className="w-3 h-3 text-teal-600" />
                            <span>Chia sẻ</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportToDelete(rep);
                            }}
                            className="px-2 py-1 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 cursor-pointer transition-colors font-black text-[10px] flex items-center gap-1"
                            title="Xóa mẫu báo cáo này"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      )}
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
                      onClick={() => handleOpenShareModal()}
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

                    {/* Delete Current Report Button */}
                    <button
                      type="button"
                      onClick={() => setReportToDelete(currentReport)}
                      className="px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                      title="Xóa hoàn toàn mẫu báo cáo hiện tại"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Xóa Mẫu Này</span>
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

                {/* Filter & Sort Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === 'all'
                          ? 'bg-teal-600 text-white shadow-2xs'
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
                          ? 'bg-emerald-600 text-white shadow-2xs'
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
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Chưa nộp ({totalRows - completedRows})
                    </button>
                  </div>

                  {/* Sắp xếp danh sách */}
                  <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-xl">
                    <ArrowUpDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Sắp xếp:</span>
                    <select
                      value={`${tableSortBy}:${tableSortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split(':');
                        setTableSortBy(field);
                        setTableSortOrder(order as 'asc' | 'desc');
                      }}
                      className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="stt:asc">🔢 STT (1 → N)</option>
                      <option value="stt:desc">🔢 STT (N → 1)</option>
                      <option value="_submittedAt:desc">🕒 Mới gửi gần nhất</option>
                      <option value="_submittedAt:asc">🕒 Gửi cũ nhất</option>
                      <option value="identifier:asc">🔤 Tên / Lớp (A → Z)</option>
                      <option value="identifier:desc">🔤 Tên / Lớp (Z → A)</option>
                      <option value="_isComplete:desc">✅ Đã hoàn thành trước</option>
                      <option value="_isComplete:asc">⏳ Chưa nộp trước</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Excel Spreadsheet Table Display */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-[550px] overflow-x-auto overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    {/* Header: Multi-tier when Excel merged headers exist, single-tier otherwise */}
                    <thead className="bg-slate-100/95 sticky top-0 z-10 border-b border-slate-200 select-none">
                      {currentReport.columns.some((c) => c.groupName) ? (
                        <>
                          {/* Row 1: Merged Group Headers & Unmerged Columns */}
                          <tr>
                            <th
                              rowSpan={2}
                              onClick={() => handleToggleColumnSort('stt')}
                              title="Bấm để sắp xếp theo STT"
                              className="py-2 px-3 font-black text-slate-700 whitespace-nowrap border-r border-slate-200 w-12 text-center bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>#</span>
                                {tableSortBy === 'stt' && (
                                  <span className="text-teal-700 font-black text-[10px]">
                                    {tableSortOrder === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </div>
                            </th>
                            {(() => {
                              const headerGroups: { title?: string; cols: ReportColumn[] }[] = [];
                              currentReport.columns.forEach((col) => {
                                const lastGroup = headerGroups[headerGroups.length - 1];
                                if (col.groupName) {
                                  if (lastGroup && lastGroup.title === col.groupName) {
                                    lastGroup.cols.push(col);
                                  } else {
                                    headerGroups.push({ title: col.groupName, cols: [col] });
                                  }
                                } else {
                                  headerGroups.push({ title: undefined, cols: [col] });
                                }
                              });

                              return headerGroups.map((grp, gIdx) => {
                                if (grp.title) {
                                  return (
                                    <th
                                      key={`grp_${gIdx}`}
                                      colSpan={grp.cols.length}
                                      className="py-2 px-3 font-black text-center whitespace-nowrap border-r border-b border-teal-300 bg-teal-100/90 text-teal-950 uppercase tracking-wide text-[11px]"
                                    >
                                      <div className="flex items-center justify-center gap-1.5">
                                        <span>🏷️ {grp.title}</span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-200 text-teal-900 font-extrabold">
                                          {grp.cols.length} cột
                                        </span>
                                      </div>
                                    </th>
                                  );
                                }
                                const col = grp.cols[0];
                                return (
                                  <th
                                    key={col.id}
                                    rowSpan={2}
                                    onClick={() => handleToggleColumnSort(col.id)}
                                    title={`Bấm để sắp xếp theo ${col.name}`}
                                    className={`py-2 px-3 font-black whitespace-nowrap border-r border-slate-200 text-slate-800 cursor-pointer hover:bg-teal-50/80 transition-colors ${
                                      col.isInputField ? 'bg-teal-50/70 text-teal-950' : 'bg-slate-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span>{col.name}</span>
                                      {tableSortBy === col.id ? (
                                        <span className="text-teal-700 font-black text-[10px]">
                                          {tableSortOrder === 'asc' ? '▲' : '▼'}
                                        </span>
                                      ) : (
                                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 hover:opacity-100" />
                                      )}
                                      {col.isInputField && (
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-teal-200/80 text-teal-800 font-extrabold" title="Cột này có trong Form để người dùng điền">
                                          FORM
                                        </span>
                                      )}
                                    </div>
                                  </th>
                                );
                              });
                            })()}
                            <th rowSpan={2} className="py-2 px-3 font-black text-slate-700 whitespace-nowrap text-center w-24 bg-slate-100 border-l border-slate-200">
                              Thao tác
                            </th>
                          </tr>

                          {/* Row 2: Sub-columns for Merged Groups */}
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            {currentReport.columns
                              .filter((c) => c.groupName)
                              .map((col) => (
                                <th
                                  key={`sub_${col.id}`}
                                  onClick={() => handleToggleColumnSort(col.id)}
                                  title={`Bấm để sắp xếp theo ${col.subName || col.name}`}
                                  className={`py-1.5 px-2.5 font-bold text-center whitespace-nowrap border-r border-slate-200 text-xs text-slate-800 cursor-pointer hover:bg-teal-100/70 transition-colors ${
                                    col.isInputField ? 'bg-teal-50/50 text-teal-950 font-black' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{col.subName || col.name}</span>
                                    {tableSortBy === col.id && (
                                      <span className="text-teal-700 font-black text-[10px]">
                                        {tableSortOrder === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                    {col.isInputField && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 inline-block" title="Trường nhập liệu Form" />
                                    )}
                                  </div>
                                </th>
                              ))}
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <th
                            onClick={() => handleToggleColumnSort('stt')}
                            title="Bấm để sắp xếp theo STT"
                            className="py-2.5 px-3 font-black text-slate-700 whitespace-nowrap border-r border-slate-200 w-12 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>#</span>
                              {tableSortBy === 'stt' && (
                                <span className="text-teal-700 font-black text-[10px]">
                                  {tableSortOrder === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </div>
                          </th>
                          {currentReport.columns.map((col) => (
                            <th
                              key={col.id}
                              onClick={() => handleToggleColumnSort(col.id)}
                              title={`Bấm để sắp xếp theo ${col.name}`}
                              className={`py-2.5 px-3 font-black whitespace-nowrap border-r border-slate-200 text-slate-800 cursor-pointer hover:bg-teal-50/80 transition-colors ${
                                col.isInputField ? 'bg-teal-50/70 text-teal-900' : ''
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span>{col.name}</span>
                                {tableSortBy === col.id ? (
                                  <span className="text-teal-700 font-black text-[10px]">
                                    {tableSortOrder === 'asc' ? '▲' : '▼'}
                                  </span>
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 hover:opacity-100" />
                                )}
                                {col.isInputField && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-teal-200/80 text-teal-800 font-extrabold" title="Cột này có trong Form để người dùng điền">
                                    FORM
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                          <th className="py-2.5 px-3 font-black text-slate-700 whitespace-nowrap text-center w-24">
                            Thao tác
                          </th>
                        </tr>
                      )}
                    </thead>

                    {/* Body */}
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={currentReport.columns.length + 2} className="py-8 text-center text-slate-400">
                            Không có dòng nào phù hợp với bộ lọc tìm kiếm.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row, index) => {
                          const isComplete = row._isComplete;
                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors hover:bg-teal-50/30 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                              }`}
                            >
                              {/* Row Index */}
                              <td className="py-2 px-3 text-center font-bold text-slate-500 border-r border-slate-100 text-[11px]">
                                <div className="flex items-center justify-center gap-1">
                                  <span>{index + 1}</span>
                                  {isComplete ? (
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="Đã hoàn thành số liệu" />
                                  ) : (
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" title="Chưa đủ số liệu" />
                                  )}
                                </div>
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
                                        type={col.type === 'number' && !isPersonNameOrTextColumn(col.name) ? 'number' : 'text'}
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
                                      <div className="flex flex-col">
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
                                        {(col.id === currentReport.identifierColumnId || col.isIdentifier) && row._submittedBy && (
                                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-teal-800 font-medium">
                                            <span className="px-1.5 py-0.2 rounded-md bg-teal-100/90 text-teal-900 font-bold text-[9px]">
                                              👤 {row._submittedBy}
                                            </span>
                                            {row._submittedAt && (
                                              <span className="text-slate-400 text-[9px]">
                                                • {new Date(row._submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Actions */}
                              <td className="py-2 px-3 text-center whitespace-nowrap space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenFormForRow(row)}
                                  className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-extrabold text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  title="Mở form điền cho dòng này"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Điền</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const idCol = currentReport.columns.find((c) => c.id === currentReport.identifierColumnId || c.isIdentifier) || currentReport.columns[1];
                                    const label = idCol && row[idCol.id] ? String(row[idCol.id]) : `Dòng ID: ${row.id}`;
                                    setRowToDelete({ rowId: row.id, label });
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  title="Xóa dòng này khỏi bảng báo cáo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Xóa</span>
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
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {/* AI Assistant Banner */}
                  <div className="p-3 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-100/50 rounded-2xl border border-teal-200/90 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                          <span>Phân Tích Cột Gộp & Cột Không Gộp Excel</span>
                          {wizardHasMergedHeaders && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-200 text-teal-900 font-extrabold">
                              {wizardMergedGroups.length} nhóm gộp
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-teal-800 font-medium">
                          Tất cả cột gộp và cột độc lập đã được nhận diện đầy đủ để đưa vào Form nhập liệu.
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAiEnhanceForm}
                      disabled={isAiAnalyzingHeaders}
                      className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 shrink-0 transition-all active:scale-95"
                      title="Sử dụng AI phân tích và chuẩn hóa nhãn cột gộp & mô tả nhập liệu"
                    >
                      {isAiAnalyzingHeaders ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>{isAiAnalyzingHeaders ? 'AI đang quét...' : '✨ AI Chuẩn Hóa Cột'}</span>
                    </button>
                  </div>

                  {/* Header & Quick toggles */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-teal-900 tracking-wide">
                      Danh sách trường nhập liệu trong Form ({wizardColumns.filter((c) => c.isInputField).length}/{wizardColumns.length} cột)
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setWizardColumns((prev) => prev.map((c) => ({ ...c, isInputField: true })))}
                        className="text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                      >
                        Chọn tất cả
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => setWizardColumns((prev) => prev.map((c) => ({ ...c, isInputField: false })))}
                        className="text-slate-500 hover:text-slate-700 font-medium underline cursor-pointer"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  </div>

                  {/* Columns List Grouped by Merged vs Unmerged */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {/* 1. Merged Groups */}
                    {wizardMergedGroups.map((groupTitle) => {
                      const groupCols = wizardColumns.filter((c) => c.groupName === groupTitle);
                      if (groupCols.length === 0) return null;
                      return (
                        <div key={groupTitle} className="p-2.5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-2">
                          <div className="flex items-center justify-between text-xs font-black text-teal-950 pb-1 border-b border-teal-100">
                            <span className="flex items-center gap-1.5">
                              <span className="text-teal-600">🏷️ CỘT GỘP:</span>
                              <span>{groupTitle}</span>
                            </span>
                            <span className="text-[10px] font-bold text-teal-700">
                              {groupCols.length} cột con
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {groupCols.map((col) => (
                              <div
                                key={col.id}
                                className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 text-xs transition-colors ${
                                  col.isInputField ? 'bg-white border-teal-300 text-teal-950 font-bold shadow-2xs' : 'bg-slate-50/80 border-slate-200 text-slate-500'
                                }`}
                              >
                                <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={col.isInputField}
                                    onChange={() => handleToggleColumnInputField(col.id)}
                                    className="w-4 h-4 text-teal-600 rounded cursor-pointer shrink-0"
                                  />
                                  <span className="truncate">{col.subName || col.name}</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleToggleColumnType(col.id)}
                                  className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold cursor-pointer transition-colors shrink-0 ${
                                    col.type === 'number'
                                      ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                                      : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
                                  }`}
                                  title="Bấm để chuyển đổi giữa Kiểu Chữ và Kiểu Số"
                                >
                                  {col.type === 'number' ? '🔢 Số' : '🔤 Chữ'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* 2. Standalone / Unmerged Columns */}
                    {(() => {
                      const unmergedCols = wizardColumns.filter((c) => !c.groupName);
                      if (unmergedCols.length === 0) return null;
                      return (
                        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-black text-slate-800 pb-1 border-b border-slate-200">
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-500">📋 CỘT ĐỘC LẬP (KHÔNG GỘP):</span>
                              <span>Thông tin chung & số liệu đơn lẻ</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {unmergedCols.length} cột
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {unmergedCols.map((col) => (
                              <div
                                key={col.id}
                                className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 text-xs transition-colors ${
                                  col.isInputField ? 'bg-white border-teal-300 text-teal-950 font-bold shadow-2xs' : 'bg-slate-100/70 border-slate-200 text-slate-500'
                                }`}
                              >
                                <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={col.isInputField}
                                    onChange={() => handleToggleColumnInputField(col.id)}
                                    className="w-4 h-4 text-teal-600 rounded cursor-pointer shrink-0"
                                  />
                                  <span className="truncate">{col.name}</span>
                                </label>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleColumnType(col.id)}
                                    className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold cursor-pointer transition-colors ${
                                      col.type === 'number'
                                        ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                                        : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
                                    }`}
                                    title="Bấm để chuyển đổi giữa Kiểu Chữ và Kiểu Số"
                                  >
                                    {col.type === 'number' ? '🔢 Số' : '🔤 Chữ'}
                                  </button>
                                  {col.id === wizardIdentifierColId && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-100 text-indigo-800 font-extrabold">
                                      ĐỊNH DANH
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
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

            {/* Syncing status */}
            {isSharingSyncing ? (
              <div className="p-2 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-center gap-2 text-teal-800 text-xs font-bold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                <span>Đang đồng bộ biểu mẫu lên Cloud Firestore...</span>
              </div>
            ) : (
              <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-1.5 text-emerald-800 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Biểu mẫu đã sẵn sàng tiếp nhận số liệu trực tuyến</span>
              </div>
            )}

            {/* QR Code Container */}
            <div className="p-4 bg-teal-50/60 rounded-3xl border border-teal-100 flex flex-col items-center justify-center space-y-2.5">
              <div className="w-56 h-56 bg-white p-3 rounded-2xl shadow-md border border-teal-200 flex items-center justify-center">
                <img
                  src={qrCodeDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`}
                  alt="Mã QR Form Nhập Liệu"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-slate-600 font-medium">
                  Quét bằng Camera hoặc Zalo để mở Form
                </p>
                {qrCodeDataUrl && (
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title="Tải ảnh mã QR để gửi hoặc in dán"
                  >
                    <Download className="w-3 h-3" />
                    <span>Lưu mã QR</span>
                  </button>
                )}
              </div>
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
                </button>
              </div>
            </div>

            {/* Note badge */}
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-left flex items-center gap-2 text-emerald-950 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="font-semibold text-[11px] leading-snug">
                Người nhận bấm vào liên kết hoặc quét mã QR để nhập số liệu ngay, <strong>hoàn toàn không cần đăng nhập tài khoản</strong>.
              </span>
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

            <form onSubmit={(e) => handleInternalFormSubmit(e, false)} className="space-y-4">
              {/* Header Mode & Duplicate Safety Status (Replaces old row selector dropdown) */}
              {editingRowLabel ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
                    <span className="text-teal-900 font-bold">
                      Đang sửa số liệu: <strong className="font-black text-teal-950">{editingRowLabel}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenFormNew()}
                    className="text-[11px] font-extrabold text-teal-700 hover:text-teal-950 underline cursor-pointer"
                  >
                    + Nhập dòng mới
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="font-bold">
                      Chế độ: <strong className="font-black">Nhập dữ liệu mới</strong> (Chống mất dữ liệu khi nhiều người cùng nhập)
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    Đã có {currentReport.rows.length} dòng
                  </span>
                </div>
              )}

              {/* Real-time Concurrent Duplicate Warning & Resolution */}
              {duplicateMatchInfo && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2.5 text-xs animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <h4 className="font-black text-amber-950 flex items-center gap-1.5 flex-wrap">
                        <span>Phát hiện dữ liệu đã tồn tại:</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-900 font-black text-[11px]">
                          {duplicateMatchInfo.colName}: "{duplicateMatchInfo.value}"
                        </span>
                      </h4>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        Đã có bản ghi trên hệ thống{duplicateMatchInfo.row._submittedBy ? ` do "${duplicateMatchInfo.row._submittedBy}" nộp` : ''}{duplicateMatchInfo.row._submittedAt ? ` lúc ${new Date(duplicateMatchInfo.row._submittedAt).toLocaleTimeString('vi-VN')}` : ''}. Để tránh bị đè hoặc mất dữ liệu khi cùng nhập, vui lòng chọn:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/90">
                    <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${duplicateResolution === 'create_new' ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="dup_resolution"
                        checked={duplicateResolution === 'create_new'}
                        onChange={() => setDuplicateResolution('create_new')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-[11px]">
                        <span className="font-black text-emerald-900 block">✨ Lưu thành dòng mới riêng biệt</span>
                        <span className="text-slate-500 text-[10px]">An toàn tuyệt đối - Giữ trọn số liệu cả hai</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${duplicateResolution === 'overwrite' ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-400/30' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="dup_resolution"
                        checked={duplicateResolution === 'overwrite'}
                        onChange={() => setDuplicateResolution('overwrite')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="text-[11px]">
                        <span className="font-black text-amber-900 block">✏️ Cập nhật đè lên dòng đã có</span>
                        <span className="text-slate-500 text-[10px]">Chỉ chọn khi Thầy/Cô muốn sửa lại số liệu cũ</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Dynamic input fields organized in EXACT natural order of report columns */}
              <div className="space-y-3.5">
                {(() => {
                  const inputCols = currentReport.columns.filter(
                    (c) => c.isInputField || c.isIdentifier || c.id === currentReport.identifierColumnId
                  );
                  const blocks = getOrderedFormFieldBlocks(inputCols);

                  const renderFormField = (col: ReportColumn, isCompactGroup = false) => {
                    const val = formData[col.id] !== undefined ? formData[col.id] : '';
                    const isColName = isPersonNameOrTextColumn(col.subName || col.name);
                    const isNumber = col.type === 'number' && !isColName;
                    const isTextArea = !isNumber && (col.name.toLowerCase().includes('ghi chú') || col.name.toLowerCase().includes('khó khăn'));
                    const isSttField = col.id === 'col_stt' || col.name.toLowerCase() === 'stt';

                    return (
                      <div
                        key={col.id}
                        className={`space-y-1 ${isTextArea ? 'sm:col-span-2' : ''}`}
                      >
                        <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                          <span className="truncate">
                            {col.subName || col.name}{' '}
                            {col.required && <span className="text-rose-500 font-black">*</span>}
                          </span>
                          <span className="text-[9px] text-slate-400 shrink-0">
                            {isSttField ? 'Tự tăng' : isNumber ? 'Số' : 'Chữ'}
                          </span>
                        </label>
                        {isNumber ? (
                          <input
                            type="number"
                            value={val}
                            onChange={(e) =>
                              handleFormFieldChange(col.id, e.target.value === '' ? '' : Number(e.target.value))
                            }
                            required={col.required}
                            placeholder={`Nhập ${col.subName || col.name}...`}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                          />
                        ) : isTextArea ? (
                          <textarea
                            rows={2}
                            value={val}
                            onChange={(e) => handleFormFieldChange(col.id, e.target.value)}
                            required={col.required}
                            placeholder={`Nhập ${col.name}...`}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                          />
                        ) : (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => handleFormFieldChange(col.id, e.target.value)}
                            required={col.required}
                            placeholder={`Nhập ${col.subName || col.name}...`}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                          />
                        )}
                      </div>
                    );
                  };

                  return blocks.map((block, bIdx) => {
                    if (block.type === 'standalone_group') {
                      return (
                        <div
                          key={`standalone_blk_${bIdx}`}
                          className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {block.columns.map((col) => renderFormField(col))}
                          </div>
                        </div>
                      );
                    }

                    // Merged group block
                    return (
                      <div
                        key={`merged_blk_${block.groupName}_${bIdx}`}
                        className="p-3 bg-teal-50/70 rounded-2xl border border-teal-200/90 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs font-black text-teal-950 pb-1 border-b border-teal-200/70">
                          <span className="flex items-center gap-1.5">
                            <span>🏷️ {block.groupName}</span>
                          </span>
                          <span className="text-[10px] font-bold text-teal-700">
                            {block.columns.length} trường
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {block.columns.map((col) => renderFormField(col, true))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Actions with Save & Add New and Save & Close */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInputFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>

                <div className="flex items-center gap-2">
                  {/* Nút 1: Lưu & Thêm Mới để tránh thoát form đang nhập */}
                  <button
                    type="button"
                    onClick={() => handleInternalFormSubmit(undefined, true)}
                    disabled={isSubmittingForm}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
                    title="Lưu số liệu này và giữ form để tiếp tục nhập dòng tiếp theo"
                  >
                    {isSubmittingForm && submittingAction === 'save_new' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                    <span>Lưu & Thêm Mới</span>
                  </button>

                  {/* Nút 2: Lưu & Đóng */}
                  <button
                    type="submit"
                    disabled={isSubmittingForm}
                    className="px-4.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {isSubmittingForm && submittingAction === 'save_close' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Lưu & Đóng</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CUSTOM CONFIRMATION MODAL - SINGLE REPORT DELETION    */}
      {/* ============================================================== */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-base font-black text-slate-900">
                  Xác Nhận Xóa Báo Cáo
                </h3>
                <p className="text-xs text-rose-600 font-bold">Thao tác này không thể hoàn tác!</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Tên mẫu báo cáo:</span>
                <p className="font-black text-slate-900 text-sm leading-snug">{reportToDelete.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-500">Số dòng dữ liệu:</span>
                  <div className="font-bold text-slate-800">{reportToDelete.rows.length} đối tượng</div>
                </div>
                <div>
                  <span className="text-slate-500">File đính kèm:</span>
                  <div className="font-bold text-slate-800 truncate">{reportToDelete.fileName || 'Excel'}</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-50 transition-all"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteSingleReport}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Xóa Vĩnh Viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CUSTOM CONFIRMATION MODAL - BULK REPORT DELETION      */}
      {/* ============================================================== */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-base font-black text-slate-900">
                  Xóa Hàng Loạt Báo Cáo
                </h3>
                <p className="text-xs text-rose-600 font-bold">Thầy/Cô đang chọn xóa {selectedReportIdsForBulk.length} mẫu báo cáo!</p>
              </div>
            </div>

            <div className="bg-rose-50/60 rounded-2xl p-3 border border-rose-200 text-xs space-y-1.5 max-h-40 overflow-y-auto">
              <span className="font-bold text-rose-900 block">Các báo cáo sẽ bị xóa hoàn toàn:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                {(state.urgentReports || [])
                  .filter((r) => selectedReportIdsForBulk.includes(r.id))
                  .map((r) => (
                    <li key={r.id} className="font-semibold text-slate-900 truncate">
                      {r.title}
                    </li>
                  ))}
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-50 transition-all"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteBulk}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Xác Nhận Xóa {selectedReportIdsForBulk.length} Báo Cáo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: CUSTOM CONFIRMATION MODAL - SPREADSHEET ROW DELETION */}
      {/* ============================================================== */}
      {rowToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm font-black text-slate-900">
                  Xóa Dòng Dữ Liệu
                </h3>
                <p className="text-xs text-slate-500 truncate">{rowToDelete.label}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Thầy/Cô có chắc chắn muốn xóa dòng số liệu này khỏi mẫu báo cáo?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setRowToDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteRow}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Xóa Dòng Này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FLOATING TOAST NOTIFICATION FEEDBACK                           */}
      {/* ============================================================== */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 max-w-md">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold leading-snug">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-white cursor-pointer ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
