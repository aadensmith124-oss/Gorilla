import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Menu, Plus, ChevronDown, LogOut, KeyRound, Settings, Send,
  Home, Package, Store, LayoutDashboard, Trophy, Briefcase, Bot, BadgeCheck, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const balanceDollars = user ? (user.balance / 100).toFixed(2) : "0.00";

  const { data: features } = useQuery<{ checker: boolean; reseller: boolean; ranks: boolean; logs: boolean }>({
    queryKey: ["/api/settings/features"],
    staleTime: 30000,
  });

  const navSections = [
    {
      label: "MAIN",
      items: [
        { href: "/", icon: Home, label: "Deposit" },
        { href: "/orders", icon: Package, label: "Orders" },
        ...(features?.ranks !== false ? [{ href: "/ranks", icon: Trophy, label: "Ranks" }] : []),
      ],
    },
    {
      label: "SHOP",
      items: [
        ...(features?.logs !== false ? [{ href: "/shop", icon: Store, label: "Logs" }] : []),
        { href: "/acctplug", icon: LayoutDashboard, label: "Cards" },
      ],
    },
    ...(features?.checker !== false ? [{
      label: "BOT",
      items: [
        { href: "/checker", icon: Bot, label: "Checker" },
      ],
    }] : []),
    {
      label: "SUPPORT",
      items: [
        { href: "https://t.me/+5pZdw9Czcro1OTFh", icon: Send, label: "Telegram Support", external: true },
      ],
    },
    ...(features?.reseller !== false ? [{
      label: "RESELLER",
      items: [
        { href: "/become-reseller", icon: BadgeCheck, label: "Become Reseller" },
      ],
    }] : []),
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
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "linear-gradient(180deg, #0d1a0e 0%, #091208 100%)" }}>
      {/* Brand + close */}
      <div className="px-5 py-5 flex items-center justify-between border-b border-[#2d6a2d]/20">
        <div>
          <span className="text-lg font-black tracking-tight text-white">NYC</span>
          <span className="text-lg font-black tracking-tight text-[#4a9a3a]">HQ</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* User pill */}
      {user && (
        <div className="mx-4 mt-4 mb-2 flex items-center gap-3 bg-[#1a3a1a]/50 border border-[#2d6a2d]/25 rounded-2xl px-3.5 py-3">
          <div className="h-8 w-8 rounded-xl bg-[#2d6a2d]/40 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-black text-[#4a9a3a] uppercase">{user.username?.[0] || "U"}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user.username}</p>
            <p className="text-[10px] text-[#4a9a3a]/70 font-mono">${balanceDollars}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 px-3 py-3 flex-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-black text-[#4a9a3a]/40 tracking-[0.2em] uppercase mb-1 px-2.5">{section.label}</p>
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
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-white/40 hover:text-white hover:bg-[#2d6a2d]/15 transition-all"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#2d6a2d]/30 text-[#6abf5a] font-bold border border-[#2d6a2d]/30"
                        : "text-white/40 hover:text-white hover:bg-white/[0.04]"
                    }`}>
                      <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#4a9a3a]" : "text-white/25"}`} />
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
        <div className="p-4 border-t border-[#2d6a2d]/15">
          <button
            onClick={() => { logout(); setIsMobileOpen(false); }}
            className="flex items-center gap-2.5 text-xs text-white/25 hover:text-red-400/70 transition-colors w-full px-3 py-2 rounded-xl hover:bg-red-950/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#090a0c]">
      {/* Top Bar */}
      <header className="h-13 border-b border-[#1a3a1a]/60 sticky top-0 z-40 px-4 flex items-center justify-between" style={{ background: "linear-gradient(90deg, #0b1a0c 0%, #090e09 100%)", height: "52px" }}>
        {/* Left: Hamburger + brand */}
        <div className="flex items-center gap-3">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-xl transition-all text-[#4a9a3a]/70 hover:text-[#4a9a3a] hover:bg-[#2d6a2d]/15 border border-[#2d6a2d]/20"
                data-testid="btn-menu"
              >
                <Menu className="h-[16px] w-[16px]" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0 border-r border-[#2d6a2d]/20" style={{ background: "transparent" }}>
              <NavContent />
            </SheetContent>
          </Sheet>

          <span className="text-sm font-black tracking-tight text-white">NYC<span className="text-[#4a9a3a]">HQ</span></span>
        </div>

        {/* Right: Balance + User */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              <Link href="/">
                <button
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold font-mono transition-all border"
                  style={{
                    background: "rgba(45,106,45,0.15)",
                    borderColor: "rgba(45,106,45,0.3)",
                    color: "#6abf5a",
                  }}
                  data-testid="btn-balance"
                >
                  <span>${balanceDollars}</span>
                  <Plus className="h-2.5 w-2.5 opacity-60" />
                </button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors" data-testid="btn-user-dropdown">
                    <span className="max-w-[80px] truncate">{user.username}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="border text-white text-xs min-w-[200px] rounded-2xl"
                  style={{ background: "#0d1a0e", borderColor: "rgba(45,106,45,0.25)" }}
                  align="end"
                >
                  <div className="px-3 py-2.5 border-b" style={{ borderColor: "rgba(45,106,45,0.2)" }}>
                    <p className="text-[10px] text-[#4a9a3a]/60 truncate">{user.username}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/my-code">
                      <div className="flex items-center gap-2 cursor-pointer w-full text-xs py-1 text-white/60 hover:text-white">
                        <KeyRound className="h-3 w-3" />
                        Login Code
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  {(user as any)?.isWorker && (
                    <DropdownMenuItem asChild>
                      <Link href="/worker">
                        <div className="flex items-center gap-2 cursor-pointer w-full text-xs py-1 text-white/60 hover:text-white">
                          <Briefcase className="h-3 w-3" />
                          Worker Dashboard
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator style={{ background: "rgba(45,106,45,0.2)" }} />
                  <DropdownMenuItem onClick={() => logout()} className="text-red-400/70 hover:text-red-300 cursor-pointer text-xs focus:text-red-300 focus:bg-red-950/30">
                    <LogOut className="h-3 w-3 mr-2" />
                    Sign out
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
