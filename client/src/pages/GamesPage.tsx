import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGames } from "@/hooks/use-games";
import { useAuth } from "@/hooks/use-auth";
import { Dice5, Bomb, Loader2, Sparkles, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function GamesPage() {
  const { user } = useAuth();
  
  if (!user) return <div className="p-8 text-center">Please login to play.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl md:text-6xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary animate-pulse">
          ARCADE ZONE
        </h1>
        <p className="text-lg text-muted-foreground">Test your luck and win credits.</p>
      </div>

      <Tabs defaultValue="dice" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-secondary/30 p-1 rounded-xl">
          <TabsTrigger value="dice" className="text-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Dice5 className="mr-2 h-5 w-5" /> Dice Roll
          </TabsTrigger>
          <TabsTrigger value="mines" className="text-lg py-3 data-[state=active]:bg-destructive data-[state=active]:text-white">
            <Bomb className="mr-2 h-5 w-5" /> Mines
          </TabsTrigger>
          <TabsTrigger value="spin" className="text-lg py-3 data-[state=active]:bg-accent data-[state=active]:text-black">
            <Sparkles className="mr-2 h-5 w-5" /> Daily Spin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dice" className="mt-0">
          <DiceGame />
        </TabsContent>
        <TabsContent value="mines" className="mt-0">
          <MinesGame />
        </TabsContent>
        <TabsContent value="spin" className="mt-0">
          <SpinGame />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiceGame() {
  const [bet, setBet] = useState(100);
  const { playDice } = useGames();
  const [result, setResult] = useState<{ roll: number[], won: boolean, payout: number } | null>(null);

  const handleRoll = () => {
    setResult(null);
    playDice.mutate(bet, {
      onSuccess: (data) => setResult(data)
    });
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="text-center border-b border-border bg-secondary/20">
        <CardTitle>Double or Nothing</CardTitle>
        <CardDescription>Roll higher than 7 to win 2x your bet.</CardDescription>
      </CardHeader>
      <CardContent className="p-8 flex flex-col items-center gap-8">
        <div className="h-32 flex items-center gap-4">
          <AnimatePresence mode="wait">
            {result ? (
              <>
                <motion.div 
                  initial={{ rotate: -180, scale: 0 }} 
                  animate={{ rotate: 0, scale: 1 }} 
                  className="w-24 h-24 bg-primary rounded-xl flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-primary/50"
                >
                  {result.roll[0]}
                </motion.div>
                <motion.div 
                  initial={{ rotate: 180, scale: 0 }} 
                  animate={{ rotate: 0, scale: 1 }} 
                  transition={{ delay: 0.1 }}
                  className="w-24 h-24 bg-primary rounded-xl flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-primary/50"
                >
                  {result.roll[1]}
                </motion.div>
              </>
            ) : (
              <div className="text-6xl text-muted-foreground opacity-20 font-display">? ?</div>
            )}
          </AnimatePresence>
        </div>

        {result && (
          <div className={`text-2xl font-bold ${result.won ? 'text-green-500' : 'text-red-500'}`}>
            {result.won ? `YOU WON $${(result.payout/100).toFixed(2)}!` : 'YOU LOST'}
          </div>
        )}

        <div className="flex gap-4 w-full max-w-sm">
          <Input 
            type="number" 
            value={bet/100} 
            onChange={(e) => setBet(parseFloat(e.target.value) * 100)} 
            className="text-center font-mono text-lg"
          />
          <Button 
            size="lg" 
            className="w-full bg-primary hover:bg-primary/80 font-bold" 
            onClick={handleRoll}
            disabled={playDice.isPending}
          >
            {playDice.isPending ? <Loader2 className="animate-spin" /> : "ROLL"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MinesGame() {
  const [bet, setBet] = useState(100);
  const [difficulty, setDifficulty] = useState<"simple" | "extreme" | "impossible">("simple");
  const { playMines } = useGames();
  const [result, setResult] = useState<{ grid: number[], won: boolean, payout: number } | null>(null);

  const handlePlay = () => {
    setResult(null);
    playMines.mutate({ betAmount: bet, difficulty }, {
      onSuccess: (data) => setResult(data)
    });
  };

  return (
    <Card className="border-destructive/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="text-center border-b border-border bg-secondary/20">
        <CardTitle>Minefield</CardTitle>
        <CardDescription>Cross the field without hitting a mine.</CardDescription>
      </CardHeader>
      <CardContent className="p-8 flex flex-col items-center gap-8">
        <div className="grid grid-cols-5 gap-2">
          {result ? (
            result.grid.map((cell, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "w-12 h-12 rounded-md flex items-center justify-center font-bold text-lg shadow-sm",
                  cell === 1 
                    ? "bg-destructive text-white" 
                    : "bg-green-500/20 text-green-500 border border-green-500/50"
                )}
              >
                {cell === 1 ? <Bomb className="h-6 w-6" /> : "SAFE"}
              </motion.div>
            ))
          ) : (
             Array(25).fill(0).map((_, i) => (
               <div key={i} className="w-12 h-12 rounded-md bg-secondary/50 border border-border" />
             ))
          )}
        </div>

        {result && (
           <div className={`text-2xl font-bold ${result.won ? 'text-green-500' : 'text-destructive'}`}>
            {result.won ? `CLEARED! +$${(result.payout/100).toFixed(2)}` : 'EXPLODED!'}
          </div>
        )}

        <div className="flex flex-col gap-4 w-full max-w-sm">
           <div className="grid grid-cols-3 gap-2">
             {(['simple', 'extreme', 'impossible'] as const).map(d => (
               <Button 
                key={d} 
                variant={difficulty === d ? 'default' : 'outline'} 
                onClick={() => setDifficulty(d)}
                className="capitalize"
               >
                 {d}
               </Button>
             ))}
           </div>
           <div className="flex gap-2">
              <Input 
                type="number" 
                value={bet/100} 
                onChange={(e) => setBet(parseFloat(e.target.value) * 100)} 
                className="text-center font-mono text-lg"
              />
              <Button 
                size="lg" 
                className="flex-1 bg-destructive hover:bg-destructive/80 font-bold" 
                onClick={handlePlay}
                disabled={playMines.isPending}
              >
                {playMines.isPending ? <Loader2 className="animate-spin" /> : "START"}
              </Button>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SpinGame() {
  const { spinWheel } = useGames();
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState<number | null>(null);

  const handleSpin = () => {
    setSpinning(true);
    // Simulate spin time then call api
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

  return (
    <Card className="border-accent/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="text-center border-b border-border bg-secondary/20">
        <CardTitle>Daily Lucky Wheel</CardTitle>
        <CardDescription>Spin once every 24 hours for free credits.</CardDescription>
      </CardHeader>
      <CardContent className="p-12 flex flex-col items-center gap-8">
        <div className="relative">
           <motion.div 
             animate={{ rotate: spinning ? 3600 : 0 }} 
             transition={{ duration: 3, ease: "circOut" }}
             className="w-64 h-64 rounded-full border-8 border-accent bg-secondary/50 flex items-center justify-center relative overflow-hidden"
           >
             <div className="absolute inset-0 bg-[conic-gradient(var(--tw-gradient-stops))] from-accent/20 via-primary/20 to-accent/20" />
             <Trophy className="h-24 w-24 text-accent" />
           </motion.div>
           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-4xl text-white">▼</div>
        </div>

        {reward !== null && !spinning && (
          <div className="text-3xl font-bold text-accent animate-bounce">
            You won ${(reward/100).toFixed(2)}!
          </div>
        )}

        <Button 
          size="lg" 
          className="w-48 h-16 text-xl font-bold bg-accent hover:bg-accent/80 text-black shadow-[0_0_20px_rgba(45,212,191,0.5)]" 
          onClick={handleSpin}
          disabled={spinning || spinWheel.isPending}
        >
          {spinning ? "SPINNING..." : "SPIN NOW"}
        </Button>
      </CardContent>
    </Card>
  );
}
