import { authorizeOrder, check, CheckoutError, dbClient, endpoint, loadOrder } from './_checkout.js';

export default endpoint(async (req) => {
  const db = dbClient();
  const orderId = req.body?.orderId;
  const proof = req.body?.proof;
  if (!orderId || !proof || !proof.dataUrl) {
    throw new CheckoutError('Invalid payment proof payload.', 400);
  }
  // Max 2MB validation
  if (proof.fileSize && proof.fileSize > 2 * 1024 * 1024) {
    throw new CheckoutError('Payment proof exceeds the 2MB limit.', 400);
  }

  let order = await loadOrder(db, orderId);
  await authorizeOrder(db, req, order);

  const updatedBankDetails = {
    ...(order.bank_details || {}),
    payment_proof_url: proof.dataUrl,
    payment_proof_filename: proof.fileName,
    payment_proof_filesize: proof.fileSize,
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
});
