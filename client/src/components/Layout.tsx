import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, LogOut, KeyRound, Settings, Send, Home, Package, Store, LayoutDashboard, Trophy, Briefcase, ShoppingCart, CreditCard } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const P    = "hsl(186 100% 50%)";
const PBG  = "hsl(186 100% 50% / 0.12)";
const BG   = "hsl(214 50% 4%)";
const CARD = "hsl(214 45% 7%)";
const BDR  = "hsl(210 40% 16%)";
const TEXT = "hsl(195 60% 88%)";
const MUT  = "hsl(205 30% 45%)";
const NAVY = "hsl(220 48% 10%)";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const balanceDollars = user ? (user.balance / 100).toFixed(2) : "0.00";

  const mainItems = [
    { href: "/", icon: Home, label: "Topup", color: "#22C55E" },
    { href: "/orders", icon: Package, label: "Orders", color: "#F59E0B" },
    { href: "/ranks", icon: Trophy, label: "Ranks", color: "#A855F7" },
  ];
  const shopItems = [
    { href: "/shop", icon: Store, label: "Logs", color: "#EF4444" },
    { href: "/acctplug", icon: CreditCard, label: "Cards", color: "#3B82F6" },
  ];
  const adminItems = user?.role === "admin" ? [
    { href: "/admin", icon: Settings, label: "Admin Panel", color: "#F97316" },
  ] : [];
  const workerItems = (user as any)?.isWorker && user?.role !== "admin" ? [
    { href: "/worker", icon: Briefcase, label: "Worker Dashboard", color: "#8B5CF6" },
  ] : [];

  function NavItem({ href, icon: Icon, label, color, external }: any) {
    const isActive = location === href;
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          <div className="flex items-center gap-3 px-3 py-2 text-xs mb-1 transition-all"
            style={{ background: CARD, border: `1px solid ${BDR}`, color: MUT }}>
            <span style={{ color }}><Icon className="h-3.5 w-3.5" /></span>
            {label}
          </div>
        </a>
      );
    }
    return (
      <Link href={href} onClick={() => setIsMobileOpen(false)}>
        <div className="flex items-center gap-3 px-3 py-2 text-xs mb-1 transition-all cursor-pointer"
          style={isActive
            ? { background: PBG, border: `1px solid ${P}`, color: P, boxShadow: `0 0 8px ${P}33` }
            : { background: CARD, border: `1px solid ${BDR}`, color: TEXT }}>
          <span style={{ color: isActive ? P : color }}><Icon className="h-3.5 w-3.5" /></span>
          {label}
        </div>
      </Link>
    );
  }

  const NavContent = () => (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: NAVY }}>
      {/* Brand header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: P }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px", color: BG, letterSpacing: "0.05em" }}>
          NYCHQ
        </span>
      </div>

      {/* User ID */}
      {user && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 text-[10px] font-mono flex items-center gap-2"
          style={{ background: CARD, border: `1px solid ${BDR}`, color: MUT }}>
          <span style={{ color: P, fontSize: "8px" }}>◉</span>
          <span className="truncate">{user.username}</span>
        </div>
      )}

      <div className="flex flex-col p-3 flex-1 gap-0">
        <p className="text-[9px] tracking-widest mb-1.5 px-1" style={{ color: MUT }}>MAIN</p>
        {mainItems.map(i => <NavItem key={i.href} {...i} />)}

        <p className="text-[9px] tracking-widest mb-1.5 mt-3 px-1" style={{ color: MUT }}>SHOP</p>
        {shopItems.map(i => <NavItem key={i.href} {...i} />)}

        <p className="text-[9px] tracking-widest mb-1.5 mt-3 px-1" style={{ color: MUT }}>CHANNEL</p>
        <NavItem href="https://t.me/+K3ou01RaW6oyMjJh" icon={Send} label="Telegram" color="#229ED9" external />

        {adminItems.length > 0 && (
          <>
            <p className="text-[9px] tracking-widest mb-1.5 mt-3 px-1" style={{ color: MUT }}>ADMIN</p>
            {adminItems.map(i => <NavItem key={i.href} {...i} />)}
          </>
        )}
        {workerItems.length > 0 && (
          <>
            <p className="text-[9px] tracking-widest mb-1.5 mt-3 px-1" style={{ color: MUT }}>WORKER</p>
            {workerItems.map(i => <NavItem key={i.href} {...i} />)}
          </>
        )}
      </div>

      {/* Bottom: dashed separator + Cart + Logout */}
      <div className="px-3 pb-4">
        <div className="my-2 text-[10px] text-center" style={{ color: BDR, letterSpacing: "4px" }}>- - - - - - - - - - - - -</div>
        <Link href="/cart" onClick={() => setIsMobileOpen(false)}>
          <div className="flex items-center gap-3 px-3 py-2 text-xs mb-1 cursor-pointer"
            style={{ background: CARD, border: `1px solid ${BDR}`, color: TEXT }}>
            <ShoppingCart className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />
            Cart
          </div>
        </Link>
        <Link href="/my-code" onClick={() => setIsMobileOpen(false)}>
          <div className="flex items-center gap-3 px-3 py-2 text-xs mb-1 cursor-pointer"
            style={{ background: CARD, border: `1px solid ${BDR}`, color: TEXT }}>
            <KeyRound className="h-3.5 w-3.5" style={{ color: "#8B5CF6" }} />
            Login Code
          </div>
        </Link>
        {user && (
          <button onClick={() => { logout(); setIsMobileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-xs"
            style={{ background: "#22C55E22", border: "1px solid #22C55E44", color: "#22C55E" }}>
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT }}>
      <header className="h-11 sticky top-0 z-40 px-3 flex items-center justify-between gap-3"
        style={{ background: BG, borderBottom: `1px solid ${BDR}` }}>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center transition-colors"
                style={{ color: MUT, border: `1px solid ${BDR}`, background: CARD }}
                data-testid="btn-menu">
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[220px] p-0"
              style={{ background: NAVY, border: "none", borderRight: `1px solid ${BDR}` }}>
              <NavContent />
            </SheetContent>
          </Sheet>

          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px", color: P, textShadow: `0 0 8px ${P}`, letterSpacing: "0.05em" }}>
            NYC<span style={{ color: TEXT, textShadow: "none" }}>HQ</span>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {user && (
            <>
              <Link href="/cart">
                <button className="h-7 px-2 text-[10px] transition-all flex items-center gap-1"
                  style={{ border: `1px solid ${BDR}`, color: MUT, background: CARD }}
                  data-testid="btn-cart-header">
                  <ShoppingCart className="h-3 w-3" />
                  cart
                </button>
              </Link>
              <Link href="/">
                <button className="h-7 px-2 text-[10px] font-mono transition-all pixel-btn"
                  style={{ border: `1px solid ${P}`, color: P, background: PBG }}
                  data-testid="btn-balance">
                  ${balanceDollars}
                </button>
              </Link>
              <span className="text-[10px] max-w-[70px] truncate cursor-pointer" style={{ color: MUT }}
                onClick={() => setIsMobileOpen(true)}>
                {user.username}
              </span>
            </>
          )}
        </div>
      </header>

      <main className="min-h-screen">{children}</main>
    </div>
  );
}
