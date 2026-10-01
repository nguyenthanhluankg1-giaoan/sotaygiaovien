import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Sparkles,
  Award,
  Users,
  LayoutGrid,
  CalendarDays,
  ShieldAlert,
  Timer,
  Search,
  FileText,
  Gift,
  Swords,
  VolumeX,
  Link as LinkIcon,
  Database,
  Settings,
  HelpCircle,
  CheckCircle2,
  Calendar,
  School,
  ClipboardCheck,
  Download,
  Share2,
  Cpu
} from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideCategory = 'all' | 'classroom' | 'gamification' | 'khdh' | 'settings';

interface GuideSection {
  id: string;
  category: GuideCategory;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
  steps: {
    title: string;
    description: string;
  }[];
  tips?: string[];
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('all');

  if (!isOpen) return null;

  const guideSections: GuideSection[] = [
    {
      id: 'classes-students',
      category: 'classroom',
      title: '1. Quản lý Lớp học & Danh sách Học sinh',
      subtitle: 'Tạo lớp, nhập danh sách học sinh từ Excel, cập nhật ảnh đại diện và thông tin',
      icon: Users,
      badge: 'CƠ BẢN',
      steps: [
        {
          title: 'Bước 1: Tạo và chọn Lớp học',
          description: 'Vào mục "Lớp học" trên thanh menu, chọn "Thêm lớp mới", điền Tên lớp (VD: 3A1, 4A2) và Niên khóa. Chọn lớp active ở thanh công cụ góc trên để làm việc.'
        },
        {
          title: 'Bước 2: Thêm học sinh hoặc Nhập từ danh sách Excel',
          description: 'Vào mục "Học sinh". Thầy/Cô có thể dán danh sách tên học sinh (mỗi em một dòng) hoặc chọn file Excel/CSV để nhập nhanh hàng loạt chỉ trong 3 giây.'
        },
        {
          title: 'Bước 3: Tải ảnh đại diện & Ghi chú',
          description: 'Nhấp vào tên học sinh để chọn ảnh đại diện, đánh dấu sao "Yêu thích / Cần lưu ý" hoặc thêm ghi chú cá nhân để tiện theo dõi nề nếp.'
        }
      ],
      tips: [
        'Có thể phân loại học sinh nam/nữ để hệ thống tự thống kê sĩ số.',
        'Sử dụng tính năng Tìm kiếm nhanh theo tên học sinh ở đầu danh sách.'
      ]
    },
    {
      id: 'attendance',
      category: 'classroom',
      title: '2. Điểm danh Chuyên cần hàng ngày',
      subtitle: 'Ghi nhận hiện diện, đi muộn, nghỉ phép và xem lịch sử chuyên cần',
      icon: ClipboardCheck,
      badge: 'HÀNG NGÀY',
      steps: [
        {
          title: 'Bước 1: Chọn ngày điểm danh',
          description: 'Vào mục "Điểm danh". Mặc định hệ thống tự chọn ngày hôm nay, Thầy/Cô có thể bấm vào ô lịch để xem hoặc sửa điểm danh cho ngày khác.'
        },
        {
          title: 'Bước 2: Tự động đánh dấu hoặc chạm nhanh',
          description: 'Mặc định tất cả học sinh là "Có mặt". Chỉ cần chạm 1 lần vào biểu tượng trạng thái học sinh để chuyển sang "Đi muộn", "Nghỉ có phép" hoặc "Nghỉ không phép".'
        },
        {
          title: 'Bước 3: Lưu trữ & Thống kê',
          description: 'Hệ thống tự động lưu trữ tức thì lên Cloud. Thầy/Cô có thể mở mục "Thống kê" để xem tỷ lệ chuyên cần của lớp theo tháng.'
        }
      ]
    },
    {
      id: 'seating',
      category: 'classroom',
      title: '3. Sơ đồ Chỗ ngồi 2D & 3D sinh động',
      subtitle: 'Xếp vị trí chỗ ngồi theo các dãy bàn, tự động đảo vị trí ngẫu nhiên',
      icon: LayoutGrid,
      steps: [
        {
          title: 'Bước 1: Cấu hình số Dãy & Số Bàn',
          description: 'Vào mục "Sơ đồ lớp". Chọn số dãy bàn (VD: 3 dãy, 4 dãy) và số chỗ ngồi mỗi dãy. Tùy chọn kiểu Bàn đơn hoặc Bàn đôi.'
        },
        {
          title: 'Bước 2: Xếp học sinh vào vị trí',
          description: 'Bấm nút "Tự động xếp ngẫu nhiên" để hệ thống chia vị trí cả lớp, hoặc kéo thả/chọn tên từng học sinh vào đúng ô bàn mong muốn.'
        },
        {
          title: 'Bước 3: Chuyển chế độ 3D & In sơ đồ',
          description: 'Bấm công tắc "Góc nhìn 3D" để trải nghiệm không gian lớp học sinh động. Bấm nút "In / Tải ảnh PNG" để tải ảnh chất lượng cao dán lên bảng lớp.'
        }
      ]
    },
    {
      id: 'timetable',
      category: 'classroom',
      title: '4. Cấu hình Thời khóa biểu giảng dạy',
      subtitle: 'Thiết lập thời khóa biểu tuần học để tự động đồng bộ sang Lịch báo giảng',
      icon: CalendarDays,
      steps: [
        {
          title: 'Bước 1: Chọn cấu hình Buổi dạy',
          description: 'Vào mục "Thời khóa biểu". Chọn giảng dạy Buổi Sáng, Buổi Chiều hoặc cả hai buổi.'
        },
        {
          title: 'Bước 2: Nhập môn học & tiết dạy',
          description: 'Điền tên môn học, lớp dạy vào các tiết từ Thứ Hai đến Thứ Sáu (S1 -> S5, C1 -> C5).'
        },
        {
          title: 'Bước 3: Đồng bộ sang KHDH',
          description: 'Khi thời khóa biểu được lưu, mục "Kế hoạch dạy học (Lịch báo giảng)" sẽ tự động nhận diện danh sách tiết dạy của từng tuần.'
        }
      ]
    },
    {
      id: 'rewards-store',
      category: 'gamification',
      title: '5. Tích Hoa 🌺/Xu khen thưởng & Đổi quà',
      subtitle: 'Tạo động lực thi đua học tập, cộng/trừ hoa khen thưởng và quản lý Cửa hàng quà',
      icon: Gift,
      badge: 'THI ĐUA',
      steps: [
        {
          title: 'Bước 1: Cộng hoa/xu thưởng cho học sinh',
          description: 'Trong danh sách học sinh hoặc Vòng quay, bấm nút (+🌺) hoặc (-🌺) kèm lý do (VD: Phát biểu hay, Giúp đỡ bạn) để cộng thưởng cho em.'
        },
        {
          title: 'Bước 2: Quản lý Cửa hàng Quà tặng',
          description: 'Vào mục "Đổi quà". Thêm danh sách quà tặng (Tên quà, Biểu tượng Emoji/Hình ảnh, Giá đổi tính theo số bông hoa).'
        },
        {
          title: 'Bước 3: Duyệt đổi quà cho học sinh',
          description: 'Chọn tên học sinh và món quà em muốn đổi. Hệ thống sẽ tự động trừ số hoa tương ứng và lưu lịch sử đổi quà chi tiết.'
        }
      ]
    },
    {
      id: 'lucky-wheel',
      category: 'gamification',
      title: '6. Vòng quay Ngẫu nhiên & Ngân hàng Trắc nghiệm 3D',
      subtitle: 'Gọi tên ngẫu nhiên với 7 hiệu ứng kỹ xảo Lồng cầu 3D sinh động',
      icon: Sparkles,
      badge: 'HOT',
      steps: [
        {
          title: 'Bước 1: Chọn Hiệu ứng Lồng cầu 3D',
          description: 'Vào mục "Vòng quay". Lựa chọn 1 trong 7 hiệu ứng: Xoáy tròn, Tung nảy, Hút vào tâm, Bay theo quỹ đạo, Mưa bóng, Sân khấu ánh sáng, Sóng bồng bềnh.'
        },
        {
          title: 'Bước 2: Tự động loại trừ & Tích hợp Trắc nghiệm',
          description: 'Bật tùy chọn "Tự động loại trừ em đã gọi" để không trùng lặp. Bật "Ngân hàng câu hỏi" để khi quay trúng em nào, hệ thống sẽ hiện câu hỏi đố vui kèm đồng hồ đếm ngược.'
        },
        {
          title: 'Bước 3: Quay số & Thưởng hoa trực tiếp',
          description: 'Bấm nút "QUAY SỐ". Khi dừng lại, hộp thoại chúc mừng xuất hiện cho phép thưởng hoa/xu cho học sinh ngay tại chỗ.'
        }
      ]
    },
    {
      id: 'film-roll',
      category: 'gamification',
      title: '7. Trò chơi Kéo co thi đấu trả lời câu hỏi',
      subtitle: 'Trò chơi kéo co kịch tính giữa Đội Đỏ và Đội Xanh kèm câu hỏi trắc nghiệm',
      icon: Swords,
      steps: [
        {
          title: 'Bước 1: Chọn Đội & Học sinh đại diện',
          description: 'Vào mục "Kéo co" trên thanh công cụ, bấm nút chọn ngẫu nhiên đại diện cho Đội Đỏ 🔴 và Đội Xanh 🔵.'
        },
        {
          title: 'Bước 2: Trả lời câu hỏi & Kéo dây',
          description: 'Học sinh chọn đáp án trắc nghiệm đúng để kéo dây về phía đội mình (+25px) hoặc giáo viên kéo dây trực tiếp (+1/+2).'
        },
        {
          title: 'Bước 3: Thắng cuộc & Thưởng hoa',
          description: 'Đội nào kéo được cờ về vạch đích sẽ giành chiến thắng chung cuộc và được thưởng hoa/xu cho toàn đội!'
        }
      ]
    },
    {
      id: 'noise-alert',
      category: 'gamification',
      title: '8. Chống ồn & Cảnh báo im lặng trong giờ học',
      subtitle: 'Đo độ ồn qua Microphone máy tính, tự động phát cảnh báo khi lớp quá ồn',
      icon: VolumeX,
      steps: [
        {
          title: 'Bước 1: Cho phép sử dụng Micro',
          description: 'Vào mục "Chống ồn". Bấm nút "Bật đo độ ồn" và chấp nhận quyền Micro trên trình duyệt máy tính.'
        },
        {
          title: 'Bước 2: Đặt ngưỡng Cảnh báo (dB)',
          description: 'Kéo thanh điều chỉnh mức ồn cho phép (VD: 60 dB, 70 dB). Bật tùy chọn "Phát âm thanh cảnh báo".'
        },
        {
          title: 'Bước 3: Chế độ Im lặng / Đếm ngược',
          description: 'Khi tiếng ồn vượt quá ngưỡng, màn hình sẽ nhấp nháy cảnh báo răn đe kèm âm thanh nhắc nhở các em giữ trật tự.'
        }
      ]
    },
    {
      id: 'timer-countdown',
      category: 'gamification',
      title: '9. Đồng hồ Đếm ngược bài tập',
      subtitle: 'Hỗ trợ đếm ngược thời gian thảo luận nhóm, làm bài tập cá nhân',
      icon: Timer,
      steps: [
        {
          title: 'Bước 1: Chọn thời lượng đếm ngược',
          description: 'Vào mục "Đếm ngược". Bấm nhanh các mốc 1 phút, 2 phút, 5 phút, 10 phút hoặc nhập số phút/giây tùy ý.'
        },
        {
          title: 'Bước 2: Bắt đầu chạy thời gian',
          description: 'Bấm "BẮT ĐẦU". Vòng tròn thời gian sẽ giảm dần. Trong 10 giây cuối cùng, hệ thống phát tiếng tích tắc lôi cuốn.'
        },
        {
          title: 'Bước 3: Chuông reo hết giờ',
          description: 'Khi hết thời gian, chuông thông báo sẽ reo vang để báo hiệu cả lớp dừng tay.'
        }
      ]
    },
    {
      id: 'khdh-preview',
      category: 'khdh',
      title: '10. Kế hoạch dạy học (Lịch Báo Giảng) & Xuất Word',
      subtitle: 'Tự động sinh báo giảng theo tuần, tùy chỉnh ngày nghỉ Tết/lễ và xuất file Word chuẩn A4',
      icon: FileText,
      badge: 'QUAN TRỌNG',
      steps: [
        {
          title: 'Bước 1: Xem Lịch báo giảng theo tuần',
          description: 'Vào mục "Kế hoạch dạy học (KHDH)". Chọn Tuần học (Tuần 1 -> Tuần 35). Hệ thống tự động ghép Thời khóa biểu và PPCT để sinh danh sách tiết dạy.'
        },
        {
          title: 'Bước 2: TÙY CHỈNH MỐC NGÀY NGHĨ TẾT / NGHĨ LỄ (Mới)',
          description: 'Khi đến tuần học lại sau nghỉ Tết (VD: Tuần 22), bấm nút "Nghỉ Tết / Sửa ngày tuần", chọn ngày Thứ Hai học lại (VD: 10/02/2025). Tất cả các tuần tiếp theo (Tuần 23, 24...) sẽ tự động tính nối tiếp liên tục (+7 ngày/tuần).'
        },
        {
          title: 'Bước 3: Chỉnh sửa trực tiếp & Xuất file Word (.docx)',
          description: 'Thầy/Cô có thể bấm vào từng tiết dạy để sửa Tên bài, Tùy chỉnh dòng. Bấm nút "Xuất file Word" để tải file .docx hoàn chỉnh trình Ban Giám Hiệu.'
        }
      ],
      tips: [
        'File Word xuất ra có định dạng trang A4 portrait chuẩn đẹp, có sẵn khung ký tên BGH, Tổ trưởng và Giáo viên.',
        'Có thể thêm dòng/xóa dòng tiết học bổ sung dễ dàng.'
      ]
    },
    {
      id: 'ppct-manager',
      category: 'khdh',
      title: '11. Quản lý Phân phối Chương trình (PPCT)',
      subtitle: 'Khai báo danh mục bài dạy theo môn học và khối lớp',
      icon: BookOpen,
      steps: [
        {
          title: 'Bước 1: Chọn Khối lớp & Môn học',
          description: 'Vào tab "Phân phối CT". Chọn Khối (Khối 3, Khối 4, Khối 5) và Môn học (Tin học, Công nghệ...)'
        },
        {
          title: 'Bước 2: Nhập/Sửa danh sách bài dạy',
          description: 'Thêm từng tiết dạy theo thứ tự Tuần, Tiết PPCT, Tên bài học và Nội dung tích hợp (NLS, STEM, Công dân số).'
        }
      ]
    },
    {
      id: 'ai-lesson-plan',
      category: 'khdh',
      title: '12. SOẠN GIÁO ÁN CHI TIẾT BẰNG AI (CV 2345 / 1001)',
      subtitle: 'Trợ lý AI tự động tạo bài dạy chi tiết 4 hoạt động kèm Hoạt động GV - HS',
      icon: Cpu,
      badge: 'CÔNG NGHỆ AI',
      steps: [
        {
          title: 'Bước 1: Khai báo thông tin Bài dạy',
          description: 'Vào tab "SOẠN GIÁO ÁN". Nhập Tên bài dạy, Chọn Khối lớp, Môn học, Bộ sách và Số tiết dạy.'
        },
        {
          title: 'Bước 2: Tùy chọn Tích hợp chuyên đề (NLS, STEM, CĐS)',
          description: 'Mặc định các ô tích hợp bỏ chọn. Nếu bài dạy có tích hợp Năng lực số (CV 3456), STEM (CV 909) hay Công dân số (CV 3899), Thầy/Cô tích chọn vào ô tương ứng.'
        },
        {
          title: 'Bước 3: Bấm BẮT ĐẦU SOẠN GIÁO ÁN AI',
          description: 'Trợ lý AI sẽ sinh Kế hoạch bài dạy chi tiết gồm 4 Hoạt động (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng) phân chia cột Hoạt động Giáo viên - Hoạt động Học sinh chuẩn mực.'
        },
        {
          title: 'Bước 4: Tải file Word (.docx) giáo án',
          description: 'Bấm nút "Tải file Word (.docx)" để tải giáo án về máy tính hoặc bấm "Sao chép" để dán vào giáo án cá nhân.'
        }
      ]
    },
    {
      id: 'doc-settings-cloud',
      category: 'settings',
      title: '13. Cấu hình Văn bản & Lưu trữ Đám mây',
      subtitle: 'Thiết lập tiêu đề văn bản, tên người ký và kiểm tra trạng thái lưu trữ',
      icon: Settings,
      steps: [
        {
          title: 'Bước 1: Cấu hình Đơn vị & Người ký',
          description: 'Vào tab "Cấu hình văn bản". Nhập Tên Trường, Tổ chuyên môn, Tên Giáo viên, Chức danh Ban Giám Hiệu & Tổ trưởng để hiển thị chuẩn trên tất cả phụ lục văn bản.'
        },
        {
          title: 'Bước 2: Kiểm tra Đồng bộ Google Cloud Firestore',
          description: 'Mọi dữ liệu lớp học, chuyên cần, điểm thưởng và kế hoạch dạy học được tự động đồng bộ lên hạ tầng đám mây Google Cloud Firestore dưới tài khoản cá nhân của Thầy/Cô.'
        },
        {
          title: 'Bước 3: Sao lưu & Khôi phục dữ liệu',
          description: 'Trong mục "Dữ liệu", Thầy/Cô có thể bấm "Xuất file sao lưu (JSON)" để lưu một bản dự phòng về máy tính bất cứ lúc nào.'
        }
      ]
    }
  ];

  const filteredSections = guideSections.filter((section) => {
    const matchesCategory = activeCategory === 'all' || section.category === activeCategory;
    const matchesSearch =
      searchTerm.trim() === '' ||
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.steps.some(
        (s) =>
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border-2 border-teal-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 text-white shadow-inner">
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight">
                HƯỚNG DẪN SỬ DỤNG HỒ SƠ GIÁO VIÊN
              </h3>
              <p className="text-xs text-teal-100 mt-0.5 font-medium">
                Cẩm nang chi tiết từng mục & quy trình thực hiện cho Giáo viên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar: Search + Category Pills */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Gõ từ khóa tìm kiếm (Ví dụ: Soạn giáo án, Nghỉ Tết, Sơ đồ lớp, Điểm danh, Đổi quà...)"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {[
              { id: 'all' as GuideCategory, label: '⭐ Tất cả (13 mục)', count: guideSections.length },
              { id: 'classroom' as GuideCategory, label: '🏫 Lớp & Học sinh', count: 4 },
              { id: 'gamification' as GuideCategory, label: '🎁 Thi đua & Trò chơi', count: 5 },
              { id: 'khdh' as GuideCategory, label: '📄 KHDH & Soạn Giáo án AI', count: 3 },
              { id: 'settings' as GuideCategory, label: '⚙️ Cấu hình & Lưu trữ', count: 1 }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 font-black scale-[1.02]'
                    : 'bg-white text-slate-600 hover:bg-teal-50 hover:text-teal-800 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm text-slate-700 flex-1">
          {filteredSections.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-extrabold text-slate-600">
                Không tìm thấy hướng dẫn khớp với từ khóa "{searchTerm}"
              </p>
              <p className="text-xs text-slate-400">
                Thử gõ các từ khóa khác như "điểm danh", "vòng quay", "soạn giáo án", "nghỉ tết"...
              </p>
            </div>
          ) : (
            filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200/80 shadow-2xs hover:border-teal-300 transition-all space-y-3"
                >
                  {/* Section Title Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-black text-slate-800">
                            {section.title}
                          </h4>
                          {section.badge && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              {section.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {section.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Steps List */}
                  <div className="space-y-2.5 pl-1 sm:pl-2">
                    {section.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <strong className="text-xs sm:text-sm font-bold text-slate-800 block">
                            {step.title}
                          </strong>
                          <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tips box if available */}
                  {section.tips && section.tips.length > 0 && (
                    <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-200/80 text-xs text-teal-900 space-y-1">
                      <span className="font-extrabold block text-teal-800">💡 Mẹo hay cho Giáo viên:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-teal-800 font-medium">
                        {section.tips.map((tip, tIdx) => (
                          <li key={tIdx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Bottom Help note */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0" />
            <div className="text-xs text-teal-900 leading-relaxed">
              <strong className="font-extrabold block text-slate-800">Cần thêm hỗ trợ trong quá trình giảng dạy?</strong>
              Dữ liệu được bảo mật trực tiếp trên trình duyệt & tài khoản đám mây của Thầy/Cô. Mọi thắc mắc vui lòng liên hệ Ban quản trị hệ thống.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">
            HỒ SƠ GIÁO VIÊN · Trợ lý Quản lý Lớp học & KHDH
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm shadow-md shadow-teal-600/25 transition-all cursor-pointer ml-auto"
          >
            Đã hiểu & Bắt đầu làm việc
          </button>
        </div>
      </div>
    </div>
  );
};
