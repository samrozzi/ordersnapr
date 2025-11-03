import imageCompression from 'browser-image-compression';

/**
 * Compress an image file to reduce storage and bandwidth costs
 *
 * @param file - The image file to compress
 * @param options - Compression options (optional)
 * @returns Compressed File object
 */
export async function compressImage(
  file: File,
  options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
  }
): Promise<File> {
  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip compression for SVG files (they're already optimized)
  if (file.type === 'image/svg+xml') {
    return file;
  }

  // Skip compression if file is already small (under 100KB)
  if (file.size < 100 * 1024) {
    return file;
  }

  try {
    const compressionOptions = {
      maxSizeMB: options?.maxSizeMB || 1, // Maximum file size in MB (1MB default)
      maxWidthOrHeight: options?.maxWidthOrHeight || 1920, // Max dimension (1920px default)
      useWebWorker: options?.useWebWorker ?? true, // Use web worker for better performance
      fileType: file.type as any, // Preserve original file type
    };

    console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);

    const compressedFile = await imageCompression(file, compressionOptions);

    const originalSizeMB = file.size / 1024 / 1024;
    const compressedSizeMB = compressedFile.size / 1024 / 1024;
    const savedPercent = ((1 - compressedFile.size / file.size) * 100).toFixed(1);

    console.log(
      `✓ Compressed ${file.name}: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (saved ${savedPercent}%)`
    );

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed, using original file:', error);
    // If compression fails, return original file
    return file;
  }
}

/**
 * Compress multiple image files
 *
 * @param files - Array of image files to compress
 * @param options - Compression options (optional)
 * @returns Array of compressed File objects
 */
export async function compressImages(
  files: File[],
  options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
  }
): Promise<File[]> {
  const compressionPromises = files.map(file => compressImage(file, options));
  return Promise.all(compressionPromises);
}
