import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShoppingCart } from 'lucide-react';
import { getCart, removeFromCart, updateCartQuantity, getCartTotal, getCartPricing } from '@/lib/cartUtils';

export default function Cart() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const update = () => setCart(getCart());
    update();
    window.addEventListener('cart-updated', update);
    return () => window.removeEventListener('cart-updated', update);
  }, []);

  const pricing = getCartPricing(cart);
  const total = getCartTotal(cart);

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Discover exclusive merch and events from your faves</p>
        <Link to="/shop">
          <Button className="bg-primary rounded-xl">
            <ShoppingBag className="w-4 h-4 mr-2" /> Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-8">Cart ({cart.length})</h1>

      <div className="space-y-4 mb-8">
        {cart.map(item => (
          <div key={item.product_id} className="bg-card rounded-xl border border-border/50 p-4 flex gap-4">
            <img
              src={item.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200'}
              alt={item.title}
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{item.creator_name}</p>
              <h3 className="font-heading font-semibold text-foreground truncate">{item.title}</h3>
              <p className="font-heading font-bold text-foreground mt-1">₦{item.price?.toLocaleString()}</p>
            </div>
            <div className="flex flex-col items-end justify-between shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.product_id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <div className="flex items-center border border-border rounded-lg">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-card rounded-xl border border-border/50 p-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Creator subtotal</span>
          <span>₦{pricing.creatorSubtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground mb-4">
          <span>Platform service fee</span>
          <span>₦{pricing.platformFeeTotal.toLocaleString()}</span>
        </div>
        <div className="border-t border-border pt-4 flex justify-between">
          <span className="font-heading font-bold text-lg">Total</span>
          <span className="font-heading font-bold text-lg">₦{total.toLocaleString()}</span>
        </div>
        <Link to="/checkout">
          <Button className="w-full mt-6 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-xl text-base font-semibold">
            Checkout <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}