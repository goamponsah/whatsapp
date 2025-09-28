'use client';
import { useState } from 'react';
const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
const AUTH = (process.env.NEXT_PUBLIC_ADMIN_TOKEN && `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`) || '';

export default function Logs() {
  const [tenant, setTenant] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [limit, setLimit] = useState(50);
  async function load() {
    const res = await fetch(`${SERVER}/admin/logs?tenant_id=${tenant}&limit=${limit}``, { headers: AUTH ? { 'Authorization': AUTH } : undefined });
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
  }
  return (
    <div>
      <h1>Logs</h1>
      <div style={{ display:'flex', gap:8, marginBottom: 12 }}>
        <input placeholder="Tenant ID" value={tenant} onChange={e=>setTenant(e.target.value)} />
        <input type="number" placeholder="Limit" value={limit} onChange={e=>setLimit(Number(e.target.value))} />
        <button onClick={load}>Load</button>
      </div>
      <table style={{ borderCollapse:'collapse', width:'100%' }}>
        <thead>
          <tr>
            <th style={{border:'1px solid #ddd', padding:6}}>Time</th>
            <th style={{border:'1px solid #ddd', padding:6}}>User</th>
            <th style={{border:'1px solid #ddd', padding:6}}>Dir</th>
            <th style={{border:'1px solid #ddd', padding:6}}>Intent</th>
            <th style={{border:'1px solid #ddd', padding:6}}>Conf</th>
            <th style={{border:'1px solid #ddd', padding:6}}>Body</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{border:'1px solid #ddd', padding:6}}>{new Date(r.created_at).toLocaleString()}</td>
              <td style={{border:'1px solid #ddd', padding:6}}>{r.user_phone}</td>
              <td style={{border:'1px solid #ddd', padding:6}}>{r.direction}</td>
              <td style={{border:'1px solid #ddd', padding:6}}>{r.intent}</td>
              <td style={{border:'1px solid #ddd', padding:6}}>{r.confidence ?? ''}</td>
              <td style={{border:'1px solid #ddd', padding:6, whiteSpace:'pre-wrap'}}>{r.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
