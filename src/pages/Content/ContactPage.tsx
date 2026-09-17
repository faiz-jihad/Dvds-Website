import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useUiStore } from '../../stores/useUiStore';
import { publicApi } from '../../lib/publicApi';
import { StoreDataState } from '../../components/common/StoreDataState';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [message, setMessage] = useState('');
  const addToast = useUiStore((state) => state.addToast);
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: publicApi.getStoreSettings });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await publicApi.submitContactMessage({ name, email, order_reference: orderReference, message });
      setSubmitted(true);
      addToast('Your message was saved in the customer support queue.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Message could not be sent.', 'error');
    } finally { setSubmitting(false); }
  };

  if (settingsQuery.isLoading || settingsQuery.error || !settingsQuery.data) {
    return <StoreDataState loading={settingsQuery.isLoading} error={settingsQuery.error || (!settingsQuery.data ? new Error('Contact details are unavailable.') : null)} retry={() => settingsQuery.refetch()} />;
  }
  const settings = settingsQuery.data;

  return (
    <div className="bg-white min-h-screen py-8 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            CUSTOMER ASSISTANCE
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl text-dark tracking-tight mt-1 mb-3">
            Contact DVDs Zone
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
            Have an enquiry regarding editions, order dispatch, or bulk collector orders? Our UK team is at your service.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Direct Details */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <strong className="text-dark block font-semibold mb-0.5">Headquarters & Vault</strong>
                  <span className="text-gray-600 leading-relaxed">
                    {settings.store_name}<br />
                    {settings.warehouse_location}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <strong className="text-dark block font-semibold mb-0.5">Registered Office</strong>
                  <span className="text-gray-600 leading-relaxed">
                    {settings.registered_company_name}<br />
                    Company no. {settings.company_number}<br />
                    {settings.registered_office_address}
                  </span>
                  <a
                    href={settings.companies_house_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-brand-blue hover:underline"
                  >
                    Companies House record
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <strong className="text-dark block font-semibold mb-0.5">Dispatch & Support Email</strong>
                  <span className="text-gray-600 font-mono">{settings.support_email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <strong className="text-dark block font-semibold mb-0.5">Customer Line</strong>
                  <span className="text-gray-600 font-mono">{settings.support_phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-7">
            {submitted ? (
              <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-display font-bold text-lg text-emerald-900">Message Received</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Thank you for contacting {settings.store_name}. Your request is now recorded in our support queue.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Your Name" value={name} onChange={(e) => setName(e.target.value)} required />
                  <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Input label="Order Reference (If Applicable)" value={orderReference} onChange={(e) => setOrderReference(e.target.value)} />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can our UK team help you today?"
                    className="w-full p-3 bg-white border border-gray-300 rounded-md text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <Button variant="primary" type="submit" size="md" className="gap-2" isLoading={submitting}>
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
