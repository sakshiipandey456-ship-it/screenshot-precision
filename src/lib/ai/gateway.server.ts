import { GatewayError, generateResponse } from "@lovable.dev/ai-gateway";

export const ADVISOR_MODEL = "openai/gpt-6.1-sol";

export class AiUnavailableError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type AiMessage =
  | { role: "user" | "assistant"; content: string }
  | { role: "user"; content: ({ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "auto" })[] };

/** Maps gateway failures to short messages that are safe to show to users. */
function toUnavailable(err: unknown): AiUnavailableError {
  if (err instanceof AiUnavailableError) return err;
  if (err instanceof GatewayError) {
    console.error("AI gateway error", err.code, err.httpStatus, err.ids);
    switch (err.code) {
      case "payment_required":
        return new AiUnavailableError("AI credits have run out for this app. The built-in analysis is shown instead.", 402);
      case "rate_limited":
        return new AiUnavailableError("Compass AI is busy right now. Please try again in a minute.", 429);
      case "permission_denied":
        return new AiUnavailableError("AI access is currently blocked for this app.", 403);
      case "configuration_error":
      case "authentication_error":
        return new AiUnavailableError("AI is not configured for this app yet.", 401);
      default:
        return new AiUnavailableError("The AI service is temporarily unavailable.", err.httpStatus ?? 500);
    }
  }
  console.error("AI call failed", err);
  return new AiUnavailableError("The AI service is temporarily unavailable.", 500);
}

/** Collects the assistant's text from a Responses result. */
function outputText(res: unknown): string {
  const output = (res as { output?: { type?: string; content?: { type?: string; text?: string }[] }[] }).output ?? [];
  return output
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("")
    .trim();
}

export async function generateTextStreamed(instructions: string, messages: AiMessage[]): Promise<string> {
  try {
    const res = await generateResponse({ model: ADVISOR_MODEL, instructions, input: messages, reasoning: { effort: "low" } });
    const text = outputText(res);
    if (!text) throw new AiUnavailableError("Compass AI returned an empty answer.", 502);
    return text;
  } catch (err) {
    throw toUnavailable(err);
  }
}

/** Strict-JSON answer parsed into T. */
export async function generateObjectStreamed<T>(instructions: string, messages: AiMessage[], schema: Record<string, unknown>): Promise<T> {
  try {
    const res = await generateResponse({
      model: ADVISOR_MODEL,
      instructions,
      input: messages,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "result", strict: true, schema } },
    });
    const text = outputText(res);
    if (!text) throw new AiUnavailableError("Compass AI returned an empty answer.", 502);
    return JSON.parse(text) as T;
  } catch (err) {
    throw toUnavailable(err);
  }
}
