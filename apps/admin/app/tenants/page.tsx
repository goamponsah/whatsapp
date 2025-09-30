'use client';
import { useState } from 'react';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
const AUTH = (process.env.NEXT_PUBLIC_ADMIN_TOKEN && `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`) || '';

export default function Tenants() {
  const [name, setName] = useState('');
  const [wa, setWa] = useState('');
  const [created, setCreated] = useState<any>(null);

  async function createTenant() {
    const res = await fetch(`${SERVER}/admin/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(AUTH ? { Authorization: AUTH } : {}) },
      body: JSON.stringify({ name, whatsapp_number: wa }),
    });
    const data = await res.json();
    setCreated(data);
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Tenants</h1>
      <div style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <input placeholder="Business Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="WhatsApp Number (+233...)" value={wa} onChange={(e) => setWa(e.target.value)} />
        <button onClick={createTenant}>Create</button>
      </div>

      {created && (
        <div style={{ marginTop: 16 }}>
          <div><strong>Tenant ID:</strong> <span style={{ fontFamily: 'monospace' }}>{created.id}</span></div>
          <div><strong>Name:</strong> {created.name}</div>
          <div><strong>WhatsApp:</strong> {created.whatsapp_number}</div>
        </div>
      )}
    </div>
  );
}
