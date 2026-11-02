export default async function handler(req, res) {
  const { product, cat } = req.query;

  const targetUrl = product 
    ? `https://www.tolimolimyanmar.com/?product=${encodeURIComponent(product)}`
    : (cat ? `https://www.tolimolimyanmar.com/?cat=${encodeURIComponent(cat)}` : `https://www.tolimolimyanmar.com/`);

  let title = "Tolimoli Myanmar – Adult Toys Shop";
  let description = "၁၀၀% လျှို့ဝှက်လုံခြုံစွာဖြင့် မှာယူရရှိနိုင်ပါသည်။";
  let image = "https://www.tolimolimyanmar.com/logo.png";

  try {
    if (product) {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/tolimoli-myanmar/databases/(default)/documents/products/${product}`;
      const response = await fetch(firestoreUrl);
      const resStatus = response.status;
      const resText = await response.text();

      if (response.ok) {
        const doc = JSON.parse(resText);
        const f = doc.fields || {};

        title = f.name?.stringValue || f.title?.stringValue || title;
        const price = f.price?.integerValue || f.price?.stringValue;
        if (price) {
          description = `ဈေးနှုန်း - ${Number(price).toLocaleString()} MMK | ၁၀၀% လျှို့ဝှက်လုံခြုံစွာ ပို့ဆောင်ပေးပါသည်`;
        }

        if (f.image?.stringValue) image = f.image.stringValue;
        else if (f.imageUrl?.stringValue) image = f.imageUrl.stringValue;
        else if (f.images?.arrayValue?.values?.length > 0) {
          image = f.images.arrayValue.values[0].stringValue;
        }
      } else {
        title = `Firebase Error: Status ${resStatus}`;
        description = resText;
      }
    } else if (cat) {
      const cleanCat = cat.replace(/[-_]/g, ' ').toUpperCase();
      title = `${cleanCat} ပစ္စည်းများ - Tolimoli Myanmar`;
      description = `${cleanCat} အမျိုးအစား ပစ္စည်းများကို စုံလင်စွာ ကြည့်ရှုဝယ်ယူနိုင်ပါသည်။`;
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }

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