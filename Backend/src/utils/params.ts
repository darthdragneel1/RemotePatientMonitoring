import { Request } from "express";

/**
 * Express 5 types route params as `string | string[]` to account for
 * wildcard segments; every route in this app uses plain `:name` segments,
 * which are always a single string at runtime.
 */
export function param(req: Request, name: string): string {
  return req.params[name] as string;
}
