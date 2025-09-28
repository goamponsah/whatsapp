import { config } from 'dotenv';
config();
import { getPool, createTenant, upsertFAQ } from '../src/lib/db.js';

async function main() {
  const pool = await getPool();

  // 1) Create demo tenant (id returned)
  const name = process.env.SEED_TENANT_NAME || 'Demo Hotel';
  const wa = process.env.SEED_TENANT_WHATSAPP || '+233555000111';
  const tenant = await createTenant(name, wa);
  const tenant_id = tenant.id as string;

  console.log('Created tenant:', tenant_id, name);

  // 2) Insert FAQs
  const faqs = [
    { title: 'Prices', content: 'Our price for a standard room is GHS 250 per night. Deluxe room is GHS 400.' },
    { title: 'Hours', content: 'We are open 8am–8pm daily. Check-in starts at 2pm; check-out is 11am.' },
    { title: 'Location', content: 'We are located at 12 Independence Ave, Accra. Landmark: near the big roundabout.' },
  ];
  for (const f of faqs) {
    await upsertFAQ(tenant_id, f.title, f.content);
  }
  console.log('Inserted FAQs:', faqs.length);

  // 3) Availability rules Mon-Fri 09:00-17:00
  await pool.query('BEGIN');
  try {
    for (const weekday of [1,2,3,4,5]) {
      await pool.query(
        `INSERT INTO availability_rules (tenant_id, weekday, open_time, close_time, slot_minutes)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (tenant_id, weekday) DO UPDATE SET open_time=EXCLUDED.open_time, close_time=EXCLUDED.close_time, slot_minutes=EXCLUDED.slot_minutes`,
        [tenant_id, weekday, '09:00', '17:00', 60]
      );
    }
    await pool.query('COMMIT');
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
  console.log('Availability rules set for Mon–Fri 09:00–17:00');

  console.log('\nSeed complete! Use this tenant_id in Admin UI:', tenant_id);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
