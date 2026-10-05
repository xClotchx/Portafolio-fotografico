'use client';

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as RM, type PointerEvent } from 'react';
import { brand } from '@/lib/brand';
import type { Photo } from '@/lib/photos';

const pad = (n: number, l = 3) => String(n).padStart(l, '0');
const sty = (o: Record<string, string | number>) => o as CSSProperties;
const LS = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} } };
const HEART = 'M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 5 6.3 5c2 0 3.6 1.1 4.4 2.6h2.6C14.1 6.1 15.7 5 17.7 5 21 5 23.1 8.3 21.6 11.7 19.5 16.4 12 21 12 21z';

function Img({ src, fallback, className = '', onLoad, ...r }: { src: string; fallback?: string; className?: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [ok, setOk] = useState(false), ref = useRef<HTMLImageElement>(null);
  useEffect(() => { if (ref.current?.complete && ref.current.naturalWidth) setOk(true); }, []);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} className={`img-in ${ok ? 'ok' : ''} ${className}`} {...r}
      onLoad={(e) => { setOk(true); onLoad?.(e); }} onError={(e) => { if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback; }} />
  );
}

/* Baraja: arrastra o toca la carta de arriba. */
function Deck({ photos }: { photos: Photo[] }) {
  const n = photos.length, [top, setTop] = useState(0), [drag, setDrag] = useState(false);
  const el = useRef<HTMLDivElement>(null), s = useRef({ x: 0, y: 0, t: 0, on: false });
  const set = (x: number, y: number) => { if (el.current) { el.current.style.transform = `translate(${x}px,${y * 0.3}px) rotate(${x / 16}deg)`; el.current.style.setProperty('--dx', String(Math.max(-1, Math.min(1, x / 140)))); } };
  const down = (e: PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); s.current = { x: e.clientX, y: e.clientY, t: performance.now(), on: true }; setDrag(true); };
  const move = (e: PointerEvent) => { if (s.current.on) set(e.clientX - s.current.x, e.clientY - s.current.y); };
  const up = (e: PointerEvent) => {
    if (!s.current.on) return; s.current.on = false; setDrag(false);
    const dx = e.clientX - s.current.x, fast = Math.abs(dx) / (performance.now() - s.current.t + 1) > 0.5 && Math.abs(dx) > 30;
    if (Math.abs(dx) > 70 || fast || Math.abs(dx) < 5) {
      navigator.vibrate?.(8); set((Math.abs(dx) < 5 ? 1 : Math.sign(dx)) * 700, -80);
      setTimeout(() => { setTop((t) => (t + 1) % n); if (el.current) el.current.style.transform = ''; }, 320);
    } else if (el.current) el.current.style.transform = '';
  };
  return (
    <div className="deck-hint relative aspect-[4/5] w-[min(66vw,19rem)] lg:w-[min(30vw,25rem)]" aria-label="Baraja de fotos: desliza las cartas">
      {[2, 1, 0].map((k) => {
        const p = photos[(top + k) % n];
        return (
          <div key={p.id + k} ref={k === 0 ? el : undefined} data-hover={k === 0 ? '' : undefined} className={`card ${k === 0 && drag ? 'drag' : ''}`}
            style={k ? { transform: `translateY(${k * 16}px) scale(${1 - k * 0.07}) rotate(${k % 2 ? 2.5 : -2.5}deg)`, opacity: 1 - k * 0.25 } : undefined}
            {...(k === 0 ? { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up } : {})}>
            <Img src={p.thumb} alt={k === 0 ? p.alt : ''} draggable={false} loading="eager" className="h-full w-full rounded-sm object-cover ring-1 ring-white/20 shadow-[0_30px_80px_-20px_rgba(198,255,61,.25)]" />
          </div>
        );
      })}
    </div>
  );
}

export default function Gallery({ photos }: { photos: Photo[] }) {
  const n = photos.length;
  const [boot, setBoot] = useState(true), [cur, setCur] = useState(-1), [loaded, setLoaded] = useState(0);
  const [ui, setUi] = useState(true), [map, setMap] = useState(false), [clock, setClock] = useState('--:--:--');
  const [online, setOnline] = useState(true), [visits, setVisits] = useState(1), [fresh, setFresh] = useState<Set<string>>(new Set());
  const [fav, setFav] = useState<Set<string>>(new Set()), [onlyFav, setOnlyFav] = useState(false), [burst, setBurst] = useState<{ k: number; x: number; y: number } | null>(null);
  const done = useRef(false), bar = useRef<HTMLDivElement>(null), tap = useRef({ t: 0, id: 0 });

  useEffect(() => { const t = setTimeout(() => setBoot(false), 2300); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('es', { hour12: false }));
    tick(); const id = setInterval(tick, 1000);
    const on = () => setOnline(navigator.onLine); on(); addEventListener('online', on); addEventListener('offline', on);
    return () => { clearInterval(id); removeEventListener('online', on); removeEventListener('offline', on); };
  }, []);
  useEffect(() => {
    if (done.current) return; done.current = true;
    const v = Number(LS.get('ry:n') || 0) + 1; setVisits(v); LS.set('ry:n', String(v));
    const last = Number(LS.get('ry:seen') || 0);
    if (last) setFresh(new Set(photos.filter((p) => Date.parse(p.takenAt) > last).map((p) => p.id)));
    LS.set('ry:seen', String(Date.now()));
    try { setFav(new Set(JSON.parse(LS.get('ry:fav') || '[]'))); } catch {}
  }, [photos]);

  // Fotograma actual + animaciones de entrada
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('in'); setCur(Number((e.target as HTMLElement).dataset.i)); } }), { threshold: 0.55 });
    document.querySelectorAll('[data-i]').forEach((x) => io.observe(x));
    return () => io.disconnect();
  }, []);
  // Barra de progreso continua
  useEffect(() => {
    let r = 0;
    const f = () => { cancelAnimationFrame(r); r = requestAnimationFrame(() => { const m = document.documentElement.scrollHeight - innerHeight; if (bar.current) bar.current.style.transform = `scaleX(${m > 0 ? scrollY / m : 0})`; }); };
    addEventListener('scroll', f, { passive: true }); f();
    return () => { removeEventListener('scroll', f); cancelAnimationFrame(r); };
  }, []);
  useEffect(() => {
    if (!map) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setMap(false);
    addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [map]);

  const go = (i: number) => (i < 0 ? document.getElementById('top') : document.getElementById(`f${Math.min(i, n - 1)}`))?.scrollIntoView({ behavior: 'smooth' });
  const like = (id: string, force?: boolean) => setFav((f) => { const g = new Set(f); if (force || !g.has(id)) g.add(id); else g.delete(id); LS.set('ry:fav', JSON.stringify([...g])); navigator.vibrate?.(10); return g; });
  
  // Teclado (computadora)
  useEffect(() => {
    if (map) return;
    const k = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['ArrowDown', 'ArrowRight', 'j'].includes(e.key)) { e.preventDefault(); go(cur + 1); }
      else if (['ArrowUp', 'ArrowLeft', 'k'].includes(e.key)) { e.preventDefault(); go(cur - 1); }
      else if (e.key === 'f' && cur >= 0) like(photos[cur].id);
      else if (e.key === 'm') setMap(true);
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });

  const jump = (i: number) => { setMap(false); setTimeout(() => document.getElementById(`f${i}`)?.scrollIntoView(), 30); };
  const onTap = (e: RM, id: string) => {
    const now = Date.now(), r = e.currentTarget.getBoundingClientRect();
    if (now - tap.current.t < 300) { clearTimeout(tap.current.id); tap.current.t = 0; like(id, true); setBurst({ k: now, x: e.clientX - r.left, y: e.clientY - r.top }); setTimeout(() => setBurst(null), 900); }
    else { tap.current.t = now; tap.current.id = window.setTimeout(() => setUi((u) => !u), 300); }
  };
  const tilt = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const t = e.currentTarget as HTMLElement, r = t.getBoundingClientRect();
    t.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`); t.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 8}deg`);
  };
  const untilt = (e: PointerEvent) => { e.currentTarget.removeAttribute('style'); };
  const share = (p: Photo) => { const d = { title: brand.name, text: p.alt, url: location.href }; if (navigator.share) navigator.share(d).catch(() => {}); else navigator.clipboard?.writeText(d.url); };
  
  const letters = Array.from(brand.name);
  const Heart = ({ on }: { on: boolean }) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={HEART} /></svg>;

  return (
    <main className={ui ? '' : 'ui-off'}>
      {boot && (
        <div className="boot mono text-[12px] text-[var(--fg)]/80 lg:text-sm" onClick={() => setBoot(false)} aria-hidden="true">
          <div className="w-full max-w-xs space-y-1.5 lg:max-w-md">
            <p className="ln" style={sty({ '--d': '.1s' })}><span className="text-[var(--acid)]">$</span> Ryōiki Tenkai </p>
            <p className="ln" style={sty({ '--d': '.5s' })}>&gt; ajustando apertura y ISO…</p>
            <p className="ln" style={sty({ '--d': '.9s' })}>&gt; {n} tomas en la memoria</p>
            <p className="ln text-[var(--acid)]" style={sty({ '--d': '1.25s' })}>&gt; obturador abierto</p>
            <div className="mt-4 h-px w-full bg-white/15"><div className="bar h-px bg-[var(--acid)]" /></div>
          </div>
        </div>
      )}

      <header className="hud fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]" style={{ background: 'linear-gradient(#050507cc, transparent)' }}>
        <div className="mono flex items-center justify-between px-4 py-3 text-[11px] uppercase lg:px-10 lg:py-5 lg:text-xs">
          <a href="#top" className="flex min-h-6 items-center gap-2 font-medium"><i className="h-2 w-2 rounded-full bg-[var(--acid)] shadow-[0_0_10px_var(--acid)]" />{brand.name}</a>
          <span className="flex items-center gap-6 tabular-nums text-[var(--fg)]/70">
            <span className="hidden gap-4 text-[var(--fg)]/40 lg:flex"><span>↑↓ navegar</span><span>F favorita</span><span>M mapa</span></span>
            {cur >= 0 ? `${pad(cur + 1)} / ${pad(n)}` : 'inicio'}
          </span>
        </div>
        <div className="h-px w-full bg-white/10"><div ref={bar} className="h-[2px] origin-left bg-[var(--acid)] shadow-[0_0_12px_var(--acid)]" style={{ transform: 'scaleX(0)' }} /></div>
      </header>

      {/* Inicio */}
      <section id="top" data-i="-1" className="relative flex min-h-svh flex-col items-center justify-between overflow-hidden px-5 pb-8 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] lg:grid lg:grid-cols-[1.1fr_.9fr] lg:grid-rows-[1fr_auto] lg:gap-x-10 lg:px-16 lg:pb-14 lg:pt-28">
        <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
        <h1 className="relative z-10 text-center text-[clamp(3.6rem,23vw,11rem)] font-bold uppercase leading-[.9] tracking-[-.05em] lg:self-end lg:text-left lg:text-[min(11vw,11rem)]" aria-label={brand.name}>
          {letters.map((c, i) => {
            const acc = c === 'Ō' || c === 'ō';
            return <span key={i} className="mk" aria-hidden="true"><span className={`lt ${acc ? '' : 'shine'}`} style={{ ...sty({ '--i': i }), color: acc ? 'var(--acid)' : undefined }}>{c}</span></span>;
          })}
        </h1>
        {n > 0 && <div className="fadein relative z-10 my-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:my-0 lg:grid lg:place-items-center" style={sty({ '--d': '2s' })}><div className="float"><Deck photos={photos} /></div></div>}
        <div className="fadein relative z-10 flex w-full max-w-sm flex-col items-center gap-4 lg:max-w-md lg:items-start lg:self-start" style={sty({ '--d': '2.2s' })}>
          <p className="hidden max-w-sm text-[15px] leading-relaxed text-[var(--fg)]/60 lg:block">Fragmentos de memoria que flotan entre sombras y silencios.</p>
          <p className="mono text-[11px] uppercase text-[var(--fg)]/60 lg:hidden">← desliza las cartas →</p>
          <button onClick={() => go(0)} className="tap mono flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--acid)] text-[12px] font-medium uppercase text-[var(--acid)] active:bg-[var(--acid)] active:text-black hover:bg-[var(--acid)] hover:text-black lg:h-14 lg:max-w-xs lg:text-sm">
            Entrar al dominio <span className="animate-bounce">↓</span>
          </button>
          <p className="mono flex flex-wrap justify-center gap-x-3 text-[10px] uppercase text-[var(--fg)]/45 lg:justify-start lg:text-[11px]">
            <span className={online ? 'text-[var(--acid)]' : 'text-red-400'}>● {online ? 'online' : 'offline'}</span><span className="tabular-nums">{clock}</span><span>render {loaded}/{n}</span><span>visita #{visits}</span>
          </p>
          {fresh.size > 0 && <p className="mono rounded-full bg-[var(--acid)] px-3 py-1 text-[10px] font-medium uppercase text-black">{fresh.size} {fresh.size === 1 ? 'nueva' : 'nuevas'} desde tu última visita</p>}
        </div>
      </section>

      {/* Recorrido */}
      {photos.map((p, i) => (
        <section key={p.id} id={`f${i}`} data-i={i} className="frame relative flex h-svh items-center justify-center overflow-hidden" aria-label={`Fotograma ${i + 1} de ${n}`}>
          <Img src={p.thumb} alt="" aria-hidden="true" loading="lazy" decoding="async" className="bg" />
          <span className="big mono" aria-hidden="true">{pad(i + 1, 2)}</span>
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75" aria-hidden="true" />
          <figure className="ph relative z-10 m-0 px-4 pt-10 pb-16 lg:py-0" onClick={(e) => onTap(e, p.id)}>
            {burst && cur === i && <svg key={burst.k} className="heart" style={{ left: burst.x, top: burst.y }} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={HEART} /></svg>}
            <div className="tilt" data-hover="" onPointerMove={tilt} onPointerLeave={untilt}>
              <Img src={p.full} fallback={p.src} alt={p.alt} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" draggable={false} onLoad={() => setLoaded((l) => l + 1)}
                className="max-h-[62svh] max-w-[calc(100vw-2rem)] select-none object-contain ring-1 ring-white/15 lg:max-h-[82svh] lg:max-w-[min(62vw,1100px)]" />
            </div>
          </figure>
          
          {/* HUD inferior adaptado para móvil y escritorio sin solapamientos */}
          <div className="hud mono absolute inset-x-0 bottom-0 flex items-end justify-between px-4 pb-[max(1.2rem,env(safe-area-inset-top))] text-[11px] uppercase lg:px-12 lg:pb-10 pointer-events-none">
            <div className="pointer-events-auto rv glass mb-2 mr-3 min-w-0 flex-1 rounded-2xl p-2.5 lg:mb-0 lg:max-w-xs lg:flex-none lg:p-5" style={sty({ '--d': '.25s' })}>
              <p className="text-xl font-medium tabular-nums leading-none text-[var(--acid)] lg:text-4xl">{pad(i + 1)}</p>
              {fresh.has(p.id) && <p className="mt-1 inline-block rounded-full bg-[var(--acid)] px-2 py-0.5 font-medium text-black text-[9px]">nueva</p>}
            </div>
            <div className="pointer-events-auto rv mb-2 flex items-center gap-2 lg:mb-0 lg:flex-row" style={sty({ '--d': '.4s' })}>
              <button onClick={() => like(p.id)} aria-pressed={fav.has(p.id)} aria-label="Favorita" className={`tap glass grid h-11 w-11 place-items-center rounded-full ${fav.has(p.id) ? 'text-[var(--acid)]' : ''}`}><Heart on={fav.has(p.id)} /></button>
              <button onClick={() => share(p)} aria-label="Compartir" className="tap glass grid h-11 w-11 place-items-center rounded-full"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" /></svg></button>
            </div>
          </div>
        </section>
      ))}

      <footer className="relative flex min-h-[70svh] flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center">
        <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
        <p className="shine relative text-[clamp(3rem,20vw,9rem)] font-bold uppercase leading-[.9] tracking-[-.05em] lg:text-[min(14vw,13rem)]">{brand.name}</p>
        <p className="mono relative text-[11px] uppercase text-[var(--fg)]/55">fin del archivo · {n} fotogramas{fav.size ? ` · ${fav.size} ♥` : ''}</p>
        <a href="#top" className="tap mono relative flex h-12 items-center rounded-full border border-white/25 px-6 text-[12px] uppercase active:bg-white active:text-black hover:bg-white hover:text-black">Volver al inicio ↑</a>
      </footer>

      {/* Mapa */}
      <button onClick={() => setMap(true)} aria-label="Abrir mapa de fotos" className="hud glass tap mono fixed bottom-[max(1.2rem,env(safe-area-inset-top))] right-4 z-40 flex h-12 items-center gap-2 rounded-full px-4 text-[11px] font-medium uppercase lg:bottom-auto lg:right-10 lg:top-20">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>Mapa
      </button>
      {map && (
        <div className="map" role="dialog" aria-modal="true" aria-label="Mapa de fotos">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-[var(--bg)]/90 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur lg:px-10">
            <div className="flex items-center gap-3"><p className="mono text-[11px] uppercase text-[var(--fg)]/70">mapa · {n}</p>
              {fav.size > 0 && <button onClick={() => setOnlyFav((o) => !o)} aria-pressed={onlyFav} className={`tap mono rounded-full border px-3 py-1.5 text-[11px] uppercase ${onlyFav ? 'border-[var(--acid)] bg-[var(--acid)] text-black' : 'border-white/25'}`}>♥ {fav.size}</button>}</div>
            <button onClick={() => setMap(false)} aria-label="Cerrar mapa" className="tap grid h-11 w-11 place-items-center rounded-full border border-white/25"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg></button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-3 pb-[max(2rem,env(safe-area-inset-top))] sm:grid-cols-5 lg:grid-cols-8 lg:gap-3 lg:px-10">
            {photos.map((p, i) => (onlyFav && !fav.has(p.id) ? null :
              <button key={p.id} style={sty({ '--i': i })} onClick={() => jump(i)} aria-label={`Ir al fotograma ${i + 1}`} className={`cell relative aspect-[4/5] overflow-hidden bg-white/5 ${cur === i ? 'ring-2 ring-[var(--acid)]' : 'ring-1 ring-white/10'}`}>
                <Img src={p.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                {fav.has(p.id) && <span className="absolute right-1 top-1 text-[var(--acid)]">♥</span>}
                <span className="mono absolute bottom-1 left-1 bg-black/70 px-1 text-[9px]">{pad(i + 1)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}