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

      // ပုံလင့်ခ်ကို စစ်ဆေးထုတ်ယူသည့် function
      const getImg = (item) => {
        if (!item) return '';
        if (typeof item.image === 'string' && item.image.trim()) return item.image.trim();
        if (typeof item.imageUrl === 'string' && item.imageUrl.trim()) return item.imageUrl.trim();
        if (Array.isArray(item.images) && item.images.length > 0 && typeof item.images[0] === 'string') return item.images[0].trim();
        return '';
      };

      // ၁။ ကုန်ပစ္စည်း တစ်ခုချင်း Link ဖြစ်ပါက
      if (product) {
        const item = productsList.find(p => String(p.id) === String(product) || String(p.sku) === String(product));
        if (item) {
          title = item.name || item.title || title;
          if (item.price) {
            description = `ဈေးနှုန်း - ${Number(item.price).toLocaleString()} MMK | ၁၀၀% လျှို့ဝှက်လုံခြုံစွာ ပို့ဆောင်ပေးပါသည်`;
          }
          const pImg = getImg(item);
          if (pImg) image = pImg;
        }
      } 
      // ၂။ Category Link ဖြစ်ပါက
      else if (cat) {
        const categoryMap = {
          'vibrator': 'တုန်စက်',
          'dildo': 'အတု',
          'lube': 'ချောဆီ',
          'lubricant': 'ချောဆီ',
          'masturbator': 'ဂျာထု',
          'pump': 'ကြီးရှည်ကျင့်ပြောင်း',
          'condom': 'စီလီကွန်အစွပ်',
          'sleeve': 'စီလီကွန်အစွပ်',
          'bdsm': 'BDSM ပစ္စည်းများ',
          'anal': 'နောက်ပေါက်သုံးပစ္စည်း',
          'delay': 'ကြာဆေး',
          'enlarge': 'ကြီးဆေး',
          'female': 'အမျိုးသမီးသုံးဖီးဆေး',
          'ring': 'သုတ်ထိန်းကွင်း'
        };

        const slugKey = String(cat).toLowerCase().trim();
        const myanmarCatName = categoryMap[slugKey] || slugKey;

        title = `${myanmarCatName} - Tolimoli Myanmar`;
        description = `${myanmarCatName} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;

        // Debug တွင် အောင်မြင်ခဲ့သော match logic အတိုင်း ပစ္စည်းကို ရှာဖွေခြင်း
        const catItem = productsList.find(p => {
          if (!p) return false;
          const str = JSON.stringify(p);
          return str.includes(myanmarCatName) || 
                 str.includes('ကျင့်ပြောင်း') || 
                 str.toLowerCase().includes(slugKey);
        });

        if (catItem) {
          const foundImg = getImg(catItem);
          if (foundImg) image = foundImg;
        }
      }
    }
  } catch (err) {
    console.error("RTDB Fetch Error:", err);
  }

  // Telegram နှင့် အခြား Platform များ Meta tag အားလုံးကို တိုက်ရိုက်ဖတ်နိုင်စေရန် ပေးပို့ခြင်း
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!DOCTYPE html>
<html lang="my" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  
  <!-- Open Graph -->
  <meta property="og:site_name" content="Tolimoli Myanmar">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:url" content="${targetUrl}">

  <!-- Telegram Large Card -->
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