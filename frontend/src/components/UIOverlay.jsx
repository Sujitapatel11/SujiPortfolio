import React from 'react';
import { useJourney } from '../lib/JourneyController';

export default function UIOverlay() {
  const {
    activeZone,
    activeIndex,
    goToZone,
    nextZone,
    prevZone,
    currentZoneData,
    zoneKeys,
    zones,
    isTransitioning
  } = useJourney();

  return (
    <div className="ui-overlay">
      {/* Soft Transition Pulse Overlay for Spatial Reveals */}
      <div className={`transition-pulse ${isTransitioning ? 'active' : ''}`} />

      {/* Top Glassmorphic Navigation Header */}
      <header className="glass-header interactive">
        <div className="brand-logo">
          <span>🌌</span> SUJI'S WORLD
        </div>

        <nav>
          <ul className="nav-zones">
            {zoneKeys.map((key) => {
              const zone = zones[key];
              return (
                <li key={key}>
                  <button
                    className={`zone-btn ${activeZone === key ? 'active' : ''}`}
                    onClick={() => goToZone(key)}
                  >
                    {zone.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Right Vertical Progress Indicator HUD */}
      <aside className="progress-trail interactive">
        <div className="trail-line" />
        {zoneKeys.map((key, idx) => {
          const zone = zones[key];
          const isActive = activeZone === key;
          return (
            <div key={key} className="progress-dot-wrapper">
              <button
                aria-label={`Navigate to ${zone.name}`}
                className={`progress-dot ${isActive ? 'active' : ''}`}
                style={{
                  backgroundColor: isActive ? zone.color : 'rgba(255, 255, 255, 0.25)',
                  boxShadow: isActive ? `0 0 16px ${zone.color}` : 'none'
                }}
                onClick={() => goToZone(key)}
              >
                <div className="dot-inner" />
              </button>
              
              {/* Tooltip Label on Hover */}
              <div className="dot-tooltip">
                <span className="dot-num">0{idx + 1}</span>
                <span className="dot-name">{zone.name}</span>
              </div>
            </div>
          );
        })}
      </aside>

      {/* Bottom Floating Navigation Controls & Status */}
      <div className="bottom-hud">
        {/* Bottom Left Active Zone Badge */}
        <div className="status-badge interactive">
          <span className="label">Zone 0{activeIndex + 1} of 0{zoneKeys.length}</span>
          <span className="value" style={{ color: currentZoneData.color }}>
            {currentZoneData.name} — {currentZoneData.subtitle}
          </span>
        </div>

        {/* Bottom Right Prev / Next Navigation Arrows */}
        <div className="hud-controls interactive">
          <button
            className="hud-nav-btn"
            disabled={activeIndex === 0}
            onClick={prevZone}
            title="Previous Zone"
          >
            ← PREV
          </button>
          <button
            className="hud-nav-btn"
            disabled={activeIndex === zoneKeys.length - 1}
            onClick={nextZone}
            title="Next Zone"
          >
            NEXT →
          </button>
        </div>
      </div>
    </div>
  );
}
