/**
 * Configuration pour les tests d'API
 */

// Mock des APIs Web pour Node.js
global.Request = class Request {
  constructor(
    public input: RequestInfo | URL,
    public init?: RequestInit
  ) {}
} as typeof Request

global.Response = class Response {
  constructor(
    public body?: BodyInit | null,
    public init?: ResponseInit
  ) {}
} as typeof Response

global.Headers = class Headers {
  constructor(_init?: HeadersInit) {}
} as typeof Headers
