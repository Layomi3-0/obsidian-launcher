import { YoutubeTranscript } from "youtube-transcript";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { ObsidianCLI } from "./obsidian-cli";
import { TOOL_DEFS, type ToolDef } from "./ai-tools-defs";
import { executeKanbanTool } from "./ai-tools-kanban";

const PREFERENCES_DIR = join(homedir(), ".quick-launcher", "memory");
const PREFERENCES_JSON = join(PREFERENCES_DIR, "preferences.json");
const PREFERENCES_MD = join(PREFERENCES_DIR, "PREFERENCES.md");

export type { ToolDef };

export interface ToolResult {
  name: string;
  success: boolean;
  message: string;
  displayMessage: string;
}

type PartialToolResult = Omit<ToolResult, "displayMessage"> & {
  displayMessage?: string;
};

function filterTools(includeVault: boolean): ToolDef[] {
  return includeVault ? TOOL_DEFS : TOOL_DEFS.filter((t) => !t.requiresVault);
}

// Claude/Anthropic format
export function getClaudeTools(includeVault = true) {
  return filterTools(includeVault).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: t.properties,
      required: t.required,
    },
  }));
}

// Gemini/Google format
export function getGeminiTools(includeVault = true) {
  return [
    {
      functionDeclarations: filterTools(includeVault).map((t) => ({
        name: t.name,
        description: t.description,
        parameters: {
          type: "OBJECT" as const,
          properties: Object.fromEntries(
            Object.entries(t.properties).map(([k, v]) => [
              k,
              { type: v.type.toUpperCase(), description: v.description },
            ]),
          ),
          required: t.required,
        },
      })),
    },
  ];
}

export async function executeTool(
  name: string,
  args: Record<string, string>,
  cli: ObsidianCLI | null,
): Promise<ToolResult> {
  console.log(`[ai:tool] Executing: ${name}`, args);

  const vaultTool = TOOL_DEFS.find((t) => t.name === name)?.requiresVault;
  if (vaultTool && !cli) {
    const msg = "Obsidian CLI is not available — vault tools are disabled";
    return { name, success: false, message: msg, displayMessage: msg };
  }

  const result = await executeToolInner(name, args, cli);
  return {
    ...result,
    message: capToolOutput(name, result.message),
    displayMessage: result.displayMessage ?? result.message,
  };
}

const MAX_TOOL_OUTPUT_CHARS = 48_000;

function capToolOutput(name: string, message: string): string {
  if (message.length <= MAX_TOOL_OUTPUT_CHARS) return message;

  const total = message.length;
  const keepChars = name === "read_note" ? 44_000 : 45_000;
  const sliced = message.slice(0, keepChars);
  const lastNewline = sliced.lastIndexOf("\n");
  const cutPoint = lastNewline > keepChars * 0.8 ? lastNewline : keepChars;
  const suffix =
    name === "read_note"
      ? `\n\n[... truncated at ${cutPoint} of ${total} chars. Use insert_in_note for targeted edits.]`
      : `\n\n[... truncated at ${cutPoint} of ${total} chars]`;
  return message.slice(0, cutPoint) + suffix;
}

async function executeToolInner(
  name: string,
  args: Record<string, string>,
  cli: ObsidianCLI | null,
): Promise<PartialToolResult> {
  switch (name) {
    case "read_soul": {
      const content = readPromptFile("SOUL.md");
      return {
        name,
        success: content !== null,
        message: content ?? "SOUL.md not found",
        displayMessage: content ? `Read SOUL.md (${content.length} chars)` : "SOUL.md not found",
      };
    }
    case "edit_soul": {
      const result = writePromptFile("SOUL.md", args.content);
      return {
        name,
        success: result,
        message: result ? "Updated SOUL.md — personality changes take effect on next query" : "Failed to update SOUL.md",
      };
    }
    case "save_preference": {
      const result = savePreference(args.key, args.value);
      return {
        name,
        success: result.success,
        message: result.message,
      };
    }
    case "get_preferences": {
      const prefs = readPreferences();
      return {
        name,
        success: true,
        message: prefs || "No preferences saved yet.",
        displayMessage: prefs ? `Loaded preferences (${prefs.length} chars)` : "No preferences saved yet",
      };
    }
    case "create_note": {
      const ok = await cli!.createNote(args.name, args.content, args.folder);
      return {
        name,
        success: ok,
        message: ok
          ? `Created [[${args.name}]]${args.folder ? ` in ${args.folder}` : ""}`
          : `Failed to create "${args.name}" — a note with this name may already exist. Use edit_note to update existing notes instead.`,
      };
    }
    case "edit_note": {
      const result = await cli!.overwriteNote(args.name, args.content);
      return {
        name,
        success: result.success,
        message: result.success
          ? `Updated [[${args.name}]]${result.path ? ` (${result.path})` : ""}`
          : `Failed to update "${args.name}"${result.path ? "" : " — note not found"}`,
      };
    }
    case "append_to_note": {
      const ok = await cli!.appendToNote(args.name, args.content);
      return {
        name,
        success: ok,
        message: ok
          ? `Appended to [[${args.name}]]`
          : `Failed to append to "${args.name}"`,
      };
    }
    case "insert_in_note": {
      const result = await insertInNote(cli!, args.name, args.anchor, args.content);
      return {
        name,
        success: result.success,
        message: result.message,
        displayMessage: result.success
          ? `Inserted into [[${args.name}]]`
          : result.message,
      };
    }
    case "append_to_daily": {
      const ok = await cli!.dailyAppend(args.content);
      return {
        name,
        success: ok,
        message: ok
          ? "Appended to daily note"
          : "Failed to append to daily note",
      };
    }
    case "read_note": {
      const content = await cli!.readNote(args.name);
      return {
        name,
        success: content !== null,
        message: content ?? `Note "${args.name}" not found`,
        displayMessage: content !== null
          ? `Read [[${args.name}]]`
          : `Note "${args.name}" not found`,
      };
    }
    case "move_note": {
      const ok = await cli!.moveNote(args.name, args.to);
      return {
        name,
        success: ok,
        message: ok
          ? `Moved "${args.name}" to ${args.to}`
          : `Failed to move "${args.name}"`,
      };
    }
    case "search_vault": {
      const results = await cli!.search(args.query);
      const paths = results.map((r) => r.path).join("\n");
      return {
        name,
        success: true,
        message:
          results.length > 0
            ? `Found ${results.length} results:\n${paths}`
            : "No results found",
        displayMessage:
          results.length > 0
            ? `Found ${results.length} results`
            : "No results found",
      };
    }
    case "fetch_url": {
      const content = await fetchUrlContent(args.url);
      return {
        name,
        success: content !== null,
        message: content ?? `Failed to fetch "${args.url}" — the page may be inaccessible or behind a login.`,
        displayMessage: content !== null
          ? `Fetched ${args.url}`
          : `Failed to fetch URL`,
      };
    }
    case "fetch_youtube_transcript": {
      const transcript = await fetchTranscript(args.url);
      return {
        name,
        success: transcript !== null,
        message:
          transcript ??
          "Failed to fetch transcript. The video may not have captions available.",
        displayMessage: transcript !== null
          ? `Fetched transcript (${transcript.split("\n").length} segments)`
          : "Failed to fetch transcript",
      };
    }
    default: {
      const kanbanResult = executeKanbanTool(name, args);
      if (kanbanResult) return kanbanResult;
      return { name, success: false, message: `Unknown tool: ${name}` };
    }
  }
}

async function fetchUrlContent(url: string): Promise<string | null> {
  const redditContent = await fetchRedditJson(url);
  if (redditContent) return redditContent;

  const content = await fetchViaJinaReader(url);
  if (content) return content;

  return fetchDirect(url);
}

const REDDIT_URL_RE = /^https?:\/\/(?:www\.)?reddit\.com\/r\/\w+\/comments\/\w+/;

async function fetchRedditJson(url: string): Promise<string | null> {
  if (!REDDIT_URL_RE.test(url)) return null;

  try {
    const jsonUrl = url.replace(/\/?(?:\?.*)?$/, ".json");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(jsonUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "QuickLauncher/1.0",
        "Accept": "application/json",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    return formatRedditThread(data);
  } catch (err) {
    console.error("[ai:tool] Reddit JSON fetch failed:", err);
    return null;
  }
}

function formatRedditThread(data: any[]): string | null {
  if (!Array.isArray(data) || data.length < 1) return null;

  const post = data[0]?.data?.children?.[0]?.data;
  if (!post) return null;

  const lines: string[] = [
    `# ${post.title}`,
    `by u/${post.author} in r/${post.subreddit}`,
    "",
    post.selftext || "(no body)",
  ];

  const comments = data[1]?.data?.children ?? [];
  if (comments.length > 0) {
    lines.push("", "---", "## Comments", "");
    for (const child of comments.slice(0, 30)) {
      const c = child.data;
      if (!c?.body || c.author === "AutoModerator") continue;
      lines.push(`**u/${c.author}** (${c.score ?? 0} pts):`, c.body, "");
    }
  }

  const text = lines.join("\n");
  console.log(`[ai:tool] Reddit JSON fetched (${text.length} chars)`);
  return text.slice(0, 50_000);
}

async function fetchViaJinaReader(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const response = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: {
        "Accept": "text/plain",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const text = await response.text();
    if (!text || text.length < 50) return null;

    console.log(`[ai:tool] Jina Reader fetched ${url} (${text.length} chars)`);
    return text.slice(0, 50_000);
  } catch (err) {
    console.error("[ai:tool] Jina Reader failed, falling back to direct fetch:", err);
    return null;
  }
}

async function fetchDirect(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();
    return extractReadableText(html).slice(0, 50_000);
  } catch (err) {
    console.error("[ai:tool] Direct fetch failed:", err);
    return null;
  }
}

function extractReadableText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  text = text.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|br\s*\/?)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");

  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

const PROMPTS_DIR = join(homedir(), ".quick-launcher", "prompts");

function readPromptFile(filename: string): string | null {
  try {
    const path = join(PROMPTS_DIR, filename);
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

function writePromptFile(filename: string, content: string): boolean {
  try {
    const path = join(PROMPTS_DIR, filename);
    writeFileSync(path, content, "utf-8");
    console.log(`[ai:tool] Updated ${filename} (${content.length} chars)`);
    return true;
  } catch (err) {
    console.error(`[ai:tool] Failed to write ${filename}:`, err);
    return false;
  }
}

function loadPrefsMap(): Record<string, string> {
  try {
    if (!existsSync(PREFERENCES_JSON)) return {};
    return JSON.parse(readFileSync(PREFERENCES_JSON, "utf-8"));
  } catch {
    return {};
  }
}

function savePrefsMap(prefs: Record<string, string>): void {
  if (!existsSync(PREFERENCES_DIR)) mkdirSync(PREFERENCES_DIR, { recursive: true });
  writeFileSync(PREFERENCES_JSON, JSON.stringify(prefs, null, 2), "utf-8");

  // Also write a markdown version for the system prompt
  const lines = Object.entries(prefs).map(([k, v]) => `- **${k}**: ${v.replace(/\n/g, "\n  ")}`);
  writeFileSync(PREFERENCES_MD, lines.join("\n") + "\n", "utf-8");
}

function readPreferences(): string {
  try {
    if (!existsSync(PREFERENCES_MD)) return "";
    return readFileSync(PREFERENCES_MD, "utf-8").trim();
  } catch {
    return "";
  }
}

function savePreference(key: string, value: string): { success: boolean; message: string } {
  try {
    const prefs = loadPrefsMap();

    if (value) {
      prefs[key] = value;
    } else {
      delete prefs[key];
    }

    savePrefsMap(prefs);
    console.log(`[ai:tool] Preference saved: ${key} = ${value || "(removed)"}`);

    if (!value) return { success: true, message: `Removed preference "${key}"` };
    return { success: true, message: `Saved preference: ${key} = ${value}` };
  } catch (err) {
    console.error("[ai:tool] Failed to save preference:", err);
    return { success: false, message: "Failed to save preference" };
  }
}

async function fetchTranscript(url: string): Promise<string | null> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Transcript fetch timed out after 15s")), 15_000),
    );
    const segments = await Promise.race([
      YoutubeTranscript.fetchTranscript(url),
      timeout,
    ]);
    if (segments.length === 0) return null;

    const lines = segments.map((s) => {
      const mins = Math.floor(s.offset / 60000);
      const secs = Math.floor((s.offset % 60000) / 1000);
      const ts = `${mins}:${String(secs).padStart(2, "0")}`;
      return `[${ts}] ${s.text}`;
    });

    return lines.join("\n");
  } catch (err) {
    console.error("[ai:tool] YouTube transcript fetch failed:", err);
    return null;
  }
}

async function insertInNote(
  cli: ObsidianCLI,
  name: string,
  anchor: string,
  content: string,
): Promise<{ success: boolean; message: string }> {
  const notePath = await cli.findNotePath(name);
  if (!notePath) return { success: false, message: `Note "${name}" not found` };

  const vaultPath = cli.getVaultPath();
  if (!vaultPath) return { success: false, message: "No vault path configured" };

  const absPath = join(vaultPath, notePath);
  const existing = readFileSync(absPath, "utf-8");
  const anchorIndex = existing.indexOf(anchor);
  if (anchorIndex === -1) return { success: false, message: `Anchor "${anchor}" not found in note` };

  const insertAt = existing.indexOf("\n", anchorIndex);
  const pos = insertAt === -1 ? existing.length : insertAt;
  const updated = existing.slice(0, pos) + "\n" + content + existing.slice(pos);
  writeFileSync(absPath, updated, "utf-8");
  console.log(`[ai:tool] insert_in_note: inserted ${content.length} chars after "${anchor}" in ${notePath}`);
  return { success: true, message: `Inserted content after "${anchor}" in [[${name}]]` };
}
