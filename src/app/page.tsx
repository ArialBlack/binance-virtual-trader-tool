export default function HomePage() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Binance Virtual Trader Tool</h1>
      <p style={{ marginTop: '1rem' }}>
        Paper trading simulator for Binance Futures
      </p>
      <div style={{ marginTop: '2rem' }}>
        <a 
          href="/paper" 
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#f0b90b', 
            color: '#000',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          Open Paper Trading
        </a>
      </div>
    </main>
  )
}
