const PROPS = PropertiesService.getScriptProperties();
const SENDER_WHITELIST = [
  'a***b@yandex.ru',
  'i***y@gmail.com',
  'admin@sample.ru',
];
const STATE_KEY = 'LAST_PROCESSED_TS';

const MY_EMAIL = 'irvicon@gmail.com'; // your gmail
const NEWER_THAN_DAYS = 1;
const SNIPPET_CHARS = 500;

function buildQuery() {
  const newer = `newer_than:${NEWER_THAN_DAYS}d in:inbox`;
  if (SENDER_WHITELIST.length === 0) return newer;
  const senders = SENDER_WHITELIST.join(' OR ');
  return `from:(${senders}) ${newer}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]
  );
}

function checkInbox() {
  const me = MY_EMAIL.toLowerCase();
  const lastProcessedTs = Number(PROPS.getProperty(STATE_KEY) || 0);
  const threads = GmailApp.search(buildQuery(), 0, 50);

  let maxSeenTs = lastProcessedTs;
  const messagesToNotify = [];

  for (const thread of threads) {
    for (const message of thread.getMessages()) {
      const ts = message.getDate().getTime();
      if (ts <= lastProcessedTs) continue;

      const from = message.getFrom().toLowerCase();
      if (from.includes(me)) continue;

      messagesToNotify.push(message);
      if (ts > maxSeenTs) maxSeenTs = ts;
    }
  }

  messagesToNotify.sort(
    (a, b) => a.getDate().getTime() - b.getDate().getTime()
  );

  let lastSuccessfulTs = lastProcessedTs;
  for (const message of messagesToNotify) {
    const ok = notify(message);
    if (!ok) break;
    lastSuccessfulTs = message.getDate().getTime();
  }

  if (lastSuccessfulTs > lastProcessedTs) {
    PROPS.setProperty(STATE_KEY, String(lastSuccessfulTs));
  }
}

function notify(message) {
  const token = PROPS.getProperty('TG_BOT_TOKEN');
  const chatId = PROPS.getProperty('TG_CHAT_ID');

  if (!token || !chatId) {
    console.error('TG_BOT_TOKEN или TG_CHAT_ID не заданы в Script Properties');
    return false;
  }

  const text = [
    '📬 <b>Новое письмо</b>',
    '',
    `<b>От:</b> ${escapeHtml(message.getFrom())}`,
    `<b>Тема:</b> ${escapeHtml(message.getSubject())}`,
    `<b>Дата:</b> ${escapeHtml(message.getDate().toLocaleString('ru-RU'))}`,
    '',
    escapeHtml(message.getPlainBody().slice(0, SNIPPET_CHARS)),
  ].join('\n');

  const threadId = message.getThread().getId();
  const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${threadId}`;

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: JSON.stringify({
      inline_keyboard: [[{ text: '✉️ Открыть в Gmail', url: gmailUrl }]],
    }),
  };

  const response = UrlFetchApp.fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    }
  );

  if (response.getResponseCode() !== 200) {
    console.error(`Telegram API error: ${response.getContentText()}`);
    return false;
  }

  return true;
}
