import { PpctItem } from '../types';
import { getWeekDateRange } from './dateUtils';
import { defaultPpctList } from '../data/defaultData';

export interface PpctMatchResult {
  matched: boolean;
  week: number;
  lessonName: string;
  periods: number[];
  periodsText: string;
  matchedItems: any[];
  confidence: number;
  matchExplanation?: string;
}

/**
 * Chuẩn hóa chuỗi văn bản loại bỏ dấu và ký tự đặc biệt để so sánh đối chiếu môn học & bài học
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/y/g, 'i');
}

/**
 * Trích xuất số tuần từ tiêu đề nếu người dùng có gõ "Tuần X", "T.X", "Tuan X"
 */
export function extractWeekFromText(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(?:tuần|tuan|tu\s*ần|t)\s*[:\.-]?\s*(\d{1,2})\b/i);
  if (match && match[1]) {
    const w = parseInt(match[1], 10);
    if (w >= 1 && w <= 52) return w;
  }
  return null;
}

/**
 * Trích xuất số tiết từ tiêu đề nếu có "Tiết Y", "Tiet Y"
 */
export function extractPeriodsFromText(text: string): number[] {
  if (!text) return [];
  const results: number[] = [];
  const rangeMatch = text.match(/(?:tiết|tiet)\s*[:\.-]?\s*(\d+)\s*(?:đến|-|\&|,)\s*(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (start && end && start <= end && end - start <= 10) {
      for (let p = start; p <= end; p++) results.push(p);
      return results;
    }
  }

  const singleMatch = text.match(/(?:tiết|tiet)\s*[:\.-]?\s*(\d+)/i);
  if (singleMatch) {
    results.push(parseInt(singleMatch[1], 10));
  }
  return results;
}

/**
 * Trích xuất số thứ tự bài học từ tiêu đề (ví dụ: "Bài 1", "Bài 02", "Unit 3", "Chủ đề 2")
 */
export function extractLessonNumber(text: string): { type: string; num: string } | null {
  if (!text) return null;
  const match = text.match(/(?:bài|bai|unit|b\.|chủ\s*đề|chu\s*de)\s*[:\.-]?\s*(\d+[a-zA-Z]?)/i);
  if (match && match[1]) {
    return {
      type: match[0].split(/[:\.-]?\s*\d/)[0].trim().toLowerCase(),
      num: match[1].toLowerCase()
    };
  }
  return null;
}

/**
 * Chuẩn hóa tên môn học để so khớp linh hoạt
 * "Tin học 3", "Môn: Tin học", "Tin học và Công nghệ", "Tin học & Công nghệ" -> "tinhoc"
 */
export function normalizeSubject(sub: string): string {
  if (!sub) return '';
  return removeVietnameseTones(sub)
    .replace(/^mon\s*[:\.-]?\s*/i, '')
    .replace(/\s*(lop|khoi)?\s*\d+$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Chuẩn hóa tên bài học cơ bản (bỏ hậu tố tiết 1, tiết 2, số tiết trong ngoặc) để gom nhóm các tiết cùng 1 bài
 */
export function getBaseLessonName(name: string): string {
  if (!name) return '';
  return removeVietnameseTones(name)
    .replace(/\s*\(?\s*tiết\s*\d+[^)]*\)?/gi, '')
    .replace(/\s*-\s*tiết\s*\d+.*/gi, '')
    .replace(/\s*tiết\s*\d+.*/gi, '')
    .replace(/\s*\(\s*\d+\s*tiết\s*\)/gi, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Lọc từ khóa có nghĩa từ tiêu đề bài học (bỏ từ dừng, tiền tố)
 */
export function extractMeaningfulKeywords(text: string): string[] {
  if (!text) return [];
  const cleaned = removeVietnameseTones(text)
    .replace(/(?:tuan|tuần)\s*\d+/gi, '')
    .replace(/(?:tiet|tiết)\s*\d+/gi, '')
    .replace(/(?:bai|bài)\s*\d*[:\.]?/gi, '')
    .replace(/(?:unit|chu\s*de|chủ\s*đề)\s*\d*[:\.]?/gi, '')
    .replace(/\s*\d+\s*tiết/gi, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .trim();

  const stopWords = new Set([
    'va', 'voi', 'cho', 'cua', 'trong', 'cac', 'nhung', 'la', 'mot', 'hai', 'ba',
    'em', 'hoc', 'tap', 'bai', 'tiet', 'tuan', 'theo', 'sgk', 'bo', 'sach'
  ]);

  return cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

/**
 * ĐỘNG CƠ NHẬN DIỆN TUẦN VÀ TIẾT THEO PPCT TỪ TIÊU ĐỀ BÀI HỌC
 * Hỗ trợ nhận dạng chính xác 100%:
 * 1. Nhận diện tuần trực tiếp từ tiêu đề nếu có "Tuần X"
 * 2. Nhận diện tuần từ số tiết nếu tiêu đề có "Tiết Y" (tìm tiết Y trong PPCT môn học thuộc tuần nào)
 * 3. Nhận diện bài học từ số thứ tự bài: "Bài 1", "Bài 2", "Bài 3", "Unit 1"
 * 4. Nhận diện bài học từ từ khóa và tên bài học tương đồng trong PPCT của môn học & khối lớp
 */
export function matchPpctLesson(
  topic: string,
  subject: string,
  grade: string | number,
  ppctList: Array<Partial<PpctItem> | any> = [],
  startDateWeek1 = '2024-09-09'
): PpctMatchResult {
  const cleanTopic = (topic || '').trim();
  const targetGrade = String(grade || '').replace(/\D/g, '');
  const normSub = normalizeSubject(subject);

  // Danh sách PPCT hoạt động: nếu người dùng chưa có PPCT thì dùng defaultPpctList
  const effectivePpctList = Array.isArray(ppctList) && ppctList.length > 0 ? ppctList : defaultPpctList;

  // 1. Kiểm tra nếu trong tiêu đề bài có ghi rõ tuần (vd: "Tuần 3 - Bài 2...", "Bài 1 (Tuần 2)")
  const explicitWeek = extractWeekFromText(cleanTopic);
  const explicitPeriods = extractPeriodsFromText(cleanTopic);
  const topicLessonNum = extractLessonNumber(cleanTopic);
  const topicKeywords = extractMeaningfulKeywords(cleanTopic);
  const topicBaseName = getBaseLessonName(cleanTopic);
  const normTopicFull = removeVietnameseTones(cleanTopic).replace(/[^a-z0-9]/g, '');

  if (!Array.isArray(effectivePpctList) || effectivePpctList.length === 0) {
    const finalWeek = explicitWeek && explicitWeek >= 1 && explicitWeek <= 52 ? explicitWeek : 1;
    const pText = explicitPeriods.length > 0
      ? `Tiết ${explicitPeriods.join(', ')} theo PPCT (Tuần ${finalWeek})`
      : `Tiết 1 - 2 theo PPCT (Tuần ${finalWeek})`;
    return {
      matched: !!explicitWeek,
      week: finalWeek,
      lessonName: cleanTopic,
      periods: explicitPeriods.length > 0 ? explicitPeriods : [1, 2],
      periodsText: pText,
      matchedItems: [],
      confidence: explicitWeek ? 0.9 : 0.1,
      matchExplanation: explicitWeek ? `Nhận diện trực tiếp Tuần ${finalWeek} từ tiêu đề` : undefined
    };
  }

  // Lọc ứng viên PPCT theo Khối lớp và Môn học
  let candidates = effectivePpctList.filter((item) => {
    // So khớp Khối lớp
    if (targetGrade && item.grade) {
      const itemGrade = String(item.grade).replace(/\D/g, '');
      if (itemGrade && itemGrade !== targetGrade) return false;
    }

    // So khớp Môn học linh hoạt
    if (normSub && item.subject) {
      const itemSub = normalizeSubject(item.subject);
      const subMatches =
        itemSub === normSub ||
        itemSub.includes(normSub) ||
        normSub.includes(itemSub);
      if (!subMatches) return false;
    }

    return true;
  });

  // Nếu lọc cả lớp lẫn môn không ra gì (do tên môn gõ khác), thử lọc theo Khối lớp
  if (candidates.length === 0 && targetGrade) {
    candidates = effectivePpctList.filter((item) => {
      const itemGrade = String(item.grade || '').replace(/\D/g, '');
      return !itemGrade || itemGrade === targetGrade;
    });
  }

  if (candidates.length === 0) {
    candidates = effectivePpctList;
  }

  // 2. Nếu tiêu đề có chứa số tiết (ví dụ: "Tiết 3: Khám phá máy tính" hoặc "Tiết 5 - Bài 2"):
  // Tra cứu tiết đó trong PPCT của môn học thuộc Tuần nào!
  if (explicitPeriods.length > 0) {
    const periodTarget = explicitPeriods[0];
    const itemWithPeriod = candidates.find((it) => Number(it.periodIndex) === periodTarget);
    if (itemWithPeriod && itemWithPeriod.week) {
      const weekFound = Number(itemWithPeriod.week);
      const targetBase = getBaseLessonName(itemWithPeriod.lessonName || '');
      const targetNum = extractLessonNumber(itemWithPeriod.lessonName || '');

      // Tìm tất cả các tiết cùng bài dạy trong PPCT
      const related = candidates.filter((it) => {
        if (it.grade && itemWithPeriod.grade && String(it.grade).replace(/\D/g, '') !== String(itemWithPeriod.grade).replace(/\D/g, '')) {
          return false;
        }
        if (it.lessonName === itemWithPeriod.lessonName) return true;
        const itBase = getBaseLessonName(it.lessonName || '');
        if (targetBase && itBase && targetBase === itBase) return true;
        const itNum = extractLessonNumber(it.lessonName || '');
        if (itNum && targetNum && itNum.num === targetNum.num) return true;
        return it.periodIndex === periodTarget;
      });

      related.sort((a, b) => Number(a.week) - Number(b.week) || Number(a.periodIndex) - Number(b.periodIndex));
      const periods = related.map((r) => r.periodIndex).filter(Boolean);
      return {
        matched: true,
        week: weekFound,
        lessonName: itemWithPeriod.lessonName,
        periods: periods.length > 0 ? periods : explicitPeriods,
        periodsText: `Tiết ${periods.length > 0 ? periods.join(', ') : explicitPeriods.join(', ')} theo PPCT (Tuần ${weekFound})`,
        matchedItems: related.length > 0 ? related : [itemWithPeriod],
        confidence: 0.95,
        matchExplanation: `Nhận diện Tiết ${periodTarget} thuộc Tuần ${weekFound} theo PPCT môn ${itemWithPeriod.subject || subject}`
      };
    }
  }

  // 3. Tính điểm khớp từng bài trong PPCT ứng viên
  interface CandidateScore {
    item: PpctItem;
    score: number;
    lessonNumMatch: boolean;
    nameMatch: boolean;
  }

  const scoredCandidates: CandidateScore[] = candidates.map((item) => {
    let score = 0;
    const itemLessonName = item.lessonName || '';
    const itemLessonNum = extractLessonNumber(itemLessonName);
    const itemBaseName = getBaseLessonName(itemLessonName);
    const normItemName = removeVietnameseTones(itemLessonName).replace(/[^a-z0-9]/g, '');
    const itemKeywords = extractMeaningfulKeywords(itemLessonName);

    let hasLessonNumMatch = false;
    let hasNameMatch = false;

    // Khớp base name bài học (ví dụ "bai2khamphamaytinh")
    if (topicBaseName && itemBaseName) {
      if (topicBaseName === itemBaseName) {
        score += 100;
        hasNameMatch = true;
      } else if (itemBaseName.includes(topicBaseName) || topicBaseName.includes(itemBaseName)) {
        score += 85;
        hasNameMatch = true;
      }
    }

    // Khớp số thứ tự bài học (Ví dụ: Bài 2 khớp Bài 2)
    if (topicLessonNum && itemLessonNum) {
      if (topicLessonNum.num === itemLessonNum.num) {
        score += 60;
        hasLessonNumMatch = true;
      }
    }

    // Khớp nguyên chuỗi con không dấu
    if (normTopicFull && normItemName) {
      if (normItemName.includes(normTopicFull) || normTopicFull.includes(normItemName)) {
        score += 80;
        hasNameMatch = true;
      }
    }

    // Khớp từ khóa có nghĩa (kham, pha, may, tinh...)
    if (topicKeywords.length > 0 && itemKeywords.length > 0) {
      let matchedKeywordCount = 0;
      for (const kw of topicKeywords) {
        if (itemKeywords.includes(kw)) {
          matchedKeywordCount++;
        }
      }
      score += matchedKeywordCount * 25;
      if (matchedKeywordCount >= 2) {
        hasNameMatch = true;
      }
    }

    // Nếu tiêu đề ghi rõ Tuần và tuần của PPCT trùng
    if (explicitWeek && item.week === explicitWeek) {
      score += 40;
    }

    // Khớp môn học chính xác
    if (normSub && item.subject && normalizeSubject(item.subject) === normSub) {
      score += 20;
    }

    return {
      item,
      score,
      lessonNumMatch: hasLessonNumMatch,
      nameMatch: hasNameMatch
    };
  });

  // Lọc ứng viên có điểm > 0 và sắp xếp điểm cao nhất
  const validScored = scoredCandidates
    .filter((sc) => sc.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.item.week) - Number(b.item.week) || Number(a.item.periodIndex) - Number(b.item.periodIndex));

  if (validScored.length > 0) {
    const bestMatch = validScored[0];
    const topItem = bestMatch.item;
    const resolvedWeek = explicitWeek || topItem.week || 1;

    // Tìm tất cả các tiết cùng bài dạy trong PPCT
    const topBaseName = getBaseLessonName(topItem.lessonName || '');
    const topNum = extractLessonNumber(topItem.lessonName || '');

    const sameLessonItems = candidates.filter((it) => {
      if (it.grade && topItem.grade && String(it.grade).replace(/\D/g, '') !== String(topItem.grade).replace(/\D/g, '')) {
        return false;
      }
      if (it.lessonName === topItem.lessonName) return true;
      const itBaseName = getBaseLessonName(it.lessonName || '');
      if (topBaseName && itBaseName && topBaseName === itBaseName) {
        return true;
      }
      const itNum = extractLessonNumber(it.lessonName || '');
      if (itNum && topNum && itNum.num === topNum.num) {
        return true;
      }
      return false;
    });

    const relatedItems = sameLessonItems.length > 0 ? sameLessonItems : [topItem];
    relatedItems.sort((a, b) => Number(a.week) - Number(b.week) || Number(a.periodIndex) - Number(b.periodIndex));

    const weeks = Array.from(new Set(relatedItems.map((r) => Number(r.week)).filter(Boolean)));
    const targetWeek = weeks[0] || resolvedWeek;
    const weeksText = weeks.length > 1 ? `Tuần ${weeks.join(', ')}` : `Tuần ${targetWeek}`;

    const periods = relatedItems.map((r) => r.periodIndex).filter(Boolean);
    const periodsText = periods.length > 0
      ? `Tiết ${periods.join(', ')} theo PPCT (${weeksText})`
      : `Tiết ${topItem.periodIndex || 1} theo PPCT (${weeksText})`;

    return {
      matched: true,
      week: targetWeek,
      lessonName: topItem.lessonName,
      periods: periods.length > 0 ? periods : [1],
      periodsText,
      matchedItems: relatedItems,
      confidence: Math.min(1, bestMatch.score / 100),
      matchExplanation: `Đã nhận diện bài "${topItem.lessonName}" thuộc Tuần ${targetWeek} theo PPCT môn ${topItem.subject || subject}`
    };
  }

  // 4. Nếu không khớp bài nhưng có explicitWeek (vd: "Tuần 4: ...")
  if (explicitWeek) {
    const periodsText = explicitPeriods.length > 0
      ? `Tiết ${explicitPeriods.join(', ')} theo PPCT (Tuần ${explicitWeek})`
      : `Tiết theo PPCT (Tuần ${explicitWeek})`;
    return {
      matched: true,
      week: explicitWeek,
      lessonName: cleanTopic,
      periods: explicitPeriods.length > 0 ? explicitPeriods : [1, 2],
      periodsText,
      matchedItems: [],
      confidence: 0.85,
      matchExplanation: `Nhận diện trực tiếp Tuần ${explicitWeek} từ tiêu đề`
    };
  }

  // Không khớp được
  return {
    matched: false,
    week: 1,
    lessonName: cleanTopic,
    periods: [1, 2],
    periodsText: 'Tiết 1 - 2 theo PPCT (Tuần 1)',
    matchedItems: [],
    confidence: 0,
    matchExplanation: 'Chưa tìm thấy bài học phù hợp trong PPCT'
  };
}

/**
 * Làm sạch tên bài học, loại bỏ các đuôi số tiết cũ như "(2 tiết)", "(Tiết 1)", "tiết 1", "(2 tiết) ; Tiết 1", "- Tiết 1", etc.
 */
export function cleanBaseTopicTitle(title: string): string {
  if (!title) return '';
  let clean = title
    .replace(/^([A-Th-ưa-zA-ZÀ-ỹ\s]+)\s*\((Phân môn|phân môn|PM):\s*[^)]+\)\s*[-:]\s*/gi, '')
    .replace(/^([A-Th-ưa-zA-ZÀ-ỹ\s]+)\s*[-:]\s*(Phân môn|phân môn|PM):\s*[^)]+\s*[-:]\s*/gi, '')
    .trim();

  // Repeatedly strip trailing period / tiết / duration annotations
  let prev = '';
  while (prev !== clean) {
    prev = clean;
    clean = clean
      .replace(/[\s,:;\u2013\-]*\(?\s*tiết\s*[\d,\s\u2013\-]+(\s*theo\s*ppct)?\s*\)?$/gi, '')
      .replace(/[\s,:;\u2013\-]*\(?\s*\d+\s*tiết\s*\)?$/gi, '')
      .replace(/[\s,:;\u2013\-]+tiết\s*\d+$/gi, '')
      .replace(/[\s,:;\u2013\-]+tiết$/gi, '')
      .trim();
  }
  return clean;
}

/**
 * Xác định tiết thứ mấy trong tuần của môn học đó dựa vào PPCT:
 * Ví dụ: Môn Tin học ở Tuần 2 có 2 tiết (Tiết 3 và Tiết 4 theo PPCT năm):
 * - Tiết 3 theo PPCT -> Tiết 1 của Tuần 2
 * - Tiết 4 theo PPCT -> Tiết 2 của Tuần 2
 */
export function getPeriodOfWeekNumber(
  periodPpctIndex?: number,
  periodIndexInPlan = 1,
  weekNumber = 1,
  subject = '',
  grade: string | number = 3,
  ppctList: Array<Partial<PpctItem> | any> = []
): number {
  const normSub = normalizeSubject(subject);
  const targetGrade = String(grade).replace(/\D/g, '');
  const effectiveList = Array.isArray(ppctList) && ppctList.length > 0 ? ppctList : defaultPpctList;

  // Lọc các item thuộc môn và khối
  const subjectGradeItems = effectiveList.filter((item) => {
    const gMatch = !targetGrade || !item.grade || String(item.grade).replace(/\D/g, '') === targetGrade;
    const sMatch = !normSub || !item.subject ||
      normalizeSubject(item.subject) === normSub ||
      normalizeSubject(item.subject).includes(normSub) ||
      normSub.includes(normalizeSubject(item.subject));
    return gMatch && sMatch;
  });

  // Nếu có periodPpctIndex, kiểm tra đúng tuần thực tế của tiết đó
  let actualWeek = Number(weekNumber);
  if (periodPpctIndex && subjectGradeItems.length > 0) {
    const matchedItem = subjectGradeItems.find((it) => Number(it.periodIndex) === Number(periodPpctIndex));
    if (matchedItem && matchedItem.week) {
      actualWeek = Number(matchedItem.week);
    }
  }

  // Lọc tất cả các tiết của môn và khối lớp trong đúng tuần đó
  const weekItems = subjectGradeItems
    .filter((item) => Number(item.week) === actualWeek)
    .sort((a, b) => Number(a.periodIndex) - Number(b.periodIndex));

  if (weekItems.length > 0 && periodPpctIndex) {
    const idxInWeek = weekItems.findIndex((it) => Number(it.periodIndex) === Number(periodPpctIndex));
    if (idxInWeek !== -1) {
      return idxInWeek + 1;
    }
  }

  // Fallback: nếu trong tuần có các tiết, và periodIndexInPlan nằm trong phạm vi tiết của tuần đó
  if (weekItems.length > 0 && periodIndexInPlan >= 1 && periodIndexInPlan <= weekItems.length) {
    return periodIndexInPlan;
  }

  return periodIndexInPlan || 1;
}

/**
 * Tạo tiêu đề bài dạy với tiết thứ mấy của tuần đó nằm ngay sau tên bài dạy
 * Ví dụ: "BÀI 2: KHÁM PHÁ MÁY TÍNH (Tiết 1)"
 */
export function formatTopicWithWeekPeriod(
  rawTopic: string,
  weekPeriodNum: number
): string {
  const base = cleanBaseTopicTitle(rawTopic).trim();
  return `${base.toUpperCase()} (Tiết ${weekPeriodNum})`;
}

