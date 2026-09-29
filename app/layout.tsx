import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Boomdrive | Logbook",
  description: "Vehicle reseller logbook and partner settlement tracker",
  icons: {
    icon: "/boomdrive-logo.jpg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col min-w-0">
              <Navbar />
              <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-20 md:pb-8">{children}</main>
              <Footer />
            </div>
            <MobileNav />
          </div>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
