'use client';

import { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import type { AvatarState } from '@/hooks/useAvatar';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────

interface Avatar3DProps {
  state: AvatarState;
  lastText?: string;
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

// ─── VRM Model with Full Animation ─────────────────────────────

function VRMModel({ state, lastText = '' }: { state: AvatarState; lastText: string }) {
  const vrmRef = useRef<VRM | null>(null);
  const [loaded, setLoaded] = useState(false);
  const clockRef = useRef(new THREE.Clock());
  const { pointer } = useThree();

  // Track the last blink time for natural random blinking
  const nextBlinkRef = useRef(Date.now() + 2000 + Math.random() * 4000);
  const blinkingRef = useRef(false);
  const blinkStartRef = useRef(0);

  // Smooth head rotation targets
  const headTargetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    // Try realistic model first, fall back to original
    const modelPaths = ['/models/ava-real.vrm', '/ava.vrm'];
    let loaded = false;

    function tryLoad(index: number) {
      if (index >= modelPaths.length || loaded) return;

      loader.load(
        modelPaths[index],
        (gltf) => {
          if (loaded) return;
          const vrm = gltf.userData.vrm as VRM;
          if (vrm) {
            loaded = true;
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

    // ── Breathing (always active) ──
    vrm.scene.position.y = Math.sin(time * 1.5) * 0.004;

    // ── Eye Contact: Head tracks pointer/camera ──
    const targetX = -pointer.y * 0.12 + Math.sin(time * 0.7) * 0.03;
    const targetY = Math.PI + pointer.x * 0.2 + Math.sin(time * 0.5) * 0.04;

    headTargetRef.current.x = THREE.MathUtils.lerp(headTargetRef.current.x, targetX, 0.06);
    headTargetRef.current.y = THREE.MathUtils.lerp(headTargetRef.current.y, targetY, 0.06);

    // State-based head movement additions
    if (state === 'thinking') {
      headTargetRef.current.y += Math.sin(time * 2) * 0.04;
      headTargetRef.current.x += Math.sin(time * 1.3) * 0.02;
    } else if (state === 'speaking') {
      headTargetRef.current.x += Math.sin(time * 2.5) * 0.025;
      headTargetRef.current.y += Math.sin(time * 1.8) * 0.02;
    }

    vrm.scene.rotation.x = headTargetRef.current.x;
    vrm.scene.rotation.y = headTargetRef.current.y;

    // ── Eye Look-at (VRM lookAt system) ──
    if (vrm.lookAt) {
      vrm.lookAt.target = undefined; // Use Euler mode
      const eyeX = pointer.x * 15;
      const eyeY = pointer.y * 10;
      vrm.lookAt.lookAt(new THREE.Vector3(eyeX, 1.5 + eyeY * 0.1, -5));
    }

    // ── Natural Blinking ──
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
        const blinkValue = progress < 0.5
          ? progress * 2
          : 2 - progress * 2;
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, blinkValue);
      } else {
        vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 0);
        blinkingRef.current = false;
      }
    }

    // ── Emotion-based Expressions ──
    const emotion = detectEmotion(lastText);
    const expressionManager = vrm.expressionManager;
    if (!expressionManager) return;

    if (emotion === 'happy' || emotion === 'warm') {
      const smileTarget = state === 'speaking' ? 0.5 : 0.3;
      const current = expressionManager.getValue(VRMExpressionPresetName.Happy) ?? 0;
      expressionManager.setValue(
        VRMExpressionPresetName.Happy,
        THREE.MathUtils.lerp(current, smileTarget, 0.08)
      );
      expressionManager.setValue(VRMExpressionPresetName.Sad, 0);
      expressionManager.setValue(VRMExpressionPresetName.Angry, 0);
    } else if (emotion === 'concern') {
      const current = expressionManager.getValue(VRMExpressionPresetName.Sad) ?? 0;
      expressionManager.setValue(
        VRMExpressionPresetName.Sad,
        THREE.MathUtils.lerp(current, 0.25, 0.06)
      );
      expressionManager.setValue(VRMExpressionPresetName.Happy, 0);
    } else {
      // Neutral — gentle resting smile
      const current = expressionManager.getValue(VRMExpressionPresetName.Happy) ?? 0;
      expressionManager.setValue(
        VRMExpressionPresetName.Happy,
        THREE.MathUtils.lerp(current, 0.12, 0.04)
      );
      expressionManager.setValue(VRMExpressionPresetName.Sad, 0);
      expressionManager.setValue(VRMExpressionPresetName.Angry, 0);
    }

    // ── Mouth Animation while Speaking ──
    if (state === 'speaking') {
      // Simulate viseme-like mouth movement
      const t1 = time * 8;
      const t2 = time * 12;
      const aa = 0.15 + Math.abs(Math.sin(t1)) * 0.3;
      const oh = 0.1 + Math.abs(Math.sin(t2 + 1.5)) * 0.2;
      expressionManager.setValue(VRMExpressionPresetName.Aa, aa);
      expressionManager.setValue(VRMExpressionPresetName.Oh, oh);
      expressionManager.setValue(VRMExpressionPresetName.Ee, Math.abs(Math.sin(t1 * 0.7)) * 0.15);
    } else if (state === 'thinking') {
      // Slight mouth tension
      expressionManager.setValue(VRMExpressionPresetName.Aa, 0);
      expressionManager.setValue(VRMExpressionPresetName.Oh, 0.05);
      expressionManager.setValue(VRMExpressionPresetName.Ee, 0);
    } else {
      // Idle — close mouth smoothly
      const aa = expressionManager.getValue(VRMExpressionPresetName.Aa) ?? 0;
      const oh = expressionManager.getValue(VRMExpressionPresetName.Oh) ?? 0;
      expressionManager.setValue(VRMExpressionPresetName.Aa, THREE.MathUtils.lerp(aa, 0, 0.1));
      expressionManager.setValue(VRMExpressionPresetName.Oh, THREE.MathUtils.lerp(oh, 0, 0.1));
      expressionManager.setValue(VRMExpressionPresetName.Ee, 0);
    }

    expressionManager.update();
  });

  if (!loaded) return null;

  return vrmRef.current ? <primitive object={vrmRef.current.scene} /> : null;
}

// ─── Fallback (professional silhouette) ─────────────────────────

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

// ─── Main Component ─────────────────────────────────────────────

export default function Avatar3D({ state, lastText = '', className }: Avatar3DProps) {
  const [useVRM, setUseVRM] = useState(true);
  const [vrmFailed, setVrmFailed] = useState(false);

  useEffect(() => {
    // Check if any VRM model exists
    Promise.all([
      fetch('/models/ava-real.vrm', { method: 'HEAD' }).then((r) => r.ok),
      fetch('/ava.vrm', { method: 'HEAD' }).then((r) => r.ok),
    ])
      .then(([realOk, originalOk]) => {
        if (!realOk && !originalOk) {
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
        camera={{ position: [0, 1.35, 1.4], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.0} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} castShadow />
        <directionalLight position={[-1, 2, -1]} intensity={0.4} />
        <Suspense fallback={null}>
          <VRMModel state={state} lastText={lastText} />
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
