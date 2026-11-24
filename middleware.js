// middleware.js (Vercel Edge Middleware - No external package required)
export default function middleware(request) {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();

  // Telegram, Viber, Facebook, Twitter, WhatsApp bot များ စစ်ဆေးခြင်း
  const isBot = /telegrambot|twitterbot|facebookexternalhit|facebot|viber|whatsapp|discordbot|linkedinbot/i.test(userAgent);

  const url = new URL(request.url);
  const cat = url.searchParams.get('cat');
  const product = url.searchParams.get('product') || url.searchParams.get('item');
  const article = url.searchParams.get('article');

  // Bot လာရောက်ဖတ်ပြီး ?article=, ?cat= သို့မဟုတ် ?product= ပါနေပါက /api/share သို့ rewrite ပြုလုပ်မည်
  if (isBot && (article || cat || product)) {
    const rewriteUrl = new URL('/api/share', request.url);
    if (article) rewriteUrl.searchParams.set('article', article);
    if (cat) rewriteUrl.searchParams.set('cat', cat);
    if (product) rewriteUrl.searchParams.set('product', product);

    return new Response(null, {
      headers: {
        'x-middleware-rewrite': rewriteUrl.toString(),
      },
    });
  }
}

export const config = {
  matcher: ['/', '/index.html'],
};
