import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Menu,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCart } from "@/hooks/use-cart";
import { useVerification } from "@/hooks/use-verification";
import { RulesModal } from "@/components/RulesModal";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading: isUserLoading } = useAuth();
  const { items, setUserId } = useCart();
  const { isApproved } = useVerification(!!user && !isUserLoading);

  useEffect(() => {
    if (!isUserLoading) {
      setUserId(user?.id ?? null);
    }
  }, [user?.id, isUserLoading]);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const cartCount = items.length;

  const { data: mailsData } = useQuery<any[]>({
    queryKey: ["/api/mails"],
    enabled: !!user && isApproved,
    refetchInterval: 30000,
  });

  const hasUnread = (mailsData?.filter(m => !m.isRead).length ?? 0) > 0;

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#0f1115] text-[#e1e1e1] py-8 px-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-display font-black tracking-tighter italic">
          RULF<span className="text-primary italic"> BULK</span>
        </h1>
      </div>

      <div className="flex flex-col gap-4 text-left">
        <Link href="/" onClick={() => setIsMobileOpen(false)}>
          <span className="text-sm font-bold hover:text-primary transition-colors cursor-pointer uppercase tracking-wider">Shop</span>
        </Link>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-bold hover:text-primary transition-colors group uppercase tracking-wider">
            Profile <ChevronDown className="h-4 w-4 group-data-[state=open]:rotate-180 transition-transform" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 pt-3 space-y-3">
            <Link href="/profile" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-xs text-muted-foreground hover:text-primary cursor-pointer tracking-widest font-bold uppercase">PROFILE</span>
            </Link>
            <Link href="/profile?tab=orders" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-xs text-muted-foreground hover:text-primary cursor-pointer tracking-widest font-bold uppercase">ORDERS</span>
            </Link>
            <Link href="/profile?tab=settings" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-xs text-muted-foreground hover:text-primary cursor-pointer tracking-widest font-bold uppercase">SETTINGS</span>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        <Link href="/cart" onClick={() => setIsMobileOpen(false)}>
          <div className="flex items-center justify-between w-full text-sm font-bold hover:text-primary transition-colors cursor-pointer uppercase tracking-wider">
            Cart {cartCount > 0 && <span className="text-[10px] bg-primary px-1.5 py-0.5 rounded-full text-white">{cartCount}</span>}
          </div>
        </Link>

        {isApproved && (
          <Link href="/mailbox" onClick={() => setIsMobileOpen(false)}>
            <div className="flex items-center justify-between w-full text-sm font-bold hover:text-primary transition-colors cursor-pointer uppercase tracking-wider">
              <span className="flex items-center gap-2">
                Mails
                {hasUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
              </span>
            </div>
          </Link>
        )}

        {isApproved && (
          <button
            onClick={() => { setShowRules(true); setIsMobileOpen(false); }}
            className="text-sm font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider text-left"
          >
            Rules
          </button>
        )}

        {user?.role === 'admin' && (
          <Link href="/admin" onClick={() => setIsMobileOpen(false)}>
            <span className="text-sm font-bold text-destructive hover:opacity-80 transition-opacity cursor-pointer tracking-wider uppercase">Admin</span>
          </Link>
        )}

        {user && (
          <button 
            onClick={() => { logout(); setIsMobileOpen(false); }}
            className="text-sm font-bold text-muted-foreground hover:text-destructive transition-colors mt-4 uppercase text-left tracking-wider"
          >
            Logout
          </button>
        )}
      </div>

      <div className="mt-auto pt-8 border-t border-white/5">
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_theme('colors.green.500')]" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Best Logs 🪵</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#090a0c]">
      <header className="h-14 border-b border-white/5 bg-[#090a0c]/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <h1 className="text-lg font-display font-black tracking-tighter italic text-white">
              RULF<span className="text-primary italic"> BULK</span>
            </h1>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative text-white/70 hover:text-white hover:bg-white/5">
                <Menu className="h-5 w-5" />
                {isApproved && hasUnread && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
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

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
