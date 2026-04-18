# AdsPanda AI — Data Processing Agreement (DPA)

**Version**: 1.1
**Effective date**: 2026-04-18
**Framework**: GDPR Article 28 structure with Thailand PDPA compliance
**Parties**: Vendor (Processor) ↔ Customer (Controller)
**Data Subjects**: Customer's end-users (ad account owners, admin users)
**Sister documents**: TOS-v1.md (parent agreement) · CUSTOMER_GUIDE_v2.md (setup flow that triggers acceptance)
**v1.1 changelog**: Added Anthropic as sub-processor #6 (BYOK joint-model; live via vendor brain proxy per DEVOPS code-grep verification 2026-04-18). Reclassified OpenAI as "planned / not yet in production" (zero code imports confirmed).

---

## ภาษาไทย

> 🌐 **English mirror below** — โครงสร้างเดียวกัน เนื้อหาเดียวกัน ถ้าคำแปลขัดกัน ให้ยึดฉบับภาษาไทยเป็นหลัก เว้นแต่ Customer เป็น EU-based แล้วยึด English

เอกสารนี้คือ **ข้อตกลงการประมวลผลข้อมูลส่วนบุคคล** (Data Processing Agreement — ย่อ "DPA") ที่แนบมากับ Terms of Service (TOS-v1.md) เพื่อกำหนดวิธีที่ Vendor จะประมวลผลข้อมูลส่วนบุคคลแทน Customer

โครงสร้างตาม **GDPR Article 28** และสอดคล้องกับ **PDPA ประเทศไทย** (พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562)

ถ้า TOS ขัดกับ DPA เรื่องข้อมูลส่วนบุคคล — **DPA ชนะ** (เฉพาะเรื่องข้อมูล)

---

## 1. ฝ่ายและบทนิยาม

**Controller** (ผู้ควบคุมข้อมูล) = **Customer** — ธุรกิจที่ซื้อ license AdsPanda AI self-host และตัดสินใจว่าจะประมวลผลข้อมูลใด ทำไม และอย่างไร Customer เป็นเจ้าของความสัมพันธ์กับ end-users และเป็นผู้รับผิดชอบตามกฎหมายหลัก

**Processor** (ผู้ประมวลผลข้อมูล) = **Vendor** — AdsPanda AI / Golf Team (mymint0840@gmail.com) — ประมวลผลข้อมูลส่วนบุคคลแทน Controller ภายใต้คำสั่งของ Controller และเงื่อนไขใน DPA ฉบับนี้

**Sub-processor** (ผู้ประมวลผลช่วง) = บุคคลที่สามที่ Vendor จ้างให้ประมวลผลข้อมูลบางส่วน (Railway, Vercel, Cloudflare, **Anthropic via vendor brain proxy (BYOK)**, Facebook Graph API; OpenAI = planned — รายละเอียด Appendix B)

**Data Subject** (เจ้าของข้อมูล) = บุคคลธรรมดาที่เป็นเจ้าของข้อมูลส่วนบุคคล — ในบริบทนี้คือ end-users ของ Customer เช่น ad account owners, admin users, หรือคนที่ login เข้า dashboard ของ Customer

**Personal Data** (ข้อมูลส่วนบุคคล) = ข้อมูลใดๆ ที่ระบุตัวบุคคลได้ ไม่ว่าโดยตรงหรือโดยอ้อม — รวมถึง email, IP, access token, FB user ID, ชื่อ ad account, metadata การใช้งาน ฯลฯ

**Processing** (การประมวลผล) = การกระทำใดๆ กับข้อมูลส่วนบุคคล เช่น เก็บ, บันทึก, จัดเก็บ, ดึง, ใช้, เปิดเผย, ลบ, โอนย้าย

**GDPR** = General Data Protection Regulation (EU Regulation 2016/679) — ใช้เมื่อ Customer อยู่ใน EU หรือประมวลผลข้อมูลของคนใน EU

**PDPA** = Personal Data Protection Act B.E. 2562 (2019) — กฎหมายคุ้มครองข้อมูลส่วนบุคคลของประเทศไทย

**Full Mirror** = โหมด deployment ที่ Vendor มี read-only access ไปยัง Customer deployment เพื่อ security monitoring + compliance oversight (Golf เลือกเป็น default — ดู Section 7)

---

## 2. หัวข้อและระยะเวลา

**หัวข้อการประมวลผล** (Subject Matter): การให้บริการ AdsPanda AI — software สำหรับ automate Facebook ad campaigns โดย Vendor ให้ platform, oversight, และ support; Customer ควบคุม deployment + ad logic + end-user relationships

**ระยะเวลา** (Duration):
- เริ่ม: วันที่ Customer ยอมรับ TOS (โดย Order Form หรือ setup flow ใน CUSTOMER_GUIDE_v2 step 3)
- สิ้นสุด: เมื่อ TOS สิ้นสุด ด้วยเหตุใดเหตุหนึ่ง (ฝ่ายใดฝ่ายหนึ่งบอกเลิก, license หมดอายุ, breach)
- **หลังสิ้นสุด**: ข้อผูกพันบางข้อยังมีผลต่อไป — confidentiality, data deletion (Section 12), audit log retention (1 ปี), ความรับผิด (Section 13)

DPA นี้ผูกติดกับ TOS — ถ้า TOS ต่ออายุ DPA ต่ออายุอัตโนมัติ ถ้า TOS สิ้นสุด DPA สิ้นสุด (แต่ข้อผูกพันข้างบนยังอยู่)

---

## 3. ลักษณะและวัตถุประสงค์ของการประมวลผล

**ลักษณะการประมวลผล** (Nature):
- การเก็บข้อมูลบน infrastructure ของ Customer เอง (Cloudflare Pages / Railway / Vercel ที่ Customer host)
- การส่งต่อข้อมูลระหว่าง Customer system ↔ Facebook Graph API ↔ (ถ้าเลือก) OpenAI API
- การ log + monitor ของ Vendor ผ่าน Full Mirror read-only access

**วัตถุประสงค์** (Purposes) — enumerated list:
1. **Ad campaign automation** — ดึง insights, apply rules, execute actions (pause / adjust budget / notify) ตาม rule ที่ Customer เขียน
2. **Platform operation** — auth, session management, dashboard rendering, rule scheduling
3. **Security monitoring** — Vendor ตรวจสอบ security events, abnormal patterns, ความพยายาม attack (Full Mirror)
4. **Compliance oversight** — Vendor ตรวจสอบว่า deployment ของ Customer ไม่ละเมิด Meta Platform Terms, PDPA, หรือ TOS ของ Vendor (Full Mirror)
5. **Technical support** — เมื่อ Customer ร้องขอ Vendor เข้าไปดูเพื่อช่วย debug (audit-logged, เฉพาะช่วงเวลา support)
6. **Service improvement (aggregated, anonymized)** — Vendor อาจใช้ข้อมูลการใช้งานแบบ aggregated เพื่อปรับปรุง platform ไม่มีการระบุตัว Customer หรือ Data Subject

Vendor จะประมวลผลข้อมูล **เฉพาะ** ตาม 6 วัตถุประสงค์ข้างบน ถ้ามีเหตุจำเป็นนอกเหนือจากนี้ ต้องแจ้ง Customer และได้รับความยินยอมเป็นลายลักษณ์อักษรก่อน

---

## 4. ประเภทข้อมูลส่วนบุคคล

**ข้อมูลที่ Vendor เข้าถึงได้ผ่าน Full Mirror / platform**:

1. **Facebook access tokens** — OAuth tokens ของ Customer end-users ที่ connect FB account (เก็บ encrypted ที่ Customer deployment — Vendor เห็นผ่าน admin UI เท่านั้น ไม่ copy ออก)
2. **Ad account data** — ad account ID, ชื่อ, currency, campaign list, ad set list, ad creative metadata
3. **Campaign performance data** — insights (impressions, clicks, CTR, CPC, CPM, ROAS, spend) — อาจรวม URL ของ landing page ที่เป็น personal (เช่น /product/user-specific-code)
4. **User identifiers** — email ของ Customer admin, FB user ID ของ end-user ที่ connect, internal user ID ของ dashboard
5. **Usage telemetry** — action log (rule triggered, manual pause, login time), error log, API call count, dashboard page view (anonymized เมื่อส่งมาที่ Vendor)
6. **Audit logs** — เมื่อ Vendor access Full Mirror: who (Vendor team member) / when (timestamp) / what (endpoint accessed)

**ข้อมูลที่ Vendor ไม่เก็บ**:
- ข้อมูลบัตรเครดิต (Meta bill Customer ตรง Vendor ไม่แตะ)
- เนื้อหา ad creative (image / video) — อยู่ที่ Customer storage, Vendor เห็น URL/metadata แต่ไม่ download
- End-user conversations, messages, หรือ direct personal data ที่ไม่เกี่ยวกับ ad operation

---

## 5. หมวดหมู่ของ Data Subjects

**Data Subjects หลัก**:
1. **Customer admin users** — พนักงาน / เจ้าของธุรกิจที่ login เข้า dashboard ของ Customer และเขียน rule
2. **Ad account owners** — คนที่ผูก FB ad account กับ Customer deployment (อาจเป็น Customer admin เอง หรือ client ที่ Customer ดูแลให้)
3. **Facebook Business users** — คนใน FB Business Manager ของ Customer ที่ได้ permission กับ ad account ที่เชื่อม

**Data Subjects ที่ไม่ใช่**:
- ลูกค้าปลายทางของ Customer (คนที่เห็นโฆษณา, คลิก ad, ซื้อของ) — AdsPanda AI ไม่ได้ประมวลผลข้อมูลของคนเหล่านี้โดยตรง ข้อมูล conversion / audience data อยู่ใน Meta/FB platform ไม่ผ่าน AdsPanda AI

Customer ต้องแจ้ง Data Subjects ข้างบนว่าข้อมูลของเขาจะถูกประมวลผลใน AdsPanda AI deployment (ผ่าน privacy notice ของ Customer — Vendor ให้ template ได้)

---

## 6. ภาระหน้าที่ของ Controller

Customer (Controller) รับผิดชอบ:

**Lawful basis** — มี legal basis ในการประมวลผลข้อมูลตาม GDPR Art. 6 / PDPA Section 24 (ส่วนใหญ่คือ contract หรือ legitimate interest — ไม่ใช่ consent-based ยกเว้น marketing)

**Data subject rights** — รับและตอบ request จาก Data Subject โดยตรง (access, rectification, erasure, portability, objection, restriction) — Vendor ช่วยได้แต่ Customer เป็นคนรับผิดชอบหลัก

**ความถูกต้อง** (Accuracy) — เก็บและ maintain ข้อมูลให้ถูกต้อง update เมื่อ Data Subject แจ้งให้แก้ไข

**Privacy notice** — แจ้ง Data Subjects ของตัวเองว่าจะใช้ AdsPanda AI, ประมวลผลอะไร, retention เท่าไร, สิทธิมีอะไร

**Lawful instructions** — คำสั่งที่ให้ Vendor ประมวลผลข้อมูล ต้องถูกกฎหมาย ถ้า Vendor เห็นว่าคำสั่งละเมิดกฎหมาย Vendor จะแจ้ง Customer และหยุดประมวลผลส่วนที่ละเมิดทันที

**DPIA (Data Protection Impact Assessment)** — ถ้าการประมวลผลมีความเสี่ยงสูง Customer ต้องทำ DPIA เอง Vendor ช่วยให้ข้อมูลทาง technical

**การใช้ Sub-processor โดย Customer เอง** — ถ้า Customer จ้าง third-party อื่น (เช่น reporting tool, BI) ที่ต่อเข้า AdsPanda AI deployment ของตัวเอง Customer รับผิดชอบ contract กับ third-party เหล่านั้นเอง Vendor ไม่เกี่ยว

---

## 7. ภาระหน้าที่ของ Processor (Vendor)

Vendor (Processor) รับผิดชอบ:

**7.1 Confidentiality (ความลับ)**

- พนักงาน / contractor ของ Vendor ที่เข้าถึงข้อมูลของ Customer ต้องเซ็น NDA ก่อน
- ความลับผูกพันต่อเนื่อง แม้พนักงานออกจากทีมแล้ว
- Vendor ไม่เปิดเผยข้อมูลต่อบุคคลที่สาม ยกเว้น (a) Sub-processors ตามที่ Section 8 อนุญาต (b) คำสั่งศาล — ในกรณี (b) Vendor จะแจ้ง Customer ก่อน ถ้ากฎหมายไม่ห้าม

**7.2 Security measures (มาตรการความมั่นคงปลอดภัย)**

รายละเอียดครบที่ **Appendix A** — สรุปสั้น:
- **Encryption at rest**: Customer database (PostgreSQL, Redis) ใช้ encryption ระดับ disk; access tokens เพิ่ม application-level encryption (AES-256)
- **Encryption in transit**: ทุก connection ใช้ TLS 1.2+ (HTTPS)
- **Access control**: role-based access; 2FA บังคับสำหรับ Vendor team ที่เข้า Full Mirror
- **Access logs**: ทุก access ของ Vendor ถูก log พร้อม who / when / what
- **Backup + disaster recovery**: Customer รับผิดชอบ backup ของ deployment ตัวเอง Vendor ให้ guide ได้
- **Staff training**: Vendor team ได้รับ training เรื่อง data protection + incident response อย่างน้อยปีละครั้ง

**7.3 Full Mirror access — documented here**

Processor (Vendor) ได้รับ **read-only access** ต่อ deployment ของ Controller (Customer) เพื่อ (a) security monitoring, (b) compliance oversight, (c) technical support ตามที่ Customer ร้องขอ การเข้าถึงนี้:

- ถูก **audit-log** ทุกครั้ง (who / when / what — Vendor team member, timestamp, endpoint หรือ record ที่เข้าถึง)
- **ไม่รวมถึงการ modification** — Customer control สิทธิ write ทั้งหมด ยกเว้นกรณี support ที่ Customer authorize เฉพาะครั้ง (per-incident, written consent, time-bound)
- มี **retention 1 ปี** (12 เดือน live queryable + up to 12 เดือน encrypted archive ก่อน purge — aligned กับ TOS §7) แล้วถูกลบตาม retention policy (ตรงตามข้อกำหนด PDPA ว่าเก็บเท่าที่จำเป็นต่อวัตถุประสงค์)
- Controller **ร้องขอ audit log เมื่อใดก็ได้** Vendor ส่งภายใน **7 วันทำการ** ในรูปแบบ CSV หรือ JSON
- Purpose-bound — Vendor ใช้ Full Mirror เฉพาะ 3 วัตถุประสงค์ข้างบน ห้ามใช้เพื่อ marketing, profile building, หรือวัตถุประสงค์อื่น

ถ้า Customer ไม่ต้องการ Full Mirror — สามารถ request opt-out ไป isolated mode (Option A) โดยทำหนังสือถึง Vendor; ข้อตกลงจะปรับตาม Section 8 (reduce sub-processor access) และ Section 11 (จำกัด audit scope)

**7.4 Assistance with Data Subject rights (ช่วย Controller ตอบ Data Subject)**

เมื่อ Data Subject ของ Customer ส่ง request (access / erasure / portability / etc.) Vendor จะ:
- ช่วย export ข้อมูลในรูปแบบ machine-readable ภายใน 14 วัน
- ช่วย locate และ delete ข้อมูลภายใน 14 วัน
- ช่วยตอบคำถาม technical ที่ Customer ต้องใช้ในการตอบ Data Subject
- ไม่ตอบ Data Subject โดยตรง — Customer เป็นคน interface

**7.5 Breach notification (แจ้งเหตุละเมิด)**

ถ้า Vendor ทราบว่ามี personal data breach ที่เกี่ยวข้องกับ Customer:
- Vendor **แจ้ง Customer ภายใน 48 ชั่วโมง** ผ่าน email (ที่ Customer ลงทะเบียน) + เอกสาร incident report
- แจ้งประกอบด้วย: ลักษณะ breach, categories + approximate number ของ Data Subjects ที่ได้รับผลกระทบ, consequences ที่คาดการณ์, มาตรการที่ Vendor จะทำ
- ใช้ **Appendix C — Breach Notification Template**
- Customer รับผิดชอบแจ้ง authority ของตัวเอง (PDPC ไทย ภายใน 72 ชั่วโมง / DPA ของ EU member state / etc.) Vendor ช่วย technical information

**7.6 Records of Processing Activities (ROPA)**

Vendor maintain ROPA ตาม GDPR Art. 30 / PDPA Section 39 — รายการการประมวลผลที่ทำแทน Customer พร้อม: purposes, categories of data, categories of data subjects, sub-processors, transfers, retention, security measures

ROPA พร้อมให้ supervisory authority ตรวจสอบเมื่อขอ Customer ขอ copy ได้ 1 ครั้ง/ปี ไม่มีค่าใช้จ่าย

**7.7 Cooperation with authorities**

Vendor ให้ความร่วมมือกับ PDPC (Thailand), EU DPAs, และ supervisory authorities อื่นที่มี jurisdiction ตามที่กฎหมายกำหนด

---

## 8. Sub-processors

Vendor ใช้ sub-processors ต่อไปนี้ (**Appendix B** สำหรับ table ละเอียด):

1. **Railway** (EU-West region) — container hosting สำหรับ backend service กลาง (เช่น shared OAuth relay, optional queue)
2. **Vercel** (global edge) — frontend hosting ของ Vendor marketing site + some dashboard component
3. **Cloudflare** (global edge) — Workers + Pages สำหรับ edge compute, CDN, DDoS protection
4. **Anthropic** (US — Claude API via vendor brain proxy) — **live ใน production** — LLM inference สำหรับ bot-rule intelligence + AI agent actions. **BYOK** (Customer ใส่ API key เอง) — Customer มี direct contractual relationship กับ Anthropic (Anthropic Commercial Terms + DPA + SCCs) Vendor brain ทำหน้าที่ authenticated proxy สำหรับ license validation + rate limiting เท่านั้น ไม่ persist raw request/response
5. **OpenAI** (US) — **planned / ยังไม่ใช้ใน production** — reserved สำหรับ future "AI rule suggestion" feature (zero code import ในปัจจุบัน) ถ้า ship แล้วจะ opt-in + update DPA
6. **Facebook Graph API (Meta)** (global) — จำเป็นต่อ core function (ดึง insights, apply actions)

**Customer consent**: การยอมรับ DPA นี้ถือว่า Customer ยินยอมให้ใช้ sub-processors ข้างบน

**การเพิ่ม / เปลี่ยน sub-processor**:
- Vendor **แจ้ง Customer ล่วงหน้า 30 วัน** ผ่าน email + update Appendix B
- Customer มีสิทธิ **object** ภายใน 30 วัน ถ้า object Vendor จะเจรจาหา alternative หรือ Customer มีสิทธิบอกเลิก TOS โดยไม่เสียค่าปรับ
- **ข้อยกเว้น**: emergency security (เช่น DDoS mitigation ต้องเพิ่ม provider ด่วน) Vendor แจ้งภายใน 48 ชั่วโมงหลังเพิ่ม

**Sub-processor agreements**: Vendor มี DPA กับ sub-processor ทุกรายที่กำหนดหน้าที่เทียบเท่า DPA ฉบับนี้ (flow-down obligations) Customer ขอดู redacted version ได้

---

## 9. การถ่ายโอนข้อมูลข้ามพรมแดน

**สถานที่ประมวลผลหลัก**: ขึ้นกับ Customer เลือก — deployment อยู่ที่ Cloudflare/Railway/Vercel region ที่ Customer configure

**การถ่ายโอนที่เกี่ยวข้อง**:
- **Facebook Graph API** — Meta ประมวลผลทั่วโลก (Meta มี SCCs + adequacy decisions ของตัวเอง)
- **OpenAI** (ถ้าเปิด) — US — ใช้ OpenAI Data Processing Addendum + SCCs
- **Railway EU-West** — ข้อมูล stay in EU สำหรับส่วนนี้ (เหมาะสำหรับ Customer ที่มี GDPR concern)
- **Cloudflare** — global edge; data in transit อาจผ่านหลาย region แต่ไม่ persist นอก Customer origin

**เครื่องมือถ่ายโอน**:
- สำหรับ EU transfers: **Standard Contractual Clauses (SCCs) version 2021/914** — Module 2 (Controller → Processor) ใช้ by reference; Customer + Vendor ถือว่าเซ็น SCCs ตามเงื่อนไขที่ได้รับอนุมัติ EU Commission
- สำหรับ PDPA Thailand: ทำตาม Cross-Border Transfer Guidelines ของ PDPC (ก.ย. 2566) — Customer responsible for adequacy assessment of Customer's chosen region

**คำแนะนำ**:
- ถ้า Data Subjects หลักเป็น EU residents → Customer ควรเลือก Railway EU-West + Cloudflare EU routing
- ถ้าส่วนใหญ่เป็นคนไทย → ใช้ Cloudflare Asia + Railway region ที่ Customer สะดวก
- Vendor ช่วย configure ได้ — ร้องขอผ่าน email support

---

## 10. สิทธิของ Data Subjects

Data Subjects มีสิทธิตาม GDPR Art. 15-22 / PDPA Section 30-36:

1. **สิทธิในการเข้าถึง** (Right of access) — ขอดูข้อมูลของตัวเอง
2. **สิทธิในการแก้ไข** (Right to rectification) — ขอให้แก้ไขข้อมูลที่ผิด
3. **สิทธิในการลบ** (Right to erasure / "right to be forgotten") — ขอให้ลบข้อมูล
4. **สิทธิในการเคลื่อนย้าย** (Right to data portability) — ขอข้อมูลในรูปแบบ structured, machine-readable
5. **สิทธิคัดค้าน** (Right to object) — คัดค้านการประมวลผลในบางกรณี
6. **สิทธิในการจำกัด** (Right to restriction) — ขอให้จำกัดการประมวลผล
7. **สิทธิไม่ถูก automated decision-making** — AdsPanda AI ไม่ทำ decisions ที่มีผลกฎหมายต่อ Data Subject โดย automated-only

**Timeline**: Customer + Vendor ตอบภายใน **30 วัน** (GDPR) / **30 วัน** (PDPA) สำหรับคำร้องปกติ; ขยายได้อีก 30 วันถ้า complex โดยแจ้ง Data Subject

**Workflow**: ดู **Appendix D — Data Subject Rights Request Workflow**

Customer เป็น point of contact หลัก; Vendor support within 14 วันตาม Section 7.4

---

## 11. Audit Rights

Customer มีสิทธิ audit การประมวลผลของ Vendor เพื่อยืนยัน compliance:

**Self-service audit (available now)**:
- Customer ร้องขอ **audit logs** ของ Full Mirror access ได้ทุกเมื่อ
- Vendor ส่งภายใน **7 วันทำการ** รูปแบบ CSV / JSON
- Log ครอบคลุม: who (Vendor team member), when (timestamp), what (endpoint/record accessed), why (purpose tag: security / compliance / support)
- ไม่มีค่าใช้จ่าย
- Customer ขอได้ไม่จำกัดจำนวนครั้ง

**Annual audit via certification (in progress — aspirational)**:
- Vendor กำลังเตรียม **SOC 2 Type II** — target timeline **Q4 2026** (ขึ้นกับ budget + team capacity)
- **ISO 27001** — target timeline **2027** (หลัง SOC 2)
- เมื่อได้ certification แล้ว Vendor จะให้ report ปีละครั้งโดยไม่ต้องร้องขอ
- ⚠️ **Flag**: ระหว่างที่ยังไม่ได้ certification — Customer ที่ต้องการ certification-level audit สามารถร้องขอ **independent third-party audit** ได้ (Customer รับค่าใช้จ่าย ยกเว้นพบ material issue ที่เป็นความผิด Vendor)

**On-site audit**:
- สงวนไว้สำหรับกรณี material breach หรือ regulatory investigation
- Customer แจ้งล่วงหน้า 30 วัน + scope ชัดเจน + NDA
- จำกัด 1 ครั้ง/ปี ยกเว้นมี material issue

**Scope limits**: audit ต้องไม่กระทบความปลอดภัยของ Customer อื่น (multi-tenant), ไม่เปิดเผย trade secret, ไม่กระทบ third-party rights

---

## 12. การสิ้นสุดและการคืน/ลบข้อมูล

เมื่อ DPA / TOS สิ้นสุด:

**Timeline**:
- **ภายใน 30 วัน** นับจากวันสิ้นสุด — Vendor ลบหรือส่งคืนข้อมูลส่วนบุคคลทั้งหมดที่ Vendor เก็บไว้ (ส่วนใหญ่คือ metadata + audit logs)
- Customer deployment (code + database) เป็นของ Customer — Vendor ไม่เข้ายุ่ง Customer ลบเอง
- **Customer เลือก** ระหว่าง (a) ส่งคืนข้อมูลในรูปแบบ export ก่อนลบ (b) ลบทันทีไม่ต้องส่งคืน — ต้องแจ้งภายใน 7 วันหลังสิ้นสุด default = ลบทันที

**ข้อยกเว้น retention**:
- **Audit logs** — เก็บต่อ **1 ปี** หลังสิ้นสุด ตามที่กฎหมาย + forensic requirement อาจต้องใช้ แล้วลบ
- **Billing / invoice data** — เก็บตามกฎหมายภาษี (5 ปี ตามประมวลรัษฎากร)
- **Legal hold** — ถ้ามีคดีความ / investigation Vendor อาจต้องเก็บตามคำสั่งศาล แจ้ง Customer ทันที

**Certification of deletion**: เมื่อลบเสร็จ Vendor ส่งหนังสือรับรองการลบข้อมูล (deletion certificate) ให้ Customer ภายใน 7 วัน

---

## 13. ความรับผิด

**Cross-reference**: ความรับผิดของแต่ละฝ่ายในการทำผิด DPA อยู่ใต้ liability cap ของ **TOS Section** ว่าด้วยความรับผิด (TOS-v1.md)

**ข้อยกเว้นที่ cap ไม่ครอบคลุม**:
- **GDPR statutory fines** (up to €20M or 4% global annual turnover) — ถ้าเกิดจากความผิดที่ attribute มาที่ Vendor (Vendor breach obligations ใน DPA) Vendor รับผิดชอบในส่วนของ Vendor Customer รับผิดชอบในส่วนของ Customer
- **PDPA statutory fines** (สูงสุด 5 ล้านบาท + โทษทางอาญาในบางกรณี) — เงื่อนไขเดียวกัน
- **Gross negligence / willful misconduct** — ไม่มี cap

**Data subject compensation claims** — ฝ่ายที่เป็นต้นเหตุจ่าย ถ้าผิดร่วม (joint liability) แบ่งตามสัดส่วน fault

**Indemnification**:
- Vendor indemnify Customer สำหรับ third-party claims ที่เกิดจาก Vendor breach DPA
- Customer indemnify Vendor สำหรับ third-party claims ที่เกิดจาก Customer lawful instructions ที่ Customer ให้ผิด / Customer misuse

---

## 14. กฎหมายที่ใช้บังคับและข้อพิพาท

**Primary law**: **กฎหมายไทย (PDPA + ประมวลแพ่งและพาณิชย์)** — ยกเว้นมีการเขียนเฉพาะด้านล่าง

**GDPR compliance representation**: สำหรับ Customer ที่เป็น EU-based หรือประมวลผลข้อมูล EU residents — Vendor **represent** ว่า DPA ฉบับนี้สอดคล้อง GDPR Article 28; ถ้ามีข้อขัดแย้งทาง technical กับ GDPR (เช่น SCCs clause specific) Customer ร้องขอ amendment ได้ ฝ่ายบริหารทำ bilateral agreement เพิ่มเติม

**Multi-jurisdiction**: Customer ที่ operate หลายประเทศ (e.g., Thailand + EU + SG) ร้องขอ DPA amendment ที่เพิ่ม clause ของ jurisdiction นั้นได้ — Vendor เจรจาด้วยความจริงใจภายใน 30 วัน

**Dispute resolution**:
- ขั้นที่ 1: **Good-faith negotiation** ภายใน 60 วันหลังแจ้งเป็นลายลักษณ์อักษร
- ขั้นที่ 2: **Mediation** ที่ Thailand Arbitration Center (THAC) — ภายใน 90 วัน
- ขั้นที่ 3: **Arbitration** ที่ THAC — ภาษาไทย + อังกฤษ; award เป็นที่สุด
- สำหรับ Data Subject claims — ใช้ศาลที่มี jurisdiction ปกติ (ไม่ arbitrate sub-rights ของ Data Subject)

**Execution**: โดยการเซ็น Order Form หรือ click "I agree to the DPA" ใน setup flow (CUSTOMER_GUIDE_v2 step 3) คู่สัญญาถือว่าลงนามใน DPA ฉบับนี้ ไม่ต้องเซ็นเอกสารแยก

---

## Appendix A: Security Measures (ภาคผนวก A — มาตรการความมั่นคงปลอดภัย)

มาตรการ technical + organizational ที่ Vendor ปฏิบัติเพื่อปกป้องข้อมูลส่วนบุคคลตาม Section 7.2:

**Technical measures**:
- **Encryption at rest**: database-level encryption (AES-256) สำหรับ PostgreSQL + Redis; application-level encryption สำหรับ access tokens ด้วย rotating encryption key
- **Encryption in transit**: TLS 1.2+ (HTTPS/WSS) บังคับทุก endpoint; HSTS header; no plaintext protocol
- **Authentication**: Customer session ใช้ OAuth 2.0 + short-lived JWT (15 นาที) + refresh token; Vendor team ใช้ 2FA บังคับ (TOTP / hardware key)
- **Access control**: Role-Based Access Control (RBAC) — Vendor team มี role แยก (support / security / deploy); principle of least privilege
- **Audit logging**: append-only log ทุก privileged action (Full Mirror access, admin action, security event); log ไปยัง SIEM-ready format
- **Vulnerability management**: dependency scanning อัตโนมัติ (GitHub Dependabot / Snyk); critical patch ภายใน 7 วัน; high patch ภายใน 30 วัน
- **Secure development**: code review บังคับสำหรับ main branch; pre-commit hook scan secrets; security review (GUARD audit) สำหรับ feature ที่แตะ personal data
- **Network security**: Cloudflare WAF; DDoS protection; rate limiting; IP allowlist option สำหรับ admin endpoint
- **Backup**: Customer รับผิดชอบ backup ของ deployment ตัวเอง Vendor ให้ backup runbook + scripts

**Organizational measures**:
- **NDA**: พนักงาน / contractor ที่เข้าถึงข้อมูลเซ็น NDA ก่อน — ผูกพันถาวร
- **Staff training**: data protection + secure coding + incident response training อย่างน้อยปีละครั้ง — mandatory completion
- **Background check**: พนักงานที่เข้าถึง customer production data ผ่าน background check
- **Incident response plan**: มี documented runbook สำหรับ breach detection → containment → notification → post-mortem; tested ปีละ 1 ครั้ง
- **Data minimization**: ออกแบบ schema ให้เก็บเท่าที่จำเป็น; audit log ไม่เก็บ full payload ถ้าไม่จำเป็น
- **Privacy by design**: security + privacy review ตั้งแต่ spec phase (GUARD role — shift-left)
- **Vendor management**: sub-processors มี DPA ที่ flow-down obligations; annual review
- **Retention policy**: ข้อมูลแต่ละประเภทมี retention ที่ชัดเจน; auto-deletion script

**Monitoring + incident detection**:
- real-time security event monitoring (abnormal login, token exfiltration attempt, bulk data export)
- monthly security review meeting
- quarterly tabletop exercise (incident simulation)

---

## Appendix B: Sub-processor List (ภาคผนวก B — รายชื่อผู้ประมวลผลช่วง)

| # | Sub-processor | Purpose | Location / Region | Safeguards |
|---|---------------|---------|-------------------|------------|
| 1 | **Railway** | Container hosting for shared backend services (optional OAuth relay, queue) | EU-West (Ireland) + US (Customer choice) | DPA + SOC 2 Type II + SCCs where applicable |
| 2 | **Vercel** | Frontend hosting for Vendor marketing site and some dashboard components | Global edge (primary US) | DPA + SOC 2 Type II + SCCs |
| 3 | **Cloudflare (Workers / Pages / WAF)** | Edge compute, CDN, DDoS protection, WAF | Global edge | DPA + ISO 27001 + SOC 2 Type II + SCCs |
| 4 | **OpenAI** | LLM inference for optional "AI rule suggestion" feature — **opt-in only per Customer** | US | DPA + OpenAI Enterprise terms (no data used for training) + SCCs |
| 5 | **Facebook Graph API (Meta)** | Core integration — fetch ad insights, apply actions | Global (Meta's regions) | Meta Platform Terms + Meta DPA + SCCs |

**Notes**:
- OpenAI is **opt-in** — disabled by default; no data sent to OpenAI unless Customer explicitly enables in settings
- Railway region choice affects where Customer's shared backend data lives — default EU-West for GDPR; Customer can request US or APAC
- Facebook/Meta is technically a **joint controller** for the ads platform itself (per Meta's determination) — this DPA covers Vendor's processing of data retrieved from Meta, not Meta's independent processing

**Change log**: updated 2026-04-18 (initial list). Future updates tracked in git commit history of this document.

---

## Appendix C: Breach Notification Template (ภาคผนวก C — แบบฟอร์มแจ้งเหตุละเมิด)

Vendor ส่งแบบฟอร์มนี้ไปที่ Customer ภายใน 48 ชั่วโมงเมื่อทราบ breach:

```
===== BREACH NOTIFICATION =====

To:    [Customer Name / DPO email]
From:  AdsPanda AI Security Team <mymint0840@gmail.com>  (interim — dedicated security alias in progress)
Date:  [YYYY-MM-DD HH:MM TZ]
Ref:   BN-[YYYY]-[SEQ]

1. NATURE OF BREACH
   [Brief description — what happened, when detected, how discovered]

2. DATA SUBJECTS AFFECTED
   Categories: [e.g., Customer admin users, ad account owners]
   Approximate count: [N] (may be updated as investigation continues)

3. PERSONAL DATA AFFECTED
   Categories: [e.g., email addresses, access tokens, campaign metadata]
   Sensitive data involved: [Yes / No — if yes, describe]

4. LIKELY CONSEQUENCES
   [Risk to data subjects — e.g., account takeover, financial loss, reputational]

5. MEASURES TAKEN OR PROPOSED
   Containment:   [action taken to stop the breach]
   Eradication:   [root cause fix]
   Recovery:      [restoring service + data integrity]
   Prevention:    [mitigations to prevent recurrence]

6. RECOMMENDED ACTIONS FOR CUSTOMER
   [e.g., notify DPC within 72h, notify data subjects, rotate credentials]

7. CONTACT FOR QUESTIONS
   Security contact: [name, email, phone]
   Incident channel: [dedicated channel for this incident]

8. NEXT UPDATE
   [Timestamp of next update — typically 24-48h]

===== END =====
```

Customer acknowledge receipt ภายใน 24 ชั่วโมง

---

## Appendix D: Data Subject Rights Request Workflow (ภาคผนวก D — ขั้นตอนตอบคำขอจาก Data Subject)

**Flow**:

1. **Data Subject → Customer** — Data Subject ส่ง request ตรงไปที่ Customer (Customer คือ point of contact หลักตาม Section 6)
2. **Customer verify identity** — Customer ตรวจสอบว่าผู้ส่งเป็น Data Subject จริง (email verification, account verification)
3. **Customer assess request** — ประเภท request (access / erasure / portability / etc.)? legal basis ในการตอบสนอง / ปฏิเสธ?
4. **Customer → Vendor (ถ้าต้อง technical support)** — Customer ส่ง request ไปที่ Vendor support email พร้อม (a) ประเภท request (b) Data Subject identifier (email / user ID — Vendor ไม่ verify identity นะ เชื่อ Customer)
5. **Vendor response ภายใน 14 วัน** — ตาม Section 7.4:
   - **Access** → export data ใน JSON / CSV
   - **Erasure** → locate + delete (รวม audit logs ที่ระบุตัวบุคคลได้) ยกเว้นส่วนที่กฎหมายบังคับให้เก็บ
   - **Portability** → structured export (JSON preferred)
   - **Rectification** → Customer update ผ่าน dashboard; Vendor ช่วยถ้ามี data ใน shared backend
   - **Objection / restriction** → Vendor tag record + ไม่ประมวลผลจนกว่าจะ resolve
6. **Customer → Data Subject response** — Customer ตอบ Data Subject ภายใน **30 วัน** (GDPR / PDPA timeline)
7. **Documentation** — Customer + Vendor เก็บ record ของ request + response (ROPA requirement)

**Escalation**:
- complex case → extend 30 วัน โดยแจ้ง Data Subject
- refusal (เช่น legal hold) → Customer ต้องให้เหตุผล + แจ้งสิทธิในการร้อง supervisory authority
- cross-border → Customer รับผิดชอบ compliance กับ jurisdiction ของ Data Subject

---

---

## English

> 🌐 **Thai version above** — same structure, same content. Thai governs for ambiguity unless Customer is EU-based, in which case English governs.

This document is the **Data Processing Agreement** ("DPA") attached to the Terms of Service (TOS-v1.md), governing how Vendor processes personal data on behalf of Customer.

Structure follows **GDPR Article 28** and complies with **Thailand PDPA** (Personal Data Protection Act B.E. 2562).

If TOS conflicts with DPA on personal data matters — **DPA prevails** (on data matters only).

---

## 1. Parties and Definitions

**Controller** = **Customer** — the business that licenses AdsPanda AI self-host and decides what personal data is processed, why, and how. Customer owns the end-user relationship and is the primary legally responsible party.

**Processor** = **Vendor** — AdsPanda AI / Golf Team (mymint0840@gmail.com) — processes personal data on behalf of Controller under Controller's instructions and the terms of this DPA.

**Sub-processor** = a third party engaged by Vendor to process data on Vendor's behalf (Railway, Vercel, Cloudflare, **Anthropic via vendor brain proxy (BYOK)**, Facebook Graph API; OpenAI = planned — see Appendix B).

**Data Subject** = a natural person whose personal data is processed — in this context, Customer's end-users such as ad account owners, admin users, or anyone who logs into Customer's dashboard.

**Personal Data** = any information that identifies a person, directly or indirectly — including email, IP, access tokens, FB user IDs, ad account names, usage metadata, etc.

**Processing** = any operation performed on personal data — collection, recording, storage, retrieval, use, disclosure, deletion, transfer.

**GDPR** = EU Regulation 2016/679 — applies when Customer is EU-based or processes data of EU persons.

**PDPA** = Personal Data Protection Act B.E. 2562 (2019) — Thailand's data protection law.

**Full Mirror** = deployment mode where Vendor has read-only access to Customer deployment for security monitoring + compliance oversight (Golf's chosen default — see Section 7).

---

## 2. Subject Matter and Duration

**Subject Matter**: Provision of AdsPanda AI — software for automating Facebook ad campaigns. Vendor provides the platform, oversight, and support; Customer controls deployment, ad logic, and end-user relationships.

**Duration**:
- Start: Date Customer accepts TOS (via Order Form or setup flow in CUSTOMER_GUIDE_v2 step 3).
- End: When TOS terminates, for any reason (either party, expiry, breach).
- **Post-termination**: Certain obligations survive — confidentiality, data deletion (Section 12), audit log retention (1 year), liability (Section 13).

This DPA is bound to the TOS — if TOS renews, DPA renews automatically; if TOS terminates, DPA terminates (but the surviving obligations above remain).

---

## 3. Nature and Purpose of Processing

**Nature**:
- Data stored on Customer's own infrastructure (Cloudflare Pages / Railway / Vercel that Customer hosts)
- Data flows between Customer system ↔ Facebook Graph API ↔ (optional) OpenAI API
- Vendor logging + monitoring via Full Mirror read-only access

**Purposes** (enumerated):
1. **Ad campaign automation** — fetch insights, apply rules, execute actions (pause / adjust budget / notify) per rules authored by Customer
2. **Platform operation** — auth, session management, dashboard rendering, rule scheduling
3. **Security monitoring** — Vendor monitors security events, abnormal patterns, attack attempts (Full Mirror)
4. **Compliance oversight** — Vendor verifies Customer deployment is not violating Meta Platform Terms, PDPA, or Vendor's TOS (Full Mirror)
5. **Technical support** — when Customer requests Vendor to inspect for debugging (audit-logged, time-bounded)
6. **Service improvement (aggregated, anonymized)** — Vendor may use aggregated usage data to improve the platform; no identification of Customer or Data Subject

Vendor processes data **only** for the 6 purposes above. Any purpose beyond this requires notice to Customer and written consent before processing.

---

## 4. Types of Personal Data

**Data Vendor accesses via Full Mirror / platform**:

1. **Facebook access tokens** — OAuth tokens of Customer end-users who connect FB accounts (stored encrypted in Customer deployment — Vendor sees via admin UI only, does not copy out)
2. **Ad account data** — ad account ID, name, currency, campaign list, ad set list, ad creative metadata
3. **Campaign performance data** — insights (impressions, clicks, CTR, CPC, CPM, ROAS, spend); may include landing page URLs that are personal (e.g., /product/user-specific-code)
4. **User identifiers** — Customer admin email, connected end-user FB user ID, dashboard internal user ID
5. **Usage telemetry** — action logs (rule triggered, manual pause, login time), error logs, API call counts, dashboard page views (anonymized when sent to Vendor)
6. **Audit logs** — when Vendor accesses Full Mirror: who (Vendor team member) / when (timestamp) / what (endpoint accessed)

**Data Vendor does NOT store**:
- Credit card data (Meta bills Customer directly; Vendor does not touch)
- Ad creative content (image / video) — lives in Customer storage; Vendor sees URL/metadata but does not download
- End-user conversations, messages, or direct personal data unrelated to ad operation

---

## 5. Categories of Data Subjects

**Primary Data Subjects**:
1. **Customer admin users** — employees / business owners who log into Customer's dashboard and author rules
2. **Ad account owners** — people who link FB ad accounts to Customer deployment (may be Customer admin or a client Customer manages)
3. **Facebook Business users** — people in Customer's FB Business Manager who have permission on the connected ad account(s)

**NOT Data Subjects under this DPA**:
- Customer's end-customers (people who view ads, click ads, make purchases) — AdsPanda AI does not directly process their data; conversion/audience data lives in Meta/FB platform, not through AdsPanda AI

Customer must inform the above Data Subjects that their data will be processed in the AdsPanda AI deployment (via Customer's privacy notice — Vendor can provide a template).

---

## 6. Controller Obligations

Customer (Controller) is responsible for:

**Lawful basis** — having a legal basis for processing under GDPR Art. 6 / PDPA Section 24 (typically contract or legitimate interest — not consent-based except for marketing).

**Data subject rights** — receiving and answering requests from Data Subjects directly (access, rectification, erasure, portability, objection, restriction). Vendor assists, but Customer bears primary responsibility.

**Accuracy** — maintaining data accurately, updating when Data Subjects notify of corrections.

**Privacy notice** — informing its own Data Subjects about the use of AdsPanda AI, what is processed, retention periods, and their rights.

**Lawful instructions** — instructions to Vendor to process data must be lawful. If Vendor believes an instruction violates law, Vendor will notify Customer and cease the offending processing immediately.

**DPIA (Data Protection Impact Assessment)** — if processing is high-risk, Customer conducts DPIA. Vendor provides technical information.

**Customer's own sub-processors** — if Customer hires other third parties (e.g., reporting tool, BI) that connect to its AdsPanda AI deployment, Customer is responsible for those contracts. Vendor is not involved.

---

## 7. Processor (Vendor) Obligations

Vendor (Processor) is responsible for:

**7.1 Confidentiality**

- Vendor employees / contractors with access to Customer data must sign an NDA before access.
- Confidentiality obligations survive employment / engagement termination.
- Vendor does not disclose data to third parties except (a) Sub-processors per Section 8 and (b) court order — in case (b), Vendor will notify Customer first where legally permissible.

**7.2 Security measures**

Full detail in **Appendix A** — summary:
- **Encryption at rest**: Customer databases (PostgreSQL, Redis) use disk-level encryption; access tokens add application-level encryption (AES-256)
- **Encryption in transit**: all connections use TLS 1.2+ (HTTPS)
- **Access control**: role-based access; 2FA mandatory for Vendor team accessing Full Mirror
- **Access logs**: every Vendor access is logged with who / when / what
- **Backup + disaster recovery**: Customer responsible for deployment backups; Vendor provides runbook
- **Staff training**: Vendor team receives data protection + incident response training at least annually

**7.3 Full Mirror access — documented here**

Processor (Vendor) has **read-only access** to Controller's (Customer's) deployment for (a) security monitoring, (b) compliance oversight, (c) technical support as requested by Customer. This access:

- Is **audit-logged** every time (who / when / what — Vendor team member, timestamp, endpoint or record accessed)
- **Does NOT include modification** — Customer controls all write rights, except in support cases where Customer authorizes per-incident (written consent, time-bound)
- Has **1-year retention** (12 months live queryable + up to 12 months encrypted archive before purge — aligned with TOS §7) then deleted per retention policy (aligned with PDPA principle of storing only as long as necessary)
- Controller may **request audit log at any time**; Vendor delivers within **7 business days** in CSV or JSON
- Purpose-bound — Vendor uses Full Mirror only for the 3 purposes above; prohibited from marketing, profile building, or other purposes

If Customer prefers not to use Full Mirror — Customer may request opt-out to isolated mode (Option A) via written request; the agreement will be adjusted per Section 8 (reduced sub-processor access) and Section 11 (limited audit scope).

**7.4 Assistance with Data Subject rights**

When a Data Subject of Customer sends a request (access / erasure / portability / etc.), Vendor will:
- Assist with data export in machine-readable format within 14 days
- Assist with locating and deleting data within 14 days
- Answer technical questions Customer needs to respond to Data Subject
- Will NOT respond to Data Subject directly — Customer is the interface

**7.5 Breach notification**

If Vendor becomes aware of a personal data breach affecting Customer:
- Vendor **notifies Customer within 48 hours** via email (registered on file) + incident report document
- Notification includes: nature of breach, categories + approximate number of affected Data Subjects, anticipated consequences, measures Vendor will take
- Uses **Appendix C — Breach Notification Template**
- Customer is responsible for notifying its own authority (Thailand PDPC within 72h / EU DPA / etc.); Vendor assists with technical information

**7.6 Records of Processing Activities (ROPA)**

Vendor maintains ROPA per GDPR Art. 30 / PDPA Section 39 — list of processing activities performed on behalf of Customer, including: purposes, data categories, data subject categories, sub-processors, transfers, retention, security measures.

ROPA available to supervisory authority on request. Customer may request a copy 1×/year free of charge.

**7.7 Cooperation with authorities**

Vendor cooperates with PDPC (Thailand), EU DPAs, and other supervisory authorities with jurisdiction as legally required.

---

## 8. Sub-processors

Vendor uses the following sub-processors (**Appendix B** for detailed table):

1. **Railway** (EU-West region) — container hosting for shared backend services (e.g., shared OAuth relay, optional queue)
2. **Vercel** (global edge) — frontend hosting for Vendor marketing site + some dashboard components
3. **Cloudflare** (global edge) — Workers + Pages for edge compute, CDN, DDoS protection
4. **Anthropic** (US — Claude API via vendor brain proxy) — **live in production** — LLM inference for bot-rule intelligence + AI agent actions. **BYOK** (Customer provides API key) — Customer has direct contractual relationship with Anthropic (Anthropic Commercial Terms + DPA + SCCs); Vendor brain acts as authenticated proxy for license validation + rate limiting only, does not persist raw request/response bodies
5. **OpenAI** (US) — **planned / not yet in production** — reserved for future "AI rule suggestion" feature (zero code imports currently); if shipped will be opt-in with DPA update
6. **Facebook Graph API (Meta)** (global) — core integration (fetching insights, applying actions)

**Customer consent**: Acceptance of this DPA constitutes Customer consent to the above sub-processors.

**Adding / changing sub-processors**:
- Vendor **provides 30 days prior notice** via email + updates Appendix B
- Customer may **object** within 30 days; if objected, Vendor will negotiate alternatives or Customer may terminate TOS without penalty
- **Exception**: emergency security (e.g., DDoS mitigation requiring urgent provider change) — Vendor notifies within 48 hours of addition

**Sub-processor agreements**: Vendor maintains DPAs with every sub-processor, imposing flow-down obligations equivalent to this DPA. Customer may request a redacted version.

---

## 9. International Data Transfers

**Primary processing location**: depends on Customer choice — deployment lives at Cloudflare/Railway/Vercel region Customer configures.

**Relevant transfers**:
- **Facebook Graph API** — Meta processes globally (Meta has its own SCCs + adequacy decisions)
- **OpenAI** (if enabled) — US — covered by OpenAI Data Processing Addendum + SCCs
- **Railway EU-West** — data stays in EU for this component (suitable for Customers with GDPR concerns)
- **Cloudflare** — global edge; data in transit may pass through multiple regions but does not persist outside Customer origin

**Transfer mechanisms**:
- For EU transfers: **Standard Contractual Clauses (SCCs) version 2021/914** — Module 2 (Controller → Processor) by reference; Customer + Vendor are deemed to have signed SCCs per EU Commission-approved terms
- For PDPA Thailand: follows PDPC Cross-Border Transfer Guidelines (September 2023) — Customer responsible for adequacy assessment of its chosen region

**Recommendations**:
- If primary Data Subjects are EU residents → Customer should select Railway EU-West + Cloudflare EU routing
- If primarily Thai residents → use Cloudflare Asia + Railway region of convenience
- Vendor can assist with configuration — request via support email

---

## 10. Data Subject Rights

Data Subjects have rights under GDPR Art. 15-22 / PDPA Section 30-36:

1. **Right of access** — request a copy of their data
2. **Right to rectification** — request correction of inaccurate data
3. **Right to erasure** ("right to be forgotten") — request deletion
4. **Right to data portability** — receive data in structured, machine-readable format
5. **Right to object** — object to processing in certain cases
6. **Right to restriction** — request that processing be limited
7. **Right not to be subject to automated decision-making** — AdsPanda AI does not perform legally significant automated-only decisions affecting Data Subjects

**Timeline**: Customer + Vendor respond within **30 days** (GDPR) / **30 days** (PDPA) for standard requests; extendable by 30 days for complex cases, with notice to Data Subject.

**Workflow**: see **Appendix D — Data Subject Rights Request Workflow**.

Customer is the primary point of contact; Vendor supports within 14 days per Section 7.4.

---

## 11. Audit Rights

Customer has the right to audit Vendor's processing to verify compliance:

**Self-service audit (available now)**:
- Customer may request **audit logs** of Full Mirror access at any time
- Vendor delivers within **7 business days** in CSV / JSON format
- Log covers: who (Vendor team member), when (timestamp), what (endpoint/record accessed), why (purpose tag: security / compliance / support)
- No charge
- Unlimited number of requests

**Annual audit via certification (in progress — aspirational)**:
- Vendor is pursuing **SOC 2 Type II** — target **Q4 2026** (subject to budget + team capacity)
- **ISO 27001** — target **2027** (after SOC 2)
- Once certified, Vendor will provide annual reports without request
- ⚠️ **Flag**: pending certification — Customers requiring certification-level audit may request an **independent third-party audit** (Customer bears cost, except where material issue attributable to Vendor is found)

**On-site audit**:
- Reserved for material breach or regulatory investigation
- Customer provides 30-day notice + clear scope + NDA
- Limited to 1×/year unless a material issue exists

**Scope limits**: audits must not compromise security of other Customers (multi-tenant), not expose trade secrets, not affect third-party rights.

---

## 12. Termination and Return/Deletion of Data

Upon DPA / TOS termination:

**Timeline**:
- **Within 30 days** of termination — Vendor deletes or returns all personal data Vendor holds (mostly metadata + audit logs)
- Customer deployment (code + database) belongs to Customer — Vendor does not interfere; Customer deletes itself
- **Customer chooses** between (a) data export before deletion (b) immediate deletion without export — must notify within 7 days post-termination; default = immediate deletion

**Retention exceptions**:
- **Audit logs** — retained for **1 year** post-termination per legal + forensic requirements, then deleted
- **Billing / invoice data** — retained per tax law (5 years under Thai Revenue Code)
- **Legal hold** — in case of litigation / investigation, Vendor may retain per court order, with notice to Customer

**Certification of deletion**: once deletion completes, Vendor provides a deletion certificate to Customer within 7 days.

---

## 13. Liability

**Cross-reference**: Each party's liability for DPA breach is subject to the liability cap in **TOS Section** on liability (TOS-v1.md).

**Exceptions not covered by the cap**:
- **GDPR statutory fines** (up to €20M or 4% global annual turnover) — for breaches attributable to Vendor (Vendor's breach of DPA obligations), Vendor bears the Vendor share; Customer bears the Customer share
- **PDPA statutory fines** (up to THB 5M + potential criminal penalties in some cases) — same allocation
- **Gross negligence / willful misconduct** — no cap

**Data subject compensation claims** — the party at fault pays; for joint liability, allocated by proportional fault.

**Indemnification**:
- Vendor indemnifies Customer for third-party claims arising from Vendor's breach of DPA
- Customer indemnifies Vendor for third-party claims arising from Customer's unlawful instructions or misuse

---

## 14. Governing Law and Disputes

**Primary law**: **Thai law (PDPA + Civil and Commercial Code)** — except as specifically written below.

**GDPR compliance representation**: For EU-based Customers or those processing EU residents' data — Vendor **represents** this DPA is aligned with GDPR Article 28; if technical GDPR conflict arises (e.g., SCCs-specific clauses), Customer may request an amendment; parties execute a bilateral addendum.

**Multi-jurisdiction**: Customers operating in multiple jurisdictions (e.g., Thailand + EU + SG) may request a DPA amendment adding clauses for that jurisdiction — Vendor will negotiate in good faith within 30 days.

**Dispute resolution**:
- Step 1: **Good-faith negotiation** within 60 days of written notice
- Step 2: **Mediation** at Thailand Arbitration Center (THAC) — within 90 days
- Step 3: **Arbitration** at THAC — Thai + English; award final
- For Data Subject claims — normal courts of jurisdiction (do not arbitrate Data Subject sub-rights)

**Execution**: By signing the Order Form or clicking "I agree to the DPA" in the setup flow (CUSTOMER_GUIDE_v2 step 3), the parties execute this DPA without requiring separate signature.

---

## Appendix A: Security Measures

Technical + organizational measures Vendor implements to protect personal data per Section 7.2:

**Technical measures**:
- **Encryption at rest**: database-level encryption (AES-256) for PostgreSQL + Redis; application-level encryption for access tokens with rotating encryption key
- **Encryption in transit**: TLS 1.2+ (HTTPS/WSS) mandatory on every endpoint; HSTS header; no plaintext protocol
- **Authentication**: Customer session uses OAuth 2.0 + short-lived JWT (15 min) + refresh token; Vendor team uses mandatory 2FA (TOTP / hardware key)
- **Access control**: Role-Based Access Control (RBAC) — Vendor team has segregated roles (support / security / deploy); principle of least privilege
- **Audit logging**: append-only logs for every privileged action (Full Mirror access, admin action, security event); SIEM-ready format
- **Vulnerability management**: automated dependency scanning (GitHub Dependabot / Snyk); critical patches within 7 days; high within 30 days
- **Secure development**: code review mandatory for main branch; pre-commit hook for secret scanning; security review (GUARD audit) for features touching personal data
- **Network security**: Cloudflare WAF; DDoS protection; rate limiting; IP allowlist option for admin endpoints
- **Backup**: Customer responsible for deployment backups; Vendor provides backup runbook + scripts

**Organizational measures**:
- **NDA**: Employees / contractors with data access sign NDAs before access — perpetual obligation
- **Staff training**: data protection + secure coding + incident response training at least annually — mandatory completion
- **Background check**: staff with customer production data access pass a background check
- **Incident response plan**: documented runbook for breach detection → containment → notification → post-mortem; tested annually
- **Data minimization**: schema designed to store only what is necessary; audit logs avoid full payload where not required
- **Privacy by design**: security + privacy review from spec phase (GUARD role — shift-left)
- **Vendor management**: sub-processors have flow-down DPAs; annual review
- **Retention policy**: clear retention per data type; auto-deletion scripts

**Monitoring + incident detection**:
- Real-time security event monitoring (abnormal login, token exfiltration attempt, bulk data export)
- Monthly security review meeting
- Quarterly tabletop exercise (incident simulation)

---

## Appendix B: Sub-processor List

| # | Sub-processor | Purpose | Location / Region | Safeguards |
|---|---------------|---------|-------------------|------------|
| 1 | **Railway** | Container hosting for shared backend services (optional OAuth relay, queue) | EU-West (Ireland) + US (Customer choice) | DPA + SOC 2 Type II + SCCs where applicable |
| 2 | **Vercel** | Frontend hosting for Vendor marketing site and some dashboard components | Global edge (primary US) | DPA + SOC 2 Type II + SCCs |
| 3 | **Cloudflare (Workers / Pages / WAF)** | Edge compute, CDN, DDoS protection, WAF | Global edge | DPA + ISO 27001 + SOC 2 Type II + SCCs |
| 4 | **Anthropic (Claude API via vendor brain proxy)** | LLM inference for bot-rule intelligence / AI agent actions — **Customer brings own API key (BYOK)**; vendor brain proxies + rate-limits only | US (Anthropic region) | Anthropic Commercial Terms + DPA + SCCs (Customer↔Anthropic is direct contractual; Vendor proxy is transport only — no persistence of bodies) |
| 5 | **OpenAI** (planned / not production) | Reserved for future "AI rule suggestion" feature — currently zero code imports; opt-in when shipped | US | DPA + OpenAI Enterprise terms (no data used for training) + SCCs |
| 6 | **Facebook Graph API (Meta)** | Core integration — fetch ad insights, apply actions | Global (Meta's regions) | Meta Platform Terms + Meta DPA + SCCs |

**Notes**:
- **Anthropic** is treated as a **joint-model sub-processor** — Customer provides the API key and has a direct contractual relationship with Anthropic. Vendor's brain server acts as an authenticated proxy for license validation + rate limiting. Raw request/response bodies are not persisted by Vendor.
- **OpenAI** is **planned, not yet wired** — no data reaches OpenAI until the feature ships; DPA will be updated to move OpenAI from "planned" to "opt-in live" at that time
- Railway region affects where Customer's shared backend data lives — default EU-West for GDPR; Customer can request US or APAC
- Facebook/Meta is technically a **joint controller** for the ads platform itself (per Meta's determination) — this DPA covers Vendor's processing of data retrieved from Meta, not Meta's independent processing

**Change log**: updated 2026-04-18 (initial list). Future updates tracked in git commit history.

---

## Appendix C: Breach Notification Template

Vendor sends this form to Customer within 48 hours of becoming aware of a breach:

```
===== BREACH NOTIFICATION =====

To:    [Customer Name / DPO email]
From:  AdsPanda AI Security Team <mymint0840@gmail.com>  (interim — dedicated security alias in progress)
Date:  [YYYY-MM-DD HH:MM TZ]
Ref:   BN-[YYYY]-[SEQ]

1. NATURE OF BREACH
   [Brief description — what happened, when detected, how discovered]

2. DATA SUBJECTS AFFECTED
   Categories: [e.g., Customer admin users, ad account owners]
   Approximate count: [N] (may be updated as investigation continues)

3. PERSONAL DATA AFFECTED
   Categories: [e.g., email addresses, access tokens, campaign metadata]
   Sensitive data involved: [Yes / No — if yes, describe]

4. LIKELY CONSEQUENCES
   [Risk to data subjects — e.g., account takeover, financial loss, reputational]

5. MEASURES TAKEN OR PROPOSED
   Containment:   [action taken to stop the breach]
   Eradication:   [root cause fix]
   Recovery:      [restoring service + data integrity]
   Prevention:    [mitigations to prevent recurrence]

6. RECOMMENDED ACTIONS FOR CUSTOMER
   [e.g., notify DPC within 72h, notify data subjects, rotate credentials]

7. CONTACT FOR QUESTIONS
   Security contact: [name, email, phone]
   Incident channel: [dedicated channel for this incident]

8. NEXT UPDATE
   [Timestamp of next update — typically 24-48h]

===== END =====
```

Customer acknowledges receipt within 24 hours.

---

## Appendix D: Data Subject Rights Request Workflow

**Flow**:

1. **Data Subject → Customer** — Data Subject sends request directly to Customer (Customer is the primary point of contact per Section 6)
2. **Customer verifies identity** — Customer confirms requester is the actual Data Subject (email verification, account verification)
3. **Customer assesses request** — Request type (access / erasure / portability / etc.)? Legal basis to comply / refuse?
4. **Customer → Vendor (if technical support needed)** — Customer forwards request to Vendor support email with (a) request type (b) Data Subject identifier (email / user ID — Vendor does NOT re-verify identity; trusts Customer)
5. **Vendor responds within 14 days** — per Section 7.4:
   - **Access** → data export in JSON / CSV
   - **Erasure** → locate + delete (including audit logs identifying the person) except where law mandates retention
   - **Portability** → structured export (JSON preferred)
   - **Rectification** → Customer updates via dashboard; Vendor assists if data is in shared backend
   - **Objection / restriction** → Vendor tags record + ceases processing until resolved
6. **Customer → Data Subject response** — Customer responds to Data Subject within **30 days** (GDPR / PDPA timeline)
7. **Documentation** — Customer + Vendor retain record of request + response (ROPA requirement)

**Escalation**:
- Complex case → extend by 30 days with notice to Data Subject
- Refusal (e.g., legal hold) → Customer provides reasoning + informs Data Subject of right to appeal to supervisory authority
- Cross-border → Customer responsible for compliance with Data Subject's jurisdiction
