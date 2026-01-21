import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users, DollarSign, Package, BarChart3 } from "lucide-react";
import { useState } from "react";
import { StockForm } from "@/components/Admin/StockForm";

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { dashboard } = useAdmin();

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const stats = [
    { label: "Total Users", value: dashboard.data?.totalUsers || 0, icon: Users, color: "text-blue-500" },
    { label: "Total Sales", value: `$${((dashboard.data?.totalSales || 0)/100).toFixed(2)}`, icon: DollarSign, color: "text-green-500" },
    { label: "Store Balance", value: `$${((dashboard.data?.storeBalance || 0)/100).toFixed(2)}`, icon: BarChart3, color: "text-purple-500" },
    { label: "Stock Items", value: dashboard.data?.itemsInStock || 0, icon: Package, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{dashboard.isLoading ? "..." : stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-75`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Management</TabsTrigger>
          <TabsTrigger value="codes">Generate Codes</TabsTrigger>
          {/* Add Product/Variant tabs could go here but skipping for brevity */}
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Add Bulk Stock</CardTitle>
              <CardDescription>Paste lines of accounts. 3 lines will be grouped into 1 item automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <StockForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes">
          <GenerateCodesCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GenerateCodesCard() {
  const { generateCodes } = useAdmin();
  const [amount, setAmount] = useState(5);
  const [count, setCount] = useState(1);
  const [generated, setGenerated] = useState<string[]>([]);

  const handleGenerate = () => {
    generateCodes.mutate({ amount: amount * 100, count }, {
      onSuccess: (data) => setGenerated(data.codes)
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Redeem Codes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Value ($)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value))} />
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Quantity</label>
            <Input type="number" value={count} onChange={(e) => setCount(parseInt(e.target.value))} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleGenerate} disabled={generateCodes.isPending}>
              {generateCodes.isPending ? <Loader2 className="animate-spin" /> : "Generate"}
            </Button>
          </div>
        </div>

        {generated.length > 0 && (
          <div className="bg-secondary/50 p-4 rounded-lg font-mono text-sm space-y-1">
            {generated.map(code => (
              <div key={code}>{code}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
