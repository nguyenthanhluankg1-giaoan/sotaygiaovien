import React, { useState } from 'react';
import { Settings, User, Save, BookOpen, Edit3, Plus } from 'lucide-react';
import { AppState, TeacherProfile, UserAccount } from '../../types';
import { Avatar } from '../Avatar';
import { readFileAsDataURL } from '../../utils/helpers';

interface SettingsTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  currentUser?: UserAccount | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ state, onUpdateState, currentUser }) => {
  const [teacherName, setTeacherName] = useState(state.teacher.name);
  const [teacherRole, setTeacherRole] = useState(state.teacher.role);
  const [teacherSubject, setTeacherSubject] = useState(state.teacher.subject);
  const [teacherSchool, setTeacherSchool] = useState(state.teacher.school);
  const [teacherYear, setTeacherYear] = useState(state.teacher.year || '2026 - 2027');
  const [teacherAvatar, setTeacherAvatar] = useState(state.teacher.avatar);

  // Subject edit modal
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectsText, setSubjectsText] = useState(state.subjects.join('\n'));

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await readFileAsDataURL(file);
        setTeacherAvatar(dataUrl);
      } catch (err) {
        console.error('Failed to read image:', err);
      }
    }
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: TeacherProfile = {
      name: teacherName.trim(),
      role: teacherRole.trim(),
      subject: teacherSubject.trim(),
      school: teacherSchool.trim(),
      year: teacherYear.trim(),
      avatar: teacherAvatar
    };

    onUpdateState((prev) => ({
      ...prev,
      teacher: updated
    }));

    alert('Đã cập nhật sổ tay giáo viên thành công!');
  };

  const handleSaveSubjects = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = subjectsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parsed.length === 0) return;

    onUpdateState((prev) => ({
      ...prev,
      subjects: parsed
    }));

    setSubjectModalOpen(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex items-center gap-2 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
          <Settings className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-xl font-black text-slate-800">Cài đặt Hệ Thống & Sổ Tay Giáo Viên</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cập nhật thông tin giảng dạy cá nhân và tùy biến danh sách các môn học / hoạt động.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Teacher Profile Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border-2 border-teal-100 shadow-md">
          <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            <span>Sổ Tay Giáo Viên Chủ nhiệm & Giảng dạy</span>
          </h3>

          <form onSubmit={handleSaveTeacher} className="space-y-4">
            {/* Avatar Preview & Upload */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border-2 border-dashed border-teal-200 flex items-center gap-4">
              <Avatar name={teacherName} avatar={teacherAvatar} size="lg" />
              <div className="flex-1">
                <span className="block text-xs font-bold text-teal-900 mb-1">
                  Ảnh đại diện giáo viên
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-teal-600 file:text-white hover:file:bg-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Họ và tên Giáo viên *
              </label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Chức vụ / Vai trò
                </label>
                <input
                  type="text"
                  value={teacherRole}
                  onChange={(e) => setTeacherRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                />
              </div>

              {currentUser?.teacherType !== 'GVCN' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Môn học phụ trách
                  </label>
                  <input
                    type="text"
                    value={teacherSubject}
                    onChange={(e) => setTeacherSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Trường học / Đơn vị
              </label>
              <input
                type="text"
                value={teacherSchool}
                onChange={(e) => setTeacherSchool(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Niên khóa hiện tại
              </label>
              <input
                type="text"
                value={teacherYear}
                onChange={(e) => setTeacherYear(e.target.value)}
                placeholder="Ví dụ: 2026 - 2027"
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md shadow-teal-600/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Hồ Sơ Giáo Viên</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Subjects & Tips */}
        <div className="lg:col-span-5 space-y-4">
          {/* Subjects List */}
          <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">📚 Danh sách môn học</h3>
                <p className="text-[11px] text-slate-500">
                  Xuất hiện khi cộng/trừ hoa khen thưởng và xếp thời khóa biểu.
                </p>
              </div>
              <button
                onClick={() => {
                  setSubjectsText(state.subjects.join('\n'));
                  setSubjectModalOpen(true);
                }}
                className="p-1.5 rounded-xl border border-teal-200 text-teal-800 hover:bg-teal-50"
                title="Tùy chỉnh môn học"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
              {state.subjects.map((sub) => (
                <span
                  key={sub}
                  className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs"
                >
                  {sub}
                </span>
              ))}
            </div>

            <button
              onClick={() => {
                setSubjectsText(state.subjects.join('\n'));
                setSubjectModalOpen(true);
              }}
              className="w-full mt-4 py-2 px-3 rounded-xl border border-teal-200 text-teal-800 hover:bg-teal-50 font-bold text-xs transition-colors text-center"
            >
              Chỉnh sửa danh sách môn học
            </button>
          </div>

          {/* Teacher Tips Card */}
          <div className="bg-gradient-to-br from-teal-50/80 via-emerald-50/50 to-amber-50/40 rounded-3xl p-5 border-2 border-teal-100 shadow-md text-xs space-y-2.5 text-slate-700">
            <h4 className="font-black text-teal-900 text-sm flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-teal-700" />
              <span>Mẹo Dành Cho Giáo Viên</span>
            </h4>
            <ul className="space-y-2 list-disc list-inside text-slate-600 leading-relaxed">
              <li>Cộng hoa khen thưởng 🌺 khi học sinh phát biểu hăng hái để tạo động lực và khí thế học tập.</li>
              <li>Dùng Vòng quay hoặc Cuộn phim để sinh hoạt lớp và gọi tên ngẫu nhiên vui tươi.</li>
              <li>Dùng microphone Chống Ồn khi lớp hoạt động nhóm để nhắc nhở âm lượng vừa phải.</li>
              <li>Dữ liệu lớp học luôn được đồng bộ tự động lên cơ sở dữ liệu Cloud Firestore an toàn.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Edit Subjects Modal */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-teal-200">
            <h3 className="text-xl font-black text-slate-800 mb-1">Tùy chỉnh danh sách môn học</h3>
            <p className="text-xs text-slate-500 mb-4">
              Mỗi dòng một tên môn học hoặc hoạt động rèn luyện.
            </p>

            <form onSubmit={handleSaveSubjects} className="space-y-4">
              <textarea
                rows={9}
                required
                value={subjectsText}
                onChange={(e) => setSubjectsText(e.target.value)}
                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-medium leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubjectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md shadow-teal-600/20"
                >
                  Lưu danh sách môn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
