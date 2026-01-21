import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useWallet } from "@/hooks/use-wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Wallet, CreditCard, Clock, Gift } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Parse tab from query param ?tab=orders roughly
  const defaultTab = location.includes("orders") ? "orders" : "wallet";

  if (isLoading || !user) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your account and view history</p>
        </div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-full text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Current Balance</p>
              <p className="text-2xl font-mono font-bold text-primary">${(user.balance / 100).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto rounded-none">
          <TabsTrigger value="wallet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
            Wallet & Top-up
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
            Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallet" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <RedeemCodeCard />
            <TransactionsCard />
          </div>
        </TabsContent>

        <TabsContent value="orders" className="pt-6">
          <OrdersList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RedeemCodeCard() {
  const { redeemCode } = useWallet();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRedeem = () => {
    setIsLoading(true);
    redeemCode.mutate(code, {
      onSuccess: () => {
        setCode("");
        setIsLoading(false);
      },
      onError: () => setIsLoading(false)
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /> Redeem Code</CardTitle>
        <CardDescription>Have a gift card or promo code? Enter it here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="ENTER-CODE-HERE" 
            value={code} 
            onChange={(e) => setCode(e.target.value)}
            className="font-mono uppercase"
          />
          <Button onClick={handleRedeem} disabled={isLoading || !code}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Funds are added instantly to your balance.
        </p>
      </CardContent>
    </Card>
  );
}

function TransactionsCard() {
  const { transactions } = useWallet();

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pr-2 custom-scrollbar">
        {transactions.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : transactions.data?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No transactions yet.</p>
        ) : (
          <div className="space-y-4">
            {transactions.data?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-sm">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}${(tx.amount / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrdersList() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) return <Loader2 className="animate-spin" />;

  if (!orders || orders.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-bold mb-2">No orders yet</h3>
          <p className="text-muted-foreground mb-6">Start shopping to see your orders here.</p>
          <Link href="/">
            <Button>Browse Shop</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="overflow-hidden">
          <div className="bg-secondary/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold">Order #{order.id}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                {order.status.toUpperCase()}
              </Badge>
              <span className="font-mono font-bold text-lg">${(order.total / 100).toFixed(2)}</span>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="space-y-2">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <span className="font-medium text-sm">{item.variant.name}</span>
                  <div className="flex flex-col items-end">
                     <span className="font-mono text-sm">${(item.price / 100).toFixed(2)}</span>
                     {item.stockItem && (
                       <Button variant="link" size="sm" className="h-auto p-0 text-primary" onClick={() => {
                         // Simple alert for MVP, ideally a modal
                         alert(item.stockItem.content);
                       }}>
                         View Content
                       </Button>
                     )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
               <Link href={`/order/${order.id}`}>
                 <Button variant="outline" size="sm">View Full Details</Button>
               </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
