import { Router, Request, Response } from 'express';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export interface CollabSheetCellLock {
  sheet: string;
  row: number;
  col: string;
  clientId: string;
  clientName: string;
  lockedAt: number;
}

export interface CollabContributor {
  id: string;
  name: string;
  firstActive: string;
  lastActive: string;
  editsCount: number;
}

export interface CollabSheetData {
  id: string;
  title: string;
  fileName: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  activeSheet: string;
  sheetNames: string[];
  sheets: {
    [sheetName: string]: {
      name: string;
      headers: string[];
      rows: Array<Record<string, any>>;
    };
  };
  locks: {
    [cellKey: string]: CollabSheetCellLock;
  };
  contributors?: Record<string, CollabContributor>;
}

const STORAGE_FILE = path.resolve(process.cwd(), '.data_collab_sheets.json');

// In-memory cache of collaborative workbooks
const workbooks = new Map<string, CollabSheetData>();

// Active SSE client connections per workbook: workbookId -> Set of Response objects
const sseClients = new Map<string, Set<{ res: Response; clientId: string; clientName: string }>>();

// Load stored workbooks from disk if available
function loadPersistedWorkbooks() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const wb of data) {
          // Clear any stale locks on server startup
          wb.locks = {};
          workbooks.set(wb.id, wb);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load persisted collab sheets:', err);
  }
}

// Persist workbooks to disk
function savePersistedWorkbooks() {
  try {
    const list = Array.from(workbooks.values()).map((wb) => ({
      ...wb,
      locks: {} // Do not persist transient locks
    }));
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save collab sheets to disk:', err);
  }
}

loadPersistedWorkbooks();

// Broadcast event to all connected SSE clients of a workbook
function broadcastEvent(workbookId: string, eventData: any) {
  const clients = sseClients.get(workbookId);
  if (!clients || clients.size === 0) return;

  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
      clients.delete(client);
    }
  }
}

// Broadcast presence statistics to all connected SSE clients
function broadcastPresence(workbookId: string) {
  const clients = sseClients.get(workbookId);
  const onlineCount = clients ? clients.size : 0;
  const onlineUsers = clients
    ? Array.from(clients).map((c) => c.clientName).filter(Boolean)
    : [];
  broadcastEvent(workbookId, {
    type: 'presence_update',
    onlineCount,
    onlineUsers: Array.from(new Set(onlineUsers))
  });
}

export const collabSheetRouter = Router();

/**
 * GET /api/collaborative-sheets
 * List all shared collaborative workbooks with contributor statistics
 */
collabSheetRouter.get('/', (_req: Request, res: Response) => {
  const list = Array.from(workbooks.values()).map((wb) => {
    const clients = sseClients.get(wb.id);
    const contributors = wb.contributors ? Object.values(wb.contributors) : [];
    return {
      id: wb.id,
      title: wb.title,
      fileName: wb.fileName,
      creatorName: wb.creatorName,
      createdAt: wb.createdAt,
      updatedAt: wb.updatedAt,
      sheetNames: wb.sheetNames,
      activeSheet: wb.activeSheet,
      totalRows: Object.values(wb.sheets).reduce((sum, s) => sum + (s.rows?.length || 0), 0),
      contributorsCount: contributors.length,
      contributorsList: contributors,
      onlineCount: clients ? clients.size : 0
    };
  });
  res.json({ success: true, workbooks: list });
});

/**
 * POST /api/collaborative-sheets
 * Create a new collaborative workbook with all sheets
 */
collabSheetRouter.post('/', (req: Request, res: Response) => {
  try {
    const { title, fileName, creatorName, sheets, sheetNames } = req.body;
    if (!sheets || typeof sheets !== 'object') {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu sheets' });
    }

    const id = `collab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const resolvedSheetNames: string[] = Array.isArray(sheetNames) && sheetNames.length > 0
      ? sheetNames
      : Object.keys(sheets);

    const newWb: CollabSheetData = {
      id,
      title: title || fileName?.replace(/\.[^/.]+$/, '') || 'Bảng tính Excel cộng tác',
      fileName: fileName || 'bang_tinh.xlsx',
      creatorName: creatorName || 'Người chia sẻ',
      createdAt: nowIso,
      updatedAt: nowIso,
      activeSheet: resolvedSheetNames[0] || 'Sheet1',
      sheetNames: resolvedSheetNames,
      sheets,
      locks: {},
      contributors: {}
    };

    workbooks.set(id, newWb);
    savePersistedWorkbooks();

    res.json({ success: true, workbook: newWb });
  } catch (err: any) {
    console.error('Error creating collab sheet:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lỗi server' });
  }
});

/**
 * GET /api/collaborative-sheets/:id
 * Get full workbook with all sheets and current active cell locks
 */
collabSheetRouter.get('/:id', (req: Request, res: Response) => {
  const wb = workbooks.get(req.params.id);
  if (!wb) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy bảng tính này.' });
  }

  // Clean expired locks (> 60 seconds)
  const now = Date.now();
  for (const key in wb.locks) {
    if (now - wb.locks[key].lockedAt > 60000) {
      delete wb.locks[key];
    }
  }

  res.json({ success: true, workbook: wb });
});

/**
 * POST /api/collaborative-sheets/:id/lock
 * Acquire lock on a specific cell (sheet, row, col) to avoid collisions
 */
collabSheetRouter.post('/:id/lock', (req: Request, res: Response) => {
  const wb = workbooks.get(req.params.id);
  if (!wb) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy bảng tính.' });
  }

  const { sheet, row, col, clientId, clientName } = req.body;
  if (!sheet || row === undefined || col === undefined || !clientId) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin ô cần khóa' });
  }

  const cellKey = `${sheet}:::${row}:::${col}`;
  const now = Date.now();

  // Check if already locked by someone else
  const existingLock = wb.locks[cellKey];
  if (existingLock && existingLock.clientId !== clientId && now - existingLock.lockedAt < 60000) {
    return res.json({
      success: false,
      locked: true,
      lockedBy: existingLock.clientName || 'Người khác',
      cellKey,
      message: `Ô này đang được ${existingLock.clientName || 'người khác'} nhập dữ liệu! Không thể nhập để tránh trùng lặp.`
    });
  }

  // Grant lock
  const lock: CollabSheetCellLock = {
    sheet,
    row: Number(row),
    col: String(col),
    clientId,
    clientName: clientName || 'Người dùng',
    lockedAt: now
  };

  wb.locks[cellKey] = lock;

  // Broadcast to all clients
  broadcastEvent(wb.id, {
    type: 'cell_locked',
    cellKey,
    lock
  });

  res.json({ success: true, locked: false, lock });
});

/**
 * POST /api/collaborative-sheets/:id/unlock
 * Release lock on a cell or release all locks for a clientId
 */
collabSheetRouter.post('/:id/unlock', (req: Request, res: Response) => {
  const wb = workbooks.get(req.params.id);
  if (!wb) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy bảng tính.' });
  }

  const { sheet, row, col, clientId, unlockAll } = req.body;

  if (unlockAll && clientId) {
    for (const key in wb.locks) {
      if (wb.locks[key].clientId === clientId) {
        const lk = wb.locks[key];
        delete wb.locks[key];
        broadcastEvent(wb.id, {
          type: 'cell_unlocked',
          cellKey: key,
          sheet: lk.sheet,
          row: lk.row,
          col: lk.col
        });
      }
    }
    return res.json({ success: true });
  }

  if (sheet && row !== undefined && col !== undefined) {
    const cellKey = `${sheet}:::${row}:::${col}`;
    if (wb.locks[cellKey] && (!clientId || wb.locks[cellKey].clientId === clientId)) {
      delete wb.locks[cellKey];
      broadcastEvent(wb.id, {
        type: 'cell_unlocked',
        cellKey,
        sheet,
        row: Number(row),
        col: String(col)
      });
    }
  }

  res.json({ success: true });
});

/**
 * POST /api/collaborative-sheets/:id/cell
 * Update cell value in real-time and release lock
 */
collabSheetRouter.post('/:id/cell', (req: Request, res: Response) => {
  const wb = workbooks.get(req.params.id);
  if (!wb) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy bảng tính.' });
  }

  const { sheet, row, col, value, clientId, clientName } = req.body;
  if (!sheet || row === undefined || col === undefined) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin ô' });
  }

  const cellKey = `${sheet}:::${row}:::${col}`;
  const now = Date.now();

  // Validate lock
  const existingLock = wb.locks[cellKey];
  if (existingLock && existingLock.clientId !== clientId && now - existingLock.lockedAt < 60000) {
    return res.status(409).json({
      success: false,
      error: `Ô này đang được ${existingLock.clientName} nhập. Không thể ghi đè.`
    });
  }

  // Ensure sheet and row exist
  if (!wb.sheets[sheet]) {
    return res.status(400).json({ success: false, error: `Sheet "${sheet}" không tồn tại` });
  }

  const rowIndex = Number(row);
  if (!wb.sheets[sheet].rows[rowIndex]) {
    wb.sheets[sheet].rows[rowIndex] = {};
  }

  const nowIso = new Date().toISOString();
  wb.sheets[sheet].rows[rowIndex][col] = value;
  wb.sheets[sheet].rows[rowIndex]._lastEditedBy = clientName || 'Người dùng';
  wb.sheets[sheet].rows[rowIndex]._lastEditedAt = nowIso;
  wb.updatedAt = nowIso;

  // Track contributors for file manager live audit
  if (!wb.contributors) {
    wb.contributors = {};
  }
  const contId = clientId || `anon_${(clientName || 'user').toLowerCase().replace(/\s+/g, '_')}`;
  const cName = clientName || 'Người dùng';
  if (!wb.contributors[contId]) {
    wb.contributors[contId] = {
      id: contId,
      name: cName,
      firstActive: nowIso,
      lastActive: nowIso,
      editsCount: 1
    };
  } else {
    wb.contributors[contId].name = cName;
    wb.contributors[contId].lastActive = nowIso;
    wb.contributors[contId].editsCount = (wb.contributors[contId].editsCount || 0) + 1;
  }

  // Release lock
  delete wb.locks[cellKey];

  // Save to disk
  savePersistedWorkbooks();

  // Broadcast cell update to all connected clients
  broadcastEvent(wb.id, {
    type: 'cell_updated',
    cellKey,
    sheet,
    row: rowIndex,
    col,
    value,
    clientId,
    clientName: cName,
    updatedAt: wb.updatedAt,
    contributors: wb.contributors
  });

  res.json({ success: true, sheet, row: rowIndex, col, value });
});

/**
 * GET /api/collaborative-sheets/:id/stream
 * Real-time Server-Sent Events (SSE) feed
 */
collabSheetRouter.get('/:id/stream', (req: Request, res: Response) => {
  const wb = workbooks.get(req.params.id);
  if (!wb) {
    return res.status(404).send('Not found');
  }

  const clientId = (req.query.clientId as string) || `client_${Math.random().toString(36).substring(2, 8)}`;
  const clientName = (req.query.clientName as string) || 'Người dùng';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients.has(wb.id)) {
    sseClients.set(wb.id, new Set());
  }

  const clientItem = { res, clientId, clientName };
  sseClients.get(wb.id)!.add(clientItem);

  // Send initial state: locks, contributors, online count
  res.write(`data: ${JSON.stringify({
    type: 'init_state',
    locks: wb.locks,
    contributors: wb.contributors || {},
    onlineCount: sseClients.get(wb.id)!.size
  })}\n\n`);

  // Broadcast presence update to everyone
  broadcastPresence(wb.id);

  // Periodic heartbeat every 15 seconds to keep connection open
  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    const clients = sseClients.get(wb.id);
    if (clients) {
      clients.delete(clientItem);
    }

    broadcastPresence(wb.id);

    // Auto-release all locks held by this disconnected client
    for (const key in wb.locks) {
      if (wb.locks[key].clientId === clientId) {
        const lk = wb.locks[key];
        delete wb.locks[key];
        broadcastEvent(wb.id, {
          type: 'cell_unlocked',
          cellKey: key,
          sheet: lk.sheet,
          row: lk.row,
          col: lk.col
        });
      }
    }
  });
});

/**
 * GET /api/collaborative-sheets/:id/export
 * Download the updated multi-sheet workbook as .xlsx
 */
collabSheetRouter.get('/:id/export', (req: Request, res: Response) => {
  const wb = workbooks.get(req.params.id);
  if (!wb) {
    return res.status(404).send('Không tìm thấy bảng tính');
  }

  try {
    const newWorkbook = XLSX.utils.book_new();

    for (const sheetName of wb.sheetNames) {
      const sheetData = wb.sheets[sheetName];
      if (!sheetData) continue;

      const headers = sheetData.headers || [];
      const rows = sheetData.rows || [];

      // Convert rows to 2D array: [headers, ...rowValues]
      const aoa: any[][] = [headers];

      for (const r of rows) {
        const rowArr = headers.map((_h, idx) => {
          const colKey = `col_${idx}`;
          return r[colKey] !== undefined ? r[colKey] : r[idx] !== undefined ? r[idx] : '';
        });
        aoa.push(rowArr);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName.substring(0, 31));
    }

    const fileBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
    const downloadName = encodeURIComponent(wb.fileName.replace(/\.xlsx$/i, '') + '_cap_nhat.xlsx');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.send(fileBuffer);
  } catch (err: any) {
    console.error('Export Excel error:', err);
    res.status(500).send('Không thể xuất file Excel.');
  }
});

/**
 * DELETE /api/collaborative-sheets/:id
 * Delete a collaborative sheet
 */
collabSheetRouter.delete('/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  if (workbooks.has(id)) {
    workbooks.delete(id);
    savePersistedWorkbooks();
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Không tìm thấy bảng tính.' });
  }
});
