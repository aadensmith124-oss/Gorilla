import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ChevronDown, LogOut, Send, ShoppingCart, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // Close nav whenever the route changes
  useEffect(() => {
    setNavOpen(false);
    setAccountOpen(false);
  }, [location]);

  const balanceDollars = user ? (user.balance / 100).toFixed(2) : "0.00";

  const { data: features } = useQuery<{ checker: boolean; reseller: boolean; ranks: boolean; logs: boolean; cards: boolean }>({
    queryKey: ["/api/settings/features"],
    staleTime: 30000,
  });

  const { data: announcements } = useQuery<{ id: number; text: string; active: boolean }[]>({
    queryKey: ["/api/announcements"],
    staleTime: 60000,
  });
  const activeAnnouncement = announcements?.find(a => a.active);

  const navLinks = [
    { href: "/", label: "Deposit" },
    { href: "/orders", label: "Orders" },
    ...(features?.logs !== false ? [{ href: "/shop", label: "Shop" }] : []),
    ...(features?.cards !== false ? [{ href: "/cards", label: "Cards" }] : []),
    ...(features?.ranks !== false ? [{ href: "/ranks", label: "Ranks" }] : []),
    ...(features?.checker !== false ? [{ href: "/checker", label: "Checker" }] : []),
    { href: "/support", label: "Support" },
    ...(features?.reseller !== false ? [{ href: "/become-reseller", label: "Become Seller" }] : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
    ...((user as any)?.isWorker && user?.role !== "admin" ? [{ href: "/worker", label: "Worker" }] : []),
  ];

  const isAuthPage = location === "/auth";
  if (isAuthPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">

      {/* ── Announcement banner ── */}
      {activeAnnouncement && (
        <div className="w-full overflow-hidden z-50" style={{ height: 32, background: "linear-gradient(90deg,#be185d,#ec4899,#be185d)" }}>
          <div className="flex items-center h-full whitespace-nowrap animate-[marquee_18s_linear_infinite]">
            {[...Array(4)].map((_, i) => (
              <span key={i} className="text-[11px] font-bold tracking-widest text-white uppercase px-12">
                {activeAnnouncement.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-4 h-[52px] border-b border-white/8 bg-background">
        <button
          onClick={() => { setNavOpen(o => !o); setAccountOpen(false); }}
          className="flex flex-col gap-[5px] p-1"
          data-testid="btn-menu"
          aria-label="Toggle navigation"
        >
          {navOpen
            ? <X className="h-5 w-5 text-white/70" />
            : <>
                <span className="block w-5 h-[2px] bg-white/70 rounded" />
                <span className="block w-5 h-[2px] bg-white/70 rounded" />
                <span className="block w-5 h-[2px] bg-white/70 rounded" />
              </>
          }
        </button>

        {/* Right side: balance pill */}
        {user && (
          <Link href="/">
            <button className="text-xs font-mono font-bold text-primary border border-primary/30 bg-primary/10 px-3 py-1 rounded hover:bg-primary/15 transition-colors" data-testid="btn-balance">
              ${balanceDollars}
            </button>
          </Link>
        )}
      </header>

      {/* ── Inline nav (expands below header) ── */}
      {navOpen && (
        <nav className="border-b border-white/8 bg-background py-4 text-center space-y-1">
          {navLinks.map(({ href, label }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href}>
                <div
                  onClick={() => setNavOpen(false)}
                  className={`block py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                    isActive ? "text-primary" : "text-white/75 hover:text-white"
                  }`}
                >
                  {label}
                </div>
              </Link>
            );
          })}

          {/* MY ACCOUNT dropdown */}
          {user && (
            <div>
              <button
                onClick={() => setAccountOpen(o => !o)}
                className="inline-flex items-center gap-2 py-2.5 text-sm font-medium text-white/75 hover:text-white transition-colors"
              >
                My Account
                <ChevronDown className={`h-4 w-4 transition-transform ${accountOpen ? "rotate-180" : ""}`} />
              </button>
              {accountOpen && (
                <div className="mx-auto mt-1 w-48 border border-white/12 rounded bg-[#111] text-center overflow-hidden">
                  <div className="px-4 py-3 text-sm font-medium text-white/75">
                    Balance | ${balanceDollars}
                  </div>
                  <div className="border-t border-white/8">
                    <button
                      onClick={() => { logout(); setNavOpen(false); setAccountOpen(false); }}
                      className="block w-full px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart icon */}
          <div className="pt-1 pb-1 flex justify-center">
            <Link href="/orders">
              <div onClick={() => setNavOpen(false)} className="relative inline-flex cursor-pointer text-primary hover:text-primary/80 transition-colors">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                  0
                </span>
              </div>
            </Link>
          </div>
        </nav>
      )}

      {/* ── Page content ── */}
      <main className="min-h-screen">
        {children}
      </main>

    </div>
  );
}
