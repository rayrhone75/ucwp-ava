'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import type { AvatarState } from '@/hooks/useAvatar';
import { cn } from '@/lib/utils';

interface Avatar3DProps {
  state: AvatarState;
  className?: string;
}

function VRMModel({ state }: { state: AvatarState }) {
  const vrmRef = useRef<VRM | null>(null);
  const [loaded, setLoaded] = useState(false);
  const clockRef = useRef(new THREE.Clock());

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/ava.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (vrm) {
          vrm.scene.rotation.y = Math.PI;
          vrmRef.current = vrm;
          setLoaded(true);
        }
      },
      undefined,
      () => {
        // VRM file not found — fallback will show
      }
    );
  }, []);

  useFrame(() => {
    const vrm = vrmRef.current;
    if (!vrm) return;

    const delta = clockRef.current.getDelta();
    const time = clockRef.current.getElapsedTime();

    vrm.update(delta);

    // Breathing animation
    const breathe = Math.sin(time * 1.5) * 0.005;
    vrm.scene.position.y = breathe;

    // State-based expression/animation
    if (state === 'thinking') {
      vrm.scene.rotation.y = Math.PI + Math.sin(time * 2) * 0.05;
    } else if (state === 'speaking') {
      // Subtle head nod
      vrm.scene.rotation.x = Math.sin(time * 3) * 0.03;
    } else {
      vrm.scene.rotation.y = Math.PI;
      vrm.scene.rotation.x = 0;
    }
  });

  if (!loaded) return null;

  return vrmRef.current ? <primitive object={vrmRef.current.scene} /> : null;
}

function FallbackAvatar({ state }: { state: AvatarState }) {
  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center justify-center',
        state === 'thinking' && 'ava-pulse',
        state === 'idle' && 'ava-breathe'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fallback-avatar.svg"
        alt="Ava"
        className="w-32 h-40 object-contain"
      />
      {state === 'thinking' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-400 ava-dot-1" />
          <span className="w-2 h-2 rounded-full bg-violet-400 ava-dot-2" />
          <span className="w-2 h-2 rounded-full bg-violet-400 ava-dot-3" />
        </div>
      )}
      {state === 'speaking' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div className="flex gap-0.5 items-end">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-1 bg-violet-400 rounded-full"
                style={{
                  height: `${8 + Math.random() * 12}px`,
                  animation: `ava-pulse ${0.3 + i * 0.1}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Avatar3D({ state, className }: Avatar3DProps) {
  const [useVRM, setUseVRM] = useState(true);
  const [vrmFailed, setVrmFailed] = useState(false);

  useEffect(() => {
    // Check if VRM file exists
    fetch('/ava.vrm', { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) {
          setUseVRM(false);
          setVrmFailed(true);
        }
      })
      .catch(() => {
        setUseVRM(false);
        setVrmFailed(true);
      });
  }, []);

  if (!useVRM || vrmFailed) {
    return (
      <div className={cn('w-full h-full', className)}>
        <FallbackAvatar state={state} />
      </div>
    );
  }

  return (
    <div className={cn('w-full h-full', className)}>
      <Canvas
        camera={{ position: [0, 1.3, 1.5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 2]} intensity={1} />
        <Suspense fallback={null}>
          <VRMModel state={state} />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.8}
          target={[0, 1.2, 0]}
        />
      </Canvas>
    </div>
  );
}
