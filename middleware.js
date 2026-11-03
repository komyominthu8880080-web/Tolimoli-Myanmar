export default function middleware(request) {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  
  // Telegram, Viber, Facebook, WhatsApp bot များ စစ်ဆေးခြင်း
  const isBot = /telegrambot|twitterbot|facebookexternalhit|facebot|viber|whatsapp/i.test(userAgent);
  
  const url = new URL(request.url);
  const cat = url.searchParams.get('cat');
  const product = url.searchParams.get('product') || url.searchParams.get('item');

  // Bot လာရောက်ဖတ်ပြီး ?cat= သို့မဟုတ် ?product= ပါနေပါက /api/share သို့ rewrite ပြုလုပ်မည်
  if (isBot && (cat || product)) {
    const rewriteUrl = new URL('/api/share', request.url);
    if (cat) rewriteUrl.searchParams.set('cat', cat);
    if (product) rewriteUrl.searchParams.set('product', product);
    return Response.rewrite(rewriteUrl);
  }
}

// Root path (/) နှင့် အဓိက စာမျက်နှာများကို ဖမ်းယူနိုင်ရန် matcher သတ်မှတ်ချက်
export const config = {
  matcher: ['/', '/index.html'],
};