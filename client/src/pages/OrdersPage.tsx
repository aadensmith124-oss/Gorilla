import { useState, useMemo } from "react";
import { useOrders } from "@/hooks/use-orders";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

type TabType = "all" | "cards" | "ach" | "logs";

function getTier(totalDepositsCents: number): { label: string; discount: string } {
  const dollars = totalDepositsCents / 100;
  if (dollars >= 500) return { label: "Gold", discount: "15% off" };
  if (dollars >= 200) return { label: "Silver", discount: "10% off" };
  if (dollars >= 50) return { label: "Bronze", discount: "5% off" };
  return { label: "Starter", discount: "0% off" };
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function isAchOrder(order: any): boolean {
  return (order.orderId ?? "").startsWith("ACH-");
}

function isCardOrder(order: any): boolean {
  return (
    (order.orderId ?? "").startsWith("CARD-") ||
    (!isAchOrder(order) && (order.items ?? []).some((i: any) => i.itemType === "card" || i.cardId != null))
  );
}

function isLogOrder(order: any): boolean {
  return !isCardOrder(order) && !isAchOrder(order);
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    fulfilled: { label: "FULFILLED", cls: "bg-green-900/40 text-green-400" },
    delivering: { label: "FULFILLED", cls: "bg-green-900/40 text-green-400" },
    pending: { label: "PENDING", cls: "bg-yellow-900/40 text-yellow-400" },
    waiting_payment: { label: "UNPAID", cls: "bg-orange-900/40 text-orange-400" },
    refunded: { label: "REFUNDED", cls: "bg-red-900/40 text-red-400" },
    replaced: { label: "REPLACED", cls: "bg-blue-900/40 text-blue-400" },
  };
  const entry = map[status] ?? { label: status?.toUpperCase() ?? "—", cls: "bg-gray-50 text-gray-500" };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

export default function OrdersPage() {
  const { data: orders, isLoading, refetch, isRefetching } = useOrders();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");

  const { data: transactions } = useQuery<any[]>({
    queryKey: ["/api/wallet/transactions"],
    enabled: !!user,
  });

  const totalDepositsCents = useMemo(() => {
    if (!transactions) return 0;
    return transactions
      .filter((t: any) => t.type === "deposit" || t.type === "manual_deposit")
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
  }, [transactions]);

  const tier = getTier(totalDepositsCents);
  const allOrders = orders ?? [];

  const totalSpentCents = useMemo(() => {
    return allOrders
      .filter((o: any) => o.status === "fulfilled" || o.status === "delivering" || o.status === "replaced")
      .reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);
  }, [allOrders]);

  const cardOrders = useMemo(() => allOrders.filter(isCardOrder), [allOrders]);
  const achOrders = useMemo(() => allOrders.filter(isAchOrder), [allOrders]);
  const logOrders = useMemo(() => allOrders.filter(isLogOrder), [allOrders]);

  const tabOrders = tab === "cards" ? cardOrders : tab === "ach" ? achOrders : tab === "logs" ? logOrders : allOrders;

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return tabOrders;
    const q = search.toLowerCase();
    return tabOrders.filter((o: any) =>
      (o.orderId ?? "").toLowerCase().includes(q) ||
      (o.status ?? "").toLowerCase().includes(q)
    );
  }, [tabOrders, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const now = new Date();

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "all", count: allOrders.length },
    { key: "cards", label: "cards", count: cardOrders.length },
    { key: "ach", label: "ach", count: achOrders.length },
    { key: "logs", label: "logs", count: logOrders.length },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900">Order History</h1>
        <p className="text-xs text-gray-400">
          {allOrders.length} total · ${(totalSpentCents / 100).toFixed(2)} spent · {formatDateTime(now)}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-1.5 border border-gray-200 bg-gray-50 rounded px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-50"
          data-testid="btn-refresh"
        >
          <RefreshCw className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`} />
          refresh
        </button>
        <a href="https://t.me/+K3ou01RaW6oyMjJh" target="_blank" rel="noopener noreferrer">
          <button
            className="flex items-center gap-1.5 border border-gray-200 bg-gray-50 rounded px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all"
            data-testid="btn-support"
          >
            support
          </button>
        </a>
      </div>

      {/* Deposits + Tier panel */}
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Total Deposits</p>
          <p className="text-2xl font-mono font-bold text-gray-900">${(totalDepositsCents / 100).toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Tier</p>
          <p className="text-sm font-bold text-gray-900">{tier.label} <span className="text-gray-500 font-normal">· {tier.discount}</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-1 pb-2 text-xs transition-colors border-b-2 mr-4 -mb-px ${
              tab === t.key
                ? "text-gray-900 border-gray-900"
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
            data-testid={`tab-${t.key}`}
          >
            {t.label} <span className="text-gray-400">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="search orders..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded py-2 px-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-200 transition-colors"
        data-testid="input-search-orders"
      />

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        <p className="text-xs text-gray-400 py-4">no orders found.</p>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order: any) => {
            const isCard = isCardOrder(order);
            const isFulfilled = order.status === "fulfilled" || order.status === "delivering" || order.status === "replaced";
            return (
              <button
                key={order.id}
                onClick={() => setLocation(`/order/${order.orderId}`)}
                className="w-full text-left border border-gray-200 bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 hover:border-gray-200 transition-all"
                data-testid={`btn-order-${order.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-mono text-gray-400 truncate">#{order.orderId}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${isCard ? "bg-blue-900/30 text-blue-400" : isAchOrder(order) ? "bg-cyan-900/30 text-cyan-400" : "bg-purple-900/30 text-purple-400"}`}>
                        {isCard ? "card" : isAchOrder(order) ? "ach" : "log"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                    <p className="text-[10px] text-gray-300 font-mono">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-US") : ""}
                    </p>
                  </div>
                  <div className="text-right space-y-1 flex-shrink-0">
                    {statusBadge(order.status)}
                    <p className="text-sm font-mono text-gray-900">${(order.total / 100).toFixed(2)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
