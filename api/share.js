export default async function handler(req, res) {
  const { product, cat } = req.query;

  const targetUrl = product 
    ? `https://www.tolimolimyanmar.com/?product=${encodeURIComponent(product)}`
    : (cat ? `https://www.tolimolimyanmar.com/?cat=${encodeURIComponent(cat)}` : `https://www.tolimolimyanmar.com/`);

  let title = "Tolimoli Myanmar – Adult Toys Shop";
  let description = "၁၀၀% လျှို့ဝှက်လုံခြုံစွာဖြင့် မှာယူရရှိနိုင်ပါသည်။";
  let image = "https://www.tolimolimyanmar.com/logo.png";

  const RTDB_URL = "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app/shop_products.json";

  try {
    const response = await fetch(RTDB_URL);
    if (response.ok) {
      const rawData = await response.json();
      let productsList = Array.isArray(rawData) ? rawData : Object.values(rawData || {});
      if (rawData && rawData.products) productsList = Object.values(rawData.products);

      // Telegram Crawler က ပိတ်ပင်မှုမရှိဘဲ ဖတ်နိုင်ရန် Image URL Proxy လုပ်ပေးခြင်း
      const getSafeImg = (item) => {
        if (!item) return '';
        let url = '';
        if (typeof item.image === 'string' && item.image.trim()) url = item.image.trim();
        else if (typeof item.imageUrl === 'string' && item.imageUrl.trim()) url = item.imageUrl.trim();
        else if (Array.isArray(item.images) && item.images.length > 0 && typeof item.images[0] === 'string') url = item.images[0].trim();
        
        if (url && url.includes('i.ibb.co')) {
          return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
        }
        return url;
      };

      // ၁။ ပစ္စည်း တစ်ခုချင်း Link ဖြစ်ပါက
      if (product) {
        const item = productsList.find(p => String(p.id) === String(product) || String(p.sku) === String(product));
        if (item) {
          title = item.name || item.title || title;
          if (item.price) {
            description = `ဈေးနှုန်း - ${Number(item.price).toLocaleString()} MMK | ၁၀၀% လျှို့ဝှက်လုံခြုံစွာ ပို့ဆောင်ပေးပါသည်`;
          }
          const pImg = getSafeImg(item);
          if (pImg) image = pImg;
        }
      } 
      // ၂။ Category Link ဖြစ်ပါက
      else if (cat) {
        const rawSlug = decodeURIComponent(String(cat)).trim().toLowerCase();

        // အမျိုးအစား အခေါ်အဝေါ် mapping ဇယား
        const categoryMap = {
          'vibrator': { title: 'တုန်စက်', keys: ['တုန်', 'vibrat'] },
          'dildo': { title: 'အတု', keys: ['အတု', 'ကျားတု', 'dildo'] },
          'lube': { title: 'ချောဆီ', keys: ['ချောဆီ', 'ဂျယ်', 'lube', 'gel', 'oil'] },
          'lubricant': { title: 'ချောဆီ', keys: ['ချောဆီ', 'ဂျယ်', 'lube', 'lubricant'] },
          'masturbator': { title: 'မတု / ဂျာထု', keys: ['မတု', 'ဂျာထု', 'masturbat', 'cup'] },
          'pump': { title: 'ကြီးရှည်ကျင့်ပြောင်း', keys: ['ကျင့်ပြောင်း', 'ကြီးရှည်', 'pump'] },
          'condom': { title: 'စီလီကွန်အစွပ်', keys: ['အစွပ်', 'စီလီကွန်', 'ကွန်ဒုံး', 'condom', 'sleeve'] },
          'sleeve': { title: 'စီလီကွန်အစွပ်', keys: ['အစွပ်', 'စီလီကွန်', 'sleeve'] },
          'bdsm': { title: 'BDSM ပစ္စည်းများ', keys: ['bdsm', 'bondage', 'ကြိုး'] },
          'anal': { title: 'နောက်ပေါက်သုံးပစ္စည်း', keys: ['နောက်ပေါက်', 'anal', 'plug'] },
          'delay': { title: 'ကြာဆေး', keys: ['ကြာဆေး', 'delay', 'spray'] },
          'enlarge': { title: 'ကြီးဆေး', keys: ['ကြီးဆေး', 'enlarge', 'cream'] },
          'female': { title: 'အမျိုးသမီးသုံးဖီးဆေး', keys: ['ဖီးဆေး', 'female'] },
          'ring': { title: 'သုတ်ထိန်းကွင်း', keys: ['သုတ်ထိန်း', 'ring'] }
        };

        const config = categoryMap[rawSlug] || { title: rawSlug, keys: [rawSlug] };
        title = `${config.title} - Tolimoli Myanmar`;
        description = `${config.title} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;

        // ပစ္စည်းများထဲမှ သက်ဆိုင်ရာ အမျိုးအစားနှင့် ကိုက်ညီသော ပစ္စည်းကို ရှာဖွေခြင်း
        let matchedItem = productsList.find(p => {
          if (!p) return false;
          const targetStr = `${p.category || ''} ${(Array.isArray(p.categories) ? p.categories.join(' ') : '')} ${p.name || ''}`.toLowerCase();
          return config.keys.some(k => targetStr.includes(k.toLowerCase()));
        });

        // တွေ့ရှိပါက ထိုပစ္စည်းပုံကို ယူမည်
        if (matchedItem) {
          const foundImg = getSafeImg(matchedItem);
          if (foundImg) image = foundImg;
        } else {
          // လုံးဝမတွေ့ပါက ပထမဆုံးရရှိနိုင်သော ပစ္စည်းတစ်ခု၏ ပုံကို fallback အနေဖြင့် ယူပေးမည်
          const fallbackItem = productsList.find(p => getSafeImg(p));
          if (fallbackItem) image = getSafeImg(fallbackItem);
        }
      }
    }
  } catch (err) {
    console.error("RTDB Fetch Error:", err);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!DOCTYPE html>
<html lang="my" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  
  <meta property="og:site_name" content="Tolimoli Myanmar">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:url" content="${targetUrl}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">

  <style>
    body { font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh; text-align: center; padding: 20px; background: #0f172a; color: white; }
    .card { background: #1e293b; padding: 24px; border-radius: 12px; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
    img { width: 100%; border-radius: 8px; margin-bottom: 16px; object-fit: cover; max-height: 280px; }
    h2 { font-size: 1.1rem; margin-bottom: 8px; }
    p { color: #f59e0b; font-weight: bold; margin-bottom: 20px; }
    a.btn { background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <img src="${image}" alt="${title}">
    <h2>${title}</h2>
    <p>${description}</p>
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