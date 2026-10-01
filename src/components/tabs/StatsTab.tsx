import React, { useState, useRef } from 'react';
import { BarChart3, FileSpreadsheet, FileText, Search, Filter, Coins, Award } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { AppState, Student } from '../../types';
import { Avatar } from '../Avatar';

interface StatsTabProps {
  state: AppState;
}

export const StatsTab: React.FC<StatsTabProps> = ({ state }) => {
  const activeClass = state.classes.find((c) => c.id === state.activeClassId) || state.classes[0];
  const students = state.students.filter((s) => s.classId === state.activeClassId);
  const transactions = state.transactions.filter((tx) => tx.classId === state.activeClassId);

  const [subjectFilter, setSubjectFilter] = useState('');
  const [tableSearch, setTableSearch] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);

  const maleCount = students.filter((s) => s.gender === 'Nam').length;
  const femaleCount = students.filter((s) => s.gender === 'Nữ').length;
  const totalCoins = students.reduce((acc, s) => acc + (s.coins || 0), 0);
  const avgCoins = students.length > 0 ? Math.round(totalCoins / students.length) : 0;

  const plusTxCount = transactions.filter((tx) => tx.amount > 0).length;
  const minusTxCount = transactions.filter((tx) => tx.amount < 0).length;

  const sortedStudents = [...students].sort((a, b) => (b.coins || 0) - (a.coins || 0));
  const maxCoins = Math.max(1, ...students.map((s) => s.coins || 0));

  // Subject distribution
  const subjectCoinMap: Record<string, number> = {};
  transactions.forEach((tx) => {
    subjectCoinMap[tx.subject] = (subjectCoinMap[tx.subject] || 0) + tx.amount;
  });

  const filteredTransactions = transactions.filter((tx) => {
    const matchSubject = !subjectFilter || tx.subject === subjectFilter;
    const matchSearch =
      !tableSearch ||
      tx.studentName.toLowerCase().includes(tableSearch.toLowerCase()) ||
      tx.reason.toLowerCase().includes(tableSearch.toLowerCase());
    return matchSubject && matchSearch;
  });

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Bảng Xếp Hạng
    const rankRows = sortedStudents.map((s, idx) => ({
      'Thứ hạng': idx + 1,
      'Họ và tên': s.name,
      'Giới tính': s.gender || '',
      'Số hoa': s.coins || 0,
      'Ghi chú': s.note || ''
    }));
    const wsRank = XLSX.utils.json_to_sheet(rankRows);
    XLSX.utils.book_append_sheet(wb, wsRank, 'Xếp hạng thi đua');

    // Sheet 2: Lịch sử cộng trừ hoa
    const txRows = transactions.map((tx) => ({
      'Thời gian': new Date(tx.time).toLocaleString('vi-VN'),
      'Học sinh': tx.studentName,
      'Môn học': tx.subject,
      'Số hoa': tx.amount > 0 ? `+${tx.amount}` : tx.amount,
      'Lý do ghi nhận': tx.reason
    }));
    const wsTx = XLSX.utils.json_to_sheet(txRows);
    XLSX.utils.book_append_sheet(wb, wsTx, 'Lịch sử cộng trừ hoa');

    XLSX.writeFile(wb, `bao-cao-thi-dua-${activeClass?.name}.xlsx`);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 190;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 10, 10, pdfWidth, pdfHeight);
      pdf.save(`bao-cao-${activeClass?.name}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800">
              Báo cáo & Thống kê lớp {activeClass?.name}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tổng hợp thi đua theo học sinh, tỷ lệ nam/nữ, cơ cấu điểm theo môn và nhật ký chi tiết.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-teal-200 text-teal-800 hover:bg-teal-50 font-extrabold text-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Section */}
      <div ref={reportRef} className="space-y-5">
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-3xl bg-white border-2 border-teal-100 shadow-sm text-center">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Sĩ số học sinh
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">
              {students.length}
            </div>
            <span className="text-xs text-teal-700 font-bold mt-1 block">
              {maleCount} Nam · {femaleCount} Nữ
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-white border-2 border-teal-100 shadow-sm text-center">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Tổng bông hoa thi đua 🌺
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
              {totalCoins} 🌺
            </div>
            <span className="text-xs text-slate-500 font-bold mt-1 block">
              Trung bình {avgCoins} hoa / HS
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-white border-2 border-teal-100 shadow-sm text-center">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Lượt thưởng (+hoa)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              +{plusTxCount}
            </div>
            <span className="text-xs text-emerald-700 font-bold mt-1 block">
              Khen thưởng ghi nhận
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-white border-2 border-teal-100 shadow-sm text-center">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Lượt trừ (-hoa)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
              {minusTxCount}
            </div>
            <span className="text-xs text-rose-700 font-bold mt-1 block">
              Nhắc nhở nề nếp
            </span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Rankings */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
            <h3 className="font-black text-base text-slate-800 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Bảng xếp hạng thi đua lớp {activeClass?.name}</span>
            </h3>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {sortedStudents.map((s, idx) => {
                const safeMaxCoins = Math.max(1, maxCoins || 0);
                const rawPct = Math.round(((s.coins || 0) / safeMaxCoins) * 100);
                const pct = isNaN(rawPct) ? 5 : Math.max(5, Math.min(100, rawPct));

                return (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200 flex items-center gap-3"
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-600 text-white'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <Avatar name={s.name} avatar={s.avatar} size="xs" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs font-black text-slate-800">
                        <span className="truncate">{s.name}</span>
                        <span className="text-rose-600 font-bold ml-2">🌺 {s.coins || 0} hoa</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subject Distribution */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
            <h3 className="font-black text-base text-slate-800 mb-3">
              Hoa thưởng theo Môn học / Hoạt động
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {Object.entries(subjectCoinMap).map(([subject, coins]) => {
                const maxSubjectCoins = Math.max(1, ...Object.values(subjectCoinMap).map((v) => Math.abs(v) || 0));
                const rawPct = Math.round((Math.abs(coins) / maxSubjectCoins) * 100);
                const pct = isNaN(rawPct) ? 8 : Math.max(8, Math.min(100, rawPct));

                return (
                  <div key={subject} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{subject}</span>
                      <span className={coins >= 0 ? 'text-teal-700' : 'text-rose-600'}>
                        {coins > 0 ? `+${coins}` : coins} 🌺
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          coins >= 0
                            ? 'bg-gradient-to-r from-teal-500 to-teal-400'
                            : 'bg-gradient-to-r from-rose-500 to-rose-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(subjectCoinMap).length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs font-bold">
                  Chưa có lịch sử điểm môn học nào được ghi nhận.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Log Table */}
      <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
          <h3 className="font-black text-base text-slate-800">
            Nhật ký Cộng / Trừ Điểm Chi Tiết ({filteredTransactions.length})
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by subject */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-700 focus:outline-none"
              >
                <option value="">Tất cả môn học</option>
                {state.subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên / lý do..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 font-semibold text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-teal-50/70 text-teal-950 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 rounded-l-xl">Thời gian</th>
                <th className="py-2.5 px-3">Học sinh</th>
                <th className="py-2.5 px-3">Môn học</th>
                <th className="py-2.5 px-3">Lý do ghi nhận</th>
                <th className="py-2.5 px-3 text-right rounded-r-xl">Số hoa 🌺</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredTransactions.slice(0, 50).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                    {new Date(tx.time).toLocaleDateString('vi-VN')} ·{' '}
                    {new Date(tx.time).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                    {tx.studentName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[11px] font-bold">
                      {tx.subject}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 max-w-xs truncate">{tx.reason}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-black text-xs ${
                        tx.amount >= 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} 🌺
                    </span>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Không có lượt ghi nhận nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
