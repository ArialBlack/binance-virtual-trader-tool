'use client';

import { useState, useEffect } from 'react';

interface ClosedPosition {
  id: number;
  symbol: string;
  side: 'LONG' | 'SHORT';
  qty: number;
  entryPrice: number;
  closePrice: number;
  entryTime: number;
  closeTime: number;
  realizedPnl: number;
  feesOpen: number;
  feesClose: number;
  leverage: number;
  notes: string | null;
}

interface Event {
  id: number;
  positionId: number;
  event: string;
  payload: any;
  ts: number;
}

interface Stats {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  avgRMultiple: number;
  totalFees: number;
}

export default function HistoryPage() {
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'positions' | 'events' | 'stats'>('positions');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const posResponse = await fetch('/api/paper/positions?status=CLOSED');
      if (posResponse.ok) {
        const positions = await posResponse.json();
        setClosedPositions(positions);
      }

      const statsResponse = await fetch('/api/paper/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      const eventsResponse = await fetch('/api/paper/events?limit=100');
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => price.toFixed(5);
  const formatPnl = (pnl: number | null | undefined) => {
    if (pnl == null || isNaN(pnl)) return '0.00';
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(2)}`;
  };
  const formatPercent = (value: number | null | undefined) => {
    if (value == null || isNaN(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculatePnlPercent = (pos: ClosedPosition) => {
    const priceDiff = pos.side === 'LONG' 
      ? pos.closePrice - pos.entryPrice 
      : pos.entryPrice - pos.closePrice;
    const pnlPercent = (priceDiff / pos.entryPrice) * 100;
    return pnlPercent;
  };

  const groupPositionsByDay = () => {
    const groups: { [key: string]: ClosedPosition[] } = {};
    
    closedPositions.forEach(pos => {
      const date = new Date(pos.closeTime);
      const dayKey = date.toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(pos);
    });
    
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const dateA = new Date(a.split('.').reverse().join('-'));
      const dateB = new Date(b.split('.').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
    
    return { groups, sortedKeys };
  };

  const calculateDaySummary = (positions: ClosedPosition[]) => {
    const totalPnl = positions.reduce((sum, pos) => sum + pos.realizedPnl, 0);
    const totalFees = positions.reduce((sum, pos) => sum + pos.feesOpen + pos.feesClose, 0);
    const wins = positions.filter(pos => pos.realizedPnl > 0).length;
    const losses = positions.filter(pos => pos.realizedPnl < 0).length;
    const winRate = positions.length > 0 ? (wins / positions.length * 100) : 0;
    
    return { totalPnl, totalFees, wins, losses, winRate, totalTrades: positions.length };
  };

  const calculateOverallSummary = () => {
    const totalPnl = closedPositions.reduce((sum, pos) => sum + pos.realizedPnl, 0);
    const totalFees = closedPositions.reduce((sum, pos) => sum + pos.feesOpen + pos.feesClose, 0);
    const wins = closedPositions.filter(pos => pos.realizedPnl > 0).length;
    const losses = closedPositions.filter(pos => pos.realizedPnl < 0).length;
    const winRate = closedPositions.length > 0 ? (wins / closedPositions.length * 100) : 0;
    
    return { totalPnl, totalFees, wins, losses, winRate, totalTrades: closedPositions.length };
  };

  const handleExport = () => {
    window.location.href = '/api/paper/export';
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this position from history? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/paper/positions/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setClosedPositions((prev) => prev.filter((pos) => pos.id !== id));
      } else {
        alert('Failed to delete position');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete position');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        Loading history...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
          Trading History & Statistics
        </h1>
        <button
          onClick={handleExport}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#10b981',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Export to CSV
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #333' }}>
        <button
          onClick={() => setActiveTab('positions')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'positions' ? '2px solid #0ea5e9' : 'none',
            color: activeTab === 'positions' ? '#0ea5e9' : '#888',
            cursor: 'pointer',
            fontWeight: activeTab === 'positions' ? 'bold' : 'normal',
          }}
        >
          Closed Positions ({closedPositions.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'events' ? '2px solid #0ea5e9' : 'none',
            color: activeTab === 'events' ? '#0ea5e9' : '#888',
            cursor: 'pointer',
            fontWeight: activeTab === 'events' ? 'bold' : 'normal',
          }}
        >
          Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'stats' ? '2px solid #0ea5e9' : 'none',
            color: activeTab === 'stats' ? '#0ea5e9' : '#888',
            cursor: 'pointer',
            fontWeight: activeTab === 'stats' ? 'bold' : 'normal',
          }}
        >
          Statistics
        </button>
      </div>

      {/* Closed Positions Tab */}
      {activeTab === 'positions' && (
        <div>
          {closedPositions.length === 0 ? (
            <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '1.5rem' }}>
              <p style={{ color: '#888' }}>No closed positions yet</p>
            </div>
          ) : (
            <>
              {/* Overall Summary */}
              {(() => {
                const overall = calculateOverallSummary();
                return (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', 
                    border: '2px solid #3b82f6', 
                    borderRadius: '8px', 
                    padding: '1.5rem',
                    marginBottom: '2rem'
                  }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📊 Overall Summary (All Trades)
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#93c5fd', marginBottom: '0.25rem' }}>Total trades</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{overall.totalTrades}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#93c5fd', marginBottom: '0.25rem' }}>Win Rate</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: overall.winRate >= 50 ? '#10b981' : '#ef4444' }}>
                          {overall.winRate.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
                          {overall.wins}W / {overall.losses}L
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#93c5fd', marginBottom: '0.25rem' }}>Total PnL</div>
                        <div style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: 'bold',
                          color: overall.totalPnl >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          {formatPnl(overall.totalPnl)} USDT
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#93c5fd', marginBottom: '0.25rem' }}>Total fees</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                          -{overall.totalFees.toFixed(2)} USDT
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#93c5fd', marginBottom: '0.25rem' }}>Net PnL</div>
                        <div style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: 'bold',
                          color: (overall.totalPnl - overall.totalFees) >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          {formatPnl(overall.totalPnl - overall.totalFees)} USDT
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Grouped by Days */}
              {(() => {
                const { groups, sortedKeys } = groupPositionsByDay();
                return sortedKeys.map(dayKey => {
                  const dayPositions = groups[dayKey];
                  const daySummary = calculateDaySummary(dayPositions);
                  
                  return (
                    <div key={dayKey} style={{ marginBottom: '2rem' }}>
                      {/* Day Header */}
                      <div style={{ 
                        background: '#2a2a2a', 
                        border: '1px solid #444', 
                        borderRadius: '8px 8px 0 0',
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            📅 {dayKey}
                          </h3>
                          <div style={{ fontSize: '0.85rem', color: '#888' }}>
                            {daySummary.totalTrades} trades
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>Win Rate</div>
                            <div style={{ 
                              fontSize: '1rem', 
                              fontWeight: 'bold',
                              color: daySummary.winRate >= 50 ? '#10b981' : '#ef4444'
                            }}>
                              {daySummary.winRate.toFixed(0)}% ({daySummary.wins}W/{daySummary.losses}L)
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>Day PnL</div>
                            <div style={{ 
                              fontSize: '1.25rem', 
                              fontWeight: 'bold',
                              color: daySummary.totalPnl >= 0 ? '#10b981' : '#ef4444'
                            }}>
                              {formatPnl(daySummary.totalPnl)} USDT
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>Fees</div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f59e0b' }}>
                              -{daySummary.totalFees.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Day Positions Table */}
                      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderTop: 'none', borderRadius: '0 0 8px 8px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #444', background: '#0a0a0a' }}>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Entry Time</th>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Close Time</th>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Symbol</th>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Side</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>Size</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>Entry</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>Close</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>PnL</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>PnL %</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#888' }}>Fees</th>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Notes</th>
                              <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#888' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayPositions.map((pos) => {
                              const pnlPercent = calculatePnlPercent(pos);
                              return (
                              <tr key={pos.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{formatTime(pos.entryTime)}</td>
                                <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{formatTime(pos.closeTime)}</td>
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
                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatPrice(pos.closePrice)}</td>
                                <td
                                  style={{
                                    padding: '0.75rem',
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                    color: pos.realizedPnl >= 0 ? '#10b981' : '#ef4444',
                                  }}
                                >
                                  {formatPnl(pos.realizedPnl)}
                                </td>
                                <td
                                  style={{
                                    padding: '0.75rem',
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                    color: pnlPercent >= 0 ? '#10b981' : '#ef4444',
                                  }}
                                >
                                  {formatPnl(pnlPercent)}%
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444' }}>
                                  -{(pos.feesOpen + pos.feesClose).toFixed(2)}
                                </td>
                                <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#888', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pos.notes || ''}>
                                  {pos.notes || '-'}
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                  <button
                                    onClick={() => handleDelete(pos.id)}
                                    style={{
                                      padding: '0.4rem 0.8rem',
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
                                </td>
                              </tr>
                            );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()}
            </>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '1.5rem' }}>
          {events.length === 0 ? (
            <p style={{ color: '#888' }}>No events yet</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #444' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Time</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Event</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Position ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#888' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{formatTime(event.ts)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: event.event === 'position_created' ? '#10b981' : event.event === 'trigger_executed' ? '#ef4444' : '#6b7280',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                        }}>
                          {event.event}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>#{event.positionId}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#888' }}>
                        {JSON.stringify(event.payload).substring(0, 100)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && (
        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Total Trades</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalTrades || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Win Rate</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: (stats.winRate || 0) >= 50 ? '#10b981' : '#ef4444' }}>
                {formatPercent(stats.winRate)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#888' }}>
                {stats.winCount || 0}W / {stats.lossCount || 0}L
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Total PnL</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: (stats.totalPnl || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                {formatPnl(stats.totalPnl)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Average PnL</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: (stats.avgPnl || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                {formatPnl(stats.avgPnl)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Best Trade</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                {formatPnl(stats.bestTrade)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Worst Trade</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                {formatPnl(stats.worstTrade)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Avg R-Multiple</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {(stats.avgRMultiple || 0).toFixed(2)}R
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Total Fees</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                -{(stats.totalFees || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
