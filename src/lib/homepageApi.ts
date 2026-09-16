import { isSupabaseConfigured, supabase } from './supabase';
import { HomepageConfig, MediaAsset } from '../types/homepage';
import { DEFAULT_HOMEPAGE_CONFIG, PRESET_MEDIA_LIBRARY } from '../data/defaultHomepageConfig';

function client() {
  if (!isSupabaseConfigured || !supabase) return null;
  return supabase;
}

function mediaClient() {
  const sb = client();
  if (!sb) throw new Error('Connect Supabase to use the shared media library.');
  return sb;
}

export const homepageApi = {
  /**
   * Fetches published homepage configuration for public storefront.
   * Uses the starter layout until a homepage has been published.
   */
  async getHomepageConfig(): Promise<HomepageConfig> {
    const sb = client();
    if (!sb) return { ...DEFAULT_HOMEPAGE_CONFIG, status: 'draft' };
    const { data, error } = await sb.from('homepage_config').select('config_data').eq('id', 'published').maybeSingle();
    if (error) throw new Error('The published homepage could not be loaded. Please retry.');
    return data?.config_data ? { ...data.config_data, status: 'published' } : { ...DEFAULT_HOMEPAGE_CONFIG, status: 'draft' };
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
    const { data, error } = await mediaClient().from('media_assets').select('id,asset_data').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return [...(data || []).map((row) => ({ ...row.asset_data, id: row.id } as MediaAsset)), ...PRESET_MEDIA_LIBRARY];
  },

  /**
   * Adds an uploaded media asset to the library
   */
  async saveMediaAsset(asset: MediaAsset): Promise<MediaAsset> {
    const { data, error } = await mediaClient().from('media_assets')
      .upsert({ id: asset.id, asset_data: asset }).select('id,asset_data').single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('The media asset could not be saved.');
    return { ...data.asset_data, id: data.id } as MediaAsset;
  },

  /**
   * Deletes a media asset from library
   */
  async deleteMediaAsset(id: string): Promise<void> {
    const { data, error } = await mediaClient().from('media_assets').delete().eq('id', id).select('id').single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('The media asset could not be removed.');
  },
};
