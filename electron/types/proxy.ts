import { IncomingMessage, ServerResponse } from 'http'

/**
 * Proxy context interface for http-mitm-proxy
 */
export interface ProxyContext {
  clientToProxyRequest: IncomingMessage
  proxyToClientRequest: unknown
  proxyToServerRequest: unknown
  serverToProxyResponse: unknown
  proxyToClientResponse: ServerResponse
  isSSL: boolean
  filters?: unknown[]
}

/**
 * GA4 request data structure
 */
export interface GA4Request {
  method: string
  url: string
  host: string
  timestamp: number
  type: 'ga4' | 'unknown'
  eventName?: string
  params?: Record<string, string>
}

/**
 * Proxy error structure
 */
export interface ProxyError extends Error {
  code?: string
  errno?: number
  syscall?: string
}
