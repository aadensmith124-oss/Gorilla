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
      items: [{ href: "/checker", icon: Bot, label: "Checker" }],
    }] : []),
    {
      label: "SUPPORT",
      items: [
        { href: "https://t.me/+5pZdw9Czcro1OTFh", icon: Send, label: "Telegram Support", external: true },
      ],
    },
    ...(features?.reseller !== false ? [{
      label: "RESELLER",
      items: [{ href: "/become-reseller", icon: BadgeCheck, label: "Become Reseller" }],
    }] : []),
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
    <div className="flex flex-col h-full overflow-y-auto bg-white">
      {/* Brand + close */}
      <div className="px-5 py-5 flex items-center justify-between border-b border-gray-100">
        <div>
          <span className="text-lg font-black tracking-tight text-gray-900">NYC</span>
          <span className="text-lg font-black tracking-tight" style={{ color: "#2d6a2d" }}>HQ</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* User pill */}
      {user && (
        <div className="mx-4 mt-4 mb-2 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(45,106,45,0.12)" }}>
            <span className="text-[11px] font-black uppercase" style={{ color: "#2d6a2d" }}>{user.username?.[0] || "U"}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-800 truncate">{user.username}</p>
            <p className="text-[10px] font-mono font-bold" style={{ color: "#2d6a2d" }}>${balanceDollars}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 px-3 py-3 flex-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-1 px-2.5 text-gray-400">{section.label}</p>
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
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isActive ? "font-bold" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                    style={isActive ? { background: "rgba(45,106,45,0.08)", color: "#2d6a2d", border: "1px solid rgba(45,106,45,0.15)" } : {}}
                    >
                      <item.icon className={`h-3.5 w-3.5 shrink-0`} style={isActive ? { color: "#2d6a2d" } : { color: "#9ca3af" }} />
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
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => { logout(); setIsMobileOpen(false); }}
            className="flex items-center gap-2.5 text-xs text-gray-400 hover:text-red-500 transition-colors w-full px-3 py-2 rounded-xl hover:bg-red-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );

  const isAuthPage = location === "/auth";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="h-[52px] border-b border-gray-200 bg-white sticky top-0 z-40 px-4 flex items-center justify-between shadow-sm">
        {/* Left: Hamburger + brand */}
        <div className="flex items-center gap-3">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-xl transition-all text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-gray-200"
                data-testid="btn-menu"
              >
                <Menu className="h-[16px] w-[16px]" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0 border-r border-gray-200 bg-white">
              <NavContent />
            </SheetContent>
          </Sheet>

          <span className="text-sm font-black tracking-tight text-gray-900">
            NYC<span style={{ color: "#2d6a2d" }}>HQ</span>
          </span>
        </div>

        {/* Right: Balance + User */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              <Link href="/">
                <button
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold font-mono transition-all border"
                  style={{
                    background: "rgba(45,106,45,0.08)",
                    borderColor: "rgba(45,106,45,0.25)",
                    color: "#2d6a2d",
                  }}
                  data-testid="btn-balance"
                >
                  <span>${balanceDollars}</span>
                  <Plus className="h-2.5 w-2.5 opacity-60" />
                </button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors" data-testid="btn-user-dropdown">
                    <span className="max-w-[80px] truncate">{user.username}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200 text-gray-800 text-xs min-w-[200px] rounded-2xl shadow-lg" align="end">
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <p className="text-[10px] text-gray-400 truncate">{user.username}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/my-code">
                      <div className="flex items-center gap-2 cursor-pointer w-full text-xs py-1 text-gray-600 hover:text-gray-900">
                        <KeyRound className="h-3 w-3" />
                        Login Code
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  {(user as any)?.isWorker && (
                    <DropdownMenuItem asChild>
                      <Link href="/worker">
                        <div className="flex items-center gap-2 cursor-pointer w-full text-xs py-1 text-gray-600 hover:text-gray-900">
                          <Briefcase className="h-3 w-3" />
                          Worker Dashboard
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => logout()} className="text-red-500 hover:text-red-600 cursor-pointer text-xs focus:text-red-600 focus:bg-red-50">
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
