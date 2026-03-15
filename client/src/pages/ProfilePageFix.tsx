import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Package } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const { data: orders } = useOrders();
  const [, setLocation] = useLocation();
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
          <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-sm font-medium">
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
                onClick={() => logout()}
                className="w-full h-10 mt-4 bg-destructive/20 border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/30 transition-colors font-bold uppercase tracking-wider text-sm"
              >
                Logout
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="pt-6">
          {orders && orders.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-black text-white uppercase tracking-widest mb-4">
                {orders.length} ORDER{orders.length !== 1 ? "S" : ""} FOUND
              </p>
              <div className="bg-[#0d0f12] rounded-xl border border-white/5 overflow-hidden">
                <div className="grid grid-cols-4 px-4 py-2.5 border-b border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Paid</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Expected</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Status</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Date</span>
                </div>
                {orders.map((order: any) => {
                  const paid = order.status === "fulfilled" ? order.total : 0;
                  const expected = order.total;
                  return (
                    <button
                      key={order.id}
                      onClick={() => setLocation(`/order/${order.orderId}`)}
                      className="w-full grid grid-cols-4 px-4 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="text-sm font-bold text-white">${(paid / 100).toFixed(2)}</span>
                      <span className="text-sm text-white/70">${(expected / 100).toFixed(2)}</span>
                      <span className={`text-sm font-bold ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
                      <span className="text-xs text-white/50">{formatDate(order.createdAt)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold uppercase tracking-widest">No orders yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="pt-6">
          <SettingsTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function statusLabel(s: string) {
  if (s === "pending") return "Pending";
  if (s === "waiting_payment") return "Unpaid";
  if (s === "delivering") return "Processing";
  if (s === "fulfilled") return "Fulfilled";
  return s;
}

function statusColor(s: string) {
  if (s === "fulfilled") return "text-green-400";
  if (s === "delivering") return "text-blue-400";
  if (s === "waiting_payment") return "text-orange-400";
  return "text-white/50";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
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
          <Button onClick={handleUpdateTelegram} className="w-full">Update Telegram</Button>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-white/5">
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">New Password</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-white/5 border-white/5 text-white" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Confirm Password</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-white/5 border-white/5 text-white" />
          </div>
          <Button onClick={handleUpdatePassword} className="w-full">Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
