import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'
import ReactMarkdown from 'react-markdown'
import { 
  Send, 
  Plus, 
  Menu, 
  LogOut, 
  MessageSquare,
  Loader2,
  User,
  Bot,
  Trash2,
  X
} from 'lucide-react'
import clsx from 'clsx'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  conversationId: string
  title: string
  updatedAt: string
}

export default function Chat() {
  const { user, logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [streamingContent, setStreamingContent] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const loadConversations = async () => {
    const response = await api.get<{ conversations: Conversation[] }>('/conversations')
    if (response.success && response.data) {
      setConversations(response.data.conversations)
    }
  }

  const loadConversation = async (id: string) => {
    const response = await api.get<{ messages: Message[] }>(`/conversations/${id}`)
    if (response.success && response.data) {
      setMessages(response.data.messages || [])
      setConversationId(id)
    }
  }

  const startNewChat = () => {
    setMessages([])
    setConversationId(null)
    setStreamingContent('')
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await api.delete(`/conversations/${id}`)
    setConversations(prev => prev.filter(c => c.conversationId !== id))
    if (conversationId === id) {
      startNewChat()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    try {
      await api.streamChat(
        userMessage.content,
        conversationId || undefined,
        // On chunk
        (content) => {
          setStreamingContent(prev => prev + content)
        },
        // On done
        (newConversationId) => {
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: streamingContent,
          }
          setMessages(prev => [...prev, assistantMessage])
          setStreamingContent('')
          setConversationId(newConversationId)
          loadConversations() // Refresh sidebar
        },
        // On error
        (error) => {
          console.error('Chat error:', error)
          setStreamingContent('')
        }
      )
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle textarea auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="h-screen bg-primary-800 flex">
      {/* Sidebar */}
      <aside
        className={clsx(
          'bg-primary-900 border-r border-white/10 flex flex-col transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-4 py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2">
          {conversations.map((conv) => (
            <button
              key={conv.conversationId}
              onClick={() => loadConversation(conv.conversationId)}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition group',
                conversationId === conv.conversationId
                  ? 'bg-primary-700 text-white'
                  : 'text-gray-400 hover:bg-primary-800 hover:text-white'
              )}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => deleteConversation(conv.conversationId, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </button>
          ))}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-secondary-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate">{user?.name}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-white transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-white/10 flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-white font-medium">
            {conversationId ? 'Conversation' : 'New Chat'}
          </h1>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !streamingContent ? (
            // Empty State
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-secondary-500/20 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-secondary-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Start a conversation
              </h2>
              <p className="text-gray-400 max-w-md">
                Ask me anything! I can help with coding, writing, analysis, and more.
                I support both English and Urdu.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4 px-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    'flex gap-4 mb-6 message-enter',
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      msg.role === 'user' ? 'bg-secondary-500' : 'bg-primary-600'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-secondary-500" />
                    )}
                  </div>
                  <div
                    className={clsx(
                      'flex-1 rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-secondary-500 text-white'
                        : 'bg-primary-700 text-gray-100'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="markdown-content prose prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming Message */}
              {streamingContent && (
                <div className="flex gap-4 mb-6 message-enter">
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-secondary-500" />
                  </div>
                  <div className="flex-1 bg-primary-700 rounded-2xl px-4 py-3 text-gray-100">
                    <div className="markdown-content prose prose-invert max-w-none">
                      <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    </div>
                    <span className="typing-cursor">▌</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative bg-primary-700 rounded-2xl border border-white/10 focus-within:border-secondary-500 transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="w-full bg-transparent text-white placeholder-gray-500 px-4 py-3 pr-12 resize-none focus:outline-none max-h-[200px]"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 p-2 bg-secondary-500 hover:bg-secondary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-center text-gray-500 text-xs mt-2">
              BaatCheet can make mistakes. Consider checking important information.
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
