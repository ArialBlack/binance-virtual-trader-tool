'use client';

import { useState, useEffect } from 'react';

interface Settings {
  takerFee: number;
  makerFee: number;
  fundingEnabled: boolean;
  baseBalance: number;
  decimalPlaces: number;
  timezone: string;
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    takerFee: 0.0004,
    makerFee: 0.0002,
    fundingEnabled: false,
    baseBalance: 10000,
    decimalPlaces: 2,
    timezone: 'UTC',
    defaultStopLossPercent: 5.0,
    defaultTakeProfitPercent: 10.0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/paper/settings');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setSettings({
            takerFee: parseFloat(data.takerFee) || 0.0004,
            makerFee: parseFloat(data.makerFee) || 0.0002,
            fundingEnabled: data.fundingEnabled === 1,
            baseBalance: parseFloat(data.baseBalance) || 10000,
            decimalPlaces: parseInt(data.decimalPlaces) || 2,
            timezone: data.timezone || 'UTC',
            defaultStopLossPercent: parseFloat(data.defaultStopLossPercent) || 5.0,
            defaultTakeProfitPercent: parseFloat(data.defaultTakeProfitPercent) || 10.0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/paper/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (err) {
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
        Settings
      </h1>

      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '2rem', maxWidth: '800px' }}>
        {/* Fees Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Trading Fees
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
              Taker Fee (%)
            </label>
            <input
              type="number"
              step="0.0001"
              value={settings.takerFee * 100}
              onChange={(e) => handleChange('takerFee', parseFloat(e.target.value) / 100)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
              }}
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              Default: 0.04% (Binance taker fee)
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
              Maker Fee (%)
            </label>
            <input
              type="number"
              step="0.0001"
              value={settings.makerFee * 100}
              onChange={(e) => handleChange('makerFee', parseFloat(e.target.value) / 100)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
              }}
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              Default: 0.02% (Binance maker fee)
            </div>
          </div>
        </div>

        {/* Funding */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Funding
          </h2>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.fundingEnabled}
              onChange={(e) => handleChange('fundingEnabled', e.target.checked)}
              style={{ marginRight: '0.75rem', width: '20px', height: '20px' }}
            />
            <span>Enable funding rate simulation</span>
          </label>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', marginLeft: '2rem' }}>
            When enabled, funding fees will be deducted from PnL every 8 hours
          </div>
        </div>

        {/* Balance */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Account
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
              Base Balance (USDT)
            </label>
            <input
              type="number"
              step="100"
              value={settings.baseBalance}
              onChange={(e) => handleChange('baseBalance', parseFloat(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
              }}
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              Starting balance for PnL% calculations
            </div>
          </div>
        </div>

        {/* Default SL/TP */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Default Risk Management
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
              Default Stop Loss (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={settings.defaultStopLossPercent}
              onChange={(e) => handleChange('defaultStopLossPercent', parseFloat(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
              }}
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              Default percentage for Stop Loss when creating new positions
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
              Default Take Profit (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={settings.defaultTakeProfitPercent}
              onChange={(e) => handleChange('defaultTakeProfitPercent', parseFloat(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
              }}
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              Default percentage for Take Profit when creating new positions
            </div>
          </div>
        </div>

        {/* Display */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Display
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
              Decimal Places
            </label>
            <select
              value={settings.decimalPlaces}
              onChange={(e) => handleChange('decimalPlaces', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
              }}
            >
              <option value="2">2 decimal places</option>
              <option value="4">4 decimal places</option>
              <option value="6">6 decimal places</option>
              <option value="8">8 decimal places</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
              }}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">New York (EST)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Shanghai">Shanghai (CST)</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '1rem',
            background: '#0ea5e9',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        {/* Message */}
        {message && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: message.includes('success') ? '#10b981' : '#ef4444',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
