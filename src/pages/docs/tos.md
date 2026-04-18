# AdsPanda AI — Vendor-Customer License Agreement

**Version**: 1.1
**Effective date**: 2026-04-18
**Last updated**: 2026-04-18
**Parties**: Vendor (AdsPanda AI / Golf Team, Thailand) ↔ Customer (self-host licensee)
**Sister documents**: DPA-v1.1 (data processing) · CUSTOMER_GUIDE_v2.md (setup) · PRIVACY_DEPLOY_NOTE.md (end-user terms customer deploys on their own domain)
**v1.1 changelog**: Version bump to stay in sync with DPA v1.1 (DPA added Anthropic as sub-processor #4 via BYOK brain proxy; OpenAI reclassified as "planned"). No TOS content change — TOS defers to DPA for sub-processor list. Customers who accepted v1.0 must re-accept v1.1 per DPA §8 (material change requires 30-day notice + re-consent).
**Big signal**: This agreement includes a FULL MIRROR DATA ACCESS DISCLOSURE — see section 4. Vendor มี read-only access เข้า deployment ของ Customer เพื่อ security monitoring + compliance oversight ทุกการเข้าถึงถูก audit-log และ Customer ขอดูได้เสมอ ไม่ใช่ fine print มันคือส่วนสำคัญของบริการนี้

---

## ภาษาไทย

## สรุปสั้นๆ

อ่าน 60 วินาทีนี้ก่อนเซ็น ถ้าไม่เห็นด้วยกับข้อใดข้อหนึ่ง อย่าเพิ่ง deploy:

- **คุณคือ Customer** — ธุรกิจที่รับ license AdsPanda AI ไป self-host บน server ของตัวเอง ใช้กับลูกค้า/ผู้ใช้ปลายทางของคุณเอง
- **Vendor คือ AdsPanda AI / Golf Team** (ประเทศไทย) เจ้าของ source code, ระบบ, และผู้ให้ support
- **Vendor มี read-only access เข้า deployment ของ Customer** — ดู campaign, logs, config, user actions ได้ เพื่อ security monitoring + compliance oversight (ดูรายละเอียดเต็มในข้อ 4 — สำคัญที่สุดของเอกสารนี้)
- ทุกการเข้าถึงของ Vendor ถูก **audit-log** ไว้ — Customer ขอดูได้ทุกเมื่อ (SLA 7 วันทำการ)
- Customer ต้องยอมรับ **Data Processing Agreement (DPA-v1.md)** ตอน setup — เป็นเงื่อนไขของการเปิดใช้งาน
- Customer ห้าม resell ห้ามแจก source ต่อ ห้ามใช้ผิดกฎ Meta/FB หรือผิดกฎหมายไทย
- Vendor รับประกัน uptime target + แจ้งเหตุ security breach ภายใน **72 ชั่วโมง** + เปิดเผยรายชื่อ sub-processor
- License Fee structure กำลัง finalize — ข้อ 8 อธิบายว่าจะ notify Customer อย่างไรเมื่อราคาเคาะ
- Liability cap: 3x ค่าธรรมเนียมรายเดือน หรือ 1,000 บาท เลือกอันที่สูงกว่า
- กฎหมายไทย ศาลกรุงเทพฯ PDPA บังคับใช้ สิทธิผู้บริโภคไม่ถูกตัด

ถ้า ok → อ่านรายละเอียดด้านล่าง ถ้าไม่ชัดข้อไหน → mymint0840@gmail.com ตอบใน 7 วันทำการ

## ขอบเขตของ License นี้

เอกสารนี้คือสัญญาระหว่าง **Vendor** (AdsPanda AI ดำเนินการโดย Golf Team ประเทศไทย) และ **Customer** (นิติบุคคลหรือบุคคลที่ license AdsPanda AI self-host ไปใช้งาน)

**สิ่งที่ license นี้ครอบคลุม**:
- สิทธิในการ deploy AdsPanda AI บน infrastructure ของ Customer เอง (เช่น VPS, cloud, on-prem)
- สิทธิในการใช้ AdsPanda AI บริหาร ad campaign ของ Customer หรือของลูกค้าที่ Customer ให้บริการ
- การรับ update, patch, security fix ตามเงื่อนไข License Fee (ข้อ 8)
- การเข้าถึง support จาก Vendor ผ่านช่องทางที่กำหนดในข้อ 13
- Sister documents: DPA-v1.md (data processing), CUSTOMER_GUIDE_v2.md (setup), PRIVACY_DEPLOY_NOTE.md (end-user terms ที่ Customer นำไป deploy กับ end-user ของตัวเอง)

**สิ่งที่ license นี้ไม่ครอบคลุม**:
- ไม่ใช่การขายขาด source code — Vendor ยังเป็นเจ้าของ IP
- ไม่ใช่สัญญากับ end-user ของ Customer — end-user เห็น terms ที่ Customer deploy เอง (ดู PRIVACY_DEPLOY_NOTE.md)
- ไม่รวมการปรับแต่ง (customization) ที่ Vendor ต้องเขียน code ให้ — ต้องตกลงแยก
- ไม่ครอบคลุม ad spend หรือ FB API quota ของ Customer — เป็น cost ของ Customer เอง

**ใครคือคู่สัญญา**:
- **Vendor**: AdsPanda AI / Golf Team, Thailand, ติดต่อ mymint0840@gmail.com
- **Customer**: ผู้ที่ register, download, หรือเปิด instance ของ AdsPanda AI และยอมรับเอกสารนี้
- **End-user**: ไม่ใช่คู่สัญญาในเอกสารนี้ — เป็นผู้ใช้ของ Customer ซึ่ง Customer ต้อง deploy terms ของตัวเองให้

การยอมรับเกิดขึ้นเมื่อ Customer (ก) download/install AdsPanda AI, (ข) กด accept ตอน setup, หรือ (ค) เริ่มใช้งาน production — อย่างใดอย่างหนึ่งก่อน

## การเข้าถึงข้อมูลของ Vendor (Full Mirror Disclosure)

**อ่านข้อนี้ให้จบก่อนเซ็น** — ข้อนี้คือส่วนสำคัญที่สุดของ license นี้ ไม่ใช่ fine print มันคือเงื่อนไขหลักของการที่ Vendor จะให้ security + compliance oversight ได้

**Vendor (AdsPanda AI / Golf Team) มี read-only access ไปยัง deployment ของ Customer** เพื่อวัตถุประสงค์ 3 ข้อเท่านั้น:

1. **Security monitoring** — ตรวจจับ abuse, breach, config drift, credential leak, malicious pattern ที่อาจกระทบ Customer รายอื่น หรือกระทบชื่อเสียงของระบบ AdsPanda AI โดยรวม
2. **Compliance oversight** — ยืนยันว่าการใช้งานของ Customer ตรงตาม TOS นี้ + DPA + กฎหมาย Meta/FB + กฎหมายไทย (PDPA, พ.ร.บ.คอมพิวเตอร์, กฎหมายโฆษณา)
3. **Support assistance** — เมื่อ Customer ร้องขอ support และให้ Vendor ดู state ของระบบเพื่อ diagnose ปัญหา

**สิ่งที่ Vendor เข้าถึงได้**:
- Campaign data ทั้งหมดใน deployment (campaigns, ad sets, creative, targeting)
- Rules engine, trigger, automation ที่ Customer ตั้งไว้
- Logs (application log, audit log, error log, access log)
- Configuration (environment variables ที่ไม่ใช่ secret, feature flags, integration setting)
- User actions ภายใน AdsPanda AI dashboard (login, config change, rule change, export)
- Technical telemetry (performance metric, error rate, API latency, quota usage)
- Error report และ stack trace ที่เกิดใน deployment

**สิ่งที่ Vendor ไม่เข้าถึง / ไม่ทำ**:
- **ไม่แก้ไขข้อมูล** — access เป็น read-only เท่านั้น ยกเว้นกรณีเดียว: Customer ร้องขอ support เป็นลายลักษณ์อักษร (email หรือ support ticket) และ scope การแก้ไขถูกบันทึกใน audit log
- **ไม่ดึง FB ad spend ไปใช้เอง** — Vendor ไม่ใช้ payment method หรือ credit ของ Customer สำหรับ campaign ของ Vendor
- **ไม่เก็บ FB access token / long-lived credentials** — token ของ Customer เก็บใน deployment ของ Customer เท่านั้น
- **ไม่ขายข้อมูล** — ไม่ขาย, ไม่ให้เช่า, ไม่แลกเปลี่ยน campaign data หรือ user data กับ third-party
- **ไม่แชร์กับ ad network อื่น** — ข้อมูลของ Customer ไม่ถูกส่งต่อไปยังคู่แข่ง, affiliate, หรือ data broker
- **ไม่ดูข้อมูลของ end-user เกินจำเป็น** — PII ของ end-user ที่ Customer เก็บนั้น Vendor เห็นได้เฉพาะในบริบท security/compliance เท่านั้น ไม่ใช่เพื่อ marketing หรือวัตถุประสงค์อื่น

**ทำไมต้องเป็น Full Mirror** (เหตุผลที่ Vendor เลือก model นี้):
- AdsPanda AI ทำงานกับ FB Marketing API ซึ่งมีกฎเข้มงวด Vendor ต้องตอบ Meta ได้ว่าไม่มี Customer รายใดใช้ระบบในทางที่ผิด — ต้อง monitor ได้จริง
- Security breach ของ Customer หนึ่งราย อาจกระทบ Customer รายอื่นผ่าน shared infrastructure pattern หรือ shared API quota — ต้องตรวจจับเร็ว
- Vendor ให้ support + patch — ถ้าไม่เห็น state จริง จะ debug ให้ไม่ได้
- Full Mirror โปร่งใสกว่า model อื่น: Customer รู้ว่า Vendor เห็นอะไร, เห็นเมื่อไหร่, และขอ audit log ได้

**Audit log — สิทธิของ Customer**:
- ทุกครั้งที่ Vendor เข้าถึง deployment ของ Customer ถูกบันทึกใน audit log อัตโนมัติ
- รายการที่บันทึก: timestamp, ผู้เข้าถึง (Vendor staff ID), scope (endpoint/table/resource), วัตถุประสงค์ (security / compliance / support ticket reference), IP address
- Customer ขอ audit log ได้ทุกเมื่อ — ส่งคำขอไปที่ mymint0840@gmail.com subject "[AUDIT-LOG-REQ]" — Vendor ส่งให้ภายใน **7 วันทำการ**
- Audit log เก็บย้อนหลัง **อย่างน้อย 12 เดือน**
- รายละเอียด format และการร้องขอดูในข้อ 7

**DPA Acknowledgment — บังคับตอน setup**:
- Customer **ต้องอ่านและยอมรับ Data Processing Agreement (DPA-v1.md)** ก่อนเปิด instance production
- DPA อธิบายบทบาทของ Vendor ในฐานะ data processor + ขอบเขตการ process ข้อมูล + มาตรการรักษาความปลอดภัย + สิทธิของ data subject
- ถ้า Customer ไม่ยอมรับ DPA → ไม่สามารถใช้งาน production ได้
- DPA และ TOS นี้ต้องอ่านคู่กันเสมอ — ที่ใดขัดแย้ง DPA เป็นเกณฑ์สำหรับเรื่อง data processing โดยเฉพาะ

**Customer revoke access ได้มั้ย**:
- ระหว่าง license ยังมีผล — Customer revoke read access ทั้งหมดไม่ได้ เพราะเป็นเงื่อนไขของการให้บริการ แต่ Customer ขอ scope ลดได้ในกรณีพิเศษ (เช่น regulatory requirement ของประเทศที่ Customer อยู่) — ต้องคุยกับ Vendor เป็นราย case
- ถ้า Customer ต้องการยกเลิก Full Mirror ทั้งหมด → ทางเลือกคือ **terminate license** ตามข้อ 9

## ความรับผิดชอบของ Customer

- **License compliance** — ใช้ AdsPanda AI ภายใน scope ที่ license ให้สิทธิ เท่านั้น ไม่เกินจำนวน instance/seat ที่ตกลงไว้
- **No resale** — ห้ามขายต่อ, ห้ามแจก source code, ห้ามเปิดเป็น SaaS ให้บุคคลที่สามใช้ในฐานะผลิตภัณฑ์ของตัวเอง (ใช้กับลูกค้า/end-user ของ Customer เองได้ แต่ต้องอยู่ภายใต้ชื่อและความรับผิดชอบของ Customer)
- **Proper use** — ใช้งานตรงตามกฎ Meta/FB (Advertising Policy, Platform Policy), กฎหมายไทย (PDPA, พ.ร.บ.คอมพิวเตอร์, กฎหมายโฆษณา, กฎหมายคุ้มครองผู้บริโภค), และมาตรฐานอุตสาหกรรม
- **Secure credentials** — เก็บ FB access token, API key, admin credential ของ AdsPanda AI dashboard ให้ปลอดภัย ไม่แชร์ bulk ไม่ commit ขึ้น public repo
- **Own infrastructure security** — รับผิดชอบความปลอดภัยของ server, OS, network, backup ของ deployment ตัวเอง (Vendor ไม่รับผิดชอบ infra ของ Customer)
- **Notify Vendor ของ incident** — ถ้าพบ breach, abuse, หรือปัญหา security ต้องแจ้ง Vendor ภายใน 72 ชั่วโมง
- **Deploy end-user terms ของตัวเอง** — ถ้า Customer ให้ end-user ใช้งาน dashboard ต้อง deploy terms ของ Customer (อ้างอิง PRIVACY_DEPLOY_NOTE.md เป็น template)
- **ปฏิบัติตาม DPA** — เป็นไปตาม DPA-v1.md ตลอดช่วงที่ license มีผล

## ความรับผิดชอบของ Vendor

- **Uptime target** — Vendor ตั้งเป้า 99.0% availability สำหรับ service ที่ Vendor host เอง (update server, license server, support portal) ส่วน deployment ของ Customer เองอยู่ใน control ของ Customer — Vendor รับผิดชอบ code และ patch ไม่รับผิดชอบ uptime ของ server ที่ Customer run เอง
- **Security patch** — Vendor ปล่อย security patch ตามระดับความรุนแรง: Critical ภายใน 7 วัน, High ภายใน 30 วัน, Medium/Low ตาม release cycle ปกติ
- **Breach notification** — ถ้า Vendor พบ breach ที่กระทบ Customer (เช่น vulnerability ที่ถูกใช้โจมตี, credential leak ฝั่ง Vendor) จะแจ้ง Customer ภายใน **72 ชั่วโมง** พร้อม scope ของเหตุการณ์และ mitigation
- **Sub-processor disclosure** — Vendor ใช้ sub-processor (เช่น cloud provider, email service, monitoring tool) — รายชื่อและ role อยู่ใน DPA-v1.md ข้อ "Sub-processors" — Vendor แจ้งล่วงหน้า 30 วันเมื่อมีการเพิ่ม/เปลี่ยน sub-processor
- **Respect audit log requests** — ตอบ audit log request ของ Customer ภายใน 7 วันทำการ (ดูข้อ 7)
- **No misuse of Full Mirror access** — Vendor ใช้ access ตาม scope ในข้อ 4 เท่านั้น — การละเมิดโดย Vendor = ground for Customer termination + refund ตาม pro-rata
- **Transparency on changes** — การเปลี่ยน TOS หรือ DPA ที่กระทบสิทธิ Customer แบบ material Vendor แจ้งล่วงหน้า 30 วัน Customer มีสิทธิ์ terminate โดยได้ refund pro-rata ถ้าไม่เห็นด้วย

## Audit Log

- **Scope** — audit log บันทึกทุกการเข้าถึง deployment ของ Customer โดย Vendor รวมถึง (ก) automated monitoring scan, (ข) manual access โดย Vendor staff, (ค) support session ที่ Customer ร้องขอ
- **Format** — JSON + human-readable summary ประกอบด้วย: `timestamp` (ISO 8601, UTC+7), `actor` (Vendor staff ID หรือ system account), `scope` (endpoint/table/resource ที่เข้าถึง), `purpose` (security / compliance / support / automated-scan), `ticket_ref` (ถ้ามี), `ip_address`, `action_type` (read / support-write-with-consent)
- **Retention** — เก็บไว้อย่างน้อย 12 เดือน หลังจากนั้น archive เป็น encrypted snapshot อีก 12 เดือน รวม 24 เดือน ก่อน purge
- **ขอได้อย่างไร** — email `mymint0840@gmail.com` subject `[AUDIT-LOG-REQ] <customer-id>` ระบุช่วงเวลาที่ต้องการ (เช่น "2026-04-01 ถึง 2026-04-17")
- **SLA** — Vendor ส่ง audit log ภายใน **7 วันทำการ** ในรูปแบบ signed JSON + PDF summary
- **ค่าใช้จ่าย** — ฟรี 1 ครั้งต่อไตรมาส หากขอถี่กว่านี้ Vendor อาจเรียก cost recovery ตามเหมาะสม
- **Dispute** — ถ้า Customer เห็นว่า Vendor access เกิน scope สามารถ escalate ผ่าน email เดียวกัน Vendor ตอบใน 14 วันทำการ พร้อม remediation plan ถ้ามี finding

## ค่าธรรมเนียม / License Fee

> **Placeholder — ราคายังไม่ finalize ณ Effective date 2026-04-18** Vendor กำลัง finalize tier structure ประกอบด้วย (ก) Free tier สำหรับ testing/non-production, (ข) paid tier รายเดือน/รายปี, (ค) license key activation

**หลักการที่ commit ไว้แล้ว**:
- ราคาเคาะแล้วจะ notify Customer ทุกรายล่วงหน้าอย่างน้อย 30 วันก่อนมีผล
- Customer รายเดิมที่เริ่มใช้ก่อนราคา finalize จะได้ **grandfathered rate** อย่างน้อย 6 เดือนแรก
- จะไม่มีการ back-charge ย้อนหลังสำหรับการใช้งานก่อน Effective date ของ pricing ใหม่
- Free tier จะยังคงมี — เงื่อนไขการใช้งาน (limit, support level) อาจปรับ
- License Fee จะถูกตีพิมพ์ใน separate pricing document เมื่อ finalize — link จะใส่ไว้ที่นี่

**ช่องทางชำระ** (เมื่อ pricing active): โอนธนาคารในประเทศไทย, Stripe, หรือช่องทางอื่นที่ Vendor เปิดให้ — รายละเอียดใน invoice

**การต่ออายุ**: auto-renew รายเดือน/รายปี ตามที่ Customer เลือกตอน subscribe — Customer ยกเลิกก่อนรอบถัดไปได้ตลอด (ดูข้อ 9)

## การยกเลิก / Termination

**Customer terminate**:
- ยกเลิกได้ทุกเมื่อโดยส่ง email ไปที่ mymint0840@gmail.com subject `[TERMINATION] <customer-id>`
- มีผลสิ้นรอบการชำระปัจจุบัน (ไม่ prorate refund เว้นแต่ Vendor ผิดสัญญา material breach)
- Customer ยังใช้งาน deployment ต่อได้จนสิ้นรอบ หลังจากนั้น license key หมดอายุ — update/patch/support หยุด

**Vendor terminate**:
- Vendor terminate ได้ในกรณี: (ก) Customer ละเมิด TOS material (เช่น resell, ใช้ผิดกฎหมาย, ไม่จ่ายค่าธรรมเนียม 30 วัน), (ข) Vendor หยุดให้บริการ AdsPanda AI โดยรวม (notify 90 วันล่วงหน้า), (ค) คำสั่งศาลหรือ regulatory
- Material breach → Vendor ส่ง notice ให้ Customer มีเวลา cure 14 วัน ถ้าไม่ cure → terminate

**Data return / deletion** (หลัง termination):
- Vendor หยุด Full Mirror access ทันทีเมื่อ termination มีผล
- Audit log ของ Vendor ที่บันทึกการเข้าถึงในอดีต เก็บตาม retention policy (ดูข้อ 7)
- ข้อมูลของ Customer ทั้งหมดอยู่ใน deployment ของ Customer เอง — Vendor ไม่ได้ถือข้อมูล Customer แบบ centralized (ยกเว้น audit log และ telemetry aggregate)
- รายละเอียด data processing หลัง termination → ดู DPA-v1.md ข้อ "Termination & Data Return"

**Survival** — ข้อที่ยังมีผลหลัง termination: ข้อจำกัดความรับผิด (ข้อ 10), ข้อห้าม resell (ข้อ 5), audit log retention (ข้อ 7), กฎหมายที่ใช้บังคับ (ข้อ 12)

## ข้อจำกัดความรับผิด

ภายใต้ขอบเขตที่กฎหมายไทยอนุญาต:

- **Liability cap** — ความรับผิดของ Vendor ต่อ Customer (รวมทุก claim ทุกเหตุ) ไม่เกิน **3 เท่าของค่าธรรมเนียมรายเดือน ณ เดือนที่เกิดเหตุ หรือ 1,000 บาท แล้วแต่จำนวนใดสูงกว่า**
- **Excluded damages** — ไม่รับผิดต่อ (ก) lost profits, lost ad spend, lost opportunity, (ข) damage จาก FB/Meta API ที่เปลี่ยนแปลง/ระงับ, (ค) damage จาก infrastructure ของ Customer เอง, (ง) damage จากการใช้ AdsPanda AI ผิดกฎหมายโดย Customer
- **Carve-outs** — liability cap ไม่ใช้กับ (ก) การกระทำโดยจงใจหรือประมาทเลินเล่ออย่างร้ายแรงโดย Vendor, (ข) การละเมิด Full Mirror scope ตามที่ระบุในข้อ 4, (ค) ความรับผิดตาม PDPA ที่กฎหมายกำหนดให้รับผิดโดยไม่สามารถจำกัดได้
- **สิทธิผู้บริโภค** — ถ้า Customer เป็น "ผู้บริโภค" ตาม พ.ร.บ. คุ้มครองผู้บริโภค สิทธิตามกฎหมายไม่ถูกจำกัดโดยข้อนี้

## Disclaimer

- **ไม่รับประกัน ad performance** — AdsPanda AI เป็นเครื่องมือช่วยบริหาร campaign ไม่รับประกันยอด reach, engagement, conversion, ROAS — ผลลัพธ์ขึ้นกับ creative, targeting, budget, market ของ Customer
- **ไม่ใช่ financial product** — AdsPanda AI ไม่ใช่ investment advice, financial service, หรือ fiduciary product การตั้ง rule/automation ที่ใช้เงินเป็น Customer decision
- **FB API dependencies** — AdsPanda AI ทำงานบน FB Marketing API — ถ้า Meta เปลี่ยน API, เปลี่ยน policy, ระงับ access, หรือ deprecate feature ส่งผลให้ AdsPanda AI บางส่วนไม่ทำงาน Vendor จะพยายาม adapt เร็วที่สุด แต่ไม่รับผิดต่อ downtime/loss ที่เกิดจากการเปลี่ยนฝั่ง Meta
- **ผลการใช้งานเป็นของ Customer** — ถ้า Customer ใช้ AdsPanda AI ในทางที่ผิดกฎ FB หรือผิดกฎหมาย เป็นเรื่องของ Customer — Vendor ไม่รับผิดแทน และมีสิทธิ์ terminate ตามข้อ 9

## กฎหมายที่ใช้บังคับ

- สัญญานี้อยู่ภายใต้ **กฎหมายไทย**
- ข้อพิพาทที่ตกลงกันไม่ได้ → ศาลในเขตอำนาจ **กรุงเทพมหานคร**
- **PDPA (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562)** บังคับใช้ — รายละเอียด role ของ Vendor เป็น data processor อยู่ใน DPA-v1.md
- **สิทธิผู้บริโภค** ตาม พ.ร.บ. คุ้มครองผู้บริโภค, พ.ร.บ. ว่าด้วยข้อสัญญาที่ไม่เป็นธรรม, และกฎหมายที่เกี่ยวข้อง — ไม่ถูกตัดโดยข้อสัญญานี้
- Customer ต่างประเทศที่ใช้งานใน Thailand jurisdiction — กฎหมายไทยใช้กับขอบเขตการใช้งานในไทย Customer อาจมีสิทธิ์ตามกฎหมายประเทศตัวเองเพิ่มเติม

## ติดต่อเรา

- **Email**: mymint0840@gmail.com
- **Subject prefix conventions**:
  - `[AUDIT-LOG-REQ]` — ขอ audit log (ข้อ 7)
  - `[TERMINATION]` — แจ้งยกเลิก license (ข้อ 9)
  - `[BREACH]` — แจ้งเหตุ security breach (Customer ต้องแจ้งภายใน 72 ชม.)
  - `[SUPPORT]` — ขอ support ทั่วไป
  - `[DPA]` — เรื่อง data processing / PDPA
  - `[LEGAL]` — ข้อพิพาท, dispute, legal question
  - `[FEEDBACK]` — แสดงความคิดเห็น
- **SLA** — ตอบภายใน **7 วันทำการ** (security/breach issue → 24 ชั่วโมง)
- **ภาษา** — ไทย หรือ อังกฤษ

---

## English

## Summary

Read this 60-second summary before you sign. If any bullet doesn't sit right, don't deploy yet:

- **You are the Customer** — a business that licenses AdsPanda AI and self-hosts it on your own infrastructure, using it with your own end-users
- **Vendor is AdsPanda AI / Golf Team** (Thailand) — owner of the source code, system, and provider of support
- **Vendor has read-only access to Customer's deployment** — Vendor can see campaigns, logs, config, user actions for security monitoring and compliance oversight (full detail in section 4 — the most important clause in this agreement)
- **Every Vendor access is audit-logged** — Customer can request the audit log at any time (7 business-day SLA)
- **Customer must accept the Data Processing Agreement (DPA-v1.md) at setup** — it is a precondition for production use
- Customer may not resell, redistribute source, or use AdsPanda AI in ways that violate Meta/FB policy or Thai law
- Vendor commits to uptime targets, will notify Customer of security breaches within **72 hours**, and discloses sub-processors
- License Fee structure is being finalized — section 8 explains how Customer will be notified when pricing lands
- Liability cap: 3x the monthly fee or THB 1,000, whichever is higher
- Thai law, Bangkok courts, PDPA applies, consumer rights are preserved

If it looks good → read the full detail below. If any point is unclear → mymint0840@gmail.com, reply within 7 business days.

## Scope of This License

This document is the agreement between **Vendor** (AdsPanda AI operated by Golf Team, Thailand) and **Customer** (the entity or person licensing AdsPanda AI for self-hosting).

**What this license covers**:
- The right to deploy AdsPanda AI on Customer's own infrastructure (VPS, cloud, on-prem)
- The right to use AdsPanda AI to run ad campaigns for Customer or for Customer's clients
- Updates, patches, and security fixes per the License Fee terms (section 8)
- Access to Vendor support through the channels in section 13
- Sister documents: DPA-v1.md (data processing), CUSTOMER_GUIDE_v2.md (setup), PRIVACY_DEPLOY_NOTE.md (end-user terms that Customer deploys for its own end-users)

**What this license does not cover**:
- It is not an outright sale of source code — Vendor retains IP ownership
- It is not a contract with Customer's end-users — end-users see terms that Customer deploys (see PRIVACY_DEPLOY_NOTE.md)
- It does not include custom development work — custom work is negotiated separately
- It does not cover Customer's ad spend or FB API quota — those are Customer's own costs

**Who the parties are**:
- **Vendor**: AdsPanda AI / Golf Team, Thailand, contact mymint0840@gmail.com
- **Customer**: the entity or person who registers, downloads, or opens an AdsPanda AI instance and accepts this document
- **End-users**: not a party to this agreement — they are Customer's users, and Customer must deploy its own terms for them

Acceptance occurs when Customer (a) downloads/installs AdsPanda AI, (b) clicks accept during setup, or (c) begins production use — whichever happens first.

## Vendor Data Access (Full Mirror Disclosure)

**Read this section before you sign** — it is the most important clause in this agreement, not fine print. It is the core condition under which Vendor can provide security and compliance oversight.

**Vendor (AdsPanda AI / Golf Team) has read-only access to Customer's deployment** for three purposes only:

1. **Security monitoring** — detect abuse, breach, config drift, credential leak, or malicious patterns that could affect other Customers or the reputation of the AdsPanda AI system as a whole
2. **Compliance oversight** — verify that Customer's use conforms with this TOS, the DPA, Meta/FB policy, and Thai law (PDPA, Computer Crimes Act, advertising regulations)
3. **Support assistance** — when Customer requests support and asks Vendor to look at system state to diagnose an issue

**What Vendor can access**:
- All campaign data in the deployment (campaigns, ad sets, creative, targeting)
- Rules engine, triggers, and automations that Customer has configured
- Logs (application log, audit log, error log, access log)
- Configuration (non-secret environment variables, feature flags, integration settings)
- User actions inside the AdsPanda AI dashboard (login, config change, rule change, export)
- Technical telemetry (performance metrics, error rate, API latency, quota usage)
- Error reports and stack traces from the deployment

**What Vendor does not access or do**:
- **No modification** — access is read-only, with one exception: when Customer explicitly requests support in writing (email or support ticket) and the scope of any change is recorded in the audit log
- **No use of FB ad spend** — Vendor does not use Customer's payment methods or credits to run Vendor's own campaigns
- **No hoarding of FB access tokens or long-lived credentials** — Customer tokens stay in Customer's deployment
- **No data sale** — Vendor does not sell, rent, or barter campaign data or user data to any third party
- **No sharing with other ad networks** — Customer data is not forwarded to competitors, affiliates, or data brokers
- **No beyond-scope access to end-user data** — PII of Customer's end-users is only visible to Vendor in the context of security/compliance, never for marketing or other purposes

**Why Full Mirror** (the reasons Vendor chose this model):
- AdsPanda AI operates on the FB Marketing API with strict policy — Vendor must be able to answer Meta that no Customer is abusing the system, and that requires real monitoring capability
- A breach in one Customer can cascade to others through shared infrastructure patterns or shared API quota — early detection requires visibility
- Vendor provides support and patches — without visibility into actual state, diagnosis is impossible
- Full Mirror is more transparent than alternatives: Customer knows what Vendor sees, when Vendor sees it, and can request the audit log

**Audit log — Customer's right**:
- Every Vendor access to Customer's deployment is automatically recorded in the audit log
- Recorded fields: timestamp, actor (Vendor staff ID), scope (endpoint/table/resource), purpose (security / compliance / support ticket reference), IP address
- Customer may request the audit log at any time — email mymint0840@gmail.com, subject `[AUDIT-LOG-REQ]` — Vendor delivers within **7 business days**
- Audit logs are retained for **at least 12 months**
- Format and request details are in section 7

**DPA Acknowledgment — required at setup**:
- Customer **must read and accept the Data Processing Agreement (DPA-v1.md)** before opening a production instance
- The DPA describes Vendor's role as data processor, the scope of processing, security measures, and data subject rights
- If Customer does not accept the DPA, production use is not permitted
- The DPA and this TOS must be read together — where they conflict, the DPA governs specifically for data processing matters

**Can Customer revoke access?**
- While the license is in effect, Customer cannot revoke read access wholesale — it is a condition of service. Scope reductions may be negotiated case-by-case (for example, to meet regulatory requirements in Customer's country) — contact Vendor
- If Customer wants Full Mirror to end entirely, the option is to **terminate the license** per section 9

## Customer Responsibilities

- **License compliance** — use AdsPanda AI within the scope granted by the license, not beyond agreed instance/seat counts
- **No resale** — no reselling, no redistributing source code, no operating it as a SaaS for third parties under a separate product name (Customer may use it with Customer's own clients/end-users, but those uses remain under Customer's name and responsibility)
- **Proper use** — comply with Meta/FB policies (Advertising Policy, Platform Policy), Thai law (PDPA, Computer Crimes Act, advertising and consumer protection laws), and industry standards
- **Secure credentials** — store FB access tokens, API keys, and AdsPanda AI dashboard admin credentials securely; no bulk sharing, no commits to public repositories
- **Own infrastructure security** — responsible for the security of Customer's own server, OS, network, and backups (Vendor is not responsible for Customer-operated infrastructure)
- **Notify Vendor of incidents** — report any breach, abuse, or security issue to Vendor within 72 hours
- **Deploy Customer's own end-user terms** — if Customer offers the dashboard to end-users, Customer must deploy its own terms (PRIVACY_DEPLOY_NOTE.md serves as a template)
- **Follow the DPA** — comply with DPA-v1.md throughout the license term

## Vendor Responsibilities

- **Uptime target** — Vendor targets 99.0% availability for Vendor-hosted services (update server, license server, support portal). Customer's own deployment runs on Customer's infrastructure — Vendor is responsible for code and patches, not for uptime of Customer-operated servers
- **Security patches** — patches are released by severity: Critical within 7 days, High within 30 days, Medium/Low on the regular release cycle
- **Breach notification** — if Vendor discovers a breach affecting Customer (e.g., a vulnerability actively exploited, a Vendor-side credential leak), Vendor notifies Customer within **72 hours** with scope and mitigation
- **Sub-processor disclosure** — Vendor uses sub-processors (e.g., cloud provider, email service, monitoring tool). Names and roles are listed in DPA-v1.md under "Sub-processors." Vendor gives 30 days' notice when adding or changing sub-processors
- **Respect audit log requests** — respond to Customer audit log requests within 7 business days (see section 7)
- **No misuse of Full Mirror access** — Vendor uses access only within the scope in section 4 — any Vendor violation is grounds for Customer termination with pro-rata refund
- **Transparency on changes** — material changes to TOS or DPA that affect Customer rights are announced 30 days in advance; Customer may terminate with pro-rata refund if they disagree

## Audit Log

- **Scope** — the audit log records every Vendor access to Customer's deployment, including (a) automated monitoring scans, (b) manual access by Vendor staff, and (c) support sessions requested by Customer
- **Format** — JSON plus a human-readable summary, with fields: `timestamp` (ISO 8601, UTC+7), `actor` (Vendor staff ID or system account), `scope` (endpoint/table/resource accessed), `purpose` (security / compliance / support / automated-scan), `ticket_ref` (if any), `ip_address`, `action_type` (read / support-write-with-consent)
- **Retention** — retained for at least 12 months; then archived as an encrypted snapshot for another 12 months, for a total of 24 months before purge
- **How to request** — email `mymint0840@gmail.com` with subject `[AUDIT-LOG-REQ] <customer-id>`, specifying the time range (e.g., "2026-04-01 to 2026-04-17")
- **SLA** — Vendor delivers the audit log within **7 business days** as signed JSON plus a PDF summary
- **Cost** — free once per quarter; more frequent requests may be subject to reasonable cost recovery
- **Dispute** — if Customer believes Vendor has exceeded scope, escalate via the same email. Vendor responds within 14 business days with findings and a remediation plan if applicable

## License Fee

> **Placeholder — pricing not finalized as of Effective date 2026-04-18** Vendor is finalizing a tier structure consisting of (a) a Free tier for testing/non-production, (b) paid monthly/annual tiers, and (c) license key activation

**Commitments already in place**:
- When pricing lands, all Customers will be notified at least 30 days before it takes effect
- Existing Customers who started before pricing is finalized will receive a **grandfathered rate** for at least the first 6 months
- No retroactive back-charging for usage prior to the Effective date of new pricing
- A Free tier will remain — usage conditions (limits, support level) may be adjusted
- The License Fee will be published in a separate pricing document once finalized — the link will be inserted here

**Payment channels** (once pricing is active): Thai domestic bank transfer, Stripe, or other channels that Vendor makes available — details will appear on invoices

**Renewal**: auto-renews monthly/annually based on the plan Customer selects at subscription — Customer may cancel before the next billing cycle at any time (see section 9)

## Termination

**Customer termination**:
- May terminate at any time by emailing mymint0840@gmail.com with subject `[TERMINATION] <customer-id>`
- Effective at the end of the current billing cycle (no prorated refund unless Vendor commits a material breach)
- Customer may continue using the deployment until cycle end; after that, the license key expires and updates/patches/support stop

**Vendor termination**:
- Vendor may terminate if (a) Customer materially breaches the TOS (e.g., resale, unlawful use, 30-day non-payment), (b) Vendor ceases the AdsPanda AI service overall (90 days' notice), or (c) by court order or regulatory action
- For material breach, Vendor issues notice and Customer has 14 days to cure; if not cured, termination proceeds

**Data return / deletion** (post-termination):
- Vendor immediately ceases Full Mirror access upon termination
- Historical Vendor audit logs of past access are retained per the retention policy (see section 7)
- Customer's data remains entirely in Customer's own deployment — Vendor does not hold Customer data centrally (aside from audit log and aggregate telemetry)
- Detailed post-termination data processing is covered in DPA-v1.md under "Termination & Data Return"

**Survival** — clauses that survive termination: limitation of liability (section 10), no-resale (section 5), audit log retention (section 7), governing law (section 12)

## Limitation of Liability

To the extent permitted by Thai law:

- **Liability cap** — Vendor's total liability to Customer (across all claims, all causes) is limited to **3x the monthly fee for the month in which the incident occurred, or THB 1,000, whichever is higher**
- **Excluded damages** — Vendor is not liable for (a) lost profits, lost ad spend, lost opportunity, (b) damages caused by FB/Meta API changes or suspension, (c) damages arising from Customer's own infrastructure, (d) damages caused by Customer's unlawful use of AdsPanda AI
- **Carve-outs** — the liability cap does not apply to (a) Vendor's willful misconduct or gross negligence, (b) Vendor's breach of the Full Mirror scope defined in section 4, (c) liabilities under PDPA that by law cannot be limited
- **Consumer rights** — if Customer qualifies as a "consumer" under the Consumer Protection Act, statutory rights are not limited by this section

## Disclaimer

- **No guarantee of ad performance** — AdsPanda AI is a campaign management tool; it does not guarantee reach, engagement, conversion, or ROAS — outcomes depend on Customer's creative, targeting, budget, and market
- **Not a financial product** — AdsPanda AI is not investment advice, a financial service, or a fiduciary product; any rule or automation that spends money is Customer's decision
- **FB API dependencies** — AdsPanda AI runs on the FB Marketing API; if Meta changes the API, changes policy, suspends access, or deprecates features such that parts of AdsPanda AI stop working, Vendor will adapt as fast as possible but is not liable for downtime or loss caused by Meta-side changes
- **Use-based outcomes are Customer's** — if Customer uses AdsPanda AI in violation of FB policy or the law, it is Customer's responsibility — Vendor is not liable, and may terminate per section 9

## Governing Law

- This agreement is governed by **Thai law**
- Disputes that cannot be resolved by negotiation → courts located in **Bangkok, Thailand**
- **PDPA (Personal Data Protection Act B.E. 2562)** applies — Vendor's role as data processor is detailed in DPA-v1.md
- **Consumer protection rights** under the Consumer Protection Act, the Unfair Contract Terms Act, and related law — are not waived by this agreement
- For international Customers operating partly in Thailand — Thai law applies to activities within Thai jurisdiction; Customer may have additional rights under home-country law

## Contact

- **Email**: mymint0840@gmail.com
- **Subject prefix conventions**:
  - `[AUDIT-LOG-REQ]` — request audit log (section 7)
  - `[TERMINATION]` — license termination notice (section 9)
  - `[BREACH]` — security breach report (Customer-side reports required within 72h)
  - `[SUPPORT]` — general support
  - `[DPA]` — data processing / PDPA matters
  - `[LEGAL]` — disputes, legal questions
  - `[FEEDBACK]` — comments and suggestions
- **SLA** — reply within **7 business days** (security/breach issues — 24 hours)
- **Languages** — Thai or English
