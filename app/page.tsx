import Gallery from '@/components/Gallery';
import { getPhotos } from '@/lib/photos';

// Con Supabase, revalida cada minuto (ISR) para que las fotos nuevas aparezcan solas.
export const revalidate = 60;

export default async function Page() {
  const photos = await getPhotos();
  return <Gallery photos={photos} />;
}
