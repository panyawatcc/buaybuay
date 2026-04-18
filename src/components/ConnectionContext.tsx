import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ConnectionContextType {
  fbConnected: boolean;
  setFbConnected: (v: boolean) => void;
  welcomeDismissed: boolean;
  dismissWelcome: () => void;
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
}

const ConnectionContext = createContext<ConnectionContextType>({
  fbConnected: false,
  setFbConnected: () => {},
  welcomeDismissed: false,
  dismissWelcome: () => {},
  selectedAccountId: '',
  setSelectedAccountId: () => {},
});

export const useConnection = () => useContext(ConnectionContext);

const STORAGE_KEY = 'adbot_fb_connected';
const WELCOME_KEY = 'adbot_welcome_dismissed';
const ACCOUNT_KEY = 'adbot_selected_account';

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [fbConnected, setFbConnectedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const [welcomeDismissed, setWelcomeDismissedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(WELCOME_KEY) === 'true';
  });

  const [selectedAccountId, setSelectedAccountIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(ACCOUNT_KEY) || '';
  });

  const setSelectedAccountId = (id: string) => {
    setSelectedAccountIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCOUNT_KEY, id);
    }
  };

  const setFbConnected = (v: boolean) => {
    setFbConnectedState(v);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false');
    }
  };

  const dismissWelcome = () => {
    setWelcomeDismissedState(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(WELCOME_KEY, 'true');
    }
  };

  useEffect(() => {
    // Cross-tab sync via StorageEvent
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFbConnectedState(e.newValue === 'true');
      if (e.key === WELCOME_KEY) setWelcomeDismissedState(e.newValue === 'true');
    };
    // Same-tab sync via custom event (dispatched by AuthContext after token restore)
    const onFbChange = () => {
      setFbConnectedState(localStorage.getItem(STORAGE_KEY) === 'true');
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('fb-connection-change', onFbChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('fb-connection-change', onFbChange);
    };
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        fbConnected,
        setFbConnected,
        welcomeDismissed,
        dismissWelcome,
        selectedAccountId,
        setSelectedAccountId,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}
