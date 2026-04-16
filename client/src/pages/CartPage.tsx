import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SiBitcoin } from "react-icons/si";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Star } from "lucide-react";

type PaymentMethod = "crypto" | "stars";

const PAYMENT_OPTIONS: { id: PaymentMethod; icon: React.ReactNode; label: string }[] = [
  {
    id: "crypto",
    icon: <SiBitcoin className="h-5 w-5 text-amber-400" />,
    label: "Crypto",
  },
  {
    id: "stars",
    icon: <Star className="h-5 w-5 text-blue-400 fill-blue-400" />,
    label: "Telegram Stars",
  },
];

export default function CartPage() {
  const { items, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("crypto");

  const { data: paymentConfig } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/payment-methods"],
  });

  const enabledOptions = PAYMENT_OPTIONS.filter(
    (opt) => paymentConfig === undefined || paymentConfig[opt.id] !== false
  );

  const cartTotal = total();
  const discount = 0;
  const totalDue = cartTotal - discount;

  const cryptoOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItems = items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
      const res = await apiRequest("POST", "/api/orders/crypto", { items: cartItems });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.paymentId) {
        sessionStorage.setItem("lastForebitPaymentId", data.paymentId);
        sessionStorage.setItem("lastForebitPurpose", "order");
        if (data.order?.orderId) sessionStorage.setItem("lastForebitOrderId", data.order.orderId);
      }
      clearCart();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
    onError: (error: any) => {
      toast({ title: "Checkout failed", description: error.message || "Could not create order.", variant: "destructive" });
    },
  });

  const starsOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItems = items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
      const res = await apiRequest("POST", "/api/orders/stars", { items: cartItems });
      return res.json();
    },
    onSuccess: (data) => {
      clearCart();
      if (data.invoiceLink) {
        window.location.href = data.invoiceLink;
      } else {
        toast({ title: "Order created", description: "Your order is pending payment." });
        setLocation("/orders");
      }
    },
    onError: (error: any) => {
      toast({ title: "Checkout failed", description: error.message || "Could not create order.", variant: "destructive" });
    },
  });

  const isPending = cryptoOrderMutation.isPending || starsOrderMutation.isPending;

  const handleCheckout = () => {
    if (!user) return setLocation("/auth");
    if (selectedMethod === "crypto") cryptoOrderMutation.mutate();
    else if (selectedMethod === "stars") starsOrderMutation.mutate();
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      toast({ title: "Invalid code", description: "This coupon code is not valid or has expired.", variant: "destructive" });
    }
  };

  if (items.length === 0) {
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
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Discount :</span>
          <span className="text-white">$0</span>
        </div>
        <div className="h-px bg-white/5 my-1" />
        <div className="flex justify-between text-sm font-bold">
          <span className="text-white">Total :</span>
          <span className="text-white">${(totalDue / 100).toFixed(2)}</span>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Select Payment Processor</h2>
        <div className="space-y-2">
          {enabledOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedMethod(opt.id)}
              data-testid={`button-payment-${opt.id}`}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-sm font-medium ${
                selectedMethod === opt.id
                  ? "border-white/20 bg-white/8 text-white"
                  : "border-white/8 bg-[#0d1017] text-muted-foreground hover:border-white/15 hover:text-white"
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
          {enabledOptions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No payment methods available</p>
          )}
        </div>
      </div>

      <Button
        className="w-full h-12 text-sm font-bold bg-[#1a3ecf] hover:bg-[#1e4aed] text-white rounded-xl"
        disabled={isPending || enabledOptions.length === 0}
        onClick={handleCheckout}
        data-testid="button-proceed-payment"
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Purchase
      </Button>
    </div>
  );
}
