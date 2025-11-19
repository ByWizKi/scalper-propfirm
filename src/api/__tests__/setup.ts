/**
 * Configuration pour les tests d'API
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock des APIs Web pour Node.js
global.Request = class Request {
  constructor(
    public input: RequestInfo | URL,
    public _init?: RequestInit
  ) {}
} as any

global.Response = class Response {
  constructor(
    public body?: BodyInit | null,
    public _init?: ResponseInit
  ) {}
} as any

global.Headers = class Headers {
  constructor(_init?: HeadersInit) {}
} as any
