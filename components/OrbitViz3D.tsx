import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { OrbitalElements } from '../types';
import { calculateOrbitPath } from '../services/physics';
import * as THREE from 'three';

interface OrbitViz3DProps {
  orbitalData: OrbitalElements | null;
  targetName?: string;
}

const SolarSystem: React.FC<{ orbitalData: OrbitalElements | null, targetName?: string }> = ({ orbitalData, targetName }) => {
  // Earth Orbit (Approximate)
  const earthOrbit = useMemo(() => calculateOrbitPath({ a: 1, e: 0.0167, i: 0, om: 0, w: 102, ma: 0 }, 100), []);
  const earthVectorPoints = useMemo(() => earthOrbit.map(p => new THREE.Vector3(...p)), [earthOrbit]);
  const earthCurve = useMemo(() => new THREE.CatmullRomCurve3(earthVectorPoints), [earthVectorPoints]);

  // Target Orbit
  const targetOrbit = useMemo(() => {
    if (!orbitalData) return null;
    return calculateOrbitPath(orbitalData, 150);
  }, [orbitalData]);
  
  const targetVectorPoints = useMemo(() => targetOrbit ? targetOrbit.map(p => new THREE.Vector3(...p)) : [], [targetOrbit]);
  const targetCurve = useMemo(() => targetVectorPoints.length > 0 ? new THREE.CatmullRomCurve3(targetVectorPoints) : null, [targetVectorPoints]);

  return (
    <group>
      {/* Sun */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#FFD700" />
        <pointLight intensity={1.5} distance={100} decay={2} color="white" />
      </mesh>

      {/* Earth Orbit Line */}
      {earthCurve && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={earthVectorPoints.length}
              array={new Float32Array(earthVectorPoints.flatMap(v => [v.x, v.y, v.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4169E1" opacity={0.3} transparent />
        </line>
      )}

      {/* Earth Marker (Static for visual reference) */}
      <mesh position={[10, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#2E86C1" />
        <Html distanceFactor={15}>
          <div className="text-xs text-blue-300 font-mono bg-black/50 px-1 rounded">Earth</div>
        </Html>
      </mesh>

      {/* Target Orbit Line */}
      {targetCurve && targetVectorPoints.length > 0 && (
        <line>
           <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={targetVectorPoints.length}
              array={new Float32Array(targetVectorPoints.flatMap(v => [v.x, v.y, v.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#FF2A6D" linewidth={2} />
        </line>
      )}

      {/* Target Marker */}
      {targetOrbit && targetOrbit.length > 0 && (
        <mesh position={new THREE.Vector3(...targetOrbit[0])}>
           <dodecahedronGeometry args={[0.4, 0]} />
           <meshStandardMaterial color="#FF2A6D" wireframe />
           <Html distanceFactor={15}>
            <div className="text-xs text-red-400 font-mono bg-black/50 px-1 rounded whitespace-nowrap">{targetName || 'Target'}</div>
          </Html>
        </mesh>
      )}

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <gridHelper args={[100, 100, 0x222222, 0x111111]} rotation={[0,0,0]} position={[0,-2,0]} />
    </group>
  );
};

const OrbitViz3D: React.FC<OrbitViz3DProps> = ({ orbitalData, targetName }) => {
  return (
    <div className="w-full h-[400px] bg-black rounded-xl overflow-hidden border border-space-600 relative">
      <div className="absolute top-2 left-2 z-10 text-xs text-space-accent font-mono">
        INTERACTIVE ORBITAL PLOT (Heliocentric)
      </div>
      <Canvas camera={{ position: [20, 15, 20], fov: 45 }}>
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} autoRotate autoRotateSpeed={0.5} />
        <ambientLight intensity={0.2} />
        <SolarSystem orbitalData={orbitalData} targetName={targetName} />
      </Canvas>
    </div>
  );
};

export default OrbitViz3D;