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

    // SMS ဘေလ် အလွဲသုံးစားမဖြစ်စေရန် Firebase ထဲတွင် အဆိုပါ Order ID အမှန်တကယ် ရှိ/မရှိ စစ်ဆေးခြင်း
    const FIREBASE_BASE = process.env.FIREBASE_DB_URL || 'https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app';
    let orderExists = false;
    try {
      const directCheck = await fetch(`${FIREBASE_BASE}/shop_orders/${encodeURIComponent(orderId)}.json`);
      const directData = directCheck.ok ? await directCheck.json() : null;
      if (directData && (directData.id || directData.phone)) {
        orderExists = true;
      } else {
        const allRes = await fetch(`${FIREBASE_BASE}/shop_orders.json`);
        const allData = allRes.ok ? await allRes.json() : null;
        const list = Array.isArray(allData) ? allData : Object.values(allData || {});
        orderExists = list.some(o => o && String(o.id) === String(orderId));
      }
    } catch (verifyErr) {
      console.warn('Order verify warning:', verifyErr);
    }

    if (!orderExists) {
      return res.status(403).json({ success: false, message: 'Valid order not found' });
    }

    // ဖုန်းနံပါတ်ကို SMSPoh လက်ခံသည့် 09xxxxxxxxx ပုံစံသို့ တိကျစွာ ပြောင်းလဲခြင်း
    let formattedPhone = String(phone).replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('959')) {
      formattedPhone = '09' + formattedPhone.slice(3);
    } else if (formattedPhone.startsWith('9') && !formattedPhone.startsWith('09')) {
      formattedPhone = '0' + formattedPhone;
    } else if (!formattedPhone.startsWith('09')) {
      formattedPhone = '09' + formattedPhone;
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
    const smsText = isTestMode
      ? 'This is a test message from SMSPoh'
      : `Tolimoli: Order ${orderId} confirmed (${Number(totalAmount || 0).toLocaleString()} Ks). Thank you${customerName ? ' ' + customerName : ''}!`;

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
