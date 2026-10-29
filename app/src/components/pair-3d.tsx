"use client";

import { useEffect, useRef, useState } from "react";
import type * as T from "three";
import { PAIR_VIEWBOX, PairArt } from "./pair-art";

/*
 * 홈 히어로의 3D 짝꽁 두 친구 (말랑한 점토 느낌).
 * 마우스·손가락을 따라 고개를 돌리고, 둥실 떠 있다가 가끔 눈을 깜빡인다.
 * 누르면 그 친구가 몸을 찌그러뜨렸다가 한 바퀴 돌며 뛰어오른다.
 * three.js 는 화면에 들어올 때 불러오고, WebGL 이 안 되면 평면 그림을 보여 준다.
 */

type Buddy = {
  root: T.Group;
  body: T.Group;
  eyes: T.Mesh[];
  phase: number;
  baseX: number;
  jumpAt: number;
};

const JUMP_MS = 900;

export function Pair3D({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      let renderer: T.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      el.appendChild(renderer.domElement);

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0.7, 8.2);
      camera.lookAt(0, 0.45, 0);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xffe7a8, 1.9));
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(3, 5, 5);
      scene.add(sun);
      const rim = new THREE.DirectionalLight(0xfff4c9, 1.2);
      rim.position.set(-4, 2, -3);
      scene.add(rim);

      const geos: T.BufferGeometry[] = [];
      const mats: T.Material[] = [];
      const geo = <G extends T.BufferGeometry>(g: G) => (geos.push(g), g);
      const clay = (color: number) => {
        const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0 });
        mats.push(m);
        return m;
      };

      const sphere = geo(new THREE.SphereGeometry(1, 64, 48));
      const small = geo(new THREE.SphereGeometry(1, 24, 16));
      const ink = clay(0x1f2a26);
      const leaf = clay(0x4fb37e);
      const stemMat = clay(0x2f7a55);

      // 바닥에 깔리는 부드러운 그림자
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = shadowCanvas.height = 128;
      const ctx = shadowCanvas.getContext("2d")!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(107,83,0,0.28)");
      grad.addColorStop(1, "rgba(107,83,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
      mats.push(shadowMat);
      const shadowGeo = geo(new THREE.PlaneGeometry(2.4, 2.4));

      function makeBuddy(color: number, cheek: number, sprout: boolean, x: number, z: number, turn: number, phase: number): Buddy {
        const root = new THREE.Group();
        root.position.set(x, 0, z);
        root.rotation.y = turn;
        const body = new THREE.Group();
        root.add(body);

        const skin = new THREE.Mesh(sphere, clay(color));
        skin.scale.set(1, 0.94, 0.92);
        body.add(skin);

        const eyes = [-0.32, 0.32].map((ex) => {
          const e = new THREE.Mesh(small, ink);
          e.scale.set(0.1, 0.13, 0.1);
          e.position.set(ex, 0.12, 0.85);
          body.add(e);
          return e;
        });

        const cheekMat = clay(cheek);
        [-0.56, 0.56].forEach((cx) => {
          const c = new THREE.Mesh(small, cheekMat);
          c.scale.set(0.15, 0.09, 0.04);
          c.position.set(cx, -0.08, 0.76);
          c.lookAt(cx * 3, -0.2, 4);
          body.add(c);
        });

        const mouth = new THREE.Mesh(geo(new THREE.TorusGeometry(0.11, 0.028, 10, 24, Math.PI)), ink);
        mouth.rotation.z = Math.PI;
        mouth.position.set(0, -0.06, 0.9);
        body.add(mouth);

        if (sprout) {
          const stem = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.035, 0.045, 0.38, 12)), stemMat);
          stem.position.set(0, 1.03, 0);
          body.add(stem);
          [-1, 1].forEach((side) => {
            const l = new THREE.Mesh(small, leaf);
            l.scale.set(0.26, 0.09, 0.15);
            l.position.set(side * 0.24, 1.24, 0);
            l.rotation.z = side * 0.45;
            body.add(l);
          });
        }

        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -1.02;
        root.add(shadow);

        scene.add(root);
        return { root, body, eyes, phase, baseX: x, jumpAt: -1 };
      }

      const buddies = [
        makeBuddy(0xf6a6bb, 0xee8ca3, false, 0.92, -0.35, -0.18, 1.3),
        makeBuddy(0x7fd6a6, 0xf6a6bb, true, -0.86, 0, 0.18, 0),
      ];

      // 포인터: 화면 어디서든 캐릭터 쪽 방향을 바라본다
      const look = { x: 0, y: 0 };
      let lastMove = 0;
      function onMove(e: PointerEvent) {
        lastMove = performance.now();
        const r = el!.getBoundingClientRect();
        look.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        look.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      }
      window.addEventListener("pointermove", onMove);

      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      function hit(e: PointerEvent) {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        return buddies.find((b) => ray.intersectObject(b.body, true).length > 0);
      }
      function onDown(e: PointerEvent) {
        const now = performance.now();
        const b = hit(e);
        if (b) b.jumpAt = now;
        else buddies.forEach((x, i) => (x.jumpAt = now + i * 140));
      }
      function onHover(e: PointerEvent) {
        renderer.domElement.style.cursor = hit(e) ? "pointer" : "default";
      }
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointermove", onHover);

      function resize() {
        const w = el!.clientWidth;
        const h = el!.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      // 화면 밖에 있을 때는 그리지 않는다
      let visible = true;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      io.observe(el);

      let nextBlink = performance.now() + 2500;
      let blinkUntil = 0;
      let raf = 0;
      const t0 = performance.now();
      function frame(now: number) {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        const t = (now - t0) / 1000;

        if (now > nextBlink) {
          blinkUntil = now + 130;
          nextBlink = now + 2800 + Math.random() * 2200;
        }
        const eyeY = now < blinkUntil ? 0.015 : 0.13;
        // 한동안 포인터가 움직이지 않으면 (휴대폰 등) 다시 정면을 본다
        if (now - lastMove > 2500) {
          look.x *= 0.96;
          look.y *= 0.96;
        }

        for (const b of buddies) {
          const p = b.jumpAt >= 0 && now >= b.jumpAt ? (now - b.jumpAt) / JUMP_MS : -1;
          let y = still ? 0 : Math.sin(t * 1.8 + b.phase) * 0.06;
          let sx = 1;
          let sy = 1;
          let spin = 0;
          if (p >= 0 && p < 1) {
            if (p < 0.15) {
              // 웅크리기
              const k = Math.sin((p / 0.15) * (Math.PI / 2));
              sy = 1 - 0.22 * k;
              sx = 1 + 0.14 * k;
            } else if (p < 0.85) {
              const q = (p - 0.15) / 0.7;
              y += Math.sin(q * Math.PI) * 0.8;
              sy = 1 + 0.12 * Math.sin(q * Math.PI);
              sx = 1 - 0.06 * Math.sin(q * Math.PI);
              spin = still ? 0 : q * Math.PI * 2;
            } else {
              // 착지하며 말랑
              const q = (p - 0.85) / 0.15;
              const k = Math.sin(q * Math.PI);
              sy = 1 - 0.16 * k;
              sx = 1 + 0.1 * k;
            }
          } else if (p >= 1) {
            b.jumpAt = -1;
          }

          b.root.position.y = y;
          b.body.scale.set(sx, sy, sx);
          b.body.position.y = (sy - 1) * 0.94;
          const ty = look.x * 0.55 + spin;
          const tx = look.y * 0.2;
          b.body.rotation.y += (ty - b.body.rotation.y) * (spin ? 1 : 0.08);
          b.body.rotation.x += (tx - b.body.rotation.x) * 0.08;
          b.eyes.forEach((e) => (e.scale.y = eyeY));
        }
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        geos.forEach((g) => g.dispose());
        mats.forEach((m) => m.dispose());
        shadowTex.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div ref={host} role="img" aria-label="짝꽁 두 친구. 누르면 뛰어올라요" className={`relative aspect-square w-full touch-manipulation ${className}`}>
      {failed && (
        <svg viewBox={PAIR_VIEWBOX} aria-hidden="true" className="absolute inset-0 m-auto h-auto w-full">
          <PairArt />
        </svg>
      )}
    </div>
  );
}
