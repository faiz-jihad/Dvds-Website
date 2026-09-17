import { endpoint, quoteCheckout, quoteDbClient } from './_checkout.js';
export default endpoint(async (req) => {
  const db = quoteDbClient();
  if (req.body?.configuration === true) {
    const { data: settings } = await db.from('store_settings').select('*').eq('singleton', true).maybeSingle();
    const currencies = settings?.checkout_currencies || ['GBP'];
    const zones = Array.isArray(settings?.shipping_zones) ? settings.shipping_zones : [];
    return {
      currencies,
      countries: ['GB', ...zones.filter((zone) => zone?.enabled).flatMap((zone) => zone?.countries || [])]
    };
  }
  return (await quoteCheckout(db, req.body || {})).quote;
});
