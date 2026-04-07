import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SourceRecord } from '../hooks/useSupabaseEvents';
import { X } from 'lucide-react';

interface SourceModalProps {
  source?: SourceRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BRAND_COLORS = [
  '#003399', // RAFV Blue
  '#2563EB', // Bright Blue
  '#059669', // Emerald
  '#DC2626', // Red
  '#D97706', // Orange
  '#7C3AED', // Purple
  '#DB2777', // Pink
];

export const SourceModal = ({ source, onClose, onSuccess }: SourceModalProps) => {
  const [name, setName] = useState(source?.name || '');
  const [feedUrl, setFeedUrl] = useState(source?.feed_url || '');
  const [sourceType, setSourceType] = useState<string>(source?.source_type || 'ical');
  const [color, setColor] = useState(source?.color || BRAND_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (source) {
      setName(source.name);
      setFeedUrl(source.feed_url);
      setSourceType(source.source_type);
      setColor(source.color);
    } else {
      setName('');
      setFeedUrl('');
      setSourceType('ical');
      setColor(BRAND_COLORS[0]);
    }
  }, [source]);

  // Auto-detect format based on URL
  useEffect(() => {
    if (!feedUrl) return;
    const url = feedUrl.toLowerCase();
    if (url.startsWith('webcal://') || url.includes('.ics') || url.includes('google.com/calendar')) {
      setSourceType('ical');
    } else if (url.includes('.xml') || url.includes('.rss') || url.includes('/feed') || url.includes('/atom')) {
      setSourceType('rss');
    }
  }, [feedUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Protocol check
    const isSupported = /^https?:\/\//i.test(feedUrl) || /^webcal:\/\//i.test(feedUrl);
    if (!isSupported) {
      setError('Protocol unsupported. Link must start with https:// or webcal://');
      setLoading(false);
      return;
    }

    const payload = {
      name,
      feed_url: feedUrl,
      source_type: sourceType,
      color,
    };

    let res;
    if (source?.id) {
      res = await supabase.from('sources').update(payload).eq('id', source.id);
    } else {
      res = await supabase.from('sources').insert([payload]);
    }

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
    } else {
      setLoading(false);
      onSuccess();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', padding: '1.5rem', fontFamily: '"DM Sans", "Inter", sans-serif'
    }}>
      <div style={{
        backgroundColor: '#ffffff', width: '100%', maxWidth: '520px', borderRadius: '20px', border: '1px solid rgba(11,27,66,0.1)',
        display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 30px 60px rgba(11,27,66,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderBottom: '1px solid rgba(11,27,66,0.06)' }}>
          <h2 style={{ margin: 0, color: '#0B1B42', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            {source ? 'Configure Stream' : 'New Stream Identity'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#b0b8c8', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s', borderRadius: '50%' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#0B1B42'} onMouseOut={(e) => e.currentTarget.style.color = '#b0b8c8'}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '14px', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Stream Label <span style={{ color: '#ef4444' }}>*</span></label>
            <input 
              value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Lazarus House"
              style={{ backgroundColor: '#f8faff', border: '1px solid rgba(11,27,66,0.1)', color: '#0B1B42', padding: '14px 16px', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'all 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#003399'; e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0,51,153,0.05)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(11,27,66,0.1)'; e.currentTarget.style.backgroundColor = '#f8faff'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Feed Payload URL <span style={{ color: '#ef4444' }}>*</span></label>
            <input 
              value={feedUrl} onChange={e => setFeedUrl(e.target.value)} required type="text" placeholder="https://... or webcal://..."
              style={{ backgroundColor: '#f8faff', border: '1px solid rgba(11,27,66,0.1)', color: '#0B1B42', padding: '14px 16px', borderRadius: '12px', fontSize: '13px', fontFamily: '"JetBrains Mono", monospace', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'all 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#003399'; e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0,51,153,0.05)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(11,27,66,0.1)'; e.currentTarget.style.backgroundColor = '#f8faff'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Schema Type</label>
                {feedUrl && (
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#003399', letterSpacing: '0.15em' }}>RESOLVED</span>
                )}
              </div>
              <select 
                value={sourceType} onChange={e => setSourceType(e.target.value)}
                style={{ backgroundColor: '#f8faff', border: '1px solid rgba(11,27,66,0.1)', color: '#0B1B42', padding: '14px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', appearance: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#003399'; e.currentTarget.style.backgroundColor = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(11,27,66,0.1)'; e.currentTarget.style.backgroundColor = '#f8faff'; }}
              >
                <option value="ical">iCal Stream</option>
                <option value="rss">RSS / XML Feed</option>
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Brand Hue</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                {BRAND_COLORS.slice(0, 5).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: '24px', height: '24px', backgroundColor: c, border: color === c ? '2px solid #fff' : 'none',
                      cursor: 'pointer', padding: 0, outline: 'none', borderRadius: '50%', boxShadow: color === c ? `0 0 0 2px #0B1B42, 0 0 10px ${c}60` : 'none', transition: 'all 0.2s'
                    }}
                  />
                ))}
                <div style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '50%', border: '1px solid rgba(11,27,66,0.1)', overflow: 'hidden' }}>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      style={{
                        position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', border: 'none', padding: 0, cursor: 'pointer', outline: 'none'
                      }}
                    />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} style={{
              background: 'transparent', border: '1px solid rgba(11,27,66,0.1)', color: '#0B1B42', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s'
            }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0B1B42'; e.currentTarget.style.backgroundColor = 'rgba(11,27,66,0.02)'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(11,27,66,0.1)'; e.currentTarget.style.backgroundColor = 'transparent'; }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              background: loading ? '#f1f5f9' : '#0B1B42', border: 'none', color: '#fff', padding: '12px 32px', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(11,27,66,0.15)'
            }} onMouseOver={(e) => { if (!loading) { e.currentTarget.style.background = '#152857'; e.currentTarget.style.transform = 'translateY(-2px)'; } }} onMouseOut={(e) => { if (!loading) { e.currentTarget.style.background = '#0B1B42'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
              {loading ? 'Processing...' : 'Provision Stream'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
