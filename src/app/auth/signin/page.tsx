"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.push("/diary");
  }, [status, router]);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("azure-ad", { callbackUrl: "/diary" });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg w-full max-w-sm p-8 flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg leading-tight">Dhanam</p>
            <p className="text-xs text-slate-400 font-medium">Workspace</p>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in with your Dhanam Microsoft account</p>
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          {/* Microsoft logo */}
          <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
            <path fill="#f35325" d="M1 1h10v10H1z" />
            <path fill="#81bc06" d="M12 1h10v10H12z" />
            <path fill="#05a6f0" d="M1 12h10v10H1z" />
            <path fill="#ffba08" d="M12 12h10v10H12z" />
          </svg>
          <span className="text-sm font-semibold text-slate-700">
            {loading ? "Signing in…" : "Sign in with Microsoft 365"}
          </span>
        </button>

        <p className="text-xs text-slate-400 text-center">
          Only Dhanam team members can access this workspace.
        </p>
      </div>
    </div>
  );
}
