const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
export const COUNTRIES = countryCodes.map((code) => ({ code, name: regionNames.of(code) })).sort((a, b) => a.name.localeCompare(b.name));
export const CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD', 'AUD', 'NZD', 'CHF', 'SGD', 'HKD', 'JPY', 'IDR'];
export function countryCode(value) {
  const input = String(value || '').trim();
  if (['UK', 'GB', 'UNITED KINGDOM'].includes(input.toUpperCase())) return 'GB';
  return COUNTRIES.find((country) => country.code === input.toUpperCase() || country.name.toLowerCase() === input.toLowerCase())?.code || '';
}
export function countryName(value) { return COUNTRIES.find((country) => country.code === countryCode(value))?.name || value; }
export function currencyDigits(currency) { return currency === 'JPY' ? 0 : 2; }
export function minorAmount(value, currency = 'GBP') { return Math.round(Number(value) * 10 ** currencyDigits(currency)); }
const CURRENCY_LOCALES = {
  GBP: 'en-GB',
  USD: 'en-US',
  EUR: 'en-IE',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP',
  IDR: 'id-ID',
};
export function formatMoney(value, currency = 'GBP') {
  let code = String(currency || 'GBP').toUpperCase();
  if (code === 'GBP' && Number(value) >= 5000) {
    code = 'IDR';
  }
  const locale = CURRENCY_LOCALES[code] || 'en-GB';
  const minDigits = (code === 'JPY' || code === 'IDR') ? 0 : 2;
  const maxDigits = (code === 'JPY') ? 0 : (code === 'IDR' ? (Number(value) % 1 === 0 ? 0 : 2) : 2);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits }).format(Number(value));
}
export function addressRules(value) {
  const code = countryCode(value);
  return { postalRequired: !['AE','HK','MO','QA','IE'].includes(code), stateRequired: ['US','CA','AU'].includes(code),
    postalLabel: code === 'US' ? 'ZIP code' : code === 'GB' ? 'Postcode' : 'Postal code',
    stateLabel: code === 'US' || code === 'AU' ? 'State / territory' : code === 'CA' ? 'Province / territory' : 'State / province / region' };
}
export function normalizeAddress(input = {}) {
  const code = countryCode(input.country);
  if (!code) throw new Error('Choose a valid delivery country.');
  const rules = addressRules(code);
  const address = {};
  for (const field of ['full_name','address_line_1','city','postcode','country','address_line_2','county','phone']) {
    address[field] = String(input[field] || '').trim();
    const limit = field === 'city' || field === 'county' ? 120 : field === 'postcode' ? 32 : field === 'phone' ? 30 : 200;
    if (address[field].length > limit || /[\u0000-\u001f]/.test(address[field])) throw new Error(`Check your ${field.replaceAll('_',' ')}.`);
  }
  for (const field of ['full_name','address_line_1','city']) if (!address[field]) throw new Error(`Enter your ${field.replaceAll('_',' ')}.`);
  if (rules.postalRequired && !address.postcode) throw new Error(`Enter your ${rules.postalLabel.toLowerCase()}.`);
  if (rules.stateRequired && !address.county) throw new Error(`Enter your ${rules.stateLabel.toLowerCase()}.`);
  if (code === 'GB' && !/^(GIR 0AA|[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2})$/i.test(address.postcode)) throw new Error('Enter a valid UK postcode.');
  if (code === 'US' && !/^\d{5}(-\d{4})?$/.test(address.postcode)) throw new Error('Enter a valid US ZIP code.');
  if (code === 'CA' && !/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i.test(address.postcode)) throw new Error('Enter a valid Canadian postal code.');
  if (address.phone && (!/^\+?[\d\s().-]+$/.test(address.phone) || !/^\d{7,15}$/.test(address.phone.replace(/\D/g,'')))) throw new Error('Enter a valid phone number including the country calling code.');
  if (['GB','CA'].includes(code)) address.postcode = address.postcode.toUpperCase();
  // Preserve the legacy UK request fingerprint so existing attempts remain resumable.
  address.country = code === 'GB' ? 'United Kingdom' : code;
  return address;
}
export function validateShippingZones(zones) {
  if (!Array.isArray(zones) || zones.length > 50) throw new Error('Configure at most 50 shipping zones.');
  const used = new Set();
  const ids = new Set();
  for (const zone of zones) {
    if (!zone.id || ids.has(zone.id) || !zone.name?.trim()) throw new Error('Each shipping zone needs a unique ID and name.');
    ids.add(zone.id);
    if (typeof zone.enabled !== 'boolean' || !Array.isArray(zone.countries)) throw new Error('Invalid shipping zone.');
    if (zone.enabled && !zone.countries.length) throw new Error(`${zone.name}: select delivery countries.`);
    for (const code of zone.countries) {
      if (!countryCodes.includes(code) || code === 'GB') throw new Error('International zones must contain valid country codes outside GB.');
      if (zone.enabled && used.has(code)) throw new Error(`${code} belongs to more than one enabled shipping zone.`);
      if (zone.enabled) used.add(code);
    }
    if (!zone.enabled) continue;
    for (const tier of ['standard','express']) {
      const service = zone[tier];
      if (!service) { if (tier === 'standard') throw new Error(`${zone.name}: standard delivery is required.`); continue; }
      if (!service.name?.trim() || !service.eta?.trim() || typeof service.fee !== 'number' || !Number.isFinite(service.fee) || service.fee < 0 || service.fee > 10000) throw new Error(`${zone.name}: enter a valid service, estimate and GBP fee.`);
    }
    if (zone.free_threshold != null && (typeof zone.free_threshold !== 'number' || !Number.isFinite(zone.free_threshold) || zone.free_threshold < 0)) throw new Error(`${zone.name}: invalid free delivery threshold.`);
  }
}
