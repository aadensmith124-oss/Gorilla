import { useRoute, useLocation } from "wouter";
import { useOrders } from "@/hooks/use-orders";
import { Loader2, X, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function statusLabel(s: string) {
  if (s === "pending") return "pending";
  if (s === "waiting_payment") return "unpaid";
  if (s === "delivering") return "processing";
  if (s === "fulfilled") return "fulfilled";
  return s;
}

function statusColor(s: string) {
  if (s === "fulfilled") return "text-green-400";
  if (s === "delivering") return "text-blue-400";
  if (s === "waiting_payment") return "text-orange-400";
  return "text-white/50";
}

export default function OrderDetailPageNew() {
  const [, params] = useRoute("/order/:id");
  const [, setLocation] = useLocation();
  const { data: orders } = useOrders();
  const [activeTab, setActiveTab] = useState<"info" | "products">("info");
  const [stockVisible, setStockVisible] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  const order = orders?.find((o: any) => o.orderId === params?.id || o.id.toString() === params?.id);

  if (!orders) {
    return <div className="flex h-screen items-center justify-center bg-[#090a0c]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#090a0c] flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-white font-bold uppercase tracking-widest">Order not found</p>
        <button onClick={() => setLocation("/profile?tab=orders")} className="text-sm text-primary hover:underline">← Back to Orders</button>
      </div>
    );
  }

  const paid = order.status === "fulfilled" ? order.total : 0;
  const expected = order.total;

  const productItems = order.items?.filter((i: any) => i.itemType === "product") || [];
  const grouped: { productName: string; variantName: string; qty: number; unitPrice: number }[] = [];
  const seen: Record<string, number> = {};
  for (const item of productItems) {
    const key = String(item.variantId || item.id);
    if (seen[key] === undefined) {
      seen[key] = grouped.length;
      grouped.push({
        productName: item.productName || "Product",
        variantName: item.variant?.name || item.variantName || "—",
        qty: item.quantity ?? 1,
        unitPrice: item.price,
      });
    } else {
      grouped[seen[key]].qty += item.quantity ?? 1;
    }
  }

  const hasStock = order.status === "fulfilled" && order.deliveryContent;

  const toggleStock = (idx: number) => {
    setStockVisible(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = (idx: number) => {
    if (order.deliveryContent) {
      navigator.clipboard.writeText(order.deliveryContent).then(() => {
        setCopied(prev => ({ ...prev, [idx]: true }));
        setTimeout(() => setCopied(prev => ({ ...prev, [idx]: false })), 2000);
        toast({ title: "Copied to clipboard" });
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col pb-20">
      <div className="max-w-lg w-full mx-auto px-4 pt-6 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Order info</h1>
          <button
            onClick={() => setLocation("/profile?tab=orders")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-white/10 flex gap-8 mb-6">
          <button
            onClick={() => setActiveTab("info")}
            className={`pb-3 text-sm font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === "info"
                ? "text-primary border-primary"
                : "text-white/40 border-transparent hover:text-white/70"
            }`}
          >
            Info
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`pb-3 text-sm font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === "products"
                ? "text-primary border-primary"
                : "text-white/40 border-transparent hover:text-white/70"
            }`}
          >
            Products
          </button>
        </div>

        {activeTab === "info" && (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-white/40 mb-1">ID</p>
              <p className="text-sm text-white font-mono break-all">{order.orderId}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Creation date</p>
              <p className="text-sm text-white">{new Date(order.createdAt).toLocaleString("en-US")}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Reason</p>
              <p className="text-sm text-white">cart</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Expected amount</p>
              <p className="text-sm text-white">${(expected / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Paid amount</p>
              <p className="text-sm text-white">${(paid / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Status</p>
              <p className={`text-sm font-bold ${statusColor(order.status)}`}>{statusLabel(order.status)}</p>
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div className="space-y-6">
            {grouped.length === 0 && (
              <p className="text-sm text-white/40">No products found</p>
            )}
            {grouped.map((item, idx) => (
              <div key={idx} className="space-y-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Product</p>
                  <p className="text-sm text-white font-bold">{item.productName}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Option</p>
                  <p className="text-sm text-white">{item.variantName}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Quantity</p>
                  <p className="text-sm text-white">{item.qty}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Unit price</p>
                  <p className="text-sm text-white">${(item.unitPrice / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Total</p>
                  <p className="text-sm text-white font-bold">${((item.unitPrice * item.qty) / 100).toFixed(2)}</p>
                </div>

                {hasStock && (
                  <div className="space-y-2">
                    <button
                      onClick={() => toggleStock(idx)}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {stockVisible[idx] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {stockVisible[idx] ? "Hide Stock" : "View Stock"}
                    </button>

                    {stockVisible[idx] && (
                      <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-mono text-white whitespace-pre-wrap leading-relaxed">
                          {order.deliveryContent}
                        </p>
                        <button
                          onClick={() => handleCopy(idx)}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold transition-colors"
                        >
                          {copied[idx] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied[idx] ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!hasStock && order.status !== "fulfilled" && (
                  <div className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/30 font-bold uppercase tracking-widest text-sm flex items-center justify-center">
                    Pending Delivery
                  </div>
                )}

                {idx < grouped.length - 1 && <div className="border-b border-white/5 pt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
