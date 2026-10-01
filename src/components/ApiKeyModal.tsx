import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  Trash2,
  Save,
  ShieldCheck,
  ExternalLink,
  ArrowRightLeft,
  AlertCircle
} from 'lucide-react';
import { UserAccount } from '../types';
import { getStoredApiKey, saveStoredApiKey, clearStoredApiKey } from '../utils/apiKeyStorage';
import { testGeminiApiKey } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  onApiKeyUpdated?: (newKey: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onApiKeyUpdated
}) => {
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getStoredApiKey(currentUser);
      setApiKeyInput(current);
      setTestResult(null);
      setSaveStatus(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setTestResult({
        loading: false,
        success: false,
        message: 'Vui lòng dán API Key trước khi kiểm tra!'
      });
      return;
    }

    setTestResult({ loading: true });
    try {
      const res = await testGeminiApiKey(trimmed);
      if (res.success) {
        setTestResult({
          loading: false,
          success: true,
          message: '✓ API Key hoạt động hoàn hảo trên mô hình Gemini 3.8 Flash!'
        });
      } else {
        setTestResult({
          loading: false,
          success: false,
          message: res.error || 'API Key không hợp lệ hoặc bị từ chối bởi Google Gemini.'
        });
      }
    } catch (err: any) {
      setTestResult({
        loading: false,
        success: false,
        message: err?.message || 'Lỗi kiểm tra API Key.'
      });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = apiKeyInput.trim();
    await saveStoredApiKey(trimmed, currentUser);
    if (onApiKeyUpdated) {
      onApiKeyUpdated(trimmed);
    }
    setSaveStatus('✓ Đã lưu và đồng bộ API Key lên Cloud Firestore thành công!');
    setTimeout(() => {
      setSaveStatus(null);
      onClose();
    }, 1200);
  };

  const handleClear = async () => {
    await clearStoredApiKey(currentUser);
    setApiKeyInput('');
    if (onApiKeyUpdated) {
      onApiKeyUpdated('');
    }
    setTestResult(null);
    setSaveStatus('✓ Đã xóa API Key khỏi hệ thống!');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-teal-200/90 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Cài Đặt Gemini API Key
              </h2>
              <p className="text-[11px] sm:text-xs text-teal-100 font-semibold">
                Đồng bộ tự động giữa Vercel, Google AI Studio & Cloud Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Status info banner */}
          <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-teal-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-700">
              <p className="font-extrabold text-teal-950">
                Mô hình AI: <span className="text-teal-700 font-mono">gemini-3.8-flash</span>
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Thầy/Cô chỉ cần cấu hình API Key một lần duy nhất. Hệ thống sẽ tự động lưu vào tài khoản giáo viên trên Cloud Firestore, giúp sử dụng mượt mà đồng thời trên cả <strong>Vercel</strong> và <strong>Google AI Studio</strong>.
              </p>
            </div>
          </div>

          {/* Input field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Dán mã API Key của bạn (vd: AIzaSy...)"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border-2 border-slate-200 focus:border-teal-500 font-mono text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none font-bold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                title={showPassword ? 'Ẩn' : 'Hiện'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Chưa có API Key?</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 underline"
              >
                <span>Lấy miễn phí tại Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                testResult.loading
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {testResult.loading ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>Đang kết nối thử nghiệm đến Google Gemini 3.8 Flash...</span>
                </>
              ) : testResult.success ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{testResult.message}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{testResult.message}</span>
                </>
              )}
            </div>
          )}

          {saveStatus && (
            <div className="p-3 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 font-black text-xs text-center animate-in fade-in">
              {saveStatus}
            </div>
          )}

          {/* Cross sync note */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-teal-600" />
              <span>Kết nối liên thông Vercel & Google Studio</span>
            </div>
            <p className="leading-relaxed">
              Khi lưu tại đây, API Key sẽ tự động cập nhật vào trường <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">user.apiKey</code> trên Cloud Firestore. Nhờ đó, bất cứ khi nào Thầy/Cô đăng nhập trên Vercel hay Google Studio, hệ thống đều nhận diện ngay lập tức!
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={testResult?.loading || !apiKeyInput.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${testResult?.loading ? 'animate-spin' : ''}`} />
              <span>{testResult?.loading ? 'Đang thử...' : 'Kiểm tra kết nối'}</span>
            </button>

            {apiKeyInput && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Key</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu & Đồng Bộ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
