import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw, Plus, Minus, Volume2 } from 'lucide-react';
import { AppState } from '../../types';
import { playTick, playAlarm } from '../../utils/audio';

interface CountdownTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const CountdownTab: React.FC<CountdownTabProps> = ({ state, onUpdateState }) => {
  const [totalSeconds, setTotalSeconds] = useState(300); // Default 5 minutes
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [isRunning, setIsRunning] = useState(false);

  // Manual inputs
  const [inputHours, setInputHours] = useState(0);
  const [inputMinutes, setInputMinutes] = useState(5);
  const [inputSeconds, setInputSeconds] = useState(0);

  const timerColor = state.settings.timerColor || '#0d9488';
  const tickLast10 = state.settings.tickLast10;

  // Timer interval
  useEffect(() => {
    if (!isRunning) return;

    if (secondsLeft <= 0) {
      setIsRunning(false);
      playAlarm();
      alert('⏰ Hết giờ! Thời gian làm bài / hoạt động đã kết thúc.');
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (tickLast10 && next <= 10 && next > 0) {
          playTick();
        }
        return next;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [isRunning, secondsLeft, tickLast10]);

  const toggleRunning = () => {
    if (secondsLeft <= 0) {
      setSecondsLeft(totalSeconds);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const adjustSeconds = (amount: number) => {
    setSecondsLeft((prev) => {
      const next = Math.max(0, prev + amount);
      if (next > totalSeconds) {
        setTotalSeconds(next);
      }
      return next;
    });
  };

  const applyManualInputs = () => {
    const total = inputHours * 3600 + inputMinutes * 60 + inputSeconds;
    const validTotal = Math.max(1, total);
    setTotalSeconds(validTotal);
    setSecondsLeft(validTotal);
    setIsRunning(false);
  };

  const applyPreset = (minutes: number) => {
    const total = minutes * 60;
    setTotalSeconds(total);
    setSecondsLeft(total);
    setIsRunning(false);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const z = (n: number) => String(n).padStart(2, '0');

    if (h > 0) {
      return `${z(h)}:${z(m)}:${z(s)}`;
    }
    return `${z(m)}:${z(s)}`;
  };

  const progressPct = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;

  const colorThemes = [
    { color: '#0d9488', name: 'Xanh ngọc' },
    { color: '#0284c7', name: 'Xanh dương' },
    { color: '#7c3aed', name: 'Tím violet' },
    { color: '#f59e0b', name: 'Vàng cam' },
    { color: '#f43f5e', name: 'Hồng sen' }
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
          <Timer className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-xl font-black text-slate-800">Đồng Hồ Đếm Ngược Hoạt Động</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Phục vụ cho các hoạt động thảo luận nhóm, trò chơi khởi động và bài kiểm tra ngắn.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Giant Circular Timer */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border-2 border-teal-100 shadow-md flex flex-col items-center justify-between">
          <div className="w-full flex justify-between items-center text-xs font-bold text-slate-400">
            <span>ĐỒNG HỒ PHÒNG HỌC</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                isRunning
                  ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isRunning ? 'ĐANG ĐẾM NGƯỢC' : secondsLeft === 0 ? 'ĐÃ HẾT GIỜ' : 'SẴN SÀNG'}
            </span>
          </div>

          {/* Big Progress Ring */}
          <div className="my-6 relative flex items-center justify-center">
            <div
              className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] rounded-full p-4.5 shadow-2xl flex items-center justify-center"
              style={{
                background: `conic-gradient(${timerColor} ${progressPct}%, #e2e8f0 0deg)`
              }}
            >
              <div className="w-full h-full rounded-full bg-slate-900 text-white flex flex-col items-center justify-center shadow-inner">
                <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight font-mono">
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">
                  {isRunning ? 'THỜI GIAN CÒN LẠI' : 'BẤM BẮT ĐẦU ĐỂ CHẠY'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="w-full max-w-md flex items-center justify-center gap-2.5 flex-wrap">
            <button
              onClick={() => adjustSeconds(-30)}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
            >
              <Minus className="w-3.5 h-3.5 inline mr-1" />
              30s
            </button>

            <button
              onClick={toggleRunning}
              className={`flex-1 py-3.5 px-6 rounded-2xl text-white font-black text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>TẠM DỪNG</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>BẮT ĐẦU</span>
                </>
              )}
            </button>

            <button
              onClick={() => adjustSeconds(30)}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              30s
            </button>

            <button
              onClick={handleReset}
              className="p-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Đặt lại từ đầu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Settings check */}
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              id="tickCheck"
              checked={tickLast10}
              onChange={(e) =>
                onUpdateState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, tickLast10: e.target.checked }
                }))
              }
              className="w-4 h-4 rounded text-teal-600"
            />
            <label htmlFor="tickCheck" className="cursor-pointer">
              Phát âm thanh tích tắc trong 10 giây cuối cùng
            </label>
          </div>
        </div>

        {/* Right: Presets & Custom Configuration */}
        <div className="lg:col-span-4 space-y-4">
          {/* Custom Time Input */}
          <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
            <h3 className="font-extrabold text-sm text-slate-800 mb-3">⏱ Thiết lập thời gian</h3>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={isNaN(inputHours) ? 0 : inputHours}
                  onChange={(e) => setInputHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full p-2.5 text-center font-black text-lg rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">GIỜ</span>
              </div>

              <div>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={isNaN(inputMinutes) ? 0 : inputMinutes}
                  onChange={(e) => setInputMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full p-2.5 text-center font-black text-lg rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">PHÚT</span>
              </div>

              <div>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={isNaN(inputSeconds) ? 0 : inputSeconds}
                  onChange={(e) => setInputSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full p-2.5 text-center font-black text-lg rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">GIÂY</span>
              </div>
            </div>

            <button
              onClick={applyManualInputs}
              className="w-full mt-3 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 transition-all"
            >
              ✓ Áp dụng thời gian này
            </button>
          </div>

          {/* Quick Presets */}
          <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
            <h3 className="font-extrabold text-sm text-slate-800 mb-3">⚡ Mẫu nhanh phổ biến</h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {[1, 3, 5, 10, 15, 20, 25, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => applyPreset(m)}
                  className={`py-2 rounded-xl text-xs font-black border transition-all ${
                    totalSeconds === m * 60
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {m === 60 ? '1 giờ' : `${m}p`}
                </button>
              ))}
            </div>
          </div>

          {/* Ring Color Theme */}
          <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
            <h3 className="font-extrabold text-sm text-slate-800 mb-3">🎨 Màu sắc đồng hồ</h3>
            <div className="flex flex-wrap gap-2">
              {colorThemes.map((theme) => (
                <button
                  key={theme.color}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, timerColor: theme.color }
                    }))
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-black border transition-all flex items-center gap-1.5 ${
                    timerColor === theme.color
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
