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

  // -------------------------------------------------------------
  // လုံခြုံရေးအတွက် TOKEN နှင့် CHAT ID များကို BACKEND တွင်သာ လျှို့ဝှက်ထိန်းသိမ်းခြင်း
  // -------------------------------------------------------------
  const ORDER_BOT_TOKEN = process.env.TELEGRAM_ORDER_BOT_TOKEN || '8954973059:AAFOW9folWooIRgmikMe7yjIOscgHRznhY';
  const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '1858981030';
  const LIVECHAT_BOT_TOKEN = process.env.TELEGRAM_LIVECHAT_BOT_TOKEN || '8900618964:AAF-CceJIWtn3in19vLP4-kOxBzZyrfYJUY';
  const FIREBASE_URL = "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app";

  const body = req.body || {};

  // -------------------------------------------------------------
  // ၁။ အော်ဒါအသစ် အသိပေးချက် ပေးပို့ခြင်း (ORDER BOT သီးသန့်)
  // -------------------------------------------------------------
  if (body.action === 'sendOrderNotification') {
    const { orderData } = body;
    if (!orderData) {
      return res.status(400).json({ error: 'Missing order data' });
    }

    try {
      // ပစ္စည်းစာရင်း format ဖော်ထုတ်ခြင်း
      let itemsListText = '';
      if (Array.isArray(orderData.items)) {
        itemsListText = orderData.items.map(it => 
          `• ${it.name || it.title || 'ပစ္စည်း'} (x${it.qty || 1}) - ${(Number(it.price || 0) * (it.qty || 1)).toLocaleString()} MMK`
        ).join('\n');
      }

      // Telegram သို့ ပို့မည့် စာသား တည်ဆောက်ခြင်း
      const orderMessageText = `🛍 <b>အော်ဒါအသစ် ရောက်ရှိပါသည်!</b>\n\n` +
        `🆔 <b>Order ID:</b> <code>${orderData.id || '-'}</code>\n` +
        `👤 <b>အမည်:</b> ${orderData.customer || 'မဖော်ပြထားပါ'}\n` +
        `📞 <b>ဖုန်း:</b> ${orderData.phone || 'မဖော်ပြထားပါ'}\n` +
        `📍 <b>လိပ်စာ:</b> ${orderData.address || ''} ${orderData.township || ''}\n` +
        `💵 <b>စုစုပေါင်း:</b> <b>${Number(orderData.total || 0).toLocaleString()} MMK</b>\n` +
        `💳 <b>ငွေပေးချေမှု:</b> ${orderData.payment || 'COD'}\n` +
        (orderData.specialNote ? `📝 <b>မှတ်ချက်:</b> ${orderData.specialNote}\n` : '') +
        (orderData.slipUrl ? `🧾 <b>စလစ်လင့်ခ်:</b> <a href="${orderData.slipUrl}">ကြည့်ရှုရန်</a>\n` : '') +
        `\n📦 <b>မှာယူထားသော ပစ္စည်းများ:</b>\n${itemsListText || '- မရှိပါ -'}`;

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
  // ၂။ TELEGRAM မှ ဝင်လာသော LIVE CHAT WEBHOOK (LIVECHAT BOT သီးသန့်)
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
    const highestResPhoto = msg.photo[msg.photo.length - 1];
    fileId = highestResPhoto.file_id;
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

        const adminMsgPayload = {
          sender: 'admin',
          text: text,
          mediaUrl: mediaUrl,
          mediaType: mediaType,
          timeStr: timeFormatted,
          timestamp: Date.now()
        };

        await fetch(`${FIREBASE_URL}/support_chats/${targetSessionId}/messages.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adminMsgPayload)
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