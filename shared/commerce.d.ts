export interface ShippingService { name: string; eta: string; fee: number }
export interface ShippingZone { id: string; name: string; enabled: boolean; countries: string[]; standard: ShippingService; express: ShippingService | null; free_threshold: number | null }
export const COUNTRIES: { code: string; name: string }[];
export const CURRENCIES: string[];
export function countryCode(value: string): string;
export function countryName(value: string): string;
export function currencyDigits(currency: string): number;
export function minorAmount(value: number, currency?: string): number;
export function formatMoney(value: number, currency?: string): string;
export function addressRules(value: string): { postalRequired: boolean; stateRequired: boolean; postalLabel: string; stateLabel: string };
export function normalizeAddress(input: Record<string, unknown>): Record<string, string>;
export function validateShippingZones(zones: ShippingZone[]): void;
