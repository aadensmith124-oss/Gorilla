import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card as CardType } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Loader2, ShoppingCart } from "lucide-react";

export default function CardsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addItem, items: cartItems } = useCart();
  const [countryFilter, setCountryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [firstHandOnly, setFirstHandOnly] = useState(false);

  const { data: cards, isLoading } = useQuery<CardType[]>({
    queryKey: ["/api/cards"],
  });

  const handleAddToCart = (card: CardType) => {
    const alreadyInCart = cartItems.some(i => i.cardId === card.id);
    if (alreadyInCart) {
      toast({ title: "Already in cart", description: "This card is already in your cart.", variant: "destructive" });
      return;
    }
    addItem({
      variantId: -card.id,
      productId: 0,
      productName: "Credit Card",
      variantName: card.maskedCard,
      price: card.price,
      quantity: 1,
      image: "",
      cardId: card.id,
    });
    toast({ title: "Added to cart", description: `${card.maskedCard} added to cart.` });
  };

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter(card => {
      const matchCountry = countryFilter === "all" || card.country === countryFilter;
      const matchPrice = (card.price / 100) >= priceRange[0] && (card.price / 100) <= priceRange[1];
      const matchFirstHand = !firstHandOnly || card.isFirstHand;
      return matchCountry && matchPrice && matchFirstHand;
    });
  }, [cards, countryFilter, priceRange, firstHandOnly]);

  const countries = useMemo(() => {
    if (!cards) return [];
    const set = new Set(cards.map(c => c.country));
    return Array.from(set).sort();
  }, [cards]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 items-center text-center">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">RULF<span className="text-primary">.CC</span></h1>
        <p className="text-muted-foreground italic">Fresh <span className="text-primary">HIGH QUALITY CCS</span></p>
      </div>

      <Card className="bg-[#0f1115] border-white/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Country</label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="bg-black/50 border-white/10">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1115] border-white/10">
                  <SelectItem value="all">ALL Countries</SelectItem>
                  {countries.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Price Range</label>
                <span className="text-xs font-mono text-primary">${priceRange[0]} - ${priceRange[1]}</span>
              </div>
              <Slider 
                value={priceRange} 
                min={0} 
                max={100} 
                step={1} 
                onValueChange={setPriceRange}
                className="py-2"
              />
            </div>

            <div className="flex items-center justify-between bg-black/30 p-3 rounded-md border border-white/5">
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase tracking-widest text-white">First Hand Only</label>
                <span className="text-[10px] text-muted-foreground italic">Verified direct source</span>
              </div>
              <Switch checked={firstHandOnly} onCheckedChange={setFirstHandOnly} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between px-2">
        <div className="text-xl font-bold italic tracking-tighter text-white uppercase">
          Total found: <span className="text-primary italic">{filteredCards.length}</span>
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-[#0f1115] overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-xs font-bold uppercase text-muted-foreground">Card</TableHead>
              <TableHead className="text-xs font-bold uppercase text-muted-foreground">Country</TableHead>
              <TableHead className="text-xs font-bold uppercase text-muted-foreground">Price</TableHead>
              <TableHead className="text-xs font-bold uppercase text-muted-foreground">First Hand</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                  No cards found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredCards.map((card) => {
                const inCart = cartItems.some(i => i.cardId === card.id);
                return (
                  <TableRow key={card.id} className="hover:bg-white/5 border-white/5 transition-colors">
                    <TableCell className="font-mono text-sm text-white">{card.maskedCard}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-white/5 text-[10px] font-bold uppercase border-none">
                        {card.country}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary text-white font-bold italic text-[10px]">
                        ${(card.price / 100).toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={card.isFirstHand ? "default" : "secondary"} className={card.isFirstHand ? "bg-green-500/20 text-green-500 border-green-500/20" : "bg-white/5 text-muted-foreground border-none"}>
                        {card.isFirstHand ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        className={inCart ? "bg-green-600 hover:bg-green-700 text-white font-bold italic tracking-tighter uppercase" : "bg-primary hover:bg-primary/90 text-white font-bold italic tracking-tighter uppercase"}
                        onClick={() => handleAddToCart(card)}
                        disabled={inCart}
                        data-testid={`btn-add-card-${card.id}`}
                      >
                        {inCart ? "In Cart" : (
                          <><ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Add to Cart</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
