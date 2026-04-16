import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload, MessageSquare, History, CheckCircle2, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const supportSchema = z.object({
  orderId: z.string().min(1, "Product ID (Order ID) is required"),
  subject: z.string().min(1, "Please select what you need"),
  description: z.string().min(1, "Please describe what happened"),
  imageUrl: z.string().optional(),
});

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("new");

  const form = useForm<z.infer<typeof supportSchema>>({
    resolver: zodResolver(supportSchema),
    defaultValues: { orderId: "", subject: "", description: "", imageUrl: "" },
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<any[]>({
    queryKey: ["/api/support"],
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const res = await apiRequest("POST", "/api/upload", {
          filename: file.name,
          mimeType: file.type,
          data: base64,
        });
        const data = await res.json();
        form.setValue("imageUrl", data.url);
        toast({ title: "Image uploaded" });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof supportSchema>) => {
    try {
      await apiRequest("POST", "/api/support", data);
      toast({ title: "Support ticket sent successfully" });
      form.reset();
      setActiveTab("history");
      queryClient.invalidateQueries({ queryKey: ["/api/support"] });
    } catch (err: any) {
      toast({ title: "Failed to send ticket", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl text-white">Support Center</h1>
        <p className="text-muted-foreground mt-2">Need help with an order? We're here for you.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#0f1115] border border-white/5 p-1">
          <TabsTrigger value="new" className="gap-2 data-[state=active]:bg-primary">
            <MessageSquare className="h-4 w-4" /> New Ticket
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary">
            <History className="h-4 w-4" /> Support History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <Card className="bg-[#0f1115] border-white/5">
            <CardHeader>
              <CardTitle className="text-xl">Open a Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="orderId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] text-muted-foreground">Product ID / Order ID</FormLabel>
                      <FormControl><Input {...field} placeholder="Enter your Order ID (e.g. CARD-abc123...)" className="bg-black/50 border-white/10" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] text-muted-foreground">What you need</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black/50 border-white/10 text-white">
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#0f1115] border-white/10 text-white">
                          <SelectItem value="Refund">Refund</SelectItem>
                          <SelectItem value="Replace">Replace</SelectItem>
                          <SelectItem value="Nothing">Nothing</SelectItem>
                          <SelectItem value="Just question">Just question</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] text-muted-foreground">What happened?</FormLabel>
                      <FormControl><Textarea {...field} placeholder="Describe the issue in detail..." className="bg-black/50 border-white/10 min-h-[120px]" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="imageUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] text-muted-foreground">Proof Image</FormLabel>
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-4 items-center">
                          <div className="relative group flex-1">
                            <Input type="file" accept="image/*" onChange={handleImageUpload} className="bg-black/50 border-white/10 opacity-0 absolute inset-0 cursor-pointer z-10" />
                            <div className="flex items-center gap-3 px-4 h-10 rounded-md bg-black/40 border border-white/10 text-xs text-muted-foreground">
                              <Upload className="h-4 w-4" />
                              <span>{field.value ? field.value.split('/').pop() : "Choose File"}</span>
                            </div>
                          </div>
                          {isUploading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        </div>
                        {field.value && (
                          <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10">
                            <img src={field.value} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white h-12">
                    Send Support Request
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="space-y-4">
            {ticketsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
            ) : !tickets || tickets.length === 0 ? (
              <div className="text-center py-20 bg-[#0f1115] rounded-xl border border-white/5">
                <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-bold">No support history found</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <Card key={ticket.id} className="bg-[#0f1115] border-white/5 hover:border-white/10 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", ticket.status === 'open' ? "bg-lime-500/10 text-lime-500" : "bg-green-500/10 text-green-500")}>
                        {ticket.status === 'open' ? <Clock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">{ticket.subject}</CardTitle>
                        <p className="text-[10px] text-muted-foreground">Order ID: {ticket.orderId}</p>
                      </div>
                    </div>
                    <Badge variant={ticket.status === 'open' ? 'outline' : 'default'} className={cn(
                      "uppercase text-[10px]",
                      ticket.status === 'open' ? "border-lime-500/50 text-lime-500" : "bg-green-500 text-white"
                    )}>
                      {ticket.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                    {ticket.adminMessage && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                        <p className="text-[10px] text-primary">Admin Message</p>
                        <p className="text-sm">"{ticket.adminMessage}"</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
