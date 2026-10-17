# Bài học

> Ghi lại mọi điều mới học được trong quá trình nâng cấp app — viết cho người
> mới, giải thích **tại sao** chứ không chỉ **làm sao**.
> Kế hoạch: [PLAN.md](./PLAN.md)

## Mục lục

- [Phase 0 — Nền móng](#phase-0--nền-móng)
  - [Bài 0.1 — Git branch là gì và tại sao cần nhánh `develop`](#bài-01--git-branch-là-gì-và-tại-sao-cần-nhánh-develop)
  - [Bài 0.2 — CI là gì (và nó khác CD thế nào)](#bài-02--ci-là-gì-và-nó-khác-cd-thế-nào)
  - [Bài 0.3 — Commit message nên viết thế nào](#bài-03--commit-message-nên-viết-thế-nào)
  - [Bài 0.4 — File `.gitignore` và những thứ không bao giờ commit](#bài-04--file-gitignore-và-những-thứ-không-bao-giờ-commit)

---

# Phase 0 — Nền móng

## Bài 0.1 — Git branch là gì và tại sao cần nhánh `develop`

### Chuyện gì đang xảy ra?

Hãy tưởng tượng bạn viết một cuốn sách. Nhánh `main` là **bản thảo chính** —
bản bạn luôn muốn nó sạch sẽ, đọc được, in ra được. Nếu bạn viết thử một chương
mới mà xóa lung tung ngay trên bản thảo chính rồi lỡ tay làm hỏng, bạn phải
nhớ lại từng chữ để sửa. Mệt.

**Git branch (nhánh)** giống như photocopy bản thảo ra một tờ giấy nháp riêng.
Bạn tha hồ thử nghiệm, xóa, sửa tới lui trên tờ nháp đó. Khi hài lòng, mới
dán nội dung đã hoàn chỉnh trở lại bản thảo chính.

- `main` = bản thảo chính, code ở đây **luôn chạy được**.
- `develop` = tờ nháp để ráp các tính năng lại trước khi đưa lên `main`.
- `feature/ten-tinh-nang` = nháp con cho từng tính năng riêng lẻ.

### Tại sao không làm hết trên `main`?

1. **An toàn**: `main` luôn ở trạng thái tốt. Nếu nháp hỏng, bạn chỉ cần xóa
   nhánh, `main` không hề hấn gì.
2. **Dễ phục hồi**: mỗi lần làm xong một việc, bạn "chốt" (commit) lại. Giống
   như lưu game — nếu làm sai, quay lại điểm lưu gần nhất.
3. **Dễ review**: bạn nhìn được chính xác mình đã đổi gì so với bản gốc.

### Lệnh cần nhớ

```bash
# Xem đang ở nhánh nào (dấu * chỉ nhánh hiện tại)
git branch

# Tạo nhánh mới tên "develop" và chuyển sang đó luôn (-b = tạo và chuyển)
git checkout -b develop

# Chuyển qua lại giữa các nhánh
git checkout main
git checkout develop

# Xem lịch sử commit dạng gọn
git log --oneline
```

> **Điều cần nhớ**: Đổi nhánh không làm mất file. Git tự động giữ nội dung
> riêng cho từng nhánh. Bạn có thể nhảy qua lại như đổi tab trình duyệt.

---

## Bài 0.2 — CI là gì (và nó khác CD thế nào)

Bạn đã đoán được rằng "cd" là CD — Continuous Deployment. Vậy để làm rõ bộ ba
hay bị viết tắt lẫn lộn này:

### CI = Continuous Integration (Tích hợp liên tục)

Hãy tưởng tượng bạn thuê một **người kiểm tra cực kỳ khó tính, làm việc 24/7,
không bao giờ buồn ngủ**. Mỗi lần bạn gửi code lên, người đó **tự động**:

1. Mở máy ảo sạch (không có gì cài sẵn).
2. Cài mọi thứ cần thiết (`npm install`).
3. Chạy toàn bộ test (`npm test`).
4. Báo "xanh" (pass) hoặc "đỏ" (fail) cho bạn.

"Integration" nghĩa là **tích hợp** nhiều mảnh code lại với nhau. Việc kiểm tra
tự động này đảm bảo code mới của bạn **không phá code cũ**. Nếu đỏ, bạn biết
ngay mà sửa, chứ không phải chờ đến lúc đưa cho người khác dùng mới phát hiện.

### CD = Continuous Deployment (Triển khai liên tục)

Sau khi CI xanh, CD là bước **tự động đưa code lên server thật**. Nói cách
khác: CI kiểm tra "code này có ổn không?", CD làm "được rồi, đưa lên web luôn".

- **Continuous Delivery** (giao hàng liên tục): tự động chuẩn bị sẵn, nhưng
  chờ người bấm nút mới deploy.
- **Continuous Deployment** (triển khai liên tục): tự động deploy luôn, không
  cần người bấm.

### GitHub Actions là gì?

GitHub Actions là **cỗ máy chạy CI/CD có sẵn trong GitHub**, miễn phí. Bạn viết
các bước vào một file YAML (`.github/workflows/ci.yml`) và GitHub sẽ tự chạy
mỗi khi có sự kiện (thường là `push` hoặc `pull_request`).

Cấu trúc một file workflow chia làm 3 phần:

```yaml
name: CI                    # Tên hiển thị trong tab Actions

on:                         # KHI NÀO chạy?
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:                       # LÀM GÌ?
  test:                     # Tên job (mình tự đặt)
    runs-on: ubuntu-latest   # Chạy trên máy ảo Ubuntu miễn phí
    steps:
      - uses: actions/checkout@v4        # Bước 1: lấy code về máy ảo
      - uses: actions/setup-node@v4      # Bước 2: cài Node.js
        with:
          node-version: 22
      - run: npm ci                       # Bước 3: cài thư viện
      - run: npm test                     # Bước 4: chạy test
```

Đọc như tiếng Việt: *"Khi có push hoặc pull request vào main, trên máy Ubuntu,
lấy code → cài Node → cài thư viện → chạy test."*

> **Tại sao dùng `npm ci` thay vì `npm install`?**
> `npm ci` (clean install) cài **đúng y hệt** phiên bản trong `package-lock.json`
> và xóa sạch `node_modules` trước. Trên máy kiểm tra tự động, ta muốn kết quả
> giống nhau mọi lần — gọi là **reproducible build**. `npm install` có thể cập
> nhật phiên bản nhỏ, gây lệch kết quả.

### Quy trình thực tế sau khi có CI

```
Bạn sửa code
    ↓
git push lên nhánh feature/...
    ↓
GitHub Actions tự chạy test  ← CI
    ↓
   Xanh? ── Không → sửa tiếp
    │
   Có
    ↓
Mở Pull Request → merge vào main
    ↓
Actions chạy test lần nữa + deploy  ← CD (Phase 5)
    ↓
Web tự cập nhật sau ~2 phút
```

---

## Bài 0.3 — Commit message nên viết thế nào

Commit là một "điểm lưu game". Message là **tấm nhãn dán trên điểm lưu đó** để
sau này (vài tuần nữa chính bạn) đọc vào hiểu ngay mình đã làm gì.

### Quy tắc ngắn gọn

1. **Dòng đầu ≤ 50 ký tự**, viết ở thể mệnh lệnh (như ra lệnh cho code):
   - Đúng: `Add savings goals API`
   - Sai: `Added savings goals API` hoặc `Thêm API mục tiêu` (tùy convention dự án,
     repo này dùng tiếng Anh cho commit cho đồng nhất)
2. **Bắt đầu bằng động từ**: `Add` (thêm), `Fix` (sửa lỗi), `Update` (cập nhật),
   `Remove` (xóa), `Refactor` (tái cấu trúc), `Document` (tài liệu).
3. **Nếu cần giải thích thêm**, để cách một dòng trống rồi viết phần thân.

### Ví dụ tốt vs chưa tốt

```
✅ Add gold price service with manual fallback
✅ Fix balance not updating when transfer completes
✅ Document deployment plan for Azure VM B1S

❌ update
❌ fix bug
❌ làm đủ thứ
```

`fix bug` sáng nay bạn hiểu, ba tháng sau bạn đọc lại chỉ biết "ừ, có sửa gì đó".

### Tại sao phải chia commit nhỏ?

Vì một commit nhỏ = một việc hoàn chỉnh. Khi muốn "quay lại thời điểm trước khi
làm hỏng biểu đồ", bạn nhảy tới đúng commit đó. Nếu bạn gộp hết 10 việc vào 1
commit rồi hỏng 1 việc, muốn quay lại phải quay cả 10 → mất công làm lại 9 việc.

**Nguyên tắc**: một commit nên trả lời được câu "Commit này làm đúng MỘT việc gì?".

---

## Bài 0.4 — File `.gitignore` và những thứ không bao giờ commit

### Git theo dõi cái gì?

Git theo dõi **mọi file trong thư mục dự án** — trừ những file được liệt kê
trong `.gitignore`. Đây là danh sách "đừng để mắt tới file này".

### Nhìn vào `.gitignore` hiện tại của dự án

```
node_modules/     # Thư mục chứa thư viện tải về — to, có thể cài lại bằng npm install
.env              # Biến môi trường chứa bí mật (mật khẩu, API key)
*.db              # File database SQLite — DỮ LIỆU thật của bạn
*.db-shm
*.db-wal          # File phụ trợ của SQLite khi bật WAL mode
*.sqlite
*.sqlite3
.DS_Store         # File rác macOS tự tạo
LESSONS.md        # (file tạm ở gốc repo)
```

### Tại sao 3 nhóm này không được commit?

1. **`node_modules/`** — Nặng (hàng trăm MB). Ai cũng tạo lại được bằng
   `npm install` từ `package.json`. Commit nó như mang cả kho hàng đến nhà bạn
   chỉ để đưa cuốn danh sách cần mua.

2. **`.env`** — Chứa **bí mật**. Ví dụ `DATABASE_PASSWORD=abc123`. Commit lên
   GitHub (nhất là repo public) là cả thế giới đọc được bí mật của bạn. Quy tắc
   vàng: **bí mật thì không commit, không bao giờ.**

3. **`*.db`** — Là **dữ liệu cá nhân** của bạn (số tiền, giao dịch). Nếu commit,
   mỗi lần bạn nhập một giao dịch mới, Git lại lưu cả một phiên bản database →
   repo phình to kinh khủng. Quan trọng hơn: ai fork repo sẽ thấy toàn bộ chi
   tiêu của bạn.

### Điều bất ngờ thú vị

`docs/LESSONS.md` **được commit** (vì nó không nằm trong danh sách ignore) —
đúng như mong muốn, vì đây là tài liệu học tập dùng chung, không phải dữ liệu
riêng. Còn `LESSONS.md` ở **gốc repo** bị ignore — đó là ghi chú nháp riêng của
bạn, không cần đưa lên GitHub.

> **Bài học sâu**: Cùng một cái tên `LESSONS.md` nhưng nằm ở hai thư mục khác
> nhau thì số phận khác nhau. `.gitignore` có thể chỉ định theo tên file
> (`LESSONS.md`), theo thư mục (`node_modules/`), hoặc theo mẫu (`*.db`).

### Lệnh hữu ích liên quan

```bash
# Xem file nào đang bị Git ignore
git status --ignored

# Kiểm tra xem một file cụ thể có bị ignore không
git check-ignore -v database/expense.db

# Lỡ commit file bí mật rồi? (không đơn giản, cần xóa khỏi lịch sử)
# → Tốt nhất là đổi mật khẩu/khóa đó ngay, rồi học cách dùng .env cho lần sau
```

---

## Điểm dừng Phase 0

Sau Phase 0, bạn sẽ có:

- [x] `docs/PLAN.md` — kế hoạch tổng thể, các phase, quy tắc code/test
- [x] `docs/LESSONS.md` — file này, bài học từng bước
- [ ] Nhánh `develop` để làm việc
- [ ] `.github/workflows/ci.yml` — CI tự chạy test mỗi lần push

**Tự kiểm tra hiểu bài**: Bạn có thể giải thích cho một người bạn (không biết
lập trình) nghe:
1. CI khác CD ở điểm nào?
2. Tại sao không nên commit file `.db` lên GitHub?
3. Branch `develop` dùng để làm gì?

Nếu trả lời trôi chảy, bạn đã sẵn sàng cho Phase 1.
