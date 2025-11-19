/**
 * Configuration pour les tests d'API
 */

// Mock des APIs Web pour Node.js
global.Request = class Request {
  constructor(
    public input: RequestInfo | URL,
    public init?: RequestInit
  ) {}
} as any

global.Response = class Response {
  constructor(
    public body?: BodyInit | null,
    public init?: ResponseInit
  ) {}
} as any

global.Headers = class Headers {
  constructor(init?: HeadersInit) {}
} as any

