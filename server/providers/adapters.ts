import type { Message, CapabilityType, RawModel, ChatOptions, ImageOptions, ImageResult, AnalysisOptions, TranscribeOptions, TTSOptions, AudioResult, UsageData } from '../types';

export interface ProviderAdapter {
  readonly providerId: string;
  readonly supportedCapabilities: readonly CapabilityType[];
  chat(messages: Message[], model: RawModel, options?: ChatOptions): Promise<string>;
  chatStream?(messages: Message[], model: RawModel, options?: ChatOptions): AsyncIterable<string>;
  generateImage?(prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult>;
  editImage?(image: string, prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult>;
  analyzeImage?(image: string, model: RawModel, options?: AnalysisOptions): Promise<string>;
  transcribeAudio?(audio: string, model: RawModel, options?: TranscribeOptions): Promise<string>;
  textToSpeech?(text: string, model: RawModel, options?: TTSOptions): Promise<AudioResult>;
  calculate(expression: string): Promise<string>;
  dateTime(operation: string, timezone?: string): Promise<string>;
  lastUsage?: UsageData;
}

// ── Safe math expression evaluator ──────────────────────────────────────────
// Recursive-descent parser + evaluator. No Function(), no eval(), no arbitrary
// code execution. Only numbers, basic arithmetic, parentheses, and a small set
// of math functions are allowed.

type MathAST =
  | { type: 'num'; value: number }
  | { type: 'var'; name: string }
  | { type: 'binop'; op: '+' | '-' | '*' | '/' | '%' | '^'; left: MathAST; right: MathAST }
  | { type: 'unary'; op: '-' | '+'; expr: MathAST }
  | { type: 'func'; name: string; args: MathAST[] };

function tokenizeMath(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }
    if ('0123456789.'.includes(ch)) {
      let num = '';
      while (i < expr.length && '0123456789.'.includes(expr[i])) num += expr[i++];
      tokens.push(num);
      continue;
    }
    if (ch === '(' || ch === ')' || ch === ',' || ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '^') {
      tokens.push(ch); i++; continue;
    }
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let id = '';
      while (i < expr.length && ((expr[i] >= 'a' && expr[i] <= 'z') || (expr[i] >= 'A' && expr[i] <= 'Z') || (expr[i] >= '0' && expr[i] <= '9') || expr[i] === '_')) id += expr[i++];
      tokens.push(id);
      continue;
    }
    throw new Error(`Unexpected character in expression: '${ch}'`);
  }
  return tokens;
}

function parseMathExpr(tokens: string[], pos: { i: number }): MathAST {
  let node = parseMathTerm(tokens, pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '+' || tokens[pos.i] === '-')) {
    const op = tokens[pos.i++] as '+' | '-';
    node = { type: 'binop', op, left: node, right: parseMathTerm(tokens, pos) };
  }
  return node;
}

function parseMathTerm(tokens: string[], pos: { i: number }): MathAST {
  let node = parseMathPower(tokens, pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '*' || tokens[pos.i] === '/' || tokens[pos.i] === '%')) {
    const op = tokens[pos.i++] as '*' | '/' | '%';
    node = { type: 'binop', op, left: node, right: parseMathPower(tokens, pos) };
  }
  return node;
}

function parseMathPower(tokens: string[], pos: { i: number }): MathAST {
  let node = parseMathUnary(tokens, pos);
  if (pos.i < tokens.length && tokens[pos.i] === '^') {
    pos.i++;
    node = { type: 'binop', op: '^', left: node, right: parseMathPower(tokens, pos) };
  }
  return node;
}

function parseMathUnary(tokens: string[], pos: { i: number }): MathAST {
  if (pos.i < tokens.length && (tokens[pos.i] === '-' || tokens[pos.i] === '+')) {
    const op = tokens[pos.i++] as '-' | '+';
    return { type: 'unary', op, expr: parseMathPrimary(tokens, pos) };
  }
  return parseMathPrimary(tokens, pos);
}

function parseMathPrimary(tokens: string[], pos: { i: number }): MathAST {
  if (pos.i >= tokens.length) throw new Error('Unexpected end of expression');
  const tok = tokens[pos.i];

  // Number
  if (/^\d+(\.\d*)?$|^\.\d+$/.test(tok)) {
    pos.i++;
    return { type: 'num', value: parseFloat(tok) };
  }

  // Parenthesized or function call
  if (tok === '(') {
    pos.i++;
    const expr = parseMathExpr(tokens, pos);
    if (pos.i >= tokens.length || tokens[pos.i] !== ')') throw new Error("Missing closing parenthesis");
    pos.i++;
    return expr;
  }

  // Identifier — could be variable or function
  if (/^[a-zA-Z_]\w*$/.test(tok)) {
    pos.i++;
    if (pos.i < tokens.length && tokens[pos.i] === '(') {
      pos.i++; // skip '('
      const args: MathAST[] = [];
      if (pos.i < tokens.length && tokens[pos.i] !== ')') {
        args.push(parseMathExpr(tokens, pos));
        while (pos.i < tokens.length && tokens[pos.i] === ',') {
          pos.i++;
          args.push(parseMathExpr(tokens, pos));
        }
      }
      if (pos.i >= tokens.length || tokens[pos.i] !== ')') throw new Error("Missing closing parenthesis in function call");
      pos.i++;
      return { type: 'func', name: tok.toLowerCase(), args };
    }
    return { type: 'var', name: tok.toLowerCase() };
  }

  throw new Error(`Unexpected token: '${tok}'`);
}

const ALLOWED_VARS: Record<string, number> = { pi: Math.PI, e: Math.E };

function evalMathAST(node: MathAST): number {
  switch (node.type) {
    case 'num': return node.value;
    case 'var': {
      if (node.name in ALLOWED_VARS) return ALLOWED_VARS[node.name];
      throw new Error(`Unknown variable: '${node.name}'`);
    }
    case 'unary': {
      const v = evalMathAST(node.expr);
      return node.op === '-' ? -v : v;
    }
    case 'binop': {
      const l = evalMathAST(node.left);
      const r = evalMathAST(node.right);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': {
          if (r === 0) throw new Error('Division by zero');
          return l / r;
        }
        case '%': return l % r;
        case '^': return Math.pow(l, r);
      }
    }
    case 'func': {
      const args = node.args.map(evalMathAST);
      switch (node.name) {
        case 'abs': return Math.abs(args[0]);
        case 'round': return args.length > 1 ? parseFloat(args[0].toFixed(args[1])) : Math.round(args[0]);
        case 'floor': return Math.floor(args[0]);
        case 'ceil': return Math.ceil(args[0]);
        case 'sqrt': return Math.sqrt(args[0]);
        case 'cbrt': return Math.cbrt(args[0]);
        case 'sin': return Math.sin(args[0]);
        case 'cos': return Math.cos(args[0]);
        case 'tan': return Math.tan(args[0]);
        case 'asin': return Math.asin(args[0]);
        case 'acos': return Math.acos(args[0]);
        case 'atan': return Math.atan(args[0]);
        case 'log': return args.length > 1 ? Math.log(args[0]) / Math.log(args[1]) : Math.log10(args[0]);
        case 'ln': return Math.log(args[0]);
        case 'exp': return Math.exp(args[0]);
        case 'pow': return Math.pow(args[0], args[1]);
        case 'min': return Math.min(...args);
        case 'max': return Math.max(...args);
        case 'random': return Math.random();
        default: throw new Error(`Unknown function: '${node.name}'`);
      }
    }
  }
}

function evaluateSafeMath(expression: string): number {
  const tokens = tokenizeMath(expression);
  if (tokens.length === 0) throw new Error('Empty expression');
  const pos = { i: 0 };
  const ast = parseMathExpr(tokens, pos);
  if (pos.i < tokens.length) throw new Error(`Unexpected token after expression: '${tokens[pos.i]}'`);
  return evalMathAST(ast);
}
// ── End safe math evaluator ─────────────────────────────────────────────────

export type { Message, CapabilityType, RawModel, ChatOptions, ImageOptions, ImageResult, AnalysisOptions, TranscribeOptions, TTSOptions, AudioResult, UsageData } from '../types';

const adapters = new Map<string, ProviderAdapter>();

export function registerAdapter(adapter: ProviderAdapter): void {
  adapters.set(adapter.providerId, adapter);
}

export function getAdapter(providerId: string): ProviderAdapter | undefined {
  return adapters.get(providerId);
}

export function getAdapterForCapability(capability: CapabilityType, providerId: string): ProviderAdapter | undefined {
  const adapter = adapters.get(providerId);
  if (adapter && adapter.supportedCapabilities.includes(capability)) {
    return adapter;
  }
  return undefined;
}

export function listAdapters(): ProviderAdapter[] {
  return Array.from(adapters.values());
}

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly providerId: string;
  abstract readonly supportedCapabilities: readonly CapabilityType[];
  abstract chat(messages: Message[], model: RawModel, options?: ChatOptions): Promise<string>;
  abstract chatStream?(messages: Message[], model: RawModel, options?: ChatOptions): AsyncIterable<string>;
  lastUsage?: UsageData;

  async generateImage(prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    throw new Error(`Image generation not supported by ${this.providerId}`);
  }

  async editImage(image: string, prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    throw new Error(`Image editing not supported by ${this.providerId}`);
  }

  async analyzeImage(image: string, model: RawModel, options?: AnalysisOptions): Promise<string> {
    throw new Error(`Image analysis not supported by ${this.providerId}`);
  }

  async transcribeAudio(audio: string, model: RawModel, options?: TranscribeOptions): Promise<string> {
    throw new Error(`Audio transcription not supported by ${this.providerId}`);
  }

  async textToSpeech(text: string, model: RawModel, options?: TTSOptions): Promise<AudioResult> {
    throw new Error(`Text-to-speech not supported by ${this.providerId}`);
  }

  async calculate(expression: string): Promise<string> {
    try {
      const result = evaluateSafeMath(expression);
      return String(result);
    } catch (e) {
      throw new Error(`Calculator error: ${e instanceof Error ? e.message : 'Invalid expression'}`);
    }
  }

  async dateTime(operation: string, timezone = 'UTC'): Promise<string> {
    const now = new Date();
    switch (operation) {
      case 'now':
        return now.toISOString();
      case 'timestamp':
        return String(now.getTime());
      case 'date':
        return now.toLocaleDateString('en-US', { timeZone: timezone });
      case 'time':
        return now.toLocaleTimeString('en-US', { timeZone: timezone });
      case 'timezone':
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      default:
        throw new Error(`Unknown datetime operation: ${operation}`);
    }
  }

  protected async request<T>(url: string, options: RequestInit, apiKey: string, headers: Record<string, string>): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } };
      throw new Error(errorBody.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  protected async streamRequest(url: string, options: RequestInit, apiKey: string, headers: Record<string, string>): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } };
      throw new Error(errorBody.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }
}