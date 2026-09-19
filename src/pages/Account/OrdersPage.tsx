import { formatMoney, countryName } from "../../../shared/commerce.js";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Package,
  ArrowRight,
  Disc,
  Printer,
  Copy,
  Check,
  Search,
  Truck,
  ExternalLink,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import { publicApi } from "../../lib/publicApi";
import { formatGBP, formatDateUK, cn } from "../../lib/formatters";
import { StoreDataState } from "../../components/common/StoreDataState";
import { Button } from "../../components/common/Button";
import { Pagination } from "../../components/common/Pagination";
import { OrderReceiptModal } from "../../components/orders/OrderReceiptModal";
import { OrderStatusStepper } from "../../components/orders/OrderStatusStepper";
import { useCartStore } from "../../stores/useCartStore";
import { useUiStore } from "../../stores/useUiStore";
import { Order, Product } from "../../types";

type FilterTab = "all" | "in_progress" | "delivered" | "awaiting_payment";

export const OrdersPage: React.FC = () => {
  const ordersQuery = useQuery({
    queryKey: ["account", "orders"],
    queryFn: () => publicApi.getMyOrders(),
    retry: false,
  });

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => publicApi.getProducts(),
    staleTime: 5 * 60 * 1000,
  });

  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    (productsQuery.data || []).forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.sku) map.set(p.sku.toLowerCase(), p);
      if (p.title) map.set(p.title.toLowerCase().trim(), p);
    });
    return map;
  }, [productsQuery.data]);

  const addItem = useCartStore((state) => state.addItem);
  const addToast = useUiStore((state) => state.addToast);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const ordersTopRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] =
    useState<Order | null>(null);
  const [expandedStepperOrderId, setExpandedStepperOrderId] = useState<
    string | null
  >(null);

  const orders = ordersQuery.data || [];

  // Reset pagination to first page whenever filter tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Filter & Search computation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === "in_progress") {
        if (!["pending", "processing", "dispatched"].includes(order.status))
          return false;
      } else if (activeTab === "delivered") {
        if (order.status !== "delivered") return false;
      } else if (activeTab === "awaiting_payment") {
        if (order.payment_status !== "awaiting_payment") return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesNumber = order.order_number?.toLowerCase().includes(q);
        const matchesTracking = order.tracking_number
          ?.toLowerCase()
          .includes(q);
        const matchesItem = (order.items || []).some(
          (item) =>
            item.product_title?.toLowerCase().includes(q) ||
            item.product_sku?.toLowerCase().includes(q),
        );
        const matchesName = order.shipping_address?.full_name
          ?.toLowerCase()
          .includes(q);
        return matchesNumber || matchesTracking || matchesItem || matchesName;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Paginated slice of filtered orders
  const paginatedOrders = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (ordersTopRef.current) {
      ordersTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Quick stats
  const stats = useMemo(() => {
    const total = orders.length;
    const active = orders.filter((o) =>
      ["pending", "processing", "dispatched"].includes(o.status),
    ).length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    return { total, active, delivered };
  }, [orders]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    addToast(`${label} copied to clipboard!`, "info");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleReorder = (order: Order) => {
    const items = order.items || [];
    if (items.length === 0) {
      addToast("No items available to reorder.", "error");
      return;
    }

    items.forEach((item) => {
      const matched =
        (item.product_id ? productsMap.get(item.product_id) : undefined) ||
        (item.product_sku
          ? productsMap.get(item.product_sku.toLowerCase())
          : undefined) ||
        (item.product_title
          ? productsMap.get(item.product_title.toLowerCase().trim())
          : undefined);

      addItem(
        {
          id: item.product_id || matched?.id || item.id,
          sku: item.product_sku || matched?.sku || "ZDV-DVD",
          title: item.product_title,
          slug: (item as any).slug || matched?.slug || "dvd-edition",
          description: item.product_title,
          short_description: null,
          category_id: matched?.category_id || null,
          price: item.unit_price,
          compare_at_price: null,
          format: matched?.format || "DVD",
          condition: "New",
          release_year: matched?.release_year || 2024,
          runtime_minutes: matched?.runtime_minutes || 120,
          age_rating: matched?.age_rating || "15",
          region_code: matched?.region_code || "2",
          language: matched?.language || "English",
          subtitles: matched?.subtitles || "English SDH",
          stock_quantity: matched?.stock_quantity || 10,
          cover_image_url:
            item.cover_image_url ||
            (item as any).product_snapshot?.cover_image_url ||
            (item as any).product?.cover_image_url ||
            matched?.cover_image_url ||
            "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400",
          status: "active",
          is_featured: false,
          is_new_release: false,
          is_best_seller: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        item.quantity || 1,
      );
    });

    addToast(
      `Added ${items.length} titles from ${order.order_number} to your basket!`,
      "success",
    );
  };

  if (ordersQuery.isLoading || ordersQuery.error) {
    return (
      <StoreDataState
        loading={ordersQuery.isLoading}
        error={ordersQuery.error}
        retry={() => ordersQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Summary stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg text-dark">
            Order History
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Track deliveries, print official receipts, and reorder previous
            physical media purchases.
          </p>
        </div>

        {/* Quick KPI pills */}
        {orders.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
              Total: {stats.total}
            </span>
            {stats.active > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-brand-blue font-semibold border border-blue-200">
                In Transit: {stats.active}
              </span>
            )}
            {stats.delivered > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                Delivered: {stats.delivered}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Status Tabs — Responsive 2x2 grid on mobile fitting one screen width without horizontal slider, flex row on sm+ */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-2 sm:py-1.5 rounded-md transition-all text-center justify-center cursor-pointer text-[11px] sm:text-xs ${
                activeTab === "all"
                  ? "bg-white text-dark shadow-2xs font-bold"
                  : "text-gray-600 hover:text-dark"
              }`}
            >
              All Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("in_progress")}
              className={`px-2.5 py-2 sm:py-1.5 rounded-md transition-all text-center justify-center cursor-pointer text-[11px] sm:text-xs ${
                activeTab === "in_progress"
                  ? "bg-white text-dark shadow-2xs font-bold"
                  : "text-gray-600 hover:text-dark"
              }`}
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("delivered")}
              className={`px-2.5 py-2 sm:py-1.5 rounded-md transition-all text-center justify-center cursor-pointer text-[11px] sm:text-xs ${
                activeTab === "delivered"
                  ? "bg-white text-dark shadow-2xs font-bold"
                  : "text-gray-600 hover:text-dark"
              }`}
            >
              Delivered
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("awaiting_payment")}
              className={`px-2.5 py-2 sm:py-1.5 rounded-md transition-all text-center justify-center cursor-pointer text-[11px] sm:text-xs ${
                activeTab === "awaiting_payment"
                  ? "bg-white text-dark shadow-2xs font-bold"
                  : "text-gray-600 hover:text-dark"
              }`}
            >
              Awaiting Payment
            </button>
          </div>

          {/* Search Input */}
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by order # or DVD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
        </div>
      )}

      {/* Orders List / Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center bg-gray-50/50">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center mx-auto mb-3">
            <Package className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-dark">
            {orders.length === 0
              ? "No orders placed yet"
              : "No matching orders found"}
          </p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            {orders.length === 0
              ? "When you order DVDs from our archival store, tracking references and tax receipts will appear here."
              : "Try clearing your search or switching filter tabs to see other purchases."}
          </p>
          <div className="mt-5">
            {orders.length === 0 ? (
              <Link to="/shop">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Disc className="h-3.5 w-3.5" />
                  <span>Browse DVD Catalogue</span>
                </Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div ref={ordersTopRef} className="scroll-mt-6" />
          {paginatedOrders.map((order) => {
            const items = order.items || [];
            const isDelivered = order.status === "delivered";
            const isDispatched = order.status === "dispatched";
            const isAwaitingPayment =
              order.payment_method === "bank_transfer" &&
              order.payment_status === "awaiting_payment";
            const isStepperOpen = expandedStepperOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                {/* Enterprise Header Ribbon: 4-Column Metadata + Status */}
                <div className="bg-gray-50/90 px-5 sm:px-6 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                  {/* Left: Key Order Metadata */}
                  <div className="flex flex-wrap items-center gap-5 sm:gap-8">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">
                        Order Placed
                      </span>
                      <span className="font-semibold text-dark text-xs sm:text-sm">
                        {formatDateUK(order.created_at)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">
                        Total
                      </span>
                      <span className="font-mono font-black text-dark text-xs sm:text-sm">
                        {formatMoney(order.total_amount, order.currency)}
                      </span>
                    </div>

                    {order.shipping_address?.full_name && (
                      <div className="hidden sm:block">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">
                          Dispatched To
                        </span>
                        <span
                          className="font-semibold text-dark text-xs sm:text-sm truncate max-w-[140px] block"
                          title={order.shipping_address.full_name}
                        >
                          {order.shipping_address.full_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Order # & Status Badge */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-2xs">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">
                        Order #
                      </span>
                      <span className="font-mono font-bold text-dark text-xs">
                        {order.order_number}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(order.order_number, order.order_number)
                        }
                        className="text-gray-400 hover:text-dark transition-colors p-0.5 cursor-pointer ml-0.5"
                        title="Copy order reference"
                        aria-label="Copy order reference"
                      >
                        {copiedId === order.order_number ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-2xs ${
                        isDelivered
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : isDispatched
                            ? "bg-blue-50 text-brand-blue border-blue-200"
                            : order.status === "cancelled"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : isAwaitingPayment
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {isDelivered && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isDispatched && <Truck className="w-3.5 h-3.5" />}
                      {isAwaitingPayment && <Clock className="w-3.5 h-3.5" />}
                      {order.status === "cancelled" && (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Awaiting Bank Transfer Notice (if pending proof) */}
                {isAwaitingPayment && (
                  <div className="bg-amber-50/80 border-b border-amber-200/90 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-amber-900">
                      <Clock size={16} className="text-amber-600 shrink-0" />
                      <span>
                        <strong>Action Required:</strong> Awaiting company bank
                        transfer payment. Transfer and upload proof to start
                        dispatch.
                      </span>
                    </div>
                    <Link
                      to={`/order-success/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white border border-amber-600 shadow-2xs transition-all cursor-pointer"
                    >
                      <span>Upload Transfer Proof</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                )}

                {/* Royal Mail Tracking Strip (if dispatched) */}
                {order.tracking_number && (
                  <div className="bg-blue-50/50 border-b border-blue-100/90 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-brand-blue flex items-center justify-center shrink-0 shadow-2xs">
                        <Truck size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] text-gray-500 font-medium block">
                          {order.shipping_carrier || "Royal Mail Tracked 24/48"}
                        </span>
                        <span className="font-mono font-extrabold text-dark text-xs sm:text-sm tracking-wide">
                          {order.tracking_number}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(order.tracking_number!, "Tracking Number")
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-300 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Copy size={12} />
                        <span>Copy</span>
                      </button>
                      <a
                        href={`https://www.royalmail.com/track-your-item#/tracking-results/${order.tracking_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs transition-all cursor-pointer"
                      >
                        <span>Track on Royal Mail</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Main Body: Line Items & Logistics */}
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Purchased DVD Media Items */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="divide-y divide-gray-100">
                      {items.map((item, idx) => {
                        const matchedProduct =
                          (item.product_id
                            ? productsMap.get(item.product_id)
                            : undefined) ||
                          (item.product_sku
                            ? productsMap.get(item.product_sku.toLowerCase())
                            : undefined) ||
                          (item.product_title
                            ? productsMap.get(
                                item.product_title.toLowerCase().trim(),
                              )
                            : undefined);

                        const coverUrl =
                          item.cover_image_url ||
                          (item as any).product_snapshot?.cover_image_url ||
                          (item as any).product?.cover_image_url ||
                          matchedProduct?.cover_image_url;

                        return (
                          <div
                            key={item.id || idx}
                            className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-4"
                          >
                            {/* Cinematic Poster Thumbnail */}
                            <div className="w-14 h-20 sm:w-16 sm:h-22 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs relative">
                              {coverUrl ? (
                                <img
                                  src={coverUrl}
                                  alt={item.product_title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const fb =
                                      e.currentTarget.parentElement?.querySelector(
                                        ".disc-fallback",
                                      );
                                    if (fb) fb.classList.remove("hidden");
                                  }}
                                />
                              ) : null}
                              <div
                                className={cn(
                                  "disc-fallback w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400",
                                  coverUrl ? "hidden" : "flex",
                                )}
                              >
                                <Disc className="w-6 h-6 text-gray-400" />
                                <span className="text-[9px] font-bold text-gray-400 mt-0.5">
                                  DVD
                                </span>
                              </div>
                            </div>

                            {/* Title and Specs */}
                            <div className="min-w-0 flex-1">
                              <h5 className="font-bold text-xs sm:text-sm text-dark leading-snug truncate">
                                {item.product_title}
                              </h5>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1.5 font-medium">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold border border-gray-200/80">
                                  Qty: {item.quantity}
                                </span>
                                {item.product_sku && (
                                  <span className="font-mono text-[11px] text-gray-400">
                                    SKU: {item.product_sku}
                                  </span>
                                )}
                                <span className="text-gray-300">•</span>
                                <span className="font-mono text-[11px] text-gray-500">
                                  {formatMoney(item.unit_price, order.currency)}{" "}
                                  each
                                </span>
                              </div>
                            </div>

                            {/* Line Item Total Price */}
                            <div className="text-right shrink-0">
                              <span className="text-xs sm:text-sm font-mono font-black text-dark">
                                {formatMoney(
                                  item.total_price ||
                                    item.unit_price * item.quantity,
                                  order.currency,
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Destination Info & Action Buttons */}
                  <div className="lg:col-span-4 lg:border-l lg:border-gray-200 lg:pl-6 space-y-4">
                    {/* Destination Address */}
                    {order.shipping_address && (
                      <div className="rounded-xl bg-gray-50/80 border border-gray-200/80 p-3.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5 font-bold text-dark text-xs mb-1.5">
                          <MapPin size={13} className="text-brand-blue" />
                          <span>Delivery Address</span>
                        </div>
                        <p className="font-semibold text-dark">
                          {order.shipping_address.full_name}
                        </p>
                        <p className="truncate">
                          {order.shipping_address.address_line_1}
                        </p>
                        <p className="truncate">
                          {[
                            order.shipping_address.city,
                            order.shipping_address.postcode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <p className="text-gray-400 mt-0.5">
                          {countryName(order.shipping_address.country)}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons Group — Every button has a crisp border */}
                    <div className="space-y-2 pt-1">
                      {/* Primary CTA: View Order Details */}
                      <Link
                        to={`/order-success/${order.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-hover text-white border border-brand-blue shadow-xs transition-all cursor-pointer"
                      >
                        <span>View Order Details &amp; Receipt</span>
                        <ArrowRight size={14} />
                      </Link>

                      {/* Secondary Action Buttons (side-by-side) */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStepperOrderId((prev) =>
                              prev === order.id ? null : order.id,
                            )
                          }
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-300 hover:bg-gray-50 text-dark shadow-2xs transition-all cursor-pointer"
                        >
                          <Package size={13} className="text-gray-500" />
                          <span>
                            {isStepperOpen ? "Hide Track" : "Track Status"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedReceiptOrder(order)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-300 hover:bg-gray-50 text-dark shadow-2xs transition-all cursor-pointer"
                        >
                          <Printer size={13} className="text-gray-500" />
                          <span>Print Receipt</span>
                        </button>
                      </div>

                      {/* Tertiary Action: Buy Again */}
                      <button
                        type="button"
                        onClick={() => handleReorder(order)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        <RotateCcw size={13} className="text-brand-blue" />
                        <span>Buy these items again</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Order Status Stepper */}
                {isStepperOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-4 border-t border-gray-100 bg-gray-50/60">
                    <OrderStatusStepper order={order} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Orders Pagination Controls */}
          {filteredOrders.length > 0 && (
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredOrders.length}
              onPageChange={handlePageChange}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20]}
              itemLabel="orders"
            />
          )}
        </div>
      )}

      {/* Interactive Print Receipt Modal */}
      <OrderReceiptModal
        isOpen={Boolean(selectedReceiptOrder)}
        onClose={() => setSelectedReceiptOrder(null)}
        order={selectedReceiptOrder}
      />
    </div>
  );
};
