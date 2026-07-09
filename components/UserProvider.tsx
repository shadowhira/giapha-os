"use client";

import { createContext, useContext, ReactNode } from "react";

export interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface UserState {
  user: SessionUser | null;
}

const UserContext = createContext<UserState | undefined>(undefined);

export function UserProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: SessionUser | null;
}) {
  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
