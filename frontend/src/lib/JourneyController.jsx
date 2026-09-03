import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ZONES, ZONE_KEYS } from '../data/zones';

const JourneyContext = createContext(null);

export function JourneyProvider({ children }) {
  const [activeZone, setActiveZone] = useState('origin');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartY = useRef(0);
  const lastScrollTime = useRef(0);

  const goToZone = (zoneId) => {
    if (!ZONES[zoneId]) return;
    setIsTransitioning(true);
    setActiveZone(zoneId);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1200);
  };

  // Instagram Reels-style next/prev zone transitions (with infinite loop)
  const nextZone = () => {
    const currentIndex = ZONE_KEYS.indexOf(activeZone);
    const nextIndex = (currentIndex + 1) % ZONE_KEYS.length;
    goToZone(ZONE_KEYS[nextIndex]);
  };

  const prevZone = () => {
    const currentIndex = ZONE_KEYS.indexOf(activeZone);
    const prevIndex = (currentIndex - 1 + ZONE_KEYS.length) % ZONE_KEYS.length;
    goToZone(ZONE_KEYS[prevIndex]);
  };

  // Instagram Reels-style Vertical Wheel & Touch Scroll Listener
  useEffect(() => {
    const handleWheel = (e) => {
      const now = Date.now();
      // Fast 450ms debounce for responsive Reel scrolling
      if (now - lastScrollTime.current < 450 || isTransitioning) return;

      if (e.deltaY > 15) {
        lastScrollTime.current = now;
        nextZone();
      } else if (e.deltaY < -15) {
        lastScrollTime.current = now;
        prevZone();
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches && e.touches.length > 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 450 || isTransitioning) return;
      if (!e.changedTouches || e.changedTouches.length === 0) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY.current - touchEndY;

      if (deltaY > 30) {
        lastScrollTime.current = now;
        nextZone();
      } else if (deltaY < -30) {
        lastScrollTime.current = now;
        prevZone();
      }
    };

    const handleKeyDown = (e) => {
      if (isTransitioning) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        nextZone();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        prevZone();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeZone, isTransitioning]);

  const activeIndex = ZONE_KEYS.indexOf(activeZone);

  return (
    <JourneyContext.Provider
      value={{
        activeZone,
        activeIndex,
        currentZoneData: ZONES[activeZone],
        goToZone,
        nextZone,
        prevZone,
        isTransitioning,
        zones: ZONES,
        zoneKeys: ZONE_KEYS
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
}
