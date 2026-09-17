export function publicMediaUrl(mediaId: string) {
  return `/media/${encodeURIComponent(mediaId)}`;
}
