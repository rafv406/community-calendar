import React, { useEffect } from 'react';
import { X, Calendar, MapPin, ExternalLink, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { EventRecord } from '../hooks/useSupabaseEvents';

export const EventModal = ({ event, sourceColor, sourceName, onClose }: { 
  event: EventRecord | null, 
  sourceColor: string, 
  sourceName: string, 
  onClose: () => void 
}) => {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!event) return null;

  const dateObj = new Date(event.start_datetime);
  const dateStr = format(dateObj, 'EEEE, MMMM d, yyyy');
  const timeStr = event.all_day ? 'All Day' : format(dateObj, 'h:mm a');
  const categories: string[] = event.categories || [];

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={onClose}
      >
        <motion.div
          className="modal-panel"
          initial={{ y: 20, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 15, scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-left">
              <div className="modal-org-dot" style={{ background: sourceColor }} />
              <span className="modal-org-name" style={{ color: sourceColor }}>{sourceName}</span>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="modal-body">
            {event.image_url && (
              <div className="modal-image-wrap">
                <img src={event.image_url} alt={event.title} className="modal-image" />
              </div>
            )}

            <h2 className="modal-title">{event.title}</h2>

            {/* Meta details */}
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

            {/* Category tags */}
            {categories.length > 0 && (
              <div className="modal-tags-row">
                <Tag className="modal-meta-icon" style={{ flexShrink: 0 }} />
                <div className="modal-tags">
                  {categories.map((cat) => (
                    <span key={cat} className="modal-tag">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="modal-divider" />

            {/* Description */}
            {event.description ? (
              <div className="modal-desc">{event.description}</div>
            ) : (
              <div className="modal-desc modal-desc-empty">No additional details provided.</div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {event.url ? (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-action-btn"
                style={{ '--btn-color': sourceColor } as React.CSSProperties}
              >
                View Full Event <ExternalLink size={14} style={{ marginLeft: 8 }} />
              </a>
            ) : (
              <div />
            )}
            <button className="modal-close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
