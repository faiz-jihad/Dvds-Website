import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../../lib/publicApi';
import { formatGBP } from '../../lib/formatters';
import { StoreDataState } from '../../components/common/StoreDataState';

export const DeliveryPage: React.FC = () => {
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: () => publicApi.getStoreSettings() });
  if (settingsQuery.isLoading || settingsQuery.error || !settingsQuery.data) {
    return <StoreDataState loading={settingsQuery.isLoading} error={settingsQuery.error || (!settingsQuery.data ? new Error('Delivery configuration is unavailable.') : null)} retry={() => settingsQuery.refetch()} />;
  }
  const settings = settingsQuery.data;
  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-6 space-y-10">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            DISPATCH INFORMATION
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-dark tracking-tight mt-1 mb-3">
            UK Delivery & Rates
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            All orders qualify for 100% Free Standard Delivery across the whole United Kingdom. Dispatched safely in custom bubble-lined media envelopes from {settings.warehouse_location}.
          </p>
        </div>

        {/* Tiers Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b border-gray-200 font-display font-semibold text-dark uppercase tracking-wider">
              <tr>
                <th className="p-4">Service Tier</th>
                <th className="p-4">Delivery Window</th>
                <th className="p-4 text-right">Cost (GBP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-4 font-semibold text-dark">
                  {settings.standard_shipping_name}
                </td>
                <td className="p-4 text-gray-600">{settings.standard_shipping_eta}</td>
                <td className="p-4 text-right font-mono font-bold text-dark">
                  {settings.standard_shipping_fee === 0 || settings.free_shipping_threshold <= 0 ? (
                    <span className="text-emerald-700 font-extrabold text-sm uppercase">FREE (All Orders)</span>
                  ) : (
                    <>
                      {formatGBP(settings.standard_shipping_fee)}{' '}
                      <span className="text-emerald-600 text-[11px] block">
                        (FREE over {formatGBP(settings.free_shipping_threshold)})
                      </span>
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-dark">
                  {settings.express_shipping_name}
                </td>
                <td className="p-4 text-gray-600">{settings.express_shipping_eta}</td>
                <td className="p-4 text-right font-mono font-bold text-dark">{formatGBP(settings.express_shipping_fee)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <h3 className="font-display font-bold text-base text-dark">Packaging Standards</h3>
          <p>
            We recognize that collectors value pristine slipcases and uncracked jewel cases. Our packaging uses reinforced corner protection and moisture-resistant sealing to ensure your films arrive in showroom condition.
          </p>
        </div>
      </div>
    </div>
  );
};
