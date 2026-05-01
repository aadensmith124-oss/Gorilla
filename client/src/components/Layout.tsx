import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Menu, ShoppingCart, Plus, ChevronDown, LogOut, User, Settings, CreditCard, FileText, Send, Home, Package, Store, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading: isUserLoading } = useAuth();
  const { items, setUserId } = useCart();
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading) {
      setUserId(user?.id ?? null);
    }
  }, [user?.id, isUserLoading]);

  const { data: sellerStatus } = useQuery<{ isSeller: boolean; sellerBalance: number; application?: any }>({
    queryKey: ["/api/seller/status"],
    enabled: !!user,
  });

  const cartCount = items.length;
  const balanceDollars = user ? (user.balance / 100).toFixed(2) : "0.00";

  const navSections = [
    {
      label: "MAIN",
      items: [
        { href: "/", icon: Home, label: "Deposit" },
        { href: "/orders", icon: Package, label: "Orders" },
      ],
    },
    {
      label: "SHOP",
      items: [
        { href: "/shop", icon: FileText, label: "Logs" },
        { href: "/cards", icon: CreditCard, label: "Cards" },
      ],
    },
    {
      label: "SUPPORT",
      items: [
        { href: "/support", icon: FileText, label: "Tickets" },
        { href: "https://t.me/", icon: Send, label: "Telegram Channel", external: true },
      ],
    },
    ...(user?.role === "admin" ? [{
      label: "ADMIN",
      items: [
        { href: "/admin", icon: Settings, label: "Admin Panel" },
      ],
    }] : []),
    ...((sellerStatus?.isSeller) ? [{
      label: "SELLER",
      items: [
        { href: "/seller", icon: LayoutDashboard, label: "Seller Dashboard" },
      ],
    }] : (!sellerStatus?.isSeller && user ? [{
      label: "SELLER",
      items: [
        { href: "/become-seller", icon: Store, label: "Become Seller" },
      ],
    }] : [])),
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#0e0e0e] text-white overflow-y-auto">
      <div className="px-4 py-5 border-b border-white/5">
        <span className="text-lg font-bold tracking-tight text-white">TRENT <span className="text-primary">HQ</span></span>
      </div>

      <div className="flex flex-col gap-6 p-4 flex-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold text-white/30 tracking-widest mb-2">{section.label}</p>
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
                      className="flex items-center gap-3 px-3 py-2 rounded text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                    <div className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all cursor-pointer ${isActive ? "bg-primary/20 text-primary font-medium" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
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
        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => { logout(); setIsMobileOpen(false); }}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            log out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      {/* Top Bar */}
      <header className="h-12 border-b border-white/5 bg-[#0c0c0c] sticky top-0 z-40 px-3 flex items-center justify-between">
        {/* Left: Hamburger */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded" data-testid="btn-menu">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-0 border-r border-white/5 bg-[#0e0e0e]">
            <NavContent />
          </SheetContent>
        </Sheet>

        {/* Center/Right: Balance + Cart + User */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              <Link href="/">
                <button className="flex items-center gap-1.5 border border-white/10 rounded px-2.5 py-1 text-sm font-mono text-white hover:border-white/20 transition-colors" data-testid="btn-balance">
                  <span>${balanceDollars}</span>
                  <Plus className="h-3 w-3 text-white/50" />
                </button>
              </Link>

              <Link href="/cart">
                <button className="relative flex items-center border border-white/10 rounded px-2.5 py-1.5 text-white/70 hover:border-white/20 hover:text-white transition-colors" data-testid="btn-cart">
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <span className="ml-1.5 text-xs font-bold text-white">({cartCount})</span>
                  )}
                </button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors" data-testid="btn-user-dropdown">
                    <span className="max-w-[100px] truncate">{user.username}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#111] border-white/10 text-white" align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <div className="flex items-center gap-2 cursor-pointer w-full">
                        <User className="h-3.5 w-3.5" />
                        Profile
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <div className="flex items-center gap-2 cursor-pointer w-full">
                        <Package className="h-3.5 w-3.5" />
                        Orders
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={logout} className="text-white/50 hover:text-white cursor-pointer">
                    <LogOut className="h-3.5 w-3.5 mr-2" />
                    Logout
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
