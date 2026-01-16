'use client';

import { useState, useEffect } from 'react';
import PositionsTable from './components/PositionsTable';

export default function PaperTradingPage() {
  const [formData, setFormData] = useState({
    symbol: 'BTCUSDT',
    side: 'LONG' as 'LONG' | 'SHORT',
    sizeMode: 'USDT' as 'USDT' | 'QTY',
    sizeValue: '100',
    leverage: '1',
    entryType: 'MARKET' as 'MARKET' | 'LIMIT',
    limitPrice: '',
    sl: '5',
    tp: '10',
    slMode: 'PERCENT' as 'PERCENT' | 'PRICE',
    tpMode: 'PERCENT' as 'PERCENT' | 'PRICE',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Load default SL/TP from settings
  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const response = await fetch('/api/paper/settings');
        if (response.ok) {
          const settings = await response.json();
          setFormData(prev => ({
            ...prev,
            sl: settings.defaultStopLossPercent?.toString() || '5',
            tp: settings.defaultTakeProfitPercent?.toString() || '10',
          }));
        }
      } catch (err) {
        console.error('Failed to fetch default settings:', err);
      }
    };
    fetchDefaults();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/paper/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formData.symbol.toUpperCase(),
          side: formData.side,
          sizeMode: formData.sizeMode,
          sizeValue: parseFloat(formData.sizeValue),
          leverage: parseInt(formData.leverage),
          entryType: formData.entryType,
          limitPrice: formData.limitPrice ? parseFloat(formData.limitPrice) : undefined,
          sl: formData.sl ? parseFloat(formData.sl) : undefined,
          tp: formData.tp ? parseFloat(formData.tp) : undefined,
          slMode: formData.slMode,
          tpMode: formData.tpMode,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create position');
      }

      const position = await response.json();
      setSuccess(`Position created! ID: ${position.id}`);
      
      // Trigger table refresh
      setRefreshKey(prev => prev + 1);
      
      // Reset form
      setFormData({
        ...formData,
        sizeValue: '',
        limitPrice: '',
        sl: '',
        tp: '',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Paper Trading - Binance Futures</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem' }}>
        {/* Form */}
        <div style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Create Position</h2>

          <form onSubmit={handleSubmit}>
            {/* Symbol */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Symbol
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="BTCUSDT"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
            </div>

            {/* Side */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Side
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, side: 'LONG' })}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: formData.side === 'LONG' ? '#0ea5e9' : '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, side: 'SHORT' })}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: formData.side === 'SHORT' ? '#ef4444' : '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  SHORT
                </button>
              </div>
            </div>

            {/* Size Mode */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Size Mode
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sizeMode: 'USDT' })}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: formData.sizeMode === 'USDT' ? '#f0b90b' : '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#000',
                    cursor: 'pointer',
                    fontWeight: formData.sizeMode === 'USDT' ? 'bold' : 'normal',
                  }}
                >
                  USDT
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sizeMode: 'QTY' })}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: formData.sizeMode === 'QTY' ? '#f0b90b' : '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: formData.sizeMode === 'QTY' ? '#000' : '#fff',
                    cursor: 'pointer',
                    fontWeight: formData.sizeMode === 'QTY' ? 'bold' : 'normal',
                  }}
                >
                  QTY
                </button>
              </div>
            </div>

            {/* Size Value */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Size ({formData.sizeMode})
              </label>
              <input
                type="number"
                step="any"
                value={formData.sizeValue}
                onChange={(e) => setFormData({ ...formData, sizeValue: e.target.value })}
                placeholder={formData.sizeMode === 'USDT' ? '1000' : '0.01'}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
            </div>

            {/* Leverage */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Leverage
              </label>
              <input
                type="number"
                value={formData.leverage}
                onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
                min="1"
                max="125"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
            </div>

            {/* Entry Type */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Entry Type
              </label>
              <select
                value={formData.entryType}
                onChange={(e) => setFormData({ ...formData, entryType: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
              </select>
            </div>

            {/* Limit Price */}
            {formData.entryType === 'LIMIT' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Limit Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.limitPrice}
                  onChange={(e) => setFormData({ ...formData, limitPrice: e.target.value })}
                  placeholder="0.00"
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                  }}
                />
              </div>
            )}

            {/* Stop Loss */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Stop Loss (optional)
              </label>
              
              {/* Mode Toggle */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, slMode: 'PERCENT', sl: '' })}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    background: formData.slMode === 'PERCENT' ? '#0ea5e9' : '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, slMode: 'PRICE', sl: '' })}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    background: formData.slMode === 'PRICE' ? '#0ea5e9' : '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Price
                </button>
              </div>
              
              <input
                type="number"
                step="any"
                value={formData.sl}
                onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
                placeholder={formData.slMode === 'PERCENT' ? '5.0 (5%)' : '0.00'}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
            </div>

            {/* Take Profit */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Take Profit (optional)
              </label>
              
              {/* Mode Toggle */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tpMode: 'PERCENT', tp: '' })}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    background: formData.tpMode === 'PERCENT' ? '#0ea5e9' : '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tpMode: 'PRICE', tp: '' })}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    background: formData.tpMode === 'PRICE' ? '#0ea5e9' : '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Price
                </button>
              </div>
              
              <input
                type="number"
                step="any"
                value={formData.tp}
                onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
                placeholder={formData.tpMode === 'PERCENT' ? '10.0 (10%)' : '0.00'}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Strategy notes..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: loading ? '#666' : '#f0b90b',
                border: 'none',
                borderRadius: '4px',
                color: '#000',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating...' : 'Create Position'}
            </button>

            {/* Messages */}
            {error && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#ef4444',
                borderRadius: '4px',
                color: '#fff',
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#10b981',
                borderRadius: '4px',
                color: '#fff',
              }}>
                {success}
              </div>
            )}
          </form>
        </div>

        {/* Placeholder for positions table */}
        <div style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Open Positions</h2>
          <PositionsTable key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
