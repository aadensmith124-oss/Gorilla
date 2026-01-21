import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useCreateOrder } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ShoppingCart, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";

export default function CartPage() {
  const { items, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const [, setLocation] = useLocation();

  const cartTotal = total();
  const canAfford = user ? user.balance >= cartTotal : false;

  const handleCheckout = () => {
    if (!user) return setLocation("/auth");
    
    createOrder(
      items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
      {
        onSuccess: () => setLocation("/profile?tab=orders")
      }
    );
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
          <Button size="lg" className="gap-2">
            Browse Shop <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-display">Shopping Cart</h1>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
            Clear Cart
          </Button>
        </div>
        
        {items.map((item) => (
          <Card key={item.variantId} className="flex flex-col sm:flex-row items-center p-4 gap-4">
            <img src={item.image} alt={item.productName} className="h-20 w-20 rounded-md object-cover bg-secondary" />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-bold">{item.productName}</h3>
              <p className="text-sm text-muted-foreground">{item.variantName}</p>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold">${((item.price * item.quantity) / 100).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeItem(item.variantId)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-24 border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${(cartTotal / 100).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary font-mono">${(cartTotal / 100).toFixed(2)}</span>
            </div>
            
            {user && (
              <div className={`text-sm p-3 rounded-md flex items-center gap-2 ${canAfford ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                {canAfford ? (
                  <>Balance after: <span className="font-mono font-bold">${((user.balance - cartTotal) / 100).toFixed(2)}</span></>
                ) : (
                  <><AlertTriangle className="h-4 w-4" /> Insufficient balance</>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            {user ? (
              <Button 
                className="w-full h-12 text-lg font-bold" 
                disabled={!canAfford || isPending}
                onClick={handleCheckout}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {canAfford ? "Pay Securely" : "Top Up First"}
              </Button>
            ) : (
              <Link href="/auth">
                <Button className="w-full h-12 text-lg font-bold">Login to Checkout</Button>
              </Link>
            )}
            <p className="text-xs text-center text-muted-foreground">
              By purchasing you agree to our terms of service. Digital items are non-refundable.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
