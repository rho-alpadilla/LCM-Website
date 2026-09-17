export const mediaPolicy = {
  imageMaxBytes: 5 * 1024 * 1024,
  bulletinPdfMaxBytes: 10 * 1024 * 1024,
  totalStorageMaxBytes: 500 * 1024 * 1024,
} as const;

export function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
