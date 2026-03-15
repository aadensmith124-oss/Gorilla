import { useRoute, useLocation } from "wouter";
import { useOrders } from "@/hooks/use-orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CheckCircle2, Package } from "lucide-react";

function statusLabel(s: string) {
  if (s === "pending") return "Pending";
  if (s === "waiting_payment") return "Unpaid";
  if (s === "delivering") return "Processing";
  if (s === "fulfilled") return "Fulfilled";
  return s;
}

function statusBadgeClass(s: string) {
  if (s === "fulfilled") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (s === "delivering") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (s === "waiting_payment") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-white/10 text-white/60 border-white/10";
}

export default function OrderDetailPageNew() {
  const [, params] = useRoute("/order/:id");
  const [, setLocation] = useLocation();
  const { data: orders } = useOrders();

  const order = orders?.find((o: any) => o.orderId === params?.id || o.id.toString() === params?.id);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#090a0c] flex flex-col items-center justify-center p-4 gap-6">
        <Package className="h-12 w-12 text-white/20" />
        <div className="text-center space-y-1">
          <p className="text-white font-display font-black uppercase">ORDER NOT FOUND</p>
          <p className="text-muted-foreground text-sm">This order doesn't exist or has been deleted</p>
        </div>
        <Button onClick={() => setLocation("/profile?tab=orders")} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
      </div>
    );
  }

  const productItems = order.items?.filter((i: any) => i.itemType === "product") || [];

  const grouped: Record<string, { productName: string; variantName: string; qty: number; price: number }> = {};
  for (const item of productItems) {
    const key = String(item.variantId || item.id);
    if (!grouped[key]) {
      grouped[key] = {
        productName: item.productName || order.productName || "Product",
        variantName: item.variant?.name || item.variantName || "—",
        qty: 0,
        price: item.price,
      };
    }
    grouped[key].qty += (item.quantity ?? 1);
  }
  const groupedItems = Object.values(grouped);

  return (
    <div className="space-y-5 pb-20 pt-4 max-w-lg mx-auto">
      <button
        onClick={() => setLocation("/profile?tab=orders")}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </button>

      <div className="bg-[#0f1115] rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest mb-1">Order ID</p>
            <p className="text-xs font-mono text-white/70">{order.orderId}</p>
          </div>
          <Badge className={statusBadgeClass(order.status)}>
            {statusLabel(order.status).toUpperCase()}
          </Badge>
        </div>

        <div className="px-5 py-4 border-b border-white/5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Total Paid</p>
            <p className="text-2xl font-black text-white">${(order.total / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Date</p>
            <p className="text-sm text-white/80 font-medium">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>

        {groupedItems.length > 0 && (
          <div className="px-5 py-4 border-b border-white/5 space-y-3">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Items Ordered</p>
            <div className="space-y-2">
              {groupedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#16181d] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-tight truncate">{item.variantName}</p>
                    <p className="text-[11px] text-white/40 font-mono mt-0.5">QTY: {item.qty}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-primary">${((item.price * item.qty) / 100).toFixed(2)}</p>
                    <p className="text-[10px] text-white/30 font-mono">${(item.price / 100).toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-4 space-y-3">
          {order.status === "pending" && (
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-start gap-3">
              <Clock className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-white uppercase tracking-widest">PENDING</p>
                <p className="text-xs text-white/40 mt-0.5">Awaiting payment confirmation</p>
              </div>
            </div>
          )}

          {order.status === "waiting_payment" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
              <Clock className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">UNPAID — PAYMENT NOT RECEIVED</p>
                <p className="text-xs text-yellow-400/60 mt-0.5">Crypto payment was not detected. Contact support if you paid.</p>
              </div>
            </div>
          )}

          {order.status === "delivering" && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
              <Clock className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-blue-400 uppercase tracking-widest">PROCESSING — ADMIN DELIVERY</p>
                <p className="text-xs text-blue-400/60 mt-0.5">Payment received. Admin will push your order within 4 hours.</p>
              </div>
            </div>
          )}

          {order.status === "fulfilled" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <p className="text-xs font-black text-green-400 uppercase tracking-widest">ORDER FULFILLED</p>
              </div>
              {order.deliveryContent && (
                <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-4">
                  <p className="text-[10px] text-green-400/60 font-bold uppercase tracking-widest mb-2">Delivered Items</p>
                  <p className="text-xs text-white font-mono whitespace-pre-wrap leading-relaxed">
                    {order.deliveryContent}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
