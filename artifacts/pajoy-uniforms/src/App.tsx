import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
  type BaseLocationHook,
} from "wouter";
import {
  Activity as ActivityIcon,
  ArrowDownRight,
  ArrowUpRight,
  Barcode,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileText,
  FileImage,
  Gauge,
  GraduationCap,
  Loader2,
  Menu,
  Moon,
  Package,
  Pause,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  Shirt,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  Truck,
  UserRound,
  UsersRound,
  X,
  Sun,
  CheckCircle2,
} from "lucide-react";
import {
  getGetDashboardQueryKey,
  getListBranchesQueryKey,
  getListCustomersQueryKey,
  getListInventoryQueryKey,
  getListOrdersQueryKey,
  getListPaymentsQueryKey,
  getListProductsQueryKey,
  getListActivityQueryKey,
  useCreateCustomer,
  useCreateOrder,
  useCreatePayment,
  useCreateProduct,
  useGetDashboard,
  useListActivity,
  useListBranches,
  useListCustomers,
  useListInventory,
  useListOrders,
  useListPayments,
  useListProducts,
} from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/error-boundary";
import POSCashier from "@/components/pos-cashier";
import InventoryModule from "@/components/inventory-module";
import { AdminReports, CashierReports } from "@/components/reports-module";
import SettingsModule from "@/components/settings-module";
import EmbroideryModule from "@/components/embroidery-module";
import DocumentsModule from "@/components/documents-module";
import DtfModule from "@/components/dtf-module";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import {
  apiUrl,
  authFetch,
  AuthProvider,
  AuthRecoveryPage,
  LoginPage,
  UnauthorizedPage,
  useAuth,
} from "@/auth";
import "./index.css";

const queryClient = new QueryClient();
const useDesktopLocation: BaseLocationHook = () => {
  const [location, setLocation] = useState(
    () => window.location.hash.slice(1) || "/",
  );
  useEffect(() => {
    const onHashChange = () =>
      setLocation(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const navigate = (path: string, options?: { replace?: boolean }) => {
    if (options?.replace) window.history.replaceState(null, "", `#${path}`);
    else window.location.hash = path;
    setLocation(path);
  };
  return [location, navigate];
};
const money = (value = 0) =>
  `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
const selectedShopId = () =>
  sessionStorage.getItem("pajoy-shop-id") || "shop-1";
const shortDate = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
      })
    : "—";
const timeAgo = (value: string) => {
  const mins = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );
  return mins < 60
    ? `${mins}m ago`
    : mins < 1440
      ? `${Math.round(mins / 60)}h ago`
      : `${Math.round(mins / 1440)}d ago`;
};
type PaymentMethodConfig = {
  id: string;
  name: string;
  detailLabel: string;
  detail: string;
};
const defaultPaymentMethods: PaymentMethodConfig[] = [
  {
    id: "mpesa",
    name: "M-Pesa",
    detailLabel: "Till / phone number",
    detail: "",
  },
  {
    id: "cash",
    name: "Cash",
    detailLabel: "Instructions",
    detail: "Pay at the counter",
  },
  {
    id: "bank",
    name: "Bank",
    detailLabel: "Paybill and account number",
    detail: "",
  },
];
const paymentMethodsStorageKey = "pajoy-payment-methods";
const apparelSizes = ["Small", "Medium", "Large", "XL", "XXL", "XXXL"];
const documentSizeOptions = (
  product: { name?: string; category?: string; sizes?: string[] } | undefined,
) => {
  if (!product) return [];
  const productType =
    `${product.name ?? ""} ${product.category ?? ""}`.toLowerCase();
  const usesApparelSizes = /shirt|t-shirt|tshirt|sock|blouse/.test(productType);
  return usesApparelSizes
    ? Array.from(new Set([...(product.sizes ?? []), ...apparelSizes]))
    : (product.sizes ?? []);
};
const getPaymentMethods = (): PaymentMethodConfig[] => {
  try {
    return JSON.parse(
      localStorage.getItem(paymentMethodsStorageKey) ?? "",
    ) as PaymentMethodConfig[];
  } catch {
    return defaultPaymentMethods;
  }
};
const cleanDocumentItems = (summary = "") =>
  summary
    .split(", ")
    .map((line) => {
      const parts = line.split(" / ");
      if (parts.length >= 4) {
        const product = parts[0].toLowerCase();
        const color = parts[1].toLowerCase();
        const size = parts[2].toLowerCase();
        if (product.includes(color) && product.includes(size))
          return [parts[0], ...parts.slice(3)].join(" / ");
      }
      return line;
    })
    .join(", ");

const navItems: {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}[] = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/pos", label: "Point of sale", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Shirt },
  { href: "/schools", label: "Schools & badges", icon: GraduationCap },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/customers", label: "Customers", icon: UsersRound },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/embroidery", label: "Embroidery", icon: Shirt },
  { href: "/dtf", label: "DTF printing", icon: FileImage },
  { href: "/payments", label: "Payments", icon: CircleDollarSign },
  { href: "/payment-methods", label: "Payment methods", icon: CreditCard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))] shadow-sm">
        <Shirt size={21} strokeWidth={2.4} />
      </div>
      <div>
        <div className="font-display text-[17px] font-bold tracking-[-.03em]">
          Pajoy
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.58)]">
          Uniforms ops
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout, can } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchId, setBranchId] = useState("all");
  const [shopId, setShopId] = useState(
    () => sessionStorage.getItem("pajoy-shop-id") || "shop-1",
  );
  const [shops, setShops] = useState<
    { id: string; name: string; active: boolean }[]
  >([]);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("pajoy-dark-mode") === "true",
  );
  const [connected, setConnected] = useState(true);
  const { data: branches = [] } = useListBranches({
    query: { queryKey: getListBranchesQueryKey() },
  });
  useEffect(() => {
    void authFetch("/api/shops")
      .then((response) => (response.ok ? response.json() : []))
      .then(setShops)
      .catch(() => setShops([]));
  }, []);
  useEffect(() => {
    sessionStorage.setItem("pajoy-shop-id", shopId);
  }, [shopId]);
  const currentBranch = branches.find((branch) => branch.id === branchId);
  const title =
    location === "/"
      ? "Operations overview"
      : (navItems.find((item) => item.href === location)?.label ??
        "Operations");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("pajoy-dark-mode", String(darkMode));
  }, [darkMode]);
  useEffect(() => {
    const checkConnection = () =>
      fetch(`${apiUrl()}/api/healthz`, { credentials: "include" })
        .then((response) => setConnected(response.ok))
        .catch(() => setConnected(false));
    checkConnection();
    const timer = window.setInterval(checkConnection, 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const shortcuts: Record<string, string> = {
      F1: "/pos",
      F3: "/customers",
      F4: "/orders",
      F5: "/embroidery",
      F6: "/documents",
      F7: "/pos",
      F8: "/reports",
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      )
        return;
      if (event.key === "Escape") return;
      const destination = shortcuts[event.key];
      if (destination && can(destination.slice(1))) {
        event.preventDefault();
        setLocation(destination);
      }
      if (event.ctrlKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [can, setLocation]);

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] transition-transform duration-200 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="px-2">
          <Logo />
        </div>
        <div className="mt-9 px-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--sidebar-foreground)/.42)]">
          Workspace
        </div>
        <nav className="mt-3 space-y-1">
          {navItems
            .filter(({ href }) => href === "/" || can(href.slice(1)))
            .map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                data-testid={`link-nav-${label.toLowerCase().replaceAll(" ", "-")}`}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition ${location === href ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-sm" : "text-[hsl(var(--sidebar-foreground)/.68)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"}`}
              >
                <Icon size={17} strokeWidth={location === href ? 2.4 : 2} />
                <span>{label}</span>
                {href === "/orders" && (
                  <span className="ml-auto rounded-full bg-[hsl(var(--sidebar-foreground)/.11)] px-1.5 py-0.5 text-[10px]">
                    12
                  </span>
                )}
              </Link>
            ))}
        </nav>
        <div className="mt-auto">
          <div className="mb-4 rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.7)] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.48)]">
                Today
              </span>
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
            </div>
            <div className="mt-2 font-display text-xl font-bold">
              {money(
                currentBranch?.salesToday ??
                  branches.reduce((sum, b) => sum + (b.salesToday ?? 0), 0),
              )}
            </div>
            <div className="mt-1 text-[11px] text-[hsl(var(--sidebar-foreground)/.54)]">
              {currentBranch ? currentBranch.name : "All branches"} sales
            </div>
          </div>
          <Link
            href="/settings"
            data-testid="link-settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-[hsl(var(--sidebar-foreground)/.68)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"
          >
            <Settings2 size={17} />
            Settings
          </Link>
          <div className="mt-4 flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] px-2 pt-4">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--secondary-foreground))]">
              {user?.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">
                {user?.username}
              </div>
              <div className="text-[10px] text-[hsl(var(--sidebar-foreground)/.48)]">
                {user?.role}
                {user?.branchId ? ` · ${user.branchId}` : ""}
              </div>
            </div>
            <button
              aria-label="Logout"
              onClick={() => void logout()}
              className="rounded-lg p-2 text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-[hsl(var(--sidebar-accent))]"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          aria-label="Close menu"
          data-testid="button-close-menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-[hsl(var(--primary)/.35)] md:hidden"
        />
      )}
      <main className="min-h-[100dvh] md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.92)] px-5 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open menu"
              data-testid="button-open-menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 hover:bg-[hsl(var(--muted))] md:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="font-display text-[19px] font-bold tracking-[-.03em]">
                {title}
              </div>
              <div className="hidden text-[11px] text-[hsl(var(--muted-foreground))] sm:block">
                Pajoy Uniforms · {currentBranch?.name ?? "All branches"} ·{" "}
                {user?.registerId ?? "POS-01"}
              </div>
            </div>
            <span
              className={`hidden rounded-full px-2 py-1 text-[10px] font-bold sm:inline-flex ${connected ? "bg-[hsl(145_35%_88%)] text-[hsl(145_37%_30%)]" : "bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]"}`}
            >
              {connected ? "Connected" : "Connection Lost"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <label className="hidden items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 sm:flex">
              <Store
                size={14}
                className="text-[hsl(var(--muted-foreground))]"
              />
              <select
                aria-label="Shop context"
                data-testid="select-shop-context"
                value={shopId}
                onChange={(event) => setShopId(event.target.value)}
                className="bg-transparent text-xs font-semibold outline-none"
              >
                {(shops.length
                  ? shops
                  : [
                      { id: "shop-1", name: "Shop 1", active: true },
                      { id: "shop-2", name: "Shop 2", active: true },
                    ]
                )
                  .filter((shop) => shop.active)
                  .map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
              </select>
              <ChevronDown
                size={13}
                className="text-[hsl(var(--muted-foreground))]"
              />
            </label>
            <label className="hidden items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 sm:flex">
              <Building2
                size={14}
                className="text-[hsl(var(--muted-foreground))]"
              />
              <select
                aria-label="Branch context"
                data-testid="select-branch-context"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className="bg-transparent text-xs font-semibold outline-none"
              >
                <option value="all">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="text-[hsl(var(--muted-foreground))]"
              />
            </label>
            <button
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              data-testid="button-theme-toggle"
              onClick={() => setDarkMode((current) => !current)}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5 hover:bg-[hsl(var(--muted))]"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              aria-label="Notifications"
              data-testid="button-notifications"
              className="relative rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5 hover:bg-[hsl(var(--muted))]"
            >
              <Bell size={16} />
              <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
            </button>
            <div className="hidden h-9 w-9 place-items-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))] sm:grid">
              AM
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] px-5 pb-24 pt-7 md:px-8 md:pb-10">
          {children}
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[66px] items-center justify-around border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] px-2 backdrop-blur-md md:hidden">
        {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            data-testid={`link-mobile-${label.toLowerCase().replaceAll(" ", "-")}`}
            className={`grid w-16 place-items-center gap-1 rounded-lg py-1.5 text-[9px] font-semibold ${location === href ? "text-[hsl(var(--secondary))]" : "text-[hsl(var(--muted-foreground))]"}`}
          >
            <Icon size={18} />
            <span>{label === "Point of sale" ? "POS" : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[hsl(var(--muted))] ${className}`}
    />
  );
}
function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-7 w-32" />
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] p-8 text-center">
      <div className="font-display text-lg font-bold">
        The workspace could not load
      </div>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        Check the connection, then try again.
      </p>
      <button
        data-testid="button-retry"
        onClick={retry}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]"
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </div>
  );
}
function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-6 py-12 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--secondary))]">
        <Package size={19} />
      </div>
      <div className="mt-3 font-display text-base font-bold">{title}</div>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
        {detail}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-xs)] ${className}`}
    >
      {children}
    </section>
  );
}
function PageIntro({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--secondary))]">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
          {eyebrow}
        </div>
        <h1 className="font-display text-[28px] font-bold tracking-[-.045em] md:text-[34px]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-[hsl(var(--muted-foreground))]">
          {detail}
        </p>
      </div>
      {action}
    </div>
  );
}
function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
  testId,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  testId: string;
}) {
  return (
    <button
      type={type}
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${variant === "primary" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--secondary))]" : variant === "secondary" ? "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"}`}
    >
      {children}
    </button>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger" | "teal";
}) {
  const colors = {
    neutral: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
    good: "bg-[hsl(145_35%_88%)] text-[hsl(145_37%_30%)]",
    warn: "bg-[hsl(40_95%_87%)] text-[hsl(30_60%_30%)]",
    danger: "bg-[hsl(4_68%_92%)] text-[hsl(4_58%_39%)]",
    teal: "bg-[hsl(174_37%_88%)] text-[hsl(174_45%_28%)]",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold capitalize ${colors[tone]}`}
    >
      {children}
    </span>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--primary)/.42)] p-4 backdrop-blur-sm">
      <div className="print-document animate-rise max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-2xl md:p-7">
        <div className="flex items-start justify-between">
          <div className="font-display text-xl font-bold">{title}</div>
          <div className="flex items-center gap-1">
            <button
              aria-label="Print document"
              data-testid="button-print-document"
              onClick={() => window.print()}
              className="rounded-lg p-1.5 text-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))]"
            >
              <Printer size={17} />
            </button>
            <button
              aria-label="Close dialog"
              data-testid="button-close-dialog"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  if (name === "badgeLogo")
    return (
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
          {label}
        </span>
        <input
          name={name}
          type="file"
          accept=".emb,image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange(String(reader.result ?? ""));
            reader.readAsDataURL(file);
          }}
          className="block h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-[hsl(var(--muted))] file:px-2 file:py-1 file:text-xs"
        />
      </label>
    );
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <input
        required={
          name !== "email" && name !== "school" && name !== "itemSummary"
        }
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none transition placeholder:text-[hsl(var(--muted-foreground)/.65)] focus:border-[hsl(var(--secondary))] focus:ring-2 focus:ring-[hsl(var(--secondary)/.16)]"
      />
    </label>
  );
}
function SearchBox({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
}) {
  return (
    <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[hsl(var(--muted-foreground))] sm:max-w-sm">
      <Search size={15} />
      <input
        data-testid={testId}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground)/.7)]"
      />
    </label>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "navy",
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tone?: "navy" | "teal" | "gold" | "coral";
  trend?: "up" | "down";
}) {
  const bg = {
    navy: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
    teal: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
    gold: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
    coral: "bg-[hsl(12_68%_61%)] text-[hsl(0_0%_100%)]",
  }[tone];
  return (
    <div
      className={`animate-rise rounded-xl p-5 shadow-[var(--shadow-xs)] ${bg}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[.13em] opacity-70">
          {label}
        </span>
        <span className="rounded-lg bg-white/10 p-2">
          <Icon size={17} />
        </span>
      </div>
      <div className="mt-4 font-display text-[25px] font-bold tracking-[-.04em]">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[11px] opacity-75">
        {trend === "up" ? (
          <ArrowUpRight size={12} />
        ) : trend === "down" ? (
          <ArrowDownRight size={12} />
        ) : null}
        {detail}
      </div>
    </div>
  );
}

function BulkProductModal({ onClose }: { onClose: () => void }) {
  type Row = {
    shopId: string;
    sku: string;
    name: string;
    category: string;
    colors: string;
    sizeStart: string;
    sizeEnd: string;
    school: string;
    schoolLogo: string;
    costPrice: string;
    retailPrice: string;
    wholesalePrice: string;
  };
  const create = useCreateProduct();
  const qc = useQueryClient();
  const [categories, setCategories] = useState([
    "School Uniforms",
    "Clothing",
    "Accessories",
    "Services",
  ]);
  const [newCategory, setNewCategory] = useState("");
  const blank = (previous?: Row): Row => ({
    ...(previous ?? {
      shopId: selectedShopId(),
      sku: "",
      name: "",
      category: categories[0],
      colors: "Navy",
      sizeStart: "28",
      sizeEnd: "36",
      school: "",
      schoolLogo: "",
      costPrice: "0",
      retailPrice: "0",
      wholesalePrice: "0",
    }),
    sku: "",
    name: "",
  });
  const [rows, setRows] = useState<Row[]>([blank()]);
  const update = (index: number, key: keyof Row, value: string) =>
    setRows((old) =>
      old.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );
  const sizes = (row: Row) => {
    const start = Number(row.sizeStart);
    const end = Number(row.sizeEnd);
    return Number.isFinite(start) && end >= start
      ? Array.from({ length: Math.floor((end - start) / 2) + 1 }, (_, index) =>
          String(start + index * 2),
        )
      : [];
  };
  const addCategory = () => {
    const category = newCategory.trim();
    if (category && !categories.includes(category)) {
      setCategories((old) => [...old, category]);
      update(0, "category", category);
      setNewCategory("");
    }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    for (const row of rows)
      await create.mutateAsync({
        data: {
          shopId: row.shopId,
          sku: row.sku,
          name: row.name,
          category: row.category,
          unit: "piece",
          sizes: sizes(row),
          colors: row.colors
            .split(",")
            .map((color) => color.trim())
            .filter(Boolean),
          school: row.school || undefined,
          schoolLogo: row.schoolLogo || undefined,
          costPrice: Number(row.costPrice),
          retailPrice: Number(row.retailPrice),
          wholesalePrice: Number(row.wholesalePrice),
        },
      });
    qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
    onClose();
  };
  const input = (index: number, key: keyof Row, placeholder: string) =>
    key === "shopId" ? (
      <select
        required
        value={rows[index][key]}
        onChange={(event) => update(index, key, event.target.value)}
        aria-label="Product shop"
        className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
      >
        <option value="shop-1">Shop 1</option>
        <option value="shop-2">Shop 2</option>
      </select>
    ) : (
      <input
        required={key === "name"}
        value={rows[index][key]}
        onChange={(event) => update(index, key, event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs outline-none focus:border-[hsl(var(--secondary))]"
      />
    );
  return (
    <Modal title="Bulk add products" onClose={onClose}>
      <form onSubmit={save} className="mt-5 space-y-4">
        <div className="rounded-lg bg-[hsl(var(--muted)/.55)] p-3 text-xs text-[hsl(var(--muted-foreground))]">
          New rows copy the previous row, including school, logo, colors, and
          prices. Sizes are generated every 2 numbers.
        </div>
        <div className="flex gap-2">
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="New category"
            className="h-9 flex-1 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
          />
          <Button testId="button-add-category" onClick={addCategory}>
            <Plus size={13} />
            Add category
          </Button>
        </div>
        <div className="max-h-[48vh] space-y-3 overflow-auto pr-1">
          {rows.map((row, index) => (
            <div
              key={index}
              className="rounded-xl border border-[hsl(var(--border))] p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                  Product {index + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRows((old) =>
                        old.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                    className="text-xs text-[hsl(var(--destructive))]"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {input(index, "name", "Product name")}
                {input(index, "sku", "SKU")}
                <select
                  value={row.category}
                  onChange={(event) =>
                    update(index, "category", event.target.value)
                  }
                  className="h-9 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                {input(index, "school", "School (optional)")}
                {input(index, "schoolLogo", "School logo URL (optional)")}
                {input(index, "colors", "Colors, comma separated")}
                <div className="grid grid-cols-2 gap-2">
                  {input(index, "sizeStart", "Size from")}
                  {input(index, "sizeEnd", "Size to")}
                </div>
                <div className="rounded-lg bg-[hsl(var(--muted)/.55)] px-2 py-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                  Sizes: {sizes(row).join(", ") || "Enter a valid range"}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {input(index, "costPrice", "Cost")}
                  {input(index, "retailPrice", "Retail")}
                  {input(index, "wholesalePrice", "Wholesale")}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-2">
          <Button
            variant="secondary"
            testId="button-add-product-row"
            onClick={() =>
              setRows((old) => [...old, blank(old[old.length - 1])])
            }
          >
            <Plus size={14} />
            Add row
          </Button>
          <Button
            type="submit"
            testId="button-save-bulk-products"
            disabled={create.isPending}
          >
            {create.isPending && <Loader2 size={14} className="animate-spin" />}
            Save {rows.length} products
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SchoolsPage() {
  type BadgeRecord = {
    id: string;
    school: string;
    name: string;
    sku: string;
    stock: number;
    price: number;
    logo: string;
    colors: string[] | string;
  };
  const customers = useListCustomers(undefined, {
    query: { queryKey: getListCustomersQueryKey() },
  });
  const createCustomer = useCreateCustomer();
  const createBadgeProduct = useCreateProduct();
  const schoolShopId = selectedShopId();
  const products = useListProducts({ shopId: schoolShopId }, {
    query: { queryKey: getListProductsQueryKey({ shopId: schoolShopId }) },
  });
  const badgeProducts = useListProducts(
    { category: "Accessories and Badges" },
    {
      query: {
        queryKey: getListProductsQueryKey({
          category: "Accessories and Badges",
        }),
      },
    },
  );
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    phone: "",
    email: "",
    school: "",
    creditLimit: "0",
    uniformProductIds: [] as string[],
  });
  const [badgeForm, setBadgeForm] = useState({
    name: "",
    sku: "",
    colors: "Navy",
    stock: "0",
    price: "0",
    logo: "",
  });
  const [selectedSchool, setSelectedSchool] = useState("");
  const [uniformCategory, setUniformCategory] = useState("All categories");
  const [uniformToAdd, setUniformToAdd] = useState("");
  const [badges, setBadges] = useState<BadgeRecord[]>([]);
  const schools = (customers.data ?? []).filter(
    (customer) => customer.type.toLowerCase() === "school",
  );
  const uniformProducts = (products.data ?? []).filter(
    (product) => product.category !== "Accessories and Badges",
  );
  const uniformCategories = [
    "All categories",
    ...Array.from(new Set(uniformProducts.map((product) => product.category))).sort(),
  ];
  const uniformOptions = uniformProducts.filter(
    (product) => uniformCategory === "All categories" || product.category === uniformCategory,
  );
  const addUniform = () => {
    if (!uniformToAdd || schoolForm.uniformProductIds.includes(uniformToAdd)) return;
    setSchoolForm((old) => ({
      ...old,
      uniformProductIds: [...old.uniformProductIds, uniformToAdd],
    }));
    setUniformToAdd("");
  };
  const saveSchool = (event: FormEvent) => {
    event.preventDefault();
    createCustomer.mutate(
      {
        data: {
          shopId: schoolShopId,
          name: schoolForm.name,
          type: "school",
          phone: schoolForm.phone,
          email: schoolForm.email,
          school: schoolForm.school || schoolForm.name,
          creditLimit: Number(schoolForm.creditLimit),
          uniformProductIds: schoolForm.uniformProductIds,
        },
      },
      {
        onSuccess: () => {
          customers.refetch();
          setSelectedSchool(schoolForm.name);
          setSchoolForm({
            name: "",
            phone: "",
            email: "",
            school: "",
            creditLimit: "0",
            uniformProductIds: [],
          });
        },
      },
    );
  };
  const saveBadge = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSchool) return;
    const colors =
      window
        .prompt(
          "Which product colors use this badge? Separate colors with commas.",
          badgeForm.colors,
        )
        ?.split(",")
        .map((color) => color.trim())
        .filter(Boolean) ?? [];
    if (!colors.length) return;
    createBadgeProduct.mutate(
      {
        data: {
          shopId: selectedShopId(),
          sku: badgeForm.sku,
          name: `${selectedSchool} ${badgeForm.name}`,
          category: "Accessories and Badges",
          unit: "piece",
          sizes: ["Standard"],
          colors,
          school: selectedSchool,
          schoolLogo: badgeForm.logo || undefined,
          badgeName: badgeForm.name,
          badgeSchool: selectedSchool,
          badgeStock: Number(badgeForm.stock),
          badgePrice: Number(badgeForm.price),
          initialStock: Number(badgeForm.stock),
          costPrice: Number(badgeForm.price),
          retailPrice: Number(badgeForm.price),
          wholesalePrice: Number(badgeForm.price),
        },
      },
      {
        onSuccess: () => {
          setBadges((old) => [
            {
              id: `${selectedSchool}-${badgeForm.sku}`,
              school: selectedSchool,
              ...badgeForm,
              colors: colors.join(", "),
              stock: Number(badgeForm.stock),
              price: Number(badgeForm.price),
            },
            ...old,
          ]);
          setBadgeForm({
            name: "",
            sku: "",
            colors: "Navy",
            stock: "0",
            price: "0",
            logo: "",
          });
        },
      },
    );
  };
  const persistedBadges = (badgeProducts.data ?? [])
    .filter((product) => product.school === selectedSchool && product.badgeName)
    .map((product) => ({
      id: product.id,
      school: selectedSchool,
      name: product.badgeName ?? product.name,
      sku: product.sku,
      stock: product.badgeStock ?? 0,
      price: product.badgePrice ?? 0,
      logo: product.schoolLogo ?? "",
      colors: product.colors ?? [],
    }));
  const selectedBadges = [
    ...badges.filter((badge) => badge.school === selectedSchool),
    ...persistedBadges.filter(
      (badge) => !badges.some((local) => local.id === badge.id),
    ),
  ];
  return (
    <div>
      <PageIntro
        eyebrow="School catalogue"
        title="Schools & badges"
        detail="Register each school once, then keep its badge stock and embroidery identity together."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <div className="border-b border-[hsl(var(--border))] px-5 py-4">
            <h2 className="font-display text-base font-bold">
              Create a school
            </h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              School accounts can be selected for institutional orders.
            </p>
          </div>
          <form onSubmit={saveSchool} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field
              label="School name"
              name="schoolName"
              value={schoolForm.name}
              onChange={(value) =>
                setSchoolForm({ ...schoolForm, name: value })
              }
              placeholder="ABC Academy"
            />
            <Field
              label="School code (optional)"
              name="school"
              value={schoolForm.school}
              onChange={(value) =>
                setSchoolForm({ ...schoolForm, school: value })
              }
              placeholder="ABC"
            />
            <Field
              label="Phone"
              name="schoolPhone"
              value={schoolForm.phone}
              onChange={(value) =>
                setSchoolForm({ ...schoolForm, phone: value })
              }
            />
            <Field
              label="Email"
              name="email"
              value={schoolForm.email}
              onChange={(value) =>
                setSchoolForm({ ...schoolForm, email: value })
              }
            />
            <Field
              label="Credit limit"
              name="creditLimit"
              type="number"
              value={schoolForm.creditLimit}
              onChange={(value) =>
                setSchoolForm({ ...schoolForm, creditLimit: value })
              }
            />
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Uniforms required by this school</span>
              <div className="grid gap-2 sm:grid-cols-[.75fr_1.25fr_auto]">
                <select value={uniformCategory} onChange={(event) => { setUniformCategory(event.target.value); setUniformToAdd(""); }} className="h-10 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm" disabled={!uniformProducts.length}>
                  {uniformCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
                <select value={uniformToAdd} onChange={(event) => setUniformToAdd(event.target.value)} className="h-10 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm" disabled={!uniformOptions.length}>
                  <option value="">Select a uniform</option>
                  {uniformOptions.filter((product) => !schoolForm.uniformProductIds.includes(product.id)).map((product) => <option key={product.id} value={product.id}>{product.name} ({product.category})</option>)}
                </select>
                <Button type="button" variant="secondary" testId="button-add-school-uniform" onClick={addUniform} disabled={!uniformToAdd}><Plus size={14} />Add</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-[hsl(var(--border))] p-3">
                {schoolForm.uniformProductIds.map((productId) => {
                  const product = uniformProducts.find((item) => item.id === productId);
                  if (!product) return null;
                  return <span key={product.id} className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--muted))] px-2.5 py-1.5 text-xs font-semibold">{product.name}<button type="button" aria-label={`Remove ${product.name}`} onClick={() => setSchoolForm((old) => ({ ...old, uniformProductIds: old.uniformProductIds.filter((id) => id !== product.id) }))} className="text-[hsl(var(--destructive))]"><X size={13} /></button></span>;
                })}
                {!schoolForm.uniformProductIds.length && <span className="text-xs text-[hsl(var(--muted-foreground))]">Choose a category, then select uniforms from that category.</span>}
                {!uniformProducts.length && <span className="text-xs text-[hsl(var(--muted-foreground))]">Add products first, then assign them here.</span>}
              </div>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                testId="button-save-school"
                disabled={createCustomer.isPending}
              >
                <Plus size={14} />
                Save school
              </Button>
            </div>
          </form>
        </Panel>
        <Panel>
          <div className="border-b border-[hsl(var(--border))] px-5 py-4">
            <h2 className="font-display text-base font-bold">
              School badge register
            </h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              A badge can only be assigned to the school that owns it.
            </p>
          </div>
          <form onSubmit={saveBadge} className="space-y-4 p-5">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                Select school
              </span>
              <select
                required
                value={selectedSchool}
                onChange={(event) => setSelectedSchool(event.target.value)}
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
              >
                <option value="">Choose a school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.name}>
                    {school.name}
                  </option>
                ))}
                {!schools.length && (
                  <option disabled>Create a school first</option>
                )}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Badge name"
                name="badgeName"
                value={badgeForm.name}
                onChange={(value) =>
                  setBadgeForm({ ...badgeForm, name: value })
                }
                placeholder="ABC Academy crest"
              />
              <Field
                label="Badge SKU"
                name="badgeSku"
                value={badgeForm.sku}
                onChange={(value) => setBadgeForm({ ...badgeForm, sku: value })}
                placeholder="BDG-ABC"
              />
              <Field
                label="Shop stock"
                name="badgeStock"
                type="number"
                value={badgeForm.stock}
                onChange={(value) =>
                  setBadgeForm({ ...badgeForm, stock: value })
                }
              />
              <Field
                label="Embroidery price"
                name="badgePrice"
                type="number"
                value={badgeForm.price}
                onChange={(value) =>
                  setBadgeForm({ ...badgeForm, price: value })
                }
              />
              <Field
                label="Badge/logo image URL"
                name="badgeLogo"
                value={badgeForm.logo}
                onChange={(value) =>
                  setBadgeForm({ ...badgeForm, logo: value })
                }
              />
            </div>
            <Button
              type="submit"
              testId="button-save-badge"
              disabled={!selectedSchool}
            >
              <Plus size={14} />
              Add badge to school
            </Button>
          </form>
          {selectedSchool && (
            <div className="border-t border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
              {selectedBadges.length ? (
                selectedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div>
                      <div className="text-xs font-bold">{badge.name}</div>
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {badge.sku} · {badge.stock} in shop
                      </div>
                    </div>
                    <Badge tone="teal">
                      KES {badge.price.toLocaleString()}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="px-5 py-4 text-xs text-[hsl(var(--muted-foreground))]">
                  No badges registered for this school yet.
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function UniformVariationModal({ onClose }: { onClose: () => void }) {
  type Variation = {
    size: string;
    quantity: string;
    retailPrice: string;
    wholesalePrice: string;
  };
  const create = useCreateProduct();
  const qc = useQueryClient();
  const schools = useListCustomers(undefined, {
    query: { queryKey: getListCustomersQueryKey() },
  });
  const registeredBadges = useListProducts(
    { category: "Accessories and Badges" },
    {
      query: {
        queryKey: getListProductsQueryKey({
          category: "Accessories and Badges",
        }),
      },
    },
  );
  const [base, setBase] = useState({
    shopId: selectedShopId(),
    sku: "",
    name: "",
    category: "School Uniforms",
    garmentType: "Dress",
    pattern: "Plain",
    checkColors: "",
    sleeveStyle: "Short sleeve",
    colors: "Navy, Maroon",
    school: "",
    schoolLogo: "",
    badgeName: "",
    badgeSchool: "",
    badgeStock: "0",
    badgePrice: "0",
  });
  const [variations, setVariations] = useState<Variation[]>(
    Array.from({ length: 10 }, (_, index) => ({
      size: String(20 + index * 2),
      quantity: "0",
      retailPrice: "0",
      wholesalePrice: "0",
    })),
  );
  const updateVariation = (
    index: number,
    key: keyof Variation,
    value: string,
  ) =>
    setVariations((old) =>
      old.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (
      variations.some(
        (row) =>
          Number(row.quantity) > 0 &&
          Number(row.wholesalePrice) > Number(row.retailPrice),
      )
    ) {
      window.alert("Wholesale price cannot exceed retail price.");
      return;
    }
    const colors = base.colors
      .split(",")
      .map((color) => color.trim())
      .filter(Boolean);
    const badgeColors = new Set(
      (registeredBadges.data ?? [])
        .filter(
          (product) =>
            product.badgeName === base.badgeName &&
            product.badgeSchool === base.school,
        )
        .flatMap((product) => product.colors ?? [])
        .map((color) => color.toLowerCase()),
    );
    const active = variations.filter((row) => Number(row.quantity) > 0);
    for (const row of active)
      for (const color of colors) {
        const hasBadge = Boolean(
          base.badgeName && badgeColors.has(color.toLowerCase()),
        );
        await create.mutateAsync({
          data: {
            shopId: base.shopId,
            ...(base.sku.trim()
              ? {
                  sku: `${base.sku.trim()}-${color.replace(/\s+/g, "-").toUpperCase()}-${row.size}`,
                }
              : {}),
            name: `${base.name} ${color} Size ${row.size}`,
            category: base.category,
            garmentType: base.garmentType,
            pattern: base.pattern,
            checkColors:
              base.pattern === "Checked"
                ? base.checkColors.split(",").map((color) => color.trim()).filter(Boolean)
                : [],
            sleeveStyle: base.sleeveStyle,
            unit: "piece",
            sizes: [row.size],
            colors: [color],
            school: base.school || undefined,
            schoolLogo: base.schoolLogo || undefined,
            badgeName: hasBadge ? base.badgeName : undefined,
            badgeSchool: hasBadge ? base.badgeSchool : undefined,
            badgeStock: hasBadge ? Number(base.badgeStock) : 0,
            badgePrice: hasBadge ? Number(base.badgePrice) : 0,
            initialStock: Number(row.quantity),
            costPrice: Number(row.retailPrice),
            retailPrice: Number(row.retailPrice),
            wholesalePrice: Number(row.wholesalePrice),
          },
        });
      }
    qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
    onClose();
  };
  const schoolOptions = (schools.data ?? []).filter(
    (customer) => customer.type.toLowerCase() === "school",
  );
  const badgeOptions = (registeredBadges.data ?? []).filter(
    (product) => product.badgeSchool === base.school,
  );
  const field = (key: keyof typeof base, placeholder: string) =>
    key === "shopId" ? (
      <select
        required
        value={base.shopId}
        onChange={(event) =>
          setBase((old) => ({ ...old, shopId: event.target.value }))
        }
        aria-label="Product shop"
        className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
      >
        <option value="shop-1">Shop 1</option>
        <option value="shop-2">Shop 2</option>
      </select>
    ) : key === "garmentType" ? (
      <select
        required
        value={base.garmentType}
        onChange={(event) =>
          setBase((old) => ({ ...old, garmentType: event.target.value }))
        }
        aria-label="Garment type"
        className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
      >
        {[
          "Dress",
          "Sweater",
          "Fleece",
          "Shoes",
          "Shirt",
          "T-shirt",
          "Socks",
          "Tracksuit",
          "Sleeveless",
          "Trousers",
          "Skirt",
          "Suspender",
          "Other",
        ].map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    ) : key === "pattern" ? (
      <select
        required
        value={base.pattern}
        onChange={(event) =>
          setBase((old) => ({ ...old, pattern: event.target.value }))
        }
        aria-label="Pattern"
        className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
      >
        <option>Plain</option>
        <option>Checked</option>
      </select>
    ) : key === "checkColors" ? (
      <input
        required={base.pattern === "Checked"}
        value={base.checkColors}
        onChange={(event) => setBase((old) => ({ ...old, checkColors: event.target.value }))}
        placeholder="Check colors, e.g. red, white, navy"
        className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
      />
    ) : key === "sleeveStyle" ? (
      <select
        required
        value={base.sleeveStyle}
        onChange={(event) =>
          setBase((old) => ({ ...old, sleeveStyle: event.target.value }))
        }
        aria-label="Sleeve style"
        className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
      >
        {(base.garmentType === "Sweater"
          ? ["Long sleeve", "Sleeveless"]
          : ["Short sleeve", "Long sleeve", "Sleeveless", "Strap", "None"]
        ).map((option) => <option key={option}>{option}</option>)}
      </select>
    ) : key === "school" ? (
      <select
          required
          value={base.school}
          onChange={(event) => {
            const school = event.target.value;
            setBase((old) => ({
              ...old,
              school,
              badgeName: "",
              badgeSchool: "",
              badgeStock: "0",
              badgePrice: "0",
            }));
          }}
          className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
        >
          <option value="">{placeholder}</option>
          {schoolOptions.map((school) => (
            <option key={school.id}>{school.name}</option>
          ))}
        </select>
    ) : key === "badgeName" ? (
      <select
        value={base.badgeName}
        onChange={(event) => {
          const badge = badgeOptions.find(
            (item) => item.badgeName === event.target.value,
          );
          setBase((old) => ({
            ...old,
            badgeName: event.target.value,
            badgeSchool: badge?.badgeSchool ?? "",
            badgeStock: String(badge?.badgeStock ?? 0),
            badgePrice: String(badge?.badgePrice ?? 0),
            schoolLogo: badge?.schoolLogo ?? old.schoolLogo,
          }));
        }}
        className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
      >
        <option value="">
          {base.school ? "No badge" : "Select school first"}
        </option>
        {badgeOptions.map((badge) => (
          <option key={badge.id}>{badge.badgeName}</option>
        ))}
      </select>
    ) : (
      <input
        required={key === "name"}
        value={base[key]}
        onChange={(event) =>
          setBase((old) => ({ ...old, [key]: event.target.value }))
        }
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
      />
    );
  return (
    <Modal title="Uniform size worksheet" onClose={onClose}>
      <form onSubmit={save} className="mt-5 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {field("shopId", "Shop")}
          {field("name", "Product name")}
          {field("sku", "Base SKU")}
          {field("garmentType", "Garment type")}
          {field("pattern", "Pattern")}
          {base.pattern === "Checked" && field("checkColors", "Check colors")}
          {field("sleeveStyle", "Sleeve style")}
          {field("school", "School name")}
          {field("schoolLogo", "School logo URL")}
          {field("badgeName", "Badge name (optional)")}
          {field("badgeSchool", "Badge belongs to school")}
          {field("colors", "Colors, comma separated")}
          <select
            value={base.category}
            onChange={(event) =>
              setBase((old) => ({ ...old, category: event.target.value }))
            }
            className="h-9 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
          >
            <option>Uniforms</option>
            <option>Sweaters</option>
            <option>Fleece</option>
            <option>Shoes</option>
            <option>Shirts</option>
            <option>T-shirts</option>
            <option>Socks</option>
            <option>Dresses</option>
            <option>Tracksuits</option>
            <option>Trousers</option>
            <option>Skirts</option>
            <option>Suspenders</option>
            <option>Accessories and Badges</option>
            <option>Embroidery and Alterations</option>
            <option>Custom category</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
          <table className="w-full min-w-[590px] text-left text-xs">
            <thead className="bg-[hsl(var(--muted)/.6)] text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Quantity</th>
                <th className="px-3 py-2">Retail price</th>
                <th className="px-3 py-2">Wholesale price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {variations.map((row, index) => (
                <tr key={row.size}>
                  <td className="px-3 py-2 font-bold">{row.size}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={row.quantity}
                      onChange={(event) =>
                        updateVariation(index, "quantity", event.target.value)
                      }
                      className="h-8 w-full rounded border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      required={Number(row.quantity) > 0}
                      type="number"
                      min="0"
                      value={row.retailPrice}
                      onChange={(event) =>
                        updateVariation(
                          index,
                          "retailPrice",
                          event.target.value,
                        )
                      }
                      className="h-8 w-full rounded border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      required={Number(row.quantity) > 0}
                      type="number"
                      min="0"
                      value={row.wholesalePrice}
                      onChange={(event) =>
                        updateVariation(
                          index,
                          "wholesalePrice",
                          event.target.value,
                        )
                      }
                      className="h-8 w-full rounded border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {variations.reduce(
              (sum, row) => sum + Number(row.quantity || 0),
              0,
            )}{" "}
            units selected
          </span>
          <Button
            type="submit"
            testId="button-save-uniform-variations"
            disabled={create.isPending}
          >
            {create.isPending && <Loader2 size={14} className="animate-spin" />}
            Save size variations
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const dashboard = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() },
  });
  const activity = useListActivity({
    query: { queryKey: getListActivityQueryKey() },
  });
  const branches = useListBranches({
    query: { queryKey: getListBranchesQueryKey() },
  });
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-KE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };
  
  const userName = user?.username || "User";
  
  if (dashboard.isLoading)
    return (
      <>
        <PageIntro
          eyebrow={`${getCurrentDate()} · Nairobi`}
          title={`${getGreeting()}, ${userName}`}
          detail="A clear view of today's trade, stock, and work waiting in the wings."
        />
        <LoadingState />
      </>
    );
  if (dashboard.isError || !dashboard.data)
    return <ErrorState retry={() => dashboard.refetch()} />;
  const data = dashboard.data;
  const activities = activity.data ?? [];
  return (
    <div className="animate-fade">
      <PageIntro
        eyebrow={`${getCurrentDate()} · Nairobi`}
        title={`${getGreeting()}, ${userName}`}
        detail="A clear view of today's trade, stock, and work waiting in the wings."
        action={
          <Button
            testId="button-dashboard-pos"
            onClick={() => setLocation("/pos")}
          >
            <ShoppingCart size={15} />
            Open POS
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales today"
          value={money(data.salesToday)}
          detail={`${data.salesChange >= 0 ? "+" : ""}${data.salesChange}% from last Tuesday`}
          icon={CircleDollarSign}
          tone="navy"
          trend={data.salesChange >= 0 ? "up" : "down"}
        />
        <StatCard
          label="Outstanding credit"
          value={money(data.outstandingCredit)}
          detail={`${data.overdueAccounts} accounts need follow-up`}
          icon={CreditCard}
          tone="gold"
        />
        <StatCard
          label="Orders in motion"
          value={String(data.pendingOrders)}
          detail={`${data.pendingEmbroidery} with embroidery`}
          icon={ClipboardList}
          tone="teal"
        />
        <StatCard
          label="Low stock watch"
          value={String(data.lowStock)}
          detail={`${data.reservedStock} units reserved`}
          icon={Boxes}
          tone="coral"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
            <div>
              <h2 className="font-display text-base font-bold">
                Branch performance
              </h2>
              <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                Sales against today's working target
              </p>
            </div>
            <Link
              href="/reports"
              data-testid="link-dashboard-reports"
              className="text-xs font-bold text-[hsl(var(--secondary))] hover:underline"
            >
              View report
            </Link>
          </div>
          <div className="space-y-5 p-5">
            {(data.branchPerformance ?? []).length ? (
              data.branchPerformance.map((branch) => (
                <div
                  key={branch.branch}
                  data-testid={`row-branch-performance-${branch.branch}`}
                >
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold">{branch.branch}</span>
                    <span className="font-mono-app text-[hsl(var(--muted-foreground))]">
                      {money(branch.sales)}{" "}
                      <span className="mx-1 opacity-40">/</span>{" "}
                      {money(branch.target)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--secondary))] transition-all duration-500"
                      style={{ width: `${Math.min(branch.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {branch.percentage}% of target
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No branch totals yet"
                detail="Once sales are recorded, branch performance will appear here."
              />
            )}
          </div>
        </Panel>
        <Panel>
          <div className="border-b border-[hsl(var(--border))] px-5 py-4">
            <h2 className="font-display text-base font-bold">Top products</h2>
            <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
              Best movers across both branches
            </p>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {(data.topProducts ?? []).length ? (
              data.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center gap-3 px-5 py-3.5"
                  data-testid={`row-top-product-${index}`}
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--muted))] text-xs font-bold text-[hsl(var(--secondary))]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold">
                      {product.name}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                      {product.units} units moved
                    </div>
                  </div>
                  <div className="font-mono-app text-xs font-bold">
                    {money(product.revenue)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-5">
                <EmptyState
                  title="No product movement"
                  detail="Top sellers will settle in after the first transactions."
                />
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ProductsPage() {
  const [search, setSearch] = useState("");
  const [filterIndex, setFilterIndex] = useState(0);
  const [showCreate, setShowCreateState] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const setShowCreate = (open: boolean) =>
    open ? setShowBulkCreate(true) : setShowCreateState(false);
  const filterTerms = [
    "",
    "School Uniforms",
    "Accessories and Badges",
    "Sweaters and Cardigans",
    "Shirts and Blouses",
  ];
  const params = useMemo(() => {
    const term = search || filterTerms[filterIndex];
    const shopId = sessionStorage.getItem("pajoy-shop-id") || "shop-1";
    return term ? { search: term, shopId } : { shopId };
  }, [search, filterIndex]);
  const products = useListProducts(params, {
    query: { queryKey: getListProductsQueryKey(params) },
  });
  const create = useCreateProduct();
  const qc = useQueryClient();
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const productCategories = ["Uniforms", "Sweaters", "Fleece", "Shoes", "Shirts", "T-shirts", "Socks", "Dresses", "Tracksuits", "Trousers", "Skirts", "Suspenders", "Accessories and Badges", "Embroidery and Alterations", "Custom category"];
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "School wear",
    unit: "piece",
    sizes: "28, 30, 32",
    colors: "Navy",
    costPrice: "0",
    retailPrice: "0",
    wholesalePrice: "0",
  });
  const productRows = products.data ?? [];
  const update = (key: string, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));
  const save = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      {
        data: {
          shopId: selectedShopId(),
          ...form,
          sizes: form.sizes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          colors: form.colors
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          costPrice: Number(form.costPrice),
          retailPrice: Number(form.retailPrice),
          wholesalePrice: Number(form.wholesalePrice),
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setShowCreate(false);
          setForm({
            sku: "",
            name: "",
            category: "School wear",
            unit: "piece",
            sizes: "28, 30, 32",
            colors: "Navy",
            costPrice: "0",
            retailPrice: "0",
            wholesalePrice: "0",
          });
        },
      },
    );
  };
  const deleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Delete ${productName} and all of its inventory? This cannot be undone.`)) return;
    setDeletingProductId(productId);
    try {
      const response = await authFetch(`/api/products/${encodeURIComponent(productId)}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: "DELETE_PRODUCT" }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Product could not be deleted.");
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      qc.invalidateQueries({ queryKey: getListInventoryQueryKey() });
    } catch (error) { window.alert(error instanceof Error ? error.message : "Product could not be deleted."); }
    finally { setDeletingProductId(null); }
  };
  if (showBulkCreate)
    return <UniformVariationModal onClose={() => setShowBulkCreate(false)} />;
  return (
    <div>
      <PageIntro
        eyebrow="Catalog"
        title="Products"
        detail="Keep every garment, size, and price ready for the counter."
        action={
          <Button
            testId="button-create-product"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={15} />
            New product
          </Button>
        }
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search SKU or product name"
            testId="input-search-products"
          />
          <button
            data-testid="button-product-filters"
            className="inline-flex items-center gap-2 self-start rounded-lg border border-[hsl(var(--border))] px-3 py-2.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
          <span className="text-xs text-[hsl(var(--muted-foreground))] sm:ml-auto">
            {products.data?.length ?? 0} products
          </span>
        </div>
        {products.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : products.isError ? (
          <div className="p-5">
            <ErrorState retry={() => products.refetch()} />
          </div>
        ) : productRows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No products found"
              detail={
                search
                  ? "Try a different SKU or product name."
                  : "Start with your core school and workwear range."
              }
              action={
                <Button
                  testId="button-empty-create-product"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus size={14} />
                  Add first product
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[hsl(var(--muted)/.6)] text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Variants</th>
                  <th className="px-4 py-3">Retail</th>
                  <th className="px-4 py-3">Wholesale</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {productRows.map((product) => (
                  <tr
                    key={product.id}
                    data-testid={`row-product-${product.id}`}
                    className="group hover:bg-[hsl(var(--muted)/.4)]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]">
                          <Shirt size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold">
                            {product.name}
                          </div>
                          <div className="mt-0.5 font-mono-app text-[10px] text-[hsl(var(--muted-foreground))]">
                            {product.sku}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <div>{product.category}</div>
                      <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        {[product.garmentType, product.pattern, product.sleeveStyle, ...(product.checkColors ?? [])]
                          .filter(Boolean)
                          .join(" · ") || "General uniform"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-[hsl(var(--muted-foreground))]">
                      {(product.sizes ?? []).join(" · ") || "Standard"}
                      <div className="text-[10px]">
                        {(product.colors ?? []).join(", ")}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono-app text-xs font-bold">
                      {money(product.retailPrice)}
                    </td>
                    <td className="px-4 py-4 font-mono-app text-xs">
                      {money(product.wholesalePrice)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        tone={product.status === "active" ? "good" : "neutral"}
                      >
                        {product.status || "active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <button type="button" aria-label={`Delete ${product.name}`} onClick={() => void deleteProduct(product.id, product.name)} disabled={deletingProductId === product.id} className="rounded-lg p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] disabled:opacity-50"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {showCreate && (
        <Modal title="Add a product" onClose={() => setShowCreate(false)}>
          <form onSubmit={save} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="SKU"
                name="sku"
                value={form.sku}
                onChange={(v) => update("sku", v)}
                placeholder="e.g. SHIRT-WHT-28"
              />
              <Field
                label="Product name"
                name="name"
                value={form.name}
                onChange={(v) => update("name", v)}
                placeholder="White short-sleeve shirt"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Category</span><select required value={form.category} onChange={(event) => update("category", event.target.value)} className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm">{productCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <Field
                label="Unit"
                name="unit"
                value={form.unit}
                onChange={(v) => update("unit", v)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Sizes, comma separated"
                name="sizes"
                value={form.sizes}
                onChange={(v) => update("sizes", v)}
              />
              <Field
                label="Colors, comma separated"
                name="colors"
                value={form.colors}
                onChange={(v) => update("colors", v)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Cost price"
                name="costPrice"
                type="number"
                value={form.costPrice}
                onChange={(v) => update("costPrice", v)}
              />
              <Field
                label="Retail price"
                name="retailPrice"
                type="number"
                value={form.retailPrice}
                onChange={(v) => update("retailPrice", v)}
              />
              <Field
                label="Wholesale price"
                name="wholesalePrice"
                type="number"
                value={form.wholesalePrice}
                onChange={(v) => update("wholesalePrice", v)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="secondary"
                testId="button-cancel-product"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                testId="button-save-product"
                disabled={create.isPending}
              >
                {create.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Save product
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function InventoryPage() {
  const [branchId, setBranchId] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const shopId = selectedShopId();
  const [clearingInventory, setClearingInventory] = useState(false);
  const params = useMemo(
    () => ({
      shopId,
      ...(branchId ? { branchId } : {}),
      ...(lowStock ? { lowStock: true } : {}),
    }),
    [shopId, branchId, lowStock],
  );
  const inventory = useListInventory(params, {
    query: { queryKey: getListInventoryQueryKey(params) },
  });
  const branches = useListBranches({
    query: { queryKey: getListBranchesQueryKey() },
  });
  const rows = inventory.data ?? [];
  const clearInventory = async () => {
    if (!window.confirm(`Delete all inventory records for ${shopId === "shop-2" ? "Shop 2" : "Shop 1"}? Products will be kept. This cannot be undone.`)) return;
    setClearingInventory(true);
    try {
      const response = await authFetch(`/api/inventory?shopId=${encodeURIComponent(shopId)}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: "CLEAR_SHOP_INVENTORY" }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Inventory could not be cleared.");
      await inventory.refetch();
    } catch (error) { window.alert(error instanceof Error ? error.message : "Inventory could not be cleared."); }
    finally { setClearingInventory(false); }
  };
  return (
    <div>
      <PageIntro
        eyebrow="Stock control"
        title="Inventory"
        detail="Know what is available, what is reserved, and where the next replenishment starts."
        action={<div className="flex flex-wrap gap-2"><Button variant="secondary" testId="button-inventory-transfer"><Truck size={15} />Plan transfer</Button><Button variant="secondary" testId="button-clear-inventory" onClick={() => void clearInventory()} disabled={clearingInventory}><Trash2 size={15} />{clearingInventory ? "Clearing..." : "Clear inventory"}</Button></div>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Stock value"
          value={money(rows.reduce((sum, row) => sum + row.value, 0))}
          detail="Across current view"
          icon={Boxes}
          tone="navy"
        />
        <StatCard
          label="Available units"
          value={rows
            .reduce((sum, row) => sum + row.available, 0)
            .toLocaleString()}
          detail={`${rows.reduce((sum, row) => sum + row.reserved, 0)} reserved`}
          icon={Package}
          tone="teal"
        />
        <StatCard
          label="Attention needed"
          value={String(
            rows.filter((row) => row.available <= row.reorderPoint).length,
          )}
          detail="Below reorder point"
          icon={Bell}
          tone="gold"
        />
      </div>
      <Panel>
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3">
            <Building2
              size={14}
              className="text-[hsl(var(--muted-foreground))]"
            />
            <select
              data-testid="select-inventory-branch"
              aria-label="Inventory branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="bg-transparent text-xs font-semibold outline-none"
            >
              <option value="">All branches</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <button
            data-testid="button-low-stock"
            onClick={() => setLowStock(!lowStock)}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold ${lowStock ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground))]" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"}`}
          >
            <Bell size={14} />
            Low stock only
          </button>
          <span className="text-xs text-[hsl(var(--muted-foreground))] sm:ml-auto">
            {rows.length} stock lines
          </span>
        </div>
        {inventory.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : inventory.isError ? (
          <div className="p-5">
            <ErrorState retry={() => inventory.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Inventory is clear"
              detail="No items match this branch and stock filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[hsl(var(--muted)/.6)] text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-5 py-3">Item</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3 text-right">On hand</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {rows.map((item) => {
                  const low = item.available <= item.reorderPoint;
                  return (
                    <tr
                      key={item.id}
                      data-testid={`row-inventory-${item.id}`}
                      className="hover:bg-[hsl(var(--muted)/.4)]"
                    >
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold">
                          {item.productName}
                        </div>
                        <div className="mt-0.5 font-mono-app text-[10px] text-[hsl(var(--muted-foreground))]">
                          {item.sku}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs">{item.branchName}</td>
                      <td className="px-4 py-4 text-right font-mono-app text-xs">
                        {item.onHand}
                      </td>
                      <td className="px-4 py-4 text-right font-mono-app text-xs text-[hsl(var(--muted-foreground))]">
                        {item.reserved}
                      </td>
                      <td className="px-4 py-4 text-right font-mono-app text-xs font-bold">
                        {item.available}
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          tone={
                            low ? "danger" : item.reserved > 0 ? "warn" : "good"
                          }
                        >
                          {low
                            ? "Reorder"
                            : item.reserved > 0
                              ? "Reserved"
                              : "Healthy"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function CustomersPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const params = useMemo(() => (search ? { search } : undefined), [search]);
  const customers = useListCustomers(params, {
    query: { queryKey: getListCustomersQueryKey(params) },
  });
  const create = useCreateCustomer();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    type: "retail",
    phone: "",
    email: "",
    school: "",
    creditLimit: "0",
  });
  const save = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      { data: { ...form, creditLimit: Number(form.creditLimit) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          setShowCreate(false);
          setForm({
            name: "",
            type: "retail",
            phone: "",
            email: "",
            school: "",
            creditLimit: "0",
          });
        },
      },
    );
  };
  return (
    <div>
      <PageIntro
        eyebrow="Customer book"
        title="Customers"
        detail="Retail walk-ins, wholesale accounts, and schools — with credit clearly in view."
        action={
          <Button
            testId="button-create-customer"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={15} />
            New customer
          </Button>
        }
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search name, phone, or school"
            testId="input-search-customers"
          />
          <div className="flex gap-1.5 overflow-x-auto">
            <Badge tone="neutral">All</Badge>
            <Badge tone="teal">Wholesale</Badge>
            <Badge tone="warn">School</Badge>
          </div>
          <span className="text-xs text-[hsl(var(--muted-foreground))] sm:ml-auto">
            {customers.data?.length ?? 0} records
          </span>
        </div>
        {customers.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : customers.isError ? (
          <div className="p-5">
            <ErrorState retry={() => customers.refetch()} />
          </div>
        ) : (customers.data ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No customers found"
              detail="Add an account to start tracking orders and balances."
              action={
                <Button
                  testId="button-empty-create-customer"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus size={14} />
                  Add customer
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] text-left">
              <thead className="bg-[hsl(var(--muted)/.6)] text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-right">Credit limit</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {(customers.data ?? []).map((customer) => (
                  <tr
                    key={customer.id}
                    data-testid={`row-customer-${customer.id}`}
                    className="hover:bg-[hsl(var(--muted)/.4)]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(var(--primary))] text-[10px] font-bold text-[hsl(var(--primary-foreground))]">
                          {customer.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <div className="text-xs font-bold">
                            {customer.name}
                          </div>
                          <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                            {customer.school ||
                              customer.email ||
                              "No additional details"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        tone={
                          customer.type === "school"
                            ? "warn"
                            : customer.type === "wholesale"
                              ? "teal"
                              : "neutral"
                        }
                      >
                        {customer.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-xs">{customer.phone}</td>
                    <td
                      className={`px-4 py-4 text-right font-mono-app text-xs font-bold ${customer.balance > 0 ? "text-[hsl(var(--destructive))]" : ""}`}
                    >
                      {money(customer.balance)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono-app text-xs">
                      {money(customer.creditLimit)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        tone={customer.status === "active" ? "good" : "neutral"}
                      >
                        {customer.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {showCreate && (
        <Modal title="Add a customer" onClose={() => setShowCreate(false)}>
          <form onSubmit={save} className="mt-6 space-y-4">
            <Field
              label="Full name or organisation"
              name="name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. Greenfields Academy"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                  Customer type
                </span>
                <select
                  data-testid="select-customer-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none"
                >
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="school">School</option>
                </select>
              </label>
              <Field
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="+254 7..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Email (optional)"
                name="email"
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label="School (optional)"
                name="school"
                value={form.school}
                onChange={(v) => setForm({ ...form, school: v })}
              />
            </div>
            <Field
              label="Credit limit"
              name="creditLimit"
              type="number"
              value={form.creditLimit}
              onChange={(v) => setForm({ ...form, creditLimit: v })}
            />
            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="secondary"
                testId="button-cancel-customer"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                testId="button-save-customer"
                disabled={create.isPending}
              >
                {create.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Save customer
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function OrdersPage() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const params = useMemo(
    () => ({ ...(status ? { status } : {}), ...(type ? { type } : {}) }),
    [status, type],
  );
  const orders = useListOrders(params, {
    query: { queryKey: getListOrdersQueryKey(params) },
  });
  const branches = useListBranches({
    query: { queryKey: getListBranchesQueryKey() },
  });
  const create = useCreateOrder();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customerName: "",
    customerType: "school",
    type: "bulk order",
    total: "0",
    deposit: "0",
    dueDate: "",
    branchId: "",
    itemSummary: "",
    embroidery: false,
  });
  const save = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      {
        data: {
          shopId: selectedShopId(),
          ...form,
          total: Number(form.total),
          deposit: Number(form.deposit),
          branchId: form.branchId || branches.data?.[0]?.id || "",
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          setShowCreate(false);
        },
      },
    );
  };
  return (
    <div>
      <PageIntro
        eyebrow="Pipeline"
        title="Orders"
        detail="Move school and wholesale work from deposit to delivery without losing the thread."
        action={
          <Button
            testId="button-create-order"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={15} />
            New order
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Open pipeline"
          value={String(
            (orders.data ?? []).filter((order) => order.status !== "completed")
              .length,
          )}
          detail="Orders still in motion"
          icon={ClipboardList}
          tone="navy"
        />
        <StatCard
          label="Value outstanding"
          value={money(
            (orders.data ?? []).reduce((sum, order) => sum + order.balance, 0),
          )}
          detail="Deposits and credit due"
          icon={CreditCard}
          tone="gold"
        />
        <StatCard
          label="Embroidery queue"
          value={String(
            (orders.data ?? []).filter((order) => order.embroidery).length,
          )}
          detail="Custom work attached"
          icon={Sparkles}
          tone="teal"
        />
      </div>
      <Panel>
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center">
          <select
            aria-label="Filter order status"
            data-testid="select-order-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs font-semibold outline-none"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
          </select>
          <select
            aria-label="Filter order type"
            data-testid="select-order-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs font-semibold outline-none"
          >
            <option value="">All order types</option>
            <option value="school">School</option>
            <option value="wholesale">Wholesale</option>
          </select>
          <span className="text-xs text-[hsl(var(--muted-foreground))] sm:ml-auto">
            {orders.data?.length ?? 0} orders
          </span>
        </div>
        {orders.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : orders.isError ? (
          <div className="p-5">
            <ErrorState retry={() => orders.refetch()} />
          </div>
        ) : (orders.data ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No orders in this view"
              detail="New school and wholesale work will land here."
              action={
                <Button
                  testId="button-empty-create-order"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus size={14} />
                  Create order
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[hsl(var(--muted)/.6)] text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Work</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {(orders.data ?? []).map((order) => (
                  <tr
                    key={order.id}
                    data-testid={`row-order-${order.id}`}
                    className="hover:bg-[hsl(var(--muted)/.4)]"
                  >
                    <td className="px-5 py-4">
                      <div className="font-mono-app text-xs font-bold">
                        {order.orderNumber}
                      </div>
                      <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        {order.type} · {order.branchName}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-bold">
                        {order.customerName}
                      </div>
                      <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        {order.itemSummary || order.customerType}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {shortDate(order.dueDate)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono-app text-xs">
                      {money(order.total)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono-app text-xs font-bold text-[hsl(var(--destructive))]">
                      {money(order.balance)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        tone={
                          order.status === "completed"
                            ? "good"
                            : order.status === "pending"
                              ? "warn"
                              : "teal"
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      {order.embroidery ? (
                        <Badge tone="teal">Embroidery</Badge>
                      ) : (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          Standard
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {showCreate && (
        <Modal title="Start an order" onClose={() => setShowCreate(false)}>
          <form onSubmit={save} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Customer name"
                name="customerName"
                value={form.customerName}
                onChange={(v) => setForm({ ...form, customerName: v })}
              />
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                  Customer type
                </span>
                <select
                  data-testid="select-new-order-customer-type"
                  value={form.customerType}
                  onChange={(e) =>
                    setForm({ ...form, customerType: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none"
                >
                  <option value="school">School</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="retail">Retail</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Order type"
                name="type"
                value={form.type}
                onChange={(v) => setForm({ ...form, type: v })}
              />
              <Field
                label="Due date"
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(v) => setForm({ ...form, dueDate: v })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Order total"
                name="total"
                type="number"
                value={form.total}
                onChange={(v) => setForm({ ...form, total: v })}
              />
              <Field
                label="Deposit received"
                name="deposit"
                type="number"
                value={form.deposit}
                onChange={(v) => setForm({ ...form, deposit: v })}
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                Branch
              </span>
              <select
                data-testid="select-new-order-branch"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none"
              >
                <option value="">Choose branch</option>
                {(branches.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Items summary"
              name="itemSummary"
              value={form.itemSummary}
              onChange={(v) => setForm({ ...form, itemSummary: v })}
              placeholder="e.g. 120 shirts, 80 sweaters"
            />
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                data-testid="checkbox-order-embroidery"
                type="checkbox"
                checked={form.embroidery}
                onChange={(e) =>
                  setForm({ ...form, embroidery: e.target.checked })
                }
                className="h-4 w-4 accent-[hsl(var(--secondary))]"
              />
              Include embroidery production
            </label>
            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="secondary"
                testId="button-cancel-order"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                testId="button-save-order"
                disabled={create.isPending}
              >
                {create.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Save order
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function POSPage() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<
    { id: string; name: string; price: number; qty: number }[]
  >([]);
  const [customerName, setCustomerName] = useState("Walk-in customer");
  const [saleType, setSaleType] = useState("retail");
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedTotal, setCompletedTotal] = useState(0);
  const products = useListProducts(
    useMemo(() => (search ? { search } : undefined), [search]),
    {
      query: {
        queryKey: getListProductsQueryKey(search ? { search } : undefined),
      },
    },
  );
  const create = useCreateOrder();
  const branches = useListBranches({
    query: { queryKey: getListBranchesQueryKey() },
  });
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const add = (product: any) =>
    setCart((old) => {
      const found = old.find((item) => item.id === product.id);
      return found
        ? old.map((item) =>
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
          )
        : [
            ...old,
            {
              id: product.id,
              name: product.name,
              price:
                saleType === "wholesale"
                  ? product.wholesalePrice
                  : product.retailPrice,
              qty: 1,
            },
          ];
    });
  const checkout = () => {
    if (!cart.length) return;
    const saleTotal = total;
    create.mutate(
      {
        data: {
          shopId: selectedShopId(),
          customerName,
          customerType: saleType,
          type: "pos sale",
          total: saleTotal,
          deposit: saleTotal,
          dueDate: new Date().toISOString().slice(0, 10),
          branchId: branches.data?.[0]?.id || "",
          itemSummary: cart
            .map((item) => `${item.qty} × ${item.name}`)
            .join(", "),
        },
      },
      {
        onSuccess: () => {
          setCompletedTotal(saleTotal);
          setCart([]);
          setShowReceipt(true);
        },
      },
    );
  };
  return (
    <div>
      <PageIntro
        eyebrow="Counter workspace"
        title="Point of sale"
        detail="Fast retail checkout for the counter, with wholesale pricing when the account calls for it."
        action={
          <div className="flex items-center gap-2">
            <Badge tone={saleType === "retail" ? "neutral" : "teal"}>
              {saleType} pricing
            </Badge>
            <Button variant="secondary" testId="button-pos-print">
              <Printer size={15} />
              Last receipt
            </Button>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <Panel className="min-h-[560px]">
          <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Scan SKU or search product"
              testId="input-pos-search"
            />
            <div className="flex h-10 rounded-lg border border-[hsl(var(--border))] p-1">
              <button
                data-testid="button-pos-retail"
                onClick={() => setSaleType("retail")}
                className={`rounded-md px-3 text-xs font-bold ${saleType === "retail" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}
              >
                Retail
              </button>
              <button
                data-testid="button-pos-wholesale"
                onClick={() => setSaleType("wholesale")}
                className={`rounded-md px-3 text-xs font-bold ${saleType === "wholesale" ? "bg-[hsl(var(--secondary))] text-white" : "text-[hsl(var(--muted-foreground))]"}`}
              >
                Wholesale
              </button>
            </div>
          </div>
          {products.isLoading ? (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {(products.data ?? []).map((product) => (
                <button
                  key={product.id}
                  data-testid={`button-add-product-${product.id}`}
                  onClick={() => add(product)}
                  className="group rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 text-left transition hover:-translate-y-0.5 hover:border-[hsl(var(--secondary)/.6)] hover:shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--secondary)/.13)] text-[hsl(var(--secondary))]">
                      <Shirt size={16} />
                    </div>
                    <Plus
                      size={16}
                      className="text-[hsl(var(--muted-foreground))] transition group-hover:text-[hsl(var(--secondary))]"
                    />
                  </div>
                  <div className="mt-4 truncate text-xs font-bold">
                    {product.name}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
                    <span>{product.sku}</span>
                    <span className="font-mono-app font-bold text-[hsl(var(--foreground))]">
                      {money(
                        saleType === "wholesale"
                          ? product.wholesalePrice
                          : product.retailPrice,
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!products.isLoading && !(products.data ?? []).length && (
            <div className="p-8">
              <EmptyState
                title="No matching products"
                detail="Search by product name or scan a known SKU."
              />
            </div>
          )}
        </Panel>
        <Panel className="h-fit xl:sticky xl:top-[96px]">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
            <div>
              <h2 className="font-display text-base font-bold">Current sale</h2>
              <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                {cart.length} line items
              </p>
            </div>
            <ShoppingCart size={17} className="text-[hsl(var(--secondary))]" />
          </div>
          <div className="border-b border-[hsl(var(--border))] p-4">
            <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
              Customer
            </label>
            <input
              data-testid="input-pos-customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-2 h-9 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-xs outline-none focus:border-[hsl(var(--secondary))]"
            />
          </div>
          <div className="max-h-[300px] divide-y divide-[hsl(var(--border))] overflow-y-auto">
            {cart.length ? (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold">
                      {item.name}
                    </div>
                    <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                      {item.qty} × {money(item.price)}
                    </div>
                  </div>
                  <div className="font-mono-app text-xs font-bold">
                    {money(item.qty * item.price)}
                  </div>
                  <button
                    aria-label={`Remove ${item.name}`}
                    data-testid={`button-remove-cart-${item.id}`}
                    onClick={() =>
                      setCart(cart.filter((line) => line.id !== item.id))
                    }
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8">
                <EmptyState
                  title="Sale is ready"
                  detail="Tap a product to add it to the basket."
                />
              </div>
            )}
          </div>
          <div className="border-t border-[hsl(var(--border))] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
                Total
              </span>
              <span className="font-display text-2xl font-bold">
                {money(total)}
              </span>
            </div>
            <Button
              testId="button-complete-sale"
              onClick={checkout}
              disabled={!cart.length || create.isPending}
            >
              {create.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Complete sale
            </Button>
          </div>
        </Panel>
      </div>
      {showReceipt && (
        <Modal title="Sale recorded" onClose={() => setShowReceipt(false)}>
          <div className="mt-5 rounded-xl bg-[hsl(var(--muted)/.6)] p-5 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[hsl(145_35%_88%)] text-[hsl(145_37%_30%)]">
              <Check size={20} />
            </div>
            <div className="mt-3 font-display text-lg font-bold">
              Ready for the customer
            </div>
            <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {money(completedTotal)} collected from {customerName}
            </div>
            <Button
              testId="button-close-receipt"
              onClick={() => setShowReceipt(false)}
            >
              <Check size={14} />
              Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AdvancedPOSPage() {
  type CartLine = {
    id: string;
    name: string;
    color: string;
    size: string;
    price: number;
    quantity: number;
    discount: number;
  };
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All products");
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in customer");
  const [paymentMethod, setPaymentMethod] = useState(
    getPaymentMethods()[0]?.name ?? "Cash",
  );
  const [amountReceived, setAmountReceived] = useState("");
  const products = useListProducts(undefined, {
    query: { queryKey: getListProductsQueryKey() },
  });
  const branches = useListBranches({
    query: { queryKey: getListBranchesQueryKey() },
  });
  const create = useCreateOrder();
  const rows = products.data ?? [];
  const categories = [
    "All products",
    ...Array.from(new Set(rows.map((product) => product.category))),
  ];
  const filtered = rows.filter(
    (product) =>
      (category === "All products" || product.category === category) &&
      `${product.name} ${product.sku}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const subtotal = cart.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  const discountTotal = cart.reduce(
    (sum, line) => sum + (line.price * line.quantity * line.discount) / 100,
    0,
  );
  const total = subtotal - discountTotal;
  const received = Number(amountReceived) || 0;
  const changeDue = Math.max(0, received - total);
  const addProduct = (product: any) =>
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing)
        return current.map((line) =>
          line.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          color: product.colors?.[0] ?? "",
          size: product.sizes?.[0] ?? "",
          price:
            saleType === "wholesale"
              ? product.wholesalePrice
              : product.retailPrice,
          quantity: 1,
          discount: 0,
        },
      ];
    });
  const changeSaleType = (type: "retail" | "wholesale") => {
    setSaleType(type);
    setCart((current) =>
      current.map((line) => {
        const product = rows.find((item) => item.id === line.id);
        return product
          ? {
              ...line,
              price:
                type === "wholesale"
                  ? product.wholesalePrice
                  : product.retailPrice,
            }
          : line;
      }),
    );
  };
  const updateLine = (id: string, changes: Partial<CartLine>) =>
    setCart((current) =>
      current.map((line) => (line.id === id ? { ...line, ...changes } : line)),
    );
  const checkout = (event: FormEvent) => {
    event.preventDefault();
    if (!cart.length || !customerName.trim() || received < total) return;
    create.mutate(
      {
        data: {
          shopId: selectedShopId(),
          customerName,
          customerType: saleType,
          type: "POS sale",
          total,
          deposit: total,
          dueDate: new Date().toISOString().slice(0, 10),
          branchId: branches.data?.[0]?.id ?? "branch-1",
          itemSummary:
            cart
              .map(
                (line) =>
                  `${line.quantity} x ${line.name}${line.color ? ` / ${line.color}` : ""}${line.size ? ` / size ${line.size}` : ""}${line.discount ? ` / ${line.discount}% discount` : ""}`,
              )
              .join(", ") + ` · Payment: ${paymentMethod}`,
        },
      },
      {
        onSuccess: () => {
          setCart([]);
          setCustomerName("Walk-in customer");
          setAmountReceived("");
        },
      },
    );
  };
  return (
    <div>
      <PageIntro
        eyebrow="Counter workspace"
        title="Point of sale"
        detail="A focused checkout desk for fast, accurate retail and wholesale transactions."
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              testId="button-pos-clear-cart"
              onClick={() => setCart([])}
            >
              <X size={15} />
              Clear cart
            </Button>
            <Button variant="secondary" testId="button-pos-print">
              <Printer size={15} />
              Last receipt
            </Button>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Panel className="overflow-hidden">
          <div className="border-b border-[hsl(var(--border))] p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Search product name or SKU"
                testId="input-pos-search"
              />
              <div className="flex h-10 shrink-0 rounded-lg border border-[hsl(var(--border))] p-1">
                <button
                  data-testid="button-pos-retail"
                  onClick={() => changeSaleType("retail")}
                  className={`rounded-md px-4 text-xs font-bold ${saleType === "retail" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}
                >
                  Retail
                </button>
                <button
                  data-testid="button-pos-wholesale"
                  onClick={() => changeSaleType("wholesale")}
                  className={`rounded-md px-4 text-xs font-bold ${saleType === "wholesale" ? "bg-[hsl(var(--secondary))] text-white" : "text-[hsl(var(--muted-foreground))]"}`}
                >
                  Wholesale
                </button>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {categories.map((item) => (
                <button
                  key={item}
                  data-testid={`button-pos-category-${item.toLowerCase().replaceAll(" ", "-")}`}
                  onClick={() => setCategory(item)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold ${category === item ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {products.isLoading ? (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Skeleton key={item} className="h-36" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  data-testid={`button-add-product-${product.id}`}
                  onClick={() => addProduct(product)}
                  className="group rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 text-left transition hover:-translate-y-0.5 hover:border-[hsl(var(--secondary)/.6)] hover:shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--secondary))]">
                      <Shirt size={18} />
                    </div>
                    <Plus
                      size={16}
                      className="text-[hsl(var(--muted-foreground))] transition group-hover:text-[hsl(var(--secondary))]"
                    />
                  </div>
                  <div className="mt-4 truncate text-sm font-bold">
                    {product.name}
                  </div>
                  <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {product.sku} ·{" "}
                    {(product.colors ?? []).join(", ") || "Standard"} ·{" "}
                    {(product.sizes ?? []).join(", ") || "One size"}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">
                      {product.category}
                    </span>
                    <span className="font-mono-app text-sm font-bold">
                      {money(
                        saleType === "wholesale"
                          ? product.wholesalePrice
                          : product.retailPrice,
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>
        <Panel className="flex flex-col">
          <div className="border-b border-[hsl(var(--border))] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold">
                  Current sale
                </h2>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {cart.length} line{cart.length === 1 ? "" : "s"} · {saleType}{" "}
                  pricing
                </p>
              </div>
              <ShoppingCart
                size={18}
                className="text-[hsl(var(--secondary))]"
              />
            </div>
          </div>
          <div className="min-h-[280px] flex-1 divide-y divide-[hsl(var(--border))] overflow-auto">
            {cart.length ? (
              cart.map((line) => (
                <div key={line.id} className="space-y-2 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold">
                        {line.name}
                      </div>
                      <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        {line.color || "Standard"} · {line.size || "One size"} ·{" "}
                        {money(line.price)}
                      </div>
                    </div>
                    <button
                      aria-label={`Remove ${line.name}`}
                      onClick={() =>
                        setCart((current) =>
                          current.filter((item) => item.id !== line.id),
                        )
                      }
                      className="text-[hsl(var(--destructive))]"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() =>
                        updateLine(line.id, {
                          quantity: Math.max(1, line.quantity - 1),
                        })
                      }
                      className="grid h-8 w-8 place-items-center rounded border border-[hsl(var(--border))]"
                    >
                      −
                    </button>
                    <input
                      aria-label={`Quantity for ${line.name}`}
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.id, {
                          quantity: Math.max(1, Number(event.target.value)),
                        })
                      }
                      className="h-8 w-full rounded border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-center text-xs"
                    />
                    <button
                      aria-label="Increase quantity"
                      onClick={() =>
                        updateLine(line.id, { quantity: line.quantity + 1 })
                      }
                      className="grid h-8 w-8 place-items-center rounded border border-[hsl(var(--border))]"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      Discount %
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={line.discount}
                        onChange={(event) =>
                          updateLine(line.id, {
                            discount: Math.min(
                              100,
                              Math.max(0, Number(event.target.value)),
                            ),
                          })
                        }
                        className="ml-2 h-7 w-16 rounded border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 text-xs"
                      />
                    </label>
                    <span className="font-mono-app text-xs font-bold">
                      {money(
                        line.price * line.quantity * (1 - line.discount / 100),
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="grid h-full min-h-[280px] place-items-center p-8 text-center">
                <div>
                  <ShoppingCart
                    size={28}
                    className="mx-auto text-[hsl(var(--muted-foreground))]"
                  />
                  <div className="mt-3 font-display text-sm font-bold">
                    Cart is ready
                  </div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Select products from the catalog to begin a sale.
                  </p>
                </div>
              </div>
            )}
          </div>
          <form
            onSubmit={checkout}
            className="space-y-3 border-t border-[hsl(var(--border))] p-5"
          >
            <Field
              label="Customer name"
              name="posCustomerName"
              value={customerName}
              onChange={setCustomerName}
              placeholder="Walk-in customer"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">
                Subtotal
              </span>
              <span className="font-mono-app">{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">
                Discounts
              </span>
              <span className="font-mono-app text-[hsl(var(--destructive))]">
                -{money(discountTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-3">
              <span className="font-bold">Total</span>
              <span className="font-display text-2xl font-bold">
                {money(total)}
              </span>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                Payment method
              </span>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
              >
                {getPaymentMethods().map((method) => (
                  <option key={method.id}>{method.name}</option>
                ))}
              </select>
            </label>
            <Button
              type="submit"
              testId="button-pos-checkout"
              disabled={!cart.length || create.isPending}
            >
              <CreditCard size={15} />
              {create.isPending ? "Processing..." : "Complete sale"}
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

/* function SchoolPOSPage() {
  type SaleLine = { id: string; name: string; school: string; size: string; color: string; quantity: number; price: number };
  type HeldSale = { id: string; customer: string; student: string; school: string; lines: SaleLine[]; total: number; time: string };
  const products = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey() } });
  const branches = useListBranches({ query: { queryKey: getListBranchesQueryKey() } });
  const create = useCreateOrder();
  const [view, setView] = useState<'sale' | 'held' | 'returns'>('sale');
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState('All Schools');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [customer, setCustomer] = useState({ name: '', student: '', school: '' });
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [completed, setCompleted] = useState<{ receipt: string; total: number; method: string } | null>(null);
  const rows = products.data ?? [];
  const schools = ['All Schools', ...Array.from(new Set(rows.map((product) => product.school).filter(Boolean)))];
  const categories = ['All', 'Shirts', 'Trousers', 'Skirts', 'Sweaters', 'Ties', 'Socks', 'Sportswear', 'Shoes', 'Accessories', 'Other'];
  const categoryMatches = (product: any) => category === 'All' || `${product.category} ${product.name}`.toLowerCase().includes(category.toLowerCase().replace('sweaters', 'sweater').replace('shirts', 'shirt').replace('trousers', 'trouser').replace('skirts', 'skirt'));
  const filtered = rows.filter((product) => (school === 'All Schools' || product.school === school) && categoryMatches(product) && `${product.name} ${product.sku} ${product.school ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const total = Math.max(0, subtotal - subtotal * discount / 100);
  const received = Number(amountReceived) || 0;
  const change = Math.max(0, received - total);
  const openProduct = (product: any) => { setSelectedProduct(product); setSelectedSize(product.sizes?.[0] ?? ''); setSelectedColor(product.colors?.[0] ?? ''); setSelectedQuantity(1); };
  const addToSale = () => { if (!selectedProduct) return; const id = `${selectedProduct.id}-${selectedSize}-${selectedColor}`; setCart((current) => { const existing = current.find((line) => line.id === id); if (existing) return current.map((line) => line.id === id ? { ...line, quantity: line.quantity + selectedQuantity } : line); return [...current, { id, name: selectedProduct.name, school: selectedProduct.school ?? 'General', size: selectedSize || 'One size', color: selectedColor || 'Standard', quantity: selectedQuantity, price: selectedProduct.retailPrice }]; }); setSelectedProduct(null); };
  const holdSale = () => { if (!cart.length) return; setHeldSales((current) => [{ id: String(Date.now()), customer: customer.name || 'Walk-in customer', student: customer.student, school: customer.school || school, lines: cart, total, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...current]); setCart([]); setCustomer({ name: '', student: '', school: '' }); };
  const completeSale = (event: FormEvent) => { event.preventDefault(); if (!cart.length || (paymentMethod === 'CASH' && received < total) || ((paymentMethod === 'M-PESA' || paymentMethod === 'CARD') && !paymentReference.trim())) return; create.mutate({ data: { customerName: customer.name || 'Walk-in customer', customerType: 'retail', type: 'POS sale', total, deposit: total, dueDate: new Date().toISOString().slice(0, 10), branchId: branches.data?.[0]?.id ?? 'branch-1', itemSummary: cart.map((line) => `${line.quantity} x ${line.name} / ${line.color} / size ${line.size}`).join(', ') + ` · Payment: ${paymentMethod}${paymentReference ? ` (${paymentReference})` : ''}` } }, { onSuccess: (result) => { setCompleted({ receipt: result.orderNumber, total, method: paymentMethod }); setPaymentOpen(false); setCart([]); setAmountReceived(''); setPaymentReference(''); } }); };
  if (completed) return <div className='min-h-[70vh]'><div className='mx-auto mt-10 max-w-xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-[var(--shadow-sm)]'><div className='mx-auto grid h-16 w-16 place-items-center rounded-full bg-[hsl(145_35%_88%)] text-[hsl(145_37%_30%)]'><CheckCircle2 size={34} /></div><div className='mt-5 font-display text-3xl font-bold'>Sale completed</div><p className='mt-2 text-sm text-[hsl(var(--muted-foreground))]'>The sale has been recorded and the receipt is ready.</p><div className='my-7 space-y-3 rounded-xl bg-[hsl(var(--muted)/.45)] p-5 text-left'><div className='flex justify-between text-sm'><span>Receipt number</span><strong>{completed.receipt}</strong></div><div className='flex justify-between text-sm'><span>Total</span><strong>{money(completed.total)}</strong></div><div className='flex justify-between text-sm'><span>Payment method</span><strong>{completed.method}</strong></div></div><div className='flex justify-center gap-3'><Button variant='secondary' testId='button-print-receipt' onClick={() => window.print()}><Printer size={15} />Print receipt</Button><Button testId='button-new-sale' onClick={() => setCompleted(null)}><Plus size={15} />New sale</Button></div></div></div>;
  return <div className='min-h-[calc(100vh-120px)]'><div className='mb-5 flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-4 lg:flex-row lg:items-center lg:justify-between'><div><div className='text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--secondary))]'>Cashier station · POS-01</div><h1 className='mt-1 font-display text-3xl font-bold tracking-[-.04em]'>New sale</h1><p className='mt-1 text-sm text-[hsl(var(--muted-foreground))]'>School → category → product → size → quantity</p></div><div className='flex flex-wrap gap-2'><button onClick={() => setView('sale')} className={`rounded-lg px-4 py-2.5 text-xs font-bold ${view === 'sale' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))]'}`}><ShoppingCart size={15} className='mr-2 inline' />New sale</button><button onClick={() => setView('held')} className={`rounded-lg px-4 py-2.5 text-xs font-bold ${view === 'held' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))]'}`}><Pause size={15} className='mr-2 inline' />Held sales ({heldSales.length})</button><button onClick={() => setView('returns')} className={`rounded-lg px-4 py-2.5 text-xs font-bold ${view === 'returns' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))]'}`}><RefreshCw size={15} className='mr-2 inline' />Returns</button></div></div>{view === 'held' ? <Panel><div className='border-b border-[hsl(var(--border))] p-5'><h2 className='font-display text-xl font-bold'>Held sales</h2><p className='mt-1 text-sm text-[hsl(var(--muted-foreground))]'>Pause a sale and return to it when the customer is ready.</p></div>{heldSales.length ? <div className='divide-y divide-[hsl(var(--border))]'>{heldSales.map((sale) => <div key={sale.id} className='flex flex-wrap items-center gap-4 p-5'><div className='min-w-[180px] flex-1'><div className='font-bold'>{sale.customer}</div><div className='mt-1 text-xs text-[hsl(var(--muted-foreground))]'>{sale.student || 'No student name'} · {sale.school} · {sale.time}</div><div className='mt-2 text-xs'>{sale.lines.map((line) => `${line.quantity} × ${line.name}`).join(', ')}</div></div><strong>{money(sale.total)}</strong><Button testId={`button-resume-sale-${sale.id}`} onClick={() => { setCart(sale.lines); setCustomer({ name: sale.customer, student: sale.student, school: sale.school }); setHeldSales((current) => current.filter((item) => item.id !== sale.id)); setView('sale'); }}>Resume</Button></div>)}</div> : <div className='p-12'><EmptyState title='No held sales' detail='Held transactions will appear here.' /></div>}</Panel> : view === 'returns' ? <Panel><div className='border-b border-[hsl(var(--border))] p-5'><h2 className='font-display text-xl font-bold'>Returns</h2><p className='mt-1 text-sm text-[hsl(var(--muted-foreground))]'>Search by receipt, customer, or transaction to begin a return.</p></div><div className='max-w-xl p-5'><SearchBox value={search} onChange={setSearch} placeholder='Receipt number, customer, or transaction' testId='input-pos-return-search' /><div className='mt-5 rounded-xl border border-dashed border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]'>Search results will appear here for confirmation before a return is processed.</div></div></Panel> : <div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]'><div className='space-y-4'><Panel><div className='flex flex-col gap-3 p-4 lg:flex-row'><SearchBox value={search} onChange={setSearch} placeholder='Search product, barcode, or school...' testId='input-pos-search' /><button aria-label='Scan barcode' data-testid='button-pos-scan' className='inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 text-xs font-bold'><Barcode size={17} />Scan</button><button aria-label='Select customer' data-testid='button-pos-customer' className='inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 text-xs font-bold'><UserRound size={17} />Customer</button></div><div className='border-t border-[hsl(var(--border))] p-4'><div className='mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]'>Schools</div><div className='flex gap-2 overflow-x-auto'>{schools.map((item) => <button key={item} onClick={() => setSchool(item)} className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-bold ${school === item ? 'bg-[hsl(var(--secondary))] text-white' : 'border border-[hsl(var(--border))]'}`}>{item}</button>)}</div></div><div className='border-t border-[hsl(var(--border))] p-4'><div className='mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]'>Categories</div><div className='flex gap-2 overflow-x-auto'>{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-lg px-3.5 py-2.5 text-xs font-bold ${category === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))]'}`}>{item}</button>)}</div></div></Panel><div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>{filtered.map((product) => <button key={product.id} data-testid={`button-pos-product-${product.id}`} onClick={() => openProduct(product)} className='rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left shadow-[var(--shadow-xs)] transition hover:-translate-y-0.5 hover:border-[hsl(var(--secondary))]'><div className='flex items-start justify-between'><div className='grid h-11 w-11 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--secondary))]'><Shirt size={21} /></div><Plus size={18} className='text-[hsl(var(--secondary))]' /></div><div className='mt-4 text-sm font-bold'>{product.name}</div><div className='mt-1 text-[11px] text-[hsl(var(--muted-foreground))]'>Sizes: {(product.sizes ?? []).join(', ') || 'One size'}</div><div className='mt-1 text-[11px] text-[hsl(var(--muted-foreground))]'>{product.school || 'All schools'} · {(product.colors ?? []).join(', ') || 'Standard'}</div><div className='mt-4 flex items-end justify-between'><span className='text-[10px] font-bold uppercase text-[hsl(145_37%_30%)]'>In stock</span><strong className='font-mono-app'>{money(saleType === 'wholesale' ? product.wholesalePrice : product.retailPrice)}</strong></div></button>)}</div></div><Panel className='h-fit xl:sticky xl:top-24'><div className='border-b border-[hsl(var(--border))] px-5 py-4'><div className='text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--secondary))]'>Current sale</div><h2 className='mt-1 font-display text-xl font-bold'>{customer.name || 'Walk-in customer'}</h2><div className='mt-1 text-xs text-[hsl(var(--muted-foreground))]'>{customer.student || 'No student'} · {customer.school || school}</div></div><div className='space-y-3 p-4'>{cart.length ? cart.map((line) => <div key={line.id} className='rounded-lg border border-[hsl(var(--border))] p-3'><div className='flex justify-between gap-3'><div><div className='text-xs font-bold'>{line.name}</div><div className='mt-1 text-[10px] text-[hsl(var(--muted-foreground))]'>{line.color} · Size {line.size}</div></div><button aria-label={`Remove ${line.name}`} onClick={() => setCart((current) => current.filter((item) => item.id !== line.id))}><Trash2 size={15} className='text-[hsl(var(--destructive))]' /></button></div><div className='mt-2 flex items-center justify-between'><div className='flex items-center gap-2'><button onClick={() => updateLine(line.id, { quantity: Math.max(1, line.quantity - 1) })} className='grid h-8 w-8 place-items-center rounded border'>-</button><span className='w-6 text-center text-xs font-bold'>{line.quantity}</span><button onClick={() => updateLine(line.id, { quantity: line.quantity + 1 })} className='grid h-8 w-8 place-items-center rounded border'>+</button></div><strong className='font-mono-app text-xs'>{money(line.price * line.quantity)}</strong></div></div>) : <div className='py-12 text-center text-sm text-[hsl(var(--muted-foreground))]'><ShoppingCart size={28} className='mx-auto mb-3 opacity-50' />Add products to start the sale</div>}</div><div className='border-t border-[hsl(var(--border))] p-5'><div className='mb-3 grid grid-cols-2 gap-3'><input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder='Customer name' className='h-10 rounded-lg border bg-transparent px-3 text-xs' /><input value={customer.student} onChange={(event) => setCustomer({ ...customer, student: event.target.value })} placeholder='Student name' className='h-10 rounded-lg border bg-transparent px-3 text-xs' /></div><input value={customer.school} onChange={(event) => setCustomer({ ...customer, school: event.target.value })} placeholder='School' className='mb-4 h-10 w-full rounded-lg border bg-transparent px-3 text-xs' /><label className='mb-3 block text-xs font-bold'>Discount (%)<input type='number' min='0' max='100' value={discount} onChange={(event) => setDiscount(Math.min(100, Math.max(0, Number(event.target.value))))} className='ml-2 h-8 w-16 rounded border bg-transparent px-2 text-xs' /></label><div className='space-y-2 text-xs'><div className='flex justify-between'><span>Subtotal</span><span>{money(subtotal)}</span></div><div className='flex justify-between'><span>Discount</span><span>-{money(subtotal * discount / 100)}</span></div><div className='flex justify-between border-t pt-3 text-base font-bold'><span>Total</span><span className='font-display text-2xl'>{money(total)}</span></div></div><div className='mt-4 grid grid-cols-2 gap-2'><Button variant='secondary' testId='button-pos-hold-sale' onClick={holdSale} disabled={!cart.length}><Pause size={15} />Hold sale</Button><Button variant='secondary' testId='button-pos-clear-cart' onClick={() => setCart([])}><Trash2 size={15} />Clear cart</Button></div><Button testId='button-pos-pay' onClick={() => setPaymentOpen(true)} disabled={!cart.length} ><CreditCard size={16} />Pay</Button></div></Panel></div>}</div>{selectedProduct && <Modal title='Add to sale' onClose={() => setSelectedProduct(null)}><div className='mt-5 space-y-5'><div><div className='font-display text-xl font-bold'>{selectedProduct.name}</div><div className='mt-1 text-xs text-[hsl(var(--muted-foreground))]'>{selectedProduct.school || 'All schools'} · {money(saleType === 'wholesale' ? selectedProduct.wholesalePrice : selectedProduct.retailPrice)}</div></div><div><div className='mb-2 text-xs font-bold'>Size</div><div className='flex flex-wrap gap-2'>{(selectedProduct.sizes ?? ['One size']).map((size: string) => <button key={size} onClick={() => setSelectedSize(size)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedSize === size ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)]' : ''}`}>{size}</button>)}</div></div><div><div className='mb-2 text-xs font-bold'>Quantity</div><div className='flex items-center gap-3'><button onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))} className='grid h-10 w-10 place-items-center rounded border'>-</button><span className='w-8 text-center font-bold'>{selectedQuantity}</span><button onClick={() => setSelectedQuantity(selectedQuantity + 1)} className='grid h-10 w-10 place-items-center rounded border'>+</button></div></div><Button testId='button-pos-add-to-sale' onClick={addToSale}><Plus size={15} />Add to sale</Button></div></Modal>}{paymentOpen && <Modal title='Payment' onClose={() => setPaymentOpen(false)}><form onSubmit={completeSale} className='mt-5 space-y-4'><div className='rounded-xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]'><div className='text-[10px] font-bold uppercase tracking-[.15em] opacity-70'>Total due</div><div className='mt-1 font-display text-3xl font-bold'>{money(total)}</div></div><div className='grid grid-cols-2 gap-2'>{['CASH', 'M-PESA', 'CARD', 'OTHER'].map((method) => <button type='button' key={method} onClick={() => { setPaymentMethod(method); setAmountReceived(''); setPaymentReference(''); }} className={`rounded-lg border px-3 py-3 text-xs font-bold ${paymentMethod === method ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]' : ''}`}>{method}</button>)}</div>{paymentMethod === 'CASH' && <><Field label='Amount received (KES)' name='amountReceived' type='number' value={amountReceived} onChange={setAmountReceived} placeholder={String(total)} /><div className='flex justify-between rounded-lg bg-[hsl(var(--muted))] p-4 text-sm font-bold'><span>Change</span><span>{money(change)}</span></div></>}{paymentMethod !== 'CASH' && <Field label={paymentMethod === 'M-PESA' ? 'Transaction/reference number' : 'Payment reference'} name='paymentReference' value={paymentReference} onChange={setPaymentReference} placeholder='Enter reference' />}<Button type='submit' testId='button-pos-complete-sale' disabled={create.isPending || (paymentMethod === 'CASH' ? received < total : paymentMethod !== 'OTHER' && !paymentReference.trim())}><CheckCircle2 size={16} />Complete sale</Button></form></Modal>}</div>;
}

} */
function PaymentsPage() {
  const payment = useCreatePayment();
  const [methods] = useState(getPaymentMethods);
  const [form, setForm] = useState({
    customerName: "",
    amount: "",
    method: methods[0]?.id ?? "mpesa",
    reference: "",
    orderNumber: "",
  });
  const [receipts, setReceipts] = useState<
    {
      id: string;
      receiptNumber: string;
      customerName: string;
      amount: number;
      method: string;
      receivedAt: string;
      orderNumber?: string;
    }[]
  >([]);
  const selectedMethod =
    methods.find((method) => method.id === form.method) ?? methods[0];
  const save = (event: FormEvent) => {
    event.preventDefault();
    payment.mutate(
      {
        data: {
          shopId: selectedShopId(),
          customerName: form.customerName,
          amount: Number(form.amount),
          method: `${selectedMethod?.name ?? form.method}${form.reference.trim() ? ` · ${form.reference.trim()}` : ""}`,
          orderNumber: form.orderNumber || undefined,
        },
      },
      {
        onSuccess: (result) => {
          setReceipts((old) => [
            { ...result, orderNumber: result.orderNumber ?? undefined },
            ...old,
          ]);
          setForm({
            customerName: "",
            amount: "",
            method: methods[0]?.id ?? "mpesa",
            reference: "",
            orderNumber: "",
          });
        },
      },
    );
  };
  return (
    <div>
      <PageIntro
        eyebrow="Cash office"
        title="Payments"
        detail="Record deposits and collections with a clean receipt trail for every customer."
      />
      <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        <Panel>
          <div className="border-b border-[hsl(var(--border))] px-5 py-4">
            <h2 className="font-display text-base font-bold">Record payment</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              A receipt is created as soon as it saves.
            </p>
          </div>
          <form onSubmit={save} className="space-y-4 p-5">
            <Field
              label="Customer name"
              name="customerName"
              value={form.customerName}
              onChange={(v) => setForm({ ...form, customerName: v })}
            />
            <Field
              label="Amount"
              name="amount"
              type="number"
              value={form.amount}
              onChange={(v) => setForm({ ...form, amount: v })}
              placeholder="0"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                  Method
                </span>
                <select
                  data-testid="select-payment-method"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none"
                >
                  <option>M-Pesa</option>
                  <option>Cash</option>
                  <option>Bank transfer</option>
                  <option>Card</option>
                </select>
              </label>
              <Field
                label="Order number (optional)"
                name="orderNumber"
                value={form.orderNumber}
                onChange={(v) => setForm({ ...form, orderNumber: v })}
              />
            </div>
            <Button
              type="submit"
              testId="button-save-payment"
              disabled={payment.isPending}
            >
              {payment.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Record payment
            </Button>
          </form>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
            <div>
              <h2 className="font-display text-base font-bold">
                Recent receipts
              </h2>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Receipts recorded in this session
              </p>
            </div>
            <ReceiptIcon />
          </div>
          {receipts.length ? (
            <div className="divide-y divide-[hsl(var(--border))]">
              {receipts.map((item) => (
                <div
                  key={item.id}
                  data-testid={`row-payment-${item.id}`}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground))]">
                    <Check size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">{item.customerName}</div>
                    <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                      {item.receiptNumber} · {item.method} ·{" "}
                      {shortDate(item.receivedAt)}
                    </div>
                  </div>
                  <div className="font-mono-app text-sm font-bold">
                    {money(item.amount)}
                  </div>
                  <button
                    data-testid={`button-print-payment-${item.id}`}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  >
                    <Printer size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title="No receipts in view"
                detail="Payments you record during this session will appear here for quick review."
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
function ConfiguredPaymentsPage() {
  const payment = useCreatePayment();
  const [methods, setMethods] = useState(getPaymentMethods);
  const [form, setForm] = useState({
    customerName: "",
    amount: "",
    method: methods[0]?.id ?? "mpesa",
    reference: "",
    orderNumber: "",
  });
  const [receipts, setReceipts] = useState<any[]>([]);
  const selectedMethod =
    methods.find((method) => method.id === form.method) ?? methods[0];
  const save = (event: FormEvent) => {
    event.preventDefault();
    payment.mutate(
      {
        data: {
          shopId: selectedShopId(),
          customerName: form.customerName,
          amount: Number(form.amount),
          method: `${selectedMethod?.name ?? form.method}${form.reference.trim() ? ` · ${form.reference.trim()}` : ""}`,
          orderNumber: form.orderNumber || undefined,
        },
      },
      {
        onSuccess: (result) => {
          setReceipts((current) => [result, ...current]);
          setForm({
            customerName: "",
            amount: "",
            method: methods[0]?.id ?? "mpesa",
            reference: "",
            orderNumber: "",
          });
        },
      },
    );
  };
  return (
    <div>
      <PageIntro
        eyebrow="Cash office"
        title="Accept payment"
        detail="Select an administrator-approved method, record the collection, and issue a receipt."
      />
      <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        <Panel>
          <div className="border-b border-[hsl(var(--border))] px-5 py-4">
            <h2 className="font-display text-base font-bold">Record payment</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Cashiers can only use methods configured by an administrator.
            </p>
          </div>
          <form onSubmit={save} className="space-y-4 p-5">
            <Field
              label="Customer name"
              name="customerName"
              value={form.customerName}
              onChange={(value) => setForm({ ...form, customerName: value })}
            />
            <Field
              label="Amount (KES)"
              name="amount"
              type="number"
              value={form.amount}
              onChange={(value) => setForm({ ...form, amount: value })}
              placeholder="0"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                  Payment method
                </span>
                <select
                  required
                  data-testid="select-payment-method"
                  value={form.method}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      method: event.target.value,
                      reference: "",
                    })
                  }
                  className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  {methods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Order number (optional)"
                name="orderNumber"
                value={form.orderNumber}
                onChange={(value) => setForm({ ...form, orderNumber: value })}
              />
            </div>
            {selectedMethod &&
              selectedMethod.detailLabel !== "Instructions" && (
                <Field
                  label={selectedMethod.detailLabel}
                  name="paymentReference"
                  value={form.reference}
                  onChange={(value) => setForm({ ...form, reference: value })}
                  placeholder={selectedMethod.detail || "Enter reference"}
                />
              )}
            {selectedMethod?.detail && (
              <div className="rounded-lg bg-[hsl(var(--muted)/.55)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                {selectedMethod.detail}
              </div>
            )}
            <Button
              type="submit"
              testId="button-save-payment"
              disabled={payment.isPending}
            >
              {payment.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Record payment
            </Button>
          </form>
        </Panel>
        <Panel>
          <div className="border-b border-[hsl(var(--border))] px-5 py-4">
            <h2 className="font-display text-base font-bold">
              Recent receipts
            </h2>
          </div>
          {receipts.length ? (
            <div className="divide-y divide-[hsl(var(--border))]">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <div className="text-xs font-bold">
                      {receipt.receiptNumber}
                    </div>
                    <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      {receipt.customerName} · {receipt.method}
                    </div>
                  </div>
                  <div className="font-mono-app text-sm font-bold">
                    {money(receipt.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title="No receipts in this session"
                detail="Recorded payments will appear here."
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function PaymentMethodsPage() {
  const [methods, setMethods] = useState(getPaymentMethods);
  const [newMethod, setNewMethod] = useState({
    name: "",
    detailLabel: "Reference",
    detail: "",
  });
  const save = (next: PaymentMethodConfig[]) => {
    setMethods(next);
    localStorage.setItem(paymentMethodsStorageKey, JSON.stringify(next));
  };
  return (
    <div>
      <PageIntro
        eyebrow="Administration"
        title="Payment methods"
        detail="Configure the payment options cashiers are allowed to select at the counter."
      />
      <Panel>
        <div className="border-b border-[hsl(var(--border))] px-5 py-4">
          <h2 className="font-display text-base font-bold">Approved methods</h2>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            M-Pesa and bank details are shown to cashiers but remain editable
            only here.
          </p>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
          {methods.map((method) => (
            <div
              key={method.id}
              className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <Field
                label="Method name"
                name={`method-name-${method.id}`}
                value={method.name}
                onChange={(value) =>
                  save(
                    methods.map((item) =>
                      item.id === method.id ? { ...item, name: value } : item,
                    ),
                  )
                }
              />
              <Field
                label={
                  method.id === "mpesa"
                    ? "M-Pesa number"
                    : method.id === "bank"
                      ? "Paybill and account number"
                      : method.detailLabel
                }
                name={`method-detail-${method.id}`}
                value={method.detail}
                onChange={(value) =>
                  save(
                    methods.map((item) =>
                      item.id === method.id ? { ...item, detail: value } : item,
                    ),
                  )
                }
                placeholder={
                  method.id === "bank"
                    ? "Paybill 123456 · Account PAJOY"
                    : "Enter payment details"
                }
              />
              <button
                type="button"
                onClick={() =>
                  save(methods.filter((item) => item.id !== method.id))
                }
                className="h-10 px-3 text-xs font-bold text-[hsl(var(--destructive))]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!newMethod.name.trim()) return;
            save([
              ...methods,
              {
                id: `${newMethod.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
                ...newMethod,
              },
            ]);
            setNewMethod({ name: "", detailLabel: "Reference", detail: "" });
          }}
          className="grid gap-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <Field
            label="Add method"
            name="new-payment-method"
            value={newMethod.name}
            onChange={(value) => setNewMethod({ ...newMethod, name: value })}
            placeholder="Card, bank transfer..."
          />
          <Field
            label="Details shown to cashier"
            name="new-payment-details"
            value={newMethod.detail}
            onChange={(value) => setNewMethod({ ...newMethod, detail: value })}
            placeholder="Till, account, or instructions"
          />
          <Button type="submit" testId="button-add-payment-method">
            <Plus size={14} />
            Add method
          </Button>
        </form>
      </Panel>
    </div>
  );
}

function ReceiptIcon() {
  return (
    <CreditCard size={17} className="text-[hsl(var(--muted-foreground))]" />
  );
}

function ReportsPage() {
  const dashboard = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() },
  });
  const branches = useListBranches({
    query: { queryKey: getListBranchesQueryKey() },
  });
  const inventory = useListInventory(undefined, {
    query: { queryKey: getListInventoryQueryKey(undefined) },
  });
  const data = dashboard.data;
  return (
    <div>
      <PageIntro
        eyebrow="Business intelligence"
        title="Reports"
        detail="A manager's view of sales, margins, stock exposure, and branch rhythm."
        action={
          <Button variant="secondary" testId="button-export-report">
            <Printer size={15} />
            Print summary
          </Button>
        }
      />
      {dashboard.isLoading ? (
        <LoadingState />
      ) : dashboard.isError || !data ? (
        <ErrorState retry={() => dashboard.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Retail sales"
              value={money(data.retailSales)}
              detail="Share of sales today"
              icon={Store}
              tone="navy"
            />
            <StatCard
              label="Wholesale sales"
              value={money(data.wholesaleSales)}
              detail="Trade accounts today"
              icon={Truck}
              tone="teal"
            />
            <StatCard
              label="Credit exposure"
              value={money(data.outstandingCredit)}
              detail={`${data.overdueAccounts} overdue accounts`}
              icon={CreditCard}
              tone="gold"
            />
            <StatCard
              label="Inventory value"
              value={money(
                (inventory.data ?? []).reduce((sum, row) => sum + row.value, 0),
              )}
              detail="Current stock position"
              icon={Boxes}
              tone="coral"
            />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel>
              <div className="border-b border-[hsl(var(--border))] px-5 py-4">
                <h2 className="font-display text-base font-bold">Sales mix</h2>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  How today's trade is split
                </p>
              </div>
              <div className="p-5">
                <div className="flex h-7 overflow-hidden rounded-lg">
                  <div
                    className="bg-[hsl(var(--primary))] transition-all"
                    style={{
                      width: `${(data.retailSales / Math.max(data.retailSales + data.wholesaleSales, 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-[hsl(var(--secondary))]"
                    style={{
                      width: `${(data.wholesaleSales / Math.max(data.retailSales + data.wholesaleSales, 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                      Retail
                    </div>
                    <div className="mt-2 font-display text-xl font-bold">
                      {money(data.retailSales)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="h-2 w-2 rounded-full bg-[hsl(var(--secondary))]" />
                      Wholesale
                    </div>
                    <div className="mt-2 font-display text-xl font-bold">
                      {money(data.wholesaleSales)}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
            <Panel>
              <div className="border-b border-[hsl(var(--border))] px-5 py-4">
                <h2 className="font-display text-base font-bold">
                  Branch performance
                </h2>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Today vs working target
                </p>
              </div>
              <div className="space-y-4 p-5">
                {(data.branchPerformance ?? []).map((branch) => (
                  <div key={branch.branch}>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold">{branch.branch}</span>
                      <span className="font-mono-app">
                        {branch.percentage}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[hsl(var(--muted))]">
                      <div
                        className="h-full rounded-full bg-[hsl(var(--accent))]"
                        style={{
                          width: `${Math.min(branch.percentage, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <div className="border-b border-[hsl(var(--border))] px-5 py-4">
                <h2 className="font-display text-base font-bold">
                  Branch economics
                </h2>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Stock value and sales together
                </p>
              </div>
              <div className="divide-y divide-[hsl(var(--border))]">
                {(branches.data ?? []).map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="text-xs font-bold">
                      {branch.name}
                      <div className="mt-1 text-[10px] font-normal text-[hsl(var(--muted-foreground))]">
                        {branch.location}
                      </div>
                    </div>
                    <div className="flex gap-7 text-right">
                      <div>
                        <div className="font-mono-app text-xs font-bold">
                          {money(branch.salesToday)}
                        </div>
                        <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                          sales today
                        </div>
                      </div>
                      <div>
                        <div className="font-mono-app text-xs font-bold">
                          {money(branch.inventoryValue)}
                        </div>
                        <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                          stock value
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function DocumentBrand({
  kind,
  number,
  status,
}: {
  kind: string;
  number: string;
  status: string;
}) {
  return (
    <div className="flex items-start justify-between border-b-2 border-[hsl(var(--accent))] pb-5">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--accent))]">
          <Shirt size={23} strokeWidth={2.2} />
        </div>
        <div>
          <div className="font-display text-xl font-bold tracking-[-.04em]">
            Pajoy Uniforms
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
            Schoolwear · Nairobi, Kenya
          </div>
          <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
            +254 712 400 118 · hello@pajoy.co.ke
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--secondary))]">
          {kind}
        </div>
        <div className="mt-1 font-display text-lg font-bold">{number}</div>
        <div className="mt-2">
          <Badge tone={statusToneForDocument(status)}>{status}</Badge>
        </div>
      </div>
    </div>
  );
}

function statusToneForDocument(
  status: string,
): "neutral" | "good" | "warn" | "danger" | "teal" {
  return status === "Paid" || status === "Completed"
    ? "good"
    : status === "Draft" || status === "Pending"
      ? "warn"
      : status === "In production"
        ? "teal"
        : status === "Cancelled"
          ? "danger"
          : "neutral";
}

function DocumentsPage() {
  type DocumentItem = {
    productId: string;
    productName: string;
    color: string;
    size: string;
    quantity: string;
    unitPrice: string;
    discount: string;
  };
  const [tab, setTab] = useState<"quotations" | "invoices" | "receipts">(
    "quotations",
  );
  const orders = useListOrders(undefined, {
    query: { queryKey: getListOrdersQueryKey() },
  });
  const products = useListProducts(undefined, {
    query: { queryKey: getListProductsQueryKey() },
  });
  const create = useCreateOrder();
  const [paymentMethods] = useState(getPaymentMethods);
  const [pricingMode, setPricingMode] = useState<"retail" | "wholesale">(
    "retail",
  );
  const [showCreate, setShowCreate] = useState(false);
  const payments = useListPayments({
    query: { queryKey: getListPaymentsQueryKey() },
  });
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [convertedQuotationNumbers, setConvertedQuotationNumbers] = useState<
    string[]
  >(() => {
    try {
      return JSON.parse(
        localStorage.getItem("pajoy-converted-quotations") ?? "[]",
      );
    } catch {
      return [];
    }
  });
  const [form, setForm] = useState({
    customerName: "",
    dueDate: "",
    paymentMethod: paymentMethods[0]?.id ?? "mpesa",
    paymentReference: "",
  });
  const [items, setItems] = useState<DocumentItem[]>([
    {
      productId: "",
      productName: "",
      color: "",
      size: "",
      quantity: "1",
      unitPrice: "0",
      discount: "0",
    },
  ]);

  const quotationRows = (orders.data ?? []).filter(
    (order: any) =>
      (order.type ?? "").toLowerCase().includes("quotation") &&
      !convertedQuotationNumbers.includes(order.orderNumber),
  );
  const invoiceRows = (orders.data ?? []).filter(
    (order: any) => !(order.type ?? "").toLowerCase().includes("quotation"),
  );

  const saveDocument = (event: FormEvent) => {
    event.preventDefault();
    if (
      !form.customerName.trim() ||
      !items.some((item) => item.productName && Number(item.quantity) > 0)
    )
      return;
    const selectedPaymentMethod = paymentMethods.find(
      (method) => method.id === form.paymentMethod,
    );
    const itemSummary = items
      .filter((item) => item.productName && Number(item.quantity) > 0)
      .map((item) => {
        const productLabel = item.productName.trim();
        const productText = productLabel.toLowerCase();
        const variants = [
          item.color && !productText.includes(item.color.toLowerCase())
            ? item.color
            : "",
          item.size &&
          !new RegExp(`\\bsize\\s*${item.size}\\b`, "i").test(productLabel)
            ? `size ${item.size}`
            : "",
        ].filter(Boolean);
        const discount = Number(item.discount)
          ? ` / ${item.discount}% discount`
          : "";
        return `${item.quantity} x ${productLabel}${variants.length ? ` / ${variants.join(" / ")}` : ""}${discount}`;
      })
      .join(", ");
    const total = items.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          Number(item.unitPrice) *
            Number(item.quantity) *
            (1 - Number(item.discount) / 100),
        ),
      0,
    );

    create.mutate(
      {
        data: {
          shopId: selectedShopId(),
          customerName: form.customerName,
          customerType: "School",
          type: tab === "invoices" ? "Invoice" : "Quotation",
          total,
          deposit: 0,
          dueDate: form.dueDate,
          branchId: "branch-1",
          itemSummary: `${itemSummary}${selectedPaymentMethod ? ` · Payment: ${selectedPaymentMethod.name}${form.paymentReference ? ` (${form.paymentReference})` : ""}` : ""}`,
          embroidery: false,
        },
      },
      {
        onSuccess: async () => {
          await orders.refetch();
          setForm({
            customerName: "",
            dueDate: "",
            paymentMethod: paymentMethods[0]?.id ?? "mpesa",
            paymentReference: "",
          });
          setItems([
            {
              productId: "",
              productName: "",
              color: "",
              size: "",
              quantity: "1",
              unitPrice: "0",
              discount: "0",
            },
          ]);
          setShowCreate(false);
          setTab(tab === "invoices" ? "invoices" : "quotations");
        },
      },
    );
  };

  const updateItem = (index: number, changes: Partial<DocumentItem>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  const selectProduct = (index: number, productId: string) => {
    const product = (products.data ?? []).find(
      (candidate) => candidate.id === productId,
    );
    const sizes = documentSizeOptions(product);
    if (product) product.sizes = sizes;
    updateItem(index, {
      productId,
      productName: product?.name ?? "",
      color: product?.colors?.[0] ?? "",
      size: sizes[0] ?? "",
      unitPrice: String(
        pricingMode === "wholesale"
          ? (product?.wholesalePrice ?? 0)
          : (product?.retailPrice ?? 0),
      ),
    });
  };
  const changePricingMode = (mode: "retail" | "wholesale") => {
    setPricingMode(mode);
    setItems((current) =>
      current.map((item) => {
        const product = (products.data ?? []).find(
          (candidate) => candidate.id === item.productId,
        );
        return product
          ? {
              ...item,
              unitPrice: String(
                mode === "wholesale"
                  ? product.wholesalePrice
                  : product.retailPrice,
              ),
            }
          : item;
      }),
    );
  };
  const documentTotal = items.reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        Number(item.unitPrice) *
          Number(item.quantity) *
          (1 - Number(item.discount) / 100),
      ),
    0,
  );

  const convertToInvoice = async (order: any) => {
    if (!order?.orderNumber) return;

    await create.mutateAsync({
      data: {
        shopId: selectedShopId(),
        customerName: order.customerName,
        customerType: order.customerType ?? "School",
        type: "Invoice",
        total: Number(order.total ?? 0),
        deposit: Number(order.paid ?? 0),
        dueDate: order.dueDate,
        branchId: order.branchId ?? "branch-1",
        itemSummary: order.itemSummary ?? "",
        embroidery: Boolean(order.embroidery),
      },
    });
    setConvertedQuotationNumbers((current) => {
      const next = current.includes(order.orderNumber)
        ? current
        : [...current, order.orderNumber];
      localStorage.setItem("pajoy-converted-quotations", JSON.stringify(next));
      return next;
    });
    await orders.refetch();
    setTab("invoices");
  };

  const updateDocumentStatus = async (order: any, status: string) => {
    if (!order?.orderNumber || status === order.status) return;
    const response = await fetch(
      `/api/orders/${encodeURIComponent(order.orderNumber)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || "Unable to update document status");
    }
    await orders.refetch();
  };

  const documentRows = (
    tab === "quotations"
      ? quotationRows
      : tab === "invoices"
        ? invoiceRows
        : (payments.data ?? [])
  ).map((row: any) =>
    row.itemSummary
      ? { ...row, itemSummary: cleanDocumentItems(row.itemSummary) }
      : row,
  );
  const selectedReceiptOrder = selectedReceipt?.orderNumber
    ? (orders.data ?? []).find(
        (order: any) => order.orderNumber === selectedReceipt.orderNumber,
      )
    : undefined;
  const documentStatus = (row: any) => {
    if (tab === "quotations" && row.status === "Pending") return "Draft";
    if (tab === "invoices" && row.status === "Pending") return "Issued";
    return row.status;
  };
  const statusTone = (status: string) =>
    status === "Paid" || status === "Completed"
      ? "good"
      : status === "Draft" || status === "Pending"
        ? "warn"
        : "neutral";
  const tabClass = (name: "quotations" | "invoices" | "receipts") =>
    `border-b-2 px-3 py-3 text-xs font-bold ${tab === name ? "border-[hsl(var(--secondary))] text-[hsl(var(--secondary))]" : "border-transparent text-[hsl(var(--muted-foreground))]"}`;

  return (
    <div>
      <PageIntro
        eyebrow="Documents"
        title="Quotations, invoices & receipts"
        detail="Create polished customer documents, track their progress, and keep every receipt ready to print."
        action={
          <div className="flex flex-wrap gap-2">
            {tab !== "receipts" && (
              <Button
                testId="button-create-document"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={15} />
                New {tab === "invoices" ? "invoice" : "quotation"}
              </Button>
            )}
            <Button
              variant="secondary"
              testId="button-print-documents"
              onClick={() => window.print()}
            >
              <Printer size={15} />
              Print view
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-[hsl(var(--border))]">
        <button
          data-testid="tab-quotations"
          onClick={() => setTab("quotations")}
          className={tabClass("quotations")}
        >
          Quotations
        </button>
        <button
          data-testid="tab-invoices"
          onClick={() => setTab("invoices")}
          className={tabClass("invoices")}
        >
          Invoices
        </button>
        <button
          data-testid="tab-receipts"
          onClick={() => setTab("receipts")}
          className={tabClass("receipts")}
        >
          Receipts
        </button>
      </div>

      <Panel className="mb-5 overflow-hidden">
        <div className="grid gap-4 bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))] sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">
              Document studio
            </div>
            <div className="mt-1 font-display text-xl font-bold">
              Make every customer handoff feel considered.
            </div>
            <div className="mt-1 max-w-xl text-xs text-[hsl(var(--primary-foreground)/.7)]">
              Use the branded form to prepare a quotation or invoice with clear
              totals, dates, and item details.
            </div>
          </div>
          {tab !== "receipts" && (
            <Button
              variant="secondary"
              testId="button-open-document-studio"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={14} />
              Create document
            </Button>
          )}
        </div>
      </Panel>

      {showCreate && (tab === "quotations" || tab === "invoices") && (
        <Modal
          title={`Create ${tab === "invoices" ? "invoice" : "quotation"}`}
          onClose={() => setShowCreate(false)}
        >
          <form onSubmit={saveDocument} className="mt-5 space-y-4">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--accent))]">
                  <Shirt size={19} />
                </div>
                <div>
                  <div className="font-display text-base font-bold">
                    Pajoy Uniforms
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Nairobi, Kenya · Official document
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Customer or school"
                name="documentCustomer"
                value={form.customerName}
                onChange={(value) => setForm({ ...form, customerName: value })}
                placeholder="ABC Academy"
              />
              <Field
                label={tab === "invoices" ? "Due date" : "Valid until"}
                name="documentDueDate"
                type="date"
                value={form.dueDate}
                onChange={(value) => setForm({ ...form, dueDate: value })}
              />
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                  Price type
                </span>
                <select
                  value={pricingMode}
                  onChange={(event) =>
                    changePricingMode(
                      event.target.value as "retail" | "wholesale",
                    )
                  }
                  className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  <option value="retail">Retail pricing</option>
                  <option value="wholesale">Wholesale pricing</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                  Payment method
                </span>
                <select
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      paymentMethod: event.target.value,
                      paymentReference: "",
                    })
                  }
                  className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                >
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </label>
              {paymentMethods.find((method) => method.id === form.paymentMethod)
                ?.detailLabel !== "Instructions" && (
                <Field
                  label={
                    paymentMethods.find(
                      (method) => method.id === form.paymentMethod,
                    )?.detailLabel ?? "Payment reference"
                  }
                  name="documentPaymentReference"
                  value={form.paymentReference}
                  onChange={(value) =>
                    setForm({ ...form, paymentReference: value })
                  }
                  placeholder={
                    paymentMethods.find(
                      (method) => method.id === form.paymentMethod,
                    )?.detail || "Optional reference"
                  }
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-base font-bold">
                  Line items
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Prices can be adjusted for a specific size or school order.
                </div>
              </div>
              <Button
                variant="secondary"
                testId="button-add-document-item"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    {
                      productId: "",
                      productName: "",
                      color: "",
                      size: "",
                      quantity: "1",
                      unitPrice: "0",
                      discount: "0",
                    },
                  ])
                }
              >
                <Plus size={13} />
                Add item
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => {
                const product = (products.data ?? []).find(
                  (candidate) => candidate.id === item.productId,
                );
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
                        Item {index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setItems((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                          className="text-[11px] font-bold text-[hsl(var(--destructive))]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                          Product
                        </span>
                        <select
                          required
                          value={item.productId}
                          onChange={(event) =>
                            selectProduct(index, event.target.value)
                          }
                          className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                        >
                          <option value="">Select a product</option>
                          {(products.data ?? []).map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name} · Retail {money(option.retailPrice)}{" "}
                              · Wholesale {money(option.wholesalePrice)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {product && (
                        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] p-3 sm:col-span-2">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-bold">
                                {product.name}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(product.colors ?? []).map((color) => (
                                  <span
                                    key={color}
                                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${item.color === color ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"}`}
                                  >
                                    {color}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(product.sizes ?? []).map((size) => (
                                  <span
                                    key={size}
                                    className={`rounded border px-2 py-1 text-[10px] font-semibold ${item.size === size ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.2)]" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"}`}
                                  >
                                    Size {size}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-right text-[11px]">
                              <div>
                                <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">
                                  Retail
                                </div>
                                <strong>{money(product.retailPrice)}</strong>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">
                                  Wholesale
                                </div>
                                <strong className="text-[hsl(var(--secondary))]">
                                  {money(product.wholesalePrice)}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                          Color
                        </span>
                        <select
                          value={item.color}
                          onChange={(event) =>
                            updateItem(index, { color: event.target.value })
                          }
                          className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                        >
                          <option value="">Select color</option>
                          {(product?.colors ?? []).map((color) => (
                            <option key={color}>{color}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                          Size
                        </span>
                        <select
                          value={item.size}
                          onChange={(event) =>
                            updateItem(index, { size: event.target.value })
                          }
                          className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                        >
                          <option value="">Select size</option>
                          {(product?.sizes ?? []).map((size) => (
                            <option key={size}>{size}</option>
                          ))}
                        </select>
                      </label>
                      <Field
                        label="Quantity"
                        name={`quantity-${index}`}
                        type="number"
                        value={item.quantity}
                        onChange={(value) =>
                          updateItem(index, { quantity: value })
                        }
                      />
                      <Field
                        label="Unit price (KES)"
                        name={`unit-price-${index}`}
                        type="number"
                        value={item.unitPrice}
                        onChange={(value) =>
                          updateItem(index, { unitPrice: value })
                        }
                      />
                      <Field
                        label="Discount (%)"
                        name={`discount-${index}`}
                        type="number"
                        value={item.discount}
                        onChange={(value) =>
                          updateItem(index, { discount: value })
                        }
                      />
                    </div>
                    <div className="mt-3 flex justify-end text-xs">
                      <span className="text-[hsl(var(--muted-foreground))]">
                        Line total&nbsp;
                      </span>
                      <strong>
                        {money(
                          Math.max(
                            0,
                            Number(item.unitPrice) *
                              Number(item.quantity) *
                              (1 - Number(item.discount) / 100),
                          ),
                        )}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-[hsl(var(--primary-foreground))]">
              <span className="text-xs font-bold uppercase tracking-[.12em]">
                Document total
              </span>
              <span className="font-display text-xl font-bold">
                {money(documentTotal)}
              </span>
            </div>
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                Payment details
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                    Payment method
                  </span>
                  <select
                    value={form.paymentMethod}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        paymentMethod: event.target.value,
                        paymentReference: "",
                      })
                    }
                    className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>
                {paymentMethods.find(
                  (method) => method.id === form.paymentMethod,
                )?.detailLabel !== "Instructions" && (
                  <Field
                    label={
                      paymentMethods.find(
                        (method) => method.id === form.paymentMethod,
                      )?.detailLabel ?? "Payment reference"
                    }
                    name="documentPaymentReferenceFinal"
                    value={form.paymentReference}
                    onChange={(value) =>
                      setForm({ ...form, paymentReference: value })
                    }
                    placeholder={
                      paymentMethods.find(
                        (method) => method.id === form.paymentMethod,
                      )?.detail || "Optional reference"
                    }
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
              <Button
                variant="ghost"
                testId="button-cancel-document"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                testId={
                  tab === "invoices"
                    ? "button-create-invoice"
                    : "button-create-quotation"
                }
                disabled={
                  create.isPending ||
                  !items.some(
                    (item) => item.productName && Number(item.quantity) > 0,
                  )
                }
              >
                {create.isPending && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Create {tab === "invoices" ? "invoice" : "quotation"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {
        <Panel>
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
            <div>
              <h2 className="font-display text-base font-bold">
                {tab === "quotations"
                  ? "Quotation register"
                  : tab === "invoices"
                    ? "Invoice register"
                    : "Payment receipts"}
              </h2>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {tab === "quotations"
                  ? "Draft documents ready for review or conversion."
                  : tab === "invoices"
                    ? "Orders already approved for billing."
                    : "Official customer receipts recorded in the system."}
              </p>
            </div>
            {tab === "receipts" && (
              <FileText
                size={18}
                className="text-[hsl(var(--muted-foreground))]"
              />
            )}
          </div>

          {documentRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-[hsl(var(--muted)/.6)] text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                  <tr>
                    <th className="px-5 py-3">Document</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    {tab !== "receipts" && (
                      <th className="px-4 py-3 text-right">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {documentRows.map((row: any) =>
                    tab === "receipts" ? (
                      <tr
                        key={row.id}
                        className="hover:bg-[hsl(var(--muted)/.4)]"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[hsl(var(--foreground))]">
                            {row.receiptNumber}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                            Receipt
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {row.customerName}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {shortDate(row.receivedAt)}
                        </td>
                        <td className="px-4 py-4 font-mono-app text-sm">
                          {money(row.amount)}
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone="good">Paid</Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            data-testid="button-view-receipt"
                            onClick={() => setSelectedReceipt(row)}
                            className="text-xs font-bold text-[hsl(var(--secondary))] hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.id}>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[hsl(var(--foreground))]">
                            {row.orderNumber}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                            {row.type}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {row.customerName}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {shortDate(row.dueDate)}
                        </td>
                        <td className="px-4 py-4 font-mono-app text-sm">
                          {money(row.total)}
                        </td>
                        <td className="px-4 py-4">
                          <select
                            aria-label={`Update status for ${row.orderNumber}`}
                            data-testid={`select-document-status-${row.orderNumber}`}
                            value={row.status}
                            onChange={(event) =>
                              void updateDocumentStatus(
                                row,
                                event.target.value,
                              ).catch((error: Error) =>
                                window.alert(error.message),
                              )
                            }
                            className="h-8 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 text-[11px] font-bold outline-none focus:border-[hsl(var(--secondary))]"
                          >
                            <option>Pending</option>
                            <option>Confirmed</option>
                            <option>In production</option>
                            <option>Ready for pickup</option>
                            <option>Completed</option>
                            <option>Paid</option>
                            <option>Cancelled</option>
                          </select>
                        </td>
                        {
                          <td className="px-4 py-4 text-right">
                            <button
                              data-testid={
                                tab === "quotations"
                                  ? "button-view-quotation"
                                  : "button-view-invoice"
                              }
                              onClick={() => {
                                if (tab === "quotations")
                                  setSelectedQuotation(row);
                                else setSelectedInvoice(row);
                              }}
                              className="text-xs font-bold text-[hsl(var(--secondary))] hover:underline"
                            >
                              View
                            </button>
                            {tab === "quotations" && (
                              <button
                                data-testid="button-convert-invoice"
                                onClick={() => void convertToInvoice(row)}
                                className="ml-3 text-xs font-bold text-[hsl(var(--primary))] hover:underline"
                              >
                                Convert
                              </button>
                            )}
                          </td>
                        }
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title={
                  tab === "invoices" ? "No invoices yet" : "No receipts found"
                }
                detail={
                  tab === "invoices"
                    ? "Create or approve a document to build the first invoice."
                    : "A receipt will appear here as soon as a payment is recorded."
                }
              />
            </div>
          )}
        </Panel>
      }

      {selectedQuotation && (
        <Modal
          title="Quotation preview"
          onClose={() => setSelectedQuotation(null)}
        >
          <div className="mt-5 space-y-5">
            <DocumentBrand
              kind="Quotation"
              number={selectedQuotation.orderNumber}
              status={documentStatus(selectedQuotation)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                  Prepared for
                </div>
                <div className="mt-1 font-semibold">
                  {selectedQuotation.customerName}
                </div>
              </div>
              <div className="sm:text-right">
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                  Valid until
                </div>
                <div className="mt-1 text-sm">
                  {shortDate(selectedQuotation.dueDate)}
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))]">
              <div className="grid grid-cols-[1fr_auto] bg-[hsl(var(--muted)/.55)] px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 text-sm">
                <span>
                  {selectedQuotation.itemSummary ||
                    "Uniform supply and tailoring services"}
                </span>
                <span className="font-mono-app font-bold">
                  {money(selectedQuotation.total)}
                </span>
              </div>
            </div>
            <div className="flex justify-end border-t border-[hsl(var(--border))] pt-4">
              <div className="flex w-full max-w-[230px] items-center justify-between">
                <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
                  Estimated total
                </span>
                <span className="font-display text-xl font-bold">
                  {money(selectedQuotation.total)}
                </span>
              </div>
            </div>
            <div className="border-t border-dashed border-[hsl(var(--border))] pt-4 text-[11px] text-[hsl(var(--muted-foreground))]">
              Thank you for choosing Pajoy Uniforms. This quotation is subject
              to confirmation of sizes and availability.
            </div>
          </div>
        </Modal>
      )}

      {selectedReceipt && (
        <Modal title="Receipt preview" onClose={() => setSelectedReceipt(null)}>
          <div className="mt-5 space-y-5">
            <DocumentBrand
              kind="Payment receipt"
              number={selectedReceipt.receiptNumber}
              status="Paid"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                  Received from
                </div>
                <div className="mt-1 font-semibold">
                  {selectedReceipt.customerName}
                </div>
              </div>
              <div className="sm:text-right">
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                  Payment date
                </div>
                <div className="mt-1 text-sm">
                  {shortDate(selectedReceipt.receivedAt)}
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))]">
              <div className="grid grid-cols-[1fr_auto] bg-[hsl(var(--muted)/.55)] px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                <span>Items purchased</span>
                <span>Order total</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 text-sm">
                <span className="whitespace-pre-wrap">
                  {selectedReceiptOrder?.itemSummary
                    ? cleanDocumentItems(selectedReceiptOrder.itemSummary)
                    : "Item details are unavailable for this payment."}
                </span>
                <span className="font-mono-app font-bold">
                  {selectedReceiptOrder
                    ? money(selectedReceiptOrder.total)
                    : money(selectedReceipt.amount)}
                </span>
              </div>
              {selectedReceiptOrder && (
                <div className="border-t border-[hsl(var(--border))] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                  Paid {money(selectedReceiptOrder.paid)} · Balance{" "}
                  {money(selectedReceiptOrder.balance)}
                </div>
              )}
            </div>
            <div className="rounded-xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]">
              <div className="text-[10px] font-bold uppercase tracking-[.16em] opacity-65">
                Payment received
              </div>
              <div className="mt-1 font-display text-3xl font-bold">
                {money(selectedReceipt.amount)}
              </div>
              <div className="mt-3 text-xs opacity-70">
                {selectedReceipt.method} ·{" "}
                {selectedReceipt.orderNumber ?? "Walk-in payment"}
              </div>
            </div>
            <div className="border-t border-dashed border-[hsl(var(--border))] pt-4 text-[11px] text-[hsl(var(--muted-foreground))]">
              Payment received with thanks. Keep this receipt for your records.
            </div>
            <div className="print-hide flex justify-end">
              <Button
                variant="secondary"
                testId="button-print-receipt-preview"
                onClick={() => window.print()}
              >
                <Printer size={14} />
                Print receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedInvoice && (
        <Modal title="Invoice preview" onClose={() => setSelectedInvoice(null)}>
          <div className="mt-5 space-y-5">
            <DocumentBrand
              kind="Tax invoice"
              number={selectedInvoice.orderNumber}
              status={documentStatus(selectedInvoice)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                  Bill to
                </div>
                <div className="mt-1 font-semibold">
                  {selectedInvoice.customerName}
                </div>
                <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {selectedInvoice.customerType ?? "Customer"}
                </div>
              </div>
              <div className="sm:text-right">
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
                  Due date
                </div>
                <div className="mt-1 text-sm">
                  {shortDate(selectedInvoice.dueDate)}
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))]">
              <div className="grid grid-cols-[1fr_auto] bg-[hsl(var(--primary))] px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--primary-foreground))]">
                <span>Item description</span>
                <span>Amount</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 text-sm">
                <span>
                  {selectedInvoice.itemSummary ||
                    "Uniform supply and tailoring services"}
                </span>
                <span className="font-mono-app font-bold">
                  {money(selectedInvoice.total)}
                </span>
              </div>
            </div>
            <div className="space-y-2 border-t border-[hsl(var(--border))] pt-4 text-right text-xs">
              <div>
                Paid{" "}
                <span className="ml-8 font-mono-app font-bold">
                  {money(selectedInvoice.paid)}
                </span>
              </div>
              <div className="text-base font-bold">
                Balance due{" "}
                <span className="ml-3 font-mono-app">
                  {money(selectedInvoice.balance)}
                </span>
              </div>
            </div>
            <div className="border-t border-dashed border-[hsl(var(--border))] pt-4 text-[11px] text-[hsl(var(--muted-foreground))]">
              Thank you for your business. Please quote the invoice number with
              any payment or enquiry.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SettingsPage() {
  const branches = useListBranches({
    query: { queryKey: getListBranchesQueryKey() },
  });
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <PageIntro
        eyebrow="Workspace controls"
        title="Settings"
        detail="The quiet infrastructure behind branches, permissions, and the way Pajoy trades."
        action={
          <Button
            testId="button-save-settings"
            onClick={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 1800);
            }}
          >
            {saved ? <Check size={15} /> : null}
            {saved ? "Saved" : "Save preferences"}
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Panel>
          <div className="border-b border-[hsl(var(--border))] px-5 py-4">
            <h2 className="font-display text-base font-bold">Branches</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Active locations and accountable managers
            </p>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {branches.isLoading
              ? [1, 2].map((i) => <Skeleton key={i} className="m-5 h-14" />)
              : (branches.data ?? []).map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary)/.13)] text-[hsl(var(--secondary))]">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold">
                        {branch.name}{" "}
                        <span className="ml-1 font-mono-app text-[10px] text-[hsl(var(--muted-foreground))]">
                          {branch.code}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                        {branch.location} · {branch.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold">
                        {branch.manager}
                      </div>
                      <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        Branch manager
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel>
            <div className="border-b border-[hsl(var(--border))] px-5 py-4">
              <h2 className="font-display text-base font-bold">
                Business preferences
              </h2>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Used across the operations console
              </p>
            </div>
            <div className="space-y-1 p-3">
              {[
                ["Business name", "Pajoy Uniforms"],
                ["Currency", "Kenyan Shilling (KES)"],
                ["Receipt prefix", "PAJ"],
                ["Time zone", "Africa / Nairobi"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-[hsl(var(--muted)/.6)]"
                >
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {label}
                  </span>
                  <span className="text-xs font-bold">{value}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <div className="border-b border-[hsl(var(--border))] px-5 py-4">
              <h2 className="font-display text-base font-bold">
                Staff permissions
              </h2>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Roles currently assigned
              </p>
            </div>
            <div className="divide-y divide-[hsl(var(--border))]">
              {[
                ["AM", "Amina Mwangi", "Operations manager", "Full access"],
                ["DK", "David Kamau", "Westlands cashier", "Sales + payments"],
                ["LN", "Lucy Njeri", "Embroidery lead", "Orders + production"],
              ].map(([initials, name, role, access]) => (
                <div key={name} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--primary))] text-[10px] font-bold text-[hsl(var(--primary-foreground))]">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">{name}</div>
                    <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                      {role}
                    </div>
                  </div>
                  <Badge tone="neutral">{access}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Router() {
  const [location, setLocation] = useLocation();
  const { user, loading, error, timedOut, retry, can } = useAuth();
  useEffect(() => {
    const state = loading
      ? "checking"
      : user
        ? "authenticated"
        : "unauthenticated";
    console.info(`[Router] Current route: ${location}`);
    console.info(`[Router] Auth state: ${state}`);
    if (!loading && !error && !timedOut && !user && location !== "/login") {
      console.info(`[Router] Redirecting to /login from ${location}`);
      setLocation("/login");
    } else if (location === "/login") console.info("[Router] Rendering login");
    else if (user) console.info("[Router] Rendering protected application");
  }, [loading, error, timedOut, user, location, setLocation]);
  if (location === "/login") return <LoginPage />;
  if (error || timedOut) return <AuthRecoveryPage retry={retry} />;
  if (loading)
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!user)
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (location === "/unauthorized") return <UnauthorizedPage />;
  const permission = location.split("/")[1] || "dashboard";
  if (permission !== "dashboard" && !can(permission))
    return <UnauthorizedPage />;
  return (
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/pos" component={POSCashier} />
          <Route path="/products" component={ProductsPage} />
          <Route path="/schools" component={SchoolsPage} />
          <Route path="/inventory" component={InventoryModule} />
          <Route path="/customers" component={CustomersPage} />
          <Route path="/orders/new" component={OrdersPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/embroidery/new" component={EmbroideryModule} />
          <Route path="/embroidery" component={EmbroideryModule} />
          <Route path="/dtf" component={DtfModule} />
          <Route path="/payments" component={ConfiguredPaymentsPage} />
          <Route path="/payment-methods" component={PaymentMethodsPage} />
          <Route path="/documents" component={DocumentsPage} />
          <Route path="/reports/cashier" component={CashierReports} />
          <Route path="/reports" component={AdminReports} />
          <Route path="/settings" component={SettingsModule} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}
function App() {
  useEffect(() => {
    console.info("[React] App component rendered");
  }, []);
  const desktop = Boolean(
    (
      globalThis as typeof globalThis & {
        pajoyDesktop?: { isDesktop?: boolean };
      }
    ).pajoyDesktop?.isDesktop,
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter
          hook={desktop ? useDesktopLocation : undefined}
          base={desktop ? "" : import.meta.env.BASE_URL.replace(/\/$/, "")}
        >
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default App;
