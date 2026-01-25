import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGames } from "@/hooks/use-games";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function DailySpinPage() {
  const { user } = useAuth();
  const { spinWheel } = useGames();
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState<number | null>(null);

  const prizes = [
    { amount: 5, label: "$0.05" },
    { amount: 10, label: "$0.10" },
    { amount: 50, label: "$0.50" },
    { amount: 100, label: "$1.00" },
    { amount: 500, label: "$5.00" },
    { amount: 1000, label: "$10.00" },
  ];

  const handleSpin = () => {
    setSpinning(true);
    setReward(null);
    setTimeout(() => {
      spinWheel.mutate(undefined, {
        onSuccess: (data) => {
          setReward(data.reward);
          setSpinning(false);
        },
        onError: () => setSpinning(false)
      });
    }, 2000);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please login to spin.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <Card className="border-accent/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center border-b border-border bg-secondary/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-accent" />
            <CardTitle className="text-2xl">Daily Spin</CardTitle>
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <CardDescription>Spin once every 24 hours for free credits!</CardDescription>
        </CardHeader>
        <CardContent className="p-8 flex flex-col items-center gap-8">
          <div className="relative">
            <motion.div 
              animate={{ rotate: spinning ? 3600 : 0 }} 
              transition={{ duration: 3, ease: "circOut" }}
              className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-8 border-accent bg-gradient-to-br from-[#16181d] to-[#1c1f26] flex items-center justify-center relative overflow-hidden shadow-[0_0_40px_rgba(45,212,191,0.3)]"
            >
              {prizes.map((p, i) => (
                <div 
                  key={i}
                  className="absolute h-full w-full flex flex-col items-center pt-6 origin-center"
                  style={{ transform: `rotate(${(i * 360) / prizes.length}deg)` }}
                >
                  <span className="font-bold text-lg sm:text-xl text-primary">{p.label}</span>
                </div>
              ))}
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center z-10 shadow-lg">
                <Sparkles className="h-8 w-8 text-black" />
              </div>
            </motion.div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-4xl text-accent z-10 drop-shadow-lg">▼</div>
          </div>

          {reward !== null && !spinning && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold text-accent"
            >
              You won ${(reward/100).toFixed(2)}!
            </motion.div>
          )}

          <Button 
            size="lg" 
            className="w-full max-w-xs h-14 text-xl font-bold bg-accent hover:bg-accent/80 text-black shadow-[0_0_20px_rgba(45,212,191,0.5)]" 
            onClick={handleSpin}
            disabled={spinning || spinWheel.isPending}
            data-testid="btn-spin"
          >
            {spinning ? "SPINNING..." : "SPIN NOW"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
