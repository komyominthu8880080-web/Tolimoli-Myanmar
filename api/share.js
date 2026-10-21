// api/share.js
module.exports = (req, res) => {
  const { cat } = req.query;
  const userAgent = (req.headers && req.headers['user-agent']) || '';

  // Social Media Scraper Bots များ စစ်ဆေးခြင်း
  const isBot = /facebookexternalhit|Facebot|TelegramBot|Twitterbot|Viber|WhatsApp|Slackbot|LinkedInBot/i.test(userAgent);

  // Category အလိုက် ပုံနှင့် စာသားများ
  const categoryData = {
    'vibrator': {
      title: 'တုန်စက် အမျိုးမျိုး — Tolimoli Myanmar',
      desc: 'အရည်အသွေးမြင့် တုန်စက်ပစ္စည်းများကို ၁၀၀% လျှို့ဝှက်လုံခြုံစွာ မှာယူရရှိနိုင်ပါသည်။',
      image: 'https://i.ibb.co/6cGH2k5F/18-20261010-180439-0017.png'
    },
    'တုန်စက်': {
      title: 'တုန်စက် အမျိုးမျိုး — Tolimoli Myanmar',
      desc: 'အရည်အသွေးမြင့် တုန်စက်ပစ္စည်းများကို ၁၀၀% လျှို့ဝှက်လုံခြုံစွာ မှာယူရရှိနိုင်ပါသည်။',
      image: 'https://i.ibb.co/6cGH2k5F/18-20261010-180439-0017.png'
    },
    'Lady Underwear': {
      title: 'အမျိုးသမီး အတွင်းခံများ — Tolimoli Myanmar',
      desc: 'ဆွဲဆောင်မှုရှိပြီး သက်တောင့်သက်သာရှိသော အမျိုးသမီးအတွင်းခံများ စုံလင်စွာ ရရှိနိုင်ပါပြီ။',
      image: 'https://www.tolimolimyanmar.com/logo.png'
    },
    'ချောဆီ': {
      title: 'ချောဆီ နှင့် ဂျယ်လ် အမျိုးမျိုး — Tolimoli Myanmar',
      desc: 'စိတ်ချရသော အမှတ်တံဆိပ် ချောဆီနှင့် ဂျယ်လ်များကို ဝယ်ယူရရှိနိုင်ပါသည်။',
      image: 'https://www.tolimolimyanmar.com/logo.png'
    }
  };

  const currentCat = categoryData[cat] || {
    title: cat ? `${cat} — Tolimoli Myanmar` : 'Tolimoli Myanmar — Adult Toys Shop',
    desc: '၁၀၀% လျှို့ဝှက်လုံခြုံသော ပို့ဆောင်မှု • ပစ္စည်းစုံလင်စွာ ဝယ်ယူရရှိနိုင်ပါသည်',
    image: 'https://www.tolimolimyanmar.com/logo.png'
  };

  const targetUrl = `https://www.tolimolimyanmar.com/?cat=${encodeURIComponent(cat || '')}`;

  // ဝယ်သူ လူသား နှိပ်ပါက မူလ ဝဘ်ဆိုက် စာမျက်နှာသို့ ခေါ်ဆောင်သွားခြင်း
  if (!isBot) {
    res.writeHead(302, { Location: targetUrl });
    return res.end();
  }

  // Bots များအတွက် Dynamic HTML ထုတ်ပေးခြင်း
  const html = `<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="UTF-8">
  <title>${currentCat.title}</title>
  <meta property="og:type" content="website">
  <meta property="og:url" content="${targetUrl}">
  <meta property="og:title" content="${currentCat.title}">
  <meta property="og:description" content="${currentCat.desc}">
  <meta property="og:image" content="${currentCat.image}">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${currentCat.title}">
  <meta name="twitter:description" content="${currentCat.desc}">
  <meta name="twitter:image" content="${currentCat.image}">
</head>
<body>
  <p>Redirecting to <a href="${targetUrl}">${currentCat.title}</a>...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};