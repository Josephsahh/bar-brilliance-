import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  RefreshCw,
  Pencil,
  RotateCcw,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import CalendarHistory from "@/components/CalendarHistory";
import PrintButton from "@/components/PrintButton";

type ProductRow = {
  id: number;
  code: string | null;
  name: string;
  category: string;
  quantity: number | null;
  standing_target: number | null;
};

type RelatedStandingProduct = {
  id: number;
  code: string | null;
  name: string;
  category: string;
};

type StandingStockDbRow = {
  id: number;
  product_id: number;
  target_quantity: number | null;
  current_quantity: number | null;
  updated_at: string | null;
  products: RelatedStandingProduct | RelatedStandingProduct[] | null;
};

type StandingViewRow = {
  id: string;
  standingId: number | null;
  productId: number;
  productName: string;
  productCode: string;
  target: number;
  openingStanding: number;
  quantitySold: number;
  remainingStanding: number;
  inventoryQuantity: number;
  status: "normal" | "low" | "negative";
  date: string;
};

interface RefillRow {
  productId: string;
  quantity: string;
}

function getStatus(current: number, target: number): "normal" | "low" | "negative" {
  if (current < 0) return "negative";
  if (current < target * 0.3) return "low";
  return "normal";
}

function getStandingProduct(
  product: RelatedStandingProduct | RelatedStandingProduct[] | null
): RelatedStandingProduct | null {
  if (Array.isArray(product)) return product[0] ?? null;
  return product;
}

export default function StandingStockPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [standingDbRows, setStandingDbRows] = useState<StandingStockDbRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ target: "" });

  const [refillRows, setRefillRows] = useState<RefillRow[]>([{ productId: "", quantity: "" }]);
  const [showRefill, setShowRefill] = useState(false);

  const loadAll = async () => {
    setLoading(true);

    const [prodRes, standRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, code, name, category, quantity, standing_target")
        .order("id", { ascending: true }),
      supabase
        .from("standing_stock")
        .select(`id, product_id, target_quantity, current_quantity, updated_at, products(id, code, name, category)`)
        .order("id", { ascending: true })
    ]);

    if (prodRes.error) {
      console.error("Load products error:", prodRes.error);
      alert(`Failed to load products: ${prodRes.error.message}`);
      setLoading(false);
      return;
    }

    if (standRes.error) {
      console.error("Load standing stock error:", standRes.error);
      alert(`Failed to load standing stock: ${standRes.error.message}`);
      setLoading(false);
      return;
    }

    const prods = (prodRes.data || []) as ProductRow[];
    let stands = (standRes.data || []) as StandingStockDbRow[];

    // Ensure standing stock rows
    const map = new Set(stands.map((s) => s.product_id));
    const filteredProducts = prods.filter(
      (p) =>
        Number(p.standing_target || 0) > 0 ||
        ["beer", "soft_drink", "wine", "other"].includes((p.category || "").toLowerCase())
    );

    const missingRows = filteredProducts
      .filter((p) => !map.has(p.id))
      .map((p) => ({
        product_id: p.id,
        target_quantity: p.standing_target || 0,
        current_quantity: 0,
        updated_at: new Date().toISOString(),
      }));

    if (missingRows.length > 0) {
      await supabase.from("standing_stock").insert(missingRows);
      
      const { data: updatedStand } = await supabase
        .from("standing_stock")
        .select(`id, product_id, target_quantity, current_quantity, updated_at, products(id, code, name, category)`)
        .order("id", { ascending: true });
        
      if (updatedStand) {
        stands = (updatedStand || []) as StandingStockDbRow[];
      }
    }

    setProducts(prods);
    setStandingDbRows(stands);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const standingStock = useMemo<StandingViewRow[]>(() => {
    const map = new Map<number, StandingStockDbRow>();
    standingDbRows.forEach((row) => map.set(row.product_id, row));

    const filteredProducts = products.filter(
      (p) =>
        Number(p.standing_target || 0) > 0 ||
        ["beer", "soft_drink", "wine"].includes((p.category || "").toLowerCase())
    );

    return filteredProducts.map((product) => {
      const standing = map.get(product.id);
      const related = getStandingProduct(standing?.products ?? null);
      const target = Number(standing?.target_quantity ?? product.standing_target ?? 0);
      const current = Number(standing?.current_quantity ?? 0);

      return {
        id: standing ? String(standing.id) : `virtual-${product.id}`,
        standingId: standing?.id ?? null,
        productId: product.id,
        productName: related?.name || product.name,
        productCode: related?.code || product.code || "",
        target,
        openingStanding: current,
        quantitySold: Math.max(0, target - current),
        remainingStanding: current,
        inventoryQuantity: Number(product.quantity || 0),
        status: getStatus(current, target),
        date: standing?.updated_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      };
    });
  }, [products, standingDbRows]);

  const lowCount = standingStock.filter((ss) => ss.status === "low").length;
  const negativeCount = standingStock.filter((ss) => ss.status === "negative").length;
  const needRefill = standingStock.filter((ss) => ss.remainingStanding < ss.target).length;

  const addRefillRow = () => setRefillRows((prev) => [...prev, { productId: "", quantity: "" }]);

  const updateRefillRow = (i: number, field: keyof RefillRow, value: string) => {
    setRefillRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const removeRefillRow = (i: number) => {
    setRefillRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  };

  const resetRefill = () => {
    setRefillRows([{ productId: "", quantity: "" }]);
  };

  const autoFillRecommended = () => {
    const newRows: RefillRow[] = standingStock
      .filter((ss) => ss.remainingStanding < ss.target)
      .map((ss) => ({
        productId: String(ss.productId),
        quantity: String(Math.max(0, ss.target - ss.remainingStanding)),
      }));

    if (newRows.length > 0) setRefillRows(newRows);
  };

  const saveRefill = async () => {
    const validRows = refillRows.filter((r) => r.productId && Number(r.quantity) > 0);

    for (const row of validRows) {
      const productId = Number(row.productId);
      const refillQty = Number(row.quantity);

      const ss = standingStock.find((s) => s.productId === productId);
      const product = products.find((p) => p.id === productId);

      if (!ss || !product) continue;

      const inventoryAvailable = Number(product.quantity || 0);
      const actualRefill = Math.min(refillQty, inventoryAvailable);

      if (actualRefill <= 0) continue;

const { error: standingUpsertError } = await supabase
  .from("standing_stock")
  .upsert(
    [
      {
        product_id: productId,
        target_quantity: ss.target,
        current_quantity: ss.remainingStanding + actualRefill,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "product_id" }
  );

if (standingUpsertError) {
  console.error("Upsert standing stock error:", standingUpsertError);
  alert(`Failed to save standing stock: ${standingUpsertError.message}`);
  return;
}

      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: inventoryAvailable - actualRefill,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (productError) {
        console.error("Update product inventory error:", productError);
        alert(`Standing refilled, but failed to reduce inventory: ${productError.message}`);
        return;
      }
    }

    resetRefill();
    setShowRefill(false);
    await loadAll();
  };

  const startEdit = (ss: StandingViewRow) => {
    setEditingId(ss.id);
    setEditForm({ target: String(ss.target) });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const row = standingStock.find((s) => s.id === editingId);
    if (!row) return;

    const newTarget = Number(editForm.target) || row.target;

    const { error: ssError } = await supabase
      .from("standing_stock")
      .upsert(
        [
          {
            product_id: row.productId,
            target_quantity: newTarget,
            current_quantity: row.remainingStanding,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "product_id" }
      );

    if (ssError) {
      console.error("Save target error:", ssError);
      alert(`Failed to save target in standing stock: ${ssError.message}`);
      return;
    }

    // Also update products table
    const { error: productError } = await supabase
      .from("products")
      .update({ standing_target: newTarget })
      .eq("id", row.productId);

    if (productError) {
      console.error("Update product target error:", productError);
      // Not returning here to still allow UI to refresh the standing stock side
    }

    setEditingId(null);
    setEditForm({ target: "" });
    await loadAll();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ target: "" });
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const refillSummary = useMemo(() => {
    return refillRows
      .filter((r) => r.productId && Number(r.quantity) > 0)
      .map((r) => {
        const ss = standingStock.find((s) => s.productId === Number(r.productId));
        const product = products.find((p) => p.id === Number(r.productId));
        const qty = Number(r.quantity);
        const invAvailable = Number(product?.quantity || 0);
        const actualRefill = Math.min(qty, invAvailable);

        return {
          productId: Number(r.productId),
          name: ss?.productName || product?.name || "",
          currentStanding: ss?.remainingStanding || 0,
          target: ss?.target || 0,
          invAvailable,
          refillQty: qty,
          resultStanding: (ss?.remainingStanding || 0) + actualRefill,
          resultInventory: invAvailable - actualRefill,
          shortage: qty > invAvailable,
        };
      });
  }, [refillRows, standingStock, products]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="module-header">
          <h1 className="module-title">Standing Stock / Fridge</h1>
          <p className="module-subtitle">
            Daily selling stock · Refilled from inventory · Supports negative standing
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <PrintButton />
          <Button size="sm" className="gap-1.5" onClick={() => setShowRefill(!showRefill)}>
            <RefreshCw className="w-4 h-4" />
            Bulk Refill
          </Button>
        </div>
      </div>



      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Total Products</p>
          <p className="text-xl font-bold font-heading mt-1">{standingStock.length}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Need Refill</p>
          <p className="text-xl font-bold font-heading mt-1 text-warning">{needRefill}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Low Standing</p>
          <p className="text-xl font-bold font-heading mt-1 text-warning">{lowCount}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Negative Standing</p>
          <p className="text-xl font-bold font-heading mt-1 text-destructive">
            {negativeCount}
          </p>
        </div>
      </div>

      {showRefill && (
        <div className="kpi-card space-y-4 border-2 border-primary/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-heading flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Bulk Refill from Inventory
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={autoFillRecommended}>
                Auto Fill Recommended
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={resetRefill}>
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Current Standing</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Inventory Available</TableHead>
                  <TableHead className="text-right">Recommended</TableHead>
                  <TableHead className="w-28">Refill Qty</TableHead>
                  <TableHead className="text-right">Result Standing</TableHead>
                  <TableHead className="text-right">Result Inventory</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refillRows.map((row, i) => {
                  const ss = standingStock.find((s) => s.productId === Number(row.productId));
                  const product = products.find((p) => p.id === Number(row.productId));
                  const qty = Number(row.quantity || 0);
                  const invAvailable = Number(product?.quantity || 0);
                  const recommended = ss ? Math.max(0, ss.target - ss.remainingStanding) : 0;
                  const actualRefill = Math.min(qty, invAvailable);
                  const resultStanding = (ss?.remainingStanding || 0) + actualRefill;
                  const resultInventory = invAvailable - actualRefill;
                  const isShort = qty > invAvailable && qty > 0;

                  return (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <select
                          value={row.productId}
                          onChange={(e) => updateRefillRow(i, "productId", e.target.value)}
                          className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-sm"
                        >
                          <option value="">Select product</option>
                          {standingStock.map((s) => (
                            <option key={s.productId} value={String(s.productId)}>
                              {s.productName} (Inv: {s.inventoryQuantity})
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium ${
                          (ss?.remainingStanding || 0) < 0 ? "text-destructive" : ""
                        }`}
                      >
                        {ss ? ss.remainingStanding : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">{ss?.target || "—"}</TableCell>
                      <TableCell className="text-right text-sm">{row.productId ? invAvailable : "—"}</TableCell>
                      <TableCell className="text-right text-sm text-primary font-medium">
                        {row.productId ? recommended : "—"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={row.quantity}
                          onChange={(e) => updateRefillRow(i, "quantity", e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-success">
                        {row.productId && qty > 0 ? resultStanding : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium ${
                          isShort ? "text-destructive" : ""
                        }`}
                      >
                        {row.productId && qty > 0 ? resultInventory : "—"}
                        {isShort && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeRefillRow(i)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={addRefillRow}>
              <Plus className="w-3 h-3" />
              Add Row
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRefill(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={saveRefill}
                disabled={!refillRows.some((r) => r.productId && Number(r.quantity) > 0)}
              >
                <Save className="w-3 h-3" />
                Save Refill
              </Button>
              <PrintButton />
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Standing Stock</TabsTrigger>
          <TabsTrigger value="calendar">Calendar History</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <div className="kpi-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Fridge Target</TableHead>
                  <TableHead className="text-right">Store Qty</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Refill Needed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading standing stock...
                    </TableCell>
                  </TableRow>
                ) : standingStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No standing stock rows found.
                    </TableCell>
                  </TableRow>
                ) : (
                  standingStock.map((ss) => {
                    const refillNeeded = Math.max(0, ss.target - ss.remainingStanding);
                    const inventoryShort = ss.inventoryQuantity < refillNeeded;
                    const isEditing = editingId === ss.id;

                    if (isEditing) {
                      return (
                        <TableRow key={ss.id} className="bg-primary/5">
                          <TableCell className="font-medium">{ss.productName}</TableCell>
                           <TableCell>
                            <Input
                              type="number"
                              className="h-8 w-20 ml-auto"
                              value={editForm.target}
                              onChange={(e) => setEditForm({ target: e.target.value })}
                            />
                          </TableCell>
                          <TableCell className="text-right">{ss.inventoryQuantity}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{ss.remainingStanding + ss.inventoryQuantity}</TableCell>
                          <TableCell className="text-right">
                            {refillNeeded > 0 ? refillNeeded : "—"}
                          </TableCell>
                          <TableCell>—</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={saveEdit}>
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={cancelEdit}
                              >
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <TableRow key={ss.id}>
                        <TableCell className="font-medium">{ss.productName}</TableCell>
                        <TableCell className="text-right">{ss.target}</TableCell>
                        <TableCell
                          className={`text-right ${
                            inventoryShort ? "text-destructive font-medium" : ""
                          }`}
                        >
                          {ss.inventoryQuantity}
                          {inventoryShort && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {ss.remainingStanding + ss.inventoryQuantity}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            refillNeeded > 0 ? "font-medium text-warning" : ""
                          }`}
                        >
                          {refillNeeded > 0 ? refillNeeded : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`status-badge ${
                              ss.status === "negative"
                                ? "status-danger"
                                : ss.status === "low"
                                ? "status-warning"
                                : "status-success"
                            }`}
                          >
                            {ss.status === "negative"
                              ? "Negative"
                              : ss.status === "low"
                              ? "Low"
                              : "Normal"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => startEdit(ss)}
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarHistory
            data={standingStock}
            dateKey="date"
            title="Standing Stock Calendar"
            renderDay={(items: StandingViewRow[]) => (
              <div className="space-y-2">
                {items.map((ss) => (
                  <div key={ss.id} className="bg-muted/50 rounded-lg p-2 text-sm">
                    <p className="font-medium">{ss.productName}</p>
                    <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground mt-1">
                      <span>Open: {ss.openingStanding}</span>
                      <span>Sold: {ss.quantitySold}</span>
                      <span className={ss.remainingStanding < 0 ? "text-destructive" : ""}>
                        Remain: {ss.remainingStanding}
                      </span>
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