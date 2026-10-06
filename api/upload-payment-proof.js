import { authorizeOrder, check, CheckoutError, dbClient, endpoint, loadOrder } from './_checkout.js';

const ALLOWED_PROOF_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const DATA_URL_REGEX = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,([A-Za-z0-9+/=]+)$/;

export default endpoint(async (req) => {
  const db = dbClient();
  const orderId = req.body?.orderId;
  const proof = req.body?.proof;

  if (!orderId || !proof || typeof proof.dataUrl !== 'string') {
    throw new CheckoutError('Invalid payment proof payload.', 400);
  }

  // 1. Enforce payload string limit (max 3MB base64 string ~ 2MB binary)
  if (proof.dataUrl.length > 3 * 1024 * 1024) {
    throw new CheckoutError('Payment proof exceeds the 2MB limit.', 400);
  }

  // 2. Validate Data URL format and strictly allowed MIME types (no SVG, HTML, or executables)
  const match = proof.dataUrl.match(DATA_URL_REGEX);
  if (!match) {
    throw new CheckoutError('Invalid image data format. Please upload a JPEG, PNG, WEBP, or PDF.', 400);
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_PROOF_MIMES.has(mimeType)) {
    throw new CheckoutError('File type not allowed. Supported formats: JPG, PNG, WEBP, and PDF.', 400);
  }

  // 3. Verify actual binary buffer length
  const base64Data = match[2];
  const binaryLength =
    Math.floor((base64Data.length * 3) / 4) -
    (base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0);
  if (binaryLength > 2 * 1024 * 1024) {
    throw new CheckoutError('Payment proof exceeds the 2MB file size limit.', 400);
  }

  // 4. Sanitize file name to prevent path traversal / control char injection
  const rawFileName = typeof proof.fileName === 'string' ? proof.fileName : 'proof';
  const cleanFileName = rawFileName
    .replace(/[^\w.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 80);

  const order = await loadOrder(db, orderId);
  await authorizeOrder(db, req, order);

  if (['paid', 'refunded'].includes(order.payment_status)) {
    throw new CheckoutError('This order has already been paid.', 400);
  }

  if (order.status === 'cancelled') {
    throw new CheckoutError('This order has been cancelled.', 409);
  }

  const updatedBankDetails = {
    ...(order.bank_details || {}),
    payment_proof_url: proof.dataUrl,
    payment_proof_filename: cleanFileName,
    payment_proof_filesize: binaryLength,
    payment_proof_uploaded_at: new Date().toISOString(),
  };

  const { error } = await db
    .from('orders')
    .update({ bank_details: updatedBankDetails })
    .eq('id', order.id);

  if (error) {
    throw new CheckoutError('Could not save payment proof to order.', 500);
  }

  return { success: true, uploadedAt: updatedBankDetails.payment_proof_uploaded_at };
}, 'POST', { max: 10, windowMs: 60000 });
