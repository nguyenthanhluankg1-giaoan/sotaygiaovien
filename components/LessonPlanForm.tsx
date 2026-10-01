import React, { useState, useCallback } from 'react';
import type { LessonPlanInput, FileWithPreview } from '../types';
import { UploadIcon, FileIcon, XIcon, RefreshCwIcon } from './icons';

interface LessonPlanFormProps {
  onSubmit: (data: LessonPlanInput, files: FileWithPreview[]) => void;
  isLoading: boolean;
  onReset: () => void;
}

const initialFormData: LessonPlanInput = {
  teacherName: '',
  subject: '',
  grade: '',
  periods: 1,
};

export const LessonPlanForm: React.FC<LessonPlanFormProps> = ({ onSubmit, isLoading, onReset }) => {
  const [formData, setFormData] = useState<LessonPlanInput>(initialFormData);
  const [files, setFiles] = useState<FileWithPreview[]>([]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseInt(value, 10) || 1 : value 
    }));
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
        .filter((file: File) => ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type))
        .map((file: File) => Object.assign(file, {
          preview: URL.createObjectURL(file)
        }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);
  
  const removeFile = useCallback((fileName: string) => {
    setFiles(prev => prev.filter(file => file.name !== fileName));
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData, files);
  };

  const handleFormReset = useCallback(() => {
    setFormData(initialFormData);
    setFiles([]);
    onReset();
  }, [onReset]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">Thông tin bài giảng</h2>
        
        <div>
          <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700">🧑‍🏫 Họ tên giáo viên</label>
          <input type="text" name="teacherName" id="teacherName" value={formData.teacherName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">📚 Môn học</label>
            <input type="text" name="subject" id="subject" value={formData.subject} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
          </div>
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700">👩‍🎓 Lớp học</label>
            <input type="text" name="grade" id="grade" value={formData.grade} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
          </div>
        </div>
        
        <div>
          <label htmlFor="periods" className="block text-sm font-medium text-gray-700">🗓️ Số tiết dạy</label>
          <input 
              type="number" 
              name="periods" 
              id="periods" 
              value={formData.periods} 
              onChange={handleChange} 
              required 
              min="1" 
              max="10" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Tệp hỗ trợ</label>
           <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <UploadIcon />
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Tải lên</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
                </label>
                <p className="pl-1">hoặc kéo thả file</p>
              </div>
              <p className="text-xs text-gray-500">JPG, PNG, PDF</p>
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map(file => (
                <div key={file.name} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                   <div className="flex items-center space-x-2">
                    <FileIcon />
                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  </div>
                   <button type="button" onClick={() => removeFile(file.name)} className="text-gray-400 hover:text-gray-600">
                     <XIcon />
                   </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button type="submit" disabled={isLoading} className="flex-grow w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'TẠO GIÁO ÁN'}
          </button>
           <button
              type="button"
              onClick={handleFormReset}
              disabled={isLoading}
              className="flex-shrink-0 p-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
              aria-label="Làm mới biểu mẫu"
            >
              <RefreshCwIcon />
            </button>
        </div>
      </form>
    </div>
  );
};