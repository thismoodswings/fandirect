import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Investor } from '@/entities/Investor';
import { InvestmentRequest } from '@/entities/InvestmentRequest';
import { RevenueEntry } from '@/entities/RevenueEntry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Users, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const stages = [
  'idea',
  'prototype',
  'mvp',
  'private_beta',
  'public_beta',
  'launch',
  'growth',
  'scale',
];

const defaultInvestor = {
  user_email: '',
  full_name: '',
  amount_invested: 0,
  investment_stage: 'mvp',
  equity_percent: 0,
  joined_date: '',
  notes: '',
  status: 'active',
};
const defaultEntry    = { date: format(new Date(), 'yyyy-MM-dd'), revenue_naira: 0, profit_naira: 0, source: 'offline', description: '' };

function formatCurrency(value) {
  return `NGN ${Number(value || 0).toLocaleString()}`;
}

function formatStage(value) {
  return String(value || 'mvp').replace(/_/g, ' ');
}

export default function ManageInvestors() {
  const queryClient = useQueryClient();
  const [investorDialog, setInvestorDialog]     = useState(false);
  const [entryDialog, setEntryDialog]           = useState(false);
  const [investorForm, setInvestorForm]         = useState(defaultInvestor);
  const [entryForm, setEntryForm]               = useState(defaultEntry);
  const [editingInvestorId, setEditingInvestorId] = useState(null);
  const [pageError, setPageError] = useState('');

  const { data: investors = [] } = useQuery({
    queryKey: ['all-investors'],
    queryFn:  () => Investor.list(),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['revenue-entries'],
    queryFn:  () => RevenueEntry.list(),
  });

  const { data: investmentRequests = [] } = useQuery({
    queryKey: ['investment-requests-admin'],
    queryFn: () => InvestmentRequest.list(),
  });

  const saveInvestorMutation = useMutation({
    mutationFn: (data) => editingInvestorId
      ? Investor.update(editingInvestorId, data)
      : Investor.create(data),
    onSuccess: () => {
      setPageError('');
      queryClient.invalidateQueries({ queryKey: ['all-investors'] });
      setInvestorDialog(false);
      setInvestorForm(defaultInvestor);
      setEditingInvestorId(null);
      toast.success('Investor saved!');
    },
    onError: (err) => {
      const message = err.message || 'Failed to save investor';
      setPageError(message);
      toast.error(message);
    },
  });

  const deleteInvestorMutation = useMutation({
    mutationFn: (id) => Investor.delete(id),
    onSuccess: () => {
      setPageError('');
      queryClient.invalidateQueries({ queryKey: ['all-investors'] });
      toast.success('Investor removed');
    },
    onError: (err) => {
      const message = err.message || 'Failed to delete investor';
      setPageError(message);
      toast.error(message);
    },
  });

  const saveEntryMutation = useMutation({
    mutationFn: (data) => RevenueEntry.create(data),
    onSuccess: () => {
      setPageError('');
      queryClient.invalidateQueries({ queryKey: ['revenue-entries'] });
      setEntryDialog(false);
      setEntryForm(defaultEntry);
      toast.success('Revenue entry logged!');
    },
    onError: (err) => {
      const message = err.message || 'Failed to log entry';
      setPageError(message);
      toast.error(message);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => RevenueEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenue-entries'] }),
    onError:   (err) => {
      const message = err.message || 'Failed to delete entry';
      setPageError(message);
      toast.error(message);
    },
  });

  const openEdit = (inv) => {
    setInvestorForm({ ...inv });
    setEditingInvestorId(inv.id);
    setInvestorDialog(true);
  };

  const totalEquity = investors
    .filter(i => i.status === 'active')
    .reduce((s, i) => s + (i.equity_percent || 0), 0);

  const totalInvested = investors
    .filter(i => i.status === 'active')
    .reduce((s, i) => s + Number(i.amount_invested || 0), 0);

  return (
    <div className="space-y-8">
      {pageError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {pageError}
        </div>
      )}

      {/* Investors Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" /> Investors
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatCurrency(totalInvested)} invested · {totalEquity}% total equity allocated
            </p>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90"
            onClick={() => { setPageError(''); setInvestorForm(defaultInvestor); setEditingInvestorId(null); setInvestorDialog(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Investor
          </Button>
        </div>

        <div className="grid gap-3">
          {investors.map(inv => (
            <Card key={inv.id} className="p-4 bg-card border-border/50 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{inv.full_name || inv.user_email}</p>
                <p className="text-xs text-muted-foreground">{inv.user_email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(inv.amount_invested)} · <span className="capitalize">{formatStage(inv.investment_stage)}</span>
                </p>
                {inv.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{inv.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary border-0 text-sm font-bold">{inv.equity_percent}%</Badge>
                <Badge className={`border-0 text-xs ${inv.status === 'active' ? 'bg-chart-4/10 text-chart-4' : 'bg-muted text-muted-foreground'}`}>
                  {inv.status}
                </Badge>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(inv)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteInvestorMutation.mutate(inv.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
          {investors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No investors added yet.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Stake Requests
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Investor-submitted requests to add more capital</p>
          </div>
        </div>

        <div className="grid gap-2">
          {investmentRequests.map(request => (
            <div key={request.id} className="flex items-center justify-between bg-card border border-border/50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{request.full_name || request.user_email}</p>
                <p className="text-xs text-muted-foreground">
                  Wants to add {formatCurrency(request.requested_amount)} · current stake {formatCurrency(request.current_amount_invested)}
                </p>
                {request.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{request.notes}</p>}
              </div>
              <Badge className="border-0 bg-primary/10 text-primary capitalize">
                {request.status || 'pending'}
              </Badge>
            </div>
          ))}
          {investmentRequests.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No stake requests yet.</p>
          )}
        </div>
      </div>

      {/* Revenue Entries Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Offline Revenue Entries
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manual revenue & profit logs (offline sales, adjustments)</p>
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90"
            onClick={() => { setEntryForm(defaultEntry); setEntryDialog(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Log Entry
          </Button>
        </div>

        <div className="grid gap-2">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center justify-between bg-card border border-border/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{entry.description || entry.source}</p>
                  <p className="text-xs text-muted-foreground">{entry.date} · <span className="capitalize">{entry.source}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">₦{(entry.revenue_naira || 0).toLocaleString()}</p>
                  <p className="text-xs text-chart-4">Profit: ₦{(entry.profit_naira || 0).toLocaleString()}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteEntryMutation.mutate(entry.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No offline entries logged yet.</p>
          )}
        </div>
      </div>

      {/* Investor Dialog */}
      <Dialog open={investorDialog} onOpenChange={setInvestorDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editingInvestorId ? 'Edit Investor' : 'Add Investor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Email (must match their login)</Label>
              <Input value={investorForm.user_email}
                onChange={e => setInvestorForm({ ...investorForm, user_email: e.target.value })}
                className="bg-background border-border/50 mt-1" placeholder="investor@email.com" />
            </div>
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input value={investorForm.full_name}
                onChange={e => setInvestorForm({ ...investorForm, full_name: e.target.value })}
                className="bg-background border-border/50 mt-1" placeholder="John Doe" />
            </div>
            <div>
              <Label className="text-xs">Equity % (e.g. 10 for 10%)</Label>
              <Input type="number" value={investorForm.equity_percent}
                onChange={e => setInvestorForm({ ...investorForm, equity_percent: +e.target.value })}
                className="bg-background border-border/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Amount Invested (NGN)</Label>
              <Input type="number" value={investorForm.amount_invested}
                onChange={e => setInvestorForm({ ...investorForm, amount_invested: +e.target.value })}
                className="bg-background border-border/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Project Stage at Investment</Label>
              <Select value={investorForm.investment_stage || 'mvp'} onValueChange={v => setInvestorForm({ ...investorForm, investment_stage: v })}>
                <SelectTrigger className="bg-background border-border/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage} value={stage} className="capitalize">
                      {formatStage(stage)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Joined Date</Label>
              <Input type="date" value={investorForm.joined_date}
                onChange={e => setInvestorForm({ ...investorForm, joined_date: e.target.value })}
                className="bg-background border-border/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={investorForm.status} onValueChange={v => setInvestorForm({ ...investorForm, status: v })}>
                <SelectTrigger className="bg-background border-border/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={investorForm.notes}
                onChange={e => setInvestorForm({ ...investorForm, notes: e.target.value })}
                className="bg-background border-border/50 mt-1" placeholder="Optional notes..." />
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 mt-2"
              onClick={() => saveInvestorMutation.mutate(investorForm)}
              disabled={!investorForm.user_email || saveInvestorMutation.isPending}>
              {saveInvestorMutation.isPending ? 'Saving...' : 'Save Investor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revenue Entry Dialog */}
      <Dialog open={entryDialog} onOpenChange={setEntryDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Log Revenue Entry</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={entryForm.date}
                onChange={e => setEntryForm({ ...entryForm, date: e.target.value })}
                className="bg-background border-border/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Revenue (₦)</Label>
              <Input type="number" value={entryForm.revenue_naira}
                onChange={e => setEntryForm({ ...entryForm, revenue_naira: +e.target.value })}
                className="bg-background border-border/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Profit (₦)</Label>
              <Input type="number" value={entryForm.profit_naira}
                onChange={e => setEntryForm({ ...entryForm, profit_naira: +e.target.value })}
                className="bg-background border-border/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={entryForm.source} onValueChange={v => setEntryForm({ ...entryForm, source: v })}>
                <SelectTrigger className="bg-background border-border/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Offline Sale</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={entryForm.description}
                onChange={e => setEntryForm({ ...entryForm, description: e.target.value })}
                className="bg-background border-border/50 mt-1"
                placeholder="e.g. Event ticket sales, partnership deal..." />
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 mt-2"
              onClick={() => saveEntryMutation.mutate(entryForm)}
              disabled={!entryForm.date || saveEntryMutation.isPending}>
              {saveEntryMutation.isPending ? 'Saving...' : 'Log Entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
