export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).send('Method Not Allowed');
  }

  // @Tolimolimyanmar_bot ၏ Token အသစ်စက်စက်
  const ORDER_BOT_TOKEN = '8954973059:AAGbFEOLt29DgWfgf09xHNpn9Lu-SBZAI-4';
  // သင်၏ Chat ID (Tolimoli Myanmar Account)
  const ADMIN_CHAT_ID = '1858981030';
  // @TolomoliLivechat_Bot Token
  const LIVECHAT_BOT_TOKEN = '8900618964:AAF-CceJIWtn3in19vLP4-kOxBzZyrfYJUY';
  const FIREBASE_URL = "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app";

  const body = req.body || {};

  // -------------------------------------------------------------
  // ၁။ FRONTEND မှ အော်ဒါသစ် ပို့ဆောင်ခြင်း (ORDER BOT သီးသန့်)
  // -------------------------------------------------------------
  if (body.action === 'sendOrderNotification') {
    const { orderData } = body;
    if (!orderData) {
      return res.status(400).json({ error: 'Missing order data' });
    }

    try {
      // မူလ Screenshot ပါ Format အတိုင်း ပစ္စည်းစာရင်း ပြုလုပ်ခြင်း
      let itemsText = '';
      if (Array.isArray(orderData.items) && orderData.items.length > 0) {
        itemsText = orderData.items.map(it => {
          const name = it.name || it.title || 'ပစ္စည်း';
          const sku = it.sku ? ` (SKU: ${it.sku})` : '';
          const color = it.color || it.selectedColor ? ` [${it.color || it.selectedColor}]` : '';
          const qty = it.qty || 1;
          const price = Number(it.price || 0) * qty;
          return `• ${name}${color}${sku} x${qty} - ${price.toLocaleString()} Ks`;
        }).join('\n');
      }

      // ရက်စွဲနှင့် အချိန် format (မြန်မာစံတော်ချိန် Yangon Timezone UTC+6:30 အတိအကျ တွက်ထုတ်ခြင်း)
      const now = new Date();
      const mmDateStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Yangon',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(now).replace(/\//g, '-');

      const mmTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Yangon',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(now);

      const timeStr = `${mmDateStr} | ${mmTimeStr}`;

      // ပို့ဆောင်ခ တန်ဖိုးကို Variable အမည်အမျိုးမျိုးမှ သေချာပေါက် ဆွဲယူခြင်း
      const rawDeli = Number(orderData.deliveryFee ?? orderData.deliFee ?? orderData.deliPrice ?? orderData.shippingFee ?? 0) || 0;

      // Telegram Message Body (မူလ အတိုင်း ပုံစံမပျက်)
      const orderMessageText = '🚨 <b>အော်ဒါအသစ် ရောက်ရှိပါပြီ!</b>\n' +
        '🆔 <b>Order ID:</b> <code>' + (orderData.id || '-') + '</code>\n' +
        '📅 <b>ရက်စွဲနှင့် အချိန်:</b> ' + timeStr + '\n\n' +
        '👤 <b>ဝယ်သူ:</b> ' + (orderData.customer || 'မဖော်ပြထားပါ') + '\n' +
        '📞 <b>ဖုန်း:</b> ' + (orderData.phone || 'မဖော်ပြထားပါ') + '\n' +
        '📍 <b>လိပ်စာ:</b> ' + (orderData.address || '') + (orderData.township ? ' (' + orderData.township + ')' : '') + '\n' +
        '🚚 <b>ပို့ဆောင်ရေး:</b> ' + (orderData.deliveryType || 'ရန်ကုန်မြို့တွင်း Deli') + '\n' +
        '💳 <b>ငွေပေးချေမှု:</b> ' + (orderData.payment || 'COD') + '\n\n' +
        '🛍 <b>မှာယူထားသော ပစ္စည်းများ:</b>\n' + (itemsText || '- မရှိပါ -') + '\n\n' +
        '💰 <b>ပစ္စည်းကျသင့်ငွေ:</b> ' + (Number(orderData.subTotal || orderData.subtotal || (orderData.total - (orderData.deliveryFee || 0) + (orderData.discount || 0)) || 0)).toLocaleString() + ' Ks\n' +
        (orderData.discount ? '🏷 <b>လျှော့စျေး:</b> -' + (Number(orderData.discount)).toLocaleString() + ' Ks\n' : '') +
        '🚚 <b>ပို့ဆောင်ခ:</b> ' + rawDeli.toLocaleString() + ' Ks\n' +
        '💵 <b>စုစုပေါင်း:</b> <b>' + (Number(orderData.total || 0)).toLocaleString() + ' MMK</b>' +
        (orderData.specialNote ? '\n\n📝 <b>မှတ်ချက်:</b> ' + orderData.specialNote : '') +
        (orderData.slipUrl ? '\n\n📷 <b>ငွေလွှဲပြေစာ:</b> <a href="' + orderData.slipUrl + '">ပြေစာကြည့်ရန် နှိပ်ပါ</a>' : '');

      const payload = {
        chat_id: ADMIN_CHAT_ID,
        text: orderMessageText,
        parse_mode: 'HTML'
      };

      const tgRes = await fetch(`https://api.telegram.org/bot${ORDER_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const tgData = await tgRes.json();
      return res.status(200).json({ success: true, tgResponse: tgData });
    } catch (err) {
      console.error('Telegram Send Order Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // ၂။ TELEGRAM မှ ဝင်လာသော LIVE CHAT WEBHOOK
  // -------------------------------------------------------------
  const update = body;
  if (!update || !update.message) return res.status(200).send('OK');

  const msg = update.message;
  if (msg.from && msg.from.is_bot) return res.status(200).send('OK');

  const threadId = msg.message_thread_id;
  let text = msg.text || msg.caption || '';
  let mediaUrl = '';
  let mediaType = '';
  let fileId = null;

  if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
    fileId = msg.photo[msg.photo.length - 1].file_id;
    mediaType = 'image';
  } else if (msg.video) {
    fileId = msg.video.file_id;
    mediaType = 'video';
  } else if (msg.video_note) {
    fileId = msg.video_note.file_id;
    mediaType = 'video';
  }

  if (fileId) {
    try {
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/getFile?file_id=${fileId}`);
      const fileInfo = await fileInfoRes.json();
      if (fileInfo.ok && fileInfo.result && fileInfo.result.file_path) {
        mediaUrl = `https://api.telegram.org/file/bot${LIVECHAT_BOT_TOKEN}/${fileInfo.result.file_path}`;
      }
    } catch (err) {
      console.error('Error fetching Telegram media:', err);
    }
  }

  if (threadId && (text || mediaUrl)) {
    try {
      const searchRes = await fetch(`${FIREBASE_URL}/support_chats.json`);
      const allChats = await searchRes.json();
      let targetSessionId = null;
      if (allChats) {
        for (const [sId, chatData] of Object.entries(allChats)) {
          if (chatData && Number(chatData.telegramThreadId) === Number(threadId)) {
            targetSessionId = sId;
            break;
          }
        }
      }

      if (targetSessionId) {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const timeFormatted = `${day}-${month}-${year} | ${hours}:${minutes}:${seconds} ${ampm}`;

        await fetch(`${FIREBASE_URL}/support_chats/${targetSessionId}/messages.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'admin',
            text: text,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            timeStr: timeFormatted,
            timestamp: Date.now()
          })
        });

        await fetch(`${FIREBASE_URL}/support_chats/${targetSessionId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lastMessage: `Admin: ${text || (mediaType === 'video' ? '📹 ဗီဒီယို' : '📷 ဓာတ်ပုံ')}`,
            lastSender: 'admin',
            lastUpdate: Date.now()
          })
        });
      }
    } catch (e) {
      console.error('Telegram Webhook error:', e);
    }
  }

  return res.status(200).json({ ok: true });
}