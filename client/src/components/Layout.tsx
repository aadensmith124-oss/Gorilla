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
  Wallet,
  Sparkles
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
  Wallet,
  Sparkles,
  ChevronDown,
  History,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { items } = useCart();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const NavContent = () => (
    <div className="flex flex-col h-full bg-background text-foreground py-8 px-6">
      <div className="flex flex-col gap-6 text-center">
        <Link href="/" onClick={() => setIsMobileOpen(false)}>
          <span className="text-xl font-medium hover:text-primary transition-colors cursor-pointer">SHOP</span>
        </Link>

        <a 
          href="https://t.me/+4LVBYQu4T8UwODkx" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xl font-medium hover:text-primary transition-colors"
        >
          VOUCHES
        </a>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full text-xl font-medium hover:text-primary transition-colors group">
            FUN <ChevronDown className="h-5 w-5 group-data-[state=open]:rotate-180 transition-transform" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <Link href="/games" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-lg text-muted-foreground hover:text-primary cursor-pointer uppercase">Gamble</span>
            </Link>
            <Link href="/games" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-lg text-muted-foreground hover:text-primary cursor-pointer uppercase italic">Daily spin</span>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full text-xl font-medium hover:text-primary transition-colors group">
            PROFILE <ChevronDown className="h-5 w-5 group-data-[state=open]:rotate-180 transition-transform" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <Link href="/profile" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-lg text-muted-foreground hover:text-primary cursor-pointer uppercase">Top-Up</span>
            </Link>
            <Link href="/profile?tab=orders" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-lg text-muted-foreground hover:text-primary cursor-pointer uppercase">Orders</span>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        <a 
          href="https://t.me/Rulfccbot" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xl font-medium hover:text-primary transition-colors"
        >
          SUPPORT
        </a>

        <Link href="/cart" onClick={() => setIsMobileOpen(false)}>
          <div className="flex items-center justify-center gap-2 text-xl font-medium hover:text-primary transition-colors cursor-pointer">
            CART {cartCount > 0 && <span className="text-sm bg-primary px-2 py-0.5 rounded-full text-white">{cartCount}</span>}
          </div>
        </Link>

        {user?.role === "admin" && (
          <Link href="/8765" onClick={() => setIsMobileOpen(false)}>
            <span className="text-xl font-medium text-destructive hover:opacity-80 transition-opacity cursor-pointer">8765</span>
          </Link>
        )}

        {user && (
          <button 
            onClick={() => { logout(); setIsMobileOpen(false); }}
            className="text-xl font-medium text-muted-foreground hover:text-destructive transition-colors mt-4"
          >
            LOGOUT
          </button>
        )}
      </div>

      <div className="mt-auto text-center pt-8 border-t border-border">
        <h1 className="text-3xl font-display font-black tracking-tighter italic">
          RULF<span className="text-primary italic">.CC</span>
        </h1>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <h1 className="text-2xl font-display font-black tracking-tighter italic">
              RULF<span className="text-primary italic">.CC</span>
            </h1>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[350px] p-0 border-l border-border bg-background">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 min-h-screen relative z-0">
        <div className="p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
