import React from 'react';

/**
 * Developer workspace illustration — pure SVG.
 * Depicts a developer at a desk with dual monitors, purple ambient lighting,
 * a futuristic robot, plants, neon coding symbol, and a city skyline through a window.
 */
export default function WorkspaceScene() {
  return (
    <svg
      viewBox="0 0 520 580"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      role="img"
      aria-label="Developer workspace with dual monitors, purple ambient lighting, robot and city skyline"
    >
      <defs>
        {/* Background gradient */}
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0D0B1A" />
          <stop offset="100%" stopColor="#15122A" />
        </linearGradient>
        {/* Window sky gradient */}
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A0F2E" />
          <stop offset="50%" stopColor="#1E1340" />
          <stop offset="100%" stopColor="#0D0B1A" />
        </linearGradient>
        {/* Monitor screen gradient */}
        <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0A0815" />
          <stop offset="100%" stopColor="#12102A" />
        </linearGradient>
        {/* Purple glow */}
        <radialGradient id="purpleGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#9747FF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#9747FF" stopOpacity="0" />
        </radialGradient>
        {/* Violet glow */}
        <radialGradient id="violetGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C77DFF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#C77DFF" stopOpacity="0" />
        </radialGradient>
        {/* Neon symbol glow */}
        <linearGradient id="neonGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9747FF" />
          <stop offset="100%" stopColor="#C77DFF" />
        </linearGradient>
        {/* Desk gradient */}
        <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E1B36" />
          <stop offset="100%" stopColor="#13111F" />
        </linearGradient>
        {/* Monitor frame */}
        <linearGradient id="frameGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A2548" />
          <stop offset="100%" stopColor="#1A1530" />
        </linearGradient>
        {/* Robot body */}
        <linearGradient id="robotGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#322B58" />
          <stop offset="100%" stopColor="#1E1938" />
        </linearGradient>
        {/* Soft blur filter */}
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="bigBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="20" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="520" height="580" rx="24" fill="url(#bgGrad)" />

      {/* Ambient glows */}
      <circle cx="260" cy="200" r="160" fill="url(#purpleGlow)" />
      <circle cx="400" cy="350" r="120" fill="url(#violetGlow)" />
      <circle cx="120" cy="300" r="100" fill="url(#purpleGlow)" />

      {/* Window with city skyline */}
      <rect x="70" y="50" width="380" height="160" rx="8" fill="url(#skyGrad)" stroke="rgba(151,71,255,0.15)" strokeWidth="1" />
      {/* City buildings */}
      <g opacity="0.7">
        <rect x="90" y="120" width="22" height="90" rx="2" fill="#1A1535" stroke="rgba(151,71,255,0.2)" strokeWidth="0.5" />
        <rect x="118" y="95" width="28" height="115" rx="2" fill="#1E1640" stroke="rgba(151,71,255,0.25)" strokeWidth="0.5" />
        <rect x="152" y="110" width="20" height="100" rx="2" fill="#1A1535" stroke="rgba(151,71,255,0.2)" strokeWidth="0.5" />
        <rect x="178" y="80" width="32" height="130" rx="2" fill="#221848" stroke="rgba(199,125,255,0.3)" strokeWidth="0.5" />
        <rect x="216" y="100" width="24" height="110" rx="2" fill="#1A1535" stroke="rgba(151,71,255,0.2)" strokeWidth="0.5" />
        <rect x="246" y="70" width="30" height="140" rx="2" fill="#241A4D" stroke="rgba(199,125,255,0.35)" strokeWidth="0.5" />
        <rect x="282" y="105" width="22" height="105" rx="2" fill="#1A1535" stroke="rgba(151,71,255,0.2)" strokeWidth="0.5" />
        <rect x="310" y="85" width="28" height="125" rx="2" fill="#221848" stroke="rgba(151,71,255,0.25)" strokeWidth="0.5" />
        <rect x="344" y="115" width="20" height="95" rx="2" fill="#1A1535" stroke="rgba(151,71,255,0.2)" strokeWidth="0.5" />
        <rect x="370" y="95" width="26" height="115" rx="2" fill="#1E1640" stroke="rgba(151,71,255,0.25)" strokeWidth="0.5" />
        <rect x="402" y="120" width="22" height="90" rx="2" fill="#1A1535" stroke="rgba(151,71,255,0.2)" strokeWidth="0.5" />
      </g>
      {/* City window lights */}
      <g fill="#C77DFF" opacity="0.6">
        <rect x="124" y="105" width="3" height="3" rx="0.5" /><rect x="130" y="115" width="3" height="3" rx="0.5" /><rect x="124" y="125" width="3" height="3" rx="0.5" />
        <rect x="186" y="90" width="3" height="3" rx="0.5" /><rect x="192" y="100" width="3" height="3" rx="0.5" /><rect x="186" y="115" width="3" height="3" rx="0.5" /><rect x="198" y="125" width="3" height="3" rx="0.5" />
        <rect x="252" y="80" width="3" height="3" rx="0.5" /><rect x="260" y="95" width="3" height="3" rx="0.5" /><rect x="252" y="110" width="3" height="3" rx="0.5" /><rect x="268" y="120" width="3" height="3" rx="0.5" />
        <rect x="316" y="95" width="3" height="3" rx="0.5" /><rect x="324" y="110" width="3" height="3" rx="0.5" /><rect x="316" y="125" width="3" height="3" rx="0.5" />
        <rect x="376" y="105" width="3" height="3" rx="0.5" /><rect x="382" y="120" width="3" height="3" rx="0.5" />
      </g>
      {/* Moon glow */}
      <circle cx="330" cy="85" r="18" fill="#C77DFF" opacity="0.12" filter="url(#softBlur)" />
      <circle cx="330" cy="85" r="9" fill="#C77DFF" opacity="0.25" />

      {/* Neon coding symbol floating above monitors */}
      <g style={{ filter: 'drop-shadow(0 0 8px rgba(151,71,255,0.5))' }}>
        <text x="260" y="240" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="28" fontWeight="700" fill="url(#neonGrad)">
          {'</>'}
        </text>
      </g>

      {/* Desk surface */}
      <rect x="60" y="420" width="400" height="8" rx="2" fill="url(#deskGrad)" />
      <rect x="60" y="428" width="400" height="70" rx="0" fill="#0F0D1E" />
      {/* Desk glow line */}
      <rect x="60" y="420" width="400" height="1" fill="rgba(151,71,255,0.3)" />

      {/* Left monitor */}
      <g>
        {/* Monitor stand */}
        <rect x="145" y="410" width="30" height="10" rx="2" fill="#1A1530" />
        <rect x="155" y="415" width="10" height="8" fill="#2A2548" />
        {/* Frame */}
        <rect x="95" y="260" width="130" height="150" rx="8" fill="url(#frameGrad)" stroke="rgba(151,71,255,0.2)" strokeWidth="1" />
        {/* Screen */}
        <rect x="102" y="267" width="116" height="136" rx="4" fill="url(#screenGrad)" />
        {/* Code lines — left monitor */}
        <g fontFamily="JetBrains Mono, monospace" fontSize="5">
          <rect x="108" y="275" width="40" height="4" rx="1" fill="#9747FF" opacity="0.7" />
          <rect x="112" y="283" width="60" height="4" rx="1" fill="#C77DFF" opacity="0.5" />
          <rect x="116" y="291" width="45" height="4" rx="1" fill="#B8B4C7" opacity="0.4" />
          <rect x="112" y="299" width="80" height="4" rx="1" fill="#22D69A" opacity="0.5" />
          <rect x="108" y="307" width="35" height="4" rx="1" fill="#9747FF" opacity="0.7" />
          <rect x="116" y="315" width="70" height="4" rx="1" fill="#C77DFF" opacity="0.5" />
          <rect x="112" y="323" width="50" height="4" rx="1" fill="#B8B4C7" opacity="0.3" />
          <rect x="108" y="331" width="90" height="4" rx="1" fill="#9747FF" opacity="0.4" />
          <rect x="116" y="339" width="55" height="4" rx="1" fill="#C77DFF" opacity="0.5" />
          <rect x="112" y="347" width="75" height="4" rx="1" fill="#22D69A" opacity="0.4" />
          <rect x="108" y="355" width="40" height="4" rx="1" fill="#B8B4C7" opacity="0.3" />
          <rect x="116" y="363" width="65" height="4" rx="1" fill="#9747FF" opacity="0.5" />
          <rect x="112" y="371" width="50" height="4" rx="1" fill="#C77DFF" opacity="0.4" />
          <rect x="108" y="379" width="85" height="4" rx="1" fill="#B8B4C7" opacity="0.3" />
          <rect x="116" y="387" width="45" height="4" rx="1" fill="#22D69A" opacity="0.4" />
          <rect x="112" y="395" width="60" height="4" rx="1" fill="#9747FF" opacity="0.5" />
        </g>
        {/* Monitor glow */}
        <rect x="95" y="260" width="130" height="150" rx="8" fill="url(#purpleGlow)" opacity="0.3" />
      </g>

      {/* Right monitor */}
      <g>
        {/* Monitor stand */}
        <rect x="305" y="410" width="30" height="10" rx="2" fill="#1A1530" />
        <rect x="315" y="415" width="10" height="8" fill="#2A2548" />
        {/* Frame */}
        <rect x="270" y="275" width="120" height="135" rx="8" fill="url(#frameGrad)" stroke="rgba(151,71,255,0.2)" strokeWidth="1" />
        {/* Screen */}
        <rect x="277" y="282" width="106" height="121" rx="4" fill="url(#screenGrad)" />
        {/* Code lines — right monitor (terminal style) */}
        <g fontFamily="JetBrains Mono, monospace" fontSize="5">
          <rect x="283" y="290" width="50" height="4" rx="1" fill="#22D69A" opacity="0.6" />
          <rect x="287" y="298" width="70" height="4" rx="1" fill="#C77DFF" opacity="0.5" />
          <rect x="283" y="306" width="40" height="4" rx="1" fill="#9747FF" opacity="0.7" />
          <rect x="291" y="314" width="80" height="4" rx="1" fill="#B8B4C7" opacity="0.3" />
          <rect x="283" y="322" width="60" height="4" rx="1" fill="#C77DFF" opacity="0.4" />
          <rect x="287" y="330" width="50" height="4" rx="1" fill="#9747FF" opacity="0.5" />
          <rect x="283" y="338" width="75" height="4" rx="1" fill="#22D69A" opacity="0.4" />
          <rect x="291" y="346" width="65" height="4" rx="1" fill="#C77DFF" opacity="0.4" />
          <rect x="283" y="354" width="45" height="4" rx="1" fill="#B8B4C7" opacity="0.3" />
          <rect x="287" y="362" width="70" height="4" rx="1" fill="#9747FF" opacity="0.5" />
          <rect x="283" y="370" width="55" height="4" rx="1" fill="#C77DFF" opacity="0.4" />
          <rect x="291" y="378" width="80" height="4" rx="1" fill="#22D69A" opacity="0.3" />
          <rect x="283" y="386" width="60" height="4" rx="1" fill="#9747FF" opacity="0.4" />
          <rect x="287" y="394" width="40" height="4" rx="1" fill="#B8B4C7" opacity="0.3" />
        </g>
        {/* Monitor glow */}
        <rect x="270" y="275" width="120" height="135" rx="8" fill="url(#violetGlow)" opacity="0.3" />
      </g>

      {/* Developer figure (simplified, viewed from behind) */}
      <g>
        {/* Chair back */}
        <rect x="195" y="350" width="80" height="80" rx="12" fill="#1A1530" stroke="rgba(151,71,255,0.1)" strokeWidth="1" />
        {/* Body */}
        <ellipse cx="235" cy="395" rx="28" ry="32" fill="#1E1640" />
        {/* Head */}
        <circle cx="235" cy="360" r="16" fill="#2A2548" stroke="rgba(151,71,255,0.15)" strokeWidth="1" />
        {/* Headphones */}
        <path d="M 219 358 Q 235 345 251 358" stroke="#9747FF" strokeWidth="2" fill="none" opacity="0.5" />
        <circle cx="219" cy="362" r="4" fill="#9747FF" opacity="0.3" />
        <circle cx="251" cy="362" r="4" fill="#9747FF" opacity="0.3" />
        {/* Arms reaching to desk */}
        <ellipse cx="205" cy="415" rx="10" ry="20" fill="#1E1640" transform="rotate(-15 205 415)" />
        <ellipse cx="265" cy="415" rx="10" ry="20" fill="#1E1640" transform="rotate(15 265 415)" />
      </g>

      {/* Plant — left side */}
      <g>
        {/* Pot */}
        <path d="M 72 415 L 80 445 L 108 445 L 116 415 Z" fill="#1A1530" stroke="rgba(151,71,255,0.15)" strokeWidth="0.5" />
        {/* Leaves */}
        <ellipse cx="94" cy="395" rx="6" ry="22" fill="#22D69A" opacity="0.15" transform="rotate(-20 94 395)" />
        <ellipse cx="88" cy="385" rx="5" ry="18" fill="#22D69A" opacity="0.12" transform="rotate(-35 88 385)" />
        <ellipse cx="100" cy="390" rx="5" ry="20" fill="#C77DFF" opacity="0.15" transform="rotate(15 100 390)" />
        <ellipse cx="94" cy="400" rx="6" ry="24" fill="#9747FF" opacity="0.12" />
      </g>

      {/* Plant — right side */}
      <g>
        {/* Pot */}
        <path d="M 408 415 L 416 445 L 444 445 L 452 415 Z" fill="#1A1530" stroke="rgba(151,71,255,0.15)" strokeWidth="0.5" />
        {/* Leaves */}
        <ellipse cx="430" cy="395" rx="6" ry="20" fill="#C77DFF" opacity="0.12" transform="rotate(20 430 395)" />
        <ellipse cx="438" cy="385" rx="5" ry="16" fill="#22D69A" opacity="0.12" transform="rotate(35 438 385)" />
        <ellipse cx="424" cy="390" rx="5" ry="18" fill="#9747FF" opacity="0.12" transform="rotate(-15 424 390)" />
      </g>

      {/* Small futuristic robot */}
      <g>
        {/* Antenna */}
        <line x1="425" y1="385" x2="425" y2="372" stroke="#9747FF" strokeWidth="1.5" opacity="0.6" />
        <circle cx="425" cy="370" r="3" fill="#C77DFF" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" />
        </circle>
        {/* Body */}
        <rect x="408" y="388" width="34" height="28" rx="8" fill="url(#robotGrad)" stroke="rgba(151,71,255,0.25)" strokeWidth="1" />
        {/* Eyes */}
        <circle cx="417" cy="398" r="3" fill="#C77DFF">
          <animate attributeName="opacity" values="1;0.4;1" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="431" cy="398" r="3" fill="#C77DFF">
          <animate attributeName="opacity" values="1;0.4;1" dur="2.5s" repeatCount="indefinite" />
        </circle>
        {/* Mouth */}
        <rect x="418" y="406" width="12" height="2" rx="1" fill="#9747FF" opacity="0.5" />
        {/* Chest light */}
        <circle cx="425" cy="412" r="2" fill="#22D69A" opacity="0.6" />
      </g>

      {/* Floating code particles */}
      <g opacity="0.4">
        <text x="75" y="230" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#9747FF">{ '{}' }</text>
        <text x="430" y="250" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#C77DFF">{ '();' }</text>
        <text x="455" y="310" fontFamily="JetBrains Mono, monospace" fontSize="6" fill="#9747FF">{'=>'}</text>
        <text x="50" y="280" fontFamily="JetBrains Mono, monospace" fontSize="6" fill="#C77DFF">const</text>
      </g>

      {/* Bottom ambient glow */}
      <ellipse cx="260" cy="490" rx="200" ry="30" fill="url(#purpleGlow)" opacity="0.4" />
      {/* Top corner glows */}
      <circle cx="50" cy="50" r="40" fill="#9747FF" opacity="0.05" filter="url(#bigBlur)" />
      <circle cx="470" cy="530" r="50" fill="#C77DFF" opacity="0.05" filter="url(#bigBlur)" />
    </svg>
  );
}
