import { DragDropGameItem } from '../types';

export interface EducationalEmojiItem {
  id: string;
  emoji: string;
  name: string;
  category: string;
}

export const EDUCATIONAL_EMOJI_LIBRARY: EducationalEmojiItem[] = [
  // Hình học & Kí hiệu
  { id: 'e-circle', emoji: '⭕', name: 'Hình tròn', category: 'Hình học' },
  { id: 'e-square', emoji: '⬛', name: 'Hình vuông', category: 'Hình học' },
  { id: 'e-triangle', emoji: '🔺', name: 'Hình tam giác', category: 'Hình học' },
  { id: 'e-star', emoji: '⭐', name: 'Hình ngôi sao', category: 'Hình học' },
  { id: 'e-diamond', emoji: '🔷', name: 'Hình thoi', category: 'Hình học' },
  { id: 'e-cube', emoji: '🎲', name: 'Khối lập phương', category: 'Hình học' },
  { id: 'e-box', emoji: '📦', name: 'Khối hộp chữ nhật', category: 'Hình học' },
  { id: 'e-cylinder', emoji: '🥫', name: 'Khối trụ', category: 'Hình học' },
  { id: 'e-cone', emoji: '🍦', name: 'Khối nón', category: 'Hình học' },
  { id: 'e-sphere', emoji: '⚽', name: 'Khối cầu', category: 'Hình học' },

  // Động vật
  { id: 'e-dog', emoji: '🐶', name: 'Con chó', category: 'Động vật' },
  { id: 'e-cat', emoji: '🐱', name: 'Con mèo', category: 'Động vật' },
  { id: 'e-cow', emoji: '🐮', name: 'Con bò', category: 'Động vật' },
  { id: 'e-chicken', emoji: '🐔', name: 'Con gà', category: 'Động vật' },
  { id: 'e-duck', emoji: '🦆', name: 'Con vịt', category: 'Động vật' },
  { id: 'e-bird', emoji: '🕊️', name: 'Chim bồ câu', category: 'Động vật' },
  { id: 'e-elephant', emoji: '🐘', name: 'Con voi', category: 'Động vật' },
  { id: 'e-tiger', emoji: '🐯', name: 'Con hổ', category: 'Động vật' },
  { id: 'e-lion', emoji: '🦁', name: 'Sư tử', category: 'Động vật' },
  { id: 'e-rabbit', emoji: '🐰', name: 'Con thỏ', category: 'Động vật' },
  { id: 'e-fish', emoji: '🐟', name: 'Con cá', category: 'Động vật' },
  { id: 'e-dolphin', emoji: '🐬', name: 'Cá heo', category: 'Động vật' },
  { id: 'e-turtle', emoji: '🐢', name: 'Con rùa', category: 'Động vật' },
  { id: 'e-frog', emoji: '🐸', name: 'Con ếch', category: 'Động vật' },
  { id: 'e-bee', emoji: '🐝', name: 'Con ong', category: 'Động vật' },

  // Thực vật & Hoa quả
  { id: 'e-apple', emoji: '🍎', name: 'Quả táo', category: 'Hoa quả & Cây' },
  { id: 'e-banana', emoji: '🍌', name: 'Quả chuối', category: 'Hoa quả & Cây' },
  { id: 'e-watermelon', emoji: '🍉', name: 'Dưa hấu', category: 'Hoa quả & Cây' },
  { id: 'e-orange', emoji: '🍊', name: 'Quả cam', category: 'Hoa quả & Cây' },
  { id: 'e-strawberry', emoji: '🍓', name: 'Dâu tây', category: 'Hoa quả & Cây' },
  { id: 'e-carrot', emoji: '🥕', name: 'Củ cà rốt', category: 'Hoa quả & Cây' },
  { id: 'e-corn', emoji: '🌽', name: 'Bắp ngô', category: 'Hoa quả & Cây' },
  { id: 'e-flower', emoji: '🌸', name: 'Bông hoa', category: 'Hoa quả & Cây' },
  { id: 'e-tree', emoji: '🌳', name: 'Cây cối', category: 'Hoa quả & Cây' },
  { id: 'e-leaf', emoji: '🍃', name: 'Chiếc lá', category: 'Hoa quả & Cây' },

  // Dụng cụ học tập & Tin học
  { id: 'e-pencil', emoji: '✏️', name: 'Bút chì', category: 'Học tập & Công nghệ' },
  { id: 'e-pen', emoji: '🖊️', name: 'Bút mực', category: 'Học tập & Công nghệ' },
  { id: 'e-book', emoji: '📖', name: 'Quyển sách', category: 'Học tập & Công nghệ' },
  { id: 'e-ruler', emoji: '📐', name: 'Thước kẻ', category: 'Học tập & Công nghệ' },
  { id: 'e-backpack', emoji: '🎒', name: 'Cặp sách', category: 'Học tập & Công nghệ' },
  { id: 'e-computer', emoji: '🖥️', name: 'Màn hình máy tính', category: 'Học tập & Công nghệ' },
  { id: 'e-keyboard', emoji: '⌨️', name: 'Bàn phím máy tính', category: 'Học tập & Công nghệ' },
  { id: 'e-mouse', emoji: '🖱️', name: 'Chuột máy tính', category: 'Học tập & Công nghệ' },
  { id: 'e-printer', emoji: '🖨️', name: 'Máy in', category: 'Học tập & Công nghệ' },
  { id: 'e-headphones', emoji: '🎧', name: 'Tai nghe', category: 'Học tập & Công nghệ' },
  { id: 'e-mic', emoji: '🎙️', name: 'Microphone', category: 'Học tập & Công nghệ' },

  // Phương tiện & Hoạt động
  { id: 'e-car', emoji: '🚗', name: 'Ô tô', category: 'Phương tiện & Đời sống' },
  { id: 'e-bicycle', emoji: '🚲', name: 'Xe đạp', category: 'Phương tiện & Đời sống' },
  { id: 'e-bus', emoji: '🚌', name: 'Xe buýt', category: 'Phương tiện & Đời sống' },
  { id: 'e-airplane', emoji: '✈️', name: 'Máy bay', category: 'Phương tiện & Đời sống' },
  { id: 'e-ship', emoji: '🚢', name: 'Tàu thủy', category: 'Phương tiện & Đời sống' },
  { id: 'e-run', emoji: '🏃', name: 'Chạy bộ', category: 'Phương tiện & Đời sống' },
  { id: 'e-swim', emoji: '🏊', name: 'Bơi lội', category: 'Phương tiện & Đời sống' },
  { id: 'e-read', emoji: '📚', name: 'Đọc sách', category: 'Phương tiện & Đời sống' },
  { id: 'e-sing', emoji: '🎤', name: 'Ca hát', category: 'Phương tiện & Đời sống' },
  { id: 'e-sun', emoji: '☀️', name: 'Mặt trời', category: 'Phương tiện & Đời sống' },
  { id: 'e-moon', emoji: '🌙', name: 'Mặt trăng', category: 'Phương tiện & Đời sống' },
  { id: 'e-school', emoji: '🏫', name: 'Ngôi trường', category: 'Phương tiện & Đời sống' }
];

export const DEFAULT_DRAG_DROP_GAMES: DragDropGameItem[] = [
  {
    id: 'game-math-shapes',
    title: 'Nối Hình Học & Hình Khối Không Gian',
    description: 'Kéo thả các hình học và vật thể thực tế vào đúng ô tên gọi của hình đó.',
    subject: 'Toán',
    grade: 'Khối 1',
    mode: 'matching',
    timerSeconds: 90,
    rewardFlowers: 3,
    createdAt: '2026-10-06T00:00:00Z',
    isPreset: true,
    pairs: [
      { id: 'p-1', image: '⭕', imageType: 'emoji', caption: 'Vật thể tròn', targetLabel: 'Hình tròn', hint: 'Không có cạnh hay góc nào' },
      { id: 'p-2', image: '⬛', imageType: 'emoji', caption: 'Khung vuông', targetLabel: 'Hình vuông', hint: 'Có 4 cạnh bằng nhau' },
      { id: 'p-3', image: '🔺', imageType: 'emoji', caption: 'Mái nhà', targetLabel: 'Hình tam giác', hint: 'Có 3 cạnh và 3 góc' },
      { id: 'p-4', image: '🎲', imageType: 'emoji', caption: 'Con xúc xắc', targetLabel: 'Khối lập phương', hint: 'Gồm 6 mặt hình vuông bằng nhau' },
      { id: 'p-5', image: '📦', imageType: 'emoji', caption: 'Thùng carton', targetLabel: 'Khối hộp chữ nhật', hint: 'Có 6 mặt hình chữ nhật' },
      { id: 'p-6', image: '🥫', imageType: 'emoji', caption: 'Lon sữa hộp', targetLabel: 'Khối trụ', hint: 'Có 2 mặt đáy hình tròn' }
    ]
  },
  {
    id: 'game-vietnamese-word-types',
    title: 'Phân Loại Từ Chỉ Sự Vật, Hoạt Động & Đặc Điểm',
    description: 'Kéo thả các thẻ hình ảnh và từ ngữ vào đúng thùng phân loại từ loại Tiếng Việt.',
    subject: 'Tiếng Việt',
    grade: 'Khối 2',
    mode: 'sorting',
    timerSeconds: 120,
    rewardFlowers: 4,
    createdAt: '2026-10-06T00:00:00Z',
    isPreset: true,
    targetZones: [
      { id: 'cat-things', label: 'Từ chỉ Sự vật', description: 'Tên người, đồ vật, cây cối, con vật', color: 'sky' },
      { id: 'cat-actions', label: 'Từ chỉ Hoạt động', description: 'Cử động, việc làm của người hoặc vật', color: 'emerald' },
      { id: 'cat-features', label: 'Từ chỉ Đặc điểm', description: 'Màu sắc, hình dáng, tính nết', color: 'purple' }
    ],
    pairs: [
      { id: 'p-suvat-1', image: '🏫', imageType: 'emoji', caption: 'Ngôi trường', targetLabel: 'Từ chỉ Sự vật', targetGroupId: 'cat-things' },
      { id: 'p-suvat-2', image: '🌸', imageType: 'emoji', caption: 'Bông hoa', targetLabel: 'Từ chỉ Sự vật', targetGroupId: 'cat-things' },
      { id: 'p-suvat-3', image: '📖', imageType: 'emoji', caption: 'Quyển sách', targetLabel: 'Từ chỉ Sự vật', targetGroupId: 'cat-things' },
      { id: 'p-action-1', image: '🏃', imageType: 'emoji', caption: 'Chạy bộ', targetLabel: 'Từ chỉ Hoạt động', targetGroupId: 'cat-actions' },
      { id: 'p-action-2', image: '📚', imageType: 'emoji', caption: 'Đọc bài', targetLabel: 'Từ chỉ Hoạt động', targetGroupId: 'cat-actions' },
      { id: 'p-action-3', image: '🎤', imageType: 'emoji', caption: 'Ca hát', targetLabel: 'Từ chỉ Hoạt động', targetGroupId: 'cat-actions' },
      { id: 'p-feature-1', image: '⭐', imageType: 'emoji', caption: 'Xinh đẹp', targetLabel: 'Từ chỉ Đặc điểm', targetGroupId: 'cat-features' },
      { id: 'p-feature-2', image: '🔴', imageType: 'emoji', caption: 'Đỏ rực', targetLabel: 'Từ chỉ Đặc điểm', targetGroupId: 'cat-features' },
      { id: 'p-feature-3', image: '🐘', imageType: 'emoji', caption: 'Khổng lồ', targetLabel: 'Từ chỉ Đặc điểm', targetGroupId: 'cat-features' }
    ]
  },
  {
    id: 'game-english-animals-nature',
    title: 'English Vocabulary: Animals & Nature',
    description: 'Drag and drop each picture to its correct English word and meaning.',
    subject: 'Tiếng Anh',
    grade: 'Khối 3',
    mode: 'matching',
    timerSeconds: 90,
    rewardFlowers: 3,
    createdAt: '2026-10-06T00:00:00Z',
    isPreset: true,
    pairs: [
      { id: 'p-en-1', image: '🐱', imageType: 'emoji', caption: 'Con mèo', targetLabel: 'Cat (Con mèo)', hint: 'Meow meow' },
      { id: 'p-en-2', image: '🐶', imageType: 'emoji', caption: 'Con chó', targetLabel: 'Dog (Con chó)', hint: 'Woof woof' },
      { id: 'p-en-3', image: '🐘', imageType: 'emoji', caption: 'Con voi', targetLabel: 'Elephant (Con voi)', hint: 'Big animal with trunk' },
      { id: 'p-en-4', image: '🍎', imageType: 'emoji', caption: 'Quả táo', targetLabel: 'Apple (Quả táo)', hint: 'Delicious red fruit' },
      { id: 'p-en-5', image: '☀️', imageType: 'emoji', caption: 'Mặt trời', targetLabel: 'Sun (Mặt trời)', hint: 'Shines bright in the sky' },
      { id: 'p-en-6', image: '🌳', imageType: 'emoji', caption: 'Cây cối', targetLabel: 'Tree (Cây cối)', hint: 'Green plant with leaves' }
    ]
  },
  {
    id: 'game-science-animals-reproduction',
    title: 'Phân Loại Động Vật Đẻ Con & Đẻ Trứng',
    description: 'Khoa học - Tự nhiên & Xã hội: Kéo các con vật vào đúng nhóm hình thức sinh sản.',
    subject: 'Tự nhiên & Xã hội',
    grade: 'Khối 3',
    mode: 'sorting',
    timerSeconds: 100,
    rewardFlowers: 4,
    createdAt: '2026-10-06T00:00:00Z',
    isPreset: true,
    targetZones: [
      { id: 'cat-live-birth', label: 'Động vật đẻ con (Thú)', description: 'Nuôi con bằng sữa mẹ', color: 'rose' },
      { id: 'cat-egg-laying', label: 'Động vật đẻ trứng', description: 'Trứng nở thành con', color: 'amber' }
    ],
    pairs: [
      { id: 'p-rep-1', image: '🐶', imageType: 'emoji', caption: 'Con Chó', targetLabel: 'Động vật đẻ con (Thú)', targetGroupId: 'cat-live-birth' },
      { id: 'p-rep-2', image: '🐱', imageType: 'emoji', caption: 'Con Mèo', targetLabel: 'Động vật đẻ con (Thú)', targetGroupId: 'cat-live-birth' },
      { id: 'p-rep-3', image: '🐮', imageType: 'emoji', caption: 'Con Bò', targetLabel: 'Động vật đẻ con (Thú)', targetGroupId: 'cat-live-birth' },
      { id: 'p-rep-4', image: '🐬', imageType: 'emoji', caption: 'Cá Heo', targetLabel: 'Động vật đẻ con (Thú)', targetGroupId: 'cat-live-birth' },
      { id: 'p-rep-5', image: '🐔', imageType: 'emoji', caption: 'Con Gà', targetLabel: 'Động vật đẻ trứng', targetGroupId: 'cat-egg-laying' },
      { id: 'p-rep-6', image: '🦆', imageType: 'emoji', caption: 'Con Vịt', targetLabel: 'Động vật đẻ trứng', targetGroupId: 'cat-egg-laying' },
      { id: 'p-rep-7', image: '🕊️', imageType: 'emoji', caption: 'Chim Bồ Câu', targetLabel: 'Động vật đẻ trứng', targetGroupId: 'cat-egg-laying' },
      { id: 'p-rep-8', image: '🐢', imageType: 'emoji', caption: 'Con Rùa', targetLabel: 'Động vật đẻ trứng', targetGroupId: 'cat-egg-laying' }
    ]
  },
  {
    id: 'game-cs-computer-devices',
    title: 'Phân Loại Thiết Bị Vào (Input) & Thiết Bị Ra (Output)',
    description: 'Tin học: Kéo thả các bộ phận máy tính vào nhóm Thiết bị Vào hoặc Thiết bị Ra.',
    subject: 'Tin học',
    grade: 'Khối 4',
    mode: 'sorting',
    timerSeconds: 100,
    rewardFlowers: 3,
    createdAt: '2026-10-06T00:00:00Z',
    isPreset: true,
    targetZones: [
      { id: 'cat-input', label: 'Thiết Bị Vào (Input)', description: 'Thu nhận và gửi thông tin vào máy tính', color: 'indigo' },
      { id: 'cat-output', label: 'Thiết Bị Ra (Output)', description: 'Xuất hoặc hiển thị thông tin ra ngoài', color: 'emerald' }
    ],
    pairs: [
      { id: 'p-cs-1', image: '⌨️', imageType: 'emoji', caption: 'Bàn phím máy tính', targetLabel: 'Thiết Bị Vào (Input)', targetGroupId: 'cat-input' },
      { id: 'p-cs-2', image: '🖱️', imageType: 'emoji', caption: 'Chuột máy tính', targetLabel: 'Thiết Bị Vào (Input)', targetGroupId: 'cat-input' },
      { id: 'p-cs-3', image: '🎙️', imageType: 'emoji', caption: 'Microphone', targetLabel: 'Thiết Bị Vào (Input)', targetGroupId: 'cat-input' },
      { id: 'p-cs-4', image: '🖥️', imageType: 'emoji', caption: 'Màn hình máy tính', targetLabel: 'Thiết Bị Ra (Output)', targetGroupId: 'cat-output' },
      { id: 'p-cs-5', image: '🖨️', imageType: 'emoji', caption: 'Máy in văn bản', targetLabel: 'Thiết Bị Ra (Output)', targetGroupId: 'cat-output' },
      { id: 'p-cs-6', image: '🎧', imageType: 'emoji', caption: 'Loa / Tai nghe', targetLabel: 'Thiết Bị Ra (Output)', targetGroupId: 'cat-output' }
    ]
  },
  {
    id: 'game-math-calculations',
    title: 'Kéo Phép Tính Đến Kết Quả Đúng',
    description: 'Toán học: Kéo thả các thẻ câu hỏi và phép tính vào ô kết quả tương ứng.',
    subject: 'Toán',
    grade: 'Khối 4',
    mode: 'matching',
    timerSeconds: 90,
    rewardFlowers: 4,
    createdAt: '2026-10-06T00:00:00Z',
    isPreset: true,
    pairs: [
      { id: 'p-calc-1', image: '7 × 8', imageType: 'emoji', caption: 'Bảng nhân 7', targetLabel: '56', hint: '7 nhân 8' },
      { id: 'p-calc-2', image: '9 × 6', imageType: 'emoji', caption: 'Bảng nhân 9', targetLabel: '54', hint: '9 nhân 6' },
      { id: 'p-calc-3', image: '125 + 75', imageType: 'emoji', caption: 'Phép cộng tròn', targetLabel: '200', hint: '125 cộng 75' },
      { id: 'p-calc-4', image: '1 Thế kỷ', imageType: 'emoji', caption: 'Đơn vị thời gian', targetLabel: '100 năm', hint: 'Bằng bao nhiêu năm?' },
      { id: 'p-calc-5', image: '1/2 của 50', imageType: 'emoji', caption: 'Một nửa', targetLabel: '25', hint: '50 chia cho 2' },
      { id: 'p-calc-6', image: 'Cạnh 6cm', imageType: 'emoji', caption: 'Chu vi hình vuông', targetLabel: '24 cm', hint: '6 x 4' }
    ]
  }
];
