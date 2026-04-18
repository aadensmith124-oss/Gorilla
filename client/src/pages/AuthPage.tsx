import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Redirect } from "wouter";
import { Loader2 } from "lucide-react";

// Separate login schema not in DB schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
  const { login, register, isLoggingIn, isRegistering, user } = useAuth();
  const [, setLocation] = useLocation();

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/rulf-logo-nobg.png" alt="RULF SHOP" className="h-44 w-auto object-contain mx-auto -mb-12" />
          <p className="text-muted-foreground text-xs font-bold">Sign in to access the marketplace</p>
        </div>

        <Card className="border-border bg-card/60 backdrop-blur-xl shadow-2xl">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login">
                <LoginForm onSubmit={login} isLoading={isLoggingIn} />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm onSubmit={register} isLoading={isRegistering} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function LoginForm({ onSubmit, isLoading }: { onSubmit: any; isLoading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" {...register("username")} disabled={isLoading} />
        {errors.username && <span className="text-xs text-destructive">{errors.username.message}</span>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} disabled={isLoading} />
        {errors.password && <span className="text-xs text-destructive">{errors.password.message}</span>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  );
}

function RegisterForm({ onSubmit, isLoading }: { onSubmit: any; isLoading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof insertUserSchema>>({
    resolver: zodResolver(insertUserSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-username">Username</Label>
        <Input id="reg-username" {...register("username")} disabled={isLoading} />
        {errors.username && <span className="text-xs text-destructive">{errors.username.message}</span>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} disabled={isLoading} />
        {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="telegram">Telegram Username</Label>
        <Input id="telegram" placeholder="@yourname" {...register("telegramUsername")} disabled={isLoading} />
        {errors.telegramUsername && <span className="text-xs text-destructive">{errors.telegramUsername.message}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          <Input id="reg-password" type="password" {...register("password")} disabled={isLoading} />
          {errors.password && <span className="text-xs text-destructive">{errors.password.message}</span>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm</Label>
          <Input id="confirm" type="password" {...register("confirmPassword")} disabled={isLoading} />
          {errors.confirmPassword && <span className="text-xs text-destructive">{errors.confirmPassword.message}</span>}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Account
      </Button>
    </form>
  );
}
