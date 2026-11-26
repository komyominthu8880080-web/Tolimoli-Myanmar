// api/telegram-webhook.js
const ALLOWED_ORIGINS = [
  'https://www.tolimolimyanmar.com',
  'https://tolimolimyanmar.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

function applyCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.tolimolimyanmar.com');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
}

function withFbAuth(url) {
  const secret = process.env.FIREBASE_DB_SECRET;
  if (!secret) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}auth=${encodeURIComponent(secret)}`;
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ORDER_BOT_TOKEN = process.env.ORDER_BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.ORDER_CHAT_ID;
  const LIVECHAT_BOT_TOKEN = process.env.CHAT_BOT_TOKEN;
  const CHAT_GROUP_ID = process.env.CHAT_GROUP_ID;
  const SERVER_ADMIN_PIN = process.env.ADMIN_SECRET_PIN || process.env.ADMIN_PIN;
  const FIREBASE_URL = process.env.FIREBASE_DB_URL || "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app";

  function escapeTgHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function isAdminAuthorized() {
    if (!SERVER_ADMIN_PIN) return false;
    const clientPin = req.headers['x-admin-pin'];
    return Boolean(clientPin && String(clientPin).trim() === String(SERVER_ADMIN_PIN).trim());
  }

  // GET Request ဖြင့် Telegram Media (Photo/Video/Audio) ကို Bot Token မပေါက်ကြားဘဲ Proxy Stream ပြုလုပ်ခြင်း
  if (req.method === 'GET' && req.query && req.query.file_id) {
    try {
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(req.query.file_id)}`);
      const fileInfo = await fileInfoRes.json();
      if (fileInfo.ok && fileInfo.result && fileInfo.result.file_path) {
        const tgFileUrl = `https://api.telegram.org/file/bot${LIVECHAT_BOT_TOKEN}/${fileInfo.result.file_path}`;
        const mediaRes = await fetch(tgFileUrl);
        res.setHeader('Content-Type', mediaRes.headers.get('content-type') || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const arrayBuffer = await mediaRes.arrayBuffer();
        return res.status(200).send(Buffer.from(arrayBuffer));
      }
      return res.status(404).send('File not found');
    } catch (e) {
      return res.status(500).send(e.message);
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body || {};

  function getMyanmarDateTime() {
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

    return `${mmDateStr} | ${mmTimeStr}`;
  }

  async function sendOrderToTelegram(targetChat, targetTopic, textMsg, slipUrl) {
    const hasSlip = slipUrl && typeof slipUrl === 'string' && slipUrl.trim() !== '';
    const isLongMessage = textMsg.length > 1000;

    let photoCaption = textMsg;
    let followUpText = '';

    if (hasSlip && isLongMessage) {
      const splitIndex = textMsg.indexOf('🛍 <b>မှာယူထားသော ပစ္စည်းများ:</b>');
      if (splitIndex > 0 && splitIndex <= 1000) {
        photoCaption = textMsg.slice(0, splitIndex).trim() + '\n\n⬇️ <i>(မှာယူထားသော ပစ္စည်းစာရင်းအပြည့်အစုံကို အောက်ပါစာတိုတွင် ဖော်ပြထားပါသည်)</i>';
        followUpText = '📋 <b>အော်ဒါ ပစ္စည်းစာရင်းအပြည့်အစုံ</b>\n' + textMsg.slice(splitIndex).trim();
      } else {
        photoCaption = '🧾 <b>ငွေလွှဲပြေစာ (Payment Slip)</b>\n⬇️ <i>(အော်ဒါအသေးစိတ်ကို အောက်ပါစာတိုတွင် ဖော်ပြထားပါသည်)</i>';
        followUpText = textMsg;
      }
    }

    if (hasSlip) {
      let photoSentOk = false;
      let photoResultData = null;

      if (slipUrl.startsWith('data:image')) {
        const matches = slipUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const ext = mimeType.split('/')[1] || 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          const blob = new Blob([buffer], { type: mimeType });

          const formData = new FormData();
          formData.append('chat_id', String(targetChat));
          if (targetTopic) formData.append('message_thread_id', String(targetTopic));
          formData.append('photo', blob, `slip.${ext}`);
          formData.append('caption', photoCaption.slice(0, 1024));
          formData.append('parse_mode', 'HTML');

          const photoRes = await fetch(`https://api.telegram.org/bot${ORDER_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
          });
          photoResultData = await photoRes.json();
          if (photoResultData.ok) photoSentOk = true;
        }
      } else if (slipUrl.startsWith('http')) {
        const photoPayload = {
          chat_id: targetChat,
          photo: slipUrl,
          caption: photoCaption.slice(0, 1024),
          parse_mode: 'HTML'
        };
        if (targetTopic) photoPayload.message_thread_id = targetTopic;

        const photoRes = await fetch(`https://api.telegram.org/bot${ORDER_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoPayload)
        });
        photoResultData = await photoRes.json();
        if (photoResultData.ok) photoSentOk = true;
      }

      if (photoSentOk) {
        if (followUpText) {
          const followPayload = {
            chat_id: targetChat,
            text: followUpText.slice(0, 4096),
            parse_mode: 'HTML'
          };
          if (targetTopic) followPayload.message_thread_id = targetTopic;

          await fetch(`https://api.telegram.org/bot${ORDER_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(followPayload)
          });
        }
        return photoResultData;
      }
    }

    const textPayload = {
      chat_id: targetChat,
      text: textMsg.slice(0, 4096),
      parse_mode: 'HTML'
    };
    if (targetTopic) textPayload.message_thread_id = targetTopic;

    const tgRes = await fetch(`https://api.telegram.org/bot${ORDER_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(textPayload)
    });
    return await tgRes.json();
  }

  // -------------------------------------------------------------
  // ၁။ FRONTEND မှ အော်ဒါသစ် / Alert ပို့ဆောင်ခြင်း (ADMIN_CHAT_ID သို့သာ ပို့ခွင့်ပြုသည်)
  // -------------------------------------------------------------
  if (body.action === 'sendOrderNotification') {
    const { orderData, messageText, topicId, slipUrl } = body;
    const safeTargetChat = ADMIN_CHAT_ID;

    if (messageText) {
      try {
        const tgData = await sendOrderToTelegram(
          safeTargetChat,
          topicId,
          String(messageText).slice(0, 4000),
          slipUrl || (orderData && orderData.slipUrl)
        );
        return res.status(200).json({ success: true, tgResponse: tgData });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    if (!orderData) {
      return res.status(400).json({ error: 'Missing order data' });
    }

    try {
      let itemsText = '';
      if (Array.isArray(orderData.items) && orderData.items.length > 0) {
        itemsText = orderData.items.map(it => {
          const name = escapeTgHtml(it.name || it.title || 'ပစ္စည်း');
          const sku = it.sku ? ` (SKU: ${escapeTgHtml(it.sku)})` : '';
          const color = it.color || it.selectedColor ? ` [${escapeTgHtml(it.color || it.selectedColor)}]` : '';
          const qty = Number(it.qty || 1);
          const price = Number(it.price || 0) * qty;
          return `• ${name}${color}${sku} x${qty}\n  ${price.toLocaleString()} Ks`;
        }).join('\n');
      }

      const timeStr = getMyanmarDateTime();
      const rawDeli = Number(orderData.deliveryFee ?? orderData.deliFee ?? orderData.deliPrice ?? orderData.shippingFee ?? 0) || 0;
      const isHttpSlip = orderData.slipUrl && String(orderData.slipUrl).startsWith('http');
      const busGateText = escapeTgHtml(orderData.busGate || orderData.busGateDetails || '');
      const specialNoteText = escapeTgHtml(orderData.specialNote || '');

      const orderMessageText = '🚨 <b>အော်ဒါအသစ် ရောက်ရှိပါပြီ!</b>\n' +
        '🆔 <b>Order ID:</b> <code>' + escapeTgHtml(orderData.id || '-') + '</code>\n' +
        '📅 <b>ရက်စွဲနှင့် အချိန်:</b> ' + timeStr + '\n\n' +
        '👤 <b>ဝယ်သူ:</b> ' + escapeTgHtml(orderData.customer || 'မဖော်ပြထားပါ') + '\n' +
        '📞 <b>ဖုန်း:</b> ' + escapeTgHtml(orderData.phone || 'မဖော်ပြထားပါ') + '\n' +
        '📍 <b>လိပ်စာ:</b> ' + escapeTgHtml(orderData.address || '') + (orderData.township ? ' (' + escapeTgHtml(orderData.township) + ')' : '') + '\n' +
        (busGateText ? '🚌 <b>ကားဂိတ်:</b> ' + busGateText + '\n' : '') +
        '🚚 <b>ပို့ဆောင်ရေး:</b> ' + escapeTgHtml(orderData.deliveryService || orderData.deliveryType || orderData.busLineName || 'Standard Delivery') + '\n' +
        '💳 <b>ငွေပေးချေမှု:</b> ' + escapeTgHtml(orderData.payment || 'COD') + '\n\n' +
        '🛍 <b>မှာယူထားသော ပစ္စည်းများ:</b>\n' + (itemsText || '- မရှိပါ -') + '\n\n' +
        '💰 <b>ပစ္စည်းကျသင့်ငွေ:</b> ' + (Number(orderData.subTotal || orderData.subtotal || (orderData.total - (orderData.deliveryFee || 0) + (orderData.discount || 0)) || 0)).toLocaleString() + ' Ks\n' +
        (orderData.discount ? '🏷 <b>လျှော့စျေး:</b> -' + (Number(orderData.discount)).toLocaleString() + ' Ks\n' : '') +
        '🚚 <b>ပို့ဆောင်ခ:</b> ' + rawDeli.toLocaleString() + ' Ks\n' +
        '💵 <b>စုစုပေါင်း:</b> <b>' + (Number(orderData.total || 0)).toLocaleString() + ' MMK</b>' +
        (specialNoteText ? '\n\n📝 <b>မှတ်ချက်:</b> ' + specialNoteText : '') +
        (isHttpSlip ? '\n\n🧾 <b>ငွေလွှဲပြေစာ:</b> ' + escapeTgHtml(orderData.slipUrl) : '');

      const tgData = await sendOrderToTelegram(
        safeTargetChat,
        topicId,
        orderMessageText,
        slipUrl || orderData.slipUrl
      );
      return res.status(200).json({ success: true, tgResponse: tgData });
    } catch (err) {
      console.error('Telegram Send Order Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ==========================================
  // ဝဘ်ဆိုက်မှ TELEGRAM GROUP သို့ LIVE CHAT စာပို့ခြင်း
  // ==========================================
  if (body.action === 'sendLiveChat') {
    try {
      const targetChat = CHAT_GROUP_ID || ADMIN_CHAT_ID;

      // ၁။ အသံဖိုင် (Base64 Audio)
      if (body.audioBase64 && String(body.audioBase64).startsWith('data:audio')) {
        const matches = body.audioBase64.match(/^data:(audio\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const blob = new Blob([buffer], { type: mimeType });

          const formData = new FormData();
          formData.append('chat_id', String(targetChat));
          if (body.topicId) formData.append('message_thread_id', String(body.topicId));
          formData.append('audio', blob, `voice_${Date.now()}.webm`);
          formData.append('caption', body.messageText || '🎤 ဝယ်သူထံမှ အသံဖိုင် (Voice Note)');
          formData.append('parse_mode', 'HTML');

          const audioRes = await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/sendAudio`, {
            method: 'POST',
            body: formData
          });
          const audioData = await audioRes.json();
          const tgFileId = audioData.result?.audio?.file_id || audioData.result?.voice?.file_id || '';
          const streamUrl = tgFileId ? `/api/telegram-webhook?file_id=${tgFileId}` : '';
          return res.status(200).json({ ...audioData, streamUrl });
        }
      }

      // ၂။ ဓာတ်ပုံ / ဗီဒီယို သို့မဟုတ် ရိုးရိုး စာသား ပို့ခြင်း
      const mediaUrl = body.mediaUrl || '';
      const mediaType = body.mediaType || '';

      if (mediaUrl && (mediaType === 'image' || mediaUrl.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)/i.test(mediaUrl))) {
        if (mediaUrl.startsWith('data:image')) {
          const match = mediaUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const ext = mimeType.split('/')[1] || 'jpg';
            const buffer = Buffer.from(match[2], 'base64');
            const blob = new Blob([buffer], { type: mimeType });
            const formData = new FormData();
            formData.append('chat_id', String(targetChat));
            if (body.topicId) formData.append('message_thread_id', String(body.topicId));
            formData.append('photo', blob, `chat_photo.${ext}`);
            formData.append('caption', (body.messageText || '📷 ဝယ်သူထံမှ ဓာတ်ပုံ').slice(0, 1024));
            formData.append('parse_mode', 'HTML');
            const pRes = await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
            const pData = await pRes.json();
            const photos = pData.result?.photo || [];
            const tgFileId = photos.length > 0 ? photos[photos.length - 1].file_id : '';
            const streamUrl = tgFileId ? `/api/telegram-webhook?file_id=${tgFileId}` : '';
            return res.status(200).json({ ...pData, streamUrl });
          }
        } else {
          const pPayload = {
            chat_id: targetChat,
            photo: mediaUrl,
            caption: (body.messageText || '📷 ဝယ်သူထံမှ ဓာတ်ပုံ').slice(0, 1024),
            parse_mode: 'HTML'
          };
          if (body.topicId) pPayload.message_thread_id = Number(body.topicId);
          const pRes = await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pPayload)
          });
          return res.status(200).json(await pRes.json());
        }
      }

      const payload = {
        chat_id: targetChat,
        text: body.messageText,
        parse_mode: 'HTML'
      };
      if (body.topicId) {
        payload.message_thread_id = Number(body.topicId);
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const tgData = await tgRes.json();
      return res.status(200).json(tgData);
    } catch (err) {
      console.error('Live Chat send error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ဝယ်သူအသစ်အတွက် Forum Topic ခေါင်းစဉ် ဖန်တီးပေးခြင်း
  if (body.action === 'createForumTopic') {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/createForumTopic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_GROUP_ID,
          name: String(body.sessionName || 'Guest User').slice(0, 120)
        })
      });
      const tgData = await tgRes.json();
      return res.status(200).json(tgData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ဝယ်သူ စကားဝိုင်း ဖျက်သည့်အခါ Telegram Forum Topic ကိုပါ တစ်ခါတည်း ဖျက်ပေးခြင်း (Admin PIN မဖြစ်မနေ လိုအပ်သည်)
  if (body.action === 'deleteForumTopic') {
    try {
      if (!isAdminAuthorized()) {
        return res.status(401).json({ error: 'Unauthorized: Admin PIN မှားယွင်းနေပါသည်' });
      }
      if (!body.topicId) return res.status(200).json({ ok: true, skipped: 'No topicId' });
      const tgRes = await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/deleteForumTopic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_GROUP_ID,
          message_thread_id: Number(body.topicId)
        })
      });
      const tgData = await tgRes.json();
      return res.status(200).json(tgData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // Telegram Webhook Secret Header စစ်ဆေးခြင်း (သတ်မှတ်ထားပါက)
  // -------------------------------------------------------------
  const TG_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (TG_WEBHOOK_SECRET) {
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (incomingSecret !== TG_WEBHOOK_SECRET) {
      return res.status(401).send('Unauthorized Webhook');
    }
  }

  // -------------------------------------------------------------
  // ၂။ TELEGRAM INLINE CALLBACK BUTTON HANDLER
  // -------------------------------------------------------------
  if (body.callback_query) {
    try {
      const cb = body.callback_query;
      const cbChatId = cb.message?.chat?.id ? String(cb.message.chat.id) : '';
      const allowedChats = [String(CHAT_GROUP_ID || ''), String(ADMIN_CHAT_ID || '')].filter(Boolean);
      if (cbChatId && allowedChats.length > 0 && !allowedChats.includes(cbChatId)) {
        return res.status(200).send('OK');
      }

      const cbData = cb.data || '';
      if (cbData.startsWith('verify_slip:')) {
        const targetSessionId = cbData.split(':')[1];
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Yangon', hour: '2-digit', minute: '2-digit' });
        await fetch(withFbAuth(`${FIREBASE_URL}/support_chats/${targetSessionId}/messages.json`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'admin',
            text: '✅ လူကြီးမင်း၏ ငွေလွှဲစလစ်ကို လက်ခံရရှိပါပြီခင်ဗျာ။ ပစ္စည်းအမြန်ဆုံး ထုပ်ပိုးပို့ဆောင်ပေးပါမည် 🚚✨',
            timeStr,
            timestamp: Date.now()
          })
        });
        await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cb.id, text: '✅ ဝယ်သူထံသို့ ငွေလက်ခံရရှိကြောင်း အတည်ပြုပေးပြီးပါပြီ!' })
        });
        if (cb.message) {
          await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cb.message.chat.id,
              message_thread_id: cb.message.message_thread_id,
              text: '✅ <b>[Admin မှ ငွေလွှဲစလစ် အတည်ပြုပြီးကြောင်း ဝယ်သူထံ အကြောင်းကြားပြီးပါပြီ]</b>',
              parse_mode: 'HTML'
            })
          });
        }
      }
    } catch (cbErr) {
      console.error('Callback query error:', cbErr);
    }
    return res.status(200).send('OK');
  }

  // -------------------------------------------------------------
  // ၃။ TELEGRAM မှ ဝင်လာသော LIVE CHAT WEBHOOK
  // -------------------------------------------------------------
  const update = body;
  if (!update || !update.message) return res.status(200).send('OK');

  const msg = update.message;
  if (msg.from && msg.from.is_bot) return res.status(200).send('OK');

  // Admin Group / Chat အစစ်မှ ဝင်လာသော Message ဟုတ်မဟုတ် စစ်ဆေးခြင်း
  const incomingChatId = msg.chat && msg.chat.id ? String(msg.chat.id) : '';
  const allowedGroupIds = [String(CHAT_GROUP_ID || ''), String(ADMIN_CHAT_ID || '')].filter(Boolean);
  if (allowedGroupIds.length > 0 && !allowedGroupIds.includes(incomingChatId)) {
    return res.status(200).send('OK');
  }

  const threadId = msg.message_thread_id;
  let text = msg.text || msg.caption || '';
  let replyToText = '';

  // Telegram Topic ထဲတွင် /del ဟု ရိုက်ပို့ပါက Firebase Database နှင့် Telegram Topic နှစ်ခုလုံးကို အပြီးဖျက်ခြင်း
  if (threadId && text.trim().toLowerCase() === '/del') {
    try {
      const sessionsRes = await fetch(withFbAuth(`${FIREBASE_URL}/support_chats.json`));
      const sessions = await sessionsRes.json();
      if (sessions) {
        for (const [sId, sVal] of Object.entries(sessions)) {
          if (sVal && String(sVal.telegramThreadId) === String(threadId)) {
            await fetch(withFbAuth(`${FIREBASE_URL}/support_chats/${sId}.json`), { method: 'DELETE' });
          }
        }
      }
      await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/deleteForumTopic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_GROUP_ID, message_thread_id: Number(threadId) })
      });
      return res.status(200).send('Deleted');
    } catch (e) {
      return res.status(200).send('OK');
    }
  }

  // Telegram Topic Commands
  const rawCmd = text.trim();
  const lowerCmd = rawCmd.toLowerCase();
  if (threadId && rawCmd.startsWith('/')) {
    try {
      const sessionsRes = await fetch(withFbAuth(`${FIREBASE_URL}/support_chats.json`));
      const sessions = await sessionsRes.json();
      let targetSessionId = null;
      if (sessions) {
        for (const [sId, sVal] of Object.entries(sessions)) {
          if (sVal && String(sVal.telegramThreadId || sVal.threadId || '') === String(threadId)) {
            targetSessionId = sId;
            break;
          }
        }
      }
      if (!targetSessionId && msg.reply_to_message && msg.reply_to_message.text) {
        const m = msg.reply_to_message.text.match(/Guest\s*#(\d+)/i);
        if (m) targetSessionId = 'guest_' + m[1];
      }

      if (targetSessionId) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Yangon', hour: '2-digit', minute: '2-digit' });
        const replyTg = async (tgMsg) => {
          await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_GROUP_ID, message_thread_id: Number(threadId), text: tgMsg, parse_mode: 'HTML' })
          });
        };
        const pushChat = async (msgObj) => {
          await fetch(withFbAuth(`${FIREBASE_URL}/support_chats/${targetSessionId}/messages.json`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...msgObj, sender: 'admin', timeStr, timestamp: Date.now() })
          });
        };

        // 0. /done & /active
        if (lowerCmd === '/done' || lowerCmd === '/active') {
          const newSt = lowerCmd === '/done' ? 'done' : 'active';
          await fetch(withFbAuth(`${FIREBASE_URL}/support_chats/${targetSessionId}/status.json`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSt)
          });
          await replyTg(newSt === 'done'
            ? `✅ <b>${targetSessionId}</b> စကားဝိုင်းကို Dashboard တွင် <b>Done</b> အဖြစ် မှတ်သားပြီးပါပြီ။`
            : `🟢 <b>${targetSessionId}</b> စကားဝိုင်းကို Dashboard တွင် <b>Active</b> ပြန်လုပ်ပြီးပါပြီ။`);
          return res.status(200).send('OK');
        }

        // 1. /kpay, /wave, /cbpay, /ayapay, /uabpay
        if (['/kpay', '/wave', '/cbpay', '/ayapay', '/uabpay'].includes(lowerCmd)) {
          const qrRes = await fetch(withFbAuth(`${FIREBASE_URL}/chat_qr_accounts.json`));
          const qrDb = (await qrRes.json()) || {};
          const bankKey = lowerCmd.slice(1);
          const defaults = {
            kpay: { bank: 'KBZPay', name: 'Ma Win Win Myint', phone: '09768124433', qr: 'kpay-qr.jpg' },
            wave: { bank: 'WavePay', name: 'Nu Nu Htwe', phone: '09768124433', qr: 'wave-qr.jpg' },
            cbpay: { bank: 'CB Pay', name: 'U MYO MIN THU', phone: '09421334455', qr: 'cbpay-qr.jpg' },
            ayapay: { bank: 'AYA Pay', name: 'MYO MIN THU', phone: '09421334455', qr: 'ayapay-qr.jpg' },
            uabpay: { bank: 'UAB Pay', name: 'Myo Min Thu', phone: '09444744493', qr: 'uabpay-qr.jpg' }
          };
          const info = { ...defaults[bankKey], ...(qrDb[bankKey] || {}) };
          await pushChat({ text: `${info.bank} ငွေလွှဲအကောင့်`, mediaUrl: info.qr, mediaType: 'qr_card', cardData: info });
          await replyTg(`✅ ဝယ်သူထံသို့ <b>${info.bank} QR ကတ်</b> (${info.name} <code>${info.phone}</code>) ပို့ပေးပြီးပါပြီ။`);
          return res.status(200).send('OK');
        }

        // 2. /coupon
        if (lowerCmd === '/coupon') {
          const code = 'VIP' + Math.floor(1000 + Math.random() * 9000);
          await pushChat({ text: 'အထူးလျှော့ဈေးကူပွန် (2,000 Ks)', mediaType: 'coupon_card', cardData: { code, discount: 2000, amount: 2000 } });
          await replyTg(`✅ ဝယ်သူထံသို့ <b>2,000 Ks ကူပွန်ကတ်</b> (<code>${code}</code>) ပို့ပေးပြီးပါပြီ။`);
          return res.status(200).send('OK');
        }

        // 3. /list နှင့် /r1, /r2...
        if (lowerCmd === '/list' || /^\/r\d+$/.test(lowerCmd)) {
          const qrListRes = await fetch(withFbAuth(`${FIREBASE_URL}/chat_quick_replies.json`));
          const qrListVal = await qrListRes.json();
          const items = qrListVal ? Object.values(qrListVal) : [];
          if (lowerCmd === '/list') {
            if (!items.length) {
              await replyTg('ℹ️ Admin Dashboard > Auto Reply Bot ထဲတွင် Saved Reply မထည့်ရသေးပါ။');
            } else {
              const lines = items.map((it, i) => `<b>/r${i + 1}</b> — ${escapeTgHtml(it.title)}: <i>${escapeTgHtml(it.text.slice(0, 45))}...</i>`).join('\n');
              await replyTg(`📋 <b>Saved Replies စာရင်း (ရိုက်ပို့ရန်):</b>\n\n${lines}`);
            }
          } else {
            const idx = Number(lowerCmd.replace('/r', '')) - 1;
            if (items[idx]) {
              await pushChat({ text: items[idx].text });
              await replyTg(`✅ <b>[${escapeTgHtml(items[idx].title)}]</b> စာတိုကို ဝယ်သူထံ ပို့ပေးပြီးပါပြီ။`);
            } else {
              await replyTg(`❌ /r${idx + 1} မရှိပါ။ /list ဟု ရိုက်၍ စာရင်းစစ်ဆေးပါ။`);
            }
          }
          return res.status(200).send('OK');
        }

        // 4. /p [ပစ္စည်းအမည်] -> Product Card ပို့ခြင်း
        if (lowerCmd.startsWith('/p ')) {
          const kw = rawCmd.slice(3).trim().toLowerCase();
          const prodRes = await fetch(withFbAuth(`${FIREBASE_URL}/shop_products.json`));
          const prodVal = await prodRes.json();
          const prodList = prodVal ? Object.values(prodVal) : [];
          const found = prodList.find(p => p && ((p.name && p.name.toLowerCase().includes(kw)) || (p.sku && p.sku.toLowerCase().includes(kw))));
          if (found) {
            const imgUrl = (Array.isArray(found.images) && found.images[0]) || found.image || 'logo.png';
            const priceNum = Number(found.price || 0);
            await pushChat({
              text: found.name,
              mediaUrl: imgUrl,
              mediaType: 'product_card',
              cardData: { id: found.id || '', sku: found.sku || '-', price: priceNum, name: found.name, image: imgUrl }
            });
            await replyTg(`✅ <b>${escapeTgHtml(found.name)}</b> (${priceNum.toLocaleString()} Ks) Product Card ကို ဝယ်သူထံ ပို့ပေးပြီးပါပြီ။`);
          } else {
            await replyTg(`❌ "${escapeTgHtml(kw)}" နှင့် ကိုက်ညီသော ပစ္စည်း မတွေ့ပါ။`);
          }
          return res.status(200).send('OK');
        }

        // 5. /c [ကူပွန်ကုဒ် သို့မဟုတ် လျှော့ဈေးတန်ဖိုး]
        if (lowerCmd === '/c' || lowerCmd.startsWith('/c ')) {
          const arg = rawCmd.slice(2).trim();
          if (!arg) {
            await replyTg('ℹ️ <b>ကူပွန်ပို့နည်း:</b>\n• ရှိပြီးသား ကုဒ်ပို့ရန်: <code>/c VIP2000</code>\n• ၁ ကြိမ်သုံး ကုဒ်အသစ်ဖန်တီးပို့ရန်: <code>/c 2000</code> (သို့) <code>/c 10%</code>');
            return res.status(200).send('OK');
          }
          const discRes = await fetch(withFbAuth(`${FIREBASE_URL}/shop_discounts.json`));
          const discVal = await discRes.json();
          const discList = Array.isArray(discVal) ? discVal.filter(Boolean) : (discVal ? Object.values(discVal) : []);
          const upperArg = arg.toUpperCase();
          let targetCoupon = discList.find(d => d && String(d.code || '').toUpperCase() === upperArg);

          if (!targetCoupon) {
            const isPercent = arg.endsWith('%');
            const numVal = Number(arg.replace(/[^0-9.]/g, ''));
            if (!numVal || numVal <= 0) {
              await replyTg(`❌ "${escapeTgHtml(arg)}" နှင့် ကိုက်ညီသော ကူပွန်ကုဒ် မတွေ့ပါ (အသစ်ဖန်တီးလိုပါက <code>/c 2000</code> သို့မဟုတ် <code>/c 10%</code> ဟု ရိုက်ပါ)။`);
              return res.status(200).send('OK');
            }
            const randCode = 'VIP' + Math.floor(1000 + Math.random() * 9000);
            targetCoupon = {
              id: 'disc_' + Date.now(),
              category: 'vip',
              code: randCode,
              type: isPercent ? 'percent' : 'fixed',
              val: numVal,
              value: numVal,
              limit: 1,
              used: 0,
              usedCount: 0,
              expiry: '',
              active: true
            };
            discList.unshift(targetCoupon);
            await fetch(withFbAuth(`${FIREBASE_URL}/shop_discounts.json`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(discList)
            });
          }

          const finalVal = Number(targetCoupon.value ?? targetCoupon.val ?? targetCoupon.discount ?? targetCoupon.amount ?? 0);
          const valLabel = targetCoupon.type === 'percent' ? `${finalVal}% Off` : `${finalVal.toLocaleString()} Ks`;
          await pushChat({
            text: `🎟 သီးသန့် လျှော့ဈေးကူပွန်: ${targetCoupon.code} (${valLabel})`,
            mediaType: 'coupon_card',
            cardData: {
              code: targetCoupon.code,
              value: finalVal,
              discount: finalVal,
              type: targetCoupon.type || 'fixed',
              category: targetCoupon.category || 'vip',
              label: valLabel
            }
          });
          await replyTg(`✅ ကူပွန်ကုဒ် <b>${escapeTgHtml(targetCoupon.code)}</b> (${valLabel}) ကို ဝယ်သူထံ ပို့ပေးပြီးပါပြီ။`);
          return res.status(200).send('OK');
        }

        // 6. /cart
        if (lowerCmd === '/cart') {
          const sSnap = await fetch(withFbAuth(`${FIREBASE_URL}/support_chats/${targetSessionId}.json`));
          const sData = await sSnap.json() || {};
          const cartItems = Array.isArray(sData.liveCart) ? sData.liveCart : [];
          let msgOut = `🛒 <b>ဝယ်သူ (${escapeTgHtml(targetSessionId)}) ၏ လက်ရှိ ခြင်းတောင်း:</b>\n`;
          if (cartItems.length === 0) {
            msgOut += `• ခြင်းတောင်းထဲတွင် ပစ္စည်း မထည့်ရသေးပါ။\n`;
          } else {
            let total = 0;
            cartItems.forEach((it, idx) => {
              const sub = Number(it.price || 0) * Number(it.qty || 1);
              total += sub;
              msgOut += `${idx + 1}. ${escapeTgHtml(it.name)} (x${it.qty || 1}) — ${sub.toLocaleString()} Ks\n`;
            });
            msgOut += `💰 <b>စုစုပေါင်း:</b> ${total.toLocaleString()} Ks\n`;
          }
          await replyTg(msgOut);
          return res.status(200).send('OK');
        }

        // 7. /track [Order ID]
        if (lowerCmd.startsWith('/track ')) {
          const oid = rawCmd.slice(7).trim().toUpperCase();
          const ordRes = await fetch(withFbAuth(`${FIREBASE_URL}/shop_orders.json`));
          const ordVal = await ordRes.json();
          const ordList = ordVal ? Object.values(ordVal) : [];
          const foundOrd = ordList.find(o => o && String(o.orderId || o.id || '').toUpperCase().includes(oid));
          if (foundOrd) {
            const st = foundOrd.status || 'Pending';
            await pushChat({
              text: `📦 အော်ဒါအမှတ် (${foundOrd.orderId || foundOrd.id || oid}) ၏ လက်ရှိအခြေအနေ: ${st}\nစုစုပေါင်း: ${Number(foundOrd.total || 0).toLocaleString()} Ks`
            });
            await replyTg(`✅ အော်ဒါ <b>${escapeTgHtml(foundOrd.orderId || foundOrd.id || oid)}</b> (${escapeTgHtml(st)}) အခြေအနေကို ဝယ်သူထံ ပို့ပေးပြီးပါပြီ။`);
          } else {
            await replyTg(`❌ အော်ဒါအမှတ် "${escapeTgHtml(oid)}" ရှာမတွေ့ပါ။`);
          }
          return res.status(200).send('OK');
        }

        // 8. /cat [Category]
        if (lowerCmd === '/cat' || lowerCmd.startsWith('/cat ')) {
          const catKw = rawCmd.slice(4).trim().toLowerCase();
          const prodRes = await fetch(withFbAuth(`${FIREBASE_URL}/shop_products.json`));
          const prodVal = await prodRes.json();
          const prodList = prodVal ? Object.values(prodVal).filter(Boolean) : [];

          const getProdCats = (p) => {
            const arr = [];
            if (p.category) arr.push(String(p.category).trim());
            if (Array.isArray(p.categories)) p.categories.forEach(c => c && arr.push(String(c).trim()));
            return [...new Set(arr)];
          };

          if (!catKw) {
            const cats = [...new Set(prodList.flatMap(getProdCats).filter(Boolean))];
            const listTxt = cats.length
              ? cats.map(c => `• <code>/cat ${escapeTgHtml(c)}</code>`).join('\n')
              : 'Category စာရင်း မတွေ့သေးပါ။';
            await replyTg(`📂 <b>ရွေးချယ်ပို့နိုင်သော Categories များ:</b>\n${listTxt}`);
            return res.status(200).send('OK');
          }

          const matched = prodList.filter(p => getProdCats(p).some(c => c.toLowerCase().includes(catKw)));
          if (matched.length) {
            const catTitle = matched[0].category || (Array.isArray(matched[0].categories) && matched[0].categories[0]) || catKw;
            const items = matched.map(p => ({
              id: p.id || '',
              sku: p.sku || '-',
              price: Number(p.price || 0),
              name: p.name,
              image: (Array.isArray(p.images) && p.images[0]) || p.image || 'logo.png'
            }));
            await pushChat({
              text: `📂 ${catTitle} အမျိုးအစား ပစ္စည်းများ (${items.length} မျိုး)`,
              mediaType: 'category_carousel',
              cardData: { category: catTitle, items }
            });
            await replyTg(`✅ <b>${escapeTgHtml(catTitle)}</b> Category ထဲမှ ပစ္စည်း (${items.length}) မျိုးကို ဝယ်သူထံ ပို့ပေးပြီးပါပြီ။`);
          } else {
            await replyTg(`❌ "${escapeTgHtml(catKw)}" Category မတွေ့ပါ။ <code>/cat</code> ဟု ရိုက်၍ စာရင်းစစ်ဆေးပါ။`);
          }
          return res.status(200).send('OK');
        }

        // 9. /news
        if (lowerCmd === '/news' || lowerCmd.startsWith('/news ')) {
          const newsKw = rawCmd.slice(5).trim().toLowerCase();
          const newsRes = await fetch(withFbAuth(`${FIREBASE_URL}/shop_news.json`));
          const newsVal = await newsRes.json();
          const newsList = newsVal ? Object.values(newsVal).reverse() : [];
          const foundNews = newsKw
            ? newsList.find(n => n && ((n.title && n.title.toLowerCase().includes(newsKw)) || (n.content && n.content.toLowerCase().includes(newsKw))))
            : newsList[0];

          if (foundNews) {
            await pushChat({
              text: foundNews.title || 'သတင်းလွှာ',
              mediaUrl: foundNews.image || '',
              mediaType: 'news_card',
              cardData: {
                title: foundNews.title || 'Tolimoli Myanmar News',
                content: foundNews.content || foundNews.desc || '',
                image: foundNews.image || '',
                date: foundNews.date || ''
              }
            });
            await replyTg(`✅ <b>${escapeTgHtml(foundNews.title)}</b> သတင်းကတ်ကို ဝယ်သူထံ ပို့ပေးပြီးပါပြီ။`);
          } else {
            await replyTg(`❌ ပို့ရန် သတင်းလွှာ မတွေ့သေးပါခင်ဗျာ။`);
          }
          return res.status(200).send('OK');
        }

        await replyTg('ℹ️ အသုံးပြုနိုင်သော Commands များ:\n<code>/c VIP2000</code> သို့ <code>/c 2000</code> — ကူပွန်ပို့ရန်\n<code>/cart</code> — ဝယ်သူ့ခြင်းတောင်းစစ်ရန်\n<code>/kpay</code>, <code>/wave</code>, <code>/cbpay</code>, <code>/ayapay</code>, <code>/uabpay</code> — QR ပို့ရန်\n<code>/p ပစ္စည်းအမည်</code> — Product Card ပို့ရန်\n<code>/cat</code> — Category စာရင်းကြည့်ရန်\n<code>/news</code> — နောက်ဆုံး သတင်းလွှာ ပို့ရန်\n<code>/list</code> & <code>/r1</code> — Saved Replies ပို့ရန်\n<code>/track OrderID</code> — အော်ဒါစစ်ပေးရန်\n<code>/done</code> / <code>/active</code> — Inbox Status ပြောင်းရန်\n<code>/del</code> — စကားဝိုင်း ဖျက်ရန်');
        return res.status(200).send('OK');
      }
    } catch (e) {
      return res.status(200).send('OK');
    }
  }

  // Telegram Reply Quote ဖမ်းယူခြင်း
  if (msg.reply_to_message && !msg.reply_to_message.forum_topic_created) {
    const rep = msg.reply_to_message;
    let rawRepText = rep.text || rep.caption || (rep.photo ? '📷 Photo' : (rep.voice ? '🎤 Voice Note' : ''));
    if (rawRepText.includes('စာသား:')) {
      rawRepText = rawRepText.split('စာသား:')[1].trim();
    }
    replyToText = rawRepText;
  }

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
  } else if (msg.voice) {
    fileId = msg.voice.file_id;
    mediaType = 'audio';
  } else if (msg.audio) {
    fileId = msg.audio.file_id;
    mediaType = 'audio';
  }

  if (fileId) {
    mediaUrl = `/api/telegram-webhook?file_id=${encodeURIComponent(fileId)}`;
  }

  if (threadId && (text || mediaUrl)) {
    try {
      const searchRes = await fetch(withFbAuth(`${FIREBASE_URL}/support_chats.json`));
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
        const timeFormatted = getMyanmarDateTime();

        await fetch(withFbAuth(`${FIREBASE_URL}/support_chats/${targetSessionId}/messages.json`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'admin',
            text: text,
            replyTo: replyToText,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            timeStr: timeFormatted,
            timestamp: Date.now()
          })
        });

        await fetch(withFbAuth(`${FIREBASE_URL}/support_chats/${targetSessionId}.json`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lastMessage: `Admin: ${text || (mediaType === 'video' ? '🎬 ဗီဒီယို' : (mediaType === 'audio' ? '🎤 အသံဖိုင်' : '📷 ဓာတ်ပုံ'))}`,
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