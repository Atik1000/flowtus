'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLang } from '@flowtus/ui';

type Pair = [string, string];
const BOXES: { n: string; title: Pair; text: Pair; color: number; href: string }[] = [
  { n: '01', title: ['Fresh flowers', 'তাজা ফুল'], text: ['Hand-tied bouquets, packed fresh the same morning.', 'সেই সকালেই হাতে বাঁধা তাজা ফুলের তোড়া।'], color: 0xa85a72, href: '/shop/flowers' },
  { n: '02', title: ['Sweet treats', 'মিষ্টি উপহার'], text: ['Chocolates and cakes to go with the flowers.', 'ফুলের সাথে চকলেট ও কেক।'], color: 0x5f6e52, href: '/shop/gifts' },
  { n: '03', title: ['A note from you', 'আপনার বার্তা'], text: ['Add a handwritten message to any order.', 'যেকোনো অর্ডারে হাতে লেখা বার্তা যোগ করুন।'], color: 0x3e2a35, href: '/build' },
  { n: '04', title: ['A little surprise', 'ছোট্ট চমক'], text: ['Build your own gift box, exactly the way they would love it.', 'নিজের পছন্দে সাজানো উপহার বক্স।'], color: 0xb8862f, href: '/build' },
];
const SPACING = 4.2;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Scroll-driven 3D gift boxes. Four boxes open one after another as the visitor scrolls down. */
export function GiftScroll() {
  const { lang } = useLang();
  const i = lang === 'bn' ? 1 : 0;
  const wrap = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [pct, setPct] = useState(0);
  const [noGl, setNoGl] = useState(false);

  useEffect(() => {
    let dispose = () => {};
    let dead = false;
    (async () => {
      const THREE = await import('three');
      const host = mount.current;
      const outer = wrap.current;
      if (!host || !outer || dead) return;
      let renderer: import('three').WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setNoGl(true); return; }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
      scene.add(new THREE.HemisphereLight(0xfff1f4, 0x3e2a35, 1.05));
      const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 8, 6); scene.add(key);
      const rim = new THREE.PointLight(0xffb3c6, 30, 20); rim.position.set(-4, 3, -3); scene.add(rim);
      const glow = new THREE.PointLight(0xffd9a0, 0, 10); scene.add(glow);

      const std = (color: number, rough = 0.45, metal = 0.05) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
      const gold = std(0xe3c27a, 0.28, 0.85);
      const geos: import('three').BufferGeometry[] = [];
      const mats: import('three').Material[] = [gold];
      const G = <T extends import('three').BufferGeometry>(g: T) => { geos.push(g); return g; };
      const M = <T extends import('three').Material>(m: T) => { mats.push(m); return m; };
      const mesh = (g: import('three').BufferGeometry, m: import('three').Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(G(g), m); o.position.set(x, y, z); return o; };

      type Box = { g: import('three').Group; lid: import('three').Group; gift: import('three').Group; burst: import('three').Points; vel: Float32Array; spin: number };
      const boxes: Box[] = BOXES.map((b, k) => {
        const g = new THREE.Group();
        g.position.x = k * SPACING;
        const body = M(std(b.color, 0.5));
        const W = 1.5, H = 1.1, T = 0.06;
        // Open-topped base: floor + four walls, ribbon crossing the front and sides.
        g.add(mesh(new THREE.BoxGeometry(W, T, W), body, 0, T / 2, 0));
        g.add(mesh(new THREE.BoxGeometry(W, H, T), body, 0, H / 2, W / 2 - T / 2));
        g.add(mesh(new THREE.BoxGeometry(W, H, T), body, 0, H / 2, -W / 2 + T / 2));
        g.add(mesh(new THREE.BoxGeometry(T, H, W), body, W / 2 - T / 2, H / 2, 0));
        g.add(mesh(new THREE.BoxGeometry(T, H, W), body, -W / 2 + T / 2, H / 2, 0));
        g.add(mesh(new THREE.BoxGeometry(0.28, H + 0.01, 0.02), gold, 0, H / 2, W / 2 + 0.005));
        g.add(mesh(new THREE.BoxGeometry(0.02, H + 0.01, 0.28), gold, W / 2 + 0.005, H / 2, 0));
        g.add(mesh(new THREE.BoxGeometry(W - 0.2, 0.02, W - 0.2), M(std(0x20141a, 0.9)), 0, 0.12, 0)); // dark inside

        const lid = new THREE.Group();
        lid.position.y = H;
        lid.add(mesh(new THREE.BoxGeometry(W + 0.14, 0.26, W + 0.14), body, 0, 0.13, 0));
        lid.add(mesh(new THREE.BoxGeometry(0.28, 0.27, W + 0.16), gold, 0, 0.13, 0));
        lid.add(mesh(new THREE.BoxGeometry(W + 0.16, 0.27, 0.28), gold, 0, 0.13, 0));
        for (const s of [-1, 1]) { // bow loops
          const loop = mesh(new THREE.TorusGeometry(0.26, 0.07, 12, 28), gold, s * 0.27, 0.42, 0);
          loop.rotation.set(0, 0, s * 0.5); loop.scale.set(1, 1.3, 1); lid.add(loop);
        }
        lid.add(mesh(new THREE.SphereGeometry(0.12, 16, 12), gold, 0, 0.36, 0));
        g.add(lid);

        const gift = new THREE.Group(); gift.position.y = 0.2; gift.scale.setScalar(0.001);
        if (k === 0) { // flowers
          const stem = M(std(0x5f7a4a, 0.7)); const heads = [0xe58fa8, 0xf4b6c6, 0xc2506f, 0xffd6df, 0xe58fa8];
          heads.forEach((c, j) => {
            const a = (j / heads.length) * Math.PI * 2; const r = j === 0 ? 0 : 0.34;
            const s = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), stem, Math.cos(a) * r * 0.5, 0.45, Math.sin(a) * r * 0.5);
            s.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); gift.add(s);
            const h = mesh(new THREE.IcosahedronGeometry(0.24, 1), M(std(c, 0.55)), Math.cos(a) * r, 1.0 + (j === 0 ? 0.12 : 0), Math.sin(a) * r);
            gift.add(h);
          });
        } else if (k === 1) { // chocolates
          const choc = M(std(0x4a2a1c, 0.35, 0.1));
          [[-0.35, 0, -0.3], [0.35, 0, -0.3], [-0.35, 0, 0.35], [0.35, 0, 0.35], [0, 0.4, 0]].forEach(([x, y, z]) => gift.add(mesh(new THREE.BoxGeometry(0.55, 0.38, 0.55), choc, x, y + 0.15, z)));
          gift.add(mesh(new THREE.SphereGeometry(0.17, 16, 12), M(std(0xc2506f, 0.4)), 0, 0.86, 0));
        } else if (k === 2) { // letters
          const paper = M(std(0xfff6ec, 0.9));
          [-0.28, 0, 0.28].forEach((x, j) => { const e = mesh(new THREE.BoxGeometry(0.62, 0.9, 0.03), paper, x, 0.55 + j * 0.05, 0); e.rotation.z = -x * 0.9; gift.add(e); gift.add(mesh(new THREE.BoxGeometry(0.14, 0.14, 0.04), M(std(0xa85a72, 0.4)), x, 0.78 + j * 0.05, 0.02)); });
        } else { // surprise: spinning star
          const star = mesh(new THREE.OctahedronGeometry(0.5, 0), M(std(0xffd36a, 0.2, 0.7)), 0, 0.9, 0); star.name = 'star'; gift.add(star);
          gift.add(mesh(new THREE.TorusGeometry(0.7, 0.025, 8, 48), gold, 0, 0.9, 0));
        }
        g.add(gift);

        const N = 70; const pos = new Float32Array(N * 3); const vel = new Float32Array(N * 3);
        for (let n = 0; n < N; n++) { vel[n * 3] = (Math.random() - 0.5) * 2.4; vel[n * 3 + 1] = 1.2 + Math.random() * 2.2; vel[n * 3 + 2] = (Math.random() - 0.5) * 2.4; pos[n * 3 + 1] = H; }
        const pg = G(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const burst = new THREE.Points(pg, M(new THREE.PointsMaterial({ color: b.color === 0x3e2a35 ? 0xffd9a0 : 0xffe3ea, size: 0.07, transparent: true, opacity: 0, depthWrite: false })));
        g.add(burst);
        scene.add(g);
        return { g, lid, gift, burst, vel, spin: 0 };
      });

      // Soft floor disc under the row.
      const floor = mesh(new THREE.CircleGeometry(30, 48), M(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })), 1.5 * SPACING, -0.001, 0);
      floor.rotation.x = -Math.PI / 2; scene.add(floor);

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let progress = 0; let shown = 0; let act = -1; let visible = true; let raf = 0; let lastPct = -1;
      const size = () => {
        const w = host.clientWidth || 1; const h = host.clientHeight || 1;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      };
      const onScroll = () => {
        const r = outer.getBoundingClientRect();
        progress = clamp((118 - r.top) / Math.max(1, r.height - (window.innerHeight - 118)));
      };
      const ro = new ResizeObserver(size); ro.observe(host);
      const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) loop(); }, { threshold: 0 }); io.observe(outer);
      window.addEventListener('scroll', onScroll, { passive: true });
      size(); onScroll(); shown = progress;

      const clock = new THREE.Clock();
      const loop = () => {
        if (!visible || dead) return;
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, clock.getDelta()); const t = clock.elapsedTime;
        shown += (progress - shown) * Math.min(1, dt * 5); // eased follow
        const f = shown * BOXES.length;
        const idx = Math.min(BOXES.length - 1, Math.floor(f));
        if (idx !== act) { act = idx; setActive(idx); }
        const pc = Math.round(shown * 100); if (pc !== lastPct) { lastPct = pc; setPct(pc); }

        const aspect = camera.aspect; const narrow = aspect < 0.9;
        const camX = Math.min(f, BOXES.length - 0.0001) * SPACING;
        const camPos = narrow ? 1.9 : 0.8;
        camera.position.set(camX - (narrow ? 0 : 1.5) + Math.sin(t * 0.3) * 0.15, 2.6 + (narrow ? 0.6 : 0), (narrow ? 9.6 : 7.4));
        camera.lookAt(camX - (narrow ? 0 : 1.5), camPos, 0);

        boxes.forEach((b, k) => {
          const local = clamp(f - k); // 0..1 over this box's scroll window
          const open = smooth(clamp((local - 0.08) / 0.5));
          const rise = smooth(clamp((local - 0.3) / 0.45));
          const near = clamp(1 - Math.abs(f - k - 0.5) / 1.2);
          b.g.rotation.y = (reduce ? 0 : Math.sin(t * 0.6 + k) * 0.12) + (1 - near) * 0.5 - 0.35 + local * 0.6;
          b.g.position.y = reduce ? 0 : Math.sin(t * 1.2 + k) * 0.04;
          b.lid.position.set(open * -0.9, 1.1 + open * 1.9, open * -0.5);
          b.lid.rotation.set(open * 0.35, 0, open * 0.95);
          b.gift.scale.setScalar(0.001 + rise * 0.999);
          b.gift.position.y = 0.2 + rise * 0.9 + (reduce ? 0 : Math.sin(t * 1.6 + k) * 0.05 * rise);
          b.gift.rotation.y = rise * 1.4 + (reduce ? 0 : t * 0.5) * rise;
          const star = b.gift.getObjectByName('star'); if (star) { star.rotation.y = t * 1.2; star.rotation.x = t * 0.7; }
          // confetti burst when the lid comes off
          const bt = clamp((local - 0.2) / 0.5); const arr = (b.burst.geometry.attributes.position as import('three').BufferAttribute);
          if (bt > 0 && bt < 1) {
            for (let n = 0; n < arr.count; n++) { arr.setXYZ(n, b.vel[n * 3] * bt * 1.5, 1.1 + b.vel[n * 3 + 1] * bt - 2.2 * bt * bt, b.vel[n * 3 + 2] * bt * 1.5); }
            arr.needsUpdate = true;
          }
          (b.burst.material as import('three').PointsMaterial).opacity = bt > 0 && bt < 1 ? 1 - bt : 0;
        });
        const cur = boxes[idx]; const lc = clamp(f - idx);
        glow.position.set(cur.g.position.x, 1.8, 0.8); glow.intensity = smooth(clamp((lc - 0.1) / 0.4)) * 18;
        renderer.render(scene, camera);
      };
      loop();

      dispose = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('scroll', onScroll);
        geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); renderer.dispose(); renderer.domElement.remove();
      };
    })();
    return () => { dead = true; dispose(); };
  }, []);

  const cur = BOXES[active];
  return (
    <section className="gift-scroll" ref={wrap} aria-label={lang === 'bn' ? 'উপহার বক্স খুলুন' : 'Open the gift boxes'}>
      <div className="gift-stick">
        <div className="gift-canvas" ref={mount} aria-hidden="true" />
        {noGl ? <div className="gift-nogl">{BOXES.map((b) => <span key={b.n}>{b.n}</span>)}</div> : null}
        <div className="gift-copy" key={active}>
          <span className="eyebrow" style={{ color: 'var(--rose-tint)' }}>{i ? 'স্ক্রল করে বক্স খুলুন' : 'Scroll to open the boxes'}</span>
          <span className="gift-num">{cur.n}</span>
          <h2 className="display gift-title">{cur.title[i]}</h2>
          <p className="gift-text">{cur.text[i]}</p>
          <Link href={cur.href} className="btn btn-rose">{i ? 'দেখুন' : 'Explore'} →</Link>
        </div>
        <ol className="gift-dots" aria-hidden="true">
          {BOXES.map((b, k) => <li key={b.n} className={k === active ? 'on' : k < active ? 'done' : ''}>{b.n}</li>)}
        </ol>
        <div className="gift-bar" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
      </div>
    </section>
  );
}
