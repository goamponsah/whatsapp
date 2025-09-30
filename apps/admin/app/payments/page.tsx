'use client';
import { useState } from 'react';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
const AUTH = (process.env.NEXT_PUBLIC_ADMIN_TOKEN && `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`) || '';

export default function Payments() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState<number>(10000); // in pesewas/kobo
  const [result, setResult] = useState<any>(null);

  async function createLink() {
    const res = await fetch(`${SERVER}/admin/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(AUTH ? { Authorization: AUTH } : {}) },
      body: JSON.stringify({ email, amount }),
    });
    const data = await res.json();
    setResult(data);
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Payments</h1>
      <div style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <input placeholder="Customer Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
        <button onClick={createLink}>Create Payment Link</button>
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          <div><strong>Reference:</strong> {result.reference}</div>
          <div><a href={result.url} target="_blank" rel="noreferrer">Open Payment Page</a></div>
        </div>
      )}
    </div>
  );
}
