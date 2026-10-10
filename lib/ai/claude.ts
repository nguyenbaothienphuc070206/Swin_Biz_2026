import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { assertSafeGeneratedText } from "./safety";
import type { AIRequestMeter } from "./metering";

type OutputSchema<T extends z.ZodType> = { name: string; schema: T; jsonSchema: Record<string, unknown> };

export class ClaudeJsonClient {
  private readonly client: Anthropic;
  constructor(apiKey = process.env.ANTHROPIC_API_KEY, private readonly model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5") {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required on the server");
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 20_000 });
  }

  async generate<T extends z.ZodType>(system: string, input: unknown, output: OutputSchema<T>, meter?: AIRequestMeter): Promise<z.infer<T>> {
    let lastError: unknown;
    for (let formatAttempt = 0; formatAttempt < 2; formatAttempt += 1) {
      const startedAt = performance.now();
      let response: Awaited<ReturnType<Anthropic["messages"]["create"]>>;
      try {
        response = await this.client.messages.create({
          model: this.model,
          max_tokens: 600,
          system: formatAttempt === 0 ? system : `${system}\nLần trước đầu ra không hợp lệ. Hãy tạo lại đúng JSON schema và quy tắc an toàn.`,
          messages: [{ role: "user", content: JSON.stringify(input) }],
          output_config: { format: { type: "json_schema", schema: output.jsonSchema } },
        });
        meter?.recordGeneration({ model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, durationMs: performance.now() - startedAt });
      } catch (error) {
        meter?.recordGeneration({ model: this.model, durationMs: performance.now() - startedAt });
        throw error;
      }
      const text = response.content.find((block) => block.type === "text");
      if (!text || response.stop_reason === "refusal" || response.stop_reason === "max_tokens") throw new Error("AI_RESPONSE_INCOMPLETE");
      try {
        const parsed = output.schema.parse(JSON.parse(text.text));
        for (const value of Object.values(parsed as unknown as Record<string, unknown>)) if (typeof value === "string") {
          try { assertSafeGeneratedText(value); }
          catch (error) { meter?.markSafetyBlocked(); throw error; }
        }
        return parsed;
      } catch (error) {
        lastError = error;
        if (error instanceof Error && error.message === "UNSAFE_AI_OUTPUT") throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("AI_OUTPUT_VALIDATION_FAILED");
  }
}
