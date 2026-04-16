import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, ArrowRight, Loader2, Trash2, Wallet, Copy, X, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SiCashapp } from "react-icons/si";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

const CASHAPP_FEE_PERCENT = 3;

type PaymentMethod = "balance" | "cashapp";

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
            <span className="text-sm font-black text-white uppercase tracking-widest">CashApp Payment</span>
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
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Send to</p>
              <p className="text-sm font-bold text-[#00D632]">{cashappTag || "$YourCashTag"}</p>
            </div>
            <button onClick={() => copy(cashappTag, "CashApp tag")} className="text-white/30 hover:text-white transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Amount</p>
              <p className="text-sm font-bold text-white">${(total / 100).toFixed(2)}</p>
            </div>
            <button onClick={() => copy((total / 100).toFixed(2), "Amount")} className="text-white/30 hover:text-white transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-0.5">Note (required)</p>
              <p className="text-sm font-bold text-amber-300 font-mono">{paymentNote}</p>
            </div>
            <button onClick={() => copy(paymentNote, "Note")} className="text-amber-400/50 hover:text-amber-300 transition-colors">
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
          className="w-full bg-[#00D632] hover:bg-[#00C02C] text-black font-black text-xs uppercase tracking-widest"
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

  // If selected method gets disabled, switch to the other
  useEffect(() => {
    if (selectedMethod === "cashapp" && !cashappEnabled) setSelectedMethod("balance");
    if (selectedMethod === "balance" && !walletEnabled && cashappEnabled) setSelectedMethod("cashapp");
  }, [cashappEnabled, walletEnabled, selectedMethod]);

  const cashappFee = Math.round(cartTotal * CASHAPP_FEE_PERCENT / 100);
  const displayTotal = selectedMethod === "cashapp" ? cartTotal + cashappFee : cartTotal;

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

  const isPending = cashappOrderMutation.isPending || balanceOrderMutation.isPending;

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

      <div className="max-w-lg mx-auto w-full space-y-5 pb-20">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Your Cart Products</h2>
          <div className="bg-[#0d1017] border border-white/8 rounded-xl overflow-hidden divide-y divide-white/5">
            {items.map((item) => (
              <div key={`v-${item.variantId}`} className="flex items-start gap-3 p-3" data-testid={`card-cart-item-${item.variantId}`}>
                <div className="h-10 w-10 rounded-lg bg-[#151b26] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-base font-black text-white/30">{item.productName?.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-tight leading-tight">{item.productName}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.variantName}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      data-testid={`button-remove-item-${item.variantId}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>Price: <span className="text-white">${(item.price / 100).toFixed(2)}</span></span>
                    <span>Qty: <span className="text-white">{item.quantity}</span></span>
                    <span>Total: <span className="text-white">${((item.price * item.quantity) / 100).toFixed(2)}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/5" />

        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Apply Coupon Code</h2>
          <div className="flex bg-[#0d1017] border border-white/8 rounded-xl overflow-hidden">
            <Input
              placeholder="your coupon here ..."
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 bg-transparent border-0 text-white placeholder:text-white/20 text-xs focus-visible:ring-0 rounded-none h-9"
              data-testid="input-coupon"
            />
            <button
              onClick={handleApplyCoupon}
              className="px-3 text-[10px] font-bold text-muted-foreground hover:text-white transition-colors border-l border-white/8"
              data-testid="button-apply-coupon"
            >
              APPLY
            </button>
          </div>
        </div>

        <div className="bg-[#0d1017] border border-white/8 rounded-xl p-3.5 space-y-2">
          <h2 className="text-xs font-bold text-white mb-2">Order Details</h2>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-white">${(cartTotal / 100).toFixed(2)}</span>
          </div>
          {selectedMethod === "cashapp" && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">CashApp Fee (+{CASHAPP_FEE_PERCENT}%)</span>
              <span className="text-green-400">+${(cashappFee / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-white">$0.00</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex justify-between text-xs font-bold">
            <span className="text-white">Total</span>
            <span className="text-white">${(displayTotal / 100).toFixed(2)}</span>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-2">Payment Method</h2>
          <div className="space-y-1.5">
            {/* CashApp option */}
            {cashappEnabled && (
              <button
                onClick={() => setSelectedMethod("cashapp")}
                data-testid="button-payment-cashapp"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  selectedMethod === "cashapp"
                    ? "border-[#00D632]/30 bg-[#00D632]/5"
                    : "border-white/8 bg-[#0d1017] hover:border-white/15"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedMethod === "cashapp" ? "border-[#00D632]" : "border-white/30"}`}>
                  {selectedMethod === "cashapp" && <div className="h-2 w-2 rounded-full bg-[#00D632]" />}
                </div>
                <SiCashapp className="h-5 w-5 text-[#00D632] flex-shrink-0" />
                <span className="flex-1 text-left text-xs font-bold text-white">CashApp</span>
                <span className="text-[11px] font-bold text-green-400">+{CASHAPP_FEE_PERCENT}% fee</span>
              </button>
            )}

            {/* Balance option */}
            {walletEnabled && (
              <button
                onClick={() => setSelectedMethod("balance")}
                data-testid="button-payment-balance"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  selectedMethod === "balance"
                    ? "border-white/20 bg-white/5"
                    : "border-white/8 bg-[#0d1017] hover:border-white/15"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedMethod === "balance" ? "border-white" : "border-white/30"}`}>
                  {selectedMethod === "balance" && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <Wallet className="h-4 w-4 text-white/70 flex-shrink-0" />
                <span className="flex-1 text-left text-xs font-bold text-white">Balance</span>
                <span className={`text-[11px] font-bold ${hasEnoughBalance ? "text-green-400" : "text-red-400"}`}>
                  ${(userBalance / 100).toFixed(2)}
                </span>
              </button>
            )}
          </div>
        </div>

        <Button
          className="w-full h-10 text-xs font-bold bg-[#1a3ecf] hover:bg-[#1e4aed] text-white rounded-xl"
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
