'use client';

import { useState, useEffect } from 'react';

interface Position {
  id: number;
  symbol: string;
  side: 'LONG' | 'SHORT';
  qty: number;
  entryPrice: number;
  markPrice?: number;
  unrealizedPnl?: number;
  pnlPercent?: number;
  sl: number | null;
  tp: number | null;
  leverage: number;
  entryTime: number;
  notes: string | null;
}

export default function PositionsTable() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch initial positions
    fetchPositions();

    // Connect to SSE stream
    const eventSource = new EventSource('/api/paper/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'initial') {
          setPositions(data.data || []);
          setLoading(false);
        } else if (data.type === 'position-created') {
          // New position created, add to list
          setPositions((prev) => [...prev, data.data]);
        } else if (data.type === 'position-update') {
          setPositions((prev) =>
            prev.map((pos) =>
              pos.id === data.data.id
                ? {
                    ...pos,
                    markPrice: data.data.markPrice,
                    unrealizedPnl: data.data.unrealizedPnl,
                    pnlPercent: data.data.pnlPercent,
                  }
                : pos
            )
          );
        } else if (data.type === 'trigger-executed') {
          // Position was closed, remove from list
          setPositions((prev) => prev.filter((pos) => pos.id !== data.data.positionId));
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      setError('Connection lost. Reconnecting...');
      eventSource.close();
      // Retry connection after 5 seconds
      setTimeout(() => window.location.reload(), 5000);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/paper/positions?status=OPEN');
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      }
    } catch (err) {
      setError('Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: number) => {
    if (!confirm('Close this position?')) return;

    try {
      const response = await fetch(`/api/paper/positions/${id}/close`, {
        method: 'POST',
      });

      if (response.ok) {
        setPositions((prev) => prev.filter((pos) => pos.id !== id));
      } else {
        alert('Failed to close position');
      }
    } catch (err) {
      alert('Error closing position');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this position? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/paper/positions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPositions((prev) => prev.filter((pos) => pos.id !== id));
      } else {
        alert('Failed to delete position');
      }
    } catch (err) {
      alert('Error deleting position');
    }
  };

  const formatPrice = (price: number | undefined) => {
    return price?.toFixed(5) || '-';
  };

  const formatPriceWithPercent = (price: number | null, entryPrice: number, side: 'LONG' | 'SHORT') => {
    if (!price) return '-';
    const priceDiff = side === 'LONG' 
      ? price - entryPrice 
      : entryPrice - price;
    const percent = (priceDiff / entryPrice) * 100;
    const sign = percent >= 0 ? '+' : '';
    return `${price.toFixed(5)} (${sign}${percent.toFixed(2)}%)`;
  };

  const formatPnl = (pnl: number | undefined) => {
    if (pnl === undefined) return '-';
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(2)}`;
  };

  const formatPercent = (percent: number | undefined) => {
    if (percent === undefined) return '-';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading) {
    return <div style={{ color: '#888' }}>Loading positions...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444' }}>{error}</div>;
  }

  if (positions.length === 0) {
    return <div style={{ color: '#888' }}>No open positions</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #444' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Time</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Symbol</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Side</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>Size</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>Entry</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>Mark</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>PnL $</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>PnL %</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>SL</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>TP</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Notes</th>
            <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#888' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => (
            <tr key={pos.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
              <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{formatTime(pos.entryTime)}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{pos.symbol}</td>
              <td style={{ padding: '0.75rem' }}>
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: pos.side === 'LONG' ? '#0ea5e9' : '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                  }}
                >
                  {pos.side}
                </span>
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right' }}>{pos.qty.toFixed(4)}</td>
              <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatPrice(pos.entryPrice)}</td>
              <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                {formatPrice(pos.markPrice)}
              </td>
              <td
                style={{
                  padding: '0.75rem',
                  textAlign: 'right',
                  fontWeight: 'bold',
                  color: (pos.unrealizedPnl || 0) >= 0 ? '#10b981' : '#ef4444',
                }}
              >
                {formatPnl(pos.unrealizedPnl)}
              </td>
              <td
                style={{
                  padding: '0.75rem',
                  textAlign: 'right',
                  fontWeight: 'bold',
                  color: (pos.pnlPercent || 0) >= 0 ? '#10b981' : '#ef4444',
                }}
              >
                {formatPercent(pos.pnlPercent)}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444', fontSize: '0.85rem' }}>
                {formatPriceWithPercent(pos.sl, pos.entryPrice, pos.side)}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981', fontSize: '0.85rem' }}>
                {formatPriceWithPercent(pos.tp, pos.entryPrice, pos.side)}
              </td>
              <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#888', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pos.notes || ''}>
                {pos.notes || '-'}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleClose(pos.id)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleDelete(pos.id)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#6b7280',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
