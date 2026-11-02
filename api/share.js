export default async function handler(req, res) {
  const { product, cat } = req.query;

  // ၁။ လူအစစ် Browser က ဝင်လာပါက မူလ စာမျက်နှာအတိုင်း တိုက်ရိုက် ပေးပြပါမည်
  const userAgent = req.headers["user-agent"] || "";
  const isSocialBot = /bot|telegram|viber|facebookexternalhit|whatsapp|twitterbot|pinterest/i.test(userAgent);

  // မူလ URL ပြန်လည်တည်ဆောက်ခြင်း
  const targetUrl = product 
    ? `https://www.tolimolimyanmar.com/index.html?product=${product}`
    : (cat ? `https://www.tolimolimyanmar.com/index.html?cat=${cat}` : `https://www.tolimolimyanmar.com/index.html`);

  // လူအစစ်ဖြစ်ပါက တန်းပြီး redirect ပို့ပါမည်
  if (!isSocialBot) {
    return res.redirect(302, targetUrl);
  }

  // ၂။ Social Media Bot များ ဝင်ရောက်လာပါက Preview ပုံနှင့် စာသား ပြင်ဆင်ခြင်း
  let title = "Tolimoli Myanmar – Premium Adult Toys Shop";
  let description = "၁၀၀% လျှို့ဝှက်လုံခြုံစွာဖြင့် မှာယူရရှိနိုင်ပါသည်။";
  let image = "https://www.tolimolimyanmar.com/logo.png";

  try {
    // ကုန်ပစ္စည်း Link ဖြစ်ပါက Firebase Firestore REST API မှ ပုံကို ဆွဲထုတ်ခြင်း
    if (product) {
      // "tolimoli-myanmar" နေရာတွင် သင်၏ Firebase Project ID အမှန်ကို ထည့်ပါ
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/tolimoli-myanmar/databases/(default)/documents/products/${product}`;
      const response = await fetch(firestoreUrl);

      if (response.ok) {
        const doc = await response.json();
        const f = doc.fields || {};

        title = f.name?.stringValue || f.title?.stringValue || title;
        const price = f.price?.integerValue || f.price?.stringValue;
        if (price) {
          description = `ဈေးနှုန်း - ${Number(price).toLocaleString()} MMK`;
        }

        // ပုံ ဆွဲယူခြင်း (ပုံတစ်ပုံချင်း သို့မဟုတ် Image Array ဖြစ်ပါက ပထမဆုံးပုံကို ယူခြင်း)
        if (f.image?.stringValue) image = f.image.stringValue;
        else if (f.imageUrl?.stringValue) image = f.imageUrl.stringValue;
        else if (f.images?.arrayValue?.values?.length > 0) {
          image = f.images.arrayValue.values[0].stringValue;
        }
      }
    } 
    // Category Link ဖြစ်ပါက
    else if (cat) {
      const cleanCat = cat.replace(/[-_]/g, ' ').toUpperCase();
      title = `${cleanCat} - Tolimoli Myanmar`;
      description = `${cleanCat} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }

  // ၃။ Telegram / Viber အတွက် Open Graph HTML ကို ထုတ်ပေးခြင်း
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta property="og:type" content="website">
  <meta property="og:url" content="${targetUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${image}">
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
</head>
<body>
  <script>window.location.replace("${targetUrl}");</script>
</body>
</html>`);
}