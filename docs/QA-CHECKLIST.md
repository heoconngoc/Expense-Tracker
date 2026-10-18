# QA Checklist — kiểm tra tay sau mỗi lần đổi UI

Mục đích: bắt các lỗi mà test tự động không thấy (layout vỡ, nút mất id, chart
không vẽ, số hiển thị sai). Chạy checklist này trên **mobile 375px** VÀ
**desktop ≥1280px** trước khi coi một phase UI là xong.

Chuẩn bị:

```bash
pkill -f "node src/server.js"
DB_PATH=/tmp/smoke.db npm start
```

Mở trình duyệt, **hard refresh** (Cmd/Ctrl + Shift + R) để chắc chắn không dùng
cache cũ. Nếu vẫn thấy giao diện cũ, kiểm tra còn tiến trình `node` cũ giữ cổng
không (`lsof -nP -iTCP:3000 -sTCP:LISTEN` — cổng mặc định, hoặc `$PORT`).

## 0. Khởi động & lỗi nền

- [ ] Trang tải không lỗi đỏ trong Console (F12 → Console)
- [ ] Tab Network: `/dashboard`, `/assets`, `/savings-goals`, `/backup`... trả 200
- [ ] Nếu tắt mạng rồi tải lại: hiện **toast lỗi tiếng Việt**, app không trắng trang

## 1. Điều hướng (6 tab)

- [ ] Đủ 6 tab: Tổng quan, Giao dịch, Chuyển khoản, Tài sản, Mục tiêu, Quản lý
- [ ] Bấm mỗi tab → panel tương ứng hiện, tab active đổi màu
- [ ] Mobile: bottom nav không che nội dung; toast nổi trên bottom nav
- [ ] Chuyển tab rồi quay lại → dữ liệu vẫn đúng

## 2. Tổng quan (dashboard)

- [ ] Hero hiện **tổng tài sản** đúng định dạng (phân cách nghìn, đơn vị)
- [ ] Biểu đồ cột 6 tháng vẽ ra (không trống, không chồng nhãn)
- [ ] Biểu đồ tròn theo danh mục vẽ ra, có chú thích
- [ ] Đổi tháng ở bộ lọc → số liệu + biểu đồ cập nhật
- [ ] Biểu đồ luôn vẽ được (Chart.js phục vụ nội bộ, không cần internet)
- [ ] Nếu buộc phải lỗi biểu đồ, `.chart-fallback` hiện **thông báo lỗi thật**
      (`Không vẽ được biểu đồ: ...`), không có khung trống câm

## 3. Giao dịch

- [ ] Thêm giao dịch chi → số dư tài khoản giảm đúng
- [ ] Thêm giao dịch thu → số dư tài khoản tăng đúng
- [ ] Sửa giao dịch (đổi tiền tệ/tài khoản) → cả 2 số dư cập nhật đúng
- [ ] Xóa giao dịch → số dư hoàn lại đúng
- [ ] Lọc theo loại/danh mục/tài khoản/khoảng ngày → danh sách lọc đúng
- [ ] Gợi ý tên (datalist) hiện khi gõ
- [ ] Nhập số tiền âm hoặc 0 → báo lỗi, không lưu

## 4. Chuyển khoản

- [ ] Chuyển giữa 2 tài khoản cùng loại tiền → số dư 2 bên đúng
- [ ] Chuyển khác loại tiền (USD→VND) → nhập số nhận + tỷ giá, số dư đúng
- [ ] Tạo chuyển khoản trạng thái `pending` → số dư KHÔNG đổi
- [ ] Hoàn tất chuyển khoản pending → số dư 2 bên đổi đúng
- [ ] Chuyển vượt số dư → báo "Insufficient balance"
- [ ] Chọn nguồn = đích → báo lỗi

## 5. Tài sản

- [ ] Tổng tài sản quy VND khớp tổng từng tài khoản + vàng
- [ ] Nhóm tài khoản theo loại hiển thị đúng (tiền mặt, ngân hàng...)
- [ ] Thêm/sửa/xóa vàng (số lượng phần nghìn: 1.5 lượng = 1500) → giá trị VND đúng
- [ ] Giá vàng hiện tại hiển thị; bấm "Cập nhật giá" → giá mới (hoặc fallback êm)
- [ ] Nhập giá vàng tay → dùng giá đó để định giá
- [ ] Bảng tỷ giá: sửa tỷ giá 1 loại tiền → tổng tài sản cập nhật
- [ ] Thiếu tỷ giá → có cảnh báo rõ, không tính sai âm thầm

## 6. Mục tiêu

- [ ] Tạo mục tiêu (tên, số tiền, hạn) → hiện card với thanh tiến độ
- [ ] Đóng góp vào mục tiêu → tiến độ tăng đúng %
- [ ] Xóa 1 khoản đóng góp → tiến độ giảm đúng
- [ ] Mục tiêu đạt 100% → hiển thị trạng thái hoàn thành (không vượt 100% kỳ dị)
- [ ] Sửa/xóa mục tiêu hoạt động đúng

## 7. Quản lý (CRUD) & Cài đặt

- [ ] CRUD tài khoản (gồm chọn loại tiền) hoạt động
- [ ] CRUD danh mục (thu/chi) hoạt động
- [ ] CRUD loại tiền hoạt động
- [ ] Xuất JSON: tải file `.json` về máy
- [ ] Nhập JSON: chọn file → xác nhận → dữ liệu khôi phục đúng (kiểm tra lại sau reload)
- [ ] Nhập file JSON hỏng → báo lỗi, dữ liệu cũ KHÔNG bị mất

## 8. Đa thiết bị & hiển thị

- [ ] Mobile 375px: không tràn ngang, chữ không bị cắt
- [ ] Desktop ≥1280px: bố cục cân đối, không giãn lệch
- [ ] Số tiền luôn đúng định dạng, không hiện `NaN`/`undefined`/`null`
- [ ] Font Fraunces/Inter tải được (nếu offline thì fallback vẫn đọc tốt)

## Ghi chú khi phát hiện lỗi

Ghi lại: tab nào, thao tác nào, kết quả mong đợi vs thực tế, ảnh nếu có. Lỗi
nghiêm trọng (mất dữ liệu, sai số tiền) → dừng lại sửa trước khi làm tiếp.
