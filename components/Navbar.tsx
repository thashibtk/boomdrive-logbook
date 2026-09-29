import { Bell } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex h-[72px] items-center justify-between gap-4 border-b border-line bg-paper px-4 md:px-8">
      {/* Mobile Logo */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white p-1 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/boomdrive-logo.jpg" alt="Logo" className="h-full w-full object-contain" />
        </div>
      </div>
      
      {/* Empty div for flex-between spacing on desktop */}
      <div className="hidden md:block"></div>

      <div className="group relative">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
            {initial}
          </span>
          <span className="text-sm font-medium">{displayName}</span>
        </button>

        {/* Dropdown */}
        <div className="invisible absolute right-0 z-10 mt-1 w-40 rounded-lg border border-line bg-white p-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-bad hover:bg-bad/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
