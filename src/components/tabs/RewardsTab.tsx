import React, { useState, useRef } from 'react';
import { Gift, Plus, Coins, Edit3, Trash2, CheckCircle2, History, Upload, Image as ImageIcon, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppState, Reward, Student } from '../../types';
import { uid } from '../../utils/helpers';
import { playCelebration } from '../../utils/audio';

interface RewardsTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const RewardsTab: React.FC<RewardsTabProps> = ({ state, onUpdateState }) => {
  const activeClass = state.classes.find((c) => c.id === state.activeClassId) || state.classes[0];
  const students = state.students.filter((s) => s.classId === state.activeClassId);

  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('🎁');
  const [formImage, setFormImage] = useState('');
  const [formCost, setFormCost] = useState(10);
  const [formStock, setFormStock] = useState(10);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redeem modal state
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const classRedemptions = state.redemptions
    .filter((r) => r.classId === state.activeClassId)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const openRewardModal = (r?: Reward) => {
    if (r) {
      setEditingReward(r);
      setFormName(r.name);
      setFormEmoji(r.emoji || '🎁');
      setFormImage(r.image || '');
      setFormCost(r.cost);
      setFormStock(r.stock);
    } else {
      setEditingReward(null);
      setFormName('');
      setFormEmoji('🎁');
      setFormImage('');
      setFormCost(10);
      setFormStock(10);
    }
    setRewardModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa là 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;

    if (editingReward) {
      onUpdateState((prev) => ({
        ...prev,
        rewards: prev.rewards.map((r) =>
          r.id === editingReward.id
            ? {
                ...r,
                name,
                emoji: formEmoji || '🎁',
                image: formImage || undefined,
                cost: formCost,
                stock: formStock
              }
            : r
        )
      }));
    } else {
      const newReward: Reward = {
        id: uid('r'),
        name,
        emoji: formEmoji || '🎁',
        image: formImage || undefined,
        cost: formCost,
        stock: formStock
      };
      onUpdateState((prev) => ({
        ...prev,
        rewards: [...prev.rewards, newReward]
      }));
    }

    setRewardModalOpen(false);
  };

  const handleDeleteReward = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phần thưởng này?')) return;
    onUpdateState((prev) => ({
      ...prev,
      rewards: prev.rewards.filter((r) => r.id !== id)
    }));
  };

  const openRedeemModal = (reward: Reward) => {
    setSelectedReward(reward);
    const eligibleStudents = students.filter((s) => (s.coins || 0) >= reward.cost);
    setSelectedStudentId(eligibleStudents.length > 0 ? eligibleStudents[0].id : '');
    setRedeemModalOpen(true);
  };

  const handleConfirmRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward || !selectedStudentId) return;

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student || (student.coins || 0) < selectedReward.cost) {
      alert('Học sinh không đủ số bông hoa 🌺 để đổi phần thưởng này.');
      return;
    }

    onUpdateState((prev) => {
      const updatedStudents = prev.students.map((s) =>
        s.id === selectedStudentId
          ? { ...s, coins: Math.max(0, (s.coins || 0) - selectedReward.cost) }
          : s
      );

      const updatedRewards = prev.rewards.map((r) =>
        r.id === selectedReward.id ? { ...r, stock: Math.max(0, r.stock - 1) } : r
      );

      const newRedemption = {
        id: uid('rd'),
        classId: prev.activeClassId,
        studentId: student.id,
        studentName: student.name,
        rewardName: selectedReward.name,
        cost: selectedReward.cost,
        time: new Date().toISOString()
      };

      const newTx = {
        id: uid('tx'),
        classId: prev.activeClassId,
        studentId: student.id,
        studentName: student.name,
        amount: -selectedReward.cost,
        reason: `Đổi quà: ${selectedReward.name}`,
        subject: 'Ghi chung / Nề nếp',
        time: new Date().toISOString()
      };

      return {
        ...prev,
        students: updatedStudents,
        rewards: updatedRewards,
        redemptions: [newRedemption, ...prev.redemptions],
        transactions: [newTx, ...prev.transactions]
      };
    });

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
    playCelebration();
    setRedeemModalOpen(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
              <Gift className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-800">Cửa hàng đổi quà</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Học sinh dùng số bông hoa thi đua đã tích lũy để đổi các phần quà hấp dẫn.
          </p>
        </div>

        <button
          onClick={() => openRewardModal()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm phần thưởng</span>
        </button>
      </div>

      {/* Reward cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.rewards.map((reward) => {
          const eligibleCount = students.filter((s) => (s.coins || 0) >= reward.cost).length;

          return (
            <div
              key={reward.id}
              className="p-5 rounded-3xl bg-white border-2 border-teal-100 hover:border-teal-300 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="h-28 rounded-2xl bg-gradient-to-br from-teal-50 via-emerald-50 to-amber-50 flex items-center justify-center shadow-inner border border-teal-100 overflow-hidden relative">
                  {reward.image ? (
                    <img
                      src={reward.image}
                      alt={reward.name}
                      className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <span className="text-5xl">{reward.emoji}</span>
                  )}
                </div>

                <div className="mt-4 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 leading-tight">
                      {reward.name}
                    </h3>
                    <div className="text-xs text-slate-500 font-semibold mt-1">
                      Còn lại: <strong className="text-slate-700">{reward.stock} phần</strong>
                    </div>
                  </div>
                  <span className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-900 font-black text-xs">
                    <span>🌺</span>
                    <span>{reward.cost} hoa</span>
                  </span>
                </div>

                <div className="mt-3 text-[11px] text-teal-700 font-bold">
                  {eligibleCount > 0
                    ? `Có ${eligibleCount} học sinh đủ hoa đổi`
                    : 'Chưa có em nào đủ hoa'}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => openRedeemModal(reward)}
                  disabled={reward.stock <= 0}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    reward.stock > 0
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {reward.stock > 0 ? 'Đổi quà cho HS' : 'Đã hết hàng'}
                </button>

                <button
                  onClick={() => openRewardModal(reward)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition-colors"
                  title="Sửa quà"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteReward(reward.id)}
                  className="p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Xóa quà"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Redemption History */}
      <div className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-600" />
            <h3 className="text-base font-black text-slate-800">
              Lịch sử đổi quà lớp {activeClass?.name} ({classRedemptions.length})
            </h3>
          </div>
        </div>

        {classRedemptions.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {classRedemptions.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between text-xs hover:bg-teal-50/40 px-2 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-extrabold text-slate-800">{item.studentName}</span>
                  <span className="text-slate-500">đã đổi phần thưởng</span>
                  <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg">
                    {item.rewardName}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="font-bold text-rose-600">-{item.cost} 🌺</span>
                  <span>
                    {new Date(item.time).toLocaleDateString('vi-VN')} ·{' '}
                    {new Date(item.time).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Chưa có lượt đổi quà nào trong lớp {activeClass?.name}.
          </div>
        )}
      </div>

      {/* Add / Edit Reward Modal */}
      {rewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-teal-200">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              {editingReward ? 'Chỉnh sửa phần thưởng' : 'Thêm phần thưởng mới'}
            </h3>

            <form onSubmit={handleSaveReward} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tên phần thưởng *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Bút bi, Sổ tay..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={formEmoji}
                    onChange={(e) => setFormEmoji(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm text-center font-semibold"
                  />
                </div>
              </div>

              {/* Upload image for reward icon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hình ảnh phần thưởng (Tùy chọn)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 hover:border-teal-400 transition-colors">
                  <div className="w-14 h-14 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden relative shadow-sm">
                    {formImage ? (
                      <img src={formImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{formEmoji || '🎁'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {formImage ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-emerald-700 font-bold truncate">Đã tải ảnh lên</span>
                        <button
                          type="button"
                          onClick={() => setFormImage('')}
                          className="px-2 py-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                          title="Xóa ảnh"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Xóa ảnh</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-medium leading-tight">
                        Tải ảnh từ máy tính để làm biểu tượng phần thưởng.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-900 font-extrabold text-xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formImage ? 'Thay ảnh khác' : 'Chọn tệp hình ảnh'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Giá hoa (số bông)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formCost}
                    onChange={(e) => setFormCost(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số lượng trong kho
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRewardModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md shadow-teal-600/20"
                >
                  {editingReward ? 'Cập nhật' : 'Thêm phần thưởng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redeem Modal */}
      {redeemModalOpen && selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-teal-200">
            <div className="text-center mb-4">
              <div className="h-20 w-20 mx-auto mb-2 flex items-center justify-center overflow-hidden">
                {selectedReward.image ? (
                  <img
                    src={selectedReward.image}
                    alt={selectedReward.name}
                    className="w-full h-full object-contain rounded-2xl border-2 border-teal-100 shadow-sm"
                  />
                ) : (
                  <span className="text-5xl">{selectedReward.emoji}</span>
                )}
              </div>
              <h3 className="text-lg font-black text-slate-800">
                Đổi phần thưởng: {selectedReward.name}
              </h3>
              <p className="text-xs text-rose-700 font-bold mt-1">
                Chi phí: {selectedReward.cost} bông hoa 🌺
              </p>
            </div>

            <form onSubmit={handleConfirmRedeem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Chọn học sinh đổi quà
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-semibold"
                >
                  {students
                    .filter((s) => (s.coins || 0) >= selectedReward.cost)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Hiện có: 🌺 {s.coins || 0} hoa)
                      </option>
                    ))}
                </select>
                {students.filter((s) => (s.coins || 0) >= selectedReward.cost).length === 0 && (
                  <p className="text-xs text-rose-500 mt-2 font-bold">
                    ⚠️ Hiện tại lớp chưa có học sinh nào đủ {selectedReward.cost} bông hoa để đổi phần
                    thưởng này.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRedeemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    students.filter((s) => (s.coins || 0) >= selectedReward.cost).length === 0
                  }
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-sm shadow-md shadow-teal-600/20"
                >
                  Xác nhận đổi quà
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
