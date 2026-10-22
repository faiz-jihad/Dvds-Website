import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useUiStore } from '../../stores/useUiStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { publicApi } from '../../lib/publicApi';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';
import { Seo, toAbsoluteUrl } from '../../components/common/Seo';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [message, setMessage] = useState('');
  const addToast = useUiStore((state) => state.addToast);
  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: publicApi.getStoreSettings,
    staleTime: 60_000,
  });

  // Payment proof state (Max 2MB)
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string>('');
  const [proofUploaded, setProofUploaded] = useState<{ fileName: string; fileSize: number; dataUrl: string } | null>(null);

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProofError('File size exceeds 2MB limit. Please select an attachment under 2MB.');
      e.target.value = '';
      setProofFile(null);
      setProofPreview(null);
      return;
    }

    setProofFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (proofFile && proofFile.size > 2 * 1024 * 1024) {
      setProofError('File size exceeds 2MB limit. Please upload an attachment under 2MB.');
      return;
    }
    setSubmitting(true);
    try {
      const fullMessage = proofFile
        ? `${message}\n\n[Attachment: ${proofFile.name} (${(proofFile.size / 1024).toFixed(1)} KB)]`
        : message;

      await publicApi.submitContactMessage({ name, email, order_reference: orderReference, message: fullMessage });
      setSubmitted(true);

      if (proofFile) {
        const reader = new FileReader();
        reader.onload = () => {
          setProofUploaded({
            fileName: proofFile.name,
            fileSize: proofFile.size,
            dataUrl: reader.result as string,
          });
          setProofFile(null);
          setProofPreview(null);
        };
        reader.readAsDataURL(proofFile);
      }

      addToast('Your message has been received by customer support.', 'success');

      // Sync notification silently
      useNotificationStore.getState().addNotification(
        {
          target: 'admin',
          type: 'support',
          title: 'New Customer Enquiry',
          message: `Message from ${name} (${email}): "${message.slice(0, 70)}${message.length > 70 ? '...' : ''}"`,
          link: '/admin/support',
        },
        { showToast: false, playAudio: false, sendNativePush: false }
      );
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Message could not be sent.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;
  const storeName = settings.store_name || 'DVDs Zone';
  const contactEmail = settings.support_email || 'info@dvds-zone.co.uk';
  const contactPhone = settings.support_phone || '00447400320038';

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white min-h-screen py-10 sm:py-16 transition-colors duration-200 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(23,105,224,0.15),transparent)] pointer-events-none" />

      <Seo
        title={`Contact ${storeName} — UK Customer Support & Inquiries`}
        description={`Get in touch with ${storeName}. Customer service and order tracking email: ${contactEmail}. UK telephone line: ${contactPhone}.`}
        canonicalPath="/contact"
        keywords={`contact ${storeName}, UK DVD support, film store inquiries, Royal Mail order tracking help`}
        siteName={storeName}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: `Contact ${storeName} Customer Service`,
          description: `Get in touch with ${storeName} customer service and dispatch team in the United Kingdom.`,
          url: toAbsoluteUrl('/contact'),
          mainEntity: {
            '@type': 'LocalBusiness',
            name: storeName,
            ...(contactPhone ? { telephone: contactPhone } : {}),
            email: contactEmail,
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'GB',
            },
          },
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16 relative z-10">
        {/* ── 1. Hero Header ── */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 text-brand-blue dark:text-blue-400 text-xs font-mono font-semibold tracking-wider uppercase shadow-2xs">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>UK CUSTOMER SERVICE · RESPONSE WITHIN 3 HOURS</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl text-dark dark:text-white tracking-tight leading-[1.1]">
            How Can We Help{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              You Today?
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
            Have questions about physical editions, Royal Mail delivery status, or custom requests? Our UK team is on hand Monday through Saturday.
          </p>
        </div>

        {/* ── 2. Contact Grid: Channels & Form ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Direct Support Channels */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] shadow-xs space-y-5">
              <div className="space-y-1 pb-4 border-b border-gray-100 dark:border-white/10">
                <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
                  DIRECT CONTACT
                </span>
                <h3 className="font-display font-bold text-lg text-dark dark:text-white">
                  Customer Desk
                </h3>
              </div>

              {/* Channel 1: Email */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div className="min-w-0">
                  <strong className="text-xs uppercase tracking-wider font-semibold text-gray-400 block mb-0.5 font-mono">
                    Email Desk
                  </strong>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-sm font-bold text-dark dark:text-white hover:text-brand-blue dark:hover:text-blue-400 transition-colors block truncate"
                  >
                    {contactEmail}
                  </a>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                    Average response: under 3 hours
                  </span>
                </div>
              </div>

              {/* Channel 2: Telephone */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div className="min-w-0">
                  <strong className="text-xs uppercase tracking-wider font-semibold text-gray-400 block mb-0.5 font-mono">
                    Telephone Line
                  </strong>
                  <a
                    href={`tel:${contactPhone}`}
                    className="text-sm font-bold text-dark dark:text-white hover:text-brand-blue dark:hover:text-blue-400 transition-colors block font-mono"
                  >
                    {contactPhone}
                  </a>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                    Mon–Fri 9:00 AM – 5:00 PM GMT
                  </span>
                </div>
              </div>

              {/* Channel 3: Hub & Vault */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div className="min-w-0">
                  <strong className="text-xs uppercase tracking-wider font-semibold text-gray-400 block mb-0.5 font-mono">
                    Dispatch Hub &amp; Vault
                  </strong>
                  <div className="text-sm font-bold text-dark dark:text-white">
                    {storeName} — {settings.registered_company_name || 'AZRAYAN LTD'}
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5 leading-relaxed">
                    {settings.warehouse_location || settings.registered_office_address || 'United Kingdom'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick FAQ Link Card */}
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-brand-blue shrink-0" />
                <div>
                  <h4 className="font-display font-bold text-xs sm:text-sm text-dark dark:text-white">Looking for instant answers?</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">View DVD regions, shipping speeds &amp; returns</p>
                </div>
              </div>
              <Link to="/faq">
                <Button variant="secondary" size="sm" className="shrink-0 text-xs font-bold">
                  View FAQ
                </Button>
              </Link>
            </div>
          </div>

          {/* Contact Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] shadow-xs">
              {submitted ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 stroke-[2]" />
                  </div>
                  <h3 className="font-display font-extrabold text-2xl text-dark dark:text-white">
                    Message Received Successfully
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    Thank you, {name}. Your inquiry has been routed to our customer service desk. We will respond directly to <strong className="text-dark dark:text-white">{email}</strong> within 3 business hours.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setName('');
                        setEmail('');
                        setMessage('');
                        setOrderReference('');
                        setProofFile(null);
                        setProofPreview(null);
                        setProofUploaded(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue/90 transition-colors cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1 pb-2 border-b border-gray-100 dark:border-white/10">
                    <h3 className="font-display font-bold text-lg text-dark dark:text-white">
                      Send Customer Enquiry
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Fill out the details below and our team will get back to you promptly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Your Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Miller"
                      required
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@example.co.uk"
                      required
                    />
                  </div>

                  <Input
                    label="Order Reference (Optional)"
                    value={orderReference}
                    onChange={(e) => setOrderReference(e.target.value)}
                    placeholder="e.g. ZDV-8492 or Royal Mail barcode"
                  />

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 font-mono">
                      Your Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your question, requested DVD title, or delivery inquiry..."
                      className="w-full p-3.5 bg-white dark:bg-[#141A26] border border-gray-300 dark:border-white/15 rounded-xl text-xs sm:text-sm text-dark dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-blue dark:focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Optional File Attachment */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 font-mono">
                      Attachment (Optional · Max 2MB)
                    </label>
                    {!proofFile ? (
                      <label className="flex items-center gap-3 p-3.5 border-2 border-dashed border-gray-200 dark:border-white/15 hover:border-brand-blue rounded-xl bg-gray-50/50 dark:bg-[#141A26] hover:bg-blue-50/40 dark:hover:bg-blue-500/10 transition-colors cursor-pointer text-xs">
                        <UploadCloud className="w-5 h-5 text-brand-blue shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300 truncate">
                          Attach photo of damage, receipt, or document (JPG, PNG, WEBP, PDF)
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleProofChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#141A26] border border-gray-200 dark:border-white/10 rounded-xl text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {proofPreview ? (
                            <img
                              src={proofPreview}
                              alt="Preview"
                              className="w-9 h-9 object-cover rounded-lg border border-gray-200 dark:border-white/10 shrink-0"
                            />
                          ) : (
                            <FileText className="w-6 h-6 text-brand-blue shrink-0" />
                          )}
                          <span className="truncate font-semibold text-dark dark:text-white">
                            {proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProofFile(null);
                            setProofPreview(null);
                            setProofError('');
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {proofError && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {proofError}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto justify-center gap-2"
                      isLoading={submitting}
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Customer Message</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
