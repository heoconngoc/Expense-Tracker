# Kế hoạch nâng cấp Expense Tracker

> Tài liệu sống (living document). Cập nhật khi kế hoạch thay đổi.
> Bài học đi kèm: [LESSONS.md](./LESSONS.md)

## 1. Bối cảnh & Vấn đề

App hiện tại là sổ chi tiêu full-stack (Express + SQLite + vanilla JS) với 4 tab:
Tổng quan, Giao dịch, Chuyển khoản, Quản lý. Code backend vững (service layer,
kiểm tiền integer, transaction), nhưng:

- **Thiếu tính năng quan trọng**: không có tổng tài sản, không biết "tiền đi đâu",
  không có mục tiêu tiết kiệm, không theo dõi vàng.
- **UI chung chung**: indigo + card trắng bo tròn — đúng kiểu UI mặc định của
  AI/tool builder, thiếu cá tính, thiếu cảm giác "sổ tay tài chính thật".
- **Chưa lên được web**: mỗi lần dùng phải chạy `npm start` trên máy.

## 2. Quyết định đã chốt

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Kiến trúc | Giữ nguyên Express + SQLite | Backend hiện tại tốt, không viết lại |
| Hosting | Azure VM B1S (Azure for Students) | Miễn phí 12 tháng, gia hạn mỗi năm khi còn là sinh viên; SQLite trên đĩa thật; luôn chạy 24/7 |
| CI/CD | GitHub Actions | Miễn phí với GitHub student; push → test → tự deploy |
| Đa loại tiền | Giữ USD/VND | Đã hoạt động tốt |
| API giá vàng | `giavang.now` (miễn phí, CORS) + nhập tay fallback | API miễn phí không ổn định vĩnh viễn, cần đường lui |
| UI | Phong cách "Sổ tay tài chính ấm áp" | Cá tính, ấm áp, chân thực; mobile + desktop ngang nhau |
| Frontend | Giữ vanilla JS, không framework | Quen thuộc, không tăng độ phức tạp |
| Tab Chuyển khoản | **GIỮ NGUYÊN** | Người dùng vẫn cần |
| Tab Quản lý CRUD | **GIỮ NGUYÊN** | Người dùng vẫn cần |

## 3. Phạm vi tính năng

### 3.1 Giữ nguyên (không đụng tới logic)

- Tab Chuyển khoản: API `/api/transfers`, `transferService`, UI dialog
- Tab Quản lý CRUD: tài khoản, danh mục, tiền tệ
- Toàn bộ logic tiền integer minor units, atomic balance updates, archive-preserving history

### 3.2 Thêm mới

| Tính năng | Mô tả |
|---|---|
| **Tài sản** (tab mới) | Tổng tài sản quy về VND = tiền (mọi tài khoản, quy đổi tỷ giá) + giá trị vàng. Tài khoản phân loại: `spending` (chi tiêu) / `savings` (tiết kiệm) / `gold` (vàng). Vàng: nhập số lượng (chỉ/lượng/lưu ký), tự nhân giá SJC |
| **Mục tiêu tiết kiệm** (tab mới) | Đặt tên mục tiêu + số tiền目标 + hạn (tùy chọn), ghi nhận đóng góp, bar tiến độ visual |
| **Tổng quan** (cải thiện) | Card tổng tài sản lớn (số sao của trang), biểu đồ cột chi tiêu 6 tháng gần nhất (Chart.js), biểu đồ tròn chi tiêu theo danh mục trong tháng |
| **Giao dịch** (cải thiện) | Form nhập nhanh: gợi ý danh mục/tài khoản dùng nhiều lần trước (datalist) |
| **Giá vàng** | Backend proxy endpoint cache giá SJC từ `giavang.now`, fallback nhập tay trong Cài đặt |
| **Xuất/nhập JSON** | Backup toàn bộ data ra file, khôi phục khi cần |

### 3.3 Kết cấu tab sau nâng cấp

```
Tổng quan | Giao dịch | Chuyển khoản | Tài sản | Mục tiêu tiết kiệm | Quản lý
```

6 tab. Nếu về sau cảm thấy nhiều, có thể gộp Mục tiêu tiết kiệm vào Tài sản —
quyết định sau khi dùng thực tế.

## 4. Phong cách UI: "Sổ tay tài chính ấm áp"

### 4.1 Design tokens

```
--paper:      #faf6ef   /* nền giấy kem */
--paper-2:    #f3ede1   /* nền phụ, sidebar */
--ink:        #2d2a26   /* chữ chính, màu mực */
--ink-soft:   #6b645c   /* chữ phụ */
--line:       #e0d6c8   /* viền mảnh kiểu kẻ ô sổ */

--moss:       #3d5a4c   /* xanh rêu — accent chính */
--moss-soft:  #e6ede8

--clay:       #b45a3c   /* đất nung — chi tiêu */
--clay-soft:  #f6e8e2

--ochre:      #c4922a   /* vàng đất — nhấn, vàng SJC, tiến độ */
--ochre-soft: #f7efd9

--leaf:       #4a7c59   /* xanh lá — thu nhập */
```

### 4.2 Nguyên tắc

1. **Số tiền là ngôi sao**: số tổng to, đậm, `font-variant-numeric: tabular-nums`
   (số thẳng cột, không nhảy khi animate). Font serif cho số lớn:
   `"Fraunces", "Newsreader", Georgia, serif`.
2. **Font pairing**: Fraunces/Newsreader (số + tiêu đề) + Inter (nội dung).
   Google Fonts, có fallback system-ui để app vẫn chạy offline.
3. **Viền mảnh, không shadow nặng**: kiểu kẻ ô sổ (`--line` 1px), card nền
   `--paper` chênh nhẹ với nền trang. Shadow chỉ dùng rất nhẹ cho dialog.
4. **Chân thực**: nhãn kiểu viết hoa nhẹ letter-spacing rộng (như tiêu đề mục
   trong sổ), icon inline SVG nét mảnh, không emoji icon library.
5. **Không indigo**: loại bỏ hoàn toàn `#4f46e5` và họ xanh tím.
6. **Motion tiết chế**: transition 150-200ms, chỉ cho hover/tab/dialog. Không
   animating number kiểu fintech.

### 4.3 Responsive (mobile + desktop ngang nhau)

- **Mobile (<640px)**: navigation chuyển xuống thanh đáy (bottom bar) kiểu app
  mobile thật, 6 icon nhỏ. Form nhập 1 tay được: nút chính ở đáy, input to.
- **Tablet (640-1024px)**: 2 cột card, nav tab ngang trên.
- **Desktop (>1024px)**: container rộng hơn (1200px), dashboard 3 cột,
  sidebar filter cho trang Giao dịch.

### 4.4 Quy tắc chi tiết

- Touch target ≥ 44px trên mobile
- Focus ring visible (accessibility): outline 2px `--moss`
- Label input to rõ (≥14px), placeholder không thay thế label
- Thông báo lỗi gần field lỗi, tiếng Việt, cụ thể ("Số tiền phải lớn hơn 0")

## 5. Lộ trình phát triển theo Phase

### Phase 0 — Nền móng

**Mục tiêu**: quy ước + CI chạy được, mọi việc sau này có kỷ luật.

- [x] Tạo `docs/PLAN.md`, `docs/LESSONS.md`
- [x] Quy ước code + cấu trúc thư mục (mục 6 below)
- [x] GitHub Actions CI: chạy `npm test` trên mỗi push/PR vào `main` và `develop`
- [x] Tạo nhánh `develop`, mọi feature làm trên đó, PR về `main`

**Điều kiện hoàn thành**: CI xanh trên GitHub, nhánh `develop` tồn tại.

### Phase 1 — Design system

**Mục tiêu**: thay skin toàn app, chưa thêm tính năng mới.

- [x] Tokens CSS mới trong `public/styles.css` (mục 4.1), xóa bộ indigo
- [x] Đổi font: Google Fonts link trong `index.html` + fallback
- [x] Restyle: header, tab, card, button, form, dialog, table, badge theo 4.2
- [x] Responsive: bottom nav mobile, breakpoints 640/1024
- [ ] Checklist tay: mobile 375px, desktop 1440px, dark? (không làm dark mode v1)

**Điều kiện hoàn thành**: toàn bộ tab cũ (Tổng quan/Giao dịch/Chuyển khoản/Quản lý)
trông mới, không còn màu indigo, dùng được trên điện thoại.

### Phase 2 — Backend: data model + API mới

**Mục tiêu**: schema + API phục vụ tính năng mới. Không đụng logic cũ.

- [ ] Migration `002_asset_features.sql`:
  - `accounts.type TEXT NOT NULL DEFAULT 'spending' CHECK(type IN ('spending','savings','gold'))`
  - `gold_holdings(id, account_id, quantity, unit CHECK IN ('chi','luong','luu_ky'), note, created_at)` — unit: 1 lượng = 10 chỉ
  - `savings_goals(id, name, target_amount, currency_id, deadline, archived, created_at)`
  - `savings_contributions(id, goal_id, amount, note, created_at)`
  - bảng `app_settings` mở rộng: key `manual_gold_price_vnd_per_luong`, `last_gold_price_source`, `last_gold_price_fetched_at`
- [ ] Migration script có guard: backup `expense.db` trước khi chạy
- [ ] API mới:
  - `GET /api/assets` — tổng tài sản quy VND: sum accounts theo loại + gold_holdings × giá
  - `GET /api/gold-prices/current` — proxy cache giá SJC (TTL 30 phút) từ `giavang.now`, fallback đọc manual price
  - `PUT /api/settings/gold-price` — lưu giá vàng tay
  - Resources CRUD: `gold-holdings`, `savings-goals` (+ `POST /:id/contributions`)
  - `GET /api/dashboard/summary?month=` mở rộng: trả thêm data cho biểu đồ
    (chi tiêu theo danh mục, 6 tháng gần nhất)
- [ ] Unit test Jest cho: migration, gold price service (mock fetch), assets aggregation, savings goals math
- [ ] API test supertest cho endpoints mới

**Điều kiện hoàn thành**: `npm test` xanh, test mới pass, API cũ không đổi
behavior (test cũ không sửa, trừ khi cần thêm field).

### Phase 3 — Frontend tính năng mới

**Mục tiêu**: 2 tab mới + dashboard biểu đồ, hoạt động thật trên dữ liệu thật.

- [ ] Module `public/js/` tách theo tab (bắt đầu tái cấu trúc app.js khi chạm tới)
- [ ] Tab **Tổng quan** mới:
  - Hero card: Tổng tài sản (số to), breakdown tiền vs vàng
  - Chart.js bar: chi tiêu 6 tháng gần nhất
  - Chart.js donut: chi tiêu theo danh mục tháng này
- [ ] Tab **Tài sản**: danh sách account theo nhóm 3 loại, form CRUD gold_holdings,
  giá vàng hiện tại + thời điểm cập nhật, nhập tay khi API lỗi
- [ ] Tab **Mục tiêu tiết kiệm**: danh sách goal + bar tiến độ, form tạo goal,
  form đóng góp nhanh
- [ ] Tab **Giao dịch**: datalist gợi ý danh mục/tài khoản (lấy top dùng nhiều)
- [ ] Module vàng frontend: fetch `/api/gold-prices/current`, fallback form nhập
- [ ] Xuất/nhập JSON trong tab Quản lý (backup/restore toàn bộ)
- [ ] Chart.js qua CDN, lazy-load chỉ khi mở tab có biểu đồ

**Điều kiện hoàn thành**: nhập dữ liệu thật → thấy biểu đồ, tổng tài sản, tiến độ
mục tiêu cập nhật. Checklist tay mobile+desktop.

### Phase 4 — Hardening & test (xen kẽ các phase khác)

- [ ] Coverage business logic ≥ 80% (services, không tính routes thin wrapper)
- [ ] Test edge cases: tỷ giá = 0, giá vàng API timeout, goal đạt 100%,
  giao dịch âm, chuyển khoản đa tiền tệ
- [ ] UI test checklist tay mỗi khi đổi UI (lưu trong `docs/QA-CHECKLIST.md`)
- [ ] Error handling nhất quán: mọi fetch frontend đều có catch + toast lỗi tiếng Việt

### Phase 5 — Deploy Azure VM B1S + CD

**Mục tiêu**: app live trên internet, mỗi push tự deploy.

- [ ] Hướng dẫn chi tiết (trong README) từng bước:
  1. Đăng ký Azure for Students (email trường, cần xác minh sinh viên)
  2. Tạo VM Ubuntu 24.04 B1s trong portal Azure (region Southeast Asia — gần VN)
  3. SSH key auth (không dùng password)
  4. Cài Node LTS + pm2 + nginx (nginx làm reverse proxy + HTTPS Let's Encrypt)
- [ ] `ecosystem.config.js` cho pm2: `node src/server.js`, env `DB_PATH=/var/lib/expense-tracker/expense.db`
  (đĩa data riêng, không nằm trong thư mục deploy → không mất khi redeploy)
- [ ] Script backup DB: cron nightly `sqlite3 .backup` → gzip → thư mục backup,
  giữ 7 ngày
- [ ] GitHub Secrets: `AZURE_SSH_HOST`, `AZURE_SSH_USER`, `AZURE_SSH_KEY`
- [ ] `.github/workflows/deploy.yml`: sau khi CI xanh trên `main` → rsync code
  lên VM → `pm2 restart expense-tracker`
- [ ] Basic auth tầng nginx cho app cá nhân (tránh bot gõ bừa)
- [ ] Ghi bài học cho từng bước deploy

**Điều kiện hoàn thành**: truy cập `http://<ip-vm>` hoặc domain thấy app,
push code → 2 phút sau app tự cập nhật, DB sống qua redeploy (có backup).

## 6. Quy tắc code

1. **ESM** (`"type": "module"` trong package.json) — đã là chuẩn của repo.
2. **Không thêm comment** trừ khi logic thật sự ẩn. Tên hàm/biến tự giải thích được.
   (Comment tiếng Anh duy nhất cho pattern test Given/When/Then.)
3. **Layering nghiêm ngặt**: Route chỉ làm HTTP (parse req → gọi service → res).
   Business logic + SQL trong service. Không viết SQL trong route, không viết
   business logic trong frontend.
4. **Tiền = integer minor units**. Không bao giờ lưu float số tiền. Hàm
   `toMinors/formatMoney` là cửa ngõ duy nhất.
5. **AppError cho mọi lỗi business** — ném `{ code, message, status }`, để error
   middleware bắt. Không `res.status(400).json` rải rác trong service.
6. **Migration có version**, không sửa file migration cũ đã chạy — chỉ thêm file mới.
7. **Frontend vanilla JS**, tách module theo tab khi refactor (`public/js/`),
   mỗi module expose `init/render` rõ ràng. Không global pollution — dùng
   namespace object hoặc ES module (browser supports ESM qua `<script type="module">`).
8. **CSS**: mọi màu/spacing dùng design tokens (CSS variables). Tên class theo
   convention hiện có (kebab-case, mô tả vai trò). Mobile-first breakpoints.
9. **API nhất quán**: resource trả `{ data: [...] }` hoặc `{ data: {...} }`,
   lỗi trả `{ error: { code, message } }`.
10. **Secrets**: không commit `.env`, không commit SSH key. DB path cấu hình
    qua env `DB_PATH`.

## 7. Quy tắc test

1. **Business logic mới bắt buộc có test** trước khi merge. "Business logic" =
   mọi hàm trong `src/services/` có if/else tính toán, không chỉ pass-through.
2. **Pattern Given/When/Then** trong tên hoặc comment test:
   ```js
   test("Given transfer pending When complete Then balances update atomically", ...)
   ```
3. **`npm test` phải xanh trước khi push**. CI chặn PR red.
4. **Test isolation**: test dùng `DB_PATH=database/test.db`, `setup.js` xóa
   DB trước mỗi run. Không depend thứ tự test.
5. **Không test thứ không đáng test**: không snapshot HTML, không test library
   bên thứ ba (Chart.js), không test getter/setter rỗng.
6. **Mock fetch** cho module vàng/tỷ giá — test không phụ thuộc mạng.
7. **Coverage mục tiêu**: ≥80% lines cho `src/services/`. Không chạy coverage
   làm gate v1 (coi là chỉ dẫn, không chặn).

## 8. Definition of Done (mỗi phase)

Một phase chỉ được coi là xanh khi:

- [ ] Mọi mục trong checklist phase đó được đánh dấu `[x]`
- [ ] `npm test` pass trên máy local và trên CI
- [ ] UI kiểm tra tay trên mobile 375px VÀ desktop ≥1280px
- [ ] Không còn `console.log` debug thừa, không TODO treo vô chủ
- [ ] Ít nhất 1 bài học mới ghi vào `LESSONS.md`
- [ ] Commit message theo convention (`Add ...`, `Fix ...`, `Document ...`),
      push, CI xanh
- [ ] Nếu là phase deploy: app thật truy cập được, có backup

## 9. Chiến lược backup dữ liệu

| Tầng | Cách làm |
|---|---|
| Dev local | File `database/expense.db` nằm trong project, gitignore — tự sao lưu định kỳ bằng script `scripts/backup.sh` |
| Production (VM) | Cron nightly `.backup` (SQLite-safe, không copy file đang ghi), gzip, giữ 7 ngày trong `/var/lib/expense-tracker/backups/` |
| App-level | Nút Xuất JSON trong app — user tự backup khi muốn, import để khôi phục |
| Git | Code thì commit; **không bao giờ** commit file `.db` |

## 10. Rủi ro & Cách xử lý

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Azure student hết hạn / hết credit | Trung bình | App code viết để port dễ — sang sau có thể deploy Render/Railway/VM khác. DB là file SQLite, chỉ cần copy |
| API `giavang.now` chết/đổi format | Cao (API free) | Fallback nhập tay + abstraction `goldPriceService` để đổi nguồn API dễ |
| Mất DB trên VM | Thấp | Backup nightly + doc hướng dẫn restore |
| SQLite locking khi scale | Thấp (app 1 người) | Không cần xử lý — đúng bài cho SQLite |
| Scope creep (thêm tính năng lung tung) | Trung bình | Mọi thứ ngoài mục 3.2 ghi vào backlog, không làm giữa phase |

## 11. Backlog (ý tưởng để sau, không làm vội)

- Ngân sách theo danh mục + cảnh báo vượt
- Xuất Excel/CSV (thông qua JSON hiện có)
- Nhập giao dịch nhanh 1 chạm từ home screen
- Đơn vị tiền tự chọn khi nhập vàng (lượng/chỉ/lưu ký đều có, cần UX tốt hơn)
- PWA (thêm manifest + service worker để add vào home screen)
- Dark mode
