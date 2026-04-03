# Domain Setup — myinsta.hyzen.pro

## Overview
- VPS IP: `18.232.64.195`
- Subdomain: `myinsta.hyzen.pro`
- App runs on: `localhost:3000` (PM2)
- Goal: serve on `https://myinsta.hyzen.pro`

---

## Step 1 — DNS Record

Go to your DNS provider (Cloudflare / GoDaddy / Namecheap — wherever hyzen.pro is managed).

Add this record:

```
Type  : A
Name  : myinsta
Value : 18.232.64.195
TTL   : Auto (or 300)
```

> Wait 2–5 minutes before continuing. You can verify propagation with:
> https://dnschecker.org/#A/myinsta.hyzen.pro

---

## Step 2 — SSH into VPS

```bash
ssh ubuntu@18.232.64.195
```

---

## Step 3 — Pull Latest Code & Restart App

```bash
cd ~/myinsta
git pull
pm2 restart myinsta
```

---

## Step 4 — Install Nginx (if not already installed)

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Step 5 — Write Nginx Config

```bash
sudo nano /etc/nginx/sites-available/myinsta
```

Paste this entire block (replace any existing content):

```nginx
server {
    listen 80;
    server_name myinsta.hyzen.pro;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`

---

## Step 6 — Enable the Config

```bash
sudo ln -sf /etc/nginx/sites-available/myinsta /etc/nginx/sites-enabled/myinsta
```

Remove the default nginx page (avoids conflicts):

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Expected output for `nginx -t`:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## Step 7 — Free SSL Certificate (HTTPS)

Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx -y
```

Get the certificate:

```bash
sudo certbot --nginx -d myinsta.hyzen.pro
```

Follow the prompts:
1. Enter your email address
2. Type `Y` to agree to terms
3. Type `N` or `Y` for email sharing (doesn't matter)
4. Certbot will automatically update nginx to redirect HTTP → HTTPS

Test auto-renewal (dry run):

```bash
sudo certbot renew --dry-run
```

---

## Step 8 — Open Ports in AWS Security Group

Go to: **AWS Console → EC2 → Instances → your instance → Security → Security Groups → Edit Inbound Rules**

Make sure these rules exist:

| Type  | Protocol | Port | Source    |
|-------|----------|------|-----------|
| HTTP  | TCP      | 80   | 0.0.0.0/0 |
| HTTPS | TCP      | 443  | 0.0.0.0/0 |
| SSH   | TCP      | 22   | your IP   |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | ← only if you still want direct :3000 access |

---

## Step 9 — Verify Everything Works

```bash
# Check nginx is running
sudo systemctl status nginx

# Check app is running
pm2 status

# Check app logs
pm2 logs myinsta --lines 20

# Test the API is accessible
curl http://localhost:3000/api/pending
```

Then open your browser: `https://myinsta.hyzen.pro`

---

## PM2 — Useful Commands

```bash
pm2 status                  # see all running apps
pm2 restart myinsta         # restart after git pull
pm2 logs myinsta            # live logs
pm2 logs myinsta --lines 50 # last 50 log lines
pm2 stop myinsta            # stop app
pm2 start server.js --name myinsta  # start fresh if needed
pm2 save                    # save process list (survives reboot)
pm2 startup                 # print the systemd command to run once
```

---

## Nginx — Useful Commands

```bash
sudo nginx -t                    # test config syntax
sudo systemctl reload nginx      # reload config (no downtime)
sudo systemctl restart nginx     # full restart
sudo systemctl status nginx      # check status
sudo tail -f /var/log/nginx/error.log   # live error logs
sudo tail -f /var/log/nginx/access.log  # live access logs
```

---

## Full Deploy Workflow (after every code change)

```bash
# On Windows (local machine):
git add -A
git commit -m "your message"
git push

# On VPS:
cd ~/myinsta
git pull
pm2 restart myinsta
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Site not loading | Check `pm2 status` — app must be `online` |
| 502 Bad Gateway | App crashed — run `pm2 logs myinsta` to see error |
| SSL cert failed | Confirm DNS A record is pointing to the right IP first |
| "Failed to load" in Pending Users | Make sure you ran `git pull && pm2 restart myinsta` on VPS |
| nginx -t fails | Check syntax in `/etc/nginx/sites-available/myinsta` |
| Port 3000 still needed | Keep it open in AWS Security Group if you ssh-tunnel |
