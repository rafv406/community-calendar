import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Search, Calendar, MapPin, Filter, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseEvents, SourceRecord } from './hooks/useSupabaseEvents';
import { format } from 'date-fns';
import { EventModal } from './components/EventModal';

type Organization = 'RAFV' | 'Fox Valley Arts' | 'Community Builders';
type Category = 'Community' | 'Arts' | 'Sports' | 'Family' | 'Fundraiser';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  organization: Organization;
  category: Category;
  description: string;
  featured?: boolean;
}

const ORG_COLORS: Record<Organization, string> = {
  'RAFV': 'var(--color-navy)',
  'Fox Valley Arts': 'var(--color-violet)',
  'Community Builders': 'var(--color-sky)',
};

const CATEGORIES: Category[] = ['Community', 'Arts', 'Sports', 'Family', 'Fundraiser'];

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
    const diff = (i - current + total) % total;
    if (diff === 0)          return 'pos-center';
    if (diff === 1)          return 'pos-right';
    if (diff === total - 1)  return 'pos-left';
    if (diff === 2)          return 'pos-hidden-right';
    return 'pos-hidden-left';
  };

  return (
    <section className="carousel-section">
      <div className="dissolve dissolve-left"></div>
      <div className="dissolve dissolve-right"></div>

      <div className="carousel-heading">
        <div className="carousel-eyebrow">March 2026</div>
        <div className="carousel-title">Upcoming Events</div>
      </div>

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
          >
            <div className="card-image">
              {ev.image_url ? (
                <div className="card-image-bg" style={{ backgroundImage: `url(${ev.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
              ) : (
                <div className="card-image-bg" style={{ background: `linear-gradient(135deg, ${ev.gFrom}, ${ev.gTo})` }}></div>
              )}
              <div className="card-org-bar" style={{ background: ev.orgColor }}></div>
              <div className="card-date-badge">{ev.date} · {ev.time}</div>
            </div>
            <div className="card-body">
              <div className="card-org-label" style={{ color: ev.orgColor }}>{ev.org}</div>
              <div className="card-title">{ev.title}</div>
              <div className="card-meta">
                <div className="card-meta-row">
                  <Calendar className="card-meta-icon" />
                  {ev.date}
                </div>
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

const SearchBar = ({ query, onQueryChange }: { query: string; onQueryChange: (q: string) => void }) => {
  return (
    <div className="search-bar-section">
      <div className="bar-wrap">
        <div className="bar-glow"></div>
        <div className="search-bar">
          {/* Search */}
          <div className="bar-field search-field">
            <Search className="field-icon" />
            <input 
              className="field-label" 
              type="text" 
              placeholder="Search events..." 
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="bar-field">
            <Calendar className="field-icon" />
            <span className="field-label">Date</span>
          </div>

          {/* Location */}
          <div className="bar-field">
            <MapPin className="field-icon" />
            <span className="field-label">Location</span>
          </div>

          {/* Event Type */}
          <div className="bar-field no-border">
            <Filter className="field-icon" />
            <span className="field-label">Event type</span>
          </div>

          {/* Submit */}
          <div className="bar-submit">
            <button className="submit-btn" onClick={(e) => e.preventDefault()}>Find Events</button>
          </div>
        </div>
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

const BrowseEvents = ({ events, onEventClick }: { events: any[], onEventClick: (id: string) => void }) => {
  const orgs = useMemo(() => {
    const uniqueOrgs = Array.from(new Set(events.map(e => e.org)));
    return uniqueOrgs.map(orgName => {
      const ev = events.find(e => e.org === orgName);
      return { org: orgName, orgColor: ev?.orgColor || '#003399' };
    });
  }, [events]);

  const [activeOrgs, setActiveOrgs] = useState<Set<string>>(new Set());
  
  // Auto-select all when orgs load
  useEffect(() => {
    if (orgs.length > 0 && activeOrgs.size === 0) {
      setActiveOrgs(new Set(orgs.map(o => o.org)));
    }
  }, [orgs.length]);

  const [view, setView] = useState<'list' | 'grid' | 'calendar'>('list');

  const filteredEvents = useMemo(() => {
    return events.filter(e => activeOrgs.has(e.org));
  }, [activeOrgs, events]);

  const toggleOrg = (org: string) => {
    const next = new Set(activeOrgs);
    if (next.has(org)) next.delete(org);
    else next.add(org);
    setActiveOrgs(next);
  };

  let lastMonth: string | null = null;

  return (
    <div className="browse-section">
      {/* Header */}
      <div className="browse-header">
        <div className="browse-header-left">
          <div className="browse-title">All Events</div>
          <div className="browse-count">{filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="view-toggles">
          <button 
            className={`view-btn ${view === 'list' ? 'active' : ''}`} 
            title="List view"
            onClick={() => setView('list')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          </button>
          <button 
            className={`view-btn ${view === 'grid' ? 'active' : ''}`} 
            title="Grid view"
            onClick={() => setView('grid')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
          <button 
            className={`view-btn ${view === 'calendar' ? 'active' : ''}`} 
            title="Calendar view"
            onClick={() => setView('calendar')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="browse-filters">
        <span className="filter-label">Filter</span>
        {orgs.map(({ org, orgColor }) => (
          <div 
            key={org}
            className={`filter-pill ${activeOrgs.has(org) ? 'active' : ''}`}
            onClick={() => toggleOrg(org)}
          >
            <span 
              className="pill-dot" 
              style={{ background: activeOrgs.has(org) ? 'rgba(255,255,255,0.7)' : orgColor }}
            ></span>
            {org}
          </div>
        ))}
      </div>

      {/* List */}
      <div className="events-list">
        {filteredEvents.map((ev, idx) => {
          const showDivider = ev.month !== lastMonth;
          if (showDivider) lastMonth = ev.month;

          return (
            <React.Fragment key={idx}>
              {showDivider && (
                <div className="month-divider">
                  {ev.month} 2026
                </div>
              )}
              <div 
                className="event-row"
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
                  <span className="row-category">{ev.cat}</span>
                  <a href="#" className="row-link" onClick={(e) => e.preventDefault()}>See event →</a>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Load more */}
      <div className="load-more-wrap">
        <div className="load-more-line"></div>
        <button className="load-more-btn">Load more events →</button>
        <div className="load-more-line"></div>
      </div>
    </div>
  );
};

export default function App() {
  const { events, sources, loading, error } = useSupabaseEvents();

  const sourcesMap = useMemo(() => {
    const map = new Map<string, SourceRecord>();
    sources.forEach(s => map.set(s.id, s));
    return map;
  }, [sources]);

  const [searchQuery, setSearchQuery] = useState('');

  const carouselEvents = useMemo(() => {
    // Show top 6 upcoming events
    return events.slice(0, 6).map(ev => {
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
    let filtered = events;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ev => 
        ev.title.toLowerCase().includes(q) || 
        (ev.location && ev.location.toLowerCase().includes(q)) ||
        ev.source_name.toLowerCase().includes(q)
      );
    }
    
    return filtered.map(ev => {
      const source = sourcesMap.get(ev.source_id);
      const dateObj = new Date(ev.start_datetime);
      
      // Capitalize first letter of category if present
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
        rawEvent: ev // Keep reference to real event for the Modal
      };
    });
  }, [events, sourcesMap, searchQuery]);

  const [dimensions, setDimensions] = useState({ cols: 22, rows: 3 });
  const gridRef = useRef<HTMLDivElement>(null);

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
    
    // Check initial
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

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 600;
      setDimensions({ cols: isMobile ? 14 : 22, rows: 3 });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!gridRef.current) return;
    const grid = gridRef.current;
    const { cols: COLS, rows: ROWS } = dimensions;
    const TOTAL = COLS * ROWS;
    
    grid.innerHTML = '';
    const dots: HTMLDivElement[] = [];

    for (let i = 0; i < TOTAL; i++) {
      const d = document.createElement('div');
      d.className = 'dot';
      grid.appendChild(d);
      dots.push(d);
    }

    function entranceOrder(i: number) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return col * ROWS + row;
    }

    const sortedByColumn = [...Array(TOTAL).keys()].sort((a, b) => entranceOrder(a) - entranceOrder(b));
    const ENTRANCE_START = 900;
    const timeouts: NodeJS.Timeout[] = [];

    sortedByColumn.forEach((dotIdx, order) => {
      const t1 = setTimeout(() => {
        const dot = dots[dotIdx];
        if (!dot) return;
        dot.style.transition = 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease-out';
        dot.style.opacity = '1';
        dot.style.transform = 'scale(1)';

        const t2 = setTimeout(() => {
          if (!dot) return;
          dot.style.transition = '';
          const dur = (2.5 + Math.random() * 1.5).toFixed(2);
          const delay = (Math.random() * 3).toFixed(2);
          dot.style.animation = `dotPulse ${dur}s ease-in-out ${delay}s infinite`;
        }, 500);
        timeouts.push(t2);
      }, ENTRANCE_START + order * 22);
      timeouts.push(t1);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [dimensions]);

  return (
    <>
      <nav>
        <div className="nav-logo">
          <div className="font-serif text-2xl tracking-widest text-[#1a2a4a] font-light">RAFV</div>
        </div>
        <div className="nav-links">
          <a href="#">Events</a>
          <a href="#">Partners</a>
          <a href="#">Trends</a>
          <a href="#">Contact</a>
        </div>
      </nav>

      <main>
        <div className="headline-wrap">
          <div className="headline-1">COMMUNITY</div>
          <div className="headline-2">CALENDAR</div>
        </div>

        <div className="bar-scene">
          <div className="holographic-bar">
            <div className="bar-overlay scanlines"></div>
            <div className="bar-overlay gloss"></div>
            <div className="bar-overlay vignette"></div>
            <div id="dot-grid" ref={gridRef}></div>
          </div>
          <div className="bar-reflection"></div>
        </div>
      </main>

      {/* Partners Section */}
      <section className="partners-section">
        <div className="partners-title">Trusted Partners</div>
        <div className="partners-list">
          <div className="partner-logo brand-1">Lumina</div>
          <div className="partner-logo brand-2">Nexa</div>
          <div className="partner-logo brand-3">Aura</div>
          <div className="partner-logo brand-4">Oasis</div>
          <div className="partner-logo brand-5">Vanguard</div>
        </div>
      </section>

      <EventCarousel events={carouselEvents} onEventClick={openEvent} />

      <SearchBar query={searchQuery} onQueryChange={setSearchQuery} />

      <BrowseEvents events={browseEvents} onEventClick={openEvent} />

      {selectedEventRecord && (
        <EventModal 
          event={selectedEventRecord} 
          sourceName={selectedEventRecord.source_name}
          sourceColor={sourcesMap.get(selectedEventRecord.source_id)?.color || '#003399'}
          onClose={closeEvent} 
        />
      )}
    </>
  );
}
