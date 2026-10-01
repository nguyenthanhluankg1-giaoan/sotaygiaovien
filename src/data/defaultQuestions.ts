import { QuizQuestion } from '../types';

export const DEFAULT_QUIZ_QUESTIONS: QuizQuestion[] = [
  // Tin học
  {
    id: 'quiz-th-01',
    subject: 'Tin học',
    grade: 3,
    question: 'Bộ phận nào của máy tính giúp em nhập chữ cái và số vào văn bản?',
    options: ['Màn hình', 'Bàn phím', 'Loa', 'Máy in'],
    correctIndex: 1,
    rewardCoins: 2,
    explanation: 'Bàn phím là thiết bị vào cơ bản dùng để nhập kí tự, chữ cái và số vào máy tính.'
  },
  {
    id: 'quiz-th-02',
    subject: 'Tin học',
    grade: 3,
    question: 'Khi ngồi học máy tính, tư thế nào sau đây là đúng và bảo vệ mắt?',
    options: [
      'Cúi sát mặt vào màn hình để nhìn cho rõ',
      'Nằm ra bàn vừa xem vừa bấm phím',
      'Ngồi thẳng lưng, mắt cách màn hình 50 - 70 cm',
      'Tắt hết đèn trong phòng học cho tối'
    ],
    correctIndex: 2,
    rewardCoins: 2,
    explanation: 'Ngồi thẳng lưng và giữ khoảng cách 50-70cm giúp chống mỏi mắt và tránh tật cong vẹo cột sống.'
  },
  {
    id: 'quiz-th-03',
    subject: 'Tin học',
    grade: 4,
    question: 'Trong phần mềm soạn thảo văn bản Word, phím "Enter" có tác dụng gì?',
    options: [
      'Xóa kí tự bên trái con trỏ',
      'Lưu văn bản vào ổ đĩa',
      'Tắt máy tính ngay lập tức',
      'Xuống dòng mới để bắt đầu đoạn văn mới'
    ],
    correctIndex: 3,
    rewardCoins: 2,
    explanation: 'Phím Enter dùng để kết thúc đoạn hiện tại và xuống dòng mới.'
  },
  {
    id: 'quiz-th-04',
    subject: 'Tin học',
    grade: 3,
    question: 'Thao tác "nháy đúp chuột" (Double Click) được thực hiện như thế nào?',
    options: [
      'Nhấn nút chuột trái hai lần liên tiếp thật nhanh',
      'Nhấn nút chuột phải một lần',
      'Giữ chuột trái trong 5 giây',
      'Lăn nút cuộn chuột giữa'
    ],
    correctIndex: 0,
    rewardCoins: 2,
    explanation: 'Nháy đúp chuột là thao tác bấm nút trái chuột 2 lần liên tiếp nhanh chóng.'
  },
  {
    id: 'quiz-th-05',
    subject: 'Tin học',
    grade: 4,
    question: 'Trong máy tính, "Thư mục" (Folder) có công dụng chính là gì?',
    options: [
      'Dùng để kết nối mạng Internet',
      'Để lưu trữ và sắp xếp các tệp dữ liệu ngăn nắp',
      'Để tăng âm lượng của loa',
      'Dùng để làm mát máy tính'
    ],
    correctIndex: 1,
    rewardCoins: 2,
    explanation: 'Thư mục giống như một ngăn kéo cặp sách, giúp phân loại và lưu giữ các tệp tài liệu gọn gàng.'
  },

  // Công nghệ
  {
    id: 'quiz-cn-01',
    subject: 'Công nghệ',
    grade: 3,
    question: 'Đâu là việc làm an toàn khi sử dụng thiết bị điện trong gia đình?',
    options: [
      'Cắm đồng thời nhiều thiết bị công suất lớn vào một ổ',
      'Chọc vật kim loại nhọn vào ổ cắm điện',
      'Lau khô tay trước khi chạm vào phích cắm điện',
      'Tự ý nối dây điện bị đứt khi chưa ngắt cầu dao'
    ],
    correctIndex: 2,
    rewardCoins: 2,
    explanation: 'Tuyệt đối không chạm vào ổ cắm hay phích điện khi tay còn ướt để tránh bị điện giật.'
  },
  {
    id: 'quiz-cn-02',
    subject: 'Công nghệ',
    grade: 4,
    question: 'Đâu là biển báo mang ý nghĩa "Cảnh báo nguy hiểm - Điện giật"?',
    options: [
      'Hình tròn viền đỏ có gạch chéo',
      'Hình vuông màu xanh lá cây',
      'Hình tròn màu xanh dương',
      'Hình tam giác viền vàng có hình tia sét màu đen'
    ],
    correctIndex: 3,
    rewardCoins: 2,
    explanation: 'Biển báo nguy hiểm điện giật có hình tam giác nền vàng viền đen với hình tia sét.'
  },
  {
    id: 'quiz-cn-03',
    subject: 'Công nghệ',
    grade: 4,
    question: 'Khi tưới nước cho hoa và cây cảnh trong sân trường, thời điểm nào là thích hợp nhất?',
    options: [
      'Buổi sáng sớm hoặc chiều mát',
      'Giữa trưa lúc trời nắng gắt nhất',
      'Lúc trời đang có mưa to',
      'Nửa đêm 12 giờ'
    ],
    correctIndex: 0,
    rewardCoins: 2,
    explanation: 'Tưới vào sáng sớm hoặc chiều mát giúp rễ cây hấp thụ nước tốt nhất và không bị sốc nhiệt.'
  },

  // Toán
  {
    id: 'quiz-m-01',
    subject: 'Toán',
    grade: 3,
    question: 'Số lớn nhất có hai chữ số khác nhau là số nào?',
    options: ['99', '98', '89', '97'],
    correctIndex: 1,
    rewardCoins: 2,
    explanation: 'Số lớn nhất có 2 chữ số là 99, nhưng để 2 chữ số khác nhau thì chữ số hàng đơn vị là 8, tức là 98.'
  },
  {
    id: 'quiz-m-02',
    subject: 'Toán',
    grade: 4,
    question: 'Kết quả của phép tính: 25 + 75 : 5 là bao nhiêu?',
    options: ['20', '15', '40', '100'],
    correctIndex: 2,
    rewardCoins: 2,
    explanation: 'Thực hiện nhân chia trước, cộng trừ sau: 75 : 5 = 15; sau đó 25 + 15 = 40.'
  },
  {
    id: 'quiz-m-03',
    subject: 'Toán',
    grade: 3,
    question: 'Hình tam giác có 3 cạnh bằng nhau, mỗi cạnh dài 6 cm. Chu vi hình tam giác đó là:',
    options: ['12 cm', '36 cm', '24 cm', '18 cm'],
    correctIndex: 3,
    rewardCoins: 2,
    explanation: 'Chu vi tam giác bằng tổng độ dài 3 cạnh: 6 + 6 + 6 = 18 cm.'
  },

  // Tiếng Việt
  {
    id: 'quiz-tv-01',
    subject: 'Tiếng Việt',
    grade: 3,
    question: 'Từ nào sau đây viết ĐÚNG chính tả?',
    options: ['Xắp sếp', 'Sắp xếp', 'Sắp sếp', 'Xắp xếp'],
    correctIndex: 1,
    rewardCoins: 2,
    explanation: 'Từ viết đúng chính tả là "Sắp xếp".'
  },
  {
    id: 'quiz-tv-02',
    subject: 'Tiếng Việt',
    grade: 4,
    question: 'Câu nào sau đây thuộc mẫu câu "Ai làm gì?"',
    options: [
      'Bạn Lan rất chăm chỉ và hiền lành.',
      'Bố em là kỹ sư công nghệ.',
      'Bác nông dân đang cày ruộng trên đồng.',
      'Mặt trời như một quả cầu lửa đỏ rực.'
    ],
    correctIndex: 2,
    rewardCoins: 2,
    explanation: '"đang cày ruộng" là hoạt động, trả lời cho câu hỏi "làm gì?".'
  },

  // Khoa học / Tự nhiên & Xã hội
  {
    id: 'quiz-kh-01',
    subject: 'Khoa học',
    grade: 4,
    question: 'Hiện tượng nước từ thể lỏng biến thành thể khí gọi là hiện tượng gì?',
    options: ['Đông đặc', 'Ngưng tụ', 'Nóng chảy', 'Bay hơi'],
    correctIndex: 3,
    rewardCoins: 2,
    explanation: 'Sự chuyển thể từ thể lỏng sang thể khí (hơi) gọi là sự bay hơi.'
  },

  // Tiếng Anh
  {
    id: 'quiz-en-01',
    subject: 'Tiếng Anh',
    grade: 3,
    question: 'Chọn từ tiếng Anh có nghĩa là "Máy vi tính":',
    options: ['Computer', 'Book', 'Pencil', 'Eraser'],
    correctIndex: 0,
    rewardCoins: 2,
    explanation: 'Computer có nghĩa là máy vi tính trong tiếng Anh.'
  },

  // Đố vui
  {
    id: 'quiz-dv-01',
    subject: 'Đố vui',
    grade: 'all',
    question: 'Cái gì chặt không đứt, bứt không rời, phơi không khô, nấu không chín?',
    options: ['Sợi dây chun', 'Dòng nước', 'Ngọn lửa', 'Hòn đá'],
    correctIndex: 1,
    rewardCoins: 3,
    explanation: 'Đó chính là dòng nước!'
  }
];
