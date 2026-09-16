import { countryCode } from '../shared/commerce.js';
export function stripeShipping(order) {
  const a = order.shipping_address;
  return { name: a.full_name, ...(a.phone ? { phone: a.phone } : {}), address: {
    line1: a.address_line_1, ...(a.address_line_2 ? { line2: a.address_line_2 } : {}),
    city: a.city, ...(a.county ? { state: a.county } : {}), ...(a.postcode ? { postal_code: a.postcode } : {}), country: countryCode(a.country),
  } };
}
export function paypalShipping(order) {
  const a = order.shipping_address;
  return { name: { full_name: a.full_name }, address: {
    address_line_1: a.address_line_1, ...(a.address_line_2 ? { address_line_2: a.address_line_2 } : {}),
    admin_area_2: a.city, ...(a.county ? { admin_area_1: a.county } : {}), ...(a.postcode ? { postal_code: a.postcode } : {}), country_code: countryCode(a.country),
  } };
}
