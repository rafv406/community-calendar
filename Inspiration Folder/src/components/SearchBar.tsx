import { motion, AnimatePresence } from "framer-motion";
import { Search, Calendar, MapPin, Filter } from "lucide-react";
import React, { useState } from "react";

interface SearchBarProps {
  phase: number;
}

export default function SearchBar({ phase }: SearchBarProps) {
  const [focused, setFocused] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {phase === 5 && (
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.75, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-0 left-0 right-0 translate-y-1/2 z-20 flex justify-center px-4 md:px-8"
        >
          {/* outer glow ring — brand accent, very subtle */}
          <div className="relative w-full max-w-4xl">

            {/* ambient glow behind the bar */}
            <div
              className="absolute inset-0 rounded-full opacity-30 blur-xl pointer-events-none"
              style={{ background: "linear-gradient(90deg, #003399, #80dfff, #7b2fff)" }}
            />

            {/* the bar itself */}
            <div
              className="relative flex flex-col md:flex-row items-stretch w-full rounded-3xl md:rounded-full overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.97)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(200,216,248,0.8)",
                boxShadow: "0 8px 40px rgba(0,51,153,0.10), 0 2px 8px rgba(0,51,153,0.06)",
              }}
            >

              {/* SEARCH — text input */}
              <div
                className="flex-[1.4] flex items-center px-5 py-3.5 md:py-3 transition-colors duration-200"
                style={{
                  borderBottom: "1px solid",
                  borderRight: "none",
                  borderBottomColor: "rgba(208,218,240,0.7)",
                  background: focused === "search" ? "rgba(244,248,255,0.8)" : "transparent",
                }}
                onFocus={() => setFocused("search")}
                onBlur={() => setFocused(null)}
              >
                <Search
                  className="shrink-0 mr-3 transition-colors duration-200"
                  style={{
                    width: 16,
                    height: 16,
                    color: focused === "search" ? "#003399" : "#9aaac8",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search events..."
                  className="w-full bg-transparent outline-none text-sm font-light"
                  style={{
                    color: "#0d1b4a",
                    caretColor: "#003399",
                    letterSpacing: "0.01em",
                  }}
                  onFocus={() => setFocused("search")}
                  onBlur={() => setFocused(null)}
                />
              </div>

              {/* DIVIDER — desktop only */}
              <div
                className="hidden md:block w-px self-stretch"
                style={{ background: "rgba(208,218,240,0.7)" }}
              />

              {/* DATE */}
              <FilterPill
                icon={<Calendar style={{ width: 15, height: 15 }} />}
                label="Date"
                isFocused={focused === "date"}
                onFocus={() => setFocused("date")}
                onBlur={() => setFocused(null)}
              />

              <div
                className="hidden md:block w-px self-stretch"
                style={{ background: "rgba(208,218,240,0.7)" }}
              />

              {/* LOCATION */}
              <FilterPill
                icon={<MapPin style={{ width: 15, height: 15 }} />}
                label="Location"
                isFocused={focused === "location"}
                onFocus={() => setFocused("location")}
                onBlur={() => setFocused(null)}
              />

              <div
                className="hidden md:block w-px self-stretch"
                style={{ background: "rgba(208,218,240,0.7)" }}
              />

              {/* TYPE */}
              <FilterPill
                icon={<Filter style={{ width: 15, height: 15 }} />}
                label="Event type"
                isFocused={focused === "type"}
                onFocus={() => setFocused("type")}
                onBlur={() => setFocused(null)}
              />

              {/* SUBMIT BUTTON */}
              <div className="p-2 md:p-1.5 flex items-center">
                <button
                  className="w-full md:w-auto relative overflow-hidden px-7 py-3 md:py-3.5 rounded-2xl md:rounded-full text-sm font-medium text-white whitespace-nowrap transition-all duration-300 group"
                  style={{
                    background: "linear-gradient(135deg, #003399 0%, #1a4fd6 60%, #0a9ed1 100%)",
                    backgroundSize: "200% 100%",
                    boxShadow: "0 4px 20px rgba(0,51,153,0.35)",
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundPosition = "100% 0";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(0,51,153,0.5)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundPosition = "0% 0";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,51,153,0.35)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* subtle shimmer on hover */}
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                    }}
                  />
                  <span className="relative">Find Events</span>
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── FilterPill — reusable filter button ── */
interface FilterPillProps {
  icon: React.ReactNode;
  label: string;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

function FilterPill({ icon, label, isFocused, onFocus, onBlur }: FilterPillProps) {
  return (
    <button
      className="flex-1 flex items-center px-5 py-3.5 md:py-3 text-left w-full transition-colors duration-200 outline-none"
      style={{
        background: isFocused ? "rgba(244,248,255,0.8)" : "transparent",
        borderBottom: "1px solid",
        borderBottomColor: "rgba(208,218,240,0.7)",
      }}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <span
        className="shrink-0 mr-2.5 transition-colors duration-200"
        style={{ color: isFocused ? "#003399" : "#9aaac8" }}
      >
        {icon}
      </span>
      <span
        className="text-sm font-light transition-colors duration-200"
        style={{
          color: isFocused ? "#0d1b4a" : "#9aaac8",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </span>
    </button>
  );
}
