import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Copy, Loader2 } from "lucide-react";

export default function BecomeSellerPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: sellerStatus, isLoading } = useQuery<{
    isSeller: boolean;
    sellerBalance: number;
    totalEarned: number;
    application?: { status: string; sellerCode: string; createdAt: string };
  }>({
    queryKey: ["/api/seller/status"],
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seller/apply");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/seller/status"] });
      toast({ title: "Application submitted!" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (sellerStatus?.isSeller) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">You're an approved seller!</h2>
        <p className="text-white/50 text-sm">Access your seller dashboard to manage your products and view earnings.</p>
        <a href="/seller" className="inline-block px-6 py-3 bg-primary text-black rounded font-medium text-sm hover:bg-primary/90 transition-colors">
          Go to Seller Dashboard →
        </a>
      </div>
    );
  }

  const app = sellerStatus?.application;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white">Become a Seller</h1>
        <p className="text-sm text-white/40">Join NYCHQ marketplace and sell your products</p>
      </div>

      {/* Requirements */}
      <div className="bg-[#111] border border-white/5 rounded p-4 space-y-3">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Requirements</p>
        <div className="space-y-2">
          {[
            "Have a Clean Background",
            "We Keep 20% of all your sales",
            "$10 Monthly subscription fee",
          ].map((req) => (
            <div key={req} className="flex items-start gap-2 text-sm text-white/70">
              <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
              {req}
            </div>
          ))}
        </div>
      </div>

      {app ? (
        <div className="space-y-4">
          <div className={`px-4 py-3 rounded border text-sm ${
            app.status === "pending" ? "bg-yellow-950/30 border-yellow-700/30 text-yellow-400" :
            app.status === "rejected" ? "bg-red-950/30 border-red-700/30 text-red-400" :
            "bg-green-950/30 border-green-700/30 text-green-400"
          }`}>
            Application status: <strong className="capitalize">{app.status}</strong>
          </div>

          {app.status === "pending" && (
            <div className="bg-[#111] border border-white/5 rounded p-4 space-y-3">
              <p className="text-sm text-white/70">
                Your application is pending. Text your seller code to <strong className="text-white">@Omzrii</strong> on Telegram to activate your seller account.
              </p>
              <div className="space-y-1">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Your Seller Code</p>
                <div className="flex items-center gap-2 bg-[#0c0c0c] border border-white/10 rounded px-3 py-2">
                  <span className="flex-1 font-mono text-white tracking-widest text-sm">{app.sellerCode}</span>
                  <button
                    onClick={() => copyCode(app.sellerCode)}
                    className="text-white/40 hover:text-white transition-colors"
                    data-testid="btn-copy-code"
                  >
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-white/30">
                Message @Omzrii on Telegram with your code. Once verified, your seller access will be activated.
              </p>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => applyMutation.mutate()}
          disabled={applyMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-black rounded font-medium text-sm transition-colors disabled:opacity-50"
          data-testid="btn-become-seller"
        >
          {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Become Seller →"}
        </button>
      )}
    </div>
  );
}
