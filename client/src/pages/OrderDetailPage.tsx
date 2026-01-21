import { useRoute } from "wouter";
import { useOrder } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OrderDetailPage() {
  const [, params] = useRoute("/order/:id");
  const { data: order, isLoading } = useOrder(parseInt(params?.id || "0"));
  const { toast } = useToast();

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!order) return <div>Order not found</div>;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Content copied to clipboard." });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Order #{order.id}</h1>
        <p className="text-muted-foreground">Thank you for your purchase.</p>
      </div>

      <div className="space-y-6">
        {order.items.map((item: any, i: number) => (
          <Card key={i} className="overflow-hidden border-primary/20">
            <CardHeader className="bg-secondary/30 pb-3 border-b border-border">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{item.variant.product.name} - {item.variant.name}</CardTitle>
                <span className="font-mono text-primary font-bold">${(item.price / 100).toFixed(2)}</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-card/50">
              {item.stockItem ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-500 text-sm font-medium mb-2">
                    <CheckCircle className="h-4 w-4" /> Delivered Instantly
                  </div>
                  <div className="relative group">
                    <pre className="bg-black/50 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap border border-border">
                      {item.stockItem.content}
                    </pre>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(item.stockItem.content)}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Please save this content immediately. We do not keep backups indefinitely.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-500 p-4 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Processing delivery... please refresh in a moment.</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
