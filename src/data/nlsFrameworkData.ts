/**
 * TÀI LIỆU TẬP HUẤN GIÁO VIÊN: HƯỚNG DẪN PHÁT TRIỂN NĂNG LỰC SỐ CHO HỌC SINH TIỂU HỌC
 * Bộ Giáo dục và Đào tạo - Hà Nội 2025
 * Căn cứ pháp lý:
 * - Thông tư số 02/2025/TT-BGDĐT ngày 24/01/2025
 * - Công văn số 3456/BGDĐT-GDPT (Phụ lục 1 & Phụ lục 2)
 * - Công văn số 2345/BGDĐT-GDTH
 *
 * CẤU TRÚC MÃ CHỈ BÁO NĂNG LỰC SỐ:
 * Ví dụ: 1.3.CB1a
 * - 1.3: Miền 1 (Khai thác dữ liệu và thông tin), năng lực thành phần 1.3 (Quản lý dữ liệu, thông tin và nội dung số)
 * - CB1: Mức độ năng lực Cơ bản 1 (Dành cho học sinh khối lớp 1, 2, 3)
 * - CB2: Mức độ năng lực Cơ bản 2 (Dành cho học sinh khối lớp 4, 5)
 * - a: Chỉ báo cụ thể "Xác định được cách tổ chức, lưu trữ và truy xuất dữ liệu, thông tin và nội dung một cách đơn giản trong môi trường số"
 */

export interface NlsIndicator {
  code: string; // vd: "1.3.CB1a"
  domainId: number; // 1 -> 6
  domainName: string; // Khai thác dữ liệu và thông tin
  componentId: string; // "1.3"
  componentName: string; // Quản lý dữ liệu, thông tin và nội dung số
  level: 'CB1' | 'CB2';
  gradeRange: 'Lớp 1-2-3' | 'Lớp 4-5';
  indicatorLetter: string; // "a", "b", "c", "d"
  description: string; // Diễn giải chuẩn chỉ báo
  pedagogicalSuggestion?: string; // Gợi ý tình huống sư phạm (Phụ lục 2)
}

export interface NlsDomain {
  id: number;
  name: string;
  description: string;
  components: {
    id: string; // "1.1", "1.2", ...
    name: string;
    description: string;
  }[];
}

export const NLS_DOMAINS: NlsDomain[] = [
  {
    id: 1,
    name: 'Khai thác dữ liệu và thông tin',
    description: 'Xác định nhu cầu thông tin, tìm kiếm, đánh giá và quản lý dữ liệu số.',
    components: [
      {
        id: '1.1',
        name: 'Duyệt, tìm kiếm và lọc dữ liệu, thông tin và nội dung số',
        description: 'Diễn đạt nhu cầu thông tin, tìm kiếm và điều hướng trong môi trường số.'
      },
      {
        id: '1.2',
        name: 'Đánh giá dữ liệu, thông tin và nội dung số',
        description: 'Phân tích, so sánh và đánh giá độ tin cậy của các nguồn dữ liệu số.'
      },
      {
        id: '1.3',
        name: 'Quản lý dữ liệu, thông tin và nội dung số',
        description: 'Tổ chức, lưu trữ và truy xuất dữ liệu trong môi trường số có cấu trúc.'
      }
    ]
  },
  {
    id: 2,
    name: 'Giao tiếp và hợp tác trong môi trường số',
    description: 'Tương tác, chia sẻ, hợp tác và thực hiện chuẩn mực ứng xử công dân số.',
    components: [
      { id: '2.1', name: 'Tương tác thông qua công nghệ số', description: 'Lựa chọn công nghệ số phù hợp để giao tiếp.' },
      { id: '2.2', name: 'Chia sẻ thông tin và nội dung thông qua công nghệ số', description: 'Chia sẻ dữ liệu, trích dẫn và ghi nguồn cơ bản.' },
      { id: '2.3', name: 'Sử dụng công nghệ số để thực hiện trách nhiệm công dân', description: 'Tham gia các hoạt động cộng đồng trực tuyến phù hợp lứa tuổi.' },
      { id: '2.4', name: 'Hợp tác thông qua công nghệ số', description: 'Sử dụng công cụ số để đồng sáng tạo và làm việc nhóm.' },
      { id: '2.5', name: 'Quy tắc ứng xử trên mạng (Netiquette)', description: 'Tuân thủ chuẩn mực văn hóa, lời nói lịch sự trên không gian mạng.' },
      { id: '2.6', name: 'Quản lý danh tính số', description: 'Nhận thức về tài khoản, ảnh đại diện và bảo vệ danh tính cá nhân.' }
    ]
  },
  {
    id: 3,
    name: 'Sáng tạo nội dung số',
    description: 'Tạo lập, biên tập, tái cấu trúc nội dung số, tuân thủ bản quyền và tư duy thuật toán/lập trình.',
    components: [
      { id: '3.1', name: 'Phát triển nội dung số', description: 'Tạo và chỉnh sửa tài liệu, bài trình chiếu, hình ảnh, âm thanh số.' },
      { id: '3.2', name: 'Tích hợp và tái tạo nội dung số', description: 'Tổng hợp, biên tập và kết hợp nhiều nguồn dữ liệu số.' },
      { id: '3.3', name: 'Thực thi bản quyền và giấy phép', description: 'Tôn trọng bản quyền tác giả, ghi nguồn tư liệu khi sử dụng.' },
      { id: '3.4', name: 'Lập trình và tư duy máy tính', description: 'Liệt kê các bước tuần tự, chia nhỏ công việc và viết lệnh điều khiển robot/chương trình.' }
    ]
  },
  {
    id: 4,
    name: 'An toàn số',
    description: 'Bảo vệ thiết bị, bảo mật thông tin cá nhân, bảo vệ sức khỏe và môi trường.',
    components: [
      { id: '4.1', name: 'Bảo vệ thiết bị', description: 'Bảo quản thiết bị, nhận diện nguy cơ và tuân thủ nguyên tắc an toàn.' },
      { id: '4.2', name: 'Bảo vệ dữ liệu cá nhân và quyền riêng tư', description: 'Giữ bí mật thông tin cá nhân, mật khẩu tài khoản.' },
      { id: '4.3', name: 'Bảo vệ sức khỏe và an sinh số', description: 'Ngồi đúng tư thế, phòng tránh mỏi mắt và tránh xa bạo lực mạng.' },
      { id: '4.4', name: 'Bảo vệ môi trường', description: 'Tiết kiệm năng lượng thiết bị và xử lý rác thải điện tử đúng cách.' }
    ]
  },
  {
    id: 5,
    name: 'Giải quyết vấn đề',
    description: 'Xử lý sự cố kỹ thuật, lựa chọn công cụ công nghệ và ứng dụng sáng tạo.',
    components: [
      { id: '5.1', name: 'Giải quyết các vấn đề kỹ thuật', description: 'Khắc phục các thao tác cơ bản khi vận hành thiết bị số.' },
      { id: '5.2', name: 'Xác định nhu cầu và giải pháp công nghệ', description: 'Lựa chọn công cụ số phù hợp với mục đích học tập.' },
      { id: '5.3', name: 'Sử dụng sáng tạo công nghệ số', description: 'Vận dụng công nghệ để đổi mới sản phẩm học tập.' },
      { id: '5.4', name: 'Xác định khoảng cách năng lực số', description: 'Tự đánh giá và học hỏi thêm kỹ năng số mới.' }
    ]
  },
  {
    id: 6,
    name: 'Ứng dụng trí tuệ nhân tạo (AI)',
    description: 'Hiểu biết ban đầu về AI, sử dụng AI có đạo đức và đánh giá công cụ AI.',
    components: [
      { id: '6.1', name: 'Hiểu biết về trí tuệ nhân tạo', description: 'Nhận biết AI trong đời sống và nhận thức không phải mọi thông tin từ máy móc đều đúng.' },
      { id: '6.2', name: 'Sử dụng trí tuệ nhân tạo có đạo đức', description: 'Tương tác với trợ lý số an toàn, có trách nhiệm.' },
      { id: '6.3', name: 'Đánh giá các công cụ AI', description: 'Nhận diện trò chơi thông minh và đánh giá độ chính xác của AI.' }
    ]
  }
];

export const NLS_INDICATOR_DATABASE: Record<string, NlsIndicator> = {
  // Miền 1: Khai thác dữ liệu
  '1.1.CB1a': {
    code: '1.1.CB1a',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.1',
    componentName: 'Duyệt, tìm kiếm và lọc dữ liệu, thông tin và nội dung số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Xác định được nhu cầu thông tin, tìm kiếm dữ liệu, thông tin và nội dung thông qua tìm kiếm đơn giản trong môi trường số.',
    pedagogicalSuggestion: 'Tổ chức trò chơi "Truy tìm kho báu": Giao học sinh chọn từ khóa để tìm hình ảnh tương tự bằng giọng nói hoặc nhập liệu.'
  },
  '1.1.CB1b': {
    code: '1.1.CB1b',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.1',
    componentName: 'Duyệt, tìm kiếm và lọc dữ liệu, thông tin và nội dung số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'b',
    description: 'Tìm được cách truy cập những dữ liệu, thông tin và nội dung này cũng như điều hướng giữa chúng.',
    pedagogicalSuggestion: 'Tìm kiếm và truy cập các ứng dụng quen thuộc trên máy tính, máy tính bảng.'
  },
  '1.1.CB2a': {
    code: '1.1.CB2a',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.1',
    componentName: 'Duyệt, tìm kiếm và lọc dữ liệu, thông tin và nội dung số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Xác định được nhu cầu thông tin cụ thể phục vụ bài học.',
    pedagogicalSuggestion: 'Cung cấp bộ từ khóa và yêu cầu học sinh tự nhập tìm kiếm hình ảnh, tư liệu phù hợp.'
  },
  '1.1.CB2b': {
    code: '1.1.CB2b',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.1',
    componentName: 'Duyệt, tìm kiếm và lọc dữ liệu, thông tin và nội dung số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'b',
    description: 'Tìm được dữ liệu, thông tin và nội dung thông qua tìm kiếm đơn giản trong môi trường số.',
    pedagogicalSuggestion: 'Truy cập các trang báo trực tuyến thiếu nhi (Báo Thiếu niên Tiền phong và Nhi đồng) theo dõi chủ đề.'
  },
  '1.1.CB2c': {
    code: '1.1.CB2c',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.1',
    componentName: 'Duyệt, tìm kiếm và lọc dữ liệu, thông tin và nội dung số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'c',
    description: 'Tìm được cách truy cập những dữ liệu, thông tin và nội dung này cũng như điều hướng giữa chúng.'
  },

  '1.2.CB1a': {
    code: '1.2.CB1a',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.2',
    componentName: 'Đánh giá dữ liệu, thông tin và nội dung số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Phát hiện được độ tin cậy và độ chính xác của các nguồn chung của dữ liệu, thông tin và nội dung số.',
    pedagogicalSuggestion: 'So sánh trang web truyện tranh với trang web của bảo tàng/vườn thú để nhận diện thông tin chính thống.'
  },
  '1.2.CB2a': {
    code: '1.2.CB2a',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.2',
    componentName: 'Đánh giá dữ liệu, thông tin và nội dung số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Phát hiện được độ tin cậy và độ chính xác của các nguồn chung của dữ liệu, thông tin và nội dung số.',
    pedagogicalSuggestion: 'Phân biệt ảnh minh họa tưởng tượng và ảnh chụp di tích thật; thực hành kiểm chứng thông tin.'
  },

  '1.3.CB1a': {
    code: '1.3.CB1a',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.3',
    componentName: 'Quản lý dữ liệu, thông tin và nội dung số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Xác định được cách tổ chức, lưu trữ và truy xuất dữ liệu, thông tin và nội dung một cách đơn giản trong môi trường số.',
    pedagogicalSuggestion: 'Lưu bài vẽ/bài làm bằng cách nhấp vào biểu tượng lưu và mở lại tệp đã lưu.'
  },
  '1.3.CB1b': {
    code: '1.3.CB1b',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.3',
    componentName: 'Quản lý dữ liệu, thông tin và nội dung số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'b',
    description: 'Nhận biết được nơi để sắp xếp dữ liệu, thông tin và nội dung một cách đơn giản trong môi trường có cấu trúc.'
  },
  '1.3.CB2a': {
    code: '1.3.CB2a',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.3',
    componentName: 'Quản lý dữ liệu, thông tin và nội dung số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Xác định được cách tổ chức, lưu trữ và truy xuất dữ liệu, thông tin và nội dung một cách đơn giản trong môi trường số.',
    pedagogicalSuggestion: 'Lưu và đặt tên tệp bài làm có nghĩa, tìm và quản lý cây thư mục.'
  },
  '1.3.CB2b': {
    code: '1.3.CB2b',
    domainId: 1,
    domainName: 'Khai thác dữ liệu và thông tin',
    componentId: '1.3',
    componentName: 'Quản lý dữ liệu, thông tin và nội dung số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'b',
    description: 'Nhận biết được nơi để sắp xếp dữ liệu, thông tin và nội dung một cách đơn giản trong môi trường có cấu trúc.'
  },

  // Miền 2: Giao tiếp & Hợp tác
  '2.1.CB1a': {
    code: '2.1.CB1a',
    domainId: 2,
    domainName: 'Giao tiếp và hợp tác trong môi trường số',
    componentId: '2.1',
    componentName: 'Tương tác thông qua công nghệ số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Lựa chọn được các công nghệ số đơn giản để tương tác.'
  },
  '2.1.CB2a': {
    code: '2.1.CB2a',
    domainId: 2,
    domainName: 'Giao tiếp và hợp tác trong môi trường số',
    componentId: '2.1',
    componentName: 'Tương tác thông qua công nghệ số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Lựa chọn được các công nghệ số đơn giản để tương tác.'
  },
  '2.1.CB2b': {
    code: '2.1.CB2b',
    domainId: 2,
    domainName: 'Giao tiếp và hợp tác trong môi trường số',
    componentId: '2.1',
    componentName: 'Tương tác thông qua công nghệ số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'b',
    description: 'Xác định được các phương tiện giao tiếp đơn giản thích hợp cho một bối cảnh cụ thể.'
  },
  '2.2.CB1a': {
    code: '2.2.CB1a',
    domainId: 2,
    domainName: 'Giao tiếp và hợp tác trong môi trường số',
    componentId: '2.2',
    componentName: 'Chia sẻ thông tin và nội dung thông qua công nghệ số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Nhận biết được các công nghệ số đơn giản, phù hợp để chia sẻ dữ liệu, thông tin và nội dung kỹ thuật số.'
  },
  '2.4.CB1a': {
    code: '2.4.CB1a',
    domainId: 2,
    domainName: 'Giao tiếp và hợp tác trong môi trường số',
    componentId: '2.4',
    componentName: 'Hợp tác thông qua công nghệ số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Chọn được những công cụ và công nghệ số đơn giản cho các quá trình cộng tác.'
  },
  '2.5.CB1a': {
    code: '2.5.CB1a',
    domainId: 2,
    domainName: 'Giao tiếp và hợp tác trong môi trường số',
    componentId: '2.5',
    componentName: 'Quy tắc ứng xử trên mạng (Netiquette)',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Phân biệt được các chuẩn mực hành vi đơn giản và biết cách sử dụng công nghệ số và tương tác trong môi trường số.'
  },
  '2.5.CB2a': {
    code: '2.5.CB2a',
    domainId: 2,
    domainName: 'Giao tiếp và hợp tác trong môi trường số',
    componentId: '2.5',
    componentName: 'Quy tắc ứng xử trên mạng (Netiquette)',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Phân biệt được các chuẩn mực hành vi đơn giản và bí quyết sử dụng công nghệ số và tương tác trong môi trường số.'
  },

  // Miền 3: Sáng tạo nội dung số
  '3.1.CB1a': {
    code: '3.1.CB1a',
    domainId: 3,
    domainName: 'Sáng tạo nội dung số',
    componentId: '3.1',
    componentName: 'Phát triển nội dung số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Xác định được các cách tạo và chỉnh sửa nội dung đơn giản ở các định dạng đơn giản (trang chiếu, văn bản, ảnh).',
    pedagogicalSuggestion: 'Tạo sách tranh ảnh số đơn giản trên Canva/PowerPoint, chụp ảnh quá trình làm thủ công.'
  },
  '3.1.CB1b': {
    code: '3.1.CB1b',
    domainId: 3,
    domainName: 'Sáng tạo nội dung số',
    componentId: '3.1',
    componentName: 'Phát triển nội dung số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'b',
    description: 'Chọn được cách thể hiện bản thân thông qua việc tạo ra các nội dung số đơn giản.'
  },
  '3.1.CB2a': {
    code: '3.1.CB2a',
    domainId: 3,
    domainName: 'Sáng tạo nội dung số',
    componentId: '3.1',
    componentName: 'Phát triển nội dung số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Xác định được các cách tạo và chỉnh sửa nội dung đơn giản ở các định dạng văn bản, trình chiếu, đồ họa.',
    pedagogicalSuggestion: 'Soạn thảo văn bản, chèn hình ảnh, tạo slide thuyết trình, ghi âm bản tin radio ngắn.'
  },
  '3.1.CB2b': {
    code: '3.1.CB2b',
    domainId: 3,
    domainName: 'Sáng tạo nội dung số',
    componentId: '3.1',
    componentName: 'Phát triển nội dung số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'b',
    description: 'Chọn được cách thể hiện bản thân thông qua việc tạo ra các nội dung số đơn giản.'
  },

  '3.3.CB1a': {
    code: '3.3.CB1a',
    domainId: 3,
    domainName: 'Sáng tạo nội dung số',
    componentId: '3.3',
    componentName: 'Thực thi bản quyền và giấy phép',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Xác định được các quy tắc đơn giản về bản quyền và giấy phép áp dụng cho dữ liệu, thông tin và nội dung số.',
    pedagogicalSuggestion: 'Ký tên lên sản phẩm số cá nhân để khẳng định quyền tác giả, không nhận bài của bạn làm của mình.'
  },
  '3.3.CB2a': {
    code: '3.3.CB2a',
    domainId: 3,
    domainName: 'Sáng tạo nội dung số',
    componentId: '3.3',
    componentName: 'Thực thi bản quyền và giấy phép',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Xác định được các quy tắc đơn giản về bản quyền và giấy phép áp dụng cho dữ liệu, thông tin và nội dung số.',
    pedagogicalSuggestion: 'Khi sử dụng tranh ảnh, tài liệu của người khác cần xin phép và ghi rõ nguồn gốc tác giả.'
  },

  '3.4.CB1a': {
    code: '3.4.CB1a',
    domainId: 3,
    domainName: 'Sáng tạo nội dung số',
    componentId: '3.4',
    componentName: 'Lập trình',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Liệt kê được các hướng dẫn đơn giản để hệ thống máy tính giải quyết một vấn đề đơn giản hoặc thực hiện một nhiệm vụ đơn giản.',
    pedagogicalSuggestion: 'Trò chơi Robot di chuyển trên lưới ô vuông, phân chia công việc thành các bước nhỏ theo thứ tự logic.'
  },
  '3.4.CB2a': {
    code: '3.4.CB2a',
    domainId: 3,
    domainName: 'Sáng tạo nội dung số',
    componentId: '3.4',
    componentName: 'Lập trình',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Liệt kê được các hướng dẫn đơn giản để hệ thống máy tính giải quyết một vấn đề đơn giản hoặc thực hiện một nhiệm vụ đơn giản.',
    pedagogicalSuggestion: 'Lập trình kéo thả (Scratch/Blockly) điều khiển nhân vật, sử dụng cấu trúc tuần tự, lặp và rẽ nhánh.'
  },

  // Miền 4: An toàn số
  '4.1.CB1a': {
    code: '4.1.CB1a',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.1',
    componentName: 'Bảo vệ thiết bị',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Nhận biết được cách bảo vệ thiết bị và nội dung số một cách đơn giản.',
    pedagogicalSuggestion: 'Ẩn dụ "ngôi nhà" và "khóa cửa": Giữ gìn thiết bị, tắt máy đúng quy trình, giữ mật khẩu an toàn.'
  },
  '4.1.CB2a': {
    code: '4.1.CB2a',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.1',
    componentName: 'Bảo vệ thiết bị',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Nhận biết được cách bảo vệ thiết bị và nội dung số một cách đơn giản.',
    pedagogicalSuggestion: 'Tạo mật khẩu mạnh (dài, chữ hoa, thường, số), bảo quản phần cứng và phần mềm.'
  },
  '4.1.CB2b': {
    code: '4.1.CB2b',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.1',
    componentName: 'Bảo vệ thiết bị',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'b',
    description: 'Phân biệt được rủi ro và mối đe dọa đơn giản trong môi trường số.'
  },

  '4.2.CB1a': {
    code: '4.2.CB1a',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.2',
    componentName: 'Bảo vệ dữ liệu cá nhân và quyền riêng tư',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Lựa chọn được những cách thức đơn giản để bảo vệ dữ liệu cá nhân và quyền riêng tư trong môi trường số.',
    pedagogicalSuggestion: 'Thảo luận về thông tin cá nhân (họ tên, địa chỉ, số điện thoại) và nguyên tắc không cung cấp cho người lạ.'
  },
  '4.2.CB1b': {
    code: '4.2.CB1b',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.2',
    componentName: 'Bảo vệ dữ liệu cá nhân và quyền riêng tư',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'b',
    description: 'Nhận biết được các cách sử dụng và chia sẻ thông tin định danh cá nhân một cách an toàn, có khả năng bảo vệ bản thân và người khác.'
  },
  '4.2.CB2a': {
    code: '4.2.CB2a',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.2',
    componentName: 'Bảo vệ dữ liệu cá nhân và quyền riêng tư',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Lựa chọn được những cách thức đơn giản để bảo vệ dữ liệu cá nhân và quyền riêng tư trong môi trường số.',
    pedagogicalSuggestion: 'Trò chơi đóng vai nhận diện nick giả mạo, phòng tránh lộ lọt thông tin riêng tư trên Zalo, Facebook.'
  },
  '4.2.CB2b': {
    code: '4.2.CB2b',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.2',
    componentName: 'Bảo vệ dữ liệu cá nhân và quyền riêng tư',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'b',
    description: 'Nhận biết được các cách sử dụng và chia sẻ thông tin định danh cá nhân một cách an toàn.'
  },

  '4.3.CB1a': {
    code: '4.3.CB1a',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.3',
    componentName: 'Bảo vệ sức khỏe và an sinh số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Phân biệt được các cách thức đơn giản để tránh rủi ro và đe dọa đến sức khỏe thể chất và tinh thần khi sử dụng công nghệ số.',
    pedagogicalSuggestion: 'Ẩn dụ "kẹo": Sử dụng màn hình quá nhiều có hại cho mắt; giữ tư thế ngồi chuẩn khi dùng máy tính.'
  },
  '4.3.CB1b': {
    code: '4.3.CB1b',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.3',
    componentName: 'Bảo vệ sức khỏe và an sinh số',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'b',
    description: 'Lựa chọn được những cách thức đơn giản để bảo vệ bản thân khỏi nguy cơ trong môi trường số.'
  },
  '4.3.CB2a': {
    code: '4.3.CB2a',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.3',
    componentName: 'Bảo vệ sức khỏe và an sinh số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Phân biệt được các cách thức đơn giản để tránh rủi ro và đe dọa đến sức khỏe thể chất và tinh thần khi sử dụng công nghệ số.',
    pedagogicalSuggestion: 'Hoạt động "Bản đồ cơ thể": Nhận diện các bộ phận bị ảnh hưởng khi ngồi máy tính lâu, quy tắc thể thao lành mạnh.'
  },
  '4.3.CB2b': {
    code: '4.3.CB2b',
    domainId: 4,
    domainName: 'An toàn',
    componentId: '4.3',
    componentName: 'Bảo vệ sức khỏe và an sinh số',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'b',
    description: 'Lựa chọn được những cách thức đơn giản để bảo vệ bản thân khỏi nguy cơ trong môi trường internet khi sử dụng thiết bị số.',
    pedagogicalSuggestion: 'Nhận diện tình huống bắt nạt trên mạng và biết cách nhờ cha mẹ, thầy cô hỗ trợ kịp thời.'
  },

  // Miền 5: Giải quyết vấn đề
  '5.1.CB1a': {
    code: '5.1.CB1a',
    domainId: 5,
    domainName: 'Giải quyết vấn đề',
    componentId: '5.1',
    componentName: 'Giải quyết các vấn đề kỹ thuật',
    level: 'CB1',
    gradeRange: 'Lớp 1-2-3',
    indicatorLetter: 'a',
    description: 'Xác định được các vấn đề kỹ thuật đơn giản khi vận hành thiết bị và sử dụng môi trường số.'
  },
  '5.1.CB2a': {
    code: '5.1.CB2a',
    domainId: 5,
    domainName: 'Giải quyết vấn đề',
    componentId: '5.1',
    componentName: 'Giải quyết các vấn đề kỹ thuật',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Xác định được các vấn đề kỹ thuật đơn giản khi vận hành thiết bị và sử dụng môi trường số (lỗi chuột, bàn phím, kết nối mạng).'
  },
  '5.2.CB2a': {
    code: '5.2.CB2a',
    domainId: 5,
    domainName: 'Giải quyết vấn đề',
    componentId: '5.2',
    componentName: 'Xác định nhu cầu và giải pháp công nghệ',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'a',
    description: 'Xác định được nhu cầu cá nhân khi giải quyết nhiệm vụ học tập.'
  },
  '5.2.CB2b': {
    code: '5.2.CB2b',
    domainId: 5,
    domainName: 'Giải quyết vấn đề',
    componentId: '5.2',
    componentName: 'Xác định nhu cầu và giải pháp công nghệ',
    level: 'CB2',
    gradeRange: 'Lớp 4-5',
    indicatorLetter: 'b',
    description: 'Nhận ra được các công cụ số đơn giản và các giải pháp công nghệ có thể có để giải quyết những nhu cầu đó.'
  }
};

/**
 * Trợ giúp tra cứu mã NLS theo chuẩn Thông tư 02/2025 & Công văn 3456
 */
export function getNlsIndicator(code: string): NlsIndicator | undefined {
  const cleanCode = code.trim().replace(/^\[|\]$/g, '');
  return NLS_INDICATOR_DATABASE[cleanCode];
}

/**
 * Lấy danh sách mã NLS phù hợp theo môn học và khối lớp
 */
export function getRecommendedNlsCodes(subject: string, grade: number): string[] {
  const isLevel1 = grade <= 3;
  const level = isLevel1 ? 'CB1' : 'CB2';

  if (subject.toLowerCase().includes('tin học')) {
    return isLevel1
      ? ['1.3.CB1a', '4.1.CB1a', '4.3.CB1a', '3.1.CB1a', '3.4.CB1a']
      : ['4.1.CB2a', '5.1.CB2a', '1.1.CB2a', '1.3.CB2a', '3.1.CB2a', '3.4.CB2a', '5.2.CB2b'];
  }

  if (subject.toLowerCase().includes('đạo đức')) {
    return isLevel1
      ? ['2.5.CB1a', '4.2.CB1a', '3.3.CB1a']
      : ['3.3.CB2a', '4.2.CB2a', '4.3.CB2b', '2.5.CB2a'];
  }

  if (subject.toLowerCase().includes('công nghệ')) {
    return isLevel1
      ? ['4.1.CB1a', '4.3.CB1a', '5.1.CB1a']
      : ['1.1.CB2a', '4.2.CB2a', '4.3.CB2b', '5.1.CB2a'];
  }

  // Các môn học khác (Toán, Tiếng Việt, Khoa học, Lịch sử - Địa lí)
  return isLevel1
    ? ['1.1.CB1a', '1.3.CB1a', '4.1.CB1a']
    : ['1.1.CB2a', '1.3.CB2a', '3.1.CB2a', '4.2.CB2a'];
}
