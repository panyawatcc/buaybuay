import { useState, useMemo } from 'react';
import { useToast } from '../components/Toast';
import { useConnection } from '../components/ConnectionContext';
import { useActivities } from '../hooks/useFacebookAPI';
import EmptyState from '../components/EmptyState';

type FilterType = 'all' | 'bot' | 'ai' | 'user';

function BotIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
      />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

const actorConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactElement; label: string }> = {
  bot: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500',
    icon: <BotIcon />,
    label: 'บอท',
  },
  ai: {
    bg: 'bg-primary/20',
    text: 'text-primary-light',
    border: 'border-primary',
    icon: <SparklesIcon />,
    label: 'AI',
  },
  user: {
    bg: 'bg-success/20',
    text: 'text-success',
    border: 'border-success',
    icon: <UserIcon />,
    label: 'ผู้ใช้',
  },
};

const statusDot: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-danger',
};

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActivityLog() {
  const { toast } = useToast();
  const { selectedAccountId, fbConnected } = useConnection();
  const { activities, loading: actLoading, error: actError } = useActivities(fbConnected, selectedAccountId);
  const [filter, setFilter] = useState<FilterType>('all');
  const [telegramEnabled, setTelegramEnabled] = useState(true);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'bot', label: 'บอท' },
    { key: 'ai', label: 'AI' },
    { key: 'user', label: 'ผู้ใช้' },
  ];

  const filtered = useMemo(() => {
    if (!fbConnected) return [];
    return filter === 'all' ? activities : activities.filter((e) => e.actor === filter);
  }, [filter, activities, fbConnected]);

  if (!fbConnected) return <EmptyState type="not-connected" title="ดู Activity Log จริง" description="เชื่อมต่อ Facebook Ads เพื่อดูประวัติการทำงานของบอทบนบัญชีคุณ" />;
  if (actError) return <EmptyState type="error" error={actError} />;
  if (actLoading) return <EmptyState type="loading" description="กำลังโหลดประวัติ..." />;

  return (
    <div className="min-h-screen bg-bg text-text p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">ประวัติการทำงาน</h1>
          <p className="text-text-muted text-sm mt-1">
            บันทึกกิจกรรมทั้งหมดของระบบ บอท และผู้ใช้
          </p>
        </div>
        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary text-white'
                  : 'bg-surface-light text-text-muted hover:bg-surface-lighter hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-surface-lighter" />

        <div className="space-y-4">
          {filtered.map((entry, i) => {
            const actor = actorConfig[entry.actor] ?? actorConfig.bot;
            return (
              <div key={i} className="relative flex items-start gap-0">
                {/* Circle icon on timeline */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${actor.bg} ${actor.text} ${actor.border}`}
                >
                  {actor.icon}
                </div>

                {/* Card */}
                <div className="ml-4 flex-1 bg-surface rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status dot */}
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[entry.status] ?? 'bg-text-muted'}`}
                      />
                      {/* Actor badge */}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${actor.bg} ${actor.text}`}
                      >
                        {actor.label}
                      </span>
                      {/* Action title */}
                      <span className="font-semibold text-text text-sm">{entry.action}</span>
                    </div>
                    {/* Timestamp */}
                    <span className="text-xs text-text-muted flex-shrink-0 mt-0.5">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  {/* Details */}
                  {entry.details && (
                    <p className="text-text-muted text-xs mt-2 leading-relaxed pl-4">
                      {entry.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center text-text-muted py-16 bg-surface rounded-xl ml-14">
              ไม่มีกิจกรรมสำหรับตัวกรองที่เลือก
            </div>
          )}
        </div>
      </div>

      {/* Telegram Status Section */}
      <div className="bg-surface rounded-xl p-6 border border-surface-lighter">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#229ED9]/20 flex items-center justify-center text-[#229ED9]">
              <TelegramIcon />
            </div>
            <div>
              <h2 className="font-semibold text-text">การแจ้งเตือน Telegram</h2>
              <p className="text-text-muted text-xs mt-0.5">รับการแจ้งเตือนผ่าน Telegram Bot</p>
            </div>
          </div>
          {/* Toggle */}
          <button
            onClick={() => setTelegramEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              telegramEnabled ? 'bg-success' : 'bg-surface-lighter'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                telegramEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-surface-lighter">
            <span className="text-text-muted">สถานะ</span>
            <span className="flex items-center gap-1.5 text-success font-medium">
              <span className="w-2 h-2 rounded-full bg-success" />
              เชื่อมต่อแล้ว
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-surface-lighter">
            <span className="text-text-muted">ส่งล่าสุด</span>
            <span className="text-text">วันนี้ 09:15 น.</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-muted">Chat</span>
            <span className="text-text font-mono text-xs">@facebook_ad_scaler_bot</span>
          </div>
        </div>

        <button onClick={() => toast('ส่งข้อความทดสอบ Telegram สำเร็จ', 'success')} className="mt-5 w-full sm:w-auto px-5 py-2 rounded-lg bg-[#229ED9]/20 text-[#229ED9] hover:bg-[#229ED9]/30 transition-colors text-sm font-medium border border-[#229ED9]/30">
          ส่งข้อความทดสอบ
        </button>
      </div>
    </div>
  );
}
