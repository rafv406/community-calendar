import React, { useEffect, useRef } from 'react';
import './Footer.css';

export function Footer() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const COLS = 30, ROWS = 4;

    grid.innerHTML = '';

    const zones = [
      { max: 0.28, color: '#06b6d4', glow: 'rgba(6,182,212,0.6)' },
      { max: 0.55, color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' },
      { max: 0.75, color: '#d946ef', glow: 'rgba(217,70,239,0.6)' },
      { max: 1.00, color: '#f97316', glow: 'rgba(249,115,22,0.6)' },
    ];

    const baseOpacities = [0.12, 0.25, 0.50, 0.80];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const dot = document.createElement('div');
        dot.className = `horizon-dot row-${row}`;

        const ratio = col / COLS;
        const zone = zones.find(z => ratio < z.max) || zones[zones.length - 1];
        const base = baseOpacities[row];

        dot.style.backgroundColor = zone.color;
        dot.style.boxShadow = `0 0 8px ${zone.glow}`;
        dot.style.setProperty('--base-opacity', base.toString());

        const delay = (col * 28 + row * 60);
        dot.style.opacity = '0';
        dot.style.transform = 'scale(0.2)';
        dot.style.transition = `opacity 400ms ease-out ${delay}ms, transform 400ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`;

        grid.appendChild(dot);

        requestAnimationFrame(() => {
          setTimeout(() => {
            if (!dot.parentElement) return;
            dot.style.opacity = base.toString();
            dot.style.transform = 'scale(1)';

            setTimeout(() => {
              if (!dot.parentElement) return;
              dot.style.transition = '';
              const dur = (2.5 + Math.random() * 2).toFixed(2);
              const pDelay = (Math.random() * 3).toFixed(2);
              dot.style.animation = `dotPulse ${dur}s ease-in-out ${pDelay}s infinite`;
            }, delay + 500);
          }, 10);
        });
      }
    }
  }, []);

  return (
    <footer className="site-footer">
      <section className="event-horizon">
        <div className="bloom-container">
          <div className="bloom bloom-1"></div>
          <div className="bloom bloom-2"></div>
          <div className="bloom bloom-3"></div>
          <div className="bloom bloom-4"></div>
        </div>
        <div className="dot-grid-horizon" ref={gridRef}></div>
        <div className="stencil-subtext">Fox Valley &nbsp;&middot;&nbsp; Est. 2025</div>
      </section>
    </footer>
  );
}
