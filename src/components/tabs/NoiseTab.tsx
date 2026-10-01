import React, { useState, useEffect, useRef } from 'react';
import { VolumeX, Mic, MicOff, ShieldAlert, Timer, Sparkles } from 'lucide-react';
import { playAlertSound, playBeep } from '../../utils/audio';

export const NoiseTab: React.FC = () => {
  // Full-screen overlay alert
  const [fullAlert, setFullAlert] = useState<{
    emoji: string;
    text: string;
    color: string;
  } | null>(null);

  // Quiet countdown timer
  const [quietLeft, setQuietLeft] = useState<number>(0);
  const [quietActive, setQuietActive] = useState(false);

  // Microphone monitoring state
  const [micActive, setMicActive] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [autoAlert, setAutoAlert] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastWarnTimeRef = useRef<number>(0);

  // Trigger full screen alert
  const triggerAlert = (
    emoji: string,
    text: string,
    color: string,
    soundType: 'shh' | 'loud' | 'stop' | 'great'
  ) => {
    playAlertSound(soundType);
    setFullAlert({ emoji, text, color });
    setTimeout(() => {
      setFullAlert(null);
    }, 3200);
  };

  // Quiet timer logic
  const startQuietTimer = (seconds: number) => {
    setQuietLeft(seconds);
    setQuietActive(true);
  };

  useEffect(() => {
    if (!quietActive) return;
    if (quietLeft <= 0) {
      setQuietActive(false);
      triggerAlert('🌟', 'TUYỆT VỜI!', '#059669', 'great');
      return;
    }

    const timer = setTimeout(() => {
      setQuietLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [quietActive, quietLeft]);

  // Microphone toggle logic
  const toggleMic = async () => {
    if (micActive) {
      stopMic();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ac = new AudioCtx();
        audioContextRef.current = ac;

        const source = ac.createMediaStreamSource(stream);
        const analyser = ac.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        setMicActive(true);

        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
          const pct = Math.min(100, Math.round((avg / 85) * 100));
          setNoiseLevel(pct);

          if (pct > 72 && autoAlert && Date.now() - lastWarnTimeRef.current > 6000) {
            lastWarnTimeRef.current = Date.now();
            playBeep(360, 0.25, 0.15);
          }

          rafRef.current = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (err) {
        console.error('Mic access error:', err);
        alert(
          'Không thể truy cập microphone. Vui lòng kiểm tra quyền cấp phép microphone của trình duyệt.'
        );
      }
    }
  };

  const stopMic = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    streamRef.current = null;
    audioContextRef.current = null;
    rafRef.current = null;
    setMicActive(false);
    setNoiseLevel(0);
  };

  useEffect(() => {
    return () => {
      stopMic();
    };
  }, []);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Full screen alert overlay */}
      {fullAlert && (
        <div
          onClick={() => setFullAlert(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md cursor-pointer animate-in fade-in duration-150"
        >
          <div
            style={{ backgroundColor: fullAlert.color }}
            className="w-full max-w-xl p-8 rounded-3xl text-white text-center shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="text-8xl mb-3">{fullAlert.emoji}</div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">{fullAlert.text}</h2>
            <p className="text-sm opacity-80 mt-4">Nhấn bất kỳ đâu để đóng thông báo</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
          <ShieldAlert className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-xl font-black text-slate-800">Công cụ Chống Ồn & Cảnh Báo Lớp Học</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Bấm cảnh báo tức thì, đếm ngược giữ im lặng hoặc đo âm lượng microphone tự động.
          </p>
        </div>
      </div>

      {/* Alerts & Quiet timer grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Instant Alert Cards */}
        <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
          <h3 className="font-black text-base text-slate-800 mb-1">🔔 Cảnh Báo Tức Thì</h3>
          <p className="text-xs text-slate-500 mb-4">
            Hiển thị cảnh báo toàn màn hình kèm âm thanh để thu hút sự chú ý của học sinh.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => triggerAlert('🤫', 'SHH! Im lặng nào!', '#d97706', 'shh')}
              className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 hover:border-amber-500 text-amber-950 font-black text-sm flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-xs"
            >
              <span className="text-4xl">🤫</span>
              <span>SHH! Im lặng nào!</span>
            </button>

            <button
              onClick={() => triggerAlert('⚠️', 'LỚP QUÁ ỒN!', '#ea580c', 'loud')}
              className="p-5 rounded-2xl bg-orange-50 border-2 border-orange-300 hover:border-orange-500 text-orange-950 font-black text-sm flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-xs"
            >
              <span className="text-4xl">⚠️</span>
              <span>LỚP QUÁ ỒN!</span>
            </button>

            <button
              onClick={() => triggerAlert('🚨', 'DỪNG LẠI NGAY!', '#dc2626', 'stop')}
              className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 hover:border-rose-500 text-rose-950 font-black text-sm flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-xs"
            >
              <span className="text-4xl">🚨</span>
              <span>DỪNG LẠI NGAY!</span>
            </button>

            <button
              onClick={() => triggerAlert('🌟', 'TUYỆT VỜI!', '#059669', 'great')}
              className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 hover:border-emerald-500 text-emerald-950 font-black text-sm flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-xs"
            >
              <span className="text-4xl">🌟</span>
              <span>TUYỆT VỜI!</span>
            </button>
          </div>
        </div>

        {/* Quiet Countdown Timer */}
        <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md flex flex-col justify-between items-center text-center">
          <div className="w-full">
            <h3 className="font-black text-base text-slate-800 mb-1">🎵 Đếm Ngược Im Lặng</h3>
            <p className="text-xs text-slate-500 mb-4">
              Thử thách cả lớp giữ trật tự trong thời gian ngắn. Tự động khen ngợi khi hoàn thành!
            </p>
          </div>

          <div className="w-36 h-36 rounded-full border-8 border-teal-100 bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center text-3xl font-black text-teal-800 shadow-inner">
            {quietActive ? `${quietLeft}s` : '⏱️'}
          </div>

          <div className="mt-4 w-full">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[10, 15, 20, 30, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => startQuietTimer(sec)}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
                    quietActive && quietLeft === sec
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'border border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-teal-900'
                  }`}
                >
                  {sec} giây
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Khi hết giờ, ứng dụng sẽ tự động kích hoạt lời khen &quot;TUYỆT VỜI!&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Microphone Auto Noise Detection */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-teal-100 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
              <span>🎙️ Phát Hiện Tiếng Ồn Tự Động (Microphone)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sử dụng microphone để đo mức độ âm thanh phòng học theo thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAlert}
                onChange={(e) => setAutoAlert(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600"
              />
              <span>Cảnh báo tiếng bíp khi quá ồn</span>
            </label>

            <button
              onClick={toggleMic}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-extrabold text-xs transition-all shadow-sm ${
                micActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
              }`}
            >
              {micActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{micActive ? 'Tắt micro' : 'Bật micro đo ồn'}</span>
            </button>
          </div>
        </div>

        {/* Meter progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-600">Mức độ tiếng ồn hiện tại:</span>
            <span className="font-black text-teal-800 text-sm">{isNaN(noiseLevel) ? 0 : noiseLevel}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                (isNaN(noiseLevel) ? 0 : noiseLevel) < 40
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : (isNaN(noiseLevel) ? 0 : noiseLevel) < 70
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-orange-500 to-rose-600 animate-pulse'
              }`}
              style={{ width: `${isNaN(noiseLevel) ? 0 : Math.max(0, Math.min(100, noiseLevel))}%` }}
            />
          </div>
        </div>

        {/* Status text box */}
        <div
          className={`p-3.5 rounded-2xl text-xs font-extrabold text-center border ${
            noiseLevel < 40
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : noiseLevel < 70
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {noiseLevel < 40
            ? 'Lớp đang yên tĩnh — Rất tốt! Tiếp tục phát huy nhé.'
            : noiseLevel < 70
            ? 'Lớp hơi ồn ào — Thầy/Cô hãy nhắc nhẹ các em tập trung.'
            : 'Mức ồn rất cao! — Cần ổn định lại trật tự lớp học ngay.'}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 text-center text-[11px] font-bold">
          <div className="p-2 rounded-l-xl bg-emerald-50 text-emerald-800 border-y border-l border-emerald-200">
            Yên tĩnh (0–40%)
          </div>
          <div className="p-2 bg-amber-50 text-amber-800 border-y border-amber-200">
            Hơi ồn (40–70%)
          </div>
          <div className="p-2 rounded-r-xl bg-rose-50 text-rose-800 border-y border-r border-rose-200">
            Rất ồn (70–100%)
          </div>
        </div>
      </div>
    </div>
  );
};
