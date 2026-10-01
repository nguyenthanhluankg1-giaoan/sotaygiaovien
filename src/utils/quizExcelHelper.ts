import * as XLSX from 'xlsx';
import { QuizQuestion } from '../types';
import { uid } from './helpers';

export const SAMPLE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'sample-q1',
    question: 'Số lớn nhất có hai chữ số khác nhau là số nào?',
    options: ['99', '98', '90', '89'],
    correctIndex: 1,
    subject: 'Toán',
    grade: '3',
    explanation: 'Số lớn nhất có hai chữ số khác nhau là 98 (99 có hai chữ số giống nhau).'
  },
  {
    id: 'sample-q2',
    question: 'Bộ phận nào của cây làm nhiệm vụ hút nước và chất khoáng trong đất?',
    options: ['Thân cây', 'Lá cây', 'Rễ cây', 'Hoa'],
    correctIndex: 2,
    subject: 'Tự nhiên & Xã hội',
    grade: '3',
    explanation: 'Rễ cây đâm sâu vào đất để hút nước và chất dinh dưỡng nuôi cây.'
  },
  {
    id: 'sample-q3',
    question: 'Từ nào dưới đây là từ chỉ hoạt động của học sinh?',
    options: ['Trường học', 'Viết bài', 'Cái bàn', 'Xinh đẹp'],
    correctIndex: 1,
    subject: 'Tiếng Việt',
    grade: '3',
    explanation: '"Viết bài" là hành động thực hiện công việc học tập.'
  },
  {
    id: 'sample-q4',
    question: 'Đâu là bàn phím máy tính dùng để làm gì?',
    options: ['Hiển thị hình ảnh', 'Nhập dữ liệu và chữ viết', 'Phát ra âm thanh', 'Lưu trữ thông tin'],
    correctIndex: 1,
    subject: 'Tin học',
    grade: '3',
    explanation: 'Bàn phím là thiết bị nhập dữ liệu kí tự chính của máy tính.'
  },
  {
    id: 'sample-q5',
    question: 'Nước Việt Nam có bao nhiêu tỉnh thành (theo quy định hành chính)?',
    options: ['63', '64', '60', '65'],
    correctIndex: 0,
    subject: 'Lịch sử & Địa lý',
    grade: '4',
    explanation: 'Việt Nam hiện có 63 tỉnh và thành phố trực thuộc trung ương.'
  }
];

/**
 * Tạo & Tải file Excel mẫu Câu hỏi và Đáp án
 */
export function downloadSampleQuizExcel() {
  const data = SAMPLE_QUIZ_QUESTIONS.map((q, index) => {
    const correctLetter = ['A', 'B', 'C', 'D'][q.correctIndex] || 'A';
    return {
      'STT': index + 1,
      'Câu hỏi': q.question,
      'Đáp án A': q.options[0] || '',
      'Đáp án B': q.options[1] || '',
      'Đáp án C': q.options[2] || '',
      'Đáp án D': q.options[3] || '',
      'Đáp án đúng (A/B/C/D)': correctLetter,
      'Môn học': q.subject || 'Toán',
      'Khối lớp': q.grade || '3',
      'Giải thích đáp án': q.explanation || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for pretty preview
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 45 }, // Câu hỏi
    { wch: 22 }, // A
    { wch: 22 }, // B
    { wch: 22 }, // C
    { wch: 22 }, // D
    { wch: 22 }, // Đáp án đúng
    { wch: 18 }, // Môn học
    { wch: 10 }, // Khối lớp
    { wch: 40 }  // Giải thích
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CauHoi_DapAn_Mau');
  
  XLSX.writeFile(workbook, 'File_Mau_CauHoi_Va_DapAn.xlsx');
}

/**
 * Xuất danh sách câu hỏi & đáp án hiện tại ra file Excel (.xlsx)
 */
export function exportQuizQuestionsToExcel(questions: QuizQuestion[], fileNameCustom?: string) {
  if (!questions || questions.length === 0) {
    alert('Không có câu hỏi nào trong danh sách để xuất file!');
    return;
  }

  const data = questions.map((q, index) => {
    const correctLetter = ['A', 'B', 'C', 'D'][q.correctIndex] || 'A';
    const correctText = q.options[q.correctIndex] || '';
    return {
      'STT': index + 1,
      'Câu hỏi': q.question,
      'Đáp án A': q.options[0] || '',
      'Đáp án B': q.options[1] || '',
      'Đáp án C': q.options[2] || '',
      'Đáp án D': q.options[3] || '',
      'Đáp án đúng (Ký tự)': correctLetter,
      'Nội dung đáp án đúng': correctText,
      'Môn học': q.subject || 'Toán',
      'Khối lớp': q.grade || 'Tất cả',
      'Giải thích chi tiết': q.explanation || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 48 }, // Câu hỏi
    { wch: 22 }, // A
    { wch: 22 }, // B
    { wch: 22 }, // C
    { wch: 22 }, // D
    { wch: 20 }, // Ký tự
    { wch: 28 }, // Nội dung
    { wch: 18 }, // Môn
    { wch: 10 }, // Lớp
    { wch: 40 }  // Giải thích
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'NganHang_CauHoi');

  const filename = fileNameCustom || `NganHang_CauHoi_Va_DapAn_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Đọc và phân tích file Excel / CSV / JSON chứa câu hỏi và đáp án
 */
export async function parseQuizFile(file: File): Promise<{
  questions: QuizQuestion[];
  errors: string[];
}> {
  const errors: string[] = [];
  const questions: QuizQuestion[] = [];

  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.json')) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || []);
      
      list.forEach((item: any, idx: number) => {
        if (!item.question || typeof item.question !== 'string') {
          errors.push(`Dòng JSON #${idx + 1}: Thiếu nội dung câu hỏi.`);
          return;
        }
        const opts = Array.isArray(item.options) ? item.options : [item.a, item.b, item.c, item.d].filter(Boolean);
        if (opts.length < 2) {
          errors.push(`Câu "${item.question.slice(0, 20)}...": Cần ít nhất 2 phương án đáp án.`);
          return;
        }
        
        let cIdx = typeof item.correctIndex === 'number' ? item.correctIndex : 0;
        if (typeof item.correctAnswer === 'string') {
          const letter = item.correctAnswer.trim().toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(letter)) {
            cIdx = ['A', 'B', 'C', 'D'].indexOf(letter);
          }
        }

        questions.push({
          id: uid(),
          question: item.question.trim(),
          options: opts.map((o: any) => String(o).trim()),
          correctIndex: Math.min(Math.max(0, cIdx), opts.length - 1),
          subject: item.subject || 'Toán',
          grade: item.grade || 'all',
          explanation: item.explanation || ''
        });
      });
    } else {
      // Excel (.xlsx, .xls) or CSV
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        return { questions: [], errors: ['File Excel/CSV không có dữ liệu dòng nào.'] };
      }

      rows.forEach((row, idx) => {
        // Find key names loosely
        const keys = Object.keys(row);
        const findVal = (terms: string[]) => {
          const k = keys.find(key => terms.some(t => key.toLowerCase().includes(t.toLowerCase())));
          return k ? String(row[k]).trim() : '';
        };

        const qText = findVal(['câu hỏi', 'cau hoi', 'question', 'nội dung', 'đề bài']);
        if (!qText) {
          // Skip empty row silently if empty
          if (Object.values(row).every(v => !v)) return;
          errors.push(`Dòng Excel #${idx + 2}: Không tìm thấy cột Câu hỏi.`);
          return;
        }

        const optA = findVal(['đáp án a', 'dap an a', 'phương án a', 'a']);
        const optB = findVal(['đáp án b', 'dap an b', 'phương án b', 'b']);
        const optC = findVal(['đáp án c', 'dap an c', 'phương án c', 'c']);
        const optD = findVal(['đáp án d', 'dap an d', 'phương án d', 'd']);

        const rawOpts = [optA, optB, optC, optD].filter(Boolean);
        // Fallback if options are in a single column or array
        const options = rawOpts.length >= 2 ? rawOpts : [optA || 'Đúng', optB || 'Sai', optC || 'Khác', optD || 'Bỏ qua'];

        // Determine correct answer index
        const correctRaw = findVal(['đáp án đúng', 'dap an dung', 'đáp án', 'correct', 'key', 'kết quả']);
        let correctIndex = 0;

        if (correctRaw) {
          const upper = correctRaw.toUpperCase().trim();
          if (upper === 'A' || upper === '1') correctIndex = 0;
          else if (upper === 'B' || upper === '2') correctIndex = 1;
          else if (upper === 'C' || upper === '3') correctIndex = 2;
          else if (upper === 'D' || upper === '4') correctIndex = 3;
          else {
            // Check if matches option string directly
            const matchIdx = options.findIndex(opt => opt.toLowerCase() === correctRaw.toLowerCase());
            if (matchIdx !== -1) correctIndex = matchIdx;
          }
        }

        const subject = findVal(['môn học', 'mon hoc', 'môn', 'subject']) || 'Toán';
        const grade = findVal(['khối lớp', 'khoi lop', 'lớp', 'grade']) || 'all';
        const explanation = findVal(['giải thích', 'giai thich', 'đáp án chi tiết', 'explanation', 'ghi chú']);

        questions.push({
          id: uid(),
          question: qText,
          options,
          correctIndex,
          subject,
          grade,
          explanation
        });
      });
    }
  } catch (err: any) {
    errors.push(`Lỗi đọc file: ${err?.message || 'Không thể đọc dữ liệu file.'}`);
  }

  return { questions, errors };
}
