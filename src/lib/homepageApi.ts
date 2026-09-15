import { isSupabaseConfigured, supabase } from './supabase';
import { HomepageConfig, MediaAsset } from '../types/homepage';
import { DEFAULT_HOMEPAGE_CONFIG, PRESET_MEDIA_LIBRARY } from '../data/defaultHomepageConfig';

const STORAGE_KEY_MEDIA = 'az_rayan_homepage_media_v1';

function client() {
  if (!isSupabaseConfigured || !supabase) return null;
  return supabase;
}

function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    throw new Error('Media library could not be saved on this device.');
  }
}

export const homepageApi = {
  /**
   * Fetches published homepage configuration for public storefront.
   * Resilient fallback: Always returns DEFAULT_HOMEPAGE_CONFIG if database is unseeded.
   */
  async getHomepageConfig(): Promise<HomepageConfig> {
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('homepage_config')
          .select('config_data')
          .eq('id', 'published')
          .maybeSingle();
        if (!error && data?.config_data) {
          return data.config_data as HomepageConfig;
        }
      }
    } catch (err) {
      console.warn('[homepageApi] Live homepage configuration query warning:', err);
    }

    return DEFAULT_HOMEPAGE_CONFIG;
  },

  /**
   * Fetches draft homepage configuration for Admin Dashboard
   */
  async getDraftHomepageConfig(): Promise<HomepageConfig> {
    const sb = client();
    if (!sb) throw new Error('Connect Supabase to edit the homepage.');
    const { data, error } = await sb.from('homepage_config').select('id,config_data').in('id', ['draft', 'published']);
    if (error) throw new Error(error.message);
    const config = data?.find((row) => row.id === 'draft')?.config_data
      || data?.find((row) => row.id === 'published')?.config_data || DEFAULT_HOMEPAGE_CONFIG;
    return { ...config, status: 'draft' } as HomepageConfig;
  },

  async saveDraftHomepageConfig(config: HomepageConfig): Promise<HomepageConfig> {
    const sb = client();
    if (!sb) throw new Error('Connect Supabase to save the homepage.');
    const draft: HomepageConfig = { ...config, status: 'draft', updatedAt: new Date().toISOString() };
    const { data, error } = await sb.from('homepage_config').upsert({ id: 'draft', config_data: draft, updated_at: draft.updatedAt }).select('id').single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('The homepage draft could not be saved.');
    return draft;
  },

  async publishHomepageConfig(config: HomepageConfig): Promise<HomepageConfig> {
    const sb = client();
    if (!sb) throw new Error('Connect Supabase to publish the homepage.');
    const published: HomepageConfig = { ...config, status: 'published', updatedAt: new Date().toISOString() };
    const { data, error } = await sb.from('homepage_config').upsert([
      { id: 'published', config_data: published, updated_at: published.updatedAt },
      { id: 'draft', config_data: { ...published, status: 'draft' }, updated_at: published.updatedAt },
    ]).select('id');
    if (error) throw new Error(error.message);
    if (data?.length !== 2) throw new Error('The homepage could not be published. Please retry.');
    return published;
  },

  async revertDraftToPublished(): Promise<HomepageConfig> {
    const sb = client();
    if (!sb) throw new Error('Connect Supabase to restore the homepage.');
    const { data, error } = await sb.from('homepage_config').select('config_data').eq('id', 'published').maybeSingle();
    if (error) throw new Error(error.message);
    return homepageApi.saveDraftHomepageConfig(data?.config_data || DEFAULT_HOMEPAGE_CONFIG);
  },

  /**
   * Retrieves media library (preset + uploaded)
   */
  async getMediaLibrary(): Promise<MediaAsset[]> {
    const userMedia = getLocalItem<MediaAsset[]>(STORAGE_KEY_MEDIA, []);
    return [...userMedia, ...PRESET_MEDIA_LIBRARY];
  },

  /**
   * Adds an uploaded media asset to the library
   */
  async saveMediaAsset(asset: MediaAsset): Promise<MediaAsset> {
    const current = getLocalItem<MediaAsset[]>(STORAGE_KEY_MEDIA, []);
    const updated = [asset, ...current.filter((m) => m.id !== asset.id)];
    setLocalItem(STORAGE_KEY_MEDIA, updated);
    return asset;
  },

  /**
   * Deletes a media asset from library
   */
  async deleteMediaAsset(id: string): Promise<void> {
    const current = getLocalItem<MediaAsset[]>(STORAGE_KEY_MEDIA, []);
    setLocalItem(STORAGE_KEY_MEDIA, current.filter((m) => m.id !== id));
  },
};
