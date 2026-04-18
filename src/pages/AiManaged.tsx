import { useState } from 'react';
import { Bot, LayoutDashboard, Settings2 } from 'lucide-react';
import { useConnection } from '../components/ConnectionContext';
import { useAiManaged } from '../hooks/useAiManaged';
import AiManagedWizard from '../components/AiManaged/Wizard';
import AiManagedDashboard from '../components/AiManaged/Dashboard';
import AiManagedSettings from '../components/AiManaged/Settings';
import EmergencyStopButton from '../components/AiManaged/EmergencyStopButton';

type View = 'dashboard' | 'settings';

export default function AiManaged() {
  const { selectedAccountId } = useConnection();
  const { state, loading, error, configure, stop, resume, updateConfig, reset, mockMode } = useAiManaged(
    selectedAccountId || 'act_demo'
  );
  const [view, setView] = useState<View>('dashboard');

  if (loading && !state) {
    return (
      <div className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto py-16 text-center text-sm text-text-muted">
        กำลังโหลด...
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto py-16 text-center">
        <p className="text-sm text-danger mb-2">โหลดไม่สำเร็จ</p>
        <p className="text-xs text-text-muted">{error}</p>
      </div>
    );
  }

  const hasConfig = !!state?.config;
  const status = state?.status ?? 'idle';
  const showWizard = !hasConfig || status === 'idle';

  return (
    <div className="pb-4">
      {/* Sticky header */}
      <div className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-1 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">จัดการโดย AI</h1>
            <p className="text-[10px] text-text-muted">Set & Forget mode · Facebook Ads</p>
          </div>
        </div>
        {hasConfig && !showWizard && (
          <div className="flex items-center gap-1 bg-surface rounded-full p-1 border border-surface-lighter">
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className={`p-2 rounded-full transition ${
                view === 'dashboard' ? 'bg-primary/20 text-primary-light' : 'text-text-muted'
              }`}
              aria-label="dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('settings')}
              className={`p-2 rounded-full transition ${
                view === 'settings' ? 'bg-primary/20 text-primary-light' : 'text-text-muted'
              }`}
              aria-label="settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {mockMode && (
        <div className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-1 mb-3">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200 text-center">
            🧪 Mock mode — ข้อมูลจำลอง รอ BE endpoints /api/ai-managed/*
          </div>
        </div>
      )}

      {showWizard && <AiManagedWizard onSubmit={configure} />}

      {!showWizard && view === 'dashboard' && state && (
        <AiManagedDashboard state={state} onResume={resume} />
      )}

      {!showWizard && view === 'settings' && state?.config && (
        <AiManagedSettings
          config={state.config}
          isActive={status === 'active'}
          onToggleActive={(next) => (next ? resume() : stop())}
          onUpdate={updateConfig}
          onReset={reset}
        />
      )}

      {!showWizard && <EmergencyStopButton onStop={stop} />}
    </div>
  );
}
