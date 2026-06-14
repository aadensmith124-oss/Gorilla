import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, Plus, ChevronDown, LogOut, KeyRound, Settings, Send, Home, Package, Store, LayoutDashboard, Trophy, Briefcase } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const P = "hsl(186 100% 50%)";       // neon cyan primary
const PBG = "hsl(186 100% 50% / 0.1)";
const BG = "hsl(214 50% 4%)";
const CARD = "hsl(214 45% 7%)";
const BORDER = "hsl(210 40% 16%)";
const TEXT = "hsl(195 60% 88%)";
const MUTED = "hsl(205 30% 45%)";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const balanceDollars = user ? (user.balance / 100).toFixed(2) : "0.00";

  const navSections = [
    {
      label: "MAIN",
      items: [
        { href: "/", icon: Home, label: "Deposit" },
        { href: "/orders", icon: Package, label: "Orders" },
        { href: "/ranks", icon: Trophy, label: "Ranks" },
      ],
    },
    {
      label: "SHOP",
      items: [
        { href: "/shop", icon: Store, label: "Logs" },
        { href: "/acctplug", icon: LayoutDashboard, label: "Cards" },
      ],
    },
    {
      label: "SUPPORT",
      items: [
        { href: "https://t.me/+K3ou01RaW6oyMjJh", icon: Send, label: "Telegram", external: true },
      ],
    },
    ...(user?.role === "admin" ? [{
      label: "ADMIN",
      items: [{ href: "/admin", icon: Settings, label: "Admin Panel" }],
    }] : []),
    ...((user as any)?.isWorker && user?.role !== "admin" ? [{
      label: "WORKER",
      items: [{ href: "/worker", icon: Briefcase, label: "Worker Dashboard" }],
    }] : []),
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: BG, color: TEXT }}>
      {/* Sidebar brand */}
      <div className="px-4 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px", color: P, textShadow: `0 0 10px ${P}` }}>
          NYC<span style={{ color: TEXT }}>HQ</span>
        </span>
      </div>

      <div className="flex flex-col gap-6 p-4 flex-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-bold tracking-widest mb-2" style={{ color: MUTED }}>{section.label}</p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = location === item.href;
                if ((item as any).external) {
                  return (
                    <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 text-xs transition-all"
                      style={{ color: MUTED }}>
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                    <div className="flex items-center gap-3 px-3 py-2 text-xs transition-all cursor-pointer"
                      style={isActive ? {
                        color: P,
                        background: PBG,
                        borderLeft: `2px solid ${P}`,
                        textShadow: `0 0 6px ${P}`,
                      } : { color: MUTED }}>
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {user && (
        <div className="p-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button onClick={() => { logout(); setIsMobileOpen(false); }}
            className="flex items-center gap-2 text-xs transition-colors w-full"
            style={{ color: "hsl(0 80% 58% / 0.6)" }}>
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT }}>
      {/* Top Bar */}
      <header className="h-11 sticky top-0 z-40 px-3 flex items-center justify-between gap-3"
        style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>

        {/* Left: hamburger + BRAND (no overlap with right side) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center transition-colors"
                style={{ color: MUTED, border: `1px solid ${BORDER}` }}
                data-testid="btn-menu">
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[220px] p-0"
              style={{ background: BG, border: "none", borderRight: `1px solid ${BORDER}` }}>
              <NavContent />
            </SheetContent>
          </Sheet>

          {/* Brand — left side only, no absolute centering */}
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px", color: P, textShadow: `0 0 8px ${P}`, letterSpacing: "0.05em" }}>
            NYC<span style={{ color: TEXT }}>HQ</span>
          </span>
        </div>

        {/* Right: Balance + Username */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {user && (
            <>
              <Link href="/">
                <button className="flex items-center gap-1 px-2 py-1 text-xs font-mono transition-all pixel-btn"
                  style={{ border: `1px solid ${P}`, color: P, background: PBG }}
                  data-testid="btn-balance">
                  <span>${balanceDollars}</span>
                  <Plus className="h-2.5 w-2.5" style={{ color: MUTED }} />
                </button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-xs transition-colors"
                    style={{ color: MUTED }}
                    data-testid="btn-user-dropdown">
                    <span className="max-w-[80px] truncate">{user.username}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="text-xs min-w-[180px]"
                  style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: "0" }}
                  align="end">
                  <div className="px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <p className="text-[10px] truncate" style={{ color: MUTED }}>{user.username}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/my-code">
                      <div className="flex items-center gap-2 cursor-pointer w-full text-xs py-0.5">
                        <KeyRound className="h-3 w-3" />
                        Login Code
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  {(user as any)?.isWorker && (
                    <DropdownMenuItem asChild>
                      <Link href="/worker">
                        <div className="flex items-center gap-2 cursor-pointer w-full text-xs py-0.5">
                          <Briefcase className="h-3 w-3" />
                          Worker Dashboard
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator style={{ background: BORDER }} />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-xs"
                    style={{ color: "hsl(0 80% 58%)" }}>
                    <LogOut className="h-3 w-3 mr-2" />
                    log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}
