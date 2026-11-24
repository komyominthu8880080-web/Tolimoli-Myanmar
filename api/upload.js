// api/upload.js
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

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { image } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // ပုံအရွယ်အစား အလွန်ကြီးမားမှု ကာကွယ်ခြင်း (~6MB limit)
    if (image.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image size is too large (Max 6MB)' });
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ImgBB API Key is not configured' });

    // MIME type အားလုံး (jpeg, png, webp, svg+xml စသည်) ကို မှန်ကန်စွာ ဖြတ်ထုတ်ခြင်း
    const cleanBase64 = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    const formData = new URLSearchParams();
    formData.append('image', cleanBase64);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (data.success) {
      return res.status(200).json({ url: data.data.url });
    } else {
      return res.status(500).json({ error: data.error?.message || 'ImgBB upload failed' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
