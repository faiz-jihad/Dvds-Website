import { dbClient, endpoint, quoteCheckout } from './_checkout.js';
export default endpoint(async (req) => (await quoteCheckout(dbClient(), req.body || {})).quote);
