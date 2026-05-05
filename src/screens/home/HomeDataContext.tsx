import { createContext, useContext, type ReactNode } from "react";

import type { HomeCrudOpen } from "./HomeCrudModal";
import type { HomeDashboardState, HomeDateRange } from "./types";

export type HomeDataContextValue = {
  state: HomeDashboardState;
  accessToken: string;
  load: () => Promise<void>;
  /** Resolved default currency for display (summary or profile). */
  currency: string | null;
  accountAvatar: string;
  displayName: string;
  dateRange: HomeDateRange;
  setDateRange: (range: HomeDateRange) => void;
  resetDateRange: () => void;
  setCrudOpen: (open: HomeCrudOpen | null) => void;
};

const HomeDataContext = createContext<HomeDataContextValue | null>(null);

export function HomeDataProvider({ value, children }: { value: HomeDataContextValue; children: ReactNode }) {
  return <HomeDataContext.Provider value={value}>{children}</HomeDataContext.Provider>;
}

export function useHomeData(): HomeDataContextValue {
  const ctx = useContext(HomeDataContext);
  if (!ctx) {
    throw new Error("useHomeData must be used within HomeDataProvider");
  }
  return ctx;
}
