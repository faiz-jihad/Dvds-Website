import { supabase } from './supabase';

export async function uploadAdminImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG, WEBP, GIF or SVG image.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Image size exceeds the 5MB limit.');
  if (!supabase) throw new Error('Connect Supabase to upload images.');
  const extension = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1];
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('products').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from('products').getPublicUrl(path).data.publicUrl;
}
