export default async function handler(req, res) {
  const { product, cat } = req.query;

  // Bot ဟုတ်မဟုတ် စစ်ဆေးခြင်း
  const userAgent = req.headers["user-agent"] || "";
  const isSocialBot = /bot|telegram|viber|facebookexternalhit|whatsapp|twitterbot|pinterest/i.test(userAgent);

  const targetUrl = product 
    ? `https://www.tolimolimyanmar.com/?product=${encodeURIComponent(product)}`
    : (cat ? `https://www.tolimolimyanmar.com/?cat=${encodeURIComponent(cat)}` : `https://www.tolimolimyanmar.com/`);

  // လူအစစ် Browser ကနေ ဝင်ပါက Website စာမျက်နှာဆီ တိုက်ရိုက် redirect ပေးမည်
  if (!isSocialBot) {
    return res.redirect(302, targetUrl);
  }

  let title = "Tolimoli Myanmar – Adult Toys Shop";
  let description = "၁၀၀% လျှို့ဝှက်လုံခြုံစွာဖြင့် မှာယူရရှိနိုင်ပါသည်။";
  let image = "https://www.tolimolimyanmar.com/logo.png";

  const RTDB_URL = "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app/shop_products.json";

  try {
    const response = await fetch(RTDB_URL);
    if (response.ok) {
      const data = await response.json();
      // ဒေတာသည် Array သို့မဟုတ် Object ဖြစ်နိုင်၍ စာရင်းအဖြစ် ပြောင်းလဲခြင်း
      const productsList = Array.isArray(data) ? data.filter(Boolean) : Object.values(data || {});

      // ၁။ ကုန်ပစ္စည်း Link ဖြစ်ပါက (ဥပမာ ?product=p_1792580880548)
      if (product) {
        const item = productsList.find(p => String(p.id) === String(product) || String(p.sku) === String(product));
        if (item) {
          title = item.name || item.title || title;
          if (item.price) {
            description = `ဈေးနှုန်း - ${Number(item.price).toLocaleString()} MMK | ၁၀၀% လျှို့ဝှက်လုံခြုံစွာ ပို့ဆောင်ပေးပါသည်`;
          }
          // ပုံ ဆွဲထုတ်ခြင်း
          if (item.image) image = item.image;
          else if (item.imageUrl) image = item.imageUrl;
          else if (Array.isArray(item.images) && item.images.length > 0) image = item.images[0];
        }
      }
      // ၂။ Category Link ဖြစ်ပါက (ဥပမာ ?cat=vibrator သို့မဟုတ် ?cat=dildo)
      else if (cat) {
        const cleanCat = cat.replace(/[-_]/g, ' ').toUpperCase();
        title = `${cleanCat} ပစ္စည်းများ - Tolimoli Myanmar`;
        description = `${cleanCat} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;

        // သက်ဆိုင်ရာ Category ထဲက ပစ္စည်းတစ်ခုခု၏ ပုံကို ရွေးထုတ်ခြင်း
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

  // Telegram / Viber အတွက် Social Preview HTML ပြန်ပေးခြင်း
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta property="og:type" content="product">
  <meta property="og:url" content="${targetUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">
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