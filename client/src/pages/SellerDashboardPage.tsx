import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, TrendingUp, DollarSign, Clock } from "lucide-react";

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: sellerStatus, isLoading } = useQuery<{
    isSeller: boolean;
    sellerBalance: number;
    totalEarned: number;
  }>({
    queryKey: ["/api/seller/status"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!sellerStatus?.isSeller) {
    setLocation("/become-seller");
    return null;
  }

  const pendingPayout = (sellerStatus.sellerBalance / 100).toFixed(2);
  const totalEarned = (sellerStatus.totalEarned / 100).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white">Seller Dashboard</h1>
        <p className="text-sm text-white/40">Manage your products and track earnings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111] border border-white/5 rounded p-4 space-y-2">
          <div className="flex items-center gap-2 text-white/40">
            <Clock className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest font-medium">Pending Payout</span>
          </div>
          <p className="text-2xl font-mono font-bold text-white">${pendingPayout}</p>
          <p className="text-[11px] text-white/30">Awaiting admin payout</p>
        </div>
        <div className="bg-[#111] border border-white/5 rounded p-4 space-y-2">
          <div className="flex items-center gap-2 text-white/40">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest font-medium">Total Earned</span>
          </div>
          <p className="text-2xl font-mono font-bold text-white">${totalEarned}</p>
          <p className="text-[11px] text-white/30">All time (80% of sales)</p>
        </div>
      </div>

      {/* Platform cut info */}
      <div className="bg-[#111] border border-white/5 rounded p-4 space-y-2">
        <div className="flex items-center gap-2 text-white/40">
          <DollarSign className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-widest font-medium">Payout Info</span>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          You earn <strong className="text-white">80%</strong> of every sale. TRENT HQ keeps 20% as platform fee. 
          Payouts are processed manually by the admin. Contact <strong className="text-white">@Omzrii</strong> on Telegram to request a payout.
        </p>
      </div>

      {/* Products section - coming soon / placeholder */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Your Products</p>
        <div className="bg-[#111] border border-white/5 rounded p-8 text-center space-y-2">
          <p className="text-white/40 text-sm">No products yet.</p>
          <p className="text-[11px] text-white/20">Contact @Omzrii on Telegram to get your products listed.</p>
        </div>
      </div>
    </div>
  );
}
