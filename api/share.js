// api/share.js
export default async function handler(req, res) {
  const { product, cat, article } = req.query || {};

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const canonicalUrl = `https://www.tolimolimyanmar.com${req.url}`;

  const targetUrl = article
    ? `https://www.tolimolimyanmar.com/?article=${encodeURIComponent(article)}`
    : (product
      ? `https://www.tolimolimyanmar.com/?product=${encodeURIComponent(product)}`
      : (cat ? `https://www.tolimolimyanmar.com/?cat=${encodeURIComponent(cat)}` : 'https://www.tolimolimyanmar.com/'));

  let title = "Tolimoli Myanmar Adult Toys Shop";
  let description = "၁၀၀% လျှို့ဝှက်လုံခြုံစွာဖြင့် မှာယူရရှိနိုင်ပါသည်။";
  let image = "https://www.tolimolimyanmar.com/logo.png";

  // index.html ရှိ CATEGORY_SLUGS နှင့် ၁၀၀% ကိုက်ညီသော Category Mapping
  const CATEGORY_MAP = {
    'promotion': { myName: 'Promotion', title: '🔥 Promotion အထူးလျှော့ဈေး - Tolimoli Myanmar', desc: 'အထူးလျှော့ဈေး ပရိုမိုးရှင်း ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'promo': { myName: 'Promotion', title: '🔥 Promotion အထူးလျှော့ဈေး - Tolimoli Myanmar', desc: 'အထူးလျှော့ဈေး ပရိုမိုးရှင်း ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'deals': { myName: 'Promotion', title: '🔥 Promotion အထူးလျှော့ဈေး - Tolimoli Myanmar', desc: 'အထူးလျှော့ဈေး ပရိုမိုးရှင်း ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'hot': { myName: 'Promotion', title: '🔥 Promotion အထူးလျှော့ဈေး - Tolimoli Myanmar', desc: 'အထူးလျှော့ဈေး ပရိုမိုးရှင်း ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'vibrator': { myName: 'တုန်စက်', title: 'တုန်စက် - Tolimoli Myanmar', desc: 'တုန်စက် အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'dildo': { myName: 'ကျားတု', title: 'ကျားတု - Tolimoli Myanmar', desc: 'ကျားတု အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'lube': { myName: 'ချောဆီ', title: 'ချောဆီ - Tolimoli Myanmar', desc: 'ချောဆီ အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'lubricant': { myName: 'ချောဆီ', title: 'ချောဆီ - Tolimoli Myanmar', desc: 'ချောဆီ အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'masturbator': { myName: 'မတု', title: 'မတု - Tolimoli Myanmar', desc: 'မတု အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'pump': { myName: 'ကြီးရှည်ကျင့်ပြောင်း', title: 'ကြီးရှည်ကျင့်ပြောင်း - Tolimoli Myanmar', desc: 'ကြီးရှည်ကျင့်ပြောင်း အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'condom': { myName: 'စီလီကွန်အစွပ်', title: 'စီလီကွန်အစွပ် - Tolimoli Myanmar', desc: 'စီလီကွန်အစွပ် အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'sleeve': { myName: 'စီလီကွန်အစွပ်', title: 'စီလီကွန်အစွပ် - Tolimoli Myanmar', desc: 'စီလီကွန်အစွပ် အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'bdsm': { myName: 'BDSM ပစ္စည်းများ', title: 'BDSM ပစ္စည်းများ - Tolimoli Myanmar', desc: 'BDSM အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'anal': { myName: 'နောက်ပေါက်သုံးပစ္စည်း', title: 'နောက်ပေါက်သုံးပစ္စည်း - Tolimoli Myanmar', desc: 'နောက်ပေါက်သုံးပစ္စည်း အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'delay': { myName: 'ကြာဆေး', title: 'ကြာဆေး - Tolimoli Myanmar', desc: 'ကြာဆေး အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'enlarge': { myName: 'ကြီးဆေး', title: 'ကြီးဆေး - Tolimoli Myanmar', desc: 'ကြီးဆေး အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'female': { myName: 'အမျိုးသမီးသုံးဖီးဆေး', title: 'အမျိုးသမီးသုံးဖီးဆေး - Tolimoli Myanmar', desc: 'အမျိုးသမီးသုံးဖီးဆေး အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' },
    'ring': { myName: 'သုတ်ထိန်းကွင်း', title: 'သုတ်ထိန်းကွင်း - Tolimoli Myanmar', desc: 'သုတ်ထိန်းကွင်း အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။' }
  };

  // ပစ္စည်းတစ်ခုမှ ပုံ URL အစစ်ကို ထုတ်ယူပေးမည့် Helper Function
  function extractProductImage(item) {
    if (!item) return '';
    if (typeof item.image === 'string' && item.image.startsWith('http')) return item.image.trim();
    if (typeof item.imageUrl === 'string' && item.imageUrl.startsWith('http')) return item.imageUrl.trim();
    if (Array.isArray(item.images)) {
      const validImg = item.images.find(img => typeof img === 'string' && img.startsWith('http'));
      if (validImg) return validImg.trim();
    }
    return '';
  }

  const FIREBASE_BASE = process.env.FIREBASE_DB_URL || "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app";
  const RTDB_URL = `${FIREBASE_BASE}/shop_products.json`;

  try {
    // ၀။ ဆောင်းပါး Link ဖြစ်ပါက
    if (article) {
      const artUrl = `${FIREBASE_BASE}/articles/${encodeURIComponent(article)}.json`;
      const response = await fetch(artUrl);
      if (response.ok) {
        const artData = await response.json();
        if (artData) {
          if (artData.title) title = artData.title;
          if (artData.summary) description = artData.summary;
          else if (artData.content) description = artData.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...';
          if (artData.coverImage && artData.coverImage.startsWith('http')) image = artData.coverImage;
        }
      }
    }
    // ၁။ ကုန်ပစ္စည်း တစ်ခုချင်း Link ဖြစ်ပါက
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
          const pImg = extractProductImage(item);
          if (pImg) image = pImg;
        }
      }
    }
    // ၂။ Category Link ဖြစ်ပါက
    else if (cat) {
      const rawCat = decodeURIComponent(String(cat)).trim();
      const slugKey = rawCat.toLowerCase();
      const mapped = CATEGORY_MAP[slugKey];
      const targetMyName = mapped ? mapped.myName : rawCat;

      if (mapped) {
        title = mapped.title;
        description = mapped.desc;
      } else {
        title = `${rawCat} - Tolimoli Myanmar`;
        description = `${rawCat} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;
      }

      // Database ထဲမှ သက်ဆိုင်ရာ Category ထဲက ပစ္စည်းတစ်ခုခု၏ ပုံကို တိုက်ရိုက်ရှာဖွေခြင်း
      const response = await fetch(RTDB_URL);
      if (response.ok) {
        const rawData = await response.json();
        let productsList = Array.isArray(rawData) ? rawData : Object.values(rawData || {});
        if (rawData && rawData.products) productsList = Object.values(rawData.products);

        const normTarget = targetMyName.replace(/\s+/g, '').toLowerCase();

        const matchedItem = productsList.find(p => {
          if (!p || p.isHidden) return false;
          const pCats = Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : []);
          const hasValidImg = extractProductImage(p) !== '';
          if (!hasValidImg) return false;

          if (normTarget === 'promotion') {
            return Number(p.originalPrice) > Number(p.price) || p.isPromo === true;
          }

          return pCats.some(c => {
            const normC = String(c).replace(/\s+/g, '').toLowerCase();
            return normC === normTarget || normC.includes(normTarget) || normTarget.includes(normC);
          });
        });

        if (matchedItem) {
          const catImg = extractProductImage(matchedItem);
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

  <meta property="og:site_name" content="Tolimoli Myanmar">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImg}">
  <meta property="og:image:secure_url" content="${safeImg}">
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