import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { X, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HttpLog {
  id: string
  timestamp: Date
  type: 'request' | 'response' | 'error'
  method?: string
  url?: string
  status?: number
  headers?: Record<string, string>
  body?: unknown
  error?: string
  duration?: number
}

interface HttpMonitorProps {
  logs: HttpLog[]
  onClose: () => void
  onClear: () => void
}

export function HttpMonitor({ logs, onClose, onClear }: HttpMonitorProps) {
  const [expandedLogs, setExpandedLogs] = React.useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  const formatJson = (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-card border-l border-border shadow-2xl z-40 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">HTTP Monitor</h2>
          <p className="text-xs text-muted-foreground">
            {logs.length} {logs.length === 1 ? 'запрос' : 'запросов'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onClear}
            disabled={logs.length === 0}
            title="Очистить логи"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            title="Закрыть панель"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-muted-foreground">
              <p className="text-sm">Нет записей</p>
              <p className="text-xs mt-1">HTTP-запросы будут отображаться здесь</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const isExpanded = expandedLogs.has(log.id)
              
              return (
                <div
                  key={log.id}
                  className={cn(
                    'border rounded-lg overflow-hidden',
                    log.type === 'request' && 'border-blue-500/50 bg-blue-500/5',
                    log.type === 'response' && 'border-green-500/50 bg-green-500/5',
                    log.type === 'error' && 'border-red-500/50 bg-red-500/5'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(log.id)}
                    className="w-full p-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                'text-xs font-mono px-2 py-0.5 rounded',
                                log.type === 'request' && 'bg-blue-500 text-white',
                                log.type === 'response' && 'bg-green-500 text-white',
                                log.type === 'error' && 'bg-red-500 text-white'
                              )}
                            >
                              {log.type.toUpperCase()}
                            </span>
                            {log.method && (
                              <span className="text-xs font-mono font-semibold">
                                {log.method}
                              </span>
                            )}
                            {log.status && (
                              <span
                                className={cn(
                                  'text-xs font-mono',
                                  log.status >= 200 && log.status < 300 && 'text-green-500',
                                  log.status >= 400 && 'text-red-500'
                                )}
                              >
                                {log.status}
                              </span>
                            )}
                            {log.duration && (
                              <span className="text-xs text-muted-foreground">
                                {log.duration}ms
                              </span>
                            )}
                          </div>
                          {log.url && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {log.url}
                            </p>
                          )}
                          {log.error && (
                            <p className="text-xs text-red-500 mt-1">
                              {log.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-3 bg-background/50">
                      {log.headers && Object.keys(log.headers).length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-xs font-semibold mb-2">Headers:</h4>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {formatJson(log.headers)}
                          </pre>
                        </div>
                      )}
                      
                      {log.body && (
                        <div>
                          <h4 className="text-xs font-semibold mb-2">
                            {log.type === 'request' ? 'Request Body:' : 'Response Body:'}
                          </h4>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-[300px]">
                            {formatJson(log.body)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
