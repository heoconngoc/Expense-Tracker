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

- [Phase 1 — Design system](#phase-1--design-system)
  - [Bài 1.1 — Design tokens: đặt tên cho màu sắc](#bài-11--design-tokens-đặt-tên-cho-màu-sắc)
  - [Bài 1.2 — Font pairing: vì sao số tiền dùng font khác chữ thường](#bài-12--font-pairing-vì-sao-số-tiền-dùng-font-khác-chữ-thường)
  - [Bài 1.3 — Mobile-first responsive: một layout, nhiều kích thước](#bài-13--mobile-first-responsive-một-layout-nhiều-kích-thước)
  - [Bài 1.4 — Vì sao phải giữ nguyên tên class khi đổi giao diện](#bài-14--vì-sao-phải-giữ-nguyên-tên-class-khi-đổi-giao-diện)

- [Phase 2 — Backend: data model + API mới](#phase-2--backend-data-model--api-mới)
  - [Bài 2.1 — Migration: nâng cấp database không mất dữ liệu](#bài-21--migration-nâng-cấp-database-không-mất-dữ-liệu)
  - [Bài 2.2 — WAL mode: tại sao copy file .db là chưa đủ để backup](#bài-22--wal-mode-tại-sao-copy-file-db-là-chưa-đủ-để-backup)
  - [Bài 2.3 — Lưu số thập phân và tỷ giá bằng số nguyên](#bài-23--lưu-số-thập-phân-và-tỷ-giá-bằng-số-nguyên)
  - [Bài 2.4 — Test không phụ thuộc mạng: tiêm (inject) fetch](#bài-24--test-không-phụ-thuộc-mạng-tiêm-inject-fetch)

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

---

# Phase 1 — Design system

## Bài 1.1 — Design tokens: đặt tên cho màu sắc

### Vấn đề nếu không có tokens

Giả sử bạn tô nút bấm màu xanh bằng mã `#3d5a4c`. Rồi 20 chỗ khác trong file
cũng gõ `#3d5a4c`. Sau này bạn muốn đổi xanh đậm hơn một chút — bạn phải tìm
và sửa 20 chỗ. Lỡ quên 1 chỗ, giao diện lệch màu ngay. Đau mắt.

### Giải pháp: đặt tên cho màu

Thay vì gõ mã màu ở khắp nơi, ta gõ **một lần duy nhất** ở đầu file:

```css
:root {
  --moss: #3d5a4c;
  --paper: #faf6ef;
}
```

Rồi mọi nơi khác dùng **tên** chứ không dùng mã:

```css
.button { background: var(--moss); }
.eyebrow { color: var(--ochre); }
body { background: var(--paper); }
```

`--moss` gọi là một **biến CSS** (CSS variable), hay còn gọi là **design token**
— "token" nghĩa là một đơn vị thiết kế được đặt tên. Đổi màu chỉ cần sửa **một
dòng** ở `:root`, cả app tự cập nhật.

### `:root` là gì?

`:root` là phần tử gốc của cả trang (thẻ `<html>`). Biến khai báo trong `:root`
có mặt ở **mọi nơi** trong site. Giống như bạn viết bảng màu lên góc bảng đen
của lớp — ai cũng đọc được và dùng chung.

> **Ứng dụng trong app này**: file `styles.css` mở đầu bằng khối `:root` chứa
> toàn bộ bảng màu "sổ tay" (giấy, mực, xanh rêu, đất nung, vàng đất...).
> Không chỗ nào trong app còn viết mã màu trực tiếp nữa — tất cả đi qua token.

---

## Bài 1.2 — Font pairing: vì sao số tiền dùng font khác chữ thường

### Hai loại chữ trong thiết kế

- **Serif** (chữ "có chân"): như `Times New Roman`, `Georgia`. Cảm giác trang
  trọng, cổ điển, giống sách in.
- **Sans-serif** (chữ "không chân"): như `Arial`, `Inter`. Sạch, hiện đại, dễ
  đọc trên màn hình.

### Tại sao phối hợp cả hai?

Nếu dùng **một** font cho tất cả, trang trông đơn điệu — đúng kiểu "UI mặc định".
Trong sổ tài chính thật, người ta thường viết:

- Số tiền bằng nét **đậm, trang trọng** → đây là **ngôi sao** của trang.
- Chữ giải thích bằng nét **gọn, dễ đọc** → chỉ là phụ trợ.

Nên app này dùng:
- `Fraunces` (serif) cho **số tiền, tiêu đề** → trang trọng, "có hồn".
- `Inter` (sans-serif) cho **chữ nội dung** → dễ đọc.

### Giữ tiêu đề phòng khi font không tải được

Google Fonts có thể chậm hoặc không tải (mạng yếu, ngoài quê). Nên **luôn** khai
báo font dự phòng, viết sau dấu phẩy:

```css
--font-display: "Fraunces", Georgia, "Times New Roman", serif;
```

Đọc là: "Ưu tiên Fraunces. Không có thì dùng Georgia. Không có nữa thì Times.
Cuối cùng thì để trình duyệt tự chọn font serif." Trình duyệt thử từng cái từ
trái sang phải. Gọi là **font stack**.

### `tabular-nums` — chi tiết nhỏ, khác biệt lớn

Số trong font bình thường có thể có độ rộng khác nhau (số `1` hẹp hơn số `8`).
Với số tiền xếp cột, điều đó làm cột số **so le**, xấu. `tabular-nums` buộc mọi
chữ số có cùng độ rộng — số thẳng cột như trong Excel:

```css
.card strong {
  font-variant-numeric: tabular-nums lining-nums;
}
```

Đây là một trong những chi tiết nhỏ tách "UI nghiệp dư" khỏi "UI chăm chút".

---

## Bài 1.3 — Mobile-first responsive: một layout, nhiều kích thước

### Responsive là gì?

Cùng một trang web nhưng **tự co giãn** cho vừa màn hình điện thoại, máy tính
bảng, và desktop. Không phải làm 3 app riêng — làm 1, cho nó "mềm dẻo".

### `@media` — "nếu màn hình như thế này thì..."

CSS có công cụ gọi là **media query**. Đọc như câu điều kiện:

```css
@media (max-width: 640px) {
  .nav-tabs { position: fixed; bottom: 0; }
}
```

Nghĩa là: "Nếu màn hình **nhỏ hơn hoặc bằng 640px** (điện thoại), thì thanh điều
hướng dính xuống **đáy màn hình**."

Ở desktop, thanh tab nằm trên đầu như bình thường (kiểu web). Trên điện thoại,
nó chuyển thành **thanh dưới cùng** — đúng kiểu app mobile người ta quen dùng
ngón cái với tới.

### Tại sao "mobile-first"?

Trong app này, các quy tắc chung viết trước, rồi `@media` chỉ **ghi đè** cho
màn nhỏ. Cách này gọi là **mobile-first** — bắt đầu từ cái khó nhất (màn nhỏ),
rồi mở rộng ra. Ưu điểm: app dùng được ngay trên điện thoại, nơi bạn hay ghi
chép chi tiêu nhất.

### Các breakpoint đã dùng

| Kích thước | Đối tượng | Thay đổi |
|---|---|---|
| `> 1024px` | Desktop | Dashboard 3 cột, container rộng 1160px |
| `641px – 1024px` | Tablet | Summary grid 2 cột |
| `≤ 640px` | Điện thoại | Thanh tab xuống đáy, 1 cột, nút cao ≥44px |

### `env(safe-area-inset-bottom)` là gì?

iPhone có "tai thỏ" và thanh gạt dưới đáy màn hình. Nếu đặt nút ở sát đáy, thanh
gạt che mất. Dòng này tự cộng thêm một khoảng đệm an toàn:

```css
padding-bottom: calc(6px + env(safe-area-inset-bottom));
```

`env()` là hàm đọc "vùng an toàn" của thiết bị. Trên máy Android thường nó bằng
0, không ảnh hưởng gì.

---

## Bài 1.4 — Vì sao phải giữ nguyên tên class khi đổi giao diện

### HTML, CSS, JS nói chuyện với nhau thế nào?

Ba "người bạn" trong app này:

- **HTML** dựng khung xương (nút, ô nhập, thẻ).
- **CSS** sơn màu, trang trí (qua **class** — ví dụ `.button`, `.card`).
- **JavaScript** (`app.js`) tạo thêm phần tử động — cũng **gán class** cho chúng.

Ví dụ trong `app.js`, khi tạo một thẻ giao dịch, nó viết:

```js
row.className = "transaction-row";
badge.className = "badge badge-archived";
```

JS **không biết** `.transaction-row` được sơn màu gì. Nó chỉ gắn cái **nhãn**
tên class đó. CSS đọc nhãn để tô màu.

### Chuyện gì xảy ra nếu đổi tên class?

Nếu trong CSS ta đổi `.transaction-row` thành `.txn-row`, mà trong `app.js` vẫn
gắn nhãn `transaction-row` — thì **CSS không tìm thấy nhãn nào trùng**, thẻ đó
mất hết màu sắc và bố cục. Thậm chí cả nút bấm cũng mất dáng.

Đây là lỗi cực kỳ phổ biến khi "đổi giao diện": đổi màu thì dễ, nhưng vô tình
**đổi tên class** làm hỏng JS mà không hay biết.

### Quy tắc vàng khi restyle

> **Chỉ đổi phần "trang trí" bên trong mỗi class, KHÔNG đổi tên class** trừ khi
> bạn sửa cả CSS lẫn JS cùng lúc.

Đó là lý do khi làm Phase 1, tôi **giữ nguyên** toàn bộ tên class
(`.card`, `.button`, `.account-card`, `.transaction-row`, `.badge`,
`.manage-row`...) — chỉ thay giá trị màu, font, khoảng cách bên trong mỗi class.

### Cách tự kiểm tra đã an toàn chưa

Có một mẹo: tìm tất cả tên class **được dùng trong HTML + JS**, rồi đối chiếu
xem CSS có định nghĩa cho từng cái không. Nếu tên nào "có nhãn mà CSS không biết"
→ đang có chỗ hỏng.

```bash
# Ví dụ đếm nhanh: tìm class được gán trong JS
grep -oE 'className = "[^"]+"' public/app.js
```

Trong dự án này, tôi đã viết một script Node nhỏ để quét toàn bộ `app.js` +
`index.html`, so với `styles.css`, và xác nhận **không thiếu class nào**. Bạn
có thể tái sử dụng cách này mỗi lần restyle.

---

## Điểm dừng Phase 1

Sau Phase 1, bạn sẽ có:

- [x] Bộ design tokens "sổ tay" (giấy, mực, xanh rêu, đất nung, vàng đất)
- [x] Font pairing Fraunces (số/tiêu đề) + Inter (nội dung), có fallback
- [x] Toàn bộ tab cũ restyle, không còn màu indigo
- [x] Thanh điều hướng chuyển xuống đáy trên điện thoại

**Tự kiểm tra hiểu bài**:
1. Design token là gì và tại sao nó giúp đổi màu dễ hơn?
2. Vì sao số tiền dùng font serif còn chữ thường dùng sans-serif?
3. Nếu lỡ đổi tên một class trong CSS mà quên JS, chuyện gì xảy ra?

---

# Phase 2 — Backend: data model + API mới

## Bài 2.1 — Migration: nâng cấp database không mất dữ liệu

### Vấn đề

App đang chạy với dữ liệu thật của bạn trong `database/expense.db`. Bây giờ ta cần
**thêm cột** `type` vào bảng `accounts`, thêm vài bảng mới. Không thể xóa database
làm lại — sẽ mất hết giao dịch.

### Migration là gì?

**Migration** là một file SQL mô tả **một bước thay đổi cấu trúc database**.
Thay vì sửa file `schema.sql` (dành cho database tạo mới), ta viết file riêng để
nâng cấp database đang có:

```
database/migrations/001_money_to_integer.sql
database/migrations/002_asset_features.sql
```

### Nguyên tắc vàng: file migration cũ không bao giờ sửa

Mỗi file migration chỉ chạy **một lần duy nhất** trên mỗi database. Sau khi đã
chạy, nó là "lịch sử". Muốn đổi gì tiếp, **thêm file mới** `003_...sql`. Nếu bạn
sửa file `002` đã chạy trên máy bạn, thì database máy bạn và database trên server
sẽ khác nhau — không ai biết bản nào đúng.

### Làm sao biết migration nào đã chạy?

Ta tạo một bảng ghi nhớ:

```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,          -- "001", "002"
  applied_at TIMESTAMP
);
```

Khi khởi động, server đọc thư mục `migrations/`, so với bảng này, và **chỉ chạy
những file chưa có**. File `src/database.js` có hàm `runMigrations()` làm việc đó.

### Trường hợp khó: database cũ chưa có bảng theo dõi

Database `expense.db` của bạn đã chạy migration `001` từ trước (bằng tay), nhưng
chưa hề có bảng `schema_migrations`. Nếu ta cứ thế chạy lại `001` sẽ lỗi (bảng đã
đổi rồi). Giải pháp gọi là **baseline**: lần đầu chạy, nếu thấy database đã có
bảng `accounts` nhưng bảng theo dõi trống, ta **đánh dấu `001` là "đã chạy"** mà
không thực thi lại, rồi mới chạy `002`. Database tạo mới thì ngược lại — `schema.sql`
đã là bản mới nhất nên ta đánh dấu tất cả là "đã chạy" luôn.

### Backup trước khi đụng vào

Trước khi chạy migration, `runMigrations()` tự sao lưu database vào
`database/backups/expense-<thời-gian>-pre-<version>.db`. Có backup, lỡ migration
sai vẫn quay lại được. (Thư mục này bị `.gitignore` vì chứa dữ liệu thật.)

---

## Bài 2.2 — WAL mode: tại sao copy file .db là chưa đủ để backup

Đây là bài học **tốn thời gian nhất** của Phase 2, đáng ghi lại.

### Chuyện gì đã xảy ra?

Tôi định test migration trên một bản sao của database thật. Tôi gõ:

```bash
cp database/expense.db /tmp/test/expense.db
```

Rồi chạy migration trên bản sao. Kết quả: bảng `accounts` **trống trơn** — mất hết
5 tài khoản! Tưởng migration xóa dữ liệu. Hóa ra không phải.

### Nguyên nhân: WAL mode

App bật chế độ **WAL** (Write-Ahead Logging) cho SQLite:

```sql
PRAGMA journal_mode = WAL;
```

Trong chế độ này, dữ liệu mới **không ghi ngay vào `expense.db`** mà ghi vào một
file phụ `expense.db-wal` (Write-Ahead Log). File `.db` chính chỉ được cập nhật
định kỳ khi có ai đó "checkpoint" (đổ WAL vào file chính).

Nhìn lại thư mục:

```
expense.db       40960 bytes   ← file chính, chưa có dữ liệu mới
expense.db-wal  140112 bytes   ← dữ liệu thật nằm ở đây!
```

Tôi chỉ copy `expense.db` → mất luôn phần trong `.db-wal`. Lỗi của **cách copy**,
không phải của migration.

### Cách làm đúng

Trước khi copy, buộc SQLite đổ hết WAL vào file chính:

```sql
PRAGMA wal_checkpoint(FULL);
```

Vì vậy `backupDatabase()` trong `src/database.js` làm đúng thứ tự: **checkpoint
trước, rồi mới copy file**. Nhờ vậy file backup có đủ dữ liệu.

### Tại sao SQLite dùng WAL?

Ghi vào log phụ nhanh hơn và cho phép đọc/ghi đồng thời. Máy chủ SQLite thật cũng
khuyến nghị WAL. Đánh đổi: backup phải cẩn thận hơn.

> **Bài học**: Khi backup bất kỳ database nào, đừng bao giờ copy file thô nếu
> database đang chạy. Luôn dùng cơ chế backup chính thức (với SQLite: `.backup`
> hoặc `VACUUM INTO`, hoặc checkpoint rồi copy).

---

## Bài 2.3 — Lưu số thập phân và tỷ giá bằng số nguyên

### Số lượng vàng có thể lẻ: 1.5 lượng, 0.5 chỉ

Máy tính lưu số thập phân bằng hệ nhị phân, nên `0.1 + 0.2` không bằng `0.3` mà
bằng `0.30000000000000004`. Với tiền và tài sản, sai số này tích lũy gây lệch.

Quy tắc của dự án (đã có từ Phase 2.0): **mọi giá trị tiền là số nguyên ở đơn vị
nhỏ nhất** (USD → cent, VND → đồng). Nhưng vàng nhập theo "lượng"/"chỉ" là số lẻ.

Giải pháp: lưu số lượng vàng bằng số nguyên **phần nghìn** đơn vị:

```
1.5 lượng  → quantity = 1500
0.5 chỉ    → quantity = 500
```

Khi trả về cho frontend thì chia 1000 (`quantity: 1.5`), khi nhận vào thì nhân
1000. Cột `quantity` trong database vẫn là INTEGER, không bao giờ lưu float.

### Tỷ giá cũng vậy

Tỷ giá USD→VND là 26000 — cũng có thể lẻ (26012.75). Ta lưu bằng **micro units**
(nhân 1,000,000) thành số nguyên, giống hệt cách bảng `transfers` đã làm:

```
26000 VND/USD  → rate_to_vnd = 26000000000
```

Khi tính giá trị, công thức (đều là số nguyên, chỉ làm tròn ở bước cuối):

```
value_vnd = balance × rate_to_vnd ÷ 1_000_000 ÷ 10^decimal_places
```

### Điểm cần nhớ

- **Không bao giờ** lưu tiền/tỷ giá/số lượng vàng bằng cột kiểu `REAL`.
- Chỉ làm tròn **một lần duy nhất** ở bước trả kết quả cuối cùng.
- Quy ước scale (1000 cho vàng, 1,000,000 cho tỷ giá) phải ghi rõ trong schema,
  để người sau đọc không đoán mò.

---

## Bài 2.4 — Test không phụ thuộc mạng: tiêm (inject) fetch

### Vấn đề

`goldPriceService` gọi API thật `giavang.now`. Nếu test cứ gọi API thật thì:
- Chạy test cần internet.
- Mạng chậm/API chết → test đỏ dù code đúng.
- Không kiểm soát được dữ liệu trả về (hôm nay giá 140tr, mai 145tr).

### Giải pháp: dependency injection qua tham số

Thay vì gọi thẳng `fetch`, hàm **nhận** hàm `fetch` từ ngoài vào, mặc định dùng
cái thật:

```js
export async function fetchGoldPrice({
  fetchImpl = globalThis.fetch,
} = {}) {
  const response = await fetchImpl(GOLD_PRICE_URL, {...});
  ...
}
```

Khi chạy thật, `fetchImpl` là `fetch` có sẵn của Node. Khi test, ta truyền một hàm
giả:

```js
const price = await fetchGoldPrice({
  fetchImpl: async () => ({
    ok: true,
    json: async () => ({ buy: 140600000, sell: 143600000 }),
  }),
});
```

### Tại sao cách này hay hơn "mock thư viện"?

Nhiều người dùng `jest.mock()` để thay cả module `fetch`. Cách đó che giấu sự phụ
thuộc. Truyền tham số (inject) làm **lộ rõ** "hàm này cần mạng" ngay trong chữ ký
hàm — người đọc code thấy liền. Và test trở nên cực đơn giản, không cần ma thuật.

### Kiểm tra được cả nhánh fallback

Vì swap `fetchImpl` dễ, ta test được mọi tình huống mà không cần mạng:

```js
// API chết, có giá nhập tay → dùng giá tay
await getCurrentGoldPrice({
  fetchImpl: async () => { throw new Error("network down"); },
});
```

Đây là lý do `getCurrentGoldPrice` được thiết kế theo thứ tự **API → giá nhập tay
→ cache cũ → báo lỗi**. Mỗi mắt xích trong chuỗi đó có một test riêng.

---

## Điểm dừng Phase 2

Sau Phase 2, backend có:

- [x] Migration `002` + runner tự động, có backup (an toàn với dữ liệu thật)
- [x] Bảng mới: `gold_holdings`, `savings_goals`, `savings_contributions`, `exchange_rates`
- [x] `accounts.type` (spending/savings/gold)
- [x] API: `/assets`, `/gold-prices`, `/gold-holdings`, `/savings-goals`,
      `/settings`, `/exchange-rates`, và `/dashboard` mở rộng (`monthly`)
- [x] 112 test xanh (từ 55), mọi service mới có test, mock fetch không cần mạng

**Tự kiểm tra hiểu bài**:
1. Vì sao không bao giờ sửa file migration đã chạy, mà phải thêm file mới?
2. Vì sao copy mỗi file `.db` có thể mất dữ liệu khi bật WAL mode?
3. Số lượng vàng 0.5 chỉ được lưu trong database như thế nào?
4. Làm sao test một hàm gọi API mạng mà không cần mạng?

---

## Phase 3 — bài học frontend & backup

### 3.1 Lazy-load Chart.js bằng `import()` động

Chart.js nặng, không phải lúc nào cũng cần. Thay vì `<script>` ở `<head>`, ta để
`public/js/charts.js` tự tải khi vẽ biểu đồ lần đầu:

```js
const CHART_JS_URL = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/+esm";
let chartJsPromise = null;

function loadChartJs() {
  chartJsPromise ??= import(CHART_JS_URL).then((m) => m.Chart ?? m.default);
  return chartJsPromise;
}
```

- `import(url)` trả về ES module; jsdelivr `/+esm` phục vụ đúng định dạng.
- Gán `chartJsPromise` vào biến để **chỉ tải 1 lần** dù gọi nhiều lần.

**Bẫy**: Chart.js ném lỗi nếu vẽ vào `<canvas>` đã có chart cũ. Phải hủy trước:

```js
const existing = Chart.getChart(canvas);
if (existing) existing.destroy();
```

Vì vậy `loadDashboard` chạy lại mỗi khi đổi tháng/tiền tệ cũng không bị chồng chart.

### 3.2 Restore JSON: xóa con trước, chèn cha trước

Bật `PRAGMA foreign_keys = ON` thì thứ tự thao tác bảng rất quan trọng:

- **Xóa**: ngược thứ tự phụ thuộc (bảng con trước) — `savings_contributions` →
  `savings_goals`, `transactions` → `accounts`, ... cuối cùng `currencies`.
- **Chèn**: xuôi thứ tự (bảng cha trước) — `currencies` → `categories` → `accounts`
  → `transactions` → ...

Làm sai thứ tự là `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed` ngay. Đây
cũng là **bẫy khi viết test**: gọi `DELETE FROM accounts` khi còn `transactions`
trỏ tới sẽ lỗi, dù ta "chỉ định xóa account". Test phải xóa con trước:

```js
await run("DELETE FROM transfers");
await run("DELETE FROM transactions");
await run("DELETE FROM accounts");
```

Bọc toàn bộ restore trong một transaction để **lỗi giữa đường thì rollback**,
không để database ở trạng thái nửa vời. Test "row sai → rollback" kiểm chứng việc
này bằng cách chèn 1 dòng trùng khóa chính rồi kỳ vọng dữ liệu cũ còn nguyên.

### 3.3 Kiểm tra frontend không cần trình duyệt

Không xem được ảnh/nên mở browser, nhưng vẫn bắt được lỗi tĩnh:

- `node --check public/app.js` — bắt lỗi cú pháp ES module.
- Đối chiếu mọi `querySelector("#id")` trong JS với `id="..."` trong HTML — phát
  hiện id gõ sai (đã bắt được `#cancel-gold-price` thiếu trong HTML).
- Đối chiếu class gán động trong JS với class định nghĩa trong CSS.
- Đếm cân bằng thẻ HTML (`<div>`/`</div>`, `<dialog>`...) và ngoặc nhọn CSS.
- Kiểm tra `data-tab` khớp `id="tab-..."`.

Các script nhỏ này thay cho việc mở trình duyệt và chạy nhanh hơn nhiều.

### 3.4 Bẫy tiến trình server cũ chiếm cổng

Khi smoke test, một tiến trình `node src/server.js` cũ vẫn giữ cổng và **phục vụ
code cũ** (chưa có route `/backup`) → request mới trả 404 "Route not found" dù code
đã đúng. Dấu hiệu: log server in "Server running" nhưng hành vi như code cũ.

Cách xử lý: dọn sạch trước khi test —

```bash
pkill -f "node src/server.js"
lsof -nP -iTCP:4010 -sTCP:LISTEN   # xác nhận cổng trống
```

Và chạy server với **DB_PATH tạm** (`/tmp/smoke.db`) để không đụng dữ liệu thật.

### Điểm dừng Phase 3

- [x] 6 tab: Tổng quan, Giao dịch, Chuyển khoản, Tài sản, Mục tiêu, Quản lý
- [x] Tổng quan: hero tổng tài sản + bar 6 tháng + donut theo danh mục
- [x] Tài sản: nhóm theo loại, CRUD vàng, giá vàng + nhập tay, bảng tỷ giá sửa được
- [x] Mục tiêu: tiến độ, CRUD goal, đóng góp (thêm/xóa)
- [x] Gợi ý tên giao dịch bằng datalist
- [x] Xuất/nhập JSON: `GET /backup` + `POST /backup` (transaction, FK-safe)
- [x] 118 test xanh (thêm 6 test backup roundtrip/rollback)

**Tự kiểm tra hiểu bài**:
1. Vì sao phải gọi `chart.destroy()` trước khi vẽ lại chart mới trên cùng canvas?
2. Khi restore, vì sao xóa bảng con trước bảng cha? Ngược lại thì lỗi gì?
3. Làm sao bọc restore để lỗi giữa đường không làm hỏng dữ liệu?
4. Vì sao phải `pkill` server cũ trước khi smoke test?

## Phase 4 — Hardening & test

### 4.1 Coverage không nên là gate toàn cục cho `npm test`

Jest `coverageThreshold` chỉ được kiểm tra khi có cờ `--coverage`. Nếu nhét
threshold vào cấu hình mà `npm test` không bật coverage, threshold vô tác dụng
và gây ảo giác "đã có gate". Cách làm sạch: giữ `npm test` nhanh (không coverage)
để chạy liên tục, tách `npm run test:coverage` bật `--coverage` + threshold. Như
vậy dev loop vẫn nhẹ, còn gate chạy khi kết thúc phase / trước PR.

### 4.2 Đo coverage trước khi viết test, đừng đoán

Baseline cho thấy `transactionService` ~60% và `transferService` ~75% — thấp hơn
hẳn phần còn lại. Nhìn vào `Uncovered Line #s` trong báo cáo để biết chính xác
thiếu nhánh nào (validation, filter, nhánh `not found`), thay vì viết test tràn
lan. Chỉ cần phủ đúng các nhánh đó là service lên 100%.

### 4.3 Lỗi frontend phải nhìn thấy được, đừng `catch` rồi im

Code cũ `catch (err) { console.error(err); }` làm chart/CDN chết trong im lặng —
người dùng chỉ thấy khung trống và tưởng app hỏng. Fix: 1 toast dùng chung
(`showToast`) + helper `safe(task)` bọc mọi loader, và fallback hiển thị chữ
trong chính chỗ canvas. Nguyên tắc: **lỗi tải dữ liệu luôn có phản hồi thị
giác**, không chỉ log console.

### 4.4 Fallback cho tài nguyên ngoài (CDN)

Chart.js tải qua CDN có thể fail (offline, chặn mạng). Phải bọc riêng từng chart
trong `try/catch` để 1 chart lỗi không kéo đổ chart kia, và thay canvas bằng
`.chart-fallback` có thông báo. Không để `await` CDN làm sập cả `renderCharts`.

### 4.5 Bug do tiến trình server cũ (nhắc lại lần 2)

User báo "chưa thấy chart" dù code đã có. Nguyên nhân hàng đầu vẫn là **tiến
trình `node` cũ giữ cổng** phục vụ bundle cũ, hoặc **cache trình duyệt**. Trước
khi sửa code, luôn xác minh server đang phục vụ bản mới (`curl /app.js` xem có
hàm mới không) và yêu cầu hard refresh. Tránh sửa code khi lỗi chỉ là môi trường.

### Điểm dừng Phase 4

- [x] Toast lỗi tiếng Việt dùng chung (`showToast`) + helper `safe(task)`
- [x] Fallback chart khi CDN lỗi (`.chart-fallback`, bọc riêng từng chart)
- [x] `npm run test:coverage` + threshold 80/70/80/80 trong `package.json`
- [x] Edge-case tests: validation giao dịch, filter, update/delete 404, chuyển
      khoản (thiếu tài khoản, tỷ giá ≤ 0, status lạ, thiếu ngày/số nhận, số dư
      không đủ khi hoàn tất), `getTransfers`/`getTransferById`
- [x] 143 test xanh; all files 93.29% stmts / 81.26% branch / 100% funcs / 93.24% lines
- [x] `docs/QA-CHECKLIST.md` cho kiểm tra tay mobile + desktop

**Tự kiểm tra hiểu bài**:
1. Vì sao `coverageThreshold` không chặn `npm test` mà chỉ chặn `test:coverage`?
2. Nhìn cột `Uncovered Line #s` để chọn test nhanh hơn "đoán mù" như thế nào?
3. Vì sao bọc riêng từng chart trong `try/catch` thay vì bọc chung `renderCharts`?
4. Khi user báo UI không đổi, vì sao phải kiểm tra tiến trình server + cache
   trước khi sửa code?

