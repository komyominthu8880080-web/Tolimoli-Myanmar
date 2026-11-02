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

      // ၁။ ကုန်ပစ္စည်း Link ဖြစ်ပါက
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
      }
      // ၂။ Category Link ဖြစ်ပါက
      else if (cat) {
        const cleanCat = cat.replace(/[-_]/g, ' ').toUpperCase();
        title = `${cleanCat} ပစ္စည်းများ - Tolimoli Myanmar`;
        description = `${cleanCat} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;

        const catItem = productsList.find(p => 
          p.category && String(p.category).toLowerCase().includes(cat.toLowerCase())
        );
        if (catItem) {
          if (catItem.image) image = catItem.image;
          else if (catItem.imageUrl) image = catItem.imageUrl;
          else if (Array.isArray(catItem.images) && catItem.images.length > 0) image = catItem.images[0];
        }
      }
    }
  } catch (err) {
    console.error("RTDB Fetch Error:", err);
  }

  // Telegram, Viber, Facebook အားလုံး ဖတ်ရှုနိုင်ရန် Open Graph Card သာ အမြဲပေးပို့မည်
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!DOCTYPE html>
<html lang="my" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Tolimoli Myanmar">
  <meta property="og:url" content="${targetUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
  
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
</head>
<body>
  <script>window.location.replace("${targetUrl}");</script>
</body>
</html>`);
}