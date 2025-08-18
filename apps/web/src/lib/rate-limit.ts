// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";
import { NextRequest, NextResponse } from "next/server";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export const baseRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
  analytics: true,
  prefix: "rate-limit",
});

export async function rateLimiter(request: NextRequest) {
  try {
    const ip = request.ip ?? "127.0.0.1";
    const { success } = await baseRateLimit.limit(ip);
    
    return {
      status: success ? 200 : 429,
      response: success ? null : NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      )
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    return {
      status: 500,
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    };
  }
}
