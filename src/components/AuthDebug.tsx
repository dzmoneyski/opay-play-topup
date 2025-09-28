import React from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LogEntry {
  ts: number;
  kind: 'auth_event' | 'http_error' | 'info';
  message: string;
  details?: Record<string, any>;
}

const formatTs = (ts: number) => new Date(ts).toLocaleTimeString();

const parseJwtExp = (token?: string | null) => {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload && typeof payload.exp === 'number') return payload.exp * 1000;
  } catch {}
  return null;
};

const useAuthDebugState = () => {
  const [enabled, setEnabled] = React.useState<boolean>(() => {
    const fromQuery = new URLSearchParams(window.location.search).get('authDebug');
    if (fromQuery === '1') return true;
    return localStorage.getItem('auth_debug') === '1';
  });
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [event, setEvent] = React.useState<string>('INIT');
  const [accessExp, setAccessExp] = React.useState<number | null>(null);
  const [expiresIn, setExpiresIn] = React.useState<number | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);

  // Persist toggle
  React.useEffect(() => {
    localStorage.setItem('auth_debug', enabled ? '1' : '0');
  }, [enabled]);

  // Initial session read
  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const token = data.session?.access_token ?? null;
      setUserId(data.session?.user?.id ?? null);
      setAccessExp(parseJwtExp(token));
      setLogs((l) => [{ ts: Date.now(), kind: 'info', message: 'Initial session loaded', details: { userId: data.session?.user?.id } }, ...l]);
    });
    return () => { mounted = false; };
  }, []);

  // Auth state changes
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((ev, session) => {
      setEvent(ev);
      setUserId(session?.user?.id ?? null);
      setAccessExp(parseJwtExp(session?.access_token ?? null));
      setLogs((l) => [
        {
          ts: Date.now(),
          kind: 'auth_event',
          message: ev,
          details: {
            hasSession: !!session,
            userId: session?.user?.id,
            expiresAt: session?.expires_at,
          },
        },
        ...l,
      ]);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Compute expiresIn countdown
  React.useEffect(() => {
    if (!accessExp) { setExpiresIn(null); return; }
    const tick = () => setExpiresIn(Math.max(0, Math.floor((accessExp - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [accessExp]);

  // Intercept fetch to capture Supabase 401/429 errors
  React.useEffect(() => {
    if (!enabled) return;
    const original = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      const res = await original(input as any, init);
      try {
        if (url.includes('supabase.co')) {
          if (res.status === 401 || res.status === 429) {
            const clone = res.clone();
            let body: any = null;
            try { body = await clone.json(); } catch { body = await clone.text().catch(() => null); }
            setLogs((l) => [
              {
                ts: Date.now(),
                kind: 'http_error',
                message: `HTTP ${res.status} on ${new URL(url).pathname}`,
                details: { body },
              },
              ...l,
            ]);
          }
        }
      } catch {}
      return res;
    };
    return () => { window.fetch = original; };
  }, [enabled]);

  return { enabled, setEnabled, logs, event, expiresIn, userId };
};

const Badge: React.FC<{ label: string; tone?: 'ok' | 'warn' | 'err' }>
  = ({ label, tone = 'ok' }) => (
  <span className={
    `inline-block px-2 py-0.5 rounded text-xs font-mono ` +
    (tone === 'ok' ? 'bg-emerald-500/20 text-emerald-200' :
     tone === 'warn' ? 'bg-amber-500/20 text-amber-200' :
     'bg-red-500/20 text-red-200')
  }>
    {label}
  </span>
);

const AuthDebug: React.FC = () => {
  const { enabled, setEnabled, logs, event, expiresIn, userId } = useAuthDebugState();

  // Derived cause hints
  const lastHttpErr = logs.find((l) => l.kind === 'http_error');
  const cause = React.useMemo(() => {
    if (!enabled) return null;
    if (event === 'SIGNED_OUT') {
      if (lastHttpErr?.details && (lastHttpErr.details as any)) {
        const status = (lastHttpErr.details as any).status ?? undefined;
      }
      const recent429 = logs.find((l) => l.kind === 'http_error' && l.message.includes('HTTP 429'));
      if (recent429) return 'احتمال كبير: تم منع تحديث الرمز (429 rate limit) فتم إنهاء الجلسة.';
      return 'تم تسجيل الخروج. الأسباب المحتملة: انتهاء صلاحية الرمز، إلغاء الرمز، أو تبديل الجلسة.';
    }
    if (event === 'TOKEN_REFRESHED') return 'تم تحديث رمز الدخول بنجاح.';
    if (event === 'SIGNED_IN') return 'تم تسجيل الدخول. راقب العدّ التنازلي لانتهاء الرمز.';
    return null;
  }, [enabled, event, logs]);

  if (!enabled) {
    return (
      <button
        onClick={() => setEnabled(true)}
        className="fixed bottom-4 right-4 z-[1000] px-3 py-2 rounded-lg bg-black/60 text-white border border-white/10 hover:bg-black/70"
        aria-label="Enable Auth Debug"
      >
        تفعيل تشخيص المصادقة
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1000] w-[360px] max-h-[60vh] overflow-hidden rounded-xl bg-black/70 text-white border border-white/10 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Auth Debug</span>
          <Badge label={event} tone={event === 'SIGNED_OUT' ? 'err' : event === 'TOKEN_REFRESHED' ? 'ok' : 'warn'} />
        </div>
        <button onClick={() => setEnabled(false)} className="text-white/70 hover:text-white">إخفاء</button>
      </div>
      <div className="px-3 py-2 text-sm space-y-1 border-b border-white/10">
        <div>المستخدم: <span className="font-mono">{userId ?? '—'}</span></div>
        <div>ينتهي الرمز بعد: <span className="font-mono">{expiresIn != null ? `${expiresIn}s` : '—'}</span></div>
        {cause && <div className="text-amber-200">السبب المرجح: {cause}</div>}
        <div className="text-white/60">نصيحة: إن ظهر 429 على /token فهذا يعني تخطي الحد وسيحدث خروج تلقائي.</div>
      </div>
      <div className="max-h-[34vh] overflow-auto text-xs divide-y divide-white/5">
        {logs.slice(0, 30).map((l, idx) => (
          <div key={idx} className="px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-white/50 w-16">{formatTs(l.ts)}</span>
              <Badge label={l.kind} tone={l.kind === 'http_error' ? 'err' : l.kind === 'auth_event' ? 'warn' : 'ok'} />
            </div>
            <div className="mt-1 font-mono break-words">{l.message}</div>
            {l.details && (
              <pre className="mt-1 whitespace-pre-wrap break-words text-white/80">{JSON.stringify(l.details, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuthDebug;
