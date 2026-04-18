import {
  LayoutDashboard,
  Megaphone,
  Settings2,
  Sparkles,
  Users,
  History,
  Plug,
  Menu,
  X,
  PieChart,
  Bot,
  BarChart3,
  Wand2,
  Rocket,
  BookOpen,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState } from 'react';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'แดชบอร์ด', to: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'แคมเปญ', to: '/campaigns', icon: <Megaphone size={18} /> },
  { label: 'จัดการโดย AI', to: '/ai-managed', icon: <Wand2 size={18} /> },
  { label: 'ยิงแอดอัตโนมัติ', to: '/ad-launcher', icon: <Rocket size={18} /> },
  { label: 'ตั้งค่าเงื่อนไขบอท', to: '/bot-rules', icon: <Settings2 size={18} /> },
  { label: 'ประสิทธิภาพ Rules', to: '/rules/performance', icon: <BarChart3 size={18} /> },
  { label: 'วิเคราะห์คอนเทนต์ & ฮุก', to: '/content-analysis', icon: <Sparkles size={18} /> },
  { label: 'กลุ่มเป้าหมาย', to: '/audience', icon: <PieChart size={18} /> },
  { label: 'ประวัติบอท', to: '/bot-actions', icon: <Bot size={18} /> },
  { label: 'จัดการทีมงาน', to: '/team', icon: <Users size={18} /> },
  { label: 'ประวัติการทำงาน', to: '/history', icon: <History size={18} /> },
  { label: 'คู่มือการใช้งาน', to: '/docs', icon: <BookOpen size={18} /> },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 border-l-2',
    isActive
      ? 'bg-primary/20 text-primary-light border-primary shadow-sm shadow-primary/10'
      : 'text-text-muted hover:text-text hover:bg-surface-light hover:translate-x-0.5 border-transparent',
  ].join(' ');

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-50 bg-primary text-white p-3 rounded-full shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
      >
        <Menu size={22} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-64 bg-surface flex flex-col h-full shrink-0 border-r border-surface-lighter/50
          fixed lg:static z-50 top-0 left-0
          transition-transform duration-300 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-surface-lighter">
          <span className="text-sm font-semibold text-primary-light">เมนู</span>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-surface-light rounded-lg">
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, to, icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={navClass} onClick={() => setOpen(false)}>
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom settings */}
        <div className="px-3 pb-4 border-t border-surface-lighter pt-3">
          <NavLink to="/settings" className={navClass} onClick={() => setOpen(false)}>
            <Plug size={18} />
            <span>เชื่อมต่อ & ตั้งค่า</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
