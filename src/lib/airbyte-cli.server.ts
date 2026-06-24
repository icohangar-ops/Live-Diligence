// Airbyte Agent CLI bridge for server-side connector execution.
// Docs: https://docs.airbyte.com/ai-agents/interfaces/cli

import { spawn } from "node:child_process";

export interface AirbyteCliError {
  type?: string;
  message?: string;
  hint?: string;
}

export interface ConnectorExecuteRequest {
  workspace?: string;
  name: string;
  entity: string;
  action: string;
  params?: Record<string, unknown>;
  select_fields?: string[];
}

function airbyteWorkspace(): string {
  return (
    process.env.AIRBYTE_WORKSPACE
    || process.env.AIRBYTE_WORKSPACE_NAME
    || "default"
  );
}

function airbyteBin(): string {
  return process.env.AIRBYTE_AGENT_BIN || "airbyte-agent";
}

/** True when env creds are set, or AIRBYTE_USE_CLI trusts a local `airbyte-agent login`. */
export function airbyteCliConfigured(): boolean {
  const id = process.env.AIRBYTE_CLIENT_ID;
  const secret = process.env.AIRBYTE_CLIENT_SECRET;
  const org = process.env.AIRBYTE_ORGANIZATION_ID;
  if (id && secret && org) return true;
  return process.env.AIRBYTE_USE_CLI === "true";
}

export function unwrapConnectorData<T = Record<string, unknown>>(payload: unknown): T {
  if (!payload || typeof payload !== "object") return {} as T;
  const obj = payload as Record<string, unknown>;
  if (obj.data !== undefined) return obj.data as T;
  if (obj.result !== undefined) return obj.result as T;
  return obj as T;
}

export async function airbyteConnectorExecute<T = Record<string, unknown>>(
  req: ConnectorExecuteRequest,
): Promise<T> {
  const body = {
    workspace: req.workspace ?? airbyteWorkspace(),
    name: req.name,
    entity: req.entity,
    action: req.action,
    params: req.params ?? {},
    ...(req.select_fields?.length ? { select_fields: req.select_fields } : {}),
  };

  const bin = airbyteBin();
  const args = ["connectors", "execute", "--json", JSON.stringify(body)];

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn ${bin}: ${err.message}. Install: curl -fsSL https://airbyte.ai/install.sh | bash`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const trimmed = stderr.trim() || stdout.trim();
        try {
          const parsed = JSON.parse(trimmed) as AirbyteCliError;
          reject(new Error(parsed.message || trimmed || `airbyte-agent exited ${code}`));
        } catch {
          reject(new Error(trimmed || `airbyte-agent exited ${code}`));
        }
        return;
      }

      const out = stdout.trim();
      if (!out) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(out) as T);
      } catch {
        reject(new Error(`Invalid JSON from airbyte-agent: ${out.slice(0, 240)}`));
      }
    });
  });
}
