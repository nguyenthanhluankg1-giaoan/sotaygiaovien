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
import { fetchUrgentReportFromFirestore, submitReportRowToFirestore, saveUrgentReportToFirestore, subscribeToUrgentReport } from '../services/dbService';
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

    // Validate identifier field (Lớp / Đối tượng báo cáo)
    if (idCol) {
      const idVal = formData[idCol.id];
      if (idVal === undefined || idVal === null || String(idVal).trim() === '') {
        alert(`Vui lòng nhập tên Lớp / Đối tượng báo cáo ở Mục 2 (ví dụ: Lớp 1A, Lớp 2B...).`);
        return;
      }
    }

    setSubmitting(true);
    setSubmittingAction(keepOpen ? 'save_new' : 'save_close');
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const targetRowId = autoRecognitionInfo?.isMatch && autoRecognitionInfo.matchedRow
        ? autoRecognitionInfo.matchedRow.id
        : selectedRowId || `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const rowToSubmit: ReportRow = {
        id: targetRowId,
        ...formData
      };

      const result = await submitReportRowToFirestore(
        report.id,
        rowToSubmit,
        !autoRecognitionInfo?.isMatch,
        submitterName || currentUser?.name || (idCol && formData[idCol.id] ? String(formData[idCol.id]) : 'Giáo viên')
      );

      if (result.success && result.report) {
        const sortedUpdatedRows = sortRowsNaturally(
          result.report.rows,
          result.report.columns,
          result.report.identifierColumnId
        );
        setReport({ ...result.report, rows: sortedUpdatedRows });

        const rowTitle = idCol && rowToSubmit[idCol.id] ? String(rowToSubmit[idCol.id]) : 'số liệu';

        if (keepOpen) {
          setSuccessMsg(`🎉 Đã lưu thành công số liệu "${rowTitle}"! Thầy/Cô có thể tiếp tục nhập số liệu cho đối tượng khác.`);
          setFormData({});
          setSelectedRowId('');
        } else {
          setSuccessMsg(`🎉 Đã gửi số liệu báo cáo "${rowTitle}" thành công! Dữ liệu đã được cập nhật đồng bộ vào bảng tổng hợp.`);
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

  // Subscribe to real-time report changes from Cloud Firestore (concurrent submission safety)
  useEffect(() => {
    if (!reportId) return;
    const unsub = subscribeToUrgentReport(reportId, (remote) => {
      if (remote) {
        const sanitizedColumns = (remote.columns || []).map((c) => {
          const isNameOrText = isPersonNameOrTextColumn(c.name) || isPersonNameOrTextColumn(c.subName || '');
          return {
            ...c,
            type: isNameOrText ? ('text' as const) : c.type
          };
        });
        const sortedRows = sortRowsNaturally(remote.rows || [], sanitizedColumns, remote.identifierColumnId);
        setReport({ ...remote, columns: sanitizedColumns, rows: sortedRows });
      }
    });
    return () => unsub();
  }, [reportId]);

  // Ensure ALL hooks are called unconditionally BEFORE any early return statements to avoid React Error #310
  const isSttCol = (col: ReportColumn) =>
    col.id === 'col_stt' ||
    col.name.trim().toLowerCase() === 'stt' ||
    (col.subName && col.subName.trim().toLowerCase() === 'stt');

  // Ensure STT column is hidden and non-STT column is picked as primary identifier
  const idCol = useMemo(() => {
    if (!report || !report.columns) return null;
    const nonStt = report.columns.filter((c) => !isSttCol(c));
    return (
      nonStt.find((c) => c.id === report.identifierColumnId || c.isIdentifier) ||
      nonStt.find((c) => {
        const n = (c.subName || c.name).toLowerCase();
        return n.includes('lớp') || n.includes('họ tên') || n.includes('đơn vị') || n.includes('tên');
      }) ||
      nonStt[0] ||
      null
    );
  }, [report]);

  const inputColumns = useMemo(() => {
    if (!report || !report.columns) return [];
    
    // Completely exclude STT columns so STT is hidden from input form
    const nonSttCols = report.columns.filter((c) => !isSttCol(c));

    const baseMap = new Map<string, ReportColumn>();
    
    // Always include the main non-STT identifier column first if found
    if (idCol) {
      baseMap.set(idCol.id, idCol);
    }
    
    // Include all non-STT input fields and identifier fields
    nonSttCols.forEach((c) => {
      if (c.isInputField || c.isIdentifier || (idCol && c.id === idCol.id)) {
        baseMap.set(c.id, c);
      }
    });

    const list = Array.from(baseMap.values());

    // Sort according to report.columns definition order
    const colOrderMap = new Map<string, number>(report.columns.map((c, idx) => [c.id, idx]));
    return list.sort((a, b) => {
      const idxA = colOrderMap.get(a.id) ?? 0;
      const idxB = colOrderMap.get(b.id) ?? 0;
      return idxA - idxB;
    });
  }, [report, idCol]);

  // Real-time automatic recognition of submitted row based on identifier column (Lớp / Họ tên)
  const autoRecognitionInfo = useMemo(() => {
    if (!report || !report.rows || !idCol) return null;
    const enteredVal = formData[idCol.id];
    if (enteredVal === undefined || enteredVal === null || String(enteredVal).trim() === '') {
      return null;
    }
    const searchVal = String(enteredVal).trim().toLowerCase();
    const matched = report.rows.find((r) => {
      const rowVal = r[idCol.id] !== undefined && r[idCol.id] !== null ? String(r[idCol.id]).trim().toLowerCase() : '';
      return rowVal === searchVal;
    });

    if (matched) {
      return {
        isMatch: true,
        matchedRow: matched,
        title: String(matched[idCol.id] || searchVal),
        isComplete: Boolean(matched._isComplete),
        submittedBy: matched._submittedBy
      };
    }
    return {
      isMatch: false,
      matchedRow: null,
      title: String(enteredVal).trim(),
      isComplete: false
    };
  }, [report, formData, idCol]);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 py-4 px-3 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full space-y-4 sm:space-y-5">
        {/* Top actions & brand header bar */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          {onBackToApp ? (
            <button
              onClick={onBackToApp}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{currentUser ? 'Về bảng điều khiển' : 'Đăng nhập tài khoản'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-xs sm:text-sm">
                TY1
              </div>
              <span className="text-sm sm:text-base font-black text-teal-900">Trường TH Thạnh Yên 1</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {report.urgentLevel === 'very_urgent' && (
              <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs sm:text-sm animate-pulse">
                ⚡ HỎA TỐC
              </span>
            )}
            {report.urgentLevel === 'urgent' && (
              <span className="px-3 py-1 rounded-full bg-amber-500 text-white font-black text-xs sm:text-sm">
                🔥 BÁO CÁO GẤP
              </span>
            )}
            {isClosed ? (
              <span className="px-3 py-1 rounded-full bg-slate-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                <span>ĐÃ KHÓA</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs sm:text-sm">
                🟢 ĐANG NHẬN SỐ LIỆU
              </span>
            )}
          </div>
        </div>

        {/* Public Share Banner */}
        {!currentUser && (
          <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-sm sm:text-base leading-snug">
                  Hệ Thống Trực Tuyến Nhập Báo Cáo Nhanh
                </p>
                <p className="text-xs sm:text-sm opacity-95 font-medium mt-0.5">
                  Quý Thầy/Cô chọn Lớp / Đối tượng của mình và điền số liệu — <strong>Hoàn toàn không cần đăng nhập</strong>.
                </p>
              </div>
            </div>
            <span className="hidden md:inline-flex px-3.5 py-1.5 rounded-full bg-white/20 text-white font-black text-xs sm:text-sm shrink-0">
              ✓ Tự do nhập
            </span>
          </div>
        )}

        {/* Closed notification */}
        {isClosed && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs sm:text-sm font-bold leading-relaxed">
              Biểu mẫu này đã kết thúc thời gian thu thập hoặc được người phụ trách khóa lại. Vui lòng liên hệ quản trị viên nếu cần cập nhật bổ sung.
            </p>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3.5 animate-in fade-in shadow-2xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-black text-emerald-900">Gửi số liệu thành công!</h4>
              <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed font-medium">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 flex items-center gap-3 shadow-2xs">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <p className="text-xs sm:text-sm text-rose-800 font-bold">{errorMsg}</p>
          </div>
        )}

        {/* Main Grid Layout: Desktop Full-width 2-column (5 cols + 7 cols) / Mobile 1 column */}
        {!isClosed && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* LEFT COLUMN (lg:col-span-5): Report Header Info + Step 1 Object Selection */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
              
              {/* Report Header Card */}
              <div className="bg-white rounded-3xl border border-teal-200/90 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black uppercase text-teal-700 tracking-wider">
                      BIỂU MẪU BÁO CÁO GẤP
                    </span>
                    <h1 className="text-base sm:text-xl font-black text-slate-900 leading-snug mt-0.5">
                      {report.title}
                    </h1>
                  </div>
                </div>

                {report.description && (
                  <p className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {report.description}
                  </p>
                )}

                {/* Progress summary bar */}
                <div className="p-3.5 bg-teal-50/80 rounded-2xl border border-teal-100 space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold text-teal-900">
                    <span>Tiến độ đã nộp:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-xs font-black">
                      {report.rows.filter((r) => r._isComplete).length} / {report.rows.length} đối tượng
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-teal-200/80 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (report.rows.filter((r) => r._isComplete).length / Math.max(1, report.rows.length)) * 100
                          )
                        )}%`
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs sm:text-sm text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <School className="w-4 h-4 text-teal-600" />
                    <span>Người tạo: <strong className="text-slate-900">{report.creatorName}</strong></span>
                  </div>
                  {report.deadline && (
                    <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                      <Clock className="w-4 h-4" />
                      <span>Hạn: {new Date(report.deadline).toLocaleString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (lg:col-span-7): Form Inputs + Action Buttons */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
                
                {/* Auto-recognition badge */}
                {autoRecognitionInfo && (
                  <div className={`p-4 rounded-2xl border flex items-start gap-3.5 text-xs sm:text-sm font-medium transition-all ${
                    autoRecognitionInfo.isMatch
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                      : 'bg-sky-50/90 border-sky-300 text-sky-950 shadow-2xs'
                  }`}>
                    {autoRecognitionInfo.isMatch ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      {autoRecognitionInfo.isMatch ? (
                        <p className="font-extrabold text-emerald-900 text-sm sm:text-base leading-snug">
                          🟢 Khớp đối tượng: "{autoRecognitionInfo.title}"
                          {autoRecognitionInfo.isComplete && autoRecognitionInfo.submittedBy ? ` (Gần nhất: ${autoRecognitionInfo.submittedBy})` : ''}
                        </p>
                      ) : (
                        <p className="font-extrabold text-sky-900 text-sm sm:text-base leading-snug">
                          ✨ Nhận diện đối tượng mới: "{autoRecognitionInfo.title}"
                        </p>
                      )}
                      <p className="text-xs sm:text-sm opacity-90 leading-relaxed font-medium">
                        {autoRecognitionInfo.isMatch
                          ? 'Số liệu sẽ tự động cập nhật chính xác vào dòng này, không lo bị trùng lặp hay mất bài.'
                          : 'Số liệu sẽ được tự động thêm mới vào bảng tổng hợp của nhà trường.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Form Inputs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs sm:text-sm font-black uppercase text-teal-900 tracking-wider flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-teal-600" />
                      <span>CÁC SỐ LIỆU CẦN ĐIỀN</span>
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800">
                      {inputColumns.length} trường dữ liệu
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
                      const isIdField = idCol && col.id === idCol.id;

                      return (
                        <div
                          key={col.id}
                          className={`space-y-1.5 ${isTextArea || isIdField ? 'sm:col-span-2' : ''}`}
                        >
                          <label className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 inline-block ${isIdField ? 'bg-teal-600 animate-pulse' : isGrouped ? 'bg-teal-600' : 'bg-slate-400'}`} />
                              <span className="truncate">{col.subName || col.name} {isIdField ? '(Lớp / Đối tượng báo cáo)' : ''}</span>
                              {(col.required || isIdField) && <span className="text-rose-500 font-black shrink-0 text-sm sm:text-base">*</span>}
                            </span>
                            <span className={`text-xs font-bold shrink-0 ${isIdField ? 'text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-200' : 'text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full'}`}>
                              {isIdField ? 'Nhập tự do / Nhận diện tự động' : isSttField ? 'Tự tăng' : isNumber ? 'Số' : 'Chữ'}
                            </span>
                          </label>

                          {col.description && (
                            <p className="text-xs text-teal-800 font-medium truncate">{col.description}</p>
                          )}

                          {isIdField ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => handleFieldChange(col.id, e.target.value)}
                                required
                                placeholder={`Nhập tên Lớp / Đối tượng (ví dụ: Lớp 1A, Lớp 2B, Nguyễn Văn A)...`}
                                className="w-full px-4 py-3 bg-teal-50/80 border-2 border-teal-400 rounded-2xl text-sm sm:text-base font-black text-teal-950 focus:outline-none focus:border-teal-600 focus:bg-white shadow-2xs transition-all placeholder:text-slate-400"
                              />
                              <p className="text-xs sm:text-sm text-teal-800 font-medium flex items-center gap-1.5">
                                💡 Thầy/Cô gõ tự do tên Lớp/Đối tượng tại đây — hệ thống tự động nhận diện và cập nhật đúng số liệu.
                              </p>
                            </div>
                          ) : isNumber ? (
                            <input
                              type="number"
                              value={currentVal}
                              onChange={(e) => handleFieldChange(col.id, e.target.value === '' ? '' : Number(e.target.value))}
                              required={col.required}
                              placeholder={`Nhập ${col.subName || col.name}...`}
                              className="w-full px-4 py-2.5 sm:py-3 bg-slate-50/50 focus:bg-white border-2 border-slate-200 focus:border-teal-500 rounded-2xl text-sm sm:text-base font-bold text-slate-900 focus:outline-none shadow-2xs transition-all"
                            />
                          ) : isTextArea ? (
                            <textarea
                              rows={2.5}
                              value={currentVal}
                              onChange={(e) => handleFieldChange(col.id, e.target.value)}
                              required={col.required}
                              placeholder={`Nhập ${col.name}...`}
                              className="w-full px-4 py-2.5 sm:py-3 bg-slate-50/50 focus:bg-white border-2 border-slate-200 focus:border-teal-500 rounded-2xl text-sm sm:text-base font-medium text-slate-900 focus:outline-none shadow-2xs transition-all"
                            />
                          ) : (
                            <input
                              type="text"
                              value={currentVal}
                              onChange={(e) => handleFieldChange(col.id, e.target.value)}
                              required={col.required}
                              placeholder={`Nhập ${col.subName || col.name}...`}
                              className="w-full px-4 py-2.5 sm:py-3 bg-slate-50/50 focus:bg-white border-2 border-slate-200 focus:border-teal-500 rounded-2xl text-sm sm:text-base font-medium text-slate-900 focus:outline-none shadow-2xs transition-all"
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
                                className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3.5"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {block.columns.map((col) => renderFormField(col, false))}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`merged_blk_${block.groupName}_${bIdx}`}
                              className="bg-teal-50/40 rounded-2xl border-2 border-teal-200 overflow-hidden shadow-2xs"
                            >
                              <div className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span>🏷️ {block.groupName}</span>
                                </span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-extrabold">
                                  {block.columns.length} cột số liệu
                                </span>
                              </div>
                              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
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
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Nút 1: Lưu & Thêm Mới */}
                    <button
                      type="button"
                      onClick={() => handleSubmit(undefined, true)}
                      disabled={submitting}
                      className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-base shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-[0.99]"
                      title="Lưu số liệu đối tượng này và giữ form để nhập tiếp đối tượng tiếp theo"
                    >
                      {submitting && submittingAction === 'save_new' ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-5 h-5" />
                          <span>Lưu & Thêm Mới</span>
                        </>
                      )}
                    </button>

                    {/* Nút 2: Gửi & Hoàn Thành */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs sm:text-base shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-[0.99]"
                    >
                      {submitting && submittingAction !== 'save_new' ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Đang gửi...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>Gửi & Hoàn Thành</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-xs sm:text-sm text-slate-500 font-medium">
                    🔒 Số liệu tự động đồng bộ ngay vào file Excel tổng hợp của trường.
                  </p>
                </div>

              </div>

            </div>

          </form>
        )}

      </div>

      <footer className="text-center text-[11px] text-slate-400 py-4 mt-6">
        Hệ thống Báo cáo số liệu thông minh © Trường TH Thạnh Yên 1
      </footer>
    </div>
  );
};
