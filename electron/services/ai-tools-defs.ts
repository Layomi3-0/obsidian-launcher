export interface ToolDef {
  name: string;
  description: string;
  properties: Record<string, { type: string; description: string }>;
  required: string[];
  requiresVault?: boolean;
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: "create_note",
    description:
      "Create a NEW note in the Obsidian vault. Only use this for notes that do not exist yet. If the note already exists, use edit_note instead.",
    properties: {
      name: {
        type: "string",
        description: "Note title (without .md extension)",
      },
      content: {
        type: "string",
        description:
          "Full markdown content of the note, including frontmatter if appropriate",
      },
      folder: {
        type: "string",
        description:
          'Folder path relative to vault root (e.g. "Projects/Active/"). Omit for vault root.',
      },
    },
    required: ["name", "content"],
    requiresVault: true,
  },
  {
    name: "edit_note",
    description:
      "Replace the entire content of an existing note. Use this when the user asks you to modify, edit, rewrite, or update a note. Always read_note first to see the current content, then provide the complete updated content.",
    properties: {
      name: {
        type: "string",
        description: "Note title to edit (without .md extension)",
      },
      content: {
        type: "string",
        description:
          "The complete new content for the note (replaces everything)",
      },
    },
    required: ["name", "content"],
    requiresVault: true,
  },
  {
    name: "append_to_note",
    description:
      "Append content to the end of an existing note. Use this when the user wants to ADD content to a note without changing what is already there.",
    properties: {
      name: {
        type: "string",
        description: "Note title to append to (without .md extension)",
      },
      content: {
        type: "string",
        description: "Content to append to the end of the note",
      },
    },
    required: ["name", "content"],
    requiresVault: true,
  },
  {
    name: "append_to_daily",
    description:
      "Append content to today's daily note. Use this when the user asks to add something to their daily note or capture a quick thought.",
    properties: {
      content: {
        type: "string",
        description: "Content to append to today's daily note",
      },
    },
    required: ["content"],
    requiresVault: true,
  },
  {
    name: "insert_in_note",
    description:
      "Insert content into an existing note at a specific location. Use this when you need to add a section to a specific place in a note (e.g. under a heading) without rewriting the entire note. Provide an anchor string that exists in the note — the new content will be inserted immediately after that anchor.",
    properties: {
      name: {
        type: "string",
        description: "Note title (without .md extension)",
      },
      anchor: {
        type: "string",
        description:
          "A unique string already in the note to insert after (e.g. a heading like '## Concrete Optimizations'). Content is inserted on a new line after the first match.",
      },
      content: {
        type: "string",
        description: "The content to insert after the anchor",
      },
    },
    required: ["name", "anchor", "content"],
    requiresVault: true,
  },
  {
    name: "read_note",
    description:
      "Read the full content of a note from the vault. Use this when you need to see a note's current content before modifying it, or to answer a question about it.",
    properties: {
      name: {
        type: "string",
        description: "Note title to read (without .md extension)",
      },
    },
    required: ["name"],
    requiresVault: true,
  },
  {
    name: "move_note",
    description:
      "Move a note to a different folder. This safely updates all wikilinks across the vault.",
    properties: {
      name: { type: "string", description: "Note title to move" },
      to: {
        type: "string",
        description: 'Destination folder path (e.g. "Archives/2026/")',
      },
    },
    required: ["name", "to"],
    requiresVault: true,
  },
  {
    name: "search_vault",
    description:
      "Search the vault using Obsidian's full search engine. Use this to find notes by content, tags, or properties.",
    properties: {
      query: {
        type: "string",
        description:
          "Search query. Supports Obsidian search syntax like [tag:name] or [property:value]",
      },
    },
    required: ["query"],
    requiresVault: true,
  },
  {
    name: "read_soul",
    description:
      "Read your current SOUL.md personality file. Use this before making edits so you can see the full current content.",
    properties: {},
    required: [],
  },
  {
    name: "edit_soul",
    description:
      "Update your SOUL.md personality file. Use this when the user asks you to change your personality, tone, voice, or behavior. Always read_soul first to see the current content, then provide the complete updated file.",
    properties: {
      content: {
        type: "string",
        description: "The complete new content for SOUL.md (replaces everything)",
      },
    },
    required: ["content"],
  },
  {
    name: "save_preference",
    description:
      "Save or update a user preference. Use this when the user says 'remember', 'always do X', 'I prefer', 'from now on', or expresses any persistent preference about how you should behave, format notes, name things, etc. Also use this to remove a preference when asked to forget something. Preferences persist across all future sessions.",
    properties: {
      key: {
        type: "string",
        description: "Short identifier for the preference (e.g. 'note-format', 'tone', 'tagging-style', 'name')",
      },
      value: {
        type: "string",
        description: "The preference value to save. Set to empty string to remove a preference.",
      },
    },
    required: ["key", "value"],
  },
  {
    name: "get_preferences",
    description:
      "Read all saved user preferences. Use this when you need to check what the user has asked you to remember, or when the user asks what preferences you have stored.",
    properties: {},
    required: [],
  },
  {
    name: "fetch_url",
    description:
      "Fetch the content of a web page URL. Use this when the user shares a link and wants you to read, summarize, or work with the page content. Supports HTML pages, articles, and text content.",
    properties: {
      url: { type: "string", description: "The full URL to fetch (must include https://)" },
    },
    required: ["url"],
  },
  {
    name: "fetch_youtube_transcript",
    description:
      "Fetch the transcript of a YouTube video. Use this when the user pastes a YouTube link and wants to work with the video content. After fetching, you can create or append vault notes from the transcript combined with any context the user provides.",
    properties: {
      url: { type: "string", description: "YouTube video URL or video ID" },
    },
    required: ["url"],
  },
  // --- LK Kanban tools ---
  {
    name: "kanban_board",
    description:
      "View the kanban board. Optionally filter by project. Use this to see current tasks and their statuses.",
    properties: {
      project: {
        type: "string",
        description:
          'Project slug to filter by (e.g. "nara", "content", "backlog"). Omit for full board.',
      },
    },
    required: [],
  },
  {
    name: "kanban_add",
    description:
      "Create a new kanban card/task. Use when the user wants to add a task, bug, or item to their board.",
    properties: {
      title: { type: "string", description: "Title of the card" },
      project: {
        type: "string",
        description:
          "Project slug (nara, content, dinner-party, togather, backlog)",
      },
      priority: { type: "string", description: "Priority: p0 (urgent), p1 (this week), p2 (later). Defaults to p1." },
      type: { type: "string", description: "Card type: task, bug, pr, decision, content. Defaults to task." },
    },
    required: ["title"],
  },
  {
    name: "kanban_update",
    description:
      "Update an existing kanban card. Use to change status, priority, title, project, or due date.",
    properties: {
      id: { type: "string", description: "Card ID (8-char short ID or unique prefix)" },
      status: { type: "string", description: "New status: inbox, next, inp, blocked, review, done" },
      priority: { type: "string", description: "New priority: p0, p1, p2" },
      title: { type: "string", description: "New title" },
      project: { type: "string", description: "Move to project slug" },
      due: { type: "string", description: 'Due date (YYYY-MM-DD) or "none" to clear' },
    },
    required: ["id"],
  },
  {
    name: "kanban_done",
    description: "Mark a kanban card as done/complete.",
    properties: {
      id: { type: "string", description: "Card ID to mark complete" },
    },
    required: ["id"],
  },
  {
    name: "kanban_show",
    description: "Show details of a specific kanban card.",
    properties: {
      id: { type: "string", description: "Card ID to show" },
    },
    required: ["id"],
  },
  {
    name: "kanban_list",
    description:
      "List kanban cards with optional filters. Use for querying specific subsets of tasks.",
    properties: {
      status: { type: "string", description: "Filter by status (inbox, next, inp, blocked, review, done)" },
      project: { type: "string", description: "Filter by project slug" },
      owner: { type: "string", description: "Filter by owner (kupo, lk)" },
    },
    required: [],
  },
  {
    name: "kanban_create_project",
    description: "Create a new project on the kanban board.",
    properties: {
      name: { type: "string", description: 'Project name (e.g. "My Project")' },
      slug: { type: "string", description: 'URL-friendly slug (e.g. "my-project"). Auto-generated from name if omitted.' },
      color: { type: "string", description: 'Hex color for the project (e.g. "#2563eb"). Optional.' },
      icon: { type: "string", description: 'Emoji icon for the project (e.g. "🚀"). Optional.' },
    },
    required: ["name"],
  },
  {
    name: "kanban_update_project",
    description: "Update an existing kanban project's name, color, or icon.",
    properties: {
      slug: { type: "string", description: 'Project slug to update (e.g. "nara", "backlog")' },
      name: { type: "string", description: "New project name. Optional." },
      color: { type: "string", description: 'New hex color (e.g. "#2563eb"). Optional.' },
      icon: { type: "string", description: 'New emoji icon (e.g. "🚀"). Optional.' },
    },
    required: ["slug"],
  },
];
