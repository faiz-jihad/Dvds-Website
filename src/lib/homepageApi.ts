import { isSupabaseConfigured, supabase } from './supabase';
import { HomepageConfig, MediaAsset } from '../types/homepage';
import { DEFAULT_HOMEPAGE_CONFIG, PRESET_MEDIA_LIBRARY } from '../data/defaultHomepageConfig';

const STORAGE_KEY_PUBLISHED = 'az_rayan_homepage_published_v1';
const STORAGE_KEY_DRAFT = 'az_rayan_homepage_draft_v1';
const STORAGE_KEY_MEDIA = 'az_rayan_homepage_media_v1';

function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[homepageApi] Failed to write localStorage:', err);
  }
}

export const homepageApi = {
  /**
   * Fetches published homepage configuration for public storefront
   */
  async getHomepageConfig(): Promise<HomepageConfig> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('homepage_config')
          .select('config_data')
          .eq('id', 'published')
          .maybeSingle();

        if (!error && data?.config_data) {
          return data.config_data as HomepageConfig;
        }
      }
    } catch (err) {
      console.warn('[homepageApi] Supabase fetch failed, checking local cache:', err);
    }

    return getLocalItem<HomepageConfig>(STORAGE_KEY_PUBLISHED, DEFAULT_HOMEPAGE_CONFIG);
  },

  /**
   * Fetches draft homepage configuration for Admin Dashboard
   */
  async getDraftHomepageConfig(): Promise<HomepageConfig> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('homepage_config')
          .select('config_data')
          .eq('id', 'draft')
          .maybeSingle();

        if (!error && data?.config_data) {
          return data.config_data as HomepageConfig;
        }
      }
    } catch (err) {
      console.warn('[homepageApi] Supabase draft fetch failed:', err);
    }

    const localDraft = getLocalItem<HomepageConfig | null>(STORAGE_KEY_DRAFT, null);
    if (localDraft) return localDraft;

    // If no draft exists, fork published or default
    const published = await this.getHomepageConfig();
    return { ...published, status: 'draft' };
  },

  /**
   * Saves draft configuration
   */
  async saveDraftHomepageConfig(config: HomepageConfig): Promise<HomepageConfig> {
    const draftConfig: HomepageConfig = {
      ...config,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };

    setLocalItem(STORAGE_KEY_DRAFT, draftConfig);

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('homepage_config').upsert({
          id: 'draft',
          config_data: draftConfig,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('[homepageApi] Supabase draft save failed:', err);
    }

    return draftConfig;
  },

  /**
   * Publishes draft configuration to live storefront
   */
  async publishHomepageConfig(config: HomepageConfig): Promise<HomepageConfig> {
    const publishedConfig: HomepageConfig = {
      ...config,
      status: 'published',
      updatedAt: new Date().toISOString(),
    };

    setLocalItem(STORAGE_KEY_PUBLISHED, publishedConfig);
    setLocalItem(STORAGE_KEY_DRAFT, publishedConfig);

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('homepage_config').upsert([
          {
            id: 'published',
            config_data: publishedConfig,
            updated_at: new Date().toISOString(),
          },
          {
            id: 'draft',
            config_data: publishedConfig,
            updated_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.warn('[homepageApi] Supabase publish failed:', err);
    }

    return publishedConfig;
  },

  /**
   * Reverts draft to published configuration
   */
  async revertDraftToPublished(): Promise<HomepageConfig> {
    const published = await this.getHomepageConfig();
    const reverted: HomepageConfig = {
      ...published,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    setLocalItem(STORAGE_KEY_DRAFT, reverted);
    return reverted;
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
