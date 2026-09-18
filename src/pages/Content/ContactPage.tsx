import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Phone, MapPin, Send, CheckCircle2, UploadCloud, FileText, X, Check, AlertCircle } from 'lucide-react';
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

      // Immediate notification synchronization for customer and admin
      useNotificationStore.getState().addNotification({
        target: 'admin',
        type: 'support',
        title: 'New Customer Enquiry',
        message: `Message from ${name} (${email}): "${message.slice(0, 70)}${message.length > 70 ? '...' : ''}"`,
        link: '/admin/support',
      });
      useNotificationStore.getState().addNotification({
        target: 'customer',
        type: 'support',
        title: 'Enquiry Received',
        message: 'Your inquiry has been submitted. Our team will get back to you shortly.',
        link: '/contact',
      });
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
      <Seo
        title="Contact DVDs Zone — Customer Support & Enquiries | UK DVD Store"
        description="Get in touch with DVDs Zone. Questions about your order, dispatch, collector editions or bulk purchases? Our UK team is ready to help."
        canonicalPath="/contact"
        siteName="DVDs Zone"
      />
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
              <div className="space-y-6">
                <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h3 className="font-display font-bold text-lg text-emerald-900">Message Received</h3>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Thank you for contacting {settings.store_name}. Your request has been recorded in our customer support queue.
                  </p>
                </div>

                {/* Upload Payment Proof After Message Sent (Max 2MB) */}
                <div className="p-6 bg-white border border-gray-200 rounded-lg space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-dark flex items-center gap-2">
                        <UploadCloud className="w-4 h-4 text-brand-blue" />
                        Upload Payment Proof / Transfer Receipt
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        If this inquiry relates to a direct bank transfer, attach your payment proof here (Maximum 2MB).
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-brand-blue border border-blue-200 uppercase font-mono">
                      Max. 2MB
                    </span>
                  </div>

                  {proofError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{proofError}</span>
                    </div>
                  )}

                  {proofUploaded ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        {proofUploaded.dataUrl.startsWith('data:image/') ? (
                          <img src={proofUploaded.dataUrl} alt="Payment Proof" className="w-12 h-12 object-cover rounded border border-emerald-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-emerald-950 truncate">{proofUploaded.fileName}</p>
                          <p className="text-emerald-700 text-[11px] mt-0.5">
                            {(proofUploaded.fileSize / 1024).toFixed(1)} KB • Attached to inquiry
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 shrink-0">
                        <Check className="w-4 h-4" /> Attached
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!proofFile ? (
                        <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-300 hover:border-brand-blue rounded-lg bg-gray-50/60 hover:bg-blue-50/30 transition-all cursor-pointer group text-center">
                          <UploadCloud className="w-7 h-7 text-gray-400 group-hover:text-brand-blue mb-1.5 transition-colors" />
                          <span className="text-xs font-semibold text-dark">
                            Select payment proof file (JPG, PNG, WEBP, PDF)
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5">
                            Maximum size 2MB per file
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={handleProofChange}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-md space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 text-xs">
                              {proofPreview ? (
                                <img src={proofPreview} alt="Preview" className="w-10 h-10 object-cover rounded border border-gray-200 shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-dark truncate">{proofFile.name}</p>
                                <p className="text-gray-500 text-[11px]">
                                  {(proofFile.size / 1024).toFixed(1)} KB (Max limit 2048 KB)
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setProofFile(null);
                                setProofPreview(null);
                                setProofError('');
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            onClick={handleUploadProofAfterSubmit}
                            isLoading={uploadingProof}
                            className="w-full justify-center gap-2 text-xs"
                            badgeText="MAX. 2MB"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            Submit Payment Proof
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setMessage('');
                      setOrderReference('');
                      setProofFile(null);
                      setProofPreview(null);
                      setProofUploaded(null);
                    }}
                    className="text-xs text-brand-blue underline hover:text-dark font-medium"
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

                {/* Optional Payment Proof Input in Form */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Payment Proof / Transfer Receipt (Optional — Maximum 2MB)
                  </label>
                  {!proofFile ? (
                    <label className="flex items-center gap-3 p-3 border border-dashed border-gray-300 hover:border-brand-blue rounded-md bg-gray-50 hover:bg-blue-50/40 transition-colors cursor-pointer text-xs">
                      <UploadCloud className="w-4 h-4 text-brand-blue shrink-0" />
                      <span className="text-gray-600 truncate">
                        Select receipt photo or payment proof (JPG, PNG, PDF max 2MB)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleProofChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {proofPreview ? (
                          <img src={proofPreview} alt="Preview" className="w-8 h-8 object-cover rounded border border-gray-200 shrink-0" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                        )}
                        <span className="truncate font-medium">{proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)</span>
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
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
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
