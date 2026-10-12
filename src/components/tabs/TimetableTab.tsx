import React, { useState } from 'react';
import { CalendarDays, Sliders, Plus, Trash2, Clock, BookOpen } from 'lucide-react';
import { AppState, TimetableEntry, DAYS_OF_WEEK } from '../../types';
import { uid } from '../../utils/helpers';

interface TimetableTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const TimetableTab: React.FC<TimetableTabProps> = ({ state, onUpdateState }) => {
  const activeClass = state.classes.find((c) => c.id === state.activeClassId) || state.classes[0];
  const { timetable } = state;

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Lesson form state
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<string>('S1');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formSubject, setFormSubject] = useState('');
  const [formTime, setFormTime] = useState('');

  // Generate slot definitions
  const morningTimes = [
    '07:30 - 08:05',
    '08:15 - 08:50',
    '09:05 - 09:40',
    '09:50 - 10:25',
    '10:35 - 11:10',
    '11:15 - 11:50'
  ];

  const afternoonTimes = [
    '13:30 - 14:05',
    '14:15 - 14:50',
    '15:05 - 15:40',
    '15:50 - 16:25',
    '16:35 - 17:10'
  ];

  const slots: { id: string; label: string; time: string; session: 'morning' | 'afternoon' }[] = [];

  if (timetable.morning) {
    for (let i = 0; i < timetable.morningCount; i++) {
      slots.push({
        id: `S${i + 1}`,
        label: `Tiết ${i + 1} Sáng`,
        time: morningTimes[i] || '07:30 - 08:05',
        session: 'morning'
      });
    }
  }

  if (timetable.afternoon) {
    for (let i = 0; i < timetable.afternoonCount; i++) {
      slots.push({
        id: `C${i + 1}`,
        label: `Tiết ${i + 1} Chiều`,
        time: afternoonTimes[i] || '13:30 - 14:05',
        session: 'afternoon'
      });
    }
  }

  const openLessonModal = (day: number, slotId: string, entry?: TimetableEntry) => {
    setSelectedDay(day);
    setSelectedSlot(slotId);
    const slotDef = slots.find((s) => s.id === slotId);

    if (entry) {
      setEditingEntryId(entry.id);
      setFormSubject(entry.subject);
      setFormTime(entry.time || slotDef?.time || '');
    } else {
      setEditingEntryId(null);
      setFormSubject('');
      setFormTime(slotDef?.time || '');
    }
    setLessonModalOpen(true);
  };

  const handleSaveLesson = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = formSubject.trim();
    if (!subject) return;

    onUpdateState((prev) => {
      let updatedEntries = [...prev.timetable.entries];

      if (editingEntryId) {
        updatedEntries = updatedEntries.map((item) =>
          item.id === editingEntryId
            ? { ...item, subject, time: formTime }
            : item
        );
      } else {
        // Clear any existing entry on the exact same slot/day for this class
        updatedEntries = updatedEntries.filter(
          (item) =>
            !(
              item.classId === prev.activeClassId &&
              item.day === selectedDay &&
              item.slot === selectedSlot
            )
        );

        updatedEntries.push({
          id: uid('tt'),
          classId: prev.activeClassId,
          day: selectedDay,
          slot: selectedSlot,
          subject,
          time: formTime
        });
      }

      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          entries: updatedEntries
        }
      };
    });

    setLessonModalOpen(false);
  };

  const handleDeleteLesson = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        entries: prev.timetable.entries.filter((item) => item.id !== id)
      }
    }));
    setLessonModalOpen(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800">
              Thời khóa biểu lớp {activeClass?.name}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Bấm vào ô trống để thêm môn học; bấm vào tiết học đã có để chỉnh sửa khung giờ.
          </p>
        </div>

        <button
          onClick={() => setConfigModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 border-teal-200 text-teal-800 hover:bg-teal-50 font-extrabold text-xs transition-all self-start sm:self-auto"
        >
          <Sliders className="w-4 h-4 text-teal-600" />
          <span>Cấu hình thời khóa biểu</span>
        </button>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md overflow-x-auto">
        <div className="min-w-[760px] border border-slate-200 rounded-2xl overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-6 bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 text-white font-black text-xs text-center">
            <div className="p-3.5 border-r border-teal-600/60 uppercase tracking-wider">
              TIẾT HỌC
            </div>
            {DAYS_OF_WEEK.map((dayName, idx) => (
              <div
                key={dayName}
                className={`p-3.5 uppercase tracking-wider ${
                  idx < DAYS_OF_WEEK.length - 1 ? 'border-r border-teal-600/60' : ''
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Slot Rows */}
          {slots.map((slot, sIdx) => (
            <div
              key={slot.id}
              className={`grid grid-cols-6 border-t border-slate-200 ${
                sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
              }`}
            >
              {/* Slot time label */}
              <div className="p-2.5 bg-teal-50/70 border-r border-slate-200 flex flex-col justify-center items-center text-center">
                <span className="font-extrabold text-xs text-teal-950">{slot.label}</span>
                <span className="text-[10px] text-teal-700 font-semibold mt-0.5">{slot.time}</span>
              </div>

              {/* Mon-Fri cells */}
              {DAYS_OF_WEEK.map((_, dayIdx) => {
                const entry = timetable.entries.find(
                  (e) =>
                    e.classId === state.activeClassId &&
                    e.day === dayIdx &&
                    e.slot === slot.id
                );

                return (
                  <div
                    key={dayIdx}
                    onClick={() => openLessonModal(dayIdx, slot.id, entry)}
                    className={`min-h-[76px] p-2 flex flex-col justify-center cursor-pointer transition-all ${
                      dayIdx < DAYS_OF_WEEK.length - 1 ? 'border-r border-slate-200' : ''
                    } hover:bg-teal-50/60`}
                  >
                    {entry ? (
                      <div className="p-2 rounded-xl bg-teal-50 border-l-4 border-teal-600 shadow-xs hover:shadow-sm">
                        <strong className="block text-xs font-black text-slate-800 truncate">
                          {entry.subject}
                        </strong>
                        <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                          {entry.time || slot.time}
                        </span>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300 hover:text-teal-600 font-bold text-xs">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Lesson Add/Edit Modal */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-teal-200">
            <h3 className="text-lg font-black text-slate-800 mb-1">
              {editingEntryId ? 'Chỉnh sửa tiết học' : 'Thêm tiết học mới'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {DAYS_OF_WEEK[selectedDay]} · {slots.find((s) => s.id === selectedSlot)?.label}
            </p>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              {/* Quick Subject Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Chọn nhanh môn học
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {state.subjects.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setFormSubject(sub)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                        formSubject === sub
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-teal-50/80 text-teal-800 border-teal-200 hover:bg-teal-100'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên môn học / Hoạt động *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Toán, Tiếng Việt, Sinh hoạt lớp..."
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Khung giờ tiết học
                </label>
                <input
                  type="text"
                  placeholder="07:30 - 08:05"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {editingEntryId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteLesson(editingEntryId)}
                    className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa tiết này</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLessonModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md shadow-teal-600/20"
                  >
                    Lưu tiết học
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timetable Configuration Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-teal-200">
            <h3 className="text-lg font-black text-slate-800 mb-1">Cấu hình thời khóa biểu</h3>
            <p className="text-xs text-slate-500 mb-4">
              Tùy chỉnh số lượng tiết học buổi sáng và buổi chiều trong tuần.
            </p>

            <div className="space-y-4">
              {/* Morning section */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                    <span>☀️ Buổi Sáng</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={timetable.morning}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        timetable: { ...prev.timetable, morning: e.target.checked }
                      }))
                    }
                    className="w-4 h-4 rounded text-teal-600"
                  />
                </div>
                {timetable.morning && (
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="font-bold text-amber-900">Số tiết học sáng:</span>
                    <select
                      value={timetable.morningCount}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          timetable: {
                            ...prev.timetable,
                            morningCount: parseInt(e.target.value) || 5
                          }
                        }))
                      }
                      className="px-3 py-1.5 rounded-xl border border-amber-300 font-bold bg-white"
                    >
                      {[3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} tiết
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Afternoon section */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-sm text-indigo-950 flex items-center gap-2">
                    <span>🌇 Buổi Chiều</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={timetable.afternoon}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        timetable: { ...prev.timetable, afternoon: e.target.checked }
                      }))
                    }
                    className="w-4 h-4 rounded text-teal-600"
                  />
                </div>
                {timetable.afternoon && (
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="font-bold text-indigo-900">Số tiết học chiều:</span>
                    <select
                      value={timetable.afternoonCount}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          timetable: {
                            ...prev.timetable,
                            afternoonCount: parseInt(e.target.value) || 4
                          }
                        }))
                      }
                      className="px-3 py-1.5 rounded-xl border border-indigo-300 font-bold bg-white"
                    >
                      {[2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} tiết
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setConfigModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md shadow-teal-600/20"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
