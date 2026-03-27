# Kiến trúc Tự động hóa MindX CRM

Tài liệu này cung cấp cái nhìn tổng quan ở mức hệ thống (high-level) về thiết kế kiến trúc của không gian làm việc (workspace) monorepo MindX CRM Automation.

## Tổng quan Hệ thống
Khối lưu trữ (repository) này chứa một bộ các công cụ dòng lệnh (CLI) tinh gọn, được thiết kế để giảm thiểu các thao tác xử lý thủ công cho bộ phận Customer Service (CS). Hệ thống đóng vai trò cầu nối dữ liệu hiệu quả giữa Microsoft Outlook (thông qua Microsoft Graph API), Odoo (tích hợp các trang nội bộ mindx.edu.vn và mindxhrm.odoo.com), và hệ thống MindX CRM tập trung.

Môi trường này sử dụng cấu trúc workspace `pnpm` hiện đại, quản lý các package Node.js độc lập:
1. **mail-auto-cli**: Bộ công cụ dòng lệnh (CLI) tiện ích được thiết kế để gọi thủ công các quy trình API chính xác của Outlook.
2. **allocation-cli**: Một module có cấu trúc rõ ràng, đóng vai trò như một bộ giao tiếp (adapter interface) độc lập để chuyển đổi dữ liệu và tương tác trực tiếp với hạ tầng MindX CRM GraphQL APIs.
3. **watcher**: Tiến trình nền (daemon) cốt lõi hoạt động liên tục (polling) để trích xuất ngữ cảnh dữ liệu từ các email đến và tự động điều hướng chúng qua các luồng xử lý mượt mà.

## Các Thành phần & Luồng Dữ liệu (Data Flow)

### 1. Trạng thái Tiến trình Watcher (`watcher/`)
**Mục đích:** Đóng vai trò là bộ não xử lý trung tâm tự động điều phối các luồng quét, lặp lại liên tục.

**Luồng hoạt động (Flow):**
1. **Quét (Poll)**: Truy vấn API Outlook sau mỗi khoảng thời gian `POLL_INTERVAL_MS` để lấy dữ liệu thô.
2. **Lọc Quyền (Filter Auth)**: Xác định email người gửi (`from.emailAddress`) dựa trên mảng danh sách được gán thẳng vào tệp cấu hình độc lập `.mail.config.json` (`ALLOWED_SENDERS`) nằm bên ngoài.
3. **Trích xuất Link (Reference Crawling)**: Sử dụng code để tìm các đường link nội bộ (nhắm tới nền tảng Odoo) ẩn trong thân email. Sau đó buộc hệ thống gọi ngầm để lấy văn bản chi tiết HTML của endpoint đó.
4. **Giao thức Phân loại (Classification)**:
   - **Trích xuất Tĩnh (Static)**: Chạy quy tắc biểu thức chính quy (Regex ở `classifier.ts`) để gán chính xác nhóm logic được định nghĩa trước (ví dụ: `not-enroll`, `tick-uncompleted`).
   - **Động cơ AI Dự phòng (AI Fallback)**: Nếu regex không khớp, hệ thống ném thẳng ngữ cảnh văn bản qua terminal (Node `execFile`) tới các AI Agent CLI hoạt động độc lập (như `gemini`, `claude` hoặc các agent tuỳ chọn gán động). AI sẽ xuất ra đúng chuẩn JSON dựa theo kịch bản Markdown được nhúng sẵn ở `runbook.md`.
5. **Điều phối Chức năng (Dispatching)**:
   - **Auto-Tickets (Vé Tự Động)**: Inject trực tiếp dữ liệu chuẩn vào các hàm xử lý nội bộ (`handlers/`). Các thao tác này sẽ đẩy lệnh thay đổi thẳng lên CRM thông qua GraphQL cục bộ và gửi phản hồi thư tự động.
   - **Manual-Tickets (Vé Thủ Công)**: Đánh giá xem nhóm ticket đó có nằm trong mảng `MANUAL_TYPES` của file `.watcher.config.json` hay không. Nếu có, Daemon lập tức huỷ bỏ các lệnh call tự động phức tạp, nó định dạng dữ liệu và xuất thẳng file JSON vào thư mục `classified/`, tạm ngưng ticket để chờ người soát lại.

### 2. Luồng CLI Tương tác (`watcher/`)
**Mục đích:** Kích hoạt lại các ticket đã bị tạm ngưng đang xếp hàng lưu trữ lại. Được xây dựng trên giao diện `commander` để đọc cấu trúc cú pháp tham số linh hoạt.
Khi chạy lệnh `pnpm watcher manual-processing`, hệ thống sẽ quét thư mục `classified/`.
- **Người thao tác (Human)**: Sẽ nhận được danh sách hộp kiểm (Checkbox UI) tương tác cực kỳ trực quan trên console để đánh dấu và xử lý.
- **AI Agent (Auto Scripts)**: Có thể gọi lệnh để rà qua UI (bỏ qua giao diện) bằng các tham số `--all` hoặc tham số chỉ định mảng `<messageId>` riêng biệt để giải quyết các vé đã nghẽn một cách thầm lặng tự động.

### 3. Động cơ Microsoft Graph (`mail-auto-cli/`)
**Mục đích:** Một thư viện đồng nhất thao tác ổn định với các endpoints của Microsoft Graph API, chia cắt hoàn toàn khỏi nhóm logic nghiệp vụ.
**Thiết kế & Giới hạn:**
- Chứng thực bảo mật, ghi nhớ Token xác nhận tạm ở file `.mail-auto-cli-auth-record.json` thông qua quy trình uỷ quyền thiết bị cục bộ chuẩn form Device Code.
- Động cơ đẩy Template chứa khả năng trích xuất HTML riêng rẽ nằm ở thư mục `template/`, đảm bảo các mẫu thư phản hồi gửi đi đều chuyên nghiệp tuyệt đối thay vì nhúng code tĩnh.

### 4. Hook Phân bổ CRM (`allocation-cli/`)
**Mục đích:** Module nội bộ đặc thù dành cho các lệnh GraphQL thao tác phân bổ trên CRM.

## Quản lý Trạng thái Ổ đĩa (Local File Tracking)
Module chính (Watcher) tận dụng chặt chẽ các mô hình cấu trúc lưu trữ tập tin cục bộ để tạo ra vòng chạy nền như một hàng đợi (Memory-less Queue), giúp giải quyết hoàn hảo luồng chạy phi Database:
- `pending/`: Thư mục lưu vết các file Markdown chi tiết phục vụ kiểm tra/đánh giá lại ngữ cảnh nội dung mỗi khi AI Agent CLI trả kết quả xử lý.
- `classified/`: Thư mục chứa cấu trúc JSON mô tả biến số trạng thái cho các vé tắc nghẽn buộc Agent/Con người phải vào giải quyết tay.
- `completed/`: Kho cất trữ khóa đuôi (Archive) những vé đã xử lý hoàn thiện, khóa đứng hoàn toàn các vòng lặp kiểm tra Outlook trùng lặp trong đợt quét tới.
- `logs/`: Flat-file sinh text trơn truyền thống ghi chép rành mạch dữ liệu lỗi để developer dò log nhanh chóng.

## Quy chuẩn & Bảo mật Khu vực (Secrets)
- Các khoá Azure để kéo Graph API được gán chặt chẽ ở biến cấu trúc `.env` là `AZURE_CLIENT_ID_GROUP` giúp quy hoạch tuyệt đối các chuẩn bảo vệ kết nối.
- Toàn bộ luật lệ cấu hình của nhánh App (như mảng `ALLOWED_SENDERS` hay mảng `MANUAL_TYPES`) hoàn toàn chối bỏ Hardcode. Tất cả được bứt rễ thành tệp cấu hình chia sẻ chung `JSON`, tạo ra quy mô cấp quyền mở rộng tuỳ biến, để team leader hoặc BA có thể vào tùy chỉnh ngay trên branch Git mà không cần đụng đến logic TypeScript.
