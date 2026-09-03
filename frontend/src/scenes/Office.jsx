import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';

export default function Office() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={[4, 0.5, -14]}>
      {/* Calm Professional Emerald/Teal Ambient Light */}
      <directionalLight position={[3, 5, 3]} intensity={2.0} color="#34d399" />
      <pointLight position={[-2, -1, -2]} intensity={1.2} color="#059669" />

      <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.4}>
        <mesh ref={meshRef}>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshStandardMaterial
            color="#10b981"
            roughness={0.3}
            metalness={0.5}
            emissive="#047857"
            emissiveIntensity={0.3}
          />
        </mesh>
      </Float>

      {/* Spatial 3D Labels */}
      <Text
        position={[0, 2.0, 0]}
        fontSize={0.5}
        color="#34d399"
        font="https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoBoA4D4g30yX28oe9_z55Y7q0r9.woff"
        anchorX="center"
        anchorY="middle"
      >
        OFFICE / SERVICES ZONE
      </Text>
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.22}
        color="#a7f3d0"
        anchorX="center"
        anchorY="middle"
      >
        Full-Stack Apps, Custom Backends, MVPs & AI Integrations
      </Text>
    </group>
  );
}
