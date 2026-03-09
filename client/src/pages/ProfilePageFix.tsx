import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const { data: orders } = useOrders();
  const [activeTab, setActiveTab] = useState("dashboard");

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
        </TabsContent>

        <TabsContent value="orders" className="pt-6">
          <div className="space-y-3">
            {orders && orders.length > 0 ? (
              orders.map((order: any) => (
                <Link key={order.id} href={`/order/${order.orderId}`}>
                  <Card className="bg-card/40 border-white/5 hover:border-white/10 transition-colors cursor-pointer">
                    <CardContent className="pt-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{order.orderId}</p>
                        <p className="text-xs text-muted-foreground">${(order.total / 100).toFixed(2)}</p>
                      </div>
                      <Badge className={getStatusBadgeClass(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold uppercase tracking-widest">No orders yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="pt-6">
          <SettingsTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'waiting_payment':
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case 'delivering':
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case 'fulfilled':
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-muted/20 text-muted-foreground border-muted/30";
  }
}

function SettingsTab({ user }: { user: any }) {
  const [newTelegram, setNewTelegram] = useState(user.telegramUsername);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const handleUpdateTelegram = () => {
    toast({ title: "Success", description: "Telegram username updated" });
  };

  const handleUpdatePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: "Password updated" });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/40 border-white/5">
        <CardHeader>
          <CardTitle>Update Telegram</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Telegram Username</label>
            <Input 
              value={newTelegram}
              onChange={(e) => setNewTelegram(e.target.value)}
              placeholder="@username"
              className="bg-white/5 border-white/5 text-white"
            />
          </div>
          <Button 
            onClick={handleUpdateTelegram}
            className="w-full"
          >
            Update Telegram
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-white/5">
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">New Password</label>
            <Input 
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-white/5 border-white/5 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Confirm Password</label>
            <Input 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white/5 border-white/5 text-white"
            />
          </div>
          <Button 
            onClick={handleUpdatePassword}
            className="w-full"
          >
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
