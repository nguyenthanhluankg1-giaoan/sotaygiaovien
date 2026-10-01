import React, { useEffect, useState } from 'react';
import { Sparkles, Volume2, Trophy, RotateCcw, Flame } from 'lucide-react';
import { Student } from '../../../types';
import { playBeep } from '../../../utils/audio';

interface LuckyWheelVisualProps {
  candidates: Student[];
  isSpinning: boolean;
  activeEffect: string;
  effectIndex: number;
  onSpin: () => void;
  winnerStudent: Student | null;
  targetRotationDeg?: number;
}

const COLOR_PALETTES = {
  rainbow: {
    name: '🌈 Cầu vồng rực rỡ',
    colors: [
      '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
      '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
      '#eab308', '#a855f7'
    ]
  },
  neon: {
    name: '⚡ Neon Dạ quang',
    colors: [
      '#ff0055', '#ff7700', '#ffdd00', '#00ff66', '#00ffff',
      '#0066ff', '#9900ff', '#ff00cc', '#00ffcc', '#ff3399'
    ]
  },
  candy: {
    name: '🍬 Kẹo ngọt Pastel',
    colors: [
      '#f472b6', '#fb923c', '#facc15', '#4ade80', '#38bdf8',
      '#c084fc', '#f43f5e', '#2dd4bf', '#fbbf24', '#a78bfa'
    ]
  },
  royal: {
    name: '👑 Hoàng gia Gold',
    colors: [
      '#d97706', '#b91c1c', '#047857', '#1d4ed8', '#6d28d9',
      '#be185d', '#0284c7', '#15803d', '#c2410c', '#7e22ce'
    ]
  }
};

export const LuckyWheelVisual: React.FC<LuckyWheelVisualProps> = ({
  candidates,
  isSpinning,
  activeEffect,
  effectIndex,
  onSpin,
  winnerStudent,
  targetRotationDeg = 0
}) => {
  const [wheelMode, setWheelMode] = useState<'wheel' | 'sphere'>('wheel');
  const [paletteKey, setPaletteKey] = useState<keyof typeof COLOR_PALETTES>('rainbow');
  const [rotation, setRotation] = useState(0);

  // Sync internal rotation with target rotation when spinning starts
  useEffect(() => {
    if (targetRotationDeg > 0) {
      setRotation(targetRotationDeg);
    }
  }, [targetRotationDeg]);

  // Ticking sound during spin to create excitement & suspense
  useEffect(() => {
    if (!isSpinning) return;

    let currentDelay = 45;
    let timerId: NodeJS.Timeout;

    const tickLoop = () => {
      // Pitch variation gives realistic mechanical wheel tick
      const pitch = 800 + Math.floor(Math.random() * 250);
      playBeep(pitch, 0.035, 0.07);

      // Decelerate ticker sound exponentially over 2.1 seconds
      currentDelay = Math.min(480, currentDelay * 1.14);
      timerId = setTimeout(tickLoop, currentDelay);
    };

    tickLoop();

    return () => {
      clearTimeout(timerId);
    };
  }, [isSpinning]);

  const currentColors = COLOR_PALETTES[paletteKey].colors;

  // Calculate SVG arc slices for the wheel
  const numCandidates = candidates.length;
  const sliceAngle = numCandidates > 0 ? 360 / numCandidates : 360;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Controls: Mode Switch & Palette Switch */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-4 px-1">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-black">
          <button
            onClick={() => setWheelMode('wheel')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              wheelMode === 'wheel'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎡 Vòng quay chia ô</span>
          </button>
          <button
            onClick={() => setWheelMode('sphere')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              wheelMode === 'sphere'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔮 Lồng cầu bốc thăm</span>
          </button>
        </div>

        {wheelMode === 'wheel' && (
          <div className="flex items-center gap-1 text-xs">
            <span className="font-extrabold text-slate-500 hidden sm:inline">Phối màu:</span>
            <select
              value={paletteKey}
              onChange={(e) => setPaletteKey(e.target.value as keyof typeof COLOR_PALETTES)}
              className="px-2.5 py-1.5 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-900 font-extrabold text-xs focus:outline-none"
            >
              {Object.entries(COLOR_PALETTES).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Visual Display Container */}
      <div className="relative my-2 flex items-center justify-center">
        {wheelMode === 'wheel' ? (
          /* ==================== 🎡 VÒNG QUAY BÁNH XE NHIỀU MÀU SẮC ==================== */
          <div className="relative w-[330px] h-[330px] sm:w-[440px] sm:h-[440px] flex items-center justify-center select-none">
            {/* Top Golden Arrow Needle Pointer */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none filter drop-shadow-xl">
              <div
                className={`w-10 h-12 transition-transform ${
                  isSpinning ? 'animate-bounce' : 'hover:scale-110'
                }`}
              >
                <svg viewBox="0 0 40 50" className="w-full h-full">
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FDE047" />
                      <stop offset="50%" stopColor="#CA8A04" />
                      <stop offset="100%" stopColor="#78350F" />
                    </linearGradient>
                  </defs>
                  {/* Needle Body */}
                  <path
                    d="M20 50 L38 6 L20 14 L2 6 Z"
                    fill="url(#goldGradient)"
                    stroke="#451A03"
                    strokeWidth="2"
                  />
                  {/* Needle Gem Ring */}
                  <circle cx="20" cy="14" r="5" fill="#EF4444" stroke="#FFF" strokeWidth="1.5" />
                </svg>
              </div>
            </div>

            {/* Outer Casino Frame & Flashing LED Lights Ring */}
            <div className="w-full h-full rounded-full border-8 border-amber-400 p-2 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-2xl shadow-amber-500/30 relative flex items-center justify-center">
              {/* 20 Casino LED bulbs around rim */}
              {Array.from({ length: 20 }).map((_, i) => {
                const angle = (i / 20) * 360;
                const rad = (angle * Math.PI) / 180;
                const lx = 50 + 47.8 * Math.cos(rad);
                const ly = 50 + 47.8 * Math.sin(rad);
                const isEven = i % 2 === 0;

                return (
                  <div
                    key={i}
                    style={{ left: `${lx}%`, top: `${ly}%` }}
                    className={`absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-100 transition-all ${
                      isSpinning
                        ? isEven
                          ? 'bg-yellow-300 shadow-yellow-300/90 animate-ping'
                          : 'bg-rose-500 shadow-rose-500/90 animate-pulse'
                        : isEven
                        ? 'bg-yellow-300 shadow-yellow-200/60'
                        : 'bg-emerald-400 shadow-emerald-300/60'
                    }`}
                  />
                );
              })}

              {/* The Rotating Wheel SVG */}
              <div
                className="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-slate-900 transition-transform duration-[2100ms] ease-[cubic-bezier(0.15,0.85,0.35,1)]"
                style={{
                  transform: `rotate(${rotation}deg)`
                }}
              >
                {candidates.length > 0 ? (
                  <svg viewBox="0 0 400 400" className="w-full h-full">
                    <defs>
                      <filter id="shadow">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.5" />
                      </filter>
                    </defs>

                    {candidates.map((student, idx) => {
                      const startAngle = idx * sliceAngle - 90;
                      const endAngle = (idx + 1) * sliceAngle - 90;
                      const midAngle = (startAngle + endAngle) / 2;

                      const cx = 200;
                      const cy = 200;
                      const r = 196;

                      // Slice path calculation
                      const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
                      const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
                      const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
                      const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);

                      const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                      const pathData =
                        numCandidates === 1
                          ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`
                          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                      const fillColor = currentColors[idx % currentColors.length];

                      // Text radial positioning & full name alignment
                      const textRadius = r * 0.56;
                      const normalizedAngle = ((midAngle % 360) + 360) % 360;
                      const isLeftSide = normalizedAngle > 90 && normalizedAngle < 270;
                      const textRotation = isLeftSide ? midAngle + 180 : midAngle;
                      const textX = isLeftSide ? -textRadius : textRadius;

                      // Calculate font size dynamically based on candidate count and name length
                      const nameLength = student.name.length;
                      let fontSize = 14;
                      if (numCandidates > 24 || nameLength > 20) {
                        fontSize = 9;
                      } else if (numCandidates > 16 || nameLength > 15) {
                        fontSize = 11;
                      } else if (numCandidates > 10 || nameLength > 12) {
                        fontSize = 12;
                      }

                      return (
                        <g key={student.id}>
                          {/* Segment Sector */}
                          <path
                            d={pathData}
                            fill={fillColor}
                            stroke="#FFFFFF"
                            strokeWidth="2.5"
                          />

                          {/* Full Student Name Group - Radial Vertical Alignment */}
                          <g
                            transform={`translate(${cx}, ${cy}) rotate(${textRotation})`}
                            className="select-none pointer-events-none"
                          >
                            <text
                              x={textX}
                              y={0}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#FFFFFF"
                              fontSize={fontSize}
                              fontWeight="900"
                              filter="url(#shadow)"
                            >
                              {student.name}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs font-bold text-slate-300">
                    Lồng quay đang trống! Hãy đưa học sinh vào danh sách.
                  </div>
                )}
              </div>

              {/* Center Golden Crown Hub */}
              <div className="absolute z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-300 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 shadow-xl flex items-center justify-center text-white font-black text-xs text-center p-1">
                <div className="w-full h-full rounded-full border-2 border-amber-200/60 flex flex-col items-center justify-center bg-amber-600/30 backdrop-blur-xs">
                  <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                  <span className="text-[10px] tracking-wider font-black text-amber-100">
                    {isSpinning ? 'QUAY...' : 'MAY MẮN'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== 🔮 LỒNG CẦU BỐC THĂM 3D ==================== */
          <div
            className={`w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full border-8 border-teal-500 relative overflow-hidden shadow-2xl shadow-teal-700/20 bg-gradient-to-br from-teal-50 via-teal-100/50 to-emerald-100 ${
              isSpinning ? `spinning-fx${effectIndex}` : ''
            }`}
          >
            {/* Inner ambient star */}
            <div className="absolute inset-0 flex items-center justify-center font-black text-6xl sm:text-7xl text-teal-600/10 select-none pointer-events-none">
              ✦
            </div>

            {/* Student balls orbiting inside */}
            {candidates.map((s, idx) => {
              const total = candidates.length;
              const angle = (idx / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
              const radiusPct = total > 12 ? 37 : 33;
              const x = 50 + Math.cos(angle) * radiusPct;
              const y = 50 + Math.sin(angle) * radiusPct;
              const ballColor = currentColors[idx % currentColors.length];

              return (
                <div
                  key={s.id}
                  title={s.name}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className="wheel-ball-anim absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
                >
                  <div
                    style={{ backgroundColor: ballColor }}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white shadow-xl flex items-center justify-center overflow-hidden text-white font-extrabold text-xs select-none hover:scale-110 transition-transform"
                  >
                    {s.avatar ? (
                      <img
                        src={s.avatar}
                        alt={s.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="drop-shadow-md">{s.name.split(' ').slice(-1)[0]}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {candidates.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs font-bold text-slate-400">
                Lồng cầu đang trống! Hãy đưa học sinh vào lại.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Big Spin Button */}
      <button
        onClick={onSpin}
        disabled={isSpinning || candidates.length === 0}
        className="w-full max-w-md mt-4 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-black text-lg shadow-xl shadow-rose-500/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
      >
        <Sparkles className="w-6 h-6 text-amber-200 animate-spin" />
        <span className="tracking-wide">
          {isSpinning ? '🎡 ĐANG QUAY VÒNG QUAY MAY MẮN...' : '⚡ QUAY NGAY!'}
        </span>
      </button>
    </div>
  );
};
