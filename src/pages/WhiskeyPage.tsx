import React from "react";
import { useEffect, useMemo, useState } from "react";
/// <reference types="react" />
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
  Wine,
  Edit2,
  Save,
  CalendarDays,
  TrendingUp,
  Package,
  ShoppingCart,
  BarChart3,
  RotateCcw,
  Plus,
  Trash2,
} from "lucide-react";
import CalendarHistory from "@/components/CalendarHistory";
import PrintButton from "@/components/PrintButton";

const DEFAULT_CC_PER_BOTTLE = 17;

type ProductRow = {
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
  bottle_size: number | null;
  remaining_ml: number | null; // used here as sell price per cc
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type WhiskeySaleRow = {
  id: number;
  whiskey_product_id: number;
  sale_date: string;
  bottles_sold: number | null;
  cc_sold: number | null;
  extra_cc_sold: number | null;
  total_amount: number | null;
  total_cost: number | null;
  total_profit: number | null;
  cashier: string | null;
  notes: string | null;
  created_at: string | null;
};

type WhiskeyPurchaseRow = {
  id: number;
  whiskey_product_id: number;
  purchase_date: string;
  bottles: number | null;
  cost_per_bottle: number | null;
  total_amount: number | null;
  supplier: string | null;
  notes: string | null;
  created_at: string | null;
};

type WhiskeySale = {
  id: string;
  date: string;
  productId: number;
  productName: string;
  saleType: "bottle" | "cc";
  bottlesSold: number;
  ccSold: number;
  extraCcSold: number;
  total: number;
  cost: number;
  profit: number;
  cashier: string;
  notes: string;
  createdAt: string;
  isExpense?: boolean;
  expenseAmount?: number;
};

type WhiskeyPurchase = {
  id: string;
  date: string;
  productId: number;
  productName: string;
  bottles: number;
  costPerBottle: number;
  totalAmount: number;
  supplier: string;
  notes: string;
  createdAt: string;
};

type WhiskeyReportSnapshot = {
  id: number;
  report_date: string;
  report_type: string;
  date_from: string | null;
  date_to: string | null;
  bottles_purchased: number | null;
  bottles_sold: number | null;
  cc_sold: number | null;
  extra_cc_sold: number | null;
  revenue: number | null;
  purchase_cost: number | null;
  sales_cost: number | null;
  profit: number | null;
  saved_by: string | null;
  notes: string | null;
  created_at: string | null;
};

export default function WhiskeyPage() {
  const [activeTab, setActiveTab] = useState("stock");
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [whiskeySales, setWhiskeySales] = useState<WhiskeySale[]>([]);
  const [whiskeyPurchases, setWhiskeyPurchases] = useState<WhiskeyPurchase[]>([]);
  const [savedReports, setSavedReports] = useState<WhiskeyReportSnapshot[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editProductId, setEditProductId] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState("");
  const [saleEditOpen, setSaleEditOpen] = useState(false);
  const [saleDeleteOpen, setSaleDeleteOpen] = useState(false);
  const [editSaleId, setEditSaleId] = useState("");
  const [deleteSaleId, setDeleteSaleId] = useState("");
  const [purchaseEditOpen, setPurchaseEditOpen] = useState(false);
  const [purchaseDeleteOpen, setPurchaseDeleteOpen] = useState(false);
  const [editPurchaseId, setEditPurchaseId] = useState("");
  const [deletePurchaseId, setDeletePurchaseId] = useState("");
  const [editPurchaseForm, setEditPurchaseForm] = useState({
    purchaseDate: "",
    productId: "",
    bottles: "",
    costPerBottle: "",
    supplier: "",
    notes: "",
  });
  const [editSaleForm, setEditSaleForm] = useState({
    saleDate: "",
    productId: "",
    bottlesSold: "",
    ccSold: "",
    extraCcSold: "",
    cashier: "",
    notes: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    costPrice: "",
    sellingPrice: "",
    sellPricePerCc: "",
    ccPerBottle: "",
    quantity: "",
    status: "active" as "active" | "inactive",
  });

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    costPrice: "",
    sellingPrice: "",
    sellPricePerCc: "",
    ccPerBottle: String(DEFAULT_CC_PER_BOTTLE),
    bottles: "",
    notes: "",
  });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().split("T")[0];

  const [trackingForm, setTrackingForm] = useState({
    productId: "",
    bottlesSold: "",
    ccSold: "",
    extraCcSold: "",
    date: defaultDate,
    cashier: "Admin",
    notes: "",
  });

  const [purchaseForm, setPurchaseForm] = useState({
    productId: "",
    bottles: "",
    costPerBottle: "",
    supplier: "",
    date: defaultDate,
    notes: "",
  });

  const [reportFilter, setReportFilter] = useState<
    "all" | "daily" | "weekly" | "monthly" | "custom"
  >("all");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  const loadAll = async () => {
    setLoading(true);

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select(
        "id, code, name, category, unit, cost_price, selling_price, quantity, reorder_level, standing_target, bottle_size, remaining_ml, is_active, created_at, updated_at"
      )
      .order("id", { ascending: true });

    if (productError) {
      console.error("Load whiskey products error:", productError);
      alert(`Failed to load whiskey products: ${productError.message}`);
      setLoading(false);
      return;
    }

    const freshProducts = (productData || []) as ProductRow[];
    setProducts(freshProducts);

    const [salesRes, purchasesRes, reportsRes, expensesRes] = await Promise.all([
      supabase
        .from("whiskey_sales")
        .select(`
          id,
          whiskey_product_id,
          sale_date,
          bottles_sold,
          cc_sold,
          extra_cc_sold,
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
        .from("whiskey_purchases")
        .select(`
          id,
          whiskey_product_id,
          purchase_date,
          bottles,
          cost_per_bottle,
          total_amount,
          supplier,
          notes,
          created_at
        `)
        .order("purchase_date", { ascending: false })
        .order("id", { ascending: false }),

      supabase
        .from("whiskey_report_snapshots")
        .select("*")
        .order("report_date", { ascending: false })
        .order("id", { ascending: false }),

      supabase
        .from("expenses")
        .select("*")
        .eq("expense_kind", "drink")
        .order("expense_date", { ascending: false })
        .order("id", { ascending: false }),
    ]);

    if (salesRes.error) {
      console.error("Load whiskey sales error:", salesRes.error);
      alert(`Failed to load whiskey sales: ${salesRes.error.message}`);
      setLoading(false);
      return;
    }

    if (purchasesRes.error) {
      console.error("Load whiskey purchases error:", purchasesRes.error);
      alert(`Failed to load whiskey purchases: ${purchasesRes.error.message}`);
      setLoading(false);
      return;
    }

    if (reportsRes.error) {
      console.error("Load whiskey reports error:", reportsRes.error);
    }

    const mappedSales: WhiskeySale[] = ((salesRes.data || []) as WhiskeySaleRow[]).map((s) => {
      const product = freshProducts.find((p) => p.id === s.whiskey_product_id);

      return {
        id: String(s.id),
        date: s.sale_date,
        productId: s.whiskey_product_id,
        productName: product?.name || "",
        saleType: Number(s.bottles_sold || 0) > 0 ? "bottle" : "cc",
        bottlesSold: Number(s.bottles_sold || 0),
        ccSold: Number(s.cc_sold || 0),
        extraCcSold: Number(s.extra_cc_sold || 0),
        total: Number(s.total_amount || 0),
        cost: Number(s.total_cost || 0),
        profit: Number(s.total_profit || 0),
        cashier: s.cashier || "",
        notes: s.notes || "",
        createdAt: s.created_at || "",
      };
    });

    const mappedPurchases: WhiskeyPurchase[] = ((purchasesRes.data || []) as WhiskeyPurchaseRow[]).map((p) => {
      const product = freshProducts.find((x) => x.id === p.whiskey_product_id);

      return {
        id: String(p.id),
        date: p.purchase_date,
        productId: p.whiskey_product_id,
        productName: product?.name || "",
        bottles: Number(p.bottles || 0),
        costPerBottle: Number(p.cost_per_bottle || 0),
        totalAmount: Number(p.total_amount || 0),
        supplier: p.supplier || "",
        notes: p.notes || "",
        createdAt: p.created_at || "",
      };
    });

    const expenseData = expensesRes?.data || [];
    const whiskeyExpenses = expenseData.filter((e: any) => {
       const p = freshProducts.find((x) => x.id === e.product_id);
       return p && p.category?.toLowerCase() === 'whiskey';
    });
    
    const mappedExpenses: WhiskeySale[] = whiskeyExpenses.map((e: any) => {
       const p = freshProducts.find((x) => x.id === e.product_id);
       const isCC = e.notes && e.notes.includes('[Whiskey CC]');
       return {
         id: `exp-${e.id}`,
         date: e.expense_date,
         productId: e.product_id,
         productName: p?.name || "",
         saleType: isCC ? "cc" : "bottle",
         bottlesSold: isCC ? 0 : Number(e.quantity || 0),
         ccSold: isCC ? Number(e.quantity || 0) : 0,
         extraCcSold: 0,
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

    setWhiskeySales([...mappedSales, ...mappedExpenses].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setWhiskeyPurchases(mappedPurchases);
    setSavedReports((reportsRes.data || []) as WhiskeyReportSnapshot[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const whiskeys = products.filter(
    (p) => p.category?.toLowerCase() === "whiskey" && (p.is_active ?? true)
  );

  const getNextWhiskeyCode = () => {
    const whiskeyCodes = products
      .filter((p) => p.category?.toLowerCase() === "whiskey")
      .map((p) => p.code || "")
      .filter((c) => c.startsWith("WHSK-"))
      .map((c) => Number(c.replace("WHSK-", "")))
      .filter((n) => !Number.isNaN(n));

    const next = whiskeyCodes.length ? Math.max(...whiskeyCodes) + 1 : 1;
    return `WHSK-${String(next).padStart(3, "0")}`;
  };

  const getBottleStatus = (product: ProductRow) => {
    const ccPerBottle = Number(product.bottle_size || DEFAULT_CC_PER_BOTTLE);
    
    // Get purchases for this product
    const productPurchases = whiskeyPurchases.filter((p) => p.productId === product.id);
    const totalBottlesPurchased = productPurchases.reduce((sum, p) => sum + p.bottles, 0);
    
    // Get sales for this product
    const productSales = whiskeySales.filter((s) => s.productId === product.id);
    const totalBottlesSold = productSales.reduce((s, d) => s + d.bottlesSold, 0);
    const totalCcSold = productSales.reduce((s, d) => s + d.ccSold, 0);
    const totalExtraCcSold = productSales.reduce((s, d) => s + d.extraCcSold, 0);

    const fullBottlesUsedByCc = Math.floor(totalCcSold / ccPerBottle);
    const ccIntoCurrentBottle = totalCcSold % ccPerBottle;
    const isOpenBottle = ccIntoCurrentBottle > 0;
    const remainingInOpenBottle = isOpenBottle ? ccPerBottle - ccIntoCurrentBottle : 0;

    const totalBottlesConsumed =
      totalBottlesSold + fullBottlesUsedByCc + (isOpenBottle ? 1 : 0);

    // Calculate expected stock based on purchases and sales
    const expectedStock = Math.max(0, totalBottlesPurchased - totalBottlesConsumed);
    
    // Use current product quantity as base, but cap it to reasonable values
    // This prevents impossible values like 7000 when actual should be small
    const currentQuantity = Number(product.quantity || 0);
    let fullBottlesLeft = currentQuantity;
    
    // If current quantity seems impossible (much higher than purchases), use calculated value
    if (currentQuantity > totalBottlesPurchased * 2) {
      fullBottlesLeft = expectedStock;
    } else {
      // Otherwise, use current quantity but ensure it's not negative
      fullBottlesLeft = Math.max(0, currentQuantity);
    }

    const sellPricePerBottle = Number(product.selling_price || 0);
    const sellPricePerCc = Number(product.remaining_ml || 0);
    const costPerBottle = Number(product.cost_price || 0);
    const costPerCc = ccPerBottle > 0 ? costPerBottle / ccPerBottle : 0;

    const bottleRevenue = totalBottlesSold * sellPricePerBottle;
    const ccRevenue = (totalCcSold + totalExtraCcSold) * sellPricePerCc;
    const totalRevenue = bottleRevenue + ccRevenue;
    const totalCost = totalBottlesSold * costPerBottle + totalCcSold * costPerCc;
    const totalProfit = totalRevenue - totalCost;

    return {
      ccPerBottle,
      totalBottlesPurchased,
      totalBottlesSold,
      totalCcSold,
      totalExtraCcSold,
      fullBottlesUsedByCc,
      ccIntoCurrentBottle,
      remainingInOpenBottle,
      isOpenBottle,
      fullBottlesLeft,
      totalRevenue,
      totalCost,
      totalProfit,
      sellPricePerBottle,
      sellPricePerCc,
      costPerBottle,
      expectedStock, // Add this for debugging/validation
    };
  };

  const overallKPI = useMemo(() => {
    let totalBottlesLeft = 0;
    let totalBottlesSold = 0;
    let totalCcSold = 0;
    let totalRev = 0;
    let totalProfit = 0;

    whiskeys.forEach((w) => {
      const s = getBottleStatus(w);
      totalBottlesLeft += s.fullBottlesLeft + (s.isOpenBottle ? 1 : 0);
      totalBottlesSold += s.totalBottlesSold;
      totalCcSold += s.totalCcSold + s.totalExtraCcSold;
      totalRev += s.totalRevenue;
      totalProfit += s.totalProfit;
    });

    return { totalBottlesLeft, totalBottlesSold, totalCcSold, totalRev, totalProfit };
  }, [whiskeys, whiskeySales]);

  const handleAddWhiskey = async () => {
    if (!addForm.name || !addForm.costPrice || !addForm.sellingPrice) return;

    const code = getNextWhiskeyCode();

    const { error } = await supabase.from("products").insert([
      {
        code,
        name: addForm.name,
        category: "Whiskey",
        unit: "Bottle",
        cost_price: Number(addForm.costPrice),
        selling_price: Number(addForm.sellingPrice),
        quantity: Number(addForm.bottles) || 0,
        reorder_level: 2,
        standing_target: 0,
        bottle_size: Number(addForm.ccPerBottle) || DEFAULT_CC_PER_BOTTLE,
        remaining_ml: Number(addForm.sellPricePerCc) || 0,
        is_active: true,
      },
    ]);

    if (error) {
      console.error("Add whiskey error:", error);
      alert(`Failed to add whiskey type: ${error.message}`);
      return;
    }

    setAddForm({
      name: "",
      costPrice: "",
      sellingPrice: "",
      sellPricePerCc: "",
      ccPerBottle: String(DEFAULT_CC_PER_BOTTLE),
      bottles: "",
      notes: "",
    });

    setAddOpen(false);
    await loadAll();
  };

  const openEdit = (p: ProductRow) => {
    setEditProductId(String(p.id));
    setEditForm({
      name: p.name,
      costPrice: String(p.cost_price || 0),
      sellingPrice: String(p.selling_price || 0),
      sellPricePerCc: String(p.remaining_ml || 0),
      ccPerBottle: String(p.bottle_size || DEFAULT_CC_PER_BOTTLE),
      quantity: String(p.quantity || 0),
      status: (p.is_active ?? true) ? "active" : "inactive",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    const { error } = await supabase
      .from("products")
      .update({
        name: editForm.name,
        cost_price: Number(editForm.costPrice),
        selling_price: Number(editForm.sellingPrice),
        remaining_ml: Number(editForm.sellPricePerCc),
        bottle_size: Number(editForm.ccPerBottle),
        quantity: Number(editForm.quantity),
        is_active: editForm.status === "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", Number(editProductId));

    if (error) {
      console.error("Edit whiskey error:", error);
      alert(`Failed to update whiskey type: ${error.message}`);
      return;
    }

    setEditOpen(false);
    await loadAll();
  };

  const openDeleteConfirm = (productId: number) => {
    setDeleteProductId(String(productId));
    setDeleteConfirmOpen(true);
  };

  const handleDeleteWhiskey = async () => {
    const productId = Number(deleteProductId);
    
    // Delete related whiskey sales first
    const { error: salesError } = await supabase
      .from("whiskey_sales")
      .delete()
      .eq("whiskey_product_id", productId);
    
    if (salesError) {
      console.error("Delete whiskey sales error:", salesError);
      alert(`Failed to delete whiskey sales: ${salesError.message}`);
      return;
    }
    
    // Delete related whiskey purchases
    const { error: purchasesError } = await supabase
      .from("whiskey_purchases")
      .delete()
      .eq("whiskey_product_id", productId);
    
    if (purchasesError) {
      console.error("Delete whiskey purchases error:", purchasesError);
      alert(`Failed to delete whiskey purchases: ${purchasesError.message}`);
      return;
    }
    
    // Delete the whiskey product
    const { error: productError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    
    if (productError) {
      console.error("Delete whiskey product error:", productError);
      alert(`Failed to delete whiskey type: ${productError.message}`);
      return;
    }
    
    setDeleteConfirmOpen(false);
    await loadAll();
  };

  const openEditSale = (sale: WhiskeySale) => {
    setEditSaleId(String(sale.id));
    setEditSaleForm({
      saleDate: sale.date,
      productId: String(sale.productId),
      bottlesSold: String(sale.bottlesSold),
      ccSold: String(sale.ccSold),
      extraCcSold: String(sale.extraCcSold),
      cashier: sale.cashier,
      notes: sale.notes,
    });
    setSaleEditOpen(true);
  };

  const handleEditSaleSave = async () => {
    const product = whiskeys.find((p) => p.id === Number(editSaleForm.productId));
    if (!product) {
      alert("Please select a valid whiskey product.");
      return;
    }

    const bottlesSold = Number(editSaleForm.bottlesSold) || 0;
    const ccSold = Number(editSaleForm.ccSold) || 0;
    const extraCcSold = Number(editSaleForm.extraCcSold) || 0;

    if (bottlesSold === 0 && ccSold === 0 && extraCcSold === 0) {
      alert("Please enter bottles sold or cc sold.");
      return;
    }

    const status = getBottleStatus(product);
    const bottleRevenue = bottlesSold * status.sellPricePerBottle;
    const ccRevenue = (ccSold + extraCcSold) * status.sellPricePerCc;
    const total = bottleRevenue + ccRevenue;
    const costPerCc = status.ccPerBottle > 0 ? status.costPerBottle / status.ccPerBottle : 0;
    const cost = bottlesSold * status.costPerBottle + ccSold * costPerCc;
    const profit = total - cost;

    // Get original sale to calculate bottle quantity difference
    const originalSale = whiskeySales.find((s) => s.id === editSaleId);
    const originalBottlesSold = originalSale?.bottlesSold || 0;
    const bottleDifference = bottlesSold - originalBottlesSold;

    // Update the sale
    const { error: saleError } = await supabase
      .from("whiskey_sales")
      .update({
        whiskey_product_id: Number(editSaleForm.productId),
        sale_date: editSaleForm.saleDate,
        bottles_sold: bottlesSold,
        cc_sold: ccSold,
        extra_cc_sold: extraCcSold,
        total_amount: total,
        total_cost: cost,
        total_profit: profit,
        cashier: editSaleForm.cashier,
        notes: editSaleForm.notes,
      })
      .eq("id", Number(editSaleId));

    if (saleError) {
      console.error("Edit whiskey sale error:", saleError);
      alert(`Failed to update whiskey sale: ${saleError.message}`);
      return;
    }

    // Update product quantity if bottle count changed
    if (bottleDifference !== 0) {
      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: Math.max(0, Number(product.quantity || 0) - bottleDifference),
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(product.id));

      if (productError) {
        console.error("Whiskey quantity update error:", productError);
        alert(`Sale updated, but failed to update bottle stock: ${productError.message}`);
        return;
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
    const sale = whiskeySales.find((s) => s.id === deleteSaleId);
    if (!sale) return;

    // Delete the sale
    const { error: saleError } = await supabase
      .from("whiskey_sales")
      .delete()
      .eq("id", Number(deleteSaleId));

    if (saleError) {
      console.error("Delete whiskey sale error:", saleError);
      alert(`Failed to delete whiskey sale: ${saleError.message}`);
      return;
    }

    // Restore bottle quantity if bottles were sold
    if (sale.bottlesSold > 0) {
      const product = whiskeys.find((p) => p.id === sale.productId);
      if (product) {
        const { error: productError } = await supabase
          .from("products")
          .update({
            quantity: Number(product.quantity || 0) + sale.bottlesSold,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sale.productId);

        if (productError) {
          console.error("Whiskey quantity restore error:", productError);
          alert(`Sale deleted, but failed to restore bottle stock: ${productError.message}`);
          return;
        }
      }
    }

    setSaleDeleteOpen(false);
    await loadAll();
  };

  const openEditPurchase = (purchase: WhiskeyPurchase) => {
    setEditPurchaseId(String(purchase.id));
    setEditPurchaseForm({
      purchaseDate: purchase.date,
      productId: String(purchase.productId),
      bottles: String(purchase.bottles),
      costPerBottle: String(purchase.costPerBottle),
      supplier: purchase.supplier,
      notes: purchase.notes,
    });
    setPurchaseEditOpen(true);
  };

  const handleEditPurchaseSave = async () => {
    const product = whiskeys.find((p) => p.id === Number(editPurchaseForm.productId));
    if (!product) {
      alert("Please select a valid whiskey product.");
      return;
    }

    const bottles = Number(editPurchaseForm.bottles);
    const costPerBottle = Number(editPurchaseForm.costPerBottle);

    if (!bottles || !costPerBottle) {
      alert("Please enter bottles and cost per bottle.");
      return;
    }

    // Get original purchase to calculate bottle quantity difference
    const originalPurchase = whiskeyPurchases.find((p) => p.id === editPurchaseId);
    const originalBottles = originalPurchase?.bottles || 0;
    const bottleDifference = bottles - originalBottles;

    // Update the purchase
    const { error: purchaseError } = await supabase
      .from("whiskey_purchases")
      .update({
        whiskey_product_id: Number(editPurchaseForm.productId),
        purchase_date: editPurchaseForm.purchaseDate,
        bottles,
        cost_per_bottle: costPerBottle,
        total_amount: bottles * costPerBottle,
        supplier: editPurchaseForm.supplier,
        notes: editPurchaseForm.notes,
      })
      .eq("id", Number(editPurchaseId));

    if (purchaseError) {
      console.error("Edit whiskey purchase error:", purchaseError);
      alert(`Failed to update whiskey purchase: ${purchaseError.message}`);
      return;
    }

    // Update product quantity if bottle count changed
    if (bottleDifference !== 0) {
      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: Math.max(0, Number(product.quantity || 0) + bottleDifference),
          cost_price: costPerBottle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(product.id));

      if (productError) {
        console.error("Whiskey quantity update error:", productError);
        alert(`Purchase updated, but failed to update bottle stock: ${productError.message}`);
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
    const purchase = whiskeyPurchases.find((p) => p.id === deletePurchaseId);
    if (!purchase) return;

    // Delete the purchase
    const { error: purchaseError } = await supabase
      .from("whiskey_purchases")
      .delete()
      .eq("id", Number(deletePurchaseId));

    if (purchaseError) {
      console.error("Delete whiskey purchase error:", purchaseError);
      alert(`Failed to delete whiskey purchase: ${purchaseError.message}`);
      return;
    }

    // Remove bottle quantity from product
    const product = whiskeys.find((p) => p.id === purchase.productId);
    if (product) {
      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: Math.max(0, Number(product.quantity || 0) - purchase.bottles),
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.productId);

      if (productError) {
        console.error("Whiskey quantity update error:", productError);
        alert(`Purchase deleted, but failed to update bottle stock: ${productError.message}`);
        return;
      }
    }

    setPurchaseDeleteOpen(false);
    await loadAll();
  };

  const handleTrackingSave = async () => {
    const product = whiskeys.find((p) => p.id === Number(trackingForm.productId));
    if (!product) {
      alert("Please select a valid whiskey product.");
      return;
    }

    const bottlesSold = Number(trackingForm.bottlesSold) || 0;
    const ccSold = Number(trackingForm.ccSold) || 0;
    const extraCcSold = Number(trackingForm.extraCcSold) || 0;

    if (bottlesSold === 0 && ccSold === 0 && extraCcSold === 0) {
      alert("Please enter bottles sold or cc sold.");
      return;
    }

    const status = getBottleStatus(product);

    const bottleRevenue = bottlesSold * status.sellPricePerBottle;
    const ccRevenue = (ccSold + extraCcSold) * status.sellPricePerCc;
    const total = bottleRevenue + ccRevenue;

    const costPerCc =
      status.ccPerBottle > 0 ? status.costPerBottle / status.ccPerBottle : 0;

    const cost = bottlesSold * status.costPerBottle + ccSold * costPerCc;
    const profit = total - cost;

    const insertPayload = {
      whiskey_product_id: Number(product.id),
      sale_date: trackingForm.date,
      bottles_sold: bottlesSold,
      cc_sold: ccSold,
      extra_cc_sold: extraCcSold,
      total_amount: total,
      total_cost: cost,
      total_profit: profit,
      cashier: trackingForm.cashier,
      notes: trackingForm.notes,
    };

    const { error: saleError } = await supabase
      .from("whiskey_sales")
      .insert([insertPayload]);

    if (saleError) {
      console.error("Whiskey sale error:", saleError);
      alert(`Failed to save whiskey sale: ${saleError.message}`);
      return;
    }

    if (bottlesSold > 0) {
      const { error: productError } = await supabase
        .from("products")
        .update({
          quantity: Math.max(0, Number(product.quantity || 0) - bottlesSold),
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(product.id));

      if (productError) {
        console.error("Whiskey quantity update error:", productError);
        alert(`Sale saved, but failed to update bottle stock: ${productError.message}`);
        return;
      }
    }

    setTrackingForm({
      productId: "",
      bottlesSold: "",
      ccSold: "",
      extraCcSold: "",
      date: defaultDate,
      cashier: "Admin",
      notes: "",
    });

    await loadAll();
  };

  const handlePurchaseSave = async () => {
    const product = whiskeys.find((p) => p.id === Number(purchaseForm.productId));
    if (!product) {
      alert("Please select a valid whiskey product.");
      return;
    }

    if (!purchaseForm.bottles || !purchaseForm.costPerBottle) {
      alert("Please enter bottles and cost per bottle.");
      return;
    }

    const bottles = Number(purchaseForm.bottles);
    const costPerBottle = Number(purchaseForm.costPerBottle);

    const purchasePayload = {
      whiskey_product_id: Number(product.id),
      purchase_date: purchaseForm.date,
      bottles,
      cost_per_bottle: costPerBottle,
      total_amount: bottles * costPerBottle,
      supplier: purchaseForm.supplier,
      notes: purchaseForm.notes,
    };

    const { error: purchaseError } = await supabase
      .from("whiskey_purchases")
      .insert([purchasePayload]);

    if (purchaseError) {
      console.error("Whiskey purchase error:", purchaseError);
      alert(`Failed to save whiskey purchase: ${purchaseError.message}`);
      return;
    }

    const { error: productError } = await supabase
      .from("products")
      .update({
        quantity: Number(product.quantity || 0) + bottles,
        cost_price: costPerBottle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", Number(product.id));

    if (productError) {
      console.error("Whiskey product update error:", productError);
      alert(`Purchase saved, but failed to update bottles: ${productError.message}`);
      return;
    }

    setPurchaseForm({
      productId: "",
      bottles: "",
      costPerBottle: "",
      supplier: "",
      date: defaultDate,
      notes: "",
    });

    await loadAll();
  };

  const filteredSales = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    return whiskeySales.filter((s) => {
      if (reportFilter === "daily") return s.date === today;
      if (reportFilter === "weekly") return s.date >= weekAgo;
      if (reportFilter === "monthly") return s.date >= monthAgo;
      if (reportFilter === "custom") {
        return (!reportDateFrom || s.date >= reportDateFrom) &&
          (!reportDateTo || s.date <= reportDateTo);
      }
      return true;
    });
  }, [whiskeySales, reportFilter, reportDateFrom, reportDateTo]);

  const filteredPurchases = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    return whiskeyPurchases.filter((p) => {
      if (reportFilter === "daily") return p.date === today;
      if (reportFilter === "weekly") return p.date >= weekAgo;
      if (reportFilter === "monthly") return p.date >= monthAgo;
      if (reportFilter === "custom") {
        return (!reportDateFrom || p.date >= reportDateFrom) &&
          (!reportDateTo || p.date <= reportDateTo);
      }
      return true;
    });
  }, [whiskeyPurchases, reportFilter, reportDateFrom, reportDateTo]);

  const reportKPI = useMemo(() => {
    const totalBottlesSold = filteredSales.reduce((s, d) => s + d.bottlesSold, 0);
    const totalCcSold = filteredSales.reduce((s, d) => s + d.ccSold, 0);
    const totalExtraCc = filteredSales.reduce((s, d) => s + d.extraCcSold, 0);
    const totalRevenue = filteredSales.reduce((s, d) => s + d.total, 0);
    const totalCost = filteredSales.reduce((s, d) => s + d.cost, 0);
    const totalProfit = filteredSales.reduce((s, d) => s + d.profit, 0);
    const totalPurchased = filteredPurchases.reduce((s, d) => s + d.bottles, 0);
    const totalPurchaseCost = filteredPurchases.reduce((s, d) => s + d.totalAmount, 0);

    return {
      totalBottlesSold,
      totalCcSold,
      totalExtraCc,
      totalRevenue,
      totalCost,
      totalProfit,
      totalPurchased,
      totalPurchaseCost,
    };
  }, [filteredSales, filteredPurchases]);

  const handleSaveReportSnapshot = async () => {
    const today = new Date().toISOString().split("T")[0];

    const payload = {
      report_date: reportFilter === "custom" ? reportDateTo || today : today,
      report_type: reportFilter,
      date_from: reportFilter === "custom" ? reportDateFrom || null : null,
      date_to: reportFilter === "custom" ? reportDateTo || null : null,
      bottles_purchased: reportKPI.totalPurchased,
      bottles_sold: reportKPI.totalBottlesSold,
      cc_sold: reportKPI.totalCcSold,
      extra_cc_sold: reportKPI.totalExtraCc,
      revenue: reportKPI.totalRevenue,
      purchase_cost: reportKPI.totalPurchaseCost,
      sales_cost: reportKPI.totalCost,
      profit: reportKPI.totalProfit,
      saved_by: "Admin",
      notes: `Saved from whiskey report tab (${reportFilter})`,
    };

    const { error } = await supabase
      .from("whiskey_report_snapshots")
      .upsert([payload], {
        onConflict: "report_date,report_type",
      });

    if (error) {
      console.error("Save whiskey report error:", error);
      alert(`Failed to save whiskey report: ${error.message}`);
      return;
    }

    alert("Whiskey report saved successfully.");
    await loadAll();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div className="module-header">
          <h1 className="module-title flex items-center gap-2">
            <Wine className="w-6 h-6" />
            Whiskey Management
          </h1>
          <p className="module-subtitle">Track bottle & cc sales with open bottle logic</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Bottles Left</p>
          <p className="text-xl font-bold font-heading mt-1">{overallKPI.totalBottlesLeft}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Bottles Sold</p>
          <p className="text-xl font-bold font-heading mt-1">{overallKPI.totalBottlesSold}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">CC Sold</p>
          <p className="text-xl font-bold font-heading mt-1">{overallKPI.totalCcSold}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-xl font-bold font-heading mt-1">
            ETB {overallKPI.totalRev.toLocaleString()}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Profit</p>
          <p className="text-xl font-bold font-heading mt-1 text-success">
            ETB {overallKPI.totalProfit.toLocaleString()}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-11 bg-muted/60 rounded-xl p-1">
          <TabsTrigger value="stock" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg text-xs gap-1">
            <Package className="w-3.5 h-3.5" /> Stock
          </TabsTrigger>
          <TabsTrigger value="tracking" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg text-xs gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Daily
          </TabsTrigger>
          <TabsTrigger value="purchase" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg text-xs gap-1">
            <ShoppingCart className="w-3.5 h-3.5" /> Purchase
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg text-xs gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="report" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg text-xs gap-1">
            <BarChart3 className="w-3.5 h-3.5" /> Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-heading">Whiskey Types</h3>
            <Button size="sm" className="gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="w-3 h-3" /> Add Whiskey Type
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {whiskeys.map((w) => {
              const s = getBottleStatus(w);
              return (
                <div key={w.id} className="kpi-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold font-heading text-sm">{w.name}</h4>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openDeleteConfirm(w.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Full Bottles</p>
                      <p className="font-bold text-base">{s.fullBottlesLeft}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Open Bottle</p>
                      <p className="font-bold text-base">
                        {s.isOpenBottle ? `${s.remainingInOpenBottle}/${s.ccPerBottle} cc` : "None"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CC/Bottle</p>
                      <p className="font-bold text-base">{s.ccPerBottle}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bottles Sold</p>
                      <p className="font-medium">{s.totalBottlesSold}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CC Sold</p>
                      <p className="font-medium">{s.totalCcSold}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Extra CC</p>
                      <p className="font-medium">{s.totalExtraCcSold}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost/Bottle</p>
                      <p className="font-medium">ETB {s.costPerBottle.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sell/Bottle</p>
                      <p className="font-medium">ETB {s.sellPricePerBottle.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sell/CC</p>
                      <p className="font-medium">ETB {s.sellPricePerCc}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-bold text-success">ETB {s.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-bold text-destructive">ETB {s.totalCost.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Profit</p>
                      <p className="font-bold text-success">ETB {s.totalProfit.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {!loading && whiskeys.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                No whiskey types added yet. Click "Add Whiskey Type" to start.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 kpi-card space-y-4">
              <h3 className="text-sm font-semibold font-heading">Record Whiskey Sale</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sale Date</Label>
                  <Input
                    type="date"
                    value={trackingForm.date}
                    onChange={(e) => setTrackingForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Whiskey Product</Label>
                  <Select
                    value={trackingForm.productId}
                    onValueChange={(v) => setTrackingForm((f) => ({ ...f, productId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select whiskey" />
                    </SelectTrigger>
                    <SelectContent>
                      {whiskeys.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Bottles Sold</Label>
                  <Input
                    type="number"
                    min="0"
                    value={trackingForm.bottlesSold}
                    onChange={(e) => setTrackingForm((f) => ({ ...f, bottlesSold: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label>CC Sold (Normal)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={trackingForm.ccSold}
                    onChange={(e) => setTrackingForm((f) => ({ ...f, ccSold: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label>Extra CC Sold</Label>
                  <Input
                    type="number"
                    min="0"
                    value={trackingForm.extraCcSold}
                    onChange={(e) => setTrackingForm((f) => ({ ...f, extraCcSold: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label>Cashier</Label>
                  <Input
                    value={trackingForm.cashier}
                    onChange={(e) => setTrackingForm((f) => ({ ...f, cashier: e.target.value }))}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={trackingForm.notes}
                    onChange={(e) => setTrackingForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              {trackingForm.productId && (
                <div className="mt-4 bg-success/10 p-4 rounded-lg flex items-center justify-between border border-success/20">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-success-foreground opacity-80">Current Sale Revenue Preview</span>
                    <span className="text-xs text-muted-foreground mt-1">Live calculation based on your input</span>
                  </div>
                  <span className="text-2xl font-bold font-heading text-success">
                    ETB {
                      (() => {
                        const p = whiskeys.find(w => String(w.id) === trackingForm.productId);
                        if (!p) return 0;
                        const bottles = Number(trackingForm.bottlesSold) || 0;
                        const cc = Number(trackingForm.ccSold) || 0;
                        const ecc = Number(trackingForm.extraCcSold) || 0;
                        const sellPricePerBottle = Number(p.selling_price || 0);
                        const sellPricePerCc = Number(p.remaining_ml || 0);
                        const total = (bottles * sellPricePerBottle) + ((cc + ecc) * sellPricePerCc);
                        return total.toLocaleString();
                      })()
                    }
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setTrackingForm({
                      productId: "",
                      bottlesSold: "",
                      ccSold: "",
                      extraCcSold: "",
                      date: defaultDate,
                      cashier: "Admin",
                      notes: "",
                    })
                  }
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
                <Button onClick={handleTrackingSave} disabled={!trackingForm.productId}>
                  <Save className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
              </div>
            </div>

            {trackingForm.productId &&
              (() => {
                const p = whiskeys.find((w) => w.id === Number(trackingForm.productId));
                if (!p) return null;
                const s = getBottleStatus(p);

                return (
                  <div className="kpi-card space-y-3">
                    <h4 className="text-sm font-semibold font-heading">{p.name} — Summary</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Bottles Left</span>
                        <span className="font-bold">{s.fullBottlesLeft}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Open Bottle</span>
                        <span className="font-bold">
                          {s.isOpenBottle ? `${s.remainingInOpenBottle} cc left` : "None"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Bottles Sold</span>
                        <span className="font-bold">{s.totalBottlesSold}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total CC Sold</span>
                        <span className="font-bold">{s.totalCcSold}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Extra CC Sold</span>
                        <span className="font-bold">{s.totalExtraCcSold}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-bold text-success">ETB {s.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost</span>
                        <span className="font-bold">ETB {s.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit</span>
                        <span className="font-bold text-success">ETB {s.totalProfit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>

          <div className="kpi-card mt-6">
            <h3 className="text-sm font-semibold font-heading mb-3">Recent Whiskey Sales</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Bottles</th>
                    <th>CC</th>
                    <th>Extra CC</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>Profit</th>
                    <th>Cashier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {whiskeySales.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center text-muted-foreground py-4">
                        No sales yet
                      </td>
                    </tr>
                  ) : (
                    whiskeySales.slice().reverse().slice(0, 20).map((s) => (
                      <tr key={s.id} className={s.isExpense ? "bg-destructive/5" : ""}>
                        <td>{s.date}</td>
                        <td className="font-medium">
                          {s.productName}
                          {s.isExpense && <span className="ml-2 text-[10px] font-bold text-destructive uppercase tracking-wider bg-destructive/10 px-1.5 py-0.5 rounded">Expense</span>}
                        </td>
                        <td className={s.isExpense ? "text-destructive font-semibold" : ""}>{s.bottlesSold || "-"}</td>
                        <td className={s.isExpense ? "text-destructive font-semibold" : ""}>{s.ccSold || "-"}</td>
                        <td>{s.extraCcSold || "-"}</td>
                        {s.isExpense ? (
                          <td colSpan={3} className="text-destructive text-sm opacity-80 pl-2">
                             Loss: ETB {s.expenseAmount?.toLocaleString() || 0} (via Expenses)
                          </td>
                        ) : (
                          <>
                            <td className="font-medium">ETB {s.total.toLocaleString()}</td>
                            <td>ETB {s.cost.toLocaleString()}</td>
                            <td className="text-success">ETB {s.profit.toLocaleString()}</td>
                          </>
                        )}
                        <td>{s.cashier}</td>
                        <td>
                          {!s.isExpense && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditSale(s)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openDeleteSaleConfirm(s.id)}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="purchase" className="mt-6 space-y-6">
          <div className="kpi-card space-y-4">
            <h3 className="text-sm font-semibold font-heading">Record Whiskey Purchase</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={purchaseForm.date}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>

              <div>
                <Label>Whiskey Product</Label>
                <Select
                  value={purchaseForm.productId}
                  onValueChange={(v) => setPurchaseForm((f) => ({ ...f, productId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select whiskey" />
                  </SelectTrigger>
                  <SelectContent>
                    {whiskeys.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Bottles Purchased</Label>
                <Input
                  type="number"
                  min="1"
                  value={purchaseForm.bottles}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, bottles: e.target.value }))}
                />
              </div>

              <div>
                <Label>Cost Per Bottle (ETB)</Label>
                <Input
                  type="number"
                  min="0"
                  value={purchaseForm.costPerBottle}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, costPerBottle: e.target.value }))}
                />
              </div>

              <div>
                <Label>Supplier</Label>
                <Input
                  value={purchaseForm.supplier}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, supplier: e.target.value }))}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Input
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  setPurchaseForm({
                    productId: "",
                    bottles: "",
                    costPerBottle: "",
                    supplier: "",
                    date: defaultDate,
                    notes: "",
                  })
                }
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
              <Button
                onClick={handlePurchaseSave}
                disabled={!purchaseForm.productId || !purchaseForm.bottles || !purchaseForm.costPerBottle}
              >
                <Save className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
            </div>
          </div>

          <CalendarHistory
            title="Purchase History by Date"
            data={whiskeyPurchases}
            dateKey="date"
            renderDay={(items) => (
              <div className="space-y-2">
                {items.map((p: any) => (
                  <div key={p.id} className="p-2 bg-primary/10 rounded text-xs space-y-1">
                    <p className="font-medium">📦 {p.productName}</p>
                    <p>
                      Bottles: {p.bottles} | Cost/Bottle: ETB {p.costPerBottle.toLocaleString()}
                    </p>
                    <p className="font-semibold">Total: ETB {p.totalAmount.toLocaleString()}</p>
                    <p>Supplier: {p.supplier || "-"}</p>
                    {p.notes && <p className="text-muted-foreground">Notes: {p.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          />

          <div className="kpi-card">
            <h3 className="text-sm font-semibold font-heading mb-3">All Purchase Records</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Bottles</th>
                    <th>Cost/Bottle</th>
                    <th>Total</th>
                    <th>Supplier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {whiskeyPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted-foreground py-4">
                        No purchases yet
                      </td>
                    </tr>
                  ) : (
                    whiskeyPurchases.slice().reverse().map((p) => (
                      <tr key={p.id}>
                        <td>{p.date}</td>
                        <td className="font-medium">{p.productName}</td>
                        <td>{p.bottles}</td>
                        <td>ETB {p.costPerBottle.toLocaleString()}</td>
                        <td className="font-medium">ETB {p.totalAmount.toLocaleString()}</td>
                        <td>{p.supplier || "-"}</td>
                        <td>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditPurchase(p)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openDeletePurchaseConfirm(p.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarHistory
            title="Whiskey Calendar History"
            data={[
              ...whiskeySales.map((s) => ({ ...s, _type: "sale" as const })),
              ...whiskeyPurchases.map((p) => ({ ...p, _type: "purchase" as const })),
            ]}
            dateKey="date"
            renderDay={(items) => (
              <div className="space-y-2">
                {items
                  .filter((i: any) => i._type === "sale")
                  .map((s: any) => (
                    <div key={s.id} className="p-2 bg-muted/50 rounded text-xs space-y-1">
                      <p className="font-medium">{s.productName}</p>
                      <p>Bottles: {s.bottlesSold} | CC: {s.ccSold} | Extra: {s.extraCcSold}</p>
                      <p className="text-success">
                        Revenue: ETB {s.total.toLocaleString()} | Profit: ETB {s.profit.toLocaleString()}
                      </p>
                    </div>
                  ))}

                {items
                  .filter((i: any) => i._type === "purchase")
                  .map((p: any) => (
                    <div key={p.id} className="p-2 bg-primary/10 rounded text-xs space-y-1">
                      <p className="font-medium">📦 {p.productName}</p>
                      <p>Bottles: {p.bottles} | Cost: ETB {p.totalAmount.toLocaleString()}</p>
                      <p>Supplier: {p.supplier || "-"}</p>
                    </div>
                  ))}

                {items.length === 0 && <p className="text-xs text-muted-foreground">No activity</p>}
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="report" className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2 items-center">
            {(["all", "daily", "weekly", "monthly", "custom"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={reportFilter === f ? "default" : "outline"}
                onClick={() => setReportFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}

            {reportFilter === "custom" && (
              <div className="flex gap-2 items-center ml-2">
                <Input
                  type="date"
                  className="w-36 h-8 text-xs"
                  value={reportDateFrom}
                  onChange={(e) => setReportDateFrom(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  className="w-36 h-8 text-xs"
                  value={reportDateTo}
                  onChange={(e) => setReportDateTo(e.target.value)}
                />
              </div>
            )}

            <Button size="sm" onClick={handleSaveReportSnapshot}>
              Save Report
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="kpi-card">
              <p className="text-xs text-muted-foreground">Bottles Purchased</p>
              <p className="text-xl font-bold font-heading mt-1">{reportKPI.totalPurchased}</p>
            </div>
            <div className="kpi-card">
              <p className="text-xs text-muted-foreground">Bottles Sold</p>
              <p className="text-xl font-bold font-heading mt-1">{reportKPI.totalBottlesSold}</p>
            </div>
            <div className="kpi-card">
              <p className="text-xs text-muted-foreground">CC Sold</p>
              <p className="text-xl font-bold font-heading mt-1">{reportKPI.totalCcSold}</p>
            </div>
            <div className="kpi-card">
              <p className="text-xs text-muted-foreground">Extra CC Sold</p>
              <p className="text-xl font-bold font-heading mt-1">{reportKPI.totalExtraCc}</p>
            </div>
            <div className="kpi-card">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-xl font-bold font-heading mt-1">
                ETB {reportKPI.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="kpi-card">
              <p className="text-xs text-muted-foreground">Purchase Cost</p>
              <p className="text-xl font-bold font-heading mt-1">
                ETB {reportKPI.totalPurchaseCost.toLocaleString()}
              </p>
            </div>
            <div className="kpi-card">
              <p className="text-xs text-muted-foreground">Sales Cost</p>
              <p className="text-xl font-bold font-heading mt-1">
                ETB {reportKPI.totalCost.toLocaleString()}
              </p>
            </div>
            <div className="kpi-card">
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className="text-xl font-bold font-heading mt-1 text-success">
                ETB {reportKPI.totalProfit.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="kpi-card">
            <h3 className="text-sm font-semibold font-heading mb-3">Per Whiskey Type Summary</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Whiskey</th>
                    <th>Full Left</th>
                    <th>Open Bottle</th>
                    <th>Bottles Sold</th>
                    <th>CC Sold</th>
                    <th>Extra CC</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {whiskeys.map((w) => {
                    const s = getBottleStatus(w);
                    return (
                      <tr key={w.id}>
                        <td className="font-medium">{w.name}</td>
                        <td>{s.fullBottlesLeft}</td>
                        <td>{s.isOpenBottle ? `${s.remainingInOpenBottle} cc` : "-"}</td>
                        <td>{s.totalBottlesSold}</td>
                        <td>{s.totalCcSold}</td>
                        <td>{s.totalExtraCcSold}</td>
                        <td className="font-medium">ETB {s.totalRevenue.toLocaleString()}</td>
                        <td>ETB {s.totalCost.toLocaleString()}</td>
                        <td className="text-success">ETB {s.totalProfit.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="kpi-card">
            <h3 className="text-sm font-semibold font-heading mb-3">Saved Report Snapshots</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Bottles Purchased</th>
                    <th>Bottles Sold</th>
                    <th>CC Sold</th>
                    <th>Revenue</th>
                    <th>Sales Cost</th>
                    <th>Profit</th>
                    <th>Saved By</th>
                  </tr>
                </thead>
                <tbody>
                  {savedReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-muted-foreground py-4">
                        No saved reports yet
                      </td>
                    </tr>
                  ) : (
                    savedReports.map((r) => (
                      <tr key={r.id}>
                        <td>{r.report_date}</td>
                        <td className="capitalize">{r.report_type}</td>
                        <td>{Number(r.bottles_purchased || 0).toLocaleString()}</td>
                        <td>{Number(r.bottles_sold || 0).toLocaleString()}</td>
                        <td>{Number(r.cc_sold || 0).toLocaleString()}</td>
                        <td>ETB {Number(r.revenue || 0).toLocaleString()}</td>
                        <td>ETB {Number(r.sales_cost || 0).toLocaleString()}</td>
                        <td className="text-success">ETB {Number(r.profit || 0).toLocaleString()}</td>
                        <td>{r.saved_by || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Add Whiskey Type</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 mt-4">
            <div>
              <Label>Whiskey Name</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Black Label"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cost Per Bottle (ETB)</Label>
                <Input
                  type="number"
                  value={addForm.costPrice}
                  onChange={(e) => setAddForm((f) => ({ ...f, costPrice: e.target.value }))}
                />
              </div>
              <div>
                <Label>Sell Price Per Bottle</Label>
                <Input
                  type="number"
                  value={addForm.sellingPrice}
                  onChange={(e) => setAddForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                />
              </div>
              <div>
                <Label>Sell Price Per CC</Label>
                <Input
                  type="number"
                  value={addForm.sellPricePerCc}
                  onChange={(e) => setAddForm((f) => ({ ...f, sellPricePerCc: e.target.value }))}
                />
              </div>
              <div>
                <Label>CC Per Bottle</Label>
                <Input
                  type="number"
                  value={addForm.ccPerBottle}
                  onChange={(e) => setAddForm((f) => ({ ...f, ccPerBottle: e.target.value }))}
                />
              </div>
              <div>
                <Label>Initial Bottles</Label>
                <Input
                  type="number"
                  value={addForm.bottles}
                  onChange={(e) => setAddForm((f) => ({ ...f, bottles: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddWhiskey}
              disabled={!addForm.name || !addForm.costPrice || !addForm.sellingPrice}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Whiskey Type</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 mt-4">
            <div>
              <Label>Whiskey Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cost Per Bottle</Label>
                <Input
                  type="number"
                  value={editForm.costPrice}
                  onChange={(e) => setEditForm((f) => ({ ...f, costPrice: e.target.value }))}
                />
              </div>
              <div>
                <Label>Sell Price Per Bottle</Label>
                <Input
                  type="number"
                  value={editForm.sellingPrice}
                  onChange={(e) => setEditForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                />
              </div>
              <div>
                <Label>Sell Price Per CC</Label>
                <Input
                  type="number"
                  value={editForm.sellPricePerCc}
                  onChange={(e) => setEditForm((f) => ({ ...f, sellPricePerCc: e.target.value }))}
                />
              </div>
              <div>
                <Label>CC Per Bottle</Label>
                <Input
                  type="number"
                  value={editForm.ccPerBottle}
                  onChange={(e) => setEditForm((f) => ({ ...f, ccPerBottle: e.target.value }))}
                />
              </div>
              <div>
                <Label>Current Full Bottle Quantity</Label>
                <Input
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use this only to correct wrong stock values manually.
                </p>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, status: v as "active" | "inactive" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Delete whiskey type?</DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-muted-foreground mt-4">
            This will remove the whiskey type and its related sales and purchases.
          </p>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWhiskey}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saleEditOpen} onOpenChange={setSaleEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Whiskey Sale</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 mt-4">
            <div>
              <Label>Sale Date</Label>
              <Input
                type="date"
                value={editSaleForm.saleDate}
                onChange={(e) => setEditSaleForm((f) => ({ ...f, saleDate: e.target.value }))}
              />
            </div>

            <div>
              <Label>Whiskey Product</Label>
              <Select
                value={editSaleForm.productId}
                onValueChange={(v) => setEditSaleForm((f) => ({ ...f, productId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select whiskey" />
                </SelectTrigger>
                <SelectContent>
                  {whiskeys.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Bottles Sold</Label>
                <Input
                  type="number"
                  min="0"
                  value={editSaleForm.bottlesSold}
                  onChange={(e) => setEditSaleForm((f) => ({ ...f, bottlesSold: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>CC Sold</Label>
                <Input
                  type="number"
                  min="0"
                  value={editSaleForm.ccSold}
                  onChange={(e) => setEditSaleForm((f) => ({ ...f, ccSold: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Extra CC Sold</Label>
                <Input
                  type="number"
                  min="0"
                  value={editSaleForm.extraCcSold}
                  onChange={(e) => setEditSaleForm((f) => ({ ...f, extraCcSold: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label>Cashier</Label>
              <Input
                value={editSaleForm.cashier}
                onChange={(e) => setEditSaleForm((f) => ({ ...f, cashier: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={editSaleForm.notes}
                onChange={(e) => setEditSaleForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSaleEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSaleSave}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saleDeleteOpen} onOpenChange={setSaleDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Delete whiskey sale?</DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-muted-foreground mt-4">
            This will remove the whiskey sale record and restore any bottle quantities.
          </p>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setSaleDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSale}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={purchaseEditOpen} onOpenChange={setPurchaseEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Whiskey Purchase</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 mt-4">
            <div>
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={editPurchaseForm.purchaseDate}
                onChange={(e) => setEditPurchaseForm((f) => ({ ...f, purchaseDate: e.target.value }))}
              />
            </div>

            <div>
              <Label>Whiskey Product</Label>
              <Select
                value={editPurchaseForm.productId}
                onValueChange={(v) => setEditPurchaseForm((f) => ({ ...f, productId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select whiskey" />
                </SelectTrigger>
                <SelectContent>
                  {whiskeys.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bottles Purchased</Label>
                <Input
                  type="number"
                  min="1"
                  value={editPurchaseForm.bottles}
                  onChange={(e) => setEditPurchaseForm((f) => ({ ...f, bottles: e.target.value }))}
                />
              </div>
              <div>
                <Label>Cost Per Bottle (ETB)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editPurchaseForm.costPerBottle}
                  onChange={(e) => setEditPurchaseForm((f) => ({ ...f, costPerBottle: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Supplier</Label>
              <Input
                value={editPurchaseForm.supplier}
                onChange={(e) => setEditPurchaseForm((f) => ({ ...f, supplier: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={editPurchaseForm.notes}
                onChange={(e) => setEditPurchaseForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPurchaseEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPurchaseSave}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={purchaseDeleteOpen} onOpenChange={setPurchaseDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Delete whiskey purchase?</DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-muted-foreground mt-4">
            This will remove the whiskey purchase record and update bottle quantities.
          </p>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setPurchaseDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePurchase}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}