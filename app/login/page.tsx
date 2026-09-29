import { signIn } from "@/app/actions";
import { Car } from "lucide-react";
import Image from "next/image";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper/30 p-4 sm:p-8">
      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/boomdrive-logo.jpg" 
              alt="Boomdrive Logo" 
              width={100} 
              height={50} 
              className="object-contain mix-blend-multiply drop-shadow-md" 
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Boomdrive</h1>
          <p className="mt-2 font-medium text-ink/50">Automotive Logbook & Settlement</p>
        </div>

        {/* Login Card */}
        <div className="card rounded-3xl border border-line/50 p-6 shadow-xl shadow-ink/5 sm:p-10">
          <h2 className="mb-1 text-xl font-semibold text-ink">Welcome back</h2>
          <p className="mb-6 text-sm text-ink/60">Please enter your details to sign in.</p>

          {error && (
            <p className="mb-6 rounded-xl border border-bad/20 bg-bad/5 px-4 py-3 text-sm text-bad">
              {error}
            </p>
          )}

          <form action={signIn} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink/80">
                Email
              </label>
              <input
                className="input w-full rounded-xl py-2.5 transition-colors focus:ring-2 focus:ring-accent/20"
                type="email"
                name="email"
                id="email"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-ink/80"
              >
                Password
              </label>
              <input
                className="input w-full rounded-xl py-2.5 transition-colors focus:ring-2 focus:ring-accent/20"
                type="password"
                name="password"
                id="password"
                placeholder="Enter your password"
                required
              />
            </div>
            <div className="pt-2">
              <button
                className="btn-primary flex w-full justify-center rounded-xl bg-accent py-3 font-medium transition-transform hover:scale-[1.02] hover:bg-accent/90 active:scale-[0.98]"
                type="submit"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-ink/40">
          © {new Date().getFullYear()} Boomdrive Automotive. All rights reserved.
        </p>
      </div>
    </div>
  );
}
