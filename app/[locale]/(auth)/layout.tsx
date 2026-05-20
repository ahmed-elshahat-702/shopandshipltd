import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      {/* Dynamic Background elements */}
      <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -left-[10%] w-[30%] h-[30%] rounded-full bg-primary/10 blur-[100px]" />

      <div className="relative z-10 w-full md:max-w-7xl md:px-4 flex items-center justify-center min-h-screen md:min-h-0">
        {children}
      </div>
    </div>
  );
}
