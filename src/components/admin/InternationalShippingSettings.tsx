import React from 'react';
import { COUNTRIES, CURRENCIES, ShippingZone } from '../../../shared/commerce.js';
import { StoreSettings } from '../../types';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

export function InternationalShippingSettings({ settings, onChange }: { settings: StoreSettings; onChange: <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => void }) {
  const zones = settings.shipping_zones || [];
  const change = (id: string, values: Partial<ShippingZone>) => onChange('shipping_zones', zones.map((zone) => zone.id === id ? { ...zone, ...values } : zone));
  return <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
    <div><h3 className="font-semibold text-lg">International delivery & currencies</h3><p className="text-sm text-gray-500 mt-2">Prices and delivery fees are managed in GBP. Checkout converts them using a server-verified exchange rate and saves the chosen currency with the order.</p></div>
    <fieldset><legend className="text-sm font-semibold mb-2">Accepted checkout currencies</legend><div className="flex flex-wrap gap-4">{CURRENCIES.map((currency) => <label key={currency} className="inline-flex gap-2 text-sm items-center"><input type="checkbox" checked={settings.checkout_currencies.includes(currency)} disabled={currency === 'GBP'} onChange={(event) => onChange('checkout_currencies', event.target.checked ? [...settings.checkout_currencies, currency] : settings.checkout_currencies.filter((code) => code !== currency))} />{currency}</label>)}</div><p className="text-xs text-gray-500 mt-2">Enable these currencies in your payment provider account too. IDR uses card payments. Bank transfers remain UK / GBP only.</p></fieldset>
    <label className="block text-sm font-semibold">International duties notice<textarea className="block w-full border border-gray-200 rounded-lg p-3 mt-2 text-sm font-normal" rows={3} required value={settings.international_duties_notice} onChange={(event) => onChange('international_duties_notice', event.target.value)} /></label>
    <p className="text-sm text-gray-600">Only countries in enabled zones can order. Set verified flat fees per order and realistic delivery estimates before enabling a zone. UK services use the domestic settings above.</p>
    {zones.map((zone) => <div key={zone.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4"><label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={zone.enabled} onChange={(event) => change(zone.id, { enabled: event.target.checked })} />Enabled</label><button type="button" className="text-xs text-red-600 ml-auto" onClick={() => onChange('shipping_zones', zones.filter((item) => item.id !== zone.id))}>Remove zone</button></div>
      <Input label="Zone name" value={zone.name} onChange={(event) => change(zone.id, { name: event.target.value })} required />
      <label className="block text-sm font-semibold">Countries<select multiple size={6} aria-label={`Countries for ${zone.name}`} className="block w-full border border-gray-200 rounded-lg mt-2 p-2 text-sm font-normal" value={zone.countries} onChange={(event) => change(zone.id, { countries: Array.from(event.target.selectedOptions, (option) => option.value) })}>{COUNTRIES.filter((country) => country.code !== 'GB').map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select><span className="block text-xs text-gray-500 font-normal mt-1">Use Ctrl / Command to select multiple countries. Each country can belong to one enabled zone.</span></label>
      {(['standard','express'] as const).map((tier) => {
        const service = zone[tier];
        return <div key={tier} className="space-y-3"><div className="flex items-center gap-3"><h4 className="text-sm font-semibold capitalize">{tier} delivery</h4>{tier === 'express' && <input aria-label={`Enable express in ${zone.name}`} type="checkbox" checked={Boolean(service)} onChange={(event) => change(zone.id, { express: event.target.checked ? { name: '', eta: '', fee: 0 } : null })} />}</div>
          {service && <div className="grid sm:grid-cols-3 gap-3"><Input label="Service name" value={service.name} onChange={(event) => change(zone.id, { [tier]: { ...service, name: event.target.value } })} /><Input label="Delivery estimate" value={service.eta} onChange={(event) => change(zone.id, { [tier]: { ...service, eta: event.target.value } })} /><Input label="Flat fee (GBP)" type="number" min="0" step="0.01" value={service.fee} onChange={(event) => change(zone.id, { [tier]: { ...service, fee: Number(event.target.value) } })} /></div>}
        </div>;
      })}
      <Input label="Free standard delivery from (GBP; blank = no free delivery)" type="number" min="0" step="0.01" value={zone.free_threshold ?? ''} onChange={(event) => change(zone.id, { free_threshold: event.target.value === '' ? null : Number(event.target.value) })} />
    </div>)}
    <Button type="button" variant="secondary" onClick={() => onChange('shipping_zones', [...zones, { id: crypto.randomUUID(), name: `International zone ${zones.length + 1}`, enabled: false, countries: [], standard: { name: '', eta: '', fee: 0 }, express: null, free_threshold: null }])}>Add shipping zone</Button>
  </section>;
}
