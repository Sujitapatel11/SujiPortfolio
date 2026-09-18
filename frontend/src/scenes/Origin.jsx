import React, { Suspense } from 'react';
import { Text } from '@react-three/drei';
import AvatarCore from '../components/AvatarCore';

function AvatarFallback() {
  return (
    <mesh position={[0, 0.2, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#00f2fe" wireframe />
    </mesh>
  );
}

export default function Origin() {
  return (
    <group position={[0, 0, 0]}>
      {/* Real-Photo Face Mesh Avatar Core */}
      <Suspense fallback={<AvatarFallback />}>
        <AvatarCore position={[0, 0.2, 0]} />
      </Suspense>

      {/* Spatial 3D Zone Title */}
      <Text
        position={[0, 2.4, 0]}
        fontSize={0.55}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        SUJI'S WORLD
      </Text>
      <Text
        position={[0, 1.85, 0]}
        fontSize={0.22}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        Origin Zone — Click Avatar to Toggle States (Solid / Wireframe / Mesh)
      </Text>
    </group>
  );
}
