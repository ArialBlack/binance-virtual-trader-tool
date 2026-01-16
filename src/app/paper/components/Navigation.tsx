'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav style={{ 
      background: '#1a1a1a', 
      borderBottom: '1px solid #333',
      padding: '1rem 2rem',
    
    }}>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        display: 'flex',
        gap: '2rem',
        alignItems: 'center'
      }}>
        <Link href="/paper" style={{ 
          fontSize: '1.25rem', 
          fontWeight: 'bold',
          textDecoration: 'none',
          color: '#fff'
        }}>
          Binance Paper Trader
        </Link>
        
        <div style={{ display: 'flex', gap: '1.5rem', marginLeft: 'auto' }}>
          <Link 
            href="/paper"
            style={{
              textDecoration: 'none',
              color: isActive('/paper') ? '#0ea5e9' : '#888',
              fontWeight: isActive('/paper') ? 'bold' : 'normal',
              padding: '0.5rem 1rem',
              borderBottom: isActive('/paper') ? '2px solid #0ea5e9' : 'none'
            }}
          >
            Trading
          </Link>
          
          <Link 
            href="/paper/history"
            style={{
              textDecoration: 'none',
              color: isActive('/paper/history') ? '#0ea5e9' : '#888',
              fontWeight: isActive('/paper/history') ? 'bold' : 'normal',
              padding: '0.5rem 1rem',
              borderBottom: isActive('/paper/history') ? '2px solid #0ea5e9' : 'none'
            }}
          >
            History
          </Link>
          
          <Link 
            href="/paper/settings"
            style={{
              textDecoration: 'none',
              color: isActive('/paper/settings') ? '#0ea5e9' : '#888',
              fontWeight: isActive('/paper/settings') ? 'bold' : 'normal',
              padding: '0.5rem 1rem',
              borderBottom: isActive('/paper/settings') ? '2px solid #0ea5e9' : 'none'
            }}
          >
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}
