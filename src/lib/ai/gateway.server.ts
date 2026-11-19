import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, Output, jsonSchema, streamText, type ModelMessage } from "ai";
import type { JSONSchema7 } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const ADVISOR_MODEL = "openai/gpt-6.1-sol";

export class AiUnavailableError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function provider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiUnavailableError("AI is not configured for this app yet.", 401);
  const runId = createLovableAiGatewayRunIdFetch();
  return createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runId.fetch,
  });
}

function toUnavailable(err: unknown): AiUnavailableError {
  if (err instanceof AiUnavailableError) return err;
  if (APICallError.isInstance(err)) {
    const status = err.statusCode ?? 500;
    let msg = "";
    try {
      const body = JSON.parse(err.responseBody ?? "{}") as { message?: string; error?: { message?: string } };
      msg = body.message ?? body.error?.message ?? "";
    } catch {
      /* ignore */
    }
    if (status === 402) return new AiUnavailableError(msg || "AI credits have run out for this app.", 402);
    if (status === 429) return new AiUnavailableError("Compass AI is busy right now. Please try again in a minute.", 429);
    if (status === 403) return new AiUnavailableError(msg || "AI access is currently blocked for this app.", 403);
    return new AiUnavailableError(msg || "The AI service is temporarily unavailable.", status);
  }
  return new AiUnavailableError("The AI service is temporarily unavailable.", 500);
}

const providerOptions = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

/** Streams a Responses call and returns the final text (consumed server-side). */
export async function generateTextStreamed(instructions: string, messages: ModelMessage[], signal?: AbortSignal): Promise<string> {
  try {
    const result = streamText({
      model: provider().responses(ADVISOR_MODEL),
      instructions,
      messages,
      ...(signal ? { abortSignal: signal } : {}),
      providerOptions,
    });
    let text = "";
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") text += part.text;
      if (part.type === "error") throw part.error;
    }
    if (!text.trim()) throw new AiUnavailableError("Compass AI returned an empty answer.", 502);
    return text.trim();
  } catch (err) {
    throw toUnavailable(err);
  }
}

/** Streams a Responses call with a strict JSON schema and returns the parsed object. */
export async function generateObjectStreamed<T>(instructions: string, messages: ModelMessage[], schema: JSONSchema7): Promise<T> {
  try {
    const result = streamText({
      model: provider().responses(ADVISOR_MODEL),
      instructions,
      messages,
      output: Output.object({ schema: jsonSchema<T>(schema) }),
      providerOptions,
    });
    for await (const part of result.fullStream) {
      if (part.type === "error") throw part.error;
    }
    return (await result.output) as T;
  } catch (err) {
    throw toUnavailable(err);
  }
}
