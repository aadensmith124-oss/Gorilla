import { useRoute, useLocation } from "wouter";
import { useOrders } from "@/hooks/use-orders";
import { Loader2, X, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useState, type ReactNode } from "react";
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

function parseDeliveryMap(raw: string | null | undefined): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>;
  } catch {}
  return null;
}

export default function OrderDetailPageNew() {
  const [, params] = useRoute("/order/:id");
  const [, setLocation] = useLocation();
  const { data: orders } = useOrders();
  const [activeTab, setActiveTab] = useState<"info" | "products">("info");
  const [stockVisible, setStockVisible] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const order = orders?.find((o: any) => o.orderId === params?.id || o.id.toString() === params?.id);

  if (!orders) {
    return <div className="flex h-screen items-center justify-center bg-[#090a0c]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#090a0c] flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-white font-bold">Order not found</p>
        <button onClick={() => setLocation("/profile?tab=orders")} className="text-sm text-primary hover:underline">← Back to Orders</button>
      </div>
    );
  }

  const paid = order.status === "fulfilled" ? order.total : 0;
  const expected = order.total;

  const productItems = (order.items || []).filter((i: any) => !i.itemType || i.itemType === "product");
  const grouped: { key: string; productName: string; variantName: string; qty: number; unitPrice: number }[] = [];
  const seen: Record<string, number> = {};
  for (const item of productItems) {
    const key = String(item.variantId || item.id);
    if (seen[key] === undefined) {
      seen[key] = grouped.length;
      grouped.push({
        key,
        productName: item.productName || "Product",
        variantName: item.variant?.name || item.variantName || "—",
        qty: item.quantity ?? 1,
        unitPrice: item.price,
      });
    } else {
      grouped[seen[key]].qty += item.quantity ?? 1;
    }
  }

  const deliveryMap = parseDeliveryMap(order.deliveryContent);
  const isFulfilled = order.status === "fulfilled";

  const getStockForKey = (key: string): string | null => {
    if (!isFulfilled) return null;
    if (deliveryMap) return deliveryMap[key] || null;
    return order.deliveryContent || null;
  };

  const toggleStock = (key: string) => {
    setStockVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (key: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
      toast({ title: "Copied to clipboard" });
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col pb-20">
      <div className="max-w-lg w-full mx-auto px-4 pt-6 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Order Info</h1>
          <button
            onClick={() => setLocation("/profile?tab=orders")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-white/10 flex gap-8 mb-6">
          {(["info", "products"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "text-primary border-primary"
                  : "text-white/40 border-transparent hover:text-white/70"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "info" && (
          <div className="space-y-5">
            <InfoRow label="ID" value={<span className="font-mono break-all text-sm text-white">{order.orderId}</span>} />
            <InfoRow label="Creation date" value={new Date(order.createdAt).toLocaleString("en-US")} />
            <InfoRow label="Reason" value="cart" />
            <InfoRow label="Expected amount" value={`$${(expected / 100).toFixed(2)}`} />
            <InfoRow label="Paid amount" value={`$${(paid / 100).toFixed(2)}`} />
            <InfoRow label="Status" value={
              <span className={`font-bold ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
            } />
          </div>
        )}

        {activeTab === "products" && (
          <div className="space-y-8">
            {grouped.length === 0 && (
              <p className="text-sm text-white/40">No products found</p>
            )}
            {grouped.map((item, idx) => {
              const stockContent = getStockForKey(item.key);
              const isOpen = !!stockVisible[item.key];
              const wasCopied = !!copied[item.key];

              return (
                <div key={item.key}>
                  <div className="space-y-4">
                    <InfoRow label="Product" value={<span className="font-bold text-sm text-white">{item.productName}</span>} />
                    <InfoRow label="Option" value={item.variantName} />
                    <InfoRow label="Quantity" value={String(item.qty)} />
                    <InfoRow label="Unit price" value={`$${(item.unitPrice / 100).toFixed(2)}`} />
                    <InfoRow label="Total" value={<span className="font-bold text-sm text-white">${((item.unitPrice * item.qty) / 100).toFixed(2)}</span>} />

                    {stockContent ? (
                      <div className="space-y-2 pt-1">
                        <button
                          onClick={() => toggleStock(item.key)}
                          className="w-full h-11 rounded-xl bg-[#3b5bdb] hover:bg-[#3451c7] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {isOpen ? "Hide Stock" : "View Stock"}
                        </button>

                        {isOpen && (
                          <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
                            <p className="text-xs font-mono text-white whitespace-pre-wrap leading-relaxed">
                              {stockContent}
                            </p>
                            <button
                              onClick={() => handleCopy(item.key, stockContent)}
                              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold transition-colors"
                            >
                              {wasCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {wasCopied ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/30 font-bold text-sm flex items-center justify-center">
                        {isFulfilled ? "No stock data" : "Pending Delivery"}
                      </div>
                    )}
                  </div>

                  {idx < grouped.length - 1 && <div className="border-b border-white/5 mt-6" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-1">{label}</p>
      {typeof value === "string" ? <p className="text-sm text-white">{value}</p> : value}
    </div>
  );
}
