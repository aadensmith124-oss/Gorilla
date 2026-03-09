import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useForebitPolling } from "@/hooks/use-forebit-polling";
import { useEffect } from "react";

// Pages
import AuthPage from "@/pages/AuthPage";
import ShopPage from "@/pages/ShopPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import CartPage from "@/pages/CartPage";
import ProfilePage from "@/pages/ProfilePage";
import CardsPage from "@/pages/CardsPage";
import OrderDetailPageNew from "@/pages/OrderDetailPageNew";
import GamesPage from "@/pages/GamesPage";
import DiceGamePage from "@/pages/DiceGamePage";
import MinesGamePage from "@/pages/MinesGamePage";
import DailySpinPage from "@/pages/DailySpinPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/not-found";

import SupportPage from "@/pages/SupportPage";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  useForebitPolling();

  useEffect(() => {
    if (!isLoading && !user && location !== "/auth" && location !== "/admin") {
      setLocation("/auth");
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return null;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/" component={ShopPage} />
        <Route path="/product/:id" component={ProductDetailPage} />
        <Route path="/order/:id" component={OrderDetailPageNew} />
        <Route path="/cart" component={CartPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/cards" component={CardsPage} />
        <Route path="/games" component={GamesPage} />
        <Route path="/games/dice" component={DiceGamePage} />
        <Route path="/games/mines" component={MinesGamePage} />
        <Route path="/daily-spin" component={DailySpinPage} />
        <Route path="/support" component={SupportPage} />
        <Route path="/admin">
          {() => <AdminPage />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
