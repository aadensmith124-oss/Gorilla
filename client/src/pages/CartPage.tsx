import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowRight, Loader2, Star } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SiBitcoin } from "react-icons/si";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const CRYPTO_FEE_PERCENT = 10;

type PaymentMethod = "crypto" | "stars";

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  icon: React.ReactNode;
  label: string;
  desc: string;
  feeNote: string;
}[] = [
  {
    id: "crypto",
    icon: <SiBitcoin className="h-5 w-5 text-amber-400" />,
    label: "Crypto",
    desc: "BTC, USDT, ETH & more",
    feeNote: "+10% processor fee",
  },
  {
    id: "stars",
    icon: <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />,
    label: "Telegram Stars",
    desc: "Pay with ⭐ Stars in Telegram",
    feeNote: "No extra markup",
  },
];

export default function CartPage() {
  const { items, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("crypto");

  const cartTotal = total();
  const isCrypto = selectedMethod === "crypto";
  const processorFee = isCrypto ? Math.round(cartTotal * CRYPTO_FEE_PERCENT / 100) : 0;
  const totalWithFee = cartTotal + processorFee;

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
      toast({ title: "Invalid Coupon", description: "This coupon code is not valid or has expired.", variant: "destructive" });
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="h-24 w-24 rounded-full bg-secondary/50 flex items-center justify-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <p className="text-muted-foreground">Looks like you haven't added anything yet.</p>
        </div>
        <Link href="/">
          <Button size="lg" className="gap-2" data-testid="button-browse-shop">
            Browse Shop <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-2xl font-bold font-display">Products ({items.length})</h1>
          <span className="text-sm text-muted-foreground">Swipe/scroll to view each product</span>
        </div>

        {items.map((item) => (
          <Card key={`v-${item.variantId}`} className="flex flex-col sm:flex-row items-center p-4 gap-4" data-testid={`card-cart-item-${item.variantId}`}>
            <div className="h-16 w-16 rounded-md bg-secondary overflow-hidden flex-shrink-0">
              {item.image ? (
                <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-purple-600/30 to-purple-900/30 flex items-center justify-center">
                  <span className="text-xl font-black text-white/80">{item.productName?.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-bold">{item.productName}</h3>
              <p className="text-sm text-muted-foreground">{item.variantName}</p>
              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
            </div>
            <div className="text-right flex items-center gap-3">
              <div className="font-mono font-bold text-green-500">${((item.price * item.quantity) / 100).toFixed(2)}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeItem(item.variantId)}
                className="text-destructive border-destructive/30"
                data-testid={`button-remove-item-${item.variantId}`}
              >
                Remove
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-24 border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${(cartTotal / 100).toFixed(2)}</span>
            </div>
            {isCrypto && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processor Fee (+{CRYPTO_FEE_PERCENT}%)</span>
                <span>${(processorFee / 100).toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total Due</span>
              <span>${(totalWithFee / 100).toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedMethod(opt.id)}
                    data-testid={`button-payment-${opt.id}`}
                    className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                      selectedMethod === opt.id
                        ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span className="text-xs font-semibold text-white">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
                    <p className={`text-[10px] font-medium ${selectedMethod === opt.id ? "text-primary" : "text-muted-foreground"}`}>
                      {opt.feeNote}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button
              className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700"
              disabled={isPending}
              onClick={handleCheckout}
              data-testid="button-proceed-payment"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Proceed to Payment
            </Button>

            <Separator className="my-2" />

            <div className="flex w-full gap-2">
              <Input
                placeholder="Enter coupon here"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1"
                data-testid="input-coupon"
              />
              <Button
                variant="outline"
                className="border-destructive text-destructive"
                onClick={handleApplyCoupon}
                data-testid="button-apply-coupon"
              >
                Apply
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
