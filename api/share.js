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
      const data = await response.json();
      const productsList = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {});

      if (product) {
        const item = productsList.find(p => String(p.id) === String(product) || String(p.sku) === String(product));
        if (item) {
          title = item.name || item.title || title;
          if (item.price) {
            description = `ဈေးနှုန်း - ${Number(item.price).toLocaleString()} MMK | ၁၀၀% လျှို့ဝှက်လုံခြုံစွာ ပို့ဆောင်ပေးပါသည်`;
          }
          if (item.image) image = item.image;
          else if (item.imageUrl) image = item.imageUrl;
          else if (Array.isArray(item.images) && item.images.length > 0) image = item.images[0];
        }
      // ၂။ Category Link ဖြစ်ပါက
      } else if (cat) {
        const cleanCat = cat.replace(/[-_]/g, ' ').trim();
        title = `${cleanCat.toUpperCase()} ပစ္စည်းများ - Tolimoli Myanmar`;
        description = `${cleanCat.toUpperCase()} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;

        const searchCat = cleanCat.toLowerCase();

        // Database ထဲက ပစ္စည်းများထဲမှ category သို့မဟုတ် name ထဲတွင် စကားလုံး ပါဝင်သည့် ပစ္စည်းကို ရှာဖွေခြင်း
        const catItem = productsList.find(p => {
          if (!p) return false;
          const pCat = String(p.category || p.cat || p.categoryName || '').toLowerCase();
          const pName = String(p.name || p.title || '').toLowerCase();
          const pDesc = String(p.description || '').toLowerCase();
          return pCat.includes(searchCat) || pName.includes(searchCat) || pDesc.includes(searchCat);
        });

        if (catItem) {
          const foundImg = catItem.image || catItem.imageUrl || (Array.isArray(catItem.images) && catItem.images[0]);
          if (foundImg) image = foundImg;
        } else if (productsList.length > 0) {
          // အကယ်၍ အဆိုပါ category စာလုံးနှင့် ကွက်တိမတွေ့ပါက စာရင်းထဲမှ ပထမဆုံး ပစ္စည်းပုံကို ယူပြမည်
          const firstItem = productsList[0];
          const fallbackImg = firstItem.image || firstItem.imageUrl || (Array.isArray(firstItem.images) && firstItem.images[0]);
          if (fallbackImg) image = fallbackImg;
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
  
  <!-- Open Graph / Viber / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Tolimoli Myanmar">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:type" content="${image.endsWith('.png') ? 'image/png' : 'image/jpeg'}">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">
  <meta property="og:url" content="${targetUrl}">

  <!-- Twitter / Telegram Card -->
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
    // လူအစစ် Browser ကနေ ဖွင့်ပါက ၁ စက္ကန့်အတွင်း မူရင်း Website စာမျက်နှာဆီ အလိုအလျောက် ပို့ပေးမည်
    setTimeout(function() {
      window.location.href = "${targetUrl}";
    }, 800);
  </script>
</body>
</html>`);
}