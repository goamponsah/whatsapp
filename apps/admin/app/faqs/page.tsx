'use client';
import { useEffect, useState } from 'react';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
const AUTH = (process.env.NEXT_PUBLIC_ADMIN_TOKEN && `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`) || '';

export default function FAQs() {
  const [tenant, setTenant] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    if (!tenant) return;
    const res = await fetch(`${SERVER}/admin/faqs?tenant_id=${encodeURIComponent(tenant)}`, {
      headers: AUTH ? { Authorization: AUTH } : undefined,
      cache: 'no-store',
    });
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
  }

  async function upload() {
    const res = await fetch(`${SERVER}/admin/faqs/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(AUTH ? { Authorization: AUTH } : {}) },
      body: JSON.stringify({ tenant_id: tenant, title, content }),
    });
    if (!res.ok) {
      alert('Upload failed'); 
      return;
    }
    setTitle(''); setContent('');
    await load();
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>FAQs</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Tenant ID" value={tenant} onChange={(e) => setTenant(e.target.value)} />
        <button onClick={load}>Load</button>
      </div>

      <h3>Create / Upload</h3>
      <div style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Content" rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
        <button onClick={upload}>Save</button>
      </div>

      <h3 style={{ marginTop: 24 }}>List</h3>
      <ul>
        {rows.map((r: any) => (
          <li key={r.id}><strong>{r.title}</strong> — {r.content?.slice(0, 120) ?? ''}</li>
        ))}
      </ul>
    </div>
  );
}
