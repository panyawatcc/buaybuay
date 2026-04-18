import type { LucideIcon } from 'lucide-react';
import { RefreshCw, ShoppingCart, Database, Flame, Repeat } from 'lucide-react';

export type FeatureSlug = 'copywriter' | 'retargeting' | 'crm' | 'trends' | 'ltv';
export type FeatureStatus = 'active' | 'learning' | 'coming_soon' | 'paused';

export interface FeatureWorkflowStep {
  title: string;
  detail: string;
}

export interface FeatureBullet {
  emoji: string;
  text: string;
}

export interface FeatureDef {
  slug: FeatureSlug;
  name: string;
  subtitle: string;
  metric: string;
  nameEn: string;
  icon: LucideIcon;
  accent: 'violet' | 'emerald' | 'amber' | 'sky' | 'rose' | 'cyan';
  status: FeatureStatus;
  heroTitle: string;
  heroSubtitle: string;
  overview: string;
  workflow: FeatureWorkflowStep[];
  bullets: FeatureBullet[];
}

export const FEATURES: FeatureDef[] = [
  {
    slug: 'copywriter',
    name: 'ชุบชีวิตแอด',
    subtitle: 'AI เขียนใหม่ ทันทีที่แอดแผ่ว',
    metric: 'แอดเก่า → 3-5 variants ใน 30 วิ',
    nameEn: 'AI Copywriter & Creative Refresher',
    icon: RefreshCw,
    accent: 'violet',
    status: 'active',
    heroTitle: 'ชุบชีวิตแอดที่กำลังจะตาย',
    heroSubtitle: 'AI อ่านผลแอด เห็นก่อนว่าเริ่มแผ่ว — แล้วเขียนใหม่ให้ทันที',
    overview:
      'ทุกแอดมีอายุ — พอคนเห็นซ้ำเยอะ ๆ CTR ก็ตก CPM ก็พุ่ง ยอดก็ดรอป ระบบจะคอยตรวจจับ "อาการเหนื่อย" ของแอดแบบ real-time แล้วใช้ AI เขียนคำโฆษณาใหม่ 3-5 แบบทันที พร้อมสร้างแอดใหม่แบบอัตโนมัติ คุณแค่นั่งดูผลลัพธ์เปรียบเทียบแล้วเลือกตัวที่ดีที่สุด',
    workflow: [
      { title: 'ตรวจจับอาการเหนื่อย', detail: 'ระบบเช็ค CTR, frequency, CPM เทียบ baseline' },
      { title: 'AI เขียนใหม่', detail: 'LLM สร้าง variants 3-5 แบบ ตาม tone เดิมหรือทดลองใหม่' },
      { title: 'ยิงแอดใหม่อัตโนมัติ', detail: 'deploy พร้อม A/B test กับตัวเก่า' },
    ],
    bullets: [
      { emoji: '⚡', text: 'Fatigue detection แบบ real-time (ไม่ต้องนั่งเช็คเอง)' },
      { emoji: '✍️', text: 'Generate variants 3-5 แบบต่อครั้ง ใน < 30 วินาที' },
      { emoji: '🎯', text: 'ปรับ tone ได้ — ขายตรง / เล่าเรื่อง / emotional / educational' },
      { emoji: '🔄', text: 'A/B test อัตโนมัติ — รู้ตัวชนะภายใน 48 ชม.' },
      { emoji: '📊', text: 'Dashboard เปรียบเทียบ variant เก่า-ใหม่ ชัดเจน' },
    ],
  },
  {
    slug: 'retargeting',
    name: 'ตามหลอนรู้ใจ',
    subtitle: 'ตะกร้าทิ้ง ดึงกลับได้',
    metric: '24 ชม. → custom audience + ลด 10%',
    nameEn: 'Smart Retargeting & Cart Abandonment',
    icon: ShoppingCart,
    accent: 'emerald',
    status: 'active',
    heroTitle: 'ตามหลอนแบบรู้ใจ ไม่ใช่รบกวน',
    heroSubtitle: 'ลูกค้าทิ้งตะกร้า ไม่ได้แปลว่าไม่อยากซื้อ — แค่ยังไม่พร้อม',
    overview:
      '70% ของคนที่ทิ้งตะกร้ากลับมาซื้อได้ ถ้าเราจังหวะถูก ระบบจะจับพฤติกรรมลูกค้าที่ทิ้งตะกร้าภายใน 24 ชั่วโมง สร้าง custom audience อัตโนมัติบน Facebook/Google แล้วยิง retargeting ad พร้อมส่วนลด 10% เพื่อปิดการขาย ไม่ใช่แค่ตามหลอนมั่ว แต่ตามแบบเข้าใจว่าลูกค้าดูอะไร สนใจอะไร และควรเสนออะไร',
    workflow: [
      { title: 'จับ abandonment', detail: 'track ตะกร้า + browsing ภายใน 24 ชม.' },
      { title: 'สร้าง custom audience', detail: 'sync ไป Facebook/Google อัตโนมัติ' },
      { title: 'ยิง retargeting + ลด 10%', detail: 'caption ปรับตามสินค้าที่ลูกค้าดู' },
    ],
    bullets: [
      { emoji: '🛒', text: 'Track cart abandonment ทุก platform (Shopee/Lazada/website)' },
      { emoji: '🎯', text: 'Custom audience sync อัตโนมัติ Facebook + Google Ads' },
      { emoji: '💸', text: 'Dynamic discount — 5/10/15% ตาม value ของตะกร้า' },
      { emoji: '⏰', text: 'Send timing optimization — ยิงตอนลูกค้า active จริง' },
      { emoji: '📈', text: 'Recovery rate dashboard — รู้ว่ากู้คืนได้กี่ %' },
    ],
  },
  {
    slug: 'crm',
    name: 'ยอดโอนจริง',
    subtitle: 'รู้ลูกค้าจริงทุกคน',
    metric: 'Kaojao + Page365 → CAPI sync อัตโนมัติ',
    nameEn: 'CRM & Offline Conversion Optimizer',
    icon: Database,
    accent: 'sky',
    status: 'learning',
    heroTitle: 'ยอดโอนจริง ไม่ใช่ยอดปลอม',
    heroSubtitle: 'Facebook รู้แค่คนคลิก — แต่คุณรู้ว่าใครโอนเงินจริง',
    overview:
      'ปัญหาคือ Facebook/Google ไม่รู้ว่าใครโอนเงินจริง เห็นแค่คนคลิก หรือส่งข้อความ ระบบจะเชื่อม Kaojao, Page365, FlowAccount อัตโนมัติ ดึงข้อมูลยอดโอนจริงส่งเข้า Conversion API (CAPI) ทำให้ AI ของ Facebook เรียนรู้ว่าโฆษณาไหนได้ลูกค้าจริง ไม่ใช่แค่คนคลิกเล่น ผลลัพธ์คือต้นทุนต่อ order ลดลงชัดเจนภายใน 2 สัปดาห์',
    workflow: [
      { title: 'เชื่อม CRM', detail: 'Kaojao / Page365 / FlowAccount ใน 1 คลิก' },
      { title: 'Sync ไป CAPI', detail: 'ยอดโอนจริงถูกส่งกลับ Facebook/Google' },
      { title: 'AI เรียนรู้', detail: 'optimize ไปหาคนที่โอนจริง ไม่ใช่แค่คลิก' },
    ],
    bullets: [
      { emoji: '🔌', text: 'Integration พร้อม — Kaojao / Page365 / FlowAccount' },
      { emoji: '📡', text: 'Conversion API sync อัตโนมัติ (ไม่ต้องเซ็ต pixel เอง)' },
      { emoji: '🎯', text: 'แยก "คลิก" vs "โอนจริง" ชัดเจน' },
      { emoji: '💰', text: 'ต้นทุนต่อ order ลดลงเฉลี่ย 30-40% ภายใน 14 วัน' },
      { emoji: '📊', text: 'Report รายวัน — ROAS จากยอดโอนจริง ไม่ใช่แค่คลิก' },
    ],
  },
  {
    slug: 'trends',
    name: 'เกาะกระแส',
    subtitle: 'จับ viral ก่อนใคร',
    metric: 'X + TikTok → alert + caption พร้อมยิง',
    nameEn: 'Cross-Platform Trend Injector',
    icon: Flame,
    accent: 'amber',
    status: 'active',
    heroTitle: 'เกาะกระแสโซเชียล ก่อนคู่แข่งรู้ตัว',
    heroSubtitle: 'X กับ TikTok กำลังพูดเรื่องอะไร — แล้วคุณจะใช้มันยังไงให้ทัน',
    overview:
      'เทรนด์โซเชียลเปลี่ยนเป็นชั่วโมง ไม่ใช่เป็นวัน ระบบจะ scan X และ TikTok ต่อเนื่อง จับ viral keywords + hashtags + meme ที่กำลังมาแรง แจ้งเตือนคุณทันที พร้อม suggest caption + ad set ที่เกาะกระแสได้ทันที ไม่ต้องรอให้กระแสเริ่มดับค่อยเขียน ไม่ต้องนั่ง scroll เอง — ระบบทำแทนคุณ 24/7',
    workflow: [
      { title: 'Scan โซเชียลต่อเนื่อง', detail: 'X + TikTok trending ทุก 15 นาที' },
      { title: 'Alert พร้อม context', detail: 'บอกว่ากระแสนี้เริ่มจากไหน ใครเล่น เทรนด์กี่ชม.' },
      { title: 'Suggest caption + ad set', detail: 'พร้อม deploy ทันที' },
    ],
    bullets: [
      { emoji: '🔥', text: 'Trend detection real-time (X + TikTok + อนาคต IG Reels)' },
      { emoji: '🔔', text: 'Alert ส่งเข้า LINE / Slack / Email' },
      { emoji: '✍️', text: 'Auto-generate caption ที่เกาะกระแส (ไม่ cringe)' },
      { emoji: '🎬', text: 'Suggest ad creative format (video/carousel/static)' },
      { emoji: '📊', text: 'Trend lifespan predictor — บอกว่ากระแสจะอยู่อีกกี่ชม.' },
    ],
  },
  {
    slug: 'ltv',
    name: 'ขายซ้ำรู้ใจ',
    subtitle: 'จับจังหวะลูกค้ากลับมา',
    metric: '25 วัน → auto upsell ทันเวลา',
    nameEn: 'LTV Upsell Predictor',
    icon: Repeat,
    accent: 'rose',
    status: 'learning',
    heroTitle: 'ขายซ้ำแบบรู้จังหวะ ไม่ใช่ยิงมั่ว',
    heroSubtitle: 'ลูกค้าเก่ามี pattern — รู้วันที่จะกลับมา = ปิดการขายได้ทุกครั้ง',
    overview:
      'ลูกค้าเก่าซื้อง่ายกว่าลูกค้าใหม่ 5 เท่า แต่ต้องรู้จังหวะ ระบบจะ analyze purchase cycle ของลูกค้าแต่ละคน เจอว่าเฉลี่ยซื้อซ้ำทุก 25 วัน (หรือกี่วันแล้วแต่ธุรกิจ) แล้วยิง upsell campaign อัตโนมัติก่อนถึงเวลานั้น 3-5 วัน ทำให้ลูกค้ากลับมาซื้อก่อนที่จะไปเจอคู่แข่ง ไม่ต้อง guess ไม่ต้องคิดเอง ระบบเรียนรู้จากพฤติกรรมจริง',
    workflow: [
      { title: 'Analyze purchase cycle', detail: 'หาวงจรซื้อซ้ำของลูกค้าแต่ละคน' },
      { title: 'Predict timing', detail: 'บอกวันที่ลูกค้าจะกลับมา ± 3 วัน' },
      { title: 'Auto upsell campaign', detail: 'ยิงก่อนถึงเวลา พร้อมข้อเสนอเฉพาะคน' },
    ],
    bullets: [
      { emoji: '🔁', text: 'Purchase cycle analysis per customer (ไม่ใช่ค่าเฉลี่ยแบบ static)' },
      { emoji: '📅', text: 'Timing prediction แม่นยำ ± 3 วัน' },
      { emoji: '💎', text: 'Segment lifetime value — รู้ว่าลูกค้าคนไหนคุ้มค่าสุด' },
      { emoji: '🎁', text: 'Auto upsell / cross-sell offer ตาม profile' },
      { emoji: '📈', text: 'Repeat rate dashboard — ติดตามว่าลูกค้าเก่ากลับมากี่ %' },
    ],
  },
];

export const FEATURE_BY_SLUG: Record<FeatureSlug, FeatureDef> = FEATURES.reduce(
  (acc, f) => ({ ...acc, [f.slug]: f }),
  {} as Record<FeatureSlug, FeatureDef>
);

export const STATUS_LABEL: Record<FeatureStatus, string> = {
  active: 'เปิดอยู่',
  learning: 'กำลังเรียนรู้',
  coming_soon: 'เร็ว ๆ นี้',
  paused: 'หยุด',
};

export const ACCENT_CLASSES: Record<
  FeatureDef['accent'],
  { bg: string; icon: string; ring: string; text: string; statusBg: string; statusText: string }
> = {
  violet: {
    bg: 'bg-gradient-to-br from-violet-500/15 to-violet-600/5',
    icon: 'bg-violet-500/20 text-violet-200',
    ring: 'ring-violet-500/30',
    text: 'text-violet-200',
    statusBg: 'bg-violet-500/20',
    statusText: 'text-violet-200',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/5',
    icon: 'bg-emerald-500/20 text-emerald-200',
    ring: 'ring-emerald-500/30',
    text: 'text-emerald-200',
    statusBg: 'bg-emerald-500/20',
    statusText: 'text-emerald-200',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500/15 to-amber-600/5',
    icon: 'bg-amber-500/20 text-amber-200',
    ring: 'ring-amber-500/30',
    text: 'text-amber-200',
    statusBg: 'bg-amber-500/20',
    statusText: 'text-amber-200',
  },
  sky: {
    bg: 'bg-gradient-to-br from-sky-500/15 to-sky-600/5',
    icon: 'bg-sky-500/20 text-sky-200',
    ring: 'ring-sky-500/30',
    text: 'text-sky-200',
    statusBg: 'bg-sky-500/20',
    statusText: 'text-sky-200',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-500/15 to-rose-600/5',
    icon: 'bg-rose-500/20 text-rose-200',
    ring: 'ring-rose-500/30',
    text: 'text-rose-200',
    statusBg: 'bg-rose-500/20',
    statusText: 'text-rose-200',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-500/15 to-teal-500/5',
    icon: 'bg-cyan-500/20 text-cyan-200',
    ring: 'ring-cyan-500/30',
    text: 'text-cyan-200',
    statusBg: 'bg-cyan-500/20',
    statusText: 'text-cyan-200',
  },
};
