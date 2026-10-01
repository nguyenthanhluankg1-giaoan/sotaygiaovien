import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Download,
  Printer,
  Trash2,
  FileText,
  Bookmark,
  UploadCloud,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  X,
  FileCode,
  ScanText,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Clock,
  ChevronDown,
  ListOrdered
} from 'lucide-react';
import { DetailedLessonPlan, PeriodPlan, SchoolConfig, UserAccount, PpctItem } from '../types';
import { exportDetailedLessonPlanToDocx } from '../utils/docxExport';
import { defaultSchoolConfig, defaultPpctList } from '../data/defaultData';
import { getWeekDateRange, formatCleanActivityTitle, abbreviateIntegrationText } from '../utils/dateUtils';
import { cleanLessonTitle, cleanSubSubjectLessonTitle } from '../utils/helpers';
import {
  loadLessonPlansFromFirestore,
  saveLessonPlansToFirestore,
  loadKhdhDataFromFirestore,
  getUserKhdhStorageKeys
} from '../services/dbService';
import { getStoredApiKey, saveStoredApiKey, clearStoredApiKey } from '../utils/apiKeyStorage';
import {
  analyzeLessonFileWithGemini,
  generateLessonPlanWithGemini,
  testGeminiApiKey
} from '../services/geminiService';
import {
  matchPpctLesson,
  extractWeekFromText,
  extractPeriodsFromText,
  getPeriodOfWeekNumber,
  formatTopicWithWeekPeriod,
  cleanBaseTopicTitle
} from '../utils/ppctMatcher';

interface UploadedFileInfo {
  name: string;
  size: number;
  type: string;
  base64: string;
  previewUrl?: string;
}

function safeParseJSON(rawText: string | null | undefined): any {
  if (!rawText) return null;
  const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonSub = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonSub);
      } catch {
        try {
          const sanitized = jsonSub
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, (m) => (m === '\n' || m === '\r' || m === '\t' ? m : ''));
          return JSON.parse(sanitized);
        } catch {
          // ignore
        }
      }
    }
  }
  return null;
}

async function analyzeLessonFileWithClientGemini(
  files: UploadedFileInfo[],
  apiKey: string
): Promise<{ topic?: string; subject?: string; grade?: string; bookSeries?: string } | null> {
  const apiKeyToUse = apiKey || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';
  if (!apiKeyToUse.trim() || files.length === 0) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: apiKeyToUse.trim() });
    const parts: any[] = [];
    for (const f of files) {
      if (f.base64) {
        const cleanBase64 = f.base64.replace(/^data:[^;]+;base64,/, '');
        const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: f.type || (isPdf ? 'application/pdf' : 'image/jpeg')
          }
        });
      }
    }

    const promptText = `Bạn là chuyên gia giáo dục Việt Nam. Hãy quan sát và phân tích các hình ảnh/trang sách tài liệu giáo dục này.
Hãy trích xuất chính xác:
1. "topic": Tên bài học đầy đủ (Ví dụ: "Bài 1. Thông tin và quyết định", "Bài 15. Bảng nhân 7"... Lưu ý: bắt đầu bằng "Bài X. Tên bài").
2. "subject": Môn học (Ví dụ: "Tin học", "Toán", "Tiếng Việt", "Tự nhiên và Xã hội", "Khoa học"...).
3. "grade": Khối lớp dạng số chuỗi (Ví dụ: "3", "4", "5"...).
4. "bookSeries": Bộ sách nếu nhận diện được (Ví dụ: "Kết nối tri thức với cuộc sống", "Cánh Diều", "Chân trời sáng tạo"...).

Trả về DUY NHẤT một đối tượng JSON hợp lệ (không bọc trong markdown code fence):
{
  "topic": "Bài ...",
  "subject": "Tin học",
  "grade": "3",
  "bookSeries": "Kết nối tri thức với cuộc sống"
}`;

    parts.push({ text: promptText });
    const contents = [{ role: 'user', parts }];

    for (const modelName of ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: { responseMimeType: 'application/json' }
        });
        if (response.text) {
          const parsed = safeParseJSON(response.text);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        }
      } catch (mErr) {
        console.warn(`Direct client analyze model ${modelName} error:`, mErr);
      }
    }
  } catch (err) {
    console.warn('Direct client analyze file error:', err);
  }
  return null;
}

async function generateLessonPlanWithClientGemini(params: {
  topic: string;
  grade: string;
  subject: string;
  totalPeriods: number;
  bookSeries: string;
  weekNumber: number;
  timeRange: string;
  startDateWeek1?: string;
  ppctPeriodsText?: string;
  ppctList?: PpctItem[];
  integrationOptions: { nls: boolean; stem: boolean; cds: boolean };
  attachedFiles?: UploadedFileInfo[];
  apiKey: string;
}): Promise<DetailedLessonPlan | null> {
  const apiKeyToUse = params.apiKey || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';
  if (!apiKeyToUse.trim()) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: apiKeyToUse.trim() });
    const parts: any[] = [];

    if (params.attachedFiles && params.attachedFiles.length > 0) {
      for (const f of params.attachedFiles) {
        if (f.base64) {
          const cleanBase64 = f.base64.replace(/^data:[^;]+;base64,/, '');
          const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: f.type || (isPdf ? 'application/pdf' : 'image/jpeg')
            }
          });
        }
      }
    }

    const promptText = `Bạn là một chuyên gia giáo dục xuất sắc tại Việt Nam. Nhiệm vụ của bạn là SOẠN KẾ HOẠCH DẠY HỌC (GIÁO ÁN) CỰC KỲ CHI TIẾT, ĐẦY ĐỦ, CHUẨN KHOA HỌC VÀ BÁM SÁT SGK & PHÂN PHỐI CHƯƠNG TRÌNH (PPCT).

⛔ CẤM TUYỆT ĐỐI VIẾT NỘI DUNG MẪU GỢI Ý CHUNG CHUNG / CÂU MẪU SƯ PHẠM RỖNG:
- CẤM TUYỆT ĐỐI các câu vô nghĩa như: "GV hướng dẫn HS đọc bài trong SGK...", "GV yêu cầu HS quan sát SGK...", "GV đưa ra câu hỏi gợi mở...", "HS làm theo sự hướng dẫn của GV...", "HS trả lời câu hỏi...".
- BẮT BUỘC TRÍCH XUẤT 100% NỘI DUNG DỮ LIỆU THỰC TẾ TRONG SGK VÀ TỆP ĐÍNH KÈM:
  1. Với bài đọc/ngữ văn: Trích NGUYÊN VĂN nội dung đoạn đọc/thơ/văn bản bài học thực tế từ SGK/tệp đính kèm vào "teacherAction".
  2. Với câu hỏi đọc hiểu / câu hỏi bài học: Trích NGUYÊN VĂN câu hỏi 1, 2, 3, 4 trong SGK vào "teacherAction".
  3. Với đáp án / câu trả lời: Trích NGUYÊN VĂN câu trả lời chi tiết / đáp án từng câu vào "studentAction".
  4. Với bài tập / thực hành: Viết RÕ ĐỀ BÀI TẬP CHI TIẾT (các con số, phép tính, câu lệnh, dữ liệu SGK) và LỜI GIẢI / ĐÁP ÁN CHI TIẾT từng câu.
  5. Nếu người dùng đính kèm tệp trang sách SGK/PDF: Bạn BẮT BUỘC phải đọc kỹ từng hình ảnh/trang sách để lấy ĐÚNG TOÀN BỘ chữ, câu hỏi, bài tập thực tế từ tệp đó vào giáo án. CẤM BỎ QUA VÀ CẤM VIẾT CÂU MẪU KHÔ KHAN!

${params.attachedFiles && params.attachedFiles.length > 0 ? 'LƯU Ý BẮT BUỘC KHI CÓ HÌNH ẢNH/TỆP ĐÍNH KÈM: Người dùng đã đính kèm tệp tài liệu/trang sách/PDF. Bạn PHẢI trích xuất và phân tích sâu toàn bộ kiến thức, hình vẽ, câu hỏi, bài tập, ví dụ và hoạt động có trong tài liệu này để đưa vào giáo án.' : ''}

Thông tin bài dạy:
- Tiêu đề văn bản: KẾ HOẠCH DẠY HỌC - TUẦN ${params.weekNumber}
- Tên bài dạy / chủ đề: "${params.topic}"
- Môn học: ${params.subject}
- Khối lớp: Lớp ${params.grade}
- Bộ sách: ${params.bookSeries}
- Tổng số tiết: ${params.totalPeriods} tiết.
- Tuần theo PPCT: TUẦN ${params.weekNumber}
- Tiết theo PPCT: ${params.ppctPeriodsText || `Tiết 1 - ${params.totalPeriods} theo PPCT`}
- Thời gian thực hiện: ${params.timeRange}
- Tùy chọn tích hợp chuyên đề: Năng lực số=${params.integrationOptions.nls ? 'CÓ' : 'KHÔNG'}, STEM=${params.integrationOptions.stem ? 'CÓ' : 'KHÔNG'}, Công dân số=${params.integrationOptions.cds ? 'CÓ' : 'KHÔNG'}.

QUY ĐỊNH BẮT BUỘC VỀ SOẠN GIÁO ÁN:
1. Mỗi tiết học phải đầy đủ các phần: Header, I. YÊU CẦU CẦN ĐẠT (1. Năng lực đặc thù, 2. Năng lực chung, 3. Phẩm chất, 4. Nội dung tích hợp NLS/STEM/CĐS nếu chọn), II. ĐỒ DÙNG DẠY HỌC (GV, HS), III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU (4 hoạt động: 1. Khởi động, 2. Hình thành kiến thức mới, 3. Luyện tập thực hành, 4. Vận dụng trải nghiệm).
2. Các hoạt động phải được chia thành các Nhiệm vụ, mỗi Nhiệm vụ gồm 4 bước quy chuẩn:
   - Bước 1: Chuyển giao nhiệm vụ
   - Bước 2: Thực hiện nhiệm vụ
   - Bước 3: Báo cáo kết quả
   - Bước 4: Đánh giá, kết luận
3. Nội dung hoạt động của GV và HS phải được diễn giải RẤT CHI TIẾT, KHOA HỌC, SƯ PHẠM, BÁM SÁT THỰC TẾ BÀI HỌC VÀ TỆP ĐÍNH KÈM (nếu có).
4. Nếu có chọn tích hợp Năng lực số: Đưa mã chỉ báo chuẩn dạng [1.3.CB1a] hoặc [4.1.CB2a] vào hoạt động thích hợp.
5. Nếu có chọn Giáo dục STEM: Soạn chuẩn 4 pha STEM (Pha 1: Xác định vấn đề; Pha 2: Nghiên cứu kiến thức nền; Pha 3: Chế tạo & thử nghiệm; Pha 4: Trưng bày & cải tiến).
6. Nếu có chọn Công dân số: Tự động trích dẫn bài học phù hợp từ SGK Hành trình Công dân số Lớp ${params.grade} (Bài 1, Bài 2, Bài 3...) và đưa tình huống ứng xử số văn minh vào hoạt động vận dụng.
7. QUY ĐỊNH BẮT BUỘC VỀ TIÊU ĐỀ BÀI HỌC:
   - Tên bài / Tiêu đề ("title", "topic") BẮT BUỘC viết TRỰC TIẾP TÊN BÀI HỌC (Ví dụ: "Bài 1: Cổng trường mở ra (Tiết 1)", "Bài 1: Tìm hiểu cách viết bài văn kể chuyện sáng tạo").
   - TUYỆT ĐỐI KHÔNG chèn tiền tố như "${params.subject} (Phân môn: ...)", "Môn ${params.subject} - ", "Phân môn: ..." vào trước tiêu đề bài dạy.
   - Tất cả các hoạt động dạy học PHẢI diễn giải đúng 100% nội dung kiến thức, kỹ năng sư phạm của bài học theo PPCT.

Trả về DUY NHẤT một đối tượng JSON hợp lệ (không bọc trong markdown code fence) có cấu trúc:
{
  "topic": "${params.topic}",
  "subject": "${params.subject}",
  "grade": "${params.grade}",
  "totalPeriods": ${params.totalPeriods},
  "bookSeries": "${params.bookSeries}",
  "weekNumber": ${params.weekNumber},
  "timeRange": "${params.timeRange}",
  "ppctPeriodsText": "${params.ppctPeriodsText || ''}",
  "periodPlans": [
    {
      "periodIndex": 1,
      "weekNumber": ${params.weekNumber},
      "ppctPeriodIndex": 1,
      "ppctPeriodsText": "Tiết 1 (Tuần ${params.weekNumber}) theo PPCT",
      "timeRange": "${params.timeRange}",
      "header": {
        "subject": "${params.subject}",
        "grade": "${params.grade}",
        "title": "${params.topic} (${params.totalPeriods} tiết) ; Tiết 1",
        "timeRange": "${params.timeRange}",
        "weekNumber": ${params.weekNumber}
      },
      "objectives": {
        "specificCompetencies": ["..."],
        "generalCompetencies": ["..."],
        "qualities": ["..."],
        "integrationContent": ["..."]
      },
      "teachingTools": {
        "teacher": ["..."],
        "student": ["..."]
      },
      "activities": [
        {
          "activityNumber": 1,
          "activityName": "1. Khởi động (5 phút)",
          "timeEstimate": "5 phút",
          "integrationNote": "...",
          "tasks": [
            {
              "taskId": "task-1-1-1",
              "taskTitle": "* Nhiệm vụ 1: ...",
              "integrationNote": "...",
              "steps": [
                {
                  "stepNumber": 1,
                  "stepName": "Bước 1: Chuyển giao nhiệm vụ",
                  "teacherAction": "...",
                  "studentAction": "..."
                },
                {
                  "stepNumber": 2,
                  "stepName": "Bước 2: Thực hiện nhiệm vụ",
                  "teacherAction": "...",
                  "studentAction": "..."
                },
                {
                  "stepNumber": 3,
                  "stepName": "Bước 3: Báo cáo kết quả",
                  "teacherAction": "...",
                  "studentAction": "..."
                },
                {
                  "stepNumber": 4,
                  "stepName": "Bước 4: Đánh giá, kết luận",
                  "teacherAction": "...",
                  "studentAction": "..."
                }
              ]
            }
          ]
        }
      ],
      "postLessonAdjustment": "...................................................................................................."
    }
  ]
}`;

    parts.push({ text: promptText });
    const contents = [{ role: 'user', parts }];

    for (const modelName of ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: { responseMimeType: 'application/json' }
        });
        if (response.text) {
          const parsed = safeParseJSON(response.text);
          if (parsed && parsed.periodPlans && Array.isArray(parsed.periodPlans) && parsed.periodPlans.length > 0) {
            return {
              id: `plan-${Date.now()}`,
              topic: parsed.topic || params.topic,
              subject: parsed.subject || params.subject,
              grade: parsed.grade || params.grade,
              totalPeriods: parsed.totalPeriods || params.totalPeriods,
              bookSeries: parsed.bookSeries || params.bookSeries,
              weekNumber: parsed.weekNumber || params.weekNumber,
              timeRange: parsed.timeRange || params.timeRange,
              ppctPeriodsText: parsed.ppctPeriodsText || params.ppctPeriodsText,
              createdAt: new Date().toISOString(),
              periodPlans: parsed.periodPlans
            };
          }
        }
      } catch (mErr) {
        console.warn(`Direct client Gemini model ${modelName} notice:`, mErr);
      }
    }
  } catch (err) {
    console.warn('Direct client Gemini initialization notice:', err);
  }
  return null;
}

interface AiAssistantTabProps {
  currentUser?: UserAccount | null;
  ppctList?: PpctItem[];
  config?: SchoolConfig;
}

export const AiAssistantTab: React.FC<AiAssistantTabProps> = ({
  currentUser,
  ppctList: propPpctList,
  config: propConfig
}) => {
  const [topic, setTopic] = useState<string>('');
  const [subject, setSubject] = useState<string>('Tin học');
  const [grade, setGrade] = useState<string>('3');
  const [totalPeriods, setTotalPeriods] = useState<number>(2);
  const [bookSeries, setBookSeries] = useState<string>('GDPT 2018');
  const [enableNls, setEnableNls] = useState<boolean>(false);
  const [enableStem, setEnableStem] = useState<boolean>(false);
  const [enableCds, setEnableCds] = useState<boolean>(false);

  // PPCT and Week / TimeRange State
  const [ppctList, setPpctList] = useState<PpctItem[]>(() => {
    if (propPpctList && propPpctList.length > 0) return propPpctList;
    return [];
  });
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [timeRange, setTimeRange] = useState<string>('từ .../.../.... đến .../.../....');
  const [ppctPeriodsText, setPpctPeriodsText] = useState<string>('');
  const [showPpctPicker, setShowPpctPicker] = useState<boolean>(false);
  const [autoMatchedBadge, setAutoMatchedBadge] = useState<{
    matched: boolean;
    lessonName: string;
    week: number;
    weekText?: string;
    periodsText: string;
    timeRange: string;
    matchExplanation?: string;
  } | null>(null);

  // Custom Gemini API Key State (Unified across all features & teacher account)
  const [customApiKey, setCustomApiKey] = useState<string>(() => getStoredApiKey(currentUser));

  useEffect(() => {
    setCustomApiKey(getStoredApiKey(currentUser));
    if (currentUser?.subject) {
      setSubject(currentUser.subject);
    }
  }, [currentUser]);

  useEffect(() => {
    if (propPpctList && propPpctList.length > 0) {
      setPpctList(propPpctList);
    }
  }, [propPpctList]);

  useEffect(() => {
    if (propConfig) {
      setSchoolConfig(propConfig);
    }
  }, [propConfig]);

  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);

  // File Upload State (Multiple Images & PDFs)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState<boolean>(false);
  const [fileAnalysisNote, setFileAnalysisNote] = useState<string | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const topicInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<DetailedLessonPlan | null>(null);
  const [selectedPeriodTab, setSelectedPeriodTab] = useState<number>(0); // 0 = All, 1 = Period 1, 2 = Period 2...
  const [copied, setCopied] = useState<boolean>(false);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(() => propConfig || defaultSchoolConfig);

  // Load PPCT and school config, and wipe any legacy saved plans from storage & Firestore
  useEffect(() => {
    const keys = getUserKhdhStorageKeys(currentUser?.id);

    // Wipe saved lesson plans from localStorage as requested (no lesson plan persistence in library)
    try {
      localStorage.removeItem(keys.SAVED_PLANS);
      localStorage.removeItem('khdh_saved_lesson_plans_v1');
      const savedConfig = localStorage.getItem(keys.CONFIG) || localStorage.getItem('khdh_school_config_v1');
      if (savedConfig) {
        setSchoolConfig(JSON.parse(savedConfig));
      }
      const savedPpct = localStorage.getItem(keys.PPCT) || localStorage.getItem('khdh_ppct_list_v1');
      if (savedPpct) {
        const parsed = JSON.parse(savedPpct);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPpctList(parsed);
        } else {
          setPpctList(defaultPpctList);
        }
      } else {
        setPpctList(defaultPpctList);
      }
    } catch (e) {
      console.error('Error reading localStorage for config/PPCT:', e);
      setPpctList(defaultPpctList);
    }

    // Fetch latest KHDH PPCT & Config from Firestore and wipe cloud saved lesson plans
    let active = true;
    async function fetchUserData() {
      if (!currentUser?.id) return;
      try {
        // Clear saved lesson plans document in Firestore
        saveLessonPlansToFirestore(currentUser.id, []).catch(() => {});
        const khdhData = await loadKhdhDataFromFirestore(currentUser.id);
        if (khdhData && active) {
          if (khdhData.config) {
            setSchoolConfig(khdhData.config);
            localStorage.setItem(keys.CONFIG, JSON.stringify(khdhData.config));
          }
          if (khdhData.ppctList && Array.isArray(khdhData.ppctList) && khdhData.ppctList.length > 0) {
            setPpctList(khdhData.ppctList);
            localStorage.setItem(keys.PPCT, JSON.stringify(khdhData.ppctList));
          }
        }
      } catch (err) {
        console.warn('Error fetching cloud PPCT / config:', err);
      }
    }
    fetchUserData();

    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  // Smart PPCT Auto-matching logic based on Topic, Grade, Subject
  useEffect(() => {
    const cleanTopicStr = topic.trim();
    if (!cleanTopicStr) {
      setAutoMatchedBadge(null);
      const dateRangeObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', weekNumber);
      setTimeRange(`từ ngày ${dateRangeObj.startDate} đến ngày ${dateRangeObj.endDate}`);
      return;
    }

    const activePpctList = ppctList.length > 0 ? ppctList : defaultPpctList;
    const matchResult = matchPpctLesson(
      cleanTopicStr,
      subject,
      grade,
      activePpctList,
      schoolConfig.startDateWeek1 || '2024-09-09'
    );

    if (matchResult.matched) {
      const targetWeek = matchResult.week;
      const startWeekObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', targetWeek);
      const singleWeekTimeRange = `từ ngày ${startWeekObj.startDate} đến ngày ${startWeekObj.endDate}`;

      setWeekNumber(targetWeek);
      setTimeRange(singleWeekTimeRange);
      setPpctPeriodsText(matchResult.periodsText);

      if (matchResult.periods.length > 0) {
        setTotalPeriods(matchResult.periods.length);
      }

      setAutoMatchedBadge({
        matched: true,
        lessonName: matchResult.lessonName,
        week: targetWeek,
        weekText: `Tuần ${targetWeek}`,
        periodsText: matchResult.periodsText,
        timeRange: singleWeekTimeRange,
        matchExplanation: matchResult.matchExplanation
      });
    } else {
      setAutoMatchedBadge(null);
      const dateRangeObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', weekNumber);
      setTimeRange(`từ ngày ${dateRangeObj.startDate} đến ngày ${dateRangeObj.endDate}`);
      if (!ppctPeriodsText) {
        setPpctPeriodsText(`Tiết 1 - ${totalPeriods} theo PPCT (Tuần ${weekNumber})`);
      }
    }
  }, [topic, grade, subject, ppctList, schoolConfig.startDateWeek1]);

  // When teacher manually adjusts weekNumber, recalculate timeRange
  const handleWeekNumberChange = (newWeek: number) => {
    const validWeek = Math.max(1, Math.min(52, newWeek));
    setWeekNumber(validWeek);
    const dateRangeObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', validWeek);
    setTimeRange(`từ ngày ${dateRangeObj.startDate} đến ngày ${dateRangeObj.endDate}`);
  };

  // Quick Select from PPCT
  const handleSelectPpctItem = (item: PpctItem) => {
    setTopic(item.lessonName);
    if (item.grade) setGrade(String(item.grade));
    if (item.subject) setSubject(item.subject);
    if (item.week) setWeekNumber(item.week);
    
    // Check all items belonging to same lesson
    const related = ppctList.filter(
      (p) =>
        String(p.grade) === String(item.grade) &&
        p.lessonName.trim().toLowerCase() === item.lessonName.trim().toLowerCase()
    );
    const count = related.length > 0 ? related.length : 2;
    setTotalPeriods(count);
    const periods = related.map((r) => r.periodIndex).filter(Boolean);
    const periodsText = periods.length > 0 ? `Tiết ${periods.join(', ')} theo PPCT` : `Tiết ${item.periodIndex} theo PPCT`;
    setPpctPeriodsText(periodsText);

    const dateRangeObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', item.week || 1);
    const computedRange = `từ ngày ${dateRangeObj.startDate} đến ngày ${dateRangeObj.endDate}`;
    setTimeRange(computedRange);

    setAutoMatchedBadge({
      matched: true,
      lessonName: item.lessonName,
      week: item.week || 1,
      periodsText,
      timeRange: computedRange
    });

    setShowPpctPicker(false);
    setTopicError(null);
  };

  const handleSaveApiKey = async (keyToSave: string) => {
    const trimmed = keyToSave.trim();
    await saveStoredApiKey(trimmed, currentUser);
    setCustomApiKey(getStoredApiKey(currentUser));
    setShowApiKeyModal(false);
  };

  const handleClearApiKey = async () => {
    await clearStoredApiKey(currentUser);
    setCustomApiKey('');
    setInputKey('');
    setTestStatus(null);
  };

  const handleTestApiKey = async () => {
    const keyToTest = inputKey.trim() || customApiKey;
    if (!keyToTest) {
      setTestStatus({ loading: false, success: false, message: 'Vui lòng dán API Key trước khi kiểm tra!' });
      return;
    }

    setTestStatus({ loading: true });
    try {
      let verified = false;
      let verifiedMsg = '';

      // 1. Try server verification endpoint first
      try {
        const res = await fetch('/api/gemini/test-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-api-key': keyToTest
          },
          body: JSON.stringify({ apiKey: keyToTest })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            verified = true;
            verifiedMsg = data.message || 'Kết nối thành công!';
          } else {
            setTestStatus({
              loading: false,
              success: false,
              message: data.error || 'API Key không hợp lệ.'
            });
            return;
          }
        }
      } catch {
        // Server endpoint not reachable (e.g., Vercel static deployment)
      }

      // 2. Client-side fallback test directly via @google/genai with gemini-3.8-flash
      if (!verified) {
        const clientRes = await testGeminiApiKey(keyToTest);
        if (clientRes.success) {
          verified = true;
          verifiedMsg = clientRes.message || 'Kết nối thành công!';
        } else {
          setTestStatus({
            loading: false,
            success: false,
            message: clientRes.error || 'API Key không hợp lệ hoặc bị từ chối bởi Google Gemini.'
          });
          return;
        }
      }

      setTestStatus({
        loading: false,
        success: true,
        message: '✓ Xác thực thành công! Mô hình Gemini 3.8 Flash đã sẵn sàng hoạt động.'
      });
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: err?.message || 'Không thể kiểm tra API Key lúc này.'
      });
    }
  };

  // Handle File Upload (Multiple Images or PDFs)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    const validFiles: File[] = [];

    for (const f of fileList) {
      const isImage = f.type.startsWith('image/');
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

      if (!isImage && !isPdf) {
        alert(`Tệp "${f.name}" không hợp lệ. Vui lòng chọn hình ảnh hoặc tệp PDF!`);
        continue;
      }

      if (f.size > 500 * 1024 * 1024) {
        alert(`Tệp "${f.name}" vượt quá 500MB! Vui lòng chọn tệp PDF / hình ảnh nhỏ hơn 500MB.`);
        continue;
      }

      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    setTopicError(null);

    // Read all valid files asynchronously
    const newUploadedInfos: UploadedFileInfo[] = await Promise.all(
      validFiles.map(
        (f) =>
          new Promise<UploadedFileInfo>((resolve) => {
            const isImage = f.type.startsWith('image/');
            const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
            const reader = new FileReader();

            reader.onload = () => {
              const base64Data = reader.result as string;
              resolve({
                name: f.name,
                size: f.size,
                type: f.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
                base64: base64Data,
                previewUrl: isImage ? base64Data : undefined
              });
            };

            reader.readAsDataURL(f);
          })
      )
    );

    const updatedFiles = [...uploadedFiles, ...newUploadedInfos];
    setUploadedFiles(updatedFiles);

    // Trigger AI analysis on newly uploaded image files
    const hasImages = updatedFiles.some((f) => f.type.startsWith('image/'));
    const hasPdfsOnly = updatedFiles.every((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (hasImages) {
      setIsAnalyzingFile(true);
      setFileAnalysisNote(`Đang phân tích ${updatedFiles.length} tệp hình ảnh/tài liệu...`);

      // Pre-fill instant fallback topic from image filename so input is never empty
      const firstImg = updatedFiles.find((f) => f.type.startsWith('image/')) || updatedFiles[0];
      if (firstImg) {
        const cleanedName = firstImg.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
        const guessed = cleanedName.startsWith('Bài') ? cleanedName : `Bài: ${cleanedName}`;
        setTopic(guessed);
      }

      try {
        const response = await fetch('/api/gemini/analyze-lesson-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-api-key': customApiKey || ''
          },
          body: JSON.stringify({
            attachedFiles: updatedFiles.map((f) => ({
              base64Data: f.base64,
              mimeType: f.type,
              fileName: f.name
            })),
            customApiKey: customApiKey || undefined
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.topic) setTopic(data.topic);
          if (data.subject) setSubject(data.subject);
          if (data.grade) setGrade(data.grade.toString());
          if (data.bookSeries) setBookSeries(data.bookSeries);
          setFileAnalysisNote(
            `✨ Đã phân tích thành công ${updatedFiles.length} hình ảnh: "${data.topic || updatedFiles[0].name}"`
          );
        } else {
          // Attempt direct client Gemini analysis if server API is unavailable (e.g. Vercel deployment)
          const clientData = await analyzeLessonFileWithGemini(updatedFiles, customApiKey);
          if (clientData && clientData.topic) {
            setTopic(clientData.topic);
            if (clientData.subject) setSubject(clientData.subject);
            if (clientData.grade) setGrade(clientData.grade.toString());
            if (clientData.bookSeries) setBookSeries(clientData.bookSeries);
            setFileAnalysisNote(`✨ AI Gemini nhận diện thành công: "${clientData.topic}"`);
          } else {
            const firstImage = updatedFiles.find((f) => f.type.startsWith('image/')) || updatedFiles[0];
            const cleanedName = firstImage.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
            const guessed = cleanedName.startsWith('Bài') ? cleanedName : `Bài học: ${cleanedName}`;
            setTopic(guessed);
            setFileAnalysisNote(`✨ Đã nhận diện tên bài học từ ${updatedFiles.length} tệp hình ảnh.`);
          }
        }
      } catch (err) {
        console.warn('Server analyze endpoint notice, switching to client Gemini:', err);
        const clientData = await analyzeLessonFileWithGemini(updatedFiles, customApiKey);
        if (clientData && clientData.topic) {
          setTopic(clientData.topic);
          if (clientData.subject) setSubject(clientData.subject);
          if (clientData.grade) setGrade(clientData.grade.toString());
          if (clientData.bookSeries) setBookSeries(clientData.bookSeries);
          setFileAnalysisNote(`✨ AI Gemini nhận diện thành công: "${clientData.topic}"`);
        } else {
          const firstImage = updatedFiles.find((f) => f.type.startsWith('image/')) || updatedFiles[0];
          const cleanedName = firstImage.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
          const guessed = cleanedName.startsWith('Bài') ? cleanedName : `Bài học: ${cleanedName}`;
          setTopic(guessed);
          setFileAnalysisNote(`✨ Đã nhận diện tên bài học từ ${updatedFiles.length} tệp hình ảnh.`);
        }
      } finally {
        setIsAnalyzingFile(false);
      }
    } else if (hasPdfsOnly) {
      setFileAnalysisNote('⚠️ Bắt buộc nhập tên bài học khi sử dụng tệp PDF.');
      if (topic === 'Bài 1. Thông tin và quyết định') {
        setTopic('');
      }
      setTimeout(() => {
        topicInputRef.current?.focus();
      }, 100);
    }
  };

  const handleRemoveSingleFile = (indexToRemove: number) => {
    const updated = uploadedFiles.filter((_, idx) => idx !== indexToRemove);
    setUploadedFiles(updated);
    if (updated.length === 0) {
      setFileAnalysisNote(null);
      setTopicError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setFileAnalysisNote(`Đã chọn ${updated.length} tệp hình ảnh/trang sách.`);
    }
  };

  const handleClearAllFiles = () => {
    setUploadedFiles([]);
    setFileAnalysisNote(null);
    setTopicError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Generate high-standard fallback lesson plan conforming exactly to prompt
  const generateFallbackLessonPlan = (
    inputTopic: string,
    inputSubject: string,
    inputGrade: string,
    periodsCount: number,
    series: string,
    attachment?: UploadedFileInfo | null,
    weekNum?: number,
    tRange?: string,
    ppctText?: string
  ): DetailedLessonPlan => {
    const cleanTopic = inputTopic
      .replace(/^Bài\s*:\s*/i, '')
      .replace(/^Bài\s+\d+[:\.]\s*/i, (m) => m.replace(':', '.'));

    const numericGrade = parseInt(inputGrade, 10) || 3;
    const nlsLevel = numericGrade <= 3 ? 'CB1' : numericGrade <= 5 ? 'CB2' : 'TC1';

    const periodPlans: PeriodPlan[] = [];

    // Match PPCT items for the topic using robust matching engine
    const activePpctList = ppctList.length > 0 ? ppctList : defaultPpctList;
    const matchResult = matchPpctLesson(
      inputTopic,
      inputSubject,
      inputGrade,
      activePpctList,
      schoolConfig.startDateWeek1 || '2024-09-09'
    );

    const resolvedWeek = weekNum || (matchResult.matched ? matchResult.week : (weekNumber || 1));
    const resolvedPpctText = ppctText || (matchResult.matched ? matchResult.periodsText : (ppctPeriodsText || ''));
    const matchedPpct = matchResult.matchedItems || [];

    for (let p = 1; p <= periodsCount; p++) {
      const periodTitle = `${cleanTopic} (${periodsCount} tiết) ; Tiết ${p}`;
      const isPeriod1 = p === 1;

      let pWeek = resolvedWeek;
      let pPpctPeriod = p;
      let pPpctText = '';

      if (matchedPpct.length >= p && matchedPpct[p - 1]) {
        pWeek = matchedPpct[p - 1].week || resolvedWeek;
        pPpctPeriod = matchedPpct[p - 1].periodIndex || p;
        pPpctText = `Tiết ${pPpctPeriod} theo PPCT (Tuần ${pWeek})`;
      } else if (matchedPpct.length > 0) {
        const lastMatch = matchedPpct[matchedPpct.length - 1];
        pWeek = lastMatch.week || resolvedWeek;
        pPpctPeriod = (lastMatch.periodIndex || 1) + (p - matchedPpct.length);
        pPpctText = `Tiết ${pPpctPeriod} theo PPCT (Tuần ${pWeek})`;
      } else {
        pWeek = resolvedWeek;
        pPpctPeriod = p;
        pPpctText = `Tiết ${p} theo PPCT (Tuần ${pWeek})`;
      }

      const dateRangeObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', pWeek);
      const pTimeRange = `từ ngày ${dateRangeObj.startDate} đến ngày ${dateRangeObj.endDate}`;

      const specificComp = isPeriod1
        ? [
            `Nhận biết và nêu được các khái niệm, biểu hiện cơ bản liên quan đến ${cleanTopic}.`,
            `Nêu được ví dụ minh họa và thực hiện các thao tác quan sát, tìm hiểu theo yêu cầu bài học trong SGK (Hình 1, Hình 2 trang 8).`
          ]
        : [
            `Vận dụng kiến thức bài học để giải quyết bài tập và tình huống thực hành nâng cao.`,
            `Thực hiện thành thạo các thao tác ứng dụng, phân tích và chia sẻ kết quả học tập.`
          ];

      const integrationList: string[] = [];
      if (enableNls) {
        integrationList.push(
          `[1.3.${nlsLevel}a]: Học sinh xác định, tìm kiếm và truy xuất thông tin bài học trên thiết bị học tập an toàn, hiệu quả.`
        );
      }
      if (enableStem) {
        integrationList.push(
          `[STEM]: Học sinh vận dụng kiến thức liên môn (${inputSubject}, Khoa học, Toán) để lập kế hoạch và giải quyết tình huống bài học.`
        );
      }
      if (enableCds) {
        integrationList.push(
          `[Tích hợp HĐGD - CV 3899 - Bài ${Math.min(numericGrade, 5)} SGK Hành trình công dân số Lớp ${numericGrade}]: Học sinh rèn luyện kỹ năng ứng xử văn minh, bảo vệ thông tin cá nhân và an toàn trên môi trường số.`
        );
      }

      const activities = [
        // Activity 1: Khởi động (5 phút)
        {
          activityNumber: 1,
          activityName: '1. Khởi động (5 phút)',
          timeEstimate: '5 phút',
          tasks: [
            {
              taskId: `task-${p}-1-1`,
              taskTitle: `* Nhiệm vụ 1: Tham gia trò chơi khởi động '${isPeriod1 ? 'Mảnh ghép bí mật' : 'Ai nhanh ai đúng'}'`,
              steps: [
                {
                  stepNumber: 1,
                  stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                  teacherAction: `GV trình chiếu câu hỏi khởi động trên màn hình, phổ biến luật chơi và yêu cầu học sinh quan sát suy nghĩ.`,
                  studentAction: `HS chú ý quan sát lên bảng/màn hình tivi, lắng nghe hiệu lệnh của giáo viên.`
                },
                {
                  stepNumber: 2,
                  stepName: 'Bước 2: Thực hiện nhiệm vụ',
                  teacherAction: `GV dẫn dắt câu hỏi: 'Em hãy quan sát tranh và cho biết điều gì đang diễn ra?'`,
                  studentAction: `HS quan sát, suy nghĩ cá nhân trong 1 phút và sẵn sàng trả lời.`
                },
                {
                  stepNumber: 3,
                  stepName: 'Bước 3: Báo cáo kết quả',
                  teacherAction: `GV mời 2-3 học sinh xung phong trả lời câu hỏi khởi động.`,
                  studentAction: `HS trả lời: 'Thưa thầy/cô, theo em bức tranh thể hiện...' - Cả lớp lắng nghe và nhận xét.`
                },
                {
                  stepNumber: 4,
                  stepName: 'Bước 4: Đánh giá, kết luận',
                  teacherAction: `GV nhận xét, tuyên dương tinh thần học tập và dẫn dắt vào bài mới: '${cleanTopic} (Tiết ${p})'.`,
                  studentAction: `HS vỗ tay, mở SGK trang tương ứng và ghi tên bài vào vở.`
                }
              ]
            }
          ]
        },

        // Activity 2: Hình thành kiến thức mới (15 phút)
        {
          activityNumber: 2,
          activityName: '2. Hình thành kiến thức mới (15 phút)',
          timeEstimate: '15 phút',
          tasks: [
            {
              taskId: `task-${p}-2-1`,
              taskTitle: `* Nhiệm vụ 1: Quan sát tranh và khám phá nội dung bài học "${cleanTopic}"`,
              steps: [
                {
                  stepNumber: 1,
                  stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                  teacherAction: `GV yêu cầu học sinh mở SGK môn ${inputSubject} Lớp ${inputGrade}, làm việc theo cặp đôi: đọc kỹ nội dung bài học "${cleanTopic}" và quan sát các sơ đồ, hình ảnh minh họa đính kèm mục ${isPeriod1 ? '1' : '3'}. GV diễn giải rõ yêu cầu: 'Các em hãy chú ý quan sát nội dung và các chi tiết được thể hiện trong bài "${cleanTopic}" để chuẩn bị trả lời câu hỏi khám phá.'`,
                  studentAction: `HS mở SGK bài "${cleanTopic}", cùng bạn ngồi bên cạnh đọc thầm nội dung bài học, tập trung quan sát từng chi tiết minh họa và trao đổi nhẹ nhàng với bạn.`
                },
                {
                  stepNumber: 2,
                  stepName: 'Bước 2: Thực hiện nhiệm vụ',
                  teacherAction: `GV đặt câu hỏi gợi mở tỉ mỉ: 'Qua quan sát nội dung bài học "${cleanTopic}", em hãy cho biết những điểm cần lưu ý và rút ra nhận xét? Điều này giúp ích gì cho bài học?' GV diễn giải ví dụ minh họa thực tế liên quan đến "${cleanTopic}", sau đó bao quát lớp và gợi ý cho các nhóm còn lúng túng.`,
                  studentAction: `HS thảo luận sôi nổi theo cặp: HS1 chỉ ra các chi tiết quan sát được trong bài "${cleanTopic}", HS2 lắng nghe và diễn giải bổ sung lý do. [1.3.${nlsLevel}a: HS tra cứu và chỉ ra thông tin tương ứng trên thiết bị học tập].`
                },
                {
                  stepNumber: 3,
                  stepName: 'Bước 3: Báo cáo kết quả',
                  teacherAction: `GV mời đại diện 2 nhóm đứng dậy báo cáo kết quả thảo luận trước lớp, yêu cầu trình bày rõ ràng từng bước diễn giải và chỉ vào hình ảnh minh họa trên SGK/bảng lớp.`,
                  studentAction: `HS đại diện nhóm 1 tự tin đứng dậy phát biểu: 'Thưa thầy/cô, nhóm em xin trình bày: Qua quan sát tài liệu bài "${cleanTopic}", nhóm em nhận thấy... Lí do là vì...'. Đại diện nhóm 2 lắng nghe, giơ tay nhận xét và bổ sung chi tiết.`
                },
                {
                  stepNumber: 4,
                  stepName: 'Bước 4: Đánh giá, kết luận',
                  teacherAction: `GV nhận xét câu trả lời của các nhóm, chuẩn hóa kiến thức bài "${cleanTopic}" và chốt nội dung trọng tâm trên bảng lớp.`,
                  studentAction: `HS lắng nghe, ghi nhớ kết luận và ghi nội dung trọng tâm bài "${cleanTopic}" vào vở ghi chép.`
                }
              ]
            },
            {
              taskId: `task-${p}-2-2`,
              taskTitle: `* Nhiệm vụ 2: Phân tích ví dụ thực tế và rút ra quy tắc bài học`,
              steps: [
                {
                  stepNumber: 1,
                  stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                  teacherAction: `GV nêu tình huống thực tế minh họa và yêu cầu học sinh trao đổi theo nhóm 4.`,
                  studentAction: `HS tiếp nhận nhiệm vụ, quay lại tạo nhóm 4 để bắt đầu thảo luận.`
                },
                {
                  stepNumber: 2,
                  stepName: 'Bước 2: Thực hiện nhiệm vụ',
                  teacherAction: `GV đi tới từng nhóm quan sát, hướng dẫn các em cách lập luận và liên hệ thực tiễn: '[STEM - Mở đầu: Xác định vấn đề thực tiễn cần giải quyết]'.`,
                  studentAction: `HS phân công ghi chép ý kiến của từng thành viên vào phiếu học tập.`
                },
                {
                  stepNumber: 3,
                  stepName: 'Bước 3: Báo cáo kết quả',
                  teacherAction: `GV mời đại diện 1 nhóm báo cáo, yêu cầu nhóm khác lắng nghe phản biện.`,
                  studentAction: `HS đại diện tự tin trình bày: 'Nhóm em rút ra bài học là...'.`
                },
                {
                  stepNumber: 4,
                  stepName: 'Bước 4: Đánh giá, kết luận',
                  teacherAction: `GV chốt lại kiến thức mục 2 và khen ngợi các nhóm có câu trả lời sáng tạo.`,
                  studentAction: `HS đồng thanh nhắc lại kết luận bài học để ghi nhớ sâu sắc.`
                }
              ]
            }
          ]
        },

        // Activity 3: Luyện tập, thực hành (10 phút)
        {
          activityNumber: 3,
          activityName: '3. Luyện tập, thực hành (10 phút)',
          timeEstimate: '10 phút',
          tasks: [
            {
              taskId: `task-${p}-3-1`,
              taskTitle: `* Nhiệm vụ 1: Giải bài tập 1 trang SGK (${isPeriod1 ? 'Nhận biết, củng cố' : 'Thực hành thao tác'})`,
              steps: [
                {
                  stepNumber: 1,
                  stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                  teacherAction: `GV yêu cầu 1 học sinh đọc to đề Bài tập 1 trong SGK, giao nhiệm vụ làm việc cá nhân vào vở / bảng con.`,
                  studentAction: `1 HS đọc to đề bài, cả lớp lắng nghe và mở vở bài tập.`
                },
                {
                  stepNumber: 2,
                  stepName: 'Bước 2: Thực hiện nhiệm vụ',
                  teacherAction: `GV theo dõi học sinh làm bài, hướng dẫn riêng cho những em còn lúng túng.`,
                  studentAction: `HS tự giác làm bài tập vào vở: [4.1.${nlsLevel}a: HS giữ gìn dụng cụ học tập và thiết bị cẩn thận].`
                },
                {
                  stepNumber: 3,
                  stepName: 'Bước 3: Báo cáo kết quả',
                  teacherAction: `GV mời 2 học sinh lên bảng trình bày / yêu cầu cả lớp giơ bảng con kiểm tra kết quả.`,
                  studentAction: `HS giơ bảng con / nêu đáp án: 'Kết quả của em là...'`
                },
                {
                  stepNumber: 4,
                  stepName: 'Bước 4: Đánh giá, kết luận',
                  teacherAction: `GV nhận xét, sửa lỗi sai phổ biến (nếu có) và biểu dương những bài làm đúng.`,
                  studentAction: `HS đối chiếu bài làm với đáp án chuẩn của giáo viên, tự sửa sai vào vở.`
                }
              ]
            },
            {
              taskId: `task-${p}-3-2`,
              taskTitle: `* Nhiệm vụ 2: Hoàn thành bài tập 2 thực hành nâng cao`,
              steps: [
                {
                  stepNumber: 1,
                  stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                  teacherAction: `GV giao bài tập 2 làm theo nhóm đôi, yêu cầu các em kiểm tra chéo kết quả cho nhau.`,
                  studentAction: `HS nhận đề bài tập 2, quay sang bạn cùng bàn để bắt đầu thực hiện.`
                },
                {
                  stepNumber: 2,
                  stepName: 'Bước 2: Thực hiện nhiệm vụ',
                  teacherAction: `GV bao quát lớp và gợi ý cách tháo gỡ khó khăn cho từng cặp đôi: '[STEM - Chế tạo & Thử nghiệm: Thao tác thực nghiệm và kiểm chứng]'.`,
                  studentAction: `HS tích cực trao đổi, kiểm tra chéo và thống nhất đáp án.`
                },
                {
                  stepNumber: 3,
                  stepName: 'Bước 3: Báo cáo kết quả',
                  teacherAction: `GV mời 1 cặp đôi phát biểu ý kiến giải thích cách làm.`,
                  studentAction: `HS đứng dậy báo cáo kết quả và nêu rõ các bước giải quyết bài tập.`
                },
                {
                  stepNumber: 4,
                  stepName: 'Bước 4: Đánh giá, kết luận',
                  teacherAction: `GV đánh giá tinh thần hợp tác nhóm và chốt đáp án chính xác của bài tập 2.`,
                  studentAction: `HS lắng nghe và ghi nhận các phương pháp giải tối ưu.`
                }
              ]
            }
          ]
        },

        // Activity 4: Vận dụng, trải nghiệm (5 phút)
        {
          activityNumber: 4,
          activityName: '4. Vận dụng, trải nghiệm (5 phút)',
          timeEstimate: '5 phút',
          tasks: [
            {
              taskId: `task-${p}-4-1`,
              taskTitle: `* Nhiệm vụ 1: Vận dụng kiến thức vào thực tế cuộc sống hàng ngày`,
              steps: [
                {
                  stepNumber: 1,
                  stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                  teacherAction: `GV đưa ra câu hỏi tình huống gắn liền với đời sống học sinh: 'Em sẽ làm gì khi gặp tình huống...?'`,
                  studentAction: `HS lắng nghe câu hỏi tình huống và liên hệ với thực tế của bản thân.`
                },
                {
                  stepNumber: 2,
                  stepName: 'Bước 2: Thực hiện nhiệm vụ',
                  teacherAction: `GV khuyến khích học sinh suy nghĩ nhanh và chia sẻ cách xử lý an toàn, thông minh: '[Tích hợp HĐGD - Bài ${Math.min(numericGrade, 5)} Hành trình công dân số: Ứng xử an toàn, văn minh]'.`,
                  studentAction: `HS tự suy ngẫm và chuẩn bị câu trả lời ngắn gọn, thiết thực.`
                },
                {
                  stepNumber: 3,
                  stepName: 'Bước 3: Báo cáo kết quả',
                  teacherAction: `GV mời 2 học sinh phát biểu giải pháp trước lớp.`,
                  studentAction: `HS chia sẻ: 'Thưa thầy/cô, trong thực tế em sẽ áp dụng bằng cách...'`
                },
                {
                  stepNumber: 4,
                  stepName: 'Bước 4: Đánh giá, kết luận',
                  teacherAction: `GV tổng kết tiết học, khen ngợi tinh thần học tập, dặn dò học sinh ôn bài và chuẩn bị tiết tiếp theo.`,
                  studentAction: `HS lắng nghe lời dặn của thầy/cô, thu dọn đồ dùng học tập ngay ngắn.`
                }
              ]
            }
          ]
        }
      ];

      periodPlans.push({
        periodIndex: p,
        weekNumber: pWeek,
        ppctPeriodIndex: pPpctPeriod,
        ppctPeriodsText: pPpctText,
        timeRange: pTimeRange,
        header: {
          subject: inputSubject,
          grade: inputGrade,
          title: periodTitle,
          timeRange: pTimeRange,
          weekNumber: pWeek
        },
        objectives: {
          specificCompetencies: specificComp,
          generalCompetencies: [
            'Tự chủ và tự học: Tự giác tìm hiểu bài học, chủ động hoàn thành nhiệm vụ được giao.',
            'Giao tiếp và hợp tác: Tích cực trao đổi, chia sẻ và làm việc nhóm hiệu quả cùng bạn bè.',
            'Giải quyết vấn đề và sáng tạo: Biết vận dụng kiến thức bài học để xử lý tình huống thực tế.'
          ],
          qualities: [
            'Chăm chỉ: Tích cực tham gia các hoạt động học tập và làm bài tập đầy đủ.',
            'Trung thực: Thật thà trong học tập, tôn trọng ý kiến đóng góp của bạn bè.',
            'Trách nhiệm: Có ý thức bảo vệ tài sản, thiết bị học tập và môi trường xung quanh.'
          ],
          integrationContent: integrationList
        },
        teachingTools: {
          teacher: [
            'Sách giáo khoa, bài giảng điện tử PowerPoint / Canva.',
            'Tivi thông minh / Máy chiếu, phiếu học tập nhóm, tranh ảnh minh họa.',
            'Vật liệu thực hành STEM, bảng phụ, đồ dùng dạy học trực quan.'
          ],
          student: [
            'Sách giáo khoa, vở ghi bài, vở bài tập.',
            'Bảng con, bút dạ, đồ dùng học tập theo yêu cầu của môn học.'
          ]
        },
        activities,
        postLessonAdjustment:
          '....................................................................................................\n....................................................................................................'
      });
    }

    const baseWeek = periodPlans[0]?.weekNumber || resolvedWeek;
    const baseDateRange = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', baseWeek);
    const baseTimeRange = `từ ngày ${baseDateRange.startDate} đến ngày ${baseDateRange.endDate}`;

    return {
      id: `plan-${Date.now()}`,
      topic: inputTopic,
      subject: inputSubject,
      grade: inputGrade,
      totalPeriods: periodsCount,
      bookSeries: series,
      weekNumber: baseWeek,
      timeRange: baseTimeRange,
      ppctPeriodsText: resolvedPpctText,
      createdAt: new Date().toISOString(),
      periodPlans
    };
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // RÀNG BUỘC THEO YÊU CẦU: Đối với file PDF thì bắt buộc người dùng nhập tên bài học
    const hasPdf = uploadedFiles.some((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!topic.trim()) {
      if (hasPdf) {
        setTopicError('⚠️ Bắt buộc nhập tên bài học khi sử dụng tệp PDF!');
        topicInputRef.current?.focus();
        alert('Đối với file PDF, bắt buộc người dùng phải nhập Tên bài học trước khi tạo kế hoạch bài dạy!');
      } else {
        setTopicError('Vui lòng nhập tên bài học cần soạn!');
        topicInputRef.current?.focus();
        alert('Vui lòng nhập tên bài dạy cần soạn!');
      }
      return;
    }

    setTopicError(null);

    try {
      setIsLoading(true);

      const activePpctList = ppctList.length > 0 ? ppctList : defaultPpctList;
      const matchResult = matchPpctLesson(
        topic.trim(),
        subject,
        grade,
        activePpctList,
        schoolConfig.startDateWeek1 || '2024-09-09'
      );

      const targetWeekNumber = matchResult.matched ? matchResult.week : weekNumber;
      const targetDateRangeObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', targetWeekNumber);
      const targetTimeRange = `từ ngày ${targetDateRangeObj.startDate} đến ngày ${targetDateRangeObj.endDate}`;
      const targetPpctText = matchResult.matched && matchResult.periodsText
        ? matchResult.periodsText
        : (ppctPeriodsText || `Tiết 1 - ${totalPeriods} theo PPCT (Tuần ${targetWeekNumber})`);

      const attachedFilesPayload = uploadedFiles.map((f) => ({
        base64Data: f.base64,
        mimeType: f.type,
        fileName: f.name
      }));

      const response = await fetch('/api/gemini/generate-lesson-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': customApiKey || ''
        },
        body: JSON.stringify({
          topic: topic.trim(),
          grade,
          subject,
          totalPeriods,
          bookSeries,
          weekNumber: targetWeekNumber,
          timeRange: targetTimeRange,
          startDateWeek1: schoolConfig.startDateWeek1,
          ppctPeriodsText: targetPpctText,
          ppctList: activePpctList,
          integrationOptions: {
            nls: enableNls,
            stem: enableStem,
            cds: enableCds
          },
          customApiKey: customApiKey || undefined,
          attachedFiles: attachedFilesPayload.length > 0 ? attachedFilesPayload : undefined,
          attachedFile: attachedFilesPayload[0] || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.plan && data.plan.periodPlans && data.plan.periodPlans.length > 0) {
          const generatedPlan: DetailedLessonPlan = {
            id: `plan-${Date.now()}`,
            topic: cleanLessonTitle(data.plan.topic || topic),
            subject: data.plan.subject || subject,
            grade: data.plan.grade || grade,
            totalPeriods: data.plan.totalPeriods || totalPeriods,
            bookSeries: data.plan.bookSeries || bookSeries,
            weekNumber: data.plan.weekNumber || targetWeekNumber,
            timeRange: data.plan.timeRange || targetTimeRange,
            ppctPeriodsText: data.plan.ppctPeriodsText || targetPpctText,
            createdAt: new Date().toISOString(),
            periodPlans: (data.plan.periodPlans || []).map((p: any, pIdx: number) => {
              const matchedItem = matchResult.matchedItems[pIdx];
              const pWeek = (matchedItem && matchedItem.week) ? Number(matchedItem.week) : (p.weekNumber || targetWeekNumber);
              const pPpctIndex = (matchedItem && matchedItem.periodIndex) ? Number(matchedItem.periodIndex) : (p.ppctPeriodIndex || matchResult.periods[pIdx] || (pIdx + 1));
              const pPpctText = p.ppctPeriodsText || `Tiết ${pPpctIndex} theo PPCT (Tuần ${pWeek})`;
              const pRange = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', pWeek);
              const pTimeRange = `từ ngày ${pRange.startDate} đến ngày ${pRange.endDate}`;
              return {
                ...p,
                weekNumber: pWeek,
                ppctPeriodIndex: pPpctIndex,
                ppctPeriodsText: pPpctText,
                timeRange: p.timeRange || pTimeRange,
                header: p.header
                  ? {
                      ...p.header,
                      subject: p.header.subject || subject,
                      grade: p.header.grade || grade,
                      title: cleanLessonTitle(p.header.title || topic),
                      weekNumber: pWeek,
                      timeRange: p.header.timeRange || pTimeRange
                    }
                  : {
                      subject,
                      grade,
                      title: cleanLessonTitle(topic),
                      weekNumber: pWeek,
                      timeRange: pTimeRange
                    }
              };
            })
          };
          setCurrentPlan(generatedPlan);
          setSelectedPeriodTab(0);
          return;
        }
      }

      // If server responds without structured plan or server unavailable (e.g. Vercel deployment), attempt direct client Gemini generation
      const clientPlan = await generateLessonPlanWithGemini({
        topic: topic.trim(),
        grade,
        subject,
        totalPeriods,
        bookSeries,
        weekNumber: targetWeekNumber,
        timeRange: targetTimeRange,
        ppctPeriodsText: targetPpctText,
        ppctList: activePpctList,
        integrationOptions: { nls: enableNls, stem: enableStem, cds: enableCds },
        attachedFiles: uploadedFiles,
        apiKey: customApiKey
      });

      if (clientPlan && clientPlan.periodPlans && clientPlan.periodPlans.length > 0) {
        const cleanedClientPlan: DetailedLessonPlan = {
          ...clientPlan,
          topic: cleanLessonTitle(clientPlan.topic || topic),
          weekNumber: clientPlan.weekNumber || targetWeekNumber,
          timeRange: clientPlan.timeRange || targetTimeRange,
          ppctPeriodsText: clientPlan.ppctPeriodsText || targetPpctText,
          periodPlans: (clientPlan.periodPlans || []).map((p, pIdx) => {
            const matchedItem = matchResult.matchedItems[pIdx];
            const pWeek = (matchedItem && matchedItem.week) ? Number(matchedItem.week) : (p.weekNumber || targetWeekNumber);
            const pPpctIndex = (matchedItem && matchedItem.periodIndex) ? Number(matchedItem.periodIndex) : (p.ppctPeriodIndex || matchResult.periods[pIdx] || (pIdx + 1));
            const pPpctText = p.ppctPeriodsText || `Tiết ${pPpctIndex} theo PPCT (Tuần ${pWeek})`;
            const pRange = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', pWeek);
            const pTimeRange = `từ ngày ${pRange.startDate} đến ngày ${pRange.endDate}`;
            return {
              ...p,
              weekNumber: pWeek,
              ppctPeriodIndex: pPpctIndex,
              ppctPeriodsText: pPpctText,
              timeRange: p.timeRange || pTimeRange,
              header: p.header
                ? {
                    ...p.header,
                    subject: p.header.subject || subject,
                    grade: p.header.grade || grade,
                    title: cleanLessonTitle(p.header.title || topic),
                    weekNumber: pWeek,
                    timeRange: p.header.timeRange || pTimeRange
                  }
                : {
                    subject,
                    grade,
                    title: cleanLessonTitle(topic),
                    weekNumber: pWeek,
                    timeRange: pTimeRange
                  }
            };
          })
        };
        setCurrentPlan(cleanedClientPlan);
        setSelectedPeriodTab(0);
        return;
      }

      const fallback = generateFallbackLessonPlan(
        topic,
        subject,
        grade,
        totalPeriods,
        bookSeries,
        uploadedFiles[0] || null,
        targetWeekNumber,
        targetTimeRange,
        targetPpctText
      );
      setCurrentPlan(fallback);
      setSelectedPeriodTab(0);
      if (!customApiKey && !((import.meta as any).env?.VITE_GEMINI_API_KEY as string)) {
        setShowApiKeyModal(true);
      }
    } catch (err) {
      console.warn('Notice calling server endpoint, attempting client Gemini direct generation:', err);
      const activePpctList = ppctList.length > 0 ? ppctList : defaultPpctList;
      const matchResult = matchPpctLesson(
        topic.trim(),
        subject,
        grade,
        activePpctList,
        schoolConfig.startDateWeek1 || '2024-09-09'
      );
      const targetWeekNumber = matchResult.matched ? matchResult.week : weekNumber;
      const targetDateRangeObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', targetWeekNumber);
      const targetTimeRange = `từ ngày ${targetDateRangeObj.startDate} đến ngày ${targetDateRangeObj.endDate}`;
      const targetPpctText = matchResult.matched && matchResult.periodsText
        ? matchResult.periodsText
        : (ppctPeriodsText || `Tiết 1 - ${totalPeriods} theo PPCT (Tuần ${targetWeekNumber})`);

      const clientPlan = await generateLessonPlanWithGemini({
        topic: topic.trim(),
        grade,
        subject,
        totalPeriods,
        bookSeries,
        weekNumber: targetWeekNumber,
        timeRange: targetTimeRange,
        ppctPeriodsText: targetPpctText,
        ppctList: activePpctList,
        integrationOptions: { nls: enableNls, stem: enableStem, cds: enableCds },
        attachedFiles: uploadedFiles,
        apiKey: customApiKey
      });

      if (clientPlan && clientPlan.periodPlans && clientPlan.periodPlans.length > 0) {
        const cleanedClientPlan: DetailedLessonPlan = {
          ...clientPlan,
          topic: cleanLessonTitle(clientPlan.topic || topic),
          weekNumber: clientPlan.weekNumber || targetWeekNumber,
          timeRange: clientPlan.timeRange || targetTimeRange,
          ppctPeriodsText: clientPlan.ppctPeriodsText || targetPpctText,
          periodPlans: (clientPlan.periodPlans || []).map((p, pIdx) => {
            const matchedItem = matchResult.matchedItems[pIdx];
            const pWeek = (matchedItem && matchedItem.week) ? Number(matchedItem.week) : (p.weekNumber || targetWeekNumber);
            const pPpctIndex = (matchedItem && matchedItem.periodIndex) ? Number(matchedItem.periodIndex) : (p.ppctPeriodIndex || matchResult.periods[pIdx] || (pIdx + 1));
            const pPpctText = p.ppctPeriodsText || `Tiết ${pPpctIndex} theo PPCT (Tuần ${pWeek})`;
            const pRange = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', pWeek);
            const pTimeRange = `từ ngày ${pRange.startDate} đến ngày ${pRange.endDate}`;
            return {
              ...p,
              weekNumber: pWeek,
              ppctPeriodIndex: pPpctIndex,
              ppctPeriodsText: pPpctText,
              timeRange: p.timeRange || pTimeRange,
              header: p.header
                ? {
                    ...p.header,
                    subject: p.header.subject || subject,
                    grade: p.header.grade || grade,
                    title: cleanLessonTitle(p.header.title || topic),
                    weekNumber: pWeek,
                    timeRange: p.header.timeRange || pTimeRange
                  }
                : {
                    subject,
                    grade,
                    title: cleanLessonTitle(topic),
                    weekNumber: pWeek,
                    timeRange: pTimeRange
                  }
            };
          })
        };
        setCurrentPlan(cleanedClientPlan);
        setSelectedPeriodTab(0);
        return;
      }

      const fallback = generateFallbackLessonPlan(
        topic,
        subject,
        grade,
        totalPeriods,
        bookSeries,
        uploadedFiles[0] || null,
        targetWeekNumber,
        targetTimeRange,
        targetPpctText
      );
      setCurrentPlan(fallback);
      setSelectedPeriodTab(0);
      if (!customApiKey && !((import.meta as any).env?.VITE_GEMINI_API_KEY as string)) {
        setShowApiKeyModal(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportWord = async () => {
    if (!currentPlan) return;
    try {
      await exportDetailedLessonPlanToDocx(
        currentPlan,
        selectedPeriodTab > 0 ? selectedPeriodTab : undefined,
        schoolConfig
      );
    } catch (err) {
      console.error('Word export error:', err);
      alert('Có lỗi xảy ra khi tạo file Word. Vui lòng thử lại!');
    }
  };

  const handleCopyText = () => {
    if (!currentPlan) return;

    const periods = selectedPeriodTab > 0
      ? currentPlan.periodPlans.filter((p) => p.periodIndex === selectedPeriodTab)
      : currentPlan.periodPlans;

    let fullText = `KẾ HOẠCH BÀI DẠY (GIÁO ÁN)\n`;
    fullText += `MÔN: ${currentPlan.subject.toUpperCase()} - LỚP ${currentPlan.grade}\n`;
    fullText += `====================================================\n\n`;

    periods.forEach((period, idx) => {
      const pWeekNum = Number(period.weekNumber || period.header?.weekNumber) || currentPlan.weekNumber || 1;
      const weekDateObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', pWeekNum);
      const cleanRange = `từ ngày ${weekDateObj.startDate} đến ngày ${weekDateObj.endDate}`;
      const rawTopic = period.header?.title || currentPlan.topic;
      const weekPeriodNum = getPeriodOfWeekNumber(
        period.ppctPeriodIndex,
        period.periodIndex || (idx + 1),
        pWeekNum,
        currentPlan.subject,
        currentPlan.grade,
        ppctList
      );
      const formattedTitle = formatTopicWithWeekPeriod(rawTopic, weekPeriodNum);

      fullText += `KẾ HOẠCH BÀI DẠY - TUẦN ${pWeekNum}\n`;
      fullText += `MÔN: ${currentPlan.subject.toUpperCase()} - LỚP ${currentPlan.grade}\n`;
      fullText += `${formattedTitle}\n`;
      fullText += `Thời gian thực hiện: ${cleanRange}\n\n`;

      fullText += `I. YÊU CẦU CẦN ĐẠT:\n`;
      fullText += `1. Năng lực đặc thù:\n`;
      period.objectives.specificCompetencies?.forEach((c) => (fullText += `   - ${c}\n`));
      fullText += `2. Năng lực chung:\n`;
      period.objectives.generalCompetencies?.forEach((c) => (fullText += `   - ${c}\n`));
      fullText += `3. Phẩm chất:\n`;
      period.objectives.qualities?.forEach((c) => (fullText += `   - ${c}\n`));
      if (period.objectives.integrationContent?.length) {
        fullText += `4. Nội dung tích hợp (NLS CV 3456, STEM CV 909, Công dân số CV 3899):\n`;
        period.objectives.integrationContent.forEach((c) => (fullText += `   - ${c}\n`));
      }
      fullText += `\n`;

      fullText += `II. ĐỒ DÙNG DẠY HỌC:\n`;
      fullText += `1. Giáo viên: ${period.teachingTools.teacher.join(', ')}\n`;
      fullText += `2. Học sinh: ${period.teachingTools.student.join(', ')}\n\n`;

      fullText += `III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU:\n`;
      period.activities.forEach((act) => {
        fullText += `\n--- ${formatCleanActivityTitle(act.activityName, act.timeEstimate).toUpperCase()} ---\n`;
        if (act.integrationNote) {
          fullText += `✦ Nội dung tích hợp: ${act.integrationNote}\n`;
        }
        act.tasks?.forEach((task) => {
          fullText += `${task.taskTitle}${task.integrationNote ? ` [Tích hợp: ${task.integrationNote}]` : ''}\n`;
          task.steps?.forEach((step) => {
            fullText += `+ ${step.stepName}:\n`;
            fullText += `  * Hoạt động của GV: ${step.teacherAction}\n`;
            fullText += `  * Hoạt động của HS: ${step.studentAction}\n`;
          });
        });
      });

      fullText += `\nIV. ĐIỀU CHỈNH SAU BÀI DẠY (nếu có):\n`;
      fullText += `..........................................................................................................................................................................\n`;
      fullText += `..........................................................................................................................................................................\n\n`;
      fullText += `----------------------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const periodsToDisplay = currentPlan
    ? selectedPeriodTab === 0
      ? currentPlan.periodPlans
      : currentPlan.periodPlans.filter((p) => p.periodIndex === selectedPeriodTab)
    : [];

  const isPdf = uploadedFiles.some((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
            <Sparkles className="w-6 h-6 text-amber-300 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black tracking-tight">
                SOẠN GIÁO ÁN
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-teal-950 uppercase tracking-wider">
                Chuẩn Bộ GD&ĐT
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-100 font-medium mt-0.5">
              Soạn Kế hoạch bài dạy khoa học • Hỗ trợ tải tệp Hình ảnh & PDF • Tự động nhận diện tên bài học từ ảnh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Cài đặt Google Gemini API Key */}
          <button
            type="button"
            onClick={() => {
              setInputKey(customApiKey);
              setTestStatus(null);
              setShowApiKeyModal(true);
            }}
            className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl backdrop-blur-md transition-all border cursor-pointer shadow-md ${
              customApiKey
                ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/50 shadow-emerald-950/20'
                : 'bg-white/20 hover:bg-white/30 text-white border-white/30'
            }`}
            title="Dán API Key Google để khi đưa lên Vercel soạn giáo án không bị lỗi"
          >
            <Key className="w-4 h-4 text-amber-300" />
            <span>{customApiKey ? 'Đã cài đặt API Key' : 'Dán Gemini API Key'}</span>
            {customApiKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-teal-950">Vercel</span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Generator Form & File Upload (Independent scroll & pinned) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto custom-scrollbar pr-1">
          <form
            onSubmit={handleGenerate}
            className="bg-white rounded-3xl p-5 border-2 border-teal-100 shadow-md space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Thiết lập bài soạn</span>
              </h3>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                Tự động chia tiết
              </span>
            </div>

            {/* TÍNH NĂNG TẢI TỆP LÊN: HỖ TRỢ NHIỀU HÌNH ẢNH & PDF CÙNG LÚC */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-teal-600" />
                  <span>Tải lên trang sách / tài liệu:</span>
                </label>
                <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  Nhiều ảnh / PDF
                </span>
              </div>

              {/* Upload Input Area with multiple attribute */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="lesson-file-upload"
              />

              {uploadedFiles.length === 0 ? (
                <label
                  htmlFor="lesson-file-upload"
                  className="border-2 border-dashed border-teal-200 hover:border-teal-500 hover:bg-teal-50/50 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center bg-slate-50/50 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-100/80 group-hover:bg-teal-200 text-teal-700 flex items-center justify-center transition-colors">
                    <ScanText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-teal-900">
                      Bấm để chọn <span className="text-teal-600 font-black">Nhiều hình ảnh</span> hoặc <span className="text-teal-600 font-black">PDF</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      📷 Cho phép tải nhiều trang sách | 📄 Hỗ trợ tệp PDF lớn (100MB+) & tự động trích xuất nội dung
                    </p>
                  </div>
                </label>
              ) : (
                <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2.5">
                  {/* Header list files */}
                  <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
                    <span className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Đã chọn ({uploadedFiles.length}) trang / tệp</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="lesson-file-upload"
                        className="text-[10px] font-bold text-teal-700 bg-white hover:bg-teal-100 border border-teal-300 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                      >
                        + Thêm tệp
                      </label>
                      <button
                        type="button"
                        onClick={handleClearAllFiles}
                        className="text-[10px] font-bold text-rose-600 hover:bg-rose-100/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Xóa tất cả
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail list */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {uploadedFiles.map((f, idx) => {
                      const isPdfFile = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
                      return (
                        <div
                          key={`${f.name}-${idx}`}
                          className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-xl border border-teal-100 shadow-2xs hover:border-teal-300 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {f.previewUrl ? (
                              <img
                                src={f.previewUrl}
                                alt={`Trang ${idx + 1}`}
                                className="w-8 h-8 object-cover rounded-lg border border-teal-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 truncate" title={f.name}>
                                Trang {idx + 1}: {f.name}
                              </p>
                              <p className="text-[9px] text-slate-500">
                                {isPdfFile ? 'PDF' : 'Hình ảnh'} • {(f.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSingleFile(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="Xóa trang này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Status Note */}
                  {isAnalyzingFile ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800 bg-white/90 p-2 rounded-xl border border-teal-200 animate-pulse">
                      <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Đang nhận dạng tên bài học từ {uploadedFiles.length} hình ảnh...</span>
                    </div>
                  ) : fileAnalysisNote ? (
                    <div
                      className={`text-[11px] p-2 rounded-xl border font-bold flex items-start gap-1.5 ${
                        uploadedFiles.some((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      }`}
                    >
                      {uploadedFiles.some((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) ? (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-tight">{fileAnalysisNote}</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* CHỌN NHANH TỪ PHÂN PHỐI CHƯƠNG TRÌNH (PPCT) */}
            {ppctList.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPpctPicker(!showPpctPicker)}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 text-teal-900 hover:bg-teal-100/60 transition-all text-xs font-bold shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-teal-700" />
                    <span>💡 Chọn nhanh từ PPCT đã cấu hình ({ppctList.length} tiết)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-teal-700 transition-transform ${showPpctPicker ? 'rotate-180' : ''}`} />
                </button>

                {showPpctPicker && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white rounded-2xl border border-teal-200 shadow-xl max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    <div className="text-[10px] font-black text-slate-400 px-2 py-1 uppercase tracking-wider">
                      Danh sách bài học PPCT {subject ? `môn ${subject}` : ''} (Lớp {grade})
                    </div>
                    {ppctList
                      .filter((p) => {
                        if (grade && String(p.grade) !== String(grade)) return false;
                        if (subject && p.subject) {
                          const pSub = p.subject.trim().toLowerCase();
                          const curSub = subject.trim().toLowerCase();
                          if (pSub !== curSub && !pSub.includes(curSub) && !curSub.includes(pSub)) return false;
                        }
                        return true;
                      })
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectPpctItem(item)}
                          className="w-full text-left p-2 rounded-xl hover:bg-teal-50 border border-transparent hover:border-teal-200 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {item.lessonName}
                            </p>
                            <p className="text-[10px] text-teal-700 font-semibold">
                              Tuần {item.week} • Tiết {item.periodIndex} • {item.subject} Lớp {item.grade}
                            </p>
                          </div>
                          <span className="text-[9px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md shrink-0">
                            Tuần {item.week}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Thông báo tự động khớp PPCT nếu tìm thấy */}
            {autoMatchedBadge && (
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-center justify-between font-black text-emerald-950">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Đã nhận diện Tuần theo PPCT môn {subject}:</span>
                  </div>
                  <span className="text-[10px] font-black bg-emerald-200/90 text-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300">
                    {autoMatchedBadge.weekText || `Tuần ${autoMatchedBadge.week}`}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-emerald-800 pl-5">
                  <span className="font-bold">{autoMatchedBadge.weekText || `Tuần ${autoMatchedBadge.week}`}</span> •{' '}
                  <span className="font-bold">{autoMatchedBadge.periodsText}</span>
                  <br />
                  <span>🗓️ {autoMatchedBadge.timeRange}</span>
                </div>
              </div>
            )}

            {/* Tên bài học */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black text-slate-700">
                  Tên bài học / Chủ đề bài dạy{' '}
                  <span className="text-rose-500">*</span>
                  {uploadedFiles.some((f) => f.type.startsWith('image/')) && topic && (
                    <span className="text-[10px] text-emerald-700 font-bold ml-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      AI tự động điền từ hình ảnh
                    </span>
                  )}
                  {uploadedFiles.some((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) && (
                    <span className="text-[10px] text-rose-600 font-bold ml-1 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                      Bắt buộc cho file PDF
                    </span>
                  )}
                </label>
              </div>
              <input
                ref={topicInputRef}
                type="text"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (topicError) setTopicError(null);
                }}
                placeholder={isPdf ? 'BẮT BUỘC: Nhập tên bài học cho tệp PDF...' : 'Ví dụ: Bài 1. Thông tin và quyết định...'}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 bg-slate-50/50 ${
                  topicError
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30 ring-1 ring-rose-300'
                    : isPdf && !topic.trim()
                    ? 'border-amber-400 focus:ring-amber-400 bg-amber-50/30'
                    : 'border-slate-300 focus:ring-teal-400'
                }`}
                required
              />
              {topicError && (
                <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{topicError}</span>
                </p>
              )}
            </div>

            {/* Môn học & Khối lớp */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Môn học
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Tin học, Toán..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Khối lớp
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      Khối {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tuần dạy theo PPCT & Số tiết */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-slate-700">
                    Tuần (theo PPCT)
                  </label>
                  {autoMatchedBadge && (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      Tự động
                    </span>
                  )}
                </div>
                <select
                  value={weekNumber}
                  onChange={(e) => handleWeekNumberChange(Number(e.target.value))}
                  className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                    const range = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', w);
                    return (
                      <option key={w} value={w}>
                        Tuần {w} ({range.startDate.slice(0, 5)} - {range.endDate.slice(0, 5)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Tổng số tiết
                </label>
                <select
                  value={totalPeriods}
                  onChange={(e) => setTotalPeriods(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                >
                  <option value={1}>1 tiết</option>
                  <option value={2}>2 tiết (Chuẩn)</option>
                  <option value={3}>3 tiết</option>
                  <option value={4}>4 tiết</option>
                </select>
              </div>
            </div>

            {/* Bộ sách GDPT */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Bộ sách GDPT
              </label>
              <select
                value={bookSeries}
                onChange={(e) => setBookSeries(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="Kết nối tri thức với cuộc sống">Kết nối tri thức</option>
                <option value="Cánh Diều">Cánh Diều</option>
                <option value="Chân trời sáng tạo">Chân trời sáng tạo</option>
                <option value="Cùng học để phát triển năng lực">Cùng học</option>
                <option value="GDPT 2018">GDPT 2018 chung</option>
              </select>
            </div>

            {/* Tùy chọn Tích hợp chuẩn quy định */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="block text-xs font-black text-slate-700">
                Tích hợp chuyên đề theo công văn Bộ GD&ĐT:
              </label>

              <label className="flex items-start gap-2 p-2 rounded-xl bg-teal-50/50 hover:bg-teal-50 border border-teal-200/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={enableNls}
                  onChange={(e) => setEnableNls(e.target.checked)}
                  className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black text-teal-900 block">
                    Năng lực số (CV 3456 & TT 02/2025)
                  </span>
                  <span className="text-[10px] text-teal-700 block">
                    Rà soát & soạn trực tiếp mã [1.3.CB1a], [4.1.CB2a]... vào hoạt động
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-50 border border-amber-200 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={enableStem}
                  onChange={(e) => setEnableStem(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                    <span>🔬 Giáo dục STEM (CV 909/BGDĐT & SGK STEM)</span>
                    <span className="text-[9px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-bold">Tự động nhận dạng 4 pha</span>
                  </span>
                  <span className="text-[10px] text-amber-800 block mt-0.5 leading-tight">
                    Tự động nhận diện bài học STEM tương ứng & soạn chuẩn 4 pha: 1. Mở đầu/Tiêu chí - 2. Kiến thức nền & Thiết kế - 3. Chế tạo/Thử nghiệm - 4. Đánh giá/Cải tiến.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-200 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={enableCds}
                  onChange={(e) => setEnableCds(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1">
                    <span>🌐 Công dân số (CV 3899 & SGK Hành trình CĐS)</span>
                    <span className="text-[9px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.2 rounded font-bold">Tự động nhận diện SGK CĐS</span>
                  </span>
                  <span className="text-[10px] text-indigo-800 block mt-0.5 leading-tight">
                    Tự động nhận diện bài & hoạt động trong SGK Hành trình CĐS Lớp 1-5; soạn câu hỏi tình huống thực tế, hành vi ứng xử số văn minh & bảo mật thông tin.
                  </span>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || isAnalyzingFile}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang soạn giáo án chuẩn mẫu...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>⚡ BẮT ĐẦU SOẠN GIÁO ÁN</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Generated Lesson Plan Display (Independent scroll) */}
        <div className="lg:col-span-8 space-y-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto custom-scrollbar pr-1">
          {!currentPlan && !isLoading && (
            <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-teal-200 text-center space-y-4 min-h-[420px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <BookOpen className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h4 className="text-base font-black text-slate-800">
                  Sẵn sàng soạn giáo án chuẩn khoa học
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Tải lên ảnh chụp trang sách hoặc tài liệu PDF bên trái, sau đó bấm <span className="font-bold text-teal-700">"⚡ BẮT ĐẦU SOẠN GIÁO ÁN"</span> để hệ thống tạo bài dạy chuẩn 4 hoạt động, bảng 2 cột GV - HS và nhãn NLS/STEM/CĐS theo đúng quy định.
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="bg-white rounded-3xl p-12 border border-teal-100 shadow-md text-center space-y-4 min-h-[420px] flex flex-col items-center justify-center animate-pulse">
              <div className="w-16 h-16 rounded-3xl bg-teal-100/70 flex items-center justify-center text-teal-700">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-800">
                  Đang biên soạn Kế hoạch bài dạy chuẩn quy chuẩn...
                </h4>
                <p className="text-xs text-slate-500">
                  {uploadedFiles.length > 0
                    ? `Bám sát nội dung ${uploadedFiles.length} tài liệu đính kèm ("${uploadedFiles[0].name}"...) • Bảng 2 cột GV và HS`
                    : 'Xây dựng 4 hoạt động chuẩn sư phạm • Bảng 2 cột GV và HS • Gắn mã Năng lực số, STEM và Công dân số'}
                </p>
              </div>
            </div>
          )}

          {currentPlan && !isLoading && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden space-y-0">
              {/* Action Toolbar */}
              <div className="px-5 py-3.5 bg-slate-800 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-300">Xem tiết:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedPeriodTab(0)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        selectedPeriodTab === 0
                          ? 'bg-teal-500 text-white shadow-2xs font-black'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Toàn bộ bài ({currentPlan.totalPeriods} tiết)
                    </button>
                    {currentPlan.periodPlans.map((p, pIdx) => {
                      const pNum = p.periodIndex || (pIdx + 1);
                      return (
                        <button
                          key={p.periodIndex || pIdx}
                          type="button"
                          onClick={() => setSelectedPeriodTab(p.periodIndex)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            selectedPeriodTab === p.periodIndex
                              ? 'bg-teal-500 text-white shadow-2xs font-black'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          Tiết {pNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportWord}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs shadow-sm cursor-pointer transition-colors"
                    title="Tải về file Microsoft Word (.docx) chuẩn mẫu Bộ GD&ĐT"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất Word (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs cursor-pointer transition-colors"
                    title="Sao chép toàn bộ văn bản giáo án"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white cursor-pointer transition-colors hidden sm:inline-flex"
                    title="In giáo án"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lesson Plan Content Preview (A4 Paper Aesthetic) */}
              <div className="p-6 sm:p-8 bg-white max-h-[75vh] overflow-y-auto custom-scrollbar space-y-8 font-serif text-[13pt] leading-relaxed text-slate-800">
                {periodsToDisplay.map((period, pIdx) => {
                  const pWeekNum = Number(period.weekNumber || period.header?.weekNumber) || currentPlan.weekNumber || 1;
                  const weekDateObj = getWeekDateRange(schoolConfig.startDateWeek1 || '2024-09-09', pWeekNum);
                  const displayTimeRange = `từ ngày ${weekDateObj.startDate} đến ngày ${weekDateObj.endDate}`;

                  const rawTopic = period.header?.title || currentPlan.topic;
                  const weekPeriodNum = getPeriodOfWeekNumber(
                    period.ppctPeriodIndex,
                    period.periodIndex || (pIdx + 1),
                    pWeekNum,
                    currentPlan.subject,
                    currentPlan.grade,
                    ppctList
                  );
                  const mainTopicTitle = formatTopicWithWeekPeriod(rawTopic, weekPeriodNum);

                  return (
                    <div key={period.periodIndex} className="space-y-6">
                      {pIdx > 0 && <hr className="border-slate-300 my-8 border-dashed" />}

                      {/* 1. Header Section */}
                      <div className="text-center space-y-1.5 pb-4 border-b border-slate-200">
                        <p className="text-sm font-black text-teal-800 uppercase tracking-widest">
                          KẾ HOẠCH BÀI DẠY - TUẦN {pWeekNum}
                        </p>
                        <p className="text-xs font-bold text-slate-500 uppercase">
                          MÔN: {currentPlan.subject.toUpperCase()} - LỚP {currentPlan.grade}
                        </p>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 pt-0.5">
                          {mainTopicTitle}
                        </h3>
                        <div className="text-xs font-semibold text-slate-600 pt-1">
                          <p>Thời gian thực hiện: <strong className="text-slate-900">{displayTimeRange}</strong></p>
                        </div>
                      </div>

                    {/* 2. I. YÊU CẦU CẦN ĐẠT */}
                    <div className="space-y-3">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5 bg-slate-100 p-2 rounded-xl">
                        <span>I. YÊU CẦU CẦN ĐẠT:</span>
                      </h4>

                      <div className="pl-3 space-y-2 text-xs">
                        <div>
                          <strong className="text-slate-900 font-bold block mb-1">
                            1. Năng lực đặc thù:
                          </strong>
                          <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2 text-justify text-[13pt]">
                            {period.objectives.specificCompetencies?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <strong className="text-slate-900 font-bold block mb-1">
                            2. Năng lực chung:
                          </strong>
                          <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2 text-justify text-[13pt]">
                            {period.objectives.generalCompetencies?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <strong className="text-slate-900 font-bold block mb-1">
                            3. Phẩm chất:
                          </strong>
                          <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2 text-justify text-[13pt]">
                            {period.objectives.qualities?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        {period.objectives.integrationContent && period.objectives.integrationContent.length > 0 && (
                          <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-200">
                            <strong className="text-teal-950 font-black block mb-1.5">
                              4. Nội dung tích hợp (NLS CV 3456, STEM CV 909, Công dân số CV 3899):
                            </strong>
                            <ul className="space-y-1.5 text-teal-900 font-medium pl-1">
                              {period.objectives.integrationContent.map((item, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-teal-600 font-bold">•</span>
                                  <span>{abbreviateIntegrationText(item)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. II. ĐỒ DÙNG DẠY HỌC */}
                    <div className="space-y-2">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide bg-slate-100 p-2 rounded-xl">
                        II. ĐỒ DÙNG DẠY HỌC:
                      </h4>
                      <div className="pl-3 space-y-1.5 text-[13pt] text-slate-700 text-justify">
                        <p>
                          <strong className="text-slate-900 font-bold">1. Giáo viên: </strong>
                          {period.teachingTools.teacher.join(', ')}
                        </p>
                        <p>
                          <strong className="text-slate-900 font-bold">2. Học sinh: </strong>
                          {period.teachingTools.student.join(', ')}
                        </p>
                      </div>
                    </div>

                    {/* 4. III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU (Bảng 2 cột) */}
                    <div className="space-y-3">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide bg-slate-100 p-2 rounded-xl">
                        III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU:
                      </h4>

                      {/* 2-Column Table UI */}
                      <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-2xs">
                        {/* Table Header */}
                        <div className="grid grid-cols-2 bg-slate-200/90 text-slate-800 font-black text-xs border-b border-slate-300">
                          <div className="p-3 text-center border-r border-slate-300 uppercase tracking-wide">
                            HOẠT ĐỘNG CỦA GIÁO VIÊN
                          </div>
                          <div className="p-3 text-center uppercase tracking-wide">
                            HOẠT ĐỘNG CỦA HỌC SINH
                          </div>
                        </div>

                        {/* Activities (4 hoạt động chuẩn) */}
                        <div className="divide-y divide-slate-300">
                          {period.activities.map((act) => (
                            <div key={act.activityNumber} className="space-y-0">
                              {/* Dòng tiêu đề hoạt động */}
                              <div className="bg-teal-100/70 p-2.5 font-black text-xs text-teal-950 border-b border-slate-300 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span>{formatCleanActivityTitle(act.activityName, act.timeEstimate).toUpperCase()}</span>
                                  <span className="text-[10px] text-teal-700 font-bold bg-white/80 px-2 py-0.5 rounded-full border border-teal-200 shrink-0">
                                    Quy trình 4 bước
                                  </span>
                                </div>
                                {act.integrationNote && (
                                  <div>
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${
                                        act.integrationNote.includes('STEM')
                                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                                          : act.integrationNote.includes('CÔNG DÂN SỐ') || act.integrationNote.includes('CĐS') || act.integrationNote.includes('CDS')
                                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                          : 'bg-teal-200/80 text-teal-900 border-teal-300'
                                      }`}
                                    >
                                      <Sparkles className="w-3 h-3 shrink-0" />
                                      <span>{abbreviateIntegrationText(act.integrationNote)}</span>
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Tasks bên trong */}
                              <div className="divide-y divide-slate-200">
                                {act.tasks?.map((task) => (
                                  <div key={task.taskId} className="space-y-0">
                                    {/* Task Title (in nghiêng) */}
                                    <div className="bg-slate-50 p-2 font-bold italic text-xs text-slate-800 border-b border-slate-200 flex flex-col gap-1">
                                      <div>
                                        <span>{task.taskTitle}</span>
                                      </div>
                                      {task.integrationNote && (
                                        <div>
                                          <span
                                            className={`not-italic text-[10px] font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                              task.integrationNote.includes('STEM')
                                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                                : task.integrationNote.includes('CÔNG DÂN SỐ') || task.integrationNote.includes('CĐS') || task.integrationNote.includes('CDS')
                                                ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                                                : 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                                            }`}
                                          >
                                            <span>✦ {abbreviateIntegrationText(task.integrationNote)}</span>
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Steps 1 to 4 */}
                                    <div className="divide-y divide-dashed divide-slate-300">
                                      {task.steps?.map((step) => (
                                        <div
                                          key={step.stepNumber}
                                          className="grid grid-cols-2 text-xs divide-x divide-slate-200 hover:bg-slate-50/50 transition-colors"
                                        >
                                          <div className="p-3 space-y-1">
                                            <span className="font-bold text-teal-800 block text-[11px]">
                                              {step.stepName}:
                                            </span>
                                            <p className="text-slate-800 leading-relaxed whitespace-pre-line text-justify text-[13pt]">
                                              {step.teacherAction}
                                            </p>
                                          </div>
                                          <div className="p-3 space-y-1 bg-slate-50/30">
                                            <span className="font-bold text-slate-500 block text-[11px]">
                                              Thao tác / Phản hồi của HS:
                                            </span>
                                            <p className="text-slate-800 leading-relaxed whitespace-pre-line text-justify text-[13pt]">
                                              {step.studentAction}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 5. IV. ĐIỀU CHỈNH SAU BÀI DẠY (nếu có) */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide bg-slate-100 p-2 rounded-xl">
                        IV. ĐIỀU CHỈNH SAU BÀI DẠY (nếu có):
                      </h4>
                      <div className="pl-3 pr-2 space-y-3 pt-1">
                        {(!period.postLessonAdjustment ||
                          period.postLessonAdjustment.trim() === '' ||
                          period.postLessonAdjustment.includes('...')) ? (
                          <div className="space-y-3 py-1">
                            <div className="w-full border-b border-dotted border-slate-500 h-4"></div>
                            <div className="w-full border-b border-dotted border-slate-500 h-4"></div>
                          </div>
                        ) : (
                          period.postLessonAdjustment
                            .split('\n')
                            .map((line, lIdx) => (
                              <p key={lIdx} className="text-xs text-slate-800 italic text-justify leading-relaxed">
                                {line}
                              </p>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* MODAL CÀI ĐẶT GOOGLE GEMINI API KEY */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <Key className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Cấu hình Google Gemini API Key
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Dành cho triển khai Vercel, Netlify hoặc dùng cá nhân
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-teal-50/70 rounded-2xl border border-teal-200/80 space-y-2 text-xs text-slate-700">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <p className="font-medium leading-relaxed">
                    Khi bạn đưa website lên <strong className="text-teal-900">Vercel.app</strong>, việc cấu hình <strong>API Key</strong> riêng giúp bạn soạn giáo án không giới hạn, tự động nhận diện ảnh chụp và không bị lỗi quyền truy cập.
                  </p>
                </div>
                <div className="pt-1 border-t border-teal-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-teal-800 font-semibold">
                    Chưa có API Key?
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 underline hover:no-underline"
                  >
                    <span>Lấy API Key miễn phí tại Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 flex items-center justify-between">
                  <span>Dán Gemini API Key của bạn vào đây:</span>
                  {customApiKey && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                      ✓ Đã lưu
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-teal-600 focus:bg-white rounded-2xl text-xs text-slate-800 font-mono outline-none transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPassword ? 'Ẩn API Key' : 'Hiện API Key'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  * API Key được lưu an toàn trực tiếp trên trình duyệt của bạn (LocalStorage) và không bị chia sẻ.
                </p>
              </div>

              {testStatus && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-start gap-2 border ${
                    testStatus.loading
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : testStatus.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testStatus.loading ? (
                    <RefreshCw className="w-4 h-4 text-teal-600 animate-spin shrink-0 mt-0.5" />
                  ) : testStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium leading-relaxed">
                    {testStatus.loading ? 'Đang gửi yêu cầu kiểm tra API Key tới Google...' : testStatus.message}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={testStatus?.loading || !inputKey.trim()}
                  className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testStatus?.loading ? 'animate-spin' : ''}`} />
                  <span>Kiểm tra</span>
                </button>
                {customApiKey && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="px-3 py-2 rounded-2xl hover:bg-rose-50 text-rose-600 text-xs font-bold transition-all cursor-pointer"
                  >
                    Xóa Key
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveApiKey(inputKey)}
                  className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu API Key</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
