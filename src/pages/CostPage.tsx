import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import CalendarHistory from '@/components/CalendarHistory';
import PrintButton from '@/components/PrintButton';

const costTypes = ['purchase', 'transport', 'supplier', 'draft', 'whiskey', 'preparation', 'other'];
const costLabels: Record<string, string> = {
  purchase: 'Purchase Cost', transport: 'Transport Cost', supplier: 'Supplier Cost',
  draft: 'Draft Cost', whiskey: 'Whiskey Cost', preparation: 'Preparation Cost', other: 'Other Cost',
};

type CostRow = {
  id: number | string;
  cost_date: string;
  title: string;
  category: string;
  amount: number;
  source_module: string;
  reference_id: string;
  notes: string;
  created_at: string;
};

export default function CostPage() {
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const defaultForm = { date: new Date().toISOString().split('T')[0], title: '', category: '', amount: '', notes: '' };
  const [form, setForm] = useState(defaultForm);

  const loadCosts = async () => {
    const { data, error } = await supabase.from('costs').select('*').order('cost_date', { ascending: false }).order('id', { ascending: false });
    if (error) {
      console.error(error);
      alert(`Error loading costs: ${error.message}`);
    } else {
      setCosts(data || []);
    }
  };

  useEffect(() => {
    loadCosts();
  }, []);

  const openEdit = (c: CostRow) => {
    setEditId(c.id);
    setForm({
      date: c.cost_date || new Date().toISOString().split('T')[0],
      title: c.title || '',
      category: c.category || '',
      amount: String(c.amount || 0),
      notes: c.notes || ''
    });
    setOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this cost?')) return;
    const { error } = await supabase.from('costs').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert(`Error deleting cost: ${error.message}`);
    } else {
      loadCosts();
    }
  };

  const handleSave = async () => {
    if (!form.category || !form.amount) return;
    
    const payload = {
      cost_date: form.date,
      title: form.title || costLabels[form.category] || form.category,
      category: form.category,
      amount: Number(form.amount),
      source_module: 'cost_page',
      notes: form.notes
    };
    
    if (editId) {
      const { error } = await supabase.from('costs').update(payload).eq('id', editId);
      if (error) {
         console.error(error);
         alert(`Error updating cost: ${error.message}`);
      } else {
         setOpen(false);
         setEditId(null);
         setForm(defaultForm);
         loadCosts();
      }
    } else {
      const { error } = await supabase.from('costs').insert([{ ...payload, created_at: new Date().toISOString() }]);
      if (error) {
         console.error(error);
         alert(`Error adding cost: ${error.message}`);
      } else {
         setOpen(false);
         setForm(defaultForm);
         loadCosts();
      }
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = typeFilter === 'all' ? costs : costs.filter(c => c.category === typeFilter);
  const todayCosts = costs.filter(c => c.cost_date === today).reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalCosts = costs.reduce((s, c) => s + Number(c.amount || 0), 0);

  // Weekly costs
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyCosts = costs.filter(c => new Date(c.cost_date) >= weekAgo).reduce((s, c) => s + Number(c.amount || 0), 0);

  // By category
  const costByCategory = costTypes.map(t => ({
    type: t, label: costLabels[t],
    total: costs.filter(c => c.category === t).reduce((s, c) => s + Number(c.amount || 0), 0),
  })).filter(c => c.total > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="module-header">
          <h1 className="module-title">Cost Management</h1>
          <p className="module-subtitle">Track direct business costs · Supabase connected</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Today's Costs</p><p className="text-xl font-bold font-heading mt-1">ETB {todayCosts.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">This Week</p><p className="text-xl font-bold font-heading mt-1">ETB {weeklyCosts.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total Costs</p><p className="text-xl font-bold font-heading mt-1">ETB {totalCosts.toLocaleString()}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Categories</p><p className="text-xl font-bold font-heading mt-1">{new Set(costs.map(c => c.category)).size}</p></div>
      </div>

      {costByCategory.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {costByCategory.map(c => (
            <div key={c.type} className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-sm font-bold mt-1">ETB {c.total.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {costTypes.map(t => <SelectItem key={t} value={t}>{costLabels[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Add Cost</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit Cost' : 'Record Cost'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 mt-4">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Title / Name (Optional)</Label><Input value={form.title} placeholder="e.g. Weekly Restock" onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Cost Type</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{costTypes.map(t => <SelectItem key={t} value={t}>{costLabels[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount (ETB)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setOpen(false); setEditId(null); setForm(defaultForm); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.category || !form.amount}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Cost Records</TabsTrigger>
          <TabsTrigger value="calendar">Calendar History</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Title</th><th>Type</th><th>Amount</th><th>Notes</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={6} className="text-center text-muted-foreground py-8">No costs recorded</td></tr> :
                  filtered.map(c => (
                    <tr key={c.id}><td>{c.cost_date}</td>
                      <td className="font-medium">{c.title || '—'}</td>
                      <td><span className="status-badge status-neutral">{costLabels[c.category] || c.category}</span></td>
                      <td className="font-medium">ETB {Number(c.amount || 0).toLocaleString()}</td>
                      <td className="text-sm text-muted-foreground">{c.notes}</td>
                      <td className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit" onClick={() => openEdit(c)}>
                           <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" title="Delete" onClick={() => handleDelete(c.id)}>
                           <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarHistory
            data={filtered.map(c => ({ ...c, date: c.cost_date }))}
            dateKey="date"
            title="Cost Calendar"
            renderDay={(items) => (
              <div className="space-y-2">
                <p className="text-sm font-medium">Total: ETB {items.reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString()}</p>
                {items.map((c: any) => (
                  <div key={c.id} className="bg-muted/50 rounded-lg p-2 text-sm flex justify-between items-start">
                    <div>
                      <p className="font-medium">{c.title || costLabels[c.category] || c.category}</p>
                      <p className="text-xs text-muted-foreground">ETB {Number(c.amount || 0).toLocaleString()} · {c.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
