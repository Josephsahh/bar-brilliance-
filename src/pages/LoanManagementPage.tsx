import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CheckCircle, ArrowLeftRight, CreditCard, Link as LinkIcon, FileText } from 'lucide-react';
import CalendarHistory from '@/components/CalendarHistory';
import PrintButton from '@/components/PrintButton';
import { Product, LoanTransaction, LoanReturn, LoanType, LoanStatus, SettlementType } from '@/types/models';

export default function LoanManagementPage() {
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState('borrow');

  // Form states
  const defaultForm = {
    date: new Date().toISOString().split('T')[0],
    person_name: '',
    product_id: '',
    quantity: '',
    notes: ''
  };
  const [borrowForm, setBorrowForm] = useState(defaultForm);
  const [lendForm, setLendForm] = useState(defaultForm);
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [lendOpen, setLendOpen] = useState(false);

  // Settlement Form State
  const defaultSettleForm = {
    date: new Date().toISOString().split('T')[0],
    settlement_type: 'payment' as SettlementType,
    payment_method: 'cash',
    returned_product_id: '',
    quantity: '',
    amount: '',
    notes: ''
  };
  const [settleForm, setSettleForm] = useState(defaultSettleForm);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleTx, setSettleTx] = useState<LoanTransaction | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    const { data: txData, error: txError } = await supabase
      .from('loan_transactions')
      .select('*')
      .order('loan_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (txError) {
      console.error(txError);
      alert(`Error loading transactions: ${txError.message}`);
    } else {
      setTransactions(txData || []);
    }

    const { data: pData, error: pError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (pError) console.error(pError);
    else setProducts(pData || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTransaction = async (type: LoanType, form: typeof defaultForm, setOpen: (v: boolean) => void, resetForm: () => void) => {
    if (!form.product_id || !form.person_name || !form.quantity) {
      alert("Please fill all required fields");
      return;
    }

    const product = products.find(p => p.id === form.product_id);
    if (!product) return;
    
    const qty = Number(form.quantity);

    // If lending out, ensure we have enough stock
    if (type === 'lend_out' && product.quantity < qty) {
      alert(`Not enough stock. Only ${product.quantity} available.`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Insert transaction
      const { error: insertError } = await supabase.from('loan_transactions').insert([{
        loan_date: form.date,
        loan_type: type,
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        quantity: qty,
        person_name: form.person_name,
        status: 'open',
        notes: form.notes
      }]);

      if (insertError) throw insertError;

      // 2. Update stock
      const newQuantity = type === 'borrow_in' 
        ? product.quantity + qty 
        : product.quantity - qty;

      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('id', product.id);

      if (updateError) throw updateError;

      setOpen(false);
      resetForm();
      loadData();
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadReceipt = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { error } = await supabase.storage.from('receipts').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSettle = async () => {
    if (!settleTx) return;
    setIsSubmitting(true);

    try {
      let receipt_url = null;
      if (settleForm.settlement_type === 'payment' && receiptFile) {
        receipt_url = await uploadReceipt(receiptFile);
      }

      const qty = Number(settleForm.quantity) || 0;
      
      // Validation
      if (settleForm.settlement_type === 'exchange') {
        if (!settleForm.returned_product_id) throw new Error("Must select a returned product");
        if (qty <= 0) throw new Error("Must specify returned quantity");
      }

      // 1. Insert Return Record
      const { error: returnError } = await supabase.from('loan_returns').insert([{
        loan_transaction_id: settleTx.id,
        return_date: settleForm.date,
        settlement_type: settleForm.settlement_type,
        quantity: settleForm.settlement_type === 'exchange' ? qty : 0,
        amount: settleForm.settlement_type === 'payment' ? Number(settleForm.amount) : 0,
        payment_method: settleForm.settlement_type === 'payment' ? settleForm.payment_method : null,
        receipt_url,
        notes: settleForm.notes
      }]);

      if (returnError) throw returnError;

      // 2. Update Transaction Status
      // For simplicity, we mark it fully paid/returned if they do any settlement.
      // A more complex system would track partials.
      const newStatus: LoanStatus = settleForm.settlement_type === 'payment' ? 'paid' : 'returned';
      
      const { error: txUpdateError } = await supabase.from('loan_transactions')
        .update({
          status: newStatus,
          settlement_type: settleForm.settlement_type,
          payment_method: settleForm.settlement_type === 'payment' ? settleForm.payment_method : null,
          receipt_url: receipt_url || settleTx.receipt_url,
          returned_quantity: settleTx.returned_quantity + qty
        })
        .eq('id', settleTx.id);

      if (txUpdateError) throw txUpdateError;

      // 3. Update Inventory if Exchange
      if (settleForm.settlement_type === 'exchange') {
        const retProduct = products.find(p => p.id === settleForm.returned_product_id);
        if (retProduct) {
          // If borrowed in, returning it means I give drinks back -> deduct stock
          // If lent out, returning it means they give drinks back -> add stock
          const newQty = settleTx.loan_type === 'borrow_in'
            ? retProduct.quantity - qty
            : retProduct.quantity + qty;
          
          if (newQty < 0) throw new Error("Resulting stock cannot be negative.");

          const { error: stockError } = await supabase
            .from('products')
            .update({ quantity: newQty })
            .eq('id', retProduct.id);
            
          if (stockError) throw stockError;
        }
      }

      setSettleOpen(false);
      setSettleTx(null);
      setSettleForm(defaultSettleForm);
      setReceiptFile(null);
      loadData();
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTable = (type: LoanType) => {
    const list = transactions.filter(t => t.loan_type === type);
    return (
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Person</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Settlement</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={7} className="text-center py-4">No records found</td></tr> : list.map(t => (
              <tr key={t.id}>
                <td>{t.loan_date}</td>
                <td className="font-medium">{t.person_name}</td>
                <td>{t.product_name} <span className="text-xs text-muted-foreground">({t.product_code})</span></td>
                <td>{t.quantity}</td>
                <td>
                  <span className={`status-badge ${t.status === 'open' ? 'status-low' : 'status-normal'}`}>
                    {t.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  {t.settlement_type ? (
                    <div className="flex flex-col text-sm">
                      <span className="capitalize text-muted-foreground">{t.settlement_type}</span>
                      {t.payment_method && <span className="text-xs">{t.payment_method}</span>}
                      {t.receipt_url && <a href={t.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline flex items-center gap-1 mt-1"><LinkIcon className="w-3 h-3"/> Receipt</a>}
                    </div>
                  ) : <span className="text-muted-foreground text-sm">—</span>}
                </td>
                <td className="text-right">
                  {t.status === 'open' && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setSettleTx(t);
                      setSettleForm({
                        ...defaultSettleForm,
                        returned_product_id: t.product_id, // Default to same product
                        quantity: String(t.quantity)
                      });
                      setSettleOpen(true);
                    }}>
                      Settle
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const totalBorrowedQty = transactions.filter(t => t.loan_type === 'borrow_in').reduce((sum, t) => sum + Number(t.quantity), 0);
  const totalLentQty = transactions.filter(t => t.loan_type === 'lend_out').reduce((sum, t) => sum + Number(t.quantity), 0);
  const openBorrowed = transactions.filter(t => t.loan_type === 'borrow_in' && t.status === 'open').length;
  const openLent = transactions.filter(t => t.loan_type === 'lend_out' && t.status === 'open').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="module-header">
          <h1 className="module-title">Loan Management</h1>
          <p className="module-subtitle">Track borrowed and lent drinks · Auto inventory updates</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Borrowed Items (Qty)</p>
          <p className="text-2xl font-bold font-heading mt-2">{totalBorrowedQty}</p>
          <p className="text-sm mt-1 text-red-500 font-medium">{openBorrowed} Open</p>
        </div>
        <div className="kpi-card border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lent Items (Qty)</p>
          <p className="text-2xl font-bold font-heading mt-2">{totalLentQty}</p>
          <p className="text-sm mt-1 text-green-500 font-medium">{openLent} Open</p>
        </div>
        <div className="kpi-card border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Settled via Payment</p>
          <p className="text-2xl font-bold font-heading mt-2">{transactions.filter(t => t.settlement_type === 'payment').length}</p>
        </div>
        <div className="kpi-card border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Settled via Exchange</p>
          <p className="text-2xl font-bold font-heading mt-2">{transactions.filter(t => t.settlement_type === 'exchange').length}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start border-b rounded-none bg-transparent">
          <TabsTrigger value="borrow" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none">Borrowed From Others</TabsTrigger>
          <TabsTrigger value="lend" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none">Lent To Others</TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none">Calendar History</TabsTrigger>
          <TabsTrigger value="report" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none">Loan Report</TabsTrigger>
        </TabsList>

        <div className="mt-6 bg-card p-4 rounded-xl border shadow-sm">
          <TabsContent value="borrow" className="mt-0 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-heading font-semibold text-card-foreground">Drinks Borrowed Inventory</h2>
              <Dialog open={borrowOpen} onOpenChange={setBorrowOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4"/> Borrow Drink</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record Borrowed Drink</DialogTitle></DialogHeader>
                  <p className="text-xs text-muted-foreground">This will <strong className="text-green-500">ADD</strong> stock to your inventory.</p>
                  <div className="grid gap-4 mt-2">
                    <div><Label>Date</Label><Input type="date" value={borrowForm.date} onChange={e => setBorrowForm({...borrowForm, date: e.target.value})} /></div>
                    <div><Label>From Whom (Supplier/Person)</Label><Input value={borrowForm.person_name} onChange={e => setBorrowForm({...borrowForm, person_name: e.target.value})} placeholder="Name" /></div>
                    <div><Label>Product</Label>
                      <Select value={borrowForm.product_id} onValueChange={v => setBorrowForm({...borrowForm, product_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                        <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Quantity</Label><Input type="number" min="0.1" step="0.1" value={borrowForm.quantity} onChange={e => setBorrowForm({...borrowForm, quantity: e.target.value})} /></div>
                    <div><Label>Notes</Label><Input value={borrowForm.notes} onChange={e => setBorrowForm({...borrowForm, notes: e.target.value})} /></div>
                    <Button onClick={() => handleAddTransaction('borrow_in', borrowForm, setBorrowOpen, () => setBorrowForm(defaultForm))} disabled={isSubmitting}>Save Borrowed</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {renderTable('borrow_in')}
          </TabsContent>

          <TabsContent value="lend" className="mt-0 space-y-4">
             <div className="flex justify-between items-center">
              <h2 className="text-lg font-heading font-semibold text-card-foreground">Drinks Lent Out</h2>
              <Dialog open={lendOpen} onOpenChange={setLendOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4"/> Lend Drink</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record Lent Drink</DialogTitle></DialogHeader>
                  <p className="text-xs text-muted-foreground">This will <strong className="text-red-500">DEDUCT</strong> stock from your inventory.</p>
                  <div className="grid gap-4 mt-2">
                    <div><Label>Date</Label><Input type="date" value={lendForm.date} onChange={e => setLendForm({...lendForm, date: e.target.value})} /></div>
                    <div><Label>To Whom (Customer/Person)</Label><Input value={lendForm.person_name} onChange={e => setLendForm({...lendForm, person_name: e.target.value})} placeholder="Name" /></div>
                    <div><Label>Product</Label>
                      <Select value={lendForm.product_id} onValueChange={v => setLendForm({...lendForm, product_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                        <SelectContent>{products.filter(p => p.quantity > 0).map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Quantity</Label><Input type="number" min="0.1" step="0.1" value={lendForm.quantity} onChange={e => setLendForm({...lendForm, quantity: e.target.value})} /></div>
                    <div><Label>Notes</Label><Input value={lendForm.notes} onChange={e => setLendForm({...lendForm, notes: e.target.value})} /></div>
                    <Button onClick={() => handleAddTransaction('lend_out', lendForm, setLendOpen, () => setLendForm(defaultForm))} disabled={isSubmitting}>Save Lent</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {renderTable('lend_out')}
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
             <CalendarHistory
              data={transactions.map(t => ({...t, date: t.loan_date}))}
              dateKey="date"
              title="Loan History Calendar"
              renderDay={(items) => (
                <div className="space-y-2">
                  {items.map((t: any) => (
                    <div key={t.id} className="bg-background rounded p-2 text-sm border-l-2" style={{ borderLeftColor: t.loan_type === 'borrow_in' ? '#ef4444' : '#22c55e' }}>
                      <div className="flex justify-between items-start">
                        <span className="font-semibold">{t.loan_type === 'borrow_in' ? 'Borrowed' : 'Lent'}</span>
                        <span className="text-xs text-muted-foreground">{t.status}</span>
                      </div>
                      <p className="truncate">{t.quantity}x {t.product_name}</p>
                      <p className="text-xs text-muted-foreground">👤 {t.person_name}</p>
                      {t.settlement_type && <p className="text-xs text-primary">Settled: {t.settlement_type}</p>}
                    </div>
                  ))}
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="report" className="mt-0 space-y-6">
            <h2 className="text-lg font-heading font-semibold">Active Loan Balances</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Who owes me */}
              <div className="bg-background rounded-lg border p-4">
                <h3 className="font-medium flex items-center gap-2 mb-4 text-green-600"><ArrowLeftRight className="w-4 h-4"/> People Who Owe Me (Lent Out)</h3>
                <div className="space-y-3">
                  {transactions.filter(t => t.loan_type === 'lend_out' && t.status === 'open').length === 0 && <p className="text-sm text-muted-foreground">All lent drinks returned.</p>}
                  {transactions.filter(t => t.loan_type === 'lend_out' && t.status === 'open').map(t => (
                    <div key={t.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{t.person_name}</p>
                        <p className="text-xs text-muted-foreground">{t.loan_date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{t.quantity}x {t.product_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Whom I owe */}
              <div className="bg-background rounded-lg border p-4">
                <h3 className="font-medium flex items-center gap-2 mb-4 text-red-600"><ArrowLeftRight className="w-4 h-4"/> People I Owe (Borrowed In)</h3>
                <div className="space-y-3">
                  {transactions.filter(t => t.loan_type === 'borrow_in' && t.status === 'open').length === 0 && <p className="text-sm text-muted-foreground">All borrowed drinks returned.</p>}
                  {transactions.filter(t => t.loan_type === 'borrow_in' && t.status === 'open').map(t => (
                    <div key={t.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{t.person_name}</p>
                        <p className="text-xs text-muted-foreground">{t.loan_date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{t.quantity}x {t.product_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Settle Dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Loan Transaction</DialogTitle>
          </DialogHeader>
          {settleTx && (
            <div className="grid gap-4 mt-2">
               <div className="bg-muted p-3 rounded text-sm">
                  <p><strong>Type:</strong> {settleTx.loan_type === 'borrow_in' ? 'Borrowed From' : 'Lent To'} {settleTx.person_name}</p>
                  <p><strong>Item:</strong> {settleTx.quantity}x {settleTx.product_name}</p>
                  {settleTx.loan_type === 'borrow_in' ? (
                    <p className="text-xs text-muted-foreground mt-1">If paying, stock does not change. If exchanging, stock will be deducted to return.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">If paying, stock does not change. If exchanging, stock will be added back.</p>
                  )}
               </div>

               <div><Label>Settle Date</Label><Input type="date" value={settleForm.date} onChange={e => setSettleForm({...settleForm, date: e.target.value})} /></div>
               
               <div>
                 <Label>Settlement Method</Label>
                 <Select value={settleForm.settlement_type} onValueChange={(v: SettlementType) => setSettleForm({...settleForm, settlement_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">By Payment</SelectItem>
                      <SelectItem value="exchange">By Returning Drinks (Exchange)</SelectItem>
                    </SelectContent>
                 </Select>
               </div>

               {settleForm.settlement_type === 'payment' && (
                 <>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={settleForm.payment_method} onValueChange={v => setSettleForm({...settleForm, payment_method: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="cbe">CBE</SelectItem>
                          <SelectItem value="bank">Other Bank</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount Paid</Label><Input type="number" placeholder="Enter amount..." value={settleForm.amount} onChange={e => setSettleForm({...settleForm, amount: e.target.value})}/></div>
                  
                  <div>
                    <Label>Attach Receipt Image/PDF</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                  </div>
                 </>
               )}

               {settleForm.settlement_type === 'exchange' && (
                  <>
                    <div>
                      <Label>Returned Product</Label>
                      <Select value={settleForm.returned_product_id} onValueChange={v => setSettleForm({...settleForm, returned_product_id: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Cur Stock: {p.quantity})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Quantity Returned</Label><Input type="number" step="0.1" value={settleForm.quantity} onChange={e => setSettleForm({...settleForm, quantity: e.target.value})}/></div>
                  </>
               )}

               <div><Label>Notes</Label><Input value={settleForm.notes} onChange={e => setSettleForm({...settleForm, notes: e.target.value})} placeholder="Optional"/></div>

               <Button onClick={handleSettle} disabled={isSubmitting} className="w-full">
                 <CheckCircle className="w-4 h-4 mr-2" /> Confirm Settlement
               </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
