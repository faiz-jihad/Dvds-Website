import { isSupabaseConfigured, supabase } from './supabase';
import { HomepageConfig, MediaAsset } from '../types/homepage';
import { DEFAULT_HOMEPAGE_CONFIG, PRESET_MEDIA_LIBRARY } from '../data/defaultHomepageConfig';

const STORAGE_KEY_MEDIA = 'az_rayan_homepage_media_v1';

function client() {
  if (!isSupabaseConfigured || !supabase) return null;
  return supabase;
}

const STORAGE_KEY_PUBLISHED = 'az_rayan_homepage_published_v1';
const STORAGE_KEY_DRAFT = 'az_rayan_homepage_draft_v1';

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
    console.warn('[homepageApi] Failed to write localStorage:', err);
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

    const localPublished = getLocalItem<HomepageConfig | null>(STORAGE_KEY_PUBLISHED, null);
    if (localPublished) return localPublished;

    return DEFAULT_HOMEPAGE_CONFIG;
  },

  /**
   * Fetches draft homepage configuration for Admin Dashboard
   */
  async getDraftHomepageConfig(): Promise<HomepageConfig> {
    try {
      const sb = client();
      if (sb) {
        const { data, error } = await sb
          .from('homepage_config')
          .select('config_data')
          .eq('id', 'draft')
          .maybeSingle();
        if (!error && data?.config_data) return data.config_data as HomepageConfig;

        const { data: published, error: publishedError } = await sb
          .from('homepage_config')
          .select('config_data')
          .eq('id', 'published')
          .maybeSingle();
        if (!publishedError && published?.config_data) {
          return { ...(published.config_data as HomepageConfig), status: 'draft' };
        }
      }
    } catch (err) {
      console.warn('[homepageApi] Draft homepage configuration query warning:', err);
    }

    const localDraft = getLocalItem<HomepageConfig | null>(STORAGE_KEY_DRAFT, null);
    if (localDraft) return localDraft;

    const localPublished = getLocalItem<HomepageConfig | null>(STORAGE_KEY_PUBLISHED, null);
    if (localPublished) return { ...localPublished, status: 'draft' };

    return { ...DEFAULT_HOMEPAGE_CONFIG, status: 'draft' };
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
      const sb = client();
      if (sb) {
        const { error } = await sb.from('homepage_config').upsert({
          id: 'draft',
          config_data: draftConfig,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          console.warn('[homepageApi] Could not save draft to Supabase, persisted locally:', error.message);
        }
      }
    } catch (err) {
      console.warn('[homepageApi] Supabase draft upsert error:', err);
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
      const sb = client();
      if (sb) {
        const { error } = await sb.from('homepage_config').upsert([
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
        if (error) {
          console.warn('[homepageApi] Could not publish to Supabase, persisted locally:', error.message);
        }
      }
    } catch (err) {
      console.warn('[homepageApi] Supabase publish error:', err);
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
    try {
      const sb = client();
      if (sb) {
        await sb.from('homepage_config').upsert({
          id: 'draft',
          config_data: reverted,
          updated_at: reverted.updatedAt,
        });
      }
    } catch (err) {
      console.warn('[homepageApi] Supabase draft revert error:', err);
    }
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
