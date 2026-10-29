import { getSupabaseServerClient } from '../api/_supabase.js';

async function updateStoreTitle() {
  const db = getSupabaseServerClient();
  if (!db) {
    console.error('No Supabase client available');
    process.exit(1);
  }

  const { data: current, error: getErr } = await db.from('store_settings').select('*').limit(1).maybeSingle();
  if (getErr) {
    console.error('Error fetching settings:', getErr);
    process.exit(1);
  }

  console.log('Current store settings:', {
    store_name: current?.store_name,
    seo_site_title: current?.seo_site_title,
    seo_site_description: current?.seo_site_description,
  });

  const newTitle = 'DVD zone UK | Buy DVD Movies & TV Box Sets Online';
  const newDesc = 'DVD zone UK — Buy DVD movies, TV series box sets, and physical media in the UK. 100% free Royal Mail UK delivery and same-day dispatch.';
  const newStoreName = 'DVD zone UK';

  if (current?.id) {
    const { data: updated, error: updErr } = await db
      .from('store_settings')
      .update({
        store_name: newStoreName,
        seo_site_title: newTitle,
        seo_site_description: newDesc,
      })
      .eq('id', current.id)
      .select('*');

    if (updErr) {
      console.error('Error updating settings:', updErr);
      process.exit(1);
    }
    console.log('Successfully updated store_settings in Supabase:', updated);
  } else {
    console.log('No store_settings row found to update.');
  }
}

updateStoreTitle().catch(console.error);
