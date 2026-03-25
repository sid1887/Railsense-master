'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Train, Clock3 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import './design-system.css';

interface RouteStation {
  name: string;
  code: string;
  scheduledTime: string;
  actualTime?: string;
  status: 'completed' | 'current' | 'upcoming';
  delayMinutes?: number;
}

interface RouteTimelineProps {
  stations?: RouteStation[];
}

const defaultStations: RouteStation[] = [];

export default function RouteTimeline({ stations = defaultStations }: RouteTimelineProps) {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const hasAutoScrolledRef = useRef(false);

  // Scroll to current station only once on initial render to avoid jump-back on polling refreshes.
  useEffect(() => {
    if (hasAutoScrolledRef.current) return;

    const currentStation = stations.find(s => s.status === 'current');
    if (currentStation) {
      // Delay slightly to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.getElementById(`station-${currentStation.code}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          hasAutoScrolledRef.current = true;
          console.log(`[RouteTimeline] Scrolled to current station: ${currentStation.code}`);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [stations]);

  useEffect(() => {
    const onMapHover = (event: Event) => {
      const customEvent = event as CustomEvent<{ code?: string | null }>;
      const code = (customEvent.detail?.code || '').toUpperCase();
      setHoveredCode(code || null);
    };

    window.addEventListener('map-station-hover', onMapHover as EventListener);
    return () => window.removeEventListener('map-station-hover', onMapHover as EventListener);
  }, []);

  const normalizedStations = useMemo(() => {
    const safeStations = Array.isArray(stations) ? stations : [];
    console.log('[RouteTimeline] Rendering stations:', safeStations.length, safeStations);
    return safeStations;
  }, [stations]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  const emitHover = (code: string | null) => {
    window.dispatchEvent(
      new CustomEvent('timeline-station-hover', {
        detail: { code: code ? code.toUpperCase() : null },
      })
    );
  };

  return (
    <motion.div
      className="card"
      style={{
        padding: '16px',
        marginBottom: '16px',
      }}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <Train size={16} style={{ color: 'hsl(262, 83%, 58%)' }} />
        <h2
          className="heading-md"
          style={{
            color: 'hsl(0, 0%, 98%)',
            margin: 0,
          }}
        >
          Railway Timeline
        </h2>
      </motion.div>

      {normalizedStations.length === 0 ? (
        <div
          style={{
            borderRadius: '12px',
            border: '1px dashed hsl(240, 4%, 46%)',
            background: 'rgba(255,255,255,0.02)',
            padding: '16px',
            color: 'hsl(240, 4%, 66%)',
            fontSize: '13px',
          }}
        >
          No route stations are available yet for this train.
        </div>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          style={{ position: 'relative' }}
        >
          <AnimatePresence>
            {normalizedStations.map((station, index) => {
              const isLast = index === normalizedStations.length - 1;
              const isCurrent = station.status === 'current';
              const isCompleted = station.status === 'completed';
              const isHovered = hoveredCode === station.code.toUpperCase();

              const dotStyle: React.CSSProperties = isCurrent
                ? {
                    width: '14px',
                    height: '14px',
                    borderRadius: '999px',
                    background: 'hsl(262, 83%, 58%)',
                    border: '2px solid hsl(0, 0%, 98%)',
                    boxShadow: '0 0 0 6px rgba(139, 92, 246, 0.18)',
                  }
                : isCompleted
                  ? {
                      width: '10px',
                      height: '10px',
                      borderRadius: '999px',
                      background: 'hsl(240, 4%, 46%)',
                      border: '1px solid hsl(240, 4%, 46%)',
                    }
                  : {
                      width: '11px',
                      height: '11px',
                      borderRadius: '999px',
                      background: 'transparent',
                      border: '2px solid hsl(240, 4%, 66%)',
                    };

              return (
                <motion.button
                  type="button"
                  key={`${station.code}-${index}`}
                  id={`station-${station.code}`}
                  variants={itemVariants}
                  onMouseEnter={() => {
                    setHoveredCode(station.code.toUpperCase());
                    emitHover(station.code);
                  }}
                  onMouseLeave={() => {
                    setHoveredCode(null);
                    emitHover(null);
                  }}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr auto',
                    columnGap: '12px',
                    textAlign: 'left',
                    borderRadius: '10px',
                    padding: '8px',
                    border: isHovered ? '1px solid rgba(139,92,246,0.45)' : '1px solid transparent',
                    background: isHovered ? 'rgba(139,92,246,0.08)' : 'transparent',
                    transition: 'all 150ms ease',
                    marginBottom: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={dotStyle} />
                    {!isLast && (
                      <div
                        style={{
                          width: '1px',
                          height: '44px',
                          marginTop: '4px',
                          background: isCompleted
                            ? 'hsl(240, 4%, 46%)'
                            : 'rgba(255,255,255,0.18)',
                        }}
                      />
                    )}
                  </div>

                  <div style={{ paddingBottom: isLast ? 0 : '16px' }}>
                    <div
                      style={{
                        fontSize: '14px',
                        color: isCurrent ? 'hsl(0, 0%, 98%)' : isCompleted ? 'hsl(240, 4%, 66%)' : 'hsl(0, 0%, 92%)',
                        fontWeight: isCurrent ? 600 : 500,
                        lineHeight: 1.3,
                      }}
                    >
                      {station.name}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'hsl(240, 4%, 56%)',
                        marginTop: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {station.code}
                    </div>
                    {Boolean(station.delayMinutes && station.delayMinutes > 0) && (
                      <div
                        style={{
                          marginTop: '4px',
                          fontSize: '11px',
                          color: 'hsl(0, 84%, 60%)',
                          fontWeight: 600,
                        }}
                      >
                        +{station.delayMinutes} min delay
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      minWidth: '84px',
                      textAlign: 'right',
                      fontSize: '13px',
                      color: 'hsl(240, 4%, 66%)',
                      fontVariantNumeric: 'tabular-nums',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end',
                      gap: '4px',
                    }}
                  >
                    <Clock3 size={13} style={{ marginTop: '2px' }} />
                    <span>{station.actualTime || station.scheduledTime || '--:--'}</span>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
