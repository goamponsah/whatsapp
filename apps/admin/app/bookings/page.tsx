'use client';
import { useEffect, useState } from 'react';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
const AUTH = (process.env.NEXT_PUBLIC_ADMIN_TOKEN && `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`) || '';

export default function Bookings() {
  const [tenant, setTenant] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [limit, setLimit] = useState(50);

  // Create form
  const [userPhone, setUserPhone] = useState('+233...');
  const [userName, setUserName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Attach ref
  const [bookingId, setBookingId] = useState('');
  const [ref, setRef] = useState('');

  async function load() {
    const res = await fetch(`${SERVER}/admin/bookings?tenant_id=${tenant}&limit=${limit}``, { headers: AUTH ? { 'Authorization': AUTH } : undefined });
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
  }

  async function createBooking() {
    const res = await fetch(`${SERVER}/admin/bookings`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ tenant_id: tenant, user_phone: userPhone, user_name: userName, start_time: startTime, end_time: endTime }`, { headers: AUTH ? { 'Authorization': AUTH } : undefined })
    });
    await res.json();
    await load();
  }

  async function attachRef() {
    const res = await fetch(`${SERVER}/admin/bookings/attach_ref`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ booking_id: bookingId, paystack_ref: ref }`, { headers: AUTH ? { 'Authorization': AUTH } : undefined })
    });
    await res.json();
    await load();
  }

  return (
    <div>
      <h1>Bookings</h1>
      <div style={{ display:'flex', gap:8, marginBottom: 12 }}>
        <input placeholder="Tenant ID" value={tenant} onChange={e=>setTenant(e.target.value)} />
        <input type="number" placeholder="Limit" value={limit} onChange={e=>setLimit(Number(e.target.value))} />
        <button onClick={load}>Load</button>
      </div>

      <h3>Create Booking</h3>
      <div style={{ display:'grid', gap:8, maxWidth:560 }}>
        <input placeholder="User Phone" value={userPhone} onChange={e=>setUserPhone(e.target.value)} />
        <input placeholder="User Name (optional)" value={userName} onChange={e=>setUserName(e.target.value)} />
        <input type="datetime-local" value={startTime} onChange={e=>setStartTime(e.target.value)} />
        <input type="datetime-local" value={endTime} onChange={e=>setEndTime(e.target.value)} />
        <button onClick={createBooking}>Create</button>
      </div>

      <h3 style={{ marginTop: 24 }}>Attach Paystack Reference</h3>
      <div style={{ display:'grid', gap:8, maxWidth:560 }}>
        <input placeholder="Booking ID" value={bookingId} onChange={e=>setBookingId(e.target.value)} />
        <input placeholder="Paystack Reference" value={ref} onChange={e=>setRef(e.target.value)} />
        <button onClick={attachRef}>Attach</button>
      </div>

      <h3 style={{ marginTop: 24 }}>List</h3>
      <table style={{ borderCollapse:'collapse', width:'100%' }}>
        <thead>
          <tr>
            <th style={{border:'1px solid #ddd', padding:6}}>ID</th>
            <th style={{border:'1px solid #ddd', padding:6}}>User</th>
            <th style={{border:'1px solid #ddd', padding:6}}>Start</th>
            <th style={{border:'1px solid #ddd', padding:6}}>End</th>
            <th style={{border:'1px solid #ddd', padding:6}}>Status</th>
            <th style={{border:'1px solid #ddd', padding:6}}>Payment</th>
            <th style={{border:'1px solid #ddd', padding:6}}>Ref</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r:any) => (
            <tr key={r.id}>
              <td style={{border:'1px solid #ddd', padding:6, fontFamily:'monospace'}}>{r.id}</td>
              <td style={{border:'1px solid #ddd', padding:6}}>{r.user_name || ''}<div style={{fontSize:12, opacity:0.8}}>{r.user_phone}</div></td>
              <td style={{border:'1px solid #ddd', padding:6}}>{r.start_time ? new Date(r.start_time).toLocaleString() : ''}</td>
              <td style={{border:'1px solid #ddd', padding:6}}>{r.end_time ? new Date(r.end_time).toLocaleString() : ''}</td>
              <td style={{border:'1px solid #ddd', padding:6}}>{r.status}</td>
              <td style={{border:'1px solid #ddd', padding:6}}>{r.payment_status}</td>
              <td style={{border:'1px solid #ddd', padding:6, fontFamily:'monospace'}}>{r.paystack_ref || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
