import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Zap, Play, RotateCcw, Volume2, Trophy, HelpCircle, CheckCircle2, Flame, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion } from '../../types';
import { playBeep, playCelebration } from '../../utils/audio';

export interface TugLuckyWheelProps {
  questions: QuizQuestion[];
  isSpinning: boolean;
  targetRotationDeg: number;
  onSpin: (selectedIndex: number, targetDeg: number) => void;
  selectedQuestion: QuizQuestion | null;
  onClose?: () => void;
  onConfirmQuestion?: (question: QuizQuestion) => void;
  isTeacher: boolean;
  soundEnabled?: boolean;
  bonusEffect?: string | null;
}

const WHEEL_COLORS = [
  '#ef4444', // Đỏ
  '#f59e0b', // Vàng cam
  '#10b981', // Xanh ngọc
  '#06b6d4', // Cyan
  '#3b82f6', // Xanh dương
  '#8b5cf6', // Tím
  '#ec4899', // Hồng
  '#14b8a6', // Teal
  '#f97316', // Cam đậm
  '#6366f1'  // Indigo
];

export const TugLuckyWheel: React.FC<TugLuckyWheelProps> = ({
  questions,
  isSpinning,
  targetRotationDeg,
  onSpin,
  selectedQuestion,
  onClose,
  onConfirmQuestion,
  isTeacher,
  soundEnabled = true,
  bonusEffect
}) => {
  const [rotation, setRotation] = useState<number>(targetRotationDeg || 0);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isRevealingQuestion, setIsRevealingQuestion] = useState<boolean>(false);

  // Sync internal rotation state with targetRotationDeg
  useEffect(() => {
    if (targetRotationDeg > 0) {
      setRotation(targetRotationDeg);
    }
  }, [targetRotationDeg]);

  // Audio ticking loop when spinning
  useEffect(() => {
    if (!isSpinning) return;

    setIsRevealingQuestion(false);
    let currentDelay = 40;
    let timerId: any = null;

    const tickLoop = () => {
      if (soundEnabled) {
        const pitch = 750 + Math.floor(Math.random() * 200);
        playBeep(pitch, 0.04, 0.08);
      }
      currentDelay = Math.min(450, currentDelay * 1.13);
      timerId = setTimeout(tickLoop, currentDelay);
    };

    tickLoop();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isSpinning, soundEnabled]);

  // When spin finishes, trigger celebration
  useEffect(() => {
    if (!isSpinning && targetRotationDeg > 0 && selectedQuestion) {
      setIsRevealingQuestion(true);
      if (soundEnabled) playCelebration();
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isSpinning, targetRotationDeg, selectedQuestion, soundEnabled]);

  // Slices generation
  const activeQuestionsList = questions.length > 0 ? questions.slice(0, 10) : [];
  const totalSlices = Math.max( activeQuestionsList.length, 6 );
  const sliceAngle = 360 / totalSlices;

  // Function to calculate spin
  const handleStartSpin = () => {
    if (isSpinning || activeQuestionsList.length === 0) return;

    // Pick random question index
    const randomIndex = Math.floor(Math.random() * activeQuestionsList.length);
    
    // Calculate rotation to align the selected slice with the top pointer (90 deg in SVG / 270 deg)
    // Extra full spins (between 5 to 8 full spins for excitement)
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const sliceCenterAngle = randomIndex * sliceAngle + sliceAngle / 2;
    // Pointer is at the top (270 deg in SVG coordinate)
    const targetAngle = extraSpins * 360 + (360 - sliceCenterAngle) + 270;

    onSpin(randomIndex, targetAngle);
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-5 w-full max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      {/* Header Banner */}
      <div className="text-center space-y-1 mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border-2 border-amber-400/60 shadow-lg animate-pulse">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">
            🎡 VÒNG QUAY CÂU HỎI MAY MẮN
          </span>
          <Sparkles className="w-4 h-4 text-amber-300" />
        </div>
        <p className="text-xs text-slate-300 font-bold">
          Quay ngẫu nhiên câu hỏi tranh tài cho 2 đội Kéo co!
        </p>
      </div>

      {/* Main Wheel Container */}
      <div className="relative flex items-center justify-center select-none my-2">
        {/* Top Golden Arrow Indicator */}
        <div className="absolute -top-5 sm:-top-6 z-30 flex flex-col items-center drop-shadow-[0_4px_12px_rgba(245,158,11,0.9)] animate-bounce">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400 filter drop-shadow-md" />
          <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white -mt-7 shadow-inner" />
        </div>

        {/* Outer Glowing Golden Rim with LED Bulbs */}
        <div className="relative p-3 sm:p-4 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-700 p-3 shadow-[0_0_50px_rgba(245,158,11,0.4)] border-4 border-amber-300">
          {/* Circular SVG Wheel */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full overflow-hidden shadow-2xl bg-slate-900 border-4 border-slate-950">
            <svg
              viewBox="-160 -160 320 320"
              className="w-full h-full transform transition-transform duration-[3800ms] cubic-bezier(0.15, 0.9, 0.25, 1.0)"
              style={{
                transform: `rotate(${rotation}deg)`
              }}
            >
              <defs>
                <filter id="sliceShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Slices */}
              {Array.from({ length: totalSlices }).map((_, idx) => {
                const q = activeQuestionsList[idx % activeQuestionsList.length];
                const startAngle = (idx * sliceAngle * Math.PI) / 180;
                const endAngle = (((idx + 1) * sliceAngle) * Math.PI) / 180;

                const r = 155;
                const x1 = r * Math.cos(startAngle);
                const y1 = r * Math.sin(startAngle);
                const x2 = r * Math.cos(endAngle);
                const y2 = r * Math.sin(endAngle);

                const pathData = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
                const fillColor = WHEEL_COLORS[idx % WHEEL_COLORS.length];
                const textAngle = idx * sliceAngle + sliceAngle / 2;

                return (
                  <g key={idx}>
                    <path
                      d={pathData}
                      fill={fillColor}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      filter="url(#sliceShadow)"
                      className="transition-colors hover:brightness-110"
                    />

                    {/* Slice Text Content */}
                    <g transform={`rotate(${textAngle}) translate(95, 0)`}>
                      <text
                        x="0"
                        y="0"
                        fill="#ffffff"
                        fontSize={totalSlices > 8 ? '10.5' : '12.5'}
                        fontWeight="900"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform="rotate(90)"
                        className="font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none pointer-events-none"
                      >
                        {q ? `Câu ${idx + 1}` : `Ô ${idx + 1}`}
                      </text>
                      <text
                        x="0"
                        y="14"
                        fill="#fef08a"
                        fontSize={totalSlices > 8 ? '8.5' : '10'}
                        fontWeight="800"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform="rotate(90)"
                        className="select-none pointer-events-none"
                      >
                        {q?.subject ? q.subject.slice(0, 8) : 'Trắc nghiệm'}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Perimeter Light Bulbs */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 15 * Math.PI) / 180;
                const bx = 150 * Math.cos(angle);
                const by = 150 * Math.sin(angle);
                const isEven = i % 2 === 0;
                return (
                  <circle
                    key={i}
                    cx={bx}
                    cy={by}
                    r={isEven ? 3 : 2.5}
                    fill={isSpinning ? (isEven ? '#fef08a' : '#ffffff') : '#ffffff'}
                    stroke="#b45309"
                    strokeWidth="1"
                    className={isSpinning ? 'animate-pulse' : ''}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Center Spin Button / Hub */}
        <div className="absolute z-20 flex items-center justify-center">
          {isTeacher ? (
            <button
              onClick={handleStartSpin}
              disabled={isSpinning || activeQuestionsList.length === 0}
              className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 text-slate-950 font-black flex flex-col items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.9)] border-4 border-white transition-all transform active:scale-90 ${
                isSpinning
                  ? 'opacity-80 cursor-wait animate-spin'
                  : 'hover:scale-110 hover:brightness-110 cursor-pointer animate-pulse ring-4 ring-amber-400/50'
              }`}
              title="Bấm để quay vòng quay câu hỏi"
            >
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-slate-950" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider mt-0.5">
                {isSpinning ? 'ĐANG QUAY' : 'QUAY'}
              </span>
            </button>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 border-4 border-amber-400 text-amber-300 flex flex-col items-center justify-center shadow-xl">
              <Zap className="w-5 h-5 animate-pulse text-amber-300 fill-current" />
              <span className="text-[9px] font-black uppercase">CHỜ QUAY</span>
            </div>
          )}
        </div>
      </div>

      {/* Selected Question Card Reveal */}
      {selectedQuestion && !isSpinning && isRevealingQuestion && (
        <div className="w-full mt-4 p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/80 to-slate-900 border-3 border-amber-400 text-white shadow-2xl text-center space-y-2 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">
              🎯 ĐÃ CHỌN CÂU HỎI
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 font-bold text-xs">
              📚 {selectedQuestion.subject || 'Tổng hợp'}
            </span>
          </div>

          <h4 className="text-sm sm:text-base md:text-lg font-black text-amber-200 leading-snug">
            {selectedQuestion.question}
          </h4>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {isTeacher && onConfirmQuestion && (
              <button
                onClick={() => onConfirmQuestion(selectedQuestion)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Bắt đầu câu hỏi này ngay!</span>
              </button>
            )}

            {isTeacher && (
              <button
                onClick={handleStartSpin}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Quay lại câu khác</span>
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
