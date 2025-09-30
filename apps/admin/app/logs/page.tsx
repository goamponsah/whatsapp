'use client';
import { useState } from 'react';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
const AUTH = (process.env.NEXT_PUBLIC_ADMIN_TOKEN && `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`) || '';

export default function Logs() {
  const [tenant, setTenant] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [limit, setLimit] = useState(100);

  async function load() {
    if (!tenant) return;
    const res = await fetch(`${SERVER}/admin/logs?tenant_id=${encodeURIComponent(tenant)}&limit=${limit}`, {
      headers: AUTH ? { Authorization: AUTH } : undefined,
      cache: 'no-store',
    });
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Logs</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Tenant ID" value={tenant} onChange={(e) => setTenant(e.target.value)} />
        <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value) || 100)} />
        <button onClick={load}>Load</button>
      </div>

      <pre style={{ whiteSpace: 'pre-wrap' }}>
        {rows.map((r: any) => JSON.stringify(r, null, 2)).join('\n\n')}
      </pre>
    </div>
  );
}
