'use client';
import { useState } from 'react';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
const AUTH = (process.env.NEXT_PUBLIC_ADMIN_TOKEN && `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`) || '';

export default function Tenants() {
  const [name, setName] = useState('Demo Hotel');
  const [phone, setPhone] = useState('+233555000111');
  const [msg, setMsg] = useState<string>('');

  async function createTenant() {
    const res = await fetch(`${SERVER}/admin/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(AUTH ? { 'Authorization': AUTH } : {}) },
      body: JSON.stringify({ name, whatsapp_number: phone }`, { headers: AUTH ? { 'Authorization': AUTH } : undefined })
    });
    const data = await res.json();
    setMsg('Tenant created: ' + (data?.id || JSON.stringify(data)));
  }

  return (
    <div>
      <h1>Tenants</h1>
      <div style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="WhatsApp Number (+233...)" value={phone} onChange={e=>setPhone(e.target.value)} />
        <button onClick={createTenant}>Create Tenant</button>
        <p>{msg}</p>
      </div>
    </div>
  );
}