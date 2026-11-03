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

      // ၁။ ကုန်ပစ္စည်း တစ်ခုချင်း Link ဖြစ်ပါက
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

        // အမျိုးအစား သတ်မှတ်ချက်များ (ခေါင်းစဉ် နှင့် သီးသန့် ရှာဖွေရမည့် စာလုံးများ)
        const categoryMap = {
          'lube': { title: 'ချောဆီ', include: ['ချောဆီ', 'lube', 'lubricant'], exclude: ['အတု', 'dildo'] },
          'lubricant': { title: 'ချောဆီ', include: ['ချောဆီ', 'lube', 'lubricant'], exclude: ['အတု', 'dildo'] },
          'dildo': { title: 'အတု', include: ['အတု', 'ကျားတု', 'dildo'], exclude: [] },
          'vibrator': { title: 'တုန်စက်', include: ['တုန်စက်', 'တုန်ခါ', 'vibrat'], exclude: [] },
          'masturbator': { title: 'မတု / ဂျာထု', include: ['မတု', 'ဂျာထု', 'masturbat', 'cup'], exclude: [] },
          'pump': { title: 'ကြီးရှည်ကျင့်ပြောင်း', include: ['ကျင့်ပြောင်း', 'ကြီးရှည်', 'pump'], exclude: [] },
          'condom': { title: 'စီလီကွန်အစွပ်', include: ['အစွပ်', 'စီလီကွန်', 'ကွန်ဒုံး', 'condom', 'sleeve'], exclude: [] },
          'sleeve': { title: 'စီလီကွန်အစွပ်', include: ['အစွပ်', 'စီလီကွန်', 'sleeve'], exclude: [] },
          'bdsm': { title: 'BDSM ပစ္စည်းများ', include: ['bdsm', 'bondage', 'ကြိုး'], exclude: [] },
          'anal': { title: 'နောက်ပေါက်သုံးပစ္စည်း', include: ['နောက်ပေါက်', 'anal', 'plug'], exclude: [] },
          'delay': { title: 'ကြာဆေး', include: ['ကြာဆေး', 'delay', 'spray'], exclude: [] },
          'enlarge': { title: 'ကြီးဆေး', include: ['ကြီးဆေး', 'enlarge', 'cream'], exclude: [] },
          'female': { title: 'အမျိုးသမီးသုံးဖီးဆေး', include: ['ဖီးဆေး', 'female'], exclude: [] },
          'ring': { title: 'သုတ်ထိန်းကွင်း', include: ['သုတ်ထိန်း', 'ring'], exclude: [] }
        };

        const config = categoryMap[rawSlug] || { title: rawSlug, include: [rawSlug], exclude: [] };
        title = `${config.title} - Tolimoli Myanmar`;
        description = `${config.title} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;

        // အဆင့် (က) - ပစ္စည်း၏ category / categories စာရင်းထဲတွင် တိကျစွာ ကိုက်ညီမှုကို အရင်ရှာမည်
        let matchedItem = productsList.find(p => {
          if (!p || !getSafeImg(p)) return false;
          const pCat = `${p.category || ''} ${(Array.isArray(p.categories) ? p.categories.join(' ') : '')}`.toLowerCase();
          
          const hasExclude = config.exclude.some(ex => pCat.includes(ex.toLowerCase()));
          if (hasExclude) return false;

          return config.include.some(inc => pCat.includes(inc.toLowerCase()));
        });

        // အဆင့် (ခ) - category ထဲ မတွေ့ပါက ပစ္စည်းအမည် (name) ထဲတွင် ရှာမည် (မဆိုင်သော ပစ္စည်းကို exclude လုပ်ထားမည်)
        if (!matchedItem) {
          matchedItem = productsList.find(p => {
            if (!p || !getSafeImg(p)) return false;
            const pName = String(p.name || '').toLowerCase();

            const hasExclude = config.exclude.some(ex => pName.includes(ex.toLowerCase()));
            if (hasExclude) return false;

            return config.include.some(inc => pName.includes(inc.toLowerCase()));
          });
        }

        if (matchedItem) {
          const foundImg = getSafeImg(matchedItem);
          if (foundImg) image = foundImg;
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