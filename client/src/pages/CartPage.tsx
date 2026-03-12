import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useCreateOrder } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ShoppingCart, ArrowRight, Loader2, AlertTriangle, Wallet } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SiBitcoin } from "react-icons/si";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type PaymentProcessor = "crypto" | "balance";

const CRYPTO_FEE_PERCENT = 10;

export default function CartPage() {
  const { items, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedProcessor, setSelectedProcessor] = useState<PaymentProcessor>("crypto");
  const [couponCode, setCouponCode] = useState("");

  const cartTotal = total();
  const processorFee = selectedProcessor === "crypto" ? Math.round(cartTotal * CRYPTO_FEE_PERCENT / 100) : 0;
  const totalWithFee = cartTotal + processorFee;
  const canAfford = user ? user.balance >= totalWithFee : false;

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
        if (data.order?.orderId) {
          sessionStorage.setItem("lastForebitOrderId", data.order.orderId);
        }
      }
      clearCart();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout failed",
        description: error.message || "Could not create order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    if (!user) return setLocation("/auth");
    
    if (selectedProcessor === "crypto") {
      cryptoOrderMutation.mutate();
    } else {
      createOrder(
        items.map(i => ({ variantId: i.variantId, quantity: i.quantity, cardId: i.cardId })),
        {
          onSuccess: (order) => setLocation(`/profile?order=${order.orderId}`)
        }
      );
    }
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      toast({
        title: "Invalid Coupon",
        description: "This coupon code is not valid or has expired.",
        variant: "destructive"
      });
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
          <Card key={item.cardId ? `card-${item.cardId}` : `v-${item.variantId}`} className="flex flex-col sm:flex-row items-center p-4 gap-4" data-testid={`card-cart-item-${item.cardId || item.variantId}`}>
            {item.cardId ? (
              <div className="h-16 w-16 rounded-md bg-gradient-to-br from-yellow-500/20 to-orange-600/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💳</span>
              </div>
            ) : (
              <div className="h-16 w-16 rounded-md bg-secondary overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-purple-600/30 to-purple-900/30 flex items-center justify-center">
                    <span className="text-xl font-black text-white/80">{item.productName?.charAt(0)}</span>
                  </div>
                )}
              </div>
            )}
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
            <CardTitle>User Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Original Price</span>
              <span>${(cartTotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span>${(cartTotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processor Fee</span>
              <span>${(processorFee / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm">
              <span>Due with processor</span>
              <span>${(totalWithFee / 100).toFixed(2)}</span>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <p className="text-sm font-medium">Select Payment Processor</p>
              
              <label 
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedProcessor === "crypto" 
                    ? "border-primary bg-primary/5" 
                    : "border-white/10 hover:border-white/20"
                }`}
                data-testid="option-crypto"
              >
                <input 
                  type="radio" 
                  name="processor" 
                  checked={selectedProcessor === "crypto"}
                  onChange={() => setSelectedProcessor("crypto")}
                  className="hidden"
                />
                <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                  <SiBitcoin className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium">Crypto</span>
                <span className="text-green-500 text-sm ml-auto">+{CRYPTO_FEE_PERCENT}% fee</span>
              </label>
              
              <label 
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedProcessor === "balance" 
                    ? "border-primary bg-primary/5" 
                    : "border-white/10 hover:border-white/20"
                }`}
                data-testid="option-balance"
              >
                <input 
                  type="radio" 
                  name="processor" 
                  checked={selectedProcessor === "balance"}
                  onChange={() => setSelectedProcessor("balance")}
                  className="hidden"
                />
                <div className="h-6 w-6 rounded-full bg-gray-600 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium">Balance</span>
                <span className="text-muted-foreground text-sm ml-auto">
                  You have ${user ? (user.balance / 100).toFixed(2) : "0.00"}
                </span>
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button 
              className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" 
              disabled={(selectedProcessor === "balance" && !canAfford) || isPending || cryptoOrderMutation.isPending}
              onClick={handleCheckout}
              data-testid="button-proceed-payment"
            >
              {(isPending || cryptoOrderMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Proceed to Payment
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-10 border-destructive text-destructive"
              onClick={() => setLocation("/profile?tab=topup")}
              data-testid="button-topup"
            >
              Topup Balance
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
                Apply Coupon
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

    </div>
  );
}
