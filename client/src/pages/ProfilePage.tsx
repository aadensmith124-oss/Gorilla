import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useWallet } from "@/hooks/use-wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, Package, Clock, Gift, Mail, Key, User, Calendar, Link2, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { SiBitcoin } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { CryptoPaymentModal } from "@/components/CryptoPaymentModal";
import { queryClient } from "@/lib/queryClient";

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const orderId = searchParams.get("order");
  const tabParam = searchParams.get("tab");  
  const { data: orders } = useOrders();
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam === "orders") return "orders";
    if (tabParam === "balance") return "balance";
    return "dashboard";
  });

  const { toast } = useToast();

  useEffect(() => {
    if (tabParam === "orders") setActiveTab("orders");
    else if (tabParam === "balance") setActiveTab("balance");
  }, [tabParam]);

  useEffect(() => {
    if (orderId && orders) {
      const order = orders.find((o: any) => o.orderId === orderId || o.id.toString() === orderId);
      if (order) {
        setSelectedOrder(order);
        setActiveTab("orders");
      }
    }
  }, [orderId, orders]);

  if (isLoading || !user) return <div className="flex h-screen items-center justify-center bg-[#090a0c]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <p className="text-xs text-muted-foreground">Your account</p>
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-white/5 bg-transparent p-0 h-auto rounded-none gap-6">
          <TabsTrigger value="dashboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-sm font-medium">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-sm font-medium text-destructive">
            Orders
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-sm font-medium">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="pt-6">
          <DashboardTab user={user} logout={logout} />
        </TabsContent>

        <TabsContent value="orders" className="pt-6">
          <OrdersTab />
        </TabsContent>

        <TabsContent value="settings" className="pt-6">
          <SettingsTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab({ user, logout }: { user: any; logout: () => void }) {
  return (
    <Card className="bg-card/40 border-white/5">
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Username</p>
          <p className="text-lg font-bold text-white">{user.username}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
          <p className="text-lg font-bold text-white">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Telegram</p>
          <p className="text-lg font-bold text-white">{user.telegramUsername}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Member Since</p>
          <p className="text-sm text-white">{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
        <button 
          onClick={logout}
          className="w-full h-10 mt-4 bg-destructive/20 border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/30 transition-colors font-bold uppercase tracking-wider text-sm"
        >
          Logout
        </button>
      </CardContent>
    </Card>
  );
}

function SettingsTab({ user }: { user: any }) {
  const [newTelegram, setNewTelegram] = useState(user.telegramUsername);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const handleUpdateTelegram = () => {
    toast({ title: "Telegram Updated", description: "Your telegram username has been updated successfully" });
  };

  const handleUpdatePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    toast({ title: "Password Updated", description: "Your password has been updated successfully" });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#16181d] border-white/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">ID:</span>
            <span className="font-mono text-xs">{user.id}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Username:</span>
            <span>{user.username}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span className="text-destructive">{user.email || user.username}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Referer:</span>
            <span>N/A</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Joined:</span>
            <span>{new Date(user.createdAt).toLocaleDateString()} {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          
          <div className="flex items-center gap-3 pt-4">
            <Button variant="outline" className="border-destructive/30 text-destructive" onClick={logout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#16181d] border-white/5">
        <CardHeader>
          <CardTitle className="text-destructive text-lg">Change Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">New Email</label>
            <Input 
              placeholder="name@example.com" 
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="bg-[#1c1f26] border-white/5"
              data-testid="input-new-email"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Confirm Email</label>
            <Input 
              placeholder="name@example.com" 
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="bg-[#1c1f26] border-white/5"
              data-testid="input-confirm-email"
            />
          </div>
          <Button variant="outline" className="border-destructive/30 text-destructive" onClick={handleUpdateEmail} data-testid="button-update-email">
            <Mail className="h-4 w-4 mr-2" /> Update Email
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#16181d] border-white/5">
        <CardHeader>
          <CardTitle className="text-destructive text-lg">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">New Password</label>
            <Input 
              type="password"
              placeholder="********" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-[#1c1f26] border-white/5"
              data-testid="input-new-password"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Confirm Password</label>
            <Input 
              type="password"
              placeholder="********" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-[#1c1f26] border-white/5"
              data-testid="input-confirm-password"
            />
          </div>
          <Button variant="outline" className="border-destructive/30 text-destructive" onClick={handleUpdatePassword} data-testid="button-update-password">
            <Key className="h-4 w-4 mr-2" /> Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersTab() {
  const { data: orders, isLoading, refetch } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  
  return (
    <div className="space-y-4">
      {!orders || orders.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <Package className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-sm font-bold mb-2">No orders found</h3>
          <Link href="/">
            <Button size="sm" className="text-primary">Browse Marketplace</Button>
          </Link>
        </div>
      ) : (
        <Card className="bg-[#16181d] border-white/5">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left p-4 font-medium">#</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Total</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4">
                      <Button variant="ghost" size="icon" onClick={() => refetch()} data-testid="button-refresh-orders">
                        <Clock className="h-4 w-4" />
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const productItems = order.items.filter((i: any) => i.itemType !== 'card');
                    const cardItems = order.items.filter((i: any) => i.itemType === 'card');
                    const titleParts: string[] = [];
                    if (productItems.length > 0) titleParts.push(productItems.map((i: any) => i.variant?.name || 'Product').join(', '));
                    if (cardItems.length > 0) titleParts.push(`${cardItems.length} Card${cardItems.length > 1 ? 's' : ''}`);
                    const hasCards = cardItems.length > 0;
                    const hasProducts = productItems.length > 0;
                    const typeLabel = hasCards && hasProducts ? 'Mixed' : hasCards ? 'Cards' : 'Order';

                    return (
                    <tr key={order.id} className="border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setSelectedOrder(order)}>
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={hasCards && !hasProducts ? 'border-yellow-500/30 text-yellow-500' : hasCards && hasProducts ? 'border-purple-500/30 text-purple-400' : 'border-destructive/30 text-destructive'}>
                          {typeLabel}
                        </Badge>
                      </td>
                      <td className="p-4 truncate max-w-[200px]">
                        {titleParts.join(' + ')}
                      </td>
                      <td className="p-4 text-green-500">${(order.total / 100).toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`flex items-center gap-2 ${
                          order.status === 'fulfilled' || order.status === 'paid' ? 'text-green-500' 
                          : order.status === 'unpaid' ? 'text-red-500'
                          : 'text-amber-500'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            order.status === 'fulfilled' || order.status === 'paid' ? 'bg-green-500'
                            : order.status === 'unpaid' ? 'bg-red-500'
                            : 'bg-amber-500'
                          }`} />
                          {order.status === 'fulfilled' ? 'Fulfilled' : order.status === 'paid' ? 'Paid' : order.status === 'pending' ? 'Pending' : order.status === 'unpaid' ? 'Cancelled' : order.status}
                          <br />
                          <span className="text-xs text-muted-foreground">on {new Date(order.createdAt).toLocaleDateString()}</span>
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button size="icon" variant="ghost" className="text-amber-500" data-testid={`button-view-order-${order.id}`}>
                          <Package className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-2 p-4 border-t border-white/5">
              <span className="text-muted-foreground">«</span>
              <span className="text-sm">1 of 1</span>
              <span className="text-muted-foreground">»</span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedOrder && (
        <OrderDetailsSheet 
          order={selectedOrder} 
          open={!!selectedOrder} 
          onOpenChange={(open) => !open && setSelectedOrder(null)} 
        />
      )}
    </div>
  );
}

function OrderDetailsSheet({ order, open, onOpenChange }: { order: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState("info");
  const [viewingStockIdx, setViewingStockIdx] = useState<number | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const viewingItem = viewingStockIdx !== null ? order.items?.[viewingStockIdx] : null;

  if (viewingItem) {
    const content = viewingItem.itemType === 'card' && viewingItem.card
      ? `${viewingItem.card.cardNumber} | ${viewingItem.card.expiry} | ${viewingItem.card.cvv}`
      : viewingItem.stockItem?.content || '';

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md bg-[#0d0f12] border-l border-white/5 text-white p-0">
          <div className="p-6 space-y-6 h-full flex flex-col">
            <h2 className="text-lg font-display font-black tracking-tighter italic uppercase">Order info</h2>

            <div className="flex-1 flex flex-col gap-4">
              <div
                className="bg-black border border-white/10 text-white rounded-lg p-4 text-sm font-mono break-all whitespace-pre-wrap cursor-pointer min-h-[120px]"
                onClick={() => copyToClipboard(content)}
                data-testid="stock-content-box"
              >
                {content}
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic tracking-tighter text-xs h-10"
                onClick={() => setViewingStockIdx(null)}
                data-testid="button-stock-back"
              >
                Back
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-[#0d0f12] border-l border-white/5 text-white p-0">
        <div className="p-6 space-y-6 h-full flex flex-col">
          <h2 className="text-lg font-display font-black tracking-tighter italic uppercase">Order info</h2>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1">
            <TabsList className="w-full bg-transparent border-b border-white/5 rounded-none p-0 h-auto gap-8">
              <TabsTrigger 
                value="info" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground data-[state=active]:text-blue-500"
              >
                Info
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground data-[state=active]:text-blue-500"
              >
                Products
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="pt-6 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">ID</p>
                <p className="text-xs font-mono break-all">{order.orderId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Creation date</p>
                <p className="text-xs">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Reason</p>
                <p className="text-xs">cart</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Expected amount</p>
                <p className="text-xs">${(order.total / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Paid amount</p>
                <p className="text-xs">${(order.total / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                <p className={`text-xs font-bold ${
                  order.status === 'fulfilled' || order.status === 'paid' ? 'text-green-500'
                  : order.status === 'unpaid' ? 'text-red-500'
                  : 'text-amber-500'
                }`}>
                  {order.status === 'fulfilled' || order.status === 'paid' ? 'Fulfilled' : order.status === 'pending' ? 'Pending' : order.status === 'unpaid' ? 'Cancelled' : order.status}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="products" className="pt-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {order.items?.map((item: any, idx: number) => (
                <div key={idx} className="space-y-4 border-b border-white/5 pb-6 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={item.itemType === 'card' ? 'border-yellow-500/30 text-yellow-500 text-[9px]' : 'border-primary/30 text-primary text-[9px]'}>
                      {item.itemType === 'card' ? '💳 Credit Card' : '📦 Product'}
                    </Badge>
                  </div>

                  {item.itemType === 'card' ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Card</p>
                        <p className="text-xs font-bold font-mono">{item.card?.maskedCard || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Country</p>
                        <p className="text-xs font-bold">{item.card?.country || 'N/A'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Product</p>
                        <p className="text-xs font-bold">{item.variant?.product?.name || item.variant?.name || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Option</p>
                        <p className="text-xs font-bold">{item.variant?.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Quantity</p>
                        <p className="text-xs font-bold">{item.quantity}</p>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Unit price</p>
                    <p className="text-xs font-bold">${(item.price / 100).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
                    <p className="text-xs font-bold">${((item.price * item.quantity) / 100).toFixed(2)}</p>
                  </div>

                  {(order.status === 'fulfilled' || order.status === 'paid') && (item.stockItem || (item.itemType === 'card' && item.card)) && (
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic tracking-tighter text-xs h-10"
                      onClick={() => setViewingStockIdx(idx)}
                      data-testid={`button-view-stock-${idx}`}
                    >
                      View stock
                    </Button>
                  )}
                  {order.status === 'pending' && (
                    <p className="text-xs text-amber-500 text-center font-medium">Awaiting payment confirmation</p>
                  )}
                  {order.status === 'unpaid' && (
                    <p className="text-xs text-red-500 text-center font-medium">Order cancelled</p>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BalanceTab({ user }: { user: any }) {
  const { redeemCode } = useWallet();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);

  const handleRedeem = () => {
    if (!giftCardCode.trim()) return;
    setLoading(true);
    redeemCode.mutate(giftCardCode, {
      onSuccess: () => { setGiftCardCode(""); setLoading(false); },
      onError: () => setLoading(false)
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#16181d] border-white/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-destructive font-medium">Current Balance</span>
            <span className="text-green-500 font-bold text-xl">${(user.balance / 100).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-900/20 border-green-500/20">
        <CardContent className="p-4">
          <p className="text-sm text-green-300">
            Balance decays at 0.7% per hour of your current balance to keep purchasing fair for everyone.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-[#16181d] border-white/5">
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Amount to charge</h3>
            <Input 
              placeholder="amount to charge in $" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-[#1c1f26] border-white/5"
              data-testid="input-charge-amount"
            />
          </div>

          <Button 
            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold"
            onClick={() => {
              if (!amount || parseFloat(amount) < 0.50) {
                toast({ title: "Error", description: "Minimum top-up is $0.50", variant: "destructive" });
                return;
              }
              setShowCryptoModal(true);
            }}
            data-testid="button-charge"
          >
            <SiBitcoin className="h-4 w-4 mr-2" />
            Top Up with Crypto
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#16181d] border-white/5">
        <CardHeader>
          <CardTitle className="text-destructive text-lg">Redeem Gift Card</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Gift Card Code</label>
            <Input 
              placeholder="XXXX-XXXX-XXXX-XXXX" 
              value={giftCardCode}
              onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
              className="bg-[#1c1f26] border-white/5 font-mono"
              data-testid="input-gift-card"
            />
          </div>
          <Button 
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
            onClick={handleRedeem}
            disabled={loading || !giftCardCode.trim()}
            data-testid="button-redeem-gift-card"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gift className="h-4 w-4 mr-2" />}
            Redeem
          </Button>
        </CardContent>
      </Card>

      <CryptoPaymentModal
        open={showCryptoModal}
        onOpenChange={setShowCryptoModal}
        total={Math.round(parseFloat(amount || "0") * 100)}
        purpose="deposit"
        onSuccess={() => {
          setShowCryptoModal(false);
          setAmount("");
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }}
      />
    </div>
  );
}
