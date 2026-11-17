// api/telegram-webhook.js
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET Request ဖြင့် Telegram Audio/Media ဖိုင်ကို တိုက်ရိုက် Stream လုပ်၍ နားထောင်ခြင်း
  if (req.method === 'GET' && req.query && req.query.file_id) {
    try {
      const LIVECHAT_BOT_TOKEN = process.env.CHAT_BOT_TOKEN;
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/getFile?file_id=${req.query.file_id}`);
      const fileInfo = await fileInfoRes.json();
      if (fileInfo.ok && fileInfo.result && fileInfo.result.file_path) {
        const tgFileUrl = `https://api.telegram.org/file/bot${LIVECHAT_BOT_TOKEN}/${fileInfo.result.file_path}`;
        const mediaRes = await fetch(tgFileUrl);
        res.setHeader('Content-Type', mediaRes.headers.get('content-type') || 'audio/webm');
        const arrayBuffer = await mediaRes.arrayBuffer();
        return res.status(200).send(Buffer.from(arrayBuffer));
      }
      return res.status(404).send('File not found');
    } catch (e) {
      return res.status(500).send(e.message);
    }
  }

  if (req.method !== 'POST') {
    return res.status(200).send('Method Not Allowed');
  }

  const ORDER_BOT_TOKEN = process.env.ORDER_BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.ORDER_CHAT_ID;
  const LIVECHAT_BOT_TOKEN = process.env.CHAT_BOT_TOKEN;
  const CHAT_GROUP_ID = process.env.CHAT_GROUP_ID;
  const FIREBASE_URL = process.env.FIREBASE_DB_URL || "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app";

  const body = req.body || {};

  // မြန်မာစံတော်ချိန် (Asia/Yangon) ရက်စွဲနှင့် အချိန် တွက်ချက်ပေးမည့် Helper Function
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

  // စာသားနှင့် ငွေလွှဲပြေစာပုံ တစ်ဆက်တည်း (သို့မဟုတ်) 1024 လုံးကျော်ပါက Message ခွဲပို့ပေးမည့် Helper Function
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
        const matches = slipUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
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
  // ၁။ FRONTEND မှ အော်ဒါသစ် ပို့ဆောင်ခြင်း (ORDER BOT သီးသန့်)
  // -------------------------------------------------------------
  if (body.action === 'sendOrderNotification') {
    const { orderData, messageText, chatId, topicId, slipUrl } = body;

    if (messageText) {
      try {
        const tgData = await sendOrderToTelegram(
          chatId || ADMIN_CHAT_ID,
          topicId,
          messageText,
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
          const name = it.name || it.title || 'ပစ္စည်း';
          const sku = it.sku ? ` (SKU: ${it.sku})` : '';
          const color = it.color || it.selectedColor ? ` [${it.color || it.selectedColor}]` : '';
          const qty = it.qty || 1;
          const price = Number(it.price || 0) * qty;
          return `• ${name}${color}${sku} x${qty}\n  ${price.toLocaleString()} Ks`;
        }).join('\n');
      }

      const timeStr = getMyanmarDateTime();
      const rawDeli = Number(orderData.deliveryFee ?? orderData.deliFee ?? orderData.deliPrice ?? orderData.shippingFee ?? 0) || 0;
      const isHttpSlip = orderData.slipUrl && String(orderData.slipUrl).startsWith('http');

      const orderMessageText = '🚨 <b>အော်ဒါအသစ် ရောက်ရှိပါပြီ!</b>\n' +
        '🆔 <b>Order ID:</b> <code>' + (orderData.id || '-') + '</code>\n' +
        '📅 <b>ရက်စွဲနှင့် အချိန်:</b> ' + timeStr + '\n\n' +
        '👤 <b>ဝယ်သူ:</b> ' + (orderData.customer || 'မဖော်ပြထားပါ') + '\n' +
        '📞 <b>ဖုန်း:</b> ' + (orderData.phone || 'မဖော်ပြထားပါ') + '\n' +
        '📍 <b>လိပ်စာ:</b> ' + (orderData.address || '') + (orderData.township ? ' (' + orderData.township + ')' : '') + '\n' +
        (orderData.busGate || orderData.busGateDetails ? '🚌 <b>ကားဂိတ်:</b> ' + (orderData.busGate || orderData.busGateDetails) + '\n' : '') +
        '🚚 <b>ပို့ဆောင်ရေး:</b> ' + (orderData.deliveryService || orderData.deliveryType || orderData.busLineName || 'Standard Delivery') + '\n' +
        '💳 <b>ငွေပေးချေမှု:</b> ' + (orderData.payment || 'COD') + '\n\n' +
        '🛍 <b>မှာယူထားသော ပစ္စည်းများ:</b>\n' + (itemsText || '- မရှိပါ -') + '\n\n' +
        '💰 <b>ပစ္စည်းကျသင့်ငွေ:</b> ' + (Number(orderData.subTotal || orderData.subtotal || (orderData.total - (orderData.deliveryFee || 0) + (orderData.discount || 0)) || 0)).toLocaleString() + ' Ks\n' +
        (orderData.discount ? '🏷 <b>လျှော့စျေး:</b> -' + (Number(orderData.discount)).toLocaleString() + ' Ks\n' : '') +
        '🚚 <b>ပို့ဆောင်ခ:</b> ' + rawDeli.toLocaleString() + ' Ks\n' +
        '💵 <b>စုစုပေါင်း:</b> <b>' + (Number(orderData.total || 0)).toLocaleString() + ' MMK</b>' +
        (orderData.specialNote ? '\n\n📝 <b>မှတ်ချက်:</b> ' + orderData.specialNote : '') +
        (isHttpSlip ? '\n\n🧾 <b>ငွေလွှဲပြေစာ:</b> ' + orderData.slipUrl : '');

      const tgData = await sendOrderToTelegram(
        chatId || ADMIN_CHAT_ID,
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

      // ၁။ အသံဖိုင် (Base64 Audio) ပါလာပါက Telegram သို့ တိုက်ရိုက်ပို့ပြီး file_id ပြန်ပေးခြင်း
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

      // ၂။ ရိုးရိုး စာသား ပို့ခြင်း
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
          name: body.sessionName || 'Guest User'
        })
      });
      const tgData = await tgRes.json();
      return res.status(200).json(tgData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  // ဝယ်သူ စကားဝိုင်း ဖျက်သည့်အခါ Telegram Forum Topic ကိုပါ တစ်ခါတည်း ဖျက်ပေးခြင်း
  if (body.action === 'deleteForumTopic') {
    try {
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
  // ၂။ TELEGRAM မှ ဝင်လာသော LIVE CHAT WEBHOOK (Reply Quote အမှန်တကယ် ပါဝင်သည်)
  // -------------------------------------------------------------
  const update = body;
  if (!update || !update.message) return res.status(200).send('OK');

  const msg = update.message;
  if (msg.from && msg.from.is_bot) return res.status(200).send('OK');

  const threadId = msg.message_thread_id;
  let text = msg.text || msg.caption || '';
  let replyToText = '';
  // Telegram Topic ထဲတွင် /del ဟု ရိုက်ပို့ပါက Firebase Database နှင့် Telegram Topic နှစ်ခုလုံးကို အပြီးဖျက်ခြင်း
  if (threadId && text.trim().toLowerCase() === '/del') {
    try {
      const sessionsRes = await fetch(`${FIREBASE_URL}/support_chats.json`);
      const sessions = await sessionsRes.json();
      if (sessions) {
        for (const [sId, sVal] of Object.entries(sessions)) {
          if (String(sVal.telegramThreadId) === String(threadId)) {
            await fetch(`${FIREBASE_URL}/support_chats/${sId}.json`, { method: 'DELETE' });
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
  // Telegram Topic ထဲမှ /kpay, /wave, /coupon ရိုက်ပို့ပါက ဝယ်သူ့ဆီ Smart Card တိုက်ရိုက်ပို့ပေးခြင်း
  const cmd = text.trim().toLowerCase();
  if (threadId && (cmd === '/kpay' || cmd === '/wave' || cmd === '/coupon')) {
    try {
      const sessionsRes = await fetch(`${FIREBASE_URL}/support_chats.json`);
      const sessions = await sessionsRes.json();
      let targetSessionId = null;
      if (sessions) {
        for (const [sId, sVal] of Object.entries(sessions)) {
          if (String(sVal.telegramThreadId) === String(threadId)) {
            targetSessionId = sId;
            break;
          }
        }
      }
      if (targetSessionId) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Yangon', hour: '2-digit', minute: '2-digit' });
        let msgObj = null;
        let confirmText = '';

        if (cmd === '/kpay' || cmd === '/wave') {
          const info = cmd === '/wave'
            ? { bank: 'WavePay', name: 'Nu Nu Htwe', phone: '09768124433', qr: 'wave-qr.jpg' }
            : { bank: 'KBZPay', name: 'Ma Win Win Myint', phone: '09768124433', qr: 'kpay-qr.jpg' };
          msgObj = { sender: 'admin', text: `${info.bank} ငွေလွှဲအကောင့်`, mediaUrl: info.qr, mediaType: 'qr_card', cardData: info, timeStr, timestamp: Date.now() };
          confirmText = `✅ ဝယ်သူထံသို့ <b>${info.bank} QR ကတ်</b> ပို့ပေးပြီးပါပြီ။`;
        } else if (cmd === '/coupon') {
          const code = 'VIP' + Math.floor(1000 + Math.random() * 9000);
          msgObj = { sender: 'admin', text: 'အထူးလျှော့ဈေးကူပွန် (2,000 Ks)', mediaType: 'coupon_card', cardData: { code, amount: 2000 }, timeStr, timestamp: Date.now() };
          confirmText = `✅ ဝယ်သူထံသို့ <b>2,000 Ks ကူပွန်ကတ်</b> (<code>${code}</code>) ပို့ပေးပြီးပါပြီ။`;
        }

        if (msgObj) {
          await fetch(`${FIREBASE_URL}/support_chats/${targetSessionId}/messages.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msgObj)
          });
          await fetch(`https://api.telegram.org/bot${LIVECHAT_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_GROUP_ID, message_thread_id: Number(threadId), text: confirmText, parse_mode: 'HTML' })
          });
        }
      }
      return res.status(200).send('OK');
    } catch (e) {
      return res.status(200).send('OK');
    }
  }
  // Telegram တွင် Admin က Reply ထောက်ထားပါက ၎င်း၏ မူရင်းစာသား (သို့) ဓာတ်ပုံကို တိကျစွာ ဖမ်းယူခြင်း
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
        const timeFormatted = getMyanmarDateTime();

        await fetch(`${FIREBASE_URL}/support_chats/${targetSessionId}/messages.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'admin',
            text: text,
            replyTo: replyToText, // Reply Quote မူရင်းစာသား အမှန်တကယ် ပါဝင်သည်
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