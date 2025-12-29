'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from '@/components/chat-message'
import { Send, Square, Trash2, Settings, Activity } from 'lucide-react'
import { HttpMonitor, HttpLog } from '@/components/http-monitor'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isWebhookSaved, setIsWebhookSaved] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHttpMonitor, setShowHttpMonitor] = useState(false)
  const [httpLogs, setHttpLogs] = useState<HttpLog[]>([])
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentMessageRef = useRef<string>('')

  useEffect(() => {
    const saved = localStorage.getItem('n8n-webhook-url')
    if (saved) {
      setWebhookUrl(saved)
      setIsWebhookSaved(true)
    } else {
      setShowSettings(true)
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const saveWebhookUrl = () => {
    if (!webhookUrl.trim()) {
      alert('Введите URL вебхука')
      return
    }
    try {
      new URL(webhookUrl)
      localStorage.setItem('n8n-webhook-url', webhookUrl)
      setIsWebhookSaved(true)
      setShowSettings(false)
    } catch {
      alert('Некорректный URL')
    }
  }

  const clearWebhookUrl = () => {
    setWebhookUrl('')
    setIsWebhookSaved(false)
    setShowSettings(true)
  }

  const clearChat = () => {
    if (confirm('Очистить всю историю чата?')) {
      setMessages([])
    }
  }

  const clearHttpLogs = () => {
    setHttpLogs([])
  }

  const addHttpLog = (log: Omit<HttpLog, 'id' | 'timestamp'>) => {
    const newLog: HttpLog = {
      ...log,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
    }
    setHttpLogs(prev => [...prev, newLog])
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)
    }
  }

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault()
    
    const message = inputMessage.trim()
    if (!message || !webhookUrl || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsStreaming(true)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    }
    setMessages(prev => [...prev, assistantMessage])
    currentMessageRef.current = ''

    abortControllerRef.current = new AbortController()

    const requestStartTime = Date.now()
    const requestBody = {
      message: message,
      sessionId: getSessionId(),
    }

    addHttpLog({
      type: 'request',
      method: 'POST',
      url: webhookUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    })

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const duration = Date.now() - requestStartTime
        let errorMessage = `HTTP ${response.status}`
        let errorBody = null
        
        try {
          const errorText = await response.text()
          errorBody = JSON.parse(errorText)
          
          if (errorBody.message) {
            errorMessage = errorBody.message
          }
          
          if (errorBody.violations && Array.isArray(errorBody.violations)) {
            errorMessage += `\n\n**Нарушения:**\n${errorBody.violations.map((v: string) => `- ${v}`).join('\n')}`
          }
        } catch (e) {
          // Если не удалось распарсить JSON, используем стандартное сообщение
        }
        
        addHttpLog({
          type: 'error',
          method: 'POST',
          url: webhookUrl,
          status: response.status,
          error: errorMessage,
          body: errorBody,
          duration,
        })
        
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: `⚠️ **Ошибка ${response.status}**\n\n${errorMessage}` }
              : msg
          )
        )
        
        setIsStreaming(false)
        abortControllerRef.current = null
        currentMessageRef.current = ''
        return
      }

      addHttpLog({
        type: 'response',
        method: 'POST',
        url: webhookUrl,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      })

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue

          try {
            const parsed = JSON.parse(line)

            if (parsed.type === 'item' && parsed.content) {
              currentMessageRef.current += parsed.content
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: currentMessageRef.current }
                    : msg
                )
              )
            } else if (parsed.type === 'end') {
              console.log('Stream completed')
            } else if (parsed.type === 'begin') {
              console.log('Stream started')
            }
          } catch (e) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.content) {
                    currentMessageRef.current += parsed.content
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessage.id
                          ? { ...msg, content: currentMessageRef.current }
                          : msg
                      )
                    )
                  }
                } catch (e2) {
                  if (data && data.length > 0) {
                    currentMessageRef.current += data
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessage.id
                          ? { ...msg, content: currentMessageRef.current }
                          : msg
                      )
                    )
                  }
                }
              }
            } else if (line.length > 0) {
              currentMessageRef.current += line + '\n'
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: currentMessageRef.current }
                    : msg
                )
              )
            }
          }
        }
      }

      const duration = Date.now() - requestStartTime
      
      if (currentMessageRef.current === '') {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: 'Не удалось получить ответ от AI' }
              : msg
          )
        )
      }

      addHttpLog({
        type: 'response',
        method: 'POST',
        url: webhookUrl,
        status: 200,
        body: { content: currentMessageRef.current, completed: true },
        duration,
      })
    } catch (error: unknown) {
      const duration = Date.now() - requestStartTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorName = error instanceof Error ? error.name : 'Error'
      
      if (errorName === 'AbortError') {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: currentMessageRef.current || 'Генерация остановлена' }
              : msg
          )
        )
      } else {
        console.error('Error:', error)
        
        addHttpLog({
          type: 'error',
          method: 'POST',
          url: webhookUrl,
          error: errorMessage,
          duration,
        })
        
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: `Ошибка: ${errorMessage}` }
              : msg
          )
        )
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
      currentMessageRef.current = ''
    }
  }

  const getSessionId = () => {
    let sessionId = localStorage.getItem('chat-session-id')
    if (!sessionId) {
      sessionId = 'session-' + Date.now()
      localStorage.setItem('chat-session-id', sessionId)
    }
    return sessionId
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {showSettings && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Настройки вебхука</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Введите URL вашего n8n вебхука для streaming ответов
            </p>
            <Input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n.app/webhook/..."
              className="mb-4"
              onKeyPress={(e) => e.key === 'Enter' && saveWebhookUrl()}
            />
            <div className="flex gap-2">
              <Button onClick={saveWebhookUrl} className="flex-1">
                Сохранить
              </Button>
              {isWebhookSaved && (
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Отмена
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">n8n Streaming Chat</h1>
          <p className="text-xs text-muted-foreground">
            {isWebhookSaved ? 'Подключено' : 'Не настроено'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
            title="Настройки вебхука"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={clearChat}
            disabled={messages.length === 0}
            title="Очистить чат"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant={showHttpMonitor ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowHttpMonitor(!showHttpMonitor)}
            title="HTTP Monitor"
          >
            <Activity className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold mb-2">
                Добро пожаловать в n8n Chat
              </h2>
              <p className="text-muted-foreground">
                Начните диалог с вашим AI ассистентом
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                isStreaming={isStreaming && idx === messages.length - 1}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border bg-card p-4">
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isWebhookSaved
                  ? 'Введите сообщение...'
                  : 'Сначала настройте вебхук'
              }
              disabled={!isWebhookSaved || isStreaming}
              className="flex-1"
            />
            {isStreaming ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={stopGeneration}
                title="Остановить генерацию"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!isWebhookSaved || !inputMessage.trim()}
                title="Отправить сообщение"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isStreaming && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
              Генерация ответа...
            </p>
          )}
        </form>
      </div>

      {showHttpMonitor && (
        <HttpMonitor
          logs={httpLogs}
          onClose={() => setShowHttpMonitor(false)}
          onClear={clearHttpLogs}
        />
      )}
    </div>
  )
}
