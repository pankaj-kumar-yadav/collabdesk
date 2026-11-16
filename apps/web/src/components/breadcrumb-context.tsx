"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type BreadcrumbTrail = {
  workspaceName?: string | null;
  fileName?: string | null;
};

type BreadcrumbContextValue = {
  trail: BreadcrumbTrail;
  setTrail: (trail: BreadcrumbTrail) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export type BreadcrumbProviderProps = {
  children: React.ReactNode;
};

export function BreadcrumbProvider(props: BreadcrumbProviderProps) {
  const { children } = props;
  const [trail, setTrailState] = useState<BreadcrumbTrail>({});
  const setTrail = useCallback((next: BreadcrumbTrail) => {
    setTrailState(next);
  }, []);

  const value = useMemo(() => ({ trail, setTrail }), [trail, setTrail]);

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbTrail() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumbTrail must be used within BreadcrumbProvider");
  }
  return ctx;
}
