import { useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink, Send, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const ACCESS_POINTS = [
  { label: "unitedcards storefront", value: "this app", href: "/" },
  { label: "account sign in", value: "secure member access", href: "/auth" },
];

export default function BiblePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [identity, setIdentity] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: "Copy unavailable", description: "Select the text and copy it manually." });
    }
  }

  return (
    <main className="min-h-screen bg-[#08090a] px-5 py-10 text-[#b7b7b7]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[390px] flex-col justify-center">
        <section className="mb-5 border border-[#6d3515] bg-[#261307] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
          <div className="mb-4 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#e6a15f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f5a15d] shadow-[0_0_8px_#f5a15d]" />
            unitedcards access guide
          </div>

          <div className="space-y-2">
            {ACCESS_POINTS.map((point) => (
              <div
                key={point.label}
                className="flex items-center justify-between gap-3 border border-[#82431c] bg-[#2c170b] px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => setLocation(point.href)}
                  className="min-w-0 text-left font-mono text-sm text-[#f0c28f] transition-colors hover:text-white"
                >
                  <span className="block truncate">{point.value}</span>
                  <span className="mt-0.5 block text-[10px] lowercase tracking-wide text-[#a66d3f]">{point.label}</span>
                </button>
                <button
                  type="button"
                  onClick={() => copyValue(point.value)}
                  aria-label={`Copy ${point.label}`}
                  className="shrink-0 text-[#d99554] transition-colors hover:text-white"
                >
                  {copied === point.value ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <p className="font-mono text-[20px] font-semibold tracking-[0.08em] text-white">member access</p>
            <p className="mt-1 font-mono text-[12px] text-[#62666c]">enter your account identity to continue</p>
          </div>

          <label className="block space-y-2 font-mono text-[11px] text-[#777b80]">
            email, username, or account number
            <input
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setLocation("/auth");
              }}
              placeholder="email, username, or account #"
              autoComplete="username"
              className="h-11 w-full border border-[#303237] bg-[#17181b] px-3 font-mono text-sm text-[#d7d7d7] outline-none transition-colors placeholder:text-[#55585d] focus:border-[#8a8f96]"
            />
          </label>

          <button
            type="button"
            onClick={() => setLocation("/auth")}
            className="flex h-11 w-full items-center justify-center gap-2 bg-[#b8b8b8] font-mono text-sm font-bold text-[#111214] transition-colors hover:bg-white"
          >
            continue <ArrowRight className="h-4 w-4" />
          </button>

          <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-[#63676d]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#e49a54]" />
            secure account access
          </div>
        </section>

        <footer className="mt-8 space-y-3 text-center font-mono text-[11px] text-[#5d6065]">
          <a
            href="https://t.me/+L4RV2JFJNz45ZGYx"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto flex w-fit items-center gap-2 border border-[#25272b] px-4 py-2 transition-colors hover:border-[#555960] hover:text-[#b7b7b7]"
          >
            <Send className="h-3 w-3 text-[#e49a54]" />
            need help? contact support
            <ExternalLink className="h-3 w-3" />
          </a>
          <p>© 2026 unitedcards</p>
        </footer>
      </div>
    </main>
  );
}