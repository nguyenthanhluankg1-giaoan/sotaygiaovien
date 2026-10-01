import React, { useState } from 'react';
import { Sparkles, Volume2, RotateCcw, Award, Trash2, HelpCircle, Clock, BookOpen, Shuffle, Folder, GraduationCap, School } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppState, Student, WHEEL_EFFECTS, QuizQuestion, QuestionFolder } from '../../types';
import { DEFAULT_QUIZ_QUESTIONS } from '../../data/defaultQuestions';
import { DEFAULT_QUESTION_FOLDERS, uid } from '../../utils/helpers';
import { Avatar } from '../Avatar';
import { playCelebration, playBeep } from '../../utils/audio';
import { WheelQuizModal } from './wheel/WheelQuizModal';
import { QuestionBankModal } from './wheel/QuestionBankModal';
import { LuckyWheelVisual } from './wheel/LuckyWheelVisual';

interface WheelTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onNavigate?: (page: string) => void;
}

export const WheelTab: React.FC<WheelTabProps> = ({ state, onUpdateState, onNavigate }) => {
  const activeClass = state.classes.find((c) => c.id === state.activeClassId) || state.classes[0];
  const allClassStudents = state.students.filter((s) => s.classId === state.activeClassId);

  const [isSpinning, setIsSpinning] = useState(false);
  const [activeEffect, setActiveEffect] = useState<string>(
    state.wheelEffect || WHEEL_EFFECTS[0]
  );
  const [groupFilter, setGroupFilter] = useState<'all' | 'favorite'>(
    state.wheelGroup || 'all'
  );
  const [targetRotationDeg, setTargetRotationDeg] = useState(0);

  // Winner modal
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [winnerStudent, setWinnerStudent] = useState<Student | null>(null);

  // Quiz Modal & Question Bank Modal
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [questionBankOpen, setQuestionBankOpen] = useState(false);
  const [activeQuizQuestion, setActiveQuizQuestion] = useState<QuizQuestion | null>(null);
  const [isCycleReset, setIsCycleReset] = useState(false);

  const quizQuestionsList = Array.isArray(state.quizQuestions)
    ? state.quizQuestions
    : DEFAULT_QUIZ_QUESTIONS;

  const activeClassGrade = activeClass?.grade || (activeClass?.name ? parseInt(activeClass.name[0], 10) : undefined);

  // 1. Filter pool by chosen Grade (Khối lớp)
  const targetGrade = state.wheelQuizGrade ?? 'auto';
  const effectiveGrade = targetGrade === 'auto'
    ? activeClassGrade
    : (targetGrade === 'all' ? null : Number(targetGrade));

  const currentGradePool = effectiveGrade
    ? quizQuestionsList.filter((q) => {
        if (!q.grade || q.grade === 'all' || q.grade === '') return true;
        return Number(q.grade) === Number(effectiveGrade);
      })
    : quizQuestionsList;

  // 2. Filter pool by chosen specific Class (Lớp học)
  const currentClassPool = state.wheelQuizClassId && state.wheelQuizClassId !== 'all'
    ? currentGradePool.filter((q) => !q.classId || q.classId === 'all' || q.classId === state.wheelQuizClassId)
    : currentGradePool;

  // 3. Filter pool by chosen subject
  const currentSubjectPool = state.wheelQuizSubject && state.wheelQuizSubject !== 'all'
    ? currentClassPool.filter((q) => q.subject === state.wheelQuizSubject)
    : currentClassPool;

  // Filter question folders strictly by chosen Grade and Subject for the wheel selector
  const availableFoldersForWheel = (state.questionFolders || DEFAULT_QUESTION_FOLDERS).filter((f) => {
    // 1. Grade check: strictly exclude folders belonging to other grades
    if (effectiveGrade) {
      if (f.grade && f.grade !== 'all' && f.grade !== '') {
        if (Number(f.grade) !== Number(effectiveGrade)) {
          return false;
        }
      } else {
        const hasMatchInGrade = quizQuestionsList.some(
          (q) => q.folderId === f.id && (!q.grade || q.grade === 'all' || Number(q.grade) === Number(effectiveGrade))
        );
        if (!hasMatchInGrade) return false;
      }
    }

    // 2. Subject check: strictly exclude folders belonging to other subjects
    if (state.wheelQuizSubject && state.wheelQuizSubject !== 'all') {
      if (f.subject && f.subject !== 'all' && f.subject !== '') {
        if (f.subject !== state.wheelQuizSubject) {
          return false;
        }
      } else {
        const hasMatchInSubject = quizQuestionsList.some(
          (q) => q.folderId === f.id && (!q.subject || q.subject === 'all' || q.subject === state.wheelQuizSubject)
        );
        if (!hasMatchInSubject) return false;
      }
    }

    return true;
  });

  // 4. Filter pool by chosen folder
  const currentFolderPool = state.wheelQuizFolderId && state.wheelQuizFolderId !== 'all'
    ? (state.wheelQuizFolderId === 'uncategorized'
        ? currentSubjectPool.filter((q) => !q.folderId)
        : currentSubjectPool.filter((q) => q.folderId === state.wheelQuizFolderId))
    : currentSubjectPool;

  const currentQuestionPool = currentFolderPool;

  const usedQuestionIds = state.usedQuizQuestionIds || [];
  const unusedQuestions = currentQuestionPool.filter((q) => !usedQuestionIds.includes(q.id));

  const candidates = allClassStudents
    .filter((s) => !state.wheelExcluded.includes(s.id))
    .filter((s) => (groupFilter === 'favorite' ? s.favorite : true));

  const effectIndex = Math.max(0, WHEEL_EFFECTS.indexOf(activeEffect));

  const spinWheel = async () => {
    if (isSpinning) return;

    if (candidates.length === 0) {
      if (state.wheelExcluded.length > 0) {
        onUpdateState((prev) => ({ ...prev, wheelExcluded: [] }));
        alert('Tất cả học sinh đã được đưa lại vào lồng quay.');
      } else {
        alert('Không có học sinh nào trong danh sách quay!');
      }
      return;
    }

    setIsSpinning(true);

    // Pick random effect for extra excitement
    const randomFx = WHEEL_EFFECTS[Math.floor(Math.random() * WHEEL_EFFECTS.length)];
    setActiveEffect(randomFx);

    // Choose random winner
    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const winner = candidates[winnerIndex];

    // Calculate target rotation to align winner slice under top needle
    const sliceAngle = 360 / candidates.length;
    const sliceMid = winnerIndex * sliceAngle + sliceAngle / 2;
    const extraRounds = 5 * 360;
    const alignDeg = (360 - (sliceMid + (targetRotationDeg % 360))) % 360;
    const nextDeg = targetRotationDeg + extraRounds + (alignDeg === 0 ? 360 : alignDeg);

    setTargetRotationDeg(nextDeg);

    setTimeout(() => {
      setIsSpinning(false);
      setWinnerStudent(winner);

      // Record to history
      const newHistory = {
        id: uid('wh'),
        classId: state.activeClassId,
        studentId: winner.id,
        studentName: winner.name,
        effect: randomFx,
        time: new Date().toISOString()
      };

      onUpdateState((prev) => ({
        ...prev,
        wheelHistory: [newHistory, ...prev.wheelHistory],
        wheelExcluded: prev.settings.wheelExclude
          ? [...prev.wheelExcluded, winner.id]
          : prev.wheelExcluded
      }));

      playCelebration();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Check if quiz challenge mode is enabled
      const isQuizEnabled = state.wheelQuizEnabled !== false;
      if (isQuizEnabled && currentQuestionPool.length > 0) {
        let chosenQ: QuizQuestion;
        let nextUsedIds: string[];
        let cycleReset = false;

        // Ensure NO REPEAT: pick from unused questions
        if (unusedQuestions.length > 0) {
          chosenQ = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
          nextUsedIds = [...usedQuestionIds, chosenQ.id];
        } else {
          // All questions have been used! Auto-cycle so questions never stop
          cycleReset = true;
          chosenQ = currentQuestionPool[Math.floor(Math.random() * currentQuestionPool.length)];
          nextUsedIds = [chosenQ.id];
        }

        setIsCycleReset(cycleReset);
        setActiveQuizQuestion(chosenQ);
        onUpdateState((prev) => ({
          ...prev,
          usedQuizQuestionIds: nextUsedIds
        }));
        setQuizModalOpen(true);
      } else {
        setWinnerModalOpen(true);
      }
    }, 2100);
  };

  const handleNextQuizQuestion = () => {
    const currentUsed = state.usedQuizQuestionIds || [];
    const remainingUnused = currentQuestionPool.filter(
      (q) => !currentUsed.includes(q.id) && q.id !== activeQuizQuestion?.id
    );

    let nextQ: QuizQuestion;
    let nextUsedIds: string[];
    let cycleReset = false;

    if (remainingUnused.length > 0) {
      nextQ = remainingUnused[Math.floor(Math.random() * remainingUnused.length)];
      nextUsedIds = [...currentUsed, nextQ.id];
    } else {
      cycleReset = true;
      const poolExcludingCurrent = currentQuestionPool.filter((q) => q.id !== activeQuizQuestion?.id);
      const fallback = poolExcludingCurrent.length > 0 ? poolExcludingCurrent : currentQuestionPool;
      nextQ = fallback[Math.floor(Math.random() * fallback.length)];
      nextUsedIds = [nextQ.id];
    }

    setIsCycleReset(cycleReset);
    setActiveQuizQuestion(nextQ);
    onUpdateState((prev) => ({
      ...prev,
      usedQuizQuestionIds: nextUsedIds
    }));
  };

  const handleResetUsedQuestions = () => {
    onUpdateState((prev) => ({
      ...prev,
      usedQuizQuestionIds: []
    }));
    setIsCycleReset(false);
  };

  const handleAwardQuizCoins = (coins: number, reason: string) => {
    if (!winnerStudent) return;
    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === winnerStudent.id ? { ...s, coins: (s.coins || 0) + coins } : s
      ),
      transactions: [
        {
          id: uid('tx'),
          classId: prev.activeClassId,
          studentId: winnerStudent.id,
          studentName: winnerStudent.name,
          amount: coins,
          reason,
          subject: activeQuizQuestion?.subject || 'Ghi chung / Nề nếp',
          time: new Date().toISOString()
        },
        ...prev.transactions
      ]
    }));
  };

  const handleSaveQuestions = (updatedQuestions: QuizQuestion[]) => {
    const validIds = new Set(updatedQuestions.map((q) => q.id));
    onUpdateState((prev) => ({
      ...prev,
      quizQuestions: updatedQuestions,
      usedQuizQuestionIds: (prev.usedQuizQuestionIds || []).filter((id) => validIds.has(id))
    }));
  };

  const handleSaveFolders = (updatedFolders: QuestionFolder[]) => {
    onUpdateState((prev) => ({
      ...prev,
      questionFolders: updatedFolders
    }));
  };

  const handleAwardWinner = (coins: number) => {
    if (!winnerStudent) return;

    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === winnerStudent.id ? { ...s, coins: (s.coins || 0) + coins } : s
      ),
      transactions: [
        {
          id: uid('tx'),
          classId: prev.activeClassId,
          studentId: winnerStudent.id,
          studentName: winnerStudent.name,
          amount: coins,
          reason: `Thưởng trò chơi Vòng quay may mắn`,
          subject: 'Ghi chung / Nề nếp',
          time: new Date().toISOString()
        },
        ...prev.transactions
      ]
    }));

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.7 }
    });

    setWinnerModalOpen(false);
  };

  const restoreStudent = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      wheelExcluded: prev.wheelExcluded.filter((x) => x !== id)
    }));
  };

  const restoreAll = () => {
    onUpdateState((prev) => ({
      ...prev,
      wheelExcluded: []
    }));
  };

  const clearHistory = () => {
    onUpdateState((prev) => ({
      ...prev,
      wheelHistory: prev.wheelHistory.filter((h) => h.classId !== prev.activeClassId)
    }));
  };

  const classHistory = state.wheelHistory.filter((h) => h.classId === state.activeClassId);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: The Lucky Wheel Sphere */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-7 border-2 border-amber-100 shadow-md flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-black bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Vòng Quay May Mắn Tiết Học</span>
            </span>
            <button
              onClick={() => playBeep(700, 0.2, 0.1)}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 transition-colors"
              title="Thử âm thanh"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Lucky Wheel Component */}
          <LuckyWheelVisual
            candidates={candidates}
            isSpinning={isSpinning}
            activeEffect={activeEffect}
            effectIndex={effectIndex}
            onSpin={spinWheel}
            winnerStudent={winnerStudent}
            targetRotationDeg={targetRotationDeg}
          />

          {/* Candidates count info */}
          <div className="w-full flex items-center justify-between text-xs text-slate-500 font-semibold mt-4 px-2 pt-3 border-t border-slate-100">
            <span>🌐 Số học sinh tham gia quay: <strong className="text-amber-800">{candidates.length}</strong> học sinh</span>
            <span>
              {state.settings.wheelExclude
                ? '🛡️ Tự động loại trừ sau khi trúng'
                : '↻ Có thể trúng lặp lại'}
            </span>
          </div>
        </div>

        {/* Right: Controls & History (Independent Scroll) */}
        <div className="lg:col-span-4 space-y-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto custom-scrollbar pr-1">
          {/* Settings Card */}
          <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800">Cấu hình lồng cầu</h3>

            {/* Group switch */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 text-xs font-bold">
              <button
                onClick={() => setGroupFilter('all')}
                className={`py-1.5 rounded-xl transition-all ${
                  groupFilter === 'all'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Cả lớp ({allClassStudents.length})
              </button>
              <button
                onClick={() => setGroupFilter('favorite')}
                className={`py-1.5 rounded-xl transition-all ${
                  groupFilter === 'favorite'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Yêu thích ⭐ ({allClassStudents.filter((s) => s.favorite).length})
              </button>
            </div>

            {/* Effects selector */}
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-500 mb-2 tracking-wider">
                Chọn hiệu ứng quay
              </span>
              <div className="flex flex-wrap gap-1.5">
                {WHEEL_EFFECTS.map((eff) => (
                  <button
                    key={eff}
                    onClick={() => {
                      setActiveEffect(eff);
                      onUpdateState((prev) => ({ ...prev, wheelEffect: eff }));
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all ${
                      activeEffect === eff
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {eff}
                  </button>
                ))}
              </div>
            </div>

            {/* Exclude Switch */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 cursor-pointer">
                Loại trừ học sinh sau khi trúng
              </label>
              <input
                type="checkbox"
                checked={state.settings.wheelExclude}
                onChange={(e) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, wheelExclude: e.target.checked }
                  }))
                }
                className="w-4 h-4 rounded text-teal-600"
              />
            </div>

            {/* Quiz Mode Settings */}
            <div className="pt-3 border-t-2 border-teal-100/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-lg bg-teal-100 text-teal-800">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <label className="text-xs font-black text-slate-800 cursor-pointer">
                    Hỏi câu hỏi trắc nghiệm khi quay
                  </label>
                </div>
                <input
                  type="checkbox"
                  checked={state.wheelQuizEnabled !== false}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      wheelQuizEnabled: e.target.checked
                    }))
                  }
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </div>

              {state.wheelQuizEnabled !== false && (
                <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3 animate-in fade-in duration-200">
                  {/* Timer selection in seconds */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-teal-600" />
                        <span>Thời gian trả lời:</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white font-black text-[11px]">
                        {state.wheelQuizTimer || 15} giây
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {[5, 10, 15, 20, 30, 45, 60].map((sec) => (
                        <button
                          key={sec}
                          onClick={() =>
                            onUpdateState((prev) => ({
                              ...prev,
                              wheelQuizTimer: sec
                            }))
                          }
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all ${
                            (state.wheelQuizTimer || 15) === sec
                              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>

                    {/* Custom seconds input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-semibold">Tự chỉnh:</span>
                      <input
                        type="number"
                        min={3}
                        max={300}
                        value={state.wheelQuizTimer || 15}
                        onChange={(e) => {
                          const val = Math.max(3, Math.min(300, parseInt(e.target.value, 10) || 15));
                          onUpdateState((prev) => ({
                            ...prev,
                            wheelQuizTimer: val
                          }));
                        }}
                        className="w-16 px-2 py-0.5 text-xs font-bold text-center bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold">giây</span>
                    </div>
                  </div>

                  {/* Grade filter */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Khối lớp xuất hiện:</span>
                    </span>
                    <select
                      value={state.wheelQuizGrade || 'auto'}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          wheelQuizGrade: e.target.value
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                    >
                      <option value="auto">
                        ⚡ Tự động theo khối của lớp {activeClass ? `(${activeClass.name} - Khối ${activeClassGrade || 3})` : ''}
                      </option>
                      <option value="all">Tất cả khối lớp (1, 2, 3, 4, 5)</option>
                      <option value="1">Khối 1</option>
                      <option value="2">Khối 2</option>
                      <option value="3">Khối 3</option>
                      <option value="4">Khối 4</option>
                      <option value="5">Khối 5</option>
                    </select>
                  </div>

                  {/* Subject filter */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                      <span>Môn học xuất hiện:</span>
                    </span>
                    <select
                      value={state.wheelQuizSubject || 'all'}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          wheelQuizSubject: e.target.value
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="all">Tất cả môn học (Ngẫu nhiên)</option>
                      <option value="Tin học">Tin học</option>
                      <option value="Công nghệ">Công nghệ</option>
                      <option value="Toán">Toán</option>
                      <option value="Tiếng Việt">Tiếng Việt</option>
                      <option value="Khoa học">Khoa học</option>
                      <option value="Tự nhiên & Xã hội">Tự nhiên & Xã hội</option>
                      <option value="Lịch sử & Địa lý">Lịch sử & Địa lý</option>
                      <option value="Tiếng Anh">Tiếng Anh</option>
                      <option value="Đố vui">Đố vui</option>
                      <option value="Đạo đức">Đạo đức</option>
                    </select>
                  </div>

                  {/* Question Folder filter */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5 text-amber-500" />
                      <span>Thư mục câu hỏi:</span>
                    </span>
                    <select
                      value={state.wheelQuizFolderId || 'all'}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          wheelQuizFolderId: e.target.value
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="all">📁 Tất cả thư mục ({currentSubjectPool.length} câu)</option>
                      <option value="uncategorized">
                        🏷️ Chưa xếp thư mục ({currentSubjectPool.filter((q) => !q.folderId).length} câu)
                      </option>
                      {availableFoldersForWheel.map((f) => {
                        const countInFolder = currentSubjectPool.filter((q) => q.folderId === f.id).length;
                        return (
                          <option key={f.id} value={f.id}>
                            📁 {f.name} ({countInFolder} câu)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Shuffle answers toggle */}
                  <div
                    onClick={() =>
                      onUpdateState((prev) => ({
                        ...prev,
                        wheelQuizShuffleOptions: prev.wheelQuizShuffleOptions === false ? true : false
                      }))
                    }
                    className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                      state.wheelQuizShuffleOptions !== false
                        ? 'bg-purple-50/90 border-purple-300 text-purple-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        state.wheelQuizShuffleOptions !== false ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Shuffle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <label className="text-xs font-black cursor-pointer block text-slate-800">
                            Tự động đảo đáp án
                          </label>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                            state.wheelQuizShuffleOptions !== false
                              ? 'bg-purple-200/80 text-purple-900'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {state.wheelQuizShuffleOptions !== false ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                          Đổi ngẫu nhiên vị trí A, B, C, D · Đảm bảo các câu không bị trùng chữ cái đáp án đúng
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 pl-2">
                      <input
                        type="checkbox"
                        checked={state.wheelQuizShuffleOptions !== false}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateState((prev) => ({
                            ...prev,
                            wheelQuizShuffleOptions: e.target.checked
                          }));
                        }}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Non-duplicate status indicator */}
                  <div className="p-2.5 rounded-xl bg-teal-100/60 border border-teal-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div>
                        <span className="font-extrabold text-teal-950 block text-[11px] leading-tight">
                          Đảm bảo không trùng câu:
                        </span>
                        <span className="text-[10px] text-teal-800 font-bold">
                          Còn <b>{unusedQuestions.length}</b>/{currentQuestionPool.length} câu chưa xuất hiện
                        </span>
                      </div>
                    </div>
                    {usedQuestionIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetUsedQuestions}
                        title="Đặt lại danh sách câu đã hỏi để quay lại từ đầu"
                        className="px-2 py-1 rounded-lg bg-white hover:bg-teal-50 text-teal-700 font-black text-[10px] border border-teal-300 shadow-xs flex items-center gap-1 transition-all shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Làm mới</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Excluded list */}
            {state.wheelExcluded.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-600">
                    Đã trúng ({state.wheelExcluded.length}):
                  </span>
                  <button
                    onClick={restoreAll}
                    className="font-extrabold text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đưa tất cả vào lại</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {state.wheelExcluded.map((id) => {
                    const st = state.students.find((s) => s.id === id);
                    if (!st) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold"
                      >
                        <span>{st.name}</span>
                        <button
                          onClick={() => restoreStudent(id)}
                          className="hover:text-rose-600 text-teal-600"
                          title="Đưa vào lại"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Spin History */}
          <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-800">
                Lịch sử quay ({classHistory.length})
              </h3>
              {classHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa</span>
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {classHistory.slice(0, 15).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-bold">🏆</span>
                    <strong className="text-slate-800">{h.studentName}</strong>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(h.time).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
              {classHistory.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Chưa có lượt quay nào.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Winner Celebration Modal */}
      {winnerModalOpen && winnerStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border-4 border-amber-400">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 text-3xl shadow-md shadow-amber-300/40">
              🎉
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-black text-xs uppercase tracking-wider mb-2">
              HỌC SINH MAY MẮN
            </span>

            <Avatar
              name={winnerStudent.name}
              avatar={winnerStudent.avatar}
              size="xl"
              className="mx-auto my-2"
            />

            <h3 className="text-2xl font-black text-slate-800 mt-2">{winnerStudent.name}</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Lớp {activeClass?.name} · Hiện có: 🌺 {winnerStudent.coins || 0} hoa
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
              <span className="block text-xs font-extrabold text-rose-900 mb-2">
                Thưởng hoa thi đua tức thì:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleAwardWinner(amt)}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black text-sm shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1"
                  >
                    <span>+{amt}</span>
                    <span className="text-xs">🌺</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setWinnerModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50"
              >
                Đóng / Quay tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {quizModalOpen && winnerStudent && activeQuizQuestion && (
        <WheelQuizModal
          isOpen={quizModalOpen}
          onClose={() => setQuizModalOpen(false)}
          student={winnerStudent}
          classNameStr={activeClass?.name}
          question={activeQuizQuestion}
          durationSeconds={state.wheelQuizTimer || 15}
          remainingCount={Math.max(0, unusedQuestions.filter((q) => q.id !== activeQuizQuestion.id).length)}
          totalCount={currentQuestionPool.length}
          isResetCycle={isCycleReset}
          shuffleOptions={state.wheelQuizShuffleOptions !== false}
          onToggleShuffleOptions={(enabled) =>
            onUpdateState((prev) => ({
              ...prev,
              wheelQuizShuffleOptions: enabled
            }))
          }
          onNextQuestion={handleNextQuizQuestion}
          onAwardCoins={handleAwardQuizCoins}
          onSpinAgain={spinWheel}
        />
      )}

      {/* Question Bank Manager Modal */}
      {questionBankOpen && (
        <QuestionBankModal
          isOpen={questionBankOpen}
          onClose={() => setQuestionBankOpen(false)}
          questions={quizQuestionsList}
          folders={Array.isArray(state.questionFolders) ? state.questionFolders : DEFAULT_QUESTION_FOLDERS}
          classes={state.classes}
          activeClassId={state.activeClassId}
          onSaveQuestions={handleSaveQuestions}
          onSaveFolders={handleSaveFolders}
          ownerUserId={state.ownerUserId}
        />
      )}
    </div>
  );
};
