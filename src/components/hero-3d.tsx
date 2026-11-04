"use client";

import { useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

const IMAGES = [
  "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&h=500&fit=crop",
  "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?w=400&h=500&fit=crop",
];

function ImagePlane({ url, position, rotation, scale = 1 }: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
}) {
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [url]);

  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1.2, 1.5]} />
      <meshStandardMaterial map={texture} transparent opacity={0.92} side={THREE.DoubleSide} />
    </mesh>
  );
}

function FloatingGroup({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const scroll = scrollProgress.current;

    // Subtle camera drift
    camera.position.x = Math.sin(t * 0.15) * 0.3;
    camera.position.y = Math.cos(t * 0.12) * 0.2 + scroll * 2;
    camera.lookAt(0, scroll * -1, 0);

    // Group rotation on scroll
    groupRef.current.rotation.y = t * 0.04 + scroll * 0.3;
    groupRef.current.position.y = scroll * -3;
  });

  return (
    <group ref={groupRef}>
      {IMAGES.map((url, i) => {
        const angle = (i / IMAGES.length) * Math.PI * 2;
        const radius = 2.8;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (i % 2 === 0 ? 0.4 : -0.4) + (i % 3 === 0 ? 0.3 : 0);
        return (
          <Float key={i} speed={1.2 + i * 0.15} rotationIntensity={0.2} floatIntensity={0.4}>
            <ImagePlane
              url={url}
              position={[x, y, z]}
              rotation={[0, -angle + Math.PI / 2, 0]}
              scale={0.8 + (i % 3) * 0.15}
            />
          </Float>
        );
      })}
    </group>
  );
}

function Scene({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <pointLight position={[-5, 3, -5]} intensity={0.3} color="#C28585" />
      <FloatingGroup scrollProgress={scrollProgress} />
    </>
  );
}

export function Hero3D({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene scrollProgress={scrollProgress} />
        </Suspense>
      </Canvas>
    </div>
  );
}
