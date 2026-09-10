import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronRight, Clock3, CreditCard, Download, FileText, Package, Plus, Printer, Search, Shirt, Trash2, UserRound, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/auth';
import { authFetch } from '@/auth';

type JobStatus = 'New' | 'Confirmed' | 'In Progress' | 'Ready' | 'Collected' | 'Cancelled';
type Job = { id: string; date: string; customer: string; phone: string; student: string; studentId: string; school: string; branch: string; garment: string; sku: string; size: string; quantity: number; type: string; text: string; location: string; thread: string; font: string; design: string; designFileName?: string; total: number; paid: number; payment: string; status: JobStatus; expected: string; priority: 'Normal' | 'Urgent'; notes: string; createdBy: string };
const money = (value: number) => `KSh ${Math.round(value).toLocaleString('en-KE')}`;
const statuses: JobStatus[] = ['New', 'Confirmed', 'In Progress', 'Ready', 'Collected', 'Cancelled'];
const garments = ['School Shirt', 'Blouse', 'Sweater', 'Blazer', 'Sports Shirt', 'Tracksuit', 'Jacket', 'Other'];
const types = ['Student Name', 'Initials', 'School Name', 'School Logo', 'Custom Text', 'Other'];
const locations = ['Left Chest', 'Right Chest', 'Sleeve', 'Pocket', 'Collar', 'Back', 'Waist', 'Other'];
const threads = ['White', 'Black', 'Navy', 'Red', 'Green'];

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-xs)] ${className}`}>{children}</section>; }
function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'teal' }) { const colors = { neutral: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]', good: 'bg-[hsl(145_35%_88%)] text-[hsl(145_37%_30%)]', warn: 'bg-[hsl(40_95%_87%)] text-[hsl(30_60%_30%)]', danger: 'bg-[hsl(4_68%_92%)] text-[hsl(4_58%_39%)]', teal: 'bg-[hsl(174_37%_88%)] text-[hsl(174_45%_28%)]' }; return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${colors[tone]}`}>{children}</span>; }
function tone(status: JobStatus) { return status === 'Ready' || status === 'Collected' ? 'good' : status === 'Cancelled' ? 'danger' : status === 'In Progress' || status === 'Confirmed' ? 'teal' : 'warn'; }
function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Package }) { return <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-xs)]"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">{label}</span><Icon size={17} className="text-[hsl(var(--secondary))]" /></div><div className="mt-3 font-display text-2xl font-bold">{value}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</div></div>; }

function Details({ job, onClose, onDelete }: { job: any; onClose: () => void; onDelete: (id: string) => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  return (
    <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose}>
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-[hsl(var(--card))] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--secondary))]">Embroidery job</div>
            <h2 className="mt-1 font-display text-2xl font-bold">{job.orderNumber || job.id}</h2>
            <div className="mt-2 flex gap-2">
              <Badge tone={tone(job.status)}>{job.status}</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => window.print()} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><Printer size={17} /></button>
            {isAdmin && <button onClick={() => { if (window.confirm('Delete this embroidery job?')) onDelete(job.id); }} className="rounded-lg p-2 hover:bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]"><Trash2 size={17} /></button>}
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><X size={18} /></button>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
              <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Customer</div>
              <div className="mt-1 text-sm font-bold">{job.customerName || 'N/A'}</div>
            </div>
            <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
              <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Branch</div>
              <div className="mt-1 text-sm font-bold">{job.branchName || 'N/A'}</div>
            </div>
          </div>
          <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
            <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Artwork</div>
            <div className="mt-1 text-sm font-bold">{job.artworkName || 'N/A'}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
              <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Quantity</div>
              <div className="mt-1 text-sm font-bold">{job.quantity || 0}</div>
            </div>
            <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
              <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Size</div>
              <div className="mt-1 text-sm font-bold">{job.size || 'N/A'}</div>
            </div>
          </div>
          <div className="rounded-lg bg-[hsl(var(--muted)/.45)] p-3">
            <div className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Price</div>
            <div className="mt-1 text-2xl font-bold">{money(Number(job.price) || 0)}</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function EmbroideryModule() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [jobs, setJobs] = useState<any[]>([]);
  const [status, setStatus] = useState<JobStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/dtf/jobs')
      .then(res => res.ok ? res.json() : [])
      .then(data => { setJobs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setJobs([]); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/dtf/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setJobs(jobs.filter(j => j.id !== id));
        setSelected(null);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete job');
      }
    } catch (err) {
      alert('Failed to delete job');
    }
  };

  const filtered = useMemo(() => jobs.filter((job) => {
    const jobStatus = job.status || 'Queued';
    return (status === 'All' || jobStatus === status) &&
           (!search || `${job.orderNumber || job.id} ${job.customerName || ''} ${job.artworkName || ''}`.toLowerCase().includes(search.toLowerCase()));
  }), [jobs, status, search]);

  const total = jobs.length;
  const queued = jobs.filter((j) => j.status === 'Queued').length;
  const completed = jobs.filter((j) => j.status === 'Completed').length;

  if (loading) {
    return <div className="flex items-center justify-center py-20">Loading embroidery jobs...</div>;
  }

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--secondary))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
            Embroidery Services
          </div>
          <h1 className="font-display text-3xl font-bold tracking-[-.045em]">DTF Jobs</h1>
          <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">Manage embroidery and DTF printing jobs.</p>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Jobs" value={String(total)} detail="All jobs" icon={Package} />
        <Stat label="Queued" value={String(queued)} detail="Awaiting processing" icon={Clock3} />
        <Stat label="Completed" value={String(completed)} detail="Finished jobs" icon={Check} />
        <Stat label="Admin Access" value={isAdmin ? 'Yes' : 'No'} detail="Delete permission" icon={UserRound} />
      </div>
      <Panel className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2">
            <Search size={16} className="text-[hsl(var(--muted-foreground))]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className="flex-1 bg-transparent text-sm outline-none" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-10 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none">
            <option value="All">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Panel>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] text-left text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                <th className="pb-3 pl-4">Job</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Artwork</th>
                <th className="pb-3">Quantity</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.3)]">
                  <td className="py-3 pl-4 font-bold">{job.orderNumber || job.id}</td>
                  <td className="py-3">{job.customerName || 'N/A'}</td>
                  <td className="py-3">{job.artworkName || 'N/A'}</td>
                  <td className="py-3">{job.quantity || 0}</td>
                  <td className="py-3 font-bold">{money(Number(job.price) || 0)}</td>
                  <td className="py-3"><Badge tone={tone(job.status)}>{job.status}</Badge></td>
                  <td className="py-3 pr-4 text-right">
                    <button onClick={() => setSelected(job)} className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"><FileText size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">No embroidery jobs found.</div>}
      </Panel>
      {selected && <Details job={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />}
    </div>
  );
}
