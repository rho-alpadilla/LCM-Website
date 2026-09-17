export type MediaStorageScope = "public_content" | "bulletins";
export type AllowedMediaMimeType =
  "image/jpeg" | "image/png" | "image/webp" | "image/avif" | "application/pdf";

export type MediaAssetListItem = {
  id: string;
  storageScope: MediaStorageScope;
  originalName: string;
  mimeType: AllowedMediaMimeType;
  sizeBytes: number;
  altText: string | null;
  isDecorative: boolean;
  createdAt: string;
};

export type PublicImage = {
  id: string;
  altText: string | null;
  isDecorative: boolean;
};
