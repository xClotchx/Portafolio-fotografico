import { createClient } from '@supabase/supabase-js';

export type Photo = { id: string; src: string; thumb: string; full: string; alt: string; takenAt: string };

const U = (id: string, w: number, h: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=75`;
const IDS: [string, string][] = [
  ['photo-1515886657613-9f3515b0c78f', 'Retrato editorial'],
  ['photo-1529626455594-4ff0802cfb7e', 'Retrato de estudio'],
];
export const mockPhotos: Photo[] = IDS.map(([id, alt], i) => ({
  id: `p${i + 1}`, alt, src: U(id, 1000, 1250), thumb: U(id, 640, 800), full: U(id, 1600, 2000),
  takenAt: new Date(Date.UTC(2026, 8, 28 - i * 12)).toISOString(),
}));

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itrctatsajbrcmnmsrrc.supabase.co';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0cmN0YXRzYWpicmNtbm1zcnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTYzMzQsImV4cCI6MjEwNjM3MjMzNH0.YQdsmQhSrQennOv9PdGylu89aKposd1QkUSOoljra20';

export async function getPhotos(): Promise<Photo[]> {
  try {
    const sb = createClient(URL_, KEY);
    const { data, error } = await sb.storage.from('dominio').list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
    if (error || !data) return mockPhotos;
    const files = data.filter((f) => f.name && /\.(jpe?g|png|webp|avif)$/i.test(f.name));
    if (!files.length) return mockPhotos;
    for (let i = files.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [files[i], files[j]] = [files[j], files[i]]; }
    const bucket = sb.storage.from('dominio');
    return files.map((f, i) => {
      const t = (w: number, h: number | undefined, q: number, resize: 'cover' | 'contain') =>
        bucket.getPublicUrl(f.name, { transform: { width: w, ...(h ? { height: h } : {}), resize, quality: q } }).data.publicUrl;
      const n = f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      return {
        id: f.id || `d-${i}`, alt: n ? n[0].toUpperCase() + n.slice(1) : 'Fotografía',
        src: t(1000, 1250, 78, 'cover'), thumb: t(640, undefined, 72, 'contain'), full: t(1600, undefined, 82, 'contain'),
        takenAt: f.created_at || new Date().toISOString(),
      };
    });
  } catch { return mockPhotos; }
}
