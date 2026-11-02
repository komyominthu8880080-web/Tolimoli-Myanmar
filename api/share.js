export default async function handler(req, res) {
  const { product, cat } = req.query;

  // Bot ဟုတ်မဟုတ် စစ်ဆေးခြင်း
  const userAgent = req.headers["user-agent"] || "";
  const isSocialBot = /bot|telegram|viber|facebookexternalhit|whatsapp|twitterbot|pinterest/i.test(userAgent);

  const targetUrl = product 
    ? `https://www.tolimolimyanmar.com/?product=${encodeURIComponent(product)}`
    : (cat ? `https://www.tolimolimyanmar.com/?cat=${encodeURIComponent(cat)}` : `https://www.tolimolimyanmar.com/`);

  // လူအစစ် Browser ကနေ နှိပ်ဝင်ပါက မူရင်း Page ဆီ တန်းပို့ပါမည်
  if (!isSocialBot) {
    return res.redirect(302, targetUrl);
  }

  let title = "Tolimoli Myanmar – Adult Toys Shop";
  let description = "၁၀၀% လျှို့ဝှက်လုံခြုံစွာဖြင့် မှာယူရရှိနိုင်ပါသည်။";
  let image = "https://www.tolimolimyanmar.com/logo.png";

  try {
    // ၁။ ပစ္စည်း တစ်ခုချင်းစီ ဖြစ်ပါက
    if (product) {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/tolimoli-myanmar/databases/(default)/documents/products/${product}`;
      const response = await fetch(firestoreUrl);

      if (response.ok) {
        const doc = await response.json();
        const f = doc.fields || {};

        title = f.name?.stringValue || f.title?.stringValue || title;
        const price = f.price?.integerValue || f.price?.stringValue;
        if (price) {
          description = `ဈေးနှုန်း - ${Number(price).toLocaleString()} MMK | ၁၀၀% လျှို့ဝှက်လုံခြုံစွာ ပို့ဆောင်ပေးပါသည်`;
        }

        // ပုံယူခြင်း
        if (f.image?.stringValue) image = f.image.stringValue;
        else if (f.imageUrl?.stringValue) image = f.imageUrl.stringValue;
        else if (f.images?.arrayValue?.values?.length > 0) {
          image = f.images.arrayValue.values[0].stringValue;
        }
      }
    } 
    // ၂။ Category (ဥပမာ vibrator) ဖြစ်ပါက အဆိုပါ Category ထဲက ပစ္စည်းတစ်ခုရဲ့ ပုံကို ဆွဲထုတ်ခြင်း
    else if (cat) {
      const cleanCat = cat.replace(/[-_]/g, ' ').toUpperCase();
      title = `${cleanCat} ပစ္စည်းများ - Tolimoli Myanmar`;
      description = `${cleanCat} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;

      // Firestore REST Structured Query သုံးပြီး category တူတဲ့ ပစ္စည်းတစ်ခုရဲ့ ပုံကို ဆွဲထုတ်ခြင်း
      const queryUrl = `https://firestore.googleapis.com/v1/projects/tolimoli-myanmar/databases/(default)/documents:runQuery`;
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: "products" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "category" },
              op: "EQUAL",
              value: { stringValue: cat }
            }
          },
          limit: 1
        }
      };

      const catRes = await fetch(queryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryBody)
      });

      if (catRes.ok) {
        const results = await catRes.json();
        if (results && results[0] && results[0].document) {
          const cf = results[0].document.fields || {};
          if (cf.image?.stringValue) image = cf.image.stringValue;
          else if (cf.imageUrl?.stringValue) image = cf.imageUrl.stringValue;
          else if (cf.images?.arrayValue?.values?.length > 0) {
            image = cf.images.arrayValue.values[0].stringValue;
          }
        }
      }
    }
  } catch (err) {
    console.error("Open Graph Fetch Error:", err);
  }

  // Viber / Telegram / Facebook ဖတ်ရန် HTML ပြန်ပေးခြင်း
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