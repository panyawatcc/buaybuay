# AdsPanda AI — Manual Install Guide (DEVELOPER ONLY)

**Version**: 1.2
**Date**: 2026-04-19
**Status**: 🔴 **DEVELOPER ONLY** — ใช้เฉพาะถ้าคุณ deploy ตาม CI/CD เอง หรือมี infra custom ที่ Quick Install ไม่รองรับ
**For**: ⚠️ Developers / agencies with custom infra — ต้องรู้ terminal + command line + debug error เป็น
**Estimated time**: 60-90 นาที (ถ้าไม่ติดปัญหา)
**Sister docs**: [Quick Install](/docs/quick-install) (RECOMMENDED — 1-click) · [AI_ASSISTED_INSTALL.md](./AI_ASSISTED_INSTALL.md) (BACKUP) · [CUSTOMER_GUIDE_v2.md](./CUSTOMER_GUIDE_v2.md) (overview + Decision Tree) · [TOS-v1.md](./TOS-v1.md) · [DPA-v1.md](./DPA-v1.md)

---

> 🚨 **หลักสูตรนี้ออกแบบสำหรับ developer ผู้รู้ command line**
>
> ถ้าคุณ **ไม่ใช่** นักพัฒนา (ไม่เคย `git clone`, ไม่คุ้น terminal, ไม่รู้จะ debug error ยังไง) — **ใช้ Quick Install แทน**:
>
> - ⚡ [Quick Install (1-click)](/docs/quick-install) — RECOMMENDED · ฟรี · ~90 วินาที · กดปุ่มเดียว
> - 🤖 [AI-Assisted Install](./AI_ASSISTED_INSTALL.md) — BACKUP · AI ทำให้หมด (~฿0-700/mo · 30 นาที)
> - 👉 **AdsPanda Setup Service** — AdsPanda ติดตั้งให้ทาง remote (฿2,000-5,000 one-time, 30 นาที — ดูราคาใน Decision Tree ด้านล่าง)

---

## ภาษาไทย

> 🌐 English summary อยู่ท้ายเอกสาร — [ข้ามไป English Summary](#english-summary)

## คุณคือใคร? (เลือก path ตามจริง — honest self-assessment)

### 👨‍💻 Developer / มีทีม IT → **Manual Install** (เอกสารนี้)

**Free · ~60-90 นาที · ใช้ skill command line**

Checklist — ถ้าตอบ ✓ ทุกข้อ = path นี้เหมาะกับคุณ:

- [ ] คุณรู้ว่า terminal คืออะไร + เปิดใช้งานได้
- [ ] คุณเคย `git clone`, `npm install`, หรือ command คล้ายๆ กัน
- [ ] คุณอ่าน error message ภาษาอังกฤษแล้วเริ่ม debug ได้เอง
- [ ] ถ้าเจอปัญหา คุณพร้อม Google / อ่าน doc เพิ่ม
- [ ] ยอมรับว่าเอกสารนี้ **ไม่มี screenshot** — ต้องอ่าน text + ทำตาม

→ **ถ้า 5/5 ✓** เลื่อนลงไป [ส่วนที่ 1: เตรียมตัว](#ส่วนที่-1-เตรียมตัว-15-30-นาที)

### 🤖 ไม่เคยใช้ command line → **AI-Assisted Install** (แนะนำ)

**~฿0-700/เดือน · ~30-45 นาที · AI ทำให้หมด**

- AI assistant (Claude Code / ChatGPT Plus / Cursor) ทำงานแทนคุณ ทุก step
- คุณแค่ copy 4 prompts + ตอบคำถาม AI + paste credentials จาก welcome message
- ถ้าติดปัญหา AI debug + อธิบาย + แนะนำ fix
- ปลอดภัยกว่า — AI ไม่รันคำสั่ง destructive โดยไม่ถาม

→ [AI_ASSISTED_INSTALL.md](./AI_ASSISTED_INSTALL.md)

### 💰 ไม่อยากจ่าย AI + ไม่รู้ command line → **AdsPanda Setup Service**

**One-time ฿2,000-5,000 · ~30 นาที · AdsPanda ทำให้**

- AdsPanda ติดตั้งให้ทาง remote (TeamViewer / AnyDesk)
- ~30 นาที เสร็จ + garansi ใช้งานได้จริง
- ติดต่อ: email `[SETUP-SERVICE]` ไป `mymint0840@gmail.com` — ระบุ domain + FB business info + brand name
- ราคายืนยันหลังคุยรายละเอียด (ช่วง ฿2,000-5,000 ขึ้นกับ scope + domain setup)

> 💡 **ตัดสินใจง่ายๆ**: ถ้าไม่แน่ใจ → **เริ่มด้วย AI-Assisted** ก่อน. ถ้ายาก → ย้ายมา Setup Service ได้ ถ้าสบาย → ย้ายไป Manual ได้. ไม่มี lock-in

---

คู่มือนี้ตั้งแต่บรรทัดนี้ลงไป **สมมติว่าคุณเลือก Manual Install** (👨‍💻 self-assessment ผ่าน 5/5) — ถ้ายังลังเล กลับขึ้นไปเลือกใหม่

---

## ส่วนที่ 1: เตรียมตัว (15-30 นาที)

### 🔴 จำเป็น 4 อย่าง

| # | อะไร | ราคา | สมัครที่ไหน | ใช้ทำอะไร |
|---|------|------|--------------|-----------|
| 1 | **Cloudflare account** | ฟรี | [dash.cloudflare.com](https://dash.cloudflare.com) | ที่ host ระบบ |
| 2 | **Anthropic API key** *(optional)* | ~฿35-200/เดือน (ตามใช้จริง) | [console.anthropic.com](https://console.anthropic.com) → API Keys | AI features (BYOK) — skip ได้ใน setup.sh, เพิ่มทีหลังเมื่อจะใช้ AI |
| 3 | **License key (JWT)** | one-time | email `[LICENSE-REQUEST]` ไป `mymint0840@gmail.com` | กุญแจเปิดใช้ |
| 4 | **Email** | ฟรี | ที่มีอยู่แล้ว | register + login |

**Total cost ลูกค้า**: **~฿35-200/เดือน** + license one-time (ไม่มี AI subscription cost)

> 🚨 **ทำไม API key ต้องเป็นของคุณเอง (BYOK)**: ตาม [DPA section 8](./DPA-v1.md) — AdsPanda AI ใช้ Anthropic Claude เป็น AI สำหรับ bot rule. Key ของคุณ → บิล Anthropic ตรง, ข้อมูลไม่ผ่าน AdsPanda AI store. AdsPanda AI brain ทำแค่ license validation + rate limit proxy เท่านั้น ไม่ persist body

> 💡 **Anthropic key เป็น OPTIONAL ตอน install** — App boot ได้ (dashboard, rules, FB campaign management ใช้ได้ปกติ) โดยไม่ต้องมี key. ต้องใช้ key เฉพาะ AI features (copywriter, rule-suggest, trend-spotter). ถ้ายังไม่พร้อม → กด Enter ตอน `setup.sh` ถาม → ใส่ทีหลังด้วย `bunx wrangler pages secret put ANTHROPIC_API_KEY --project-name {your-slug}`

### 🔵 ถ้าจะใช้ FB feature — เลือก 1 ใน 2 Option

ระบบทำงานได้โดยไม่ต้องผูก FB (dashboard / rule testing) แต่ถ้าจะ automate ad จริง ต้องเชื่อม Facebook:

#### 🅰️ Option A — ใช้ FB App ของ AdsPanda AI (แนะนำ — Easy, default)

- คุณ **ไม่ต้องสร้าง FB app เอง + ไม่ต้องเข้า developers.facebook.com เลย**
- AdsPanda AI auto-deliver ทุกอย่างตอนซื้อ license ผ่าน welcome message:
  1. เพิ่ม domain ของคุณเข้า FB App's Valid OAuth Redirect URIs
  2. ส่ง `FB_APP_ID` + `FB_APP_SECRET`
  3. ส่ง License JWT
  4. เชิญเข้า GitHub repo
- **Setup time**: ~5 นาที · **เหมาะกับ**: SME ทั่วไป

> 💡 **หลังซื้อ**: verify welcome email/LINE มี FB creds + License + GitHub invite ครบ ก่อน start Step 1 — ถ้าขาด email `[WELCOME-RESEND]` ไป `mymint0840@gmail.com` ก่อน (SLA 24 ชั่วโมง) ห้ามเริ่ม install ทั้งที่ของยังไม่ครบ

ฝั่ง FB ของคุณเอง (Option A): Business Manager + Page + Ad Account (ฟรีทั้งหมด — ผูกกับ Business Manager)

#### 🅱️ Option B — ใช้ FB App ของคุณเอง (Advanced)

- สร้าง FB app เอง: setup 15 นาที + รอ Meta review 2-7 วัน
- **เหมาะกับ**: agency / ทีม technical / อยากควบคุม 100%
- ขั้นตอน: [developers.facebook.com](https://developers.facebook.com) → Create App (Business) → เพิ่ม Facebook Login + Marketing API → OAuth Redirect URI `https://{YOUR-DOMAIN}.pages.dev/api/auth/callback` → request permissions (`ads_management`, `ads_read`, `business_management`, `pages_show_list`, `pages_read_engagement`) → submit App Review → copy `FB_APP_ID` + `FB_APP_SECRET` ใช้ที่ Step 3

### 🟢 ตัวเลือก

- **Custom domain** (~฿400/ปี) — ถ้าอยาก URL สวย
- **GitHub account** (ฟรี) — ต้องมี เพราะ AdsPanda AI ส่ง invite มา clone
- **Bun runtime** (ฟรี) — เร็วกว่า npm 3-5x

### ❌ ไม่ต้องมี

- ❌ AI subscription (Claude Pro / ChatGPT Plus / Cursor)
- ❌ ความรู้เขียน code — แค่ copy-paste command เป็น
- ❌ DevOps advanced — Wrangler CLI จัดการ infrastructure ให้

**ต้องเป็นคนที่**: copy-paste bash + `cd` folder + อ่าน error พอออก + มี dev friend on speed-dial ถ้าติดหนัก

---

> 💡 **เลือก path ที่เหมาะกับคุณ**
>
> | | AI-Assisted ([AI_ASSISTED_INSTALL.md](./AI_ASSISTED_INSTALL.md)) | Manual (เอกสารนี้) |
> |---|---|---|
> | **ต้องรู้ command line** | ❌ ไม่ต้อง | ✅ รู้ basic |
> | **เวลาติดตั้ง** | ~30-45 นาที | ~45-90 นาที |
> | **ค่าใช้จ่ายเพิ่ม** | ~฿0-700/เดือน (AI subscription) | ฿0 เพิ่มเติม |
> | **Control** | AI ทำให้ | คุณทำเอง เห็นทุก step |
> | **เหมาะกับ** | ลูกค้าใหม่ต่อ code | Developer / อยากเข้าใจระบบ |

---

## ส่วนที่ 1.5: ติดตั้งโปรแกรมที่จำเป็น (รายละเอียดทุก OS)

> 🚨 **อ่านส่วนนี้ให้จบก่อนข้ามไป Step 1** — ถ้าโปรแกรมยังไม่ครบ คำสั่ง `git clone` ใน Step 1 จะ error `git is not recognized` ทันที (เคสลูกค้าคนแรก 2026-04-18)
>
> ส่วนนี้เขียนแบบ **newbie-proof** — ถึงไม่เคยใช้ command line มาก่อน ก็ตามได้

### Overview — 4 required + 2 recommended + 2 already-have

**🔴 จำเป็น (4 อย่าง)** — ถ้าขาด 1 ตัว install fail:

| # | โปรแกรม | ใช้ทำอะไร |
|---|---------|-----------|
| 1 | **Git** | Download code จาก GitHub |
| 2 | **Node.js** (v18+) | รัน JavaScript runtime (มาพร้อม npm) |
| 3 | **npm** | Install dependencies — มากับ Node.js อัตโนมัติ ไม่ต้องลงแยก |
| 4 | **Wrangler CLI** | Deploy ไป Cloudflare — ลงหลัง Node.js ด้วย `npm install -g wrangler` |

**🟢 แนะนำ (optional)** — เร็วขึ้น แต่ใช้ default แทนได้:

| # | โปรแกรม | ใช้แทน | จาก |
|---|---------|--------|-----|
| 5 | **Bun** | npm (เร็วกว่า 5-10 เท่า) | [bun.sh](https://bun.sh) |
| 6 | **VS Code** | nano / vim (แก้ไฟล์ `.env` สวยกว่า) | [code.visualstudio.com](https://code.visualstudio.com) |

**⚪ มีอยู่แล้ว — ไม่ต้องลงเพิ่ม**: Terminal (มากับ OS) + Browser (Chrome/Safari/Firefox/Edge)

---

### 1️⃣ Git — Download Code จาก GitHub

#### 🪟 Windows

1. เปิด browser → ไปที่ [https://gitforwindows.org](https://gitforwindows.org)
2. คลิกปุ่ม **Download** (ปุ่มสีน้ำเงินใหญ่)
3. รอ download `.exe` เสร็จ (~50 MB)
4. **Double-click** ไฟล์ `.exe` ที่ download มา → installer จะเปิด (อาจมี Windows Defender ถาม "Do you want to allow this app..." → กด **Yes**)
5. กด **Next** ทุกหน้า (default options ถูกต้องทั้งหมด ไม่ต้องเปลี่ยน)
6. กด **Install** → รอจนเสร็จ (~2 นาที)
7. กด **Finish**
8. 🚨 **สำคัญ**: หลัง install ให้ใช้ **Git Bash** (ค้นหาใน Start menu พิมพ์ "Git Bash") — **อย่าใช้ Command Prompt (cmd.exe) หรือ PowerShell** เพราะ syntax ต่างกัน เอกสารนี้เขียนสำหรับ Git Bash
9. เช็ค: เปิด **Git Bash** → พิมพ์คำสั่ง `git --version` → ควรขึ้น `git version 2.x.x`

> 💡 **Tip**: Pin Git Bash ไว้ที่ taskbar (คลิกขวา icon → Pin to taskbar) — ใช้บ่อยในคู่มือนี้

#### 🍎 Mac

1. เปิด **Terminal** (กด **Cmd + Space** → พิมพ์ `Terminal` → กด Enter)
2. พิมพ์คำสั่ง: `xcode-select --install` → กด Enter
3. popup จะเด้ง ถามให้ยืนยัน → กด **Install**
4. รอ download + install ~5 นาที (มี progress bar)
5. เช็ค: พิมพ์ `git --version` → ควรขึ้น `git version 2.x.x`

> 💡 **Tip**: ถ้ามี **Homebrew** อยู่แล้ว ใช้ `brew install git` แทนได้ ได้ version ใหม่กว่า

#### 🐧 Linux (Ubuntu / Debian)

เปิด Terminal แล้วรัน:

```bash
sudo apt update
sudo apt install git -y
git --version
```

สำหรับ distro อื่น:

```bash
# Fedora / RHEL
sudo dnf install git -y

# Arch / Manjaro
sudo pacman -S git
```

---

### 2️⃣ Node.js — JavaScript Runtime (มาพร้อม npm)

#### 🪟 Windows + 🍎 Mac (ทางเดียวกัน)

1. เปิด browser → [https://nodejs.org](https://nodejs.org)
2. เห็น 2 ปุ่ม download — ดาวน์โหลด **LTS version** (ปุ่มสีเขียวด้านซ้าย ที่เขียน "Recommended for Most Users")
   - Windows: จะได้ไฟล์ `.msi`
   - Mac: จะได้ไฟล์ `.pkg`
3. **Double-click** ไฟล์ที่ download มา → installer เปิด
4. กด **Next** / **Continue** ทุกหน้า (default options OK)
5. ยอมรับ license → กด **Install**
6. ใส่ password ของเครื่องถ้าถูกถาม (Mac)
7. รอเสร็จ (~2-3 นาที) → กด **Finish** / **Close**
8. 🚨 **สำคัญ** (Windows): **ปิด Git Bash / Command Prompt / PowerShell ที่เปิดอยู่ทุกหน้าต่าง** → เปิดใหม่หลัง install เสร็จ (เพื่อให้ระบบ update PATH)
9. 🚨 **สำคัญ** (Mac): ปิด Terminal ทุกหน้าต่าง → เปิดใหม่
10. เช็ค:
    ```bash
    node --version    # ต้องขึ้น v20.x หรือสูงกว่า (ถ้าขึ้น v16 หรือ v18 ก็ OK แต่ v20 LTS ล่าสุดคือเบสต์)
    npm --version     # ต้องขึ้น 10.x
    ```

#### 🐧 Linux (Ubuntu / Debian)

Node.js จาก `apt` มักเป็น version เก่า — ใช้ **NodeSource** repo สำหรับ v20 LTS:

```bash
# เพิ่ม NodeSource repo + install Node v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# เช็ค version
node --version     # v20.x
npm --version      # 10.x
```

ถ้าต้องการ Node version อื่น (v18, v22) เปลี่ยน `setup_20.x` เป็น `setup_18.x` / `setup_22.x` แทน

---

### 3️⃣ Wrangler CLI — Deploy Tool

หลังลง Node.js เสร็จแล้ว (ข้อ 2 ข้างบน) เปิด Terminal / Git Bash แล้วรัน:

```bash
npm install -g wrangler
```

รอ ~1-2 นาที

⚠️ **Mac / Linux** อาจขึ้น permission error (`EACCES`) — ใช้ `sudo`:

```bash
sudo npm install -g wrangler
# จะถาม password ของเครื่อง → พิมพ์แล้ว Enter (ระหว่างพิมพ์จะไม่เห็น cursor กระพริบ — ปกติ)
```

⚠️ **Windows Git Bash** ไม่ต้องใช้ sudo

เช็ค:

```bash
wrangler --version    # ต้องขึ้น 3.x.x
```

---

### 🚨 ถ้าเจอ error `command not found` หรือ `is not recognized`

**สาเหตุ**: ลง program แล้ว แต่ Terminal ยัง "จำ" PATH ใหม่ไม่ได้

**วิธีแก้ตามลำดับ**:

1. **ปิด Terminal / Git Bash / Command Prompt ที่เปิดอยู่ทั้งหมด** (รวมหน้าต่างใน IDE ด้วย)
2. เปิด Terminal **ใหม่** (Windows: ใช้ **Git Bash** ห้ามใช้ cmd.exe)
3. ลอง command อีกครั้ง

**ยังไม่ work?**

- **Windows**: Restart computer แล้วเปิด Git Bash อีกครั้ง (Windows update PATH หลัง restart แน่นอน)
- **Mac**: รัน `source ~/.zshrc` (macOS 10.15+ ใช้ zsh default) หรือ `source ~/.bash_profile` (ถ้าใช้ bash)
- **Linux**: รัน `source ~/.bashrc` หรือ `source ~/.zshrc`

**ยังไม่ work?**

- ส่ง screenshot + OS version มาที่ [mymint0840@gmail.com](mailto:mymint0840@gmail.com) subject `[INSTALL-HELP]` — ตอบภายใน 7 วันทำการ

---

### 🔍 Pre-flight Check — ก่อนไป Step 1

เช็คว่าทุกโปรแกรมพร้อมก่อน clone repo:

```bash
git --version       # ต้องมี version (เช่น git version 2.45.x)
node --version      # ต้อง v18 ขึ้นไป (เช่น v20.11.0)
npm --version       # ต้องมี version (เช่น 10.2.4)
wrangler --version  # ต้อง 3.x (เช่น ⛅️ wrangler 3.x.x)
```

✅ ถ้า **ทุก** command ขึ้น version เลข = พร้อม → ไป **ส่วนที่ 2 Step 1: Clone repo**

❌ ถ้า **บางตัว** ไม่ขึ้น version / error `command not found` = ย้อนกลับไปลงตัวนั้นข้างบน (1️⃣ Git / 2️⃣ Node.js / 3️⃣ Wrangler)

> 💡 **Tip**: save 4 บรรทัด pre-flight นี้ไว้ใน note — ถ้า install AdsPanda AI เครื่องอื่น / ลูกค้าคนอื่น ใช้เช็คได้ทันที (~30 วินาที)

---

## ส่วนที่ 2: ขั้นตอนติดตั้ง (Manual Install Steps)

8 ขั้น — ทุก step เป็น 🟢 Self-service ยกเว้น Step 3 ที่ depend บน welcome message (AdsPanda AI auto-deliver ตอนซื้อ — ไม่ใช่จุดรอ mid-install)

ก่อนเริ่ม — เปิด terminal แล้ว `cd` ไป folder ที่อยากเก็บ code เช่น `cd ~/Documents`

---

### Step 1: Clone repo

**ประเภท**: 🟢 Self-service · **เวลา**: ~5 นาที · **ต้องมี**: GitHub account + accept invite แล้ว

ดึงโค้ด AdsPanda AI ลงเครื่อง — ใช้ชื่อ folder `adspanda-ai` (repo name เดิม `adbot-ai-product` = lowercase infrastructure preserved per rebrand)

**คำสั่ง**:

```bash
git clone https://github.com/mymint0840-web/adbot-ai-product adspanda-ai
cd adspanda-ai
```

**Expected output**:

```text
Cloning into 'adspanda-ai'...
Receiving objects: 100% (1243/1243), 3.21 MiB | 8.50 MiB/s, done.
Resolving deltas: 100% (612/612), done.
```

**Verify success**:
- [ ] `ls adspanda-ai` เห็น `package.json`, `src/`, `.env.example`
- [ ] ไม่เจอ `Repository not found` / `Permission denied`

> 💡 **Tip**: `Permission denied` = ยังไม่ accept GitHub invite — เปิด inbox → accept → ลองใหม่
> ⏳ **ถ้า fail**: ดู [npm-install-fail](#npm-install-fail)

---

### Step 2: Install dependencies

**ประเภท**: 🟢 Self-service · **เวลา**: ~3-5 นาที · **ต้องมี**: Node.js 20+ (เช็ค `node -v`)

**คำสั่ง** (เลือก npm หรือ bun — ผลเหมือนกัน bun เร็วกว่า):

```bash
npm install
# หรือ: bun install (เร็วกว่า 3-5x)
```

**Expected output**:

```text
added 1247 packages, and audited 1248 packages in 2m
found 0 vulnerabilities
```

**Verify success**:
- [ ] เห็น folder `node_modules/` ใน repo
- [ ] ไม่มี `ERR!` สีแดงท้าย output (warning สีเหลืองข้ามได้)

> 💡 **Tip**: install ช้ามาก (>10 นาที) ลอง bun
> ⏳ **ถ้า fail**: ดู [npm-install-fail](#npm-install-fail)

---

### Step 3: Setup environment

**ประเภท**: 🟡 **Depends on welcome message** (auto-deliver ตอนซื้อ — ไม่ใช่จุดรอ mid-install) · **เวลา**: ~5 นาที · **ต้องมี**: welcome message ครบ

> ✅ **Pre-check**: เปิด welcome email/LINE ยืนยันมี 4 ค่าครบ:
> 1. `ADBOT_LICENSE_JWT` (string ขึ้นต้น `eyJ...`)
> 2. `ADBOT_DOMAIN` (เช่น `panyawatcc.pages.dev`)
> 3. `FB_APP_ID` (ตัวเลข 15-16 หลัก)
> 4. `FB_APP_SECRET` (hex string)
>
> ถ้าขาด — **หยุด email `[WELCOME-RESEND]`** ก่อน (SLA 24 ชั่วโมง) ห้ามเริ่ม Step 3 แบบค้างครึ่งทาง

**คำสั่ง**:

```bash
cp .env.example .env
nano .env   # หรือ vim / code / editor ที่ถนัด
```

ใส่ 5 ค่าใน `.env` (แทน `{PLACEHOLDER}` ด้วยค่าจริง):

```bash
ADBOT_LICENSE_JWT={license-jwt-from-welcome-message}
ADBOT_DOMAIN={your-domain-from-welcome-message}
ANTHROPIC_API_KEY={sk-ant-from-console.anthropic.com}
FB_APP_ID={fb-app-id-from-welcome-message}
FB_APP_SECRET={fb-app-secret-from-welcome-message}
```

**Verify** (non-secret values only):

```bash
cat .env | grep -v SECRET | grep -v KEY | grep -v JWT
```

```text
ADBOT_DOMAIN=panyawatcc.pages.dev
FB_APP_ID=1234567890123456
```

**Verify success**:
- [ ] `.env` มี 5 ค่าครบ ไม่มีช่องว่างหน้า/หลัง (common bug จาก copy-paste)
- [ ] `ADBOT_DOMAIN` ตรงกับ domain ใน welcome message **เป๊ะ** (รวม subdomain)
- [ ] ไม่มี quote `"` รอบค่า (format `KEY=value` ไม่ใช่ `KEY="value"`)

> ⏳ **ระวัง**: `.env` gitignore แล้ว — ห้าม commit เด็ดขาด. ถ้า commit ไปแล้ว email `[URGENT-BLOCKER]` ทันทีเพื่อ rotate `FB_APP_SECRET`

---

### Step 4: Install Wrangler CLI

**ประเภท**: 🟢 Self-service · **เวลา**: ~2 นาที · **ต้องมี**: npm (หรือ bun)

Wrangler = CLI ของ Cloudflare ใช้ deploy + manage D1/KV/Workers/Pages — ต้องมี **global** (ไม่ใช่ local)

**คำสั่ง**:

```bash
npm install -g wrangler
# verify
wrangler --version
```

**Expected output**:

```text
⛅️ wrangler 3.90.0
```

**Verify success**:
- [ ] `wrangler --version` ตอบออกมา (ไม่ใช่ `command not found`)
- [ ] Version `3.x+` (ต่ำกว่า upgrade ด้วย `npm install -g wrangler@latest`)

> 💡 **Tip**: mac เจอ `EACCES: permission denied` — ลอง `sudo npm install -g wrangler` หรือใช้ [nvm](https://github.com/nvm-sh/nvm) จะไม่เจอ permission issue

---

### Step 5: Login Cloudflare

**ประเภท**: 🟢 Self-service · **เวลา**: ~3 นาที · **ต้องมี**: Cloudflare account active

**คำสั่ง**:

```bash
wrangler login
```

Browser tab ใหม่เปิด → กด **Allow** → กลับมา terminal

**Expected output**:

```text
Successfully logged in.
```

**Verify success**:
- [ ] `wrangler whoami` เห็น email ของคุณ

> 💡 **Tip**: browser ไม่เปิด (SSH/remote) — copy URL ที่ terminal แสดง paste ใน browser เครื่องอื่น หรือ `wrangler login --browser=false` (manual code flow)
> ⏳ **ถ้า fail**: ดู [wrangler-login-fail](#wrangler-login-fail)

---

### Step 6: Run setup script

**ประเภท**: 🟢 Self-service · **เวลา**: ~5-10 นาที · **ต้องมี**: Step 1-5 เสร็จ, `.env` มี 5 ค่า

`setup.sh --from-env` อ่าน `.env` แล้วสร้าง D1 + KV + push secrets + Pages project — non-interactive

**คำสั่ง**:

```bash
bash ./setup.sh --from-env
```

> 💡 **Flag `--from-env`** (BACKEND ship 2026-04-18) — เวอร์ชันเก่าไม่มี flag นี้ ให้ `git pull origin main` ก่อน

**Expected output**:

```text
AdsPanda AI — Setup (non-interactive, from .env)
================================================
[1/6] Reading .env... OK (5 values found)
[2/6] Verifying Cloudflare login... OK
[3/6] Creating D1 database 'adspanda-ai-db'... OK
[4/6] Creating KV namespace 'SESSIONS'... OK
[5/6] Pushing secrets... OK (5 secrets synced)
[6/6] Creating Pages project 'panyawatcc'... OK

Setup complete. Next: bun run build && bunx wrangler pages deploy dist
```

**Verify success**:
- [ ] `Setup complete.` ไม่มี `FAILED` step
- [ ] `wrangler d1 list` เห็น `adspanda-ai-db`
- [ ] `wrangler kv:namespace list` เห็น `SESSIONS`
- [ ] CF Dashboard → Pages → เห็น project ตาม slug

> ⏳ **ถ้า fail**: ดู [setup-sh-fail](#setup-sh-fail) — มักเป็น Cloudflare quota

---

### Step 7: Build + Deploy

**ประเภท**: 🟢 Self-service · **เวลา**: ~5-10 นาที · **ต้องมี**: Step 6 เสร็จ

Build TypeScript/React → static files → deploy ขึ้น Cloudflare Pages

**Derive slug from ADBOT_DOMAIN**:
- ถ้า `ADBOT_DOMAIN=panyawatcc.pages.dev` → `slug=panyawatcc` (ตัด `.pages.dev` ออก)
- ถ้า custom domain → `slug` = ชื่อ Pages project ที่ Step 6 สร้าง (ดูใน CF dashboard)

**คำสั่ง**:

```bash
bun run build
# หรือ: npm run build
bunx wrangler pages deploy dist --project-name={your-slug}
```

**Expected output**:

```text
✨ Compiled Worker successfully
✨ Success! Uploaded 47 files (2.31 sec)
✨ Deployment complete! Take a peek over at:
   https://panyawatcc.pages.dev
```

**Verify success**:
- [ ] Build จบด้วย `Compiled successfully` ไม่มี error แดง
- [ ] Deploy แสดง URL ที่ deploy สำเร็จ
- [ ] URL ตรงกับ `ADBOT_DOMAIN` ใน `.env`

> 💡 **Tip**: build fail ลอง `rm -rf node_modules dist && bun install && bun run build` — clean rebuild แก้ 80% ของ case
> ⏳ **ถ้า fail**: [build-fail](#build-fail) / [deploy-fail](#deploy-fail)

---

### Step 8: ทดสอบ

**ประเภท**: 🟢 Self-service · **เวลา**: ~2 นาที · **ต้องมี**: Step 7 deploy สำเร็จ

ยิง curl 2 จุด ต้อง pass ทั้งคู่ (แทน `{your-domain}` ด้วย `ADBOT_DOMAIN`):

```bash
curl -sI https://{your-domain}.pages.dev
curl https://{your-domain}.pages.dev/api/license/status
```

**Expected output**:

```text
HTTP/2 200
content-type: text/html; charset=utf-8
```

```json
{"valid":true,"status":"active","expires_at":"2027-04-18T00:00:00Z"}
```

**Verify success**:
- [ ] Command 1 ตอบ `HTTP/2 200` (ไม่ใช่ 404/500/503)
- [ ] Command 2 ตอบ JSON มี `"valid":true` (ถ้า `"valid":false` → License JWT ผิด)
- [ ] เปิด `https://{your-domain}.pages.dev` ใน browser เห็นหน้า landing

> ✅ **Install done. Next: register first admin + Connect FB — see Section 4.**

> ⏳ **License check fail**: ดู welcome message → confirm `ADBOT_LICENSE_JWT` ถูก → redeploy. ถ้ายังไม่ได้ email `[LICENSE]`

---

## ส่วนที่ 3: Troubleshooting

5 ปัญหาที่เจอบ่อยที่สุด — ถ้าเจอข้ออื่น email `[INSTALL-HELP]` พร้อม full output + OS + `node --version`

<details id="npm-install-fail" open>
<summary>Problem: <code>npm install</code> error</summary>

**สิ่งที่เห็น**:

```text
npm ERR! code ERESOLVE
npm ERR! engine Not compatible with your version of node/npm
npm ERR! Required: {"node":">=20.0.0"}
```

**สาเหตุที่เป็นไปได้**:
- Node version ต่ำกว่า 20 (AdsPanda AI require Node 20+)
- Network issue ตอน download package
- Peer dep conflict จาก npm version เก่า / cache corruption

**วิธีแก้**:
1. เช็ค `node -v` — ถ้าต่ำกว่า 20 upgrade ด้วย [nvm](https://github.com/nvm-sh/nvm): `nvm install 20 && nvm use 20`
2. เคลียร์ cache: `npm cache clean --force`
3. ลบ lock file + retry: `rm -rf node_modules package-lock.json && npm install`
4. ถ้า 3 ข้อบนไม่ได้ผล ลอง bun: `bun install`

**ถ้ายังไม่หาย**: email `[INSTALL-HELP]` to mymint0840@gmail.com with full output + OS + node version

</details>

<details id="wrangler-login-fail">
<summary>Problem: <code>wrangler login</code> fails / no browser</summary>

**สิ่งที่เห็น**: command ค้าง ไม่มี browser เปิด หรือ

```text
Error: Failed to open browser. Please visit this URL manually:
https://dash.cloudflare.com/oauth2/auth?...
```

**สาเหตุที่เป็นไปได้**:
- ทำบน SSH / remote server ที่ไม่มี GUI
- Default browser ไม่ได้ตั้ง
- Firewall block callback port (8976)

**วิธีแก้**:
1. Copy URL ที่ terminal แสดง → paste ใน browser เครื่องที่มี GUI → Allow
2. Manual code flow: `wrangler login --browser=false`
3. ทางเลือก: ใช้ API token — สร้างที่ [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → `export CLOUDFLARE_API_TOKEN=xxx`

**ถ้ายังไม่หาย**: email `[INSTALL-HELP]` to mymint0840@gmail.com with full output + OS + node version

</details>

<details id="setup-sh-fail">
<summary>Problem: D1 / KV creation fails (setup.sh)</summary>

**สิ่งที่เห็น**:

```text
[3/6] Creating D1 database 'adspanda-ai-db'... FAILED
✘ [ERROR] You have reached the maximum number of D1 databases allowed on your account.
```

**สาเหตุที่เป็นไปได้**:
- Cloudflare free tier จำกัด D1 databases / KV namespaces >100
- ชื่อ namespace ซ้ำกับของเก่า
- Account ที่ login ผิด (เช็ค `wrangler whoami`)

**วิธีแก้**:
1. CF dashboard → Workers & Pages → D1 / KV → ลบของเก่าที่ไม่ใช้
2. หรือ upgrade Workers Paid plan ($5/เดือน) — quota สูงมาก
3. `wrangler whoami` confirm account — ถ้าผิด `wrangler logout && wrangler login` ใหม่
4. หลังลบ — รัน `bash ./setup.sh --from-env` ใหม่

**ถ้ายังไม่หาย**: email `[INSTALL-HELP]` to mymint0840@gmail.com with full output + OS + node version

</details>

<details id="build-fail">
<summary>Problem: <code>bun run build</code> fails</summary>

**สิ่งที่เห็น**:

```text
error TS2307: Cannot find module '@/lib/license'
ReferenceError: ADBOT_DOMAIN is not defined
Build failed
```

**สาเหตุที่เป็นไปได้**:
- `.env` ขาดค่า (build อ่าน env vars ตอน compile)
- `node_modules` stale จาก partial install
- Mixed npm + bun state

**วิธีแก้**:
1. Verify `.env` ครบ 5 ค่า: `cat .env | grep -v SECRET | grep -v KEY | grep -v JWT`
2. Clean rebuild:
   ```bash
   rm -rf node_modules dist .next .cache
   bun install
   bun run build
   ```
3. Stick to single package manager — ถ้า start `npm install` ให้ใช้ `npm run build` ตลอด

**ถ้ายังไม่หาย**: email `[INSTALL-HELP]` to mymint0840@gmail.com with full output + OS + node version

</details>

<details id="deploy-fail">
<summary>Problem: <code>wrangler pages deploy</code> fails</summary>

**สิ่งที่เห็น**:

```text
✘ [ERROR] A request to the Cloudflare API failed.
Account ID not found or insufficient permissions.
✘ [ERROR] Project name 'panyawatcc' is already taken.
```

**สาเหตุที่เป็นไปได้**:
- Account ID ใน `wrangler.toml` ไม่ตรงกับ account ที่ login
- Project name ชน subdomain ของคนอื่น (pages.dev = global namespace)
- Token หมดอายุ / `.cloudflare/` cache stale

**วิธีแก้**:
1. `wrangler whoami` → verify account ถูก
2. `wrangler.toml` → verify `account_id = "..."` (หาได้ที่ CF dashboard → ขวาบน → Copy Account ID)
3. ชน slug → เปลี่ยนเป็น `{slug}-prod` แล้ว email `[DOMAIN-CHANGE]` ให้ AdsPanda AI re-whitelist
4. Re-login: `wrangler logout && wrangler login`
5. Redeploy: `bunx wrangler pages deploy dist --project-name={your-slug}`

**ถ้ายังไม่หาย**: email `[INSTALL-HELP]` to mymint0840@gmail.com with full output + OS + node version

</details>

---

## ส่วนที่ 4: หลัง Install (Post-Install Setup)

Step 1-8 = infrastructure ready. ส่วนนี้คือ config ให้พร้อมใช้งานจริง

### 4.1 Login + register first admin

1. เปิด browser → `https://{your-domain}.pages.dev`
2. คลิก **Register** → กรอก email + password
3. หน้า License setup → paste `ADBOT_LICENSE_JWT` จาก welcome message
4. หน้า TOS + DPA acceptance → อ่าน + accept
   - [TOS-v1.md](./TOS-v1.md) section 4 Full Mirror Disclosure — **สำคัญ**: Vendor มี read-only access เพื่อ security monitoring
   - [DPA-v1.md](./DPA-v1.md) section 7 Processor Obligations + Appendix B (Anthropic BYOK sub-processor #4)
5. Dashboard โหลด

**Verify success**:
- [ ] เห็นหน้า dashboard หลัง accept TOS/DPA
- [ ] ไม่มี banner แดง "License invalid" / "Acceptance required"

> 🚨 **Full Mirror**: Vendor มี read-only access เข้า deployment คุณเพื่อ security monitoring + compliance oversight ทุกการเข้าถึง audit-log — ขอดูได้ผ่าน `[AUDIT-LOG]` email (SLA 7 วันทำการ). ดู [CUSTOMER_GUIDE_v2.md section 2](./CUSTOMER_GUIDE_v2.md) รายละเอียดเต็ม

### 4.2 Connect Facebook

1. Dashboard → **Connect Facebook**
2. OAuth consent → grant 5 permissions: `ads_management`, `ads_read`, `business_management`, `pages_read_engagement`, `pages_show_list`
3. Return to dashboard → เห็น `✅ Connected: [your FB name]` + รายชื่อ ad account

**Verify success**:
- [ ] Banner `Connected` ขึ้น ไม่เจอ `URL Blocked`
- [ ] Ad account ตรงกับใน Business Manager

> 💡 รายละเอียด walkthrough: ดู [CUSTOMER_GUIDE_v2.md Step 4](./CUSTOMER_GUIDE_v2.md#step-4-deploy--verify)

### 4.3 Setup automation rules

1. Dashboard → **Rules** → **Create rule**
2. Template: "Pause ad set if ROAS < 1.5 for 7 days"
3. Configure: Metric=ROAS, Threshold < 1.5, Window=7 days, Action=Pause ad set, Polling=15 นาที (minimum — ถี่กว่านี้โดน rate limit)
4. **Enable** → save

**Verify success**:
- [ ] Rule status `Active`
- [ ] รอ 15-30 นาที → **Automation Log** มี entry ว่า rule ถูก evaluate

### 4.4 Update + maintenance

**Update**:

```bash
cd adspanda-ai
git pull origin main
bun install
bun run build
bunx wrangler pages deploy dist --project-name={your-slug}
```

Minor version ไม่มี DB migration — pull + deploy จบ
Major version (v1 → v2) มี migration script แยก + AdsPanda AI ประกาศล่วงหน้าใน email

**FB token refresh (ทุก 60 วัน)**: Dashboard แสดง banner → คลิก **Reconnect Facebook** → data เก่าคงอยู่ (auto-refresh อยู่ใน roadmap v2)

**Support**:

| เคส | Subject prefix | SLA |
|-----|----------------|-----|
| ติดตั้งทั่วไป | `[INSTALL-HELP]` | 7 วันทำการ |
| Welcome message ไม่มา | `[WELCOME-RESEND]` | 24 ชั่วโมง |
| เปลี่ยน domain หลังซื้อ | `[DOMAIN-CHANGE]` | 1-2 วันทำการ |
| License JWT issue | `[LICENSE]` | 7 วันทำการ |
| Production down | `[URGENT-BLOCKER]` | 24 ชั่วโมง |

ทั้งหมด → `mymint0840@gmail.com` แนบ error + screenshot ช่วยตอบเร็วขึ้น

---

## ส่วนที่ 5: Comparison — AI vs Manual (for future reference)

| Criteria | AI-Assisted | Manual (นี่) |
|---|---|---|
| **Prerequisites** | AI subscription (~฿0-700/mo) | Command line basic |
| **Setup time** | ~30-45 นาที (รวม AI thinking) | ~45-90 นาที |
| **Monthly cost extra** | ~฿0-700 (AI) + ~฿35-200 (Anthropic BYOK) | ~฿35-200 (Anthropic BYOK only) |
| **Learning curve** | ต่ำ — AI อธิบายทุก step | ปานกลาง — คุณอ่าน doc + คำสั่งเอง |
| **Control** | AI ทำให้ — คุณดู + ตอบ | คุณทำทุก step — เห็นทุกอย่าง |
| **Debug ปัญหา** | AI ช่วย troubleshoot ให้ | คุณ debug เอง (doc มี troubleshooting) |
| **เหมาะกับ** | มือใหม่ / ไม่ถนัด terminal | Dev / ชินกับ CLI / อยากเข้าใจระบบ |
| **Switch ทีหลัง** | ย้ายมา manual ได้ตลอด | ย้ายไป AI ได้ตลอด |

> 💡 **ทางเลือกไม่ได้ lock in** — ทั้ง 2 path deploy ระบบเหมือนกันเป๊ะ ไม่ได้สร้าง artifact ต่างกัน install ด้วย manual วันนี้ แล้วพรุ่งนี้อยากให้ AI ช่วย troubleshoot ก็ paste เอกสารนี้ให้ AI อ่านได้ หรือกลับกัน

**Golden rule**: เลือก path ตาม comfort ไม่ใช่ budget อย่างเดียว ลูกค้าที่ spend 90 นาที manual แล้วเข้าใจทุก step มี debugging skill ที่ AI-assisted ไม่ได้สอน — ลงทุนตอนแรกนิดเดียว คุ้มระยะยาว

---

<a id="english-summary"></a>

## English Summary

> Thai is the primary language for this guide. This English summary covers the essentials — refer to the Thai section above for full detail, prep checklist, and copy-paste commands.

### Overview

This is the **manual install path** for AdsPanda AI — for Thai SME customers comfortable with bash commands who want to skip the ~฿700/mo AI subscription cost and install themselves via terminal. Sister doc [AI_ASSISTED_INSTALL.md](./AI_ASSISTED_INSTALL.md) covers the AI-guided path (~30-45 min, no CLI required). Estimated time: 45-90 minutes once you have the welcome message in hand with all credentials.

### Prep checklist (before opening terminal)

1. **Cloudflare account** — free, [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com) → API Keys (`sk-ant-...`); ~฿35-200/mo typical SME (BYOK per [DPA Appendix B](./DPA-v1.md))
3. **License JWT** — from AdsPanda AI welcome email (`eyJ...`)
4. **Node.js 20+** — check with `node -v`; upgrade via nvm if needed
5. **Welcome message complete** — verify `ADBOT_LICENSE_JWT` + `ADBOT_DOMAIN` + `FB_APP_ID` + `FB_APP_SECRET` all received. If missing, email `[WELCOME-RESEND]` to mymint0840@gmail.com BEFORE starting (24h SLA)

### The 8 steps

1. **Clone repo** (~5 min) — `git clone https://github.com/mymint0840-web/adbot-ai-product adspanda-ai && cd adspanda-ai`
2. **Install dependencies** (~3-5 min) — `npm install` or `bun install` (bun is 3-5x faster)
3. **Setup environment** (~5 min) — `cp .env.example .env` then edit with 5 values from welcome message (license JWT, ADBOT_DOMAIN, Anthropic key, FB_APP_ID, FB_APP_SECRET)
4. **Install Wrangler CLI** (~2 min) — `npm install -g wrangler` (verify with `wrangler --version`)
5. **Login Cloudflare** (~3 min) — `wrangler login` (browser opens → click Allow)
6. **Run setup script** (~5-10 min) — `bash ./setup.sh --from-env` (non-interactive, creates D1 + KV + secrets)
7. **Build + Deploy** (~5-10 min) — `bun run build && bunx wrangler pages deploy dist --project-name={slug}` (slug = ADBOT_DOMAIN with `.pages.dev` stripped)
8. **Test** (~2 min) — `curl -sI https://{domain}.pages.dev` (expect 200) + `curl https://{domain}.pages.dev/api/license/status` (expect `"valid":true`)

### Top 5 troubleshooting

1. **`npm install` fails** — check Node 20+, clear cache, try bun instead
2. **`wrangler login` fails / no browser** — copy URL manually to browser OR use `--browser=false` flag
3. **D1 / KV creation fails** — Cloudflare free-tier quota reached; delete unused resources or upgrade to Workers Paid ($5/mo)
4. **`bun run build` fails** — verify `.env` complete + clean rebuild (`rm -rf node_modules dist && bun install && bun run build`)
5. **`wrangler pages deploy` fails** — `wrangler whoami` to verify account; change slug if pages.dev namespace conflict

### AI vs Manual comparison (condensed)

| | AI-Assisted | Manual |
|---|---|---|
| Time | 30-45 min | 45-90 min |
| Cost extra | ฿0-700/mo AI sub | ฿0 |
| CLI skill needed | No | Basic |
| Best for | Non-technical | Developers |

Both paths deploy identical systems — no lock-in. Switch anytime.

### Post-install (Section 4)

1. Register first admin → accept TOS + DPA (Full Mirror disclosure per [TOS section 4](./TOS-v1.md))
2. Connect Facebook via OAuth (5 permissions: ads_management, ads_read, business_management, pages_read_engagement, pages_show_list)
3. Create first automation rule (recommend: "Pause ad set if ROAS < 1.5 for 7 days", 15-min polling)
4. Maintain: `git pull && bun install && bun run build && wrangler pages deploy dist` for updates; reconnect FB every 60 days for token refresh

### Support

Email `mymint0840@gmail.com` with subject prefix:
- `[INSTALL-HELP]` — install issues (7 business days)
- `[WELCOME-RESEND]` — welcome message missing (24h)
- `[DOMAIN-CHANGE]` — deployed domain changed post-purchase (1-2 business days)
- `[URGENT-BLOCKER]` — production down (24h)
- `[LICENSE]` — license JWT invalid/expired (7 business days)

Attach the full terminal error output plus OS version and `node --version` for fastest resolution.
