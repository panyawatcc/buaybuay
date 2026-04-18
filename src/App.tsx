import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Rules from './pages/Rules';
import CreativeAnalytics from './pages/CreativeAnalytics';
import CampaignRanking from './pages/CampaignRanking';
import TeamManagement from './pages/TeamManagement';
import ActivityLog from './pages/ActivityLog';
import Settings from './pages/Settings';
import AudienceInsights from './pages/AudienceInsights';
import BotActions from './pages/BotActions';
import RulePerformance from './pages/RulePerformance';
import AuthSuccess from './pages/AuthSuccess';
import AcceptInvite from './pages/AcceptInvite';
import Login from './pages/Login';
import Register from './pages/Register';
import AiManaged from './pages/AiManaged';
import AiManagedFeature from './pages/AiManagedFeature';
import AiManagedPostBooster from './pages/AiManagedPostBooster';
import AiManagedPostBoosterLive from './pages/AiManagedPostBoosterLive';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import PortalSettings from './pages/PortalSettings';
import Docs from './pages/Docs';
import QuickInstall from './pages/QuickInstall';
import LicenseSetup from './pages/LicenseSetup';
import { LicenseProvider, useLicense } from './components/LicenseContext';
import LicenseBanner from './components/LicenseBanner';
import LicenseHardBlock from './components/LicenseHardBlock';
import { ToastProvider, useToast } from './components/Toast';
import DemoBanner from './components/DemoBanner';
import { ConnectionProvider, useConnection } from './components/ConnectionContext';
import { DateRangeProvider } from './components/DateRangeContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { useAdAccounts } from './hooks/useFacebookAPI';

function MainShell() {
  const { toast } = useToast();
  const { fbConnected, selectedAccountId, setSelectedAccountId } = useConnection();
  const { accounts: realAccounts } = useAdAccounts(fbConnected);
  const license = useLicense();
  const location = useLocation();
  const [botMode, setBotMode] = useState<'manual' | 'alert' | 'autopilot'>('alert');

  // Hard-block: full-page lockout except /settings/license (the only route
  // that lets the customer fix the issue). License setup stays reachable so
  // operator can paste a new JWT without being trapped on the error screen.
  const isLicenseSetupRoute = location.pathname === '/settings/license';
  if (license.blocked && !isLicenseSetupRoute) {
    return <LicenseHardBlock />;
  }

  const accounts = fbConnected ? realAccounts.map((a) => ({ id: a.id, name: a.name, accountId: a.account_id })) : [];

  useEffect(() => {
    if (fbConnected && realAccounts.length > 0 && !realAccounts.find((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(realAccounts[0].id);
    } else if (!fbConnected && !selectedAccountId) {
      setSelectedAccountId('act_demo_test');
    }
  }, [fbConnected, realAccounts, selectedAccountId, setSelectedAccountId]);

  return (
    <div className="h-screen flex flex-col bg-bg text-text overflow-hidden">
      <LicenseBanner />
      {!fbConnected && (
        <DemoBanner onConnect={() => toast('ไปหน้า Settings เพื่อเชื่อมต่อ Facebook', 'info')} />
      )}
      <TopBar
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        botMode={botMode}
        onBotModeChange={setBotMode}
        notificationCount={3}
        fbConnected={fbConnected}
        loadingAccounts={fbConnected && realAccounts.length === 0}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route
              path="/bot-rules"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Rules />
                </ProtectedRoute>
              }
            />
            <Route path="/content-analysis" element={<CreativeAnalytics />} />
            <Route path="/rankings" element={<CampaignRanking />} />
            <Route path="/team" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><TeamManagement /></ProtectedRoute>} />
            <Route path="/history" element={<ActivityLog />} />
            <Route path="/audience" element={<AudienceInsights />} />
            <Route path="/bot-actions" element={<BotActions />} />
            <Route path="/rules/performance" element={<RulePerformance />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/license"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <LicenseSetup />
                </ProtectedRoute>
              }
            />
            <Route path="/auth/success" element={<AuthSuccess />} />
            <Route path="/ai-managed" element={<AiManaged />} />
            <Route path="/ai-managed/post-booster/live" element={<Navigate to="/ad-launcher/live" replace />} />
            <Route path="/ai-managed/post-booster" element={<Navigate to="/ad-launcher" replace />} />
            <Route path="/ai-managed/:slug" element={<AiManagedFeature />} />
            <Route path="/ad-launcher" element={<AiManagedPostBooster />} />
            <Route path="/ad-launcher/live" element={<AiManagedPostBoosterLive />} />
            <Route path="/portal/settings" element={<PortalSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const isAuthPage =
    path === '/login' ||
    path === '/register' ||
    path === '/signup' ||
    path.startsWith('/invite/');
  const isDocsPage = path === '/docs' || path.startsWith('/docs/');
  const isOnboardingPage = path === '/onboarding' || path.startsWith('/onboarding/');

  if (isDocsPage) {
    return (
      <Routes>
        {/* Quick Install takes its own component (interactive Deploy
            Button + success screen) — registered BEFORE the /docs/*
            catch-all so it isn't swallowed by the markdown renderer. */}
        <Route path="/docs/quick-install" element={<QuickInstall />} />
        <Route path="/docs/quick-install/success" element={<QuickInstall />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/ai-install" element={<Docs />} />
        <Route path="/docs/manual-install" element={<Docs />} />
        <Route path="/docs/tos" element={<Docs />} />
        <Route path="/docs/dpa" element={<Docs />} />
        <Route path="/docs/*" element={<Docs />} />
      </Routes>
    );
  }

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
      </Routes>
    );
  }

  if (isOnboardingPage) {
    if (!user) {
      return (
        <Routes>
          <Route path="*" element={<Signup />} />
        </Routes>
      );
    }
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/onboarding/*" element={<Onboarding />} />
      </Routes>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return <MainShell />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LicenseProvider>
          <ConnectionProvider>
            <DateRangeProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </DateRangeProvider>
          </ConnectionProvider>
        </LicenseProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
