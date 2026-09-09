import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";

export type AuthUser = {
  id: string;
  username: string;
  email?: string | null;
  role: string;
  branchId?: string | null;
  registerId?: string | null;
  permissions: string[];
};

let authToken = sessionStorage.getItem('pajoy-auth-token');

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  timedOut: boolean;
  retry: () => void;
  signIn: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);
export const apiUrl = () => (globalThis as typeof globalThis & { pajoyDesktop?: { apiUrl?: string }; __PAJOY_API_URL__?: string }).pajoyDesktop?.apiUrl || (globalThis as typeof globalThis & { __PAJOY_API_URL__?: string }).__PAJOY_API_URL__ || "";
export async function authFetch(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const headers = new Headers(init?.headers);
    if (authToken) headers.set('authorization', `Bearer ${authToken}`);
    return await fetch(`${apiUrl()}${path}`, { ...init, headers, credentials: "include", signal: init?.signal ?? controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    console.info('[Auth] Initializing authentication');
    console.info('[Auth] Checking session');
    const diagnosticTimeout = window.setTimeout(() => {
      if (active) {
        console.error('[Auth] Authentication initialization exceeded 10 seconds');
        setTimedOut(true);
      }
    }, 10000);
    void authFetch("/api/auth/me").then(async (response) => {
      console.info(`[Auth] Session check completed (${response.status})`);
      if (!response.ok) throw new Error(`Session check failed (${response.status})`);
      const data = await response.json() as (AuthUser & { token?: string }) | null;
      if (active) {
        if (data?.token) { authToken = data.token; sessionStorage.setItem('pajoy-auth-token', data.token); }
        setUser(data);
        setError(null);
        console.info(`[Auth] ${data ? 'Authenticated' : 'Unauthenticated'}`);
      }
    }).catch((cause) => {
      if (active) {
        const message = cause instanceof Error ? cause.message : 'Unable to check the session.';
        setError(message);
        console.error('[Auth] Session check failed', cause);
      }
    }).finally(() => {
      window.clearTimeout(diagnosticTimeout);
      if (active) setLoading(false);
    });
    return () => { active = false; window.clearTimeout(diagnosticTimeout); };
  }, [attempt]);
  const retry = () => { setError(null); setTimedOut(false); setLoading(true); setAttempt((value) => value + 1); };
  const signIn = async (username: string, password: string) => {
    const response = await authFetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
    const data = await response.json().catch(() => ({})) as { error?: string; token?: string } & AuthUser;
    if (!response.ok) throw new Error(data.error ?? "Unable to sign in. Please try again.");
    authToken = data.token ?? null;
    if (authToken) sessionStorage.setItem('pajoy-auth-token', authToken);
    setUser(data);
    return data;
  };
  const logout = async () => {
    await authFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    authToken = null;
    sessionStorage.removeItem('pajoy-auth-token');
  };
  const can = (permission: string) => Boolean(user && (user.permissions.includes("*") || user.permissions.includes(permission)));
  return <AuthContext.Provider value={{ user, loading, error, timedOut, retry, signIn, logout, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => { if (user) setLocation(user.role.toLowerCase() === "cashier" ? "/pos" : "/"); }, [user, setLocation]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) { setError("Enter your username and password."); return; }
    setPending(true); setError("");
    try { await signIn(username, password); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again."); } finally { setPending(false); }
  };
  return <main className="grid min-h-[100dvh] place-items-center bg-[hsl(var(--background))] p-5"><section className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-2xl"><div className="mb-8 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">P</div><div><div className="font-display text-xl font-bold">Pajoy Uniforms</div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">School Uniform POS</div></div></div><h1 className="font-display text-2xl font-bold">Sign in</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Access your cashier workspace securely.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold">Username or email</span><input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} className="h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--secondary))]" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Password</span><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--secondary))]" /></label><label className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />Show password</label>{error && <div role="alert" className="rounded-lg border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.08)] p-3 text-sm text-[hsl(var(--destructive))]">{error}</div>}<button disabled={pending} className="h-11 w-full rounded-lg bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-50">{pending ? "Signing in..." : "Sign In"}</button></form></section></main>;
}

export function AuthRecoveryPage({ retry }: { retry: () => void }) {
  const [, setLocation] = useLocation();
  return <main className="grid min-h-[100dvh] place-items-center bg-[hsl(var(--background))] p-5"><section className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-2xl"><div className="font-display text-xl font-bold">Authentication is taking longer than expected.</div><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">The application could not confirm the current session.</p><div className="mt-6 flex justify-center gap-3"><button onClick={retry} className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">Retry</button><button onClick={() => setLocation('/login')} className="rounded-lg border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-bold">Go to Login</button></div></section></main>;
}

export function UnauthorizedPage() {
  const [, setLocation] = useLocation();
  return <main className="grid min-h-[100dvh] place-items-center p-5"><section className="max-w-md text-center"><h1 className="font-display text-3xl font-bold">Access Denied</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">You do not have permission to access this page.</p><button onClick={() => setLocation("/pos")} className="mt-6 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))]">Return to POS</button></section></main>;
}
