import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, AlertTriangle } from "lucide-react";
import PrintButton from "@/components/PrintButton";

type ProductRow = {
  id: number;
  code: string | null;
  name: string;
  category: string;
  unit: string | null;
  quantity: number | null;
  cost_price: number | null;
  selling_price: number | null;
  is_active: boolean | null;
};

function fromDbCategory(category: string): string {
  switch (category) {
    case "beer":
      return "Beer";
    case "soft_drink":
      return "Soft Drink";
    case "wine":
      return "Wine";
    case "whiskey":
      return "Whiskey";
    case "draft":
      return "Draft";
    default:
      return "Other";
  }
}

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");

  const loadProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, code, name, category, unit, quantity, cost_price, selling_price, is_active"
      )
      .order("id", { ascending: true });

    if (error) {
      console.error("Load inventory error:", error);
      alert(`Failed to load inventory: ${error.message}`);
    } else {
      setProducts((data || []) as ProductRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const active = useMemo(
    () => products.filter((p) => p.is_active ?? true),
    [products]
  );

  const filtered = useMemo(() => {
    return active.filter((p) => {
      const uiCategory = fromDbCategory(p.category);

      if (
        search &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.code || "").toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      if (catFilter !== "all" && uiCategory !== catFilter) {
        return false;
      }

      return true;
    });
  }, [active, search, catFilter]);

  const totalQty = active.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
  const stockValue = active.reduce(
    (sum, p) => sum + Number(p.quantity || 0) * Number(p.cost_price || 0),
    0
  );

  const lowStock = active.filter((p) => Number(p.quantity || 0) <= 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="module-header flex justify-between items-start">
        <div>
          <h1 className="module-title">Inventory</h1>
          <p className="module-subtitle">Full stock overview and management</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Total Items</p>
          <p className="text-xl font-bold font-heading mt-1">{active.length}</p>
        </div>

        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Total Quantity</p>
          <p className="text-xl font-bold font-heading mt-1">
            {totalQty.toLocaleString()}
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Stock Value</p>
          <p className="text-xl font-bold font-heading mt-1">
            ETB {stockValue.toLocaleString()}
          </p>
        </div>

        <div className="kpi-card flex items-start gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Low Stock</p>
            <p className="text-xl font-bold font-heading mt-1">{lowStock}</p>
          </div>
          {lowStock > 0 && <AlertTriangle className="w-5 h-5 text-warning mt-1" />}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {["Beer", "Soft Drink", "Wine", "Whiskey", "Draft", "Other"].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Product</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Sell</th>
              <th>Margin</th>
              <th>Stock Value</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center text-muted-foreground py-8">
                  Loading inventory...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-muted-foreground py-8">
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const qty = Number(p.quantity || 0);
                const cost = Number(p.cost_price || 0);
                const sell = Number(p.selling_price || 0);
                const margin =
                  sell > 0 ? (((sell - cost) / sell) * 100).toFixed(0) : "0";
                const isLow = qty <= 0;

                return (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.code}</td>
                    <td className="font-medium">{p.name}</td>
                    <td>
                      <span className="status-badge status-neutral">
                        {fromDbCategory(p.category)}
                      </span>
                    </td>
                    <td>{p.unit || "pcs"}</td>
                    <td
                      className={`font-medium ${
                        isLow ? "text-destructive" : ""
                      }`}
                    >
                      {qty}
                    </td>
                    <td>ETB {cost}</td>
                    <td>ETB {sell}</td>
                    <td>
                      <span className="status-badge status-success">{margin}%</span>
                    </td>
                    <td className="font-medium">
                      ETB {(qty * cost).toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          isLow ? "status-danger" : "status-success"
                        }`}
                      >
                        {isLow ? "Out of Stock" : "In Stock"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}