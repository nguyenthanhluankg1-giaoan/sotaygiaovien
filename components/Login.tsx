
import React, { useState, useCallback } from 'react';
import { validateApiKey } from '../services/geminiService';
import { KeyIcon } from './icons';

interface LoginProps {
  onLoginSuccess: (apiKey: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
        setError('Vui lòng nhập API Key.');
        return;
    }
    setIsLoading(true);
    setError(null);

    const isValid = await validateApiKey(apiKey);
    if (isValid) {
      onLoginSuccess(apiKey);
    } else {
      setError('API Key không hợp lệ hoặc đã xảy ra lỗi. Vui lòng kiểm tra lại.');
      setIsLoading(false);
    }
  }, [apiKey, onLoginSuccess]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Soạn Giáo Án AI
            </h1>
            <p className="text-sm text-gray-500 mt-1">Vui lòng đăng nhập bằng Google AI Studio API Key</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 sr-only">
                API Key
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <KeyIcon />
                </div>
                <input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="block w-full rounded-md border-gray-300 py-3 pl-10 pr-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Nhập API Key của bạn"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </div>
          </form>
           <div className="mt-6 text-center text-xs text-gray-500">
                <p>Bạn có thể lấy API Key tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:text-indigo-500">Google AI Studio</a>.</p>
            </div>
        </div>
      </div>
      <footer className="text-center py-4 mt-8 text-sm text-gray-500">
        <p>Phát triển bởi chuyên gia Frontend React & Gemini API</p>
      </footer>
    </div>
  );
};
