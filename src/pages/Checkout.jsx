import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/AuthContext";
import { Order, FanPoints } from "@/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCart, getCartTotal, getCartPricing, clearCart } from "@/lib/cartUtils";

function getFanLevel(totalSpent) {
  if (totalSpent >= 500000) return "diamond";
  if (totalSpent >= 200000) return "platinum";
  if (totalSpent >= 100000) return "gold";
  if (totalSpent >= 50000) return "silver";
  return "bronze";
}

async function updateFanPointsAfterOrder(email, total) {
  const pointsEarned = Math.floor(total / 100);
  const existingPoints = await FanPoints.filter({ user_email: email });

  if (existingPoints.length > 0) {
    const current = existingPoints[0];

    const newTotalSpent = (current.total_spent || 0) + total;
    const newOrdersCount = (current.orders_count || 0) + 1;
    const newTotalPoints = (current.total_points || 0) + pointsEarned;

    await FanPoints.update(current.id, {
      total_points: newTotalPoints,
      total_spent: newTotalSpent,
      orders_count: newOrdersCount,
      level: getFanLevel(newTotalSpent),
    });

    return;
  }

  await FanPoints.create({
    user_email: email,
    total_points: pointsEarned,
    total_spent: total,
    orders_count: 1,
    level: "bronze",
    spins_remaining: 1,
  });
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    setCart(getCart());

    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.full_name || user.name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const pricing = getCartPricing(cart);
  const total = getCartTotal(cart);

  const completePaidOrder = async ({ orderId, paymentReference }) => {
    await Order.update(orderId, {
      payment_status: "paid",
      payment_reference: paymentReference,
      fulfillment_status: "processing",
    });

    await updateFanPointsAfterOrder(form.email, total);

    clearCart();
    toast.success("Payment successful! 🎉");
    navigate("/dashboard");
  };

  const handlePayWithPaystack = async () => {
    if (!form.name || !form.email) {
      toast.error("Please fill in your name and email");
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    try {
      setLoading(true);

      const orderNumber = `FD-${Date.now().toString(36).toUpperCase()}`;
      const pointsEarned = Math.floor(total / 100);

      const order = await Order.create({
        order_number: orderNumber,
        buyer_email: form.email,
        buyer_name: form.name,
        items: cart.map((item) => ({
          product_id: item.product_id,
          title: item.title,
          price: item.price,
          creator_base_price: item.creator_base_price,
          platform_fee_rate: item.platform_fee_rate,
          platform_fee_amount: item.platform_fee_amount,
          fan_price: item.fan_price || item.price,
          creator_payout_amount: Number(item.creator_base_price || item.price || 0) * Number(item.quantity || 0),
          platform_fee_total: Number(item.platform_fee_amount || 0) * Number(item.quantity || 0),
          quantity: item.quantity,
          image_url: item.image_url,
          creator_id: item.creator_id,
          creator_name: item.creator_name,
        })),
        subtotal_amount: pricing.creatorSubtotal,
        platform_fee_total: pricing.platformFeeTotal,
        creator_payout_total: pricing.creatorSubtotal,
        total_amount: total,
        payment_status: "pending",
        fulfillment_status: "pending",
        shipping_address: form.address,
        cashback_earned: 0,
        points_earned: pointsEarned,
        payment_reference: orderNumber,
      });

      const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

      if (window.PaystackPop && paystackKey) {
        const handler = window.PaystackPop.setup({
          key: paystackKey,
          email: form.email,
          amount: Math.round(total * 100),
          currency: "NGN",
          ref: orderNumber,
          metadata: {
            order_id: order.id,
            buyer_name: form.name,
          },
          callback: async (response) => {
            try {
              await completePaidOrder({
                orderId: order.id,
                paymentReference: response.reference,
              });
            } catch (error) {
              console.error("Payment callback failed:", error);
              toast.error("Payment was received, but order update failed.");
            } finally {
              setLoading(false);
            }
          },
          onClose: () => {
            setLoading(false);
            toast.info("Payment window closed");
          },
        });

        handler.openIframe();
        return;
      }

      await completePaidOrder({
        orderId: order.id,
        paymentReference: orderNumber,
      });
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error(error?.message || "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-8">
        Checkout
      </h1>

      <div className="space-y-6">
        <div className="bg-card rounded-xl border border-border/50 p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">
            Order Summary
          </h3>

          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            cart.map((item) => (
              <div
                key={item.product_id}
                className="flex justify-between items-center py-2 text-sm"
              >
                <span className="text-foreground">
                  {item.title} x{item.quantity}
                </span>
                <span className="font-medium">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))
          )}

          <div className="mt-3 border-t border-border pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Creator subtotal</span>
              <span>₦{pricing.creatorSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Platform service fee</span>
              <span>₦{pricing.platformFeeTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 font-heading font-bold text-lg text-foreground">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
          <h3 className="font-heading font-semibold text-foreground mb-2">
            Your Details
          </h3>

          <div>
            <Label>Full Name</Label>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              className="bg-background border-border/50 mt-1"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              className="bg-background border-border/50 mt-1"
            />
          </div>

          <div>
            <Label>Shipping Address</Label>
            <Textarea
              value={form.address}
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
              className="bg-background border-border/50 mt-1"
              rows={3}
              placeholder="Optional for digital items"
            />
          </div>
        </div>

        <Button
          onClick={handlePayWithPaystack}
          disabled={loading || cart.length === 0}
          className="w-full h-14 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-xl text-lg font-semibold"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <CreditCard className="w-5 h-5 mr-2" />
          )}
          Pay ₦{total.toLocaleString()} with Paystack
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          Secured by Paystack. Your payment info is safe.
        </div>
      </div>
    </div>
  );
}