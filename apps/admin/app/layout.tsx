export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <aside style={{ width: 220, background: '#0a2540', color: 'white', padding: 16 }}>
            <h2>Admin</h2>
            <nav style={{ display: 'grid', gap: 8 }}>
              <a href="/" style={{ color: 'white' }}>Dashboard</a>
              <a href="/tenants" style={{ color: 'white' }}>Tenants</a>
              <a href="/faqs" style={{ color: 'white' }}>FAQs</a>
              <a href="/logs" style={{ color: 'white' }}>Logs</a>
                          <a href="/payments" style={{ color: 'white' }}>Payments</a>
                          <a href="/bookings" style={{ color: 'white' }}>Bookings</a>
              <a href="/payments" style={{ color: 'white' }}>Payments</a>
                          <a href="/calendar" style={{ color: 'white' }}>Calendar</a>
              <a href="/bookings" style={{ color: 'white' }}>Bookings</a>
              <a href="/payments" style={{ color: 'white' }}>Payments</a>
            </nav>
          </aside>
          <main style={{ flex: 1, padding: 24 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}