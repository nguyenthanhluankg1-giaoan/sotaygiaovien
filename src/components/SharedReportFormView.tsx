import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Calendar,
  Lock,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  School,
  Share2,
  PlusCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  User,
  ListOrdered
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UrgentReportItem, ReportRow, ReportColumn, UserAccount } from '../types';
import { fetchUrgentReportFromFirestore, submitReportRowToFirestore, saveUrgentReportToFirestore } from '../services/dbService';
import { isPersonNameOrTextColumn, getOrderedFormFieldBlocks } from '../utils/excelReportHelper';
import { DEFAULT_URGENT_REPORTS } from '../utils/helpers';

interface SharedReportFormViewProps {
  reportId: string;
  currentUser?: UserAccount | null;
  onBackToApp?: () => void;
}

const sortRowsNaturally = (rows: ReportRow[], columns: ReportColumn[], identifierColId?: string): ReportRow[] => {
  const sttCol = columns.find(
    (c) => c.id === 'col_stt' || c.name.toLowerCase() === 'stt' || c.name.toLowerCase().includes('số tt')
  );
  const idCol = columns.find((c) => c.id === identifierColId || c.isIdentifier) || columns[1] || columns[0];

  return [...rows].sort((a, b) => {
    // 1. If STT column exists and has numeric values
    if (sttCol) {
      const valA = a[sttCol.id];
      const valB = b[sttCol.id];
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && String(valA).trim() !== '' && String(valB).trim() !== '') {
        return numA - numB;
      }
    }
    // 2. Natural Vietnamese collation by identifier (e.g. Lớp 1/1, 1/2... 5/2)
    if (idCol) {
      const strA = a[idCol.id] !== undefined && a[idCol.id] !== null ? String(a[idCol.id]).trim() : '';
      const strB = b[idCol.id] !== undefined && b[idCol.id] !== null ? String(b[idCol.id]).trim() : '';
      if (strA && strB) {
        return strA.localeCompare(strB, 'vi', { numeric: true, sensitivity: 'base' });
      }
      if (strA) return -1;
      if (strB) return 1;
    }
    return 0;
  });
};

export const SharedReportFormView: React.FC<SharedReportFormViewProps> = ({
  reportId,
  currentUser,
  onBackToApp
}) => {
  const [report, setReport] = useState<UrgentReportItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Selected row or new row
  const [selectedRowId, setSelectedRowId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [submitterName, setSubmitterName] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submittingAction, setSubmittingAction] = useState<'save_new' | 'save_close' | null>(null);
  const [duplicateMatchInfo, setDuplicateMatchInfo] = useState<{
    row: ReportRow;
    colName: string;
    value: string;
  } | null>(null);
  const [duplicateResolution, setDuplicateResolution] = useState<'create_new' | 'overwrite'>('create_new');
  const [listSearchTerm, setListSearchTerm] = useState<string>('');
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    async function loadReport() {
      setLoading(true);
      setErrorMsg('');
      try {
        let data = await fetchUrgentReportFromFirestore(reportId);
        // Fallback: If not yet in Firestore, check DEFAULT_URGENT_REPORTS
        if (!data) {
          const defaultMatch = DEFAULT_URGENT_REPORTS.find((r) => r.id === reportId);
          if (defaultMatch) {
            data = defaultMatch;
            saveUrgentReportToFirestore(defaultMatch).catch(() => {});
          }
        }
        if (active) {
          if (data) {
            // Automatically ensure Họ và tên and text columns are type: 'text'
            const sanitizedColumns = (data.columns || []).map((c) => {
              const isNameOrText = isPersonNameOrTextColumn(c.name) || isPersonNameOrTextColumn(c.subName || '');
              return {
                ...c,
                type: isNameOrText ? ('text' as const) : c.type
              };
            });
            const sortedRows = sortRowsNaturally(data.rows || [], sanitizedColumns, data.identifierColumnId);
            const sanitizedData = { ...data, columns: sanitizedColumns, rows: sortedRows };
            setReport(sanitizedData);
            // Default select the first row if available
            if (sortedRows.length > 0) {
              const firstRow = sortedRows[0];
              setSelectedRowId(firstRow.id);
              setFormData({ ...firstRow });
              const idCol = sanitizedColumns.find((c) => c.id === data.identifierColumnId || c.isIdentifier);
              if (idCol && firstRow[idCol.id]) {
                setSubmitterName(String(firstRow[idCol.id]));
              }
            }
          } else {
            setErrorMsg('Không tìm thấy thông tin mẫu báo cáo trên hệ thống. Vui lòng kiểm tra lại đường link hoặc liên hệ Quản trị viên.');
          }
        }
      } catch (err: any) {
        if (active) {
          setErrorMsg('Lỗi khi tải dữ liệu báo cáo: ' + (err?.message || 'Vui lòng kiểm tra lại đường truyền'));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (reportId) {
      loadReport();
    }
    return () => {
      active = false;
    };
  }, [reportId, retryCount]);

  // When selectedRowId changes, update formData
  const handleSelectRow = (rowId: string) => {
    setSelectedRowId(rowId);
    setIsCreatingNew(false);
    if (!report) return;
    const target = report.rows.find((r) => r.id === rowId);
    if (target) {
      setFormData({ ...target });
      const idCol = report.columns.find((c) => c.id === report.identifierColumnId || c.isIdentifier);
      if (idCol && target[idCol.id]) {
        setSubmitterName(String(target[idCol.id]));
      }
    }
  };

  const handleStartNewRow = () => {
    setIsCreatingNew(true);
    setSelectedRowId('new_row_' + Date.now());
    const initial: Record<string, any> = {};
    if (report) {
      report.columns.forEach((col) => {
        initial[col.id] = col.defaultValue !== undefined ? col.defaultValue : '';
      });
    }
    setFormData(initial);
  };

  // Check duplicate matches in real-time when user types
  const checkDuplicate = (data: Record<string, any>, currentEditId: string | null) => {
    if (!report || !report.rows || report.rows.length === 0) return null;

    const checkCols = report.columns.filter((c) =>
      c.isIdentifier ||
      c.id === report.identifierColumnId ||
      c.name.toLowerCase().includes('lớp') ||
      c.name.toLowerCase().includes('họ và tên') ||
      c.name.toLowerCase().includes('họ tên')
    );

    for (const col of checkCols) {
      const val = data[col.id];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const valStr = String(val).trim().toLowerCase();
        const matched = report.rows.find((r) => {
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

  const handleFieldChange = (colId: string, val: any) => {
    setFormData((prev) => {
      const next = { ...prev, [colId]: val };
      const dup = checkDuplicate(next, isCreatingNew ? null : selectedRowId);
      setDuplicateMatchInfo(dup);
      return next;
    });
  };

  const handleSubmit = async (e?: React.FormEvent, keepOpen: boolean = false) => {
    if (e) e.preventDefault();
    if (!report) return;

    if (report.status === 'closed') {
      alert('Mẫu báo cáo này đã được khóa. Không thể gửi thêm số liệu!');
      return;
    }

    // Validate required fields
    const requiredCols = report.columns.filter((c) => c.required && (c.isInputField || c.isIdentifier));
    for (const c of requiredCols) {
      const val = formData[c.id];
      if (val === undefined || val === null || String(val).trim() === '') {
        alert(`Vui lòng điền thông tin cho cột bắt buộc: "${c.subName || c.name}"`);
        return;
      }
    }

    setSubmitting(true);
    setSubmittingAction(keepOpen ? 'save_new' : 'save_close');
    setSuccessMsg('');
    setErrorMsg('');

    try {
      let targetRowId = selectedRowId;
      let isNew = isCreatingNew;

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

      const result = await submitReportRowToFirestore(
        report.id,
        rowToSubmit,
        isNew,
        submitterName || currentUser?.name || 'Giáo viên'
      );

      if (result.success && result.report) {
        const sortedUpdatedRows = sortRowsNaturally(
          result.report.rows,
          result.report.columns,
          result.report.identifierColumnId
        );
        setReport({ ...result.report, rows: sortedUpdatedRows });

        const idCol = report.columns.find((c) => c.id === report.identifierColumnId || c.isIdentifier) || report.columns[1] || report.columns[0];
        const rowTitle = idCol && rowToSubmit[idCol.id] ? String(rowToSubmit[idCol.id]) : 'số liệu';

        if (keepOpen) {
          setSuccessMsg(`🎉 Đã lưu thành công số liệu "${rowTitle}"! Biểu mẫu đã sẵn sàng để Thầy/Cô tiếp tục nhập đối tượng tiếp theo.`);
          // Reset form for next entry
          setFormData({});
          setIsCreatingNew(true);
          setSelectedRowId(`row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
          setDuplicateMatchInfo(null);
          setDuplicateResolution('create_new');
        } else {
          setSuccessMsg(`🎉 Đã gửi số liệu báo cáo "${rowTitle}" thành công! Dữ liệu đã được cập nhật vào bảng tổng hợp của nhà trường.`);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } else {
        setErrorMsg(result.error || 'Có lỗi xảy ra khi nộp số liệu.');
      }
    } catch (err: any) {
      setErrorMsg('Không thể lưu số liệu: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setSubmitting(false);
      setSubmittingAction(null);
    }
  };

  // Ensure ALL hooks are called unconditionally BEFORE any early return statements to avoid React Error #310
  const idCol = useMemo(() => {
    if (!report || !report.columns) return null;
    return report.columns.find((c) => c.id === report.identifierColumnId || c.isIdentifier) || report.columns[1] || report.columns[0] || null;
  }, [report]);

  const inputColumns = useMemo(() => {
    if (!report || !report.columns) return [];
    const base = report.columns.filter((c) => c.isInputField);
    // If creating a new row, ensure idCol is editable in the form so user can enter name/class
    if (isCreatingNew && idCol && !base.some((c) => c.id === idCol.id)) {
      const colIndex = report.columns.findIndex((c) => c.id === idCol.id);
      const list = [...base];
      list.splice(colIndex >= 0 ? colIndex : 0, 0, idCol);
      return list;
    }
    return base;
  }, [report, isCreatingNew, idCol]);

  const isClosed = report ? report.status === 'closed' : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center animate-spin mb-3">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-sm font-black text-teal-800">Đang tải biểu mẫu báo cáo...</p>
        <span className="text-xs text-slate-500 mt-1">Vui lòng chờ trong giây lát</span>
      </div>
    );
  }

  if (errorMsg && !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-rose-200 p-6 sm:p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Không thể mở biểu mẫu báo cáo</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{errorMsg}</p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setLoading(true);
                setRetryCount((c) => c + 1);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử tải lại biểu mẫu</span>
            </button>
            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs cursor-pointer transition-all"
              >
                Quay lại ứng dụng
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/80 via-emerald-50/40 to-teal-100/50 py-6 px-3 sm:px-6 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-4">
        {/* Top actions & brand */}
        <div className="flex items-center justify-between gap-2">
          {onBackToApp ? (
            <button
              onClick={onBackToApp}
              className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-teal-800 border border-teal-200 font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{currentUser ? 'Về bảng điều khiển' : 'Đăng nhập tài khoản'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-xs">
                TY1
              </div>
              <span className="text-xs font-black text-teal-900">Trường TH Thạnh Yên 1</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {report.urgentLevel === 'very_urgent' && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] animate-pulse">
                ⚡ HỎA TỐC
              </span>
            )}
            {report.urgentLevel === 'urgent' && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px]">
                🔥 BÁO CÁO GẤP
              </span>
            )}
            {isClosed ? (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-700 text-white font-black text-[10px] flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>ĐÃ KHÓA</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px]">
                🟢 ĐANG NHẬN
              </span>
            )}
          </div>
        </div>

        {/* Banner: Public direct input without requiring login */}
        {!currentUser && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 text-emerald-950 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="font-extrabold text-xs text-emerald-900 leading-snug">
                  Đường link chia sẻ nhập báo cáo trực tuyến
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Quý Thầy/Cô nhập trực tiếp số liệu tại đây — <strong>Hoàn toàn không cần đăng nhập tài khoản</strong>.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-[10px] shrink-0">
              ✓ Tự do nhập
            </span>
          </div>
        )}

        {/* Report Header Card */}
        <div className="bg-white rounded-3xl border-2 border-teal-200 p-5 sm:p-7 shadow-lg shadow-teal-900/5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-black uppercase text-teal-700 tracking-wider">
                BIỂU MẪU NHẬP LIỆU BÁO CÁO GẤP
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug mt-0.5">
                {report.title}
              </h1>
            </div>
          </div>

          {report.description && (
            <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-2xl text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-wrap">
              {report.description}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-teal-600" />
              <span>Người tạo: <strong>{report.creatorName}</strong></span>
            </div>
            {report.deadline && (
              <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Hạn nộp: {new Date(report.deadline).toLocaleString('vi-VN')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Closed notification */}
        {isClosed && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              Biểu mẫu này đã kết thúc thời gian thu thập hoặc được người phụ trách khóa lại. Vui lòng liên hệ quản trị viên nếu cần cập nhật bổ sung.
            </p>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-emerald-900">Gửi số liệu thành công!</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-800 font-bold">{errorMsg}</p>
          </div>
        )}

        {/* Form Body */}
        {!isClosed && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-md space-y-5">
            {/* Row Selector / Identifier */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-black text-slate-800 flex items-center justify-between">
                <span>1. Chọn thông tin của Thầy/Cô ({idCol ? idCol.name : 'Dòng báo cáo'}): <span className="text-rose-500">*</span></span>
                {report.allowNewRows && (
                  <button
                    type="button"
                    onClick={handleStartNewRow}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                  >
                    + Thêm đối tượng mới
                  </button>
                )}
              </label>

              {!isCreatingNew ? (
                <div className="space-y-1.5">
                  <select
                    value={selectedRowId}
                    onChange={(e) => handleSelectRow(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                  >
                    {report.rows.map((row, idx) => {
                      const displayTitle = idCol && row[idCol.id] ? String(row[idCol.id]) : `Dòng ${idx + 1}`;
                      const extraInfo = report.columns[2] && row[report.columns[2].id] ? ` (${row[report.columns[2].id]})` : '';
                      const statusIcon = row._isComplete ? '✅ ' : '⏳ ';
                      return (
                        <option key={row.id} value={row.id}>
                          {statusIcon} {displayTitle} {extraInfo} {row._isComplete ? '- Đã điền' : '- Chưa đủ số liệu'}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    💡 Thầy/Cô chỉ cần chọn đúng tên Lớp / Tên của mình trong danh sách trên để xem và cập nhật số liệu.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-teal-50/80 rounded-xl border border-teal-200 text-xs text-teal-900 font-bold flex items-center justify-between">
                  <span>✨ Đang thêm một dòng số liệu mới vào danh sách</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (report.rows[0]) handleSelectRow(report.rows[0].id);
                    }}
                    className="text-teal-700 underline cursor-pointer hover:text-teal-900"
                  >
                    Hủy thêm mới
                  </button>
                </div>
              )}
            </div>

            {/* Real-time Concurrent Duplicate Warning & Resolution */}
            {duplicateMatchInfo && (
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2.5 text-xs animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <h4 className="font-black text-amber-950 flex items-center gap-1.5 flex-wrap">
                      <span>Phát hiện dữ liệu đã có người nộp:</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-900 font-black text-[11px]">
                        {duplicateMatchInfo.colName}: "{duplicateMatchInfo.value}"
                      </span>
                    </h4>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      Đã có bản ghi trên hệ thống{duplicateMatchInfo.row._submittedBy ? ` do "${duplicateMatchInfo.row._submittedBy}" gửi` : ''}{duplicateMatchInfo.row._submittedAt ? ` lúc ${new Date(duplicateMatchInfo.row._submittedAt).toLocaleTimeString('vi-VN')}` : ''}. Để tránh làm mất hoặc ghi đè dữ liệu của người khác cùng nhập, vui lòng chọn:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/90">
                  <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${duplicateResolution === 'create_new' ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="dup_res_shared"
                      checked={duplicateResolution === 'create_new'}
                      onChange={() => setDuplicateResolution('create_new')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-[11px]">
                      <span className="font-black text-emerald-900 block">✨ Lưu thành bản ghi riêng biệt</span>
                      <span className="text-slate-500 text-[10px]">An toàn tuyệt đối - Giữ trọn dữ liệu cả hai người</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${duplicateResolution === 'overwrite' ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-400/30' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="dup_res_shared"
                      checked={duplicateResolution === 'overwrite'}
                      onChange={() => setDuplicateResolution('overwrite')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-[11px]">
                      <span className="font-black text-amber-900 block">✏️ Cập nhật đè lên dòng này</span>
                      <span className="text-slate-500 text-[10px]">Chỉ chọn khi Thầy/Cô muốn sửa lại số liệu cũ</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Submitter Name input (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Họ và tên người gửi / GV phụ trách:
              </label>
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="Ví dụ: Cô Nguyễn Thị Hoa..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Dynamic Input Fields Generated from Excel Columns in EXACT natural order */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-teal-900 tracking-wider">
                  2. CÁC SỐ LIỆU CẦN ĐIỀN
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {inputColumns.length} trường số liệu
                </span>
              </div>

              {(() => {
                const blocks = getOrderedFormFieldBlocks(inputColumns);

                const renderFormField = (col: ReportColumn, isGrouped = false) => {
                  const currentVal = formData[col.id] !== undefined ? formData[col.id] : '';
                  const isColName = isPersonNameOrTextColumn(col.subName || col.name);
                  const isNumber = col.type === 'number' && !isColName;
                  const isTextArea = !isNumber && (col.name.toLowerCase().includes('ghi chú') || col.name.toLowerCase().includes('khó khăn'));
                  const isSttField = col.id === 'col_stt' || col.name.toLowerCase() === 'stt';

                  return (
                    <div
                      key={col.id}
                      className={`space-y-1.5 ${isTextArea ? 'sm:col-span-2' : ''}`}
                    >
                      <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 inline-block ${isGrouped ? 'bg-teal-600' : 'bg-slate-400'}`} />
                          <span className="truncate">{col.subName || col.name}</span>
                          {col.required && <span className="text-rose-500 font-black shrink-0">*</span>}
                        </span>
                        <span className="text-[10px] font-normal text-slate-400 shrink-0">
                          {isSttField ? 'Tự tăng' : isNumber ? 'Số' : 'Chữ'}
                        </span>
                      </label>

                      {col.description && (
                        <p className="text-[10px] text-teal-700 font-medium truncate">{col.description}</p>
                      )}

                      {isNumber ? (
                        <input
                          type="number"
                          value={currentVal}
                          onChange={(e) => handleFieldChange(col.id, e.target.value === '' ? '' : Number(e.target.value))}
                          required={col.required}
                          placeholder={`Nhập ${col.subName || col.name}...`}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                        />
                      ) : isTextArea ? (
                        <textarea
                          rows={2}
                          value={currentVal}
                          onChange={(e) => handleFieldChange(col.id, e.target.value)}
                          required={col.required}
                          placeholder={`Nhập ${col.name}...`}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => handleFieldChange(col.id, e.target.value)}
                          required={col.required}
                          placeholder={`Nhập ${col.subName || col.name}...`}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                        />
                      )}
                    </div>
                  );
                };

                return (
                  <div className="space-y-4">
                    {blocks.map((block, bIdx) => {
                      if (block.type === 'standalone_group') {
                        return (
                          <div
                            key={`standalone_blk_${bIdx}`}
                            className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {block.columns.map((col) => renderFormField(col, false))}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`merged_blk_${block.groupName}_${bIdx}`}
                          className="bg-teal-50/40 rounded-2xl border-2 border-teal-200/90 overflow-hidden shadow-2xs"
                        >
                          <div className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>🏷️ {block.groupName}</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-extrabold">
                              {block.columns.length} cột số liệu
                            </span>
                          </div>
                          <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white">
                            {block.columns.map((col) => renderFormField(col, true))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Submit buttons */}
            <div className="pt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nút 1: Lưu & Thêm Mới */}
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, true)}
                  disabled={submitting}
                  className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-[0.99]"
                  title="Lưu số liệu đối tượng này và giữ form để nhập tiếp đối tượng tiếp theo"
                >
                  {submitting && submittingAction === 'save_new' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Lưu & Thêm Mới</span>
                    </>
                  )}
                </button>

                {/* Nút 2: Gửi & Hoàn Thành */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {submitting && submittingAction !== 'save_new' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Gửi & Hoàn Thành</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-400 font-medium">
                🔒 Số liệu sau khi gửi sẽ tự động đồng bộ ngay vào file Excel tổng hợp của trường.
              </p>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* DANH SÁCH HIỂN THỊ DỮ LIỆU ĐƯỢC SẮP XẾP GỌN GÀNG, CHUẨN XÁC     */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl border border-teal-200/90 p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-teal-600" />
                <span>Danh Sách & Tiến Độ Gửi Số Liệu</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black">
                  {report.rows.filter((r) => r._isComplete).length} / {report.rows.length} đối tượng đã nộp
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Danh sách được hệ thống tự động sắp xếp gọn gàng theo thứ tự chuẩn. Nhấn vào dòng để nạp nhanh lên form.
              </p>
            </div>

            {/* Quick search */}
            <div className="relative min-w-[180px] max-w-xs w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={listSearchTerm}
                onChange={(e) => setListSearchTerm(e.target.value)}
                placeholder="Tìm lớp, tên đối tượng..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setListStatusFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                listStatusFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({report.rows.length})
            </button>
            <button
              type="button"
              onClick={() => setListStatusFilter('completed')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                listStatusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã nộp ({report.rows.filter((r) => r._isComplete).length})
            </button>
            <button
              type="button"
              onClick={() => setListStatusFilter('pending')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                listStatusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chưa nộp ({report.rows.filter((r) => !r._isComplete).length})
            </button>
          </div>

          {/* Table of Rows */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-black">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">{idCol?.name || 'Tên / Lớp'}</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Người nộp / Thời gian</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200">Trạng thái</th>
                  <th className="py-2.5 px-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filtered = report.rows.filter((row) => {
                    if (listStatusFilter === 'completed' && !row._isComplete) return false;
                    if (listStatusFilter === 'pending' && row._isComplete) return false;
                    if (listSearchTerm.trim()) {
                      const term = listSearchTerm.toLowerCase();
                      const val = idCol && row[idCol.id] ? String(row[idCol.id]).toLowerCase() : '';
                      const by = row._submittedBy ? String(row._submittedBy).toLowerCase() : '';
                      if (!val.includes(term) && !by.includes(term)) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Không tìm thấy dòng nào phù hợp.
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((row, idx) => {
                    const title = idCol && row[idCol.id] ? String(row[idCol.id]) : `Dòng ${idx + 1}`;
                    const isSelected = selectedRowId === row.id && !isCreatingNew;
                    const isComplete = row._isComplete;

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-teal-50/40 cursor-pointer ${
                          isSelected ? 'bg-teal-50 font-bold' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                        onClick={() => handleSelectRow(row.id)}
                      >
                        <td className="py-2 px-3 text-center text-slate-500 font-bold border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 text-slate-900 font-bold border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span>{title}</span>
                            {isSelected && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-600 text-white font-extrabold">
                                Đang chọn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-600 border-r border-slate-100">
                          {row._submittedBy ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-teal-800">👤 {row._submittedBy}</span>
                              {row._submittedAt && (
                                <span className="text-[10px] text-slate-400">
                                  • {new Date(row._submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">— Chưa cập nhật —</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-slate-100">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Đã hoàn thành</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Chưa nộp</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRow(row.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-extrabold text-[11px] transition-all cursor-pointer"
                          >
                            {isSelected ? 'Đang điền' : 'Điền số liệu'}
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="text-center text-[11px] text-slate-400 py-4 mt-6">
        Hệ thống Báo cáo số liệu thông minh © Trường TH Thạnh Yên 1
      </footer>
    </div>
  );
};
