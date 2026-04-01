import { YoutubeTranscript } from "youtube-transcript";
import type { ObsidianCLI } from "./obsidian-cli";
import { TOOL_DEFS, type ToolDef } from "./ai-tools-defs";
import { executeKanbanTool } from "./ai-tools-kanban";

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
    displayMessage: result.displayMessage ?? result.message,
  };
}

async function executeToolInner(
  name: string,
  args: Record<string, string>,
  cli: ObsidianCLI | null,
): Promise<PartialToolResult> {
  switch (name) {
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

async function fetchTranscript(url: string): Promise<string | null> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(url);
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
