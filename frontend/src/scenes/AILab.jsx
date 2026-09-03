import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

export default function AILab() {
  const torusRef = useRef();

  useFrame((state, delta) => {
    if (torusRef.current) {
      torusRef.current.rotation.x += delta * 0.6;
      torusRef.current.rotation.y += delta * 0.9;
    }
  });

  // Animated energy particle field
  const particlePositions = useMemo(() => {
    const coords = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      coords[i * 3] = (Math.random() - 0.5) * 6;
      coords[i * 3 + 1] = (Math.random() - 0.5) * 6;
      coords[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return coords;
  }, []);

  return (
    <group position={[0, 1, -8]}>
      {/* Electric Blue & Violet Glow Lights */}
      <pointLight position={[0, 3, 0]} intensity={4.0} color="#8b5cf6" distance={10} />
      <pointLight position={[0, -2, 2]} intensity={2.5} color="#3b82f6" distance={8} />

      <Float speed={3} rotationIntensity={0.8} floatIntensity={0.8}>
        <mesh ref={torusRef}>
          <torusKnotGeometry args={[0.9, 0.28, 128, 32]} />
          <meshStandardMaterial
            color="#8b5cf6"
            emissive="#4c1d95"
            emissiveIntensity={0.8}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      </Float>

      {/* Floating Energy Particles */}
      <Points positions={particlePositions} stride={3}>
        <PointMaterial
          transparent
          color="#38bdf8"
          size={0.08}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>

      {/* Spatial 3D Labels */}
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.5}
        color="#c084fc"
        font="https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoBoA4D4g30yX28oe9_z55Y7q0r9.woff"
        anchorX="center"
        anchorY="middle"
      >
        AI LAB ZONE
      </Text>
      <Text
        position={[0, 1.7, 0]}
        fontSize={0.22}
        color="#e9d5ff"
        anchorX="center"
        anchorY="middle"
      >
        "Ask Suji" LangChain Agent & Autonomous Tool Integration
      </Text>
    </group>
  );
}
