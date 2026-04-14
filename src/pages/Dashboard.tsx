import { useAppStore } from '@/context/AppContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, DollarSign, TrendingUp, TrendingDown, ShoppingCart, AlertTriangle, CreditCard, BarChart3 } from 'lucide-react';

import PrintButton from '@/components/PrintButton';

const COLORS = ['hsl(38,92%,50%)', 'hsl(217,91%,60%)', 'hsl(142,71%,45%)', 'hsl(0,72%,51%)', 'hsl(262,83%,58%)'];

export default function DashboardPage() {
  const { products, purchases, sales, expenses, costs, standingStock } = useAppStore();
  const today = new Date().toISOString().split('T')[0];

  const totalProducts = products.filter(p => p.status === 'active').length;
  const totalInventory = products.reduce((s, p) => s + p.quantity, 0);
  const stockValue = products.reduce((s, p) => s + p.quantity * p.costPrice, 0);
  const purchaseValue = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const salesToday = sales.filter(s => s.date === today).reduce((s, sale) => s + sale.total, 0);
  const expensesToday = expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
  const totalCosts = costs.reduce((s, c) => s + c.amount, 0) + purchases.reduce((s, p) => s + p.totalAmount, 0);
  const totalSalesAll = sales.reduce((s, sale) => s + sale.total, 0);
  const totalExpensesAll = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalSalesAll - purchases.reduce((s, p) => s + p.totalAmount, 0);
  const netProfit = grossProfit - totalExpensesAll;
  const lowStockItems = products.filter(p => p.quantity <= p.reorderLevel && p.status === 'active');
  const negativeStanding = standingStock.filter(ss => ss.remainingStanding < 0);

  const kpis = [
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-info' },
    { label: 'Total Inventory', value: totalInventory.toLocaleString(), icon: Package, color: 'text-primary' },
    { label: 'Stock Value', value: `ETB ${stockValue.toLocaleString()}`, icon: DollarSign, color: 'text-chart-2' },
    { label: 'Sales Today', value: `ETB ${salesToday.toLocaleString()}`, icon: CreditCard, color: 'text-success' },
    { label: 'Expenses Today', value: `ETB ${expensesToday.toLocaleString()}`, icon: TrendingDown, color: 'text-destructive' },
    { label: 'Gross Profit', value: `ETB ${grossProfit.toLocaleString()}`, icon: TrendingUp, color: 'text-success' },
    { label: 'Net Profit', value: `ETB ${netProfit.toLocaleString()}`, icon: BarChart3, color: netProfit >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Low Stock Items', value: lowStockItems.length, icon: AlertTriangle, color: lowStockItems.length > 0 ? 'text-warning' : 'text-success' },
  ];

  const categoryData = ['Beer', 'Soft Drink', 'Wine', 'Whiskey', 'Draft'].map(cat => ({
    name: cat,
    quantity: products.filter(p => p.category === cat).reduce((s, p) => s + p.quantity, 0),
    value: products.filter(p => p.category === cat).reduce((s, p) => s + p.quantity * p.sellingPrice, 0),
  }));

  const topSelling = sales.flatMap(s => s.items).reduce((acc, item) => {
    const existing = acc.find(a => a.name === item.productName);
    if (existing) { existing.qty += item.quantity; existing.revenue += item.total; }
    else acc.push({ name: item.productName, qty: item.quantity, revenue: item.total });
    return acc;
  }, [] as { name: string; qty: number; revenue: number }[]).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="module-header flex justify-between items-start">
        <div>
          <h1 className="module-title">Dashboard</h1>
          <p className="module-subtitle">Business overview and key performance indicators</p>
        </div>
        <PrintButton />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                <p className="text-xl font-bold mt-1 font-heading">{kpi.value}</p>
              </div>
              <kpi.icon className={`w-5 h-5 ${kpi.color} opacity-70`} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Inventory by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="quantity" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-4 font-heading">Stock Value by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `ETB ${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Selling */}
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-3 font-heading">Top Selling Products</h3>
          <div className="space-y-2">
            {topSelling.length === 0 ? <p className="text-xs text-muted-foreground">No sales yet</p> : topSelling.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: COLORS[i], color: '#fff' }}>{i + 1}</span>
                  <span className="truncate">{p.name}</span>
                </div>
                <span className="font-medium">ETB {p.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-3 font-heading">Low Stock Alerts</h3>
          <div className="space-y-2">
            {lowStockItems.length === 0 ? <p className="text-xs text-muted-foreground">All stock levels healthy</p> : lowStockItems.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{p.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`status-badge ${p.quantity === 0 ? 'status-danger' : 'status-warning'}`}>
                    {p.quantity} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-3 font-heading">Recent Sales</h3>
          <div className="space-y-2">
            {sales.length === 0 ? <p className="text-xs text-muted-foreground">No sales yet</p> : sales.slice(-5).reverse().map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{s.receiptNo}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{s.time}</span>
                </div>
                <span className="font-medium">ETB {s.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
