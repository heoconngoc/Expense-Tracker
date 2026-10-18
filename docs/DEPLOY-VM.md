# DEPLOY VM — Runbook từng bước (Azure + CD)

Tài liệu này là bản "cầm tay chỉ việc" để đưa app lên Azure VM và bật tự động
deploy. Chi tiết nền tảng xem thêm mục **Deployment** trong `README.md`.

Quy ước:

- `# trên máy Mac` — chạy ở máy bạn.
- `# trên VM` — SSH vào VM rồi chạy: `ssh -i ~/.ssh/expense-tracker-key.pem azureuser@<PUBLIC_IP>`.
- `<PUBLIC_IP>` — IP công khai của VM (xem trong Azure portal, trang Overview).

Sơ đồ chạy trên VM:

```text
Browser
  │  HTTP(S) + basic auth
  ▼
nginx (80/443)
  ▼
pm2 ──► node src/server.js (3000)
  ▼
/var/lib/expense-tracker/expense.db     ← dữ liệu (KHÔNG nằm trong thư mục deploy)
/var/lib/expense-tracker/backups/       ← backup .db.gz hằng đêm
```

---

## Trạng thái các bước

- [x] **Bước 1–4** — Tạo VM, cài Node 24 + pm2 + nginx + sqlite3 + rsync, tạo
      thư mục `/var/lib/expense-tracker` và `/var/www/expense-tracker`.
- [x] **Bước 5** — Thêm 3 GitHub Secrets (`AZURE_SSH_HOST`, `AZURE_SSH_USER`,
      `AZURE_SSH_KEY`).
- [ ] **Bước 6** — Merge `develop` → `main` để kích hoạt Deploy.
- [ ] **Bước 7** — nginx reverse proxy + basic auth.
- [ ] **Bước 8** — Backup DB tự động hằng đêm.
- [ ] **Bước 9** — Kiểm tra cuối.

---

## Bước 6 — Merge develop → main (làm trên web GitHub)

1. Mở https://github.com/heoconngoc/expense-tracker/pulls
2. **New pull request** → **base: `main`** ← **compare: `develop`**.
3. Title gợi ý: `Phase 5: Azure VM deploy + CD` → **Create pull request**.
4. Đợi check **CI / test** xanh (~30 giây).
5. **Merge pull request** → **Confirm merge**.

Sau khi merge, GitHub tự chạy:

- **CI** trên `main` (nhánh đích)
- CI xanh → workflow **Deploy** chạy: rsync code lên VM → `npm ci --omit=dev` → pm2

Theo dõi ở tab **Actions**. Nếu workflow đỏ, xem log rồi gửi lại để debug.

### Kiểm tra nhanh sau khi Deploy xanh (trên VM)

```bash
pm2 status                      # expense-tracker phải "online"
pm2 logs expense-tracker --lines 30
curl -I http://127.0.0.1:3000   # phải HTTP/1.1 200 (chưa cần nginx)
```

Nếu `curl 127.0.0.1:3000` ra **200** là app đã chạy → sang Bước 7.

---

## Bước 7 — nginx reverse proxy + basic auth

Mục đích: nginx đứng trước, chuyển tiếp cổng 80 → `127.0.0.1:3000`, và bắt đăng
nhập (basic auth) để không ai vào bừa.

### 7.1. Kiểm tra nginx đang chạy (trên VM)

```bash
systemctl status nginx --no-pager
```

### 7.2. Bật site config (trên VM)

```bash
sudo cp /var/www/expense-tracker/deploy/nginx.conf /etc/nginx/sites-available/expense-tracker
sudo ln -sf /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/expense-tracker
sudo rm -f /etc/nginx/sites-enabled/default
```

- `cp`: đưa file cấu hình vào `sites-available`.
- `ln -sf`: bật site (symlink sang `sites-enabled`), `-f` ghi đè nếu có sẵn.
- `rm .../default`: tắt trang mặc định của nginx để nó không chiếm cổng 80.

### 7.3. Tạo user/mật khẩu đăng nhập (trên VM)

```bash
sudo htpasswd -c /etc/nginx/.htpasswd yourname
```

Thay `yourname` bằng tên bạn muốn; sẽ hỏi mật khẩu 2 lần.

- `-c` = tạo mới file. **Chỉ dùng lần đầu**; thêm user sau thì bỏ `-c`.
- Nếu báo `htpasswd: command not found`: `sudo apt install -y apache2-utils`.

### 7.4. Kiểm tra cú pháp và nạp lại (trên VM)

```bash
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` phải in `syntax is ok` + `test is successful`, rồi mới `reload`.

### 7.5. Kiểm tra

- Trên VM: `curl -I http://127.0.0.1` → phải trả **401 Unauthorized** (đúng, vì
  chưa nhập mật khẩu) → basic auth đang hoạt động.
- Trên máy bạn: mở `http://<PUBLIC_IP>` → hiện popup đăng nhập → nhập `yourname`
  + mật khẩu → vào app.

### 7.6. (Tùy chọn) HTTPS

Chỉ khi bạn có domain đã trỏ A record về IP của VM:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot tự sửa config nginx và tự gia hạn chứng chỉ.

---

## Bước 8 — Backup DB tự động hằng đêm

Mục đích: mỗi đêm dump DB (an toàn với WAL) → nén gzip → giữ 7 ngày.

### 8.1. Chạy thử 1 lần (trên VM)

```bash
DB_PATH=/var/lib/expense-tracker/expense.db \
BACKUP_DIR=/var/lib/expense-tracker/backups \
/var/www/expense-tracker/deploy/backup-db.sh

ls -lh /var/lib/expense-tracker/backups
```

Phải thấy dòng `Backup written: ...` và 1 file `expense-<ngày-giờ>.db.gz`.

### 8.2. Cài cron chạy 03:00 mỗi ngày (trên VM)

```bash
( crontab -l 2>/dev/null; \
  echo '0 3 * * * DB_PATH=/var/lib/expense-tracker/expense.db BACKUP_DIR=/var/lib/expense-tracker/backups /var/www/expense-tracker/deploy/backup-db.sh >> /var/log/expense-backup.log 2>&1' \
) | crontab -
```

- Lấy cron hiện có (`crontab -l`) rồi thêm 1 dòng, không ghi đè cron cũ.
- `0 3 * * *` = 03:00 mỗi ngày; log ghi vào `/var/log/expense-backup.log`.

### 8.3. Kiểm tra đã cài (trên VM)

```bash
crontab -l
```

Phải thấy dòng `0 3 * * * ...`.

> Nếu cron không ghi được log do quyền, đổi đích log sang `$HOME/expense-backup.log`.

### 8.4. (Tùy chọn) Khôi phục từ backup

```bash
cd /var/lib/expense-tracker/backups
gunzip -k expense-YYYY-MM-DD-HHMMSS.db.gz
pm2 stop expense-tracker
cp expense-YYYY-MM-DD-HHMMSS.db /var/lib/expense-tracker/expense.db
rm -f /var/lib/expense-tracker/expense.db-wal /var/lib/expense-tracker/expense.db-shm
pm2 start expense-tracker
```

Hoặc dùng tính năng **Xuất/Nhập JSON** trong tab *Quản lý* của app.

---

## Bước 9 — Kiểm tra cuối

1. Mở `http://<PUBLIC_IP>` (hoặc domain) → đăng nhập basic auth → app hiện ra.
2. Thêm 1 giao dịch bất kỳ.
3. Push 1 commit vào `develop`, mở PR merge `main`.
4. ~2 phút sau, tải lại app → thấy bản mới, **dữ liệu vẫn còn**.

---

## Troubleshooting

```bash
pm2 status                              # app có online không
pm2 logs expense-tracker --lines 50     # log app
sudo nginx -t                           # cú pháp nginx
sudo tail -50 /var/log/nginx/error.log  # log nginx
curl -I http://127.0.0.1:3000           # app trực tiếp (không qua nginx)
```

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Popup đăng nhập không hiện | Chưa tạo `/etc/nginx/.htpasswd` hoặc chưa reload nginx |
| **502 Bad Gateway** | App chưa chạy / pm2 lỗi → `pm2 status`, `pm2 logs` |
| Deploy đỏ ở `npm ci` | `package-lock.json` lệch với `package.json` (chạy `npm install` rồi commit) |
| Deploy đỏ ở SSH | Sai `AZURE_SSH_*` secret, hoặc NSG chưa mở cổng 22 |
| Mất dữ liệu sau deploy | DB đang nằm trong thư mục deploy thay vì `/var/lib/...` |
