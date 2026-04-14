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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import PrintButton from "@/components/PrintButton";

type Category = "Beer" | "Soft Drink" | "Wine" | "Whiskey" | "Draft" | "Other";

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
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const categories: Category[] = [
  "Beer",
  "Soft Drink",
  "Wine",
  "Whiskey",
  "Draft",
  "Other",
];

const emptyForm = {
  code: "",
  name: "",
  category: "Beer" as Category,
  unit: "Bottle",
  costPrice: "",
  sellingPrice: "",
  quantity: "0",
  standingTarget: "",
};

function toDbCategory(category: Category) {
  switch (category) {
    case "Beer":
      return "beer";
    case "Soft Drink":
      return "soft_drink";
    case "Wine":
      return "wine";
    case "Whiskey":
      return "whiskey";
    case "Draft":
      return "draft";
    default:
      return "other";
  }
}

function fromDbCategory(category: string): Category {
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

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [form, setForm] = useState(emptyForm);

  const loadProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Load products error:", error);
      alert(`Failed to load products: ${error.message}`);
    } else {
      setProducts((data || []) as ProductRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const getNextProductCode = () => {
    const nums = products
      .map((p) => Number(p.code))
      .filter((n) => !Number.isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return String(max + 1);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      code: getNextProductCode(),
    });
    setOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditId(p.id);
    setForm({
      code: p.code || "",
      name: p.name,
      category: fromDbCategory(p.category),
      unit: p.unit || "Bottle",
      costPrice: String(p.cost_price ?? 0),
      sellingPrice: String(p.selling_price ?? 0),
      quantity: String(p.quantity ?? 0),
      standingTarget: String(p.standing_target ?? 0),
    });
    setOpen(true);
  };

  const handleCategoryChange = (cat: Category) => {
    setForm((f) => ({ ...f, category: cat }));
  };

  const handleSave = async () => {
    if (!form.code || !form.name) return;

    setSaving(true);

    const payload = {
      code: form.code,
      name: form.name,
      category: toDbCategory(form.category),
      unit: form.unit || "Bottle",
      cost_price: Number(form.costPrice || 0),
      selling_price: Number(form.sellingPrice || 0),
      quantity: Number(form.quantity || 0),
      standing_target: Number(form.standingTarget || 0),
      updated_at: new Date().toISOString(),
    };

    if (editId) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editId);

      if (error) {
        console.error("Update product error:", error);
        alert(`Failed to update product: ${error.message}`);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("products").insert([
        {
          ...payload,
          is_active: true,
        },
      ]);

      if (error) {
        console.error("Add product error:", error);
        alert(`Failed to add product: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    setSaving(false);
    await loadProducts();
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Delete product error:", error);
      alert(`Failed to delete product: ${error.message}`);
      return;
    }

    await loadProducts();
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
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
  }, [products, search, catFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="module-header">
          <h1 className="module-title">Product Management</h1>
          <p className="module-subtitle">
            Add, edit, and manage your products · Supabase connected
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
            <SelectItem value="all">All</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openAdd}>
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editId ? "Edit Product" : "Add Product"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => handleCategoryChange(v as Category)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  Product Code {!editId && <span className="text-xs text-primary">(auto)</span>}
                </Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  readOnly={!editId}
                  className={!editId ? "bg-muted" : ""}
                />
              </div>

              <div className="col-span-2">
                <Label>Product Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
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
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>

              <div>
                <Label>Standing Target</Label>
                <Input
                  type="number"
                  value={form.standingTarget}
                  onChange={(e) => setForm((f) => ({ ...f, standingTarget: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!form.code || !form.name || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Sell</th>
              <th>Target</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-8">
                  Loading products...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8">
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.code}</td>
                  <td className="font-medium">{p.name}</td>
                  <td>
                    <span className="status-badge status-neutral">
                      {fromDbCategory(p.category)}
                    </span>
                  </td>
                  <td>{p.unit}</td>
                  <td>{p.quantity ?? 0}</td>
                  <td>ETB {p.cost_price ?? 0}</td>
                  <td>ETB {p.selling_price ?? 0}</td>
                  <td>{p.standing_target ?? 0}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        p.is_active ? "status-success" : "status-neutral"
                      }`}
                    >
                      {p.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {p.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(p.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}