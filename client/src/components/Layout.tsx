import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  ShoppingCart, 
  Gamepad2, 
  User, 
  Settings, 
  LogOut, 
  Menu,
  Store,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { items, total } = useCart();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    { href: "/", label: "Shop", icon: Store },
    { href: "/games", label: "Games", icon: Gamepad2 },
  ];

  const adminNav = user?.role === "admin" ? [
    { href: "/admin", label: "Admin Panel", icon: Settings },
  ] : [];

  const NavContent = () => (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-2 px-2 py-6">
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
          <Gamepad2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-xl tracking-wider text-primary">
          NEXUS<span className="text-white">STORE</span>
        </span>
      </div>

      <div className="flex-1 space-y-1">
        {[...navItems, ...adminNav].map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer group ${
                  isActive 
                    ? "bg-primary/20 text-primary border-r-2 border-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "group-hover:text-primary"}`} />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="mt-auto p-4 border-t border-border bg-card/30 rounded-t-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-muted-foreground uppercase">Balance</span>
            <span className="font-mono font-bold text-green-400">
              ${(user.balance / 100).toFixed(2)}
            </span>
          </div>
          <Link href="/profile">
             <Button variant="outline" className="w-full justify-start gap-2 mb-2" size="sm">
                <Wallet className="h-4 w-4" /> Top Up
             </Button>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/20 backdrop-blur-sm fixed inset-y-0 z-50">
        <div className="px-4 h-full">
          <NavContent />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r border-border bg-background">
          <div className="px-4 h-full">
            <NavContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col relative z-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            {/* Announcement ticker could go here */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>System Operational</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative hover:bg-primary/20">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-[10px] font-bold flex items-center justify-center rounded-full text-white ring-2 ring-background">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 hover:bg-primary/20">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:inline font-medium">{user.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/profile?tab=orders">
                    <DropdownMenuItem className="cursor-pointer">
                      <Store className="mr-2 h-4 w-4" /> Orders
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="cursor-pointer text-red-400 focus:text-red-400" onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button size="sm" className="bg-primary hover:bg-primary/80 font-semibold">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
