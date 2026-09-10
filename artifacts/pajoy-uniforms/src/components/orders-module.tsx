import { useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, CreditCard, Download, FileText, PackageCheck, Plus, Printer, Search, Truck, UserRound, X } from 'lucide-react';
import { getListCustomersQueryKey, getListOrdersQueryKey, useListCustomers, useListOrders } from '@workspace/api-client-react';

type Status = 'Pending' | 'Confirmed' | 'Processing' | 'Partially Fulfilled' | 'Ready for Collection' | 'Collected' | 'Completed' | 'Cancelled';
type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid' | 'Refunded';
type OrderItem = { product: string; sku: string; size: string; quantity: number; unitPrice: number; fulfilled: number };
type Order = { id: string; date: string; customer: string; phone: string; student: string; school: string; branch: string; items: OrderItem[]; total: number; paid: number; payment: string; paymentStatus: PaymentStatus; fulfillment: 'Collection' | 'Delivery'; status: Status; createdBy: string; notes: string };

const money = (value: number) => `KSh ${Math.round(value).toLocaleString('en-KE')}`;
const statuses: Status[] = ['Pending', 'Confirmed', 'Processing', 'Partially Fulfilled', 'Ready for Collection', 'Collected', 'Completed', 'Cancelled'];
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-xs)] ${className}`}>{children}</section>; }
function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'teal' }) { const colors = { neutral: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]', good: 'bg-[hsl(145_35%_88%)] text-[hsl(145_37%_30%)]', warn: 'bg-[hsl(40_95%_87%)] text-[hsl(30_60%_30%)]', danger: 'bg-[hsl(4_68%_92%)] text-[hsl(4_58%_39%)]', teal: 'bg-[hsl(174_37%_88%)] text-[hsl(174_45%_28%)]' }; return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${colors[tone]}`}>{children}</span>; }
function statusTone(status: string) { return status === 'Completed' || status === 'Collected' || status === 'Ready for Collection' ? 'good' : status === 'Cancelled' ? 'danger' : status === 'Processing' || status === 'Confirmed' ? 'teal' : 'warn'; }
function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof ClipboardList }) { return <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-xs)]"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">{label}</span><Icon size={17} className="text-[hsl(var(--secondary))]" /></div><div className="mt-3 font-display text-2xl font-bold">{value}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</div></div>; }
function Input({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border bg-[hsl(var(--background))] px-3 text-sm outline-none focus:border-[hsl(var(--secondary))]" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border bg-[hsl(var(--background))] px-3 text-sm outline-none">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }

function Details({ order, onClose }: { order: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose}>
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-[hsl(var(--card))] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--secondary))]">Order details</div>
            <h2 className="mt-1 font-display text-2xl font-bold">{order.orderNumber}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={statusTone(order.status)}>{order.status}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={18} /></button>
        </div>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
              <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Customer</div>
              <div className="mt-1 text-sm font-bold">{order.customerName}</div>
            </div>
            <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
              <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Branch</div>
              <div className="mt-1 text-sm font-bold">{order.branchName || 'N/A'}</div>
            </div>
          </div>
          <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
            <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Total</div>
            <div className="mt-1 text-2xl font-bold">{money(Number(order.total))}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
              <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Paid</div>
              <div className="mt-1 text-sm font-bold">{money(Number(order.paid))}</div>
            </div>
            <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
              <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Balance</div>
              <div className="mt-1 text-sm font-bold">{money(Number(order.balance))}</div>
            </div>
          </div>
          {order.itemSummary && (
            <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
              <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Items</div>
              <div className="mt-1 text-sm">{order.itemSummary}</div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function OrdersModule() {
  const shopId = sessionStorage.getItem('pajoy-shop-id') || 'shop-1';
  const orders = useListOrders({ shopId }, { query: { queryKey: getListOrdersQueryKey({ shopId }) } });
  const customers = useListCustomers({ query: { queryKey: getListCustomersQueryKey() } });
  const [status, setStatus] = useState<Status | 'All'>('All');
  const [school, setSchool] = useState('All Schools');
  const [branch, setBranch] = useState('All Branches');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [page, setPage] = useState(1);

  const rows = (orders.data ?? []) as any[];
  const schoolOptions = ['All Schools', ...Array.from(new Set((customers.data ?? []).map((c: any) => c.school).filter(Boolean)))];
  const filtered = useMemo(() => rows.filter((order) => {
    const orderStatus = order.status || 'Pending';
    return (status === 'All' || orderStatus === status) &&
           (school === 'All Schools' || order.customerName === school) &&
           (!search || `${order.orderNumber} ${order.customerName}`.toLowerCase().includes(search.toLowerCase()));
  }), [rows, status, school, search]);

  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const total = rows.length;
  const pending = rows.filter((order) => ['Pending', 'In production'].includes(order.status)).length;
  const completed = rows.filter((order) => order.status === 'Completed').length;
  const outstanding = rows.reduce((sum, order) => sum + Math.max(0, Number(order.total) - Number(order.paid)), 0);
  const clear = () => { setSearch(''); setStatus('All'); setSchool('All Schools'); setBranch('All Branches'); setPage(1); };

  return <div><div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
    <div>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--secondary))]">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
        Orders Management
      </div>
      <h1 className="font-display text-3xl font-bold tracking-[-.045em]">School Orders</h1>
      <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">Track and manage uniform orders across all schools.</p>
    </div>
    <div className="flex gap-2">
      <button onClick={clear} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]">Clear Filters</button>
    </div>
  </div>
  <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
    <Stat label="Total Orders" value={String(total)} detail="All time orders" icon={ClipboardList} />
    <Stat label="Pending" value={String(pending)} detail="Awaiting processing" icon={PackageCheck} />
    <Stat label="Completed" value={String(completed)} detail="Fulfilled orders" icon={Check} />
    <Stat label="Outstanding" value={money(outstanding)} detail="Balance due" icon={CreditCard} />
  </div>
  <Panel className="mb-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2">
        <Search size={16} className="text-[hsl(var(--muted-foreground))]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number or customer..." className="flex-1 bg-transparent text-sm outline-none" />
      </div>
      <Select label="Status" value={status} options={['All', ...statuses]} onChange={setStatus} />
      <Select label="School" value={school} options={schoolOptions} onChange={setSchool} />
    </div>
  </Panel>
  <Panel>
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[hsl(var(--border))] text-left text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
            <th className="pb-3 pl-4">Order</th>
            <th className="pb-3">Customer</th>
            <th className="pb-3">School</th>
            <th className="pb-3">Total</th>
            <th className="pb-3">Paid</th>
            <th className="pb-3">Balance</th>
            <th className="pb-3">Status</th>
            <th className="pb-3 pr-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((order) => (
            <tr key={order.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.3)]">
              <td className="py-3 pl-4 font-bold">{order.orderNumber}</td>
              <td className="py-3">{order.customerName}</td>
              <td className="py-3">{order.customerName}</td>
              <td className="py-3 font-bold">{money(Number(order.total))}</td>
              <td className="py-3">{money(Number(order.paid))}</td>
              <td className="py-3 font-bold">{money(Number(order.balance))}</td>
              <td className="py-3"><Badge tone={statusTone(order.status)}>{order.status}</Badge></td>
              <td className="py-3 pr-4 text-right">
                <button onClick={() => setSelected(order)} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><FileText size={15} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {pageCount > 1 && <div className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4">
      <div className="text-xs text-[hsl(var(--muted-foreground))]">Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}</div>
      <div className="flex gap-1">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))] disabled:opacity-50"><ChevronLeft size={16} /></button>
        <button onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))] disabled:opacity-50"><ChevronRight size={16} /></button>
      </div>
    </div>}
  </Panel>
  {selected && <Details order={selected} onClose={() => setSelected(null)} />}
</div>;
}
