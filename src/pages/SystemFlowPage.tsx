import { ShoppingCart, Package, Thermometer, CreditCard, Wine, Beer, Receipt, DollarSign, ArrowLeftRight, BarChart3, RefreshCw, ArrowDown, ArrowRight } from 'lucide-react';

const modules = [
  { id: 'purchase', title: 'Purchase', desc: 'Record purchased drinks and products. Auto-update inventory. Save purchase cost history.', icon: ShoppingCart, color: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
  { id: 'inventory', title: 'Inventory / Store', desc: 'Keep all product stock. Auto-generate codes. Track stock changes by date. Send stock to standing.', icon: Package, color: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
  { id: 'standing', title: 'Standing Stock / Fridge', desc: 'Daily selling stock. Refilled from inventory. Allows negative standing. Tracks daily movement.', icon: Thermometer, color: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
  { id: 'pos', title: 'POS (Bulk Daily Entry)', desc: 'Enter total sold quantity once per day. Subtract from standing stock. Calculate totals automatically.', icon: CreditCard, color: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
  { id: 'reports', title: 'Reports', desc: 'Calculate totals automatically. Sales, cost, expense summary. Gross and net profit. Charts.', icon: BarChart3, color: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
];

const secondaryModules = [
  { id: 'refill', title: 'Refill Request', desc: 'Standing sends request to inventory. Inventory approves refill. Stock moves from inventory to standing.', icon: RefreshCw, color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' },
  { id: 'exchange', title: 'Exchange', desc: 'Exchange same-category products. Deduct from source, add to destination standing. Not counted as purchase.', icon: ArrowLeftRight, color: 'bg-amber-500/10 border-amber-500/30 text-amber-600' },
  { id: 'draft', title: 'Draft Module', desc: 'Track bermel purchases. Calculate glasses sold daily. Track remaining draft quantity. Save history calendar.', icon: Beer, color: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
  { id: 'whiskey', title: 'Whiskey Module', desc: 'Track bottle and glass sales. Calculate remaining ml. Track profit per whiskey. Save history.', icon: Wine, color: 'bg-purple-500/10 border-purple-500/30 text-purple-600' },
  { id: 'cost', title: 'Cost', desc: 'Record purchase-related costs. Categorize cost types. Show cost history calendar. Auto from purchases.', icon: DollarSign, color: 'bg-amber-500/10 border-amber-500/30 text-amber-600' },
  { id: 'expense', title: 'Expense', desc: 'Track daily expenses. Categorize types. Reduce inventory if drink expense. Calendar history.', icon: Receipt, color: 'bg-red-500/10 border-red-500/30 text-red-600' },
];

export default function SystemFlowPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="module-header">
        <h1 className="module-title">System Flow Diagram</h1>
        <p className="module-subtitle">Bar Management System Workflow — Purchase, Inventory, POS, Draft, Whiskey, Cost, Expense, and Reports Logic</p>
      </div>

      {/* Main Flow */}
      <div className="kpi-card">
        <h3 className="text-sm font-semibold font-heading mb-6">Primary Flow</h3>
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {modules.map((mod, i) => (
            <div key={mod.id} className="flex flex-col lg:flex-row items-center gap-3 w-full lg:w-auto">
              <div className={`rounded-xl border-2 p-4 w-full lg:w-44 ${mod.color} shadow-sm`}>
                <div className="flex items-center gap-2 mb-2">
                  <mod.icon className="w-5 h-5 flex-shrink-0" />
                  <h4 className="text-sm font-bold font-heading">{mod.title}</h4>
                </div>
                <p className="text-[11px] leading-tight opacity-80">{mod.desc}</p>
              </div>
              {i < modules.length - 1 && (
                <>
                  <ArrowDown className="w-5 h-5 text-muted-foreground lg:hidden" />
                  <ArrowRight className="w-5 h-5 text-muted-foreground hidden lg:block flex-shrink-0" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Secondary Connections */}
      <div className="kpi-card">
        <h3 className="text-sm font-semibold font-heading mb-4">Secondary Connections</h3>
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-semibold mb-1">Standing Stock → Refill Request → Inventory Approval → Standing Stock</p>
            <p className="text-[11px] text-muted-foreground">When standing is below target, a refill request is created. Inventory must approve before stock moves.</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-semibold mb-1">POS → Sales History → Reports</p>
            <p className="text-[11px] text-muted-foreground">All POS sales are saved with date and flow into report calculations.</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-semibold mb-1">Purchase → Cost History → Reports</p>
            <p className="text-[11px] text-muted-foreground">Purchase automatically creates a cost record that appears in cost history and reports.</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-semibold mb-1">Exchange → Standing Stock</p>
            <p className="text-[11px] text-muted-foreground">Same-category exchange deducts from source inventory and adds to destination standing stock.</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-semibold mb-1">Draft / Whiskey / Expense → Reports</p>
            <p className="text-[11px] text-muted-foreground">All module data flows into the reports page for gross and net profit calculations.</p>
          </div>
        </div>
      </div>

      {/* Module Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {secondaryModules.map(mod => (
          <div key={mod.id} className={`rounded-xl border-2 p-4 ${mod.color} shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <mod.icon className="w-5 h-5 flex-shrink-0" />
              <h4 className="text-sm font-bold font-heading">{mod.title}</h4>
            </div>
            <p className="text-xs leading-relaxed opacity-80">{mod.desc}</p>
          </div>
        ))}
      </div>

      {/* Negative Stock Logic */}
      <div className="kpi-card border-l-4 border-l-destructive">
        <h3 className="text-sm font-semibold font-heading mb-2 text-destructive">Negative Stock Logic</h3>
        <div className="text-xs space-y-1 text-muted-foreground">
          <p>• If inventory cannot fully refill standing, standing becomes negative.</p>
          <p>• Example: Target = 300, Available = 270 → Remaining = -30</p>
          <p>• When new purchase arrives: negative quantity is filled first.</p>
          <p>• Example: Purchase = 500, Negative = -30 → Remaining Inventory = 470</p>
        </div>
      </div>

      {/* Exchange Logic */}
      <div className="kpi-card border-l-4 border-l-warning">
        <h3 className="text-sm font-semibold font-heading mb-2" style={{ color: 'hsl(var(--warning))' }}>Exchange Logic</h3>
        <div className="text-xs space-y-1 text-muted-foreground">
          <p>• Only same-category exchanges allowed (Beer → Beer, not Beer → Whiskey)</p>
          <p>• Deducts from source product inventory</p>
          <p>• Adds to destination product standing stock</p>
          <p>• Not counted as a purchase</p>
          <p>• Example: Dashen finished → Exchange 40 Habesha → Dashen standing</p>
        </div>
      </div>
    </div>
  );
}
