/**
 * Configuration pour les tests d'API
 */

// Mock des APIs Web pour Node.js
// Utilisation de type assertions pour les mocks globaux nécessaires aux tests
global.Request = class Request {
  constructor(
    public input: RequestInfo | URL,
    public _init?: RequestInit
  ) {}
} as unknown as typeof Request

global.Response = class Response {
  constructor(
    public body?: BodyInit | null,
    public _init?: ResponseInit
  ) {}
} as unknown as typeof Response

global.Headers = class Headers {
  constructor(_init?: HeadersInit) {}
} as unknown as typeof Headers
