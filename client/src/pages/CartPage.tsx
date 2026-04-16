import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowRight, Loader2, Wallet } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

export default function CartPage() {
  const { items, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");

  const cartTotal = total();
  const userBalance = user?.balance || 0;
  const hasEnoughBalance = userBalance >= cartTotal;

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

  const isPending = balanceOrderMutation.isPending;

  const handleCheckout = () => {
    if (!user) return setLocation("/auth");
    if (!hasEnoughBalance) {
      toast({
        title: "Insufficient balance",
        description: `You need $${(cartTotal / 100).toFixed(2)} but have $${(userBalance / 100).toFixed(2)}. Top up your balance first.`,
        variant: "destructive",
      });
      return;
    }
    balanceOrderMutation.mutate();
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      toast({ title: "Invalid coupon", description: "This coupon code is not valid or has expired.", variant: "destructive" });
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <ShoppingCart className="h-16 w-16 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <p className="text-muted-foreground">Add some products to get started</p>
        </div>
        <Link href="/">
          <Button className="gap-2" data-testid="button-browse-shop">
            Browse Shop <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold">Cart ({items.length} item{items.length !== 1 ? "s" : ""})</h2>
          {items.map((item) => (
            <Card key={`v-${item.variantId}`} className="bg-[#16181d] border-white/5" data-testid={`card-cart-item-${item.variantId}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-[#0f1115] flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-2xl font-black text-white/30">{item.productName?.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">{item.variantName}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
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
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-primary/20 shadow-lg shadow-primary/5 bg-[#16181d]">
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${(cartTotal / 100).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total Due</span>
                <span>${(cartTotal / 100).toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Payment Method</p>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/50 bg-primary/10">
                  <div className="h-6 w-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <Wallet className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-white">Balance</span>
                    <p className="text-xs text-muted-foreground">Instant delivery from stock</p>
                  </div>
                  <span className={`text-xs font-bold ${hasEnoughBalance ? "text-green-400" : "text-red-400"}`}>
                    ${(userBalance / 100).toFixed(2)}
                  </span>
                </div>
                {!hasEnoughBalance && (
                  <p className="text-xs text-red-400 text-center">
                    Insufficient balance.{" "}
                    <button onClick={() => setLocation("/profile?tab=balance")} className="underline hover:text-red-300">
                      Top up here
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button
                className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700"
                disabled={isPending || !hasEnoughBalance}
                onClick={handleCheckout}
                data-testid="button-proceed-payment"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Purchase Now
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
    </div>
  );
}
