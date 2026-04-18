import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Copy,
  ExternalLink,
  Search,
  ArrowRight,
  Shield,
  LogOut,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { useOnboarding, usePortal, MOCK_PORTAL_STATE, formatBaht } from '../hooks/usePortal';
import type { PortalAdAccount } from '../hooks/usePortal';
import { useToast } from '../components/Toast';

type ViewStep = 1 | 2 | 3 | 4; // 4 = select-account

function ProgressBar({ step }: { step: ViewStep }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((n) => {
        const done = step > n;
        const active = step === n;
        return (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition ${
              done ? 'bg-emerald-400' : active ? 'bg-amber-400' : 'bg-white/20'
            }`}
          />
        );
      })}
    </div>
  );
}

function CopyableID({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast('✓ คัดลอกแล้ว', 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('คัดลอกไม่สำเร็จ — copy เองจากช่อง', 'error');
    }
  };
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-600 mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-slate-50 ring-1 ring-slate-200 px-3 py-2 rounded-lg">
        <code className="flex-1 text-sm font-mono text-slate-900 select-all truncate">{value}</code>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
        </button>
      </div>
    </div>
  );
}

function StepCard({
  num,
  title,
  state,
  children,
}: {
  num: number;
  title: string;
  state: 'done' | 'active' | 'pending';
  children: React.ReactNode;
}) {
  const ring =
    state === 'done'
      ? 'border-emerald-200 bg-white'
      : state === 'active'
      ? 'border-amber-300 bg-white ring-1 ring-amber-200'
      : 'border-slate-200 bg-slate-50/50';
  const badge =
    state === 'done'
      ? 'bg-emerald-500 text-white'
      : state === 'active'
      ? 'bg-amber-400 text-amber-900'
      : 'bg-slate-200 text-slate-500';
  return (
    <div className={`rounded-2xl border ${ring} p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${badge}`}>
          {state === 'done' ? <Check className="w-4 h-4" /> : num}
        </div>
        <h2 className="text-sm md:text-base font-bold text-slate-900">{title}</h2>
      </div>
      <div className="pl-11 text-sm text-slate-700 space-y-3">{children}</div>
    </div>
  );
}

function AdAccountRow({
  account,
  selected,
  onSelect,
}: {
  account: PortalAdAccount;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`block rounded-2xl border p-4 cursor-pointer transition ${
        selected ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-300' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          checked={selected}
          onChange={onSelect}
          className="mt-1 accent-indigo-600"
          name="primary_account"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{account.account_name}</p>
              <p className="text-[11px] font-mono text-slate-500 truncate">{account.account_id}</p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Active
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <MiniStat label="Spend / 30d" value={formatBaht(account.spend_30d)} />
            <MiniStat label="ROAS" value={`${account.roas.toFixed(1)}×`} color="text-emerald-600" />
            <MiniStat label="Active ads" value={String(account.active_ads)} />
          </div>
        </div>
      </div>
    </label>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
      <p className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold tabular-nums mt-0.5 ${color || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const { verifyAccess, verifying } = useOnboarding();
  const { state: portalState } = usePortal();

  const [step, setStep] = useState<ViewStep>(1);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState(false);
  const [accounts, setAccounts] = useState<PortalAdAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const businessId = portalState?.admin_business_id || MOCK_PORTAL_STATE.admin_business_id;
  const systemUserId = portalState?.admin_system_user_id || MOCK_PORTAL_STATE.admin_system_user_id;

  const runVerify = async () => {
    setVerifyError(false);
    try {
      const res = await verifyAccess();
      if (res.ad_accounts_count === 0) {
        setVerifyError(true);
        return;
      }
      setVerified(true);
      setAccounts(res.ad_accounts);
      setSelectedId(res.ad_accounts[0]?.id ?? null);
      toast(`เชื่อมต่อสำเร็จ — เห็น ${res.ad_accounts_count} ad accounts`, 'success');
    } catch {
      setVerifyError(true);
    }
  };

  const handleFinish = async () => {
    if (!selectedId) return;
    setSaving(true);
    // Mock — would PATCH /api/portal/ad-accounts/:id { is_primary: true } then PATCH /api/onboarding/complete
    await new Promise((r) => setTimeout(r, 500));
    toast('เริ่มใช้งานได้เลย', 'success');
    navigate('/ai-managed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-indigo-50 py-6 px-4">
      <div className="max-w-md md:max-w-3xl mx-auto space-y-5">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 md:p-7 text-white shadow-xl shadow-indigo-500/20">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider bg-white/15 backdrop-blur px-2.5 py-1 rounded-full mb-2">
                <Sparkles className="w-3 h-3" />
                เปิดบัญชีสำเร็จ
              </span>
              <h1 className="text-xl md:text-2xl font-black">เชื่อมต่อ Ad Account ของคุณ</h1>
              <p className="text-sm text-white/85 mt-1">3 ขั้นง่าย ๆ · ใช้เวลาประมาณ 3 นาที</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-full"
            >
              <LogOut className="w-3 h-3" />
              ออก
            </button>
          </div>
          <ProgressBar step={step} />
        </div>

        {step !== 4 && (
          <>
            {/* Step 1 — Mental model */}
            <StepCard
              num={1}
              title="ทำความเข้าใจวิธีเชื่อมต่อ"
              state={step > 1 ? 'done' : step === 1 ? 'active' : 'pending'}
            >
              {step === 1 && (
                <>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    เพื่อให้ AI จัดการโฆษณาให้คุณได้ เราต้องขอ access ad account ของคุณ ผ่านระบบ
                    <strong className="mx-1">Business Manager Partner</strong>ของ Facebook —
                    ไม่ใช่ login FB ของคุณ
                  </p>
                  <ul className="space-y-2 text-sm">
                    <TrustLine text="คุณเป็นเจ้าของ ad account เสมอ — เราแค่ขอสิทธิ์จัดการ ถอนได้ทุกเมื่อ" />
                    <TrustLine text="ไม่เห็นข้อมูลส่วนตัว — เห็นแค่ stats (spend / ROAS / orders)" />
                    <TrustLine text="ปลอดภัยตามมาตรฐาน FB — ไม่ใช่ password sharing" />
                  </ul>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      เตรียมให้พร้อม: คุณต้องเป็น <strong>Admin ใน Business Manager</strong>ของ ad account ที่จะเชื่อม
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition"
                  >
                    เข้าใจแล้ว ไปขั้นต่อไป
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </StepCard>

            {/* Step 2 — Copy IDs + instructions */}
            <StepCard
              num={2}
              title="เพิ่ม Cool App เป็น Partner ใน Business Manager ของคุณ"
              state={step > 2 ? 'done' : step === 2 ? 'active' : 'pending'}
            >
              {step === 2 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CopyableID label="Business Manager ID" value={businessId} />
                    <CopyableID label="System User ID" value={systemUserId} />
                  </div>

                  <ol className="space-y-3 mt-3">
                    <SubStep
                      num="A"
                      title="เปิด Business Manager"
                      desc={
                        <>
                          ไปที่{' '}
                          <a
                            href="https://business.facebook.com/settings/partners"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 font-semibold hover:underline inline-inline-flex items-center gap-0.5"
                          >
                            business.facebook.com/settings/partners
                            <ExternalLink className="inline w-3 h-3 ml-0.5 -mt-0.5" />
                          </a>
                        </>
                      }
                    />
                    <SubStep
                      num="B"
                      title="กด Add → Provide a partner with access to your assets"
                      desc="ในหน้า Partners จะมีปุ่มสีน้ำเงินด้านบน"
                    />
                    <SubStep
                      num="C"
                      title="วาง Business Manager ID ของเรา"
                      desc="Copy ช่องแรกด้านบน แล้ว paste ในช่อง Partner Business ID"
                    />
                    <SubStep
                      num="D"
                      title="เลือก ad account ที่ให้ AI จัดการ"
                      desc='ติ๊ก "Manage ad account" permission → Save'
                    />
                  </ol>

                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900">
                    💡 ถ้ามีหลาย ad account สามารถเลือกได้หลายอัน หรือเพิ่มทีหลังก็ได้
                  </div>

                  <div className="flex flex-col md:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition"
                    >
                      ทำเสร็จแล้ว ไปขั้นต่อไป
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <a
                      href="https://line.me/ti/p/@aiadmanager"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      ติดปัญหา? ติดต่อทีมเรา
                    </a>
                  </div>
                </>
              )}
            </StepCard>

            {/* Step 3 — Verify */}
            <StepCard
              num={3}
              title="ตรวจสอบการเชื่อมต่อ"
              state={verified ? 'done' : step === 3 ? 'active' : 'pending'}
            >
              {step === 3 && (
                <>
                  <p className="text-sm text-slate-700">
                    เราจะยิงไปถาม FB ว่าเห็น ad account ของคุณไหม — ปกติ FB ต้องใช้เวลา ~30 วินาทีหลังคุณกด Save
                  </p>
                  {!verified && !verifyError && (
                    <button
                      type="button"
                      onClick={runVerify}
                      disabled={verifying}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white font-bold shadow-lg shadow-indigo-200 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
                    >
                      <Search className="w-4 h-4" />
                      {verifying ? 'กำลังตรวจสอบ...' : 'ตรวจสอบการเชื่อมต่อ'}
                    </button>
                  )}

                  {verified && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                        <Check className="w-4 h-4" />
                        เชื่อมต่อสำเร็จ! เห็น {accounts.length} ad accounts
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition"
                      >
                        ไปเลือก ad account หลัก
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {verifyError && !verified && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-rose-800 font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        ยังไม่เห็น ad account — เช็ค 3 ข้อ:
                      </div>
                      <ul className="text-xs text-rose-900 space-y-1 pl-5 list-disc">
                        <li>ให้สิทธิ์ "Manage ad account" ใน Partner setup แล้ว</li>
                        <li>เลือก ad account ไว้ตอน Save</li>
                        <li>รอ ~30 วินาทีให้ FB อัปเดต แล้วกดตรวจสอบอีกครั้ง</li>
                      </ul>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={runVerify}
                          className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-semibold hover:bg-rose-200"
                        >
                          ลองตรวจสอบอีกครั้ง
                        </button>
                        <a
                          href="https://line.me/ti/p/@aiadmanager"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-indigo-600 text-xs font-semibold hover:bg-indigo-50"
                        >
                          ติดต่อทีม
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}
            </StepCard>
          </>
        )}

        {step === 4 && (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white p-5 md:p-6 shadow-lg shadow-teal-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">เชื่อมต่อแล้ว</span>
              </div>
              <h2 className="text-xl font-black">เลือก Ad Account หลัก</h2>
              <p className="text-sm text-white/90 mt-1">
                เราเข้าถึงได้ {accounts.length} บัญชี · เลือกอันที่ AI จะดูแลก่อน (เพิ่มทีหลังได้)
              </p>
            </div>

            <div className="space-y-3">
              {accounts.map((a) => (
                <AdAccountRow
                  key={a.id}
                  account={a}
                  selected={selectedId === a.id}
                  onSelect={() => setSelectedId(a.id)}
                />
              ))}

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 text-sm font-medium transition"
              >
                <Shield className="w-4 h-4" />
                เพิ่ม Ad Account อีก (ทำตามขั้นที่ 2)
              </button>
            </div>

            <button
              type="button"
              disabled={!selectedId || saving}
              onClick={handleFinish}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white font-bold shadow-lg shadow-indigo-200 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึก & เริ่มใช้งาน'}
            </button>
            <p className="text-[11px] text-slate-500 text-center">เปลี่ยน account หลักได้ที่ Settings ทุกเมื่อ</p>
          </>
        )}
      </div>
    </div>
  );
}

function TrustLine({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-slate-700">
      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
      <span>{text}</span>
    </li>
  );
}

function SubStep({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center">
        {num}
      </span>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
      </div>
    </li>
  );
}
