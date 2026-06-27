# Gmail → Telegram Notifier

Google Apps Script, который раз в запуск проверяет входящие в Gmail по
whitelist отправителей и шлёт уведомления о новых письмах в Telegram.

## Что делает

- Ищет в `inbox` письма `newer_than:1d` от адресов из `SENDER_WHITELIST`.
- Игнорирует письма, в которых `From` содержит ваш собственный email
  (анти-эхо, чтобы не получать уведомления о собственных отправлениях).
- Отправляет в Telegram сообщение с темой, отправителем, датой и сниппетом
  тела (до `SNIPPET_CHARS` символов) + inline-кнопкой «Открыть в Gmail».
- Хранит метку времени последнего успешно обработанного письма в
  `PropertiesService.getScriptProperties()` под ключом `LAST_PROCESSED_TS`,
  чтобы не дублировать уведомления при повторных запусках.

## Структура

```txt
.
├── mail-check.gs     # единственный файл скрипта
├── .gitignore
└── README.md
```

Всё, что не в `mail-check.gs`, — это инфраструктура репозитория. Сам код
GAS живёт в Google, репозиторий хранит только исходник.

## Настройка в Google Apps Script

1. Откройте [script.google.com](https://script.google.com), создайте проект.
2. Скопируйте содержимое `mail-check.gs` в редактор (либо привяжите проект
   через `clasp` — см. ниже).
3. Замените в коде:
   - `MY_EMAIL` — ваш Gmail, на который приходят письма.
   - `SENDER_WHITELIST` — список адресов/паттернов отправителей.
   - При желании — `NEWER_THAN_DAYS`, `SNIPPET_CHARS`.
4. В **Project Settings → Script Properties** добавьте секреты:
   - `TG_BOT_TOKEN` — токен Telegram-бота (получить у `@BotFather`).
   - `TG_CHAT_ID` — ID чата, куда слать уведомления (можно узнать через
     `https://api.telegram.org/bot<TOKEN>/getUpdates`).
5. В разделе **Triggers** добавьте триггер на функцию `checkInbox` —
   например, раз в 5–15 минут (`Time-driven`).

> **Важно.** Секреты хранятся в Script Properties и **не** коммитятся.
> Код читает их через `PropertiesService.getScriptProperties().getProperty(...)`.

## Запуск вручную

- Через редактор GAS: выберите функцию `checkInbox` → **Run**.
- Через `clasp`:

  ```bash
  clasp push          # залить код
  clasp run checkInbox # запустить функцию
  ```

## Опционально: clasp

Если хотите редактировать код локально и пушить его в GAS:

```bash
npm install -g @google/clasp
clasp login
clasp create --type standalone --title "Gmail Notifier"
# вставьте scriptId из .clasp.json в свой проект, затем:
clasp push
```

Файл `.clasp.json` создаётся автоматически и содержит `scriptId` +
`rootDir` — в репозиторий его коммитить безопасно, но если у вас в нём
личные `token`/`oauth` — добавьте в `.gitignore`.

## Известные особенности

- Триггеры GAS не срабатывают чаще, чем раз в минуту; разумный интервал —
  5–15 минут, чтобы не упираться в квоту `UrlFetchApp`.
- `GmailApp.search` возвращает максимум 50 тредов за вызов — текущий
  лимит зашит в коде. Если писем больше, инкрементальный курсор
  (`LAST_PROCESSED_TS`) всё равно отработает корректно.
- При первом запуске `LAST_PROCESSED_TS = 0`, и в Telegram уйдут все
  письма за последние `NEWER_THAN_DAYS` дней, подходящие под whitelist.
  Если это нежелательно — один раз установите `LAST_PROCESSED_TS` вручную
  через Script Properties на нужный unix-timestamp.

## Лицензия

Используйте как угодно.
