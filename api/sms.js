// api/sms.js - Serverless function to send Order Confirmation SMS
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

    // ဝယ်သူထံ ပေးပို့မည့် SMS စာသား
    const smsMessage = `မင်္ဂလာပါ ${customerName || ''}၊ တိုလီမိုလီမြန်မာ မှ အော်ဒါ (${orderId}) လက်ခံရရှိပါပြီ။ စုစုပေါင်းငွေ: ${Number(totalAmount || 0).toLocaleString()} Ks ဖြစ်ပါသည်။ အော်ဒါအခြေအနေကို https://tolimolimyanmar.com တွင် စစ်ဆေးနိုင်ပါသည်။ ကျေးဇူးတင်ပါသည်။`;

    // SMS Gateway API Call (ဥပမာ - SMSPoh သို့မဟုတ် မိမိအသုံးပြုမည့် Gateway)
    // Environment Variable တွင် SMS_API_TOKEN ထည့်သွင်းအသုံးပြုနိုင်ပါသည်
    const SMS_TOKEN = process.env.SMS_API_TOKEN || '';

    if (!SMS_TOKEN) {
      // API Key မထည့်ရသေးမီ စမ်းသပ်မှုမပျက်စေရန် Log သာ ထုတ်ပေးခြင်း
      console.log(`[SMS Simulation] To: ${formattedPhone} | Text: ${smsMessage}`);
      return res.status(200).json({ 
        success: true, 
        simulated: true, 
        message: 'SMS Simulated (SMS_API_TOKEN not configured yet)',
        details: { to: formattedPhone, text: smsMessage }
      });
    }

    // SMSPoh Endpoint ဖြင့် ချိတ်ဆက်ခြင်း (ဥပမာ)
    const smsResponse = await fetch('https://v3.smspoh.com/api/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SMS_TOKEN}`
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: smsMessage,
        sender: 'TOLIMOLI'
      })
    });

    const smsResult = await smsResponse.json();
    return res.status(200).json({ success: true, result: smsResult });

  } catch (error) {
    console.error('SMS Send Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}