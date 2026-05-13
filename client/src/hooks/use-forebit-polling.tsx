import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function useForebitPolling() {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const lastPaymentId = sessionStorage.getItem("lastForebitPaymentId");
    if (!lastPaymentId) return;

    const lastPurpose = sessionStorage.getItem("lastForebitPurpose") || "deposit";
    const lastOrderId = sessionStorage.getItem("lastForebitOrderId");

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
            sessionStorage.removeItem("lastForebitOrderId");

            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

            if (lastPurpose === "order") {
              toast({
                title: "Order fulfilled!",
                description: "Your crypto payment was confirmed. Check your orders for details.",
              });
              const orderId = data.orderId || lastOrderId;
              if (orderId) {
                window.location.href = `/order/${orderId}`;
              }
            } else {
              toast({
                title: "Payment completed!",
                description: `$${(data.amount / 100).toFixed(2)} has been added to your balance.`,
              });
            }
          } else if (data.status === "failed" || data.status === "expired") {
            clearInterval(pollInterval);
            sessionStorage.removeItem("lastForebitPaymentId");
            sessionStorage.removeItem("lastForebitPurpose");
            sessionStorage.removeItem("lastForebitOrderId");

            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

            if (lastPurpose === "order") {
              toast({
                title: "Payment " + data.status,
                description: "Your order has been cancelled. Stock has been released.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Payment " + data.status,
                description: "Your crypto payment did not go through.",
                variant: "destructive",
              });
            }
          }
        }
      } catch {}
      if (attempts >= 60) {
        clearInterval(pollInterval);
        sessionStorage.removeItem("lastForebitPaymentId");
        sessionStorage.removeItem("lastForebitPurpose");
        sessionStorage.removeItem("lastForebitOrderId");
      }
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [user]);
}
