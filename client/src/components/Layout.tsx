import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, Plus, ChevronDown, LogOut, KeyRound, Settings, Send, Home, Package, Store, LayoutDashboard, User, Trophy, Briefcase } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        { href: "https://t.me/+K3ou01RaW6oyMjJh", icon: Send, label: "Telegram Support", external: true },
      ],
    },
    ...(user?.role === "admin" ? [{
      label: "ADMIN",
      items: [
        { href: "/admin", icon: Settings, label: "Admin Panel" },
      ],
    }] : []),
    ...((user as any)?.isWorker && user?.role !== "admin" ? [{
      label: "WORKER",
      items: [
        { href: "/worker", icon: Briefcase, label: "Worker Dashboard" },
      ],
    }] : []),
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "hsl(35 15% 4%)", color: "hsl(40 55% 82%)" }}>
      <div className="px-4 py-5" style={{ borderBottom: "1px solid hsl(36 18% 20%)" }}>
        <span className="text-xl font-bold tracking-widest" style={{ fontFamily: "'VT323', monospace", color: "hsl(40 55% 82%)" }}>
          NYC<span style={{ color: "hsl(42 72% 55%)" }}>HQ</span>
        </span>
      </div>

      <div className="flex flex-col gap-6 p-4 flex-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: "hsl(38 20% 38%)" }}>{section.label}</p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = location === item.href;
                if ((item as any).external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 text-xs transition-all"
                      style={{ color: "hsl(40 55% 82% / 0.55)" }}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                    <div
                      className="flex items-center gap-3 px-3 py-2 text-xs transition-all cursor-pointer"
                      style={isActive ? {
                        color: "hsl(42 72% 55%)",
                        background: "hsl(42 72% 55% / 0.10)",
                        borderLeft: "2px solid hsl(42 72% 55%)",
                      } : {
                        color: "hsl(40 55% 82% / 0.55)",
                      }}
                    >
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
        <div className="p-4" style={{ borderTop: "1px solid hsl(36 18% 20%)" }}>
          <button
            onClick={() => { logout(); setIsMobileOpen(false); }}
            className="flex items-center gap-2 text-xs transition-colors w-full"
            style={{ color: "hsl(40 55% 82% / 0.35)" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "hsl(35 15% 4%)", color: "hsl(40 55% 82%)" }}>
      {/* Top Bar */}
      <header
        className="h-11 sticky top-0 z-40 px-3 flex items-center justify-between"
        style={{
          background: "hsl(35 15% 4%)",
          borderBottom: "1px solid hsl(36 18% 20%)",
        }}
      >
        {/* Left: Hamburger */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <button
              className="h-7 w-7 flex items-center justify-center transition-colors"
              style={{ color: "hsl(40 55% 82% / 0.5)", background: "transparent", border: "1px solid hsl(36 18% 20%)" }}
              data-testid="btn-menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0" style={{ background: "hsl(35 15% 4%)", border: "none", borderRight: "1px solid hsl(36 18% 20%)" }}>
            <NavContent />
          </SheetContent>
        </Sheet>

        {/* Center: logo on mobile */}
        <span
          className="text-lg tracking-widest absolute left-1/2 -translate-x-1/2"
          style={{ fontFamily: "'VT323', monospace", color: "hsl(40 55% 82%)" }}
        >
          NYC<span style={{ color: "hsl(42 72% 55%)" }}>HQ</span>
        </span>

        {/* Right: Balance + User */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              <Link href="/">
                <button
                  className="flex items-center gap-1 px-2 py-1 text-xs font-mono transition-colors"
                  style={{
                    border: "1px solid hsl(36 18% 20%)",
                    color: "hsl(42 72% 55%)",
                    background: "transparent",
                  }}
                  data-testid="btn-balance"
                >
                  <span>${balanceDollars}</span>
                  <Plus className="h-2.5 w-2.5" style={{ color: "hsl(40 55% 82% / 0.4)" }} />
                </button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1 text-xs transition-colors"
                    style={{ color: "hsl(40 55% 82% / 0.65)" }}
                    data-testid="btn-user-dropdown"
                  >
                    <span className="max-w-[90px] truncate">{user.username}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="text-xs min-w-[200px]"
                  style={{
                    background: "hsl(35 12% 7%)",
                    border: "1px solid hsl(36 18% 20%)",
                    color: "hsl(40 55% 82%)",
                    borderRadius: "0",
                  }}
                  align="end"
                >
                  <div className="px-3 py-2" style={{ borderBottom: "1px solid hsl(36 18% 20%)" }}>
                    <p className="text-[10px] truncate" style={{ color: "hsl(40 55% 82% / 0.35)" }}>{user.username}</p>
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
                  <DropdownMenuSeparator style={{ background: "hsl(36 18% 20%)" }} />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="cursor-pointer text-xs"
                    style={{ color: "hsl(0 70% 55%)" }}
                  >
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
