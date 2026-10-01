import React from 'react';
import type { LessonPlan } from '../types';
import { DownloadIcon, BrainCircuitIcon } from './icons';

interface LessonPlanDisplayProps {
  lessonPlan: LessonPlan[] | null;
  isLoading: boolean;
  error: string | null;
  onDownload: () => void;
}

const ActivityTable: React.FC<{ activities: LessonPlan['teachingActivities'] }> = ({ activities }) => {
  return (
    <table className="min-w-full border-collapse border border-gray-400">
      <thead className="bg-gray-100">
        <tr>
          <th className="font-bold border border-gray-300 p-4 text-left">Hoạt động giáo viên</th>
          <th className="font-bold border border-gray-300 p-4 text-left">Hoạt động học sinh</th>
        </tr>
      </thead>
      <tbody>
        {activities.map((activity, index) => (
          <React.Fragment key={index}>
            <tr className="bg-gray-50">
               <td colSpan={2} className="border border-gray-300 p-4">
                <p className="font-bold">{activity.activityName}</p>
                <p className="italic mt-1"><b>a) Mục tiêu:</b> {activity.objective}</p>
              </td>
            </tr>
            <tr>
                <td className="border border-gray-300 p-4 align-top whitespace-pre-wrap">
                    <p className="font-bold">b) Cách tổ chức dạy học:</p>
                    {activity.teacherActivity}
                </td>
                <td className="border border-gray-300 p-4 align-top whitespace-pre-wrap">
                    {activity.studentActivity}
                </td>
            </tr>
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};


export const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({ lessonPlan, isLoading, error, onDownload }) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-semibold">AI đang soạn giáo án...</p>
          <p className="text-gray-500">Quá trình này có thể mất một vài phút.</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-red-600">
           <p className="text-lg font-semibold">Đã xảy ra lỗi</p>
           <p className="text-sm">{error}</p>
        </div>
      );
    }
    if (!lessonPlan) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
          <BrainCircuitIcon />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nội dung giáo án sẽ hiện ở đây</h3>
          <p className="mt-1 text-sm text-gray-500">Điền thông tin và nhấn "Tạo giáo án" để bắt đầu.</p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Bản xem trước Giáo án</h2>
          <button onClick={onDownload} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            <DownloadIcon />
            <span className="ml-2">Tải giáo án (.docx)</span>
          </button>
        </div>
        {lessonPlan.map((plan, index) => (
          <div key={index} className="prose prose-sm max-w-none font-times text-[13pt] leading-relaxed text-justify mb-12 last:mb-0 border-b-2 border-gray-200 pb-8 last:border-b-0 last:pb-0">
            <h1 className="text-center font-bold">KẾ HOẠCH BÀI DẠY (TIẾT {index + 1})</h1>
            <p className="text-center"><b>Môn học:</b> {plan.subject}; <b>Lớp:</b> {plan.grade}</p>
            <p className="text-center"><b>Tên bài học:</b> {plan.lessonTitle}; <b>Số tiết:</b> {plan.periods}</p>
            <p className="text-center"><b>Thời gian thực hiện:</b> {plan.executionTime}</p>
            
            <h2 className="font-bold">I. Yêu cầu cần đạt</h2>
            <p><b>1. Năng lực chung:</b> {plan.requiredOutcomes.generalCompetencies}</p>
            <p><b>2. Năng lực đặc thù:</b> {plan.requiredOutcomes.specificCompetencies}</p>
            <p><b>3. Phẩm chất:</b> {plan.requiredOutcomes.qualities}</p>
            <p><b>4. Nội dung tích hợp:</b> {plan.requiredOutcomes.integratedContent}</p>

            <h2 className="font-bold">II. Đồ dùng dạy học:</h2>
            <p><b>1. Giáo viên:</b> {plan.teachingAids.teacher}</p>
            <p><b>2. Học sinh:</b> {plan.teachingAids.student}</p>

            <h2 className="font-bold">III. Các hoạt động dạy học</h2>
            <ActivityTable activities={plan.teachingActivities} />
            
            <h2 className="font-bold">IV. Điều chỉnh sau bài dạy</h2>
            <div className="space-y-6 mt-4">
              <div className="border-b-2 border-dotted border-gray-600"></div>
              <div className="border-b-2 border-dotted border-gray-600"></div>
              <div className="border-b-2 border-dotted border-gray-600"></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return <div className="h-full">{renderContent()}</div>;
};