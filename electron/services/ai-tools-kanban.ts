import { execSync } from "child_process";

const KANBAN_DIR = "/Users/jkupo/Documents/Projects/LK-Kanban/lk-kanban";

interface PartialToolResult {
  name: string;
  success: boolean;
  message: string;
  displayMessage?: string;
}

export function kanban(args: string): string {
  return execSync(`npm run kanban -- ${args}`, {
    cwd: KANBAN_DIR,
    encoding: "utf-8",
    timeout: 10000,
  }).trim();
}

export function executeKanbanTool(
  name: string,
  args: Record<string, string>,
): PartialToolResult | null {
  switch (name) {
    case "kanban_board":
      return executeBoard(name, args);
    case "kanban_add":
      return executeAdd(name, args);
    case "kanban_update":
      return executeUpdate(name, args);
    case "kanban_done":
      return executeDone(name, args);
    case "kanban_show":
      return executeShow(name, args);
    case "kanban_list":
      return executeList(name, args);
    case "kanban_create_project":
      return executeCreateProject(name, args);
    case "kanban_update_project":
      return executeUpdateProject(name, args);
    default:
      return null;
  }
}

function executeBoard(
  name: string,
  args: Record<string, string>,
): PartialToolResult {
  try {
    const cmd = args.project ? `board -p ${args.project}` : "board";
    const output = kanban(cmd);
    return {
      name,
      success: true,
      message: output,
      displayMessage: `Loaded board${args.project ? ` (${args.project})` : ""}`,
    };
  } catch (e: any) {
    return { name, success: false, message: e.message, displayMessage: e.message };
  }
}

function executeAdd(
  name: string,
  args: Record<string, string>,
): PartialToolResult {
  try {
    let cmd = `add "${args.title}"`;
    if (args.project) cmd += ` -p ${args.project}`;
    if (args.priority) cmd += ` --priority ${args.priority}`;
    if (args.type) cmd += ` -t ${args.type}`;
    return { name, success: true, message: kanban(cmd) };
  } catch (e: any) {
    return { name, success: false, message: e.message };
  }
}

function executeUpdate(
  name: string,
  args: Record<string, string>,
): PartialToolResult {
  try {
    let cmd = `update ${args.id}`;
    if (args.status) cmd += ` --status ${args.status}`;
    if (args.priority) cmd += ` --priority ${args.priority}`;
    if (args.title) cmd += ` --title "${args.title}"`;
    if (args.project) cmd += ` -p ${args.project}`;
    if (args.due) cmd += ` --due ${args.due}`;
    return { name, success: true, message: kanban(cmd) };
  } catch (e: any) {
    return { name, success: false, message: e.message };
  }
}

function executeDone(
  name: string,
  args: Record<string, string>,
): PartialToolResult {
  try {
    return { name, success: true, message: kanban(`done ${args.id}`) };
  } catch (e: any) {
    return { name, success: false, message: e.message };
  }
}

function executeShow(
  name: string,
  args: Record<string, string>,
): PartialToolResult {
  try {
    return { name, success: true, message: kanban(`show ${args.id}`) };
  } catch (e: any) {
    return { name, success: false, message: e.message };
  }
}

function executeList(
  name: string,
  args: Record<string, string>,
): PartialToolResult {
  try {
    let cmd = "list";
    if (args.status) cmd += ` --status ${args.status}`;
    if (args.project) cmd += ` -p ${args.project}`;
    if (args.owner) cmd += ` --owner ${args.owner}`;
    const output = kanban(cmd);
    return {
      name,
      success: true,
      message: output,
      displayMessage: "Loaded task list",
    };
  } catch (e: any) {
    return { name, success: false, message: e.message, displayMessage: e.message };
  }
}

function executeCreateProject(
  name: string,
  args: Record<string, string>,
): PartialToolResult {
  try {
    let cmd = `project-add "${args.name}"`;
    if (args.slug) cmd += ` -s ${args.slug}`;
    if (args.color) cmd += ` -c ${args.color}`;
    if (args.icon) cmd += ` -i ${args.icon}`;
    return { name, success: true, message: kanban(cmd) };
  } catch (e: any) {
    return { name, success: false, message: e.message };
  }
}

function executeUpdateProject(
  name: string,
  args: Record<string, string>,
): PartialToolResult {
  try {
    let cmd = `project-update ${args.slug}`;
    if (args.name) cmd += ` -n "${args.name}"`;
    if (args.color) cmd += ` -c ${args.color}`;
    if (args.icon) cmd += ` -i ${args.icon}`;
    return { name, success: true, message: kanban(cmd) };
  } catch (e: any) {
    return { name, success: false, message: e.message };
  }
}
