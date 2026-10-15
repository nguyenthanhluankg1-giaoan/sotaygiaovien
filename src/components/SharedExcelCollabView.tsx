import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Share2,
  Copy,
  Check,
  Search,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Plus,
  Users,
  Eye,
  ArrowLeft,
  Sparkles,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Save,
  CheckCircle2,
  QrCode,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { CollabSheetData, CollabSheetCellLock, CollabContributor } from '../server/collabSheetRouter';
import { buildPublicCollabSheetUrl } from '../utils/urlHelper';
import { fetchCollabWorkbookFromFirestore, saveCollabWorkbookToFirestore } from '../services/dbService';

interface SharedExcelCollabViewProps {
  sheetId: string;
  onBackToApp?: () => void;
}

export const SharedExcelCollabView: React.FC<SharedExcelCollabViewProps> = ({
  sheetId,
  onBackToApp
}) => {
  const [workbook, setWorkbook] = useState<CollabSheetData | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLocks, setActiveLocks] = useState<Record<string, CollabSheetCellLock>>({});

  // Contributor & Live Manager tracking
  const [contributors, setContributors] = useState<Record<string, CollabContributor>>({});
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState<boolean>(false);
  const [filterByContributor, setFilterByContributor] = useState<string | null>(null);

  // Client identity (no account needed - stored in sessionStorage)
  const [clientId] = useState<string>(() => {
    let id = sessionStorage.getItem('collab_client_id');
    if (!id) {
      id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('collab_client_id', id);
    }
    return id;
  });

  const [clientName, setClientName] = useState<string>(() => {
    return localStorage.getItem('collab_user_name') || `Người dùng ${clientId.slice(-4)}`;
  });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(clientName);

  // Active editing cell: { sheet, row, col }
  const [editingCell, setEditingCell] = useState<{ sheet: string; row: number; col: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [lockAlert, setLockAlert] = useState<{ message: string; lockedBy: string } | null>(null);

  // Share modal
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Saving indicator
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);
  const [lastSavedNotice, setLastSavedNotice] = useState<string | null>(null);

  // Broadcast channel for multi-tab local peer sync
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Load workbook data
  const fetchWorkbook = async () => {
    try {
      const res = await fetch(`/api/collaborative-sheets/${sheetId}`);
      if (!res.ok) {
        throw new Error('Không thể tải bảng tính từ máy chủ.');
      }
      const data = await res.json();
      if (data.success && data.workbook) {
        setWorkbook(data.workbook);
        setActiveSheet((prev) => prev || data.workbook.activeSheet || data.workbook.sheetNames[0] || '');
        if (data.workbook.locks) {
          setActiveLocks(data.workbook.locks);
        }
        if (data.workbook.contributors) {
          setContributors(data.workbook.contributors);
        }
        setErrorMsg('');
      } else {
        throw new Error(data.error || 'Lỗi không xác định khi nạp dữ liệu.');
      }
    } catch (err: any) {
      console.warn('Fetch workbook from server error, attempting Firestore and localStorage fallbacks:', err);
      // 1. Fallback check from Firestore
      try {
        const firestoreWb = await fetchCollabWorkbookFromFirestore(sheetId);
        if (firestoreWb && firestoreWb.sheets) {
          setWorkbook(firestoreWb);
          setActiveSheet((prev) => prev || firestoreWb.activeSheet || firestoreWb.sheetNames?.[0] || '');
          if (firestoreWb.locks) setActiveLocks(firestoreWb.locks);
          if (firestoreWb.contributors) setContributors(firestoreWb.contributors);
          setErrorMsg('');
          return;
        }
      } catch (fErr) {
        console.warn('Firestore fallback notice:', fErr);
      }

      // 2. Fallback check in localStorage if server is unreachable
      try {
        const raw = localStorage.getItem(`collab_sheet_backup_${sheetId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          setWorkbook(parsed);
          setActiveSheet((prev) => prev || parsed.activeSheet || parsed.sheetNames?.[0] || '');
          if (parsed.contributors) {
            setContributors(parsed.contributors);
          }
          setErrorMsg('');
          return;
        }
      } catch (e) {}
      setErrorMsg(err.message || 'Không thể kết nối đến bảng tính.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkbook();
  }, [sheetId]);

  // Setup SSE stream for real-time live locks, presence and contributor updates
  useEffect(() => {
    if (!sheetId) return;

    let eventSource: EventSource | null = null;
    try {
      const streamUrl = `/api/collaborative-sheets/${sheetId}/stream?clientId=${encodeURIComponent(clientId)}&clientName=${encodeURIComponent(clientName)}`;
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init_state') {
            if (data.locks) setActiveLocks(data.locks);
            if (data.contributors) setContributors(data.contributors);
            if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount);
          } else if (data.type === 'presence_update') {
            if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount);
            if (data.onlineUsers) setOnlineUsers(data.onlineUsers);
          } else if (data.type === 'init_locks') {
            setActiveLocks(data.locks || {});
          } else if (data.type === 'cell_locked') {
            setActiveLocks((prev) => ({
              ...prev,
              [data.cellKey]: data.lock
            }));
          } else if (data.type === 'cell_unlocked') {
            setActiveLocks((prev) => {
              const next = { ...prev };
              delete next[data.cellKey];
              return next;
            });
          } else if (data.type === 'cell_updated') {
            if (data.contributors) {
              setContributors(data.contributors);
            }
            // Update workbook cell in memory
            setWorkbook((prevWb) => {
              if (!prevWb || !prevWb.sheets[data.sheet]) return prevWb;
              const newSheets = { ...prevWb.sheets };
              const currentSheet = { ...newSheets[data.sheet] };
              const newRows = [...(currentSheet.rows || [])];
              if (!newRows[data.row]) {
                newRows[data.row] = {};
              }
              newRows[data.row] = {
                ...newRows[data.row],
                [data.col]: data.value,
                _lastEditedBy: data.clientName,
                _lastEditedAt: data.updatedAt || new Date().toISOString()
              };
              currentSheet.rows = newRows;
              newSheets[data.sheet] = currentSheet;

              return {
                ...prevWb,
                sheets: newSheets,
                updatedAt: data.updatedAt || new Date().toISOString()
              };
            });

            // Unlock cell
            setActiveLocks((prev) => {
              const next = { ...prev };
              delete next[data.cellKey];
              return next;
            });

            setLastSavedNotice(`${data.clientName} vừa cập nhật một ô số liệu.`);
            setTimeout(() => setLastSavedNotice(null), 3000);
          }
        } catch (e) {
          console.warn('SSE parse error:', e);
        }
      };

      eventSource.onerror = () => {
        // SSE transient error, browser auto-reconnects
      };
    } catch (e) {
      console.warn('SSE connection failed, falling back to polling:', e);
    }

    // BroadcastChannel for instant same-browser multi-tab synchronization
    try {
      const bc = new BroadcastChannel(`collab_sheet_${sheetId}`);
      channelRef.current = bc;
      bc.onmessage = (ev) => {
        const msg = ev.data;
        if (msg && msg.type === 'cell_locked') {
          setActiveLocks((prev) => ({ ...prev, [msg.cellKey]: msg.lock }));
        } else if (msg && msg.type === 'cell_unlocked') {
          setActiveLocks((prev) => {
            const next = { ...prev };
            delete next[msg.cellKey];
            return next;
          });
        } else if (msg && msg.type === 'cell_updated') {
          setWorkbook((prevWb) => {
            if (!prevWb || !prevWb.sheets[msg.sheet]) return prevWb;
            const newSheets = { ...prevWb.sheets };
            const currentSheet = { ...newSheets[msg.sheet] };
            const newRows = [...(currentSheet.rows || [])];
            if (!newRows[msg.row]) newRows[msg.row] = {};
            newRows[msg.row] = { ...newRows[msg.row], [msg.col]: msg.value };
            currentSheet.rows = newRows;
            newSheets[msg.sheet] = currentSheet;
            return { ...prevWb, sheets: newSheets, updatedAt: new Date().toISOString() };
          });
        }
      };
    } catch {}

    // Cleanup when closing / leaving window
    const handleBeforeUnload = () => {
      navigator.sendBeacon?.(
        `/api/collaborative-sheets/${sheetId}/unlock`,
        JSON.stringify({ clientId, unlockAll: true })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (eventSource) eventSource.close();
      if (channelRef.current) channelRef.current.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sheetId, clientId]);

  // Generate QR Code when share modal opens
  useEffect(() => {
    if (isShareModalOpen) {
      const shareUrl = buildPublicCollabSheetUrl(sheetId);
      QRCode.toDataURL(shareUrl, { width: 260, margin: 2 }, (err, url) => {
        if (!err && url) setQrCodeDataUrl(url);
      });
    }
  }, [isShareModalOpen, sheetId]);

  // Current sheet data
  const currentSheetData = useMemo(() => {
    if (!workbook || !activeSheet || !workbook.sheets[activeSheet]) return null;
    return workbook.sheets[activeSheet];
  }, [workbook, activeSheet]);

  // Filtered rows based on search and optional contributor filter
  const filteredRows = useMemo(() => {
    if (!currentSheetData || !currentSheetData.rows) return [];
    let list = currentSheetData.rows;

    if (filterByContributor) {
      list = list.filter((row) => row._lastEditedBy === filterByContributor);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((row) => {
      return Object.values(row).some((val) =>
        String(val || '').toLowerCase().includes(q)
      );
    });
  }, [currentSheetData, searchQuery, filterByContributor]);

  // Handle cell click / focus: acquire lock
  const handleCellClick = async (rowIndex: number, colKey: string) => {
    if (!activeSheet || !workbook) return;

    const cellKey = `${activeSheet}:::${rowIndex}:::${colKey}`;
    const existingLock = activeLocks[cellKey];

    // Check if cell is locked by someone else
    if (existingLock && existingLock.clientId !== clientId && Date.now() - existingLock.lockedAt < 60000) {
      setLockAlert({
        message: `Ô này đang được ${existingLock.clientName || 'người khác'} nhập dữ liệu! Không thể nhập để tránh trùng lặp.`,
        lockedBy: existingLock.clientName || 'Người khác'
      });
      return;
    }

    setLockAlert(null);

    // If already editing this cell, return
    if (editingCell && editingCell.sheet === activeSheet && editingCell.row === rowIndex && editingCell.col === colKey) {
      return;
    }

    // If currently editing another cell, commit and unlock previous first
    if (editingCell) {
      await commitCellEdit();
    }

    // Set editing state
    const currentVal = currentSheetData?.rows[rowIndex]?.[colKey] ?? '';
    setEditingCell({ sheet: activeSheet, row: rowIndex, col: colKey });
    setEditingValue(String(currentVal));

    // Request lock from server
    try {
      const res = await fetch(`/api/collaborative-sheets/${sheetId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: activeSheet,
          row: rowIndex,
          col: colKey,
          clientId,
          clientName
        })
      });

      const resData = await res.json();
      if (!resData.success && resData.locked) {
        setLockAlert({
          message: resData.message || 'Ô này đang có người nhập dữ liệu!',
          lockedBy: resData.lockedBy || 'Người khác'
        });
        setEditingCell(null);
      } else if (resData.success) {
        // Lock acquired successfully
        setActiveLocks((prev) => ({
          ...prev,
          [cellKey]: resData.lock
        }));
        // Broadcast via local channel
        channelRef.current?.postMessage({
          type: 'cell_locked',
          cellKey,
          lock: resData.lock
        });
      }
    } catch (e) {
      console.warn('Lock request network notice:', e);
    }
  };

  // Commit cell edit and release lock
  const commitCellEdit = async () => {
    if (!editingCell || !workbook) return;

    const { sheet, row, col } = editingCell;
    const cellKey = `${sheet}:::${row}:::${col}`;
    const newVal = editingValue.trim();

    setIsSavingCell(true);
    const nowIso = new Date().toISOString();

    // Update in local state optimistically
    setWorkbook((prevWb) => {
      if (!prevWb || !prevWb.sheets[sheet]) return prevWb;
      const newSheets = { ...prevWb.sheets };
      const currentSheet = { ...newSheets[sheet] };
      const newRows = [...(currentSheet.rows || [])];
      if (!newRows[row]) newRows[row] = {};
      newRows[row] = {
        ...newRows[row],
        [col]: newVal,
        _lastEditedBy: clientName,
        _lastEditedAt: nowIso
      };
      currentSheet.rows = newRows;
      newSheets[sheet] = currentSheet;

      const updated = {
        ...prevWb,
        sheets: newSheets,
        updatedAt: nowIso
      };

      // Backup to localStorage
      try {
        localStorage.setItem(`collab_sheet_backup_${sheetId}`, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });

    // Update local contributor stats
    setContributors((prev) => {
      const cId = clientId;
      const existing = prev[cId];
      return {
        ...prev,
        [cId]: {
          id: cId,
          name: clientName,
          firstActive: existing?.firstActive || nowIso,
          lastActive: nowIso,
          editsCount: (existing?.editsCount || 0) + 1
        }
      };
    });

    // Remove lock locally
    setActiveLocks((prev) => {
      const next = { ...prev };
      delete next[cellKey];
      return next;
    });

    setEditingCell(null);

    // Send update to server
    try {
      await fetch(`/api/collaborative-sheets/${sheetId}/cell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet,
          row,
          col,
          value: newVal,
          clientId,
          clientName
        })
      });

      // Broadcast to local channel
      channelRef.current?.postMessage({
        type: 'cell_updated',
        cellKey,
        sheet,
        row,
        col,
        value: newVal,
        clientName
      });
    } catch (err) {
      console.warn('Save cell error, saved locally:', err);
    } finally {
      setIsSavingCell(false);
    }
  };

  // Add new empty row to current sheet
  const handleAddNewRow = async () => {
    if (!currentSheetData || !workbook || !activeSheet) return;

    const newRowIndex = currentSheetData.rows.length;
    const newRowObj: Record<string, any> = {
      id: `row_${Date.now()}`
    };

    // Auto-fill STT if first column is STT
    if (currentSheetData.headers[0] && currentSheetData.headers[0].toLowerCase().includes('stt')) {
      newRowObj['col_0'] = newRowIndex + 1;
    }

    setWorkbook((prevWb) => {
      if (!prevWb || !prevWb.sheets[activeSheet]) return prevWb;
      const newSheets = { ...prevWb.sheets };
      const current = { ...newSheets[activeSheet] };
      current.rows = [...(current.rows || []), newRowObj];
      newSheets[activeSheet] = current;
      return { ...prevWb, sheets: newSheets };
    });

    // Automatically focus first data column of new row
    handleCellClick(newRowIndex, 'col_1');
  };

  // Save client display name
  const handleSaveName = () => {
    if (tempName.trim()) {
      setClientName(tempName.trim());
      localStorage.setItem('collab_user_name', tempName.trim());
    }
    setIsEditingName(false);
  };

  // Download Excel file
  const handleDownloadExcel = () => {
    window.location.href = `/api/collaborative-sheets/${sheetId}/export`;
  };

  // Copy share link
  const handleCopyLink = () => {
    const url = buildPublicCollabSheetUrl(sheetId);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-3xl bg-teal-600 text-white flex items-center justify-center animate-spin mb-4 shadow-lg shadow-teal-600/30">
          <RefreshCw className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-900">Đang nạp Bảng tính Excel cộng tác...</h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Đang đồng bộ toàn bộ các sheet và trạng thái ô khóa</p>
      </div>
    );
  }

  if (errorMsg && !workbook) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-rose-200 p-6 sm:p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Không thể mở Bảng tính</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{errorMsg}</p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                setLoading(true);
                fetchWorkbook();
              }}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Thử tải lại</span>
            </button>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Quay lại ứng dụng
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!workbook) return null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col justify-between">
      {/* Top Navigation & Collaborative Info Bar */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Brand / Title / Back Button */}
          <div className="flex items-center gap-3 min-w-0">
            {onBackToApp ? (
              <button
                onClick={onBackToApp}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer shrink-0"
                title="Quay lại ứng dụng"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-sm">
                XLS
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
                  {workbook.title}
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                  {workbook.sheetNames.length} Sheets
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold">
                  🟢 Nhập Trực Tiếp (Không Cần Đăng Nhập)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-2 truncate">
                <span>File: <strong>{workbook.fileName}</strong></span>
                <span>•</span>
                <span>Tạo bởi: <strong>{workbook.creatorName}</strong></span>
              </p>
            </div>
          </div>

          {/* Right: User Nickname + Real-time Status + Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Nickname pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    placeholder="Tên của bạn..."
                    className="px-1.5 py-0.5 bg-white border border-teal-400 rounded text-xs font-bold w-24 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-1.5 py-0.5 rounded bg-teal-600 text-white text-[10px] font-bold"
                  >
                    Lưu
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsEditingName(true)}>
                  <span className="font-extrabold text-slate-800 truncate max-w-[110px]" title="Bấm để đổi tên">
                    {clientName}
                  </span>
                  <span className="text-[10px] text-slate-400 hover:text-teal-600">✏️</span>
                </div>
              )}
            </div>

            {/* Live Presence indicator */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold"
              title={`${onlineCount} người đang trực tuyến kết nối`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{onlineCount} online</span>
            </div>

            {/* Manager Live Contributor Button */}
            <button
              onClick={() => setIsManagerModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Xem trực tiếp thống kê có bao nhiêu người đã nhập dữ liệu và chi tiết từng người"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-200" />
              <span>Giám sát ({Object.keys(contributors).length} người nhập)</span>
            </button>

            {/* Share link button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia sẻ link</span>
            </button>

            {/* Export Excel button */}
            <button
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Tải file Excel đầy đủ các sheet về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về máy</span>
            </button>
          </div>

        </div>

        {/* Multi-Sheet Tab Navigation Bar (Tabs like Excel / Google Sheets) */}
        <div className="bg-slate-50 border-t border-slate-200/80 px-3 sm:px-6 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 py-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider mr-1 hidden sm:inline">
              DANH SÁCH SHEET:
            </span>
            {workbook.sheetNames.map((sheetName) => {
              const isCurrent = sheetName === activeSheet;
              const count = workbook.sheets[sheetName]?.rows?.length || 0;
              return (
                <button
                  key={sheetName}
                  onClick={() => {
                    if (editingCell) commitCellEdit();
                    setActiveSheet(sheetName);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : 'text-emerald-600'}`} />
                  <span>{sheetName}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search in Sheet */}
          <div className="flex items-center gap-2 shrink-0 py-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm trong sheet này..."
                className="pl-8 pr-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 w-36 sm:w-48"
              />
            </div>

            <button
              onClick={handleAddNewRow}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
              title="Thêm dòng mới vào sheet này"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Thêm dòng</span>
            </button>
          </div>
        </div>
      </header>

      {/* Lock Alert Banner (Shown in bright red when trying to edit a locked cell) */}
      {lockAlert && (
        <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-top">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
            <ShieldAlert className="w-5 h-5 shrink-0 animate-bounce" />
            <span>⛔ {lockAlert.message}</span>
          </div>
          <button
            onClick={() => setLockAlert(null)}
            className="text-white hover:text-rose-200 font-extrabold text-xs px-2 py-1 rounded bg-black/20 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Filter by contributor active banner */}
      {filterByContributor && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center justify-between text-xs font-bold text-indigo-900 animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>
              Đang lọc chỉ hiển thị các dòng do <strong>"{filterByContributor}"</strong> nhập số liệu
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-950 text-[10px]">
              {filteredRows.length} dòng
            </span>
          </div>
          <button
            onClick={() => setFilterByContributor(null)}
            className="text-xs text-rose-600 hover:text-rose-800 font-black cursor-pointer underline flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Bỏ lọc (Xem toàn bộ dòng)</span>
          </button>
        </div>
      )}

      {/* Notice Banner */}
      <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-1.5 text-[11px] text-amber-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <span>
            💡 <strong>Quy tắc tránh trùng lặp:</strong> Khi Thầy/Cô bấm vào ô nào, ô đó sẽ hiển thị <strong>MÀU ĐỎ KHÓA</strong> đối với những người khác để không ai nhập đè lên nhau.
          </span>
        </div>
        {lastSavedNotice && (
          <span className="text-emerald-700 font-bold shrink-0 animate-fade-in">
            {lastSavedNotice}
          </span>
        )}
      </div>

      {/* Main Interactive Excel Spreadsheet Grid */}
      <main className="flex-1 overflow-auto p-2 sm:p-4">
        {currentSheetData ? (
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto max-h-[calc(100vh-210px)] relative">
              <table className="w-full text-left border-collapse min-w-[700px]">
                {/* Table Header */}
                <thead className="bg-slate-100 text-slate-800 text-xs sm:text-sm font-black uppercase sticky top-0 z-20 border-b-2 border-slate-300 shadow-xs">
                  <tr>
                    <th className="p-3 w-16 text-center border-r border-slate-300 bg-slate-200/80 text-slate-600 shrink-0">
                      #
                    </th>
                    {currentSheetData.headers.map((headerText, colIdx) => (
                      <th
                        key={`th_${colIdx}`}
                        className="p-3 border-r border-slate-300 text-slate-900 tracking-wider whitespace-nowrap min-w-[130px]"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{headerText || `Cột ${colIdx + 1}`}</span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {String.fromCharCode(65 + (colIdx % 26))}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, rIdx) => {
                      return (
                        <tr
                          key={`row_${rIdx}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Row Index Indicator & Contributor Tag */}
                          <td className="p-1.5 text-center border-r border-slate-200 bg-slate-50 font-bold text-slate-500 text-xs select-none">
                            <div className="flex flex-col items-center justify-center">
                              <span>{rIdx + 1}</span>
                              {row._lastEditedBy && (
                                <span
                                  className="text-[9px] font-bold text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-300 truncate max-w-[65px] mt-0.5 cursor-help"
                                  title={`Người nhập: ${row._lastEditedBy}${row._lastEditedAt ? ' (' + new Date(row._lastEditedAt).toLocaleTimeString('vi-VN') + ')' : ''}`}
                                >
                                  {row._lastEditedBy}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Data Cells */}
                          {currentSheetData.headers.map((_header, colIdx) => {
                            const colKey = `col_${colIdx}`;
                            const cellKey = `${activeSheet}:::${rIdx}:::${colKey}`;
                            const isBeingEditedByMe = editingCell?.sheet === activeSheet && editingCell?.row === rIdx && editingCell?.col === colKey;

                            // Check active lock by other user
                            const currentLock = activeLocks[cellKey];
                            const isLockedByOther = Boolean(
                              currentLock &&
                              currentLock.clientId !== clientId &&
                              Date.now() - currentLock.lockedAt < 60000
                            );

                            const cellValue = row[colKey] !== undefined ? row[colKey] : row[colIdx] !== undefined ? row[colIdx] : '';

                            // CELL LOCKED BY OTHERS: Distinct RED styling with lock badge
                            if (isLockedByOther) {
                              return (
                                <td
                                  key={`cell_${rIdx}_${colIdx}`}
                                  onClick={() => handleCellClick(rIdx, colKey)}
                                  className="p-2 border-r border-slate-200 bg-rose-100/90 text-rose-900 border-2 border-rose-500 relative cursor-not-allowed select-none transition-all shadow-inner"
                                  title={`Ô này đang được ${currentLock.clientName} nhập dữ liệu. Vui lòng chọn ô khác!`}
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="truncate font-bold opacity-70">
                                      {cellValue !== '' ? String(cellValue) : '(Đang nhập...)'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center gap-1 shrink-0 animate-pulse shadow-xs">
                                      <Lock className="w-3 h-3" />
                                      <span>{currentLock.clientName || 'Có người nhập'}</span>
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            // CELL CURRENTLY EDITING BY THIS USER
                            if (isBeingEditedByMe) {
                              return (
                                <td
                                  key={`cell_${rIdx}_${colIdx}`}
                                  className="p-0 border-r border-teal-500 bg-teal-50/70 border-2 border-teal-600 relative shadow-sm"
                                >
                                  <input
                                    type="text"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={commitCellEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        commitCellEdit();
                                      } else if (e.key === 'Escape') {
                                        setEditingCell(null);
                                      }
                                    }}
                                    autoFocus
                                    className="w-full h-full px-3 py-2.5 bg-white text-slate-900 text-xs sm:text-sm font-bold outline-none ring-2 ring-teal-500 rounded-none shadow-inner"
                                  />
                                </td>
                              );
                            }

                            // STANDARD UNLOCKED CELL
                            return (
                              <td
                                key={`cell_${rIdx}_${colIdx}`}
                                onClick={() => handleCellClick(rIdx, colKey)}
                                className="p-2.5 border-r border-slate-200 font-medium text-slate-800 hover:bg-teal-50/50 cursor-pointer select-none transition-colors"
                              >
                                <div className="truncate min-h-[18px]">
                                  {cellValue !== '' ? String(cellValue) : <span className="text-slate-300">-</span>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={currentSheetData.headers.length + 1}
                        className="p-8 text-center text-slate-400 font-medium"
                      >
                        {searchQuery ? 'Không tìm thấy dòng nào khớp từ khóa tìm kiếm.' : 'Sheet này chưa có dữ liệu dòng nào.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Status bar */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-3">
                <span>Sheet hiện tại: <strong>{activeSheet}</strong></span>
                <span>•</span>
                <span>Hiển thị: <strong>{filteredRows.length}</strong> / {currentSheetData.rows.length} dòng</span>
                <span>•</span>
                <span>Cột: <strong>{currentSheetData.headers.length}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {isSavingCell && (
                  <span className="text-teal-600 font-bold flex items-center gap-1 text-[11px]">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Đang lưu...</span>
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  Cập nhật: {new Date(workbook.updatedAt).toLocaleTimeString('vi-VN')}
                </span>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
            Không tìm thấy dữ liệu cho sheet này.
          </div>
        )}
      </main>

      {/* Share Modal with Link & QR Code */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/30">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    Chia Sẻ Bảng Tính Excel Trực Tuyến
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ai có link này đều xem được toàn bộ các Sheet và nhập dữ liệu trực tiếp.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* QR Code */}
            {qrCodeDataUrl && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-2">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Bảng tính Excel"
                  className="w-48 h-48 rounded-xl shadow-xs border border-white"
                />
                <p className="text-[11px] text-slate-500 font-medium">
                  Quét mã QR bằng Camera điện thoại để vào nhập trên smartphone
                </p>
              </div>
            )}

            {/* Share Link Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Đường link chia sẻ trực tiếp:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={buildPublicCollabSheetUrl(sheetId)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 select-all outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                  }`}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-medium space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Hoàn toàn không cần đăng nhập tài khoản:</span>
              </p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Người mở link chỉ cần nhấp vào ô bất kỳ để điền số liệu. Hệ thống tự động khóa ô màu đỏ đối với người khác để không ai nhập trùng.
              </p>
            </div>

            <button
              onClick={() => setIsShareModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: LIVE CONTRIBUTOR & DATA MONITORING FOR FILE MANAGER     */}
      {/* ============================================================== */}
      {isManagerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-indigo-200 w-full max-w-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Giám Sát Người Nhập Dữ Liệu Trực Tiếp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Theo dõi trực tiếp thời gian thực: có bao nhiêu người đã nhập và chi tiết từng người
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManagerModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live KPI Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl">
                <span className="text-[11px] font-bold text-indigo-700 uppercase">ĐÃ NHẬP DỮ LIỆU</span>
                <div className="text-2xl font-black text-indigo-950 mt-1 flex items-baseline gap-1.5">
                  <span>{Object.keys(contributors).length}</span>
                  <span className="text-xs font-bold text-indigo-700">người</span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <span className="text-[11px] font-bold text-emerald-700 uppercase">ĐANG TRỰC TUYẾN</span>
                <div className="text-2xl font-black text-emerald-950 mt-1 flex items-center gap-2">
                  <span>{onlineCount}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                <span className="text-[11px] font-bold text-amber-700 uppercase">TỔNG LƯỢT SỬA Ô</span>
                <div className="text-2xl font-black text-amber-950 mt-1">
                  {(Object.values(contributors) as CollabContributor[]).reduce((acc, c) => acc + (c.editsCount || 0), 0)}
                </div>
              </div>
            </div>

            {/* Contributor List Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Danh Sách Người Nhập ({Object.keys(contributors).length})
                </h4>
                {filterByContributor && (
                  <button
                    onClick={() => {
                      setFilterByContributor(null);
                      setIsManagerModalOpen(false);
                    }}
                    className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Bỏ lọc người này (Xem tất cả)
                  </button>
                )}
              </div>

              {Object.keys(contributors).length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Chưa có người nào nhập dữ liệu vào bảng tính</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ngay khi người dùng nhấp vào ô và nhập dữ liệu, hệ thống sẽ tự động cập nhật danh sách tại đây theo thời gian thực.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  {(Object.values(contributors) as CollabContributor[]).map((c) => {
                    const isFiltered = filterByContributor === c.name;
                    return (
                      <div
                        key={c.id}
                        className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                          isFiltered ? 'bg-indigo-50/80' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 truncate">
                                {c.name}
                              </span>
                              {c.name === clientName && (
                                <span className="px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Lần cuối: {new Date(c.lastActive).toLocaleTimeString('vi-VN')} {new Date(c.lastActive).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                            {c.editsCount} ô
                          </span>
                          <button
                            onClick={() => {
                              setFilterByContributor(isFiltered ? null : c.name);
                              setIsManagerModalOpen(false);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-colors ${
                              isFiltered
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                            title="Lọc bảng tính để chỉ xem các dòng do người này nhập"
                          >
                            {isFiltered ? 'Đang lọc' : 'Lọc dòng'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  fetchWorkbook();
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm mới dữ liệu</span>
              </button>

              <button
                onClick={() => setIsManagerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-2 border-t border-slate-200/60 bg-white">
        Bảng tính Excel trực tuyến cộng tác thời gian thực © Trường TH Thạnh Yên 1
      </footer>
    </div>
  );
};
