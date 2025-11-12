import { supabase } from '@/integrations/supabase/client';
import { compressImage } from './image-compression';

export const uploadNoteImage = async (file: File, userId: string): Promise<string> => {
  try {
    // Compress image for faster loading - optimize for banner display
    const compressedFile = file.size > 500 * 1024 
      ? await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 800 })
      : file;

    // Create unique filename
    const fileExt = compressedFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('note-images')
      .upload(fileName, compressedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('note-images')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Failed to upload note image:', error);
    throw error;
  }
};

export const deleteNoteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf('note-images');
    
    if (bucketIndex === -1) {
      throw new Error('Invalid note image URL');
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage
      .from('note-images')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete note image:', error);
    throw error;
  }
};
