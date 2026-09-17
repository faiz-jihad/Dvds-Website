import { supabase } from './supabase';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function uploadAdminImage(file: File): Promise<string> {
  const ext = ALLOWED_MIME_TYPES[file.type];
  if (!ext) {
    throw new Error('Choose a JPG, PNG, WEBP, or GIF image.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size exceeds the 5MB limit.');
  }
  if (!supabase) {
    throw new Error('Connect Supabase to upload images.');
  }

  // Generate safe non-user-controllable random UUID filename
  const safeFilename = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('products')
    .upload(safeFilename, file, { cacheControl: '3600', upsert: false });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  return supabase.storage.from('products').getPublicUrl(safeFilename).data.publicUrl;
}
