import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

function AchRow({ ach }: { ach: any }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ach/${ach.id}/purchase`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Purchase failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ach"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Purchase complete", description: "ACH delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="border border-white/8 bg-[#0f0f0f] rounded mb-2 overflow-hidden">
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-bold text-white font-mono uppercase tracking-wide">{ach.bankName}</p>
            <p className="text-xs text-white/40 font-mono">Balance: {ach.balance}</p>
          </div>
          <p className="text-sm font-mono font-bold text-white flex-shrink-0">${(ach.price / 100).toFixed(2)}</p>
        </div>
        <button
          onClick={() => purchaseMutation.mutate()}
          disabled={purchaseMutation.isPending}
          className="w-full border border-green-600/60 text-green-400 rounded text-xs font-bold py-1.5 transition-all hover:bg-green-900/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
          data-testid={`btn-buy-ach-${ach.id}`}
        >
          {purchaseMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : `Buy $${(ach.price / 100).toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

export default function AchPage() {
  const [search, setSearch] = useState("");

  const { data: achList, isLoading } = useQuery<any[]>({ queryKey: ["/api/ach"] });

  const filtered = useMemo(() => {
    if (!achList) return [];
    return achList.filter((a: any) =>
      !search
      || a.bankName?.toLowerCase().includes(search.toLowerCase())
      || a.balance?.toLowerCase().includes(search.toLowerCase())
    );
  }, [achList, search]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-white/40" />
        <h1 className="text-sm font-bold text-white/60 uppercase tracking-widest">ACH</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          type="text"
          placeholder="Search bank, balance..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#111] border border-white/5 rounded py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/10 transition-colors"
          data-testid="input-search-ach"
        />
      </div>

      <div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-xs">No ACH available</div>
        ) : (
          filtered.map((ach: any) => <AchRow key={ach.id} ach={ach} />)
        )}
      </div>
    </div>
  );
}
