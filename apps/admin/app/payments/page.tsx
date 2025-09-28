'use client';
import { useState } from 'react';
const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
const AUTH = (process.env.NEXT_PUBLIC_ADMIN_TOKEN && `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`) || '';

export default function Payments() {
  const [email, setEmail] = useState('customer@example.com');
  const [amount, setAmount] = useState(1000); // kobo/pesewas: adjust per currency
  const [meta, setMeta] = useState('{"purpose":"booking","note":"demo"}');
  const [resp, setResp] = useState<any>(null);
  const [err, setErr] = useState('');

  async function createLink() {
    try {
      const res = await fetch(`${SERVER}/admin/payments/initiate`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, amount, metadata: JSON.parse(meta`, { headers: AUTH ? { 'Authorization': AUTH } : undefined }) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'failed');
      setResp(data);
      setErr('');
    } catch (e:any) {
      setErr(e.message);
      setResp(null);
    }
  }

  return (
    <div>
      <h1>Paystack Link (Test)</h1>
      <div style={{ display:'grid', gap:8, maxWidth:520 }}>
        <input placeholder="Customer email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="number" placeholder="Amount (e.g., GHS in pesewas)" value={amount} onChange={e=>setAmount(Number(e.target.value))} />
        <textarea rows={4} value={meta} onChange={e=>setMeta(e.target.value)} />
        <button onClick={createLink}>Create Payment Link</button>
        {err && <p style={{color:'crimson'}}>{err}</p>}
        {resp && <p>Link: <a href={resp.url} target="_blank">{resp.url}</a><br/>Ref: {resp.reference}</p>}
      </div>
      <p style={{marginTop:12,fontSize:12,opacity:0.8}}>Note: Ensure PAYSTACK_SECRET_KEY is set in server .env. Amount unit depends on currency settings (kobo/pesewas).</p>
    </div>
  );
}
