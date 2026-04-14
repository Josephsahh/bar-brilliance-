import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Trash2 } from "lucide-react";
import CalendarHistory from "@/components/CalendarHistory";
import PrintButton from "@/components/PrintButton";

type ProductRow = {
  id: number;
  code: string | null;
  name: string;
  category: string;
  unit: string | null;
  cost_price: number | null;
  selling_price: number | null;
  quantity: number | null;
  standing_target: number | null;
};

type RelatedProduct = {
  id: number;
  code: string | null;
  name: string;
  category: string;
  unit: string | null;
};

type PurchaseRow = {
  id: number;
  purchase_date: string;
  supplier: string | null;
  product_id: number;
  quantity: number;
  cost_price: number;
  selling_price: number | null;
  notes: string | null;
  created_at: string | null;
  products: RelatedProduct | RelatedProduct[] | null;
};

type CalendarPurchaseItem = {
  id: number;
  date: string;
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  totalAmount: number;
  supplier: string;
};

const categoryOptions = ["Beer", "Soft Drink", "Wine", "Whiskey", "Draft", "Other"];

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

function getPurchaseProduct(product: RelatedProduct | RelatedProduct[] | null): RelatedProduct | null {
  if (Array.isArray(product)) return product[0] ?? null;
  return product;
}

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    supplier: "",
    productId: "",
    quantity: "",
    costPrice: "",
    sellingPrice: "",
    notes: "",
  });

  const selectedProduct = products.find((p) => String(p.id) === form.productId);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, code, name, category, unit, cost_price, selling_price, quantity, standing_target")
      .order("id", { ascending: true });

    if (error) {
      console.error("Load products error:", error);
      alert(`Failed to load products: ${error.message}`);
      return;
    }

    setProducts((data || []) as ProductRow[]);
  };

  const loadPurchases = async () => {
    const { data, error } = await supabase
      .from("purchases")
      .select(`
        id,
        purchase_date,
        supplier,
        product_id,
        quantity,
        cost_price,
        selling_price,
        notes,
        created_at,
        products (
          id,
          code,
          name,
          category,
          unit
        )
      `)
      .order("purchase_date", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("Load purchases error:", error);
      alert(`Failed to load purchases: ${error.message}`);
      return;
    }

    setPurchases((data || []) as PurchaseRow[]);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProducts(), loadPurchases()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSave = async () => {
    if (!selectedProduct || !form.quantity) return;

    setSaving(true);

    const qty = Number(form.quantity);
    const cost = Number(form.costPrice || selectedProduct.cost_price || 0);
    const sell = Number(form.sellingPrice || selectedProduct.selling_price || 0);

    const { error: purchaseError } = await supabase.from("purchases").insert([
      {
        purchase_date: form.date,
        supplier: form.supplier || null,
        product_id: selectedProduct.id,
        quantity: qty,
        cost_price: cost,
        selling_price: sell,
        notes: form.notes || null,
      },
    ]);

    if (purchaseError) {
      console.error("Save purchase error:", purchaseError);
      alert(`Failed to save purchase: ${purchaseError.message}`);
      setSaving(false);
      return;
    }

    const currentQty = Number(selectedProduct.quantity || 0);
    const { error: updateError } = await supabase
      .from("products")
      .update({
        quantity: currentQty + qty,
        cost_price: cost,
        selling_price: sell,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedProduct.id);

    if (updateError) {
      console.error("Update product quantity error:", updateError);
      alert(`Purchase saved, but failed to update stock: ${updateError.message}`);
      setSaving(false);
      await loadAll();
      return;
    }

    setForm({
      date: new Date().toISOString().split("T")[0],
      supplier: "",
      productId: "",
      quantity: "",
      costPrice: "",
      sellingPrice: "",
      notes: "",
    });
    setOpen(false);
    setSaving(false);
    await loadAll();
  };

  const handleDelete = async (purchase: PurchaseRow) => {
    const product = products.find((p) => p.id === purchase.product_id);

    if (product) {
      const currentQty = Number(product.quantity || 0);
      const newQty = currentQty - Number(purchase.quantity || 0);

      const { error: updateError } = await supabase
        .from("products")
        .update({
          quantity: newQty < 0 ? 0 : newQty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.product_id);

      if (updateError) {
        console.error("Reverse stock error:", updateError);
        alert(`Failed to reverse stock: ${updateError.message}`);
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from("purchases")
      .delete()
      .eq("id", purchase.id);

    if (deleteError) {
      console.error("Delete purchase error:", deleteError);
      alert(`Failed to delete purchase: ${deleteError.message}`);
      return;
    }

    await loadAll();
  };

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const product = getPurchaseProduct(p.products);
      const productName = product?.name || "";
      const productCode = product?.code || "";
      const category = fromDbCategory(product?.category || "other");

      if (
        search &&
        !productName.toLowerCase().includes(search.toLowerCase()) &&
        !productCode.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      if (catFilter !== "all" && category !== catFilter) {
        return false;
      }

      return true;
    });
  }, [purchases, search, catFilter]);

  const totalPurchaseValue = filtered.reduce(
    (sum, p) => sum + Number(p.quantity) * Number(p.cost_price || 0),
    0
  );

  const today = new Date().toISOString().split("T")[0];

  const calendarData: CalendarPurchaseItem[] = filtered.map((p) => ({
    id: p.id,
    date: p.purchase_date,
    productCode: getPurchaseProduct(p.products)?.code || "",
    productName: getPurchaseProduct(p.products)?.name || "",
    category: fromDbCategory(getPurchaseProduct(p.products)?.category || "other"),
    quantity: Number(p.quantity || 0),
    costPrice: Number(p.cost_price || 0),
    sellingPrice: Number(p.selling_price || 0),
    totalAmount: Number(p.quantity || 0) * Number(p.cost_price || 0),
    supplier: p.supplier || "",
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="module-header flex justify-between items-start">
        <div>
          <h1 className="module-title">Purchase Management</h1>
          <p className="module-subtitle">
            Record and manage product purchases · Updates Supabase product stock
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Total Purchases</p>
          <p className="text-xl font-bold font-heading mt-1">{filtered.length}</p>
        </div>

        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="text-xl font-bold font-heading mt-1">
            ETB {totalPurchaseValue.toLocaleString()}
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Today's Purchases</p>
          <p className="text-xl font-bold font-heading mt-1">
            {filtered.filter((p) => p.purchase_date === today).length}
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Suppliers</p>
          <p className="text-xl font-bold font-heading mt-1">
            {new Set(filtered.map((p) => p.supplier).filter(Boolean)).size}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search purchases..."
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
            {categoryOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Purchase
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Record Purchase</DialogTitle>
            </DialogHeader>

            <p className="text-xs text-muted-foreground">
              This will auto-update product quantity in Supabase.
            </p>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>

              <div>
                <Label>Supplier</Label>
                <Input
                  value={form.supplier}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                  placeholder="Supplier name"
                />
              </div>

              <div className="col-span-2">
                <Label>Product</Label>
                <Select
                  value={form.productId}
                  onValueChange={(v) => {
                    const p = products.find((pr) => String(pr.id) === v);
                    setForm((f) => ({
                      ...f,
                      productId: v,
                      costPrice: String(p?.cost_price ?? ""),
                      sellingPrice: String(p?.selling_price ?? ""),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.code} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="col-span-2 text-xs text-muted-foreground bg-muted rounded-lg p-2">
                  Current stock: {selectedProduct.quantity ?? 0} {selectedProduct.unit || "pcs"}
                </div>
              )}

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>

              <div>
                <Label>Cost Price</Label>
                <Input
                  type="number"
                  value={form.costPrice}
                  onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                />
              </div>

              <div>
                <Label>Selling Price</Label>
                <Input
                  type="number"
                  value={form.sellingPrice}
                  onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!form.productId || !form.quantity || saving}>
                {saving ? "Saving..." : "Save Purchase"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar History</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Sell</th>
                  <th>Total</th>
                  <th>Supplier</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center text-muted-foreground py-8">
                      Loading purchases...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-muted-foreground py-8">
                      No purchases found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id}>
                      <td>{p.purchase_date}</td>
                      <td className="font-mono text-xs">{getPurchaseProduct(p.products)?.code}</td>
                      <td className="font-medium">{getPurchaseProduct(p.products)?.name}</td>
                      <td>
                        <span className="status-badge status-neutral">
                          {fromDbCategory(getPurchaseProduct(p.products)?.category || "other")}
                        </span>
                      </td>
                      <td>{p.quantity}</td>
                      <td>ETB {p.cost_price}</td>
                      <td>ETB {p.selling_price ?? 0}</td>
                      <td className="font-medium">
                        ETB {(Number(p.quantity) * Number(p.cost_price)).toLocaleString()}
                      </td>
                      <td>{p.supplier}</td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarHistory
            data={calendarData}
            dateKey="date"
            title="Purchase Calendar"
            renderDay={(items: CalendarPurchaseItem[]) => (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Total: ETB {items.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()} ·{" "}
                  {items.length} records
                </p>
                {items.map((p) => (
                  <div key={p.id} className="bg-muted/50 rounded-lg p-2 text-sm">
                    <p className="font-medium">{p.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.quantity} × ETB {p.costPrice} = ETB {p.totalAmount.toLocaleString()} ·{" "}
                      {p.supplier}
                    </p>
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