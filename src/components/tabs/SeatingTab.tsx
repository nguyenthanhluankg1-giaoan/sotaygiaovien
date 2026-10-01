import React, { useState, useRef } from 'react';
import {
  LayoutGrid,
  Shuffle,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle2,
  Box,
  Layers,
  UserPlus,
  Maximize2,
  Minimize2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { AppState, SeatingConfig } from '../../types';
import { Avatar } from '../Avatar';

interface SeatingTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const SeatingTab: React.FC<SeatingTabProps> = ({ state, onUpdateState }) => {
  const activeClass = state.classes.find((c) => c.id === state.activeClassId) || state.classes[0];
  const students = state.students.filter((s) => s.classId === state.activeClassId);

  const seatingConfig: SeatingConfig = state.seating[state.activeClassId] || {
    lanes: 4,
    seats: 32,
    mode: '2d',
    deskType: 'double',
    assignments: {}
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [expandChart, setExpandChart] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const assignedStudentIds = new Set(Object.values(seatingConfig.assignments || {}));
  const unassignedStudents = students.filter((s) => !assignedStudentIds.has(s.id));

  const studentsPerDesk = seatingConfig.deskType === 'single' ? 1 : 2;
  const seatsPerRow = seatingConfig.lanes * studentsPerDesk;
  const totalRows = Math.ceil((seatingConfig.seats || 32) / seatsPerRow);

  const setConfig = (updater: (prev: SeatingConfig) => SeatingConfig) => {
    onUpdateState((prev) => {
      const current = prev.seating[prev.activeClassId] || {
        lanes: 4,
        seats: 32,
        mode: '2d',
        deskType: 'double',
        assignments: {}
      };
      return {
        ...prev,
        seating: {
          ...prev.seating,
          [prev.activeClassId]: updater(current)
        }
      };
    });
  };

  const handleRandomSeats = () => {
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
    const newAssignments: Record<number, string> = {};

    shuffledStudents.slice(0, seatingConfig.seats).forEach((s, idx) => {
      newAssignments[idx] = s.id;
    });

    setConfig((prev) => ({
      ...prev,
      assignments: newAssignments
    }));
  };

  const handleClearSeats = () => {
    if (!window.confirm('Xóa vị trí xếp chỗ hiện tại của lớp?')) return;
    setConfig((prev) => ({
      ...prev,
      assignments: {}
    }));
  };

  const handleSeatClick = (seatIndex: number) => {
    setSelectedSeatIndex(seatIndex);
    setModalOpen(true);
  };

  const assignStudentToSeat = (studentId: string | null) => {
    if (selectedSeatIndex === null) return;

    setConfig((prev) => {
      const nextAssignments = { ...prev.assignments };
      if (!studentId) {
        delete nextAssignments[selectedSeatIndex];
      } else {
        // If student was already assigned elsewhere, clear old seat
        Object.keys(nextAssignments).forEach((key) => {
          if (nextAssignments[+key] === studentId) {
            delete nextAssignments[+key];
          }
        });
        nextAssignments[selectedSeatIndex] = studentId;
      }
      return {
        ...prev,
        assignments: nextAssignments
      };
    });

    setModalOpen(false);
    setSelectedSeatIndex(null);
  };

  const exportPNG = async () => {
    if (!boardRef.current) return;
    try {
      const canvas = await html2canvas(boardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `so-do-lop-${activeClass?.name}-${activeClass?.year || state.teacher.year || '2026-2027'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export PNG failed:', err);
    }
  };

  // Helper to get seat indices for a given lane column
  const getSeatIndicesForLane = (laneIndex: number) => {
    const indices: number[] = [];
    for (let i = laneIndex; i < seatingConfig.seats; i += seatingConfig.lanes) {
      indices.push(i);
    }
    return indices;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
              <LayoutGrid className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800">
              Sơ đồ chỗ ngồi lớp {activeClass?.name} {activeClass?.year || state.teacher.year ? `(${activeClass?.year || state.teacher.year})` : ''}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Bố trí vị trí bàn học theo dãy, hỗ trợ góc nhìn 2D/3D trực quan và xuất ảnh in sơ đồ.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 2D / 3D Switch */}
          <div className="flex p-1 rounded-2xl bg-teal-50 border border-teal-200">
            <button
              onClick={() => setConfig((p) => ({ ...p, mode: '2d' }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                seatingConfig.mode === '2d'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-teal-800 hover:bg-teal-100/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D</span>
            </button>
            <button
              onClick={() => setConfig((p) => ({ ...p, mode: '3d' }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                seatingConfig.mode === '3d'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-teal-800 hover:bg-teal-100/70'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D</span>
            </button>
          </div>

          {/* Desk Type select: Bàn đôi (2 HS) / Bàn đơn (1 HS) */}
          <select
            value={seatingConfig.deskType || 'double'}
            onChange={(e) => setConfig((p) => ({ ...p, deskType: e.target.value as 'single' | 'double' }))}
            className="px-3.5 py-2 rounded-2xl border-2 border-teal-200 bg-teal-50/60 font-black text-xs text-teal-900 focus:outline-none shadow-sm hover:border-teal-400 transition-all cursor-pointer"
          >
            <option value="double">👥 Bàn 2 học sinh (Bàn đôi)</option>
            <option value="single">👤 Bàn 1 học sinh (Bàn đơn)</option>
          </select>

          {/* Lane count select */}
          <select
            value={seatingConfig.lanes}
            onChange={(e) => setConfig((p) => ({ ...p, lanes: parseInt(e.target.value) || 4 }))}
            className="px-3 py-2 rounded-2xl border-2 border-teal-100 bg-white font-bold text-xs text-slate-700 focus:outline-none cursor-pointer"
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} Dãy bàn
              </option>
            ))}
          </select>

          {/* Seat count select */}
          <select
            value={seatingConfig.seats}
            onChange={(e) => setConfig((p) => ({ ...p, seats: parseInt(e.target.value) || 32 }))}
            className="px-3 py-2 rounded-2xl border-2 border-teal-100 bg-white font-bold text-xs text-slate-700 focus:outline-none cursor-pointer"
          >
            {[16, 20, 24, 30, 32, 36, 40, 44, 48].map((n) => (
              <option key={n} value={n}>
                {n} Chỗ ngồi
              </option>
            ))}
          </select>

          <button
            onClick={() => setExpandChart(!expandChart)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border font-black text-xs transition-all shadow-sm ${
              expandChart
                ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
            }`}
            title={expandChart ? 'Thu nhỏ sơ đồ' : 'Phóng to sơ đồ rộng hơn'}
          >
            {expandChart ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{expandChart ? 'Thu nhỏ' : 'Phóng to sơ đồ'}</span>
          </button>

          <button
            onClick={handleRandomSeats}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-teal-200 text-teal-800 hover:bg-teal-50 font-extrabold text-xs transition-all"
          >
            <Shuffle className="w-3.5 h-3.5 text-teal-600" />
            <span>Xếp tất cả</span>
          </button>

          <button
            onClick={handleClearSeats}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa xếp chỗ</span>
          </button>

          <button
            onClick={exportPNG}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 transition-all"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Xuất ảnh PNG</span>
          </button>
        </div>
      </div>

      {/* Main Content: Seating Canvas & Unassigned list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Seating Layout Canvas */}
        <div className={`${expandChart ? 'lg:col-span-12' : 'lg:col-span-10'} bg-slate-50 rounded-3xl p-4 sm:p-5 border-2 border-slate-200 overflow-x-auto transition-all duration-300`}>
          <div
            ref={boardRef}
            className={`p-5 bg-white rounded-2xl border border-slate-200 shadow-sm ${
              studentsPerDesk === 2 ? 'min-w-[800px]' : 'min-w-[620px]'
            } ${seatingConfig.mode === '3d' ? 'seating-3d-perspective' : ''}`}
          >
            {/* Compact Blackboard Header */}
            <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 border-4 border-amber-800 rounded-xl text-amber-200 p-3 text-center shadow-md mb-4">
              <div className="text-[10px] tracking-widest font-extrabold text-amber-300">
                ✦ KỶ LUẬT · TRI THỨC · SÁNG TẠO ✦
              </div>
              <div className="text-base sm:text-lg font-black tracking-wider text-white mt-0.5">
                ★ BẢNG LỚP {activeClass?.name} ★
              </div>
              <div className="text-[10px] sm:text-xs text-amber-200/80 font-semibold mt-0.5">
                Niên khóa {activeClass?.year || state.teacher.year || '2026 - 2027'} · GVCN: {state.teacher.name} · Sĩ số: {students.length}
              </div>
            </div>

            {/* Teacher Desk */}
            <div className="w-44 mx-auto mb-4 p-1.5 rounded-xl bg-purple-100 border-2 border-purple-300 text-purple-900 text-center font-black text-xs shadow-sm">
              <span className="block text-[10px] text-purple-700">🖥️ BÀN GIÁO VIÊN</span>
              <span className="font-extrabold text-xs">{state.teacher.name}</span>
            </div>

            {/* Desks organized by Lanes */}
            <div
              className={`grid gap-4 ${
                seatingConfig.mode === '3d' ? 'seating-3d-container' : ''
              }`}
              style={{
                gridTemplateColumns: `repeat(${seatingConfig.lanes}, minmax(0, 1fr))`
              }}
            >
              {Array.from({ length: seatingConfig.lanes }).map((_, laneIdx) => {
                return (
                  <div
                    key={laneIdx}
                    className="p-3 rounded-2xl bg-slate-100/90 border border-slate-200/90 space-y-3 shadow-inner"
                  >
                    <div className="py-1 px-3 text-center rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 text-white font-black text-xs tracking-wider shadow-sm flex items-center justify-center gap-1.5">
                      <Box className="w-3.5 h-3.5 opacity-80" />
                      <span>DÃY {laneIdx + 1}</span>
                    </div>

                    {Array.from({ length: totalRows }).map((_, rowIdx) => {
                      const deskSeatIndices: number[] = [];
                      for (let s = 0; s < studentsPerDesk; s++) {
                        const idx = rowIdx * seatsPerRow + laneIdx * studentsPerDesk + s;
                        if (idx < seatingConfig.seats) {
                          deskSeatIndices.push(idx);
                        }
                      }

                      if (deskSeatIndices.length === 0) return null;

                      return (
                        <div
                          key={rowIdx}
                          className="rounded-2xl bg-gradient-to-b from-amber-50/90 via-amber-50/40 to-slate-50 border-2 border-amber-200/90 shadow-sm overflow-hidden p-2 space-y-2 transition-all hover:border-amber-300"
                        >
                          {/* Desk Header Bar */}
                          <div className="flex items-center justify-between px-2.5 py-1 bg-amber-100/90 rounded-xl text-amber-950 font-extrabold text-[11px] border border-amber-200/80">
                            <span className="font-black">🪑 BÀN {rowIdx + 1}</span>
                            <span className="text-[10px] text-amber-800 font-extrabold bg-amber-200/70 px-1.5 py-0.5 rounded-md">
                              {studentsPerDesk === 2 ? 'Bàn 2 HS' : 'Bàn đơn'}
                            </span>
                          </div>

                          {/* Seats inside desk */}
                          <div className={`grid gap-2 ${studentsPerDesk === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {deskSeatIndices.map((seatIdx) => {
                              const assignedStudentId = seatingConfig.assignments?.[seatIdx];
                              const student = students.find((s) => s.id === assignedStudentId);

                              return (
                                <button
                                  key={seatIdx}
                                  onClick={() => handleSeatClick(seatIdx)}
                                  className={`w-full min-h-[150px] p-2.5 sm:p-3 rounded-2xl transition-all border-2 flex flex-col items-center justify-between text-center gap-1.5 ${
                                    student
                                      ? 'bg-white border-teal-400 hover:border-teal-600 shadow-sm hover:shadow-md'
                                      : 'bg-white/90 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/60 justify-center'
                                  } ${seatingConfig.mode === '3d' ? 'seating-3d-card' : ''}`}
                                >
                                  {student ? (
                                    <>
                                      <div className="relative flex items-center justify-center w-full">
                                        <span className="absolute -top-1 -right-1 z-10 px-1.5 py-0.5 rounded-md bg-teal-800 text-white text-[9px] font-black shadow-sm border border-white">
                                          Chỗ {seatIdx + 1}
                                        </span>
                                        <Avatar name={student.name} avatar={student.avatar} size="lg" />
                                      </div>
                                      <div className="w-full flex-1 flex flex-col justify-center items-center py-1">
                                        {/* Large, prominent, clear student name */}
                                        <div className="font-black text-xs sm:text-base text-slate-900 leading-snug break-words px-0.5 text-center w-full">
                                          {student.name}
                                        </div>
                                        <div className="mt-1 flex items-center justify-center gap-1">
                                          <span className="text-[10px] sm:text-xs text-rose-900 font-black bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 shadow-2xs flex items-center gap-1">
                                            <span>🌺</span>
                                            <span>{student.coins || 0} hoa</span>
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full text-center py-2 text-slate-400 font-bold text-xs flex flex-col items-center justify-center">
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mb-1 font-extrabold">
                                        Chỗ {seatIdx + 1}
                                      </span>
                                      <span className="text-teal-600/80 font-black text-xs">+ Chọn HS</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Unassigned Students Sidebar */}
        <div className={`${expandChart ? 'lg:col-span-12' : 'lg:col-span-2'} bg-white rounded-3xl p-4 border-2 border-teal-100 shadow-md flex flex-col justify-between transition-all duration-300`}>
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800">Chưa xếp chỗ</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                {unassignedStudents.length}
              </span>
            </div>

            <div className={`space-y-1.5 overflow-y-auto pr-1 ${expandChart ? 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 space-y-0 max-h-[160px]' : 'max-h-[500px]'}`}>
              {unassignedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-300 transition-colors"
                >
                  <Avatar name={student.name} avatar={student.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[11px] text-slate-800 truncate">{student.name}</div>
                    <div className="text-[9px] text-slate-500">{student.gender || 'Học sinh'}</div>
                  </div>
                </div>
              ))}
              {unassignedStudents.length === 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center text-xs font-bold col-span-full">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                  Đã xếp đủ học sinh!
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            💡 Chạm vào ô chỗ để gán HS.
          </div>
        </div>
      </div>

      {/* Seat Picker Modal */}
      {modalOpen && selectedSeatIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-teal-200 max-h-[85vh] flex flex-col">
            <h3 className="text-lg font-black text-slate-800 mb-1">
              Chọn học sinh cho Chỗ {selectedSeatIndex + 1} (Bàn {Math.floor(selectedSeatIndex / seatsPerRow) + 1})
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Chọn học sinh từ danh sách để bố trí vào vị trí này.
            </p>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {/* Option to leave desk empty */}
              <button
                onClick={() => assignStudentToSeat(null)}
                className="w-full p-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/50 font-bold text-xs text-rose-600 text-left transition-all"
              >
                ✕ Để bàn này trống
              </button>

              {students.map((student) => {
                const isCurrentlyHere =
                  seatingConfig.assignments?.[selectedSeatIndex] === student.id;
                const isAssignedElsewhere =
                  !isCurrentlyHere && assignedStudentIds.has(student.id);

                return (
                  <button
                    key={student.id}
                    onClick={() => assignStudentToSeat(student.id)}
                    className={`w-full p-2.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                      isCurrentlyHere
                        ? 'border-teal-500 bg-teal-50'
                        : isAssignedElsewhere
                        ? 'border-slate-200 opacity-60 hover:opacity-100 hover:border-teal-300'
                        : 'border-slate-200 hover:border-teal-400 hover:bg-teal-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={student.name} avatar={student.avatar} size="lg" />
                      <div className="truncate">
                        <div className="font-extrabold text-xs text-slate-800">
                          {student.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                          <span>{student.gender}</span>
                          <span>·</span>
                          <span className="text-rose-700 font-extrabold flex items-center gap-0.5">
                            🌺 {student.coins || 0} hoa
                          </span>
                        </div>
                      </div>
                    </div>
                    {isCurrentlyHere && (
                      <span className="text-[11px] font-black text-teal-700 bg-teal-200/60 px-2 py-0.5 rounded-full">
                        Đang ngồi đây
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
