import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseEvents, SourceRecord } from '../hooks/useSupabaseEvents';
import { SourceModal } from '../components/SourceModal';
import { LogOut, Plus, RefreshCw, Edit2, Play, Pause, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [modalSource, setModalSource] = useState<SourceRecord | null | undefined>(undefined);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  const fetchSources = async () => {
    const { data } = await supabase.from('sources').select('*').order('name');
    if (data) setSources(data);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleToggleActive = async (source: SourceRecord) => {
    await supabase.from('sources').update({ active: !source.active }).eq('id', source.id);
    fetchSources();
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this source and all associated events?')) return;

    try {
      // First delete all associated events to prevent foreign key errors
      const { error: eventsError } = await supabase.from('events').delete().eq('source_id', sourceId);
      if (eventsError) throw eventsError;

      const { error: sourceError } = await supabase.from('sources').delete().eq('id', sourceId);
      if (sourceError) throw sourceError;

      fetchSources();
    } catch (err: any) {
      console.error('Error deleting source:', err);
      alert('Failed to delete source: ' + (err.message || 'Unknown error'));
    }
  };

  const runSync = async (sourceId: string): Promise<boolean> => {
    try {
      const syncUrl = import.meta.env.VITE_SYNC_WORKER_URL || 'https://community-calendar-worker.rafvvids.workers.dev';
      const response = await fetch(`${syncUrl}?source_id=${sourceId}`, { method: 'GET' });
      if (!response.ok) {
        console.error('Failed to sync', await response.text());
        return false;
      }
      return true;
    } catch (err) {
      console.error('Network Error force syncing', err);
      return false;
    }
  };

  const handleForceSync = async (sourceId: string) => {
    setSyncing(prev => ({ ...prev, [sourceId]: true }));
    await runSync(sourceId);
    setTimeout(() => {
      fetchSources();
    }, 2000);
    setSyncing(prev => ({ ...prev, [sourceId]: false }));
  };

  const handleSyncAll = async () => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    try {
      const activeSources = sources.filter(s => s.active);
      const results = await Promise.all(activeSources.map(s => runSync(s.id)));
      const hasError = results.some(r => r === false);

      setSyncStatus(hasError ? 'error' : 'success');
      setTimeout(() => {
        fetchSources();
      }, 2000);

      setTimeout(() => {
        setSyncStatus('idle');
      }, 4000);
    } catch (err) {
      console.error('Network Error global syncing', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  const openNewSource = () => setModalSource(null);
  const closeSource = () => setModalSource(undefined);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#ffffff',
      color: '#0B1B42',
      fontFamily: '"DM Sans", "Inter", sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.25rem 6vw', borderBottom: '1px solid rgba(11,27,66,0.06)', backgroundColor: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer', margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#0B1B42' }}>
            RAFV <span style={{ color: '#003399', marginLeft: '2px' }}>INTELLIGENCE</span>
          </h1>
          <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(11,27,66,0.1)' }}></div>
          <button onClick={() => navigate('/')} style={{
              background: 'none', border: 'none', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'color 0.2s'
          }} onMouseOver={(e) => e.currentTarget.style.color = '#0B1B42'} onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}>
              Public View
          </button>
        </div>
        <button onClick={handleSignOut} style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
          color: '#64748b', padding: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'color 0.2s'
        }} onMouseOver={(e) => e.currentTarget.style.color = '#0B1B42'} onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}>
          <LogOut size={13} /> Exit System
        </button>
      </header>

      <div style={{ padding: '4rem 5vw', display: 'block', width: '100%', boxSizing: 'border-box', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', paddingBottom: '2.5rem', borderBottom: '1px solid rgba(11,27,66,0.06)', width: '100%' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#b0b8c8', marginBottom: '8px' }}>Management Suite</div>
            <h2 style={{ margin: 0, fontSize: '2.75rem', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.1, fontFamily: '"Cormorant Garamond", serif', color: '#0B1B42' }}>Control Center</h2>
            <p style={{ marginTop: '12px', marginBotto: 0, color: '#64748b', fontSize: '15px', letterSpacing: '0.01em', fontWeight: 400 }}>Stream management and synchronization protocols.</p>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '4px' }}>
            <button onClick={handleSyncAll} disabled={syncStatus !== 'idle'} style={{
              display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: `1px solid ${syncStatus === 'success' ? '#00cc6a' : syncStatus === 'error' ? '#cc0000' : 'rgba(11,27,66,0.1)'}`,
              color: syncStatus === 'success' ? '#00aa55' : syncStatus === 'error' ? '#cc0000' : '#0B1B42', padding: '12px 24px', borderRadius: '0', cursor: syncStatus !== 'idle' ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.15em', transition: 'all 0.3s', opacity: syncStatus === 'syncing' ? 0.5 : 1
            }} onMouseOver={(e) => { if (syncStatus === 'idle') { e.currentTarget.style.borderColor = '#0B1B42'; e.currentTarget.style.background = 'rgba(11,27,66,0.02)'; } }} onMouseOut={(e) => { if (syncStatus === 'idle') { e.currentTarget.style.borderColor = 'rgba(11,27,66,0.1)'; e.currentTarget.style.background = 'transparent'; } }}>
              {syncStatus === 'syncing' ? <RefreshCw size={14} className="animate-spin" /> :
                syncStatus === 'success' ? <CheckCircle2 size={14} /> :
                  syncStatus === 'error' ? <AlertCircle size={14} /> :
                    <RefreshCw size={14} />}
              {syncStatus === 'syncing' ? 'Processing...' :
                syncStatus === 'success' ? 'Sync Complete' :
                  syncStatus === 'error' ? 'Sync Failed' :
                    'Sync Active'}
            </button>
            <button onClick={openNewSource} style={{
              display: 'flex', alignItems: 'center', gap: '10px', background: '#0B1B42', border: '1px solid #0B1B42',
              color: '#fff', padding: '12px 24px', borderRadius: '0', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.15em', transition: 'all 0.3s'
            }} onMouseOver={(e) => e.currentTarget.style.background = '#152857'} onMouseOut={(e) => e.currentTarget.style.background = '#0B1B42'}>
              <Plus size={14} /> Add Source
            </button>
          </div>

        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1.8fr 2.5fr 100px 160px 200px 140px',
          gap: '20px',
          width: '100%',
          padding: '0 1.5rem 1rem 1.5rem', fontSize: '10px', fontWeight: 700, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.15em'
        }}>
          <div style={{ textAlign: 'left' }}>Identity</div>
          <div style={{ textAlign: 'left' }}>Endpoint</div>
          <div style={{ textAlign: 'center' }}>Format</div>
          <div style={{ textAlign: 'left' }}>Status</div>
          <div style={{ textAlign: 'left' }}>Last Synced</div>
          <div style={{ textAlign: 'right' }}>Controls</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', width: '100%', backgroundColor: 'rgba(11,27,66,0.06)', border: '1px solid rgba(11,27,66,0.06)' }}>
          {sources.map(s => {
            const isFailing = s.consecutive_failures >= 3;
            const hasWarning = s.consecutive_failures > 0 && s.consecutive_failures < 3;
            const statusColor = !s.active ? '#94a3b8' : isFailing ? '#ef4444' : hasWarning ? '#f59e0b' : '#10b981';
            const isSyncing = syncing[s.id];

            return (
              <div key={s.id} style={{
                display: 'flex', flexDirection: 'column', width: '100%',
                backgroundColor: '#ffffff',
                transition: 'all 0.2s ease',
                cursor: 'default'
              } as any} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fcfdfe'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1.8fr 2.5fr 100px 160px 200px 140px',
                  gap: '20px', width: '100%', padding: '1.5rem 1.5rem', alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                    <div style={{ width: '3px', height: '24px', backgroundColor: s.color, flexShrink: 0, borderRadius: '4px' }}></div>
                    <span style={{ color: !s.active ? '#94a3b8' : '#0B1B42', fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                  </div>

                  <div style={{ color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: '"JetBrains Mono", monospace', opacity: 0.8, minWidth: 0 }}>
                    {s.feed_url}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ padding: '4px 8px', border: '1px solid rgba(11,27,66,0.08)', fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '4px' }}>
                      {s.source_type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: statusColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: statusColor }}></div>
                    {!s.active ? 'Disabled' : isFailing ? 'Failure' : hasWarning ? 'Warning' : 'Nominal'}
                  </div>

                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 400, fontFamily: '"JetBrains Mono", monospace' }}>
                    {s.last_synced_at ? new Date(s.last_synced_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Never Sync'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px' }}>
                    <button
                      onClick={() => handleToggleActive(s)}
                      title={s.active ? "Suspend Stream" : "Activate Stream"}
                      style={{ background: 'none', border: 'none', color: s.active ? '#64748b' : '#cbd5e1', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.color = s.active ? '#ef4444' : '#10b981'; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = s.active ? '#64748b' : '#cbd5e1'; }}
                    >
                      {s.active ? <Pause size={16} strokeWidth={2} /> : <Play size={16} strokeWidth={2} />}
                    </button>
                    <button
                      onClick={() => setModalSource(s)}
                      title="Edit Configuration"
                      style={{ background: 'none', border: 'none', color: '#cbd5e1', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.color = '#0B1B42'; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = '#cbd5e1'; }}
                    >
                      <Edit2 size={16} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => handleForceSync(s.id)}
                      disabled={isSyncing || !s.active}
                      title="Force Synchronize"
                      style={{ background: 'none', border: 'none', color: (isSyncing || !s.active) ? '#f1f5f9' : '#003399', padding: '4px', cursor: (isSyncing || !s.active) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { if (!isSyncing && s.active) { e.currentTarget.style.color = '#0ea5e9'; } }}
                      onMouseOut={(e) => { if (!isSyncing && s.active) { e.currentTarget.style.color = '#003399'; } }}
                    >
                      <RefreshCw size={16} strokeWidth={2} className={isSyncing ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => handleDeleteSource(s.id)}
                      title="Delete Source"
                      style={{ background: 'none', border: 'none', color: '#cbd5e1', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = '#cbd5e1'; }}
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
                {s.last_error && (
                  <div style={{ padding: '0 1.5rem 1.25rem 1.5rem', marginTop: '-0.5rem', paddingTop: '1rem', borderTop: '1px dashed rgba(11,27,66,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: isFailing ? 'rgba(239, 68, 68, 0.03)' : 'rgba(245, 158, 11, 0.03)', padding: '12px', borderRadius: '4px' }}>
                      <AlertCircle size={13} color={statusColor} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ color: statusColor, fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.5, wordBreak: 'break-word' }}>
                         <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '8px' }}>Sync Error ({s.consecutive_failures} fails):</span>
                         {s.last_error}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sources.length === 0 && (
            <div style={{ padding: '6rem', backgroundColor: '#fff', textAlign: 'center', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>
              No Data Streams Provisioned
            </div>
          )}
        </div>
      </div>

      {modalSource !== undefined && (
        <SourceModal
          source={modalSource}
          onClose={closeSource}
          onSuccess={fetchSources}
        />
      )}
    </div>
  );
};
