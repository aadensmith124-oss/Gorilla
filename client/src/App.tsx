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
import CardsPage from "@/pages/CardsPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import ProfilePage from "@/pages/ProfilePageFix";
import OrderDetailPageNew from "@/pages/OrderDetailPageNew";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/not-found";
import DepositPage from "@/pages/DepositPage";
import BecomeSellerPage from "@/pages/BecomeSellerPage";
import SellerDashboardPage from "@/pages/SellerDashboardPage";
import OrdersPage from "@/pages/OrdersPage";
import MyCodePage from "@/pages/MyCodePage";
import AchPage from "@/pages/AchPage";
import CartPage from "@/pages/CartPage";
import RanksPage from "@/pages/RanksPage";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  useForebitPolling();

  useEffect(() => {
    if (!isLoading && !user && location !== "/auth") {
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
        <Route path="/" component={DepositPage} />
        <Route path="/deposit" component={DepositPage} />
        <Route path="/shop" component={ShopPage} />
        <Route path="/cards" component={CardsPage} />
        <Route path="/product/:name" component={ProductDetailPage} />
        <Route path="/order/:id" component={OrderDetailPageNew} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/my-code" component={MyCodePage} />
        <Route path="/become-seller" component={BecomeSellerPage} />
        <Route path="/seller" component={SellerDashboardPage} />
        <Route path="/ach" component={AchPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/ranks" component={RanksPage} />
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
