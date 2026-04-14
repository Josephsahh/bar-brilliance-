import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Beer,
  Edit2,
  Save,
  CalendarDays,
  TrendingUp,
  Package,
  GlassWater,
  ShoppingCart,
  BarChart3,
  RotateCcw,
  Trash2,
  Plus,
} from "lucide-react";
import CalendarHistory from "@/components/CalendarHistory";
import PrintButton from "@/components/PrintButton";

const GLASSES_PER_BERMEL = 125;

type DraftProductRow = {
  id: number;
  code: string | null;
  name: string;
  category: string;
  unit: string | null;
  cost_price: number | null;
  selling_price: number | null;
  quantity: number | null;
  reorder_level: number | null;
  standing_target: number | null;
  glass_count: number | null;
  remaining_draft_glasses: number | null;
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DraftSaleRow = {
  id: number;
  draft_product_id: number;
  sale_date: string;
  glasses_sold: number | null;
  extra_glasses_sold: number | null;
  total_amount: number | null;
  total_cost: number | null;
  total_profit: number | null;
  cashier: string | null;
  notes: string | null;
  created_at: string | null;
};

type DraftPurchaseRow = {
  id: number;
  draft_product_id: number;
  purchase_date: string;
  bermels: number | null;
  cost_per_bermel: number | null;
  total_amount: number | null;
  supplier: string | null;
  notes: string | null;
  created_at: string | null;
};

type DraftReportSnapshot = {
  id: number;
  report_date: string;
  report_type: string;
  date_from: string | null;
  date_to: string | null;
  bermels_purchased: number | null;
  bermels_used: number | null;
  glasses_sold: number | null;
  extra_glasses_sold: number | null;
  revenue: number | null;
  purchase_cost: number | null;
  sales_cost: number | null;
  profit: number | null;
  notes: string | null;
  created_at: string | null;
};

type DraftSale = {
  id: string;
  date: string;
  productId: number;
  productName: string;
  glassesSold: number;
  extraGlassesSold: number;
  pricePerGlass: number;
  total: number;
  cost: number;
  profit: number;
  cashier: string;
  notes: string;
  createdAt: string;
  isExpense?: boolean;
  expenseAmount?: number;
};

type DraftPurchase = {
  id: string;
  date: string;
  productId: number;
  productName: string;
  bermels: number;
  costPerBermel: number;
  totalAmount: number;
  supplier: string;
  notes: string;
  createdAt: string;
};

export default function DraftPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<DraftProductRow[]>([]);
  const [draftSales, setDraftSales] = useState<DraftSale[]>([]);
  const [draftPurchases, setDraftPurchases] = useState<DraftPurchase[]>([]);
  const [savedReports, setSavedReports] = useState<DraftReportSnapshot[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editProductId, setEditProductId] = useState('');
  const [editForm, setEditForm] = useState({ name: '', costPrice: '', sellingPrice: '', glassCount: '', quantity: '', status: 'active' as 'active' | 'inactive' });
  const [activeTab, setActiveTab] = useState('stock');

  // Add Draft Type dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', costPrice: '', sellingPrice: '', glassCount: '125', bermels: '', notes: '' });

  // Edit/Delete dialogs for sales and purchases
  const [saleEditOpen, setSaleEditOpen] = useState(false);
  const [saleDeleteOpen, setSaleDeleteOpen] = useState(false);
  const [editSaleId, setEditSaleId] = useState('');
  const [deleteSaleId, setDeleteSaleId] = useState('');
  const [editSaleForm, setEditSaleForm] = useState({
    saleDate: '',
    productId: '',
    glassesSold: '',
    extraGlassesSold: '',
    cashier: '',
    notes: '',
  });

  const [purchaseEditOpen, setPurchaseEditOpen] = useState(false);
  const [purchaseDeleteOpen, setPurchaseDeleteOpen] = useState(false);
  const [editPurchaseId, setEditPurchaseId] = useState('');
  const [deletePurchaseId, setDeletePurchaseId] = useState('');
  const [editPurchaseForm, setEditPurchaseForm] = useState({
    purchaseDate: '',
    productId: '',
    bermels: '',
    costPerBermel: '',
    supplier: '',
    notes: '',
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState('');

  const drafts = products.filter(p => p.category?.toLowerCase() === 'draft' && (p.is_active ?? true));

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().split('T')[0];

  const [trackingForm, setTrackingForm] = useState({ productId: '', normalGlasses: '', extraGlasses: '', date: defaultDate, cashier: 'Admin', notes: '' });
  const [purchaseForm, setPurchaseForm] = useState({ productId: '', bermels: '', costPerBermel: '', supplier: '', date: defaultDate, notes: '' });
  const [reportFilter, setReportFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'custom'>('all');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  const loadAll = async () => {
    setLoading(true);

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select(
        "id, code, name, category, unit, cost_price, selling_price, quantity, reorder_level, standing_target, glass_count, remaining_draft_glasses, is_active, created_at, updated_at"
      )
      .eq("category", "Draft")
      .order("id", { ascending: true });

    if (productError) {
      console.error("Load draft products error:", productError);
      alert(`Failed to load draft products: ${productError.message}`);
      setLoading(false);
      return;
    }

    const freshProducts = (productData || []) as DraftProductRow[];
    setProducts(freshProducts);

    const [salesRes, purchasesRes, reportsRes, expensesRes] = await Promise.all([
      supabase
        .from("draft_sales")
        .select(`
          id,
          draft_product_id,
          sale_date,
          glasses_sold,
          extra_glasses_sold,
          total_amount,
          total_cost,
          total_profit,
          cashier,
          notes,
          created_at
        `)
        .order("sale_date", { ascending: false })
        .order("id", { ascending: false }),

      supabase
        .from("draft_purchases")
        .select(`
          id,
          draft_product_id,
          purchase_date,
          bermels,
          cost_per_bermel,
          total_amount,
          supplier,
          notes,
          created_at
        `)
        .order("purchase_date", { ascending: false })
        .order("id", { ascending: false }),

      supabase
        .from("draft_report_snapshots")
        .select("*")
        .order("report_date", { ascending: false })
        .order("id", { ascending: false }),
      
      supabase
        .from("expenses")
        .select("*")
        .eq("expense_kind", "drink")
        .order("expense_date", { ascending: false })
        .order("id", { ascending: false })
    ]);

    if (salesRes.error) {
      console.error("Load draft sales error:", salesRes.error);
      alert(`Failed to load draft sales: ${salesRes.error.message}`);
      setLoading(false);
      return;
    }

    if (purchasesRes.error) {
      console.error("Load draft purchases error:", purchasesRes.error);
      alert(`Failed to load draft purchases: ${purchasesRes.error.message}`);
      setLoading(false);
      return;
    }

    if (reportsRes.error) {
      console.error("Load draft reports error:", reportsRes.error);
    }

    const mappedSales: DraftSale[] = ((salesRes.data || []) as DraftSaleRow[]).map((s) => {
      const product = freshProducts.find((p) => p.id === s.draft_product_id);

      return {
        id: String(s.id),
        date: s.sale_date,
        productId: s.draft_product_id,
        productName: product?.name || "",
        glassesSold: Number(s.glasses_sold || 0),
        extraGlassesSold: Number(s.extra_glasses_sold || 0),
        pricePerGlass: Number(product?.selling_price || 0),
        total: Number(s.total_amount || 0),
        cost: Number(s.total_cost || 0),
        profit: Number(s.total_profit || 0),
        cashier: s.cashier || "",
        notes: s.notes || "",
        createdAt: s.created_at || "",
      };
    });
    
    const mappedPurchases: DraftPurchase[] = ((purchasesRes.data || []) as DraftPurchaseRow[]).map((p) => {
      const product = freshProducts.find((x) => x.id === p.draft_product_id);

      return {
        id: String(p.id),
        date: p.purchase_date,
        productId: p.draft_product_id,
        productName: product?.name || "",
        bermels: Number(p.bermels || 0),
        costPerBermel: Number(p.cost_per_bermel || 0),
        totalAmount: Number(p.total_amount || 0),
        supplier: p.supplier || "",
        notes: p.notes || "",
        createdAt: p.created_at || "",
      };
    });

    const expenseData = expensesRes?.data || [];
    const draftExpenses = expenseData.filter((e: any) => {
       const p = freshProducts.find((x) => x.id === e.product_id);
       return p && p.category?.toLowerCase() === 'draft';
    });
    
    const mappedExpenses: DraftSale[] = draftExpenses.map((e: any) => {
       const p = freshProducts.find((x) => x.id === e.product_id);
       return {
         id: `exp-${e.id}`,
         date: e.expense_date,
         productId: e.product_id,
         productName: p?.name || "",
         glassesSold: Number(e.quantity || 0),
         extraGlassesSold: 0,
         pricePerGlass: 0,
         total: 0, 
         cost: 0, 
         profit: 0,
         cashier: e.approved_by || 'Admin',
         notes: `[Expense] ${e.title || ''} - ${e.notes || ''}`.trim(),
         createdAt: e.created_at || "",
         isExpense: true,
         expenseAmount: Number(e.amount || 0)
       };
    });

    setDraftSales([...mappedSales, ...mappedExpenses].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setDraftPurchases(mappedPurchases);
    setSavedReports((reportsRes.data || []) as DraftReportSnapshot[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const getBermelStatus = (product: DraftProductRow) => {
    const glassesPerBermel = Number(product.glass_count || GLASSES_PER_BERMEL);

    const productPurchases = draftPurchases.filter((p) => p.productId === product.id);
    const totalBermelsPurchased = productPurchases.reduce((sum, p) => sum + p.bermels, 0);

    const productSales = draftSales.filter((s) => s.productId === product.id);
    const totalNormalGlassesSold = productSales.reduce((s, d) => s + d.glassesSold, 0);
    const totalExtraGlassesSold = productSales.reduce((s, d) => s + d.extraGlassesSold, 0);

    const fullBermelsRemaining = Number(product.quantity || 0);
    const remainingInOpenBermel = Number(product.remaining_draft_glasses || 0);
    const isOpenBermel = remainingInOpenBermel > 0;

    const totalRemainingGlasses = (fullBermelsRemaining * glassesPerBermel) + remainingInOpenBermel;

    const sellPricePerGlass = Number(product.selling_price || 0);
    const costPerBermel = Number(product.cost_price || 0);
    const costPerGlass = glassesPerBermel > 0 ? costPerBermel / glassesPerBermel : 0;

    const totalRevenue = productSales.reduce((s, d) => s + d.total, 0);
    const totalCost = productSales.reduce((s, d) => s + d.cost, 0);
    const totalProfit = productSales.reduce((s, d) => s + d.profit, 0);

    const fullBermelsUsed = Math.floor(totalNormalGlassesSold / glassesPerBermel);
    const glassesIntoCurrentBermel = totalNormalGlassesSold % glassesPerBermel;

    return {
      glassesPerBermel,
      totalBermelsPurchased,
      totalAvailableGlasses: totalRemainingGlasses + totalNormalGlassesSold, // Just a backwards-calc reference
      totalNormalGlassesSold,
      totalExtraGlassesSold,
      fullBermelsUsed,
      glassesIntoCurrentBermel,
      remainingInOpenBermel,
      isOpenBermel,
      fullBermelsRemaining,
      totalRemainingGlasses,
      totalRevenue,
      totalCost,
      totalProfit,
      costPerGlass,
      expectedStock: fullBermelsRemaining,
    };
  };

  // Compute overall KPI from all drafts
  const overallKPI = useMemo(() => {
    let totalBermelsLeft = 0;
    let totalNormal = 0;
    let totalExtra = 0;
    let totalRev = 0;
    let totalProfit = 0;
    drafts.forEach(d => {
      const s = getBermelStatus(d);
      totalBermelsLeft += s.fullBermelsRemaining + (s.isOpenBermel ? 1 : 0);
      totalNormal += s.totalNormalGlassesSold;
      totalExtra += s.totalExtraGlassesSold;
      totalRev += s.totalRevenue;
      totalProfit += s.totalProfit;
    });
    return { totalBermelsLeft, totalNormal, totalExtra, totalRev, totalProfit };
  }, [drafts, draftSales, draftPurchases]);

  const handleTrackingSave = async () => {
    const product = drafts.find(p => p.id === Number(trackingForm.productId));
    if (!product || !trackingForm.normalGlasses) return;
    const normalGlasses = Number(trackingForm.normalGlasses);
    const extraGlasses = Number(trackingForm.extraGlasses || 0);
    if (normalGlasses <= 0 && extraGlasses <= 0) return;
    const glassesPerBermel = Number(product.glass_count || GLASSES_PER_BERMEL);
    const costPerGlass = Number(product.cost_price || 0) / glassesPerBermel;
    const totalGlasses = normalGlasses + extraGlasses;
    const totalAmount = totalGlasses * Number(product.selling_price || 0);
    const totalCost = normalGlasses * costPerGlass;
    const totalProfit = totalAmount - totalCost;

    // Save to Supabase
    const { error: saleError } = await supabase
      .from("draft_sales")
      .insert({
        draft_product_id: Number(product.id),
        sale_date: trackingForm.date,
        glasses_sold: normalGlasses,
        extra_glasses_sold: extraGlasses,
        total_amount: totalAmount,
        total_cost: totalCost,
        total_profit: totalProfit,
        cashier: trackingForm.cashier,
        notes: trackingForm.notes,
      });

    if (saleError) {
      console.error("Save draft sale error:", saleError);
      alert(`Failed to save draft sale: ${saleError.message}`);
      return;
    }

    setTrackingForm(f => ({ ...f, normalGlasses: '', extraGlasses: '', notes: '' }));
    await loadAll();
  };


  const handlePurchaseSave = async () => {
    const product = drafts.find(p => p.id === Number(purchaseForm.productId));
    if (!product || !purchaseForm.bermels || !purchaseForm.costPerBermel) return;
    const bermels = Number(purchaseForm.bermels);
    const costPerBermel = Number(purchaseForm.costPerBermel);
    const totalAmount = bermels * costPerBermel;
    if (bermels <= 0) return;

    // Save to Supabase
    const { error: purchaseError } = await supabase
      .from("draft_purchases")
      .insert({
        draft_product_id: Number(product.id),
        purchase_date: purchaseForm.date,
        bermels,
        cost_per_bermel: costPerBermel,
        total_amount: totalAmount,
        supplier: purchaseForm.supplier,
        notes: purchaseForm.notes,
      });

    if (purchaseError) {
      console.error("Save draft purchase error:", purchaseError);
      alert(`Failed to save draft purchase: ${purchaseError.message}`);
      return;
    }

    // Update product quantity
    const { error: productError } = await supabase
      .from("products")
      .update({
        quantity: (Number(product.quantity || 0) + bermels),
        cost_price: costPerBermel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (productError) {
      console.error("Update product quantity error:", productError);
      alert(`Purchase saved, but failed to update product quantity: ${productError.message}`);
    }

    setPurchaseForm(f => ({ ...f, bermels: '', costPerBermel: '', supplier: '', notes: '' }));
    await loadAll();
  };


  // Edit draft type (name + pricing)
  const openEdit = (productId: string) => {
    const p = products.find(d => d.id === Number(productId));
    if (!p) return;
    setEditProductId(productId);
    setEditForm({
      name: p.name,
      costPrice: String(p.cost_price || 0),
      sellingPrice: String(p.selling_price || 0),
      glassCount: String(p.glass_count || GLASSES_PER_BERMEL),
      quantity: String(p.quantity || 0),
      status: (p.is_active ?? true) ? 'active' : 'inactive'
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    const { error: editError } = await supabase
      .from("products")
      .update({
        name: editForm.name,
        cost_price: Number(editForm.costPrice),
        selling_price: Number(editForm.sellingPrice),
        glass_count: Number(editForm.glassCount),
        quantity: Number(editForm.quantity),
        is_active: editForm.status === 'active',
        updated_at: new Date().toISOString(),
      })
      .eq("id", Number(editProductId));

    if (editError) {
      console.error("Edit draft product error:", editError);
      alert(`Failed to update draft product: ${editError.message}`);
      return;
    }

    setEditOpen(false);
    await loadAll();
  };

  // Delete draft product
  const openDeleteConfirm = (productId: string) => {
    setDeleteProductId(productId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteDraft = async () => {
    const productId = Number(deleteProductId);

    // Delete related sales and purchases first
    const { error: salesError } = await supabase
      .from("draft_sales")
      .delete()
      .eq("draft_product_id", productId);

    if (salesError) {
      console.error("Delete draft sales error:", salesError);
      alert(`Failed to delete draft sales: ${salesError.message}`);
      return;
    }

    const { error: purchasesError } = await supabase
      .from("draft_purchases")
      .delete()
      .eq("draft_product_id", productId);

    if (purchasesError) {
      console.error("Delete draft purchases error:", purchasesError);
      alert(`Failed to delete draft purchases: ${purchasesError.message}`);
      return;
    }

    // Delete the product
    const { error: productError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (productError) {
      console.error("Delete draft product error:", productError);
      alert(`Failed to delete draft product: ${productError.message}`);
      return;
    }

    setDeleteConfirmOpen(false);
    await loadAll();
  };

  // Add new draft type
  const handleAddDraftType = async () => {
    if (!addForm.name || !addForm.costPrice || !addForm.sellingPrice) return;

    // Generate next product code
    const draftCodes = products
      .filter((c) => c.code?.startsWith("DRFT-"))
      .map((c) => Number(c.code?.replace("DRFT-", "")))
      .filter((n) => !Number.isNaN(n));
    const next = draftCodes.length ? Math.max(...draftCodes) + 1 : 1;
    const code = `DRFT-${String(next).padStart(3, "0")}`;

    const initialBermels = Number(addForm.bermels || 0);

    // Save to Supabase
    const { error: addError } = await supabase
      .from("products")
      .insert({
        code,
        name: addForm.name,
        category: 'Draft',
        unit: 'Bermel',
        cost_price: Number(addForm.costPrice),
        selling_price: Number(addForm.sellingPrice),
        quantity: initialBermels,
        reorder_level: 2,
        standing_target: 2,
        glass_count: Number(addForm.glassCount || GLASSES_PER_BERMEL),
        remaining_draft_glasses: initialBermels * Number(addForm.glassCount || GLASSES_PER_BERMEL),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (addError) {
      console.error("Add draft product error:", addError);
      alert(`Failed to add draft product: ${addError.message}`);
      return;
    }

    setAddForm({ name: '', costPrice: '', sellingPrice: '', glassCount: '125', bermels: '', notes: '' });
    setAddOpen(false);
    await loadAll();
  };

  // Add edit/delete handlers for sales and purchases
  const openEditSale = (sale: DraftSale) => {
    setEditSaleId(sale.id);
    setEditSaleForm({
      saleDate: sale.date,
      productId: String(sale.productId),
      glassesSold: String(sale.glassesSold),
      extraGlassesSold: String(sale.extraGlassesSold),
      cashier: sale.cashier,
      notes: sale.notes,
    });
    setSaleEditOpen(true);
  };

  const handleEditSaleSave = async () => {
    const product = products.find(p => p.id === Number(editSaleForm.productId));
    if (!product) {
      alert("Please select a valid draft product.");
      return;
    }

    const glassesSold = Number(editSaleForm.glassesSold);
    const extraGlassesSold = Number(editSaleForm.extraGlassesSold);
    const glassesPerBermel = Number(product.glass_count || GLASSES_PER_BERMEL);
    const costPerGlass = Number(product.cost_price || 0) / glassesPerBermel;
    const totalGlasses = glassesSold + extraGlassesSold;
    const totalAmount = totalGlasses * Number(product.selling_price || 0);
    const totalCost = totalGlasses * costPerGlass;
    const totalProfit = totalAmount - totalCost;

    const originalSale = draftSales.find(s => s.id === editSaleId);
    const originalGlasses = originalSale?.glassesSold || 0;
    const glassesDifference = glassesSold - originalGlasses;

    const { error: saleError } = await supabase
      .from("draft_sales")
      .update({
        draft_product_id: Number(editSaleForm.productId),
        sale_date: editSaleForm.saleDate,
        glasses_sold: glassesSold,
        extra_glasses_sold: extraGlassesSold,
        total_amount: totalAmount,
        total_cost: totalCost,
        total_profit: totalProfit,
        cashier: editSaleForm.cashier,
        notes: editSaleForm.notes,
      })
      .eq("id", Number(editSaleId));

    if (saleError) {
      console.error("Edit draft sale error:", saleError);
      alert(`Failed to update draft sale: ${saleError.message}`);
      return;
    }

    if (glassesDifference !== 0) {
      let currentRemaining = Number(product.remaining_draft_glasses || 0);
      let currentBermels = Number(product.quantity || 0);

      // Revert old effect (add back originalGlasses)
      currentRemaining += originalGlasses;
      if (currentRemaining >= glassesPerBermel) {
        const freshBermels = Math.floor(currentRemaining / glassesPerBermel);
        currentBermels += freshBermels;
        currentRemaining = currentRemaining % glassesPerBermel;
      }

      // Apply new effect (deduct new glassesSold)
      let glassesToDeduct = glassesSold;
      if (glassesToDeduct <= currentRemaining) {
        currentRemaining -= glassesToDeduct;
      } else {
        glassesToDeduct -= currentRemaining;
        const bermelsNeeded = Math.ceil(glassesToDeduct / glassesPerBermel);
        currentBermels = Math.max(0, currentBermels - bermelsNeeded);
        currentRemaining = (bermelsNeeded * glassesPerBermel) - glassesToDeduct;
      }

      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: currentBermels,
          remaining_draft_glasses: currentRemaining,
          updated_at: new Date().toISOString()
        })
        .eq("id", product.id);

      if (productError) {
        console.error("Product update error:", productError);
        alert(`Sale updated, but failed to adjust stock: ${productError.message}`);
      }
    }

    setSaleEditOpen(false);
    await loadAll();
  };

  const openDeleteSaleConfirm = (saleId: string) => {
    setDeleteSaleId(saleId);
    setSaleDeleteOpen(true);
  };

  const handleDeleteSale = async () => {
    const sale = draftSales.find(s => s.id === deleteSaleId);
    if (!sale) return;

    const product = products.find(p => p.id === sale.productId);

    const { error: deleteError } = await supabase
      .from("draft_sales")
      .delete()
      .eq("id", Number(deleteSaleId));

    if (deleteError) {
      console.error("Delete draft sale error:", deleteError);
      alert(`Failed to delete draft sale: ${deleteError.message}`);
      return;
    }

    if (product) {
      let currentRemaining = Number(product.remaining_draft_glasses || 0);
      let currentBermels = Number(product.quantity || 0);
      const glassesPerBermel = Number(product.glass_count || GLASSES_PER_BERMEL);
      const originalGlasses = sale.glassesSold;

      currentRemaining += originalGlasses;
      if (currentRemaining >= glassesPerBermel) {
        const freshBermels = Math.floor(currentRemaining / glassesPerBermel);
        currentBermels += freshBermels;
        currentRemaining = currentRemaining % glassesPerBermel;
      }

      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: currentBermels,
          remaining_draft_glasses: currentRemaining,
          updated_at: new Date().toISOString()
        })
        .eq("id", product.id);

      if (productError) {
        console.error("Product stock restore error:", productError);
        alert(`Sale deleted, but failed to restore stock: ${productError.message}`);
      }
    }

    setSaleDeleteOpen(false);
    await loadAll();
  };

  const openEditPurchase = (purchase: DraftPurchase) => {
    setEditPurchaseId(purchase.id);
    setEditPurchaseForm({
      purchaseDate: purchase.date,
      productId: String(purchase.productId),
      bermels: String(purchase.bermels),
      costPerBermel: String(purchase.costPerBermel),
      supplier: purchase.supplier,
      notes: purchase.notes,
    });
    setPurchaseEditOpen(true);
  };

  const handleEditPurchaseSave = async () => {
    const product = products.find(p => p.id === Number(editPurchaseForm.productId));
    if (!product) {
      alert("Please select a valid draft product.");
      return;
    }

    const bermels = Number(editPurchaseForm.bermels);
    const costPerBermel = Number(editPurchaseForm.costPerBermel);
    const totalAmount = bermels * costPerBermel;

    // Get original purchase to calculate quantity difference
    const originalPurchase = draftPurchases.find(p => p.id === editPurchaseId);
    const originalBermels = originalPurchase?.bermels || 0;
    const bermelDifference = bermels - originalBermels;

    // Update the purchase
    const { error: purchaseError } = await supabase
      .from("draft_purchases")
      .update({
        draft_product_id: Number(editPurchaseForm.productId),
        purchase_date: editPurchaseForm.purchaseDate,
        bermels,
        cost_per_bermel: costPerBermel,
        total_amount: totalAmount,
        supplier: editPurchaseForm.supplier,
        notes: editPurchaseForm.notes,
      })
      .eq("id", Number(editPurchaseId));

    if (purchaseError) {
      console.error("Edit draft purchase error:", purchaseError);
      alert(`Failed to update draft purchase: ${purchaseError.message}`);
      return;
    }

    // Update product quantity if bermel count changed
    if (bermelDifference !== 0) {
      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: Math.max(0, Number(product.quantity || 0) + bermelDifference),
          cost_price: costPerBermel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(product.id));

      if (productError) {
        console.error("Product quantity update error:", productError);
        alert(`Purchase updated, but failed to update product quantity: ${productError.message}`);
        return;
      }
    }

    setPurchaseEditOpen(false);
    await loadAll();
  };

  const openDeletePurchaseConfirm = (purchaseId: string) => {
    setDeletePurchaseId(purchaseId);
    setPurchaseDeleteOpen(true);
  };

  const handleDeletePurchase = async () => {
    const purchase = draftPurchases.find(p => p.id === deletePurchaseId);
    if (!purchase) return;

    // Delete the purchase
    const { error: purchaseError } = await supabase
      .from("draft_purchases")
      .delete()
      .eq("id", Number(deletePurchaseId));

    if (purchaseError) {
      console.error("Delete draft purchase error:", purchaseError);
      alert(`Failed to delete draft purchase: ${purchaseError.message}`);
      return;
    }

    // Update product quantity
    const product = products.find(p => p.id === purchase.productId);
    if (product) {
      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: Math.max(0, Number(product.quantity || 0) - purchase.bermels),
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.productId);

      if (productError) {
        console.error("Product quantity update error:", productError);
        alert(`Purchase deleted, but failed to update product quantity: ${productError.message}`);
        return;
      }
    }

    setPurchaseDeleteOpen(false);
    await loadAll();
  };

  // Report filtering
  const getFilteredSales = () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    return draftSales.filter(sale => {
      if (reportFilter === 'all') return true;
      if (reportFilter === 'daily') return sale.date === today;
      if (reportFilter === 'weekly') { const d = new Date(sale.date); const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
      if (reportFilter === 'monthly') { const d = new Date(sale.date); const m = new Date(now); m.setMonth(m.getMonth() - 1); return d >= m; }
      if (reportFilter === 'custom' && reportDateFrom && reportDateTo) return sale.date >= reportDateFrom && sale.date <= reportDateTo;
      return true;
    });
  };
  const getFilteredPurchases = () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    return draftPurchases.filter(p => {
      if (reportFilter === 'all') return true;
      if (reportFilter === 'daily') return p.date === today;
      if (reportFilter === 'weekly') { const d = new Date(p.date); const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
      if (reportFilter === 'monthly') { const d = new Date(p.date); const m = new Date(now); m.setMonth(m.getMonth() - 1); return d >= m; }
      if (reportFilter === 'custom' && reportDateFrom && reportDateTo) return p.date >= reportDateFrom && p.date <= reportDateTo;
      return true;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="module-header flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="module-title">Draft Beer Management</h1>
          <p className="module-subtitle">Track bermels, daily glass sales, purchases, and running balance</p>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <Button onClick={() => setAddOpen(true)} className="gap-2 rounded-lg">
            <Plus className="w-4 h-4" /> Add Draft Type
          </Button>
        </div>
      </div>

      {/* KPI Cards — show REMAINING bermels, not purchased */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Bermels Remaining</p>
              <p className="text-2xl font-bold font-heading tracking-tight">{overallKPI.totalBermelsLeft}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10">
              <GlassWater className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Normal / Extra Glasses</p>
              <p className="text-2xl font-bold font-heading tracking-tight">{overallKPI.totalNormal} <span className="text-sm text-muted-foreground">+ {overallKPI.totalExtra}</span></p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <Beer className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold font-heading tracking-tight">ETB {overallKPI.totalRev.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Profit</p>
              <p className="text-2xl font-bold font-heading tracking-tight text-success">ETB {overallKPI.totalProfit.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="stock" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Draft Stock</TabsTrigger>
          <TabsTrigger value="daily" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Daily Tracking</TabsTrigger>
          <TabsTrigger value="purchase" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Purchase</TabsTrigger>
          <TabsTrigger value="calendar" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Calendar History</TabsTrigger>
          <TabsTrigger value="report" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Report</TabsTrigger>
        </TabsList>

        {/* ==================== DRAFT STOCK ==================== */}
        <TabsContent value="stock" className="mt-6">
          <div className="space-y-6">
            {drafts.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                <Beer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No draft types yet. Add your first draft type to get started.</p>
                <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Draft Type</Button>
              </div>
            )}
            {drafts.map(d => {
              const status = getBermelStatus(d);
              return (
                <div key={d.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Beer className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold font-heading">{d.name}</h3>
                        <p className="text-xs text-muted-foreground">{status.glassesPerBermel} glasses per bermel</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(String(d.id))} className="gap-1.5 rounded-lg">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteConfirm(String(d.id))} className="gap-1.5 rounded-lg text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                    <div className="px-6 py-3 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cost / Bermel</p>
                      <p className="text-lg font-bold font-heading mt-0.5">ETB {(d.cost_price || 0).toLocaleString()}</p>
                    </div>
                    <div className="px-6 py-3 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sell / Glass</p>
                      <p className="text-lg font-bold font-heading mt-0.5">ETB {(d.selling_price || 0).toLocaleString()}</p>
                    </div>
                    <div className="px-6 py-3 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Bermels (Purchased)</p>
                      <p className="text-lg font-bold font-heading mt-0.5">{status.totalBermelsPurchased}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                    <div className="bg-card px-5 py-4 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Full Bermels Used</p>
                      <p className="text-2xl font-bold font-heading text-destructive mt-1">{status.fullBermelsUsed}</p>
                    </div>
                    <div className="bg-card px-5 py-4 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Full Bermels Left</p>
                      <p className="text-2xl font-bold font-heading text-success mt-1">{status.fullBermelsRemaining}</p>
                    </div>
                    <div className="bg-card px-5 py-4 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Open Bermel</p>
                      <p className="text-2xl font-bold font-heading mt-1">
                        {status.isOpenBermel ? status.remainingInOpenBermel : '—'}
                      </p>
                      {status.isOpenBermel && <p className="text-[10px] text-muted-foreground">glasses left</p>}
                    </div>
                    <div className="bg-card px-5 py-4 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Glasses Left</p>
                      <p className={`text-2xl font-bold font-heading mt-1 ${status.totalRemainingGlasses < 50 ? 'text-warning' : 'text-success'}`}>
                        {status.totalRemainingGlasses}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-t border-border">
                    <div className="bg-card px-5 py-4 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Normal Sold</p>
                      <p className="text-lg font-bold font-heading">{status.totalNormalGlassesSold}</p>
                    </div>
                    <div className="bg-card px-5 py-3 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Extra Sold</p>
                      <p className="text-lg font-bold font-heading text-info">{status.totalExtraGlassesSold}</p>
                    </div>
                    <div className="bg-card px-5 py-3 text-center col-span-2 sm:col-span-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Revenue</p>
                      <p className="text-lg font-bold font-heading">ETB {status.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-card px-5 py-3 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Profit</p>
                      <p className="text-lg font-extrabold font-heading text-success">ETB {status.totalProfit.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Draft Type Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Edit Draft Type</DialogTitle></DialogHeader>
              <div className="grid gap-4 mt-4">
                <div><Label>Draft Name</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. St George Draft" /></div>
                <div><Label>Cost per Bermel (ETB)</Label><Input type="number" value={editForm.costPrice} onChange={e => setEditForm(f => ({ ...f, costPrice: e.target.value }))} /></div>
                <div><Label>Selling Price per Glass (ETB)</Label><Input type="number" value={editForm.sellingPrice} onChange={e => setEditForm(f => ({ ...f, sellingPrice: e.target.value }))} /></div>
                <div><Label>Glasses per Bermel</Label><Input type="number" value={editForm.glassCount} onChange={e => setEditForm(f => ({ ...f, glassCount: e.target.value }))} /></div>
                <div>
                  <Label>Current Bermels</Label>
                  <Input type="number" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Current stock" />
                  <p className="text-[10px] text-muted-foreground mt-1">Use this only to correct wrong stock values manually.</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v: 'active' | 'inactive') => setEditForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={handleEditSave}>Save Changes</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Draft Type Confirmation Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Delete Draft Type</DialogTitle></DialogHeader>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Are you sure you want to delete this draft type? This will also delete all associated sales and purchases. This action cannot be undone.</p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteDraft}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Sale Dialog */}
          <Dialog open={saleEditOpen} onOpenChange={setSaleEditOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Edit Draft Sale</DialogTitle></DialogHeader>
              <div className="grid gap-4 mt-4">
                <div><Label>Date</Label><Input type="date" value={editSaleForm.saleDate} onChange={e => setEditSaleForm(f => ({ ...f, saleDate: e.target.value }))} /></div>
                <div>
                  <Label>Draft Product</Label>
                  <Select value={editSaleForm.productId} onValueChange={v => setEditSaleForm(f => ({ ...f, productId: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {drafts.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Normal Glasses Sold</Label><Input type="number" value={editSaleForm.glassesSold} onChange={e => setEditSaleForm(f => ({ ...f, glassesSold: e.target.value }))} /></div>
                <div><Label>Extra Glasses Sold</Label><Input type="number" value={editSaleForm.extraGlassesSold} onChange={e => setEditSaleForm(f => ({ ...f, extraGlassesSold: e.target.value }))} /></div>
                <div><Label>Cashier</Label><Input value={editSaleForm.cashier} onChange={e => setEditSaleForm(f => ({ ...f, cashier: e.target.value }))} /></div>
                <div><Label>Notes</Label><Input value={editSaleForm.notes} onChange={e => setEditSaleForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setSaleEditOpen(false)}>Cancel</Button>
                <Button onClick={handleEditSaleSave}>Save Changes</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Sale Confirmation Dialog */}
          <Dialog open={saleDeleteOpen} onOpenChange={setSaleDeleteOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Delete Draft Sale</DialogTitle></DialogHeader>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Are you sure you want to delete this draft sale? This action cannot be undone.</p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setSaleDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteSale}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Purchase Dialog */}
          <Dialog open={purchaseEditOpen} onOpenChange={setPurchaseEditOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Edit Draft Purchase</DialogTitle></DialogHeader>
              <div className="grid gap-4 mt-4">
                <div><Label>Date</Label><Input type="date" value={editPurchaseForm.purchaseDate} onChange={e => setEditPurchaseForm(f => ({ ...f, purchaseDate: e.target.value }))} /></div>
                <div>
                  <Label>Draft Product</Label>
                  <Select value={editPurchaseForm.productId} onValueChange={v => setEditPurchaseForm(f => ({ ...f, productId: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {drafts.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Bermels Purchased</Label><Input type="number" value={editPurchaseForm.bermels} onChange={e => setEditPurchaseForm(f => ({ ...f, bermels: e.target.value }))} /></div>
                <div><Label>Cost per Bermel (ETB)</Label><Input type="number" value={editPurchaseForm.costPerBermel} onChange={e => setEditPurchaseForm(f => ({ ...f, costPerBermel: e.target.value }))} /></div>
                <div><Label>Supplier</Label><Input value={editPurchaseForm.supplier} onChange={e => setEditPurchaseForm(f => ({ ...f, supplier: e.target.value }))} /></div>
                <div><Label>Notes</Label><Input value={editPurchaseForm.notes} onChange={e => setEditPurchaseForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setPurchaseEditOpen(false)}>Cancel</Button>
                <Button onClick={handleEditPurchaseSave}>Save Changes</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Purchase Confirmation Dialog */}
          <Dialog open={purchaseDeleteOpen} onOpenChange={setPurchaseDeleteOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Delete Draft Purchase</DialogTitle></DialogHeader>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Are you sure you want to delete this draft purchase? This action cannot be undone.</p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setPurchaseDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeletePurchase}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ==================== DAILY TRACKING ==================== */}
        <TabsContent value="daily" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h3 className="text-base font-bold font-heading">Record Daily Glass Sales</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/40 rounded-lg px-3 py-2">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" /> Only Normal Sold Glasses deduct bermels. Extra glasses add revenue only.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Sale Date</Label><Input type="date" value={trackingForm.date} onChange={e => setTrackingForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div>
                  <Label>Draft Product</Label>
                  <Select value={trackingForm.productId} onValueChange={v => setTrackingForm(f => ({ ...f, productId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select draft" /></SelectTrigger>
                    <SelectContent>{drafts.map(d => (<SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Normal Sold Glasses</Label>
                  <Input type="number" min="0" value={trackingForm.normalGlasses} onChange={e => setTrackingForm(f => ({ ...f, normalGlasses: e.target.value }))} placeholder="e.g. 125" />
                  <p className="text-[10px] text-muted-foreground mt-1">Deducts from bermel stock</p>
                </div>
                <div>
                  <Label>Extra Sold Glasses</Label>
                  <Input type="number" min="0" value={trackingForm.extraGlasses} onChange={e => setTrackingForm(f => ({ ...f, extraGlasses: e.target.value }))} placeholder="e.g. 5" />
                  <p className="text-[10px] text-muted-foreground mt-1">Revenue only, no bermel deduction</p>
                </div>
                <div><Label>Cashier</Label><Input value={trackingForm.cashier} onChange={e => setTrackingForm(f => ({ ...f, cashier: e.target.value }))} /></div>
                <div><Label>Notes</Label><Input value={trackingForm.notes} onChange={e => setTrackingForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
              </div>

              {trackingForm.productId && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-1.5">
                  {(() => {
                    const product = drafts.find(p => p.id === Number(trackingForm.productId));
                    if (!product) return null;
                    const status = getBermelStatus(product);
                    const gpb = product.glass_count || GLASSES_PER_BERMEL;
                    const newNormal = Number(trackingForm.normalGlasses || 0);
                    const newExtra = Number(trackingForm.extraGlasses || 0);
                    const afterTotal = status.totalNormalGlassesSold + newNormal;
                    const afterFullUsed = Math.floor(afterTotal / gpb);
                    const afterOpenGlasses = afterTotal % gpb;
                    const afterOpenRemaining = afterOpenGlasses > 0 ? gpb - afterOpenGlasses : 0;
                    const newBermelsCompleted = afterFullUsed - status.fullBermelsUsed;
                    const newRevenue = (newNormal + newExtra) * (product.selling_price || 0);
                    return (
                      <>
                        <p className="text-muted-foreground"><strong className="text-foreground">Current:</strong> {status.totalRemainingGlasses} glasses remaining · {status.fullBermelsRemaining} full bermels{status.isOpenBermel ? ` + ${status.remainingInOpenBermel} in open` : ''}</p>
                        {(newNormal > 0 || newExtra > 0) && (
                          <>
                            <p className="text-primary font-medium">
                              <strong>After saving:</strong> {newNormal} normal + {newExtra} extra glasses
                              {newBermelsCompleted > 0 && ` · ${newBermelsCompleted} bermel(s) completed`}
                              {afterOpenGlasses > 0 ? ` · ${afterOpenRemaining} glasses left in open bermel` : ' · Bermel fully used'}
                            </p>
                            <p className="text-success font-medium">Revenue: ETB {newRevenue.toLocaleString()}</p>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setTrackingForm(f => ({ ...f, normalGlasses: '', extraGlasses: '', notes: '' }))} className="gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Reset
                </Button>
                <Button onClick={handleTrackingSave} disabled={!trackingForm.productId || !trackingForm.normalGlasses} className="gap-2 rounded-lg">
                  <Save className="w-4 h-4" /> Save Entry
                </Button>
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm h-fit space-y-5">
              <h3 className="text-base font-bold font-heading">Summary</h3>
              {drafts.map(d => {
                const status = getBermelStatus(d);
                return (
                  <div key={d.id} className="space-y-2 border-b border-border pb-4 last:border-0">
                    <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                      <Beer className="w-3.5 h-3.5 text-primary" /> {d.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/40 rounded-lg p-2"><p className="text-muted-foreground">Full Bermels Used</p><p className="font-bold">{status.fullBermelsUsed}</p></div>
                      <div className="bg-muted/40 rounded-lg p-2"><p className="text-muted-foreground">Full Bermels Left</p><p className="font-bold text-success">{status.fullBermelsRemaining}</p></div>
                      <div className="bg-muted/40 rounded-lg p-2"><p className="text-muted-foreground">Open Bermel</p><p className="font-bold">{status.isOpenBermel ? `${status.remainingInOpenBermel}g left` : '—'}</p></div>
                      <div className="bg-muted/40 rounded-lg p-2"><p className="text-muted-foreground">Total Glasses Left</p><p className="font-bold">{status.totalRemainingGlasses}</p></div>
                      <div className="bg-muted/40 rounded-lg p-2"><p className="text-muted-foreground">Revenue</p><p className="font-bold">ETB {status.totalRevenue.toLocaleString()}</p></div>
                      <div className="bg-muted/40 rounded-lg p-2"><p className="text-muted-foreground">Cost</p><p className="font-bold">ETB {status.totalCost.toFixed(0)}</p></div>
                      <div className="col-span-2 bg-success/10 rounded-lg p-2"><p className="text-muted-foreground">Profit</p><p className="font-bold text-success text-lg">ETB {status.totalProfit.toFixed(0)}</p></div>
                    </div>
                  </div>
                );
              })}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent Sales</h4>
                {draftSales.slice().reverse().slice(0, 8).map(sale => (
                  <div key={sale.id} className={`flex items-center justify-between py-1.5 border-b border-border last:border-0 text-xs ${sale.isExpense ? "bg-destructive/5 px-2 rounded -mx-2" : ""}`}>
                    <div>
                      <span className="font-medium">
                        {sale.productName}
                        {sale.isExpense && <span className="ml-2 text-[9px] font-bold text-destructive uppercase tracking-wider bg-destructive/10 px-1 rounded">Expense</span>}
                      </span>
                      <span className="text-muted-foreground ml-2">{sale.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       {sale.isExpense ? (
                          <span className="text-destructive font-semibold">Loss: ETB {sale.expenseAmount?.toLocaleString() || 0}</span>
                       ) : (
                          <span className="font-bold">{sale.glassesSold}g{(sale.extraGlassesSold || 0) > 0 ? ` +${sale.extraGlassesSold}e` : ''}</span>
                       )}
                       {!sale.isExpense && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteSale(sale.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ==================== PURCHASE ==================== */}
        <TabsContent value="purchase" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h3 className="text-base font-bold font-heading">Record Draft Purchase</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/40 rounded-lg px-3 py-2">
                <ShoppingCart className="w-3.5 h-3.5 shrink-0" /> Purchased bermels increase your total draft stock for the selected draft type only.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Purchase Date</Label><Input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div>
                  <Label>Draft Product</Label>
                  <Select value={purchaseForm.productId} onValueChange={v => {
                    const prod = drafts.find(d => d.id === v);
                    setPurchaseForm(f => ({ ...f, productId: v, costPerBermel: prod ? String(prod.costPrice) : '' }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select draft" /></SelectTrigger>
                    <SelectContent>{drafts.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Bermels Purchased</Label><Input type="number" min="1" value={purchaseForm.bermels} onChange={e => setPurchaseForm(f => ({ ...f, bermels: e.target.value }))} placeholder="e.g. 5" /></div>
                <div><Label>Cost Per Bermel (ETB)</Label><Input type="number" value={purchaseForm.costPerBermel} onChange={e => setPurchaseForm(f => ({ ...f, costPerBermel: e.target.value }))} /></div>
                <div><Label>Supplier</Label><Input value={purchaseForm.supplier} onChange={e => setPurchaseForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" /></div>
                <div><Label>Notes</Label><Input value={purchaseForm.notes} onChange={e => setPurchaseForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
              </div>

              {purchaseForm.bermels && purchaseForm.costPerBermel && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <p><strong>Total Cost:</strong> ETB {(Number(purchaseForm.bermels) * Number(purchaseForm.costPerBermel)).toLocaleString()}</p>
                  <p><strong>Total Glasses Added:</strong> {Number(purchaseForm.bermels) * GLASSES_PER_BERMEL}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPurchaseForm(f => ({ ...f, bermels: '', costPerBermel: '', supplier: '', notes: '' }))} className="gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Reset
                </Button>
                <Button onClick={handlePurchaseSave} disabled={!purchaseForm.productId || !purchaseForm.bermels || !purchaseForm.costPerBermel} className="gap-2 rounded-lg">
                  <Save className="w-4 h-4" /> Save Purchase
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm h-fit space-y-4">
              <h3 className="text-base font-bold font-heading">Purchase History</h3>
              {draftPurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No draft purchases yet</p>
              ) : (
                draftPurchases.slice().reverse().map(dp => (
                  <div key={dp.id} className="border-b border-border pb-3 last:border-0 text-xs space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{dp.productName}</p>
                        <p className="text-muted-foreground">{dp.date} · {dp.supplier || 'No supplier'}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeletePurchase(dp.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex gap-3 text-muted-foreground">
                      <span>{dp.bermels} bermels</span>
                      <span>ETB {dp.costPerBermel}/bermel</span>
                      <span className="font-bold text-foreground">ETB {dp.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* ==================== CALENDAR HISTORY ==================== */}
        <TabsContent value="calendar" className="mt-6">
          <CalendarHistory
            data={[
              ...draftSales.map(s => ({ ...s, _type: 'sale' as const })),
              ...draftPurchases.map(p => ({ ...p, _type: 'purchase' as const })),
            ]}
            dateKey="date"
            title="Draft Calendar History"
            renderDay={(items, date) => {
              const sales = items.filter(i => i._type === 'sale') as (DraftSale & { _type: 'sale' })[];
              const purchases = items.filter(i => i._type === 'purchase') as (DraftPurchase & { _type: 'purchase' })[];
              const totalNormal = sales.reduce((s, d) => s + d.glassesSold, 0);
              const totalExtra = sales.reduce((s, d) => s + (d.extraGlassesSold || 0), 0);
              const totalRev = sales.reduce((s, d) => s + d.total, 0);
              const bermelsDeducted = Math.floor(totalNormal / GLASSES_PER_BERMEL);
              const totalPurchasedBermels = purchases.reduce((s, p) => s + p.bermels, 0);
              const totalPurchaseCost = purchases.reduce((s, p) => s + p.totalAmount, 0);

              return (
                <div className="space-y-3">
                  {sales.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Sales</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/50 rounded-lg p-2"><p className="text-xs text-muted-foreground">Normal Glasses</p><p className="text-sm font-bold">{totalNormal}</p></div>
                        <div className="bg-muted/50 rounded-lg p-2"><p className="text-xs text-muted-foreground">Extra Glasses</p><p className="text-sm font-bold text-info">{totalExtra}</p></div>
                        <div className="bg-muted/50 rounded-lg p-2"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-sm font-bold">ETB {totalRev.toLocaleString()}</p></div>
                        <div className="bg-muted/50 rounded-lg p-2"><p className="text-xs text-muted-foreground">Bermels Used</p><p className="text-sm font-bold text-destructive">{bermelsDeducted}</p></div>
                      </div>
                      {sales.map((s, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-2 text-xs mt-1">
                          <p className="font-medium">{s.productName}</p>
                          <p className="text-muted-foreground">{s.glassesSold} normal + {s.extraGlassesSold || 0} extra · ETB {s.total.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {purchases.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Purchases</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-success/10 rounded-lg p-2"><p className="text-xs text-muted-foreground">Bermels Added</p><p className="text-sm font-bold text-success">{totalPurchasedBermels}</p></div>
                        <div className="bg-muted/50 rounded-lg p-2"><p className="text-xs text-muted-foreground">Cost</p><p className="text-sm font-bold">ETB {totalPurchaseCost.toLocaleString()}</p></div>
                      </div>
                      {purchases.map((p, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-2 text-xs mt-1">
                          <p className="font-medium">{p.productName}</p>
                          <p className="text-muted-foreground">{p.bermels} bermels · {p.supplier || 'N/A'} · ETB {p.totalAmount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }}
          />
        </TabsContent>

        {/* ==================== REPORT ==================== */}
        <TabsContent value="report" className="mt-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold font-heading mr-2">Filter:</p>
                {(['all', 'daily', 'weekly', 'monthly', 'custom'] as const).map(f => (
                  <Button key={f} variant={reportFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setReportFilter(f)} className="capitalize rounded-lg">
                    {f}
                  </Button>
                ))}
                {reportFilter === 'custom' && (
                  <div className="flex items-center gap-2 ml-2">
                    <Input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className="h-8 w-36" />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} className="h-8 w-36" />
                  </div>
                )}
              </div>
            </div>

            {(() => {
              const filteredSales = getFilteredSales();
              const filteredPurchases = getFilteredPurchases();
              const rNormal = filteredSales.reduce((s, d) => s + d.glassesSold, 0);
              const rExtra = filteredSales.reduce((s, d) => s + (d.extraGlassesSold || 0), 0);
              const rRevenue = filteredSales.reduce((s, d) => s + d.total, 0);
              const rCost = filteredSales.reduce((s, d) => s + d.cost, 0);
              const rProfit = filteredSales.reduce((s, d) => s + d.profit, 0);
              const rBermelsPurchased = filteredPurchases.reduce((s, p) => s + p.bermels, 0);
              const rPurchaseCost = filteredPurchases.reduce((s, p) => s + p.totalAmount, 0);
              const rBermelsUsed = Math.floor(rNormal / GLASSES_PER_BERMEL);
              const rOpenBalance = rNormal % GLASSES_PER_BERMEL;

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Bermels Purchased</p>
                      <p className="text-2xl font-bold font-heading mt-1 text-primary">{rBermelsPurchased}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Bermels Used</p>
                      <p className="text-2xl font-bold font-heading mt-1 text-destructive">{rBermelsUsed}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Normal Glasses Sold</p>
                      <p className="text-2xl font-bold font-heading mt-1">{rNormal}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Extra Glasses Sold</p>
                      <p className="text-2xl font-bold font-heading mt-1 text-info">{rExtra}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold font-heading mt-1">ETB {rRevenue.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Cost</p>
                      <p className="text-2xl font-bold font-heading mt-1">ETB {(rCost + rPurchaseCost).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Profit</p>
                      <p className="text-2xl font-bold font-heading mt-1 text-success">ETB {rProfit.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Open Bermel Balance</p>
                      <p className="text-2xl font-bold font-heading mt-1">{rOpenBalance > 0 ? `${GLASSES_PER_BERMEL - rOpenBalance} glasses left` : '—'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-muted/30">
                      <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/30">
                        <h3 className="text-base font-bold font-heading">Sales Detail</h3>
                        <Button onClick={async () => {
                          const dateFrom = reportFilter === 'custom' ? reportDateFrom : null;
                          const dateTo = reportFilter === 'custom' ? reportDateTo : null;

                          const rNormalLocal = rNormal;
                          const rExtraLocal = rExtra;
                          const rRevenueLocal = rRevenue;
                          const rCostLocal = rCost;
                          const rProfitLocal = rProfit;
                          const rBermelsPurchasedLocal = rBermelsPurchased;
                          const rPurchaseCostLocal = rPurchaseCost;
                          const rBermelsUsedLocal = rBermelsUsed;

                          const { error: snapError } = await supabase.from('draft_report_snapshots').insert({
                            report_date: new Date().toISOString(),
                            report_type: reportFilter,
                            date_from: dateFrom,
                            date_to: dateTo,
                            bermels_purchased: rBermelsPurchasedLocal,
                            bermels_used: rBermelsUsedLocal,
                            glasses_sold: rNormalLocal,
                            extra_glasses_sold: rExtraLocal,
                            revenue: rRevenueLocal,
                            purchase_cost: rPurchaseCostLocal,
                            sales_cost: rCostLocal,
                            profit: rProfitLocal,
                            notes: `Saved draft report for ${reportFilter}`
                          });
                          if (snapError) {
                            alert('Failed to save report snapshot: ' + snapError.message);
                          } else {
                            alert('Report snapshot saved successfully!');
                            await loadAll();
                          }
                        }} size="sm" className="gap-2">
                          <Save className="w-4 h-4" /> Save Report
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/20">
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Product</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Normal</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Extra</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Revenue</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Cost</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSales.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground italic">No sales in selected period</td></tr>
                          ) : filteredSales.map(sale => (
                            <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                              <td className="px-4 py-2">{sale.date}</td>
                              <td className="px-4 py-2 font-medium">{sale.productName}</td>
                              <td className="px-4 py-2 text-right">{sale.glassesSold}</td>
                              <td className="px-4 py-2 text-right text-info">{sale.extraGlassesSold || 0}</td>
                              <td className="px-4 py-2 text-right">ETB {sale.total.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right">ETB {sale.cost.toFixed(0)}</td>
                              <td className="px-4 py-2 text-right font-bold text-success">ETB {sale.profit.toFixed(0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-muted/30">
                      <h3 className="text-base font-bold font-heading">Purchase Detail</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/20">
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Product</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Supplier</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Bermels</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Cost/Bermel</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPurchases.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground italic">No purchases in selected period</td></tr>
                          ) : filteredPurchases.map(p => (
                            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                              <td className="px-4 py-2">{p.date}</td>
                              <td className="px-4 py-2 font-medium">{p.productName}</td>
                              <td className="px-4 py-2">{p.supplier || '—'}</td>
                              <td className="px-4 py-2 text-right">{p.bermels}</td>
                              <td className="px-4 py-2 text-right">ETB {p.costPerBermel.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-bold">ETB {p.totalAmount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}

            {savedReports.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <h3 className="text-base font-bold font-heading">Saved Report Snapshots</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date Saved</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Bermels (P/U)</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Glasses (N/E)</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Revenue</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedReports.map(rep => (
                        <tr key={rep.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-2">{new Date(rep.report_date).toLocaleString()}</td>
                          <td className="px-4 py-2 capitalize">{rep.report_type}</td>
                          <td className="px-4 py-2 text-right">{rep.bermels_purchased} / {rep.bermels_used}</td>
                          <td className="px-4 py-2 text-right">{rep.glasses_sold} / {rep.extra_glasses_sold}</td>
                          <td className="px-4 py-2 text-right">ETB {Number(rep.revenue).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-bold text-success">ETB {Number(rep.profit).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Draft Type Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Add New Draft Type</DialogTitle></DialogHeader>
          <div className="grid gap-4 mt-4">
            <div><Label>Draft Name</Label><Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. St George Draft" /></div>
            <div><Label>Cost per Bermel (ETB)</Label><Input type="number" value={addForm.costPrice} onChange={e => setAddForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="e.g. 1800" /></div>
            <div><Label>Selling Price per Glass (ETB)</Label><Input type="number" value={addForm.sellingPrice} onChange={e => setAddForm(f => ({ ...f, sellingPrice: e.target.value }))} placeholder="e.g. 25" /></div>
            <div><Label>Glasses per Bermel</Label><Input type="number" value={addForm.glassCount} onChange={e => setAddForm(f => ({ ...f, glassCount: e.target.value }))} placeholder="125" /></div>
            <div><Label>Initial Bermels (optional)</Label><Input type="number" value={addForm.bermels} onChange={e => setAddForm(f => ({ ...f, bermels: e.target.value }))} placeholder="e.g. 5" /></div>
            <div><Label>Notes</Label><Input value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDraftType} disabled={!addForm.name || !addForm.costPrice || !addForm.sellingPrice}>Create Draft Type</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
