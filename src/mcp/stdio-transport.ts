import process from "node:process";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { JSONRPCMessageSchema } from "@modelcontextprotocol/sdk/types.js";

type FramingMode = "content-length" | "jsonl";

type ParsedMessage =
  | { mode: FramingMode; message: JSONRPCMessage; remaining: Buffer }
  | { mode: "jsonl"; message: null; remaining: Buffer };

function trimLeadingWhitespace(buffer: Buffer): Buffer {
  let index = 0;

  while (index < buffer.length) {
    const value = buffer[index];

    if (value !== 0x0d && value !== 0x0a && value !== 0x20 && value !== 0x09) {
      break;
    }

    index += 1;
  }

  return index === 0 ? buffer : buffer.subarray(index);
}

function parseJsonRpcMessage(text: string): JSONRPCMessage {
  return JSONRPCMessageSchema.parse(JSON.parse(text));
}

function parseJsonLineMessage(buffer: Buffer): ParsedMessage | null {
  const newlineIndex = buffer.indexOf(0x0a);

  if (newlineIndex === -1) {
    return null;
  }

  const line = buffer.toString("utf8", 0, newlineIndex).replace(/\r$/, "");
  const remaining = buffer.subarray(newlineIndex + 1);

  if (!line.trim()) {
    return {
      mode: "jsonl",
      message: null,
      remaining
    };
  }

  return {
    mode: "jsonl",
    message: parseJsonRpcMessage(line),
    remaining
  };
}

function findHeaderSeparator(buffer: Buffer): { index: number; length: number } | null {
  const crlfIndex = buffer.indexOf("\r\n\r\n");

  if (crlfIndex !== -1) {
    return { index: crlfIndex, length: 4 };
  }

  const lfIndex = buffer.indexOf("\n\n");

  if (lfIndex !== -1) {
    return { index: lfIndex, length: 2 };
  }

  return null;
}

function parseContentLengthMessage(buffer: Buffer): ParsedMessage | null {
  const headerSeparator = findHeaderSeparator(buffer);

  if (!headerSeparator) {
    return null;
  }

  const headerText = buffer.toString("utf8", 0, headerSeparator.index);
  const contentLengthMatch = /^content-length\s*:\s*(\d+)$/im.exec(headerText);

  if (!contentLengthMatch) {
    throw new Error("Missing Content-Length header in MCP stdio request.");
  }

  const contentLength = Number.parseInt(contentLengthMatch[1], 10);
  const bodyStart = headerSeparator.index + headerSeparator.length;
  const bodyEnd = bodyStart + contentLength;

  if (buffer.length < bodyEnd) {
    return null;
  }

  return {
    mode: "content-length",
    message: parseJsonRpcMessage(buffer.toString("utf8", bodyStart, bodyEnd)),
    remaining: buffer.subarray(bodyEnd)
  };
}

function detectFramingMode(buffer: Buffer): FramingMode {
  const firstByte = buffer[0];

  if (firstByte === 0x7b || firstByte === 0x5b) {
    return "jsonl";
  }

  return "content-length";
}

export class CompatibleStdioServerTransport {
  private readonly stdin = process.stdin;
  private readonly stdout = process.stdout;
  private buffer: Buffer = Buffer.alloc(0);
  private started = false;
  private responseMode: FramingMode = "jsonl";

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(message: T) => void;

  private readonly onData = (chunk: Buffer) => {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.processBuffer();
  };

  private readonly onError = (error: Error) => {
    this.onerror?.(error);
  };

  async start(): Promise<void> {
    if (this.started) {
      throw new Error(
        "CompatibleStdioServerTransport already started. Server.connect() should only be called once."
      );
    }

    this.started = true;
    this.stdin.on("data", this.onData);
    this.stdin.on("error", this.onError);
  }

  private processBuffer(): void {
    while (true) {
      this.buffer = trimLeadingWhitespace(this.buffer);

      if (this.buffer.length === 0) {
        return;
      }

      const mode = detectFramingMode(this.buffer);

      try {
        const parsed =
          mode === "content-length"
            ? parseContentLengthMessage(this.buffer)
            : parseJsonLineMessage(this.buffer);

        if (!parsed) {
          return;
        }

        this.buffer = parsed.remaining;
        this.responseMode = parsed.mode;

        if (parsed.message) {
          this.onmessage?.(parsed.message);
        }
      } catch (error) {
        this.buffer = Buffer.alloc(0);
        this.onerror?.(error instanceof Error ? error : new Error(String(error)));
        return;
      }
    }
  }

  async close(): Promise<void> {
    this.stdin.off("data", this.onData);
    this.stdin.off("error", this.onError);

    if (this.stdin.listenerCount("data") === 0) {
      this.stdin.pause();
    }

    this.buffer = Buffer.alloc(0);
    this.onclose?.();
  }

  send(message: JSONRPCMessage): Promise<void> {
    const payload = JSON.stringify(message);
    const serialized =
      this.responseMode === "content-length"
        ? `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`
        : `${payload}\n`;

    return new Promise((resolve) => {
      if (this.stdout.write(serialized)) {
        resolve();
      } else {
        this.stdout.once("drain", resolve);
      }
    });
  }
}
