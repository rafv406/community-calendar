import React from 'react';
import { X, Calendar, MapPin, ExternalLink, Clock } from 'lucide-react';
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
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>
        
        {event.image_url && (
          <div className="modal-image-wrap">
            <img src={event.image_url} alt={event.title} className="modal-image" />
          </div>
        )}
        
        <div className="modal-org" style={{ color: sourceColor }}>
          {sourceName}
        </div>
        
        <h2 className="modal-title">
          {event.title}
        </h2>
        
        <div className="modal-meta">
          <div className="modal-meta-row">
            <Calendar className="modal-meta-icon" />
            <span>{dateStr}</span>
          </div>
          <div className="modal-meta-row">
            <Clock className="modal-meta-icon" />
            <span>{timeStr}</span>
          </div>
          {event.location && (
            <div className="modal-meta-row">
              <MapPin className="modal-meta-icon" />
              <span>{event.location}</span>
            </div>
          )}
        </div>
        
        {event.description && (
          <div className="modal-desc">
            {event.description}
          </div>
        )}
        
        <div className="modal-footer">
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener noreferrer" className="modal-action">
              See Event <ExternalLink size={14} className="ml-1.5" />
            </a>
          )}
          <button className="modal-secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
