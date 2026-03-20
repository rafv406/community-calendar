import React from 'react';
import { X, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { EventRecord } from '../hooks/useSupabaseEvents';

export const EventModal = ({ event, sourceColor, sourceName, onClose }: { 
  event: EventRecord, 
  sourceColor: string, 
  sourceName: string, 
  onClose: () => void 
}) => {
  if (!event) return null;

  const dateObj = new Date(event.start_datetime);
  const dateStr = format(dateObj, 'EEEE, MMMM d, yyyy');
  const timeStr = event.all_day ? 'All Day' : format(dateObj, 'h:mm a');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        {event.image_url && (
          <div style={{ marginBottom: '24px', borderRadius: '8px', overflow: 'hidden' }}>
            <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
          </div>
        )}
        
        <div className="modal-org" style={{ color: sourceColor, fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
          {sourceName}
        </div>
        
        <h2 className="modal-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', color: 'var(--color-navy)', marginBottom: '16px', lineHeight: 1.2 }}>
          {event.title}
        </h2>
        
        <div className="modal-meta" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gray)' }}>
            <Calendar size={16} />
            <span>{dateStr} · {timeStr}</span>
          </div>
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gray)' }}>
              <MapPin size={16} />
              <span>{event.location}</span>
            </div>
          )}
        </div>
        
        {event.description && (
          <div className="modal-desc" style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-navy)', marginBottom: '32px', whiteSpace: 'pre-wrap' }}>
            {event.description}
          </div>
        )}
        
        {event.url && (
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="modal-action" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--color-navy)', color: 'white', padding: '12px 24px', fontSize: '12px', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', textDecoration: 'none' }}>
            See Event <ExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  );
};
