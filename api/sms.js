// api/sms.js - Serverless function for SMSPoh v3 REST API
const ALLOWED_ORIGINS = [
  'https://www.tolimolimyanmar.com',
  'https://tolimolimyanmar.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

function applyCors(req, res, methods, headers = 'Content-Type') {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.tolimolimyanmar.com');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
}

function withFbAuth(url) {
  const secret = process.env.FIREBASE_DB_SECRET;
  if (!secret) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}auth=${encodeURIComponent(secret)}`;
}

function normalizeMmPhone(phone) {
  let digits = String(phone || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('959')) digits = '09' + digits.slice(3);
  else if (digits.startsWith('9') && !digits.startsWith('09')) digits = '0' + digits;
  else if (digits && !digits.startsWith('09')) digits = '09' + digits;
  return digits;
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { phone, orderId, totalAmount, customerName } = req.body || {};

    if (!phone || !orderId) {
      return res.status(400).json({ success: false, message: 'Phone and Order ID are required' });
    }

    const formattedPhone = normalizeMmPhone(phone);
    if (!/^09\d{7,9}$/.test(formattedPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid Myanmar phone number' });
    }

    // SMS ဘေလ် အလွဲသုံးစားမဖြစ်စေရန် Firebase ထဲတွင် အဆိုပါ Order ID အမှန်တကယ် ရှိ/မရှိ စစ်ဆေးခြင်း
    const FIREBASE_BASE = process.env.FIREBASE_DB_URL || 'https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app';
    let matchedOrder = null;
    try {
      const directCheck = await fetch(withFbAuth(`${FIREBASE_BASE}/shop_orders/${encodeURIComponent(orderId)}.json`));
      const directData = directCheck.ok ? await directCheck.json() : null;
      if (directData && (directData.id || directData.phone)) {
        matchedOrder = directData;
      } else {
        const allRes = await fetch(withFbAuth(`${FIREBASE_BASE}/shop_orders.json`));
        const allData = allRes.ok ? await allRes.json() : null;
        const list = Array.isArray(allData) ? allData : Object.values(allData || {});
        matchedOrder = list.find(o => o && String(o.id) === String(orderId)) || null;
      }
    } catch (verifyErr) {
      console.warn('Order verify warning:', verifyErr);
    }

    if (!matchedOrder) {
      return res.status(403).json({ success: false, message: 'Valid order not found' });
    }

    // အော်ဒါထဲက ဖုန်းနံပါတ်နှင့် တိုက်ဆိုင်စစ်ဆေးခြင်း + SMS ပို့ပြီးသား ဟုတ်/မဟုတ် စစ်ဆေးခြင်း
    if (matchedOrder.phone && normalizeMmPhone(matchedOrder.phone) !== formattedPhone) {
      return res.status(403).json({ success: false, message: 'Phone number does not match order' });
    }
    if (matchedOrder.smsSent) {
      return res.status(200).json({ success: true, skipped: 'SMS already sent for this order' });
    }

    const SMS_KEY = process.env.SMSPOH_API_KEY || '';
    const SMS_SECRET = process.env.SMSPOH_API_SECRET || '';
    const SMS_SENDER = process.env.SMSPOH_SENDER || 'SMSPoh';

    if (!SMS_KEY || !SMS_SECRET) {
      return res.status(200).json({
        success: false,
        message: 'SMSPOH Credentials missing'
      });
    }

    const base64Token = Buffer.from(`${SMS_KEY}:${SMS_SECRET}`).toString('base64');

    const isTestMode = SMS_SENDER === 'SMSPoh';
    const verifiedTotal = Number(matchedOrder.total ?? totalAmount ?? 0);
    const verifiedName = matchedOrder.customer || customerName || '';
    const smsText = isTestMode
      ? 'This is a test message from SMSPoh'
      : `Tolimoli: Order ${orderId} confirmed (${verifiedTotal.toLocaleString()} Ks). Thank you${verifiedName ? ' ' + verifiedName : ''}!`;

    const payload = {
      to: formattedPhone,
      message: smsText,
      from: SMS_SENDER
    };

    const response = await fetch('https://v3.smspoh.com/api/rest/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${base64Token}`
      },
      body: JSON.stringify(payload)
    });

    const smsResult = await response.json();

    if (response.ok) {
      await fetch(withFbAuth(`${FIREBASE_BASE}/shop_orders/${encodeURIComponent(orderId)}.json`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsSent: true })
      }).catch(() => {});
    }

    return res.status(200).json({
      success: response.ok,
      status: response.status,
      result: smsResult
    });

  } catch (error) {
    console.error('[SMS Server Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}