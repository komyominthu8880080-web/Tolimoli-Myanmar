// api/sms.js - Serverless function for SMSPoh v3 REST API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { phone, orderId, totalAmount, customerName } = req.body || {};

    if (!phone || !orderId) {
      return res.status(400).json({ success: false, message: 'Phone and Order ID are required' });
    }

    // ဖုန်းနံပါတ်ကို SMSPoh လက်ခံသည့် 09xxxxxxxxx ပုံစံသို့ ပြောင်းလဲခြင်း
    let formattedPhone = String(phone).replace(/\s+/g, '').replace(/[-+]/g, '');
    if (formattedPhone.startsWith('959')) {
      formattedPhone = '09' + formattedPhone.slice(3);
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

    // Test Account ဖြစ်ပါက Test Message သုံးပြီး၊ Sender Name အတည်ပြုပြီးပါက အော်ဒါစာသား ပို့မည်
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