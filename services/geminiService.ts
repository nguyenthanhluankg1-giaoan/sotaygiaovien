
import { GoogleGenAI, Type } from "@google/genai";
import type { LessonPlanInput, FileWithPreview, LessonPlan } from '../types';

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'hi',
    });
    return !!response.text;
  } catch (error) {
    console.error("API Key validation failed:", error);
    return false;
  }
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      mimeType: file.type,
      data: base64EncodedData,
    },
  };
};

const lessonPlanObjectSchema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING, description: "Môn học" },
    grade: { type: Type.STRING, description: "Lớp học" },
    lessonTitle: { type: Type.STRING, description: "Tên bài học" },
    periods: { type: Type.INTEGER, description: "Tổng số tiết của toàn bộ bài học này. Ví dụ, nếu bài học có 2 tiết, giá trị này là 2." },
    executionTime: { type: Type.STRING, description: "Thời gian thực hiện cho tiết học cụ thể này. BẮT BUỘC phải theo định dạng 'Tiết [số tiết] - Tuần [số tuần]'. Ví dụ: 'Tiết 1 - Tuần 10'" },
    requiredOutcomes: {
      type: Type.OBJECT,
      properties: {
        generalCompetencies: { type: Type.STRING, description: "Các năng lực chung cần đạt được." },
        specificCompetencies: { type: Type.STRING, description: "Các năng lực đặc thù của môn học." },
        qualities: { type: Type.STRING, description: "Các phẩm chất cần hình thành cho học sinh." },
        integratedContent: { type: Type.STRING, description: "Nội dung tích hợp liên môn (nếu có)." },
      },
      required: ['generalCompetencies', 'specificCompetencies', 'qualities', 'integratedContent']
    },
    teachingAids: {
      type: Type.OBJECT,
      properties: {
        teacher: { type: Type.STRING, description: "Đồ dùng, thiết bị của giáo viên." },
        student: { type: Type.STRING, description: "Đồ dùng, sách vở của học sinh." },
      },
      required: ['teacher', 'student']
    },
    teachingActivities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          activityName: { type: Type.STRING, description: "Tên hoạt động. Bắt buộc phải là một trong các giá trị sau: '1. Hoạt động mở đầu', '2. Hình thành kiến thức mới', '3. Hoạt động luyện tập - thực hành', '4. Hoạt động vận dụng'" },
          objective: { type: Type.STRING, description: "Mục tiêu của hoạt động." },
          teacherActivity: { type: Type.STRING, description: "Các bước và lời nói của giáo viên, sử dụng xuống dòng để phân tách." },
          studentActivity: { type: Type.STRING, description: "Các hành động tương ứng của học sinh, sử dụng xuống dòng để phân tách." },
        },
        required: ['activityName', 'objective', 'teacherActivity', 'studentActivity']
      },
    },
    postLessonAdjustments: { type: Type.STRING, description: "Nội dung cần điều chỉnh, rút kinh nghiệm sau bài dạy. AI không cần tạo nội dung cho phần này, chỉ cần trả về một chuỗi rỗng ''." },
  },
  required: ['subject', 'grade', 'lessonTitle', 'periods', 'executionTime', 'requiredOutcomes', 'teachingAids', 'teachingActivities', 'postLessonAdjustments']
};

const lessonPlanSchema = {
    type: Type.ARRAY,
    items: lessonPlanObjectSchema,
};


export const generateLessonPlan = async (data: LessonPlanInput, files: FileWithPreview[], apiKey: string): Promise<LessonPlan[]> => {
  if (!apiKey) {
    throw new Error("API key is missing. Please log in again.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
    Bạn là một chuyên gia soạn giáo án tại Việt Nam với kinh nghiệm sâu sắc về chương trình giáo dục phổ thông 2018.
    Nhiệm vụ của bạn là tạo một bộ Kế hoạch bài dạy (giáo án) chi tiết theo chuẩn Công văn 1001.

    Thông tin đầu vào:
    - Giáo viên: ${data.teacherName}
    - Môn học: ${data.subject}
    - Lớp: ${data.grade}
    - Tổng số tiết yêu cầu: ${data.periods}
    - Các tệp đính kèm: ${files.length > 0 ? files.map(f => f.name).join(', ') : 'Không có'}

    Yêu cầu ĐẶC BIỆT QUAN TRỌNG:
    1.  **TỰ ĐỘNG XÁC ĐỊNH BÀI HỌC:** Dựa vào Môn học và Lớp đã cho, hãy tự động xác định tên bài học (bao gồm cả số thứ tự bài, ví dụ: "Bài 10: Cây xanh") phù hợp nhất theo phân phối chương trình học hiện hành. Bạn có toàn quyền quyết định tên bài học sao cho logic và hợp lý nhất.
    2.  **SOẠN GIÁO ÁN CHO TỪNG TIẾT:** Dựa vào "Tổng số tiết yêu cầu" là ${data.periods}, hãy soạn một giáo án HOÀN CHỈNH và RIÊNG BIỆT cho TỪNG TIẾT HỌC. Nếu người dùng yêu cầu 2 tiết, bạn phải tạo ra chính xác 2 đối tượng giáo án trong mảng JSON đầu ra.
    3.  **Phân bổ nội dung:** Phân bổ nội dung và hoạt động dạy học một cách hợp lý và logic qua các tiết để đảm bảo tính liên tục và hoàn chỉnh của toàn bộ bài học.
    4.  **Cấu trúc:** Mỗi giáo án cho một tiết phải tuân thủ nghiêm ngặt mẫu Công văn 1001, bao gồm: I. Yêu cầu cần đạt, II. Đồ dùng dạy học, III. Các hoạt động dạy học, IV. Điều chỉnh sau bài dạy.
    5.  **Hoạt động dạy học (QUAN TRỌNG NHẤT):** Phần "III. Các hoạt động dạy học" là trọng tâm, cần được soạn thảo kỹ lưỡng:
        a.  **Tên hoạt động:** Phải bao gồm đủ 4 hoạt động với tên chính xác: "1. Hoạt động mở đầu", "2. Hình thành kiến thức mới", "3. Hoạt động luyện tập - thực hành", và "4. Hoạt động vận dụng".
        b.  **Hoạt động của Giáo viên (\`teacherActivity\`):** Ở cột này, hãy sáng tạo và đề xuất cụ thể các hình thức, phương pháp và kĩ thuật dạy học hiện đại (viết tắt là PPDH), phù hợp (ví dụ: Kĩ thuật mảnh ghép, Dạy học theo dự án, Kĩ thuật KWL, Trò chơi 'Ai nhanh hơn?', PPDH Bàn tay nặn bột, v.v.). Mô tả rõ cách triển khai các kĩ thuật/trò chơi đó trong các bước của hoạt động.
        c.  **Hoạt động của Học sinh (\`studentActivity\`):** Cần mô tả chi tiết cho từng hoạt động:
            -   **Đối với "1. Hoạt động mở đầu":** Cần làm rõ học sinh kết nối kiến thức cũ như thế nào để tạo ra một "tình huống có vấn đề", từ đó khơi gợi nhu cầu tìm hiểu, khám phá kiến thức mới của bài học. Mô tả cụ thể kết quả học sinh làm được về kiến thức (nhắc lại được gì), năng lực (hình thành năng lực tư duy, giải quyết vấn đề ban đầu), và phẩm chất (khơi gợi sự tò mò, hứng thú học tập).
            -   **Đối với "2. Hình thành kiến thức mới":** Cột này phải được mô tả cực kỳ chi tiết, làm rõ các yếu tố sau:
                -   **Trải nghiệm & Khám phá:** Học sinh được trải nghiệm, khám phá kiến thức mới thông qua những hoạt động cụ thể nào (ví dụ: quan sát tranh ảnh, xem video, làm thí nghiệm, thảo luận nhóm, đọc tài liệu,...)?
                -   **Phân tích & Hình thành kiến thức:** Học sinh phân tích, xử lý thông tin và tự mình rút ra, hình thành kiến thức mới ra sao? Mô tả rõ từng bước tư duy của học sinh.
                -   **Kết quả đầu ra:** Sau hoạt động, học sinh cụ thể làm được gì? Trình bày được kiến thức nào? Hình thành được năng lực, phẩm chất gì? (Ví dụ: 'HS nêu được định nghĩa về quang hợp', 'HS phát triển năng lực hợp tác qua hoạt động nhóm', 'HS thể hiện sự chăm chỉ, cẩn thận khi làm thí nghiệm').
            -   **Đối với "3. Hoạt động luyện tập - thực hành":** Mô tả rõ học sinh vận dụng kiến thức vừa học để giải quyết các bài tập, nhiệm vụ cụ thể. Cần làm rõ:
                -   **Kết quả đầu ra:** Học sinh làm được gì cụ thể? (Về kiến thức, năng lực, phẩm chất). Ví dụ: 'HS giải được bài tập 1, 2 trong SGK', 'HS rèn luyện năng lực tính toán', 'HS thể hiện tính cẩn thận, chính xác'.
                -   **Sản phẩm học tập:** Nêu rõ sản phẩm cụ thể mà học sinh phải hoàn thành. Ví dụ: 'Phiếu bài tập đã hoàn thành', 'Sơ đồ tư duy tổng kết bài học', 'Bài viết ngắn'.
            -   **Đối với "4. Hoạt động vận dụng":** Mô tả cách học sinh vận dụng kiến thức, kĩ năng đã học vào giải quyết các tình huống, vấn đề thực tiễn trong cuộc sống. Cần làm rõ:
                -   **Kết quả đầu ra:** Học sinh làm được gì cụ thể? (Về kiến thức, năng lực, phẩm chất). Ví dụ: 'HS biết cách áp dụng công thức tính diện tích vào đo đạc mảnh vườn nhà mình', 'HS phát triển năng lực giải quyết vấn đề thực tiễn', 'HS thể hiện tình yêu lao động, quý trọng thành quả'.
                -   **Sản phẩm học tập:** Nêu rõ sản phẩm cụ thể mà học sinh phải hoàn thành (có thể là sản phẩm ở nhà). Ví dụ: 'Bản báo cáo kết quả đo đạc mảnh vườn', 'Video clip giới thiệu về một di tích lịch sử ở địa phương', 'Kế hoạch tiết kiệm năng lượng cho gia đình'.
    6.  **Tích hợp tệp:** Nếu có tệp đính kèm, hãy phân tích và tích hợp nội dung từ các tệp đó vào phần "II. Đồ dùng dạy học" và các hoạt động dạy học một cách hợp lý.
    7.  **ĐỊNH DẠNG ĐẦU RA:** Kết quả trả về BẮT BUỘC phải là một MẢNG (ARRAY) các đối tượng JSON. Mỗi đối tượng trong mảng là một giáo án hoàn chỉnh cho MỘT TIẾT HỌC và phải tuân thủ theo schema đã cung cấp.
    `;

  const imageParts = await Promise.all(
    files.filter(file => file.type.startsWith('image/')).map(fileToGenerativePart)
  );

  const textParts = files
    .filter(file => file.type === 'application/pdf')
    .map(file => ({ text: `Nội dung tham khảo từ tệp PDF: ${file.name}` }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [{ text: prompt }, ...imageParts, ...textParts] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: lessonPlanSchema,
      }
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result as LessonPlan[];
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Không thể tạo giáo án từ AI. Vui lòng kiểm tra lại thông tin và thử lại.");
  }
};
