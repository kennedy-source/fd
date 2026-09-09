import { useMemo, useState, type ReactNode } from "react";
import {
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  PackagePlus,
  Search,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import {
  getListInventoryQueryKey,
  getListProductsQueryKey,
  useListInventory,
  useListProducts,
} from "@workspace/api-client-react";
import { authFetch } from "@/auth";

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  school?: string | null;
  sizes?: string[];
  colors?: string[];
  costPrice?: number;
  retailPrice?: number;
};
type InventoryRow = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderPoint: number;
  value: number;
  school: string;
  category: string;
  sizes: string[];
  costPrice: number;
  retailPrice: number;
};
type Movement = {
  id: string;
  type: string;
  reference: string;
  quantity: number;
  balance: number;
  user: string;
  time: string;
};
type ActionKind = "receive" | "adjust" | "transfer" | "count";
type FilterTab =
  "ALL" | "IN STOCK" | "LOW STOCK" | "OUT OF STOCK" | "RECENTLY RECEIVED";

const movementKey = "pajoy-inventory-movements";
const overrideKey = "pajoy-inventory-overrides";
const money = (value = 0) =>
  `KSh ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
const readMovements = (): Record<string, Movement[]> => {
  try {
    return JSON.parse(localStorage.getItem(movementKey) ?? "{}");
  } catch {
    return {};
  }
};
const readOverrides = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(overrideKey) ?? "{}");
  } catch {
    return {};
  }
};
const statusOf = (row: InventoryRow) =>
  row.available <= 0
    ? "Out of stock"
    : row.available <= row.reorderPoint
      ? "Low stock"
      : "In stock";
const statusClass = (status: string) =>
  status === "Out of stock"
    ? "bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]"
    : status === "Low stock"
      ? "bg-[hsl(var(--accent)/.24)] text-[hsl(var(--foreground))]"
      : "bg-[hsl(145_35%_88%)] text-[hsl(145_37%_30%)]";
const demoInventory: InventoryRow[] = [
  {
    id: "demo-shirt-12",
    productId: "demo-shirt",
    productName: "White Short Sleeve Shirt",
    sku: "GF-SHT-WHT-12",
    branchId: "main",
    branchName: "Main Warehouse",
    onHand: 45,
    reserved: 3,
    available: 42,
    reorderPoint: 20,
    value: 27900,
    school: "Greenfield Academy",
    category: "Shirts",
    sizes: ["12"],
    costPrice: 620,
    retailPrice: 1000,
  },
  {
    id: "demo-trouser-14",
    productId: "demo-trouser",
    productName: "Grey School Trouser",
    sku: "GF-TRS-GRY-14",
    branchId: "main",
    branchName: "Main Warehouse",
    onHand: 8,
    reserved: 0,
    available: 8,
    reorderPoint: 20,
    value: 7200,
    school: "Greenfield Academy",
    category: "Trousers",
    sizes: ["14"],
    costPrice: 900,
    retailPrice: 1500,
  },
  {
    id: "demo-sweater-m",
    productId: "demo-sweater",
    productName: "Blue School Sweater",
    sku: "WA-SWT-BLU-M",
    branchId: "westlands",
    branchName: "Westlands Branch",
    onHand: 0,
    reserved: 0,
    available: 0,
    reorderPoint: 10,
    value: 0,
    school: "Westlands Academy",
    category: "Sweaters",
    sizes: ["M"],
    costPrice: 1200,
    retailPrice: 2000,
  },
  {
    id: "demo-skirt-10",
    productId: "demo-skirt",
    productName: "Navy School Skirt",
    sku: "NA-SKT-NVY-10",
    branchId: "nairobi",
    branchName: "Nairobi Branch",
    onHand: 26,
    reserved: 2,
    available: 24,
    reorderPoint: 12,
    value: 18200,
    school: "Nairobi Academy",
    category: "Skirts",
    sizes: ["10"],
    costPrice: 700,
    retailPrice: 1200,
  },
  {
    id: "demo-tie",
    productId: "demo-tie",
    productName: "School Tie",
    sku: "SM-TIE-NVY-STD",
    branchId: "outlet",
    branchName: "School Outlet",
    onHand: 64,
    reserved: 5,
    available: 59,
    reorderPoint: 15,
    value: 19200,
    school: "St. Mary's School",
    category: "Ties",
    sizes: ["Standard"],
    costPrice: 300,
    retailPrice: 550,
  },
  {
    id: "demo-sports-12",
    productId: "demo-sports",
    productName: "Sports T-Shirt",
    sku: "WA-SPT-WHT-12",
    branchId: "westlands",
    branchName: "Westlands Branch",
    onHand: 14,
    reserved: 0,
    available: 14,
    reorderPoint: 16,
    value: 7000,
    school: "Westlands Academy",
    category: "Sportswear",
    sizes: ["12"],
    costPrice: 500,
    retailPrice: 900,
  },
];

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
function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--secondary))]">
        <Boxes size={19} />
      </div>
      <div className="mt-3 font-display text-base font-bold">{title}</div>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        {detail}
      </p>
    </div>
  );
}
function Summary({
  label,
  value,
  detail,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-5 text-left shadow-[var(--shadow-xs)] transition hover:-translate-y-0.5 hover:border-[hsl(var(--secondary)/.5)] ${active ? "border-[hsl(var(--secondary))] ring-2 ring-[hsl(var(--secondary)/.12)]" : "border-[hsl(var(--border))]"} bg-[hsl(var(--card))]`}
    >
      <div className="flex items-center justify-between text-[hsl(var(--secondary))]">
        <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
        {detail}
      </div>
    </button>
  );
}
function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2">
      <span className="text-[9px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 bg-transparent text-xs font-semibold outline-none"
      >
        <option>{value}</option>
        {options
          .filter((option) => option !== value)
          .map((option) => (
            <option key={option}>{option}</option>
          ))}
      </select>
    </label>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
      <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}

function ActionModal({
  kind,
  row,
  onClose,
  onSave,
}: {
  kind: ActionKind;
  row: InventoryRow;
  onClose: () => void;
  onSave: (quantity: number, destination?: string, reason?: string) => void;
}) {
  const [quantity, setQuantity] = useState(
    kind === "count" || kind === "adjust" ? String(row.onHand) : "1",
  );
  const [destination, setDestination] = useState("Eastleigh Shop");
  const [reason, setReason] = useState("Damaged");
  const titles = {
    receive: "Receive stock",
    adjust: "Adjust stock",
    transfer: "Transfer stock",
    count: "Stock count",
  };
  const labels = {
    receive: "Quantity received",
    adjust: "Actual system stock",
    transfer: "Transfer quantity",
    count: "Physical count",
  };
  const valid =
    Number(quantity) >= 0 &&
    (kind !== "transfer" || Number(quantity) <= row.available);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--primary)/.45)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--secondary))]">
              Inventory action
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold">
              {titles[kind]}
            </h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {row.productName} Â· {row.sku} Â· {row.school} Â· {row.branchName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 hover:bg-[hsl(var(--muted))]"
          >
            <X size={19} />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                System stock
              </div>
              <strong>{row.onHand}</strong>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Reserved
              </div>
              <strong>{row.reserved}</strong>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Available
              </div>
              <strong>{row.available}</strong>
            </div>
          </div>
          <label className="block text-xs font-bold">
            {labels[kind]}
            <input
              autoFocus
              min="0"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--secondary))]"
            />
          </label>
          {kind === "transfer" && (
            <>
              <label className="block text-xs font-bold">
                To location
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-transparent px-3 text-sm"
                >
                  <option>CBD Flagship</option>
                  <option>Eastleigh Shop</option>
                  <option>School Outlet</option>
                </select>
              </label>
              {Number(quantity) > row.available && (
                <p className="text-xs font-semibold text-[hsl(var(--destructive))]">
                  Cannot transfer {quantity} units. Only {row.available} units
                  are available.
                </p>
              )}
            </>
          )}
          {kind === "adjust" && (
            <label className="block text-xs font-bold">
              Reason
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-transparent px-3 text-sm"
              >
                <option>Damaged</option>
                <option>Missing</option>
                <option>Counting Error</option>
                <option>Returned to Supplier</option>
                <option>Other</option>
              </select>
            </label>
          )}
          <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-3 text-xs font-bold text-[hsl(var(--muted-foreground))]"
            >
              Cancel
            </button>
            <button
              disabled={!valid}
              onClick={() => onSave(Number(quantity), destination, reason)}
              className="rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-50"
            >
              Confirm {titles[kind].toLowerCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Details({
  row,
  movements,
  onClose,
  onAction,
}: {
  row: InventoryRow;
  movements: Movement[];
  onClose: () => void;
  onAction: (kind: ActionKind) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-[hsl(var(--card))] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--secondary))]">
              Product details
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold uppercase">
              {row.productName}
            </h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {row.sku} Â· {row.school} Â· {row.branchName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-1.5 hover:bg-[hsl(var(--muted))]"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Info label="Current stock" value={String(row.onHand)} />
          <Info label="Reorder level" value={String(row.reorderPoint)} />
          <Info label="Cost" value={money(row.costPrice)} />
          <Info label="Stock value" value={money(row.value)} />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            onClick={() => onAction("receive")}
            className="rounded-lg bg-[hsl(var(--primary))] px-2 py-3 text-[11px] font-bold text-[hsl(var(--primary-foreground))]"
          >
            Receive
          </button>
          <button
            onClick={() => onAction("adjust")}
            className="rounded-lg border px-2 py-3 text-[11px] font-bold"
          >
            Adjust
          </button>
          <button
            onClick={() => onAction("transfer")}
            className="rounded-lg border px-2 py-3 text-[11px] font-bold"
          >
            Transfer
          </button>
        </div>
        <div className="mt-5 grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
          <Info label="School" value={row.school} />
          <Info label="Category" value={row.category} />
          <Info
            label="Size / variant"
            value={(row.sizes ?? []).join(", ") || "Standard"}
          />
          <Info label="Selling price" value={money(row.retailPrice)} />
        </div>
        <div className="mt-5 rounded-xl border p-4">
          <div className="flex items-center gap-2 font-display text-base font-bold">
            <Boxes size={17} className="text-[hsl(var(--secondary))]" />
            Size matrix
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(row.sizes.length ? row.sizes : ["Standard"]).map(
              (size, index) => (
                <button
                  key={size}
                  onClick={() => onAction("count")}
                  className="rounded-lg border p-2 text-left text-xs font-bold hover:border-[hsl(var(--secondary))]"
                >
                  <span className="block text-[10px] text-[hsl(var(--muted-foreground))]">
                    Size {size}
                  </span>
                  <span className="mt-1 block">
                    {Math.max(0, row.onHand - index * 7)}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
        <div className="mt-5 rounded-xl border p-4">
          <div className="flex items-center gap-2 font-display text-base font-bold">
            <History size={17} className="text-[hsl(var(--secondary))]" />
            Stock movement history
          </div>
          {movements.length ? (
            <div className="mt-3 divide-y divide-[hsl(var(--border))]">
              {movements.slice(0, 8).map((movement) => (
                <div
                  key={movement.id}
                  className="grid grid-cols-[1fr_auto] gap-3 py-3 text-xs"
                >
                  <div>
                    <div className="font-bold">
                      {movement.type}{" "}
                      <span className="ml-1 font-normal text-[hsl(var(--muted-foreground))]">
                        {movement.reference}
                      </span>
                    </div>
                    <div className="mt-1 text-[hsl(var(--muted-foreground))]">
                      {movement.user} Â·{" "}
                      {new Date(movement.time).toLocaleDateString("en-KE")}
                    </div>
                  </div>
                  <div
                    className={`font-mono-app font-bold ${movement.quantity >= 0 ? "text-[hsl(145_37%_30%)]" : "text-[hsl(var(--destructive))]"}`}
                  >
                    {movement.quantity >= 0 ? "+" : ""}
                    {movement.quantity}
                    <div className="text-right font-sans text-[10px] font-normal text-[hsl(var(--muted-foreground))]">
                      bal. {movement.balance}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
              No stock movements have been recorded.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function InventoryModule() {
  const shopId = sessionStorage.getItem("pajoy-shop-id") || "shop-1";
  const inventory = useListInventory(
    { shopId },
    { query: { queryKey: getListInventoryQueryKey({ shopId }) } },
  );
  const products = useListProducts(
    { shopId },
    { query: { queryKey: getListProductsQueryKey({ shopId }) } },
  );
  const [search, setSearch] = useState("");
  const [school, setSchool] = useState("All Schools");
  const [category, setCategory] = useState("All Categories");
  const [location, setLocation] = useState("All Locations");
  const [size, setSize] = useState("All Sizes");
  const [status, setStatus] = useState("All");
  const [tab, setTab] = useState<FilterTab>("ALL");
  const [sort, setSort] = useState("product");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [overrides, setOverrides] =
    useState<Record<string, number>>(readOverrides);
  const [movements, setMovements] = useState(readMovements);
  const [message, setMessage] = useState("");
  const [clearingInventory, setClearingInventory] = useState(false);
  const allRows = (inventory.data ?? []) as InventoryRow[];
  const productMap = new Map(
    (products.data ?? []).map((product) => [product.id, product as Product]),
  );
  const rows = allRows.map((row) => {
    const product = productMap.get(row.productId);
    const onHand = overrides[row.id] ?? row.onHand;
    return {
      ...row,
      onHand,
      available: Math.max(0, onHand - row.reserved),
      value: onHand * Number(product?.costPrice ?? row.costPrice),
      school: product?.school ?? row.school ?? "Unassigned",
      category: product?.category ?? row.category,
      sizes: product?.sizes ?? row.sizes ?? [],
      costPrice: Number(product?.costPrice ?? row.costPrice),
      retailPrice: Number(product?.retailPrice ?? row.retailPrice),
    };
  });
  const option = (key: keyof InventoryRow) =>
    Array.from(new Set(rows.map((row) => String(row[key])).filter(Boolean)));
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const rowStatus = statusOf(row);
        const haystack =
          `${row.productName} ${row.sku} ${row.school} ${row.category}`.toLowerCase();
        return (
          (school === "All Schools" || row.school === school) &&
          (category === "All Categories" || row.category === category) &&
          (location === "All Locations" || row.branchName === location) &&
          (size === "All Sizes" || row.sizes.includes(size)) &&
          (status === "All" || rowStatus === status) &&
          (!search || haystack.includes(search.toLowerCase())) &&
          (tab === "ALL" ||
            (tab === "IN STOCK" && rowStatus === "In stock") ||
            (tab === "LOW STOCK" && rowStatus === "Low stock") ||
            (tab === "OUT OF STOCK" && rowStatus === "Out of stock") ||
            (tab === "RECENTLY RECEIVED" &&
              (movements[row.id] ?? []).some(
                (item) => item.type === "Received",
              )))
        );
      }),
    [rows, school, category, location, size, status, search, tab, movements],
  );
  const sorted = [...filtered].sort((a, b) =>
    sort === "stock"
      ? b.available - a.available
      : sort === "value"
        ? b.value - a.value
        : a.productName.localeCompare(b.productName),
  );
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
  const totalUnits = rows.reduce((sum, row) => sum + row.onHand, 0);
  const low = rows.filter((row) => statusOf(row) === "Low stock").length;
  const out = rows.filter((row) => statusOf(row) === "Out of stock").length;
  const value = rows.reduce((sum, row) => sum + row.value, 0);
  const clearFilters = () => {
    setSearch("");
    setSchool("All Schools");
    setCategory("All Categories");
    setLocation("All Locations");
    setSize("All Sizes");
    setStatus("All");
    setTab("ALL");
    setPage(1);
  };
  const openAction = (kind: ActionKind, row = selected ?? rows[0]) => {
    if (row) {
      setSelected(row);
      setAction(kind);
    }
  };
  const updateStock = (
    row: InventoryRow,
    kind: ActionKind,
    quantity: number,
    destination?: string,
    reason?: string,
  ) => {
    const next =
      kind === "receive"
        ? row.onHand + quantity
        : kind === "transfer"
          ? row.onHand - quantity
          : quantity;
    if (next < 0) return;
    const id = String(Date.now());
    const movement: Movement = {
      id,
      type:
        kind === "receive"
          ? "Received"
          : kind === "count"
            ? "Stock Count"
            : kind === "adjust"
              ? `Adjustment Â· ${reason}`
              : "Transfer Out",
      reference: `${kind.toUpperCase()}-${id.slice(-5)}`,
      quantity: next - row.onHand,
      balance: next,
      user: "Jane Kamau",
      time: new Date().toISOString(),
    };
    const nextMovements = {
      ...movements,
      [row.id]: [movement, ...(movements[row.id] ?? [])],
    };
    const nextOverrides = { ...overrides, [row.id]: next };
    setOverrides(nextOverrides);
    setMovements(nextMovements);
    localStorage.setItem(overrideKey, JSON.stringify(nextOverrides));
    localStorage.setItem(movementKey, JSON.stringify(nextMovements));
    setAction(null);
    setSelected(null);
    setMessage(
      kind === "receive"
        ? "Stock received successfully."
        : kind === "transfer"
          ? `Transfer to ${destination} created successfully.`
          : kind === "count"
            ? "Stock count finalized."
            : "Stock adjustment completed.",
    );
    setTimeout(() => setMessage(""), 2800);
  };
  const clearInventory = async () => {
    if (
      !window.confirm(
        `Delete all inventory records for ${shopId === "shop-2" ? "Shop 2" : "Shop 1"}? Products will be kept. This cannot be undone.`,
      )
    )
      return;
    setClearingInventory(true);
    try {
      const response = await authFetch(
        `/api/inventory?shopId=${encodeURIComponent(shopId)}`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirmation: "CLEAR_SHOP_INVENTORY" }),
        },
      );
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => ({}))).error ??
            "Inventory could not be cleared.",
        );
      localStorage.removeItem(overrideKey);
      localStorage.removeItem(movementKey);
      await inventory.refetch();
      setSelected(null);
      setMessage("All inventory records for this shop were deleted.");
      setTimeout(() => setMessage(""), 2800);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Inventory could not be cleared.",
      );
    } finally {
      setClearingInventory(false);
    }
  };
  const exportCsv = () => {
    const csv = [
      [
        "Product",
        "SKU",
        "School",
        "Category",
        "Location",
        "Stock",
        "Reorder level",
        "Cost",
        "Selling price",
        "Status",
      ],
      ...sorted.map((row) => [
        row.productName,
        row.sku,
        row.school,
        row.category,
        row.branchName,
        row.onHand,
        row.reorderPoint,
        row.costPrice,
        row.retailPrice,
        statusOf(row),
      ]),
    ]
      .map((line) =>
        line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "pajoy-inventory.csv";
    link.click();
  };
  return (
    <div className="animate-fade">
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--secondary))]">
            Stock control
          </div>
          <h1 className="font-display text-3xl font-bold tracking-[-.045em]">
            Inventory
          </h1>
          <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
            Manage uniforms, stock levels, locations and stock movements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openAction("receive")}
            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))]"
          >
            <PackagePlus size={16} />
            Receive stock
          </button>
          <button
            onClick={() => openAction("count")}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-bold"
          >
            <Check size={16} />
            Stock count
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-bold"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => void clearInventory()}
            disabled={clearingInventory}
            className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--destructive)/.45)] px-4 py-3 text-xs font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)]"
          >
            <Trash2 size={16} />
            {clearingInventory ? "Clearing..." : "Clear inventory"}
          </button>
        </div>
      </div>
      {message && (
        <div className="mb-4 rounded-lg border border-[hsl(var(--secondary)/.35)] bg-[hsl(var(--secondary)/.1)] px-4 py-3 text-sm font-semibold text-[hsl(var(--secondary))]">
          {message}
        </div>
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          label="Total items"
          value={totalUnits.toLocaleString()}
          detail="Units currently in stock"
          icon={<Boxes size={18} />}
        />
        <Summary
          label="Low stock"
          value={String(low)}
          detail="Products below reorder level"
          icon={<SlidersHorizontal size={18} />}
          active={tab === "LOW STOCK"}
          onClick={() => {
            setTab("LOW STOCK");
            setPage(1);
          }}
        />
        <Summary
          label="Out of stock"
          value={String(out)}
          detail="Products with zero stock"
          icon={<X size={18} />}
          active={tab === "OUT OF STOCK"}
          onClick={() => {
            setTab("OUT OF STOCK");
            setPage(1);
          }}
        />
        <Summary
          label="Stock value"
          value={money(value)}
          detail="Current cost valuation"
          icon={<PackagePlus size={18} />}
        />
      </div>
      <Panel className="overflow-hidden">
        <div className="border-b border-[hsl(var(--border))] p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3">
              <Search
                size={16}
                className="text-[hsl(var(--muted-foreground))]"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search product, SKU, barcode, school..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort inventory"
              className="h-11 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-xs font-bold"
            >
              <option value="product">Sort: Product</option>
              <option value="stock">Sort: Available stock</option>
              <option value="value">Sort: Stock value</option>
            </select>
            <button
              onClick={clearFilters}
              className="h-11 rounded-lg px-3 text-xs font-bold text-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))]"
            >
              Clear filters
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <SelectFilter
              label="School"
              value={school}
              options={["All Schools", ...option("school")]}
              onChange={(value) => {
                setSchool(value);
                setPage(1);
              }}
            />
            <SelectFilter
              label="Category"
              value={category}
              options={["All Categories", ...option("category")]}
              onChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            />
            <SelectFilter
              label="Size"
              value={size}
              options={[
                "All Sizes",
                ...Array.from(new Set(rows.flatMap((row) => row.sizes))),
              ]}
              onChange={(value) => {
                setSize(value);
                setPage(1);
              }}
            />
            <SelectFilter
              label="Location"
              value={location}
              options={["All Locations", ...option("branchName")]}
              onChange={(value) => {
                setLocation(value);
                setPage(1);
              }}
            />
            <SelectFilter
              label="Stock status"
              value={status}
              options={["All", "In stock", "Low stock", "Out of stock"]}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-[hsl(var(--border))] px-4 pt-3">
          {(
            [
              "ALL",
              "IN STOCK",
              "LOW STOCK",
              "OUT OF STOCK",
              "RECENTLY RECEIVED",
            ] as FilterTab[]
          ).map((item) => (
            <button
              key={item}
              onClick={() => {
                setTab(item);
                setPage(1);
              }}
              className={`whitespace-nowrap border-b-2 px-3 pb-3 text-[10px] font-bold tracking-[.12em] ${tab === item ? "border-[hsl(var(--secondary))] text-[hsl(var(--secondary))]" : "border-transparent text-[hsl(var(--muted-foreground))]"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {selectedRows.length > 0 && (
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] px-4 py-3 text-xs font-bold">
            <span>{selectedRows.length} selected</span>
            <button
              onClick={() =>
                openAction(
                  "transfer",
                  rows.find((row) => row.id === selectedRows[0]),
                )
              }
              className="ml-3 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-[10px] text-[hsl(var(--primary-foreground))]"
            >
              <Truck size={13} className="mr-1 inline" />
              Transfer
            </button>
            <button
              onClick={() => setSelectedRows([])}
              className="ml-auto text-[hsl(var(--muted-foreground))]"
            >
              Clear selection
            </button>
          </div>
        )}
        {inventory.isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-12 animate-pulse rounded-lg bg-[hsl(var(--muted))]"
              />
            ))}
          </div>
        ) : !paged.length ? (
          <EmptyState
            title="No inventory found"
            detail="Try changing your filters or search criteria."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1080px] text-left text-xs">
                <thead className="bg-[hsl(var(--muted)/.55)] text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={paged.every((row) =>
                          selectedRows.includes(row.id),
                        )}
                        onChange={(event) =>
                          setSelectedRows(
                            event.target.checked
                              ? paged.map((row) => row.id)
                              : [],
                          )
                        }
                        aria-label="Select all rows"
                      />
                    </th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Category / Size</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Reorder</th>
                    <th className="px-4 py-3">Cost / Price</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {paged.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-[hsl(var(--muted)/.25)]"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={(event) =>
                            setSelectedRows((current) =>
                              event.target.checked
                                ? [...current, row.id]
                                : current.filter((id) => id !== row.id),
                            )
                          }
                          aria-label={`Select ${row.productName}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelected(row)}
                          className="text-left font-bold hover:text-[hsl(var(--secondary))]"
                        >
                          {row.productName}
                          <span className="mt-1 block font-mono-app text-[10px] font-normal text-[hsl(var(--muted-foreground))]">
                            {row.sku}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4">{row.school}</td>
                      <td className="px-4 py-4">
                        <span className="font-semibold">{row.category}</span>
                        <span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">
                          {(row.sizes ?? []).join(", ") || "Standard"}
                        </span>
                      </td>
                      <td className="px-4 py-4">{row.branchName}</td>
                      <td className="px-4 py-4">
                        <span className="font-mono-app font-bold">
                          {row.available}
                        </span>
                        <span className="block text-[10px] text-[hsl(var(--muted-foreground))]">
                          {row.reserved} reserved
                        </span>
                      </td>
                      <td className="px-4 py-4">{row.reorderPoint}</td>
                      <td className="px-4 py-4">
                        <span>{money(row.costPrice)}</span>
                        <span className="block text-[10px] text-[hsl(var(--muted-foreground))]">
                          sell {money(row.retailPrice)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(statusOf(row))}`}
                        >
                          {statusOf(row)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelected(row)}
                          className="rounded-lg border px-2.5 py-2 text-[10px] font-bold hover:bg-[hsl(var(--muted))]"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[hsl(var(--border))] md:hidden">
              {paged.map((row) => (
                <button
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className="block w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{row.productName}</div>
                      <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        {row.school} Â· {row.branchName}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(statusOf(row))}`}
                    >
                      {statusOf(row)}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between text-xs">
                    <span>
                      {row.category} Â· {(row.sizes ?? []).join(", ") || "Standard"}
                    </span>
                    <strong>{row.available} available</strong>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
          <span>{sorted.length} inventory records</span>
          <div className="flex items-center gap-2">
            <span>
              Page {page} of {pageCount}
            </span>
            <button
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              aria-label="Previous page"
              className="rounded-lg border p-1.5 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Next page"
              className="rounded-lg border p-1.5 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </Panel>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-5 py-4 font-display text-base font-bold">
            <Truck size={17} className="text-[hsl(var(--secondary))]" />
            Inventory by location
          </div>
          <div className="grid gap-2 p-4 sm:grid-cols-2">
            {Array.from(new Set(rows.map((row) => row.branchName))).map(
              (branch) => {
                const branchRows = rows.filter(
                  (row) => row.branchName === branch,
                );
                return (
                  <button
                    key={branch}
                    onClick={() => {
                      setLocation(branch);
                      setPage(1);
                    }}
                    className="rounded-lg border p-3 text-left hover:border-[hsl(var(--secondary)/.6)]"
                  >
                    <div className="text-xs font-bold">{branch}</div>
                    <div className="mt-1 text-sm font-display font-bold">
                      {branchRows.reduce((sum, row) => sum + row.onHand, 0)}{" "}
                      units
                    </div>
                    <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                      {money(
                        branchRows.reduce((sum, row) => sum + row.value, 0),
                      )}
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-5 py-4 font-display text-base font-bold">
            <History size={17} className="text-[hsl(var(--secondary))]" />
            Recent stock movement
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {Object.values(movements)
              .flat()
              .slice(0, 4)
              .map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between px-5 py-3 text-xs"
                >
                  <div>
                    <div className="font-bold">{movement.type}</div>
                    <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                      {movement.reference} Â· {movement.user}
                    </div>
                  </div>
                  <span
                    className={`font-mono-app font-bold ${movement.quantity >= 0 ? "text-[hsl(145_37%_30%)]" : "text-[hsl(var(--destructive))]"}`}
                  >
                    {movement.quantity >= 0 ? "+" : ""}
                    {movement.quantity}
                  </span>
                </div>
              ))}
            {!Object.values(movements).flat().length && (
              <div className="p-5 text-sm text-[hsl(var(--muted-foreground))]">
                No stock movements have been recorded.
              </div>
            )}
          </div>
        </Panel>
      </div>
      {selected && !action && (
        <Details
          row={selected}
          movements={movements[selected.id] ?? []}
          onClose={() => setSelected(null)}
          onAction={openAction}
        />
      )}
      {action && selected && (
        <ActionModal
          kind={action}
          row={selected}
          onClose={() => setAction(null)}
          onSave={(quantity, destination, reason) =>
            updateStock(selected, action, quantity, destination, reason)
          }
        />
      )}
    </div>
  );
}
