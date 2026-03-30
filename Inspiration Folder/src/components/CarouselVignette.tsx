import React, { useEffect, useRef, useState } from 'react';
import './CarouselVignette.css';

export function CarouselVignette() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ cols: 40, rows: 12 });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w <= 480) setDimensions({ cols: 16, rows: 10 });
      else if (w <= 768) setDimensions({ cols: 24, rows: 12 });
      else setDimensions({ cols: 40, rows: 12 });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const { cols: COLS, rows: ROWS } = dimensions;
    grid.innerHTML = '';
    
    // Footer-style continuous horizontal color zones
    const zones = [
      { max: 0.25, color: '#06b6d4', glow: 'rgba(6,182,212,0.8)' },
      { max: 0.50, color: '#8b5cf6', glow: 'rgba(139,92,246,0.8)' },
      { max: 0.75, color: '#d946ef', glow: 'rgba(217,70,239,0.8)' },
      { max: 1.00, color: '#f97316', glow: 'rgba(249,115,22,0.8)' },
    ];

    grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const dot = document.createElement('div');
        dot.className = `carousel-vignette-dot`;

        // Strictly empty in the middle. Increase dramatically near edges.
        let distX = Math.abs(col - COLS / 2) / (COLS / 2);
        distX = Math.pow(distX, 2); // steep curve so center is absolutely black
        
        let distY = Math.abs(row - ROWS / 2) / (ROWS / 2);
        
        // Intensity purely falls to 0 in the center column
        const intensity = Math.min(1, Math.max(0, distX + (distY * 0.1)));

        const ratio = col / COLS;
        const zone = zones.find(z => ratio <= z.max) || zones[zones.length - 1];

        const size = 2 + intensity * 3;

        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.backgroundColor = zone.color;
        dot.style.boxShadow = `0 0 ${15 * intensity}px ${zone.glow}`;
        dot.style.setProperty('--base-opacity', (intensity).toString());

        dot.style.opacity = '0';
        dot.style.transform = 'scale(0.1)';
        
        // Sweep animation inward from edges
        const delay = (distX * 150 + Math.random() * 50);
        dot.style.transition = `opacity 800ms ease-out ${delay}ms, transform 800ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`;

        grid.appendChild(dot);

        // Entrance
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (!dot.parentElement) return;
            dot.style.opacity = (intensity * 0.95).toString();
            dot.style.transform = 'scale(1)';

            setTimeout(() => {
              if (!dot.parentElement) return;
              dot.style.transition = '';
              const dur = (2.5 + Math.random() * 2).toFixed(2);
              const pDelay = (Math.random() * 2).toFixed(2);
              dot.style.animation = `carouselDotPulse ${dur}s ease-in-out ${pDelay}s infinite`;
            }, delay + 800);
          }, 10);
        });
      }
    }
  }, [dimensions]);

  return (
    <div className="carousel-vignette-scene">
      {/* Perfect linear gradient edge bleeds matching side colors */}
      <div className="carousel-vignette-blooms">
        <div className="carousel-bloom-side bloom-side-left"></div>
        <div className="carousel-bloom-side bloom-side-right"></div>
      </div>
      
      {/* Dot grid stretching fully across, completely fading in center */}
      <div className="carousel-vignette-grid" ref={gridRef}></div>
      
      {/* Deep overlay casting shadow from center to ensure perfect void for carousel cards */}
      <div className="carousel-vignette-overlay"></div>
    </div>
  );
}
