import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Rocket,
  Search,
  Users,
  Target,
  Wallet,
  Check,
  PenSquare,
  X,
  Plus,
} from 'lucide-react';
import {
  usePostBooster,
  REGION_OPTIONS,
  type PostSummary,
  type TargetingSuggestion,
  formatCompact,
} from '../hooks/usePostBooster';
import { useToast } from '../components/Toast';

const STEPS = [
  { n: 1, label: 'เลือกเพจ', icon: Users },
  { n: 2, label: 'Keyword', icon: Search },
  { n: 3, label: 'เลือกโพสต์', icon: Check },
  { n: 4, label: 'Targeting', icon: Target },
  { n: 5, label: 'งบ & ระยะเวลา', icon: Wallet },
  { n: 6, label: 'ยืนยัน', icon: Rocket },
  { n: 7, label: 'Live status', icon: Rocket },
];

const DATE_RANGES = [
  { id: '7d', label: '7 วัน' },
  { id: '30d', label: '30 วัน' },
  { id: '90d', label: '90 วัน' },
  { id: 'custom', label: 'กำหนดเอง' },
];
const MIN_ENGAGEMENT = [
  { id: 0, label: 'ทั้งหมด' },
  { id: 50, label: '50+' },
  { id: 100, label: '100+' },
  { id: 500, label: '500+' },
];
const POST_TYPES = [
  { id: 'photo', label: '📷 ภาพ' },
  { id: 'video', label: '🎬 วิดีโอ' },
  { id: 'text', label: '📝 ข้อความ' },
  { id: 'carousel', label: '🖼 Carousel' },
  { id: 'reels', label: '⚡ Reels' },
];
const DURATIONS = [3, 7, 14, 30];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
      {STEPS.map((s) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <div
            key={s.n}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap ${
              active
                ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                : done
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-surface-light text-text-muted'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                active ? 'bg-cyan-500 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-surface-lighter'
              }`}
            >
              {done ? '✓' : s.n}
            </span>
            <span className="font-medium">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AiManagedPostBooster() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pages, loading, searchPosts, suggestTargeting, estimateReach, launch, mockMode } =
    usePostBooster();

  const [step, setStep] = useState(1);
  const [pageId, setPageId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [minEng, setMinEng] = useState<number>(100);
  const [postTypes, setPostTypes] = useState<string[]>(['photo', 'video']);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [searchingPosts, setSearchingPosts] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  const [targeting, setTargeting] = useState<TargetingSuggestion>({
    regions: ['TH-central', 'TH-north'],
    age_min: 22,
    age_max: 45,
    gender: 'all',
    interests: ['เสื้อผ้าผู้หญิง', 'แฟชั่น summer', 'ช้อปปิ้งออนไลน์'],
    estimated_reach: { min: 0, max: 0 },
  });
  const [newInterest, setNewInterest] = useState('');

  const [dailyBudget, setDailyBudget] = useState(500);
  const [duration, setDuration] = useState(7);

  const [useCopywriter, setUseCopywriter] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Select default page when loaded
  useEffect(() => {
    if (!pageId && pages.length > 0) setPageId(pages[0].id);
  }, [pages, pageId]);

  // Run search when entering step 2 or when filters change (debounced)
  useEffect(() => {
    if (!pageId) return;
    if (step < 2) return;
    let cancelled = false;
    setSearchingPosts(true);
    const t = setTimeout(async () => {
      const found = await searchPosts(pageId, keyword);
      if (!cancelled) {
        const filtered = found
          .filter((p) => postTypes.includes(p.type))
          .filter((p) => p.engagement.total >= minEng)
          .filter((p) => {
            const maxDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
            return p.age_days <= maxDays;
          });
        setPosts(filtered);
        setSearchingPosts(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pageId, keyword, dateRange, minEng, postTypes, step, searchPosts]);

  // Prefill targeting when entering step 4
  useEffect(() => {
    if (step !== 4 || selectedPosts.length === 0) return;
    let cancelled = false;
    (async () => {
      const s = await suggestTargeting(selectedPosts);
      if (!cancelled) setTargeting(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, selectedPosts, suggestTargeting]);

  // Re-estimate reach whenever targeting changes (step 4)
  useEffect(() => {
    if (step !== 4) return;
    let cancelled = false;
    (async () => {
      const r = await estimateReach({
        regions: targeting.regions,
        age_min: targeting.age_min,
        age_max: targeting.age_max,
        gender: targeting.gender,
        interests: targeting.interests,
      });
      if (!cancelled) setTargeting((prev) => ({ ...prev, estimated_reach: r }));
    })();
    return () => {
      cancelled = true;
    };
  }, [step, targeting.regions, targeting.age_min, targeting.age_max, targeting.gender, targeting.interests, estimateReach]);

  const selectedPage = pages.find((p) => p.id === pageId) || null;
  const selectedPostObjs = useMemo(
    () => posts.filter((p) => selectedPosts.includes(p.post_id)),
    [posts, selectedPosts]
  );
  const totalBudget = selectedPosts.length * dailyBudget * duration;

  const canProceed = (() => {
    if (step === 1) return !!pageId;
    if (step === 2) return true;
    if (step === 3) return selectedPosts.length >= 1 && selectedPosts.length <= 5;
    if (step === 4) return targeting.regions.length >= 1 && targeting.age_max > targeting.age_min;
    if (step === 5) return dailyBudget >= 100 && DURATIONS.includes(duration);
    return true;
  })();

  const togglePostType = (id: string) => {
    setPostTypes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const togglePost = (id: string) => {
    setSelectedPosts((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) {
        toast('เลือกได้สูงสุด 5 โพสต์', 'warning');
        return prev;
      }
      return [...prev, id];
    });
  };
  const toggleRegion = (id: string) => {
    setTargeting((t) => ({
      ...t,
      regions: t.regions.includes(id) ? t.regions.filter((x) => x !== id) : [...t.regions, id],
    }));
  };
  const removeInterest = (i: string) =>
    setTargeting((t) => ({ ...t, interests: t.interests.filter((x) => x !== i) }));
  const addInterest = () => {
    if (!newInterest.trim()) return;
    setTargeting((t) => ({ ...t, interests: [...t.interests, newInterest.trim()] }));
    setNewInterest('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await launch({
        page_id: pageId,
        keyword,
        filters: { date_range: dateRange, min_engagement: minEng, post_types: postTypes },
        selected_post_ids: selectedPosts,
        targeting: {
          regions: targeting.regions,
          age_min: targeting.age_min,
          age_max: targeting.age_max,
          gender: targeting.gender,
          interests: targeting.interests,
        },
        budget_per_day: dailyBudget,
        duration_days: duration,
        copywriter_enabled: useCopywriter,
      });
      toast(`เริ่ม boost ${selectedPosts.length} โพสต์แล้ว`, 'success');
      setStep(7);
    } catch {
      toast('launch ไม่สำเร็จ ลองใหม่', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto py-16 text-center text-sm text-text-muted">
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-1 pb-3 flex items-center gap-2">
        <Link to="/" className="p-2 -ml-1 rounded-full hover:bg-surface-light transition" aria-label="back">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-200">
          <Rocket className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold leading-tight">ดันโพสต์อัตโนมัติ</h1>
          <p className="text-[10px] text-text-muted">Auto Post Booster</p>
        </div>
        <Link
          to="/ad-launcher/live"
          className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
        >
          Live Status →
        </Link>
      </div>

      {mockMode && (
        <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-1 mb-3">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200 text-center">
            🧪 Mock mode — /api/ai/post-booster/* ยังไม่มี · UI ทำงานด้วย mock data
          </div>
        </div>
      )}

      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-1 mb-4">
        <StepIndicator step={step} />
      </div>

      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto space-y-4">
        {/* STEP 1 — Page */}
        {step === 1 && (
          <div className="rounded-2xl bg-surface border border-surface-lighter p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-bold">เลือกเพจ Facebook</h2>
            <p className="text-xs text-text-muted">AI จะสแกนโพสต์จากเพจนี้</p>
            <div className="space-y-2">
              {pages.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                    pageId === p.id
                      ? 'bg-cyan-500/15 ring-1 ring-cyan-500/40'
                      : 'bg-surface-light hover:bg-surface-lighter'
                  }`}
                >
                  <input
                    type="radio"
                    name="page"
                    checked={pageId === p.id}
                    onChange={() => setPageId(p.id)}
                    className="accent-cyan-500"
                  />
                  <span className="text-2xl">{p.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-text-muted">
                      {formatCompact(p.followers)} followers · {p.posts_90d} posts (90d)
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Keyword + filters */}
        {step === 2 && (
          <div className="rounded-2xl bg-surface border border-surface-lighter p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-bold">ค้นด้วย keyword + filter</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="เช่น รีวิว / โปรโมชั่น / เว้นว่าง = ทุกโพสต์"
                className="w-full bg-surface-light border border-surface-lighter rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">วันที่</label>
              <div className="flex flex-wrap gap-1.5">
                {DATE_RANGES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDateRange(d.id)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      dateRange === d.id
                        ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                        : 'bg-surface-light text-text-muted'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Engagement ขั้นต่ำ</label>
              <div className="flex flex-wrap gap-1.5">
                {MIN_ENGAGEMENT.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMinEng(m.id)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      minEng === m.id
                        ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                        : 'bg-surface-light text-text-muted'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">ประเภทโพสต์</label>
              <div className="flex flex-wrap gap-1.5">
                {POST_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => togglePostType(t.id)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      postTypes.includes(t.id)
                        ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                        : 'bg-surface-light text-text-muted'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-surface-light/50 px-3 py-2 text-[11px] text-text-muted">
              {searchingPosts ? 'กำลังค้นหา...' : `เจอ ${posts.length} โพสต์ที่ตรง filter`}
            </div>
          </div>
        )}

        {/* STEP 3 — Post preview */}
        {step === 3 && (
          <div className="rounded-2xl bg-surface border border-surface-lighter p-4 md:p-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold">เลือกโพสต์ที่อยากดัน</h2>
              <span className="text-[11px] text-text-muted">
                เลือก {selectedPosts.length} / 5 · เจอ {posts.length} โพสต์
              </span>
            </div>
            {posts.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                ไม่พบโพสต์ที่ตรง filter — ย้อนไปปรับ keyword หรือ filter ที่ step 2
              </p>
            ) : (
              <ul className="space-y-2 max-h-[480px] overflow-y-auto">
                {posts.map((p) => {
                  const on = selectedPosts.includes(p.post_id);
                  return (
                    <li key={p.post_id}>
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition ${
                          on ? 'bg-cyan-500/10 ring-1 ring-cyan-500/40' : 'bg-surface-light hover:bg-surface-lighter'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => togglePost(p.post_id)}
                          className="accent-cyan-500 mt-1"
                        />
                        <span className="text-2xl shrink-0">{p.thumb_emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug line-clamp-2">{p.message}</p>
                          <div className="flex items-center gap-3 text-[11px] text-text-muted mt-1">
                            <span>{p.age_days} วันที่แล้ว</span>
                            <span>❤ {p.engagement.likes}</span>
                            <span>💬 {p.engagement.comments}</span>
                            <span>↗ {p.engagement.shares}</span>
                          </div>
                          {p.ai_badge && (
                            <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200">
                              {p.ai_badge}
                            </span>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* STEP 4 — Targeting */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface border border-surface-lighter p-4 md:p-5 space-y-4">
              <h2 className="text-sm font-bold">AI แนะ Targeting</h2>
              <p className="text-xs text-text-muted">ปรับได้ตามต้องการ reach จะคำนวณใหม่ทันที</p>

              <div>
                <label className="block text-xs text-text-muted mb-2">ภูมิภาค (เลือกหลายข้อได้)</label>
                <div className="grid grid-cols-2 gap-2">
                  {REGION_OPTIONS.map((r) => {
                    const on = targeting.regions.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition ${
                          on ? 'bg-cyan-500/15 ring-1 ring-cyan-500/40' : 'bg-surface-light hover:bg-surface-lighter'
                        }`}
                      >
                        <input type="checkbox" checked={on} onChange={() => toggleRegion(r.id)} className="accent-cyan-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{r.label}</p>
                          <p className="text-[10px] text-text-muted">{r.sub}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-xs text-text-muted">อายุ</label>
                  <span className="text-sm font-semibold text-cyan-200 tabular-nums">
                    {targeting.age_min} – {targeting.age_max} ปี
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={13}
                    max={64}
                    value={targeting.age_min}
                    onChange={(e) =>
                      setTargeting((t) => ({
                        ...t,
                        age_min: Math.min(Number(e.target.value), t.age_max - 1),
                      }))
                    }
                    className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 tabular-nums"
                  />
                  <input
                    type="number"
                    min={14}
                    max={65}
                    value={targeting.age_max}
                    onChange={(e) =>
                      setTargeting((t) => ({
                        ...t,
                        age_max: Math.max(Number(e.target.value), t.age_min + 1),
                      }))
                    }
                    className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1.5">เพศ</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['all', 'male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTargeting((t) => ({ ...t, gender: g }))}
                      className={`py-2 rounded-lg text-xs font-medium ${
                        targeting.gender === g
                          ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                          : 'bg-surface-light text-text-muted'
                      }`}
                    >
                      {g === 'all' ? 'ทุกเพศ' : g === 'male' ? 'ชาย' : 'หญิง'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1.5">ความสนใจ (AI แนะนำจากโพสต์)</label>
                <div className="flex flex-wrap gap-1.5">
                  {targeting.interests.map((i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-200 text-xs"
                    >
                      {i}
                      <button
                        type="button"
                        onClick={() => removeInterest(i)}
                        className="hover:text-rose-300"
                        aria-label="remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-1 bg-surface-light rounded-full pl-1 pr-0.5 py-0.5">
                    <input
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                      placeholder="+ เพิ่ม"
                      className="bg-transparent text-xs outline-none w-24 px-2"
                    />
                    <button
                      type="button"
                      onClick={addInterest}
                      className="w-5 h-5 rounded-full bg-cyan-500/30 text-cyan-200 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-baseline justify-between">
              <div>
                <div className="text-[11px] text-emerald-200/70">ประมาณ reach</div>
                <div className="text-xs text-emerald-200/80">คำนวณจาก targeting ปัจจุบัน</div>
              </div>
              <div className="text-lg font-bold text-emerald-200 tabular-nums">
                {formatCompact(targeting.estimated_reach.min)} – {formatCompact(targeting.estimated_reach.max)}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Budget & duration */}
        {step === 5 && (
          <div className="rounded-2xl bg-surface border border-surface-lighter p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-bold">ตั้งงบและระยะเวลา</h2>
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-xs text-text-muted">งบ/วัน/โพสต์</label>
                <span className="text-lg font-bold text-cyan-200 tabular-nums">฿{dailyBudget}</span>
              </div>
              <div className="relative h-8 flex items-center">
                <div className="relative w-full">
                  <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
                  <input
                    type="range"
                    min={100}
                    max={3000}
                    step={50}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                    className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow ring-2 ring-cyan-400 pointer-events-none"
                    style={{ left: `calc(${((dailyBudget - 100) / 2900) * 100}% - 8px)` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>฿100</span><span>฿1,500</span><span>฿3,000</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">ระยะเวลา (วัน)</label>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`py-2 rounded-lg text-sm font-semibold ${
                      duration === d
                        ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40'
                        : 'bg-surface-light text-text-muted'
                    }`}
                  >
                    {d} วัน
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-surface-light/50 px-3 py-2.5 flex items-baseline justify-between">
              <div className="text-[11px] text-text-muted">
                {selectedPosts.length} โพสต์ × ฿{dailyBudget} × {duration} วัน
              </div>
              <div className="text-base font-bold text-cyan-200 tabular-nums">฿{totalBudget.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* STEP 6 — Confirm */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-rose-500/5 border border-rose-500/30 p-4 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCopywriter}
                  onChange={(e) => setUseCopywriter(e.target.checked)}
                  className="accent-rose-400 mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <PenSquare className="w-4 h-4 text-rose-300" />
                    ให้ AI Copywriter เขียน caption ใหม่
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    AI สร้าง 3 variants ต่อโพสต์ ให้เลือกก่อน boost · +฿0.04/post
                  </p>
                </div>
              </label>
            </div>

            <div className="rounded-2xl bg-surface border border-surface-lighter p-4 md:p-5 space-y-2">
              <h3 className="text-sm font-bold mb-2">สรุปการตั้งค่า</h3>
              <dl className="text-xs divide-y divide-surface-lighter">
                <Row k="เพจ" v={selectedPage?.name || '—'} />
                <Row
                  k="โพสต์"
                  v={`${selectedPosts.length} โพสต์${selectedPostObjs[0] ? ` (${selectedPostObjs[0].message.slice(0, 24)}...)` : ''}`}
                />
                <Row
                  k="เป้าหมาย"
                  v={`${targeting.regions.length} ภูมิภาค · ${targeting.age_min}-${targeting.age_max} ปี · ${targeting.interests.length} interests`}
                />
                <Row
                  k="Reach คาด"
                  v={`~${formatCompact(targeting.estimated_reach.min)} – ${formatCompact(
                    targeting.estimated_reach.max
                  )} คน`}
                />
                <Row k="งบ" v={`฿${dailyBudget}/วัน × ${duration} วัน × ${selectedPosts.length} โพสต์`} />
                <Row k="Copywriter" v={useCopywriter ? 'เปิด (+฿0.04/post)' : 'ปิด'} />
                <Row k="รวม" v={`฿${totalBudget.toLocaleString()}`} emphasis />
              </dl>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white font-bold shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
            >
              <Rocket className="w-5 h-5" />
              {submitting ? 'กำลังเริ่ม...' : `เริ่ม boost — สร้าง ${selectedPosts.length} campaigns`}
            </button>
            <p className="text-[11px] text-text-muted text-center">
              campaigns สร้างแบบ ACTIVE ทันที · หยุดได้ตลอดผ่าน Live status
            </p>
          </div>
        )}

        {/* STEP 7 — Success */}
        {step === 7 && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 p-6 text-center space-y-3">
            <div className="text-4xl">🚀</div>
            <h2 className="text-lg font-bold">เริ่ม boost แล้ว</h2>
            <p className="text-sm text-text-muted">
              campaigns {selectedPosts.length} ตัวกำลังทำงาน · ติดตาม reach / engagement / orders ได้ทันที
            </p>
            <button
              type="button"
              onClick={() => navigate('/ad-launcher/live')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/30 text-emerald-200 text-sm font-semibold hover:bg-emerald-500/40 transition"
            >
              เปิดดู Live status
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer nav */}
      {step < 7 && (
        <div className="sticky bottom-0 mt-6 pt-3 pb-4 bg-gradient-to-t from-bg via-bg to-transparent">
          <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-1 flex items-center gap-2">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="flex-1 py-3 rounded-xl bg-surface-light text-text-muted disabled:opacity-40 text-sm font-medium"
            >
              ← ย้อนกลับ
            </button>
            {step < 6 ? (
              <button
                type="button"
                disabled={!canProceed}
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 py-3 rounded-xl bg-cyan-500/30 text-cyan-100 hover:bg-cyan-500/40 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold"
              >
                ถัดไป →
              </button>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, emphasis }: { k: string; v: string; emphasis?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-2 ${emphasis ? 'pt-3' : ''}`}>
      <dt className="text-text-muted shrink-0">{k}</dt>
      <dd className={`text-right ${emphasis ? 'text-base font-bold text-cyan-200' : 'font-medium'}`}>{v}</dd>
    </div>
  );
}
