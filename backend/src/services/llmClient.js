// ═══════════════════════════════════════════════════════════════
// LLM CLIENT — Gateway adapter (OpenAI-compatible)
//
// HotelAI always talks to a local LLM gateway over the OpenAI-compatible API.
// The gateway handles routing: to Anthropic, Ollama, or any other backend.
//
// Config (.env):
//   LLM_GATEWAY_URL  — base URL of the gateway  (default: http://localhost:8080/v1)
//   LLM_GATEWAY_KEY  — API key if the gateway requires one (default: not-required)
//   LLM_MODEL        — model name as the gateway expects it (default: claude-sonnet-4-6)
//
// The adapter exposes the same interface as the Anthropic SDK:
//   client.messages.create({ model, max_tokens, system, messages, tools })
//   → { content, stop_reason, usage }
// So all callers work unchanged.
// ═══════════════════════════════════════════════════════════════

import OpenAI from 'openai';

const GATEWAY_URL = process.env.LLM_GATEWAY_URL || 'http://localhost:8080/v1';
const GATEWAY_KEY = process.env.LLM_GATEWAY_KEY || 'not-required';

export const DEFAULT_MODEL = process.env.LLM_MODEL || 'claude-sonnet-4-6';

// ─── Format converters (Anthropic ↔ OpenAI) ──────────────────────────────────

// Convert Anthropic tool definitions → OpenAI function definitions
function toOpenAITools(tools) {
  if (!tools?.length) return undefined;
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema
    }
  }));
}

// Convert Anthropic message history → OpenAI message history
// Anthropic has structured content arrays; OpenAI uses flat role/content messages.
function toOpenAIMessages(system, messages) {
  const result = [];
  if (system) result.push({ role: 'system', content: system });

  for (const msg of messages) {
    if (msg.role === 'user') {
      // Could be plain string or array (tool results)
      if (typeof msg.content === 'string') {
        result.push({ role: 'user', content: msg.content });
      } else if (Array.isArray(msg.content)) {
        // Tool results: [{ type: 'tool_result', tool_use_id, content }]
        for (const block of msg.content) {
          if (block.type === 'tool_result') {
            result.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content)
            });
          } else if (block.type === 'text') {
            result.push({ role: 'user', content: block.text });
          }
        }
      }
    } else if (msg.role === 'assistant') {
      if (typeof msg.content === 'string') {
        result.push({ role: 'assistant', content: msg.content });
      } else if (Array.isArray(msg.content)) {
        // May contain text + tool_use blocks
        const textBlock = msg.content.find(b => b.type === 'text');
        const toolBlocks = msg.content.filter(b => b.type === 'tool_use');

        const assistantMsg = {
          role: 'assistant',
          content: textBlock?.text || null,
        };

        if (toolBlocks.length > 0) {
          assistantMsg.tool_calls = toolBlocks.map(b => ({
            id: b.id,
            type: 'function',
            function: {
              name: b.name,
              arguments: JSON.stringify(b.input)
            }
          }));
        }

        result.push(assistantMsg);
      }
    }
  }

  return result;
}

// Convert OpenAI response → Anthropic-shaped response
function toAnthropicResponse(openaiResponse) {
  const choice = openaiResponse.choices[0];
  const msg = choice.message;
  const content = [];

  if (msg.content) {
    content.push({ type: 'text', text: msg.content });
  }

  if (msg.tool_calls?.length) {
    for (const tc of msg.tool_calls) {
      content.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments)
      });
    }
  }

  const finishReason = choice.finish_reason;
  const stop_reason =
    finishReason === 'tool_calls' ? 'tool_use' :
    finishReason === 'stop'       ? 'end_turn' :
    finishReason;

  return {
    content,
    stop_reason,
    usage: {
      input_tokens: openaiResponse.usage?.prompt_tokens || 0,
      output_tokens: openaiResponse.usage?.completion_tokens || 0
    }
  };
}

// ─── Gateway client (OpenAI-compatible, Anthropic-shaped output) ──────────────

class GatewayClient {
  constructor() {
    this.openai = new OpenAI({ baseURL: GATEWAY_URL, apiKey: GATEWAY_KEY });
    this.messages = {
      create: async (params) => {
        const { model, max_tokens, system, messages, tools } = params;

        const requestParams = {
          model: model || DEFAULT_MODEL,
          max_tokens,
          messages: toOpenAIMessages(system, messages),
        };
        const openaiTools = toOpenAITools(tools);
        if (openaiTools) requestParams.tools = openaiTools;

        const response = await this.openai.chat.completions.create(requestParams);
        return toAnthropicResponse(response);
      }
    };
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _client = null;

export function getLLMClient() {
  if (!_client) {
    console.log(`LLM Gateway: ${GATEWAY_URL} (model: ${DEFAULT_MODEL})`);
    _client = new GatewayClient();
  }
  return _client;
}
