import { useEffect, useState } from "react";

interface SecurityCheckProps {
  onVerified: () => void;
}

export function SecurityCheck({ onVerified }: SecurityCheckProps) {
  const [dots, setDots] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d + 1) % 8);
    }, 200);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        const increment = p < 60 ? Math.random() * 8 + 4 : Math.random() * 3 + 1;
        return Math.min(p + increment, 100);
      });
    }, 120);

    const completeTimer = setTimeout(() => {
      setProgress(100);
      setDone(true);
    }, 2800);

    const exitTimer = setTimeout(() => {
      onVerified();
    }, 3400);

    return () => {
      clearInterval(dotInterval);
      clearInterval(progressInterval);
      clearTimeout(completeTimer);
      clearTimeout(exitTimer);
    };
  }, [onVerified]);

  const DOT_COUNT = 8;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-center px-8 md:px-16"
      style={{ background: "#000" }}
    >
      <div className="max-w-lg">
        <p className="text-white text-2xl font-bold mb-6 tracking-tight opacity-90">
          rulfshop.com
        </p>

        <h1 className="text-white text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
          Performing security<br />verification
        </h1>

        <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-sm">
          This website uses a security service to protect against malicious bots and unauthorized access. Please wait while we verify your browser.
        </p>

        <div
          className="rounded-lg px-5 py-4 flex items-center justify-between"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        >
          <div className="flex items-center gap-4">
            <div className="relative w-9 h-9 flex-shrink-0">
              {Array.from({ length: DOT_COUNT }).map((_, i) => {
                const angle = (i / DOT_COUNT) * 2 * Math.PI;
                const x = 50 + 38 * Math.cos(angle);
                const y = 50 + 38 * Math.sin(angle);
                const isActive = done || i === dots || i === (dots + 1) % DOT_COUNT || i === (dots + 2) % DOT_COUNT;
                return (
                  <div
                    key={i}
                    className="absolute rounded-full transition-opacity duration-200"
                    style={{
                      width: 5,
                      height: 5,
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                      background: done ? "#d4af37" : "#4a9eff",
                      opacity: done ? 1 : isActive ? 1 : 0.2,
                    }}
                  />
                );
              })}
            </div>
            <span className="text-white text-sm font-medium">
              {done ? "Verification complete" : "Verifying..."}
            </span>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-white/80 text-xs font-bold tracking-widest uppercase">
              RULF<span className="text-[#d4af37]">SHOP</span>
            </p>
            <p className="text-white/30 text-[10px] mt-0.5">Security · Protected</p>
          </div>
        </div>

        <div className="mt-4 h-0.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: done ? "#d4af37" : "#4a9eff",
            }}
          />
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-white/20 text-[11px]">
          Ray ID: {Math.random().toString(36).substring(2, 18).toUpperCase()} · Protected by RULFSHOP Security
        </p>
      </div>
    </div>
  );
}
