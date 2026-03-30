import React, { useEffect, useRef, useState } from 'react';
import './HeaderHorizon.css';

export function HeaderHorizon() {
  const gridRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<{ el: HTMLDivElement; col: number; row: number; rx: number; ry: number; r: number; g: number; b: number; isColored: boolean }[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5, active: false });
  const rafRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ cols: 48, rows: 8 });

  // Responsive grid sizing
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w <= 480) setDimensions({ cols: 24, rows: 8 });
      else if (w <= 768) setDimensions({ cols: 36, rows: 8 });
      else setDimensions({ cols: 48, rows: 8 });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Subtle mouse tracking
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const onMove = (e: MouseEvent) => {
      const rect = scene.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        active: true,
      };
    };
    const onLeave = () => { mouseRef.current.active = false; };

    scene.addEventListener('mousemove', onMove);
    scene.addEventListener('mouseleave', onLeave);
    return () => {
      scene.removeEventListener('mousemove', onMove);
      scene.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Reactive animation loop
  useEffect(() => {
    const { cols: COLS, rows: ROWS } = dimensions;

    const tick = () => {
      const dots = dotsRef.current;
      if (!dots.length) { rafRef.current = requestAnimationFrame(tick); return; }

      const active = mouseRef.current.active;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const dot of dots) {
        if (!dot.el.parentElement) continue;

        if (!active) {
          dot.el.style.transform = dot.el.dataset.baseTransform || '';
          dot.el.style.filter = '';
          dot.el.style.boxShadow = dot.el.dataset.baseShadow || '';
          continue;
        }

        const dx = dot.rx - mx;
        const dy = dot.ry - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Max influence radius ~30% of section width
        const influence = Math.max(0, 1 - dist * 3.5);
        
        if (influence > 0.01) {
          const brightness = 1 + influence * 2.5; // gentle highlight
          dot.el.style.filter = `brightness(${brightness})`;
          
          if (dot.isColored) {
            const glowSize = 10 + influence * 20;
            const glowOp = 0.5 + influence * 0.5;
            dot.el.style.boxShadow = `0 0 ${glowSize}px rgba(${dot.r}, ${dot.g}, ${dot.b}, ${glowOp})`;
          } else {
            // Neutral dots get a soft white/silver glow when hovered
            const glowSize = 4 + influence * 8;
            dot.el.style.boxShadow = `0 0 ${glowSize}px rgba(255, 255, 255, ${influence * 0.8})`;
          }
        } else {
          dot.el.style.transform = dot.el.dataset.baseTransform || '';
          dot.el.style.filter = '';
          dot.el.style.boxShadow = dot.el.dataset.baseShadow || '';
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dimensions]);

  // Build grid
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const { cols: COLS, rows: ROWS } = dimensions;
    grid.innerHTML = '';
    
    // Zone definitions for bottom edge colors
    const zones = [
      { max: 0.28, color: '#06b6d4', r: 6, g: 182, b: 212 },
      { max: 0.55, color: '#8b5cf6', r: 139, g: 92, b: 246 },
      { max: 0.75, color: '#d946ef', r: 217, g: 70, b: 239 },
      { max: 1.00, color: '#f97316', r: 249, g: 115, b: 22 },
    ];

    const allDots: typeof dotsRef.current = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Tighter grid structure
    grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const dot = document.createElement('div');
        dot.className = `header-horizon-dot`;

        const ratio = col / COLS;
        const zone = zones.find(z => ratio < z.max) || zones[zones.length - 1];
        
        // 0 at top, 1 at bottom
        const t = row / (ROWS - 1); 
        const rowFromBottom = ROWS - 1 - row; 
        
        // Only bottom 2 rows get full color. Row 2 gets mixed. Rows above get neutral.
        const isColored = rowFromBottom <= 2;
        let r, g, b, isFullyColored = false;
        
        if (rowFromBottom === 0 || rowFromBottom === 1) {
          [r, g, b] = [zone.r, zone.g, zone.b];
          isFullyColored = true;
        } else if (rowFromBottom === 2) {
          // Mid-way blend between color and silver #cbd5e1 (203, 213, 225)
          [r, g, b] = [
            (zone.r + 203) / 2,
            (zone.g + 213) / 2,
            (zone.b + 225) / 2,
          ];
          isFullyColored = true; 
        } else {
          // Neutral slate/silver dots for structural texture higher up
          [r, g, b] = [203, 213, 225]; // slate-300
        }

        // Opacity drops heavily towards the top so they dissolve completely into white
        const baseOpacity = 0.05 + Math.pow(t, 3) * 0.95; 

        // Sizes shift nicely: bottom 4px, top 2px
        const size = 2 + t * 2; 

        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        
        let baseShadow = 'none';
        if (isFullyColored) {
          const glowOp = rowFromBottom === 0 ? 0.6 : (rowFromBottom === 1 ? 0.3 : 0.15);
          baseShadow = `0 0 8px rgba(${r}, ${g}, ${b}, ${glowOp})`;
        } else {
          // Neutral rows get tiny white/silver glow
          baseShadow = `0 0 4px rgba(255,255,255, 0.4)`;
        }

        dot.style.boxShadow = baseShadow;
        dot.style.setProperty('--base-opacity', baseOpacity.toString());
        dot.dataset.baseShadow = baseShadow;
        
        // Staggered entrance upward from bottom
        const delay = (col * 15 + rowFromBottom * 90);
        dot.style.opacity = '0';
        dot.style.transform = 'translateY(15px) scale(0.1)';
        
        grid.appendChild(dot);
        allDots.push({ el: dot, col, row, rx: col / COLS, ry: row / ROWS, r, g, b, isColored: isFullyColored });

        const t1 = setTimeout(() => {
          if (!dot.parentElement) return;
          dot.style.transition = `opacity 600ms ease-out, transform 600ms cubic-bezier(0.22, 1, 0.36, 1)`;
          dot.style.opacity = baseOpacity.toString();
          dot.style.transform = 'translateY(0) scale(1)';
          dot.dataset.baseTransform = 'translateY(0) scale(1)';

          const t2 = setTimeout(() => {
            if (!dot.parentElement) return;
            dot.style.transition = 'filter 0.2s ease-out, box-shadow 0.2s ease-out';
            const dur = (2 + Math.random() * 2).toFixed(2);
            dot.style.animation = `headerDotPulse ${dur}s ease-in-out ${(Math.random() * 3).toFixed(2)}s infinite`;
          }, 700);
          timeouts.push(t2);
        }, delay);
        timeouts.push(t1);
      }
    }

    dotsRef.current = allDots;
    return () => {
      timeouts.forEach(clearTimeout);
      dotsRef.current = [];
    };
  }, [dimensions]);

  return (
    <section className="header-horizon" ref={sceneRef}>
      {/* Heavy white fade pushing down from top to dissolve the grey structural dots seamlessly */}
      <div className="header-horizon-fade"></div>
      
      {/* Super subtle, high-quality blooms at very bottom edge */}
      <div className="header-horizon-blooms">
        <div className="header-bloom header-bloom-1"></div>
        <div className="header-bloom header-bloom-2"></div>
        <div className="header-bloom header-bloom-3"></div>
        <div className="header-bloom header-bloom-4"></div>
      </div>
      
      {/* Scaled dot grid container */}
      <div className="header-horizon-dots" ref={gridRef}></div>
      
      {/* Clean bottom separator line with neon gradients */}
      <div className="header-horizon-line"></div>
    </section>
  );
}
