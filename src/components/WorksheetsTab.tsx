import React from 'react';
import { FileCheck, Plus, FolderOpen } from 'lucide-react';

export const WorksheetsTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border-2 border-teal-200/80 shadow-lg shadow-teal-900/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-xs shrink-0">
            <FileCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
                PHIẾU HỌC TẬP
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-200 uppercase tracking-wider">
                Mục Mới
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
              Quản lý, thiết lập và in ấn Phiếu học tập dành cho học sinh
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black bg-teal-700 hover:bg-teal-800 text-white shadow-md transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo phiếu học tập mới</span>
        </button>
      </div>

      {/* Main Empty Content Container */}
      <div className="bg-white rounded-3xl p-8 sm:p-16 border-2 border-dashed border-slate-200 text-center space-y-4 min-h-[420px] flex flex-col items-center justify-center shadow-xs">
        <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto shadow-sm">
          <FolderOpen className="w-8 h-8 stroke-[1.8]" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-base sm:text-lg font-black text-slate-800">
            Nội dung Phiếu học tập đang bỏ trống
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Thầy/Cô có thể khởi tạo các bài tập thực hành, phiếu củng cố kiến thức dành cho học sinh tại mục này.
          </p>
        </div>
      </div>
    </div>
  );
};
