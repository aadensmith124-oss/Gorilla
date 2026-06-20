import { useState } from "react";
import { useVerification, useSubmitVerification } from "@/hooks/use-verification";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { RulesModal } from "@/components/RulesModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ShieldX,
  CheckSquare,
  Square,
  Loader2,
  BadgeCheck,
  Store,
  Zap,
  MessageCircle,
} from "lucide-react";

const TERMS = `1. Channel Promotion
Resellers must provide their Telegram channel name and link when ordering. You agree that your channel name may be mentioned or promoted in our channel.

2. No Account Sharing
Your account is for personal use only. Sharing your account with others is strictly prohibited and will result in immediate termination without refund.

3. Reseller Purpose
Products are sold at low reseller pricing so buyers can resell them in their own channels or stores.

4. Responsibility
You are responsible for how you resell the products and managing your own customers.

5. Agreement
By using this store or purchasing any product, you confirm that you accept and agree to these terms and all rules.`;

const PERKS = [
  { icon: Zap, label: "Reseller Pricing", desc: "Access to low wholesale prices" },
  { icon: Store, label: "Instant Stock", desc: "Priority access to new drops" },
  { icon: MessageCircle, label: "Seller Support", desc: "Dedicated Telegram support channel" },
];

export default function BecomeSellerPage() {
  const { user } = useAuth();
  const { verification, isLoading, isApproved, isDenied, isPending, isTermed } = useVerification(!!user);
  const { toast } = useToast();
  const submitMutation = useSubmitVerification();

  const [telegramUsername, setTelegramUsername] = useState("");
  const [channelLink, setChannelLink] = useState("");
  const [channelName, setChannelName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const handleSubmit = async () => {
    if (!agreed) {
      toast({ title: "Required", description: "You must agree to the terms", variant: "destructive" });
      return;
    }
    if (!telegramUsername || !channelLink || !channelName) {
      toast({ title: "Required", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    try {
      await submitMutation.mutateAsync({ telegramUsername, channelLink, channelName, agreedToTerms: true });
      toast({ title: "Application submitted!", description: "An admin will review your application shortly." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090a0c] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0c] pb-20">
      <div className="max-w-lg w-full mx-auto px-4 pt-6 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-white">Become a Seller</h1>
          </div>
          <p className="text-xs text-white/40">Apply to become a verified reseller and unlock exclusive pricing</p>
        </div>

        {/* Perks */}
        {!isApproved && (
          <div className="grid grid-cols-3 gap-2">
            {PERKS.map((p) => (
              <div key={p.label} className="bg-white/3 border border-white/6 rounded-xl p-3 text-center space-y-1.5">
                <p.icon className="h-4 w-4 text-primary mx-auto" />
                <p className="text-[11px] font-bold text-white">{p.label}</p>
                <p className="text-[10px] text-white/35 leading-tight">{p.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* === APPROVED === */}
        {isApproved && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-green-500/8 border border-green-500/25 rounded-2xl px-5 py-5">
              <CheckCircle2 className="h-8 w-8 text-green-400 shrink-0" />
              <div>
                <p className="text-base font-black text-green-400">You're a Verified Seller!</p>
                <p className="text-xs text-white/50 mt-0.5">Your account has full seller access and reseller pricing.</p>
              </div>
            </div>
            <div className="space-y-2">
              {verification?.telegramUsername && (
                <div className="flex justify-between items-center bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                  <span className="text-xs text-white/40">Telegram</span>
                  <span className="text-xs font-mono text-white">{verification.telegramUsername}</span>
                </div>
              )}
              {verification?.channelName && (
                <div className="flex justify-between items-center bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                  <span className="text-xs text-white/40">Channel</span>
                  <span className="text-xs font-mono text-white">{verification.channelName}</span>
                </div>
              )}
              {verification?.channelLink && (
                <div className="flex justify-between items-center bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                  <span className="text-xs text-white/40">Link</span>
                  <a
                    href={verification.channelLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate max-w-[220px]"
                  >
                    {verification.channelLink}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === PENDING === */}
        {isPending && (
          <div className="flex items-center gap-4 bg-yellow-500/8 border border-yellow-500/25 rounded-2xl px-5 py-5">
            <Clock className="h-8 w-8 text-yellow-400 shrink-0" />
            <div>
              <p className="text-base font-black text-yellow-400">Application Under Review</p>
              <p className="text-xs text-white/50 mt-0.5">An admin is reviewing your application. Purchasing is locked until approved.</p>
            </div>
          </div>
        )}

        {/* === TERMED === */}
        {isTermed && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-red-900/20 border border-red-500/25 rounded-2xl px-5 py-5">
              <ShieldX className="h-8 w-8 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-black text-red-400">Account Termed</p>
                <p className="text-xs text-white/50 mt-0.5">Your seller account was terminated.</p>
                {verification?.termMessage && (
                  <p className="text-xs text-red-300/70 mt-2 leading-relaxed">{verification.termMessage}</p>
                )}
              </div>
            </div>
            <ReapplyForm
              telegramUsername={telegramUsername}
              setTelegramUsername={setTelegramUsername}
              channelLink={channelLink}
              setChannelLink={setChannelLink}
              channelName={channelName}
              setChannelName={setChannelName}
              agreed={agreed}
              setAgreed={setAgreed}
              onShowRules={() => setShowRules(true)}
              onSubmit={handleSubmit}
              isPending={submitMutation.isPending}
              label="Reapply"
            />
          </div>
        )}

        {/* === DENIED === */}
        {isDenied && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-red-900/15 border border-red-500/20 rounded-2xl px-5 py-5">
              <XCircle className="h-8 w-8 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-black text-red-400">Application Denied</p>
                {verification?.adminNote ? (
                  <p className="text-xs text-white/50 mt-0.5">{verification.adminNote}</p>
                ) : (
                  <p className="text-xs text-white/50 mt-0.5">Your application was not approved. You may reapply.</p>
                )}
              </div>
            </div>
            <ReapplyForm
              telegramUsername={telegramUsername}
              setTelegramUsername={setTelegramUsername}
              channelLink={channelLink}
              setChannelLink={setChannelLink}
              channelName={channelName}
              setChannelName={setChannelName}
              agreed={agreed}
              setAgreed={setAgreed}
              onShowRules={() => setShowRules(true)}
              onSubmit={handleSubmit}
              isPending={submitMutation.isPending}
              label="Reapply"
            />
          </div>
        )}

        {/* === NOT APPLIED === */}
        {!verification && (
          <div className="space-y-5">
            {/* Terms box */}
            <div className="bg-black/40 border border-white/6 rounded-xl p-4">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Terms of Service</p>
              <pre className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap font-sans">{TERMS}</pre>
            </div>

            {/* Agree */}
            <button
              onClick={() => setAgreed(!agreed)}
              className="flex items-start gap-3 w-full text-left group"
            >
              <div className="mt-0.5 shrink-0">
                {agreed
                  ? <CheckSquare className="h-5 w-5 text-primary" />
                  : <Square className="h-5 w-5 text-white/30 group-hover:text-white/60 transition-colors" />
                }
              </div>
              <p className="text-sm text-white/70 group-hover:text-white transition-colors leading-snug">
                I have read and agree to the Terms of Service above and all{" "}
                <button onClick={e => { e.stopPropagation(); setShowRules(true); }} className="text-primary hover:underline">store rules</button>
              </p>
            </button>

            {/* Fields */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Your Information</p>
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Telegram @username</label>
                <Input
                  placeholder="@yourusername"
                  value={telegramUsername}
                  onChange={e => setTelegramUsername(e.target.value)}
                  className="bg-black/50 border-white/10"
                  data-testid="input-seller-telegram"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Telegram channel link</label>
                <Input
                  placeholder="https://t.me/yourchannel"
                  value={channelLink}
                  onChange={e => setChannelLink(e.target.value)}
                  className="bg-black/50 border-white/10"
                  data-testid="input-seller-channel-link"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Channel name</label>
                <Input
                  placeholder="My Resell Channel"
                  value={channelName}
                  onChange={e => setChannelName(e.target.value)}
                  className="bg-black/50 border-white/10"
                  data-testid="input-seller-channel-name"
                />
              </div>
            </div>

            <Button
              className="w-full h-11 font-bold"
              onClick={handleSubmit}
              disabled={submitMutation.isPending || !agreed}
              data-testid="btn-seller-apply"
            >
              {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit Application
            </Button>
          </div>
        )}
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}

function ReapplyForm({
  telegramUsername, setTelegramUsername,
  channelLink, setChannelLink,
  channelName, setChannelName,
  agreed, setAgreed,
  onShowRules, onSubmit, isPending, label,
}: {
  telegramUsername: string; setTelegramUsername: (v: string) => void;
  channelLink: string; setChannelLink: (v: string) => void;
  channelName: string; setChannelName: (v: string) => void;
  agreed: boolean; setAgreed: (v: boolean) => void;
  onShowRules: () => void; onSubmit: () => void;
  isPending: boolean; label: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Your Information</p>
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Telegram @username</label>
        <Input placeholder="@yourusername" value={telegramUsername} onChange={e => setTelegramUsername(e.target.value)} className="bg-black/50 border-white/10" />
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Channel link</label>
        <Input placeholder="https://t.me/yourchannel" value={channelLink} onChange={e => setChannelLink(e.target.value)} className="bg-black/50 border-white/10" />
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Channel name</label>
        <Input placeholder="My Resell Channel" value={channelName} onChange={e => setChannelName(e.target.value)} className="bg-black/50 border-white/10" />
      </div>
      <button onClick={() => setAgreed(!agreed)} className="flex items-start gap-3 w-full text-left group">
        <div className="mt-0.5 shrink-0">
          {agreed ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-white/30 group-hover:text-white/60 transition-colors" />}
        </div>
        <p className="text-sm text-white/70 group-hover:text-white transition-colors leading-snug">
          I agree to the Terms of Service and all{" "}
          <button onClick={e => { e.stopPropagation(); onShowRules(); }} className="text-primary hover:underline">store rules</button>
        </p>
      </button>
      <Button className="w-full h-11 font-bold" onClick={onSubmit} disabled={isPending || !agreed}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>
    </div>
  );
}
