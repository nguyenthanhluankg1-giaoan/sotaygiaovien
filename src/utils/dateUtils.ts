/**
 * dateUtils.ts - Tiện ích xử lý tuần và ngày tháng cho Kế hoạch dạy học
 */

export function parseDate(dateStr: string): Date {
  // Supports YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

export function formatDateVN(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Tính ngày Thứ Hai của tuần thứ `weekNumber` dựa trên ngày bắt đầu tuần 1
 * và các mốc tùy chỉnh ngày theo tuần (VD: sau khi nghỉ Tết, nghỉ lễ)
 */
export function getMondayOfWeek(
  startDateWeek1Str: string,
  weekNumber: number,
  weekStartOverrides?: Record<number, string>
): Date {
  let baseWeekNumber = 1;
  let baseDateStr = startDateWeek1Str || '2024-09-09';

  if (weekStartOverrides) {
    // Tìm tuần tùy chỉnh lớn nhất trong danh sách mà <= weekNumber
    const overrideWeeks = Object.keys(weekStartOverrides)
      .map(Number)
      .filter((w) => !isNaN(w) && w <= weekNumber && Boolean(weekStartOverrides[w]))
      .sort((a, b) => b - a);

    if (overrideWeeks.length > 0) {
      baseWeekNumber = overrideWeeks[0];
      baseDateStr = weekStartOverrides[baseWeekNumber];
    }
  }

  const baseDate = parseDate(baseDateStr);
  const day = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const baseMonday = new Date(baseDate);
  baseMonday.setDate(baseDate.getDate() + diffToMonday);

  // Tính tịnh tiến liền kề: (weekNumber - baseWeekNumber) * 7 ngày
  const monday = new Date(baseMonday);
  monday.setDate(baseMonday.getDate() + (weekNumber - baseWeekNumber) * 7);
  return monday;
}

/**
 * Lấy khoảng ngày từ Thứ Hai đến Thứ Sáu của tuần thứ `weekNumber`
 */
export function getWeekDateRange(
  startDateWeek1Str: string,
  weekNumber: number,
  weekStartOverrides?: Record<number, string>
): { startDate: string; endDate: string; mondayDate: Date; fridayDate: Date } {
  const monday = getMondayOfWeek(startDateWeek1Str, weekNumber, weekStartOverrides);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    startDate: formatDateVN(monday),
    endDate: formatDateVN(friday),
    mondayDate: monday,
    fridayDate: friday
  };
}

/**
 * Lấy ngày dạng DD/MM/YYYY cho thứ cụ thể trong tuần (2 = Thứ Hai, ..., 6 = Thứ Sáu, 7 = Thứ Bảy)
 */
export function getDateForDayOfWeek(
  startDateWeek1Str: string,
  weekNumber: number,
  dayOfWeek: number,
  weekStartOverrides?: Record<number, string>
): string {
  const monday = getMondayOfWeek(startDateWeek1Str, weekNumber, weekStartOverrides);
  // dayOfWeek: 2 = Mon (offset 0), 3 = Tue (offset 1), ..., 7 = Sat (offset 5)
  const offset = Math.max(0, dayOfWeek - 2);
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + offset);
  return formatDateVN(targetDate);
}

export function getDayOfWeekName(dayOfWeek: number): string {
  if (isNaN(dayOfWeek)) return 'Thứ Hai';
  switch (dayOfWeek) {
    case 2:
      return 'Thứ Hai';
    case 3:
      return 'Thứ Ba';
    case 4:
      return 'Thứ Tư';
    case 5:
      return 'Thứ Năm';
    case 6:
      return 'Thứ Sáu';
    case 7:
      return 'Thứ Bảy';
    default:
      return `Thứ ${dayOfWeek}`;
  }
}

/**
 * Làm sạch tên hoạt động: Loại bỏ từ "Khoảng" và tránh lặp lại số phút
 */
export function formatCleanActivityTitle(activityName: string, timeEstimate?: string): string {
  let cleanName = (activityName || '')
    .replace(/khoảng\s*/gi, '')
    .replace(/\s*-\s*Tiết\s*\d+/gi, '')
    .trim();

  if (/\(\d+\s*phút\)/i.test(cleanName)) {
    return cleanName;
  }

  let cleanTime = (timeEstimate || '').replace(/khoảng\s*/gi, '').trim();
  if (cleanTime) {
    const formattedTime = cleanTime.startsWith('(') ? cleanTime : `(${cleanTime})`;
    return `${cleanName} ${formattedTime}`;
  }

  return cleanName;
}

/**
 * Rút gọn các từ khóa tích hợp theo yêu cầu người dùng:
 * - TÍCH HỢP NĂNG LỰC SỐ (CV 3456) / NĂNG LỰC SỐ -> NLS
 * - TÍCH HỢP CÔNG DÂN SỐ / CÔNG DÂN SỐ / Chuyển đổi số -> CĐS
 * - TÍCH HỢP GIÁO DỤC STEM / GIÁO DỤC STEM -> STEM
 * - Kỹ năng sống -> KNS, Quốc phòng an ninh -> GDQPAN, Bảo vệ môi trường -> BVTMT
 */
export function abbreviateIntegrationText(text: string): string {
  if (!text) return '';
  let result = text
    .replace(/TÍCH HỢP NĂNG LỰC SỐ\s*\(CV\s*3456\)/gi, 'Tích hợp NLS')
    .replace(/TÍCH HỢP NĂNG LỰC SỐ/gi, 'Tích hợp NLS')
    .replace(/NĂNG LỰC SỐ\s*\(CV\s*3456\)/gi, 'NLS (CV 3456)')
    .replace(/NĂNG LỰC SỐ/gi, 'NLS')
    .replace(/TÍCH HỢP CÔNG DÂN SỐ\s*\(CV\s*3899[^)]*\)/gi, 'Tích hợp CĐS')
    .replace(/TÍCH HỢP CÔNG DÂN SỐ/gi, 'Tích hợp CĐS')
    .replace(/CÔNG DÂN SỐ/gi, 'CĐS')
    .replace(/CHUYỂN ĐỔI SỐ/gi, 'CĐS')
    .replace(/TÍCH HỢP GIÁO DỤC STEM\s*\(CV\s*909[^)]*\)/gi, 'Tích hợp STEM')
    .replace(/TÍCH HỢP GIÁO DỤC STEM/gi, 'Tích hợp STEM')
    .replace(/GIÁO DỤC STEM/gi, 'STEM')
    .replace(/KĨ NĂNG SỐNG|KỸ NĂNG SỐNG/gi, 'KNS')
    .replace(/QUỐC PHÒNG VÀ AN NINH|GIÁO DỤC QUỐC PHÒNG VÀ AN NINH/gi, 'GDQPAN')
    .replace(/BẢO VỆ MÔI TRƯỜNG/gi, 'BVTMT');
  return result;
}

