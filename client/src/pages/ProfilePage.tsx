import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useWallet } from "@/hooks/use-wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Wallet, CreditCard, Clock, Gift, Bitcoin } from "lucide-react";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const defaultTab = location.includes("orders") ? "orders" : "wallet";

  if (isLoading || !user) return <div className="flex h-screen items-center justify-center bg-[#090a0c]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tighter italic uppercase">My Profile</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-50 mt-1">Manage account and history</p>
        </div>
        <Card className="bg-primary/10 border-primary/20 shadow-2xl shadow-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-full text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Current Balance</p>
              <p className="text-2xl font-black italic tracking-tighter text-white">${(user.balance / 100).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-white/5 bg-transparent p-0 h-auto rounded-none gap-8">
          <TabsTrigger value="wallet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-4 text-xs font-black uppercase italic tracking-tighter">
            Wallet & Top-up
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-4 text-xs font-black uppercase italic tracking-tighter">
            Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallet" className="pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <RedeemCodeCard />
            <TransactionsCard />
          </div>
        </TabsContent>

        <TabsContent value="orders" className="pt-8">
          <OrdersList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RedeemCodeCard() {
  const { redeemCode } = useWallet();
  const [code, setCode] = useState("");
  const [loading, setIsLoading] = useState(false);

  const handleRedeem = () => {
    setIsLoading(true);
    redeemCode.mutate(code, {
      onSuccess: () => { setCode(""); setIsLoading(false); },
      onError: () => setIsLoading(false)
    });
  };

  return (
    <Card className="bg-[#16181d] border-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase italic tracking-tighter">
          <Gift className="h-4 w-4 text-primary" /> Redeem Code
        </CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-wider opacity-50">Enter your code to add credits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex gap-2">
          <Input 
            placeholder="ENTER-CODE-HERE" 
            value={code} 
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="h-12 bg-[#1c1f26] border-white/5 font-mono text-sm tracking-widest placeholder:opacity-20"
          />
          <Button size="sm" onClick={handleRedeem} disabled={loading || !code} className="h-12 px-6 font-black italic uppercase tracking-tighter">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
          </Button>
        </div>
        <div className="pt-8 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <Bitcoin className="h-4 w-4 text-[#f7931a]" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Crypto Top-Up</h3>
          </div>
          <Button variant="outline" className="w-full h-14 gap-3 border-dashed border-white/10 bg-white/5 hover:bg-white/10 opacity-70 transition-all group" disabled>
            <Wallet className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" /> 
            <span className="text-xs font-black italic uppercase tracking-tighter">Connect Crypto Wallet (Coming Soon)</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionsCard() {
  const { transactions } = useWallet();
  return (
    <Card className="h-[450px] flex flex-col bg-[#16181d] border-white/5">
      <CardHeader className="border-b border-white/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase italic tracking-tighter">
          <CreditCard className="h-4 w-4 text-primary" /> History
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pr-2 py-4 custom-scrollbar">
        {transactions.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : transactions.data?.length === 0 ? (
          <div className="text-center py-12 opacity-20">
            <Package className="h-8 w-8 mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">No activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.data?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                <div className="flex flex-col gap-0.5">
                  <p className="font-black text-[11px] uppercase italic tracking-tighter text-white/90">{tx.description}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={cn("font-mono font-black text-sm tracking-tighter italic px-2 py-0.5 rounded bg-white/5", tx.amount > 0 ? 'text-green-500' : 'text-destructive')}>
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
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!orders || orders.length === 0) return <div className="text-center py-20 opacity-20"><Package className="h-12 w-12 mx-auto mb-4" /><h3 className="text-sm font-black uppercase italic tracking-tighter mb-2">No orders found</h3><Link href="/"><Button size="sm" variant="link" className="text-primary font-black uppercase italic tracking-tighter">Browse Marketplace</Button></Link></div>;
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="overflow-hidden bg-[#16181d] border-white/5">
          <div className="bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary"><Package className="h-5 w-5" /></div>
              <div>
                <p className="font-black text-xs uppercase italic tracking-tighter">Order #{order.id}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(order.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="text-[9px] font-black italic uppercase tracking-tighter rounded px-2 py-0.5">{order.status}</Badge>
              <span className="font-mono font-black text-lg italic tracking-tighter text-white">${(order.total / 100).toFixed(2)}</span>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="space-y-2">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                  <div className="flex flex-col gap-0.5"><span className="font-black text-[11px] uppercase italic tracking-tighter text-white/80">{item.variant.name}</span><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Digital Delivery</span></div>
                  <div className="flex flex-col items-end gap-2"><span className="font-mono text-xs font-black italic text-primary tracking-tighter">${(item.price / 100).toFixed(2)}</span>{item.stockItem && (<Button size="sm" variant="secondary" className="h-7 px-3 text-[9px] font-black uppercase italic tracking-tighter bg-white/5 hover:bg-white/10" onClick={() => alert(item.stockItem.content)}>View Content</Button>)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
