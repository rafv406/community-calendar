import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { useSupabaseEvents, SourceRecord } from '../hooks/useSupabaseEvents';
import { EventModal } from '../components/EventModal';
import { Logo } from '../components/Logo';
import { Footer } from '../components/Footer';
import { HeaderHorizon } from '../components/HeaderHorizon';
import { CarouselVignette } from '../components/CarouselVignette';
import { ChevronLeft, ChevronRight, Search, Calendar, MapPin, Filter, Clock, Copy, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { CalendarChatbot } from '../components/CalendarChatbot';

const ICAL_URL = 'https://community-calendar.rafv.realtor/feed.ics';

const IcalBar = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ICAL_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = ICAL_URL;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="ical-bar-wrap">
      <div className="ical-bar">
        <Calendar className="ical-bar-icon" />
        <span className="ical-bar-label">Subscribe to our iCal feed</span>
        <span className="ical-bar-divider" />
        <span className="ical-bar-url">{ICAL_URL}</span>
        <button
          id="ical-copy-btn"
          className={`ical-copy-btn${copied ? ' copied' : ''}`}
          onClick={handleCopy}
          aria-label="Copy iCal link"
        >
          {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};

const hexToRgba = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const EventCarousel = ({ events, onEventClick }: { events: any[], onEventClick: (id: string) => void }) => {
  const [current, setCurrent] = useState(0);
  const total = events.length || 1;

  const advance = (dir: number) => {
    if (events.length === 0) return;
    setCurrent((prev) => (prev + dir + events.length) % events.length);
  };

  const goTo = (i: number) => {
    setCurrent(i);
  };

  const getPos = (i: number) => {
    if (events.length === 0) return 'pos-hidden-left';
    const diff = (i - current + total) % total;
    if (diff === 0) return 'pos-center';
    if (diff === 1) return 'pos-right';
    if (diff === total - 1) return 'pos-left';
    if (diff === 2) return 'pos-hidden-right';
    return 'pos-hidden-left';
  };

  return (
    <section className="carousel-section">
      <CarouselVignette />

      <motion.div 
        className="carousel-heading"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="carousel-eyebrow">March 2026</div>
        <div className="carousel-title">Upcoming Events</div>
      </motion.div>

      <div className="carousel-stage">
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--color-muted)' }}>No upcoming events</div>
        ) : events.map((ev, i) => (
          <div
            key={i}
            className={`event-card ${getPos(i)}`}
            onClick={() => {
              const diff = (i - current + total) % total;
              if (diff === 1) advance(1);
              else if (diff === total - 1) advance(-1);
              else if (diff === 0) onEventClick(ev.id);
            }}
            style={{
              '--glow-color': hexToRgba(ev.gFrom, 0.14),
              '--wash-color': hexToRgba(ev.gFrom, 0.035),
            } as React.CSSProperties}
          >
            <div className="card-body">
              <div className="card-date-compact">{ev.date} · {ev.time}</div>
              <div className="card-org-label" style={{ color: ev.orgColor }}>{ev.org}</div>
              <div className="card-title">{ev.title}</div>
              <div className="card-meta">
                <div className="card-meta-row">
                  <MapPin className="card-meta-icon" />
                  {ev.loc}
                </div>
              </div>
              <a href="#" className="card-link" onClick={(e) => e.preventDefault()}>
                See event <span className="ml-1">→</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="carousel-nav">
        <button className="nav-btn" onClick={() => advance(-1)} aria-label="Previous">
          <ChevronLeft size={14} />
        </button>
        <button className="nav-btn" onClick={() => advance(1)} aria-label="Next">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="carousel-dots">
        {events.map((_, i) => (
          <div
            key={i}
            className={`carousel-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
          ></div>
        ))}
      </div>
    </section>
  );
};

const CATEGORIES = [
  { id: 'fundraiser', label: 'Fundraiser', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  )},
  { id: 'meeting', label: 'Meeting', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  )},
  { id: 'workshop', label: 'Workshop', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
  )},
  { id: 'family', label: 'Family', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  )},
  { id: 'arts', label: 'Arts', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>
  )},
  { id: 'technology', label: 'Technology', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="0" ry="0" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
  )},
  { id: 'community', label: 'Community', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
  )},
  { id: 'ai', label: 'AI', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="8" width="14" height="12" rx="0" />
      <path d="M9 13h.01" strokeWidth="2" />
      <path d="M15 13h.01" strokeWidth="2" />
      <path d="M12 8V4" />
      <path d="M8 4h8" />
    </svg>
  )},
  { id: 'professional', label: 'Professional', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="0" ry="0" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
  )},
];

const CATEGORY_COLORS: Record<string, string> = {
  fundraiser: '#f59e0b',
  meeting: '#64748b',
  workshop: '#10b981',
  family: '#f43f5e',
  arts: '#8b5cf6',
  technology: '#06b6d4',
  community: '#3b82f6',
  ai: '#22c55e',
  professional: '#003399',
};

/* ── Scroll-triggered month divider with hero-inspired bloom animation ── */
const MonthDivider = ({ month }: { month: string }) => {
  const dividerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('in-view');
          observer.unobserve(node);
        }
      },
      { threshold: 0.3, rootMargin: '-40px 0px' }
    );
    observer.observe(node);
  }, []);

  return (
    <div className="month-divider" ref={dividerRef}>
      <div className="month-bloom" />
      <div className="month-dots" />
      <span className="month-divider-text">{month} 2026</span>
    </div>
  );
};

const BrowseEvents = ({ 
  events, 
  sources, 
  onEventClick, 
  onClearFilters,
  searchQuery,
  setSearchQuery,
  activeCategories,
  onCategoryToggle,
  searchingSemantic
}: { 
  events: any[], 
  sources: SourceRecord[], 
  onEventClick: (id: string) => void, 
  onClearFilters: () => void,
  searchQuery: string,
  setSearchQuery: (q: string) => void,
  activeCategories: Set<string>,
  onCategoryToggle: (cat: string) => void,
  searchingSemantic: boolean
}) => {
  const orgs = useMemo(() => {
    return (sources || []).map(source => {
      return { org: source.name, orgColor: source.color || '#003399' };
    });
  }, [sources]);

  const [activeOrgs, setActiveOrgs] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | '30days'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    if (orgs.length > 0 && activeOrgs.size === 0) {
      setActiveOrgs(new Set(orgs.map(o => o.org)));
    }
  }, [orgs.length]);

  const [view, setView] = useState<'list' | 'grid' | 'calendar'>('list');

  const filteredEvents = useMemo(() => {
    let result = events.filter(e => activeOrgs.has(e.org));
    
    if (dateRange !== 'all') {
      const now = new Date();
      result = result.filter(e => {
        const d = new Date(e.rawEvent.start_datetime);
        if (dateRange === 'week') {
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() + 7);
          return d >= now && d <= weekEnd;
        }
        if (dateRange === 'month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (dateRange === '30days') {
          const thirtyEnd = new Date(now);
          thirtyEnd.setDate(now.getDate() + 30);
          return d >= now && d <= thirtyEnd;
        }
        return true;
      });
    }
    
    return result;
  }, [activeOrgs, events, dateRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeOrgs, events]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage]);

  const renderPagination = () => {
    if (totalPages <= 0) return null;
    
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    const scrollToEvents = () => {
      document.querySelector('.events-container')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
      <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px', paddingBottom: '40px', width: '100%' }}>
        <button 
            className="pagination-btn"
            onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                scrollToEvents();
            }}
            disabled={currentPage === 1}
            style={{ padding: '8px 16px', borderRadius: '0', background: currentPage === 1 ? 'transparent' : 'var(--color-surface)', color: currentPage === 1 ? 'rgba(11,27,66,0.3)' : 'var(--color-navy)', border: '1px solid rgba(11,27,66,0.1)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
        >
          Previous
        </button>
        
        {startPage > 1 && (
            <>
                <button className="pagination-page" onClick={() => { setCurrentPage(1); scrollToEvents(); }} style={{ padding: '8px 12px', borderRadius: '0', background: 'transparent', color: 'var(--color-navy)', border: '1px solid transparent', cursor: 'pointer' }}>1</button>
                {startPage > 2 && <span style={{ color: 'rgba(11,27,66,0.5)' }}>...</span>}
            </>
        )}

        {pages.map(p => (
            <button
                key={p}
                className="pagination-page"
                onClick={() => { setCurrentPage(p); scrollToEvents(); }}
                style={{
                    padding: '8px 12px',
                    borderRadius: '0',
                    background: p === currentPage ? 'var(--color-surface)' : 'transparent',
                    color: p === currentPage ? 'var(--color-primary)' : 'var(--color-navy)',
                    border: p === currentPage ? '1px solid rgba(0,51,153,0.2)' : '1px solid transparent',
                    cursor: p === currentPage ? 'default' : 'pointer',
                    fontWeight: p === currentPage ? 600 : 400
                }}
            >
                {p}
            </button>
        ))}

        {endPage < totalPages && (
            <>
                {endPage < totalPages - 1 && <span style={{ color: 'rgba(11,27,66,0.5)' }}>...</span>}
                <button className="pagination-page" onClick={() => { setCurrentPage(totalPages); scrollToEvents(); }} style={{ padding: '8px 12px', borderRadius: '0', background: 'transparent', color: 'var(--color-navy)', border: '1px solid transparent', cursor: 'pointer' }}>{totalPages}</button>
            </>
        )}

        <button 
            className="pagination-btn"
            onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                scrollToEvents();
            }}
            disabled={currentPage === totalPages}
            style={{ padding: '8px 16px', borderRadius: '0', background: currentPage === totalPages ? 'transparent' : 'var(--color-surface)', color: currentPage === totalPages ? 'rgba(11,27,66,0.3)' : 'var(--color-navy)', border: '1px solid rgba(11,27,66,0.1)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
        >
          Next
        </button>
      </div>
    );
  };

  const toggleOrg = (org: string) => {
    const next = new Set(activeOrgs);
    if (next.has(org)) next.delete(org);
    else next.add(org);
    setActiveOrgs(next);
  };

  const groupedEvents = useMemo(() => {
    const groups: { month: string, events: any[] }[] = [];
    paginatedEvents.forEach(ev => {
      let group = groups[groups.length - 1];
      if (!group || group.month !== ev.month) {
        group = { month: ev.month, events: [] };
        groups.push(group);
      }
      group.events.push(ev);
    });
    return groups;
  }, [paginatedEvents]);

  const hasActiveFilters = activeCategories.size > 0 || searchQuery.trim() !== '' || activeOrgs.size < orgs.length || dateRange !== 'all';

  return (
    <div className="browse-section" id="browse-events">
      <motion.div 
        className="section-header-wrap"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="section-eyebrow">Discover</div>
        <div className="section-title-centered">All Events</div>
      </motion.div>

      {/* ── CATEGORY TILE GRID ── */}
      <motion.div 
        className="category-grid"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {CATEGORIES.map(cat => {
          const isActive = activeCategories.has(cat.id);
          const color = CATEGORY_COLORS[cat.id];
          return (
            <button
              key={cat.id}
              className={`category-tile ${isActive ? 'active' : ''}`}
              onClick={() => onCategoryToggle(cat.label)}
              style={{
                '--tile-color': color,
              } as React.CSSProperties}
            >
              <span className="tile-icon">{cat.icon}</span>
              <span className="tile-label">{cat.label}</span>
              {isActive && <span className="tile-active-indicator" />}
            </button>
          );
        })}
      </motion.div>

      {/* ── SEARCH + TOOLS BAR ── */}
      <div className="search-tools-bar">
        <style>{`
          @keyframes calendar-spin {
            to { transform: rotate(360deg); }
          }
          .semantic-search-spinner {
            animation: calendar-spin 0.8s linear infinite;
          }
        `}</style>
        <div className="search-input-wrap">
          {searchingSemantic ? (
            <Loader2 className="search-input-icon semantic-search-spinner" />
          ) : (
            <Search className="search-input-icon" />
          )}
          <input
            className="search-input"
            type="text"
            placeholder="Search events by name, location, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <button 
          className={`tools-toggle-btn ${showAdvanced ? 'open' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter style={{ width: 14, height: 14 }} />
          <span>Filters</span>
          <svg className="tools-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ── ADVANCED FILTERS TRAY ── */}
      <div className={`advanced-filters-tray ${showAdvanced ? 'open' : ''}`}>
        <div className="tray-inner">
          <div className="tray-group">
            <span className="tray-label">Sources</span>
            <div className="tray-chips">
              {orgs.map(({ org, orgColor }) => (
                <button
                  key={org}
                  className={`tray-chip ${activeOrgs.has(org) ? 'active' : ''}`}
                  onClick={() => toggleOrg(org)}
                >
                  <span
                    className="tray-chip-dot"
                    style={{ background: activeOrgs.has(org) ? '#fff' : orgColor }}
                  />
                  {org}
                </button>
              ))}
            </div>
          </div>
          <div className="tray-group">
            <span className="tray-label">Date Range</span>
            <div className="tray-chips">
              <button 
                className={`tray-chip ${dateRange === 'all' ? 'active' : ''}`}
                onClick={() => setDateRange('all')}
              >All Dates</button>
              <button 
                className={`tray-chip ${dateRange === 'week' ? 'active' : ''}`}
                onClick={() => setDateRange('week')}
              >This Week</button>
              <button 
                className={`tray-chip ${dateRange === 'month' ? 'active' : ''}`}
                onClick={() => setDateRange('month')}
              >This Month</button>
              <button 
                className={`tray-chip ${dateRange === '30days' ? 'active' : ''}`}
                onClick={() => setDateRange('30days')}
              >Next 30 Days</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RESULTS BAR ── */}
      <div className="results-bar">
        <div className="results-info">
          <span className="results-count">{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
          {hasActiveFilters && (
            <button 
              className="clear-all-btn"
              onClick={() => {
                setActiveOrgs(new Set(orgs.map(o => o.org)));
                setDateRange('all');
                onClearFilters();
              }}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="view-toggles">
          <button
            className={`view-btn ${view === 'list' ? 'active' : ''}`}
            title="List view"
            onClick={() => setView('list')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          <button
            className={`view-btn ${view === 'grid' ? 'active' : ''}`}
            title="Grid view"
            onClick={() => setView('grid')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="0" />
              <rect x="14" y="3" width="7" height="7" rx="0" />
              <rect x="3" y="14" width="7" height="7" rx="0" />
              <rect x="14" y="14" width="7" height="7" rx="0" />
            </svg>
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state" 
          style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-navy)', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(200,216,248,0.5)', marginTop: '20px' }}
        >
          <Search size={48} style={{ opacity: 0.2, margin: '0 auto 16px', color: '#003399' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>No events found</h3>
          <p style={{ color: 'rgba(11,27,66,0.6)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>We couldn't find any events matching your current filters. Try adjusting your search or category selection.</p>
          <button 
            onClick={() => {
              setActiveOrgs(new Set(orgs.map(o => o.org)));
              setDateRange('all');
              onClearFilters();
            }}
            className="submit-btn" 
            style={{ padding: '10px 24px', borderRadius: '0', background: '#003399', color: 'white', fontWeight: 500, cursor: 'pointer', border: 'none', boxShadow: '0 4px 14px rgba(0,51,153,0.3)' }}
          >
            Clear all filters
          </button>
        </motion.div>
      ) : (
        <>
          {view === 'list' && (
            <div className="events-list">
              {groupedEvents.map((group, gIdx) => (
                <div key={gIdx} className="month-group">
                  <MonthDivider month={group.month} />
                  <div className="month-events-wrapper">
                    {group.events.map((ev, evIdx) => (
                      <motion.div
                        key={ev.id || evIdx}
                        className="event-row"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-20px" }}
                        transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          '--glow-color': hexToRgba(ev.orgColor, 0.14),
                          '--wash-color': hexToRgba(ev.orgColor, 0.035),
                          cursor: 'pointer'
                        } as React.CSSProperties}
                        onClick={() => onEventClick(ev.id)}
                      >
                        <div className="row-date">
                          <div className="date-day">{ev.day}</div>
                          <div className="date-month">{ev.month.slice(0, 3)}</div>
                        </div>
                        <div className="row-main">
                          <div className="row-org">
                            <div className="row-org-dot" style={{ background: ev.orgColor }}></div>
                            <span className="row-org-name">{ev.org}</span>
                          </div>
                          <div className="row-title">{ev.title}</div>
                          <div className="row-meta">
                            <div className="row-meta-item">
                              <Clock className="row-meta-icon" />
                              {ev.time}
                            </div>
                            <div className="row-meta-item">
                              <MapPin className="row-meta-icon" />
                              {ev.loc}
                            </div>
                          </div>
                        </div>
                        <div className="row-right">
                          <div className="row-tags">
                            {(ev.rawEvent.categories && ev.rawEvent.categories.length > 0
                              ? ev.rawEvent.categories.slice(0, 2)
                              : [ev.cat]
                            ).map((tag: string) => (
                              <span key={tag} className="grid-tag">
                                {tag.charAt(0).toUpperCase() + tag.slice(1)}
                              </span>
                            ))}
                          </div>
                          <a href="#" className="row-link" onClick={(e) => e.preventDefault()}>See event →</a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'grid' && (
            <div className="events-grid">
              {paginatedEvents.map((ev) => (
                <motion.div
                  key={ev.id}
                  className="event-grid-card"
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => onEventClick(ev.id)}
                  style={{
                    '--glow-color': hexToRgba(ev.orgColor, 0.14),
                    '--wash-color': hexToRgba(ev.orgColor, 0.035),
                  } as React.CSSProperties}
                >
                  <div className="grid-card-body">
                    <div className="grid-card-date">
                      <span className="grid-day">{ev.day}</span>
                      <span className="grid-month">{ev.month.slice(0, 3)}</span>
                    </div>
                    <div className="grid-card-content">
                      <div className="grid-org-label" style={{ color: ev.orgColor }}>{ev.org}</div>
                      <div className="grid-title">{ev.title}</div>
                      <div className="grid-meta">
                        <div className="grid-meta-row">
                          <Clock className="grid-meta-icon" />
                          <span>{ev.time}</span>
                        </div>
                        <div className="grid-meta-row">
                          <MapPin className="grid-meta-icon" />
                          <span>{ev.loc}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid-card-footer">
                    <div className="grid-card-tags">
                      <span
                        className="grid-org-dot"
                        style={{ background: ev.orgColor }}
                      />
                      {(ev.rawEvent.categories && ev.rawEvent.categories.length > 0
                        ? ev.rawEvent.categories.slice(0, 2)
                        : [ev.cat]
                      ).map((tag: string) => (
                        <span key={tag} className="grid-tag">
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </span>
                      ))}
                    </div>
                    <a href="#" className="grid-link" onClick={(e) => e.preventDefault()}>→</a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
      
        </>
      )}

      {filteredEvents.length > 0 && renderPagination()}
    </div>
  );
};

export const CalendarView = () => {
  const { events, sources, loading, error } = useSupabaseEvents();

  const sourcesMap = useMemo(() => {
    const map = new Map<string, SourceRecord>();
    (sources || []).forEach(s => map.set(s.id, s));
    return map;
  }, [sources]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [semanticEvents, setSemanticEvents] = useState<any[] | null>(null);
  const [searchingSemantic, setSearchingSemantic] = useState(false);

  // Debounced semantic search fetching from the Cloudflare Worker search endpoint
  useEffect(() => {
    const qClean = searchQuery.trim().toLowerCase();
    if (!qClean) {
      setSemanticEvents(null);
      return;
    }

    // Direct month or year search bypasses semantic vector lookup to show all matches
    const isMonthQuery = [
      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
      'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ].includes(qClean);
    const isYearQuery = /^\d{4}$/.test(qClean);

    if (isMonthQuery || isYearQuery) {
      setSemanticEvents(null); // Bypass semantic vector search to trigger exact local filter
      return;
    }

    const workerApiUrl = import.meta.env.VITE_WORKER_API_URL || 'https://community-calendar-worker.rafvvids.workers.dev';
    const delayDebounce = setTimeout(async () => {
      try {
        setSearchingSemantic(true);
        const res = await fetch(`${workerApiUrl}/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSemanticEvents(data);
        } else {
          console.warn('Semantic search failed, falling back to client substring matching.');
          setSemanticEvents(null);
        }
      } catch (err) {
        console.error('Error running semantic search:', err);
        setSemanticEvents(null);
      } finally {
        setSearchingSemantic(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Restore state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setSearchQuery(q);
    const cats = params.get('category');
    if (cats) setActiveCategories(new Set(cats.split(',')));
  }, []);

  // Sync state back to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }

    if (activeCategories.size > 0) {
      params.set('category', Array.from(activeCategories).join(','));
    } else {
      params.delete('category');
    }

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [searchQuery, activeCategories]);

  const carouselEvents = useMemo(() => {
    return (events || []).slice(0, 6).map(ev => {
      const source = sourcesMap.get(ev.source_id);
      const orgColor = source?.color || '#003399';
      const dateObj = new Date(ev.start_datetime);

      return {
        id: ev.id,
        title: ev.title,
        org: ev.source_name,
        orgColor,
        gFrom: orgColor,
        gTo: '#ffffff',
        image_url: ev.image_url || source?.logo_url,
        date: format(dateObj, 'MMM d, yyyy'),
        time: ev.all_day ? 'All Day' : format(dateObj, 'h:mm a'),
        loc: ev.location || 'See details'
      };
    });
  }, [events, sourcesMap]);

  const browseEvents = useMemo(() => {
    let filtered = events || [];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      
      // If we have semantic search results from the worker, use them
      if (semanticEvents !== null && semanticEvents.length > 0) {
        filtered = semanticEvents;
      } else {
        // Otherwise, fall back to exact keyword & date substring matching
        filtered = events.filter(ev => {
          const titleMatch = ev.title.toLowerCase().includes(q);
          const descMatch = ev.description && ev.description.toLowerCase().includes(q);
          const locMatch = ev.location && ev.location.toLowerCase().includes(q);
          const srcMatch = ev.source_name.toLowerCase().includes(q);
          
          // Match month name of the event
          const dateObj = new Date(ev.start_datetime);
          const monthLong = dateObj.toLocaleString('default', { month: 'long' }).toLowerCase();
          const monthShort = dateObj.toLocaleString('default', { month: 'short' }).toLowerCase();
          const dateMatch = monthLong.includes(q) || monthShort.includes(q);
          
          return titleMatch || descMatch || locMatch || srcMatch || dateMatch;
        });
      }
    }

    if (activeCategories.size > 0) {
      filtered = filtered.filter(ev => {
        if (!ev.categories || ev.categories.length === 0) {
          // If no categories but they are searching for "community", maybe pass it? 
          // Defaulting to only showing if there is a match.
          return false;
        }
        return ev.categories.some(cat => activeCategories.has(cat.toLowerCase()));
      });
    }

    return filtered.map(ev => {
      const source = sourcesMap.get(ev.source_id);
      const dateObj = new Date(ev.start_datetime);

      const cat = ev.categories?.[0] ? ev.categories[0].charAt(0).toUpperCase() + ev.categories[0].slice(1) : 'Community';

      return {
        id: ev.id,
        title: ev.title,
        org: ev.source_name,
        orgColor: source?.color || '#003399',
        month: format(dateObj, 'MMMM'),
        day: format(dateObj, 'd'),
        time: ev.all_day ? 'All Day' : format(dateObj, 'h:mm a'),
        loc: ev.location || 'See details',
        cat,
        rawEvent: ev 
      };
    });
  }, [events, semanticEvents, sourcesMap, searchQuery, activeCategories]);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/community-calendar\/event\/([a-zA-Z0-9-]+)/);
      if (match) {
        setSelectedEventId(match[1]);
      } else {
        setSelectedEventId(null);
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openEvent = (id: string) => {
    setSelectedEventId(id);
    window.history.pushState({}, '', `/community-calendar/event/${id}`);
  };

  const closeEvent = () => {
    setSelectedEventId(null);
    window.history.pushState({}, '', '/community-calendar');
  };

  const selectedEventRecord = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find(ev => ev.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  return (
    <>
      <nav>
        <div className="nav-logo">
          <Logo />
        </div>
        <div className="nav-links">
          <a href="#browse-events">Events</a>
          <a href="#partners">Partners</a>
          <a href="mailto:hello@rafv.realtor">Contact</a>
        </div>
      </nav>

      <main>
        <div className="headline-wrap">
          <div className="headline-1">COMMUNITY</div>
          <div className="headline-2">CALENDAR</div>
          
          <div className="hero-actions">
            <button 
              className="hero-btn primary" 
              onClick={() => document.querySelector('.carousel-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              UPCOMING EVENTS
            </button>
            <button 
              className="hero-btn secondary" 
              onClick={() => document.querySelector('.events-container')?.scrollIntoView({ behavior: 'smooth' })}
            >
              ALL EVENTS
            </button>
          </div>

          <IcalBar />
        </div>

        <HeaderHorizon />
      </main>

      <section className="partners-section" id="partners">
        <div className="partners-title">Trusted Partners</div>
        <div className="partners-list">
          <div className="partner-logo brand-1">RAFV</div>
          <div className="partner-logo brand-2">NSBAR</div>
          <div className="partner-logo brand-3">Lazarus House</div>
        </div>
      </section>

      <EventCarousel events={carouselEvents} onEventClick={openEvent} />

      <div className="events-container">
        <BrowseEvents 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCategories={activeCategories}
          onCategoryToggle={(cat) => {
            const next = new Set(activeCategories);
            const lowerCat = cat.toLowerCase();
            if (next.has(lowerCat)) next.delete(lowerCat);
            else next.add(lowerCat);
            setActiveCategories(next);
          }}
          events={browseEvents} 
          sources={sources} 
          onEventClick={openEvent} 
          onClearFilters={() => {
            setSearchQuery('');
            setActiveCategories(new Set());
          }}
          searchingSemantic={searchingSemantic}
        />
      </div>

      {selectedEventRecord && (
        <EventModal
          event={selectedEventRecord}
          sourceName={selectedEventRecord.source_name}
          sourceColor={sourcesMap.get(selectedEventRecord.source_id)?.color || '#003399'}
          onClose={closeEvent}
        />
      )}
      <CalendarChatbot />
      <Footer />
    </>
  );
};
