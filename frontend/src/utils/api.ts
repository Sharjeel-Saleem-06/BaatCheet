const API_BASE = '/api/v1'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })
      return await response.json()
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  async post<T = unknown>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      })
      return await response.json()
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  async put<T = unknown>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      })
      return await response.json()
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })
      return await response.json()
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  // Stream chat messages
  async streamChat(
    message: string,
    conversationId?: string,
    onChunk?: (content: string) => void,
    onDone?: (messageId: string) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ message, conversationId }),
      })

      if (!response.ok) {
        const error = await response.json()
        onError?.(error.error || 'Chat request failed')
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        onError?.('No response body')
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'content' && data.content) {
                onChunk?.(data.content)
              } else if (data.type === 'done') {
                onDone?.(data.messageId)
              } else if (data.type === 'error') {
                onError?.(data.error)
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      onError?.('Stream error')
    }
  }
}

export const api = new ApiClient()
