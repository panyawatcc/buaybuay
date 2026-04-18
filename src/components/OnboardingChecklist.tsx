import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, X, Sparkles } from 'lucide-react';
import { useConnection } from './ConnectionContext';

const STORAGE_KEY = 'adbot_onboarding';

interface Step {
  id: string;
  label: string;
  description: string;
  nav?: string;
}

const STEPS: Step[] = [
  { id: 'connect_fb', label: 'เชื่อมต่อ Facebook', description: 'เชื่อมบัญชี Facebook Ads เพื่อดูข้อมูลจริง', nav: '/settings' },
  { id: 'select_account', label: 'เลือก Ad Account', description: 'เลือกบัญชีโฆษณาที่ต้องการจัดการ' },
  { id: 'view_dashboard', label: 'ดูแดชบอร์ด', description: 'ดูภาพรวมยอดใช้จ่ายและ ROAS' },
  { id: 'explore_campaigns', label: 'สำรวจแคมเปญ', description: 'ดูรายละเอียดและจัดอันดับแคมเปญ', nav: '/campaigns' },
];

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const { fbConnected, selectedAccountId } = useConnection();
  const [completed, setCompleted] = useState<Set<string>>(loadCompleted);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY + '_dismissed') === 'true');

  // Auto-complete steps based on state
  useEffect(() => {
    const next = new Set(completed);
    if (fbConnected) next.add('connect_fb');
    if (selectedAccountId && selectedAccountId.startsWith('act_')) next.add('select_account');
    // view_dashboard auto-completes when this component renders on dashboard
    next.add('view_dashboard');
    if (next.size !== completed.size) {
      setCompleted(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    }
  }, [fbConnected, selectedAccountId, completed]);

  const allDone = STEPS.every((s) => completed.has(s.id));
  if (allDone || dismissed) return null;

  const completedCount = STEPS.filter((s) => completed.has(s.id)).length;

  const handleStepClick = (step: Step) => {
    if (step.nav) navigate(step.nav);
    const next = new Set(completed);
    next.add(step.id);
    setCompleted(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY + '_dismissed', 'true');
  };

  return (
    <div className="bg-surface border border-primary/20 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-light" />
          <h3 className="font-semibold text-sm">เริ่มต้นใช้งาน ({completedCount}/{STEPS.length})</h3>
        </div>
        <button onClick={handleDismiss} className="p-1 rounded hover:bg-surface-light text-text-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="space-y-1">
        {STEPS.map((step) => {
          const done = completed.has(step.id);
          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step)}
              disabled={done}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                done ? 'opacity-60' : 'hover:bg-surface-light'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                done ? 'bg-success text-white' : 'border border-surface-lighter'
              }`}>
                {done && <Check className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={done ? 'line-through text-text-muted' : 'font-medium'}>{step.label}</p>
                <p className="text-xs text-text-muted">{step.description}</p>
              </div>
              {!done && step.nav && <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
