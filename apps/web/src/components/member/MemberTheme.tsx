"use client";

import { createContext, useContext, type ReactNode } from 'react';

const MemberThemeContext = createContext(false);

export function MemberTheme({ children }: { children: ReactNode }) {
  return <MemberThemeContext.Provider value={true}>{children}</MemberThemeContext.Provider>;
}

export function useMemberTheme() {
  return useContext(MemberThemeContext);
}
