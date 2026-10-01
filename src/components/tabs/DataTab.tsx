import React, { useState } from 'react';
import {
  Database,
  AlertTriangle,
  RefreshCw,
  Cloud,
  CheckCircle2,
  Users,
  GraduationCap,
  Award,
  CalendarCheck,
  HardDrive,
  Download,
  Upload,
  Sparkles,
  ArrowRightLeft,
  Check,
  ShieldCheck,
  Info
} from 'lucide-react';
import { AppState, UserAccount } from '../../types';
import {
  saveAppStateToFirestore,
  loadAppStateFromFirestore,
  getUserWorkspaceKey
} from '../../services/dbService';
import { testFirestoreLiveConnection, resolvedFirebaseConfig } from '../../firebase';

interface DataTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onResetState: () => void;
  currentUser?: UserAccount | null;
}

export const DataTab: React.FC<DataTabProps> = ({
  state,
  onUpdateState,
  onResetState,
  currentUser
}) => {
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudMsg, setCloudMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    connected: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);

  const workspaceKey = getUserWorkspaceKey(currentUser);
  const isTeacher = currentUser?.role === 'teacher';

  const totalClasses = state.classes.length;
  const totalStudents = state.students.length;
  const totalAttendanceRecords = Object.keys(state.attendance || {}).length;
  const totalTransactions = (state.transactions || []).length;
  const totalRewards = (state.rewards || []).length;

  const handleTestCloudConnection = async () => {
    setIsTestingConn(true);
    try {
      const res = await testFirestoreLiveConnection();
      setTestResult({
        tested: true,
        connected: res.connected,
        latencyMs: res.latencyMs,
        error: res.error
      });
      if (res.connected) {
        setCloudMsg({
          type: 'success',
          text: `✓ Kết nối Cloud Firestore hoạt động hoàn hảo! Độ trễ: ${res.latencyMs}ms (Database: ${resolvedFirebaseConfig.firestoreDatabaseId})`
        });
      } else {
        setCloudMsg({
          type: 'error',
          text: `⚠️ Không thể kết nối Cloud Firestore: ${res.error || 'Vui lòng kiểm tra mạng'}`
        });
      }
    } catch (e: any) {
      setTestResult({
        tested: true,
        connected: false,
        error: e?.message || 'Lỗi không xác định'
      });
    } finally {
      setIsTestingConn(false);
      setTimeout(() => setCloudMsg(null), 6000);
    }
  };

  const handleSyncToFirestore = async () => {
    setCloudLoading(true);
    setCloudMsg(null);
    try {
      const ok = await saveAppStateToFirestore(workspaceKey, state, {
        userId: currentUser?.id,
        teacherName: currentUser?.name,
        role: currentUser?.role
      });
      if (ok) {
        setCloudMsg({
          type: 'success',
          text: `✓ Đã đồng bộ toàn bộ dữ liệu của [${workspaceKey}] lên Cloud Firestore thành công! Vercel và Google AI Studio đều sẽ thấy bản cập nhật này.`
        });
      } else {
        setCloudMsg({
          type: 'error',
          text: 'Đồng bộ thất bại, vui lòng kiểm tra kết nối mạng.'
        });
      }
    } catch (e) {
      setCloudMsg({
        type: 'error',
        text: 'Có lỗi xảy ra khi đồng bộ lên Cloud.'
      });
    } finally {
      setCloudLoading(false);
      setTimeout(() => setCloudMsg(null), 5000);
    }
  };

  const handleSyncFromFirestore = async () => {
    if (
      !window.confirm(
        'Tải lại dữ liệu mới nhất từ Cloud Firestore? Dữ liệu chưa lưu tại máy này có thể bị ghi đè bởi bản trên Cloud.'
      )
    ) {
      return;
    }
    setCloudLoading(true);
    setCloudMsg(null);
    try {
      const data = await loadAppStateFromFirestore(workspaceKey, currentUser);
      if (data) {
        onUpdateState(() => data);
        setCloudMsg({
          type: 'success',
          text: `✓ Đã tải và đồng bộ thành công bản dữ liệu mới nhất từ Cloud Firestore!`
        });
      } else {
        setCloudMsg({
          type: 'error',
          text: 'Chưa tìm thấy dữ liệu trên Cloud Firestore cho không gian này.'
        });
      }
    } catch (e) {
      setCloudMsg({
        type: 'error',
        text: 'Lỗi khi tải từ Firestore.'
      });
    } finally {
      setCloudLoading(false);
      setTimeout(() => setCloudMsg(null), 5000);
    }
  };

  // Full JSON export for complete interoperability across deployments
  const handleExportJSON = () => {
    try {
      const exportPayload = {
        exportVersion: '2.0',
        exportedAt: new Date().toISOString(),
        workspaceKey,
        databaseId: resolvedFirebaseConfig.firestoreDatabaseId,
        user: currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null,
        data: state
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `LopHocThongMinh_Backup_${currentUser?.username || 'user'}_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setCloudMsg({
        type: 'success',
        text: '✓ Đã xuất tệp sao lưu JSON thành công! Bạn có thể nhập tệp này vào Vercel hoặc Google Studio bất cứ lúc nào.'
      });
      setTimeout(() => setCloudMsg(null), 5000);
    } catch (err: any) {
      alert('Lỗi xuất tệp sao lưu: ' + err.message);
    }
  };

  // Import JSON backup into state and sync to Firestore
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const importedData = parsed.data || parsed;

        if (!importedData.classes || !Array.isArray(importedData.classes)) {
          alert('Tệp sao lưu không đúng định dạng của ứng dụng Lớp Học Thông Minh!');
          return;
        }

        if (
          window.confirm(
            `Xác nhận nhập dữ liệu từ tệp "${file.name}"? Dữ liệu hiện tại sẽ được cập nhật và đồng bộ tự động lên Cloud Firestore.`
          )
        ) {
          onUpdateState(() => importedData);
          await saveAppStateToFirestore(workspaceKey, importedData, {
            userId: currentUser?.id,
            teacherName: currentUser?.name,
            role: currentUser?.role
          });

          setCloudMsg({
            type: 'success',
            text: '✓ Đã nhập tệp sao lưu thành công và tự động đồng bộ lên Cloud Firestore!'
          });
          setTimeout(() => setCloudMsg(null), 5000);
        }
      } catch (err: any) {
        alert('Không thể đọc tệp sao lưu JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Bạn có chắc chắn muốn đặt lại toàn bộ ứng dụng về dữ liệu mẫu ban đầu? Mọi dữ liệu tự tạo sẽ được thiết lập lại.'
      )
    ) {
      onResetState();
      alert('Đã khôi phục dữ liệu mẫu ban đầu.');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex items-center gap-2 p-5 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800">
          <Database className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-xl font-black text-slate-800">Quản lý Dữ liệu & Kết Nối Đồng Bộ</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dữ liệu kết nối đồng bộ 2 chiều giữa Google AI Studio, Vercel và Google Cloud Firestore.
          </p>
        </div>
      </div>

      {cloudMsg && (
        <div
          className={`p-4 rounded-2xl border-2 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm animate-in fade-in ${
            cloudMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          {cloudMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{cloudMsg.text}</span>
        </div>
      )}

      {/* Cloud Database Sync Card with Vercel & AI Studio Architecture */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Cloud className="w-5 h-5 text-teal-300 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
                Đồng Bộ Đám Mây Trực Tuyến
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] font-black border border-emerald-400/40">
                Cloud Firestore Live
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300 text-[10px] font-black border border-cyan-400/40">
                Vercel ⇄ Google AI Studio
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Kết Nối Dữ Liệu {isTeacher ? `Giáo Viên (${currentUser?.name})` : 'Hệ Thống'}
            </h3>
            <p className="text-xs text-teal-100/80 mt-1 max-w-xl leading-relaxed">
              Không gian lưu trữ: <code className="bg-black/40 px-2 py-0.5 rounded font-mono text-amber-300">{workspaceKey}</code> · 
              Database ID: <code className="bg-black/40 px-2 py-0.5 rounded font-mono text-cyan-300">{resolvedFirebaseConfig.firestoreDatabaseId}</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto">
            <button
              onClick={handleTestCloudConnection}
              disabled={isTestingConn}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
              <span>{isTestingConn ? 'Đang kiểm tra...' : 'Kiểm tra kết nối Cloud'}</span>
            </button>

            <button
              onClick={handleSyncToFirestore}
              disabled={cloudLoading}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl bg-white hover:bg-teal-50 text-teal-950 font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Cloud className="w-3.5 h-3.5 text-teal-600" />
              <span>{cloudLoading ? 'Đang lưu...' : 'Lưu lên Cloud (Push)'}</span>
            </button>

            <button
              onClick={handleSyncFromFirestore}
              disabled={cloudLoading}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs border border-white/20 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cloudLoading ? 'animate-spin' : ''}`} />
              <span>Tải từ Cloud (Pull)</span>
            </button>
          </div>
        </div>

        {/* Sync Explanation Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="font-extrabold text-teal-300 flex items-center gap-1.5 mb-1">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Tự động kết nối 2 chiều</span>
            </div>
            <p className="text-teal-100/70 text-[11px] leading-relaxed">
              Mọi thay đổi khi dùng trên Google AI Studio hoặc Vercel đều tự động lưu vào Cloud Firestore chung.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="font-extrabold text-amber-300 flex items-center gap-1.5 mb-1">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              <span>Cùng tài khoản giáo viên</span>
            </div>
            <p className="text-teal-100/70 text-[11px] leading-relaxed">
              Đăng nhập đúng tài khoản Thầy/Cô trên Vercel hoặc Google Studio để tự động tải không gian cá nhân.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="font-extrabold text-cyan-300 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Bảo mật phân lập</span>
            </div>
            <p className="text-teal-100/70 text-[11px] leading-relaxed">
              Mỗi giáo viên có một workspace riêng biệt, được bảo mật và cách ly hoàn toàn trên đám mây.
            </p>
          </div>
        </div>
      </div>

      {/* JSON Backup & Restore Bridge Section */}
      <div className="p-6 rounded-3xl bg-white border-2 border-teal-100 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-teal-600" />
              <span>Xuất / Nhập Tệp Dữ Liệu Dự Phòng (Cầu Nối Vercel & AI Studio)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tải tệp JSON về máy hoặc nhập vào bất kỳ thiết bị/nền tảng nào để truyền dữ liệu tức thì 100%.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-teal-900 font-extrabold text-sm mb-1">
                <Download className="w-4 h-4 text-teal-600" />
                <span>Xuất tệp sao lưu JSON</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tải toàn bộ lớp học, học sinh, điểm danh, thời khóa biểu, lịch báo giảng ra tệp tin JSON an toàn.
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải tệp sao lưu (.json)</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-cyan-950 font-extrabold text-sm mb-1">
                <Upload className="w-4 h-4 text-cyan-600" />
                <span>Nhập tệp dữ liệu đã sao lưu</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Khôi phục hoặc truyền dữ liệu từ máy tính/trình duyệt khác sang ứng dụng và tự động đồng bộ lên Cloud.
              </p>
            </div>
            <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Chọn tệp JSON để nhập</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="sr-only" />
            </label>
          </div>
        </div>
      </div>

      {/* Database Overview & Statistics */}
      <div className="p-6 rounded-3xl bg-white border-2 border-teal-100 shadow-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <HardDrive className="w-5 h-5 text-teal-700" />
          <h3 className="text-base font-black text-slate-800">
            Tổng Quan Lưu Trữ Cơ Sở Dữ Liệu
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xl font-black text-teal-950">{totalClasses}</span>
              <span className="text-xs font-bold text-teal-700">Lớp học</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xl font-black text-emerald-950">{totalStudents}</span>
              <span className="text-xs font-bold text-emerald-700">Học sinh</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xl font-black text-amber-950">
                {totalAttendanceRecords}
              </span>
              <span className="text-xs font-bold text-amber-700">Ngày điểm danh</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xl font-black text-purple-950">{totalRewards}</span>
              <span className="text-xs font-bold text-purple-700">Quà đổi thưởng</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-slate-700">
              Cơ sở dữ liệu đám mây đang kết nối trực tuyến
            </span>
          </div>
          <span className="text-slate-400">
            Tổng cộng {totalTransactions} giao dịch khen thưởng đã được ghi nhận
          </span>
        </div>
      </div>

      {/* Danger Zone: Reset all */}
      <div className="p-6 rounded-3xl bg-rose-50/70 border-2 border-rose-200 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-800 font-black text-base">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Vùng dữ liệu cảnh báo</span>
          </div>
          <p className="text-xs text-rose-700/80 mt-1 max-w-xl leading-relaxed">
            Đặt lại toàn bộ ứng dụng về dữ liệu mẫu (Lớp với danh sách học sinh mẫu). Thao tác này
            sẽ tái lập dữ liệu mặc định ban đầu.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex-shrink-0 flex items-center justify-center gap-2 py-2.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Đặt lại dữ liệu mẫu</span>
        </button>
      </div>
    </div>
  );
};

