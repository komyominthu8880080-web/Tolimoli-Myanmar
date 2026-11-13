// api/share.js
export default async function handler(req, res) {
  const { product, cat, article } = req.query || {};

  // HTML Meta Tag များ မပျက်စီးစေရန် အထူးသင်္ကေတများကို စစ်ထုတ်ပေးမည့် Helper Function
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Viber cache မလွဲစေရန် Canonical URL သတ်မှတ်ခြင်း
  const canonicalUrl = `https://www.tolimolimyanmar.com${req.url}`;

  // Browser တွင် ဖွင့်ပါက ဝဘ်ဆိုဒ် UI သို့ ဦးတည်မည့် target URL
  const targetUrl = article
    ? `https://www.tolimolimyanmar.com/?article=${encodeURIComponent(article)}`
    : (product
      ? `https://www.tolimolimyanmar.com/?product=${encodeURIComponent(product)}`
      : (cat ? `https://www.tolimolimyanmar.com/?cat=${encodeURIComponent(cat)}` : 'https://www.tolimolimyanmar.com/'));

  let title = "Tolimoli Myanmar Adult Toys Shop";
  let description = "၁၀၀% လျှို့ဝှက်လုံခြုံစွာဖြင့် ရှာယူရရှိနိုင်ပါသည်။";
  let image = "https://www.tolimolimyanmar.com/logo.png";

  // Category များအတွက် Fast-Lookup ဇယား (Viber bot ချက်ချင်း ဖတ်ရှုနိုင်ရန်)
  const CATEGORY_PREVIEWS = {
    'pump': {
      title: 'ကြီးရှည်ကျင့်ပြောင်း - Tolimoli Myanmar',
      desc: 'ကြီးရှည်ကျင့်ပြောင်း အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။',
      img: 'https://i.ibb.co/3kZc5kQ/pump.jpg'
    },
    'lube': {
      title: 'ချောဆီ - Tolimoli Myanmar',
      desc: 'ချောဆီ အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။',
      img: 'https://i.ibb.co/7jX4mZ1/lube.jpg'
    },
    'dildo': {
      title: 'ကျားတု - Tolimoli Myanmar',
      desc: 'ကျားတု အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။',
      img: 'https://i.ibb.co/mH1m6s4/dildo.jpg'
    },
    'vibrator': {
      title: 'တုန်စက် - Tolimoli Myanmar',
      desc: 'တုန်စက် အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။',
      img: 'https://i.ibb.co/VMy4k6s/vibrator.jpg'
    },
    'masturbator': {
      title: 'မတု - Tolimoli Myanmar',
      desc: 'မတု အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။',
      img: 'https://i.ibb.co/0Vp02Jt/masturbator.jpg'
    },
    'condom': {
      title: 'စီလီကွန်အစွပ် - Tolimoli Myanmar',
      desc: 'စီလီကွန်အစွပ် အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။',
      img: 'https://i.ibb.co/Bb7vfFH/condom.jpg'
    },
    'sleeve': {
      title: 'စီလီကွန်အစွပ် - Tolimoli Myanmar',
      desc: 'စီလီကွန်အစွပ် အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။',
      img: 'https://i.ibb.co/Bb7vfFH/condom.jpg'
    },
    'ring': {
      title: 'သုတ်ထိန်းကွင်း - Tolimoli Myanmar',
      desc: 'သုတ်ထိန်းကွင်း အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။',
      img: 'https://i.ibb.co/KzWd8Zq/ring.jpg'
    }
  };

  const FIREBASE_BASE = process.env.FIREBASE_DB_URL || "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app";
  const RTDB_URL = `${FIREBASE_BASE}/shop_products.json`;

  try {
    // ၀။ ဆောင်းပါး Link ဖြစ်ပါက (Database မှ ဆောင်းပါး Title, Summary, Cover ပုံ ဆွဲယူမည်)
    if (article) {
      const artUrl = `${FIREBASE_BASE}/articles/${encodeURIComponent(article)}.json`;
      const response = await fetch(artUrl);
      if (response.ok) {
        const artData = await response.json();
        if (artData) {
          if (artData.title) title = artData.title;
          if (artData.summary) {
            description = artData.summary;
          } else if (artData.content) {
            description = artData.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...';
          }
          if (artData.coverImage) image = artData.coverImage;
        }
      }
    }
    // ၁။ ကုန်ပစ္စည်း တစ်ခုချင်း Link ဖြစ်ပါက (Database မှ တိုက်ရိုက်ဆွဲယူမည်)
    else if (product) {
      const response = await fetch(RTDB_URL);
      if (response.ok) {
        const rawData = await response.json();
        let productsList = Array.isArray(rawData) ? rawData : Object.values(rawData || {});
        if (rawData && rawData.products) productsList = Object.values(rawData.products);

        const item = productsList.find(p => p && (String(p.id) === String(product) || String(p.sku) === String(product)));
        if (item) {
          title = item.name || item.title || title;
          if (item.price) {
            description = `ဈေးနှုန်း - ${Number(item.price).toLocaleString()} MMK | ၁၀၀% လျှို့ဝှက်လုံခြုံစွာ ပို့ဆောင်ပေးပါသည်။`;
          }
          let pImg = '';
          if (typeof item.image === 'string' && item.image.trim()) pImg = item.image.trim();
          else if (typeof item.imageUrl === 'string' && item.imageUrl.trim()) pImg = item.imageUrl.trim();
          else if (Array.isArray(item.images) && item.images.length > 0 && typeof item.images[0] === 'string') pImg = item.images[0].trim();

          if (pImg) image = pImg;
        }
      }
    }
    // ၂။ Category Link ဖြစ်ပါက (Instant Lookup ဖြင့် အရင်စစ်ဆေးပြီး လိုအပ်ပါက DB ဆွဲမည်)
    else if (cat) {
      const slugKey = decodeURIComponent(String(cat)).trim().toLowerCase();

      if (CATEGORY_PREVIEWS[slugKey]) {
        title = CATEGORY_PREVIEWS[slugKey].title;
        description = CATEGORY_PREVIEWS[slugKey].desc;
        if (CATEGORY_PREVIEWS[slugKey].img) image = CATEGORY_PREVIEWS[slugKey].img;
      }

      // Database ထဲမှ ပုံကို ချက်ချင်း ရှာဖွေရယူခြင်း
      const response = await fetch(RTDB_URL);
      if (response.ok) {
        const rawData = await response.json();
        let productsList = Array.isArray(rawData) ? rawData : Object.values(rawData || {});
        if (rawData && rawData.products) productsList = Object.values(rawData.products);

        const matchedItem = productsList.find(p => {
          if (!p) return false;
          const pCat = `${p.category || ''} ${(Array.isArray(p.categories) ? p.categories.join(' ') : '')} ${p.name || ''}`.toLowerCase();
          return pCat.includes(slugKey) || (slugKey === 'pump' && pCat.includes('ကျင့်ပြောင်း')) || (slugKey === 'lube' && pCat.includes('ချောဆီ'));
        });

        if (matchedItem) {
          let catImg = '';
          if (typeof matchedItem.image === 'string' && matchedItem.image.trim()) catImg = matchedItem.image.trim();
          else if (typeof matchedItem.imageUrl === 'string' && matchedItem.imageUrl.trim()) catImg = matchedItem.imageUrl.trim();
          else if (Array.isArray(matchedItem.images) && matchedItem.images.length > 0 && typeof matchedItem.images[0] === 'string') catImg = matchedItem.images[0].trim();

          if (catImg) image = catImg;
        }
      }
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImg = escapeHtml(image);
  const safeCanonical = escapeHtml(canonicalUrl);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  return res.status(200).send(`<!DOCTYPE html>
<html lang="my" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>

  <!-- Open Graph Meta Tags (Viber / Facebook) -->
  <meta property="og:site_name" content="Tolimoli Myanmar">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImg}">
  <meta property="og:image:secure_url" content="${safeImg}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">
  <meta property="og:url" content="${safeCanonical}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImg}">

  <style>
    body { font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0b0f19; color: #fff; }
    .card { background: #1e293b; padding: 24px; border-radius: 12px; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); text-align: center; }
    img { width: 100%; border-radius: 8px; margin-bottom: 16px; object-fit: cover; max-height: 280px; }
    h2 { font-size: 1.1rem; margin-bottom: 8px; }
    p { color: #f59e0b; font-weight: bold; margin-bottom: 20px; }
    a.btn { background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <img src="${safeImg}" alt="${safeTitle}">
    <h2>${safeTitle}</h2>
    <p>${safeDesc}</p>
    <a href="${targetUrl}" class="btn">ဝဘ်ဆိုဒ်သို့ သွားနေပါသည်...</a>
  </div>

  <script>
    setTimeout(function() {
      window.location.href = "${targetUrl}";
    }, 800);
  </script>
</body>
</html>`);
}