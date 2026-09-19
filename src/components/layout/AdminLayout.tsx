import React, { useState, useRef, useEffect } from "react";
import {
  NavLink,
  Outlet,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  Film,
  ShoppingCart,
  Boxes,
  Tag,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  Sliders,
  ClipboardList,
  FolderTree,
  Mail,
  Users,
  ChevronRight,
  ChevronDown,
  Shield,
} from "lucide-react";
import { cn } from "../../lib/formatters";
import { useAdminAuth } from "../../auth/AdminAuth";
import { ToastContainer } from "../common/Toast";
import { adminSchemaScope } from "../../lib/adminSchema";
import { adminApi } from "../../lib/adminApi";
import { useRealtimeStatus } from "../../lib/realtime";
import { useQuery } from "@tanstack/react-query";
import { AdminDataState } from "../admin/AdminDataState";
import { AdminNotificationMenu } from "../admin/AdminNotificationMenu";
import { UserAvatar } from "../common/UserAvatar";
import { useUiStore } from "../../stores/useUiStore";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: Film },
      { label: "Categories", href: "/admin/taxonomy", icon: FolderTree },
      { label: "Inventory", href: "/admin/inventory", icon: Boxes },
    ],
  },
  {
    title: "Sales & Orders",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { label: "Promotions", href: "/admin/promotions", icon: Tag },
      { label: "Customer Enquiries", href: "/admin/support", icon: Mail },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Users & Access", href: "/admin/users", icon: Users },
      { label: "Store Settings", href: "/admin/settings", icon: Sliders },
      { label: "Audit Log", href: "/admin/activity", icon: ClipboardList },
    ],
  },
];

// Build a flat map of href → label for breadcrumb resolution
const ROUTE_LABELS: Record<string, string> = {};
NAV_GROUPS.forEach((g) =>
  g.items.forEach((i) => (ROUTE_LABELS[i.href] = i.label)),
);

function useBreadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean); // ['admin', 'products']
  const crumbs: { label: string; href: string }[] = [];

  if (segments[0] === "admin") {
    crumbs.push({ label: "Admin", href: "/admin" });
    if (segments[1]) {
      const href = `/${segments.slice(0, 2).join("/")}`;
      crumbs.push({ label: ROUTE_LABELS[href] || segments[1], href });
    }
  }
  return crumbs;
}

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const { isConnected: wsConnected } = useRealtimeStatus();
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumb();
  const { pathname } = useLocation();
  const schemaScope = adminSchemaScope(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dismissedSchemaWarning, setDismissedSchemaWarning] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [userDropdownOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setUserDropdownOpen(false);
  }, [pathname]);

  const schemaQuery = useQuery({
    queryKey: ["admin", "schema-health", schemaScope, user?.id],
    queryFn: () => adminApi.checkSchema(schemaScope),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      useUiStore
        .getState()
        .addToast(
          error instanceof Error
            ? error.message
            : "Sign out failed. Please retry.",
          "error",
        );
    }
  };

  const SidebarNav = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items
              .filter(
                (item) =>
                  item.href !== "/admin/users" || user?.role === "admin",
              )
              .map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={onLinkClick}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-all duration-150",
                      isActive
                        ? "bg-slate-900 text-white font-semibold shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-700",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-600 border border-slate-200/60",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      {/* ── Clean White Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white md:flex">
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 shadow-xs ring-1 ring-slate-900/10 transition-transform group-hover:scale-105 overflow-hidden p-1">
              <img
                src="/brand/logo-dark-theme.png"
                alt="DVDs Zone"
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-slate-900 tracking-tight">
                  DVDs Zone
                </p>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200/60">
                  UK
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Admin Console
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <SidebarNav />

        {/* Bottom User Strip */}
        <div className="border-t border-slate-100 p-3 bg-slate-50/40">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-2.5 shadow-2xs">
            <UserAvatar size="sm" name={user?.fullName} email={user?.email} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900">
                {user?.fullName || "Admin User"}
              </p>
              <p className="truncate text-[11px] text-slate-400 font-medium">
                {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Area (Clean White Header + Content) ──────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Clean White Top Header Bar */}
        <header className="relative z-30 flex h-16 min-w-0 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6">
          {/* Left: mobile menu trigger + breadcrumbs */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 md:hidden cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumb"
              className="hidden min-w-0 items-center gap-1.5 sm:flex"
            >
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.href}>
                  {i > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  )}
                  {i === breadcrumbs.length - 1 ? (
                    <span className="max-w-[34vw] truncate text-xs sm:text-sm font-bold text-slate-900">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.href}
                      className="max-w-[22vw] truncate text-xs sm:text-sm font-medium text-slate-400 transition-colors hover:text-slate-800"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: Live status, View store, Notifications, User profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Sync Status */}
            <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs text-slate-600 lg:flex shadow-2xs">
              <span className="relative flex h-2 w-2">
                {wsConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-2 w-2 rounded-full",
                    wsConnected ? "bg-emerald-500" : "bg-slate-400",
                  )}
                />
              </span>
              <span className="text-[11px] font-medium text-slate-600">
                {wsConnected ? "Live Sync Active" : "Live Sync Paused"}
              </span>
            </div>

            <div className="mx-0.5 hidden h-4 w-px bg-slate-200 lg:block" />

            {/* View Storefront */}
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 sm:flex"
            >
              <span>View Storefront</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>

            {/* Clean White Store Notifications Dropdown */}
            <AdminNotificationMenu />

            {/* Interactive Admin User Profile Dropdown */}
            <div className="relative border-l border-slate-200 pl-2 sm:pl-3" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={cn(
                  "flex items-center gap-2 rounded-xl p-1.5 transition-all duration-150 cursor-pointer border",
                  userDropdownOpen
                    ? "bg-slate-100 border-slate-300 shadow-xs"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                )}
                aria-expanded={userDropdownOpen}
                aria-label="Admin user menu"
              >
                <UserAvatar size="sm" name={user?.fullName} email={user?.email} />
                <div className="hidden flex-col text-left md:flex min-w-0">
                  <span className="max-w-[120px] truncate text-xs font-bold text-slate-900 leading-tight">
                    {user?.fullName || "Admin"}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {user?.role || "staff"}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                    userDropdownOpen && "rotate-180 text-slate-800"
                  )}
                />
              </button>

              {/* Account Dropdown Menu Popover */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200/90 bg-white p-2 text-slate-900 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* User info header */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 mb-1">
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {user?.fullName || "Admin User"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                      {user?.email}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 text-slate-700 uppercase tracking-wide">
                        <Shield className="h-3 w-3 text-slate-500" />
                        {user?.role === "admin" ? "Administrator" : "Store Staff"}
                      </span>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="space-y-0.5 text-xs py-1">
                    <Link
                      to="/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
                        <span>View Live Storefront</span>
                      </div>
                      <span className="text-[10px] text-slate-400">New tab</span>
                    </Link>

                    <Link
                      to="/admin/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium transition-colors"
                    >
                      <Sliders className="h-4 w-4 text-slate-400" />
                      <span>Store Settings</span>
                    </Link>

                    <Link
                      to="/admin/orders"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium transition-colors"
                    >
                      <ShoppingCart className="h-4 w-4 text-slate-400" />
                      <span>Customer Orders</span>
                    </Link>

                    <Link
                      to="/admin/activity"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium transition-colors"
                    >
                      <ClipboardList className="h-4 w-4 text-slate-400" />
                      <span>Audit Activity Log</span>
                    </Link>

                    {user?.role === "admin" && (
                      <Link
                        to="/admin/users"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium transition-colors"
                      >
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>Users &amp; Permissions</span>
                      </Link>
                    )}
                  </div>

                  {/* Sign Out Button */}
                  <div className="pt-1 mt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
          {schemaQuery.error &&
          (schemaQuery.error as any)?.code === "BACKEND_NOT_CONFIGURED" ? (
            <AdminDataState
              loading={schemaQuery.isLoading}
              error={schemaQuery.error}
              onRetry={() => schemaQuery.refetch()}
            />
          ) : (
            <>
              {schemaQuery.error && !dismissedSchemaWarning && (
                <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                    <span>
                      Notice: Some optional database schema items are pending
                      migration. Store features are running smoothly with
                      default values.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedSchemaWarning(true)}
                    className="shrink-0 rounded-md px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <Outlet />
            </>
          )}
        </main>
      </div>

      {/* ── Clean White Mobile Drawer ─────────────────────────────────── */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />

          {/* Drawer panel */}
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,22rem)] max-w-full flex-col border-r border-slate-200 bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
              <div className="flex items-center gap-3">
                <UserAvatar
                  size="sm"
                  name={user?.fullName}
                  email={user?.email}
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {user?.fullName || "Admin"}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarNav onLinkClick={() => setMobileNavOpen(false)} />

            {/* Drawer footer */}
            <div className="border-t border-slate-100 p-4 space-y-2 bg-slate-50/50">
              <Link
                to="/"
                target="_blank"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
              >
                View Storefront
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-50 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Toast Alert Container */}
      <ToastContainer />
    </div>
  );
};

export default AdminLayout;
