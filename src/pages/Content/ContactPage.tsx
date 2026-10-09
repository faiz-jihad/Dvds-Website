import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, MapPin, Send, CheckCircle2, UploadCloud, FileText, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useUiStore } from '../../stores/useUiStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { publicApi } from '../../lib/publicApi';
import { StoreDataState } from '../../components/common/StoreDataState';
import { Seo } from '../../components/common/Seo';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [message, setMessage] = useState('');
  const addToast = useUiStore((state) => state.addToast);
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: publicApi.getStoreSettings });

  // Payment proof state (Max 2MB)
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string>('');
  const [proofUploaded, setProofUploaded] = useState<{ fileName: string; fileSize: number; dataUrl: string } | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 2MB: 2 * 1024 * 1024 = 2,097,152 bytes
    if (file.size > 2 * 1024 * 1024) {
      setProofError('File size exceeds 2MB limit. Please select payment proof under 2MB.');
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

  const handleUploadProofAfterSubmit = () => {
    if (!proofFile) return;
    setUploadingProof(true);
    setProofError('');
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setProofUploaded({
          fileName: proofFile.name,
          fileSize: proofFile.size,
          dataUrl,
        });
        setProofFile(null);
        setProofPreview(null);
        setUploadingProof(false);
        addToast('Payment proof attached successfully.', 'success');
      };
      reader.readAsDataURL(proofFile);
    } catch {
      setProofError('Failed to process payment proof.');
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (proofFile && proofFile.size > 2 * 1024 * 1024) {
      setProofError('File size exceeds 2MB limit. Please upload proof under 2MB.');
      return;
    }
    setSubmitting(true);
    try {
      const fullMessage = proofFile
        ? `${message}\n\n[Payment Proof Attachment: ${proofFile.name} (${(proofFile.size / 1024).toFixed(1)} KB)]`
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
      addToast('Your message was saved in the customer support queue.', 'success');

      // Immediate notification synchronization for customer and admin (silenced to avoid duplicate toast spam)
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
      useNotificationStore.getState().addNotification(
        {
          target: 'customer',
          type: 'support',
          title: 'Enquiry Received',
          message: 'Your inquiry has been submitted. Our team will get back to you shortly.',
          link: '/contact',
        },
        { showToast: false, playAudio: false, sendNativePush: false }
      );
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Message could not be sent.', 'error');
    } finally { setSubmitting(false); }
  };

  if (settingsQuery.isLoading || settingsQuery.error || !settingsQuery.data) {
    return <StoreDataState loading={settingsQuery.isLoading} error={settingsQuery.error || (!settingsQuery.data ? new Error('Contact details are unavailable.') : null)} retry={() => settingsQuery.refetch()} />;
  }
  const settings = settingsQuery.data;

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white min-h-screen py-8 sm:py-16 transition-colors">
      <Seo
        title="Contact DVD ZONE — Customer Service & Inquiries | UK DVD Store"
        description="Contact DVD ZONE. Headquarter & Vault: DVD ZONE, United Kingdom. Customer service and inquiry email address: azrayanltd@gmail.com. Customer Line: 00447400320038."
        canonicalPath="/contact"
        keywords="contact DVD ZONE, UK DVD customer service, DVD customer support, film shop contact, UK DVD inquiries, email azrayanltd@gmail.com"
        siteName="DVD ZONE"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contact DVD ZONE Customer Service',
          description: 'Get in touch with DVD ZONE customer service and dispatch team in the United Kingdom.',
          url: 'https://dvdszone.co.uk/contact',
          mainEntity: {
            '@type': 'LocalBusiness',
            name: 'DVD ZONE',
            telephone: '+447400320038',
            email: 'azrayanltd@gmail.com',
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'GB',
            },
          },
        }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400 font-semibold">
            CUSTOMER SERVICE &amp; INQUIRIES
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl text-dark dark:text-white tracking-tight mt-1 mb-3">
            Contact DVD ZONE
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            Have an enquiry about your order, delivery, or products? Our team is here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Direct Details */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 bg-white dark:bg-[#0E131F] rounded-xl border border-gray-200 dark:border-white/10 space-y-4 text-xs shadow-xs">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-dark dark:text-white block font-semibold mb-0.5">Headquarter &amp; Vault</strong>
                  <div className="font-bold text-dark dark:text-white">{settings.store_name || 'DVD ZONE'}</div>
                  <span className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {settings.warehouse_location || settings.registered_office_address || 'United Kingdom'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-dark dark:text-white block font-semibold mb-0.5">Customer service and inquiry email address</strong>
                  <a href={`mailto:${settings.support_email || 'azrayanltd@gmail.com'}`} className="text-brand-blue dark:text-blue-400 hover:underline font-mono font-medium">
                    {settings.support_email || 'azrayanltd@gmail.com'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-dark dark:text-white block font-semibold mb-0.5">Customer Line</strong>
                  <a href={`tel:${settings.support_phone || '00447400320038'}`} className="text-brand-blue dark:text-blue-400 hover:underline font-mono font-medium">
                    {settings.support_phone || '00447400320038'}
                  </a>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Direct UK Customer Support
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-7">
            {submitted ? (
              <div className="space-y-6">
                <div className="p-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-lg text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-brand-blue mx-auto" />
                  <h3 className="font-display font-bold text-lg text-dark dark:text-white">Message Received</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
                    Thank you for contacting {settings.store_name}. Your enquiry has been received by customer service and our team will respond to you promptly.
                  </p>
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
                    className="text-xs font-semibold text-brand-blue dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Send another message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Your Name" value={name} onChange={(e) => setName(e.target.value)} required />
                  <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Input label="Order Reference (If Applicable)" value={orderReference} onChange={(e) => setOrderReference(e.target.value)} />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can our UK team help you today?"
                    className="w-full p-3 bg-white dark:bg-[#141A26] border border-gray-300 dark:border-white/15 rounded-md text-sm text-dark dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-brand-blue dark:focus:border-blue-500 focus:ring-1 focus:ring-brand-blue transition-colors"
                  />
                </div>

                {/* Optional Attachment in Form */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Attachment (Optional — Maximum 2MB)
                  </label>
                  {!proofFile ? (
                    <label className="flex items-center gap-3 p-3 border border-dashed border-gray-300 dark:border-white/15 hover:border-brand-blue rounded-md bg-white dark:bg-[#141A26] hover:bg-blue-50/40 dark:hover:bg-blue-500/10 transition-colors cursor-pointer text-xs">
                      <UploadCloud className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300 truncate">
                        Attach image or PDF document (Max 2MB)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleProofChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-[#141A26] border border-gray-200 dark:border-white/10 rounded-md text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {proofPreview ? (
                          <img src={proofPreview} alt="Preview" className="w-8 h-8 object-cover rounded border border-gray-200 dark:border-white/10 shrink-0" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                        )}
                        <span className="truncate font-medium text-dark dark:text-white">{proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview(null);
                          setProofError('');
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {proofError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {proofError}
                    </p>
                  )}
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  size="md"
                  className="w-full sm:w-auto justify-center gap-2"
                  isLoading={submitting}
                  badgeText="SUPPORT 24/7"
                >
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
