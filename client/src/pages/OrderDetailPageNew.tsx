import { useRoute, useLocation } from "wouter";
import { useOrders } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Clock, CheckCircle2 } from "lucide-react";

function statusLabel(s: string) {
  if (s === "pending") return "Pending";
  if (s === "waiting_payment") return "Unpaid";
  if (s === "delivering") return "Waiting";
  if (s === "fulfilled") return "Fulfilled";
  return s;
}

function statusBadgeClass(s: string) {
  if (s === "fulfilled") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (s === "delivering") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (s === "waiting_payment") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-muted/20 text-muted-foreground border-muted/30";
}

export default function OrderDetailPageNew() {
  const [, params] = useRoute("/order/:id");
  const [, setLocation] = useLocation();
  const { data: orders } = useOrders();
  
  const order = orders?.find((o: any) => o.orderId === params?.id || o.id.toString() === params?.id);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#090a0c] flex flex-col items-center justify-center p-4 gap-6">
        <div className="text-center space-y-2">
          <p className="text-white font-display font-black uppercase">ORDER NOT FOUND</p>
          <p className="text-muted-foreground text-sm">This order doesn't exist or has been deleted</p>
        </div>
        <Button onClick={() => setLocation("/profile?tab=orders")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 pt-4">
      <button 
        onClick={() => setLocation("/profile?tab=orders")}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </button>

      <Card className="bg-card/40 border-white/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">Order Details</CardTitle>
              <p className="text-xs text-muted-foreground font-mono">ID: {order.orderId}</p>
            </div>
            <Badge className={statusBadgeClass(order.status)}>
              {statusLabel(order.status).toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-lg font-black text-white">${(order.total / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Created</p>
              <p className="text-sm text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {order.items && order.items.filter((i: any) => i.itemType === "product").length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Items Ordered</p>
              {order.items.filter((i: any) => i.itemType === "product").map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5 border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">{item.variant?.name || "Item"}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity ?? 1}</p>
                  </div>
                  <p className="text-sm font-bold text-primary">${(item.price / 100).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}

          {order.status === "pending" && (
            <div className="bg-muted/10 border border-muted/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">PENDING</p>
                  <p className="text-xs text-muted-foreground">Your order is pending payment</p>
                </div>
              </div>
            </div>
          )}

          {order.status === "waiting_payment" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-yellow-400">UNPAID — PAYMENT NOT RECEIVED</p>
                  <p className="text-xs text-yellow-400/80">Your crypto payment was not detected. Please contact support.</p>
                </div>
              </div>
            </div>
          )}

          {order.status === "delivering" && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-400">WAITING FOR ADMIN DELIVERY</p>
                  <p className="text-xs text-blue-400/80">Your payment was received. Admin will deliver within 4 hours.</p>
                </div>
              </div>
            </div>
          )}

          {order.status === "fulfilled" && order.deliveryContent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <h3 className="font-bold text-green-400">ITEMS DELIVERED</h3>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                <p className="text-sm text-white whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {order.deliveryContent}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
