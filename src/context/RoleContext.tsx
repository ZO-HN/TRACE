import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type DisplayRole = 'coach' | 'athlete';

const STORAGE_KEY = 'trace-role';

interface RoleContextValue {
  role: DisplayRole;
  setRole: (role: DisplayRole) => void;
  toggleRole: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

function readStoredRole(): DisplayRole {
  if (typeof window === 'undefined') return 'coach';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'athlete' ? 'athlete' : 'coach';
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<DisplayRole>(readStoredRole);

  useEffect(() => {
    document.documentElement.dataset.role = role;
    window.localStorage.setItem(STORAGE_KEY, role);
  }, [role]);

  const toggleRole = () => setRole((r) => (r === 'coach' ? 'athlete' : 'coach'));

  return <RoleContext.Provider value={{ role, setRole, toggleRole }}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
