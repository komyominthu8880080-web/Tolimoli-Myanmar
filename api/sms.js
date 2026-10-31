// api/sms.js - Serverless function for SMSPoh v3 REST API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { phone, orderId, totalAmount, customerName } = req.body;

    if (!phone || !orderId) {
      return res.status(400).json({ success: false, message: 'Phone and Order ID are required' });
    }

    // ဖုန်းနံပါတ်ကို 09xxxxxxxxx ဖော်မတ်သို့ ပြောင်းလဲခြင်း
    let formattedPhone = phone.replace(/\s+/g, '').replace(/[-+]/g, '');
    if (formattedPhone.startsWith('959')) {
      formattedPhone = '09' + formattedPhone.slice(3);
    } else if (!formattedPhone.startsWith('09')) {
      formattedPhone = '09' + formattedPhone;
    }

    const SMS_KEY = process.env.SMSPOH_API_KEY || '';
    const SMS_SECRET = process.env.SMSPOH_API_SECRET || '';

    if (!SMS_KEY || !SMS_SECRET) {
      return res.status(200).json({
        success: false,
        message: 'SMSPOH Credentials missing'
      });
    }

    // apiKey:apiSecret ကို Base64 encode ပြုလုပ်၍ Bearer Token ဖန်တီးခြင်း
    const rawToken = `${SMS_KEY}:${SMS_SECRET}`;
    const base64Token = Buffer.from(rawToken).toString('base64');

    // SMSPoh v3 Emulator သတ်မှတ်ချက်အတိုင်း Payload တည်ဆောက်ခြင်း
    const payload = {
      to: formattedPhone,
      message: `Order ${orderId} confirmed. Total: ${totalAmount} Ks. Tolimoli Myanmar.`,
      from: 'SMSPoh'
    };

    // SMSPoh v3 REST Endpoint သို့ ပို့ဆောင်ခြင်း
    let response = await fetch('https://v3.smspoh.com/api/rest/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${base64Token}`
      },
      body: JSON.stringify(payload)
    });

    let smsResult;
    try {
      smsResult = await response.json();
    } catch (e) {
      smsResult = { status: response.status, statusText: response.statusText };
    }

    console.log('[SMSPoh Response]:', smsResult);

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