// ============================================================
// AdsPanda AI — Mock Data (Thai)
// ============================================================

// ─── Types ───────────────────────────────────────────────────

export interface AdAccount {
  id: string;
  name: string;
  currency: 'THB';
  totalBudget: number;
  totalSpend: number;
  status: 'active' | 'paused' | 'suspended';
}

export interface DailyData {
  date: string;
  spend: number;
  results: number;
}

export interface Campaign {
  id: string;
  accountId: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  budget: number;
  spend: number;
  results: number;
  impressions: number;
  clicks: number;
  cpa: number;
  roas: number;
  ctr: number;
  objective: string;
  createdAt: string;
  dailyData: DailyData[];
}

export interface ScaleCondition {
  metric: 'roas' | 'ctr' | 'cpa' | 'spend' | 'impressions' | 'results';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  value: number;
}

export interface ScaleAction {
  type: 'pause' | 'increase_budget' | 'decrease_budget' | 'alert' | 'stop';
  value?: number; // percentage or fixed amount
}

export interface ScaleRule {
  id: string;
  name: string;
  accountId: string;
  condition: ScaleCondition;
  action: ScaleAction;
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  lastTriggered?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: 'bot' | 'ai' | 'user';
  action: string;
  details: string;
  accountId: string;
  campaignId?: string;
  status: 'success' | 'warning' | 'error';
}

export interface CreativeAnalytics {
  id: string;
  campaignId: string;
  hookText: string;
  format: 'image' | 'video' | 'carousel';
  impressions: number;
  clicks: number;
  ctr: number;
  conversionRate: number;
  spend: number;
  aiScore: number;
  aiSuggestion: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
  email: string;
  lastActive: string;
  status: 'online' | 'offline';
}

export interface AIRecommendation {
  id: string;
  type: 'warning' | 'opportunity' | 'insight';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  campaignId?: string;
}

// ─── 1. AD ACCOUNTS ──────────────────────────────────────────

export const AD_ACCOUNTS: AdAccount[] = [
  {
    id: 'act_demo_test',
    name: 'ร้านสวยปัง Beauty',
    currency: 'THB',
    totalBudget: 120000,
    totalSpend: 87450,
    status: 'active',
  },
  {
    id: 'acc-002',
    name: 'คาเฟ่มีสุข Café',
    currency: 'THB',
    totalBudget: 50000,
    totalSpend: 31200,
    status: 'active',
  },
  {
    id: 'acc-003',
    name: 'เสื้อผ้าชิคๆ Fashion',
    currency: 'THB',
    totalBudget: 150000,
    totalSpend: 98750,
    status: 'active',
  },
];

// ─── 2. CAMPAIGNS ─────────────────────────────────────────────

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'cmp-001',
    accountId: 'act_demo_test',
    name: 'โปรซัมเมอร์ ลด50% สินค้าบิวตี้',
    status: 'active',
    budget: 30000,
    spend: 24800,
    results: 412,
    impressions: 520000,
    clicks: 15600,
    cpa: 60.2,
    roas: 5.4,
    ctr: 3.0,
    objective: 'CONVERSIONS',
    createdAt: '2026-04-01T08:00:00+07:00',
    dailyData: [
      { date: '2026-04-07', spend: 3200, results: 52 },
      { date: '2026-04-08', spend: 3650, results: 61 },
      { date: '2026-04-09', spend: 3500, results: 58 },
      { date: '2026-04-10', spend: 3800, results: 65 },
      { date: '2026-04-11', spend: 3700, results: 62 },
      { date: '2026-04-12', spend: 3550, results: 59 },
      { date: '2026-04-13', spend: 3400, results: 55 },
    ],
  },
  {
    id: 'cmp-002',
    accountId: 'act_demo_test',
    name: 'รีวิวสินค้าใหม่ เซรั่มหน้าใส',
    status: 'active',
    budget: 20000,
    spend: 17200,
    results: 287,
    impressions: 380000,
    clicks: 9500,
    cpa: 59.9,
    roas: 4.8,
    ctr: 2.5,
    objective: 'CONVERSIONS',
    createdAt: '2026-04-03T09:00:00+07:00',
    dailyData: [
      { date: '2026-04-07', spend: 2200, results: 38 },
      { date: '2026-04-08', spend: 2400, results: 42 },
      { date: '2026-04-09', spend: 2350, results: 40 },
      { date: '2026-04-10', spend: 2600, results: 45 },
      { date: '2026-04-11', spend: 2500, results: 43 },
      { date: '2026-04-12', spend: 2750, results: 47 },
      { date: '2026-04-13', spend: 2400, results: 32 },
    ],
  },
  {
    id: 'cmp-003',
    accountId: 'act_demo_test',
    name: 'Awareness หน้าร้าน — เพิ่มการรับรู้แบรนด์',
    status: 'paused',
    budget: 15000,
    spend: 14200,
    results: 95,
    impressions: 710000,
    clicks: 7100,
    cpa: 149.5,
    roas: 1.8,
    ctr: 1.0,
    objective: 'BRAND_AWARENESS',
    createdAt: '2026-03-25T10:00:00+07:00',
    dailyData: [
      { date: '2026-04-07', spend: 2000, results: 13 },
      { date: '2026-04-08', spend: 2100, results: 14 },
      { date: '2026-04-09', spend: 2050, results: 14 },
      { date: '2026-04-10', spend: 2200, results: 15 },
      { date: '2026-04-11', spend: 1950, results: 13 },
      { date: '2026-04-12', spend: 1900, results: 13 },
      { date: '2026-04-13', spend: 0, results: 0 },
    ],
  },
  {
    id: 'cmp-004',
    accountId: 'acc-002',
    name: 'โฆษณาคาเฟ่ กาแฟ39บาท ทุกเมนู',
    status: 'active',
    budget: 12000,
    spend: 9800,
    results: 534,
    impressions: 245000,
    clicks: 9800,
    cpa: 18.4,
    roas: 7.2,
    ctr: 4.0,
    objective: 'STORE_TRAFFIC',
    createdAt: '2026-04-05T07:30:00+07:00',
    dailyData: [
      { date: '2026-04-07', spend: 1200, results: 68 },
      { date: '2026-04-08', spend: 1350, results: 76 },
      { date: '2026-04-09', spend: 1400, results: 79 },
      { date: '2026-04-10', spend: 1500, results: 84 },
      { date: '2026-04-11', spend: 1450, results: 81 },
      { date: '2026-04-12', spend: 1500, results: 84 },
      { date: '2026-04-13', spend: 1400, results: 62 },
    ],
  },
  {
    id: 'cmp-005',
    accountId: 'acc-002',
    name: 'เมนูใหม่! ชาไทยปั่นหิมะ — โปรสุดคุ้ม',
    status: 'active',
    budget: 8000,
    spend: 6400,
    results: 312,
    impressions: 160000,
    clicks: 5760,
    cpa: 20.5,
    roas: 6.1,
    ctr: 3.6,
    objective: 'STORE_TRAFFIC',
    createdAt: '2026-04-06T08:00:00+07:00',
    dailyData: [
      { date: '2026-04-07', spend: 850, results: 42 },
      { date: '2026-04-08', spend: 920, results: 45 },
      { date: '2026-04-09', spend: 900, results: 44 },
      { date: '2026-04-10', spend: 980, results: 48 },
      { date: '2026-04-11', spend: 950, results: 46 },
      { date: '2026-04-12', spend: 1000, results: 49 },
      { date: '2026-04-13', spend: 800, results: 38 },
    ],
  },
  {
    id: 'cmp-006',
    accountId: 'acc-003',
    name: 'คอลเลกชั่นฤดูร้อน เสื้อลินินสุดชิค',
    status: 'active',
    budget: 40000,
    spend: 31500,
    results: 780,
    impressions: 650000,
    clicks: 19500,
    cpa: 40.4,
    roas: 5.8,
    ctr: 3.0,
    objective: 'CONVERSIONS',
    createdAt: '2026-04-02T09:00:00+07:00',
    dailyData: [
      { date: '2026-04-07', spend: 4200, results: 102 },
      { date: '2026-04-08', spend: 4500, results: 110 },
      { date: '2026-04-09', spend: 4350, results: 106 },
      { date: '2026-04-10', spend: 4800, results: 118 },
      { date: '2026-04-11', spend: 4600, results: 113 },
      { date: '2026-04-12', spend: 4700, results: 115 },
      { date: '2026-04-13', spend: 4350, results: 116 },
    ],
  },
  {
    id: 'cmp-007',
    accountId: 'acc-003',
    name: 'Retargeting — ลูกค้าเก่า ส่วนลด15%',
    status: 'active',
    budget: 15000,
    spend: 11200,
    results: 298,
    impressions: 140000,
    clicks: 5600,
    cpa: 37.6,
    roas: 6.8,
    ctr: 4.0,
    objective: 'CONVERSIONS',
    createdAt: '2026-04-04T10:00:00+07:00',
    dailyData: [
      { date: '2026-04-07', spend: 1500, results: 40 },
      { date: '2026-04-08', spend: 1600, results: 43 },
      { date: '2026-04-09', spend: 1550, results: 41 },
      { date: '2026-04-10', spend: 1700, results: 45 },
      { date: '2026-04-11', spend: 1650, results: 44 },
      { date: '2026-04-12', spend: 1800, results: 48 },
      { date: '2026-04-13', spend: 1400, results: 37 },
    ],
  },
  {
    id: 'cmp-008',
    accountId: 'acc-003',
    name: 'เคลียร์สต็อก! ลดราคาพิเศษสุดท้าย',
    status: 'completed',
    budget: 10000,
    spend: 9980,
    results: 620,
    impressions: 310000,
    clicks: 12400,
    cpa: 16.1,
    roas: 7.9,
    ctr: 4.0,
    objective: 'CONVERSIONS',
    createdAt: '2026-03-28T08:00:00+07:00',
    dailyData: [
      { date: '2026-04-01', spend: 1600, results: 98 },
      { date: '2026-04-02', spend: 1550, results: 95 },
      { date: '2026-04-03', spend: 1500, results: 92 },
      { date: '2026-04-04', spend: 1700, results: 104 },
      { date: '2026-04-05', spend: 1680, results: 103 },
      { date: '2026-04-06', spend: 1450, results: 89 },
      { date: '2026-04-07', spend: 500, results: 39 },
    ],
  },
];

// ─── 3. SCALE RULES ───────────────────────────────────────────

export const SCALE_RULES: ScaleRule[] = [
  {
    id: 'rule-001',
    name: 'ROAS ต่ำกว่า 2 → หยุดแคมเปญ',
    accountId: 'act_demo_test',
    condition: { metric: 'roas', operator: 'lt', value: 2 },
    action: { type: 'pause' },
    enabled: true,
    frequency: 'daily',
    lastTriggered: '2026-04-11T06:00:00+07:00',
  },
  {
    id: 'rule-002',
    name: 'CTR สูงกว่า 3% → เพิ่มงบ 20%',
    accountId: 'acc-002',
    condition: { metric: 'ctr', operator: 'gt', value: 3 },
    action: { type: 'increase_budget', value: 20 },
    enabled: true,
    frequency: 'daily',
    lastTriggered: '2026-04-12T06:00:00+07:00',
  },
  {
    id: 'rule-003',
    name: 'CPA เกิน 100 บาท → ลดงบ 30%',
    accountId: 'act_demo_test',
    condition: { metric: 'cpa', operator: 'gt', value: 100 },
    action: { type: 'decrease_budget', value: 30 },
    enabled: true,
    frequency: 'hourly',
    lastTriggered: '2026-04-10T14:00:00+07:00',
  },
  {
    id: 'rule-004',
    name: 'ROAS สูงกว่า 6 → เพิ่มงบ 50%',
    accountId: 'acc-003',
    condition: { metric: 'roas', operator: 'gt', value: 6 },
    action: { type: 'increase_budget', value: 50 },
    enabled: true,
    frequency: 'daily',
  },
  {
    id: 'rule-005',
    name: 'ค่าใช้จ่ายเกิน 95% ของงบ → แจ้งเตือนทีม',
    accountId: 'acc-003',
    condition: { metric: 'spend', operator: 'gte', value: 95 },
    action: { type: 'alert' },
    enabled: false,
    frequency: 'hourly',
  },
];

// ─── 4. ACTIVITY LOG ──────────────────────────────────────────

export const ACTIVITY_LOG: ActivityLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-04-13T09:15:00+07:00',
    actor: 'bot',
    action: 'เพิ่มงบประมาณ 20%',
    details: 'CTR ของแคมเปญ "โฆษณาคาเฟ่ กาแฟ39บาท" สูงกว่า 3% ติดต่อกัน 2 วัน ระบบเพิ่มงบอัตโนมัติจาก 12,000 เป็น 14,400 บาท',
    accountId: 'acc-002',
    campaignId: 'cmp-004',
    status: 'success',
  },
  {
    id: 'log-002',
    timestamp: '2026-04-13T08:00:00+07:00',
    actor: 'ai',
    action: 'AI แนะนำเปลี่ยน creative',
    details: 'ภาพโฆษณาชุดปัจจุบันมี fatigue score สูง แนะนำให้สลับ creative ใหม่เพื่อรักษา CTR ไม่ให้ลดลง',
    accountId: 'act_demo_test',
    campaignId: 'cmp-001',
    status: 'warning',
  },
  {
    id: 'log-003',
    timestamp: '2026-04-12T18:30:00+07:00',
    actor: 'bot',
    action: 'หยุดแคมเปญชั่วคราว',
    details: 'ROAS ของแคมเปญ "Awareness หน้าร้าน" ลดลงต่ำกว่า 2x ระบบหยุดแคมเปญตามกฎ Rule-001 รอการตรวจสอบจากทีม',
    accountId: 'act_demo_test',
    campaignId: 'cmp-003',
    status: 'success',
  },
  {
    id: 'log-004',
    timestamp: '2026-04-12T15:00:00+07:00',
    actor: 'user',
    action: 'อนุมัติเพิ่มงบประมาณ',
    details: 'ผู้จัดการอนุมัติเพิ่มงบแคมเปญ "คอลเลกชั่นฤดูร้อน" จาก 35,000 เป็น 40,000 บาท เนื่องจาก ROAS อยู่ที่ 5.8x',
    accountId: 'acc-003',
    campaignId: 'cmp-006',
    status: 'success',
  },
  {
    id: 'log-005',
    timestamp: '2026-04-12T12:00:00+07:00',
    actor: 'ai',
    action: 'AI วิเคราะห์กลุ่มเป้าหมาย',
    details: 'พบว่ากลุ่มอายุ 25-34 ปี เพศหญิง มี conversion rate สูงที่สุด 4.2% แนะนำให้ปรับ audience targeting ให้แคบลง',
    accountId: 'act_demo_test',
    campaignId: 'cmp-002',
    status: 'success',
  },
  {
    id: 'log-006',
    timestamp: '2026-04-11T20:00:00+07:00',
    actor: 'bot',
    action: 'ลดงบประมาณ 30%',
    details: 'CPA ของแคมเปญ "Awareness หน้าร้าน" เกิน 100 บาทต่อ result ระบบลดงบอัตโนมัติตามกฎ Rule-003',
    accountId: 'act_demo_test',
    campaignId: 'cmp-003',
    status: 'warning',
  },
  {
    id: 'log-007',
    timestamp: '2026-04-11T10:30:00+07:00',
    actor: 'user',
    action: 'เพิ่มแคมเปญใหม่',
    details: 'สร้างแคมเปญ "Retargeting — ลูกค้าเก่า ส่วนลด15%" สำหรับ custom audience ลูกค้าที่เคยซื้อใน 30 วันที่ผ่านมา',
    accountId: 'acc-003',
    campaignId: 'cmp-007',
    status: 'success',
  },
  {
    id: 'log-008',
    timestamp: '2026-04-11T09:00:00+07:00',
    actor: 'ai',
    action: 'AI ตรวจพบ anomaly',
    details: 'ค่า CPM พุ่งสูง 40% เมื่อคืน ช่วงเวลา 22:00-02:00 น. แนะนำปิด dayparting ในช่วงดึกเพื่อประหยัดงบ',
    accountId: 'acc-002',
    campaignId: 'cmp-004',
    status: 'warning',
  },
  {
    id: 'log-009',
    timestamp: '2026-04-10T16:45:00+07:00',
    actor: 'bot',
    action: 'เพิ่มงบประมาณ 50%',
    details: 'ROAS ของแคมเปญ "Retargeting" สูงกว่า 6x ต่อเนื่อง ระบบเพิ่มงบอัตโนมัติตามกฎ Rule-004 จาก 10,000 เป็น 15,000 บาท',
    accountId: 'acc-003',
    campaignId: 'cmp-007',
    status: 'success',
  },
  {
    id: 'log-010',
    timestamp: '2026-04-10T09:00:00+07:00',
    actor: 'user',
    action: 'ปิดกฎ Scale อัตโนมัติ',
    details: 'ผู้ดูแลระบบปิด Rule-005 "ค่าใช้จ่ายเกิน 95% → แจ้งเตือน" ชั่วคราว เนื่องจากอยู่ระหว่างทดสอบงบใหม่',
    accountId: 'acc-003',
    status: 'success',
  },
  {
    id: 'log-011',
    timestamp: '2026-04-09T14:00:00+07:00',
    actor: 'ai',
    action: 'AI แนะนำ creative ใหม่',
    details: 'วิเคราะห์ 6 creatives พบว่า format video มี CTR สูงกว่า image ถึง 1.8 เท่า แนะนำเพิ่มสัดส่วน video ads เป็น 70%',
    accountId: 'act_demo_test',
    campaignId: 'cmp-001',
    status: 'success',
  },
  {
    id: 'log-012',
    timestamp: '2026-04-08T11:00:00+07:00',
    actor: 'bot',
    action: 'ปิดแคมเปญเมื่อครบงบ',
    details: 'แคมเปญ "เคลียร์สต็อก!" ใช้งบครบ 9,980 บาท จากที่ตั้งไว้ 10,000 บาท ระบบปิดแคมเปญอัตโนมัติ สรุป ROAS สุดท้าย 7.9x',
    accountId: 'acc-003',
    campaignId: 'cmp-008',
    status: 'success',
  },
];

// ─── 5. CREATIVE ANALYTICS ────────────────────────────────────

export const CREATIVE_ANALYTICS: CreativeAnalytics[] = [
  {
    id: 'crt-001',
    campaignId: 'cmp-001',
    hookText: 'ลด 50% วันนี้เท่านั้น! ผิวสวยใสใน 7 วัน',
    format: 'video',
    impressions: 180000,
    clicks: 6480,
    ctr: 3.6,
    conversionRate: 5.2,
    spend: 8500,
    aiScore: 9,
    aiSuggestion: 'Hook นี้ดีมาก! แนะนำทำ A/B test กับ version ที่เพิ่ม social proof เช่น "ลูกค้า 10,000 คนเลือกใช้"',
  },
  {
    id: 'crt-002',
    campaignId: 'cmp-001',
    hookText: 'เปลี่ยนผิวหน้าได้ใน 1 เดือน — ก่อนและหลัง',
    format: 'carousel',
    impressions: 220000,
    clicks: 5500,
    ctr: 2.5,
    conversionRate: 3.8,
    spend: 9200,
    aiScore: 7,
    aiSuggestion: 'ภาพ Before/After ได้ผลดี แต่ควรเพิ่มรีวิวจากลูกค้าจริงเพื่อเพิ่มความน่าเชื่อถือ',
  },
  {
    id: 'crt-003',
    campaignId: 'cmp-004',
    hookText: 'กาแฟดีราคา 39 บาท ดื่มได้ทุกวัน',
    format: 'image',
    impressions: 95000,
    clicks: 3800,
    ctr: 4.0,
    conversionRate: 14.0,
    spend: 4500,
    aiScore: 8,
    aiSuggestion: 'CTR ดีมาก! ราคาที่ชัดเจนใน hook ช่วยได้มาก แนะนำเพิ่ม urgency เช่น "วันนี้เท่านั้น" หรือ countdown timer',
  },
  {
    id: 'crt-004',
    campaignId: 'cmp-006',
    hookText: 'เสื้อลินิน เย็นสบาย ใส่ได้ทุกที่ — ชิคมาก!',
    format: 'video',
    impressions: 260000,
    clicks: 9100,
    ctr: 3.5,
    conversionRate: 4.6,
    spend: 13000,
    aiScore: 8,
    aiSuggestion: 'Video ที่โชว์ texture ของผ้าได้ดีมาก แนะนำเพิ่มฉากสวมใส่จริงในสถานที่ต่างๆ เพื่อให้ลูกค้าจินตนาการได้',
  },
  {
    id: 'crt-005',
    campaignId: 'cmp-007',
    hookText: 'ลูกค้าเก่ารับสิทธิ์พิเศษ! ส่วนลด 15% ทันที',
    format: 'image',
    impressions: 72000,
    clicks: 3240,
    ctr: 4.5,
    conversionRate: 9.2,
    spend: 5800,
    aiScore: 9,
    aiSuggestion: 'Personalization ทำงานได้ดีมากกับ retargeting audience แนะนำทดลองเพิ่ม dynamic creative ที่ใส่ชื่อสินค้าที่ดูล่าสุด',
  },
  {
    id: 'crt-006',
    campaignId: 'cmp-002',
    hookText: 'หน้าใสใน 14 วัน จริงหรือเปล่า? ลองดูสิ!',
    format: 'video',
    impressions: 150000,
    clicks: 3000,
    ctr: 2.0,
    conversionRate: 3.1,
    spend: 7200,
    aiScore: 5,
    aiSuggestion: 'Hook แบบตั้งคำถามให้ผลน้อยกว่าที่ควร ลองเปลี่ยนเป็น statement ที่มั่นใจกว่า เช่น "พิสูจน์แล้ว! 14 วันผิวเปลี่ยน" และเพิ่ม CTA ที่ชัดเจน',
  },
];

// ─── 6. TEAM MEMBERS ──────────────────────────────────────────

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'usr-001',
    name: 'สมชาย วงศ์พาณิช',
    role: 'admin',
    email: 'somchai@adbot.ai',
    lastActive: '2026-04-13T09:30:00+07:00',
    status: 'online',
  },
  {
    id: 'usr-002',
    name: 'นภัสสร ใจดี',
    role: 'manager',
    email: 'naphatson@adbot.ai',
    lastActive: '2026-04-13T08:45:00+07:00',
    status: 'online',
  },
  {
    id: 'usr-003',
    name: 'กิตติพงษ์ สุขสมบูรณ์',
    role: 'manager',
    email: 'kittipong@adbot.ai',
    lastActive: '2026-04-12T17:00:00+07:00',
    status: 'offline',
  },
  {
    id: 'usr-004',
    name: 'พิมพ์ชนก แสงทอง',
    role: 'viewer',
    email: 'pimchanok@adbot.ai',
    lastActive: '2026-04-13T07:15:00+07:00',
    status: 'online',
  },
];

// ─── 7. AI RECOMMENDATIONS ────────────────────────────────────

export const AI_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: 'rec-001',
    type: 'warning',
    title: 'Creative Fatigue — โฆษณาเริ่มเบื่อ',
    description: 'แคมเปญ "โปรซัมเมอร์" ใช้ creative เดิมมา 12 วัน Frequency เฉลี่ย 4.2 ครั้ง/คน ซึ่งสูงเกินไป CTR มีแนวโน้มลดลง 15% ใน 3 วันที่ผ่านมา ควรเปลี่ยน creative ก่อนสิ้นสัปดาห์',
    impact: 'high',
    campaignId: 'cmp-001',
  },
  {
    id: 'rec-002',
    type: 'opportunity',
    title: 'Scale แคมเปญคาเฟ่ได้อีก — ROAS สูงมาก',
    description: 'แคมเปญ "กาแฟ39บาท" มี ROAS อยู่ที่ 7.2x ซึ่งสูงกว่า threshold 6x ที่ตั้งไว้ หาก scale งบเพิ่มอีก 30% คาดว่าจะได้ result เพิ่ม 200-250 ต่อวัน โดยยัง ROAS ไม่ต่ำกว่า 5x',
    impact: 'high',
    campaignId: 'cmp-004',
  },
  {
    id: 'rec-003',
    type: 'insight',
    title: 'ช่วงเวลา 12:00-14:00 น. ให้ผลดีที่สุด',
    description: 'วิเคราะห์ข้อมูล 30 วันพบว่าทุกแคมเปญในบัญชี "เสื้อผ้าชิคๆ Fashion" มี conversion rate สูงสุดช่วงเที่ยง แนะนำเพิ่มสัดส่วน budget allocation ให้ช่วงเวลานี้ 40% ของงบรายวัน',
    impact: 'medium',
  },
  {
    id: 'rec-004',
    type: 'opportunity',
    title: 'Lookalike Audience จากลูกค้า Retargeting',
    description: 'กลุ่มลูกค้าที่ convert จากแคมเปญ Retargeting มี profile ที่ชัดเจน แนะนำสร้าง Lookalike 1-3% จาก audience นี้เพื่อขยายฐานลูกค้าใหม่ที่มีคุณภาพสูง คาดว่า CPA จะอยู่ที่ 45-55 บาท',
    impact: 'medium',
    campaignId: 'cmp-007',
  },
  {
    id: 'rec-005',
    type: 'warning',
    title: 'งบ "ร้านสวยปัง" ใกล้หมด — วางแผนเติมงบ',
    description: 'อัตราการใช้จ่ายปัจจุบันอยู่ที่ประมาณ 3,500 บาท/วัน งบที่เหลือ 32,550 บาท จะหมดภายใน 9 วัน หากต้องการรักษา momentum ที่ดีอยู่ ควรวางแผนเติมงบก่อนสิ้นเดือนเมษายน',
    impact: 'medium',
  },
];
