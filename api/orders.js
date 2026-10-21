export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const FIREBASE_BASE_URL = 'https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app';

  // ၁။ အော်ဒါအသစ် ရေးသွင်းခြင်း (Customer Submit / Admin Update)
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const orderData = req.body;
      if (!orderData || !orderData.id) {
        return res.status(400).json({ error: 'Order data or ID missing' });
      }

      const FIREBASE_ORDER_URL = `${FIREBASE_BASE_URL}/shop_orders/${orderData.id}.json`;
      const response = await fetch(FIREBASE_ORDER_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Firebase Order Write Failed');
      return res.status(200).json({ success: true, orderId: orderData.id });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ၂။ အော်ဒါများ ပြန်လည်ဆွဲယူခြင်း (GET)
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      const clientPin = req.headers['x-admin-pin'] || req.query.pin;

      // (က) Customer Tracking: အော်ဒါ ID သီးသန့်ဖြင့် စစ်ဆေးခြင်း (Public ခွင့်ပြုသည်)
      if (id) {
        const response = await fetch(`${FIREBASE_BASE_URL}/shop_orders/${id}.json`);
        const data = await response.json();
        return res.status(200).json(data);
      }

      // (ခ) Admin Dashboard: အော်ဒါအားလုံး ဆွဲထုတ်ခြင်း (Admin PIN မဖြစ်မနေ လိုအပ်သည်)
      const SERVER_ADMIN_PIN = process.env.ADMIN_PIN || "1234";

      if (clientPin !== SERVER_ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized: လျှို့ဝှက် Admin PIN မှားယွင်းနေပါသည်' });
      }

      // PIN မှန်ကန်မှသာ အော်ဒါအားလုံးကို Firebase ဆီမှ ဆွဲထုတ်ခွင့်ပြုမည်
      const response = await fetch(`${FIREBASE_BASE_URL}/shop_orders.json`);
      const data = await response.json();

      let ordersArray = [];
      if (data) {
        ordersArray = Array.isArray(data) 
          ? data.filter(Boolean) 
          : Object.keys(data).map(k => ({ id: k, ...data[k] }));
      }
      return res.status(200).json(ordersArray);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}