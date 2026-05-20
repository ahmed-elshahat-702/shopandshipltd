"use client";

import React from "react";
import { UserProvider } from "@/hooks/use-auth";
import type { SessionUser } from "@/hooks/use-auth";
import { SyncHandler } from "./SyncHandler";

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  return (
    <UserProvider initialUser={initialUser}>
      <SyncHandler />
      {children}
    </UserProvider>
  );
}
