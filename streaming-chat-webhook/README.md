# n8n Streaming Chat

Современный чат-интерфейс для работы с n8n AI workflows с поддержкой streaming ответов.

## Возможности

- 🎨 **Темная тема** с красным акцентным цветом
- 💬 **Streaming ответы** в реальном времени
- 📝 **Markdown форматирование** сообщений
- 🔒 **Basic Authentication** для защиты доступа
- ⏹️ **Остановка генерации** в любой момент
- 🗑️ **Очистка истории** чата
- ⚙️ **Настройка webhook URL** через UI
- 📱 **Адаптивный дизайн** в стиле ChatGPT
- 🔍 **HTTP Monitor** - отладка запросов/ответов в реальном времени

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env.local` на основе `.env.example`:
```bash
cp .env.example .env.local
```

3. Настройте учетные данные в `.env.local`:
```env
BASIC_AUTH_USER=your_username
BASIC_AUTH_PASSWORD=your_password
```

## Запуск

### Режим разработки
```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3000

### Production сборка
```bash
npm run build
npm start
```

## Использование

1. При первом запуске откроется окно настроек
2. Введите URL вашего n8n webhook для streaming
3. Начните диалог с AI ассистентом
4. Используйте кнопки для управления:
   - ⚙️ Настройки - изменить webhook URL
   - 🗑️ Очистить - удалить историю чата
   - 📊 HTTP Monitor - просмотр всех HTTP-запросов и ответов
   - ⏹️ Остановить - прервать генерацию ответа

### HTTP Monitor

Панель HTTP Monitor позволяет отслеживать все входящие и исходящие HTTP-запросы в реальном времени:

- **Просмотр запросов** - метод, URL, headers, body
- **Просмотр ответов** - status code, headers, streaming content
- **Отслеживание ошибок** - детальная информация об ошибках
- **Измерение времени** - длительность каждого запроса
- **Раскрываемые детали** - клик для просмотра полной информации
- **Цветовая индикация** - синий (request), зеленый (response), красный (error)

Для открытия панели нажмите кнопку 📊 в правом верхнем углу.

## Формат n8n Webhook

Webhook должен возвращать streaming ответ в одном из форматов:

### JSON формат (рекомендуется)
```json
{"type":"begin"}
{"type":"item","content":"Текст"}
{"type":"item","content":" ответа"}
{"type":"end"}
```

### SSE формат
```
data: {"content":"Текст"}
data: {"content":" ответа"}
data: [DONE]
```

## Технологии

- **Next.js 14** - React фреймворк
- **TypeScript** - типизация
- **Tailwind CSS** - стилизация
- **shadcn/ui** - UI компоненты
- **react-markdown** - рендеринг Markdown
- **Lucide React** - иконки

## Структура проекта

```
streaming-chat-webhook/
├── app/
│   ├── layout.tsx          # Root layout с темной темой
│   ├── page.tsx            # Основной чат интерфейс
│   └── globals.css         # Глобальные стили
├── components/
│   ├── ui/                 # shadcn/ui компоненты
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── scroll-area.tsx
│   └── chat-message.tsx    # Компонент сообщения
├── lib/
│   └── utils.ts            # Утилиты
├── middleware.ts           # Basic Auth middleware
└── package.json
```

## Безопасность

Приложение защищено Basic Authentication. При первом входе браузер запросит логин и пароль, указанные в `.env.local`.

## Курс n8n 2.0

Этот проект создан для курса "n8n 2.0" как тренировочный инструмент для работы со streaming AI workflows.
