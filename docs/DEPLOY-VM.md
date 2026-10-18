# DEPLOY VM — Step-by-step runbook (Azure + CD)

This is a hands-on guide to get the app onto an Azure VM and turn on automatic
deploys. For the background, see the **Deployment** section in `README.md`.

Conventions:

- `# on your Mac` — run on your own machine.
- `# on the VM` — SSH in first, then run:
  `ssh -i ~/.ssh/expense-tracker-key.pem azureuser@<PUBLIC_IP>`.
- `<PUBLIC_IP>` — the VM's public IP (Azure portal, Overview page).

Runtime layout on the VM:

```text
                Browser
                   │
      ┌────────────┴────────────┐
      │ :80 (basic auth)        │ :8080 (public demo)
      ▼                         ▼
    nginx ─────────────────── nginx
      │                         │
      ▼                         ▼
pm2: expense-tracker      pm2: expense-tracker-demo
     node src/server.js        node src/server.js
       (3000)                    (3001)
      ▼                         ▼
/var/lib/expense-tracker/expense.db   ← data (NOT inside the deploy folder)
/var/lib/expense-tracker/demo.db      ← demo sample data (reset nightly)
/var/lib/expense-tracker/backups/     ← nightly .db.gz
```

---

## Step status

- [x] **Steps 1–4** — Create the VM, install Node 24 + pm2 + nginx + sqlite3 +
      rsync, create `/var/lib/expense-tracker` and `/var/www/expense-tracker`.
- [x] **Step 5** — Add the 3 GitHub Secrets (`AZURE_SSH_HOST`, `AZURE_SSH_USER`,
      `AZURE_SSH_KEY`).
- [x] **Step 6** — Merge `develop` → `main` to trigger Deploy.
- [x] **Step 7** — nginx reverse proxy + basic auth.
- [x] **Step 8** — Nightly database backup.
- [x] **Step 9** — Final verification.
- [ ] **Optional** — Public demo instance (port 8080) + nightly reset.

---

## Step 6 — Merge develop → main (on GitHub)

1. Open https://github.com/heoconngoc/expense-tracker/pulls
2. **New pull request** → **base: `main`** ← **compare: `develop`**.
3. Suggested title: `Deploy to Azure VM with CD` → **Create pull request**.
4. Wait for the **CI / test** check to pass (~30 seconds).
5. **Merge pull request** → **Confirm merge**.

After the merge GitHub runs, in order:

- **CI** on `main`
- If CI passes, the **Deploy** workflow runs: rsync the code to the VM →
  `npm ci --omit=dev` → pm2 reload.

Watch it under the **Actions** tab. If a workflow fails, read the log and fix
the cause.

### Quick check after Deploy passes (`# on the VM`)

```bash
pm2 status                      # expense-tracker must be "online"
pm2 logs expense-tracker --lines 30
curl -I http://127.0.0.1:3000   # must be HTTP/1.1 200 (before nginx)
```

If `curl 127.0.0.1:3000` returns **200**, the app is running → continue to Step 7.

---

## Step 7 — nginx reverse proxy + basic auth

Goal: nginx sits in front, forwards port 80 to `127.0.0.1:3000`, and requires a
login (basic auth) so nobody else can open it.

### 7.1. Check nginx is running (`# on the VM`)

```bash
systemctl status nginx --no-pager
```

### 7.2. Enable the site config (`# on the VM`)

```bash
sudo cp /var/www/expense-tracker/deploy/nginx.conf /etc/nginx/sites-available/expense-tracker
sudo ln -sf /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/expense-tracker
sudo rm -f /etc/nginx/sites-enabled/default
```

- `cp`: put the config file into `sites-available`.
- `ln -sf`: enable the site (symlink into `sites-enabled`); `-f` overwrites.
- `rm .../default`: disable the default nginx page so it does not take port 80.

### 7.3. Create the login (`# on the VM`)

```bash
sudo htpasswd -c /etc/nginx/.htpasswd yourname
```

Replace `yourname` with the username you want; it asks for a password twice.

- `-c` creates the file. **Use it only the first time**; omit `-c` to add users later.
- If you get `htpasswd: command not found`: `sudo apt install -y apache2-utils`.

### 7.4. Check the config and reload (`# on the VM`)

```bash
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` must print `syntax is ok` + `test is successful` before you reload.

### 7.5. Verify

- On the VM: `curl -I http://127.0.0.1` must return **401 Unauthorized** (correct,
  since no password was sent) → basic auth is working.
- On your machine: open `http://<PUBLIC_IP>` → a login popup appears → enter
  `yourname` + password → the app opens.

### 7.6. (Optional) HTTPS

Only if you have a domain with an A record pointing at the VM's IP:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot edits the nginx config for you and renews the certificate automatically.

---

## Step 8 — Nightly database backup

Goal: every night, dump the database (WAL-safe) → gzip → keep 7 days.

### 8.1. Run it once (`# on the VM`)

```bash
DB_PATH=/var/lib/expense-tracker/expense.db \
BACKUP_DIR=/var/lib/expense-tracker/backups \
/var/www/expense-tracker/deploy/backup-db.sh

ls -lh /var/lib/expense-tracker/backups
```

You should see `Backup written: ...` and one `expense-<date-time>.db.gz` file.

### 8.2. Install the cron job for 03:00 daily (`# on the VM`)

```bash
( crontab -l 2>/dev/null; \
  echo '0 3 * * * DB_PATH=/var/lib/expense-tracker/expense.db BACKUP_DIR=/var/lib/expense-tracker/backups /var/www/expense-tracker/deploy/backup-db.sh >> /var/log/expense-backup.log 2>&1' \
) | crontab -
```

- Reads the existing crontab (`crontab -l`) and appends one line without
  overwriting the rest.
- `0 3 * * *` = 03:00 daily; the log goes to `/var/log/expense-backup.log`.

### 8.3. Confirm it is installed (`# on the VM`)

```bash
crontab -l
```

### 8.4. (Optional) Restore from a backup

```bash
cd /var/lib/expense-tracker/backups
gunzip -k expense-YYYY-MM-DD-HHMMSS.db.gz
pm2 stop expense-tracker
cp expense-YYYY-MM-DD-HHMMSS.db /var/lib/expense-tracker/expense.db
rm -f /var/lib/expense-tracker/expense.db-wal /var/lib/expense-tracker/expense.db-shm
pm2 start expense-tracker
```

Or use the **JSON export/import** feature in the app's *Management* tab.

---

## Optional — Public demo instance

Goal: let guests try the app without a login, using sample data that resets
nightly, while your real data stays private.

The repo already defines everything: a second pm2 app
(`expense-tracker-demo`, port 3001, `SEED_SAMPLE=1`, database
`/var/lib/expense-tracker/demo.db`) and a second nginx server block on port
8080 with no basic auth. On the next deploy `pm2 startOrReload` starts both
apps automatically; the demo database is created and seeded on its first start.

You only need to expose port 8080 and load the nginx config:

1. **Open port 8080 in the Azure NSG** (Azure portal → your VM → Networking →
   Add inbound port rule): `Destination port ranges = 8080`, `Protocol = TCP`,
   `Action = Allow`. (Skip this and only you can reach the demo.)

2. **Load the nginx config** (`# on the VM`) — the demo block lives in the same
   file, so this is the same copy + reload as Step 7:

   ```bash
   sudo cp /var/www/expense-tracker/deploy/nginx.conf /etc/nginx/sites-available/expense-tracker
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Check both apps** (`# on the VM`):

   ```bash
   pm2 status                 # expense-tracker AND expense-tracker-demo online
   curl -I http://127.0.0.1:3001   # demo app → HTTP/1.1 200
   curl -I http://127.0.0.1:8080   # through nginx, no auth → 200 (not 401)
   ```

   From your machine: open `http://<PUBLIC_IP>:8080` → the app opens with sample
   data and no login.

4. **Reset the demo nightly** (03:30, after the 03:00 backup; `# on the VM`):

   ```bash
   ( crontab -l 2>/dev/null; \
     echo '30 3 * * * /var/www/expense-tracker/deploy/reset-demo-db.sh >> /var/log/expense-demo.log 2>&1' \
   ) | crontab -
   ```

   The script stops the demo app, deletes `demo.db`, and restarts it; the app
   then re-seeds the sample data. Run it once by hand to test:

   ```bash
   /var/www/expense-tracker/deploy/reset-demo-db.sh
   ```

---

## Step 9 — Final verification

1. Open `http://<PUBLIC_IP>` (or your domain) → log in via basic auth → the app
   appears.
2. Add any transaction.
3. Push one commit to `develop`, open a PR, and merge it into `main`.
4. About 2 minutes later, reload the app → you see the new version and the
   **data is still there**.

---

## Troubleshooting

```bash
pm2 status                              # is the app online?
pm2 logs expense-tracker --lines 50     # app logs
sudo nginx -t                           # nginx config check
sudo tail -50 /var/log/nginx/error.log  # nginx logs
curl -I http://127.0.0.1:3000           # the app directly (bypass nginx)
```

| Symptom | Likely cause |
|---|---|
| Login popup does not appear | `/etc/nginx/.htpasswd` missing, or nginx not reloaded |
| **502 Bad Gateway** | App not running / pm2 error → `pm2 status`, `pm2 logs` |
| Deploy fails at `npm ci` | `package-lock.json` out of sync with `package.json` (run `npm install`, commit) |
| Deploy fails at SSH | Wrong `AZURE_SSH_*` secret, or NSG does not allow port 22 |
| Data lost after deploy | Database was inside the deploy folder instead of `/var/lib/...` |
