import gsap from 'gsap';
import { ZONES } from '../data/zones';

/**
 * Smoothly animates camera to target position & orientation for selected zone using GSAP.
 * Snappy Reels-style transition curve (1.2s power2.out).
 */
export function animateCameraToZone(camera, controls, zoneId, duration = 1.2) {
  const zone = ZONES[zoneId] || ZONES.origin;
  const [px, py, pz] = zone.cameraPosition;
  const [tx, ty, tz] = zone.cameraTarget;

  // Animate Camera Position
  gsap.to(camera.position, {
    x: px,
    y: py,
    z: pz,
    duration: duration,
    ease: 'power2.out'
  });

  // Animate OrbitControls Target
  if (controls) {
    gsap.to(controls.target, {
      x: tx,
      y: ty,
      z: tz,
      duration: duration,
      ease: 'power2.out',
      onUpdate: () => controls.update()
    });
  }
}
