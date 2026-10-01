import React from 'react';
import { Sparkles, Swords, Gamepad2, Play, Trophy, Users, Zap, HelpCircle, FileCheck } from 'lucide-react';
import { AppState } from '../../types';

interface GamesTabProps {
  state: AppState;
  onNavigate: (page: string) => void;
  onUpdateState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const GamesTab: React.FC<GamesTabProps> = ({ state, onNavigate }) => {
  const gamesList = [
    {
      id: 'wheel',
      title: 'Vòng Quay May Mắn',
      category: 'Trò chơi ngẫu nhiên',
      badge: 'HOT',
      badgeColor: 'bg-rose-500 text-white',
      gradient: 'from-amber-500 via-orange-500 to-rose-500',
      bgGlow: 'from-amber-100/50 to-orange-100/30',
      borderColor: 'border-amber-200 hover:border-amber-400',
      icon: Sparkles,
      iconBg: 'bg-amber-100 text-amber-600',
      description: 'Vòng quay gọi tên học sinh ngẫu nhiên, quay số trúng thưởng, chia đội vui nhộn và nhận quà thi đua.',
      features: ['Quay tên ngẫu nhiên', 'Quay số may mắn', 'Âm thanh sống động', 'Hiệu ứng pháo hoa']
    },
    {
      id: 'film',
      title: 'Đấu Trường Kéo Co',
      category: 'Trò chơi đối kháng',
      badge: 'HOT',
      badgeColor: 'bg-emerald-500 text-white',
      gradient: 'from-teal-600 via-emerald-600 to-cyan-600',
      bgGlow: 'from-teal-100/50 to-emerald-100/30',
      borderColor: 'border-teal-200 hover:border-teal-400',
      icon: Swords,
      iconBg: 'bg-teal-100 text-teal-600',
      description: 'Minigame thi đấu kéo co kiến thức giữa 2 đội hoặc các nhóm học sinh trả lời câu hỏi trắc nghiệm.',
      features: ['Thi đấu 2 đội', 'Ngân hàng câu hỏi', 'Tăng tốc hấp dẫn', 'Bảng vinh danh']
    },
    {
      id: 'worksheets',
      title: 'Ngân Hàng Câu Hỏi & Đáp Án',
      category: 'Quản lý & Soạn câu hỏi',
      badge: 'TẠO CH',
      badgeColor: 'bg-blue-600 text-white',
      gradient: 'from-blue-600 via-indigo-600 to-violet-600',
      bgGlow: 'from-blue-100/50 to-indigo-100/30',
      borderColor: 'border-blue-200 hover:border-blue-400',
      icon: FileCheck,
      iconBg: 'bg-blue-100 text-blue-600',
      description: 'Tạo mới, nhập/xuất từ file Excel/CSV/JSON, chia thư mục câu hỏi theo môn học & khối lớp để dùng ngay cho Vòng quay & Kéo co.',
      features: ['Tải file Excel mẫu', 'Tải file Excel/JSON lên', 'Phân loại môn & khối', 'Lời giải chi tiết']
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800 p-6 sm:p-8 text-white shadow-xl shadow-teal-900/15 border border-teal-600">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-200 text-xs font-black tracking-wider uppercase">
            <Gamepad2 className="w-4 h-4 text-amber-300" />
            <span>THƯ MỤC TRÒ CHƠI LỚP HỌC</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Bộ Trò Chơi Học Tập Sinh Động
          </h1>
          <p className="text-teal-100 text-xs sm:text-sm font-medium leading-relaxed">
            Các công cụ và trò chơi tương tác trực quan giúp giáo viên khuấy động không khí lớp học, kích thích tư duy và tăng tính chủ động của học sinh trong giờ học.
          </p>
        </div>

        <div className="absolute -right-8 -bottom-10 opacity-15 pointer-events-none">
          <Gamepad2 className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Grid of Games */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {gamesList.map((game) => {
          const Icon = game.icon;
          return (
            <div
              key={game.id}
              className={`group relative flex flex-col justify-between bg-white rounded-3xl border ${game.borderColor} p-6 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-0.5`}
            >
              {/* Background Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${game.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
              />

              <div className="relative z-10 space-y-4">
                {/* Header Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${game.iconBg} shadow-sm border border-white/60`}>
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        {game.category}
                      </span>
                      <h2 className="text-lg font-black text-slate-900 group-hover:text-teal-800 transition-colors">
                        {game.title}
                      </h2>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-sm ${game.badgeColor}`}>
                    {game.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {game.description}
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {game.features.map((feat, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl bg-slate-100/90 text-slate-700 text-[11px] font-bold border border-slate-200/60"
                    >
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Footer */}
              <div className="relative z-10 pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Sẵn sàng sử dụng
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(game.id)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r ${game.gradient} text-white font-black text-xs shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Mở Trò Chơi</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
