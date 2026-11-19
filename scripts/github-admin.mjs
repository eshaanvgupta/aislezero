// Local operator helper. Authentication is read from Git Credential Manager into memory only.
// Never prints credential-helper output or writes tokens to disk.
import { spawnSync } from "node:child_process";
const credential = spawnSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
  env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" },
  timeout: 15000,
});
const password = credential.stdout
  ?.split("\n")
  .find((l) => l.startsWith("password="))
  ?.slice(9);
if (credential.status !== 0 || !password)
  throw new Error(
    "GitHub credentials are unavailable in Git Credential Manager. Authenticate Git first.",
  );
const api = async (path, method = "GET", body) => {
  const response = await fetch("https://api.github.com" + path, {
    method,
    headers: {
      Authorization: "Bearer " + password,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok)
    throw new Error(
      `GitHub ${response.status}: ${data.message || "Request failed"}`,
    );
  return data;
};
const [action, name = "aislezero"] = process.argv.slice(2);
if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error("Invalid repository name");
const me = await api("/user");
const full = me.login + "/" + name;
if (action === "whoami") {
  console.log(JSON.stringify({ login: me.login }));
} else if (action === "create") {
  const result = await api("/user/repos", "POST", {
    name,
    description:
      "AisleZero — merchant-controlled Nostr commerce with direct crypto payments. Live payments disabled pending operator activation.",
    private: false,
    auto_init: false,
    has_wiki: false,
    has_projects: false,
  });
  console.log(
    JSON.stringify({
      url: result.html_url,
      fullName: result.full_name,
      visibility: result.visibility,
    }),
  );
} else if (action === "runs") {
  const result = await api(`/repos/${full}/actions/runs?per_page=5`);
  console.log(
    JSON.stringify(
      result.workflow_runs.map((r) => ({
        id: r.id,
        url: r.html_url,
        status: r.status,
        conclusion: r.conclusion,
        head: r.head_sha,
      })),
      null,
      2,
    ),
  );
} else if (action === "jobs") {
  const run = process.argv[4];
  if (!/^\d+$/.test(run || ""))
    throw new Error("Provide a numeric workflow run ID");
  const result = await api(`/repos/${full}/actions/runs/${run}/jobs`);
  console.log(
    JSON.stringify(
      result.jobs.map((j) => ({
        id: j.id,
        name: j.name,
        status: j.status,
        conclusion: j.conclusion,
        steps: j.steps.map((s) => ({ name: s.name, conclusion: s.conclusion })),
      })),
      null,
      2,
    ),
  );
} else if (action === "repo") {
  const r = await api("/repos/" + full);
  console.log(
    JSON.stringify({
      url: r.html_url,
      visibility: r.visibility,
      defaultBranch: r.default_branch,
    }),
  );
} else throw new Error("Use create, repo, runs, or jobs.");
