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

    // ဖုန်းနံပါတ်ကို SMSPoh လက်ခံသည့် 09xxxxxxxxx ပုံစံသို့ ပြောင်းလဲခြင်း
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

    // apiKey:apiSecret ကို Base64 encode ပြုလုပ်၍ Bearer Token တည်ဆောက်ခြင်း
    const base64Token = Buffer.from(`${SMS_KEY}:${SMS_SECRET}`).toString('base64');

    // SMSPoh Test Account အတွက် fixed message စာသားကို အသုံးပြုပေးရပါသည်
    const payload = {
      to: formattedPhone,
      message: 'This is a test message from SMSPoh',
      from: 'SMSPoh'
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