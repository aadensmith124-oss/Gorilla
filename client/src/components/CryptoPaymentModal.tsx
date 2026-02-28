import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { SiBitcoin } from "react-icons/si";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CryptoPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  purpose?: "deposit" | "order";
  orderId?: number;
  onSuccess?: () => void;
}

export function CryptoPaymentModal({ open, onOpenChange, total, purpose = "deposit", orderId, onSuccess }: CryptoPaymentModalProps) {
  const { toast } = useToast();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/forebit/create", {
        amount: (total / 100).toFixed(2),
        purpose,
        orderId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        window.open(data.checkoutUrl, "_blank");
        toast({
          title: "Payment Created",
          description: purpose === "order" 
            ? "A payment window has been opened. Complete payment there and you will receive your item automatically."
            : "A payment window has been opened. Complete payment there and your balance will be credited automatically.",
        });
        if (onSuccess) onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePayment = () => {
    setCheckoutUrl(null);
    createPaymentMutation.mutate();
  };

  const handleClose = () => {
    setCheckoutUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>Crypto Payment</span>
            <span className="bg-amber-500 text-black font-bold px-3 py-1 rounded text-sm">
              ${(total / 100).toFixed(2)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!checkoutUrl ? (
            <>
              <div className="flex items-center gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <SiBitcoin className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-white">Pay with Cryptocurrency</p>
                  <p className="text-sm text-muted-foreground">
                    Bitcoin, Litecoin, Ethereum, USDT & more
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                You'll be redirected to Forebit's secure checkout to complete your payment. 
                {purpose === "order" 
                  ? "You will receive your item automatically once the payment is confirmed."
                  : "Your balance will be credited automatically once the payment is confirmed."}
              </p>

              <Button
                onClick={handleCreatePayment}
                disabled={createPaymentMutation.isPending}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                data-testid="button-pay-crypto"
              >
                {createPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Payment...
                  </>
                ) : (
                  `Pay $${(total / 100).toFixed(2)} with Crypto`
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <ExternalLink className="h-8 w-8 text-green-500" />
                </div>
                <p className="font-medium text-white">Payment Window Opened</p>
                <p className="text-sm text-muted-foreground">
                  {purpose === "order"
                    ? "Complete your payment in the new tab. You will receive your item once confirmed."
                    : "Complete your payment in the new tab. Your balance will be credited once confirmed."}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => window.open(checkoutUrl, "_blank")}
                className="w-full border-white/10"
                data-testid="button-reopen-checkout"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Reopen Payment Page
              </Button>

              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full text-muted-foreground"
                data-testid="button-close-after-payment"
              >
                Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
