'use client';
import { useState } from 'react';
const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
const AUTH = (process.env.NEXT_PUBLIC_ADMIN_TOKEN && `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`) || '';

export default function FAQs() {
  const [tenant, setTenant] = useState('');
  const [title, setTitle] = useState('Prices');
  const [content, setContent] = useState('Our price for standard room is GHS 250. We are open 8am-8pm daily.');
  const [status, setStatus] = useState('');

  async function upload() {
    const res = await fetch(`${SERVER}/admin/faqs/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(AUTH ? { 'Authorization': AUTH } : {}) },
      body: JSON.stringify({ tenant_id: tenant, title, content }`, { headers: AUTH ? { 'Authorization': AUTH } : undefined })
    });
    if (res.ok) setStatus('Uploaded');
    else setStatus('Error: ' + (await res.text()));
  }

  return (
    <div>
      <h1>Upload FAQ</h1>
      <div style={{ display: 'grid', gap: 8, maxWidth: 600 }}>
        <input placeholder="Tenant ID" value={tenant} onChange={e=>setTenant(e.target.value)} />
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea rows={8} value={content} onChange={e=>setContent(e.target.value)} />
        <button onClick={upload}>Upload</button>
        <p>{status}</p>
      </div>
    </div>
  );
}