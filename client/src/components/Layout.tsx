import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, Plus, ChevronDown, LogOut, KeyRound, Settings, Send, Home, Package, Store, LayoutDashboard, Trophy, Briefcase, Bot, BadgeCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-6">
        <span className="text-base font-bold tracking-tight text-white">NYC<span className="text-white/35">HQ</span></span>
      </div>

      <div className="flex flex-col gap-5 px-3 flex-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-semibold text-white/25 tracking-[0.15em] uppercase mb-1.5 px-2">{section.label}</p>
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
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/[0.05] transition-all"
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
                        ? "bg-white/[0.08] text-white font-semibold"
                        : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                    }`}>
                      <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-white" : "text-white/40"}`} />
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
        <div className="p-4 mt-4">
          <button
            onClick={() => { logout(); setIsMobileOpen(false); }}
            className="flex items-center gap-2.5 text-xs text-white/30 hover:text-white/60 transition-colors w-full px-3 py-2 rounded-xl hover:bg-white/[0.04]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top Bar */}
      <header className="h-12 border-b border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-40 px-4 flex items-center justify-between">
        {/* Left: Hamburger */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <button className="h-8 w-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all" data-testid="btn-menu">
              <Menu className="h-[17px] w-[17px]" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[248px] p-0 border-r border-white/[0.06] bg-[#0a0a0a]">
            <NavContent />
          </SheetContent>
        </Sheet>

        {/* Right: Balance + User */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              <Link href="/">
                <button
                  className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-mono text-white/80 hover:text-white transition-all"
                  data-testid="btn-balance"
                >
                  <span>${balanceDollars}</span>
                  <Plus className="h-2.5 w-2.5 text-white/40" />
                </button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors" data-testid="btn-user-dropdown">
                    <span className="max-w-[80px] truncate">{user.username}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#111] border-white/[0.08] text-white text-xs min-w-[200px] rounded-2xl" align="end">
                  <div className="px-3 py-2.5 border-b border-white/[0.08]">
                    <p className="text-[10px] text-white/30 truncate">{user.username}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/my-code">
                      <div className="flex items-center gap-2 cursor-pointer w-full text-xs py-1">
                        <KeyRound className="h-3 w-3" />
                        Login Code
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  {(user as any)?.isWorker && (
                    <DropdownMenuItem asChild>
                      <Link href="/worker">
                        <div className="flex items-center gap-2 cursor-pointer w-full text-xs py-1">
                          <Briefcase className="h-3 w-3" />
                          Worker Dashboard
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem onClick={() => logout()} className="text-red-400 hover:text-red-300 cursor-pointer text-xs focus:text-red-300 focus:bg-red-950/30">
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
