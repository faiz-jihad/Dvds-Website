import { check, dbClient, endpoint, quoteCheckout } from './_checkout.js';
export default endpoint(async (req) => {
  const db = dbClient();
  if (req.body?.configuration === true) {
    const settings = check(await db.from('store_settings').select('checkout_currencies,shipping_zones').eq('singleton', true).single());
    return { currencies: settings.checkout_currencies, countries: ['GB', ...settings.shipping_zones.filter((zone) => zone.enabled).flatMap((zone) => zone.countries)] };
  }
  return (await quoteCheckout(db, req.body || {})).quote;
});
