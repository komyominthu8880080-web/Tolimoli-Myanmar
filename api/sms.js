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

    // မြန်မာဖုန်းနံပါတ် 09 ကို International format (959...) သို့ ပြောင်းလဲခြင်း
    let formattedPhone = phone.replace(/\s+/g, '').replace(/[-+]/g, '');
    if (formattedPhone.startsWith('09')) {
      formattedPhone = '959' + formattedPhone.slice(2);
    } else if (formattedPhone.startsWith('9') && !formattedPhone.startsWith('959')) {
      formattedPhone = '95' + formattedPhone;
    }

    // SMS စာသား (Test Account ဖြစ်ပါက SMSPoh မှ Auto fixed message သာ ပို့ပေးပါမည်)
    const smsMessage = `မင်္ဂလာပါ ${customerName || ''}၊ တိုလီမိုလီမြန်မာ မှ အော်ဒါ (${orderId}) လက်ခံရရှိပါပြီ။ ကျသင့်ငွေ: ${Number(totalAmount || 0).toLocaleString()} Ks ဖြစ်ပါသည်။ ကျေးဇူးတင်ပါသည်။`;

    const SMS_KEY = process.env.SMSPOH_API_KEY || '';
    const SMS_SECRET = process.env.SMSPOH_API_SECRET || '';

    if (!SMS_KEY || !SMS_SECRET) {
      console.log(`[SMS Simulation] To: ${formattedPhone} | Text: ${smsMessage}`);
      return res.status(200).json({
        success: true,
        simulated: true,
        message: 'Credentials not found in environment variables',
        details: { to: formattedPhone, text: smsMessage }
      });
    }

    // SMSPoh v3 API သို့ ပေးပို့ခြင်း
    const smsResponse = await fetch('https://v3.smspoh.com/api/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SMS_KEY}`
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: smsMessage,
        sender: 'SMSPoh' // Test Account အတွက် SMSPoh မှ သတ်မှတ်ထားသော default sender
      })
    });

    const smsResult = await smsResponse.json();
    return res.status(200).json({ success: true, result: smsResult });

  } catch (error) {
    console.error('SMS Send Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}