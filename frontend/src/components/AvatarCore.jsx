import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import * as THREE from 'three';
import { detectFaceLandmarks, FALLBACK_LANDMARKS } from '../lib/faceMesh';

const PORTRAIT_URL = '/assets/suji-portrait.jpg';

export default function AvatarCore({ position = [0, 0, 0] }) {
  const groupRef = useRef();
  const [avatarState, setAvatarState] = useState(0); // 0: "solid", 1: "wireframe", 2: "mesh"
  const [hovered, setHovered] = useState(false);
  const [landmarks, setLandmarks] = useState(FALLBACK_LANDMARKS);

  // Run MediaPipe Face Detection client-side on load
  useEffect(() => {
    let isMounted = true;
    detectFaceLandmarks(PORTRAIT_URL).then((pts) => {
      if (isMounted && pts && pts.length > 0) {
        setLandmarks(pts);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Compute 3D Line Geometry for Wireframe State
  const lineGeometry = useMemo(() => {
    const coords = [];
    for (let i = 0; i < landmarks.length - 1; i++) {
      const p1 = landmarks[i];
      const p2 = landmarks[i + 1];
      coords.push(p1.x, p1.y, p1.z);
      coords.push(p2.x, p2.y, p2.z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    return geom;
  }, [landmarks]);

  // Compute Point Nodes Geometry for Mesh State
  const pointsGeometry = useMemo(() => {
    const coords = [];
    landmarks.forEach((p) => coords.push(p.x, p.y, p.z));
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    return geom;
  }, [landmarks]);

  // Target opacities for the 3 states
  // State 0 (Solid): photo = 1.0, wireframe = 0.0, meshNodes = 0.0
  // State 1 (Wireframe): photo = 0.2, wireframe = 1.0, meshNodes = 0.4
  // State 2 (Mesh): photo = 0.0, wireframe = 0.3, meshNodes = 1.0
  const photoOpacity = avatarState === 0 ? 1.0 : avatarState === 1 ? 0.2 : 0.0;
  const wireframeOpacity = avatarState === 0 ? 0.0 : avatarState === 1 ? 1.0 : 0.3;
  const meshOpacity = avatarState === 0 ? 0.0 : avatarState === 1 ? 0.4 : 1.0;

  // Subtle floating rotation animation loop
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.06;
      groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.08;
    }
  });

  const cycleState = () => {
    setAvatarState((prev) => (prev + 1) % 3);
  };

  return (
    <group position={position}>
      <group
        ref={groupRef}
        scale={hovered ? 1.08 : 1.0}
        onClick={cycleState}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* 1. SOLID PHOTO AVATAR — High performance Zwei/Drei Image Component */}
        {photoOpacity > 0.01 && (
          <Image
            url={PORTRAIT_URL}
            scale={[2.4, 2.8]}
            radius={0.5} // Circular / Rounded Crop
            transparent
            opacity={photoOpacity}
            position={[0, 0, 0]}
          />
        )}

        {/* 2. CYAN WIREFRAME FACE MESH OVERLAY (#5EEAD4) */}
        {wireframeOpacity > 0.01 && (
          <lineSegments geometry={lineGeometry} position={[0, 0, 0.02]}>
            <lineBasicMaterial
              color="#5EEAD4"
              transparent
              opacity={wireframeOpacity}
              linewidth={1.5}
            />
          </lineSegments>
        )}

        {/* 3. VIOLET DIGITAL MESH GLOWING NODES (#7C6CF0) */}
        {meshOpacity > 0.01 && (
          <points geometry={pointsGeometry} position={[0, 0, 0.03]}>
            <pointsMaterial
              color="#7C6CF0"
              size={0.065}
              transparent
              opacity={meshOpacity}
              sizeAttenuation
            />
          </points>
        )}

        {/* Halo Glow Ring around Avatar Core */}
        <mesh position={[0, 0, -0.05]}>
          <ringGeometry args={[1.38, 1.45, 64]} />
          <meshBasicMaterial
            color={avatarState === 0 ? "#00f2fe" : avatarState === 1 ? "#5EEAD4" : "#8b5cf6"}
            transparent
            opacity={hovered ? 0.9 : 0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
