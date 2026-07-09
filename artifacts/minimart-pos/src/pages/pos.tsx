import { useState, useMemo } from "react";
import { useListProducts, useCreateSale, useListCustomers } from "@workspace/api-client-react";
import { formatCurrency, generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus, X, CreditCard, Banknote, User, Smartphone, History, ArrowLeft, Printer, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

type CartItem = {
  cartItemId: string; // unique for list rendering
  productId: number;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};

type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'split';

export default function POS() {
  const { toast } = useToast();
  
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  
  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState("");
  
  // Receipt State
  const [receiptData, setReceiptData] = useState<any>(null);

  // Data
  const { data: products, isLoading: isLoadingProducts } = useListProducts({ search: searchTerm });
  const { data: customers } = useListCustomers();
  const createSale = useCreateSale();

  // Derived State
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const tax = 0; // Configurable if needed
  const discount = 0; // Line discounts could be added, keeping simple for now
  const total = subtotal + tax - discount;
  const changeDue = Math.max(0, Number(amountPaid) - total);
  
  const isValidCheckout = Number(amountPaid) >= total && total > 0;

  // Actions
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ title: "Cannot add more", description: "Not enough stock available.", variant: "destructive" });
          return prev;
        }
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (product.stock <= 0) {
        toast({ title: "Out of stock", description: "Product has 0 stock.", variant: "destructive" });
        return prev;
      }
      return [...prev, {
        cartItemId: generateId(),
        productId: product.id,
        name: product.name,
        price: product.sellingPrice,
        quantity: 1,
        stock: product.stock
      }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.quantity + delta;
        if (newQty > item.stock) {
          toast({ title: "Cannot add more", description: "Not enough stock available.", variant: "destructive" });
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerId(null);
  };

  const handleCheckout = async () => {
    try {
      const result = await createSale.mutateAsync({
        data: {
          customerId: customerId || undefined,
          items: cart.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.price,
            discount: 0
          })),
          discount,
          tax,
          paymentMethod,
          amountPaid: Number(amountPaid)
        }
      });
      
      setReceiptData(result);
      setIsCheckoutOpen(false);
      clearCart();
      setAmountPaid("");
      toast({ title: "Sale completed", description: `Invoice ${result.invoiceNumber} created.` });
    } catch (err) {
      toast({ title: "Checkout failed", description: "Failed to complete sale.", variant: "destructive" });
    }
  };

  // Views
  if (receiptData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center py-12">
        <div className="w-full max-w-md bg-white text-black p-8 rounded-lg shadow-2xl font-mono text-sm">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">MINI MART</h1>
            <p className="text-gray-500">Receipt #{receiptData.invoiceNumber}</p>
            <p className="text-gray-500">{new Date(receiptData.createdAt).toLocaleString()}</p>
            <p className="text-gray-500">Cashier: {receiptData.cashierName}</p>
          </div>
          
          <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4 space-y-2">
            <div className="flex justify-between font-bold pb-2">
              <span>Item</span>
              <span>Total</span>
            </div>
            {receiptData.items.map((item: any) => (
              <div key={item.id} className="flex justify-between">
                <div>
                  <div>{item.productName}</div>
                  <div className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.unitPrice)}</div>
                </div>
                <div>{formatCurrency(item.lineTotal)}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1 mb-6">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(receiptData.subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL</span>
              <span>{formatCurrency(receiptData.total)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Amount Paid ({receiptData.paymentMethod})</span>
              <span>{formatCurrency(receiptData.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Change</span>
              <span>{formatCurrency(receiptData.changeDue)}</span>
            </div>
          </div>

          <div className="text-center mt-8 text-gray-500">
            <p>Thank you for shopping with us!</p>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" /> Print Receipt
          </Button>
          <Button onClick={() => setReceiptData(null)}>
            New Sale
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-grid bg-background">
      {/* LEFT: Product Grid */}
      <div className="flex flex-col bg-muted/20 border-r border-border h-full overflow-hidden">
        <div className="p-4 bg-background border-b border-border flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search products or scan barcode..." 
              className="pl-10 h-12 text-lg bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {isLoadingProducts ? (
              [...Array(10)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
            ) : products?.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all active:scale-95 ${
                  product.stock > 0 
                    ? 'bg-card border-border hover:border-primary hover:shadow-md' 
                    : 'bg-muted/50 border-border opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="font-semibold line-clamp-2 leading-tight mb-1">{product.name}</div>
                <div className="text-xs text-muted-foreground mb-auto">{product.categoryName || 'No Category'}</div>
                
                <div className="w-full flex items-end justify-between mt-4">
                  <div className="font-mono font-bold text-primary">{formatCurrency(product.sellingPrice)}</div>
                  <div className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-medium">
                    {product.stock} left
                  </div>
                </div>
              </button>
            ))}
            {products?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No products found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Cart / Checkout */}
      <div className="flex flex-col h-full bg-background border-l border-border shadow-xl z-10 relative">
        <div className="p-4 border-b border-border flex justify-between items-center bg-card">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> 
            Current Order
          </h2>
          <Button variant="ghost" size="sm" onClick={clearCart} disabled={cart.length === 0} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            Clear
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
              <p>Your cart is empty.</p>
              <p className="text-sm">Scan items to add them.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className="flex flex-col p-3 rounded-lg border border-border bg-card">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{item.name}</span>
                  <button onClick={() => removeFromCart(item.cartItemId)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="font-mono text-sm">{formatCurrency(item.price)}</div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => updateQuantity(item.cartItemId, -1)}
                      className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 text-secondary-foreground"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.cartItemId, 1)}
                      className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 text-secondary-foreground"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border bg-card pb-safe">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-muted-foreground text-sm">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-sm">
              <span>Discount</span>
              <span className="font-mono">{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-2 border-t border-border mt-2">
              <span>Total</span>
              <span className="font-mono text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
          
          <Button 
            className="w-full h-16 text-lg font-bold shadow-lg" 
            disabled={cart.length === 0}
            onClick={() => {
              setAmountPaid(total.toString()); // default to exact amount
              setIsCheckoutOpen(true);
            }}
          >
            Charge {formatCurrency(total)}
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <span className="font-medium text-muted-foreground">Total Due</span>
              <span className="text-3xl font-bold font-mono text-primary">{formatCurrency(total)}</span>
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <PaymentMethodButton 
                  icon={<Banknote className="w-5 h-5 mb-1" />} label="Cash" 
                  selected={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} 
                />
                <PaymentMethodButton 
                  icon={<Smartphone className="w-5 h-5 mb-1" />} label="Momo" 
                  selected={paymentMethod === 'mobile_money'} onClick={() => setPaymentMethod('mobile_money')} 
                />
                <PaymentMethodButton 
                  icon={<CreditCard className="w-5 h-5 mb-1" />} label="Card" 
                  selected={paymentMethod === 'card'} onClick={() => setPaymentMethod('card')} 
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Amount Tendered</Label>
              <Input 
                type="number" 
                value={amountPaid} 
                onChange={(e) => setAmountPaid(e.target.value)}
                className="h-14 text-2xl font-mono text-right font-bold bg-background"
                step="0.01"
              />
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 50, 100, 200].map(val => (
                  <Button 
                    key={val} 
                    variant="outline" 
                    className="font-mono" 
                    onClick={() => setAmountPaid(val.toString())}
                  >
                    ₵{val}
                  </Button>
                ))}
                <Button variant="secondary" onClick={() => setAmountPaid(total.toString())}>Exact</Button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="font-medium">Change Due</span>
              <span className={`text-2xl font-bold font-mono ${changeDue > 0 ? 'text-success' : ''}`}>
                {formatCurrency(changeDue)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
            <Button 
              size="lg" 
              onClick={handleCheckout} 
              disabled={!isValidCheckout || createSale.isPending}
            >
              {createSale.isPending ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentMethodButton({ icon, label, selected, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
        selected 
          ? 'border-primary bg-primary/10 text-primary font-semibold' 
          : 'border-border bg-card text-muted-foreground hover:bg-accent'
      }`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}
