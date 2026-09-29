import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/vehicles" className="font-semibold tracking-tight">
          Boomdrive <span className="text-accent">Automotive</span>
        </Link>
        {user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/vehicles" className="hover:text-accent">
              Vehicles
            </Link>
            <Link href="/partners" className="hover:text-accent">
              Partners
            </Link>
            <form action={signOut}>
              <button className="btn-secondary" type="submit">
                Sign out
              </button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}
