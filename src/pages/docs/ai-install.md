# AdsPanda AI — AI-Assisted Install Guide (BACKUP path)

**Version**: 1.2
**Date**: 2026-04-19
**Status**: 🟡 **BACKUP** — ใช้เมื่อ [Quick Install (1-click)](/docs/quick-install) ใช้ไม่ได้ หรืออยากให้ AI ดูและอธิบายทุกขั้น
**Recommended for**: ลูกค้าที่คุ้น AI chat + อยากให้ AI ช่วย debug ระหว่างติดตั้ง
**Sister docs**: [Quick Install](/docs/quick-install) (RECOMMENDED — 1-click) · [CUSTOMER_GUIDE_v2.md](./CUSTOMER_GUIDE_v2.md) (overview + Decision Tree) · [MANUAL_INSTALL.md](./MANUAL_INSTALL.md) (DEVELOPER ONLY) · [TOS-v1.md](./TOS-v1.md) · [DPA-v1.md](./DPA-v1.md)
**Estimated time**: 30-45 minutes (รวม AI thinking)

> ⚡ **เริ่มต้น?** ลอง [Quick Install (1-click)](/docs/quick-install) ก่อน — ใช้เวลา ~90 วินาที ไม่ต้องใช้ AI subscription ไม่ต้องเปิด terminal. AI-Assisted (เอกสารนี้) คือ BACKUP ถ้า Quick Install ใช้ไม่ได้หรืออยากได้ AI ช่วยระหว่างทาง

---

## ภาษาไทย

> 🌐 **English summary อยู่ท้ายเอกสาร** — [ข้ามไป English Summary](#english-summary)

คู่มือนี้เขียนให้เจ้าของธุรกิจที่ "ไม่ถนัด code เลย" ก็ติดตั้ง AdsPanda AI ได้ — โดยใช้ AI ทำงานแทน คุณแค่ **copy prompt 4 อัน** ไป paste ลงใน Claude Code / ChatGPT / Cursor แล้วตอบคำถามที่ AI ถาม เท่านั้น

## คุณคือใคร? (เลือก path ตามจริง — honest self-assessment)

### ⚡ ใครก็ได้ (ไม่ต้องใช้ AI) → **Quick Install (1-click)** — RECOMMENDED

**ฟรี · ~90 วินาที · กดปุ่มเดียว**

- ✅ ปุ่ม "Deploy to Cloudflare" — CF ตั้ง D1 + KV + Pages ให้อัตโนมัติ
- ✅ ไม่ต้องใช้ AI, ไม่ต้อง terminal, ไม่ต้อง `git clone`
- ✅ ฟรี — ไม่ต้องจ่าย AI subscription

→ [/docs/quick-install](/docs/quick-install) (ลองก่อน — เร็วที่สุด)

### 🤖 อยากให้ AI ดูและอธิบายระหว่างติดตั้ง → **AI-Assisted Install** (เอกสารนี้ — BACKUP)

**~฿0-700/เดือน (AI subscription) · ~30-45 นาที · AI ทำให้หมด**

- ✅ AI assistant (Claude Code / ChatGPT / Cursor) ทำงานแทนคุณทุก step
- ✅ คุณแค่ copy 4 prompts + ตอบคำถาม AI + paste credentials จาก welcome message
- ✅ ถ้าติดปัญหา AI debug ให้ + อธิบาย + แนะนำ fix
- ✅ ปลอดภัย — AI ไม่รันคำสั่ง destructive โดยไม่ถามก่อน

→ **คุณอยู่ที่นี่แล้ว** เลื่อนลงไป [ส่วนที่ 1: ลูกค้าต้องเตรียมอะไรบ้าง](#ส่วนที่-1-ลูกค้าต้องเตรียมอะไรบ้าง-15-30-นาที)

### 👨‍💻 Developer / มีทีม IT → **Manual Install** (เอกสารอื่น)

**Free · ~60-90 นาที · ใช้ skill command line**

- ต้องรู้ terminal, เคย `git clone` + `npm install`, debug error ได้เอง
- ประหยัดค่า AI subscription ฿700/mo
- เหมาะกับ dev / agency ที่ติดตั้งให้หลายลูกค้า

→ [MANUAL_INSTALL.md](./MANUAL_INSTALL.md)

### 💰 ไม่อยากจ่าย AI + ไม่รู้ command line → **AdsPanda Setup Service**

**One-time ฿2,000-5,000 · ~30 นาที · AdsPanda ทำให้**

- AdsPanda ติดตั้งให้ทาง remote (TeamViewer / AnyDesk)
- ~30 นาที เสร็จ + garansi ใช้งานได้
- ติดต่อ: email `[SETUP-SERVICE]` ไป `mymint0840@gmail.com` — ระบุ domain + FB business info
- ราคายืนยันหลังคุยรายละเอียด (ช่วง ฿2,000-5,000)

> 💡 **ตัดสินใจง่ายๆ**: ถ้าไม่แน่ใจ → เริ่มที่ **AI-Assisted** (เอกสารนี้) ก่อน. ค่า AI subscription มี trial ฟรี ลองก่อนไม่เสียอะไร. ถ้ายากกว่าที่คิด → ย้ายไป Setup Service ได้ถึง 24 ชั่วโมงแรก

---

## ส่วนที่ 1: ลูกค้าต้องเตรียมอะไรบ้าง (15-30 นาที)

ก่อน **เปิด AI** — ถ้าเตรียมของครบตรงนี้ก่อน จะลื่นตลอด 4 prompts ไม่ต้องหยุดหาของกลางทาง

### 🔴 จำเป็น 5 อย่าง

| # | อะไร | ราคา | สมัครที่ไหน | ใช้ทำอะไร |
|---|------|------|--------------|-----------|
| 1 | **AI assistant** | ฿0-700/เดือน | [Claude Code](https://claude.ai/code) (ฟรี trial) / [ChatGPT Plus](https://chatgpt.com) ($20) / [Cursor](https://cursor.com) (ฟรี) | คนช่วย install ให้ |
| 2 | **Cloudflare account** | ฟรี | [dash.cloudflare.com](https://dash.cloudflare.com) | ที่ host ระบบ |
| 3 | **Anthropic API key** | ~฿35-200/เดือน (ตามใช้จริง) | [console.anthropic.com](https://console.anthropic.com) → API Keys | AI engine ของระบบ (BYOK) |
| 4 | **License key (JWT)** | one-time จ่าย AdsPanda AI | email `[LICENSE-REQUEST]` ไป `mymint0840@gmail.com` | กุญแจเปิดใช้ |
| 5 | **Email** | ฟรี | ที่มีอยู่แล้ว | register + login |

**Total cost ลูกค้า**: **~฿35-1,000/เดือน** + license one-time

> 🚨 **ทำไม API key ต้องเป็นของคุณเอง (BYOK)**
>
> ตาม [DPA section 8 Sub-processors](./DPA-v1.md) — AdsPanda AI ใช้ **Anthropic Claude** เป็น AI สำหรับ bot rule + agent actions. Key ของคุณ → บิล Anthropic ตรง, ข้อมูลไม่ผ่าน AdsPanda AI store. AdsPanda AI brain ทำแค่ license validation + rate limit proxy เท่านั้น ไม่ persist body

### 🔵 ถ้าจะใช้ FB feature — เลือก 1 ใน 2 Option

ระบบ AdsPanda AI ทำงานได้โดยไม่ต้องผูก FB (สำหรับ dashboard / rule testing) แต่ถ้าจะให้ automate ad จริง ต้องเชื่อม Facebook ซึ่งมี 2 option ให้เลือก:

#### 🅰️ Option A — ใช้ FB App ของ AdsPanda AI (แนะนำ — Easy, default)

- คุณ: **ไม่ต้องสร้าง FB app เอง + ไม่ต้องเข้า developers.facebook.com เลย**
- AdsPanda AI จัดการเรื่อง FB App ให้ทุกอย่างตอนคุณซื้อ license
- **เหมาะกับ**: ลูกค้า SME ทั่วไป + อยากใช้งานเร็ว
- **Setup time**: ~5 นาที (หลัง AdsPanda AI ส่ง credentials + whitelist ให้)

**AdsPanda AI จะ whitelist domain ของคุณให้อัตโนมัติ** — เมื่อคุณซื้อ license, ระบบ AdsPanda AI จะ:

1. **เพิ่ม domain ของคุณ** (เช่น `mybusiness.pages.dev` หรือ custom domain) เข้า **FB App's Valid OAuth Redirect URIs**
2. **ส่ง `FB_APP_ID` + `FB_APP_SECRET`** ให้คุณ (ผ่าน welcome email หรือ LINE)
3. **ส่ง License Key (JWT)** ให้คุณในข้อความเดียวกัน
4. **เชิญคุณเข้า GitHub repo** เพื่อ clone โค้ด

= **คุณไม่ต้องเข้า developers.facebook.com เลย** — AdsPanda AI ทำให้หมด

> 💡 **หลังซื้อ**: ดูว่ามี FB App credentials + License + GitHub invite ครบใน welcome email/LINE ก่อน start Prompt 1 — ถ้ายังไม่ครบ reply กลับ thread เดิมขอตามข้อที่ขาด

สิ่งที่คุณต้องเตรียม **ฝั่ง FB ของคุณเอง** (Option A):

| # | อะไร | ราคา | ทำที่ไหน |
|---|------|------|----------|
| 6 | **Facebook Business Manager** | ฟรี | [business.facebook.com](https://business.facebook.com) |
| 7 | **Facebook Page** (อย่างน้อย 1) | ฟรี | [facebook.com](https://facebook.com) |
| 8 | **Facebook Ad Account** (อย่างน้อย 1) | ฟรี (จ่ายค่าแอด) | ผูกกับ Business Manager |

#### 🅱️ Option B — ใช้ FB App ของคุณเอง (Advanced)

- คุณ: **สร้าง FB app เอง** (setup 15 นาที + รอ Meta review 2-7 วัน)
- AdsPanda AI: ไม่เกี่ยวกับ FB app ของคุณเลย
- **เหมาะกับ**: agency ขนาดใหญ่ / มีทีม technical / อยากควบคุม FB app 100%

ขั้นตอน Option B:

1. เข้า [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. เลือก type: **Business**
3. เพิ่ม product: **Facebook Login** + **Marketing API**
4. Setup **OAuth Redirect URI**: `https://YOUR-DOMAIN.pages.dev/api/auth/callback` (หรือ custom domain)
5. ขอ permissions: `ads_management`, `ads_read`, `business_management`, `pages_show_list`, `pages_read_engagement`
6. ส่ง app ไป **App Review** (รอ Meta ตอบ 2-7 วัน — ระหว่างนี้ใช้ dev mode ทดสอบได้)
7. Copy `FB_APP_ID` + `FB_APP_SECRET` ไว้ — จะ paste ตอน AI ถามใน Prompt 1

สิ่งที่คุณต้องเตรียม (Option B) — เพิ่ม 3 อย่างจาก Option A:

| # | อะไร | ราคา | ทำที่ไหน |
|---|------|------|----------|
| 6-8 | Business Manager + Page + Ad Account | ฟรี | เหมือน Option A |
| 9 | **FB Developer account** + App created | ฟรี | [developers.facebook.com](https://developers.facebook.com) |
| 10 | **รอ Meta App Review** | 2-7 วัน | อัตโนมัติ |

> 💡 **คำแนะนำ**: ไม่แน่ใจเลือกอะไร? **เริ่มด้วย A** — ย้ายไป B ทีหลังได้ถ้า scale ต้องการ (แก้ 2 env vars)

### ตารางเปรียบเทียบ Option A vs B

| | Option A (AdsPanda AI's app) | Option B (Customer's app) |
|---|----------------------|--------------------------|
| Setup time | ~5 นาที | 15 นาที + รอ review 2-7 วัน |
| Technical skill | ต่ำ | ปานกลาง |
| Control | AdsPanda AI | ลูกค้า 100% |
| ถ้า FB app เจอปัญหา | กระทบลูกค้าทุกคน | กระทบคุณคนเดียว |
| Scale / rate limit | แชร์ rate limit รวมกัน | ไม่จำกัด (คุณ own) |
| เหมาะกับ | SME / freelancer ทั่วไป | Agency / Enterprise |

**Default ในคู่มือนี้ = Option A** — Prompt 1 จะถามว่าเลือก A หรือ B, ถ้าเลือก B มี detour เพิ่มก่อนต่อ

### 🟢 ตัวเลือก (ไม่จำเป็น)

| # | อะไร | ราคา | เมื่อไหร่ควรทำ |
|---|------|------|----------------|
| 11 | **Custom domain** (เช่น `adbot.mybrand.com`) | ~฿400/ปี | ถ้าอยาก URL สวย / brand |
| 12 | **GitHub account** | ฟรี | ไม่จำเป็น — AI ทำให้ |

### ❌ ไม่ต้องมี (สำคัญ!)

- ❌ ไม่ต้องรู้ code
- ❌ ไม่ต้องรู้ git
- ❌ ไม่ต้องรู้ server / DevOps
- ❌ ไม่ต้องเขียน command line เอง
- ❌ ไม่ต้องเข้าใจ JSON / YAML / config files

**ต้องเป็นคนที่**: copy-paste ได้ + อ่านภาษาไทยออก + รอ AI ทำงาน ~30 นาที + พิมพ์ตอบคำถาม AI ได้

> ⏳ **คำเตือน**: ถ้า License JWT (ข้อ 4) ยังไม่มี → **อย่าเพิ่งเริ่ม** email `[LICENSE-REQUEST]` ไป `mymint0840@gmail.com` ขอก่อน. Welcome email จะมี License JWT + Repo URL + (ถ้าเลือก Option A) FB_APP_ID + FB_APP_SECRET มาพร้อมกัน

---

## ส่วนที่ 2: 4 Prompts (copy-paste ได้เลย)

**วิธีใช้**:
1. เปิด AI ที่เลือกไว้
2. ก่อน paste Prompt 1 — `cd` (หรือบอก AI ให้ `cd`) ไป folder ที่อยากให้ code อยู่ เช่น `~/Documents/adbot`
3. Copy **ทั้ง block code ด้านล่าง** (ที่อยู่ในกรอบ `text`) แล้ว paste ให้ AI
4. AI จะเริ่มทำงาน — มันอาจถามคำตอบบางอย่าง ดูตาราง "ส่วนที่ 3" เพื่อเตรียมคำตอบ
5. รอ AI บอก `✅ ... Ready for Prompt N` แล้วค่อย paste อันถัดไป

---

### Prompt 1: Clone repo + Setup (~10 นาที)

**Prompt นี้ทำอะไร**: ให้ AI clone โค้ด AdsPanda AI ลงเครื่องคุณ → `npm install` → สร้างไฟล์ `.env` → ใส่ค่า License JWT + Anthropic API key + FB credentials (Option A หรือ B)

**AI จะถามคุณ 4-6 อย่าง** (แล้วแต่ FB Option):
1. Repo URL (จาก welcome email)
2. License JWT (จาก welcome email)
3. ADBOT_DOMAIN — full hostname ที่ AdsPanda AI ผูกไว้กับ license นี้ (จาก welcome email, เช่น `adbot-ai-mybrand.pages.dev`)
4. Anthropic API key (จาก console.anthropic.com)
5. **FB Option — A (AdsPanda AI's app) หรือ B (สร้างเอง)**
6. ถ้าเลือก A → AI ขอ `FB_APP_ID` + `FB_APP_SECRET` ที่ AdsPanda AI ส่งมาใน welcome email
   ถ้าเลือก B → AI guide setup FB app ตาม Option B ส่วนที่ 1 ก่อน แล้วค่อย paste credentials ของคุณ

**ก่อน paste — ทำ**: `cd ~/Documents` (หรือที่ไหนที่อยากเก็บ code)

> 💡 **เลือกภาษาได้** — AI assistant เข้าใจทั้งไทยและอังกฤษเท่ากัน ผลลัพธ์เหมือนกัน. ใช้ภาษาที่คุณสบายใจ

#### 🇹🇭 ภาษาไทย (แนะนำสำหรับคนไทย)

```text
ช่วยติดตั้ง AdsPanda AI ให้ฉันหน่อยครับ ฉันไม่รู้เรื่อง code เลย
กรุณาทำตามขั้นตอนนี้ทีละข้อ และรายงานผลกลับมาทุกขั้น:

1. ขอ "Repo URL" จากฉัน — ฉันจะ paste จาก welcome message ที่ AdsPanda AI ส่ง
2. รัน: `git clone {repo-url} adbot-ai && cd adbot-ai`
3. รัน: `npm install`
4. รัน: `cp .env.example .env` (ถ้ามี .env.example; ถ้าไม่มีสร้างไฟล์ .env ว่างเปล่า)
5. ถามฉันทีละข้อแล้วเขียนค่าเข้าไฟล์ .env (ห้ามพิมพ์ค่า secret กลับมาใน chat):
   - `ADBOT_LICENSE_JWT` — ฉันจะ paste license token จาก welcome message (ขึ้นต้น "eyJ...")
   - `ANTHROPIC_API_KEY` — ฉันจะ paste key จาก console.anthropic.com (ขึ้นต้น "sk-ant-...")
   - `ADBOT_DOMAIN` — brand name สั้นๆ ตัวเล็ก ไม่มีช่องว่าง (เช่น "mybrand")
6. ถามฉัน: "ใช้ FB App ของ AdsPanda AI (Option A — แนะนำ easy) หรือสร้าง FB App เอง (Option B — advanced)?"
   - ถ้าฉันตอบ "A" → ขอ `FB_APP_ID` + `FB_APP_SECRET` จากฉัน (ฉันจะ paste จาก welcome message)
   - ถ้าฉันตอบ "B" → บอกฉันให้ทำตาม "Option B" ใน install guide ก่อน — ต้องสร้าง FB app เอง + รอ Meta review. หยุดที่นี่จนกว่าฉันจะ paste `FB_APP_ID` + `FB_APP_SECRET` ของฉันเอง
7. เขียน FB credentials ลง .env (เพิ่ม 2 บรรทัด):
   - `FB_APP_ID={value}`
   - `FB_APP_SECRET={value}`
   - เพิ่ม `FB_APP_MODEL=A` หรือ `FB_APP_MODEL=B` เพื่อจำว่าเลือก option ไหน
8. รัน: `cat .env | grep -v SECRET | grep -v KEY | grep -v JWT | grep -v TOKEN`
   เพื่อ verify ค่า non-secret ถูกต้อง ห้ามพิมพ์ค่า secret
9. รายงาน: "✅ Setup complete. FB Mode: [A/B]. Ready for Prompt 2 (Deploy)." เมื่อเสร็จ

ถ้าติด error ข้อใด หยุดแล้วแสดง error message ทั้งหมดให้ฉันดู ห้าม auto-fix เอง — ฉันจะขอความช่วยเหลือเอง
```

#### 🇬🇧 English (alternative)

```text
I need you to help me install AdsPanda AI on my computer. I'm a non-technical user.
Please execute these steps in order and report back after each:

1. Ask me for the "Repo URL" — I'll paste it from AdsPanda AI's welcome email.
2. Run: `git clone {repo-url} adbot-ai && cd adbot-ai`
3. Run: `npm install`
4. Run: `cp .env.example .env` (if .env.example exists; otherwise create an empty .env)
5. Ask me for these values one by one and write them into .env (never print secrets back to the chat):
   - `ADBOT_LICENSE_JWT` — I'll paste the license token from AdsPanda AI's welcome email (starts with "eyJ...")
   - `ADBOT_DOMAIN` — I'll paste the full hostname from AdsPanda AI's welcome email (e.g., "adbot-ai-mybrand.pages.dev" — this is the exact domain AdsPanda AI bound to my license; it cannot be changed at install time)
   - `ANTHROPIC_API_KEY` — I'll paste my key from console.anthropic.com (starts with "sk-ant-...")
6. Ask me: "Do you want to use AdsPanda AI's shared FB App (Option A — recommended, easy) OR your own FB App (Option B — advanced)?"
   - If I answer "A" → ask me for `FB_APP_ID` + `FB_APP_SECRET` (I'll paste from AdsPanda AI's welcome email, same message as License JWT)
   - If I answer "B" → tell me to follow "Option B" steps in the prerequisites section of the install guide BEFORE continuing — I need to create a FB app myself and wait for Meta review. Pause here until I paste back my own `FB_APP_ID` + `FB_APP_SECRET`
7. Write the FB credentials into .env (add these two lines):
   - `FB_APP_ID={value}`
   - `FB_APP_SECRET={value}`
   (Note: no FB mode env var is read by the code — the app behaves identically regardless of which FB app you used. Leave a comment `# FB_MODE=A` in .env if you want to remember your choice.)
8. Run: `cat .env | grep -v SECRET | grep -v KEY | grep -v JWT | grep -v TOKEN`
   to verify non-secret values are set. Do NOT print the secret values.
9. Report: "✅ Setup complete. FB Mode: [A/B]. Ready for Prompt 2 (Deploy)." when done.

If any step fails, stop and show me the exact error message. Do not attempt to
fix it yourself — I'll get help.
```

**Success marker**: AI พิมพ์ว่า `✅ Setup complete. FB Mode: [A/B]. Ready for Prompt 2 (Deploy).`

> ⏳ **ถ้า AI ติด error** → copy error message ทั้งหมด แล้วทำ Prompt 4 (troubleshooting). ถ้าแก้ไม่ได้ → email `[INSTALL-HELP]` ไป `mymint0840@gmail.com` พร้อม error ทั้งหมด

---

### Prompt 2: Deploy ขึ้น Cloudflare (~10 นาที)

**Prompt นี้ทำอะไร**: ติดตั้ง Wrangler CLI → login Cloudflare → build โค้ด → deploy ขึ้น Cloudflare Pages

**AI จะเปิด browser ให้คุณ** เพื่อ login Cloudflare — กด **Allow** ใน browser แล้วกลับมาดู terminal

> 💡 **เลือกภาษาได้** — ไทยหรืออังกฤษ ผลลัพธ์เหมือนกัน

#### 🇹🇭 ภาษาไทย (แนะนำสำหรับคนไทย)

```text
ช่วย deploy แอป AdsPanda AI ขึ้น Cloudflare Pages หน่อย ขั้นตอน:

1. เช็ค Wrangler CLI: `wrangler --version`. ถ้ายังไม่ได้ติดตั้ง → `npm install -g wrangler`
2. รัน: `wrangler login`
   จะเปิด browser tab ใหม่ บอกฉันว่า "browser tab ควรจะเปิดแล้ว — กด Allow แล้วกลับมา" รอ terminal confirm ก่อนต่อ
   ถ้า browser ไม่เปิด พิมพ์ URL ที่ terminal แสดงให้ฉันเปิดเอง
3. รัน: `wrangler whoami` แล้วแสดง account email ให้ฉันดู confirm ว่าถูก account
4. สร้าง Pages project: `wrangler pages project create adbot-ai-{slug-from-step-4} --production-branch main` (ใช้ค่า ADBOT_DOMAIN จาก .env)
5. Build แอป: `npm run build`
6. Deploy: `wrangler pages deploy dist --project-name adbot-ai-{slug-from-step-4}`
7. พิมพ์ deployed URL ที่ Wrangler output (เช่น `https://adbot-ai-{yourbrand}.pages.dev`)
8. รายงาน: "✅ Deployed to {URL}. Ready for Prompt 3 (Test)."

ถ้า build step fail แสดง error. ถ้า wrangler login ไม่เปิด browser บอก URL ให้ฉันเปิดเอง
```

#### 🇬🇧 English (alternative)

```text
Now deploy the AdsPanda AI app to Cloudflare Pages. Steps:

1. Check if Wrangler CLI is installed: `wrangler --version`.
   If not installed, run: `npm install -g wrangler`
2. Run: `wrangler login`
   This will open a browser tab. Tell me "A browser tab should have opened —
   click Allow and come back." Wait for confirmation in the terminal before continuing.
   If no browser opens, print the URL shown in the terminal so I can open it manually.
3. Run: `wrangler whoami` and show me the account email so I can confirm it's the right account.
4. Read ADBOT_DOMAIN from .env. Derive the wrangler project slug by stripping
   the `.pages.dev` suffix (so `adbot-ai-mybrand.pages.dev` becomes
   `adbot-ai-mybrand`). If ADBOT_DOMAIN doesn't end in `.pages.dev` (meaning
   the customer is using a custom domain), ask me to provide the slug
   explicitly — I'll check the CF dashboard for the Pages project name.
5. Run the guided setup which handles D1 + KV + secrets in one pass:
   `bash ./setup.sh --from-env`
   (This reads the .env we just wrote, creates D1 + KV via wrangler,
    creates the Pages project, pushes all secrets, and optionally builds
    + deploys. The `--from-env` flag skips interactive prompts since we
    already wrote the values in Prompt 1.)
6. If setup.sh prompts for "build & deploy now? [y/N]" → answer `y`.
   Otherwise run manually: `bun run build && bunx wrangler pages deploy dist --project-name {slug-from-step-4}`
7. Print the deployed URL that Wrangler outputs (example: https://adbot-ai-mybrand.pages.dev)
8. Report: "✅ Deployed to {URL}. Ready for Prompt 3 (Test)."

If the build step fails, show me the exact error. If wrangler login does not open
a browser, tell me the URL to open manually. If ADBOT_DOMAIN is missing from .env,
stop and ask me to run Prompt 1 again.
```

**Success marker**: AI พิมพ์ `✅ Deployed to https://adbot-ai-{yourbrand}.pages.dev. Ready for Prompt 3 (Test).`

> 💡 **Tip**: URL ที่ได้ (`https://adbot-ai-mybrand.pages.dev`) = URL ของ dashboard คุณ บันทึกเก็บไว้ — จะใช้ต่อใน Prompt 3

---

### Prompt 3: ทดสอบว่าใช้งานได้จริง (~5 นาที)

**Prompt นี้ทำอะไร**: ยิง health check 3 จุด + เปิด browser ไป URL ของคุณ

**ก่อน paste** — เตรียม URL จาก Prompt 2 ไว้ (เช่น `https://adbot-ai-mybrand.pages.dev`)

> 💡 **เลือกภาษาได้** — ไทยหรืออังกฤษ ผลลัพธ์เหมือนกัน

#### 🇹🇭 ภาษาไทย (แนะนำสำหรับคนไทย)

```text
ทดสอบว่า AdsPanda AI ที่ deploy แล้วใช้งานได้ ใช้ URL จากขั้น deploy ของ Prompt 2.
ถ้ายังไม่มี URL ขอจากฉัน แล้วรันทีละ check แล้วรายงาน pass/fail:

1. `curl -s -o /dev/null -w "%{http_code}" https://{URL}/api/health`
   ควรได้: 200
2. `curl -s -o /dev/null -w "%{http_code}" https://{URL}/api/license/status`
   ควรได้: 200
3. `curl -s https://{URL}/api/license/status | head -c 200`
   ควรมี `"valid":true` ใน JSON response
4. เปิด `https://{URL}` ใน default browser:
   - macOS: `open https://{URL}`
   - Linux: `xdg-open https://{URL}`
   - Windows: `start https://{URL}`
5. รายงานผลในรูปแบบ:
   ```
   Health check:   PASS/FAIL
   License check:  PASS/FAIL
   License valid:  PASS/FAIL
   Browser opened: YES/NO
   Deployed URL:   {URL}
   ```
6. ถ้า curl 3 ข้อผ่านหมด → พิมพ์: "✅ Install verified. Next: Connect Facebook in the dashboard (see CUSTOMER_GUIDE_v2 Step 4)."
7. ถ้า check ไหน fail แสดง response เต็มให้ฉัน troubleshoot
```

#### 🇬🇧 English (alternative)

```text
Test that the deployed AdsPanda AI is working. Use the URL from Prompt 2's deploy step.
Ask me to paste the URL if you don't have it. Then run each check and report pass/fail:

1. `curl -s -o /dev/null -w "%{http_code}" https://{URL}/api/health`
   Expected: 200

2. `curl -s -o /dev/null -w "%{http_code}" https://{URL}/api/license/status`
   Expected: 200

3. `curl -s https://{URL}/api/license/status | head -c 200`
   Expected: JSON containing "status":"active" (or "status":"grace") somewhere in the response

4. Open `https://{URL}` in my default browser:
   - macOS: `open https://{URL}`
   - Linux: `xdg-open https://{URL}`
   - Windows: `start https://{URL}`

5. Report results in this exact format:
   ```
   Health check:   PASS/FAIL
   License check:  PASS/FAIL
   License valid:  PASS/FAIL
   Browser opened: YES/NO
   Deployed URL:   {URL}
   ```

6. If all 3 curl checks PASS → say:
   "✅ Install verified. Next step: Connect Facebook in the dashboard.
    See CUSTOMER_GUIDE_v2.md Step 3 — requires emailing Golf to whitelist your domain."

7. If any check FAILS, show me the full response body so I can troubleshoot with Prompt 4.
```

**Success marker**: ทั้ง 3 checks เป็น PASS + AI บอก `✅ Install verified.`

> ⏳ **ถ้ามี check FAIL** → ไปที่ Prompt 4. ที่ปกติเจอ:
> - License check FAIL → License JWT ใน `.env` ผิด → กลับไปเช็ค welcome email จาก Golf
> - Health check FAIL → Deploy ยังไม่ขึ้น → ลอง `wrangler pages deployments list --project-name adbot-ai-{brand}`

**หลัง Prompt 3 ผ่าน — step ถัดไป**:
- ยังใช้งานจริงไม่ได้จนกว่าจะ **Connect Facebook**
- Connect FB ต้องทำผ่าน Golf (whitelist domain) — ทำตาม [CUSTOMER_GUIDE_v2 Step 3](./CUSTOMER_GUIDE_v2.md#step-3-configure-fb-credentials)

---

### Prompt 4: Troubleshooting (ใช้เมื่อ Prompt 1-3 error)

**Prompt นี้ทำอะไร**: ให้ AI วิเคราะห์ error + propose fix โดย **ไม่แก้ system ของคุณโดยไม่ถาม**

**ก่อน paste** — เตรียม:
- **Error message** จาก terminal (copy ทั้งหมด ไม่ตัด)
- ระบบ: macOS / Linux / Windows
- ขั้นไหนที่ error (Prompt 1 / 2 / 3 + step ย่อย)

**Copy ทั้งหมดใน fence ด้านล่าง แล้วเติมข้อมูลในวงเล็บ `[...]`**:

> 💡 **เลือกภาษาได้** — ไทยหรืออังกฤษ ผลลัพธ์เหมือนกัน

#### 🇹🇭 ภาษาไทย (แนะนำสำหรับคนไทย)

```text
ฉันเจอ error ตอนติดตั้ง AdsPanda AI ข้อมูล:

- กำลังทำอะไร: [อธิบาย — เช่น "รัน Prompt 2 ข้อ 6 — wrangler pages deploy"]
- Error message จาก terminal (ทั้งหมด):
  ```
  [paste output จาก terminal ที่นี่ ห้ามตัด]
  ```
- ระบบปฏิบัติการ: [macOS / Linux / Windows]
- Node version: `node -v`
- Wrangler version: `wrangler --version` (ถ้า error เกี่ยวกับ wrangler)

ช่วย:
1. ระบุ **root cause** ของ error — ถ้าข้อมูลไม่พอ ถามเพิ่ม (ห้ามเดา)
2. เสนอ **fix** — **ห้ามรันคำสั่งที่ modify ระบบของฉัน** (เช่น `sudo`, `rm -rf`, DNS changes) โดยไม่ถามก่อน
3. บอก **วิธี verify** ว่า fix ได้ผล (คำสั่งหรือ check)
4. ถ้า error ต้อง email AdsPanda AI (เช่น "license JWT rejected" / "Cloudflare quota exceeded" / repo 404) บอกชัดเจนว่า escalate ไม่ใช่ retry — พร้อม subject prefix ที่ควรใช้:
   - `[INSTALL-HELP]` — error ทั่วไปที่แก้เองไม่ได้
   - `[WELCOME-RESEND]` — welcome message ไม่มา
   - `[LICENSE]` — License JWT ถูก reject
   - `[URGENT-BLOCKER]` — production down / critical

Reference docs (ถ้าต้องค้นเพิ่ม):
- Manual install: https://adbot-ai.pages.dev/docs/customer-guide
- Terms of Service: https://adbot-ai.pages.dev/docs/tos
- Data Processing Agreement: https://adbot-ai.pages.dev/docs/dpa
```

#### 🇬🇧 English (alternative)

```text
I got an error while installing AdsPanda AI. Here is the context:

- What I was trying to do: [describe — e.g., "running Prompt 2 step 6 — wrangler pages deploy"]
- The exact error message from terminal:
  ```
  [paste the full terminal output here — do not truncate]
  ```
- My OS: [macOS / Linux / Windows]
- Before proposing a fix, please first run and show me:
  - `node -v`
  - `npm -v`
  - `wrangler --version` (if relevant)

Please:
1. Identify the root cause of the error. Do not guess — if you need more info,
   ask me one specific question at a time.
2. Propose a fix. IMPORTANT: Do NOT execute any command that modifies my system
   without asking me first — especially anything with `sudo`, `rm -rf`, DNS changes,
   or changing global configs. Ask me to confirm before each such command.
3. Tell me exactly how to verify the fix worked (which command to run and what
   output to expect).
4. If the error is one that I should escalate to Golf (AdsPanda AI vendor) instead of
   trying to fix locally — say so clearly. Common cases that need Golf:
   - "License JWT invalid/rejected/expired"
   - "Cloudflare account quota exceeded"
   - "Repo URL returns 404 / permission denied"
   - "Anthropic API key has insufficient credit"
   For these, tell me exactly what subject line to use (e.g., "[INSTALL-HELP] license JWT")
   and what info to paste in the email.

Reference docs (in case you need context about AdsPanda AI):
- Manual install: https://adbot-ai.pages.dev/docs/customer-guide
- Terms of Service: https://adbot-ai.pages.dev/docs/tos
- Data Processing Agreement: https://adbot-ai.pages.dev/docs/dpa
```

**เมื่อไหร่ต้อง escalate ไปหา Golf** (อย่าพยายาม fix เอง):
- License JWT reject → Golf อาจต้องออก key ใหม่
- Cloudflare quota exceeded → Cloudflare account issue ไม่ใช่ bug
- Anthropic API key ไม่มี credit → เติม credit ใน console.anthropic.com
- Repo URL เปิดไม่ได้ → Golf อาจยังไม่ได้ add คุณเป็น collaborator

**Email**: `mymint0840@gmail.com`, subject `[INSTALL-HELP] {problem summary}` — แนบ error message + screenshot

---

## ส่วนที่ 3: ข้อมูลที่ AI จะถาม + คำตอบให้พร้อม

> 💡 **Tip**: print ตารางนี้ + เติมค่าของคุณไว้ก่อน paste Prompt 1 จะเร็วขึ้นมาก

### ตาราง AI Q&A

| AI ถาม... | คุณตอบ... | หาได้จาก... |
|-----------|----------|-------------|
| Repo URL | paste HTTPS git URL (เช่น `https://github.com/.../adbot-ai.git`) | AdsPanda AI welcome email (subject `[AdsPanda AI License]`) |
| License JWT / token | paste string ยาวๆ ขึ้นต้นด้วย `eyJ...` | AdsPanda AI welcome email บรรทัด `ADBOT_LICENSE_JWT=` |
| Anthropic API key | paste key ขึ้นต้นด้วย `sk-ant-...` | console.anthropic.com → API Keys → your key (สร้างใหม่ถ้ายังไม่มี) |
| ADBOT_DOMAIN | full hostname ที่ AdsPanda AI ผูกไว้กับ license (เช่น `adbot-ai-mybrand.pages.dev`) | AdsPanda AI welcome email บรรทัด `ADBOT_DOMAIN=` — **ไม่ใช่** ค่าที่คิดขึ้นเอง; ต้องตรงกับ domain ที่ Golf mint license ไว้ |
| Cloudflare email | email ที่สมัคร dash.cloudflare.com | — |
| Custom domain (optional) | เช่น `adbot.mybrand.com` หรือข้าม (กด Enter) | DNS ที่คุณคุม |
| OS | macOS / Linux / Windows | — |

### Prep template — เติมก่อน start

Copy ไปใส่ notepad แล้วเติมค่าจริงของคุณ — มีครบก่อนค่อยเปิด AI:

```
Repo URL:          _______________________________________________
License JWT:       eyJ___________________________________________
Anthropic key:     sk-ant-_______________________________________
ADBOT_DOMAIN:        ______________________ (จาก welcome email, เช่น adbot-ai-mybrand.pages.dev)
Cloudflare email:  _______________________________________________
Custom domain:     _______________________  (หรือเว้นว่างถ้าไม่มี)
OS:                macOS / Linux / Windows
```

---

## ส่วนที่ 4: Expected outcome

**เมื่อจบ 3 Prompts (ที่ไม่ติด Prompt 4) คุณจะได้**:

- ✅ URL dashboard ของคุณ: `https://adbot-ai-{brand}.pages.dev`
- ✅ Health check + License check ผ่านทั้ง 3 ข้อ
- ✅ browser เปิดเห็นหน้า landing ของ AdsPanda AI

**ยังไม่ได้** (ต้องทำต่อหลัง guide นี้):

- ❌ Facebook Connect — ต้อง whitelist domain ผ่าน Golf ([CUSTOMER_GUIDE_v2 Step 3](./CUSTOMER_GUIDE_v2.md#step-3-configure-fb-credentials))
- ❌ TOS + DPA acceptance — ตอน **login ครั้งแรก** dashboard จะเด้ง popup ให้อ่าน + accept ([TOS-v1](./TOS-v1.md) + [DPA-v1](./DPA-v1.md))

### เวลารวม

- Prompt 1: ~10 นาที (ส่วนใหญ่เสีย `npm install` download)
- Prompt 2: ~10 นาที (wrangler login + build + deploy)
- Prompt 3: ~5 นาที (curl checks)
- **รวม ~30-45 นาที** (รวม AI thinking + กรณีต้อง retry)

### ค่าใช้จ่ายรายเดือน

| รายการ | ต่ำสุด | ทั่วไป SME |
|--------|--------|-----------|
| AI Assistant | $0 (Cursor ฟรี) | $20 (Claude Pro / ChatGPT Plus / Cursor Pro) |
| Anthropic API (BYOK) | $0 (ถ้าไม่มี bot rule ยิง) | $3-5 (SME ทั่วไป, metered) |
| Cloudflare Pages | $0 | $0 (free tier พอ) |
| AdsPanda AI license | ดู license agreement ของคุณ | ดู license agreement |
| **รวม (ไม่รวม license)** | **~$0** | **~$23-25/เดือน** |

> 💡 **ประหยัด**: ถ้าใช้ Claude Code บน free tier + ใช้ AdsPanda AI ไม่หนัก (10-20 rules) → ต้นทุนทั้งระบบประมาณ $3-5/เดือน

---

## ส่วนที่ 5: Advanced AI tips (ถ้าคุณชินกับ AI แล้ว)

- **Cursor**: เปิด folder ที่ clone repo ไป → กด Composer → paste Prompt 1 พร้อม context ของ repo ทั้งก้อน (AI เห็น structure ทันที debug ง่าย)
- **Claude Code**: ก่อน Prompt 1 รัน `/init` ใน repo dir ให้ Claude อ่าน structure ก่อน — มันจะตอบเร็วขึ้น
- **ChatGPT**: ใช้ Canvas mode ตอน AI แก้ `.env` — saveback-and-forth ได้ดีกว่า chat ปกติ
- **Batch Prompt 1+2**: ถ้า AI agentic พอ (Claude Code with tool loop) paste Prompt 1 + Prompt 2 รวมกันได้ — ประหยัดเวลารอ
- **Save log**: เติม `| tee install.log` ท้าย Prompt 1-2 → ถ้าต้อง debug จะมี log ครบ

---

<a id="english-summary"></a>

## English Summary

> Thai is the primary language for this guide. This English summary is for reference only — scroll up for full Thai detail, prep checklist, and copy-paste prompts.

### What this guide is

An **AI-assisted install path** for AdsPanda AI — built for non-technical SME customers. Customer pastes 4 prompts into any AI assistant (Claude Code, ChatGPT, Cursor) and the AI performs the install. Total time ~30-45 minutes. Sister doc [CUSTOMER_GUIDE_v2.md](./CUSTOMER_GUIDE_v2.md) covers the manual (typed-by-hand) path.

### Prep checklist (before opening AI)

1. **AI Assistant** — Claude Code (recommended), ChatGPT Plus, or Cursor — pick one
2. **Cloudflare account** — free, dash.cloudflare.com
3. **Anthropic API key** — console.anthropic.com → API Keys → create (`sk-ant-...`). ~$3-5/mo typical SME (BYOK per [DPA](./DPA-v1.md) — Customer has direct contract with Anthropic; Vendor only proxies)
4. **License JWT** — from Golf's welcome email (`eyJ...`)
5. **Repo URL** — from Golf's welcome email
6. **(Optional) Custom domain** — or use `xyz.pages.dev` free default
7. **FB App credentials** — NOT covered here; follow CUSTOMER_GUIDE_v2 Step 3 after install

### The 4 prompts

1. **Prompt 1 — Setup** (~10 min): clone repo, `npm install`, write `.env` with `ADBOT_LICENSE_JWT`, `ANTHROPIC_API_KEY`, `ADBOT_DOMAIN`
2. **Prompt 2 — Deploy** (~10 min): install Wrangler, `wrangler login`, build, `wrangler pages deploy dist`
3. **Prompt 3 — Test** (~5 min): 3 curl health checks + open in browser
4. **Prompt 4 — Troubleshoot** (generic): paste this when any step fails; AI diagnoses without modifying system unprompted

Prompts are written in English so they work on any AI regardless of Thai-language coverage. Wrapper instructions (what to paste, what success looks like, when to escalate) are in Thai above.

### What you have after (and what's still pending)

**After this guide**:
- Deployed URL: `https://adbot-ai-{brand}.pages.dev`
- Working license check (`/api/license/status` returns `"status":"active"`)
- Browser loads the landing page

**Still pending** (dependencies delivered by AdsPanda AI at purchase):
- Facebook Connect — domain whitelisted by AdsPanda AI automatically at purchase (see Option A above); check welcome message for `FB_APP_ID` + `FB_APP_SECRET`. If welcome message didn't arrive, email `[WELCOME-RESEND]` to mymint0840@gmail.com BEFORE starting install.
- TOS + DPA acceptance — dashboard shows a popup on first login; read and accept before production use (required by [TOS section 4](./TOS-v1.md) + [DPA section 8](./DPA-v1.md))

### Monthly cost (beyond AdsPanda AI license)

- AI Assistant: $0 (Cursor free) to $20 (Claude Pro / ChatGPT Plus / Cursor Pro)
- Anthropic API (BYOK): ~$3-5/mo typical SME
- Cloudflare Pages: $0 (free tier)

### If AI-assisted is not for you

- **Manual install** — follow [CUSTOMER_GUIDE_v2.md](./CUSTOMER_GUIDE_v2.md) (typed-by-hand, ~45-90 min)
- **Your own developer** — share this guide + 4 prompts; dev finishes in ~15 min

### Support & escalation

Email `mymint0840@gmail.com`:
- `[INSTALL-HELP]` — any AI-install issue not solved by Prompt 4
- `[WELCOME-RESEND]` — welcome message didn't arrive at purchase (24-hour SLA)
- `[DOMAIN-CHANGE]` — you changed your deployed domain after purchase; needs re-whitelist (1-2 business days)
- `[URGENT-BLOCKER]` — production down / critical (24-hour SLA)
- `[LICENSE]` — License JWT issues (invalid, expired, need re-issue)

Attach the full terminal error output plus screenshots for fastest resolution.
