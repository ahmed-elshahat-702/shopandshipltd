import { ReactNode } from "react";
import "./globals.css";

// This root layout is required by Next.js for proper routing.
// The actual layout (with providers, etc.) is in [locale]/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
