/**
 * Thumbnail source for a video that is shown as a still (gallery tile, card
 * background). `preload="metadata"` alone only guarantees duration/dimensions —
 * Chrome often paints nothing until a frame has been decoded, which leaves a
 * blank tile with just the play badge on it. A media fragment makes the browser
 * seek to that timestamp, so it decodes and paints that frame.
 *
 * The image proxy cannot render a frame out of an mp4, so this is how a video
 * gets a poster without one being uploaded by hand.
 */
export function posterFrameSrc(url: string | null | undefined, seconds = 0.1): string {
  if (!url) return ''
  if (url.includes('#')) return url
  return `${url}#t=${seconds}`
}
