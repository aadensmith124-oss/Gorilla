import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, ArrowRight, Loader2, Trash2, Wallet, X, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

const CHIME_FEE_PERCENT = 15;

type PaymentMethod = "balance" | "chime";

function ChimeIcon() {
  return (
    <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#1ec677" }}>
      <span className="text-white font-black text-base leading-none" style={{ fontFamily: "sans-serif" }}>C</span>
    </div>
  );
}

interface ChimeInstructionsProps {
  orderId: string;
  total: number;
  chimeTag: string;
  onClose: () => void;
}

function ChimeInstructions({ orderId, total, chimeTag, onClose }: ChimeInstructionsProps) {
  const [, setLocation] = useLocation();
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#16181d] rounded-2xl border border-white/8 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-tight text-white">Chime Payment</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl p-4 text-center space-y-2" style={{ background: "rgba(30,198,119,0.1)", border: "1px solid rgba(30,198,119,0.25)" }}>
          <ChimeIcon />
          <p className="text-2xl font-black text-white font-mono mt-2">{chimeTag || "Contact Support"}</p>
          <p className="text-sm text-muted-foreground">Send exactly</p>
          <p className="text-3xl font-black" style={{ color: "#1ec677" }}>${(total / 100).toFixed(2)}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reference / Note</p>
          <p className="text-sm font-bold text-white font-mono">Order {orderId}</p>
          <p className="text-xs text-muted-foreground">Include this in the Chime note/memo</p>
        </div>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          After sending payment your order will be fulfilled by an admin. Contact support if not fulfilled within 4 hours.
        </p>

        <div className="space-y-2">
          <a
            href={`https://chime.com/`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-colors"
            style={{ background: "#1ec677" }}
          >
            <ExternalLink className="h-4 w-4" /> Open Chime
          </a>
          <button
            onClick={() => { onClose(); setLocation("/profile?tab=orders"); }}
            className="w-full h-11 rounded-xl font-bold text-sm border border-white/10 text-muted-foreground hover:text-white hover:border-white/20 transition-colors"
          >
            View My Orders
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("balance");
  const [chimeModal, setChimeModal] = useState<{ orderId: string; total: number; chimeTag: string } | null>(null);

  const cartTotal = total();
  const userBalance = user?.balance || 0;
  const hasEnoughBalance = userBalance >= cartTotal;

  const chimeFee = Math.round(cartTotal * CHIME_FEE_PERCENT / 100);
  const chimeTotal = cartTotal + chimeFee;

  const displayTotal = selectedMethod === "chime" ? chimeTotal : cartTotal;

  const chimeOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItems = items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
      const res = await apiRequest("POST", "/api/orders/chime", { items: cartItems });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Order failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      clearCart();
      setChimeModal({
        orderId: data.order?.orderId || `#${data.order?.id}`,
        total: chimeTotal,
        chimeTag: data.chimeTag || "",
      });
    },
    onError: (error: any) => {
      toast({ title: "Checkout failed", description: error.message || "Could not create order.", variant: "destructive" });
    },
  });

  const balanceOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItems = items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
      const res = await apiRequest("POST", api.orders.create.path, { items: cartItems });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Order failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Order placed!", description: "Your items are ready. Check your orders." });
      if (data.orderId) setLocation(`/order/${data.orderId}`);
      else setLocation("/profile?tab=orders");
    },
    onError: (error: any) => {
      toast({ title: "Checkout failed", description: error.message || "Could not create order.", variant: "destructive" });
    },
  });

  const isPending = chimeOrderMutation.isPending || balanceOrderMutation.isPending;

  const handleCheckout = () => {
    if (!user) return setLocation("/auth");
    if (selectedMethod === "balance") {
      if (!hasEnoughBalance) {
        toast({ title: "Insufficient balance", description: `You need $${(cartTotal / 100).toFixed(2)} but have $${(userBalance / 100).toFixed(2)}.`, variant: "destructive" });
        return;
      }
      balanceOrderMutation.mutate();
    } else if (selectedMethod === "chime") {
      chimeOrderMutation.mutate();
    }
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      toast({ title: "Invalid coupon", description: "This coupon code is not valid or has expired.", variant: "destructive" });
    }
  };

  if (items.length === 0 && !chimeModal) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 max-w-sm mx-auto text-center">
        <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center">
          <ShoppingCart className="h-9 w-9 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground">Add some products to get started.</p>
        </div>
        <Link href="/">
          <Button size="sm" className="gap-2" data-testid="button-browse-shop">
            Browse Shop <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {chimeModal && (
        <ChimeInstructions
          orderId={chimeModal.orderId}
          total={chimeModal.total}
          chimeTag={chimeModal.chimeTag}
          onClose={() => setChimeModal(null)}
        />
      )}

      <div className="max-w-lg mx-auto w-full space-y-5 pb-20">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Your Cart Products</h2>
          <div className="bg-[#0d1017] border border-white/8 rounded-xl overflow-hidden divide-y divide-white/5">
            {items.map((item) => (
              <div key={`v-${item.variantId}`} className="flex items-start gap-3 p-4" data-testid={`card-cart-item-${item.variantId}`}>
                <div className="h-12 w-12 rounded-lg bg-[#151b26] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-lg font-black text-white/30">{item.productName?.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tight leading-tight">{item.productName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.variantName}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      data-testid={`button-remove-item-${item.variantId}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Price : <span className="text-white">${(item.price / 100).toFixed(2)}</span></span>
                    <span>QTY : <span className="text-white">{item.quantity}</span></span>
                    <span>Total : <span className="text-white">${((item.price * item.quantity) / 100).toFixed(2)}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/5" />

        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Apply Coupon Code</h2>
          <div className="flex gap-0 bg-[#0d1017] border border-white/8 rounded-xl overflow-hidden">
            <Input
              placeholder="your coupon here ..."
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 bg-transparent border-0 text-white placeholder:text-white/20 text-sm focus-visible:ring-0 rounded-none h-11"
              data-testid="input-coupon"
            />
            <button
              onClick={handleApplyCoupon}
              className="px-4 text-xs font-bold text-muted-foreground hover:text-white transition-colors border-l border-white/8"
              data-testid="button-apply-coupon"
            >
              APPLY
            </button>
          </div>
        </div>

        <div className="bg-[#0d1017] border border-white/8 rounded-xl p-4 space-y-2.5">
          <h2 className="text-sm font-bold text-white mb-3">Order Details</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal :</span>
            <span className="text-white">${(cartTotal / 100).toFixed(2)}</span>
          </div>
          {selectedMethod === "chime" && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Chime Fee (+{CHIME_FEE_PERCENT}%) :</span>
              <span className="text-red-400">${(chimeFee / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount :</span>
            <span className="text-white">$0</span>
          </div>
          <div className="h-px bg-white/5 my-1" />
          <div className="flex justify-between text-sm font-bold">
            <span className="text-white">Total :</span>
            <span className="text-white">${(displayTotal / 100).toFixed(2)}</span>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Select Payment Processor</h2>
          <div className="space-y-2">
            {/* Chime option */}
            <button
              onClick={() => setSelectedMethod("chime")}
              data-testid="button-payment-chime"
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                selectedMethod === "chime"
                  ? "border-white/20 bg-white/8"
                  : "border-white/8 bg-[#0d1017] hover:border-white/15"
              }`}
            >
              <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedMethod === "chime" ? "border-white" : "border-white/30"}`}>
                {selectedMethod === "chime" && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
              </div>
              <ChimeIcon />
              <span className="flex-1 text-left text-sm font-bold text-white">Chime</span>
              <span className="text-sm font-bold text-red-400">+{CHIME_FEE_PERCENT}% fee</span>
            </button>

            {/* Balance option */}
            <button
              onClick={() => setSelectedMethod("balance")}
              data-testid="button-payment-balance"
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                selectedMethod === "balance"
                  ? "border-white/20 bg-white/8"
                  : "border-white/8 bg-[#0d1017] hover:border-white/15"
              }`}
            >
              <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedMethod === "balance" ? "border-white" : "border-white/30"}`}>
                {selectedMethod === "balance" && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
              </div>
              <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="flex-1 text-left text-sm font-bold text-white">Balance</span>
              <span className={`text-sm font-bold ${hasEnoughBalance ? "text-green-400" : "text-red-400"}`}>
                You have ${(userBalance / 100).toFixed(2)}
              </span>
            </button>
          </div>
        </div>

        <Button
          className="w-full h-12 text-sm font-bold bg-[#1a3ecf] hover:bg-[#1e4aed] text-white rounded-xl"
          disabled={isPending}
          onClick={handleCheckout}
          data-testid="button-proceed-payment"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Purchase
        </Button>
      </div>
    </>
  );
}
