import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { compressImageDataUrl, PHOTO_JPEG_QUALITY, PHOTO_MAX_DIMENSION } from '@/lib/imageCompress'

/** Thrown when the user backs out of the native picker without choosing a photo — never a real error, callers should ignore it silently. */
export class CaptureCancelledError extends Error {
  constructor() {
    super('Photo capture was cancelled.')
    this.name = 'CaptureCancelledError'
  }
}

function isUserCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /cancell?ed|no image (picked|selected)/i.test(message)
}

export { CameraSource }

/**
 * Native-only photo capture via the Capacitor Camera plugin. Defaults to
 * `CameraSource.Prompt` (the OS's own camera-or-photo-library chooser) for
 * entry points that offer a single capture action; callers with separate
 * "Take Photo"/"From Gallery" buttons pass `CameraSource.Camera` /
 * `CameraSource.Photos` explicitly so each button does what it says instead
 * of both re-opening the same chooser. Requests dimensions/quality matching
 * PHOTO_MAX_DIMENSION/PHOTO_JPEG_QUALITY up front (native resize is cheaper
 * than a JS canvas pass), then still runs the result through
 * compressImageDataUrl so native and web uploads always produce
 * byte-compatible output for the rest of the pipeline.
 *
 * `getPhoto`/`CameraSource`/`CameraResultType` are deprecated in
 * @capacitor/camera 8.x in favor of separate `takePhoto`/`chooseFromGallery`
 * calls plus a caller-supplied action sheet, but remain functional pending a
 * future major version — revisit this module if that plugin API is removed.
 */
export async function captureNativePhoto(source: CameraSource = CameraSource.Prompt): Promise<string> {
  let dataUrl: string | undefined
  try {
    const photo = await Camera.getPhoto({
      source,
      resultType: CameraResultType.DataUrl,
      quality: Math.round(PHOTO_JPEG_QUALITY * 100),
      width: PHOTO_MAX_DIMENSION,
      correctOrientation: true,
    })
    dataUrl = photo.dataUrl
  } catch (error) {
    if (isUserCancellation(error)) throw new CaptureCancelledError()
    throw error
  }
  if (!dataUrl) throw new Error('Camera returned no image data.')
  return compressImageDataUrl(dataUrl, PHOTO_MAX_DIMENSION, PHOTO_JPEG_QUALITY)
}
