import { useEffect, useState } from 'react'
import { getPhotoBlob, isIndexedPhotoRef } from '@/lib/photoStore'

interface PlantPhotoProps {
  photo: string
  alt: string
  className?: string
}

export default function PlantPhoto({ photo, alt, className }: PlantPhotoProps) {
  const [src, setSrc] = useState<string | null>(() => (isIndexedPhotoRef(photo) ? null : photo))

  useEffect(() => {
    if (!isIndexedPhotoRef(photo)) {
      setSrc(photo)
      return
    }

    let active = true
    getPhotoBlob(photo)
      .then((resolved) => {
        if (active) setSrc(resolved)
      })
      .catch((error: unknown) => {
        // A missing photo (resolved === null) already renders the placeholder
        // below — this only covers a genuine read failure (e.g. IndexedDB
        // unavailable), which must not surface as an unhandled rejection.
        console.error('[myJungle] Failed to load photo from storage:', error)
        if (active) setSrc(null)
      })

    return () => {
      active = false
    }
  }, [photo])

  if (!src) {
    return <div className={className} style={{ background: '#F2ECEC' }} aria-hidden />
  }

  return <img src={src} alt={alt} className={className} />
}
