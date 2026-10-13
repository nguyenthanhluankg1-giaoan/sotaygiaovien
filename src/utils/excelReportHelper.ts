import * as XLSX from 'xlsx';
import { ReportColumn, ReportRow } from '../types';
import { GoogleGenAI } from '@google/genai';
import { getStoredApiKey } from './apiKeyStorage';

export interface ParsedSheetResult {
  columns: ReportColumn[];
  rows: ReportRow[];
  headerStartRow: number;
  headerEndRow: number;
  hasMergedHeaders: boolean;
  mergedGroupNames: string[];
}

/**
 * Normalizes Vietnamese string for comparison
 */
function normalizeStr(str: any): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Intelligent Excel Header & Merged Columns Parser
 * Accurately extracts both merged groups (cột gộp) and standalone columns (cột không gộp)
 */
export function parseExcelSheetWithMerges(
  worksheet: XLSX.WorkSheet
): ParsedSheetResult {
  const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!raw2D || raw2D.length === 0) {
    return {
      columns: [],
      rows: [],
      headerStartRow: 0,
      headerEndRow: 0,
      hasMergedHeaders: false,
      mergedGroupNames: []
    };
  }

  // 1. Analyze !merges from worksheet
  const merges: XLSX.Range[] = (worksheet['!merges'] || []) as XLSX.Range[];

  // Determine max columns in sheet
  let maxColCount = 0;
  for (let r = 0; r < Math.min(25, raw2D.length); r++) {
    if (Array.isArray(raw2D[r])) {
      maxColCount = Math.max(maxColCount, raw2D[r].length);
    }
  }

  // 2. Identify header region (start and end row)
  // Look for keywords like 'stt', 'lớp', 'họ và tên', 'họ tên', 'tổng số', 'ghi chú'
  const headerKeywords = [
    'stt', 'tt', 'lop', 'lớp', 'ho va ten', 'ho ten', 'tong so', 'so luong', 
    'nam', 'nu', 'bhyt', 'khen thuong', 'hoc sinh', 'ghi chu', 'kinh phi', 
    'so tien', 'dien thoai', 'don vi', 'phan loai'
  ];

  let bestHeaderStart = -1;
  let highestKeywordScore = 0;

  for (let r = 0; r < Math.min(12, raw2D.length); r++) {
    const row = raw2D[r] || [];
    let score = 0;
    for (let c = 0; c < row.length; c++) {
      const val = normalizeStr(row[c]);
      if (val) {
        if (headerKeywords.some((kw) => val === kw || val.includes(kw))) {
          score += 3;
        } else if (typeof row[c] === 'string' && row[c].trim().length > 0) {
          score += 1;
        }
      }
    }
    // Boost if this row has horizontal merges
    const rowMerges = merges.filter((m) => m.s.r === r && m.e.c > m.s.c);
    if (rowMerges.length > 0) {
      score += rowMerges.length * 4;
    }

    if (score > highestKeywordScore) {
      highestKeywordScore = score;
      bestHeaderStart = r;
    }
  }

  if (bestHeaderStart === -1) {
    bestHeaderStart = 0;
  }

  // Determine headerEndRow
  // Check if rows below headerStart are still part of multi-row header (sub-columns, merges, or col numbers)
  let bestHeaderEnd = bestHeaderStart;

  // Check if merges expand downwards or start in the header block
  merges.forEach((m) => {
    if (m.s.r >= bestHeaderStart && m.s.r <= bestHeaderStart + 3) {
      if (m.e.r > bestHeaderEnd && m.e.r < bestHeaderStart + 5 && m.e.r < raw2D.length) {
        bestHeaderEnd = m.e.r;
      }
    }
    if (m.s.r <= bestHeaderStart && m.e.r >= bestHeaderStart) {
      if (m.e.r > bestHeaderEnd && m.e.r < bestHeaderStart + 5 && m.e.r < raw2D.length) {
        bestHeaderEnd = m.e.r;
      }
    }
  });

  // Check if next 1-2 rows have subheader text (like "Tổng số", "Nữ", "Dân tộc")
  for (let nextR = bestHeaderStart + 1; nextR <= Math.min(bestHeaderStart + 3, raw2D.length - 1); nextR++) {
    const nextRow = raw2D[nextR] || [];
    let textCellCount = 0;
    let numericCellCount = 0;
    let isIndexNumberRow = true; // e.g., (1), (2), (3)...

    for (let c = 0; c < nextRow.length; c++) {
      const v = nextRow[c];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const str = String(v).trim();
        const isNumOnly = /^(\(?\d+\)?|\d+)$/.test(str);
        if (isNumOnly) {
          numericCellCount++;
        } else {
          isIndexNumberRow = false;
          textCellCount++;
        }
      }
    }

    // If it contains column indices like "(1)", "(2)", "(3)"
    if (isIndexNumberRow && numericCellCount >= 3) {
      bestHeaderEnd = nextR;
      break;
    }

    // If it has substantial text headers (subheaders)
    if (textCellCount >= 1 && (textCellCount >= numericCellCount || numericCellCount === 0)) {
      bestHeaderEnd = nextR;
    } else {
      break;
    }
  }

  // 3. Construct 2D Header Map with Merges propagated
  // headerGrid[r - bestHeaderStart][c]
  const numHeaderRows = bestHeaderEnd - bestHeaderStart + 1;
  const headerGrid: string[][] = [];

  for (let rIdx = 0; rIdx < numHeaderRows; rIdx++) {
    const actualR = bestHeaderStart + rIdx;
    const row = raw2D[actualR] || [];
    headerGrid[rIdx] = [];
    for (let c = 0; c < maxColCount; c++) {
      headerGrid[rIdx][c] = row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : '';
    }
  }

  // Apply explicit Excel merges across headerGrid
  merges.forEach((m) => {
    // Check if merge overlaps with header block
    const mStartR = Math.max(m.s.r, bestHeaderStart);
    const mEndR = Math.min(m.e.r, bestHeaderEnd);
    if (mStartR <= mEndR) {
      const originalVal = raw2D[m.s.r]?.[m.s.c];
      const valStr = originalVal !== undefined && originalVal !== null ? String(originalVal).trim() : '';
      if (valStr) {
        for (let r = mStartR; r <= mEndR; r++) {
          const gridR = r - bestHeaderStart;
          for (let c = m.s.c; c <= m.e.c && c < maxColCount; c++) {
            headerGrid[gridR][c] = valStr;
          }
        }
      }
    }
  });

  // Also apply heuristic horizontal merge propagation for sparse header rows
  // (e.g. when an Excel sheet has "Số học sinh" at c=2 and c=3, c=4 are blank, but row 2 has "Tổng số", "Nữ", "Dân tộc")
  for (let rIdx = 0; rIdx < numHeaderRows - 1; rIdx++) {
    let currentGroupVal = '';
    for (let c = 0; c < maxColCount; c++) {
      const val = headerGrid[rIdx][c];
      if (val) {
        currentGroupVal = val;
      } else {
        // If bottom row has distinct subheader text, propagate group value
        const bottomVal = headerGrid[numHeaderRows - 1][c];
        if (bottomVal && currentGroupVal) {
          headerGrid[rIdx][c] = currentGroupVal;
        } else if (!bottomVal) {
          currentGroupVal = '';
        }
      }
    }
  }

  // 4. Determine Actual Active Column Count
  // Find highest column index that has either header text or data
  let activeColCount = 0;
  for (let c = 0; c < maxColCount; c++) {
    const hasHeader = headerGrid.some((row) => row[c] && row[c].trim().length > 0);
    let hasData = false;
    for (let r = bestHeaderEnd + 1; r < Math.min(bestHeaderEnd + 20, raw2D.length); r++) {
      if (raw2D[r]?.[c] !== undefined && raw2D[r]?.[c] !== null && String(raw2D[r]?.[c]).trim() !== '') {
        hasData = true;
        break;
      }
    }
    if (hasHeader || hasData) {
      activeColCount = c + 1;
    }
  }
  if (activeColCount === 0) activeColCount = Math.max(1, maxColCount);

  // 5. Generate ReportColumn objects with Merged vs Unmerged distinction
  const generatedColumns: ReportColumn[] = [];
  const mergedGroupNamesSet = new Set<string>();

  for (let c = 0; c < activeColCount; c++) {
    // Collect all header values down this column
    const colHeaderValues: string[] = [];
    for (let rIdx = 0; rIdx < numHeaderRows; rIdx++) {
      const val = headerGrid[rIdx][c]?.trim();
      // Skip row if it's just column numbers like (1), (2), (3)
      if (val && !/^(\(?\d+\)?|\d+)$/.test(val)) {
        if (!colHeaderValues.includes(val)) {
          colHeaderValues.push(val);
        }
      }
    }

    let groupName = '';
    let subName = '';
    let displayName = '';
    let isMerged = false;

    if (colHeaderValues.length >= 2) {
      // It has both parent group (cột gộp) and sub-column!
      groupName = colHeaderValues[0];
      subName = colHeaderValues.slice(1).join(' - ');
      displayName = `${groupName} - ${subName}`;
      isMerged = true;
      mergedGroupNamesSet.add(groupName);
    } else if (colHeaderValues.length === 1) {
      // Check if neighboring columns share this top header value (horizontal span)
      const singleVal = colHeaderValues[0];
      const leftVal = c > 0 ? headerGrid[0][c - 1]?.trim() : '';
      const rightVal = c < activeColCount - 1 ? headerGrid[0][c + 1]?.trim() : '';
      
      if ((leftVal && leftVal === singleVal) || (rightVal && rightVal === singleVal)) {
        groupName = singleVal;
        subName = `Cột ${c + 1}`;
        displayName = `${groupName} (${subName})`;
        isMerged = true;
        mergedGroupNamesSet.add(groupName);
      } else {
        // Truly standalone unmerged column (cột không gộp)
        groupName = '';
        subName = singleVal;
        displayName = singleVal;
        isMerged = false;
      }
    } else {
      // Empty header
      displayName = `Cột ${c + 1}`;
      subName = displayName;
      isMerged = false;
    }

    const lowerName = normalizeStr(displayName);
    const isNameOrTextCol =
      isPersonNameOrTextColumn(displayName) ||
      isPersonNameOrTextColumn(subName) ||
      isPersonNameOrTextColumn(groupName);

    // Detect column data type
    let colType: 'text' | 'number' | 'date' = 'text';

    if (isNameOrTextCol) {
      // CỘT HỌ VÀ TÊN & CỘT VĂN BẢN: BẮT BUỘC MẶC ĐỊNH LÀ KIỂU CHỮ (text), TUYỆT ĐỐI KHÔNG ĐỂ KIỂU SỐ
      colType = 'text';
    } else {
      // Sample data rows to check if predominantly numbers
      let sampleNumCount = 0;
      let sampleTotalCount = 0;
      for (let r = bestHeaderEnd + 1; r < Math.min(bestHeaderEnd + 30, raw2D.length); r++) {
        const val = raw2D[r]?.[c];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          sampleTotalCount++;
          const parsed = Number(String(val).replace(/[,. ]/g, ''));
          if (!isNaN(parsed) && String(val).trim() !== '') {
            sampleNumCount++;
          }
        }
      }

      const isPredominantlyNumeric = sampleTotalCount > 0 && sampleNumCount / sampleTotalCount >= 0.7;

      if (
        isPredominantlyNumeric ||
        lowerName.includes('so luong') ||
        lowerName.includes('tong so') ||
        lowerName.includes('so tien') ||
        lowerName.includes('tien') ||
        lowerName.includes('kinh phi') ||
        lowerName.includes('muc thu') ||
        lowerName.includes('dong') ||
        lowerName.includes('chieu cao') ||
        lowerName.includes('can nang') ||
        lowerName === 'so hs' ||
        lowerName.includes('so hs') ||
        lowerName.includes('so hoc sinh') ||
        lowerName === 'nu' ||
        lowerName === 'nam' ||
        lowerName === 'stt' ||
        lowerName === 'tt' ||
        lowerName.includes('da nop') ||
        lowerName.includes('chua nop') ||
        lowerName.includes('da thu') ||
        lowerName.includes('con thieu') ||
        lowerName.includes('ti le') ||
        lowerName.includes('%')
      ) {
        colType = 'number';
      } else {
        colType = 'text';
      }
    }

    // Detect Identifier column (Lớp, Họ và tên, STT...)
    const isIdCol =
      isNameOrTextCol ||
      lowerName === 'lop' ||
      lowerName.includes('lop ') ||
      lowerName === 'stt' ||
      lowerName === 'tt' ||
      lowerName.includes('don vi') ||
      lowerName.includes('ten truong');

    // TẤT CẢ các cột trên file Excel (cả cột gộp lẫn cột không gộp, gồm Lớp, Họ và tên, Ghi chú, và các cột con)
    // đều PHẢI ĐƯỢC TẠO FORM ĐẦY ĐỦ (isInputField = true).
    // Chỉ duy nhất cột số thứ tự thuần túy (STT/TT) là không bắt buộc nhập liệu thủ công trong form.
    const isPureStt = lowerName === 'stt' || lowerName === 'tt' || lowerName === 'so thu tu';
    const isInputField = !isPureStt;

    generatedColumns.push({
      id: `col_${c}`,
      name: displayName,
      groupName: groupName || undefined,
      subName: subName || displayName,
      isMerged,
      type: colType,
      required: isIdCol || colType === 'number',
      isIdentifier: isIdCol,
      isInputField,
      description: isInputField ? (groupName ? `[${groupName}] Điền ${subName}` : `Điền ${displayName}`) : undefined
    });
  }

  // 6. Generate Data Rows starting AFTER headerEndRow
  const dataStartRow = bestHeaderEnd + 1;
  const generatedRows: ReportRow[] = [];

  for (let r = dataStartRow; r < raw2D.length; r++) {
    const row = raw2D[r];
    if (!Array.isArray(row)) continue;

    // Check if row has any non-empty data
    const hasAnyVal = row.some((val) => val !== undefined && val !== null && String(val).trim() !== '');
    if (!hasAnyVal) continue;

    // Check if row is a total/footer row (e.g. "Cộng", "Tổng cộng")
    const firstCellText = normalizeStr(row[0] || row[1] || '');
    const isSummaryRow = firstCellText.startsWith('tong cong') || firstCellText.startsWith('cong') || firstCellText.startsWith('tong so');

    const rowObj: ReportRow = {
      id: `row_${r}`
    };

    generatedColumns.forEach((col, cIdx) => {
      rowObj[col.id] = row[cIdx] !== undefined ? row[cIdx] : '';
    });

    // Check row completeness for required input fields
    const isComplete = generatedColumns
      .filter((col) => col.isInputField && col.required)
      .every((col) => rowObj[col.id] !== undefined && rowObj[col.id] !== null && String(rowObj[col.id]).trim() !== '');

    rowObj._isComplete = isComplete;
    generatedRows.push(rowObj);
  }

  return {
    columns: generatedColumns,
    rows: generatedRows,
    headerStartRow: bestHeaderStart,
    headerEndRow: bestHeaderEnd,
    hasMergedHeaders: mergedGroupNamesSet.size > 0,
    mergedGroupNames: Array.from(mergedGroupNamesSet)
  };
}

/**
 * AI Header & Form Structure Enhancement via Gemini API
 * Scans the extracted headers and ensures all merged groups (cột gộp) and unmerged columns (cột không gộp)
 * are completely included in the input form, with Họ và tên default to text.
 */
export async function aiEnhanceExcelReportForm(
  sheetTitle: string,
  columns: ReportColumn[],
  sampleRows: ReportRow[]
): Promise<ReportColumn[]> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    // Return robust parsed columns directly if no API key
    return columns.map((col) => {
      const isName = isPersonNameOrTextColumn(col.name) || isPersonNameOrTextColumn(col.subName || '');
      const isPureStt = normalizeStr(col.name) === 'stt' || normalizeStr(col.name) === 'tt';
      return {
        ...col,
        type: isName ? 'text' : col.type,
        isInputField: !isPureStt
      };
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const previewData = {
      title: sheetTitle,
      columns: columns.map((c) => ({
        id: c.id,
        rawName: c.name,
        groupName: c.groupName,
        subName: c.subName,
        isMerged: c.isMerged,
        detectedType: c.type
      })),
      sampleRow: sampleRows[0] ? sampleRows[0] : {}
    };

    const prompt = `Bạn là chuyên gia phân tích biểu mẫu báo cáo số liệu giáo dục từ file Excel của trường học Việt Nam.
Tôi có các cột trích xuất từ file Excel (bao gồm Cột gộp - Merged Headers và Cột không gộp - Standalone Columns).

Dữ liệu đầu vào:
${JSON.stringify(previewData, null, 2)}

NHIỆM VỤ QUAN TRỌNG BẮT BUỘC TUÂN THỦ:
1. TẠO FORM NHẬP LIỆU ĐẦY ĐỦ CHO TẤT CẢ CÁC CỘT:
   - TẤT CẢ các cột từ file Excel (cả Cột gộp - Merged Columns lẫn Cột không gộp / Cột độc lập - Unmerged Columns) đều phải được đưa đầy đủ vào Form nhập liệu.
   - BẮT BUỘC đặt "isInputField": true cho TẤT CẢ các cột (Lớp, Họ và tên, các cột gộp con, các cột số liệu, ghi chú), chỉ trừ duy nhất cột "STT" nếu là số thứ tự dòng tự động.
   - Tuyệt đối không được bỏ sót hoặc ẩn bất kỳ cột nào trong danh sách.

2. QUY ĐỊNH BẮT BUỘC VỀ KIỂU DỮ LIỆU CỘT HỌ VÀ TÊN:
   - Cột "Họ và tên" (và tất cả biến thể như: Họ tên, Tên học sinh, Họ và tên giáo viên, Họ tên GVCN, Họ tên người nộp, Họ và tên CB/NV, Họ tên cha/mẹ, Lớp, Ghi chú, Địa chỉ,...) BẮT BUỘC PHẢI CÓ "type": "text" (kiểu chữ), TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỂ "type": "number" (kiểu số).
   - Chỉ những cột đo đếm số liệu (Số lượng, Đã nộp, Chưa nộp, Số tiền, Tỷ lệ,...) mới có "type": "number".

3. CHUẨN HÓA TÊN CỘT & CỘT GỘP:
   - Với Cột gộp (isMerged = true): Giữ groupName rõ ràng (ví dụ: "Số học sinh", "BHYT", "Khen thưởng") và subName súc tích (ví dụ: "Tổng số", "Nữ", "Dân tộc", "Đã nộp").
   - Với Cột không gộp (isMerged = false): Giữ tên chuẩn (ví dụ: "STT", "Lớp", "Họ và tên", "Ghi chú").
4. Đánh dấu chính xác isIdentifier: Cột dùng để định danh đối tượng (Lớp, Họ và tên).
5. Viết description gợi ý điền ngắn gọn, thân thiện.

Hãy trả về DUY NHẤT một mảng JSON các cột theo định dạng:
[
  {
    "id": "col_0",
    "name": "Tên đầy đủ hiển thị",
    "groupName": "Tên nhóm gộp nếu có hoặc để trống",
    "subName": "Tên cột con nếu có",
    "isMerged": true/false,
    "type": "text" | "number",
    "required": true/false,
    "isIdentifier": true/false,
    "isInputField": true/false,
    "description": "Gợi ý điền"
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text?.trim() || '';
    if (!responseText) {
      return columns.map((col) => {
        const isName = isPersonNameOrTextColumn(col.name) || isPersonNameOrTextColumn(col.subName || '');
        const isPureStt = normalizeStr(col.name) === 'stt' || normalizeStr(col.name) === 'tt';
        return {
          ...col,
          type: isName ? 'text' : col.type,
          isInputField: !isPureStt
        };
      });
    }

    const parsedAiCols: any[] = JSON.parse(responseText);
    if (!Array.isArray(parsedAiCols) || parsedAiCols.length === 0) {
      return columns.map((col) => {
        const isName = isPersonNameOrTextColumn(col.name) || isPersonNameOrTextColumn(col.subName || '');
        const isPureStt = normalizeStr(col.name) === 'stt' || normalizeStr(col.name) === 'tt';
        return {
          ...col,
          type: isName ? 'text' : col.type,
          isInputField: !isPureStt
        };
      });
    }

    // Merge AI suggestions with existing columns, enforcing all requirements strictly
    return columns.map((col) => {
      const match = parsedAiCols.find((aiCol) => aiCol.id === col.id);
      const finalName = match?.name || col.name;
      const finalSub = match?.subName !== undefined ? match.subName : col.subName;
      const finalGroup = match?.groupName !== undefined ? match.groupName : col.groupName;

      // 1. Enforce Text Type for Person Name columns (Họ và tên, Họ tên, Tên,...)
      const isNameOrText =
        isPersonNameOrTextColumn(finalName) ||
        isPersonNameOrTextColumn(finalSub || '') ||
        isPersonNameOrTextColumn(finalGroup || '') ||
        isPersonNameOrTextColumn(col.name);

      let finalType: 'text' | 'number' | 'select' | 'date' = col.type;
      if (isNameOrText) {
        finalType = 'text'; // Cột họ và tên BẮT BUỘC LÀ KIỂU CHỮ
      } else if (match?.type === 'number' || match?.type === 'text') {
        finalType = match.type;
      }

      // 2. Enforce Form completeness: both merged columns & unmerged columns must be in Form
      const isPureStt = normalizeStr(finalName) === 'stt' || normalizeStr(finalName) === 'tt';
      let finalIsInputField = true;
      if (isPureStt) {
        finalIsInputField = false;
      } else if (match?.isInputField !== undefined) {
        finalIsInputField = Boolean(match.isInputField);
      } else {
        finalIsInputField = true;
      }

      // Safeguard: Ensure Họ và tên, Lớp, merged columns and unmerged data columns are NEVER omitted
      if (!isPureStt && (isNameOrText || col.isMerged || !col.groupName)) {
        finalIsInputField = true;
      }

      return {
        ...col,
        name: finalName,
        groupName: finalGroup,
        subName: finalSub,
        isMerged: match?.isMerged !== undefined ? Boolean(match.isMerged) : col.isMerged,
        type: finalType,
        required: match?.required !== undefined ? Boolean(match.required) : col.required,
        isIdentifier: match?.isIdentifier !== undefined ? Boolean(match.isIdentifier) : col.isIdentifier,
        isInputField: finalIsInputField,
        description: match?.description || col.description
      };
    });
  } catch (e) {
    console.warn('AI header enhancement notice (using robust algorithmic fallback):', e);
    return columns.map((col) => {
      const isName = isPersonNameOrTextColumn(col.name) || isPersonNameOrTextColumn(col.subName || '');
      const isPureStt = normalizeStr(col.name) === 'stt' || normalizeStr(col.name) === 'tt';
      return {
        ...col,
        type: isName ? 'text' : col.type,
        isInputField: !isPureStt
      };
    });
  }
}

/**
 * Checks if a column represents a person's name or text field
 * (Họ và tên, Họ tên, Tên HS, Tên GV, Họ và tên GVCN, Lớp, Ghi chú...)
 * Always returns true for any variant of "Họ và tên".
 */
export function isPersonNameOrTextColumn(colName: string): boolean {
  if (!colName) return false;
  // Normalize accents and punctuation
  const lower = colName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[&/\\#,+()$~%.'":*?<>{}_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Primary list of name & text identifiers
  const textKeywords = [
    'ho va ten',
    'ho ten',
    'ho ten hoc sinh',
    'ho ten hs',
    'ho ten gv',
    'ho va chu lot',
    'ho va chu dem',
    'ho dem',
    'ho chu lot',
    'ten hoc sinh',
    'ten hs',
    'ten giao vien',
    'ten gv',
    'ten gvcn',
    'ten can bo',
    'ten cb',
    'ten phu huynh',
    'ten cha',
    'ten me',
    'ten nguoi nhan',
    'nguoi nop',
    'nguoi nhan',
    'giao vien',
    'gvcn',
    'can bo',
    'vien chuc',
    'hoc sinh',
    'phu huynh',
    'dia chi',
    'ghi chu',
    'nhan xet',
    'ly do',
    'lop',
    'khoi',
    'to chuyen mon',
    'to bo mon',
    'truong',
    'don vi',
    'chuc vu',
    'so dien thoai',
    'sdt',
    'dien thoai',
    'email'
  ];

  if (textKeywords.some((kw) => lower === kw || lower.includes(kw))) {
    return true;
  }

  // Check if contains "ho" and "ten" or just "ten" (excluding "tien" which is money)
  const words = lower.split(' ');
  if (
    (words.includes('ho') && words.includes('ten')) ||
    words.includes('fullname') ||
    words.includes('name')
  ) {
    return true;
  }

  // Exact single words
  if (lower === 'ho' || lower === 'ten') {
    return true;
  }

  return false;
}

export type FormFieldBlock =
  | { type: 'standalone_group'; columns: ReportColumn[] }
  | { type: 'merged_group'; groupName: string; columns: ReportColumn[] };

/**
 * Groups consecutive columns that share the same groupName together
 * and consecutive standalone columns together, while strictly preserving
 * the left-to-right natural sequence of columns from the report.
 */
export function getOrderedFormFieldBlocks(columns: ReportColumn[]): FormFieldBlock[] {
  const blocks: FormFieldBlock[] = [];
  let currentMerged: { groupName: string; columns: ReportColumn[] } | null = null;
  let currentStandalone: ReportColumn[] = [];

  for (const col of columns) {
    if (col.groupName && col.groupName.trim() !== '') {
      if (currentStandalone.length > 0) {
        blocks.push({ type: 'standalone_group', columns: [...currentStandalone] });
        currentStandalone = [];
      }
      if (currentMerged && currentMerged.groupName === col.groupName) {
        currentMerged.columns.push(col);
      } else {
        if (currentMerged) {
          blocks.push({ type: 'merged_group', ...currentMerged });
        }
        currentMerged = { groupName: col.groupName, columns: [col] };
      }
    } else {
      if (currentMerged) {
        blocks.push({ type: 'merged_group', ...currentMerged });
        currentMerged = null;
      }
      currentStandalone.push(col);
    }
  }

  if (currentStandalone.length > 0) {
    blocks.push({ type: 'standalone_group', columns: [...currentStandalone] });
  }
  if (currentMerged) {
    blocks.push({ type: 'merged_group', ...currentMerged });
  }

  return blocks;
}
