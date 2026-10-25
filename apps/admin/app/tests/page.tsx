'use client';
import { useState } from 'react';
import { adm, Title } from '@/components/admin';

const TONE = { pass: ['var(--sage-bg)', 'var(--sage-dark)'], fail: ['var(--err-bg)', 'var(--err)'], 'n/a': ['var(--soft-2)', 'var(--body)'] } as Record<string, string[]>;

export default function Tests() {
  const [res, setRes] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { setRes(await adm('/tests/run', { method: 'POST', body: {} })); } finally { setBusy(false); } };
  const groups = res ? Array.from(new Set(res.map((r) => r.group))) : [];
  const n = (s: string) => res!.filter((r) => r.status === s).length;
  return (
    <>
      <Title actions={<button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={run}>{busy ? 'Running…' : 'Run all tests'}</button>}>Test report</Title>
      <p className="muted" style={{ maxWidth: 720 }}>Each test runs the real business logic (the same code the server uses) against a fresh copy of the demo data. Nothing here touches your stored orders. Tests that need infrastructure are reported as not testable, not as passed.</p>
      {res ? <span style={{ fontSize: 15 }}>{res.length} scenarios: {n('pass')} passed, {n('fail')} failed, {n('n/a')} not testable here.</span> : null}
      {groups.map((g) => (
        <div key={g} className="panel" style={{ gap: 6 }}>
          <h2 className="h4" style={{ marginBottom: 6 }}>{g}</h2>
          {res!.filter((r) => r.group === g).map((t) => (
            <div key={t.name} className="row between wrap g12 small" style={{ borderTop: '1px solid var(--soft-2)', paddingTop: 6 }}>
              <span>{t.name}{t.detail ? <span className="muted"> · {t.detail}</span> : null}</span>
              <span className="pill" style={{ background: TONE[t.status][0], color: TONE[t.status][1] }}>{t.status === 'n/a' ? 'Not testable here' : t.status === 'pass' ? 'Passed' : 'Failed'}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
