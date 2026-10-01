
import React, { useState, useCallback, useEffect } from 'react';
import { LessonPlanForm } from './components/LessonPlanForm';
import { LessonPlanDisplay } from './components/LessonPlanDisplay';
import { Login } from './components/Login';
import { LogOutIcon } from './components/icons';
import { LessonPlan, LessonPlanInput, FileWithPreview } from './types';
import { generateLessonPlan } from './services/geminiService';
import { exportToDocx } from './utils/docxGenerator';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleLoginSuccess = useCallback((newApiKey: string) => {
    localStorage.setItem('gemini-api-key', newApiKey);
    setApiKey(newApiKey);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('gemini-api-key');
    setApiKey(null);
    setLessonPlan(null);
    setError(null);
  }, []);

  const handleGeneratePlan = useCallback(async (data: LessonPlanInput, files: FileWithPreview[]) => {
    if (!apiKey) {
        setError('API Key không hợp lệ. Vui lòng đăng nhập lại.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setLessonPlan(null);
    try {
      const result = await generateLessonPlan(data, files, apiKey);
      setLessonPlan(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  const handleDownload = useCallback(() => {
    if (lessonPlan && lessonPlan.length > 0) {
      exportToDocx(lessonPlan);
    }
  }, [lessonPlan]);

  const handleReset = useCallback(() => {
    setLessonPlan(null);
    setError(null);
  }, []);

  if (!apiKey) {
      return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              NGUYỄN THÀNH LUÂN-TRƯỜNG TIỂU HỌC THẠNH YÊN 1
            </h1>
            <p className="text-sm text-gray-500">Tạo giáo án theo chuẩn Công văn 2345 nhanh chóng và hiệu quả.</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            aria-label="Đổi API Key"
          >
            <LogOutIcon />
            <span className="ml-2 hidden sm:inline">Đổi API Key</span>
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:sticky lg:top-24 self-start">
            <LessonPlanForm onSubmit={handleGeneratePlan} isLoading={isLoading} onReset={handleReset} />
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md min-h-[600px]">
            <LessonPlanDisplay
              lessonPlan={lessonPlan}
              isLoading={isLoading}
              error={error}
              onDownload={handleDownload}
            />
          </div>
        </div>
      </main>
       <footer className="text-center py-4 text-sm text-gray-500">
        <p>Phát triển bởi chuyên gia Frontend React & Gemini API</p>
      </footer>
    </div>
  );
}
