// api/orders.js
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

function maskPhone(phone) {
  const s = String(phone || '').trim();
  if (s.length <= 6) return '***';
  return s.slice(0, 4) + '****' + s.slice(-3);
}

export default async function handler(req, res) {
  applyCors(req, res, 'GET, POST, PUT, OPTIONS', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const FIREBASE_BASE_URL = process.env.FIREBASE_DB_URL || 'https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app';

  // ၁။ ဝယ်သူ အော်ဒါအသစ် တင်ခြင်း (POST - Server-side Price Verification + No Overwrite)
  if (req.method === 'POST') {
    try {
      const orderData = req.body;
      if (!orderData || !orderData.id || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return res.status(400).json({ error: 'Order data, ID, or items missing' });
      }

      const orderUrl = withFbAuth(`${FIREBASE_BASE_URL}/shop_orders/${encodeURIComponent(orderData.id)}.json`);
      const existingRes = await fetch(orderUrl);
      const existingOrder = existingRes.ok ? await existingRes.json() : null;
      if (existingOrder) {
        return res.status(409).json({ error: 'Order ID already exists' });
      }

      // Firebase Products စာရင်းမှ ဈေးနှုန်းအစစ်အမှန် ဆွဲယူစစ်ဆေးခြင်း
      const prodRes = await fetch(withFbAuth(`${FIREBASE_BASE_URL}/shop_products.json`));
      const rawProducts = prodRes.ok ? await prodRes.json() : null;
      const productList = rawProducts
        ? (Array.isArray(rawProducts) ? rawProducts.filter(Boolean) : Object.values(rawProducts))
        : [];

      let verifiedSubTotal = 0;
      const verifiedItems = [];

      for (const item of orderData.items) {
        const qty = Math.max(1, Math.min(999, Math.floor(Number(item.qty) || 1)));
        const matched = productList.find(p => p && String(p.id) === String(item.id));

        if (matched && Number(matched.price) > 0) {
          const realPrice = Number(matched.price);
          verifiedSubTotal += realPrice * qty;
          verifiedItems.push({
            ...item,
            name: matched.name || item.name,
            price: realPrice,
            qty
          });
        } else {
          // Product DB တွင် မတွေ့ပါက Client ပို့လာသော ဈေးနှုန်းကို အနည်းဆုံး 100 Ks နှင့်အထက်သာ လက်ခံမည်
          const fallbackPrice = Math.max(100, Number(item.price) || 0);
          verifiedSubTotal += fallbackPrice * qty;
          verifiedItems.push({ ...item, price: fallbackPrice, qty });
        }
      }

      const safeDiscount = Math.max(0, Math.min(verifiedSubTotal, Number(orderData.discount || orderData.discountAmount) || 0));
      const safeDeliveryFee = Math.max(0, Number(orderData.deliveryFee ?? orderData.deliFee) || 0);
      const verifiedTotal = Math.max(0, verifiedSubTotal - safeDiscount) + safeDeliveryFee;

      const safeOrder = {
        ...orderData,
        items: verifiedItems,
        subTotal: verifiedSubTotal,
        subtotal: verifiedSubTotal,
        discount: safeDiscount,
        discountAmount: safeDiscount,
        deliveryFee: safeDeliveryFee,
        deliFee: safeDeliveryFee,
        total: verifiedTotal,
        status: 'အော်ဒါလက်ခံရရှိ (Pending)',
        serverVerifiedAt: Date.now()
      };

      const response = await fetch(orderUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeOrder)
      });

      if (!response.ok) throw new Error('Firebase Order Write Failed');
      return res.status(200).json({ success: true, orderId: safeOrder.id, total: verifiedTotal });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ၂။ Admin မှ ရှိပြီးသား အော်ဒါ ပြင်ဆင်ခြင်း (PUT - Admin PIN မဖြစ်မနေ လိုအပ်သည်)
  if (req.method === 'PUT') {
    try {
      const SERVER_ADMIN_PIN = process.env.ADMIN_SECRET_PIN || process.env.ADMIN_PIN;
      if (!SERVER_ADMIN_PIN) {
        return res.status(500).json({ error: 'Server Admin PIN is not configured' });
      }

      const clientPin = req.headers['x-admin-pin'];
      if (!clientPin || String(clientPin).trim() !== String(SERVER_ADMIN_PIN).trim()) {
        return res.status(401).json({ error: 'Unauthorized: Admin PIN မှားယွင်းနေပါသည်' });
      }

      const orderData = req.body;
      if (!orderData || !orderData.id) {
        return res.status(400).json({ error: 'Order data or ID missing' });
      }

      const orderUrl = withFbAuth(`${FIREBASE_BASE_URL}/shop_orders/${encodeURIComponent(orderData.id)}.json`);
      const response = await fetch(orderUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Firebase Order Update Failed');
      return res.status(200).json({ success: true, orderId: orderData.id });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ၃။ အော်ဒါများ ပြန်လည်ဆွဲယူခြင်း (GET)
  if (req.method === 'GET') {
    try {
      const { id } = req.query || {};
      const SERVER_ADMIN_PIN = process.env.ADMIN_SECRET_PIN || process.env.ADMIN_PIN;
      const clientPin = req.headers['x-admin-pin'];
      const isAdmin = Boolean(SERVER_ADMIN_PIN && clientPin && String(clientPin).trim() === String(SERVER_ADMIN_PIN).trim());

      // (က) Customer Tracking: အော်ဒါ ID သီးသန့်ဖြင့် စစ်ဆေးခြင်း
      if (id) {
        const directRes = await fetch(withFbAuth(`${FIREBASE_BASE_URL}/shop_orders/${encodeURIComponent(id)}.json`));
        let data = directRes.ok ? await directRes.json() : null;

        if (!data) {
          const allRes = await fetch(withFbAuth(`${FIREBASE_BASE_URL}/shop_orders.json`));
          const allData = allRes.ok ? await allRes.json() : null;
          if (allData) {
            const list = Array.isArray(allData) ? allData : Object.values(allData);
            data = list.find(o => o && String(o.id).toLowerCase() === String(id).toLowerCase()) || null;
          }
        }

        // Admin မဟုတ်ပါက ဝယ်သူ၏ ကိုယ်ရေးအချက်အလက် (ဖုန်း/လိပ်စာ) ကို Mask လုပ်၍ ပြန်ပို့ခြင်း
        if (data && !isAdmin) {
          data = {
            id: data.id,
            customer: data.customer,
            phone: maskPhone(data.phone),
            township: data.township || '',
            items: data.items || [],
            subTotal: data.subTotal,
            discount: data.discount,
            deliveryFee: data.deliveryFee,
            total: data.total,
            paymentMethod: data.paymentMethod,
            deliveryService: data.deliveryService,
            trackingCode: data.trackingCode || '',
            status: data.status,
            date: data.date
          };
        }
        return res.status(200).json(data);
      }

      // (ခ) Admin Dashboard: အော်ဒါအားလုံး ဆွဲထုတ်ခြင်း (Header x-admin-pin မဖြစ်မနေ လိုအပ်သည်)
      if (!SERVER_ADMIN_PIN) {
        return res.status(500).json({ error: 'Server Admin PIN is not configured' });
      }
      if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized: လျှို့ဝှက် Admin PIN မှားယွင်းနေပါသည်' });
      }

      const response = await fetch(withFbAuth(`${FIREBASE_BASE_URL}/shop_orders.json`));
      if (!response.ok) throw new Error('Failed to fetch all orders');
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