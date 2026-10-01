/**
 * TÀI LIỆU VÀ CÔNG VĂN HƯỚNG DẪN GIÁO DỤC STEM CẤP TIỂU HỌC
 * Bộ Giáo dục và Đào tạo - Công văn số 909/BGDĐT-GDTH
 *
 * QUY TRÌNH BÀI HỌC STEM CHUẨN 5 BƯỚC / 4 PHA SƯ PHẠM:
 * - Pha 1 (Hoạt động 1 - Khởi động): Mở đầu / Xác định vấn đề thực tiễn & Tiêu chí sản phẩm STEM.
 * - Pha 2 (Hoạt động 2 - Hình thành kiến thức): Nghiên cứu kiến thức nền (Toán, Tự nhiên & Xã hội/Khoa học, Tin học, Công nghệ) & Đề xuất giải pháp thiết kế.
 * - Pha 3 (Hoạt động 3 - Luyện tập/Thực hành): Lựa chọn vật liệu, Chế tạo mẫu thử nghiệm & Kiểm chứng vận hành.
 * - Pha 4 (Hoạt động 4 - Vận dụng/Trải nghiệm): Trưng bày sản phẩm, thuyết minh nguyên lý liên môn & Cải tiến tối ưu.
 */

export interface StemLessonTopic {
  id: string;
  grade: number;
  subject: string;
  topicName: string;
  stemLessonTitle: string; // Tên bài học STEM trong SGK/Tài liệu STEM
  leadSubject: string; // Môn chủ đạo
  integratedSubjects: string[]; // Các môn học tích hợp (Toán, Mĩ thuật, Công nghệ, Khoa học)
  problemStatement: string; // Vấn đề thực tiễn cần giải quyết
  productCriteria: string[]; // Tiêu chí sản phẩm STEM
  materials: string[]; // Vật liệu, dụng cụ thực hành
}

export const STEM_LESSON_DATABASE: StemLessonTopic[] = [
  // LỚP 1
  {
    id: 'stem-g1-1',
    grade: 1,
    subject: 'Toán',
    topicName: 'Các hình phẳng cơ bản / Khối hộp chữ nhật, khối lập phương',
    stemLessonTitle: 'Bài học STEM 1: Ngôi nhà hình học và Đồ chơi xếp hình sáng tạo',
    leadSubject: 'Toán 1',
    integratedSubjects: ['Tự nhiên và Xã hội 1', 'Mĩ thuật 1', 'Âm nhạc 1'],
    problemStatement: 'Sử dụng các hình phẳng (hình vuông, tròn, tam giác, chữ nhật) và khối hình để thiết kế mô hình ngôi nhà hoặc công viên đồ chơi an toàn.',
    productCriteria: ['Nhận biết đúng tên các hình', 'Mô hình chắc chắn, màu sắc hài hòa', 'Giới thiệu được các hình dùng trong mô hình'],
    materials: ['Bìa carton, giấy màu, que kem, kéo thủ công, keo dán']
  },
  {
    id: 'stem-g1-2',
    grade: 1,
    subject: 'Tự nhiên và Xã hội',
    topicName: 'Chăm sóc và bảo vệ cây xanh / Con vật quanh em',
    stemLessonTitle: 'Bài học STEM 2: Chậu cây thông minh từ vật liệu tái chế',
    leadSubject: 'Tự nhiên và Xã hội 1',
    integratedSubjects: ['Mĩ thuật 1', 'Toán 1', 'Hoạt động trải nghiệm 1'],
    problemStatement: 'Tận dụng chai nhựa cũ làm chậu trồng cây nhỏ có cơ chế giữ ẩm tự nhiên để đặt tại góc thiên nhiên lớp học.',
    productCriteria: ['Có lỗ thoát nước hoặc dây hút nước tự động', 'Trang trí đẹp mắt, an toàn', 'Cây đứng vững và dễ tưới'],
    materials: ['Chai nhựa đã rửa sạch, sợi len/vải cotton, đất mùn, hạt mầm/cây con']
  },

  // LỚP 2
  {
    id: 'stem-g2-1',
    grade: 2,
    subject: 'Toán',
    topicName: 'Đo độ dài (dm, m, km) / Thực hành đo lường',
    stemLessonTitle: 'Bài học STEM 3: Thước đo thông minh và Thùng phân loại rác mini',
    leadSubject: 'Toán 2',
    integratedSubjects: ['Tự nhiên và Xã hội 2', 'Mĩ thuật 2', 'Công nghệ 2'],
    problemStatement: 'Thiết kế thước cuộn hoặc dụng cụ đo độ dài chuẩn xác và thùng phân loại rác tái chế có kích thước quy định cho bàn học.',
    productCriteria: ['Vạch chia độ dài chính xác (cm, dm)', 'Thùng rác có nắp đóng mở tiện lợi', 'Có dán nhãn phân loại rác hữu cơ/vô cơ'],
    materials: ['Dải ruy băng, bìa cứng, que gỗ, compa, bút dạ màu']
  },
  {
    id: 'stem-g2-2',
    grade: 2,
    subject: 'Tự nhiên và Xã hội',
    topicName: 'Thời tiết và mùa / Phòng tránh thiên tai',
    stemLessonTitle: 'Bài học STEM 4: Chong chóng gió và Dụng cụ đo hướng gió',
    leadSubject: 'Tự nhiên và Xã hội 2',
    integratedSubjects: ['Toán 2 (hình học, đo lường)', 'Mĩ thuật 2'],
    problemStatement: 'Chế tạo chong chóng gió và dụng cụ chỉ hướng gió (phong kế đơn giản) để quan sát sự chuyển động của không khí.',
    productCriteria: ['Quay nhạy khi có gió thổi', 'Trục quay vững chắc, không bị kẹt', 'Chỉ được hướng gió cơ bản'],
    materials: ['Giấy thủ công vuông 15x15cm, ống hút nhựa cứng, đinh ghim, hạt cườm, cốc giấy']
  },

  // LỚP 3
  {
    id: 'stem-g3-1',
    grade: 3,
    subject: 'Toán',
    topicName: 'Chu vi, diện tích hình chữ nhật, hình vuông / Bảng nhân chia',
    stemLessonTitle: 'Bài học STEM 5: Bàn cờ toán học thông minh và Khung tranh đa năng',
    leadSubject: 'Toán 3',
    integratedSubjects: ['Công nghệ 3', 'Mĩ thuật 3', 'Tin học 3'],
    problemStatement: 'Tính toán chu vi, diện tích để thiết kế khung ảnh lưu niệm hoặc bàn cờ tương tác luyện tính nhẩm nhanh theo nhóm.',
    productCriteria: ['Đo đạc và cắt ghép chính xác theo kích thước cm', 'Khung ảnh có chân đế đứng vững', 'Các ô cờ có ghi phép tính sáng tạo'],
    materials: ['Bìa carton sóng 3 lớp, giấy màu kẻ ô, thước kẻ kim loại, keo dán nến/hồ nước']
  },
  {
    id: 'stem-g3-2',
    grade: 3,
    subject: 'Tin học',
    topicName: 'Sơ đồ hình cây, tệp và thư mục / Lập trình robot',
    stemLessonTitle: 'Bài học STEM 6: Bản đồ mê cung và Robot dẫn đường thông minh',
    leadSubject: 'Tin học 3',
    integratedSubjects: ['Toán 3 (hình học và vị trí)', 'Công nghệ 3', 'Mĩ thuật 3'],
    problemStatement: 'Thiết kế sơ đồ mê cung phân tầng và bộ thẻ lệnh điều khiển robot di chuyển vượt chướng ngại vật theo chuỗi thuật toán tuần tự.',
    productCriteria: ['Sơ đồ rõ ràng có điểm xuất phát và đích đến', 'Bộ thẻ lệnh đầy đủ (Tiến, Lùi, Quay trái, Quay phải)', 'Điều khiển robot đi đúng đường không chạm vách'],
    materials: ['Tấm bìa A3, nắp chai/quân cờ làm robot, bộ thẻ lệnh in màu']
  },

  // LỚP 4
  {
    id: 'stem-g4-1',
    grade: 4,
    subject: 'Khoa học',
    topicName: 'Nước và sự truyền nhiệt / Âm thanh, ánh sáng',
    stemLessonTitle: 'Bài học STEM 7: Bình giữ nhiệt mini và Nhạc cụ tự chế',
    leadSubject: 'Khoa học 4',
    integratedSubjects: ['Toán 4 (đo nhiệt độ, thời gian)', 'Công nghệ 4', 'Âm nhạc 4', 'Mĩ thuật 4'],
    problemStatement: 'Vận dụng vật liệu dẫn nhiệt kém (xốp, bông gòn, giấy bạc) để chế tạo bình giữ nhiệt giữ nước ấm trong 60 phút hoặc chế tạo đàn gõ phát ra các nốt nhạc chuẩn.',
    productCriteria: ['Nhiệt độ nước giảm không quá 5 độ C sau 30 phút', 'Bình kín, không rò rỉ nước, dễ cầm nắm', 'Đàn phát ra tối thiểu 5 âm độ khác nhau'],
    materials: ['Vỏ chai nhựa đôi, giấy bạc cách nhiệt, bông gòn, mút xốp, nhiệt kế đo nước']
  },
  {
    id: 'stem-g4-2',
    grade: 4,
    subject: 'Công nghệ',
    topicName: 'Lắp ghép mô hình kỹ thuật / Đồ chơi dân gian',
    stemLessonTitle: 'Bài học STEM 8: Xe phản lực chạy bằng bóng bay và Cầu nâng thủy lực',
    leadSubject: 'Công nghệ 4',
    integratedSubjects: ['Toán 4 (tốc độ, quãng đường)', 'Khoa học 4 (lực đẩy không khí, áp suất)', 'Mĩ thuật 4'],
    problemStatement: 'Chế tạo xe đồ chơi chuyển động bằng lực đẩy của bóng bay hoặc xi lanh nước, đạt quãng đường chạy thẳng tối thiểu 2 mét.',
    productCriteria: ['Xe chạy thẳng và êm', 'Quãng đường chạy đạt trên 2 mét', 'Trục bánh xe quay trơn tru, không ma sát'],
    materials: ['Bìa fomex/nắp chai làm bánh xe, que xiên tre, ống hút, bóng bay cao su, dây thun']
  },

  // LỚP 5
  {
    id: 'stem-g5-1',
    grade: 5,
    subject: 'Khoa học',
    topicName: 'Năng lượng điện, mạch điện thắp sáng / Năng lượng mặt trời, gió',
    stemLessonTitle: 'Bài học STEM 9: Đèn ngủ thông minh và Ngôi nhà năng lượng xanh',
    leadSubject: 'Khoa học 5',
    integratedSubjects: ['Công nghệ 5 (lắp mạch điện cơ bản)', 'Toán 5 (tính diện tích, chi phí)', 'Mĩ thuật 5'],
    problemStatement: 'Lắp ráp mô hình ngôi nhà sử dụng pin mặt trời / quạt gió mini và mạch điện có công tắc điều khiển thắp sáng đèn LED.',
    productCriteria: ['Mạch điện hoạt động an toàn, công tắc nhạy', 'Đèn LED sáng rõ, dây dẫn gọn gàng', 'Mô hình nhà có tính thẩm mỹ và kết cấu vững chắc'],
    materials: ['Hộp pin 3V, bóng đèn LED nhỏ, công tắc gạt, dây điện đơn, tấm pin quang điện mini, bìa mô hình']
  },
  {
    id: 'stem-g5-2',
    grade: 5,
    subject: 'Toán',
    topicName: 'Hình hộp chữ nhật, hình lập phương / Thể tích và diện tích toàn phần',
    stemLessonTitle: 'Bài học STEM 10: Hộp quà sinh thái và Dụng cụ lọc nước mini',
    leadSubject: 'Toán 5',
    integratedSubjects: ['Khoa học 5 (lọc cơ học)', 'Công nghệ 5', 'Mĩ thuật 5'],
    problemStatement: 'Tính toán thể tích và diện tích để gấp hộp quà đa giác tiết kiệm nguyên liệu, hoặc làm cột lọc nước cơ học 4 tầng (sỏi, cát, than hoạt tính, bông).',
    productCriteria: ['Tính toán diện tích xung quanh và toàn phần chính xác', 'Nước sau lọc trong, loại bỏ được tạp chất cơ bản', 'Hộp quà chịu lực tốt và có khóa cài thẩm mỹ'],
    materials: ['Chai nhựa 1.5L, sỏi sạch, cát thạch anh, than hoạt tính y tế, bông y tế, giấy kraft']
  }
];

export function findMatchingStemTopic(subject: string, grade: number, lessonTopic: string): StemLessonTopic {
  const matchedGrade = STEM_LESSON_DATABASE.filter((s) => s.grade === grade);
  if (matchedGrade.length === 0) {
    return STEM_LESSON_DATABASE[0];
  }

  // Find exact or partial subject match
  const matchedSubject = matchedGrade.find((s) =>
    subject.toLowerCase().includes(s.subject.toLowerCase()) || s.subject.toLowerCase().includes(subject.toLowerCase())
  );

  return matchedSubject || matchedGrade[0];
}
