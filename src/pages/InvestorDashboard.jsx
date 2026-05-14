import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthContext';
import { Investor } from '@/entities/Investor';
import { InvestmentRequest } from '@/entities/InvestmentRequest';
import { RevenueEntry } from '@/entities/RevenueEntry';
import { Order } from '@/entities/Order';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, DollarSign, PieChart, Calendar, AlertCircle, Send } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid
} from 'recharts';
import { format, subDays } from 'date-fns';

function StatCard({ label, value, sub, color = 'text-foreground', icon: IconComp }) {
  return (
    <Card className="p-5 bg-card border-border/50">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {IconComp && <IconComp className="w-4 h-4 text-muted-foreground" />}
      </div>
      <p className={`font-heading font-bold text-2xl ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

export default function InvestorDashboard() {
  const { user, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const [requestForm, setRequestForm] = useState({
    requested_amount: '',
    notes: '',
  });

  const { data: investor = null, isLoading: isLoadingInvestor } = useQuery({
    queryKey: ['investor-profile', user?.email],
    queryFn: () => Investor.getByEmail(user.email),
    enabled: !!user?.email,
  });

  const equity = investor?.equity_percent || 0;
  const amountInvested = investor?.amount_invested || 0;
  const investmentStage = String(investor?.investment_stage || 'mvp').replace(/_/g, ' ');

  const { data: orders = [] } = useQuery({
    queryKey: ['all-orders-investor'],
    queryFn: () => Order.list({ payment_status: 'paid' }),
    enabled: !!investor,
  });

  const { data: offlineEntries = [] } = useQuery({
    queryKey: ['revenue-entries'],
    queryFn: () => RevenueEntry.list(),
    enabled: !!investor,
  });

  const { data: investmentRequests = [] } = useQuery({
    queryKey: ['investment-requests', user?.email],
    queryFn: () => InvestmentRequest.list({ user_email: user.email }),
    enabled: !!investor && !!user?.email,
  });

  const requestStakeMutation = useMutation({
    mutationFn: () =>
      InvestmentRequest.create({
        user_email: user.email,
        investor_id: investor.id,
        full_name: investor.full_name || '',
        current_amount_invested: Number(investor.amount_invested || 0),
        current_equity_percent: Number(investor.equity_percent || 0),
        requested_amount: Number(requestForm.requested_amount || 0),
        notes: requestForm.notes,
        status: 'pending',
      }),
    onSuccess: () => {
      setRequestForm({ requested_amount: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['investment-requests', user?.email] });
    },
  });

  // Aggregate totals
  const totalOrderRevenue  = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const orderProfit        = totalOrderRevenue * 0.45; // ~45% margin on online orders

  const totalOfflineRevenue = offlineEntries.reduce((s, e) => s + (e.revenue_naira || 0), 0);
  const totalOfflineProfit  = offlineEntries.reduce((s, e) => s + (e.profit_naira  || 0), 0);

  const totalRevenue   = totalOrderRevenue  + totalOfflineRevenue;
  const totalProfit    = orderProfit        + totalOfflineProfit;
  const myRevenueShare = (totalRevenue * equity) / 100;
  const myProfitShare  = (totalProfit  * equity) / 100;

  // Build last-30-days chart data
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const day     = subDays(new Date(), 29 - i);
    const dateStr = format(day, 'yyyy-MM-dd');

    // Supabase uses created_at (ISO string) — compare by date prefix
    const dayOrders      = orders.filter(o => o.created_at?.startsWith(dateStr));
    const dayOrderRev    = dayOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const dayOrderProfit = dayOrderRev * 0.45;

    const dayOffline       = offlineEntries.filter(e => e.date === dateStr);
    const dayOfflineRev    = dayOffline.reduce((s, e) => s + (e.revenue_naira || 0), 0);
    const dayOfflineProfit = dayOffline.reduce((s, e) => s + (e.profit_naira  || 0), 0);

    const dayRevenue = dayOrderRev    + dayOfflineRev;
    const dayProfit  = dayOrderProfit + dayOfflineProfit;

    return {
      date:    format(day, 'MMM d'),
      revenue: dayRevenue,
      profit:  dayProfit,
      myShare: (dayProfit * equity) / 100,
    };
  });

  if (isLoadingAuth || isLoadingInvestor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">No Investor Profile Found</h1>
        <p className="text-muted-foreground text-sm">
          Your account ({user?.email}) is not linked to an investor profile. Please contact the platform admin.
        </p>
      </div>
    );
  }

  const fmt = (n) => `₦${Math.round(n).toLocaleString()}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground mb-1">
            Investor Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, <span className="text-foreground font-medium">{investor.full_name || user?.email}</span>
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-3 py-1.5">
          {equity}% Equity Stake
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Amount Invested"
          value={fmt(amountInvested)}
          sub="Recorded investment principal"
          color="text-primary"
          icon={DollarSign}
        />
        <StatCard
          label="Project Stage"
          value={investmentStage}
          sub="Stage when investment was recorded"
          color="text-secondary capitalize"
          icon={TrendingUp}
        />
      </div>

      <Card className="p-5 bg-card border-border/50 mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Request More Stake
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a request to increase your recorded investment. Admin approval can update your amount invested and equity.
            </p>
          </div>

          {investmentRequests[0] && (
            <Badge className="border-0 bg-primary/10 text-primary capitalize">
              Latest request: {investmentRequests[0].status}
            </Badge>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
          <div>
            <Label>Additional Amount (NGN)</Label>
            <Input
              type="number"
              min="0"
              value={requestForm.requested_amount}
              onChange={(event) =>
                setRequestForm({
                  ...requestForm,
                  requested_amount: event.target.value,
                })
              }
              className="mt-1 border-border/50 bg-background"
              placeholder="500000"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={requestForm.notes}
              onChange={(event) =>
                setRequestForm({ ...requestForm, notes: event.target.value })
              }
              className="mt-1 min-h-10 border-border/50 bg-background"
              placeholder="Optional context, preferred stage, or payment reference"
            />
          </div>

          <Button
            type="button"
            onClick={() => requestStakeMutation.mutate()}
            disabled={
              requestStakeMutation.isPending ||
              Number(requestForm.requested_amount || 0) <= 0
            }
            className="rounded-xl bg-primary"
          >
            <Send className="mr-2 h-4 w-4" />
            {requestStakeMutation.isPending ? 'Sending...' : 'Send Request'}
          </Button>
        </div>

        {requestStakeMutation.isSuccess && (
          <p className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
            Stake request sent. Admin can review it in the investor management area.
          </p>
        )}

        {requestStakeMutation.error && (
          <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {requestStakeMutation.error.message || 'Could not send stake request.'}
          </p>
        )}
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Platform Revenue"
          value={fmt(totalRevenue)}
          sub="All sources combined"
          icon={TrendingUp}
        />
        <StatCard
          label="Total Platform Profit"
          value={fmt(totalProfit)}
          sub={`~${Math.round((totalProfit / (totalRevenue || 1)) * 100)}% margin`}
          color="text-chart-4"
          icon={DollarSign}
        />
        <StatCard
          label="Your Revenue Share"
          value={fmt(myRevenueShare)}
          sub={`${equity}% of total revenue`}
          color="text-primary"
          icon={PieChart}
        />
        <StatCard
          label="Your Profit Share"
          value={fmt(myProfitShare)}
          sub={`${equity}% of net profit`}
          color="text-secondary"
          icon={PieChart}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-5 bg-card border-border/50">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Platform Revenue & Profit (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={last30}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--primary))"  stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))"  stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} interval={6} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v, n) => [`₦${Math.round(v).toLocaleString()}`, n === 'revenue' ? 'Revenue' : 'Profit']}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))"  fill="url(#revGrad)"  strokeWidth={2} />
              <Area type="monotone" dataKey="profit"  stroke="hsl(var(--chart-4))" fill="url(#profGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 bg-card border-border/50">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Your Daily Profit Share (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} interval={6} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`₦${Math.round(v).toLocaleString()}`, 'Your Share']}
              />
              <Bar dataKey="myShare" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 bg-card border-border/50">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Revenue Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Online Order Sales',       revenue: totalOrderRevenue,   profit: orderProfit        },
              { label: 'Offline / Other Revenue',  revenue: totalOfflineRevenue, profit: totalOfflineProfit },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{fmt(row.revenue)}</p>
                  <p className="text-xs text-chart-4">Profit: {fmt(row.profit)}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-bold text-foreground">Your Total Share</span>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{fmt(myRevenueShare)}</p>
                <p className="text-xs text-secondary font-semibold">Profit: {fmt(myProfitShare)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border/50">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Recent Offline Revenue Entries</h3>
          {offlineEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No offline entries logged yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {offlineEntries.slice(0, 10).map(entry => (
                <div key={entry.id} className="flex items-start justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-foreground">{entry.description || entry.source}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />{entry.date}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-semibold text-foreground">{fmt(entry.revenue_naira)}</p>
                    <p className="text-xs text-chart-4">P: {fmt(entry.profit_naira)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
