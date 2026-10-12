import React, { useState, useEffect } from 'react';
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
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UrgentReportItem, ReportRow, ReportColumn, UserAccount } from '../types';
import { fetchUrgentReportFromFirestore, submitReportRowToFirestore } from '../services/dbService';

interface SharedReportFormViewProps {
  reportId: string;
  currentUser?: UserAccount | null;
  onBackToApp?: () => void;
}

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

  useEffect(() => {
    let active = true;
    async function loadReport() {
      setLoading(true);
      setErrorMsg('');
      try {
        const data = await fetchUrgentReportFromFirestore(reportId);
        if (active) {
          if (data) {
            setReport(data);
            // Default select the first row if available
            if (data.rows && data.rows.length > 0) {
              const firstRow = data.rows[0];
              setSelectedRowId(firstRow.id);
              setFormData({ ...firstRow });
            }
          } else {
            setErrorMsg('Không tìm thấy thông tin mẫu báo cáo trên hệ thống.');
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
  }, [reportId]);

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

  const handleFieldChange = (colId: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      [colId]: val
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    if (report.status === 'closed') {
      alert('Mẫu báo cáo này đã được khóa. Không thể gửi thêm số liệu!');
      return;
    }

    // Validate required fields
    const requiredCols = report.columns.filter((c) => c.required && c.isInputField);
    for (const c of requiredCols) {
      const val = formData[c.id];
      if (val === undefined || val === null || String(val).trim() === '') {
        alert(`Vui lòng điền thông tin cho cột bắt buộc: "${c.name}"`);
        return;
      }
    }

    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const rowToSubmit: ReportRow = {
        id: isCreatingNew ? `row_${Date.now()}` : selectedRowId,
        ...formData
      };

      const result = await submitReportRowToFirestore(
        report.id,
        rowToSubmit,
        isCreatingNew,
        submitterName || currentUser?.name || 'Giáo viên'
      );

      if (result.success && result.report) {
        setReport(result.report);
        setSuccessMsg('Đã gửi số liệu báo cáo thành công! Số liệu đã được cập nhật vào bảng tổng hợp của nhà trường.');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setErrorMsg(result.error || 'Có lỗi xảy ra khi nộp số liệu.');
      }
    } catch (err: any) {
      setErrorMsg('Không thể lưu số liệu: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setSubmitting(false);
    }
  };

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
          <h2 className="text-lg font-black text-slate-900">Không thể mở biểu mẫu</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{errorMsg}</p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 text-white font-extrabold text-xs cursor-pointer hover:bg-teal-700 transition-all"
            >
              Quay lại ứng dụng
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const idCol = report.columns.find((c) => c.id === report.identifierColumnId || c.isIdentifier) || report.columns[1] || report.columns[0];
  const inputColumns = report.columns.filter((c) => c.isInputField);
  const isClosed = report.status === 'closed';

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
              <span>Về bảng điều khiển</span>
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

            {/* Dynamic Input Fields Generated from Excel Columns */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-teal-900 tracking-wider">
                  2. CÁC SỐ LIỆU CẦN ĐIỀN
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {inputColumns.length} trường số liệu
                </span>
              </div>

              {inputColumns.map((col) => {
                const currentVal = formData[col.id] !== undefined ? formData[col.id] : '';
                return (
                  <div key={col.id} className="space-y-1 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200/90">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 inline-block" />
                        <span>{col.name}</span>
                        {col.required && <span className="text-rose-500 font-black">*</span>}
                      </span>
                      <span className="text-[10px] font-normal text-slate-400">
                        {col.type === 'number' ? 'Số' : 'Văn bản'}
                      </span>
                    </label>

                    {col.description && (
                      <p className="text-[11px] text-teal-700 font-medium">{col.description}</p>
                    )}

                    {col.type === 'number' ? (
                      <input
                        type="number"
                        value={currentVal}
                        onChange={(e) => handleFieldChange(col.id, e.target.value === '' ? '' : Number(e.target.value))}
                        required={col.required}
                        placeholder={`Nhập ${col.name}...`}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                      />
                    ) : col.type === 'select' && col.options && col.options.length > 0 ? (
                      <select
                        value={currentVal}
                        onChange={(e) => handleFieldChange(col.id, e.target.value)}
                        required={col.required}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">-- Chọn {col.name} --</option>
                        {col.options.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : col.name.toLowerCase().includes('ghi chú') || col.name.toLowerCase().includes('khó khăn') ? (
                      <textarea
                        rows={2}
                        value={currentVal}
                        onChange={(e) => handleFieldChange(col.id, e.target.value)}
                        required={col.required}
                        placeholder={`Ghi chú thêm...`}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                      />
                    ) : (
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => handleFieldChange(col.id, e.target.value)}
                        required={col.required}
                        placeholder={`Nhập ${col.name}...`}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm shadow-lg shadow-teal-700/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang lưu số liệu lên hệ thống...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi & Cập Nhật Số Liệu Báo Cáo</span>
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-2 font-medium">
                🔒 Số liệu sau khi gửi sẽ tự động đồng bộ ngay vào file Excel tổng hợp của trường.
              </p>
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
