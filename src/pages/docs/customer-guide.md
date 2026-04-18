# AdsPanda AI — Customer Setup Guide

**Version**: 2.0
**Last updated**: 2026-04-18
**For**: Customers self-hosting AdsPanda AI
**Verified on**: adbot-ai.pages.dev (Golf's reference deployment)
**Support**: mymint0840@gmail.com

---

## ภาษาไทย

> 🌐 **จำลองภาษาอังกฤษ / See English summary ↓** — [ข้ามไป English Summary](#english-summary)

## คุณคือใคร? (เลือก install path ตามจริง — honest self-assessment)

ก่อนอ่าน overview ด้านล่าง — เลือก install path ที่เหมาะกับคุณ เพื่อไม่เสียเวลาอ่านผิดคู่มือ:

### ⚡ ใครก็ได้ (ไม่ต้องรู้ code) → **RECOMMENDED**

→ **Quick Install (1-click)** (ฟรี, ~90 วินาที)

- กด "Deploy to Cloudflare" 1 ครั้ง — Cloudflare ตั้ง D1 + KV + Pages ให้อัตโนมัติ
- ไม่ต้องเปิด terminal, ไม่ต้องพิมพ์คำสั่ง, ไม่ต้อง `git clone`
- เสร็จแล้วรอ email license JWT จาก AdsPanda → paste ในหน้า setup ของ instance ใหม่
- เอกสาร: [Quick Install](./quick-install.md) หรือไปที่หน้า [/docs/quick-install](/docs/quick-install) แล้วกดปุ่ม

### 👨‍💻 Developer / ใช้ command line ได้คล่อง / มีทีม IT → **DEVELOPER ONLY**

→ **Manual Install** (ฟรี, ~60-90 นาที)

- ต้องรู้ terminal, เคย `git clone` + `npm install`, debug error ได้เอง
- เอกสาร: [MANUAL_INSTALL.md](./MANUAL_INSTALL.md)
- ไม่แนะนำสำหรับมือใหม่ — ไม่มี screenshot, text-heavy, expect debug ด้วยตัวเอง

### 🤖 อยากใช้ AI ช่วยติดตั้งแทนปุ่ม → **BACKUP**

→ **AI-Assisted Install** (~฿0-700/mo AI subscription, ~30-45 นาที)

- AI assistant (Claude Code / ChatGPT / Cursor) ทำให้หมด
- คุณแค่ copy 4 prompts + ตอบคำถาม + paste credentials
- ถ้าติดปัญหา AI debug + อธิบาย + แนะนำ fix
- เอกสาร: [AI_ASSISTED_INSTALL.md](./AI_ASSISTED_INSTALL.md)

### 💰 ไม่อยากเรียน + ไม่อยากจ่าย AI + กลัวพัง

→ **AdsPanda Setup Service** (one-time ฿2,000-5,000, ~30 นาที)

- AdsPanda ติดตั้งให้ทาง remote (TeamViewer / AnyDesk)
- ~30 นาที เสร็จ + garansi ใช้งานได้
- ติดต่อ: email `[SETUP-SERVICE]` ไป `mymint0840@gmail.com` — ระบุ domain + FB business info
- ราคายืนยันหลังคุยรายละเอียด (ช่วง ฿2,000-5,000)

> 💡 **ตัดสินใจง่ายๆ**:
> - เริ่มต้น → Quick Install (RECOMMENDED, 1-click)
> - ถ้า Quick Install ใช้ไม่ได้ / อยากใช้ AI แทน → AI-Assisted (BACKUP)
> - ถ้าเป็น developer / มีทีม IT → Manual (DEVELOPER ONLY)
> - ถ้าไม่อยากทำเอง → Setup Service (paid)

เอกสารนี้ (**CUSTOMER_GUIDE_v2**) คือ **overview + reference** — เปรียบเสมือน TOC และเล่าภาพรวมของระบบ. อ่านส่วนที่ 1-2 เพื่อเข้าใจ architecture + Full Mirror + 6 setup steps (high level). **ถ้าจะติดตั้งจริง** ให้กระโดดไปเลือก path ตามด้านบน

---

### 1. ภาพรวม (Overview)

**ระบบนี้ทำอะไร**

AdsPanda AI คือเครื่องมือ automate โฆษณา Facebook — คุณเขียนกฎเป็นภาษาคน เช่น "ถ้า ROAS ต่ำกว่า 1.5 ให้หยุด ad set นี้" หรือ "ถ้า CPC พุ่งเกิน ลด budget 20%" ระบบจะ poll Insights API ทุก 15 นาทีและกดปุ่มแทนคุณตอนตี 2 ที่คุณนอนอยู่ Dashboard เห็นผล real-time ไม่ต้องเปิด Ads Manager ทุกเช้า

**ใช้กับใคร**

- SMB e-commerce ที่รันหลาย campaign พร้อมกัน
- Freelance performance marketer ที่ดูแลหลาย client
- In-house growth team ที่อยากปิด gap ช่วงกลางคืน / วันหยุด
- กลุ่มหลัก: คนไทย ขายของบน FB/IG ทุก budget size

**Architecture สั้นๆ**

- **โค้ดคุณ host เอง** — อยู่บน Cloudflare Pages / Railway / Vercel ของคุณ ข้อมูลไม่ออกไปไหน
- **FB App กลางของ Golf** — คุณไม่ต้องสมัคร Meta App เอง คุณ connect ผ่าน OAuth มาที่ FB App ของ Golf (model v1 — ดู assumption ท้ายหัวข้อ)
- **Meta bill คุณตรง** — AdsPanda AI ไม่แตะเงิน ไม่เก็บบัตร ค่าโฆษณา Meta เรียกเก็บจากบัตรที่คุณผูกไว้กับ ad account

**Requirements Checklist**

- [ ] Facebook Business Manager ที่ active (ไม่โดน restrict)
- [ ] อย่างน้อย 1 ad account ใน Business Manager
- [ ] Domain name ของคุณเอง (เช่น `adbot.mybrand.com`) — ใช้ตอนซื้อ license เพื่อให้ AdsPanda AI whitelist ใน FB App ให้อัตโนมัติ
- [ ] Cloudflare account (free tier พอ)
- [ ] Node.js 20+ + npm บนเครื่อง dev
- [ ] ความคุ้นเคย terminal ระดับ copy-paste คำสั่ง (หรือมีเพื่อน dev ช่วย day 1)
- [ ] OpenAI API key (optional — เฉพาะถ้าเปิด AI rule suggestion)

**⏱️ เวลาโดยประมาณ**

- **45-90 นาที** (เมื่อได้รับ welcome message พร้อม credentials แล้ว และไม่ต้องทำ Business Verification)
- **2-7 วัน** ถ้าต้องรอ Business Verification (เฉพาะเคสใช้ advanced scopes)

> 💡 **Tip**: ก่อน start ตรวจ welcome message (email หรือ LINE) ว่ามี credentials ครบ 4 อย่าง — `FB_APP_ID` + `FB_APP_SECRET` + License Key (JWT) + GitHub repo invite ถ้ามีครบแล้วเริ่ม Step 1 ได้ทันที ไม่มีจุดรอระหว่างทาง

> ⏳ **Model v1 Assumption**: คู่มือนี้เขียนจากสมมติฐานว่า AdsPanda AI ใช้ **FB App กลาง 1 ตัว** ให้ลูกค้าทุกคน connect ผ่าน OAuth. credentials (FB_APP_ID + FB_APP_SECRET + domain whitelist) ถูก deliver ให้ลูกค้าอัตโนมัติตอนซื้อ license ผ่าน welcome message. ถ้าในอนาคต AdsPanda AI switch เป็น per-customer FB App (ลูกค้าแต่ละคนสมัคร Meta App ของตัวเอง), Touchpoint หลายข้อจะย้ายจาก 🟡 ไปเป็น 🟢 — ดู [APP_REVIEW_SUBMISSION.md](./APP_REVIEW_SUBMISSION.md) ซึ่งเขียนไว้รองรับ per-customer app แล้ว

---

### 2. การเข้าถึงข้อมูลของผู้ให้บริการ (Vendor Data Access)

> 🚨 **Full Mirror Model — อ่านก่อนเริ่ม Setup**
>
> AdsPanda AI ใช้ model แบบ "Full Mirror" — **Vendor (AdsPanda AI/Golf) มี read-only access** ไปยัง deployment ที่คุณ host เอง เพื่อ security monitoring + compliance oversight. คุณต้องยอมรับ [Data Processing Agreement (DPA)](./DPA-v1.md) ตอน Step 3 ของการ setup

**Why — ทำไม Vendor ต้องเข้าถึง**

- **Security monitoring**: ตรวจจับ abuse, config drift, breach attempts ก่อนที่คุณจะรู้ตัว — protection ฟรีที่มาพร้อม license
- **Compliance oversight**: ยืนยันว่าการใช้งานตรงตาม Facebook Advertising Policies + กฎหมายไทย (PDPA) + GDPR ถ้าคุณมี subject ใน EU
- **Support assistance**: เมื่อคุณส่ง `[URGENT-BLOCKER]` email เราจะเข้าไปดู log จริงของคุณ ไม่ต้องเสียเวลาถ่ายทอด error

**What — Vendor เห็นอะไรได้บ้าง**

- Campaign data, automation rules, dashboard logs, config
- User actions ภายใน AdsPanda AI dashboard ของคุณ
- Error logs + technical telemetry
- Audit trail ของ rules ที่รันไปแล้ว

**What NOT — Vendor ทำอะไรไม่ได้**

- ❌ ไม่แก้ไขข้อมูล (read-only เท่านั้น — เว้นแต่คุณ authorize เฉพาะครั้งสำหรับ support)
- ❌ ไม่ดึง FB ad spend หรือ credentials ของคุณไปใช้เอง
- ❌ ไม่ขายข้อมูล ไม่แชร์กับ ad network บุคคลที่สาม
- ❌ ไม่ดู email, contact list, หรือข้อมูลที่ไม่เกี่ยวกับ AdsPanda AI operation

**How — การ audit**

ทุกการเข้าถึงของ Vendor ถูก **audit-log** ไว้ (who / when / what) และคุณร้องขอดูเมื่อใดก็ได้:

- Email `[AUDIT-LOG]` subject → `mymint0840@gmail.com`
- ระบุช่วงวันที่ + reason
- Vendor ส่ง CSV export ให้ **ภายใน 7 วันทำการ**

**Customer Rights**

- คุณ **ลบ audit log ของ Vendor access ได้** ถ้าเลยอายุ retention (1 ปี)
- คุณ **คัดค้าน sub-processor ใหม่** ได้ภายใน 30 วันก่อน Vendor เปลี่ยน
- คุณ **ขอย้ายไป Option A (no Vendor access)** ได้ตามเงื่อนไขใน DPA — แต่จะเสียสิทธิ security monitoring ที่ come bundled

> 💡 **Tip**: ถ้าคุณอยู่ในอุตสาหกรรม regulated heavy (finance / healthcare / government) และไม่ต้องการ vendor access — maw Golf ก่อน purchase. Option A มีค่าใช้จ่ายต่างออกไป

**เอกสารอ้างอิง**

- [Terms of Service (TOS-v1.md)](./TOS-v1.md) — section 4 Full Mirror Disclosure
- [Data Processing Agreement (DPA-v1.md)](./DPA-v1.md) — section 7 Processor Obligations + Appendix C Breach Notification

---

### 3. ขั้นตอนติดตั้ง (Setup Steps)

รวม 6 ขั้นตอน — 4 ขั้นเป็น 🟢 Self-service (ทำเองได้ end-to-end), 2 ขั้นเป็น 🟡 Golf-touchpoint (พึ่ง credentials ที่ AdsPanda AI deliver ให้ตอนซื้อ — ไม่มีการรอกลางทาง)

---

#### Step 1: Clone repo + Cloudflare setup

**ประเภท**: 🟢 Self-service
**เวลา**: ~15 นาที
**ต้องมี**: GitHub account, Cloudflare account (free), Node.js 20+, npm

ขั้นนี้คือการดึงโค้ดลงเครื่อง ติดตั้ง dependency และเตรียม Cloudflare project ไว้รอ deploy

**คำสั่ง / Actions**:

```bash
# 1) clone repo — ใช้ GitHub invite link จาก welcome message (AdsPanda AI ส่งให้ตอนซื้อ license)
#    ถ้ายังไม่ได้รับ welcome message — อย่าเพิ่งเริ่ม Step 1
#    email [WELCOME-RESEND] หา AdsPanda AI ก่อน (ดูช่วง "Golf-Touchpoints Checklist")
git clone <REPO_URL_FROM_WELCOME_MESSAGE>.git
cd adbot-ai

# 2) ติดตั้ง dependency
npm install

# 3) ติดตั้ง Wrangler CLI (global) + login Cloudflare
npm install -g wrangler
wrangler login

# 4) สร้าง Pages project เปล่าๆ ไว้รอ deploy
wrangler pages project create adbot-ai-yourbrand --production-branch main
```

**Verify success**:
- [ ] `npm install` จบโดยไม่มี error สีแดง
- [ ] `wrangler whoami` ขึ้นชื่อ account คุณ
- [ ] เปิด Cloudflare Dashboard → Pages → เห็น project `adbot-ai-yourbrand` แล้ว

> 💡 **Tip**: ตั้งชื่อ project ให้มี brand ของคุณ (เช่น `adbot-ai-acme`) — ช่วยให้คุณ debug ง่ายตอนมีหลาย environment (staging/prod หรือ brand หลายตัว)

---

#### Step 2: Run setup.sh

**ประเภท**: 🟢 Self-service
**เวลา**: ~5 นาที
**ต้องมี**: Step 1 เสร็จแล้ว

`setup.sh` เป็น interactive script ที่ถามค่าทั้งหมดที่ต้องใส่ใน `.env` — domain, admin email, feature flags — แล้ว generate ไฟล์ `.env` ให้อัตโนมัติ ไม่ต้องจำชื่อ env var

**คำสั่ง / Actions**:

```bash
# รันจาก root ของ repo
./scripts/setup.sh

# ถ้าอยาก skip prompts และใช้ default ทั้งหมด
./scripts/setup.sh -y
```

**Expected output**:

```
AdsPanda AI — Setup
================
[1/5] Checking prerequisites... OK (Node 20.11, npm 10.2, wrangler 3.x)
[2/5] Your app domain? → adbot.mybrand.com
[3/5] Admin email for alerts? → you@mybrand.com
[4/5] Enable AI rule suggestions (needs OpenAI key)? → n
[5/5] Writing .env... OK

Next:
  1) Paste FB_APP_ID + FB_APP_SECRET from welcome message into .env
  2) Run: wrangler pages deploy
  3) Test OAuth round-trip (Step 4)
```

**Verify success**:
- [ ] ไฟล์ `.env` โผล่ที่ root ของ repo
- [ ] `cat .env | grep -v SECRET` (อ่านแบบไม่โชว์ secret) เห็น `ADBOT_DOMAIN=adbot.mybrand.com` ถูกต้อง
- [ ] Script ไม่ตกที่ step ไหน

> ⏳ **ระวัง**: `.env` ถูก gitignore ไว้แล้ว ห้าม commit เด็ดขาด — ถ้า commit ไปแล้วโดย accident ให้ email `[URGENT-BLOCKER]` แจ้ง AdsPanda AI ทันทีเพื่อ rotate `FB_APP_SECRET` ให้ใหม่ (credentials managed ฝั่ง AdsPanda AI)

---

#### Step 3: Configure FB credentials

**ประเภท**: 🟡 **GOLF-TOUCHPOINT** (dependency ที่ AdsPanda AI ส่งมอบ — ไม่ใช่จุดรอกลางทาง)
**เวลา**: ~5 นาที (ถ้า welcome message มาถึงแล้ว)
**ต้องมี**: Step 2 เสร็จ, domain ของคุณพร้อมใช้ (DNS ชี้มา Cloudflare Pages แล้ว), welcome message จาก AdsPanda AI

> ✅ **Pre-check ก่อน start Step 3**: เปิด welcome email หรือ LINE จาก AdsPanda AI แล้วยืนยันว่ามีทั้ง 4 อย่างครบ:
>
> 1. `FB_APP_ID` (ตัวเลข 15-16 หลัก)
> 2. `FB_APP_SECRET` (hex string)
> 3. License Key (JWT — string ยาว ขึ้นต้น `eyJ...`)
> 4. GitHub repo invite link
>
> ถ้า welcome message ยังมาไม่ถึงหรือขาดข้ออะไร — **หยุด แล้ว email `[WELCOME-RESEND]` ก่อนทำ Step 3** (ดู Golf-Touchpoints Checklist ด้านล่าง) ห้ามเริ่ม Step 3 แบบค้างไว้ครึ่งทาง

ขั้นนี้คือการ paste credentials ที่ AdsPanda AI deliver ให้ตอนซื้อ license ลงใน `.env` — AdsPanda AI จัดการ whitelist domain + ออก credentials ให้เรียบร้อยแล้วตั้งแต่ตอนซื้อ คุณแค่ copy-paste

> 🚨 **Golf-touchpoint — ทำไมยังเป็น 🟡 ทั้งที่ดูเหมือน self-service**
>
> AdsPanda AI v1 ใช้ **FB App กลางตัวเดียว** ที่ AdsPanda AI เป็นเจ้าของ — ลูกค้าทุกคน connect Facebook ผ่าน App ID เดียวกัน credentials (`FB_APP_ID` + `FB_APP_SECRET`) + domain whitelist ถูก **AdsPanda AI-managed** = เฉพาะ AdsPanda AI เท่านั้นที่แก้ได้ใน Meta Developer Console
>
> AdsPanda AI deliver ให้ **อัตโนมัติตอนซื้อ license** ผ่าน welcome email/LINE — ไม่ต้องขอ ไม่ต้องรอ mid-install ถ้าคุณถึง Step 3 แต่ยังไม่มี credentials ในมือ = purchase flow อาจไม่สมบูรณ์ ต้อง contact AdsPanda AI (subject `[WELCOME-RESEND]`) ก่อน

**Actions**:

1. เปิด welcome message → copy `FB_APP_ID` + `FB_APP_SECRET`
2. เปิด `.env` ที่ Step 2 สร้างไว้ → paste 2 บรรทัด:

```bash
# .env (เพิ่ม 2 บรรทัดนี้)
FB_APP_ID=1234567890123456
FB_APP_SECRET=abc123def456...
```

3. Save file — พร้อมไป Step 4 (Deploy + verify)

**Verify success**:
- [ ] `.env` มี `FB_APP_ID` และ `FB_APP_SECRET` ครบ ตรงกับที่อยู่ใน welcome message
- [ ] ทั้งสองค่าไม่มีช่องว่างหน้า/หลัง (common bug จาก copy-paste)
- [ ] `ADBOT_DOMAIN` ใน `.env` (จาก Step 2) ตรงกับ domain ที่ AdsPanda AI whitelist ให้ตอนซื้อ (ดู welcome message ยืนยัน)

> ⏳ **ถ้าข้าม step นี้**: OAuth จะ fail ทันทีที่ลูกค้าคุณกด "Connect Facebook" บน dashboard — user จะเจอหน้า error ของ Meta (`URL Blocked`) ไม่ใช่หน้า dashboard ของคุณ

---

#### Step 4: Deploy + verify

**ประเภท**: 🟢 Self-service
**เวลา**: ~10 นาที
**ต้องมี**: Step 1-3 เสร็จครบ

Deploy โค้ดขึ้น Cloudflare Pages + ทดสอบ OAuth round-trip จริงว่า connect Facebook ได้

**คำสั่ง / Actions**:

```bash
# 1) Build + deploy
npm run build
wrangler pages deploy dist --project-name adbot-ai-yourbrand

# 2) เปิด browser ไปที่ custom domain
open https://adbot.mybrand.com

# 3) กด "Connect Facebook" → เลือก ad account → confirm
# 4) เช็ค dashboard populate ข้อมูล campaign หรือยัง
```

**Expected**: หลังกด Connect Facebook เสร็จ จะเจอ banner:

```
✅ Connected: [your Facebook name]
   Ad accounts: 2 connected
   Pages: 1 connected
```

**Verify success**:
- [ ] หน้า `/` ของ domain โหลดได้ (ไม่ใช่ 404/500)
- [ ] กด "Connect Facebook" ไปหน้า OAuth ของ Meta ได้ (ไม่เจอ URL Blocked)
- [ ] OAuth callback กลับมาที่ domain คุณสำเร็จ (ไม่เจอ error)
- [ ] Dashboard โชว์ชื่อ ad account จริงจาก Business Manager
- [ ] เปิด Browser DevTools → Console → ไม่มี error สีแดง

> ✅ **Checkpoint**: ถ้าเห็น "Connected" banner และมี ad account โผล่ขึ้นมา — **OAuth flow ทำงาน 100%** ถือว่าส่วน critical จบแล้ว Step ที่เหลือคือ polish

---

#### Step 5: (Optional) Deploy Privacy + Terms

**ประเภท**: 🟢 Self-service (optional แต่แนะนำ)
**เวลา**: ~30-60 นาที
**ต้องมี**: Step 4 เสร็จ, domain ทำงานแล้ว

ถ้าคุณใช้ FB App กลางของ Golf — Privacy/Terms URL ที่ชี้ไปที่ Meta Dev Console เป็นของ Golf อยู่แล้ว คุณไม่ต้องมีของตัวเองก็รันได้ **แต่แนะนำให้ทำ** ด้วย 2 เหตุผล:

1. **ความน่าเชื่อถือกับลูกค้าของคุณเอง** — เมื่อ end user ของคุณกด Connect Facebook บนแอป พวกเขาจะอยากเห็น Privacy ของ **brand คุณ** ไม่ใช่ของ Golf
2. **Future-proof** — ถ้าในอนาคตคุณจะย้ายไปใช้ FB App ของตัวเอง (model v2) จะต้องมี Privacy/Terms URL ของตัวเองอยู่ดี ทำไว้ก่อนตอนนี้ = ปลอดภัยไว้ก่อน

**Actions**: ทำตาม [PRIVACY_DEPLOY_NOTE.md](./PRIVACY_DEPLOY_NOTE.md) ในชุดเดียวกัน — สรุป 4 ขั้น:

1. โหลด template `privacy-policy-v1.1.md` + `terms-of-service-v1.1.md` จาก `~/shared/`
2. Find-and-replace 11 placeholder (domain, email, ชื่อธุรกิจ, hosting stack, จังหวัดศาล ฯลฯ)
3. Deploy ที่ route `/privacy` + `/terms` บน domain คุณ (แนะนำ Option A — Cloudflare Pages)
4. ถ้าในอนาคตต้องใช้ Meta Dev Console เอง — paste URL ทั้ง 2 ไปใน Settings → Basic

**Verify success**:
- [ ] `https://adbot.mybrand.com/privacy` ตอบ 200 และ render อ่านได้
- [ ] `https://adbot.mybrand.com/terms` ตอบ 200 และ render อ่านได้
- [ ] ไม่มี placeholder `facebook-ad-scaler.pages.dev` หลงเหลือในเอกสาร publish แล้ว (ค้นด้วย `grep`)

> 💡 **Tip**: ถ้าไม่อยู่ในไทย ก่อน publish ให้ทนายในประเทศคุณ review สัก 1 ชั่วโมง — PDPA ไม่เท่ากับ GDPR ไม่เท่ากับ CCPA

---

#### Step 6: Business Verification (conditional)

**ประเภท**: 🟡 **GOLF-TOUCHPOINT** (เฉพาะบางเคส)
**เวลา**: 3-5 วันทำการ (Meta review)
**ต้องมี**: ธุรกิจของคุณจดทะเบียนแล้ว (มีเอกสารรับรองบริษัท)

**เมื่อไหร่ต้องทำ**:
- ใช้ advanced scopes (ads_management) บน ad account **จำนวนมาก** (เกิน threshold ของ Meta — ปกติเริ่มที่ ~50 accounts หรือ spend level สูง)
- ลูกค้าของคุณเป็น legal entity คนละตัวกับคุณ (agency model) — Meta ต้องการ Business Verification ภายใต้ Golf's umbrella

**ไม่ต้องทำ**:
- ใช้งานส่วนตัว / SMB scale (1-10 ad accounts ของตัวเอง)
- เพิ่งเริ่มใช้และยังไม่แตะ rate limit ของ Meta

> 🚨 **Golf-touchpoint — ทำไมต้องผ่าน Golf**
>
> Business Verification ใน model v1 ทำภายใต้ FB App กลางของ Golf ซึ่งแปลว่าเอกสารธุรกิจของคุณต้อง submit เข้าระบบ Meta ผ่าน account ของ Golf ไม่ใช่ของคุณ — Golf จะช่วยเตรียม submission + ติดตาม status ให้

**Actions**:

1. ส่ง email `[BIZVERIFY]` มาที่ `mymint0840@gmail.com` พร้อมเอกสาร:
   - หนังสือรับรองบริษัท (ไม่เกิน 90 วัน)
   - สำเนาบัตรประชาชนของกรรมการผู้มีอำนาจ
   - เอกสารยืนยันที่อยู่ธุรกิจ (ใบเสร็จค่าไฟ/ค่าเช่า ไม่เกิน 90 วัน)
   - โดเมนและชื่อที่ใช้แสดงบน FB App
2. Golf review เอกสาร + submit เข้า Meta (1-2 วันทำการ)
3. Meta review (3-5 วันทำการ) — Golf monitor + แจ้ง status ให้
4. ผ่านแล้ว Golf เปิด advanced scopes ให้ `FB_APP_ID` ของคุณอัตโนมัติ ไม่ต้องเปลี่ยน `.env`

**Verify success**:
- [ ] Golf reply confirm ว่า submit เข้า Meta แล้ว (พร้อม reference number)
- [ ] ได้รับ email จาก Meta ว่าผ่าน Business Verification (หรือได้ status ผ่าน Golf)
- [ ] ลองรันกฎ automation ที่ใช้ `ads_management` จริง — ไม่เจอ error `permission denied`

---

### 4. ⚠️ Golf-Touchpoints Checklist

> **Print this one page.** ทุก interaction กับ Golf ที่คุณจะมีตลอด lifecycle อยู่ในตารางนี้ทั้งหมด

| # | Touchpoint | เมื่อไหร่ | วิธี request | Turnaround |
|---|-----------|-----------|---------------|------------|
| 1 | Credentials delivery (domain whitelist + FB App creds + License JWT + GitHub invite) | AdsPanda AI action ตอนซื้อ license — ก่อน install เริ่ม | อัตโนมัติผ่าน welcome email/LINE ตอนซื้อ | ที่จุดซื้อ (at purchase) — verify welcome message |
| 2 | Welcome message ไม่มาถึง / ขาดบางอย่าง | ก่อน start Step 1 ถ้า check แล้วไม่ครบ | Email `[WELCOME-RESEND]` → `mymint0840@gmail.com` พร้อม order ID + ช่องทางที่ซื้อ | 24 ชั่วโมง |
| 3 | Domain change หลังซื้อ license | ถ้าเปลี่ยน domain deploy หลัง purchase | Email `[DOMAIN-CHANGE]` พร้อม domain เดิม + domain ใหม่ + order ID | 1-2 วันทำการ |
| 4 | Business Verification | Conditional (advanced scopes) | Email `[BIZVERIFY]` พร้อมเอกสารธุรกิจครบ | 3-5 วันทำการ |
| 5 | License key (เมื่อเริ่มขาย tier อื่น) | TBD pending pricing | Email `[LICENSE]` พร้อมชื่อธุรกิจ + tier | TBD |
| 6 | Technical escalation | เมื่อ Troubleshooting ไม่หาย | Email `[URGENT-BLOCKER]` พร้อม error logs + timeline | 24 ชั่วโมง |

**สำคัญ**: ทุก touchpoint ใช้อีเมลเดียว `mymint0840@gmail.com` — subject prefix ช่วย AdsPanda AI triage ได้เร็ว

**Response SLA**:
- `[URGENT-BLOCKER]`, `[WELCOME-RESEND]` → 24 ชั่วโมง
- `[DOMAIN-CHANGE]`, `[BIZVERIFY]` → 1-2 วันทำการ (BIZVERIFY ขึ้นกับ Meta: 3-5 วัน)
- อื่นๆ → 7 วันทำการ standard

> 💡 **Tip — จำง่ายๆ**: Self-service ทำได้ end-to-end **ถ้า welcome message ครบ** Golf-touchpoint ที่เหลือคือ **Business Verification** (เฉพาะเคส advanced scopes) + `[WELCOME-RESEND]` (ถ้า welcome message หาย) + `[DOMAIN-CHANGE]` (ถ้าเปลี่ยน domain หลังซื้อ) นอกจากนั้นคุณคุมเอง

---

### 5. Troubleshooting

<details id="oauth-redirect-fails" open>
<summary>Problem: OAuth redirect fails — "URL not whitelisted"</summary>

**สิ่งที่เห็น**: กด "Connect Facebook" แล้วเด้งไปหน้า Meta ที่ขึ้นว่า
```
URL Blocked: This redirect failed because the redirect URI is not white-listed in the app's client OAuth settings.
```

**สาเหตุที่เป็นไปได้**:
- AdsPanda AI whitelist domain ให้ตอนซื้อ license แต่ deployed domain ของคุณไม่ตรงกับที่ระบุตอน purchase (เช่น welcome message บอก `adbot.mybrand.com` แต่คุณ deploy ไปที่ `www.adbot.mybrand.com`)
- คุณเปลี่ยน domain หลังซื้อ license แต่ยังไม่ได้แจ้ง AdsPanda AI re-whitelist
- `ADBOT_DOMAIN` ใน `.env` สะกดผิด / มี trailing slash / protocol ไม่ตรง (`https` vs `http`)

**วิธีแก้**:
1. เปิด welcome message → ดู domain ที่ AdsPanda AI whitelist ให้ตอนซื้อ
2. เปิด `.env` → เทียบ `ADBOT_DOMAIN` กับ domain ใน welcome message ให้ตรงเป๊ะ (รวม subdomain + protocol)
3. ถ้าต่างกันแค่สะกด → แก้ `.env` ให้ตรง แล้ว redeploy (`wrangler pages deploy`)
4. ถ้าเปลี่ยน domain จริง (ไม่ใช่แค่สะกดผิด) → email `[DOMAIN-CHANGE]` หา AdsPanda AI พร้อม order ID + domain เดิม + domain ใหม่ (SLA 1-2 วันทำการ)
5. หลังแก้ → เปิด incognito ทดสอบใหม่ (cache browser อาจค้าง)

**ถ้ายังไม่หาย**: Email `[URGENT-BLOCKER]` พร้อม screenshot หน้า URL Blocked + ค่า `ADBOT_DOMAIN` ใน `.env` + domain ที่อยู่ใน welcome message (ห้ามแนบ `FB_APP_SECRET`)

</details>

---

<details id="setup-sh-fails">
<summary>Problem: setup.sh fails — "missing env var"</summary>

**สิ่งที่เห็น**:
```
Error: ADBOT_DOMAIN is required but was empty
[5/5] Writing .env... FAILED
```

**สาเหตุที่เป็นไปได้**:
- User กด enter ข้าม prompt สำคัญ
- Terminal ของคุณ pipe input เข้ามาไม่ถูก (รันผ่าน CI/CD หรือ SSH)

**วิธีแก้**:
1. รันใหม่แบบ interactive: `./scripts/setup.sh`
2. ตอบทุก prompt อย่าเว้นว่าง
3. หรือรันแบบ `-y` แล้วแก้ `.env` ด้วยมือ:
```bash
./scripts/setup.sh -y
nano .env   # แก้ค่าที่ผิดด้วย editor ที่ถนัด
```

**ถ้ายังไม่หาย**: เช็คว่า Node version ตรง (`node -v` ต้อง 20+) — เวอร์ชันเก่าอาจทำ script ตกกลางทาง

</details>

---

<details id="dashboard-0-campaigns">
<summary>Problem: Dashboard shows "0 campaigns" after Connect</summary>

**สิ่งที่เห็น**: Connect Facebook สำเร็จ เห็น banner "Connected" แต่ dashboard ว่างเปล่า ไม่มี campaign ขึ้น

**สาเหตุที่เป็นไปได้**:
- FB account ที่ใช้ connect ไม่มี campaign active จริง
- ตอน OAuth ไม่ได้ tick ad account ใดเลย (ข้าม screen เลือก account)
- Scope `ads_read` หรือ `business_management` ไม่ได้ถูก grant (user กด "Edit" ใน Meta consent screen แล้ว uncheck)

**วิธีแก้**:
1. เปิด Facebook → Settings → Business Integrations → ค้นหา AdsPanda AI → เช็คว่า "Permissions" มีครบทั้ง ads_read, ads_management, business_management
2. ถ้าขาดข้อไหน → Remove แล้ว Reconnect จาก dashboard AdsPanda AI ใหม่
3. ถ้าเชื่อมครบแล้วแต่ยังว่าง → เปิด Ads Manager เช็คว่ามี campaign ที่ status ไม่ใช่ DELETED จริงมั้ย

**ถ้ายังไม่หาย**: Email `[HELP]` + screenshot Business Integrations + bullet ว่าเห็นกี่ campaign ใน Ads Manager

</details>

---

<details id="rate-limit-reached">
<summary>Problem: "Rate limit reached" error</summary>

**สิ่งที่เห็น**: ใน Automation Log เจอ error
```
Graph API error (code 17): User request limit reached
```

**สาเหตุที่เป็นไปได้**:
- ตั้ง rule ให้รันถี่เกินไป (ทุก 1 นาที × 50 accounts = 3000 calls/hour)
- มี rule หลายตัวเช็ค metric เดียวกันซ้ำ
- Meta ลด quota สำหรับ app ที่ยังไม่ผ่าน Business Verification

**วิธีแก้**:
1. เปิด Settings → Rules → ปรับ polling interval เป็น 15 นาที (minimum แนะนำ)
2. รวม rule ที่เช็ค metric เดียวกันให้เหลือ 1 ตัว
3. ถ้า quota ต่ำผิดปกติ → ส่ง `[BIZVERIFY]` ขึ้น Business Verification ผ่าน Golf

**ถ้ายังไม่หาย**: รอ 1 ชั่วโมงให้ quota reset + ลด polling frequency ลงครึ่งหนึ่ง

</details>

---

<details id="wrangler-deploy-fails">
<summary>Problem: Wrangler deploy fails — "account not found"</summary>

**สิ่งที่เห็น**:
```
✘ [ERROR] A request to the Cloudflare API failed.
Account ID not found or insufficient permissions.
```

**สาเหตุที่เป็นไปได้**:
- `CLOUDFLARE_ACCOUNT_ID` ใน `wrangler.toml` ไม่ตรงกับ account ที่ login
- Login Wrangler เป็น account A แต่ project อยู่ใน account B
- Token หมดอายุ (ไม่ค่อยเจอแต่มีได้)

**วิธีแก้**:
1. `wrangler whoami` → ดูว่า login account ไหน
2. เปิด Cloudflare Dashboard → เลือก account ขวาบน → คัดลอก Account ID
3. เปิด `wrangler.toml` → แทนค่า `account_id = "..."` ให้ตรง
4. Re-login: `wrangler logout && wrangler login`

**ถ้ายังไม่หาย**: ลบ project เก่าใน dashboard แล้วสร้างใหม่ภายใต้ account ที่ถูกต้อง

</details>

---

<details id="automation-rules-no-trigger">
<summary>Problem: Automation rules don't trigger</summary>

**สิ่งที่เห็น**: ตั้งกฎไว้แล้ว เงื่อนไขเข้าแล้ว แต่ Automation Log ว่างเปล่า ไม่มี rule fire

**สาเหตุที่เป็นไปได้**:
- Scheduler ไม่ทำงาน (Cloudflare Workers cron ไม่ได้ deploy)
- Rule status เป็น "Paused" แทน "Active"
- เงื่อนไขกฎ tight เกินไป (เช่น ต้องการข้อมูล 7 วันแต่ campaign เพิ่งรัน 3 วัน)

**วิธีแก้**:
1. Cloudflare Dashboard → Workers & Pages → เลือก project → Triggers → เช็คว่ามี cron schedule ตั้งไว้
2. ถ้าไม่มี → `wrangler deploy` ใหม่ (cron เขียนใน `wrangler.toml` ต้อง deploy พร้อมกัน)
3. เช็ค rule status ใน dashboard → toggle เป็น Active
4. ลองกด "Run now" ใน rule detail → ดู log ว่าเงื่อนไข evaluate ออกมา true/false

**ถ้ายังไม่หาย**: Email `[HELP]` + export rule config (JSON) + screenshot Automation Log timestamp ล่าสุด

</details>

---

<details id="fb-token-expires">
<summary>Problem: FB token expires after 60 days</summary>

**สิ่งที่เห็น**: หลังใช้งาน ~60 วัน dashboard ขึ้น banner
```
Facebook connection expired. Please reconnect.
```

**สาเหตุที่เป็นไปได้**:
- Long-lived token ของ Meta มีอายุ 60 วันเป็น default — หมดอายุเป็นเรื่องปกติ
- User ใน Meta ไปกด Remove integration ด้วยตัวเอง

**วิธีแก้**:
1. กด "Reconnect Facebook" บน dashboard → จะเด้งไป OAuth consent → ยืนยัน → เสร็จ
2. ข้อมูลเก่า (campaign history, rule config) ยังอยู่ครบ — token refresh เท่านั้น

**ถ้ายังไม่หาย**: Token refresh automatic feature อยู่ในแผน roadmap — ดู changelog เมื่อ ship แล้ว (Golf จะประกาศใน email update)

</details>

---

### 6. การต่ออายุ / Updates / Support

**อัปเดต code**

```bash
cd adbot-ai
git pull origin main
npm install   # เผื่อมี dependency ใหม่
wrangler pages deploy dist --project-name adbot-ai-yourbrand
```

Minor version ไม่มี DB migration — pull + deploy จบ
Major version (v1 → v2) จะมี migration script แยก + Golf จะประกาศล่วงหน้าใน email

**Token Refresh**

FB token หมดอายุทุก 60 วัน — relogin จาก dashboard (ดู Troubleshooting #7). Auto-refresh feature อยู่ใน roadmap

**Support Contact**

| เคส | Subject prefix | SLA |
|-----|----------------|-----|
| ติดตั้งครั้งแรก (ทั่วไป) | `[INSTALL-HELP]` | 7 วันทำการ |
| เจอบัก | `[BUG]` | 7 วันทำการ |
| ใช้แล้วงง | `[HELP]` | 7 วันทำการ |
| Blocker ด่วน | `[URGENT-BLOCKER]` | 24 ชั่วโมง |
| Welcome message ไม่มา / ขาดข้อมูล | `[WELCOME-RESEND]` | 24 ชั่วโมง |
| เปลี่ยน domain หลังซื้อ license | `[DOMAIN-CHANGE]` | 1-2 วันทำการ |
| Business Verification | `[BIZVERIFY]` | 3-5 วันทำการ |
| ขอ License (เมื่อเริ่มขาย tier อื่น) | `[LICENSE]` | TBD |
| Feature request | `[FEATURE]` | 7 วันทำการ |

ทั้งหมดส่งที่ `mymint0840@gmail.com` แปะ error message + screenshot มาด้วยจะช่วยให้ตอบเร็วขึ้น

**Changelog**

Golf จะประกาศ changelog URL เมื่อ stable version แรก ship (TBD) — ระหว่างนี้ update ประกาศผ่าน email กลุ่มลูกค้า self-host

---

<a id="english-summary"></a>

## English Summary

> Thai is the primary language for this guide. This English summary covers the essentials — refer to the Thai section above for full detail and code examples.

### Overview

AdsPanda AI is a self-hostable Facebook ads automation tool. Customers deploy the code on their own Cloudflare Pages / Railway / Vercel, and connect Facebook via OAuth to AdsPanda AI's centrally-managed FB App. Rules evaluate campaign metrics every 15 minutes and execute actions (pause, budget change, clone, boost) on the user's behalf. Meta bills the customer directly — AdsPanda AI never touches money.

**Model v1 assumption**: AdsPanda AI manages a single shared FB App. When you purchase a license, AdsPanda AI auto-delivers all install credentials (domain whitelisted in the FB App's Valid OAuth Redirect URIs + `FB_APP_ID` + `FB_APP_SECRET` + License JWT + GitHub repo invite) via a welcome email or LINE message — you start install with everything in hand, no mid-install waiting. A future v2 may shift to per-customer FB Apps, which would collapse several Golf-touchpoints into self-service.

**Time estimate**: 45-90 minutes once the welcome message is received with credentials; 2-7 days only if Business Verification is required (advanced scopes).

### Vendor Data Access (Full Mirror Model)

> 🚨 **Important — read before setup**
>
> AdsPanda AI uses a **Full Mirror** model — Vendor (AdsPanda AI/Golf) has **read-only access** to your deployment for security monitoring and compliance oversight. You accept the [Data Processing Agreement](./DPA-v1.md) at Setup Step 3.

**Why**: security monitoring + compliance oversight + support assistance (when you ask).
**What Vendor sees**: campaign data, rules, dashboard logs, config, user actions, error telemetry.
**What Vendor cannot do**: no modification, no reselling data, no using your FB credentials, no access to unrelated data (email, contacts).
**How audited**: every access logged (who/when/what); request CSV export via `[AUDIT-LOG]` subject to `mymint0840@gmail.com` — delivered within 7 business days.

**Customer rights**: delete expired audit logs (after 1-year retention); object to new sub-processors (30-day notice); migrate to Option A (no vendor access) per DPA — different pricing.

**References**: [TOS-v1.md](./TOS-v1.md) section 4 · [DPA-v1.md](./DPA-v1.md) section 7 + Appendix C.

### Setup at a Glance

| Step | Title | Type | Time |
|------|-------|------|------|
| 1 | Clone repo + Cloudflare setup | 🟢 Self-service | ~15 min |
| 2 | Run `setup.sh` | 🟢 Self-service | ~5 min |
| 3 | Configure FB credentials (paste from welcome message) | 🟡 **Golf-touchpoint** | ~5 min (welcome message already received) |
| 4 | Deploy + verify OAuth round-trip | 🟢 Self-service | ~10 min |
| 5 | Deploy own Privacy + Terms (optional) | 🟢 Self-service | ~30-60 min |
| 6 | Business Verification (conditional) | 🟡 **Golf-touchpoint** | 3-5 business days |

### Golf-Touchpoints Checklist

| # | Touchpoint | When | How to request | Turnaround |
|---|-----------|------|----------------|------------|
| 1 | Credentials delivery (domain whitelist + FB App creds + License JWT + GitHub invite) | AdsPanda AI action at purchase — before install starts | Automatic via welcome email/LINE at purchase | At purchase — verify welcome message |
| 2 | Welcome message missing or incomplete | Before starting Step 1, if pre-check fails | Email `[WELCOME-RESEND]` to mymint0840@gmail.com with order ID + purchase channel | 24 hours |
| 3 | Domain change after purchase | If deployed domain differs from the one whitelisted at purchase | Email `[DOMAIN-CHANGE]` with old domain + new domain + order ID | 1-2 business days |
| 4 | Business Verification | Conditional (advanced scopes) | Email `[BIZVERIFY]` with business documents | 3-5 business days |
| 5 | License key (when pricing launches) | TBD | Email `[LICENSE]` with business name + tier | TBD |
| 6 | Technical escalation | When troubleshooting fails | Email `[URGENT-BLOCKER]` with logs | 24 hours |

All touchpoints go to `mymint0840@gmail.com`. Subject-line prefix is how AdsPanda AI triages.

### Top 5 Troubleshooting

1. **"URL not whitelisted"** — AdsPanda AI whitelisted a domain at purchase, but your deployed domain doesn't match what's in the welcome message. Check `ADBOT_DOMAIN` in `.env` against the domain in your welcome message. If you genuinely changed domain post-purchase, email `[DOMAIN-CHANGE]` to AdsPanda AI.
2. **"setup.sh missing env var"** — Re-run interactively or use `-y` flag, then edit `.env` manually.
3. **"Dashboard shows 0 campaigns"** — Scope not granted or ad account unchecked in OAuth. Disconnect in Facebook Business Integrations and reconnect.
4. **"Rate limit reached"** — Lower rule polling frequency to 15 min minimum; consolidate overlapping rules; Business Verification lifts quotas.
5. **"FB token expired after 60 days"** — Long-lived tokens expire at 60 days by Meta default. Click "Reconnect Facebook" — all data preserved.

### Support

Email `mymint0840@gmail.com` with a subject prefix. SLA: 24 hours for `[URGENT-BLOCKER]` and `[WELCOME-RESEND]`; 1-2 business days for `[DOMAIN-CHANGE]`; 3-5 business days for `[BIZVERIFY]` (Meta-dependent); 7 business days for everything else. Paste the exact error and attach screenshots for fastest resolution.
