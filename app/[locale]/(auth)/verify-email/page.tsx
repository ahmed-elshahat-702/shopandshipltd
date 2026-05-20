import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import VerifyEmailClient from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <div className="w-full flex items-center justify-center py-20 px-4">
      <Suspense
        fallback={<Loader2 className="animate-spin text-primary mx-auto" />}
      >
        <VerifyEmailClient />
      </Suspense>
    </div>
  );
}
