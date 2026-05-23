'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

const SUGGESTED_PROMPTS = [
  "Am I ready to race this weekend?",
  "How has my fitness evolved over the last 3 months?",
  "What's my best 20-minute power?",
  "Suggest a recovery workout for today",
  "Which week had my highest training load this year?",
]

interface Message {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export function ChatWindow({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return

    const userMsg: Message = { role: 'user', content: content.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) throw new Error('Request failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      const accumulated = { content: '' }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const { text, error } = JSON.parse(data)
            if (error) throw new Error(error)
            if (text) {
              accumulated.content += text
              const current = accumulated.content
              setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: current },
              ])
            }
          } catch (_) { /* ignore parse errors */ }
        }
      }
    } catch (_) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] gap-4">
      {/* Suggested prompts — desktop sidebar */}
      <div className="hidden md:flex flex-col w-52 shrink-0 gap-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Suggested Questions</p>
        {SUGGESTED_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="text-left text-xs bg-secondary hover:bg-secondary/70 rounded-lg px-3 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat panel */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile prompt chips */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 mb-2">
          {SUGGESTED_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="shrink-0 text-xs bg-secondary rounded-full px-3 py-1.5 text-muted-foreground whitespace-nowrap"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-primary" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M3 12h4l3-9 4 18 3-9h4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="font-medium mb-1">FitDash AI Coach</p>
              <p className="text-muted-foreground text-sm max-w-xs">Ask me anything about your training — fitness trends, workout suggestions, race readiness, and more.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-primary" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M3 12h4l3-9 4 18 3-9h4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-card border border-white/5 text-foreground rounded-tl-sm'
              }`}>
                {msg.content
                  ? <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  : <span className="inline-block w-4 h-4 rounded-full bg-muted-foreground/40 animate-pulse" />
                }
                {msg.created_at && (
                  <p className="text-[10px] opacity-50 mt-1">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="mt-3 flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your coach…"
              rows={1}
              className="w-full resize-none rounded-xl border border-white/10 bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-32 overflow-y-auto"
              style={{ minHeight: 48 }}
            />
          </div>
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-12 w-12 shrink-0 rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-xl text-muted-foreground"
              onClick={() => setMessages([])}
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
