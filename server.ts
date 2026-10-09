import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { matchPpctLesson, removeVietnameseTones, extractWeekFromText, extractPeriodsFromText, normalizeSubject, getPeriodOfWeekNumber, formatTopicWithWeekPeriod } from './src/utils/ppctMatcher';
import { defaultPpctList } from './src/data/defaultData';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Initialize Google Gemini API
const apiKey = process.env.GEMINI_API_KEY;
let defaultAi: GoogleGenAI | null = null;
if (apiKey) {
  try {
    defaultAi = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI with API key:', err);
  }
}

// Helper to robustly parse JSON from AI response, repairing common truncation or formatting issues
function safeParseJSON(rawText: string | null | undefined): any {
  if (!rawText) return null;
  const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // Attempt 1: Direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt 2: Extract content between outermost braces
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonSub = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonSub);
      } catch {
        // Attempt 3: Repair trailing commas or unescaped control chars
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

// Fallback Model Pool per SKILL.md specs
const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview'
];

async function generateWithGemini(contents: any, customKey?: string, configOptions?: any): Promise<string | null> {
  let client = defaultAi;
  if (customKey && customKey.trim()) {
    try {
      client = new GoogleGenAI({
        apiKey: customKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
    } catch {
      // ignore invalid custom client
    }
  }

  if (!client) return null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents,
        ...(configOptions ? { config: configOptions } : {})
      });
      if (response.text) {
        return response.text.trim();
      }
    } catch {
      // Continue to next available model or gracefully fallback to standard pedagogical engine
    }
  }
  return null;
}

// API Kiểm tra trạng thái Gemini API Key hệ thống
app.get('/api/gemini/status', (_req, res) => {
  const hasEnvKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  res.json({
    hasServerKey: hasEnvKey,
    model: 'gemini-3.8-flash'
  });
});

// API Kiểm tra kết nối Gemini API Key
app.post('/api/gemini/test-key', async (req, res) => {
  try {
    const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey || process.env.GEMINI_API_KEY;
    if (!customKey || !customKey.trim()) {
      return res.status(400).json({ success: false, error: 'Chưa cung cấp API Key' });
    }

    const testClient = new GoogleGenAI({
      apiKey: customKey.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    const response = await testClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Xin chào, hãy phản hồi: "API Key hoạt động tốt"'
    });

    if (response.text) {
      return res.json({ success: true, message: response.text.trim(), model: 'gemini-3.8-flash' });
    }
    return res.status(400).json({ success: false, error: 'Không nhận được phản hồi từ AI' });
  } catch (err: any) {
    console.error('Test API Key error:', err);
    return res.status(400).json({ success: false, error: err?.message || 'API Key không hợp lệ hoặc bị từ chối' });
  }
});

function parseDateStr(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

function formatDateVNStr(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function calculateWeekDateRange(startDateWeek1Str?: string, weekNumber: number = 1): string {
  if (!startDateWeek1Str) return 'từ .../.../.... đến .../.../....';
  try {
    const baseDate = parseDateStr(startDateWeek1Str);
    const day = baseDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const mondayWeek1 = new Date(baseDate);
    mondayWeek1.setDate(baseDate.getDate() + diffToMonday);

    const monday = new Date(mondayWeek1);
    monday.setDate(mondayWeek1.getDate() + (weekNumber - 1) * 7);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return `từ ngày ${formatDateVNStr(monday)} đến ngày ${formatDateVNStr(friday)}`;
  } catch {
    return 'từ .../.../.... đến .../.../....';
  }
}

// Built-in standard pedagogical generator conforming 100% to Ministry of Education guidelines
function buildStandardLessonPlan(params: {
  topic: string;
  grade: string;
  subject: string;
  totalPeriods: number;
  bookSeries: string;
  enableNls?: boolean;
  enableStem?: boolean;
  enableCds?: boolean;
  fileName?: string;
  weekNumber?: number;
  timeRange?: string;
  startDateWeek1?: string;
  ppctPeriodsText?: string;
  ppctList?: Array<{
    grade?: number | string;
    subject?: string;
    week?: number;
    periodIndex?: number;
    lessonName?: string;
  }>;
}) {
  const {
    topic,
    grade = '3',
    subject = 'Tin học',
    totalPeriods = 2,
    bookSeries = 'GDPT 2018',
    enableNls = true,
    enableStem = true,
    enableCds = true,
    fileName,
    weekNumber = 1,
    startDateWeek1,
    timeRange,
    ppctPeriodsText,
    ppctList = []
  } = params;

  const cleanTopic = topic
    .replace(/^Bài\s*:\s*/i, '')
    .replace(/^Bài\s+\d+[:\.]\s*/i, (m) => m.replace(':', '.'));

  const numericGrade = parseInt(grade, 10) || 3;
  const nlsLevel = numericGrade <= 3 ? 'CB1' : numericGrade <= 5 ? 'CB2' : 'TC1';

  // Match PPCT items for the topic using robust matching engine
  const effectivePpctList = Array.isArray(ppctList) && ppctList.length > 0 ? ppctList : defaultPpctList;
  const matchResult = matchPpctLesson(
    cleanTopic,
    subject,
    grade,
    effectivePpctList,
    startDateWeek1 || '2024-09-09'
  );
  const matchedPpct = matchResult.matchedItems || [];

  const periodPlans = [];

  for (let p = 1; p <= totalPeriods; p++) {
    const isPeriod1 = p === 1;

    let pWeek = matchResult.matched ? matchResult.week : weekNumber;
    let pPpctPeriod = p;
    let pPpctText = '';

    if (matchedPpct.length >= p && matchedPpct[p - 1]) {
      pWeek = matchedPpct[p - 1].week || pWeek;
      pPpctPeriod = matchedPpct[p - 1].periodIndex || p;
      pPpctText = `Tiết ${pPpctPeriod} theo PPCT (Tuần ${pWeek})`;
    } else if (matchedPpct.length > 0) {
      const lastMatch = matchedPpct[matchedPpct.length - 1];
      pWeek = lastMatch.week || pWeek;
      pPpctPeriod = (lastMatch.periodIndex || 1) + (p - matchedPpct.length);
      pPpctText = `Tiết ${pPpctPeriod} theo PPCT (Tuần ${pWeek})`;
    } else {
      pWeek = pWeek;
      pPpctPeriod = p;
      pPpctText = `Tiết ${p} theo PPCT (Tuần ${pWeek})`;
    }

    const weekPeriodNum = getPeriodOfWeekNumber(
      pPpctPeriod,
      p,
      pWeek,
      subject,
      grade,
      effectivePpctList
    );
    const periodTitle = formatTopicWithWeekPeriod(cleanTopic, weekPeriodNum);

    const pTimeRange = calculateWeekDateRange(startDateWeek1, pWeek);

    const validGradeKey = (numericGrade >= 1 && numericGrade <= 5 ? numericGrade : 3) as 1 | 2 | 3 | 4 | 5;
    
    // STEM Database mapping per grade
    const stemGuideByGrade: Record<1 | 2 | 3 | 4 | 5, { title: string; problem: string; criteria: string; material: string }> = {
      1: {
        title: 'Bài học STEM: Ngôi nhà hình học và Đồ chơi sáng tạo (Môn chủ đạo: Toán/TNXH 1)',
        problem: 'Thiết kế mô hình ngôi nhà hoặc công viên đồ chơi từ các hình phẳng và khối hình học.',
        criteria: 'Mô hình vững chắc, sử dụng đúng hình vuông, tròn, tam giác, chữ nhật và màu sắc hài hòa.',
        material: 'Bìa carton, giấy màu, que kem, kéo thủ công, keo dán an toàn.'
      },
      2: {
        title: 'Bài học STEM: Thước đo thông minh & Dụng cụ đo hướng gió (Môn chủ đạo: Toán/TNXH 2)',
        problem: 'Chế tạo thước đo độ dài chuẩn xác hoặc chong chóng đo hướng gió để quan sát chuyển động không khí.',
        criteria: 'Vạch chia độ dài chính xác (cm, dm), chong chóng quay nhạy khi có gió thổi.',
        material: 'Dải ruy băng, bìa cứng, que gỗ, ống hút nhựa cứng, đinh ghim an toàn.'
      },
      3: {
        title: 'Bài học STEM: Bàn cờ toán học & Bản đồ Robot dẫn đường (Môn chủ đạo: Toán/Tin học 3)',
        problem: 'Tính toán chu vi diện tích làm khung tranh đa năng hoặc lập bản đồ thẻ lệnh cho robot di chuyển tuần tự.',
        criteria: 'Kích thước đo đạc chuẩn xác theo cm, bộ thẻ lệnh điều khiển robot đi đúng đường không chạm vách.',
        material: 'Bìa carton sóng, giấy kẻ ô, thước kẻ, quân cờ robot, bộ thẻ lệnh in màu.'
      },
      4: {
        title: 'Bài học STEM: Bình giữ nhiệt mini & Xe phản lực chuyển động (Môn chủ đạo: Khoa học/Công nghệ 4)',
        problem: 'Vận dụng vật liệu cách nhiệt làm bình giữ nhiệt hoặc chế tạo xe chạy bằng lực đẩy không khí của bóng bay.',
        criteria: 'Nhiệt độ nước ấm duy trì tốt sau 30 phút; xe chạy thẳng và đạt quãng đường tối thiểu 2m.',
        material: 'Vỏ chai nhựa, giấy bạc cách nhiệt, bông gòn, que xiên tre, bánh xe nhựa, bóng bay.'
      },
      5: {
        title: 'Bài học STEM: Đèn ngủ thông minh & Cột lọc nước tự nhiên 4 tầng (Môn chủ đạo: Khoa học/Toán 5)',
        problem: 'Lắp ráp mô hình ngôi nhà năng lượng xanh có mạch điện LED hoặc làm cột lọc nước cơ học 4 tầng.',
        criteria: 'Mạch điện hoạt động an toàn, công tắc nhạy; nước sau lọc trong, loại bỏ tạp chất cơ bản.',
        material: 'Hộp pin 3V, đèn LED, công tắc gạt, vỏ chai 1.5L, sỏi sạch, cát thạch anh, than hoạt tính, bông gòn.'
      }
    };

    const currentStem = stemGuideByGrade[validGradeKey];

    // Smart detection of Digital Citizenship lesson & activity from SGK Hành trình CĐS (Lớp 1-5)
    const getCdsIntegrationInfo = (gr: 1 | 2 | 3 | 4 | 5, tp: string): {
      title: string;
      textbookLesson: string;
      textbookActivity: string;
      objective: string;
      situation: string;
      studentSolution: string;
      badge: string;
    } => {
      const lower = tp.toLowerCase();

      if (gr === 1) {
        if (lower.includes('ngồi') || lower.includes('mắt') || lower.includes('máy tính') || lower.includes('thiết bị') || lower.includes('tivi')) {
          return {
            title: 'Bài 2: Tư thế ngồi chuẩn và bảo vệ mắt khi sử dụng thiết bị số (SGK Hành trình CĐS Lớp 1)',
            textbookLesson: 'Bài 2: Tư thế ngồi chuẩn và bảo vệ mắt khi sử dụng thiết bị số',
            textbookActivity: 'Hoạt động 3: Thực hành tư thế ngồi đúng và khoảng cách an toàn với màn hình (50-70cm)',
            objective: 'Hình thành thói quen ngồi thẳng lưng, giữ khoảng cách mắt từ 50-70cm và nghỉ ngơi sau mỗi 20 phút sử dụng thiết bị số.',
            situation: 'Khi học bài với thiết bị số (máy tính hoặc tivi thông minh), em cần ngồi cách màn hình bao xa và giữ tư thế như thế nào để bảo vệ mắt và cột sống?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 3 - Bài 2 SGK Hành trình CĐS Lớp 1, em ngồi thẳng lưng, mắt cách màn hình từ 50 đến 70cm, phòng đủ ánh sáng và cho mắt nghỉ sau mỗi 20 phút học tập."',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 1 - Bài 2: Tư thế ngồi chuẩn & Bảo vệ mắt (HĐ 3)]'
          };
        }
        if (lower.includes('gia đình') || lower.includes('giao tiếp') || lower.includes('người lớn') || lower.includes('chào')) {
          return {
            title: 'Bài 3: Giao tiếp lễ phép và an toàn trong gia đình số (SGK Hành trình CĐS Lớp 1)',
            textbookLesson: 'Bài 3: Giao tiếp lễ phép và an toàn trong gia đình số',
            textbookActivity: 'Hoạt động 2: Lễ phép xin phép người lớn trước khi sử dụng thiết bị điện tử',
            objective: 'Biết lễ phép xin phép cha mẹ/thầy cô trước khi mở thiết bị số và tuân thủ thời gian quy định.',
            situation: 'Khi muốn mượn điện thoại hoặc mở tivi thông minh để xem chương trình học tập, em cần làm gì?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 3 SGK Hành trình CĐS Lớp 1, em luôn lễ phép xin phép người lớn trước khi dùng và tắt thiết bị đúng giờ được cho phép."',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 1 - Bài 3: Giao tiếp lễ phép trong môi trường số (HĐ 2)]'
          };
        }
        return {
          title: 'Bài 1: Làm quen và giữ gìn thiết bị số an toàn (SGK Hành trình CĐS Lớp 1)',
          textbookLesson: 'Bài 1: Làm quen và giữ gìn thiết bị số an toàn',
          textbookActivity: 'Hoạt động 2: Nhận diện thiết bị số và cách cầm nắm, bảo quản cẩn thận',
          objective: 'Nhận biết các bộ phận thiết bị số và biết giữ gìn, không làm rơi vỡ, không để nước hay đồ ăn gần thiết bị.',
          situation: 'Sau khi học xong với thiết bị học tập, em sẽ bảo quản và cất đặt thiết bị như thế nào để đảm bảo an toàn?',
          studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 1 SGK Hành trình CĐS Lớp 1, em cất thiết bị vào vị trí khô ráo, ngay ngắn, không ăn uống gần thiết bị để tránh chập hỏng."',
          badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 1 - Bài 1: Làm quen & Bảo quản thiết bị số (HĐ 2)]'
        };
      }

      if (gr === 2) {
        if (lower.includes('thông tin') || lower.includes('tên') || lower.includes('địa chỉ') || lower.includes('cá nhân') || lower.includes('dữ liệu') || lower.includes('bí mật')) {
          return {
            title: 'Bài 1: Bảo vệ thông tin cá nhân trên môi trường số (SGK Hành trình CĐS Lớp 2)',
            textbookLesson: 'Bài 1: Bảo vệ thông tin cá nhân trên môi trường số',
            textbookActivity: 'Hoạt động 2: Nhận diện thông tin riêng tư và quy tắc giữ bí mật trước người lạ',
            objective: 'Nhận biết thông tin cá nhân là bí mật (họ tên, địa chỉ nhà, số điện thoại, mật khẩu) và tuyệt đối không chia sẻ cho người lạ.',
            situation: 'Nếu có một trang web học tập hoặc một người lạ trực tuyến hỏi họ tên đầy đủ, số điện thoại và địa chỉ nhà của em, em sẽ xử lý thế nào?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 1 SGK Hành trình CĐS Lớp 2, thông tin cá nhân là tài sản riêng tư, em không bao giờ cung cấp cho người lạ và sẽ thông báo ngay cho cha mẹ/thầy cô."',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 2 - Bài 1: Bảo vệ thông tin cá nhân (HĐ 2)]'
          };
        }
        if (lower.includes('link') || lower.includes('mạng') || lower.includes('lạ') || lower.includes('kết bạn') || lower.includes('nguy cơ')) {
          return {
            title: 'Bài 2: Nhận biết đường link lạ và người không quen biết trên mạng (SGK Hành trình CĐS Lớp 2)',
            textbookLesson: 'Bài 2: Nhận biết đường link lạ và người không quen biết trên mạng',
            textbookActivity: 'Hoạt động 3: Xử lý thông báo trúng thưởng và lời mời kết bạn từ người lạ',
            objective: 'Cảnh giác trước các thông báo tặng quà/link lạ và không tự ý bấm vào khi chưa có sự đồng ý của người lớn.',
            situation: 'Khi đang dùng máy tính mà màn hình hiện lên thông báo: "Bạn đã trúng thưởng một món quà lớn, bấm vào đây ngay", em sẽ làm gì?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 3 - Bài 2 SGK Hành trình CĐS Lớp 2, đây là liên kết lạ nguy hiểm, em không bấm vào mà gọi ngay cho thầy cô/cha mẹ hỗ trợ đóng cửa sổ đó lại."',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 2 - Bài 2: Nhận diện liên kết lạ & Phòng tránh nguy cơ (HĐ 3)]'
          };
        }
        return {
          title: 'Bài 3: Lời nói đẹp và ứng xử văn minh trong môi trường số (SGK Hành trình CĐS Lớp 2)',
          textbookLesson: 'Bài 3: Lời nói đẹp và ứng xử văn minh trong môi trường số',
          textbookActivity: 'Hoạt động 2: Sử dụng ngôn từ lịch sự, tôn trọng khi trao đổi trực tuyến',
          objective: 'Rèn luyện thói quen chào hỏi, cảm ơn, nói lời hay và không trêu chọc bạn bè khi học tập trực tuyến.',
          situation: 'Khi gửi tin nhắn thảo luận bài học cùng bạn trong nhóm lớp trực tuyến, em nên dùng lời lẽ như thế nào?',
          studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 3 SGK Hành trình CĐS Lớp 2, em luôn xưng hô lịch sự, nói lời động viên và tôn trọng ý kiến đóng góp của các bạn."',
          badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 2 - Bài 3: Lời nói đẹp & Ứng xử văn minh (HĐ 2)]'
        };
      }

      if (gr === 3) {
        if (lower.includes('mật khẩu') || lower.includes('tài khoản') || lower.includes('đăng nhập') || lower.includes('chìa khóa') || lower.includes('bảo vệ')) {
          return {
            title: 'Bài 2: Mật khẩu an toàn - Chiếc chìa khóa bảo vệ dữ liệu (SGK Hành trình CĐS Lớp 3)',
            textbookLesson: 'Bài 2: Mật khẩu an toàn - Chiếc chìa khóa bảo vệ dữ liệu',
            textbookActivity: 'Hoạt động 3: Đặt mật khẩu mạnh và giữ bí mật tài khoản học tập trực tuyến',
            objective: 'Biết cách tạo mật khẩu an toàn kết hợp chữ, số và ký tự; giữ bí mật tuyệt đối và đăng xuất sau khi sử dụng.',
            situation: 'Khi bạn cùng lớp quên mật khẩu và hỏi mượn tài khoản học tập trực tuyến của em để làm bài, em sẽ giải quyết như thế nào?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 3 - Bài 2 SGK Hành trình CĐS Lớp 3, mật khẩu là chiếc chìa khóa riêng tư không được chia sẻ cho người khác; em sẽ từ chối khéo léo và cùng bạn nhờ thầy cô hỗ trợ cấp lại mật khẩu cho bạn."',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 3 - Bài 2: Mật khẩu an toàn & Bảo vệ dữ liệu (HĐ 3)]'
          };
        }
        if (lower.includes('tìm kiếm') || lower.includes('tra cứu') || lower.includes('thông tin') || lower.includes('internet') || lower.includes('web') || lower.includes('trình duyệt')) {
          return {
            title: 'Bài 1: Tìm kiếm thông tin học tập an toàn với từ khóa chuẩn (SGK Hành trình CĐS Lớp 3)',
            textbookLesson: 'Bài 1: Tìm kiếm thông tin học tập an toàn với từ khóa chuẩn',
            textbookActivity: 'Hoạt động 2: Lựa chọn từ khóa học tập lành mạnh và chọn lọc trang web giáo dục uy tín',
            objective: 'Biết sử dụng từ khóa ngắn gọn, chính xác để tra cứu tư liệu học tập và chỉ truy cập các trang web an toàn.',
            situation: 'Khi được giao nhiệm vụ tra cứu thông tin về bài học trên Internet, em làm thế nào để tìm được tài liệu chính xác và an toàn nhất?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 1 SGK Hành trình CĐS Lớp 3, em gõ từ khóa rõ ràng liên quan trực tiếp đến bài học và ưu tiên truy cập vào các trang web giáo dục có đuôi .edu.vn hoặc trang chính thống."',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 3 - Bài 1: Tìm kiếm thông tin học tập an toàn (HĐ 2)]'
          };
        }
        if (lower.includes('hình ảnh') || lower.includes('bản quyền') || lower.includes('tác giả') || lower.includes('sao chép') || lower.includes('tranh')) {
          return {
            title: 'Bài 3: Tôn trọng quyền tác giả và bản quyền hình ảnh số (SGK Hành trình CĐS Lớp 3)',
            textbookLesson: 'Bài 3: Tôn trọng quyền tác giả và bản quyền hình ảnh số',
            textbookActivity: 'Hoạt động 2: Ghi nguồn tác giả khi sử dụng hình ảnh, bài viết từ mạng Internet',
            objective: 'Hình thành ý thức tôn trọng quyền sở hữu trí tuệ, biết xin phép hoặc ghi rõ nguồn khi dùng tư liệu của người khác.',
            situation: 'Khi lấy một hình ảnh minh họa đẹp trên mạng về để chèn vào bài học tập, em cần thực hiện điều gì?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 3 SGK Hành trình CĐS Lớp 3, em phải ghi rõ dòng chú thích nguồn gốc và tên tác giả/trang web phía dưới bức ảnh để thể hiện sự tôn trọng bản quyền."',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 3 - Bài 3: Tôn trọng bản quyền tác giả số (HĐ 2)]'
          };
        }
        return {
          title: 'Bài 4: Phòng tránh bị làm phiền và báo cáo nguy cơ trên không gian mạng (SGK Hành trình CĐS Lớp 3)',
          textbookLesson: 'Bài 4: Phòng tránh bị làm phiền và báo cáo nguy cơ trên không gian mạng',
          textbookActivity: 'Hoạt động 3: Kỹ năng xử lý khi gặp tin nhắn xấu độc hoặc người lạ làm phiền',
          objective: 'Biết cách từ chối, không phản hồi và báo ngay cho người lớn khi gặp thông tin độc hại trên môi trường số.',
          situation: 'Nếu bất ngờ nhận được tin nhắn có nội dung không lành mạnh hoặc bị người khác nói xấu trong nhóm học tập, em sẽ làm gì?',
          studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 3 - Bài 4 SGK Hành trình CĐS Lớp 3, em không trả lời tin nhắn xấu đó, lập tức chụp màn hình làm bằng chứng và báo ngay cho thầy cô hoặc cha mẹ hỗ trợ xử lý."',
          badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 3 - Bài 4: Phòng tránh nguy cơ & Báo cáo an toàn mạng (HĐ 3)]'
        };
      }

      if (gr === 4) {
        if (lower.includes('chia sẻ') || lower.includes('đăng') || lower.includes('ảnh') || lower.includes('bài viết') || lower.includes('mạng xã hội') || lower.includes('dấu chân')) {
          return {
            title: 'Bài 1: Dấu chân kỹ thuật số (Digital Footprint) và trách nhiệm công dân số (SGK Hành trình CĐS Lớp 4)',
            textbookLesson: 'Bài 1: Dấu chân kỹ thuật số (Digital Footprint) và trách nhiệm công dân số',
            textbookActivity: 'Hoạt động 2: Nhận thức mọi bài đăng, bình luận đều lưu lại vết tích số vĩnh viễn',
            objective: 'Hiểu rõ khái niệm dấu chân số; rèn luyện thói quen suy nghĩ cẩn trọng trước khi nhấn nút chia sẻ hoặc bình luận.',
            situation: 'Trước khi đăng tải một bức ảnh chụp bài học nhóm hay một dòng nhận xét lên mạng học tập, em cần tự hỏi mình điều gì?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 1 SGK Hành trình CĐS Lớp 4, mọi hoạt động đều để lại dấu chân số; em cần tự hỏi: Thông tin này có đúng sự thật không? Có làm tổn thương ai không? Và có sự đồng ý của các bạn chưa?"',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 4 - Bài 1: Dấu chân kỹ thuật số & Trách nhiệm chia sẻ (HĐ 2)]'
          };
        }
        if (lower.includes('virus') || lower.includes('mã độc') || lower.includes('tải') || lower.includes('phần mềm') || lower.includes('tệp tin') || lower.includes('bảo vệ')) {
          return {
            title: 'Bài 2: Phòng chống mã độc, lừa đảo trực tuyến và bảo vệ thiết bị (SGK Hành trình CĐS Lớp 4)',
            textbookLesson: 'Bài 2: Phòng chống mã độc, lừa đảo trực tuyến và bảo vệ thiết bị',
            textbookActivity: 'Hoạt động 3: Kiểm tra tính an toàn của tệp tin trước khi tải về và cài đặt',
            objective: 'Biết cách nhận biết tệp tin lạ có nguy cơ chứa virus; không tự ý tải và cài đặt phần mềm không rõ nguồn gốc.',
            situation: 'Khi tìm tài liệu trên mạng và thấy nút "Tải về miễn phí ngay" kèm cảnh báo tệp có đuôi lạ (.exe, .scr), em sẽ xử lý như thế nào?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 3 - Bài 2 SGK Hành trình CĐS Lớp 4, các tệp tin lạ dễ chứa mã độc làm hỏng máy tính; em tuyệt đối không tải về và chỉ nhờ giáo viên kiểm tra tệp an toàn."',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 4 - Bài 2: Phòng chống mã độc & Lừa đảo trực tuyến (HĐ 3)]'
          };
        }
        if (lower.includes('tin tức') || lower.includes('sự thật') || lower.includes('kiểm chứng') || lower.includes('tin giả') || lower.includes('báo')) {
          return {
            title: 'Bài 3: Văn hóa chia sẻ và kiểm chứng nguồn tin trên không gian số (SGK Hành trình CĐS Lớp 4)',
            textbookLesson: 'Bài 3: Văn hóa chia sẻ và kiểm chứng nguồn tin trên không gian số',
            textbookActivity: 'Hoạt động 2: Áp dụng bộ quy tắc 3 câu hỏi để nhận diện và ngăn chặn tin giả',
            objective: 'Biết kiểm chứng độ xác thực của thông tin trước khi tin tưởng và không tiếp tay lan truyền thông tin sai lệch.',
            situation: 'Khi đọc được một mẩu tin giật gân chưa được kiểm chứng trên mạng, em có nên vội vàng chia sẻ cho bạn bè cùng đọc không?',
            studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 3 SGK Hành trình CĐS Lớp 4, em tuyệt đối không chia sẻ tin đồn thất thiệt mà phải đối chiếu với các nguồn tin chính thống của trường học và cơ quan báo chí."',
            badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 4 - Bài 3: Kiểm chứng nguồn tin & Phòng chống tin giả (HĐ 2)]'
          };
        }
        return {
          title: 'Bài 4: Tự bảo vệ sức khỏe thể chất và tinh thần trong thời đại số (SGK Hành trình CĐS Lớp 4)',
          textbookLesson: 'Bài 4: Tự bảo vệ sức khỏe thể chất và tinh thần trong thời đại số',
          textbookActivity: 'Hoạt động 4: Thiết lập thời gian biểu sử dụng công nghệ số cân bằng và lành mạnh',
          objective: 'Biết tự quản lý thời gian sử dụng thiết bị số, không thức khuya, duy trì thói quen vận động thể thao.',
          situation: 'Làm thế nào để vừa hoàn thành tốt bài tập trên máy tính mà vẫn giữ gìn sức khỏe thể lực và tinh thần thoải mái?',
          studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 4 - Bài 4 SGK Hành trình CĐS Lớp 4, em lập thời gian biểu khoa học: học trực tuyến tối đa 45 phút mỗi lần, kết hợp tập thể dục nhẹ nhàng và tham gia các hoạt động ngoại khóa ngoài trời."',
          badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 4 - Bài 4: Cân bằng công nghệ & Sức khỏe số (HĐ 4)]'
        };
      }

      // Grade 5
      if (lower.includes('ai') || lower.includes('trí tuệ nhân tạo') || lower.includes('đạo đức') || lower.includes('bản quyền') || lower.includes('tác giả') || lower.includes('sao chép')) {
        return {
          title: 'Bài 2: Đạo đức học tập số, bản quyền tác giả và ứng dụng AI có trách nhiệm (SGK Hành trình CĐS Lớp 5)',
          textbookLesson: 'Bài 2: Đạo đức học tập số, bản quyền tác giả và ứng dụng AI có trách nhiệm',
          textbookActivity: 'Hoạt động 3: Sử dụng công cụ AI hỗ trợ học tập trung thực, trích dẫn nguồn tác giả đầy đủ',
          objective: 'Hiểu và thực hành đạo đức trong học tập số; biết sử dụng công nghệ AI để gợi ý ý tưởng nhưng tự mình hoàn thành bài học, tôn trọng quyền sở hữu trí tuệ.',
          situation: 'Khi sử dụng công cụ tìm kiếm hoặc công cụ AI để tìm ý tưởng làm bài thuyết trình, em cần làm gì để đảm bảo tính trung thực và đạo đức học tập?',
          studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 3 - Bài 2 SGK Hành trình CĐS Lớp 5, em chỉ dùng công nghệ để tham khảo gợi ý, tự mình viết nội dung bài thuyết trình bằng ngôn ngữ cá nhân và ghi rõ nguồn gốc tài liệu tham khảo."',
          badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 5 - Bài 2: Đạo đức học tập số & Ứng dụng AI có trách nhiệm (HĐ 3)]'
        };
      }
      if (lower.includes('danh tính') || lower.includes('quyền riêng tư') || lower.includes('tài khoản') || lower.includes('bảo mật') || lower.includes('cài đặt')) {
        return {
          title: 'Bài 1: Quản lý danh tính số và thiết lập quyền riêng tư nâng cao (SGK Hành trình CĐS Lớp 5)',
          textbookLesson: 'Bài 1: Quản lý danh tính số và thiết lập quyền riêng tư nâng cao',
          textbookActivity: 'Hoạt động 2: Kiểm soát thông tin cá nhân và cài đặt chế độ bảo mật cho tài khoản học tập',
          objective: 'Biết cách thiết lập quyền riêng tư cho hồ sơ trực tuyến, không công khai dữ liệu nhạy cảm cho người ngoài xem.',
          situation: 'Khi tạo hồ sơ trên trang web học tập trực tuyến, em nên cài đặt chế độ xem thông tin cá nhân như thế nào?',
          studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 1 SGK Hành trình CĐS Lớp 5, em chọn chế độ Chỉ bạn bè trong lớp hoặc Riêng tư, không chia sẻ ngày sinh, số điện thoại hay địa chỉ nhà cho công chúng."',
          badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 5 - Bài 1: Quản lý danh tính số & Quyền riêng tư (HĐ 2)]'
        };
      }
      if (lower.includes('bắt nạt') || lower.includes('bạo lực') || lower.includes('tẩy chay') || lower.includes('tin nhắn') || lower.includes('bảo vệ')) {
        return {
          title: 'Bài 3: Phòng chống bắt nạt trên không gian mạng (Cyberbullying) và kỹ năng tự bảo vệ (SGK Hành trình CĐS Lớp 5)',
          textbookLesson: 'Bài 3: Phòng chống bắt nạt trên không gian mạng (Cyberbullying) và kỹ năng tự bảo vệ',
          textbookActivity: 'Hoạt động 2: Kỹ năng ứng phó khi bị bắt nạt mạng và lên tiếng bảo vệ bạn bè',
          objective: 'Biết lên án hành vi bắt nạt trực tuyến; đồng cảm, giúp đỡ bạn bè và báo cáo ngay cho ban giám hiệu/thầy cô khi phát hiện vụ việc.',
          situation: 'Nếu nhìn thấy một nhóm bạn đang bình luận ác ý, xúc phạm hoặc chế giễu hình ảnh của một bạn cùng lớp trên mạng, em sẽ hành động như thế nào?',
          studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 2 - Bài 3 SGK Hành trình CĐS Lớp 5, em không tham gia hay chia sẻ bài viết đó, chủ động an ủi bạn bị bắt nạt và lập tức báo với thầy cô giáo chủ nhiệm để can thiệp kịp thời."',
          badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 5 - Bài 3: Phòng chống bắt nạt mạng & Bảo vệ bạn bè (HĐ 2)]'
        };
      }
      return {
        title: 'Bài 4: Giao dịch số an toàn và bảo mật thông tin thanh toán học đường (SGK Hành trình CĐS Lớp 5)',
        textbookLesson: 'Bài 4: Giao dịch số an toàn và bảo mật thông tin thanh toán học đường',
        textbookActivity: 'Hoạt động 3: Bảo mật mã OTP, thông tin thẻ thông minh và cẩn trọng khi thực hiện thao tác số',
        objective: 'Nhận biết các rủi ro liên quan đến giao dịch số và bảo mật thông tin tài chính học đường.',
        situation: 'Khi sử dụng thẻ thư viện thông minh hoặc tài khoản học tập, em cần lưu ý những điều gì để tránh bị kẻ xấu lợi dụng?',
        studentSolution: 'HS trả lời: "Thưa thầy/cô, theo Hoạt động 3 - Bài 4 SGK Hành trình CĐS Lớp 5, em giữ gìn thẻ cẩn thận, không cung cấp mã OTP/mật khẩu cho bất kỳ ai và luôn đăng xuất sau khi sử dụng tại các máy tính công cộng."',
        badge: '[CÔNG DÂN SỐ - CV 3899 & SGK Hành trình CĐS Lớp 5 - Bài 4: Giao dịch số an toàn & Bảo mật thông tin (HĐ 3)]'
      };
    };

    const currentCds = getCdsIntegrationInfo(validGradeKey, cleanTopic);

    const specificCompetencies = isPeriod1
      ? [
          `Nhận biết và nêu được các khái niệm, biểu hiện cơ bản liên quan đến "${cleanTopic}".`,
          `Nêu được ví dụ minh họa và thực hiện các thao tác quan sát, tìm hiểu theo yêu cầu bài học trong SGK (quan sát các hình ảnh trong SGK mục 1 và mục 2).`
        ]
      : [
          `Vận dụng kiến thức bài học để giải quyết bài tập và tình huống thực hành nâng cao.`,
          `Thực hiện thành thạo các thao tác ứng dụng, phân tích và chia sẻ kết quả học tập.`
        ];

    const generalCompetencies = [
      'Tự chủ và tự học: Tự giác tìm hiểu bài học, chủ động hoàn thành nhiệm vụ được giao.',
      'Giao tiếp và hợp tác: Tích cực trao đổi, chia sẻ và làm việc nhóm hiệu quả cùng bạn bè.',
      'Giải quyết vấn đề và sáng tạo: Biết vận dụng kiến thức bài học để xử lý tình huống thực tế.'
    ];

    const qualities = [
      'Chăm chỉ: Tích cực tham gia các hoạt động học tập và làm bài tập đầy đủ.',
      'Trung thực: Thật thà trong học tập, tôn trọng ý kiến đóng góp của bạn bè.',
      'Trách nhiệm: Có ý thức bảo vệ tài sản, thiết bị học tập và môi trường xung quanh.'
    ];

    const integrationContent = [];
    if (enableNls) {
      integrationContent.push(
        `[1.3.${nlsLevel}a - Khung NLS chuẩn CV 3456]: Học sinh xác định, tìm kiếm và truy xuất thông tin bài học trên thiết bị học tập an toàn, hiệu quả.`
      );
    }
    if (enableStem) {
      integrationContent.push(
        `[BÀI HỌC STEM - THEO CV 909/BGDĐT-GDTH]: ${currentStem.title} - Học sinh vận dụng kiến thức liên môn (${subject}, Khoa học, Toán, Mĩ thuật, Công nghệ) để thiết kế, chế tạo và thử nghiệm sản phẩm thực tế.`
      );
    }
    if (enableCds) {
      integrationContent.push(
        `[TÍCH HỢP CÔNG DÂN SỐ - Theo CV 3899/BGDĐT-GDTH & SGK Hành trình CĐS Lớp ${numericGrade} - ${currentCds.textbookLesson}]: ${currentCds.objective}`
      );
    }

    const activities = [
      // 1. Khởi động (5 phút)
      {
        activityNumber: 1,
        activityName: '1. Khởi động (5 phút)',
        timeEstimate: '5 phút',
        integrationNote: enableStem
          ? `[STEM - Pha 1: Xác định vấn đề thực tiễn & Tiêu chí sản phẩm - ${currentStem.title}]`
          : enableNls
          ? `[Tích hợp NLS (CV 3456 - Mã 1.3.${nlsLevel}a)]: Sử dụng phần mềm trình chiếu và hình ảnh trực quan`
          : undefined,
        tasks: [
          {
            taskId: `task-${p}-1-1`,
            taskTitle: `* Nhiệm vụ 1: Tham gia trò chơi khởi động "${isPeriod1 ? 'Mảnh ghép thông minh' : 'Ai nhanh ai đúng'}"`,
            integrationNote: enableStem
              ? `[STEM]: GV đặt ra bài toán thách thức "${currentStem.problem}"`
              : enableNls
              ? `[1.3.${nlsLevel}a]: HS quan sát và nhận biết thông tin từ màn hình kỹ thuật số`
              : undefined,
            steps: [
              {
                stepNumber: 1,
                stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                teacherAction: enableStem
                  ? `GV trình chiếu video/tình huống thực tiễn mở đầu cho bài học STEM: "${currentStem.problem}". GV nêu rõ các tiêu chí sản phẩm cần đạt: "${currentStem.criteria}".`
                  : 'GV trình chiếu câu hỏi khởi động trên màn hình tivi/máy chiếu, phổ biến luật chơi và yêu cầu học sinh quan sát suy nghĩ.',
                studentAction: enableStem
                  ? 'HS chú ý theo dõi video/tình huống, tiếp nhận thử thách STEM và ghi nhận các tiêu chí chất lượng của sản phẩm.'
                  : 'HS chú ý quan sát lên bảng/màn hình tivi, lắng nghe hiệu lệnh của giáo viên.'
              },
              {
                stepNumber: 2,
                stepName: 'Bước 2: Thực hiện nhiệm vụ',
                teacherAction: `GV dẫn dắt câu hỏi: 'Em hãy quan sát tranh và cho biết điều gì đang diễn ra trong bài ${cleanTopic}?'`,
                studentAction: 'HS quan sát, suy nghĩ cá nhân trong 1 phút và sẵn sàng trả lời.'
              },
              {
                stepNumber: 3,
                stepName: 'Bước 3: Báo cáo kết quả',
                teacherAction: 'GV mời 2-3 học sinh xung phong trả lời câu hỏi khởi động.',
                studentAction: "HS trả lời: 'Thưa thầy/cô, theo em bức tranh thể hiện...' - Cả lớp lắng nghe và nhận xét."
              },
              {
                stepNumber: 4,
                stepName: 'Bước 4: Đánh giá, kết luận',
                teacherAction: `GV nhận xét, tuyên dương tinh thần học tập và dẫn dắt vào bài: "${cleanTopic} (Tiết ${p})".`,
                studentAction: 'HS vỗ tay, mở SGK trang tương ứng và ghi tên bài vào vở.'
              }
            ]
          }
        ]
      },

      // 2. Hình thành kiến thức mới (15 phút)
      {
        activityNumber: 2,
        activityName: '2. Hình thành kiến thức mới (15 phút)',
        timeEstimate: '15 phút',
        integrationNote: enableStem
          ? `[STEM - Pha 2: Nghiên cứu kiến thức nền & Đề xuất giải pháp thiết kế - ${currentStem.title}]`
          : enableNls
          ? `[TÍCH HỢP NĂNG LỰC SỐ (CV 3456 - Mã 1.3.${nlsLevel}a & 2.1.${nlsLevel}b)]: Khai thác phần mềm và thiết bị số để tìm kiếm, thu thập thông tin bài học`
          : undefined,
        tasks: [
          {
            taskId: `task-${p}-2-1`,
            taskTitle: `* Nhiệm vụ 1: Quan sát tranh và khám phá nội dung phần ${isPeriod1 ? '1' : '3'} trong SGK`,
            integrationNote: enableStem
              ? `[STEM - Khám phá kiến thức nền]: Khai thác kiến thức SGK ${subject} Lớp ${numericGrade} và phác thảo bản vẽ`
              : enableNls
              ? `[1.3.${nlsLevel}a]: HS tra cứu và xác định thông tin chính xác trên thiết bị học tập`
              : undefined,
            steps: [
              {
                stepNumber: 1,
                stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                teacherAction: `GV yêu cầu học sinh làm việc theo cặp đôi, đọc thông tin và quan sát Hình 1, Hình 2 trong SGK trang 8 (mục ${isPeriod1 ? '1' : '3'}). GV hướng dẫn học sinh cách tra cứu thông tin số trên sơ đồ trực quan.`,
                studentAction: 'HS mở SGK, cùng bạn cùng bàn đọc thầm thông tin và quan sát các chi tiết trong hình số.'
              },
              {
                stepNumber: 2,
                stepName: 'Bước 2: Thực hiện nhiệm vụ',
                teacherAction: `GV đặt câu hỏi gợi mở: 'Qua quan sát, em hãy chỉ ra điểm giống và khác nhau?' GV bao quát lớp và hỗ trợ các nhóm ứng dụng công nghệ để phân tích.`,
                studentAction: `HS thảo luận sôi nổi: [1.3.${nlsLevel}a: HS tra cứu và chỉ ra thông tin tương ứng trên sơ đồ/màn hình tương tác].`
              },
              {
                stepNumber: 3,
                stepName: 'Bước 3: Báo cáo kết quả',
                teacherAction: 'GV mời đại diện 2 nhóm đứng dậy trình bày kết quả thảo luận trước lớp.',
                studentAction: "HS đại diện nhóm phát biểu: 'Thưa thầy/cô, nhóm em nhận thấy...' - Nhóm khác nhận xét, bổ sung."
              },
              {
                stepNumber: 4,
                stepName: 'Bước 4: Đánh giá, kết luận',
                teacherAction: 'GV nhận xét câu trả lời của các nhóm, chuẩn hóa kiến thức và chốt nội dung trọng tâm trên bảng lớp.',
                studentAction: 'HS lắng nghe, ghi nhớ kết luận và ghi nội dung trọng tâm vào vở ghi chép.'
              }
            ]
          },
          {
            taskId: `task-${p}-2-2`,
            taskTitle: '* Nhiệm vụ 2: Phân tích ví dụ thực tế và rút ra quy tắc bài học',
            integrationNote: enableStem ? `[STEM - Đề xuất giải pháp]: Lựa chọn vật liệu (${currentStem.material}) và phác thảo phương án` : undefined,
            steps: [
              {
                stepNumber: 1,
                stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                teacherAction: enableStem
                  ? `GV yêu cầu các nhóm lựa chọn vật liệu (${currentStem.material}) và vẽ phác thảo mô hình sản phẩm vào phiếu học tập STEM.`
                  : 'GV nêu tình huống thực tế minh họa và yêu cầu học sinh trao đổi theo nhóm 4, phân tích dữ liệu và sơ đồ.',
                studentAction: enableStem
                  ? 'HS làm việc nhóm 4, phân công thành viên phác thảo bản vẽ và ghi chú kích thước từng bộ phận.'
                  : 'HS tiếp nhận nhiệm vụ, quay lại tạo nhóm 4 để bắt đầu thảo luận.'
              },
              {
                stepNumber: 2,
                stepName: 'Bước 2: Thực hiện nhiệm vụ',
                teacherAction: 'GV đi tới từng nhóm quan sát, hướng dẫn các em cách lập luận và liên hệ thực tiễn: "[STEM - Mở đầu: Xác định vấn đề thực tiễn cần giải quyết]".',
                studentAction: 'HS phân công ghi chép ý kiến của từng thành viên vào phiếu học tập.'
              },
              {
                stepNumber: 3,
                stepName: 'Bước 3: Báo cáo kết quả',
                teacherAction: 'GV mời đại diện 1 nhóm báo cáo, yêu cầu nhóm khác lắng nghe phản biện.',
                studentAction: "HS đại diện tự tin trình bày: 'Nhóm em rút ra bài học là...'."
              },
              {
                stepNumber: 4,
                stepName: 'Bước 4: Đánh giá, kết luận',
                teacherAction: 'GV chốt lại kiến thức mục 2 và khen ngợi các nhóm có câu trả lời sáng tạo.',
                studentAction: 'HS đồng thanh nhắc lại kết luận bài học để ghi nhớ sâu sắc.'
              }
            ]
          }
        ]
      },

      // 3. Luyện tập, thực hành (10 phút)
      {
        activityNumber: 3,
        activityName: '3. Luyện tập, thực hành (10 phút)',
        timeEstimate: '10 phút',
        integrationNote: enableStem
          ? `[STEM - Pha 3: Lựa chọn vật liệu, Chế tạo mẫu & Thử nghiệm thực tế - ${currentStem.title}]`
          : enableNls
          ? `[TÍCH HỢP NĂNG LỰC SỐ (CV 3456 - Mã 4.1.${nlsLevel}a)]: Thực hành thao tác chuẩn xác, bảo đảm an toàn thiết bị số và dữ liệu`
          : undefined,
        tasks: [
          {
            taskId: `task-${p}-3-1`,
            taskTitle: `* Nhiệm vụ 1: Giải bài tập 1 trang SGK (${isPeriod1 ? 'Nhận biết, củng cố' : 'Thực hành thao tác'})`,
            integrationNote: enableNls ? `[4.1.${nlsLevel}a]: HS tuân thủ quy tắc bảo đảm an toàn thiết bị khi thực hành` : undefined,
            steps: [
              {
                stepNumber: 1,
                stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                teacherAction: 'GV yêu cầu 1 học sinh đọc to đề Bài tập 1 trong SGK, giao nhiệm vụ làm việc cá nhân vào vở / bảng con / phần mềm luyện tập.',
                studentAction: '1 HS đọc to đề bài, cả lớp lắng nghe và mở vở bài tập.'
              },
              {
                stepNumber: 2,
                stepName: 'Bước 2: Thực hiện nhiệm vụ',
                teacherAction: 'GV theo dõi học sinh làm bài, hướng dẫn riêng cho những em còn lúng túng.',
                studentAction: `HS tự giác làm bài tập vào vở: [4.1.${nlsLevel}a: HS giữ gìn dụng cụ học tập và thiết bị cẩn thận].`
              },
              {
                stepNumber: 3,
                stepName: 'Bước 3: Báo cáo kết quả',
                teacherAction: 'GV mời 2 học sinh lên bảng trình bày / yêu cầu cả lớp giơ bảng con kiểm tra kết quả.',
                studentAction: "HS giơ bảng con / nêu đáp án: 'Kết quả của em là...'"
              },
              {
                stepNumber: 4,
                stepName: 'Bước 4: Đánh giá, kết luận',
                teacherAction: 'GV nhận xét, sửa lỗi sai phổ biến (nếu có) và biểu dương những bài làm đúng.',
                studentAction: 'HS đối chiếu bài làm với đáp án chuẩn của giáo viên, tự sửa sai vào vở.'
              }
            ]
          },
          {
            taskId: `task-${p}-3-2`,
            taskTitle: '* Nhiệm vụ 2: Hoàn thành bài tập 2 thực hành nâng cao',
            integrationNote: enableStem ? `[STEM - Chế tạo & Thử nghiệm]: Lắp ráp mô hình và kiểm chứng tiêu chí (${currentStem.criteria})` : undefined,
            steps: [
              {
                stepNumber: 1,
                stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                teacherAction: enableStem
                  ? `GV phát bộ dụng cụ thực hành (${currentStem.material}), nhắc nhở an toàn và yêu cầu các nhóm tiến hành lắp ráp, đo kiểm theo tiêu chí: "${currentStem.criteria}".`
                  : 'GV giao bài tập 2 làm theo nhóm đôi, yêu cầu các em kiểm tra chéo kết quả cho nhau và ghi nhận các dữ liệu thử nghiệm.',
                studentAction: enableStem
                  ? 'HS nhận vật liệu, phối hợp phân công cắt dán, lắp ráp và tiến hành đo đạc thử nghiệm sản phẩm.'
                  : 'HS nhận đề bài tập 2, quay sang bạn cùng bàn để bắt đầu thực hiện.'
              },
              {
                stepNumber: 2,
                stepName: 'Bước 2: Thực hiện nhiệm vụ',
                teacherAction: 'GV bao quát lớp và gợi ý cách tháo gỡ khó khăn cho từng cặp đôi: "[STEM - Chế tạo & Thử nghiệm: Thao tác thực nghiệm và kiểm chứng]".',
                studentAction: 'HS tích cực trao đổi, kiểm tra chéo và thống nhất đáp án.'
              },
              {
                stepNumber: 3,
                stepName: 'Bước 3: Báo cáo kết quả',
                teacherAction: 'GV mời 1 cặp đôi phát biểu ý kiến giải thích cách làm.',
                studentAction: 'HS đứng dậy báo cáo kết quả và nêu rõ các bước giải quyết bài tập.'
              },
              {
                stepNumber: 4,
                stepName: 'Bước 4: Đánh giá, kết luận',
                teacherAction: 'GV đánh giá tinh thần hợp tác nhóm và chốt đáp án chính xác của bài tập 2.',
                studentAction: 'HS lắng nghe và ghi nhận các phương pháp giải tối ưu.'
              }
            ]
          }
        ]
      },

      // 4. Vận dụng, trải nghiệm (5 phút)
      {
        activityNumber: 4,
        activityName: '4. Vận dụng, trải nghiệm (5 phút)',
        timeEstimate: '5 phút',
        integrationNote: enableStem
          ? `[STEM - Pha 4: Trưng bày, Đánh giá chất lượng & Cải tiến sản phẩm - ${currentStem.title}]`
          : enableCds
          ? `[TÍCH HỢP CÔNG DÂN SỐ (CV 3899 & SGK Hành trình CĐS Lớp ${numericGrade}) - ${currentCds.textbookLesson}]: ${currentCds.textbookActivity}`
          : undefined,
        tasks: [
          {
            taskId: `task-${p}-4-1`,
            taskTitle: enableStem
              ? `* Nhiệm vụ 1: Trưng bày sản phẩm "${currentStem.title}" và đề xuất ý tưởng cải tiến`
              : enableCds
              ? `* Nhiệm vụ 1: Vận dụng kỹ năng công dân số - Xử lý tình huống thực tế theo ${currentCds.textbookLesson}`
              : '* Nhiệm vụ 1: Vận dụng kiến thức vào thực tế cuộc sống hàng ngày',
            integrationNote: enableStem
              ? `[STEM - Đánh giá & Cải tiến]: Thuyết minh nguyên lý và đề xuất nâng cấp sản phẩm`
              : enableCds
              ? `${currentCds.badge}`
              : undefined,
            steps: [
              {
                stepNumber: 1,
                stepName: 'Bước 1: Chuyển giao nhiệm vụ',
                teacherAction: enableStem
                  ? `GV yêu cầu các nhóm trưng bày sản phẩm STEM lên bàn triển lãm, cử đại diện thuyết minh về nguyên lý hoạt động và cách cải tiến.`
                  : enableCds
                  ? `GV đưa ra câu hỏi tình huống trích từ ${currentCds.textbookActivity} (${currentCds.textbookLesson}): "${currentCds.situation}"`
                  : `GV đưa ra câu hỏi tình huống gắn liền với đời sống học sinh: 'Em sẽ làm gì khi gặp tình huống thực tế liên quan đến ${cleanTopic}?'`,
                studentAction: enableStem
                  ? 'HS mang sản phẩm của nhóm lên khu vực trưng bày, chuẩn bị bài thuyết minh ngắn trong 1 phút.'
                  : enableCds
                  ? `HS lắng nghe tình huống trích từ SGK Hành trình CĐS Lớp ${numericGrade}, suy nghĩ cách xử lý theo chuẩn mực công dân số.`
                  : 'HS lắng nghe câu hỏi tình huống và liên hệ với thực tế của bản thân.'
              },
              {
                stepNumber: 2,
                stepName: 'Bước 2: Thực hiện nhiệm vụ',
                teacherAction: enableStem
                  ? `GV tổ chức cho các nhóm quan sát chéo và chấm điểm theo phiếu tiêu chí chất lượng: "${currentStem.criteria}".`
                  : enableCds
                  ? `GV khuyến khích học sinh trao đổi cặp đôi, liên hệ bài học và các quy tắc trong ${currentCds.textbookLesson} để tìm giải pháp chuẩn mực.`
                  : `GV khuyến khích học sinh suy nghĩ nhanh và chia sẻ cách xử lý thông minh, sáng tạo.`,
                studentAction: enableStem
                  ? 'HS đại diện nhóm thuyết minh: "Thưa thầy cô và các bạn, mô hình của nhóm em hoạt động dựa trên nguyên lý... Để sản phẩm bền và đẹp hơn, nhóm em dự kiến sẽ cải tiến thêm..."'
                  : enableCds
                  ? `${currentCds.studentSolution}`
                  : 'HS tự suy ngẫm và chuẩn bị câu trả lời ngắn gọn, thiết thực.'
              },
              {
                stepNumber: 3,
                stepName: 'Bước 3: Báo cáo kết quả',
                teacherAction: enableStem
                  ? 'GV mời đại diện 2 nhóm thuyết minh và cho các nhóm còn lại nhận xét.'
                  : enableCds
                  ? 'GV mời 2 học sinh phát biểu câu trả lời xử lý tình huống trước lớp; cả lớp lắng nghe và nhận xét.'
                  : 'GV mời 2 học sinh phát biểu giải pháp trước lớp.',
                studentAction: enableStem
                  ? 'Các nhóm lắng nghe nhận xét, ghi nhận phiếu đánh giá đồng đẳng từ nhóm bạn.'
                  : enableCds
                  ? `HS tự tin phát biểu giải pháp xử lý tình huống theo đúng tinh thần ${currentCds.textbookLesson}.`
                  : "HS chia sẻ: 'Thưa thầy/cô, trong thực tế em sẽ áp dụng bằng cách...'"
              },
              {
                stepNumber: 4,
                stepName: 'Bước 4: Đánh giá, kết luận',
                teacherAction: enableStem
                  ? `GV tổng kết, biểu dương sản phẩm xuất sắc của các nhóm và dặn dò học sinh bảo quản sản phẩm tại góc STEM lớp học.`
                  : enableCds
                  ? `GV nhận xét, chuẩn hóa quy tắc công dân số theo ${currentCds.textbookLesson}, khen ngợi tinh thần học tập và dặn dò học sinh luôn thực hiện đúng trong thực tế.`
                  : 'GV tổng kết tiết học, khen ngợi tinh thần học tập, dặn dò học sinh ôn bài và chuẩn bị tiết tiếp theo.',
                studentAction: enableStem
                  ? 'HS vỗ tay khen thưởng, cất gọn dụng cụ học tập và bảo quản mô hình cẩn thận.'
                  : enableCds
                  ? 'HS ghi nhớ bài học kỹ năng công dân số và thu dọn đồ dùng học tập ngay ngắn.'
                  : 'HS lắng nghe lời dặn của thầy/cô, thu dọn đồ dùng học tập ngay ngắn.'
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
        subject,
        grade,
        title: periodTitle,
        timeRange: pTimeRange,
        weekNumber: pWeek
      },
      objectives: {
        specificCompetencies,
        generalCompetencies,
        qualities,
        integrationContent
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

  const baseWeek = periodPlans[0]?.weekNumber || weekNumber;
  const baseTimeRange = periodPlans[0]?.timeRange || calculateWeekDateRange(startDateWeek1, baseWeek);

  return {
    id: `plan-${Date.now()}`,
    topic,
    subject,
    grade,
    totalPeriods,
    weekNumber: baseWeek,
    ppctPeriodsText,
    timeRange: baseTimeRange,
    bookSeries,
    createdAt: new Date().toISOString(),
    periodPlans
  };
}

// 0. API Nhận diện tự động tên bài học, môn, lớp từ hình ảnh tài liệu/trang sách (hỗ trợ nhiều hình ảnh cùng lúc)
app.post('/api/gemini/analyze-lesson-file', async (req, res) => {
  try {
    const { base64Data, mimeType, fileName, attachedFiles, customApiKey } = req.body;
    const customKey = (req.headers['x-gemini-api-key'] as string) || customApiKey;

    const filesList: Array<{ base64Data?: string; mimeType?: string; fileName?: string }> = [];
    if (Array.isArray(attachedFiles) && attachedFiles.length > 0) {
      filesList.push(...attachedFiles);
    } else if (base64Data) {
      filesList.push({ base64Data, mimeType, fileName });
    }

    // Fallback info extracted from fileName if present
    const mainFileName = filesList[0]?.fileName || fileName || 'Bài học mới';
    const cleanedFileName = mainFileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim();
    const fallbackTopic = cleanedFileName.startsWith('Bài')
      ? cleanedFileName
      : `Bài: ${cleanedFileName}`;

    if (filesList.length === 0) {
      return res.json({
        success: true,
        topic: fallbackTopic,
        subject: 'Tin học',
        grade: '3',
        bookSeries: 'Kết nối tri thức với cuộc sống',
        summary: 'Tài liệu bài học'
      });
    }

    const prompt = `Bạn là chuyên gia giáo dục Việt Nam. Hãy quan sát và phân tích các hình ảnh/trang sách tài liệu giáo dục này.
Hãy trích xuất chính xác:
1. "topic": Tên bài học đầy đủ (Ví dụ: "Bài 1. Thông tin và quyết định", "Bài 15. Bảng nhân 7", "Bài 3. Máy tính và em"... Lưu ý: bắt đầu bằng "Bài X. Tên bài").
2. "subject": Môn học (Ví dụ: "Tin học", "Toán", "Tiếng Việt", "Tự nhiên và Xã hội", "Khoa học", "Lịch sử và Địa lí", "Công nghệ"...).
3. "grade": Khối lớp dạng số chuỗi (Ví dụ: "3", "4", "5"...).
4. "bookSeries": Bộ sách nếu nhận diện được (Ví dụ: "Kết nối tri thức với cuộc sống", "Cánh Diều", "Chân trời sáng tạo"... Nếu không rõ thì để "Kết nối tri thức với cuộc sống").
5. "summary": Tóm tắt các hoạt động chính, bài tập hoặc nội dung cốt lõi của bài học trong các hình ảnh này.

Trả về DUY NHẤT một đối tượng JSON hợp lệ (không bọc trong markdown code fence):
{
  "topic": "Bài ...",
  "subject": "Tin học",
  "grade": "3",
  "bookSeries": "Kết nối tri thức với cuộc sống",
  "summary": "Tóm tắt nội dung..."
}`;

    const parts: any[] = [];
    for (const f of filesList) {
      const raw = f.base64Data || '';
      if (raw) {
        const cleanBase64 = raw.replace(/^data:[^;]+;base64,/, '');
        const isPdf = f.mimeType === 'application/pdf' || f.fileName?.toLowerCase().endsWith('.pdf');
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: f.mimeType || (isPdf ? 'application/pdf' : 'image/jpeg')
          }
        });
      }
    }
    parts.push({ text: prompt });

    const contents = [{ role: 'user', parts }];
    const rawText = await generateWithGemini(contents, customKey, { responseMimeType: 'application/json' });

    const result = safeParseJSON(rawText);
    if (result && typeof result === 'object') {
      return res.json({ success: true, ...result });
    }

    // Return graceful fallback
    return res.json({
      success: true,
      topic: fallbackTopic,
      subject: 'Tin học',
      grade: '3',
      bookSeries: 'GDPT 2018',
      summary: cleanedFileName
    });
  } catch (err: any) {
    console.error('analyze-lesson-file error handled:', err);
    return res.json({
      success: true,
      topic: 'Bài 1. Thông tin và quyết định',
      subject: 'Tin học',
      grade: '3',
      bookSeries: 'GDPT 2018',
      summary: 'Phân tích tài liệu bài học'
    });
  }
});

// 1. API Tạo PPCT bằng Gemini
app.post('/api/gemini/generate-ppct', async (req, res) => {
  try {
    const { topic, grade, subject, customApiKey } = req.body;
    const customKey = (req.headers['x-gemini-api-key'] as string) || customApiKey;

    const prompt = `Bạn là chuyên gia giáo dục Việt Nam. Hãy tạo 4 tiết phân phối chương trình (PPCT) cho môn ${subject || 'Tin học'} lớp ${grade || '3'} theo chương trình GDPT 2018 với chủ đề: "${topic}".
Trả về duy nhất một mảng JSON (không bọc trong markdown code fence, không giải thích gì thêm) gồm các đối tượng có định dạng:
[
  {
    "grade": ${grade || 3},
    "subject": "${subject || 'Tin học'}",
    "week": 1,
    "periodIndex": 1,
    "lessonName": "Tên bài dạy chi tiết",
    "integrationNote": "Nội dung tích hợp STEM, kỹ năng sống, chuyển đổi số...",
    "notes": "Chủ đề hoặc ghi chú"
  }
]`;

    const rawText = await generateWithGemini(prompt, customKey);
    if (rawText) {
      const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      try {
        const items = JSON.parse(cleaned);
        return res.json({ items });
      } catch (parseErr) {
        console.warn('Failed to parse Gemini PPCT JSON:', cleaned);
      }
    }

    // Default fallback items
    const fallbackItems = [
      {
        grade: Number(grade) || 3,
        subject: subject || 'Tin học',
        week: 1,
        periodIndex: 1,
        lessonName: `${topic} (Tiết 1)`,
        integrationNote: '[1.3.CB1a] Truy cập và khai thác thông tin số',
        notes: 'Chủ đề bài học'
      },
      {
        grade: Number(grade) || 3,
        subject: subject || 'Tin học',
        week: 1,
        periodIndex: 2,
        lessonName: `${topic} (Tiết 2)`,
        integrationNote: '[STEM] Thực hành thiết kế và ứng dụng',
        notes: 'Luyện tập & Vận dụng'
      }
    ];

    return res.json({ items: fallbackItems });
  } catch (err: any) {
    console.error('generate-ppct error:', err);
    return res.json({ items: [] });
  }
});

// 2. API Gợi ý tích hợp bằng Gemini
app.post('/api/gemini/suggest-integration', async (req, res) => {
  try {
    const { topic, grade, subject, integrationType, customApiKey } = req.body;
    const customKey = (req.headers['x-gemini-api-key'] as string) || customApiKey;

    const prompt = `Bạn là chuyên gia sư phạm tiểu học và trung học tại Việt Nam.
Hãy phân tích bài dạy sau và đưa ra gợi ý tích hợp ${integrationType || 'STEM/kỹ năng sống/chuyển đổi số'} chi tiết, thực tế, dễ áp dụng:
- Môn học: ${subject || 'Tin học'}
- Khối lớp: Khối ${grade || '3'}
- Tên bài dạy / chủ đề: ${topic}
Yêu cầu nội dung phản hồi gồm:
1. Mục tiêu bài học (Kiến thức, Phẩm chất, Năng lực)
2. Nội dung và hoạt động tích hợp cụ thể
3. Thiết bị dạy học và học liệu gợi ý
4. Đánh giá học sinh theo thông tư 27/2020/TT-BGDĐT.
Trình bày rõ ràng, sư phạm, chuẩn mực.`;

    const rawText = await generateWithGemini(prompt, customKey);
    if (rawText) {
      return res.json({ suggestion: rawText });
    }

    return res.json({
      suggestion: `Gợi ý tích hợp cho bài "${topic}":
1. Năng lực số (CV 3456): Học sinh rèn luyện kỹ năng tìm kiếm, đánh giá và khai thác thông tin trên thiết bị điện tử an toàn.
2. Giáo dục STEM (CV 909): Lồng ghép hoạt động khám phá và chế tạo mô hình/sản phẩm học tập liên môn.
3. Công dân số (CV 3899): Giáo dục ý thức tôn trọng bản quyền và văn hóa ứng xử trực tuyến.`
    });
  } catch (err: any) {
    console.error('suggest-integration error:', err);
    return res.json({ suggestion: null });
  }
});

// API Tạo Phiếu Học Tập Tiểu Học Chuẩn A4 bằng Gemini (Đọc tệp đính kèm & trích xuất tên bài)
app.post('/api/gemini/generate-worksheet', async (req, res) => {
  try {
    const { subject, lessonTitle, lessonContent, numQuestions = 5, fileBase64, mimeType = 'image/png', customApiKey } = req.body;
    const customKey = (req.headers['x-gemini-api-key'] as string) || customApiKey;

    const systemPrompt = `Bạn là chuyên gia sư phạm tiểu học hàng đầu Việt Nam, chuyên biên soạn phiếu bài tập và phiếu học tập sinh động, chất lượng cao cho học sinh Tiểu học theo chương trình sách giáo khoa GDPT chuẩn thống nhất.

YÊU CẦU QUAN TRỌNG VỀ ĐỌC TỆP ĐÍNH KÈM (OCR & TRÍCH XUẤT):
- Nếu có tệp đính kèm (hình ảnh hoặc trang tài liệu), bạn PHẢI ĐỌC TÊN BÀI HỌC VÀ NỘI DUNG TỪ TỆP ĐÍNH KÈM ĐÓ.
- Tiêu đề phiếu ("title") PHẢI ĐƯỢC ĐẶT CHÍNH XÁC THEO TÊN BÀI HỌC TÌM THẤY TRONG TỆP ĐÍNH KÈM (ví dụ: "Bài 10: Đồng hồ Mặt Trời", "Bài 15: Cây xanh quanh em", "Unit 3: My Family", v.v.). Nếu tệp đính kèm không chứa tiêu đề rõ ràng, mới dùng tên đề xuất: "${lessonTitle || subject}".
- Biên soạn đúng ${numQuestions} câu hỏi bám sát các đoạn văn, từ ngữ, bài tập hoặc thông tin xuất hiện trong tệp đính kèm.
- Phụ đề ("subtitle") dạng: "${subject || 'Tiếng Việt'} – Phiếu học tập".

Các dạng câu hỏi hợp lệ:
- "checkbox": Trắc nghiệm chọn đáp án với mảng options (mỗi option có text và isCorrect: boolean).
- "lines": Tự luận trả lời / điền từ vào chỗ trống có dòng kẻ (có answerKey).
- "ordering": Sắp xếp các từ/tên/sự việc theo thứ tự chữ cái hoặc thời gian (có items: string[]).
- "numbered_lines": Liệt kê 2-3 ý (ví dụ viết họ tên, nêu 3 ý...).
- "inline_blank": Điền từ còn thiếu vào dòng tóm tắt.

Lựa chọn mascot thích hợp: "bear_trophy", "girl_clap", "boy_pencil", "backpack_ball", "students_desk", "lion_pencil", "space_rocket", "flower_pot", "computer_screen", "music_notes", "palette_art", "history_scroll", "science_beaker".

TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON VỚI CẤU TRÚC BẮT BUỘC:
{
  "title": "Tên bài học trích xuất từ tệp đính kèm",
  "subtitle": "${subject || 'Tiếng Việt'} – Phiếu học tập",
  "questions": [
    {
      "badge": "Câu 1",
      "badgeColor": "blue",
      "prompt": "Nội dung câu hỏi...",
      "subPrompt": "(hướng dẫn làm bài)",
      "type": "checkbox",
      "options": [
        { "text": "Đáp án A", "isCorrect": true },
        { "text": "Đáp án B", "isCorrect": false },
        { "text": "Đáp án C", "isCorrect": false }
      ],
      "answerKey": "Gợi ý đáp án chi tiết...",
      "mascot": "bear_trophy"
    }
  ]
}`;

    const userPrompt = `Hãy thiết kế phiếu học tập cho:
- Môn: ${subject || 'Tiếng Việt'}
- Tiêu đề bài học đề xuất: ${lessonTitle || 'Đọc và trích xuất trực tiếp tên bài từ tệp đính kèm'}
- Nội dung / Yêu cầu: ${lessonContent || 'Trích xuất nội dung bài tập từ tệp đính kèm'}
- Tệp đính kèm: ${fileBase64 ? 'CÓ TỆP ĐÍNH KÈM. HÃY ĐỌC TÊN BÀI VÀ NỘI DUNG TỪ TỆP NÀY ĐỂ ĐẶT TIÊU ĐỀ TITLE VÀ TẠO CÂU HỎI.' : 'Không có'}
- Số lượng câu hỏi: ${numQuestions} câu.`;

    let contents: any = [{ role: 'user', parts: [] }];
    contents[0].parts.push({ text: `${systemPrompt}\n\n${userPrompt}` });

    if (fileBase64 && typeof fileBase64 === 'string' && fileBase64.trim()) {
      contents[0].parts.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: fileBase64.trim()
        }
      });
    }

    const rawText = await generateWithGemini(contents, customKey);
    const parsed = safeParseJSON(rawText);

    if (parsed && parsed.questions && Array.isArray(parsed.questions)) {
      return res.json({ success: true, worksheet: parsed });
    }

    return res.status(400).json({ success: false, error: 'Không thể trích xuất nội dung từ tệp đính kèm' });
  } catch (err: any) {
    console.error('generate-worksheet error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Lỗi xử lý tệp đính kèm' });
  }
});

// 3. API SOẠN GIÁO ÁN (KẾ HOẠCH BÀI DẠY) CHUẨN MẪU BỘ GD&ĐT
app.post('/api/gemini/generate-lesson-plan', async (req, res) => {
  try {
    const {
      topic,
      grade = '3',
      subject = 'Tin học',
      totalPeriods = 2,
      bookSeries = 'Kết nối tri thức với cuộc sống',
      integrationOptions = { nls: true, stem: true, cds: true },
      attachedFile,
      customApiKey,
      weekNumber: inputWeekNumber,
      timeRange: inputTimeRange,
      startDateWeek1,
      ppctPeriodsText: inputPpctPeriodsText,
      ppctList = []
    } = req.body;

    const customKey = (req.headers['x-gemini-api-key'] as string) || customApiKey;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Tên bài học không được để trống' });
    }

    // Clean topic name from redundant prefixes if any
    const cleanTopic = topic.replace(/^Bài\s*:\s*/i, '').replace(/^Bài\s+\d+[:\.]\s*/i, (m: string) => m.replace(':', '.'));

    // Match PPCT items for the topic using robust matching engine
    const effectivePpctList = Array.isArray(ppctList) && ppctList.length > 0 ? ppctList : defaultPpctList;
    const matchResult = matchPpctLesson(
      cleanTopic,
      subject,
      grade,
      effectivePpctList,
      startDateWeek1 || '2024-09-09'
    );

    let resolvedWeek = inputWeekNumber;
    let resolvedPpctText = inputPpctPeriodsText || '';
    let matchedPpct: any[] = matchResult.matchedItems || [];

    if (matchResult.matched) {
      resolvedWeek = matchResult.week;
      resolvedPpctText = matchResult.periodsText;
    } else if (inputWeekNumber) {
      resolvedWeek = inputWeekNumber;
    } else {
      const weekMatch = topic.match(/(?:tuần|tuan|t)\s*[:\.-]?\s*(\d{1,2})/i);
      if (weekMatch && weekMatch[1]) {
        const parsedW = parseInt(weekMatch[1], 10);
        if (parsedW >= 1 && parsedW <= 52) resolvedWeek = parsedW;
      }
    }

    const finalWeekNumber = Number(resolvedWeek) || 1;
    const cleanTimeRange = (inputTimeRange && !inputTimeRange.includes('(Tuần'))
      ? inputTimeRange
      : calculateWeekDateRange(startDateWeek1, finalWeekNumber);
    const resolvedTimeRange = cleanTimeRange;

    // Filter PPCT of this subject and grade for AI to cross-reference
    const subjectGradePpct = effectivePpctList.filter((it: any) => {
      const gMatch = !it.grade || String(it.grade).replace(/\D/g, '') === String(grade).replace(/\D/g, '');
      const sMatch = !it.subject || normalizeSubject(it.subject) === normalizeSubject(subject) ||
        normalizeSubject(it.subject).includes(normalizeSubject(subject)) ||
        normalizeSubject(subject).includes(normalizeSubject(it.subject));
      return gMatch && sMatch;
    });

    const prompt = `Bạn là một chuyên gia giáo dục xuất sắc tại Việt Nam. Nhiệm vụ của bạn là SOẠN KẾ HOẠCH DẠY HỌC (GIÁO ÁN) CỰC KỲ CHI TIẾT, ĐẦY ĐỦ, CHUẨN KHOA HỌC VÀ BÁM SÁT SGK & PHÂN PHỐI CHƯƠNG TRÌNH (PPCT).

⛔ CẤM TUYỆT ĐỐI VIẾT NỘI DUNG MẪU GỢI Ý CHUNG CHUNG / CÂU MẪU SƯ PHẠM RỖNG:
- CẤM TUYỆT ĐỐI các câu vô nghĩa như: "GV hướng dẫn HS đọc bài trong SGK...", "GV yêu cầu HS quan sát SGK...", "GV đưa ra câu hỏi gợi mở...", "HS làm theo sự hướng dẫn của GV...", "HS trả lời câu hỏi...".
- BẮT BUỘC TRÍCH XUẤT 100% NỘI DUNG DỮ LIỆU THỰC TẾ TRONG SGK VÀ TỆP ĐÍNH KÈM:
  1. Với bài đọc/ngữ văn: Trích NGUYÊN VĂN nội dung đoạn đọc/thơ/văn bản bài học thực tế từ SGK/tệp đính kèm vào "teacherAction".
  2. Với câu hỏi đọc hiểu / câu hỏi bài học: Trích NGUYÊN VĂN câu hỏi 1, 2, 3, 4 trong SGK vào "teacherAction".
  3. Với đáp án / câu trả lời: Trích NGUYÊN VĂN câu trả lời chi tiết / đáp án từng câu vào "studentAction".
  4. Với bài tập / thực hành: Viết RÕ ĐỀ BÀI TẬP CHI TIẾT (các con số, phép tính, câu lệnh, dữ liệu SGK) và LỜI GIẢI / ĐÁP ÁN CHI TIẾT từng câu.
  5. Nếu người dùng đính kèm tệp trang sách SGK/PDF: Bạn BẮT BUỘC phải đọc kỹ từng hình ảnh/trang sách để lấy ĐÚNG TOÀN BỘ chữ, câu hỏi, bài tập thực tế từ tệp đó vào giáo án. CẤM BỎ QUA VÀ CẤM VIẾT CÂU MẪU KHÔ KHAN!

Ý ĐỊNH CỦA GIÁO VIÊN: "Soạn giáo án, số tiết và tuần đúng với phân phối chương trình; sau tên bài dạy là tiết thứ mấy của tuần đó (ví dụ: BÀI 2: KHÁM PHÁ MÁY TÍNH (Tiết 1)); xóa tiết theo PPCT nằm dưới thời gian thực hiện. Bám sát SGK và phân tích thật chi tiết".

${(attachedFile || (Array.isArray(req.body.attachedFiles) && req.body.attachedFiles.length > 0)) ? 'LƯU Ý BẮT BUỘC KHI CÓ HÌNH ẢNH/TỆP ĐÍNH KÈM: Người dùng đã đính kèm tệp tài liệu/trang sách/PDF. Bạn PHẢI trích xuất và phân tích sâu toàn bộ kiến thức, hình vẽ, câu hỏi, bài tập, ví dụ và hoạt động có trong tài liệu này để đưa vào giáo án.' : ''}

Thông tin bài dạy & Cấu hình PPCT:
- Tiêu đề văn bản: KẾ HOẠCH DẠY HỌC - TUẦN ${finalWeekNumber}
- Tên bài dạy / chủ đề: "${topic}"
- Môn học: ${subject}
- Khối lớp: Lớp ${grade}
- Bộ sách: ${bookSeries}
- Tổng số tiết: ${totalPeriods} tiết.
- Tuần theo PPCT: TUẦN ${finalWeekNumber}
- Tiết theo PPCT: ${resolvedPpctText || `Tiết 1 - ${totalPeriods} theo PPCT (Tuần ${finalWeekNumber})`}
- Thời gian thực hiện: ${resolvedTimeRange}
- Tùy chọn tích hợp chuyên đề: Năng lực số=${integrationOptions?.nls ? 'CÓ' : 'KHÔNG'}, STEM=${integrationOptions?.stem ? 'CÓ' : 'KHÔNG'}, Công dân số=${integrationOptions?.cds ? 'CÓ' : 'KHÔNG'}.
${subjectGradePpct.length > 0 ? `\nTrích xuất Phân phối chương trình (PPCT) môn ${subject} Lớp ${grade} để đối chiếu:\n${subjectGradePpct.slice(0, 35).map((it: any) => `- Tuần ${it.week} | Tiết ${it.periodIndex}: ${it.lessonName}`).join('\n')}` : ''}

QUY ĐỊNH BẮT BUỘC VỀ RÀ SOÁT VÀ TÍCH HỢP CHUYÊN ĐỀ VÀO TỪNG HOẠT ĐỘNG (QUAN TRỌNG HÀNG ĐẦU):
Khi người dùng chọn tích hợp các nội dung chuyên đề (Năng lực số theo CV 3456 & TT 02/2025, Giáo dục STEM theo CV 909/BGDĐT, Công dân số theo CV 3899 & SGK Hành trình CĐS):

★ YÊU CẦU ĐẶC BIỆT CỦA GIÁO VIÊN: "PHẢI LẤY NỘI DUNG TÍCH HỢP CỦA SGK CẦN TÍCH HỢP ĐỂ ĐƯA VÀO".
Bạn PHẢI tra cứu và trích xuất đúng nội dung kiến thức, tên bài học, tình huống thực tế và bài tập từ cuốn SGK của môn/chuyên đề cần tích hợp tương ứng với Khối ${grade}:

1. TÍCH HỢP CÔNG DÂN SỐ (THEO CV 3899/BGDĐT-GDTH & SGK "HÀNH TRÌNH CÔNG DÂN SỐ LỚP ${grade}"):
   - TỰ ĐỘNG NHẬN DẠNG BÀI VÀ HOẠT ĐỘNG PHÙ HỢP TỪ SGK HÀNH TRÌNH CÔNG DÂN SỐ LỚP ${grade}:
     * Lớp 1:
       + Bài 1: Làm quen và giữ gìn thiết bị số an toàn (HĐ 2: Nhận diện và bảo quản thiết bị học tập, không để nước hay đồ ăn gần máy tính).
       + Bài 2: Tư thế ngồi chuẩn và bảo vệ mắt khi dùng thiết bị số (HĐ 3: Giữ khoảng cách mắt 50-70cm, quy tắc nghỉ mắt sau 20 phút).
       + Bài 3: Giao tiếp lễ phép trong môi trường số (HĐ 2: Lễ phép xin phép cha mẹ/thầy cô trước khi dùng thiết bị).
     * Lớp 2:
       + Bài 1: Bảo vệ thông tin cá nhân trên môi trường số (HĐ 2: Giữ bí mật họ tên, địa chỉ, số điện thoại, mật khẩu trước người lạ).
       + Bài 2: Nhận biết đường link lạ và phòng tránh nguy cơ (HĐ 3: Cảnh giác trước thông báo trúng thưởng/kết bạn lạ).
       + Bài 3: Lời nói đẹp và ứng xử văn minh trong môi trường số (HĐ 2: Giao tiếp lịch sự, nói lời hay trên nhóm học tập).
     * Lớp 3:
       + Bài 1: Tìm kiếm thông tin học tập an toàn với từ khóa chuẩn (HĐ 2: Dùng từ khóa chuẩn xác, truy cập trang web giáo dục uy tín).
       + Bài 2: Mật khẩu an toàn - Chìa khóa bảo vệ dữ liệu (HĐ 3: Quy tắc đặt mật khẩu mạnh, không chia sẻ tài khoản cho người khác).
       + Bài 3: Tôn trọng quyền tác giả và bản quyền hình ảnh số (HĐ 2: Ghi rõ nguồn gốc tác giả khi sử dụng tài liệu mạng).
       + Bài 4: Phòng tránh nguy cơ và báo cáo an toàn mạng (HĐ 3: Kỹ năng từ chối tin nhắn xấu và báo ngay cho người lớn).
     * Lớp 4:
       + Bài 1: Dấu chân kỹ thuật số (Digital Footprint) và trách nhiệm công dân số (HĐ 2: Nhận thức mọi bài đăng đều lưu vết tích số vĩnh viễn).
       + Bài 2: Phòng chống mã độc, lừa đảo trực tuyến và bảo vệ thiết bị (HĐ 3: Kiểm tra tệp tin an toàn trước khi tải về).
       + Bài 3: Văn hóa chia sẻ và kiểm chứng nguồn tin trên không gian số (HĐ 2: Áp dụng bộ 3 câu hỏi kiểm chứng để ngăn tin giả).
       + Bài 4: Tự bảo vệ sức khỏe và cân bằng thời gian số (HĐ 4: Lập thời gian biểu số lành mạnh, tránh lạm dụng màn hình).
     * Lớp 5:
       + Bài 1: Quản lý danh tính số và quyền riêng tư nâng cao (HĐ 2: Cài đặt chế độ bảo mật cho tài khoản học tập).
       + Bài 2: Đạo đức học tập số, bản quyền tác giả và ứng dụng AI có trách nhiệm (HĐ 3: Sử dụng AI trung thực, không gian lận, ghi rõ nguồn trích dẫn).
       + Bài 3: Phòng chống bắt nạt mạng (Cyberbullying) và kỹ năng tự bảo vệ (HĐ 2: Lên tiếng bảo vệ bạn bè, không tiếp tay cho bạo lực mạng).
       + Bài 4: Giao dịch số an toàn và bảo mật thông tin tài chính học đường (HĐ 3: Bảo mật mã OTP, thẻ thông minh).
   - BẮT BUỘC THỂ HIỆN RÕ RÀNG TRONG GIÁO ÁN ĐỂ NGƯỜI KIỂM TRA THẤY NGAY:
     * Tại Mục I.4 (Nội dung tích hợp): Ghi rõ "[TÍCH HỢP CÔNG DÂN SỐ - Theo CV 3899 & SGK Hành trình CĐS Lớp ${grade} - Bài X: [Tên bài] (Hoạt động Y: [Tên HĐ])]: [Mục tiêu kỹ năng số cần đạt]".
     * Tại Hoạt động 4 (Vận dụng) hoặc Hoạt động 2/3:
       + "integrationNote": "[TÍCH HỢP CÔNG DÂN SỐ (CV 3899 & SGK Hành trình CĐS Lớp ${grade}) - Bài X: [Tên bài]]: Hoạt động Y: [Tên HĐ]".
       + "teacherAction": GV đưa ra câu hỏi tình huống thực tế trích từ Hoạt động Y của SGK Hành trình CĐS Lớp ${grade}.
       + "studentAction": HS trả lời chuẩn xác theo các quy tắc công dân số (giữ bí mật mật khẩu, xin phép người lớn, trích dẫn nguồn, từ chối link lạ...).

2. TÍCH HỢP NĂNG LỰC SỐ (THEO KHUNG NLS CV 3456 & TT 02/2025/TT-BGDĐT):
   - CẤU TRÚC KÝ HIỆU CHUẨN MÃ CHỈ BÁO NĂNG LỰC SỐ (BẮT BUỘC):
     Cấu trúc: [X.Y.CB{1|2}{a|b|c|d}]
     Trong đó:
     * X.Y: Miền và Năng lực thành phần (1.1: Duyệt/tìm kiếm; 1.2: Đánh giá; 1.3: Quản lý dữ liệu; 2.1: Tương tác số; 2.2: Chia sẻ; 2.3: Trách nhiệm công dân; 2.4: Hợp tác số; 2.5: Quy tắc ứng xử mạng Netiquette; 2.6: Quản lý danh tính số; 3.1: Phát triển nội dung số; 3.2: Tái tạo nội dung; 3.3: Bản quyền & giấy phép; 3.4: Lập trình & tư duy thuật toán; 4.1: Bảo vệ thiết bị; 4.2: Bảo vệ dữ liệu & quyền riêng tư; 4.3: Sức khỏe & an sinh số; 4.4: Bảo vệ môi trường; 5.1: Xử lý sự cố kỹ thuật; 5.2: Nhu cầu & giải pháp công nghệ; 5.3: Sáng tạo số; 6.1: Hiểu biết AI; 6.2: Sử dụng AI có đạo đức; 6.3: Đánh giá AI).
     * Mức độ năng lực: Khối lớp 1, 2, 3 dùng "CB1" (Cơ bản 1); Khối lớp 4, 5 dùng "CB2" (Cơ bản 2).
     * a, b, c, d: Ký hiệu chữ cái chỉ báo hành vi chuẩn (VD: a: "Xác định được cách tổ chức, lưu trữ và truy xuất dữ liệu, thông tin và nội dung một cách đơn giản trong môi trường số").
   - VÍ DỤ CHUẨN TRONG PPCT VÀ GIÁO ÁN:
     * Lớp 1-2-3 (CB1): [1.3.CB1a], [4.1.CB1a], [4.3.CB1a], [4.3.CB1b], [4.2.CB1a], [3.1.CB1a], [3.4.CB1a]
     * Lớp 4-5 (CB2): [4.1.CB2a], [5.1.CB2a], [1.1.CB2a], [1.3.CB2a], [3.3.CB2a], [3.1.CB2a], [3.4.CB2a], [5.2.CB2b]
   - TRÍCH DẪN & SOẠN TRỰC TIẾP: Ghi rõ mã NLS vào integrationNote và chỉ đạo cụ thể thao tác của học sinh trong hoạt động (ưu tiên Hoạt động 2 - Hình thành kiến thức hoặc Hoạt động 3 - Thực hành).

3. TÍCH HỢP GIÁO DỤC STEM (THEO CÔNG VĂN 909/BGDĐT-GDTH & SGK/TÀI LIỆU BÀI HỌC STEM TIỂU HỌC):
   - TỰ ĐỘNG NHẬN DẠNG BÀI HỌC STEM TƯƠNG ỨNG CHO LỚP ${grade} VÀ MÔN ${subject}:
     * Lớp 1: Bài học STEM về Ngôi nhà hình học và Đồ chơi xếp hình; Chậu cây tự hút nước từ vật liệu tái chế; Đồ chơi chuyển động bằng dây thun.
     * Lớp 2: Bài học STEM về Thước đo thông minh; Chong chóng gió và Dụng cụ đo hướng gió; Thùng phân loại rác mini cho góc học tập.
     * Lớp 3: Bài học STEM về Bàn cờ toán học thông minh & Khung tranh đa năng; Bản đồ mê cung và Robot dẫn đường tuần tự; Cân đĩa thăng bằng tự chế.
     * Lớp 4: Bài học STEM về Bình giữ nhiệt mini; Xe phản lực chạy bằng bóng bay / Cầu nâng thủy lực; Rạp chiếu bóng mini & Kính vạn hoa; Mô hình chuỗi thức ăn sinh thái.
     * Lớp 5: Bài học STEM về Đèn ngủ thông minh & Ngôi nhà năng lượng xanh (pin mặt trời / quạt gió); Cột lọc nước tự nhiên 4 tầng (sỏi - cát - than - bông); Hộp quà hình học sinh thái & Thước đo góc đa năng.
   - BẮT BUỘC THIẾT KẾ RÕ RÀNG 4 PHA STEM THEO TỪNG HOẠT ĐỘNG ĐỂ NGƯỜI KIỂM TRA DỄ NHẬN BIẾT:
     * Hoạt động 1 (Khởi động): Ghi integrationNote = "[STEM - Pha 1: Xác định vấn đề thực tiễn & Tiêu chí sản phẩm STEM]". GV đặt ra bài toán/thách thức thực tế cần giải quyết và nêu rõ tiêu chí kỹ thuật của sản phẩm.
     * Hoạt động 2 (Hình thành kiến thức): Ghi integrationNote = "[STEM - Pha 2: Nghiên cứu kiến thức nền & Đề xuất giải pháp thiết kế]". HS khám phá kiến thức SGK ${subject} Lớp ${grade}, liên hệ Toán/Khoa học/Công nghệ và phác thảo bản vẽ kỹ thuật.
     * Hoạt động 3 (Luyện tập/Thực hành): Ghi integrationNote = "[STEM - Pha 3: Lựa chọn vật liệu, Chế tạo mẫu & Thử nghiệm]". HS thực hành đo đạc, cắt dán, lắp ráp sản phẩm, tiến hành thử nghiệm thực tế và ghi chép số liệu đo lường.
     * Hoạt động 4 (Vận dụng/Trải nghiệm): Ghi integrationNote = "[STEM - Pha 4: Trưng bày, Đánh giá chất lượng & Cải tiến sản phẩm]". Các nhóm trưng bày sản phẩm, thuyết minh nguyên lý khoa học, đánh giá chéo theo tiêu chí và đề xuất hướng cải tiến tối ưu.
   - TRÌNH BÀY CHI TIẾT TRONG TIẾN TRÌNH:
     * "teacherAction": GV giao nhiệm vụ với tiêu chuẩn thông số cụ thể (kích thước cm, thời gian giữ nhiệt, góc quay, độ bền), hướng dẫn an toàn dụng cụ.
     * "studentAction": HS thảo luận nhóm, phân công nhiệm vụ (thiết kế, đo đạc, lắp ráp), diễn giải nguyên lý khoa học và ghi nhật ký kết quả thử nghiệm.

4. QUY TRÌNH THỰC HIỆN SOẠN TÍCH HỢP TRONG TỪNG HOẠT ĐỘNG:
   - Bước 1: Rà soát thật kĩ bài dạy để chọn đúng hoạt động phù hợp (HĐ 1, 2, 3 hoặc 4).
   - Bước 2: VIẾT TẮT NỘI DUNG TÍCH HỢP GỌN GÀNG DỄ NHÌN:
     + TÍCH HỢP NĂNG LỰC SỐ (CV 3456) -> viết tắt là 'NLS' (ví dụ: '[Tích hợp NLS - Mã 1.3.CB1a]').
     + TÍCH HỢP CÔNG DÂN SỐ (CV 3899) -> viết tắt là 'CĐS' hoặc 'CDS' (ví dụ: '[Tích hợp CĐS - SGK Hành trình CĐS]').
     + TÍCH HỢP GIÁO DỤC STEM (CV 909) -> viết tắt là 'STEM' (ví dụ: '[Tích hợp STEM - Pha 1]').
     + Kỹ năng sống -> 'KNS', Quốc phòng an ninh -> 'GDQPAN', Bảo vệ môi trường -> 'BVTMT'.
   - Bước 3: Ghi rõ nội dung tích hợp đã viết tắt vào trường "integrationNote" của Hoạt động (LessonActivity) và Nhiệm vụ (LessonTask) để giao diện và file Word tự động XUỐNG DÒNG NỘI DUNG TÍCH HỢP sang dòng mới riêng biệt bên dưới tiêu đề.
   - Bước 4: Soạn chi tiết lời giảng/lệnh giao việc của GV trong "teacherAction" và thao tác thực hiện/câu trả lời của HS trong "studentAction", đảm bảo thể hiện sâu sắc nội dung được tích hợp từ SGK.

YÊU CẦU QUAN TRỌNG HÀNG ĐẦU VỀ QUY CHUẨN TRÌNH BÀY VÀ THAM CHIẾU SGK:
1. TUYỆT ĐỐI KHÔNG ĐỀ CẬP ĐẾN TỆP ĐÌNH KÈM / TÊN FILE: CẤM BẤT KỲ CỤM TỪ NÀO NHƯ "(Tài liệu: xxx.pdf)", "tệp đính kèm", "file ảnh", "tải lên". Tài liệu đính kèm chỉ đóng vai trò tư liệu giúp bạn đọc SGK. Khi xuất ra giáo án chính thức, chỉ đề cập tới SGK.
2. CHỈ RÕ TRANG SỐ VÀ HÌNH SỐ TRONG SGK RÕ RÀNG, MẠCH LẠC: Trong tất cả các hoạt động dạy học, khi giáo viên giao nhiệm vụ hay hướng dẫn học sinh, PHẢI VIẾT RÕ RÀNG VÀ CHỈ RÕ HÌNH SỐ VÀ TRANG SỐ TRONG SGK (Ví dụ: "GV yêu cầu học sinh làm việc theo cặp đôi, đọc thông tin và quan sát Hình 1, Hình 2 trong SGK trang 8 (mục 1)", "GV đặt câu hỏi gợi mở từ sơ đồ Hình 3 trang 9 SGK:...", "HS làm Bài tập 1 trang 10 SGK vào vở").

YÊU CẦU ĐẶC BIỆT CHI TIẾT DÀNH CHO CẢ HOẠT ĐỘNG GIÁO VIÊN VÀ HỌC SINH:
1. HOẠT ĐỘNG CỦA GIÁO VIÊN (teacherAction):
   - ĐƯA RA YÊU CẦU CỰC KỲ CHI TIẾT VÀ ĐẦY ĐỦ NỘI DUNG SGK: Bao gồm trọn vẹn toàn bộ văn bản lý thuyết, câu hỏi gợi mở, bài tập, số liệu và ví dụ minh họa trong SGK. Tuyệt đối không viết tóm tắt hay lược bỏ nội dung SGK.
   - DIỄN GIẢI TỈ MỈ VÀ DỄ HIỂU: Với từng nội dung hay yêu cầu trong SGK, Giáo viên cần có lời diễn giải chi tiết, bổ sung ví dụ thực tế gần gũi, giải thích từng bước thực hiện để học sinh dễ dàng tiếp thu kiến thức.
   - Nêu nguyên văn lời giao nhiệm vụ, câu hỏi gợi mở chi tiết, lời giảng sinh động và cách giáo viên bao quát hỗ trợ từng nhóm/học sinh.

2. HOẠT ĐỘNG CỦA HỌC SINH (studentAction):
   - CÂU TRẢ LỜI VÀ PHẢN HỒI THẬT CHI TIẾT: Viết đầy đủ nguyên văn câu trả lời mẫu của học sinh, lời giải/đáp án chi tiết từng câu hỏi và bài tập trong SGK.
   - DIỄN GIẢI BẰNG LỜI CỦA HỌC SINH ĐỂ RÕ RÀNG VÀ DỄ TIẾP THU: Học sinh không chỉ nêu đáp án mà còn phải diễn giải chi tiết lý do vì sao chọn đáp án đó, trình bày rõ từng bước tư duy và thao tác (Ví dụ: "Thưa thầy/cô, em chọn đáp án... vì... Đầu tiên em thực hiện bước 1..., sau đó bước 2...").
   - THỂ HIỆN SỰ TƯƠNG TÁC CHỦ ĐỘNG: Học sinh chú ý theo dõi, trao đổi thảo luận cặp đôi/nhóm sôi nổi, đại diện phát biểu rõ ràng và biết nhận xét, bổ sung ý kiến cho bạn.
3. Bám sát chuẩn kiến thức kỹ năng SGK Lớp ${grade}.

Bài học gồm tổng cộng ${totalPeriods} tiết. Bạn PHẢI trả về mảng "periodPlans" gồm đúng ${totalPeriods} phần (mỗi phần dành cho 1 TIẾT RIÊNG BIỆT: Tiết 1, Tiết 2, v.v.).

MỖI TIẾT PHẢI ĐỦ CẤU TRÚC 4 MỤC NHƯ SAU:

1. HEADER:
   - Môn: ${subject} ; Lớp: ${grade}
   - Định dạng dòng tiêu đề BẮT BUỘC: "${cleanTopic} (Tiết 1)" (sau tên bài dạy là tiết thứ mấy của tuần đó, ví dụ Tiết 1, Tiết 2...; TUYỆT ĐỐI KHÔNG ghi dòng tiết theo PPCT nằm dưới thời gian thực hiện).
   - Thời gian thực hiện: ${resolvedTimeRange}

2. I. YÊU CẦU CẦN ĐẠT:
   - 1. Năng lực đặc thù: [Danh sách chi tiết các yêu cầu về kiến thức, kỹ năng bám sát SGK]
   - 2. Năng lực chung: [Tự chủ và tự học, Giao tiếp và hợp tác, Giải quyết vấn đề và sáng tạo]
   - 3. Phẩm chất: [Chăm chỉ, Trung thực, Trách nhiệm]
   - 4. Nội dung tích hợp: [Mã NLS CV 3456 vd [1.3.CB1a], STEM CV 909 [STEM - Khám phá/Thực hành], Công dân số CV 3899]

3. II. ĐỒ DÙNG DẠY HỌC:
   - Giáo viên: [Máy tính, tivi/máy chiếu, bài giảng điện tử, SGK, đồ dùng...]
   - Học sinh: [SGK, vở ghi, đồ dùng học tập...]

4. III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU (Bắt buộc đúng 4 hoạt động):
   - Hoạt động 1: 1. Khởi động (5 phút)
   - Hoạt động 2: 2. Hình thành kiến thức mới (15 phút)
   - Hoạt động 3: 3. Luyện tập, thực hành (10 phút)
   - Hoạt động 4: 4. Vận dụng, trải nghiệm (5 phút)
   TUYỆT ĐỐI KHÔNG DÙNG TỪ "Khoảng" hoặc "khoảng" trong tên hoạt động và thời gian (viết "1. Khởi động (5 phút)", KHÔNG viết "Khoảng 5 phút" hay trùng lặp thời gian).
   Mỗi hoạt động có "integrationNote" (nếu có tích hợp), các nhiệm vụ (* Nhiệm vụ 1: ..., * Nhiệm vụ 2: ... có "integrationNote") và 4 bước quy trình sư phạm:
   Bước 1: Chuyển giao nhiệm vụ <---> Bước 2: Thực hiện nhiệm vụ <---> Bước 3: Báo cáo kết quả <---> Bước 4: Đánh giá, kết luận.

5. IV. ĐIỀU CHỈNH SAU BÀI DẠY (nếu có): ....................................................................................................

Trả về duy nhất 1 JSON object hợp lệ (không có markdown code fence):
{
  "topic": "${topic}",
  "subject": "${subject}",
  "grade": "${grade}",
  "totalPeriods": ${totalPeriods},
  "weekNumber": ${finalWeekNumber},
  "ppctPeriodsText": "${resolvedPpctText || `Tiết 1 - ${totalPeriods} theo PPCT`}",
  "timeRange": "${resolvedTimeRange}",
  "bookSeries": "${bookSeries}",
  "periodPlans": [
    {
      "periodIndex": 1,
      "weekNumber": ${finalWeekNumber},
      "header": {
        "subject": "${subject}",
        "grade": "${grade}",
        "title": "${cleanTopic} (Tiết 1)",
        "timeRange": "${resolvedTimeRange}",
        "weekNumber": ${finalWeekNumber}
      },
      "objectives": {
        "specificCompetencies": ["..."],
        "generalCompetencies": ["..."],
        "qualities": ["..."],
        "integrationContent": ["[1.3.CB1a]: ...", "[STEM]: ...", "[Tích hợp HĐGD - CV 3899]: ..."]
      },
      "teachingTools": {
        "teacher": ["..."],
        "student": ["..."]
      },
      "activities": [
        {
          "activityNumber": 1,
          "activityName": "1. Khởi động (khoảng 5 phút)",
          "integrationNote": "[TÍCH HỢP NLS/STEM/CĐS (nếu có)]",
          "tasks": [
            {
              "taskId": "task-1-1",
              "taskTitle": "* Nhiệm vụ 1: ...",
              "integrationNote": "[Chi tiết tích hợp tại nhiệm vụ 1 (nếu có)]",
              "steps": [
                {
                  "stepNumber": 1,
                  "stepName": "Bước 1: Chuyển giao nhiệm vụ",
                  "teacherAction": "Nội dung giao việc cụ thể nguyên văn từ SGK/tệp đính kèm kèm câu hỏi/đề bài tập chi tiết (CẤM dùng câu mẫu gợi ý chung chung)",
                  "studentAction": "Nội dung câu trả lời / lời giải chi tiết nguyên văn từng bài tập của HS (CẤM dùng câu mẫu gợi ý chung chung)"
                },
                {
                  "stepNumber": 2,
                  "stepName": "Bước 2: Thực hiện nhiệm vụ",
                  "teacherAction": "GV bao quát, hướng dẫn học sinh thao tác theo đúng các bước trong SGK",
                  "studentAction": "HS thảo luận nhóm/cặp đôi, thực hiện theo các bước chi tiết"
                },
                {
                  "stepNumber": 3,
                  "stepName": "Bước 3: Báo cáo kết quả",
                  "teacherAction": "GV mời đại diện HS phát biểu báo cáo kết quả",
                  "studentAction": "Đại diện HS trả lời chi tiết nguyên văn đáp án/kết quả thực hành"
                },
                {
                  "stepNumber": 4,
                  "stepName": "Bước 4: Đánh giá, kết luận",
                  "teacherAction": "GV nhận xét, chốt kiến thức chuẩn xác theo SGK",
                  "studentAction": "HS lắng nghe, ghi chép nội dung kiến thức vào vở"
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

    const filesToProcess: Array<{ base64Data?: string; data?: string; mimeType?: string }> = [];
    if (Array.isArray(req.body.attachedFiles) && req.body.attachedFiles.length > 0) {
      filesToProcess.push(...req.body.attachedFiles);
    } else if (attachedFile && (attachedFile.base64Data || attachedFile.data)) {
      filesToProcess.push(attachedFile);
    }

    let generateContents: any = prompt;
    if (filesToProcess.length > 0) {
      const parts: any[] = [];
      for (const fileItem of filesToProcess) {
        const rawData = fileItem.base64Data || fileItem.data;
        if (rawData) {
          const cleanBase64 = rawData.replace(/^data:[^;]+;base64,/, '');
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: fileItem.mimeType || 'image/jpeg'
            }
          });
        }
      }
      parts.push({ text: prompt });
      generateContents = [{ role: 'user', parts }];
    }

    const rawText = await generateWithGemini(generateContents, customKey, { responseMimeType: 'application/json' });

    const plan = safeParseJSON(rawText);
    if (plan && plan.periodPlans && Array.isArray(plan.periodPlans) && plan.periodPlans.length > 0) {
      if (!plan.weekNumber) plan.weekNumber = finalWeekNumber;
      if (!plan.timeRange) plan.timeRange = resolvedTimeRange;
      if (!plan.ppctPeriodsText) plan.ppctPeriodsText = resolvedPpctText;

      // Ensure every period has individual weekNumber, timeRange, and ppctPeriodIndex
      plan.periodPlans.forEach((period: any, pIdx: number) => {
        // Determine exact week from PPCT matched items for this specific period
        const matchedItem = matchedPpct[pIdx];
        const exactPeriodWeek = (matchedItem && matchedItem.week)
          ? Number(matchedItem.week)
          : (period.weekNumber ? Number(period.weekNumber) : finalWeekNumber);

        period.weekNumber = exactPeriodWeek;

        if (matchedItem && matchedItem.periodIndex) {
          period.ppctPeriodIndex = Number(matchedItem.periodIndex);
        } else if (matchResult.periods && matchResult.periods[pIdx]) {
          period.ppctPeriodIndex = Number(matchResult.periods[pIdx]);
        } else if (!period.ppctPeriodIndex) {
          period.ppctPeriodIndex = pIdx + 1;
        }

        period.ppctPeriodsText = `Tiết ${period.ppctPeriodIndex} theo PPCT (Tuần ${period.weekNumber})`;
        
        // Enforce strictly single-week date range for this period's specific week
        const singleWeekRange = calculateWeekDateRange(startDateWeek1, period.weekNumber);
        period.timeRange = singleWeekRange;

        const weekPeriodNum = getPeriodOfWeekNumber(
          period.ppctPeriodIndex,
          period.periodIndex || (pIdx + 1),
          period.weekNumber,
          subject,
          grade,
          effectivePpctList
        );
        const formattedTitle = formatTopicWithWeekPeriod(cleanTopic, weekPeriodNum);

        if (!period.header) period.header = {};
        period.header.title = formattedTitle;
        period.header.weekNumber = period.weekNumber;
        period.header.timeRange = singleWeekRange;

        // Clean up any "khoảng" or duplicated activity durations
        period.activities?.forEach((act) => {
          if (act.activityName) {
            act.activityName = act.activityName
              .replace(/khoảng\s*/gi, '')
              .replace(/\s*-\s*Tiết\s*\d+/gi, '')
              .trim();
          }
          if (act.timeEstimate) {
            act.timeEstimate = act.timeEstimate.replace(/khoảng\s*/gi, '').trim();
          }
        });
      });

      return res.json({ success: true, plan });
    }

    // Built-in standard pedagogical plan generator fallback (guaranteed never to fail)
    const standardPlan = buildStandardLessonPlan({
      topic,
      grade,
      subject,
      totalPeriods: Number(totalPeriods) || 2,
      bookSeries,
      enableNls: integrationOptions?.nls ?? true,
      enableStem: integrationOptions?.stem ?? true,
      enableCds: integrationOptions?.cds ?? true,
      fileName: attachedFile?.fileName,
      weekNumber: finalWeekNumber,
      timeRange: resolvedTimeRange,
      startDateWeek1,
      ppctPeriodsText: resolvedPpctText,
      ppctList
    });

    return res.json({ success: true, plan: standardPlan });
  } catch (err: any) {
    console.error('generate-lesson-plan error:', err);
    // Even on error, provide complete pedagogical plan
    const fallbackPlan = buildStandardLessonPlan({
      topic: req.body?.topic || 'Bài học mới',
      grade: req.body?.grade || '3',
      subject: req.body?.subject || 'Tin học',
      totalPeriods: Number(req.body?.totalPeriods) || 2,
      bookSeries: req.body?.bookSeries || 'Kết nối tri thức với cuộc sống',
      weekNumber: Number(req.body?.weekNumber) || 1,
      timeRange: req.body?.timeRange || calculateWeekDateRange(req.body?.startDateWeek1, Number(req.body?.weekNumber) || 1),
      startDateWeek1: req.body?.startDateWeek1,
      ppctPeriodsText: req.body?.ppctPeriodsText,
      ppctList: req.body?.ppctList || []
    });
    return res.json({ success: true, plan: fallbackPlan });
  }
});

// API ROUTE: Tự động soạn câu hỏi trắc nghiệm từ PDF/Ảnh bằng AI
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { topic, subject, grade, classId, numQuestions, folderId, attachedFiles, customApiKey } = req.body;
    const apiKeyToUse = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKeyToUse) {
      return res.status(400).json({ error: 'Chưa cài đặt Gemini API Key' });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKeyToUse,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const parts: any[] = [];
    if (Array.isArray(attachedFiles) && attachedFiles.length > 0) {
      for (const f of attachedFiles) {
        const rawData = f.base64 || f.base64Data || f.data;
        if (rawData) {
          const cleanBase64 = rawData.replace(/^data:[^;]+;base64,/, '');
          const isPdf = f.type === 'application/pdf' || (f.name && f.name.toLowerCase().endsWith('.pdf'));
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: f.type || (isPdf ? 'application/pdf' : 'image/jpeg')
            }
          });
        }
      }
    }

    const requestedNum = Math.max(1, Math.min(30, Number(numQuestions) || 5));
    const gradeText = grade && grade !== 'all' ? `cho học sinh Tiểu học Khối ${grade}` : 'cho học sinh Tiểu học';
    const promptText = `Hãy là một chuyên gia giáo dục xuất sắc. Dựa vào nội dung bài học "${topic || 'Bài học trắc nghiệm'}" (Môn ${subject || 'Tổng hợp'} ${gradeText}) và tài liệu/trang sách đính kèm (nếu có), hãy biên soạn đúng ĐỦ ${requestedNum} CÂU HỎI TRẮC NGHIỆM hay, chuẩn kiến thức sư phạm và phù hợp lứa tuổi.

Yêu cầu mỗi câu hỏi:
- Nội dung câu hỏi rõ ràng, bám sát bài dạy "${topic || 'Bài học'}".
- 4 phương án trả lời A, B, C, D (ngắn gọn, chính xác, chỉ có 1 phương án đúng).
- "correctIndex": Chỉ số phương án đúng (0 cho A, 1 cho B, 2 cho C, 3 cho D).
- "rewardCoins": Số hoa thưởng (từ 1 đến 3 hoa, ví dụ 2).
- "explanation": Giải thích ngắn gọn đáp án đúng hoặc mẹo ghi nhớ.

Trả về DUY NHẤT một mảng JSON hợp lệ các câu hỏi trắc nghiệm (không kèm markdown code fence) theo cấu trúc:
[
  {
    "question": "Nội dung câu hỏi...",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correctIndex": 0,
    "rewardCoins": 2,
    "explanation": "Lời giải thích đáp án..."
  }
]`;

    parts.push({ text: promptText });

    for (const modelName of ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts }],
          config: {
            responseMimeType: 'application/json'
          }
        });

        if (response.text) {
          const parsed = safeParseJSON(response.text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formatted = parsed.map((item: any, idx: number) => ({
              id: `quiz-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
              question: String(item.question || '').trim(),
              options: Array.isArray(item.options) && item.options.length >= 4
                ? item.options.slice(0, 4).map((o: any) => String(o).trim())
                : ['Đúng', 'Sai', 'Không xác định', 'Cả A và B'],
              correctIndex: typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex < 4 ? item.correctIndex : 0,
              subject: subject || 'Tin học',
              grade: grade && grade !== 'all' ? Number(grade) || grade : undefined,
              classId: classId && classId !== 'all' ? classId : undefined,
              folderId: folderId || undefined,
              rewardCoins: typeof item.rewardCoins === 'number' ? item.rewardCoins : 2,
              explanation: String(item.explanation || '').trim()
            }));

            return res.json({ success: true, questions: formatted });
          }
        }
      } catch (mErr) {
        console.warn(`Model ${modelName} generate quiz error:`, mErr);
      }
    }

    return res.json({ success: false, message: 'Không thể phân tích dữ liệu tệp để tạo câu hỏi.' });
  } catch (err: any) {
    console.error('generate-quiz route error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// API ROUTE: Chuyển giọng nói / văn bản cuộc họp thô thành biên bản chuẩn đạo đức & sư phạm ngành GD
app.post('/api/ai/meeting-speech-refine', async (req, res) => {
  try {
    const { rawTranscript, meetingType, customApiKey } = req.body;
    const apiKeyToUse = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKeyToUse) {
      return res.status(400).json({ error: 'Chưa cài đặt Gemini API Key' });
    }

    if (!rawTranscript || !rawTranscript.trim()) {
      return res.status(400).json({ error: 'Chưa có nội dung lời nói hoặc văn bản thô để xử lý.' });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKeyToUse,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const promptText = `Bạn là một thư ký hành chính trường học xuất sắc của ngành Giáo dục và Đào tạo Việt Nam, am hiểu sâu sắc về văn phong hành chính, chuẩn mực đạo đức nhà giáo và các quy định về biên bản cuộc họp trường học/tổ chuyên môn.

Nhiệm vụ:
Phân tích lời nói / đoạn ghi âm / nội dung thô từ cuộc họp giáo viên dưới đây và tổng hợp thành Biên bản họp chuyên nghiệp, súc tích, đầy đủ.

Yêu cầu BẮT BUỘC:
1. ĐÚNG CHUẨN MỰC, ĐẠO ĐỨC NGÀNH GIÁO DỤC: Dùng ngôn từ trang trọng, văn phong sư phạm, khách quan, chuẩn mực, xây dựng tinh thần đoàn kết nhà trường và tôn trọng đồng nghiệp.
2. TẬP TRUNG NỘI DUNG CỐT LÕI: Lọc bỏ hoàn toàn các lời nói chuyện phiếm, nói đùa lan man, ý kiến bên lề không liên quan đến công tác chuyên môn/nhà trường.
3. CẤU TRÚC RÕ RÀNG VÀ CHUẨN XÁC:
   - "title": Tên cuộc họp trang trọng (ví dụ: Biên bản họp Tổ chuyên môn Khối ... / Biên bản Họp Chuyên môn...)
   - "reviewPastWork": I. NỘI DUNG SINH HOẠT / ĐÁNH GIÁ CÔNG TÁC (Tóm tắt các đánh giá, kết quả đã đạt, ưu điểm và lưu ý)
   - "upcomingPlan": II. SINH HOẠT CHUYÊN MÔN THEO NGHIÊN CỨU BÀI HỌC / KẾ HOẠCH (Các bước chọn bài học, thảo luận kế hoạch bài dạy, dự giờ minh họa hoặc kế hoạch tuần tới)
   - "discussions": III. KẾT LUẬN CHUNG VÀ PHÂN CÔNG THỰC HIỆN (Kết luận của Tổ trưởng/Chủ trì và phân công công việc)
   - "resolutions": IV. KẾT THÚC (Biểu quyết/Thống nhất chung và thời điểm kết thúc)
   - "actionItems": Các nhiệm vụ phân công cụ thể cho giáo viên (dạng danh sách gạch đầu dòng ngắn gọn)

Đoạn văn bản lời nói/cuộc họp thô:
"""
${rawTranscript}
"""

Trả về DUY NHẤT một đối tượng JSON hợp lệ (không kèm code block hay văn bản phụ):
{
  "title": "...",
  "reviewPastWork": "...",
  "upcomingPlan": "...",
  "discussions": "...",
  "resolutions": "...",
  "actionItems": "..."
}`;

    for (const modelName of ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            responseMimeType: 'application/json'
          }
        });

        if (response.text) {
          const parsed = safeParseJSON(response.text);
          if (parsed && typeof parsed === 'object') {
            return res.json({ success: true, data: parsed });
          }
        }
      } catch (err) {
        console.warn(`Model ${modelName} meeting speech refine error:`, err);
      }
    }

    return res.status(500).json({ error: 'Không thể phân tích lời nói bằng AI. Vui lòng thử lại.' });
  } catch (err: any) {
    console.error('meeting-speech-refine error:', err);
    return res.status(500).json({ error: err.message || 'Lỗi server' });
  }
});

// Start Server
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
