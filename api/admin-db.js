// api/admin-db.js
const ALLOWED_ORIGINS = [
  'https://www.tolimolimyanmar.com',
  'https://tolimolimyanmar.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

const ALLOWED_ROOT_PATHS = [
  'shop_stock_config', 'shop_min_order_presets', 'shop_products', 'products',
  'shop_vip_config', 'shop_categories', 'shop_delivery_config', 'shop_delivery_stations',
  'shop_discounts', 'foc_campaign_settings', 'articles', 'lucky_draws',
  'chat_quick_replies', 'chat_qr_accounts', 'shop_coupon_categories',
  'shop_community_threads', 'shop_bot_faq_chips', 'shop_bot_keyword_rules',
  'order_updates', 'loyalty_settings', 'customer_points_adjustments',
  'combo_deals', 'shop_promo_status', 'shop_station_types',
  'shop_discount_reason_presets', 'shop_auto_approve_comm', 'shop_news',
  'support_chats', 'shop_settings', 'delivery_rates'
];

function applyCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.tolimolimyanmar.com');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
}

function withFbAuth(url) {
  const secret = process.env.FIREBASE_DB_SECRET;
  if (!secret) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}auth=${encodeURIComponent(secret)}`;
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  const SERVER_ADMIN_PIN = process.env.ADMIN_SECRET_PIN || process.env.ADMIN_PIN;
  if (!SERVER_ADMIN_PIN) {
    return res.status(500).json({ error: 'Server Admin PIN is not configured' });
  }

  const clientPin = req.headers['x-admin-pin'];
  if (!clientPin || String(clientPin).trim() !== String(SERVER_ADMIN_PIN).trim()) {
    return res.status(401).json({ error: 'Unauthorized: Admin PIN မှားယွင်းနေပါသည်' });
  }

  const FIREBASE_BASE = process.env.FIREBASE_DB_URL || 'https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app';

  if (req.method === 'GET') {
    const rawPath = String(req.query?.path || '').replace(/^\/+|\/+$/g, '');
    const rootNode = rawPath.split('/')[0];
    if (!ALLOWED_ROOT_PATHS.includes(rootNode)) {
      return res.status(403).json({ error: 'Path not allowed' });
    }
    try {
      const fbRes = await fetch(withFbAuth(`${FIREBASE_BASE}/${rawPath}.json`));
      const data = await fbRes.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { path, op, value } = req.body || {};
      const cleanPath = String(path || '').replace(/^\/+|\/+$/g, '');
      const rootNode = cleanPath.split('/')[0];

      if (!cleanPath || !ALLOWED_ROOT_PATHS.includes(rootNode)) {
        return res.status(403).json({ error: `Path "${cleanPath}" is not allowed` });
      }

      const methodMap = { set: 'PUT', update: 'PATCH', push: 'POST', remove: 'DELETE' };
      const httpMethod = methodMap[op];
      if (!httpMethod) {
        return res.status(400).json({ error: 'Invalid operation' });
      }

      const fetchOpts = {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' }
      };
      if (httpMethod !== 'DELETE') {
        fetchOpts.body = JSON.stringify(value === undefined ? null : value);
      }

      const fbRes = await fetch(withFbAuth(`${FIREBASE_BASE}/${cleanPath}.json`), fetchOpts);
      if (!fbRes.ok) {
        const errTxt = await fbRes.text();
        throw new Error(errTxt || 'Firebase Admin Write Failed');
      }
      const data = await fbRes.json();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}