import { useEffect, useState } from 'react';
import type { GalleryPhoto } from '../types';
import { repository } from '../services';

/** صور الجولات المختارة (للمعرض). أي فشل يُتجاهل بصمت: القسم ببساطة لا يظهر. */
export function useRoundPhotos(): GalleryPhoto[] {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  useEffect(() => {
    let alive = true;
    repository.loadRoundPhotos().then((p) => alive && setPhotos(p)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return photos;
}
