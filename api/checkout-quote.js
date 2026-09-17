import { endpoint, quoteCheckout, quoteDbClient, DEFAULT_SHIPPING_ZONES } from './_checkout.js';
export default endpoint(async (req) => {
  const db = quoteDbClient();
  if (req.body?.configuration === true) {
    const { data: settings } = await db.from('store_settings').select('*').eq('singleton', true).maybeSingle();
    const baseCurrencies = ['GBP', 'EUR', 'USD'];
    const dbCurrencies = Array.isArray(settings?.checkout_currencies) && settings.checkout_currencies.length > 0
      ? settings.checkout_currencies
      : [];
    const currencies = Array.from(new Set([...baseCurrencies, ...dbCurrencies]));
    const zones = Array.isArray(settings?.shipping_zones) && settings.shipping_zones.length > 0
      ? settings.shipping_zones
      : DEFAULT_SHIPPING_ZONES;
    return {
      currencies,
      countries: ['GB', ...zones.filter((zone) => zone?.enabled).flatMap((zone) => zone?.countries || [])]
    };
  }
  return (await quoteCheckout(db, req.body || {})).quote;
});
