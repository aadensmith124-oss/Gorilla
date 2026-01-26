import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { SiBitcoin, SiLitecoin, SiSolana, SiEthereum, SiTether } from "react-icons/si";

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  icon: typeof SiBitcoin;
  color: string;
}

const cryptoOptions: CryptoOption[] = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", icon: SiBitcoin, color: "#F7931A" },
  { id: "ltc", name: "Litecoin", symbol: "LTC", icon: SiLitecoin, color: "#BFBBBB" },
  { id: "sol", name: "Solana", symbol: "SOL", icon: SiSolana, color: "#9945FF" },
  { id: "eth", name: "Ethereum", symbol: "ETH", icon: SiEthereum, color: "#627EEA" },
  { id: "usdt-erc20", name: "USDT (ERC20)", symbol: "USDT", icon: SiTether, color: "#26A17B" },
  { id: "usdc-erc20", name: "USDC (ERC20)", symbol: "USDC", icon: SiTether, color: "#2775CA" },
  { id: "trx", name: "TRON", symbol: "TRX", icon: SiTether, color: "#FF0013" },
  { id: "usdt-trc20", name: "USDT (TRC20)", symbol: "USDT", icon: SiTether, color: "#26A17B" },
];

interface CryptoPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (cryptoId: string) => void;
}

export function CryptoPaymentModal({ open, onOpenChange, total, onConfirm }: CryptoPaymentModalProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedCrypto) {
      onConfirm(selectedCrypto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-white/10">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white">Select Crypto</DialogTitle>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-black font-bold px-3 py-1 rounded text-sm">
              ${(total / 100).toFixed(2)}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
              data-testid="button-close-crypto-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {cryptoOptions.map((crypto) => {
            const Icon = crypto.icon;
            const isSelected = selectedCrypto === crypto.id;
            return (
              <button
                key={crypto.id}
                onClick={() => setSelectedCrypto(crypto.id)}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                  isSelected 
                    ? "border-amber-500 bg-amber-500/10" 
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
                data-testid={`button-crypto-${crypto.id}`}
              >
                <Icon className="h-8 w-8" style={{ color: crypto.color }} />
                <div className="text-left">
                  <div className="font-bold text-white text-sm">{crypto.name}</div>
                  <div className="text-xs text-muted-foreground">{crypto.symbol}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 gap-4">
          <p className="text-sm text-muted-foreground">
            Choose your crypto to continue.
          </p>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedCrypto}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6"
            data-testid="button-confirm-crypto"
          >
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
