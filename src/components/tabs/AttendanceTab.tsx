import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  MailOpen,
  XCircle,
  FileSpreadsheet,
  Calendar,
  BarChart3,
  ChevronDown,
  Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppState, AttendanceStatus } from '../../types';
import { Avatar } from '../Avatar';
import { today } from '../../utils/helpers';

interface AttendanceTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ state, onUpdateState }) => {
  const [statsRange, setStatsRange] = useState<'week' | 'month' | 'semester1' | 'semester2' | 'year'>('week');
  const [showStats, setShowStats] = useState(false);

  const activeClass = state.classes.find((c) => c.id === state.activeClassId) || state.classes[0];
  const students = state.students.filter((s) => s.classId === state.activeClassId);
  const currentDate = state.attendanceDate || today();
  const attKey = `${state.activeClassId}_${currentDate}`;
  const currentAttendance = state.attendance[attKey] || {};

  const counts = {
    present: 0,
    late: 0,
    excused: 0,
    unexcused: 0
  };

  students.forEach((s) => {
    const status = (currentAttendance[s.id] || 'present') as AttendanceStatus;
    counts[status] = (counts[status] || 0) + 1;
  });

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    onUpdateState((prev) => {
      const key = `${prev.activeClassId}_${prev.attendanceDate || today()}`;
      const existing = prev.attendance[key] || {};
      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          [key]: {
            ...existing,
            [studentId]: status
          }
        }
      };
    });
  };

  const setAllStatus = (status: AttendanceStatus) => {
    onUpdateState((prev) => {
      const key = `${prev.activeClassId}_${prev.attendanceDate || today()}`;
      const updated: Record<string, AttendanceStatus> = {};
      students.forEach((s) => {
        updated[s.id] = status;
      });
      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          [key]: updated
        }
      };
    });
  };

  const handleDateChange = (date: string) => {
    onUpdateState((prev) => ({
      ...prev,
      attendanceDate: date
    }));
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const now = new Date(currentDate);
    let startDate = new Date(now);
    let endDate = new Date(now);

    const yearParts = (activeClass?.year || state.teacher.year || '2026 - 2027').split('-').map(p => p.trim());
    const startYear = parseInt(yearParts[0]) || now.getFullYear();
    const endYear = yearParts[1] ? parseInt(yearParts[1]) : startYear + 1;

    if (statsRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (statsRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (statsRange === 'semester1') {
      startDate = new Date(`${startYear}-09-01`);
      endDate = new Date(`${endYear}-01-15`);
    } else if (statsRange === 'semester2') {
      startDate = new Date(`${endYear}-01-16`);
      endDate = new Date(`${endYear}-06-15`);
    } else if (statsRange === 'year') {
      startDate = new Date(`${startYear}-09-01`);
      endDate = new Date(`${endYear}-06-15`);
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const studentStats: Record<string, { present: number, late: number, excused: number, unexcused: number, total: number }> = {};
    students.forEach(s => {
      studentStats[s.id] = { present: 0, late: 0, excused: 0, unexcused: 0, total: 0 };
    });

    Object.keys(state.attendance).forEach(key => {
      const [classId, dateStr] = key.split('_');
      if (classId === state.activeClassId && dateStr >= startStr && dateStr <= endStr) {
        const dayAtt = state.attendance[key];
        Object.keys(dayAtt).forEach(sId => {
          if (studentStats[sId]) {
            const status = dayAtt[sId];
            studentStats[sId][status]++;
            studentStats[sId].total++;
          }
        });
      }
    });

    const totals = {
      present: 0,
      late: 0,
      excused: 0,
      unexcused: 0,
      studentsWithAbsence: 0,
      days: new Set(Object.keys(state.attendance).filter(k => k.startsWith(state.activeClassId + '_') && k.split('_')[1] >= startStr && k.split('_')[1] <= endStr)).size
    };

    Object.values(studentStats).forEach(s => {
      totals.present += s.present;
      totals.late += s.late;
      totals.excused += s.excused;
      totals.unexcused += s.unexcused;
      if (s.excused > 0 || s.unexcused > 0) {
        totals.studentsWithAbsence++;
      }
    });

    return {
      studentStats,
      totals,
      startDate: startStr,
      endDate: endStr
    };
  }, [state.attendance, state.activeClassId, statsRange, students, currentDate, activeClass?.year, state.teacher.year]);

  const exportExcel = () => {
    const rows = students.map((s, idx) => {
      const status = (currentAttendance[s.id] || 'present') as AttendanceStatus;
      const statusLabel = {
        present: 'Có mặt',
        late: 'Đi muộn',
        excused: 'Nghỉ có phép',
        unexcused: 'Nghỉ không phép'
      }[status];

      return {
        STT: idx + 1,
        'Họ và tên': s.name,
        'Giới tính': s.gender || '',
        'Trạng thái': statusLabel,
        'Ghi chú': s.note || ''
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Điểm danh');
    XLSX.writeFile(wb, `diem-danh-${activeClass?.name}-${currentDate}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800">
              Điểm danh lớp {activeClass?.name} {activeClass?.year || state.teacher.year ? `(${activeClass?.year || state.teacher.year})` : ''}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ảnh đại diện hiển thị gọn gàng cạnh tên. Bấm 1 trong 4 trạng thái để cập nhật tức thì.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-teal-50 border border-teal-200">
            <Calendar className="w-4 h-4 text-teal-700" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent font-extrabold text-xs text-teal-900 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setAllStatus('present')}
            className="px-3.5 py-2 rounded-2xl border border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-extrabold text-xs transition-all"
          >
            Tất cả có mặt
          </button>

          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border font-extrabold text-xs transition-all ${
              showStats 
                ? 'bg-teal-600 text-white border-teal-600' 
                : 'border-teal-200 text-teal-800 hover:bg-teal-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Thống kê</span>
          </button>

          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-teal-200 text-teal-800 hover:bg-teal-50 font-extrabold text-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      {showStats && (
        <div className="p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md animate-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-800">Thống kê chuyên cần</h3>
                <p className="text-[11px] text-slate-500">
                  Từ {new Date(stats.startDate).toLocaleDateString('vi-VN')} đến {new Date(stats.endDate).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
              {[
                { id: 'week', label: 'Tuần' },
                { id: 'month', label: 'Tháng' },
                { id: 'semester1', label: 'HK1' },
                { id: 'semester2', label: 'HK2' },
                { id: 'year', label: 'Năm học' }
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setStatsRange(r.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statsRange === r.id
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-2xl font-black text-slate-700">{stats.totals.studentsWithAbsence}</div>
              <div className="text-[11px] font-bold text-slate-600">Học sinh từng vắng</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="text-2xl font-black text-emerald-700">{stats.totals.present}</div>
              <div className="text-[11px] font-bold text-emerald-600">Lượt có mặt</div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <div className="text-2xl font-black text-amber-700">{stats.totals.late}</div>
              <div className="text-[11px] font-bold text-amber-600">Lượt đi muộn</div>
            </div>
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
              <div className="text-2xl font-black text-sky-700">{stats.totals.excused}</div>
              <div className="text-[11px] font-bold text-sky-600">Nghỉ có phép</div>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <div className="text-2xl font-black text-rose-700">{stats.totals.unexcused}</div>
              <div className="text-[11px] font-bold text-rose-600">Nghỉ không phép</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-2">Học sinh</th>
                  <th className="px-4 py-2 text-center">Có mặt</th>
                  <th className="px-4 py-2 text-center">Đi muộn</th>
                  <th className="px-4 py-2 text-center text-sky-700">Có phép</th>
                  <th className="px-4 py-2 text-center text-rose-700">Không phép</th>
                  <th className="px-4 py-2 text-center">Tổng nghỉ</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const s = stats.studentStats[student.id];
                  const totalAbsent = s.excused + s.unexcused;
                  
                  return (
                    <tr key={student.id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 rounded-l-xl border-y border-l border-slate-100">
                        <div className="flex items-center gap-2">
                          <Avatar name={student.name} avatar={student.avatar} size="sm" />
                          <span className="font-bold text-sm text-slate-700">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center border-y border-slate-100 font-bold text-emerald-600">{s.present}</td>
                      <td className="px-4 py-3 text-center border-y border-slate-100 font-bold text-amber-600">{s.late}</td>
                      <td className="px-4 py-3 text-center border-y border-slate-100 font-bold text-sky-600">{s.excused}</td>
                      <td className="px-4 py-3 text-center border-y border-slate-100 font-bold text-rose-600">{s.unexcused}</td>
                      <td className="px-4 py-3 rounded-r-xl border-y border-r border-slate-100 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-black ${
                          totalAbsent > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {totalAbsent}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4 Summary Stat boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-emerald-50/80 border-2 border-emerald-200 text-center">
          <div className="text-3xl font-black text-emerald-800">{counts.present}</div>
          <div className="text-xs font-extrabold text-emerald-700 mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Có mặt</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-amber-50/80 border-2 border-amber-200 text-center">
          <div className="text-3xl font-black text-amber-800">{counts.late}</div>
          <div className="text-xs font-extrabold text-amber-700 mt-1 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Đi muộn</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-sky-50/80 border-2 border-sky-200 text-center">
          <div className="text-3xl font-black text-sky-800">{counts.excused}</div>
          <div className="text-xs font-extrabold text-sky-700 mt-1 flex items-center justify-center gap-1">
            <MailOpen className="w-3.5 h-3.5" />
            <span>Có phép</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-rose-50/80 border-2 border-rose-200 text-center">
          <div className="text-3xl font-black text-rose-800">{counts.unexcused}</div>
          <div className="text-xs font-extrabold text-rose-700 mt-1 flex items-center justify-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Không phép</span>
          </div>
        </div>
      </div>

      {/* Attendance Student Cards */}
      <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800">Danh sách điểm danh</h3>
            <p className="text-xs text-slate-500">
              Sĩ số: <strong>{students.length}</strong> học sinh · Ngày{' '}
              {new Date(currentDate).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {students.map((student, idx) => {
            const currentStatus = (currentAttendance[student.id] ||
              'present') as AttendanceStatus;

            const badgeConfig = {
              present: {
                label: 'Có mặt',
                classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                icon: CheckCircle2
              },
              late: {
                label: 'Đi muộn',
                classes: 'bg-amber-50 text-amber-800 border-amber-200',
                icon: Clock
              },
              excused: {
                label: 'Có phép',
                classes: 'bg-sky-50 text-sky-800 border-sky-200',
                icon: MailOpen
              },
              unexcused: {
                label: 'Không phép',
                classes: 'bg-rose-50 text-rose-800 border-rose-200',
                icon: XCircle
              }
            }[currentStatus];

            const BadgeIcon = badgeConfig.icon;

            return (
              <div
                key={student.id}
                className="p-3.5 rounded-2xl bg-white border-2 border-teal-100 hover:border-teal-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top info with compact avatar */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-800 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>

                    {/* Compact avatar */}
                    <Avatar name={student.name} avatar={student.avatar} size="md" />

                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-slate-800 truncate">
                        {student.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {activeClass?.name} {student.gender ? `· ${student.gender}` : ''}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${badgeConfig.classes}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badgeConfig.label}</span>
                    </span>
                  </div>
                </div>

                {/* 4 Attendance Status Buttons */}
                <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setStatus(student.id, 'present')}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Có mặt</span>
                  </button>

                  <button
                    onClick={() => setStatus(student.id, 'late')}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      currentStatus === 'late'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-800 border border-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Đi muộn</span>
                  </button>

                  <button
                    onClick={() => setStatus(student.id, 'excused')}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      currentStatus === 'excused'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-800 border border-slate-200'
                    }`}
                  >
                    <MailOpen className="w-3.5 h-3.5" />
                    <span>Có phép</span>
                  </button>

                  <button
                    onClick={() => setStatus(student.id, 'unexcused')}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      currentStatus === 'unexcused'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-800 border border-slate-200'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Vắng</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
