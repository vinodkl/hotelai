// ═══════════════════════════════════════════════════════════════
// LLM CLIENT — Unified adapter for Anthropic and Ollama (OpenAI-compatible)
//
// Set LLM_PROVIDER in .env to switch:
//   LLM_PROVIDER=anthropic  → uses Anthropic API (default)
//   LLM_PROVIDER=ollama     → uses local Ollama at OLLAMA_BASE_URL
//
// Set OLLAMA_MODEL to choose the model (default: llama3.1)
// Note: For agent/tool-use phases, use a model that supports function calling,
//       e.g. llama3.1, mistral-nemo, qwen2.5, etc.
//
// The adapter exposes the same interface as the Anthropic SDK:
//   client.messages.create({ model, max_tokens, system, messages, tools })
//   → { content, stop_reason, usage }
// So all callers work unchanged regardless of provider.
// ═══════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const PROVIDER = process.env.LLM_PROVIDER || 'anthropic';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

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

// ─── Ollama adapter (OpenAI-compatible, Anthropic-shaped output) ──────────────

class OllamaClient {
  constructor() {
    this.openai = new OpenAI({
      baseURL: OLLAMA_BASE_URL,
      apiKey: 'ollama' // required by the SDK but not validated by Ollama
    });
    this.messages = {
      create: async (params) => {
        const { model, max_tokens, system, messages, tools } = params;
        const resolvedModel = model.startsWith('ollama:') ? model.slice(7) : OLLAMA_MODEL;

        const openaiMessages = toOpenAIMessages(system, messages);
        const openaiTools = toOpenAITools(tools);

        const requestParams = {
          model: resolvedModel,
          max_tokens,
          messages: openaiMessages,
        };
        if (openaiTools) requestParams.tools = openaiTools;

        const response = await this.openai.chat.completions.create(requestParams);
        return toAnthropicResponse(response);
      }
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _client = null;

export function getLLMClient() {
  if (_client) return _client;

  if (PROVIDER === 'ollama') {
    console.log(`🦙 LLM Provider: Ollama at ${OLLAMA_BASE_URL} (model: ${OLLAMA_MODEL})`);
    _client = new OllamaClient();
  } else {
    console.log(`🤖 LLM Provider: Anthropic`);
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  return _client;
}

export const DEFAULT_MODEL = PROVIDER === 'ollama' ? OLLAMA_MODEL : 'claude-sonnet-4-6';
