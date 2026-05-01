import { useOrders } from "@/hooks/use-orders";
import { useLocation } from "wouter";
import { Loader2, Package } from "lucide-react";

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const allOrders = orders ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white">Orders</h1>
        <p className="text-xs text-white/30">{allOrders.length} ORDER{allOrders.length !== 1 ? "S" : ""} FOUND</p>
      </div>

      {allOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Package className="h-10 w-10 text-white/10" />
          <p className="text-sm text-white/30">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allOrders.map((order: any) => (
            <button
              key={order.id}
              onClick={() => setLocation(`/order/${order.orderId}`)}
              className="w-full text-left bg-[#111] border border-white/5 rounded p-4 hover:bg-[#161616] hover:border-white/10 transition-all"
              data-testid={`btn-order-${order.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-white/40">#{order.orderId}</p>
                  <p className="text-sm text-white">
                    {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                    order.status === "fulfilled" || order.status === "delivering" ? "bg-green-900/40 text-green-400" :
                    order.status === "pending" ? "bg-yellow-900/40 text-yellow-400" :
                    "bg-red-900/40 text-red-400"
                  }`}>
                    {order.status === "delivering" ? "FULFILLED" : order.status?.toUpperCase()}
                  </span>
                  <p className="text-sm font-mono text-white">${(order.total / 100).toFixed(2)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
