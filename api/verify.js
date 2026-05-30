/**
 * api/verify.js — Paystack server-side verification
 * Deploy this file to Vercel. Add PAYSTACK_SECRET_KEY as an env variable.
 * Then uncomment the verification block in app.js handlePayment().
 */

const EXPECTED_AMOUNT_KOBO = 100000; // ₦1,000
const EXPECTED_CURRENCY    = 'NGN';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.body;

  if (!reference || typeof reference !== 'string' || !reference.startsWith('udara_')) {
    return res.status(400).json({ verified: false, error: 'Invalid reference' });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ verified: false, error: 'Server config error' });
  }

  try {
    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const data = await psRes.json();

    if (!data.status) {
      return res.status(200).json({ verified: false, error: data.message });
    }

    const tx = data.data;

    // All three checks must pass
    if (tx.status   !== 'success')            return res.status(200).json({ verified: false, error: 'Not successful' });
    if (tx.amount   !== EXPECTED_AMOUNT_KOBO) return res.status(200).json({ verified: false, error: 'Amount mismatch' });
    if (tx.currency !== EXPECTED_CURRENCY)    return res.status(200).json({ verified: false, error: 'Currency mismatch' });

    console.log('[Udara] Payment verified:', reference);
    return res.status(200).json({ verified: true, reference: tx.reference, paidAt: tx.paid_at });

  } catch (err) {
    console.error('[Udara] Verify error:', err.message);
    return res.status(500).json({ verified: false, error: 'Request failed' });
  }
}
