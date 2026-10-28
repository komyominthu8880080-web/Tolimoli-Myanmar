export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  const chatBotToken = '8900618964:AAF-CceJIWtn3in19vLP4-kOxBzZyrfYJUY';
  const body = req.body || {};

  // -------------------------------------------------------------
  // ၁။ FRONTEND မှ အော်ဒါအသစ် အသိပေးချက် ပေးပို့ခြင်း (OUTBOUND ORDER)
  // -------------------------------------------------------------
  if (body.action === 'sendOrderNotification') {
    const { chatId, topicId, messageText } = body;
    if (!chatId || !messageText) {
      return res.status(400).json({ error: 'Missing chatId or messageText' });
    }

    try {
      const payload = {
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML'
      };
      if (topicId) payload.message_thread_id = topicId;

      const tgRes = await fetch(`https://api.telegram.org/bot${chatBotToken}/sendMessage`, {
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
  // ၂။ TELEGRAM မှ ဝင်လာသော INBOUND SUPPORT CHAT WEBHOOK
  // -------------------------------------------------------------
  const update = body;
  if (!update || !update.message) return res.status(200).send('OK');

  const msg = update.message;
  // Bot ကိုယ်တိုင် ပို့သော စာဖြစ်ပါက ပြန်မထည့်ပါ
  if (msg.from && msg.from.is_bot) return res.status(200).send('OK');

  // Telegram Group Topic ID
  const threadId = msg.message_thread_id;

  // စာသား သို့မဟုတ် Caption ကို ရယူခြင်း
  let text = msg.text || msg.caption || '';
  let mediaUrl = '';
  let mediaType = '';
  let fileId = null;

  // ဓာတ်ပုံ ပို့လာပါက စစ်ဆေးခြင်း
  if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
    const highestResPhoto = msg.photo[msg.photo.length - 1];
    fileId = highestResPhoto.file_id;
    mediaType = 'image';
  }
  // ဗီဒီယို ပို့လာပါက စစ်ဆေးခြင်း
  else if (msg.video) {
    fileId = msg.video.file_id;
    mediaType = 'video';
  } else if (msg.video_note) {
    fileId = msg.video_note.file_id;
    mediaType = 'video';
  }

  // ဓာတ်ပုံ သို့မဟုတ် ဗီဒီယို ပါပါက Telegram ဆီမှ Direct Media Link ဆွဲယူခြင်း
  if (fileId) {
    try {
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${chatBotToken}/getFile?file_id=${fileId}`);
      const fileInfo = await fileInfoRes.json();
      if (fileInfo.ok && fileInfo.result && fileInfo.result.file_path) {
        mediaUrl = `https://api.telegram.org/file/bot${chatBotToken}/${fileInfo.result.file_path}`;
      }
    } catch (err) {
      console.error('Error fetching Telegram media:', err);
    }
  }

  // စာသား၊ ဓာတ်ပုံ သို့မဟုတ် ဗီဒီယို တစ်ခုခု ပါရှိမှသာ လုပ်ဆောင်မည်
  if (threadId && (text || mediaUrl)) {
    const firebaseUrl = "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app";

    try {
      // support_chats စာရင်းထဲမှ သက်ဆိုင်ရာ Thread ID ရှိသော Guest အခန်းကို ရှာဖွေခြင်း
      const searchRes = await fetch(`${firebaseUrl}/support_chats.json`);
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

      // သက်ဆိုင်ရာ Guest Session တွေ့ရှိပါက Firebase messages ထဲသို့ ထည့်သွင်းခြင်း
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

        // Messages စာရင်းထဲ ထည့်သွင်းခြင်း
        await fetch(`${firebaseUrl}/support_chats/${targetSessionId}/messages.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adminMsgPayload)
        });

        // နောက်ဆုံးစာကို မွမ်းမံခြင်း
        await fetch(`${firebaseUrl}/support_chats/${targetSessionId}.json`, {
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