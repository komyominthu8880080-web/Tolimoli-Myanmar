export default function middleware(request) {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  
  // Crawler / Bot စစ်ဆေးခြင်း
  const isBot = /telegrambot|twitterbot|facebookexternalhit|facebot|viber|whatsapp/i.test(userAgent);
  
  const url = new URL(request.url);
  const cat = url.searchParams.get('cat');
  const product = url.searchParams.get('product') || url.searchParams.get('item');

  // Bot လာရောက်ဖတ်ရှုပြီး ?cat= သို့မဟုတ် ?product= ပါဝင်နေပါက /api/share သို့ အလိုအလျောက် လွှဲပေးမည်
  if (isBot && (cat || product)) {
    const rewriteUrl = new URL('/api/share', request.url);
    if (cat) rewriteUrl.searchParams.set('cat', cat);
    if (product) rewriteUrl.searchParams.set('product', product);
    return Response.rewrite(rewriteUrl);
  }
}

// Static asset တွေ (css, js, images, logo) ကို မလိုအပ်ဘဲ ကြားဖြတ်မစစ်စေရန်
export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};