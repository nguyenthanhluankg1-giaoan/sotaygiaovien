import { GoogleGenAI, Type } from '@google/genai';
import { UploadedFileInfo, DetailedLessonPlan, PpctItem } from '../types';
import { getStoredApiKey } from '../utils/apiKeyStorage';

/**
 * CHỈ THỊ HỆ THỐNG (SYSTEM INSTRUCTION) - CÔNG VĂN 2345/BGDĐT-GDTH
 * Ép buộc Gemini tuân thủ 100% cấu trúc Kế hoạch bài dạy (Giáo án) chuẩn Tiểu học.
 */
export const SYSTEM_INSTRUCTION_CONG_VAN_2345 = `
Bạn là chuyên gia thiết kế Kế hoạch bài dạy (Giáo án) Tiểu học hàng đầu tại Việt Nam.
Nhiệm vụ của bạn là soạn Kế hoạch bài dạy (Giáo án) CHUẨN ĐÚNG 100% ĐỊNH DẠNG CÔNG VĂN 2345/BGDĐT-GDTH của Bộ Giáo dục và Đào tạo.

BẮT BUỘC TUÂN THỦ CHẶT CHẼ CÁC QUY ĐỊNH SAU:

I. CẤU TRÚC GIÁO ÁN MỖI TIẾT HỌC
Mỗi tiết học trong Kế hoạch bài dạy BẮT BUỘC có đủ 3 phần chính theo Công văn 2345:

I. YÊU CẦU CẦN ĐẠT
1. Năng lực đặc thù:
   - Các năng lực gắn liền với môn học (mã hóa cụ thể các yêu cầu kiến thức, kỹ năng bài dạy).
2. Năng lực chung:
   - Tự chủ và tự học: Tự giác tìm hiểu bài học, thực hiện các nhiệm vụ học tập.
   - Giao tiếp và hợp tác: Tích cực thảo luận nhóm, chia sẻ và giúp đỡ bạn.
   - Giải quyết vấn đề và sáng tạo: Biết vận dụng kiến thức bài học xử lý tình huống.
3. Phẩm chất:
   - Chăm chỉ, Trung thực, Trách nhiệm.
4. Nội dung Tích hợp (nếu người dùng yêu cầu):
   - Năng lực số (CV 3456): Đưa các mã chỉ báo cụ thể như [1.3.CB1a], [2.1.CB2a], [4.1.TC1a]...
   - Giáo dục STEM (CV 909): Đưa đầy đủ 4 pha STEM (Pha 1: Xác định vấn đề; Pha 2: Nghiên cứu kiến thức nền; Pha 3: Chế tạo & thử nghiệm; Pha 4: Trưng bày & đánh giá).
   - Giáo dục Công dân số (CV 3899 & SGK Hành trình CĐS Lớp 1-5): Trích dẫn bài học phù hợp và tình huống ứng xử số văn minh.

II. ĐỒ DÙNG DẠY HỌC
1. Giáo viên: SGK, máy tính, tivi/máy chiếu, bài giảng điện tử, phiếu học tập, thiết bị/vật liệu dạy học.
2. Học sinh: SGK, vở ghi, đồ dùng học tập, dụng cụ thực hành.

III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU
Mỗi tiết học bắt buộc gồm đúng 4 hoạt động chuẩn Công văn 2345:
1. HOẠT ĐỘNG KHỞI ĐỘNG (5 phút)
2. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC MỚI (15 phút)
3. HOẠT ĐỘNG LUYỆN TẬP - THỰC HÀNH (10 phút)
4. HOẠT ĐỘNG VẬN DỤNG - TRẢI NGHIỆM (5 phút)

QUY ĐỊNH BẮT BUỘC VỀ TRÌNH BÀY HOẠT ĐỘNG:
- Mỗi Hoạt động được chia thành các Nhiệm vụ cụ thể (* Nhiệm vụ 1, * Nhiệm vụ 2...).
- Mỗi Nhiệm vụ BẮT BUỘC trình bày đủ 4 BƯỚC SƯ PHẠM QUY CHUẨN:
  + Bước 1: Chuyển giao nhiệm vụ (GV giao nhiệm vụ cụ thể, rõ ràng, nêu yêu cầu).
  + Bước 2: Thực hiện nhiệm vụ (HS cá nhân/cặp đôi/nhóm thực hiện, GV theo dõi, hỗ trợ).
  + Bước 3: Báo cáo kết quả (Đại diện HS/nhóm trình bày, lớp lắng nghe, nhận xét).
  + Bước 4: Đánh giá, kết luận (GV nhận xét, chuẩn hóa kiến thức và chốt nội dung trọng tâm).

- Mọi hành động của GV và HS phải diễn giải CỰC KỲ CHI TIẾT, BÁM SÁT TÊN BÀI HỌC VÀ NỘI DUNG SGK/TỆP ĐÍNH KÈM.
- KHÔNG dùng câu mẫu chung chung hay lặp lại. Nếu có tệp đính kèm (ảnh/PDF SGK), PHẢI trích xuất và phân tích toàn bộ bài tập, hình ảnh, văn bản trong tệp đó vào nội dung hoạt động.

IV. QUY ĐỊNH BẮT BUỘC VỀ TIÊU ĐỀ BÀI HỌC:
1. Tên bài dạy / Tiêu đề ("title", "topic") BẮT BUỘC viết TRỰC TIẾP, NGẮN GỌN TÊN BÀI HỌC (Ví dụ: "Bài 1: Cổng trường mở ra (Tiết 1)", "Bài 1: Tìm hiểu cách viết bài văn kể chuyện sáng tạo").
2. TUYỆT ĐỐI KHÔNG chèn tên môn hay tiền tố phân môn như "Tiếng Việt (Phân môn: ...)", "Môn Tiếng Việt - ", "Phân môn: ..." vào trước tiêu đề bài dạy.
3. NỘI DUNG DẠY HỌC MỖI TIẾT HỌC PHẢI BÁM SÁT ĐÚNG 100% YÊU CẦU NỘI DUNG VÀ YÊU CẦU CẦN ĐẠT CỦA PHÂN MÔN TRONG PPCT.
`;

// Safe JSON parser helper
export function safeParseJSON(rawText: string | null | undefined): any {
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

/**
 * Kiểm tra tính hợp lệ và phản hồi của Gemini API Key
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const trimmed = apiKey?.trim();
  if (!trimmed) {
    return { success: false, error: 'Chưa cung cấp API Key.' };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: trimmed,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Xin chào, phản hồi ngắn: "API Key kết nối thành công"'
    });

    if (response?.text) {
      return { success: true, message: response.text.trim() };
    }
    return { success: false, error: 'Không nhận được văn bản phản hồi từ Google Gemini.' };
  } catch (err: any) {
    console.error('Test Gemini API Key failed:', err);
    return {
      success: false,
      error: err?.message || 'API Key không hợp lệ hoặc bị từ chối bởi Google Gemini.'
    };
  }
}

/**
 * Phân tích tệp hình ảnh/PDF trang sách bằng Gemini
 */
export async function analyzeLessonFileWithGemini(
  files: UploadedFileInfo[],
  apiKey?: string
): Promise<{ topic?: string; subject?: string; grade?: string; bookSeries?: string } | null> {
  const apiKeyToUse = apiKey || getStoredApiKey();
  if (!apiKeyToUse.trim() || files.length === 0) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKeyToUse.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

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

    const promptText = `Hãy phân tích kỹ nội dung trang sách/tài liệu giáo dục đính kèm và trích xuất:
1. "topic": Tên bài học đầy đủ (Ví dụ: "Bài 1. Thông tin và quyết định", "Bài 15. Bảng nhân 7"...).
2. "subject": Môn học (Ví dụ: "Tin học", "Toán", "Tiếng Việt", "Tự nhiên và Xã hội", "Khoa học"...).
3. "grade": Khối lớp dạng số chuỗi (Ví dụ: "3", "4", "5"...).
4. "bookSeries": Bộ sách nếu nhận diện được (Ví dụ: "Kết nối tri thức với cuộc sống", "Cánh Diều", "Chân trời sáng tạo"...).

Trả về DUY NHẤT một JSON hợp lệ có dạng:
{
  "topic": "Bài ...",
  "subject": "Tin học",
  "grade": "3",
  "bookSeries": "Kết nối tri thức với cuộc sống"
}`;

    parts.push({ text: promptText });

    for (const modelName of ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_CONG_VAN_2345,
            responseMimeType: 'application/json'
          }
        });
        if (response.text) {
          const parsed = safeParseJSON(response.text);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (err) {
        console.warn(`Model ${modelName} analyze failed:`, err);
      }
    }
  } catch (err) {
    console.error('Analyze lesson file error:', err);
  }
  return null;
}

/**
 * Soạn Kế hoạch bài dạy (Giáo án) Công văn 2345 sử dụng Gemini
 */
export async function generateLessonPlanWithGemini(params: {
  topic: string;
  grade: string;
  subject: string;
  totalPeriods: number;
  bookSeries: string;
  weekNumber: number;
  timeRange: string;
  ppctPeriodsText?: string;
  ppctList?: PpctItem[];
  integrationOptions: { nls: boolean; stem: boolean; cds: boolean };
  attachedFiles?: UploadedFileInfo[];
  apiKey?: string;
}): Promise<DetailedLessonPlan | null> {
  const apiKeyToUse = params.apiKey || getStoredApiKey();
  if (!apiKeyToUse.trim()) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKeyToUse.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

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

    const promptText = `
YÊU CẦU SOẠN KẾ HOẠCH BÀI DẠY (GIÁO ÁN) CÔNG VĂN 2345/BGDĐT-GDTH:

- Tên bài dạy / chủ đề: "${params.topic}"
- Môn học: ${params.subject}
- Khối lớp: Lớp ${params.grade}
- Bộ sách: ${params.bookSeries}
- Tổng số tiết: ${params.totalPeriods} tiết
- Tuần theo PPCT: TUẦN ${params.weekNumber}
- Tiết theo PPCT: ${params.ppctPeriodsText || `Tiết 1 - ${params.totalPeriods} theo PPCT`}
- Thời gian thực hiện: ${params.timeRange}
- Tùy chọn Tích hợp:
  + Năng lực số (CV 3456): ${params.integrationOptions.nls ? 'CÓ' : 'KHÔNG'}
  + Giáo dục STEM (CV 909): ${params.integrationOptions.stem ? 'CÓ' : 'KHÔNG'}
  + Công dân số (CV 3899): ${params.integrationOptions.cds ? 'CÓ' : 'KHÔNG'}

Nhiệm vụ: Hãy sinh đầy đủ ${params.totalPeriods} tiết học. Mỗi tiết học BẮT BUỘC tuân thủ đúng cấu trúc Công văn 2345 (I. Yêu cầu cần đạt, II. Đồ dùng dạy học, III. Các hoạt động dạy học gồm 4 bước sư phạm quy chuẩn).

⛔ CẤM TUYỆT ĐỐI VIẾT CÂU MẪU GỢI Ý CHUNG CHUNG HOẶC TÓM TẮT RỖNG:
- CẤM TUYỆT ĐỐI các câu vô nghĩa như: "GV hướng dẫn HS đọc bài...", "GV yêu cầu HS quan sát SGK...", "GV đưa ra câu hỏi gợi mở...", "HS làm theo sự hướng dẫn...", "HS trả lời câu hỏi...".
- BẮT BUỘC TRÍCH XUẤT 100% NỘI DUNG DỮ LIỆU THỰC TẾ TRONG SGK VÀ TỆP ĐÍNH KÈM:
  1. Với bài đọc/ngữ văn: Trích NGUYÊN VĂN đoạn đọc/thơ/văn bản bài học thực tế từ SGK/tệp đính kèm vào "teacherAction".
  2. Với câu hỏi đọc hiểu / câu hỏi bài học: Trích NGUYÊN VĂN câu hỏi 1, 2, 3, 4 trong SGK vào "teacherAction".
  3. Với đáp án / câu trả lời: Trích NGUYÊN VĂN câu trả lời chi tiết / đáp án từng câu vào "studentAction".
  4. Với bài tập / thực hành: Viết RÕ ĐỀ BÀI TẬP CHI TIẾT (các con số, phép tính, câu lệnh, dữ liệu SGK) và LỜI GIẢI / ĐÁP ÁN CHI TIẾT từng câu.
  5. Nếu người dùng đính kèm tệp trang sách SGK/PDF: Bạn BẮT BUỘC phải đọc kỹ từng hình ảnh/trang sách để lấy ĐÚNG TOÀN BỘ chữ, câu hỏi, bài tập thực tế từ tệp đó vào giáo án. CẤM BỎ QUA VÀ CẤM VIẾT CÂU MẪU KHÔ KHAN!

QUY ĐỊNH BẮT BUỘC VỀ TIÊU ĐỀ & PHÂN MÔN TRONG KẾ HOẠCH BÀI DẠY:
1. Sau tên bài dạy là tiết thứ mấy của tuần đó (ví dụ: "${params.topic} (Tiết 1)", "${params.topic} (Tiết 2)").
2. XÓA HOÀN TOÀN dòng tiết theo PPCT nằm dưới thời gian thực hiện. Dưới dòng "Thời gian thực hiện" KHÔNG ghi bất kỳ dòng tiết theo PPCT nào.
3. TUYỆT ĐỐI KHÔNG chèn tiền tố rườm rà như "${params.subject} (Phân môn: ...)", "Môn ${params.subject} - " vào tiêu đề.
4. Tất cả các hoạt động dạy học PHẢI diễn giải đúng 100% nội dung kiến thức, kỹ năng của bài học theo PPCT.

Trả về DUY NHẤT một đối tượng JSON hợp lệ (không kèm markdown code fence) theo cấu trúc:
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
      "subSubject": "Tên Phân môn (vd: Đọc, Viết, LTVC, Đọc mở rộng, Lịch sử... hoặc rỗng nếu môn không chia phân môn)",
      "lessonTitle": "Tên bài dạy của riêng tiết 1",
      "weekNumber": ${params.weekNumber},
      "ppctPeriodIndex": 1,
      "ppctPeriodsText": "Tiết 1 (Tuần ${params.weekNumber}) theo PPCT",
      "timeRange": "${params.timeRange}",
      "header": {
        "subject": "${params.subject}",
        "grade": "${params.grade}",
        "title": "${params.topic} (${params.totalPeriods} tiết)",
        "subSubject": "Tên Phân môn (nếu có)",
        "lessonTitle": "Tên bài dạy tiết 1",
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
          "activityName": "1. HOẠT ĐỘNG KHỞI ĐỘNG (5 phút)",
          "timeEstimate": "5 phút",
          "integrationNote": "...",
          "tasks": [
            {
              "taskId": "task-1-1-1",
              "taskTitle": "* Nhiệm vụ 1: Khởi động và tạo hứng thú học tập bài ${params.topic}",
              "integrationNote": "...",
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
        },
        {
          "activityNumber": 2,
          "activityName": "2. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC MỚI (15 phút)",
          "timeEstimate": "15 phút",
          "integrationNote": "...",
          "tasks": [...]
        },
        {
          "activityNumber": 3,
          "activityName": "3. HOẠT ĐỘNG LUYỆN TẬP - THỰC HÀNH (10 phút)",
          "timeEstimate": "10 phút",
          "integrationNote": "...",
          "tasks": [...]
        },
        {
          "activityNumber": 4,
          "activityName": "4. HOẠT ĐỘNG VẬN DỤNG - TRẢI NGHIỆM (5 phút)",
          "timeEstimate": "5 phút",
          "integrationNote": "...",
          "tasks": [...]
        }
      ],
      "postLessonAdjustment": "...................................................................................................."
    }
  ]
}`;

    parts.push({ text: promptText });

    for (const modelName of ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION_CONG_VAN_2345,
            responseMimeType: 'application/json'
          }
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
              periodPlans: (parsed.periodPlans || []).map((p: any) => ({
                ...p,
                weekNumber: p.weekNumber || parsed.weekNumber || params.weekNumber,
                header: p.header
                  ? {
                      ...p.header,
                      weekNumber: p.header.weekNumber || p.weekNumber || parsed.weekNumber || params.weekNumber
                    }
                  : p.header
              }))
            };
          }
        }
      } catch (mErr) {
        console.warn(`Model ${modelName} generate plan failed:`, mErr);
      }
    }
  } catch (err) {
    console.error('Generate lesson plan error:', err);
  }
  return null;
}

/**
 * Tự động tạo câu hỏi trắc nghiệm từ tên bài dạy và tệp đính kèm (Ảnh/PDF) bằng Gemini AI
 */
export async function generateQuizWithGemini(params: {
  topic: string;
  subject: string;
  grade?: string | number;
  classId?: string;
  numQuestions: number;
  folderId?: string;
  attachedFiles?: UploadedFileInfo[];
  apiKey?: string;
}): Promise<import('../types').QuizQuestion[] | null> {
  const apiKeyToUse =
    params.apiKey ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '') ||
    ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) ||
    '';
  if (!apiKeyToUse.trim()) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKeyToUse.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

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

    const gradeText = params.grade && params.grade !== 'all' ? `cho học sinh Tiểu học Khối ${params.grade}` : 'cho học sinh Tiểu học';
    const promptText = `Hãy là một chuyên gia giáo dục xuất sắc. Dựa vào nội dung bài học "${params.topic}" (Môn ${params.subject} ${gradeText}) và tài liệu/trang sách đính kèm (nếu có), hãy biên soạn đúng ĐỦ ${params.numQuestions} CÂU HỎI TRẮC NGHIỆM hay, chuẩn kiến thức sư phạm và phù hợp lứa tuổi.

Yêu cầu mỗi câu hỏi:
- Nội dung câu hỏi rõ ràng, bám sát bài dạy "${params.topic}".
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
            return parsed.map((item: any, idx: number) => ({
              id: `quiz-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
              question: String(item.question || '').trim(),
              options: Array.isArray(item.options) && item.options.length >= 4
                ? item.options.slice(0, 4).map((o: any) => String(o).trim())
                : ['Đúng', 'Sai', 'Không xác định', 'Cả A và B'],
              correctIndex: typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex < 4 ? item.correctIndex : 0,
              subject: params.subject,
              grade: params.grade && params.grade !== 'all' ? Number(params.grade) || params.grade : undefined,
              classId: params.classId && params.classId !== 'all' ? params.classId : undefined,
              folderId: params.folderId || undefined,
              rewardCoins: typeof item.rewardCoins === 'number' ? item.rewardCoins : 2,
              explanation: String(item.explanation || '').trim()
            }));
          }
        }
      } catch (err) {
        console.warn(`Model ${modelName} generate quiz failed:`, err);
      }
    }
  } catch (err) {
    console.error('Generate quiz with gemini error:', err);
  }
  return null;
}
