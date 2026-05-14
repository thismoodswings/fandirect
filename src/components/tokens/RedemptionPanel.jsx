import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Gift, Percent, Ticket, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { FanToken, FanPoints } from "@/entities";

const REDEMPTION_OPTIONS = [
  {
    id: "discount_500",
    label: "₦500 Discount",
    description: "Get ₦500 off your next order",
    cost: 200,
    icon: Percent,
    color: "from-primary/20 to-primary/5",
    borderColor: "border-primary/30",
  },
  {
    id: "discount_2000",
    label: "₦2,000 Discount",
    description: "Get ₦2,000 off your next order",
    cost: 700,
    icon: Percent,
    color: "from-secondary/20 to-secondary/5",
    borderColor: "border-secondary/30",
  },
  {
    id: "free_spin",
    label: "Extra Spin",
    description: "Add 1 spin to your reward wheel",
    cost: 100,
    icon: Gift,
    color: "from-chart-4/20 to-chart-4/5",
    borderColor: "border-chart-4/30",
  },
  {
    id: "exclusive_access",
    label: "VIP Access Pass",
    description: "Unlock exclusive creator content for 7 days",
    cost: 500,
    icon: Ticket,
    color: "from-accent/20 to-accent/5",
    borderColor: "border-accent/30",
  },
];

export default function RedemptionPanel({ wallet, userEmail, onRedeemed }) {
  const [redeeming, setRedeeming] = useState(null);
  const [lastRedeemed, setLastRedeemed] = useState(null);

  const balance = wallet?.balance || 0;

  const handleRedeem = async (option) => {
    if (!wallet?.id) {
      toast.error("Wallet not found");
      return;
    }

    if (balance < option.cost) {
      toast.error("Insufficient FDT balance");
      return;
    }

    try {
      setRedeeming(option.id);

      await FanToken.update(wallet.id, {
        balance: balance - option.cost,
        total_spent: (wallet.total_spent || 0) + option.cost,
      });

      if (option.id === "free_spin" && userEmail) {
        const points = await FanPoints.filter({ user_email: userEmail });

        if (points.length > 0) {
          await FanPoints.update(points[0].id, {
            spins_remaining: (points[0].spins_remaining || 0) + 1,
          });
        }
      }

      setLastRedeemed(option.id);
      toast.success(`${option.label} redeemed!`);
      onRedeemed?.();

      setTimeout(() => {
        setLastRedeemed(null);
      }, 3000);
    } catch (error) {
      console.error("Redemption failed:", error);
      toast.error(error?.message || "Redemption failed");
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
        <span className="text-sm text-muted-foreground">Your FDT Balance</span>

        <div className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-accent" />
          <span className="font-heading font-bold text-lg text-accent">
            {balance.toLocaleString()} FDT
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REDEMPTION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const canAfford = balance >= option.cost;
          const isRedeeming = redeeming === option.id;
          const isSuccess = lastRedeemed === option.id;

          return (
            <div
              key={option.id}
              className={`bg-gradient-to-br ${option.color} border ${option.borderColor} rounded-xl p-4 flex flex-col gap-3 transition-all ${
                !canAfford ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-lg bg-background/60 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>

                <Badge className="bg-background/60 text-foreground border-0 text-xs font-bold">
                  <Coins className="w-3 h-3 mr-1 text-accent" />
                  {option.cost} FDT
                </Badge>
              </div>

              <div>
                <p className="font-semibold text-sm text-foreground">
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => handleRedeem(option)}
                disabled={!canAfford || Boolean(redeeming)}
                className="w-full h-8 text-xs rounded-lg bg-background/80 hover:bg-background text-foreground border border-border/50"
                variant="outline"
              >
                {isRedeeming ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : isSuccess ? (
                  <CheckCircle className="w-3 h-3 mr-1 text-chart-4" />
                ) : null}

                {isSuccess ? "Redeemed!" : canAfford ? "Redeem" : "Need more FDT"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Discount codes are applied automatically at checkout.
      </p>
    </div>
  );
}