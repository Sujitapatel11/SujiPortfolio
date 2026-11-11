/**
 * Blueprint Drawing Primitives
 * Reusable engineering-drawing language elements: registration marks,
 * callout balloons, dimension lines, title blocks, section markers, hatch fills.
 * Used across the entire site for visual consistency.
 */

import React from 'react';

/* ── Registration Marks ──────────────────────────────────────────
 * Four corner crosshair marks placed at the corners of a section.
 * Usage: place inside a position:relative container.
 */
export function RegistrationMarks({ color = 'var(--bp-ink)' }) {
  const style = { '--bp-reg-color': color };
  return (
    <div className="bp-reg-marks" style={style} aria-hidden="true">
      <span className="bp-reg-mark bp-reg-tl" />
      <span className="bp-reg-mark bp-reg-tr" />
      <span className="bp-reg-mark bp-reg-bl" />
      <span className="bp-reg-mark bp-reg-br" />
    </div>
  );
}

/* ── Section Marker ─────────────────────────────────────────────
 * A label like "SECTION A-A" or "DETAIL 2" with a thin cutting line.
 */
export function SectionMarker({ label = 'SECTION A-A', className = '' }) {
  return (
    <div className={`bp-section-marker ${className}`}>
      <span className="bp-section-marker-line" />
      <span className="bp-section-marker-label">{label}</span>
      <span className="bp-section-marker-line" />
    </div>
  );
}

/* ── Callout Balloon ─────────────────────────────────────────────
 * Numbered orange circle with a leader line and mono label.
 * Positioned absolutely by the parent; leader line drawn via CSS.
 * Props:
 *   number  – the callout number
 *   label    – mono caption text
 *   lineDir  – 'left' | 'right' | 'up' | 'down' (leader direction)
 *   lineLen  – leader line length in px
 */
export function CalloutBalloon({
  number,
  label,
  lineDir = 'left',
  lineLen = 48,
  className = '',
  style = {},
}) {
  return (
    <div className={`bp-callout bp-callout--${lineDir} ${className}`} style={style}>
      {lineDir === 'right' && <span className="bp-callout-leader" style={{ width: lineLen }} />}
      {lineDir === 'left' && <span className="bp-callout-leader" style={{ width: lineLen }} />}
      {lineDir === 'down' && <span className="bp-callout-leader bp-callout-leader--v" style={{ height: lineLen }} />}
      {lineDir === 'up' && <span className="bp-callout-leader bp-callout-leader--v" style={{ height: lineLen }} />}
      <span className="bp-callout-balloon">{number}</span>
      <span className="bp-callout-label">{label}</span>
    </div>
  );
}

/* ── Dimension Line ─────────────────────────────────────────────
 * A line with arrowheads at both ends and a measurement label.
 * orientation: 'horizontal' | 'vertical'
 */
export function DimensionLine({
  measurement = '',
  orientation = 'horizontal',
  className = '',
  style = {},
}) {
  const isH = orientation === 'horizontal';
  return (
    <div
      className={`bp-dim-line bp-dim-line--${orientation} ${className}`}
      style={style}
      aria-hidden="true"
    >
      <span className="bp-dim-arrow bp-dim-arrow--start" />
      <span className="bp-dim-track" />
      <span className="bp-dim-arrow bp-dim-arrow--end" />
      {measurement && (
        <span className={`bp-dim-label ${isH ? 'bp-dim-label--h' : 'bp-dim-label--v'}`}>
          {measurement}
        </span>
      )}
    </div>
  );
}

/* ── Title Block ─────────────────────────────────────────────────
 * Engineering drawing title block placed in a section's corner.
 * Fields: DRAWING NO., SHEET, SCALE, DRAWN BY, REV.
 */
export function TitleBlock({
  drawingNo = 'SP-001',
  sheet = '1/8',
  scale = '1:1',
  drawnBy = 'S. PATEL',
  rev = '2026.11',
  className = '',
  dark = false,
  style = {},
}) {
  return (
    <div className={`bp-title-block ${dark ? 'bp-title-block--dark' : ''} ${className}`} style={style}>
      <div className="bp-tb-field">
        <span className="bp-tb-label">DRAWING NO.</span>
        <span className="bp-tb-value">{drawingNo}</span>
      </div>
      <div className="bp-tb-field">
        <span className="bp-tb-label">SHEET</span>
        <span className="bp-tb-value">{sheet}</span>
      </div>
      <div className="bp-tb-field">
        <span className="bp-tb-label">SCALE</span>
        <span className="bp-tb-value">{scale}</span>
      </div>
      <div className="bp-tb-field">
        <span className="bp-tb-label">DRAWN BY</span>
        <span className="bp-tb-value">{drawnBy}</span>
      </div>
      <div className="bp-tb-field">
        <span className="bp-tb-label">REV</span>
        <span className="bp-tb-value">{rev}</span>
      </div>
    </div>
  );
}

/* ── Sheet Header ───────────────────────────────────────────────
 * Standardised section header: sheet index number, section title,
 * and a thin ink rule. Used at the top of each "sheet".
 */
export function SheetHeader({ index, title, italicWord, marker }) {
  return (
    <div className="bp-sheet-header">
      <div className="bp-sheet-header-top">
        <span className="bp-sheet-index">{index}</span>
        <span className="bp-sheet-marker">{marker}</span>
      </div>
      <h2 className="bp-sheet-title">
        {title} {italicWord && <em className="bp-italic">{italicWord}</em>}
      </h2>
      <div className="bp-sheet-rule" />
    </div>
  );
}

/* ── Hatch Fill ──────────────────────────────────────────────────
 * Decorative hatch pattern used as a section fill. Rendered as
 * an absolutely-positioned overlay with CSS repeating-linear-gradient.
 */
export function HatchFill({ className = '', opacity = 0.06 }) {
  return <div className={`bp-hatch ${className}`} style={{ opacity }} aria-hidden="true" />;
}

/* ── Mono Tag ────────────────────────────────────────────────────
 * Small mono caps tag/chip used for tech labels and tags.
 */
export function MonoTag({ children, className = '' }) {
  return <span className={`bp-mono-tag ${className}`}>{children}</span>;
}

/* ── Drawing Notes ──────────────────────────────────────────────
 * Numbered drawing notes block (NOTE 1. ..., 2. ..., etc.)
 */
export function DrawingNotes({ notes = [], className = '' }) {
  return (
    <div className={`bp-drawing-notes ${className}`}>
      <span className="bp-drawing-notes-title">NOTES</span>
      <ol className="bp-notes-list">
        {notes.map((note, i) => (
          <li key={i} className="bp-note-item">
            <span className="bp-note-num">{i + 1}.</span>
            <span className="bp-note-text">{note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
