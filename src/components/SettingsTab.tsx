import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Building, User, Calendar, FileText, Key, Eye, EyeOff, Check, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { SchoolConfig, UserAccount } from '../types';
import { defaultSchoolConfig } from '../data/defaultData';
import { getStoredApiKey, saveStoredApiKey, clearStoredApiKey } from '../utils/apiKeyStorage';
import { testGeminiApiKey } from '../services/geminiService';

interface SettingsTabProps {
  config: SchoolConfig;
  onUpdateConfig: (config: SchoolConfig) => void;
  onResetConfig: () => void;
  currentUser?: UserAccount | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  config,
  onUpdateConfig,
  onResetConfig,
  currentUser
}) => {
  const [formData, setFormData] = useState<SchoolConfig>(config);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Gemini API Key State (Unified across entire application for the teacher)
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getStoredApiKey(currentUser));
  const [showKeyPassword, setShowPassword] = useState<boolean>(false);
  const [apiKeySavedStatus, setApiKeySavedStatus] = useState<{ success: boolean; text: string } | null>(null);
  const [isTestingApiKey, setIsTestingApiKey] = useState<boolean>(false);

  useEffect(() => {
    setApiKeyInput(getStoredApiKey(currentUser));
  }, [currentUser]);

  const handleTestApiKeySetting = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setApiKeySavedStatus({ success: false, text: 'Vui lòng dán API Key trước khi kiểm tra!' });
      return;
    }
    setIsTestingApiKey(true);
    setApiKeySavedStatus(null);
    try {
      const res = await testGeminiApiKey(trimmed);
      if (res.success) {
        setApiKeySavedStatus({ success: true, text: '✓ API Key hợp lệ và kết nối Gemini 3.8 Flash thành công!' });
      } else {
        setApiKeySavedStatus({ success: false, text: res.error || 'API Key không hợp lệ.' });
      }
    } catch (err: any) {
      setApiKeySavedStatus({ success: false, text: err?.message || 'Lỗi kiểm tra API Key.' });
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const handleSaveApiKeySetting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = apiKeyInput.trim();
    await saveStoredApiKey(trimmed, currentUser);
    setApiKeySavedStatus({ success: true, text: '✓ Đã lưu & đồng bộ API Key lên Firestore thành công!' });
    setTimeout(() => setApiKeySavedStatus(null), 4000);
  };

  const handleClearApiKeySetting = async () => {
    await clearStoredApiKey(currentUser);
    setApiKeyInput('');
    setApiKeySavedStatus({ success: true, text: '✓ Đã xóa API Key khỏi hệ thống!' });
    setTimeout(() => setApiKeySavedStatus(null), 3500);
  };

  const handleChange = (field: keyof SchoolConfig, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReset = () => {
    if (window.confirm('Khôi phục cấu hình trường và văn bản về mặc định?')) {
      setFormData(defaultSchoolConfig);
      onResetConfig();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 border-2 border-teal-200/80 shadow-lg shadow-teal-900/5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Cấu Hình Văn Bản & Thông Tin Kế Hoạch
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Thiết lập thông tin trường học, chức danh, người ký và ngày bắt đầu tuần 1
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 0: Chọn Vai trò giảng dạy (GVCN hay GVBM) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200/90 space-y-2">
            <h3 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>Vai Trò Giảng Dạy (GVCN / Giáo Viên Bộ Môn)</span>
            </h3>
            <p className="text-[11px] text-teal-800 font-medium">
              Vui lòng chọn đúng vai trò để hệ thống tự động hiển thị tiêu đề <span className="font-extrabold text-teal-900">Lịch báo giảng</span> (dành cho GVCN) hoặc <span className="font-extrabold text-teal-900">Kế hoạch dạy học</span> (dành cho GVBM) và Phân phối chương trình tương ứng:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    teacherRoleType: 'gvcn',
                    documentTitle: 'LỊCH BÁO GIẢNG',
                    subjectTitle: ''
                  }));
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                  formData.teacherRoleType === 'gvcn'
                    ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/25 font-black'
                    : 'bg-white hover:bg-teal-50/70 text-slate-800 border-slate-200 font-bold'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                  formData.teacherRoleType === 'gvcn' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
                }`}>
                  🏫
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black">Giáo viên chủ nhiệm (GVCN)</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${
                    formData.teacherRoleType === 'gvcn' ? 'text-teal-100' : 'text-slate-500'
                  }`}>
                    Hiển thị Lịch báo giảng & PPCT dành cho GVCN
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    teacherRoleType: 'gvbm',
                    documentTitle: 'KẾ HOẠCH DẠY HỌC'
                  }));
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                  formData.teacherRoleType === 'gvbm' || !formData.teacherRoleType
                    ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/25 font-black'
                    : 'bg-white hover:bg-teal-50/70 text-slate-800 border-slate-200 font-bold'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                  formData.teacherRoleType === 'gvbm' || !formData.teacherRoleType ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
                }`}>
                  📚
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black">Giáo viên bộ môn (GVBM)</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${
                    formData.teacherRoleType === 'gvbm' || !formData.teacherRoleType ? 'text-teal-100' : 'text-slate-500'
                  }`}>
                    Hiển thị Kế hoạch dạy học & PPCT bộ môn
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section API Key: Cấu hình Gemini API Key Dùng Chung Toàn Ứng Dụng */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 border-2 border-amber-300 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Cấu Hình API Key Gemini (Dùng Chung Toàn Bộ Ứng Dụng)</span>
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                1 Lần Dán - Tự Động Áp Dụng Toàn Ứng Dụng
              </span>
            </div>

            <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
              Thầy/Cô chỉ cần dán API Key Gemini tại đây <strong>duy nhất 1 lần</strong> cho tài khoản của mình. Hệ thống sẽ tự động đồng bộ và áp dụng API Key này cho <strong>toàn bộ các mục trong ứng dụng</strong> (Soạn giáo án AI, Phân tích ảnh/PDF SGK, Tự động nhận diện tên bài dạy, PPCT, Lịch báo giảng...).
            </p>

            <div className="space-y-2 pt-1">
              <div className="relative">
                <input
                  type={showKeyPassword ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Dán Gemini API Key tại đây (vd: AIzaSy...)"
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-amber-300 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showKeyPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showKeyPassword ? 'Ẩn API Key' : 'Hiện API Key'}
                >
                  {showKeyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleTestApiKeySetting}
                    disabled={isTestingApiKey || !apiKeyInput.trim()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isTestingApiKey ? 'animate-spin' : ''}`} />
                    <span>{isTestingApiKey ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveApiKeySetting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu & Đồng bộ Cloud</span>
                  </button>

                  {apiKeyInput && (
                    <button
                      type="button"
                      onClick={handleClearApiKeySetting}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Key</span>
                    </button>
                  )}
                </div>

                {apiKeySavedStatus && (
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-lg animate-in fade-in ${
                      apiKeySavedStatus.success
                        ? 'text-emerald-800 bg-emerald-100/80 border border-emerald-300'
                        : 'text-rose-800 bg-rose-100/80 border border-rose-300'
                    }`}
                  >
                    {apiKeySavedStatus.text}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Section 1: Trường học & Cơ quan */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-600" />
              <span>Đơn vị & Trường học (Đầu trang bên trái)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tên trường học (Dòng 1)
                </label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tổ chuyên môn / Đơn vị trực thuộc (Dòng 2)
                </label>
                <input
                  type="text"
                  value={formData.departmentName}
                  onChange={(e) => handleChange('departmentName', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tiêu đề & Thời gian */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Tiêu đề văn bản & Năm học</span>
            </h3>
            <div className={`grid grid-cols-1 ${formData.teacherRoleType === 'gvcn' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tiêu đề văn bản
                </label>
                <input
                  type="text"
                  value={formData.documentTitle}
                  onChange={(e) => handleChange('documentTitle', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              {formData.teacherRoleType !== 'gvcn' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tên môn học giảng dạy
                  </label>
                  <input
                    type="text"
                    value={formData.subjectTitle}
                    onChange={(e) => handleChange('subjectTitle', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Năm học
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => handleChange('academicYear', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Ngày bắt đầu tuần 1 (Thứ Hai)
                </label>
                <input
                  type="date"
                  value={formData.startDateWeek1}
                  onChange={(e) => handleChange('startDateWeek1', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Địa danh ký (Ví dụ: Thạnh Yên, Rạch Giá...)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>

            {/* Mốc nghỉ Tết / Tùy chỉnh ngày bắt đầu tuần */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-teal-900">
                    🗓️ Tùy chỉnh mốc tuần sau nghỉ Tết / Nghỉ lễ
                  </h4>
                  <p className="text-[11px] text-teal-700 font-medium">
                    Hệ thống sẽ tự động tính ngày các tuần tiếp theo nối tiếp theo mốc mớI.
                  </p>
                </div>
              </div>

              {formData.weekStartOverrides && Object.keys(formData.weekStartOverrides).length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(formData.weekStartOverrides).map(([wNum, wDate]) => (
                    <div
                      key={wNum}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      <span>Tuần {wNum}: {wDate}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...(formData.weekStartOverrides || {}) };
                          delete updated[Number(wNum)];
                          setFormData({ ...formData, weekStartOverrides: updated });
                        }}
                        className="text-rose-500 hover:text-rose-700 font-black ml-1 text-xs cursor-pointer"
                        title="Xóa mốc tùy chỉnh này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  Chưa có mốc tùy chỉnh. Các tuần đang tự động nối tiếp liền kề từ Tuần 1.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Chức danh & Người ký */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>Chức danh & Họ tên người ký</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Ban Giám Hiệu */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-black text-slate-500 block uppercase">
                  Ban Giám Hiệu
                </span>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Chức danh</label>
                  <input
                    type="text"
                    value={formData.principalTitle}
                    onChange={(e) => handleChange('principalTitle', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={formData.principalName}
                    onChange={(e) => handleChange('principalName', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Tổ Trưởng */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-black text-slate-500 block uppercase">
                  Tổ Trưởng Chuyên Môn
                </span>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Chức danh</label>
                  <input
                    type="text"
                    value={formData.headTeacherTitle}
                    onChange={(e) => handleChange('headTeacherTitle', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={formData.headTeacherName}
                    onChange={(e) => handleChange('headTeacherName', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Giáo Viên Giảng Dạy */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-black text-slate-500 block uppercase">
                  Giáo Viên Lập Kế Hoạch
                </span>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Chức danh</label>
                  <input
                    type="text"
                    value={formData.teacherTitle}
                    onChange={(e) => handleChange('teacherTitle', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={formData.teacherName}
                    onChange={(e) => handleChange('teacherName', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            {isSaved && (
              <span className="text-xs font-black text-emerald-600 animate-in fade-in">
                ✓ Đã lưu cấu hình thành công!
              </span>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu cấu hình</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
