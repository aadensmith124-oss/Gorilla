import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Menu,
  ChevronDown,
} from "lucide-react";
import logoImg from "@assets/IMG_6987_1776367750874.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCart } from "@/hooks/use-cart";
import { useState, useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading: isUserLoading } = useAuth();
  const { items, setUserId } = useCart();

  useEffect(() => {
    if (!isUserLoading) {
      setUserId(user?.id ?? null);
    }
  }, [user?.id, isUserLoading]);

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const cartCount = items.length;

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#0f1115] text-[#e1e1e1] py-8 px-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <span className="text-base font-bold text-white">
          CASHPLUG.CC
        </span>
      </div>

      <div className="flex flex-col gap-4 text-left">
        <Link href="/" onClick={() => setIsMobileOpen(false)}>
          <span className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors cursor-pointer">Shop</span>
        </Link>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors group">
            Profile <ChevronDown className="h-3.5 w-3.5 group-data-[state=open]:rotate-180 transition-transform" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 pt-3 space-y-3">
            <Link href="/profile" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary cursor-pointer">Profile</span>
            </Link>
            <Link href="/profile?tab=orders" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary cursor-pointer">Orders</span>
            </Link>
            <Link href="/profile?tab=settings" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary cursor-pointer">Settings</span>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        <Link href="/cart" onClick={() => setIsMobileOpen(false)}>
          <div className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors cursor-pointer">
            Cart {cartCount > 0 && <span className="text-[10px] bg-primary px-1.5 py-0.5 rounded-full text-black font-bold">{cartCount}</span>}
          </div>
        </Link>

        {user?.role === 'admin' && (
          <Link href="/admin" onClick={() => setIsMobileOpen(false)}>
            <span className="text-xs font-bold uppercase tracking-widest text-destructive hover:opacity-80 transition-opacity cursor-pointer">Admin</span>
          </Link>
        )}

        {user && (
          <button 
            onClick={() => { logout(); setIsMobileOpen(false); }}
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors mt-4 text-left"
          >
            Logout
          </button>
        )}
      </div>

      <div className="mt-auto pt-8 border-t border-white/5">
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_theme('colors.green.500')]" />
          <span className="text-[11px] text-muted-foreground">Online</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#090a0c]">
      <header className="h-14 border-b border-white/5 bg-[#090a0c]/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <img src={logoImg} alt="CASHPLUG SHOP" className="h-12 w-auto max-w-[220px] object-contain" style={{ mixBlendMode: "screen" }} />
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative text-white/70 hover:text-white hover:bg-white/5">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0 border-l border-white/5 bg-[#0f1115]">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 min-h-screen relative z-0">
        <div className="p-4 md:p-8 overflow-x-hidden max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

    </div>
  );
}
