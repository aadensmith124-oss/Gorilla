import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, ArrowRight, Loader2, Trash2, Wallet, Copy, X, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SiCashapp, SiBitcoin } from "react-icons/si";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

const CASHAPP_FEE_PERCENT = 0;
const CRYPTO_FEE_PERCENT = 3;

type PaymentMethod = "balance" | "cashapp" | "crypto";

function CashAppModal({ orderId, total, paymentNote, cashappTag, onClose }: {
  orderId: string;
  total: number;
  paymentNote: string;
  cashappTag: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val).then(() => toast({ title: `${label} copied` }));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-[#0d1017] border border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SiCashapp className="h-5 w-5 text-[#00D632]" />
            <span className="text-sm text-white">CashApp Payment</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-white/50 leading-relaxed">
          Send the exact amount below to the CashApp tag. You <strong className="text-white">must</strong> include the note — it's how we match your order.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] text-white/40 mb-0.5">Send to</p>
              <p className="text-sm font-bold text-[#00D632]">{cashappTag || "$YourCashTag"}</p>
            </div>
            <button onClick={() => copy(cashappTag, "CashApp tag")} className="text-white/30 hover:text-white transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] text-white/40 mb-0.5">Amount</p>
              <p className="text-sm font-bold text-white">${(total / 100).toFixed(2)}</p>
            </div>
            <button onClick={() => copy((total / 100).toFixed(2), "Amount")} className="text-white/30 hover:text-white transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between bg-lime-500/10 border border-lime-500/20 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] text-lime-400/70 mb-0.5">Note (required)</p>
              <p className="text-sm font-bold text-lime-300 font-mono">{paymentNote}</p>
            </div>
            <button onClick={() => copy(paymentNote, "Note")} className="text-lime-400/50 hover:text-lime-300 transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-white/5 rounded-xl px-3 py-2.5">
          <Clock className="h-3.5 w-3.5 text-white/40 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/40 leading-relaxed">
            Order <span className="text-white font-mono">{orderId}</span> is pending. It takes <strong className="text-white">up to 4 hours</strong> to be pushed after payment. If not received, contact support.
          </p>
        </div>

        <Button
          size="sm"
          className="w-full bg-[#00D632] hover:bg-[#00C02C] text-black text-xs"
          onClick={onClose}
        >
          Done — I've sent it
        </Button>
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
  const [cashappModal, setCashappModal] = useState<{ orderId: string; total: number; paymentNote: string; cashappTag: string } | null>(null);

  const cartTotal = total();
  const userBalance = user?.balance || 0;
  const hasEnoughBalance = userBalance >= cartTotal;

  const { data: enabledMethods } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/payment-methods"],
  });
  const cashappEnabled = enabledMethods?.cashapp !== false;
  const walletEnabled = enabledMethods?.wallet !== false;
  const cryptoEnabled = enabledMethods?.crypto !== false;

  // If selected method gets disabled, switch to another available one
  useEffect(() => {
    if (selectedMethod === "cashapp" && !cashappEnabled) {
      setSelectedMethod(walletEnabled ? "balance" : cryptoEnabled ? "crypto" : "balance");
    }
    if (selectedMethod === "balance" && !walletEnabled) {
      setSelectedMethod(cashappEnabled ? "cashapp" : cryptoEnabled ? "crypto" : "balance");
    }
    if (selectedMethod === "crypto" && !cryptoEnabled) {
      setSelectedMethod(walletEnabled ? "balance" : cashappEnabled ? "cashapp" : "balance");
    }
  }, [cashappEnabled, walletEnabled, cryptoEnabled, selectedMethod]);

  const cashappFee = Math.round(cartTotal * CASHAPP_FEE_PERCENT / 100);
  const cryptoFee = Math.round(cartTotal * CRYPTO_FEE_PERCENT / 100);
  const displayTotal = selectedMethod === "cashapp"
    ? cartTotal + cashappFee
    : selectedMethod === "crypto"
      ? cartTotal + cryptoFee
      : cartTotal;

  const cashappOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItems = items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
      const res = await apiRequest("POST", "/api/orders/cashapp", { items: cartItems });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Order failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      clearCart();
      setCashappModal({
        orderId: data.order?.orderId || "",
        total: data.order?.total || cartTotal + cashappFee,
        paymentNote: data.paymentNote || "",
        cashappTag: data.cashappTag || "",
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

  const cryptoOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItems = items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
      const res = await apiRequest("POST", "/api/orders/crypto", { items: cartItems });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Order failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      clearCart();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({ title: "Order placed!", description: "Your crypto order is pending." });
        setLocation("/profile?tab=orders");
      }
    },
    onError: (error: any) => {
      toast({ title: "Checkout failed", description: error.message || "Could not create order.", variant: "destructive" });
    },
  });

  const isPending = cashappOrderMutation.isPending || balanceOrderMutation.isPending || cryptoOrderMutation.isPending;

  const handleCheckout = () => {
    if (!user) return setLocation("/auth");
    if (selectedMethod === "balance") {
      if (!hasEnoughBalance) {
        toast({ title: "Insufficient balance", description: `You need $${(cartTotal / 100).toFixed(2)} but have $${(userBalance / 100).toFixed(2)}.`, variant: "destructive" });
        return;
      }
      balanceOrderMutation.mutate();
    } else if (selectedMethod === "cashapp") {
      cashappOrderMutation.mutate();
    } else if (selectedMethod === "crypto") {
      cryptoOrderMutation.mutate();
    }
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      toast({ title: "Invalid coupon", description: "This coupon code is not valid or has expired.", variant: "destructive" });
    }
  };

  if (items.length === 0 && !cashappModal) {
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
      {cashappModal && (
        <CashAppModal
          orderId={cashappModal.orderId}
          total={cashappModal.total}
          paymentNote={cashappModal.paymentNote}
          cashappTag={cashappModal.cashappTag}
          onClose={() => { setCashappModal(null); setLocation("/profile?tab=orders"); }}
        />
      )}

      <div className="max-w-lg mx-auto w-full space-y-4 pb-20">
        <div className="bg-[#0d1017] border border-white/[0.06] rounded-xl overflow-hidden divide-y divide-white/[0.05]">
          {items.map((item) => (
            <div key={`v-${item.variantId}`} className="flex items-center gap-3 px-3 py-3" data-testid={`card-cart-item-${item.variantId}`}>
              <div className="h-9 w-9 rounded-lg bg-[#151b26] overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.image ? (
                  <img src={item.image} alt={item.productName} className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-sm text-white/20">{item.productName?.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/90 leading-tight truncate">{item.productName}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{item.variantName} · {item.quantity}x · <span className="text-white/50">${((item.price * item.quantity) / 100).toFixed(2)}</span></p>
              </div>
              <button
                onClick={() => removeItem(item.variantId)}
                className="text-white/15 hover:text-white/50 transition-colors flex-shrink-0 p-1"
                data-testid={`button-remove-item-${item.variantId}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex bg-[#0d1017] border border-white/[0.06] rounded-xl overflow-hidden">
          <Input
            placeholder="Coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            className="flex-1 bg-transparent border-0 text-white placeholder:text-white/15 text-xs focus-visible:ring-0 rounded-none h-9"
            data-testid="input-coupon"
          />
          <button
            onClick={handleApplyCoupon}
            className="px-3 text-[10px] font-bold text-white/20 hover:text-white/60 transition-colors border-l border-white/[0.06]"
            data-testid="button-apply-coupon"
          >
            APPLY
          </button>
        </div>

        <div className="bg-[#0d1017] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Subtotal</span>
            <span className="text-white/80">${(cartTotal / 100).toFixed(2)}</span>
          </div>
          {selectedMethod === "crypto" && (
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Service fee (+{CRYPTO_FEE_PERCENT}%)</span>
              <span className="text-white/60">+${(cryptoFee / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="h-px bg-white/[0.05]" />
          <div className="flex justify-between text-xs">
            <span className="text-white font-bold text-sm">Total</span>
            <span className="text-white font-bold text-sm">${(displayTotal / 100).toFixed(2)}</span>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-white/70 mb-2 uppercase tracking-widest">Payment Method</h2>
          <div className="space-y-1">
            {cashappEnabled && (
              <button
                onClick={() => setSelectedMethod("cashapp")}
                data-testid="button-payment-cashapp"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  selectedMethod === "cashapp"
                    ? "border-white/20 bg-white/[0.04]"
                    : "border-white/[0.06] bg-[#0d1017] hover:border-white/10"
                }`}
              >
                <div className={`h-3.5 w-3.5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${selectedMethod === "cashapp" ? "border-primary" : "border-white/20"}`}>
                  {selectedMethod === "cashapp" && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <SiCashapp className="h-4 w-4 text-[#00D632]/70 flex-shrink-0" />
                <span className="flex-1 text-left text-xs font-semibold text-white/80">CashApp</span>
              </button>
            )}

            {cryptoEnabled && (
              <button
                onClick={() => setSelectedMethod("crypto")}
                data-testid="button-payment-crypto"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  selectedMethod === "crypto"
                    ? "border-white/20 bg-white/[0.04]"
                    : "border-white/[0.06] bg-[#0d1017] hover:border-white/10"
                }`}
              >
                <div className={`h-3.5 w-3.5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${selectedMethod === "crypto" ? "border-primary" : "border-white/20"}`}>
                  {selectedMethod === "crypto" && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <SiBitcoin className="h-4 w-4 text-[#f7931a] flex-shrink-0" />
                <span className="flex-1 text-left text-xs font-semibold text-white/80">Crypto</span>
                <span className="text-[10px] text-white/25">+{CRYPTO_FEE_PERCENT}%</span>
              </button>
            )}

            {walletEnabled && (
              <button
                onClick={() => setSelectedMethod("balance")}
                data-testid="button-payment-balance"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  selectedMethod === "balance"
                    ? "border-white/20 bg-white/[0.04]"
                    : "border-white/[0.06] bg-[#0d1017] hover:border-white/10"
                }`}
              >
                <div className={`h-3.5 w-3.5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${selectedMethod === "balance" ? "border-primary" : "border-white/20"}`}>
                  {selectedMethod === "balance" && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <Wallet className="h-4 w-4 text-white/30 flex-shrink-0" />
                <span className="flex-1 text-left text-xs font-semibold text-white/80">Balance</span>
                <span className={`text-[10px] ${hasEnoughBalance ? "text-white/40" : "text-red-400/70"}`}>
                  ${(userBalance / 100).toFixed(2)}
                </span>
              </button>
            )}
          </div>
        </div>

        <Button
          className="w-full h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-black rounded-xl uppercase tracking-widest"
          disabled={isPending}
          onClick={handleCheckout}
          data-testid="button-proceed-payment"
        >
          {isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Purchase
        </Button>
      </div>
    </>
  );
}
