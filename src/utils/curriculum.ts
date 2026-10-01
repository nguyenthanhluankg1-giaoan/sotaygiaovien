// Danh mục Phân môn theo Khối lớp chuẩn Bộ Giáo dục & Đào tạo (GDPT 2018) dành cho GVCN

export interface SubSubjectInfo {
  subject: string;
  subSubjects: string[];
}

export const PRIMARY_CURRICULUM_MAP: Record<number, SubSubjectInfo[]> = {
  1: [
    { subject: 'Tiếng Việt', subSubjects: ['Tập đọc (Đọc)', 'Học vần', 'Đọc mở rộng', 'Tập viết (Viết)', 'Nói và nghe', 'Kể chuyện', 'Ôn tập'] },
    { subject: 'Toán', subSubjects: [] },
    { subject: 'Tự nhiên và Xã hội', subSubjects: [] },
    { subject: 'Đạo đức', subSubjects: [] },
    { subject: 'Âm nhạc', subSubjects: [] },
    { subject: 'Mĩ thuật', subSubjects: [] },
    { subject: 'Giáo dục thể chất', subSubjects: [] },
    { subject: 'Hoạt động trải nghiệm', subSubjects: [] }
  ],
  2: [
    { subject: 'Tiếng Việt', subSubjects: ['Tập đọc (Đọc)', 'Học vần', 'Đọc mở rộng', 'Chính tả / Viết', 'Luyện từ và câu', 'Nói và nghe', 'Kể chuyện', 'Tập làm văn', 'Ôn tập'] },
    { subject: 'Toán', subSubjects: [] },
    { subject: 'Tự nhiên và Xã hội', subSubjects: [] },
    { subject: 'Đạo đức', subSubjects: [] },
    { subject: 'Âm nhạc', subSubjects: [] },
    { subject: 'Mĩ thuật', subSubjects: [] },
    { subject: 'Giáo dục thể chất', subSubjects: [] },
    { subject: 'Hoạt động trải nghiệm', subSubjects: [] }
  ],
  3: [
    { subject: 'Tiếng Việt', subSubjects: ['Đọc (Tập đọc)', 'Học vần', 'Đọc mở rộng', 'Luyện từ và câu (LTVC)', 'Viết (Tập làm văn)', 'Nói và nghe', 'Kể chuyện', 'Ôn tập'] },
    { subject: 'Toán', subSubjects: [] },
    { subject: 'Tự nhiên và Xã hội', subSubjects: [] },
    { subject: 'Đạo đức', subSubjects: [] },
    { subject: 'Tin học', subSubjects: [] },
    { subject: 'Công nghệ', subSubjects: [] },
    { subject: 'Tin học và Công nghệ', subSubjects: [] },
    { subject: 'Tiếng Anh', subSubjects: [] },
    { subject: 'Nghệ thuật', subSubjects: [] },
    { subject: 'Giáo dục thể chất', subSubjects: [] },
    { subject: 'Hoạt động trải nghiệm', subSubjects: [] },
    { subject: 'Chào cờ', subSubjects: [] },
    { subject: 'Sinh hoạt lớp', subSubjects: [] }
  ],
  4: [
    { subject: 'Tiếng Việt', subSubjects: ['Đọc (Tập đọc)', 'Học vần', 'Đọc mở rộng', 'Luyện từ và câu (LTVC)', 'Viết (Tập làm văn)', 'Nói và nghe', 'Kể chuyện', 'Ôn tập'] },
    { subject: 'Toán', subSubjects: [] },
    { subject: 'Khoa học', subSubjects: [] },
    { subject: 'Lịch sử và Địa lí', subSubjects: [] },
    { subject: 'Đạo đức', subSubjects: [] },
    { subject: 'Tin học', subSubjects: [] },
    { subject: 'Công nghệ', subSubjects: [] },
    { subject: 'Tin học và Công nghệ', subSubjects: [] },
    { subject: 'Tiếng Anh', subSubjects: [] },
    { subject: 'Nghệ thuật', subSubjects: [] },
    { subject: 'Giáo dục thể chất', subSubjects: [] },
    { subject: 'Hoạt động trải nghiệm', subSubjects: [] },
    { subject: 'Chào cờ', subSubjects: [] },
    { subject: 'Sinh hoạt lớp', subSubjects: [] }
  ],
  5: [
    { subject: 'Tiếng Việt', subSubjects: ['Đọc (Tập đọc)', 'Học vần', 'Đọc mở rộng', 'Luyện từ và câu (LTVC)', 'Viết (Tập làm văn)', 'Nói và nghe', 'Kể chuyện', 'Ôn tập'] },
    { subject: 'Toán', subSubjects: [] },
    { subject: 'Khoa học', subSubjects: [] },
    { subject: 'Lịch sử và Địa lí', subSubjects: [] },
    { subject: 'Đạo đức', subSubjects: [] },
    { subject: 'Tin học', subSubjects: [] },
    { subject: 'Công nghệ', subSubjects: [] },
    { subject: 'Tin học và Công nghệ', subSubjects: [] },
    { subject: 'Tiếng Anh', subSubjects: [] },
    { subject: 'Nghệ thuật', subSubjects: [] },
    { subject: 'Giáo dục thể chất', subSubjects: [] },
    { subject: 'Hoạt động trải nghiệm', subSubjects: [] },
    { subject: 'Chào cờ', subSubjects: [] },
    { subject: 'Sinh hoạt lớp', subSubjects: [] }
  ]
};

// Fallback danh mục phân môn chung (Chỉ duy nhất Tiếng Việt có phân môn)
export const COMMON_SUB_SUBJECTS_MAP: Record<string, string[]> = {
  'Tiếng Việt': ['Đọc (Tập đọc)', 'Học vần', 'Đọc mở rộng', 'Luyện từ và câu (LTVC)', 'Viết (Tập làm văn)', 'Nói và nghe', 'Kể chuyện', 'Ôn tập']
};

/**
  Lấy danh sách phân môn dựa theo Khối lớp và Môn học
 */
export function getSubSubjectsByGradeAndSubject(grade: number | string, subjectName: string): string[] {
  const gNum = Number(grade) || 3;
  const gradeConfig = PRIMARY_CURRICULUM_MAP[gNum] || PRIMARY_CURRICULUM_MAP[3];

  const found = gradeConfig.find(
    (item) => item.subject.toLowerCase() === subjectName.trim().toLowerCase()
  );

  if (found && found.subSubjects && found.subSubjects.length > 0) {
    return found.subSubjects;
  }

  // Fallback map
  for (const [key, subs] of Object.entries(COMMON_SUB_SUBJECTS_MAP)) {
    if (subjectName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(subjectName.toLowerCase())) {
      return subs;
    }
  }

  return [];
}
