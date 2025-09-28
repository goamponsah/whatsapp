'use client';
import { useEffect, useMemo, useState } from 'react';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';

function firstDayOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastDayOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtISO(d: Date) { return d.toISOString().slice(0,10); }

export default function Calendar() {
  const [tenant, setTenant] = useState('');
  const [cursor, setCursor] = useState(() => new Date());
  const [slotsByDay, setSlotsByDay] = useState<Record<string, number>>({});

  const start = useMemo(() => {
    const f = firstDayOfMonth(cursor);
    const offset = f.getDay(); // 0=Sun
    return addDays(f, -offset);
  }, [cursor]);

  const days = useMemo(() => {
    return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
  }, [start]);

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      const map: Record<string, number> = {};
      // naive: fetch each day in month grid
      for (const d of days) {
        const ymd = fmtISO(d);
        const res = await fetch(`${SERVER}/admin/availability/slots?tenant_id=${tenant}&date=${ymd}`);
        const data = await res.json();
        map[ymd] = Array.isArray(data) ? data.length : 0;
      }
      setSlotsByDay(map);
    })();
  }, [tenant, days]);

  return (
    <div>
      <h1>Calendar (Availability)</h1>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input placeholder="Tenant ID" value={tenant} onChange={e=>setTenant(e.target.value)} />
        <button onClick={()=>setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}>Prev</button>
        <strong>{cursor.toLocaleString(undefined, { month:'long', year:'numeric' })}</strong>
        <button onClick={()=>setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}>Next</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ textAlign:'center', fontWeight:600 }}>{d}</div>
        ))}
        {days.map((d, i) => {
          const ymd = fmtISO(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const count = slotsByDay[ymd] || 0;
          return (
            <div key={i} style={{
              border:'1px solid #ddd', minHeight:80, padding:6, background: inMonth ? 'white' : '#f7f7f7'
            }}>
              <div style={{ fontSize:12, opacity:0.8 }}>{d.getDate()}</div>
              <div style={{ marginTop:8, fontSize:12 }}>{count} slots</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
