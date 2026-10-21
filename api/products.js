// api/products.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const FIREBASE_URL = 'https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app/shop_products.json';

  // ၁။ ပစ္စည်းစာရင်း ဆွဲယူခြင်း (GET)
  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
      const response = await fetch(FIREBASE_URL);
      if (!response.ok) throw new Error('Firebase Fetch Failed');
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ၂။ Stock လျှော့ချပြီး ပစ္စည်းစာရင်း အသစ်ကို သိမ်းဆည်းခြင်း (PUT)
  if (req.method === 'PUT') {
    try {
      const updatedProducts = req.body;
      const response = await fetch(FIREBASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProducts)
      });

      if (!response.ok) throw new Error('Failed to update products stock');
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}