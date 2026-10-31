// api/sms.js - Serverless function to send Order Confirmation SMS via SMSPoh v3
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { phone, orderId, totalAmount, customerName } = req.body;

    if (!phone || !orderId) {
      return res.status(400).json({ success: false, message: 'Phone and Order ID are required' });
    }

    // ဖုန်းနံပါတ် 09 ကို 959 သို့ ပြောင်းလဲခြင်း
    let formattedPhone = phone.replace(/\s+/g, '').replace(/[-+]/g, '');
    if (formattedPhone.startsWith('09')) {
      formattedPhone = '959' + formattedPhone.slice(2);
    } else if (formattedPhone.startsWith('9') && !formattedPhone.startsWith('959')) {
      formattedPhone = '95' + formattedPhone;
    }

    const SMS_KEY = process.env.SMSPOH_API_KEY || '';
    const SMS_SECRET = process.env.SMSPOH_API_SECRET || '';

    if (!SMS_KEY) {
      return res.status(200).json({
        success: false,
        message: 'SMSPOH_API_KEY is not defined in environment variables'
      });
    }

    // SMSPoh v3 API Call
    const smsResponse = await fetch('https://v3.smspoh.com/api/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SMS_KEY}`
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: `Order ${orderId} confirmed. Total: ${totalAmount} Ks. Tolimoli Myanmar.`,
        sender: 'SMSPoh'
      })
    });

    const smsResult = await smsResponse.json();
    console.log('[SMSPoh Response]:', smsResult);

    return res.status(200).json({ success: true, result: smsResult });

  } catch (error) {
    console.error('[SMS Server Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}