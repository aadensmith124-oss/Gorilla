import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";

export function useForebitPolling() {
  const { toast } = useToast();
  const { user } = useAuth();
  const clearCart = useCart((s) => s.clearCart);

  useEffect(() => {
    if (!user) return;

    const lastPaymentId = sessionStorage.getItem("lastForebitPaymentId");
    if (!lastPaymentId) return;

    const lastPurpose = sessionStorage.getItem("lastForebitPurpose") || "deposit";
    const pendingCartJson = sessionStorage.getItem("pendingCartItems");

    let pendingCart: { paymentId: string; items: any[] } | null = null;
    try {
      if (pendingCartJson) {
        const parsed = JSON.parse(pendingCartJson);
        if (parsed.paymentId === lastPaymentId && Array.isArray(parsed.items)) {
          pendingCart = parsed;
        }
      }
    } catch {}

    let attempts = 0;
    const pollInterval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/payments/forebit/${lastPaymentId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "completed") {
            clearInterval(pollInterval);
            sessionStorage.removeItem("lastForebitPaymentId");
            sessionStorage.removeItem("lastForebitPurpose");
            sessionStorage.removeItem("pendingCartItems");

            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });

            if (pendingCart) {
              try {
                const cartItems = pendingCart.items;
                const items = cartItems.map((i: any) => ({
                  variantId: i.variantId,
                  quantity: i.quantity,
                  cardId: i.cardId,
                }));
                const cardIds = cartItems
                  .filter((i: any) => i.cardId)
                  .map((i: any) => i.cardId);

                const orderRes = await apiRequest("POST", "/api/orders", { items, cardIds });
                if (orderRes.ok) {
                  const order = await orderRes.json();
                  clearCart();
                  queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                  toast({
                    title: "Order placed!",
                    description: `Your order has been fulfilled. Check your orders for details.`,
                  });
                  window.location.href = `/profile?order=${order.orderId}`;
                  return;
                } else {
                  const err = await orderRes.json().catch(() => ({}));
                  toast({
                    title: "Balance added, but order failed",
                    description: err.message || "Your crypto deposit was credited. Please place your order manually from the cart.",
                    variant: "destructive",
                  });
                }
              } catch (e: any) {
                toast({
                  title: "Balance added, but order failed",
                  description: "Your crypto deposit was credited. Please place your order manually from the cart.",
                  variant: "destructive",
                });
              }
            } else {
              const desc = lastPurpose === "order"
                ? "Your item is ready! Check your orders."
                : `$${(data.amount / 100).toFixed(2)} has been added to your balance.`;
              toast({ title: "Payment completed!", description: desc });
            }
          } else if (data.status === "failed" || data.status === "expired") {
            clearInterval(pollInterval);
            sessionStorage.removeItem("lastForebitPaymentId");
            sessionStorage.removeItem("lastForebitPurpose");
            sessionStorage.removeItem("pendingCartItems");
            toast({
              title: "Payment " + data.status,
              description: "Your crypto payment did not go through.",
              variant: "destructive",
            });
          }
        }
      } catch {}
      if (attempts >= 60) {
        clearInterval(pollInterval);
        sessionStorage.removeItem("lastForebitPaymentId");
        sessionStorage.removeItem("lastForebitPurpose");
        sessionStorage.removeItem("pendingCartItems");
      }
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [user]);
}
