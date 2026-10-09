import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  // @ts-ignore
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component Tree:', error, errorInfo);
    // @ts-ignore
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('lopHoc_') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }
    window.location.href = window.location.pathname;
  };

  public render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Đã Xảy Ra Lỗi Hiển Thị Giao Diện</h2>
              <p className="text-xs text-slate-400 mt-1">
                Hệ thống đã tự động ngăn chặn sự cố. Vui lòng thử các thao tác dưới đây để khôi phục giao diện.
              </p>
            </div>

            {/* @ts-ignore */}
            {this.state.error && (
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-left text-[11px] font-mono text-rose-300 max-h-32 overflow-y-auto break-all">
                {/* @ts-ignore */}
                {this.state.error.toString()}
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tải Lại Trang Web</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Khôi Phục Giao Diện Mặc Định</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              Nếu lỗi vẫn tiếp diễn, vui lòng liên hệ Ban Quản Trị Hệ Thống.
            </p>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}
