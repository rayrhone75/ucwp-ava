'use client';

import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import type { AvatarState } from '@/hooks/useAvatar';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────

interface RealAvatarProps {
  speaking?: boolean;
  lastText?: string;
  state?: AvatarState;
  className?: string;
}

// ─── Emotion Detection ──────────────────────────────────────────

type Emotion = 'happy' | 'warm' | 'concern' | 'neutral';

function detectEmotion(text: string): Emotion {
  const t = text.toLowerCase();
  if (t.includes('great') || t.includes('perfect') || t.includes('awesome') || t.includes('love'))
    return 'happy';
  if (t.includes('welcome') || t.includes('thanks') || t.includes('happy') || t.includes('glad'))
    return 'warm';
  if (t.includes('sorry') || t.includes('refund') || t.includes('issue') || t.includes('problem'))
    return 'concern';
  return 'neutral';
}

// ─── GLB Model (loaded with useGLTF from drei) ─────────────────

function GLBModel({ speaking, lastText = '' }: { speaking: boolean; lastText: string }) {
  const gltf = useGLTF('/models/ava-real.glb');
  const meshRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const clockRef = useRef(new THREE.Clock());

  // Find the skinned mesh for morph target animations
  const skinnedMesh = useRef<THREE.SkinnedMesh | null>(null);

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        skinnedMesh.current = child as THREE.SkinnedMesh;
      }
    });
  }, [gltf]);

  useFrame(() => {
    if (!meshRef.current) return;
    const time = clockRef.current.getElapsedTime();

    // Breathing animation
    meshRef.current.position.y = Math.sin(time * 1.5) * 0.004;

    // Head tracking (follows pointer)
    const targetY = pointer.x * 0.2 + Math.sin(time * 0.5) * 0.04;
    const targetX = -pointer.y * 0.12 + Math.sin(time * 0.7) * 0.03;
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetY, 0.06);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetX, 0.06);

    // Mouth animation via morph targets (if available)
    const mesh = skinnedMesh.current;
    if (mesh?.morphTargetDictionary && mesh.morphTargetInfluences) {
      const mouthIdx = mesh.morphTargetDictionary['mouthOpen'] ?? mesh.morphTargetDictionary['jawOpen'] ?? -1;
      if (mouthIdx >= 0) {
        mesh.morphTargetInfluences[mouthIdx] = speaking
          ? 0.15 + Math.abs(Math.sin(time * 8)) * 0.3
          : THREE.MathUtils.lerp(mesh.morphTargetInfluences[mouthIdx], 0, 0.1);
      }

      // Blink via morph targets
      const blinkIdx = mesh.morphTargetDictionary['eyesClosed'] ?? mesh.morphTargetDictionary['blink'] ?? -1;
      if (blinkIdx >= 0) {
        const blinkCycle = time % 4;
        mesh.morphTargetInfluences[blinkIdx] = blinkCycle > 3.85 ? Math.sin((blinkCycle - 3.85) * 20) : 0;
      }
    }
  });

  return (
    <group ref={meshRef}>
      <primitive object={gltf.scene} />
    </group>
  );
}

// ─── VRM Model (loaded with GLTFLoader + VRM plugin) ────────────

function VRMModel({ speaking, lastText = '' }: { speaking: boolean; lastText: string }) {
  const vrmRef = useRef<VRM | null>(null);
  const [loaded, setLoaded] = useState(false);
  const clockRef = useRef(new THREE.Clock());
  const { pointer } = useThree();

  const nextBlinkRef = useRef(Date.now() + 2000 + Math.random() * 4000);
  const blinkingRef = useRef(false);
  const blinkStartRef = useRef(0);
  const headTargetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const modelPaths = ['/models/ava-real.vrm', '/ava.vrm'];
    let didLoad = false;

    function tryLoad(index: number) {
      if (index >= modelPaths.length || didLoad) return;

      loader.load(
        modelPaths[index],
        (gltf) => {
          if (didLoad) return;
          const vrm = gltf.userData.vrm as VRM;
          if (vrm) {
            didLoad = true;
            vrm.scene.rotation.y = Math.PI;
            vrmRef.current = vrm;
            setLoaded(true);
          }
        },
        undefined,
        () => tryLoad(index + 1)
      );
    }

    tryLoad(0);
  }, []);

  useFrame(() => {
    const vrm = vrmRef.current;
    if (!vrm) return;

    const delta = clockRef.current.getDelta();
    const time = clockRef.current.getElapsedTime();
    const now = Date.now();

    vrm.update(delta);

    // Breathing
    vrm.scene.position.y = Math.sin(time * 1.5) * 0.004;

    // Eye contact / head tracking
    const targetX = -pointer.y * 0.12 + Math.sin(time * 0.7) * 0.03;
    const targetY = Math.PI + pointer.x * 0.2 + Math.sin(time * 0.5) * 0.04;

    headTargetRef.current.x = THREE.MathUtils.lerp(headTargetRef.current.x, targetX, 0.06);
    headTargetRef.current.y = THREE.MathUtils.lerp(headTargetRef.current.y, targetY, 0.06);

    // State-based head movement
    if (speaking) {
      headTargetRef.current.x += Math.sin(time * 2.5) * 0.025;
      headTargetRef.current.y += Math.sin(time * 1.8) * 0.02;
    }

    vrm.scene.rotation.x = headTargetRef.current.x;
    vrm.scene.rotation.y = headTargetRef.current.y;

    // Eye look-at
    if (vrm.lookAt) {
      vrm.lookAt.target = undefined;
      const eyeX = pointer.x * 15;
      const eyeY = pointer.y * 10;
      vrm.lookAt.lookAt(new THREE.Vector3(eyeX, 1.5 + eyeY * 0.1, -5));
    }

    // Natural blinking
    if (!blinkingRef.current && now >= nextBlinkRef.current) {
      blinkingRef.current = true;
      blinkStartRef.current = now;
      nextBlinkRef.current = now + 2000 + Math.random() * 5000;
    }

    if (blinkingRef.current) {
      const elapsed = now - blinkStartRef.current;
      const blinkDuration = 150;
      if (elapsed < blinkDuration) {
        const progress = elapsed / blinkDuration;
        const blinkValue = progress < 0.5 ? progress * 2 : 2 - progress * 2;
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, blinkValue);
      } else {
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 0);
        blinkingRef.current = false;
      }
    }

    // Emotion-based expressions
    const emotion = detectEmotion(lastText);
    const em = vrm.expressionManager;
    if (!em) return;

    if (emotion === 'happy' || emotion === 'warm') {
      const smileTarget = speaking ? 0.5 : 0.3;
      const current = em.getValue(VRMExpressionPresetName.Happy) ?? 0;
      em.setValue(VRMExpressionPresetName.Happy, THREE.MathUtils.lerp(current, smileTarget, 0.08));
      em.setValue(VRMExpressionPresetName.Sad, 0);
      em.setValue(VRMExpressionPresetName.Angry, 0);
    } else if (emotion === 'concern') {
      const current = em.getValue(VRMExpressionPresetName.Sad) ?? 0;
      em.setValue(VRMExpressionPresetName.Sad, THREE.MathUtils.lerp(current, 0.25, 0.06));
      em.setValue(VRMExpressionPresetName.Happy, 0);
    } else {
      const current = em.getValue(VRMExpressionPresetName.Happy) ?? 0;
      em.setValue(VRMExpressionPresetName.Happy, THREE.MathUtils.lerp(current, 0.12, 0.04));
      em.setValue(VRMExpressionPresetName.Sad, 0);
      em.setValue(VRMExpressionPresetName.Angry, 0);
    }

    // Mouth animation while speaking
    if (speaking) {
      const t1 = time * 8;
      const t2 = time * 12;
      em.setValue(VRMExpressionPresetName.Aa, 0.15 + Math.abs(Math.sin(t1)) * 0.3);
      em.setValue(VRMExpressionPresetName.Oh, 0.1 + Math.abs(Math.sin(t2 + 1.5)) * 0.2);
      em.setValue(VRMExpressionPresetName.Ee, Math.abs(Math.sin(t1 * 0.7)) * 0.15);
    } else {
      const aa = em.getValue(VRMExpressionPresetName.Aa) ?? 0;
      const oh = em.getValue(VRMExpressionPresetName.Oh) ?? 0;
      em.setValue(VRMExpressionPresetName.Aa, THREE.MathUtils.lerp(aa, 0, 0.1));
      em.setValue(VRMExpressionPresetName.Oh, THREE.MathUtils.lerp(oh, 0, 0.1));
      em.setValue(VRMExpressionPresetName.Ee, 0);
    }

    em.update();
  });

  if (!loaded) return null;
  return vrmRef.current ? <primitive object={vrmRef.current.scene} /> : null;
}

// ─── Fallback Image ─────────────────────────────────────────────

function FallbackImage({ speaking, className }: { speaking: boolean; className?: string }) {
  const [imgSrc, setImgSrc] = useState('/models/ava-fallback.png');

  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center justify-center bg-gradient-to-b from-violet-950/30 to-transparent',
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt="Ava - AI Assistant"
        className="w-32 h-40 object-contain rounded-lg"
        onError={() => setImgSrc('/fallback-avatar.svg')}
      />
      {speaking && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 items-end">
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
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

type ModelType = 'glb' | 'vrm' | 'fallback' | 'checking';

export default function RealAvatar({ speaking = false, lastText = '', state, className }: RealAvatarProps) {
  const [modelType, setModelType] = useState<ModelType>('checking');

  // Derive speaking from either prop or state
  const isSpeaking = speaking || state === 'speaking';

  // Detect available model format
  useEffect(() => {
    async function detectModel() {
      try {
        // Try GLB first (user-requested format)
        const glbRes = await fetch('/models/ava-real.glb', { method: 'HEAD' });
        if (glbRes.ok) {
          setModelType('glb');
          return;
        }
      } catch { /* continue */ }

      try {
        // Try VRM (existing format)
        const vrmRes = await fetch('/models/ava-real.vrm', { method: 'HEAD' });
        if (vrmRes.ok) {
          setModelType('vrm');
          return;
        }
      } catch { /* continue */ }

      try {
        // Try alternate VRM path
        const altRes = await fetch('/ava.vrm', { method: 'HEAD' });
        if (altRes.ok) {
          setModelType('vrm');
          return;
        }
      } catch { /* continue */ }

      setModelType('fallback');
    }

    detectModel();
  }, []);

  if (modelType === 'checking') {
    return (
      <div className={cn('w-full h-full flex items-center justify-center', className)}>
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (modelType === 'fallback') {
    return <FallbackImage speaking={isSpeaking} className={className} />;
  }

  return (
    <div className={cn('w-full h-full', className)}>
      <Canvas
        camera={{ position: [0, 1.35, 1.4], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        onError={() => setModelType('fallback')}
      >
        <ambientLight intensity={1.0} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} castShadow />
        <directionalLight position={[-1, 2, -1]} intensity={0.4} />
        <Environment preset="studio" />
        <Suspense fallback={null}>
          {modelType === 'glb' ? (
            <GLBModel speaking={isSpeaking} lastText={lastText} />
          ) : (
            <VRMModel speaking={isSpeaking} lastText={lastText} />
          )}
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.8}
          target={[0, 1.3, 0]}
        />
      </Canvas>
    </div>
  );
}
