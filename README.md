# MuleSoft Development Harness

Portable guidance and a shared local quality gate for implementing and reviewing Mule 4 applications. It packages the MuleSoft conventions as focused workflows rather than a repository-wide instruction file, so the same rules can travel with Codex and Claude Code.

## Included skills

| Skill | Use it for |
| --- | --- |
| `mulesoft-development` | Creating or changing Mule 4 flows, clients, connector configuration, properties, and DataWeave. |
| `mulesoft-review` | Reviewing or diagnosing Mule 4 XML and DataWeave changes before handoff or merge. |

The development skill loads its detailed flow-design conventions only when needed. Both skills intentionally leave MUnit work out of scope unless it is explicitly requested.

## Package layout

```text
.
├── plugin.json                    # Portable Agent Plugins manifest
├── .codex-plugin/plugin.json      # Codex compatibility manifest
├── .claude-plugin/plugin.json     # Claude Code compatibility manifest
├── mcp.json                        # Portable Anypoint Platform MCP definition
├── .mcp.json                       # Codex/Claude compatibility MCP definition
├── hooks/                          # Completion gate shared by Codex and Claude Code
├── tools/raml-validator/           # Node + AMF runtime; not a Mule application dependency
└── skills/
    ├── mulesoft-development/
    │   ├── SKILL.md
    │   └── references/design-conventions.md
    └── mulesoft-review/
        └── SKILL.md
```

## RAML 1.0 validation

`tools/raml-validator` is the shared, plugin-scoped validation runtime. It uses the pinned official `amf-client-js` package and remains outside MuleSoft application/API repositories. Install its dependencies once after cloning or updating this plugin:

```powershell
npm install --prefix tools/raml-validator
```

The validator is invoked with Node and supports Windows paths containing spaces:

```powershell
node tools/raml-validator/validate-raml.cjs 'C:\path with spaces\api.raml'
node tools/raml-validator/validate-affected-raml.cjs --project 'C:\path with spaces\mule-api' --changed 'api\libraries\common.raml'
```

The second command discovers `#%RAML 1.0` API roots under the project, follows local `uses` and `!include` references relative to their declaring files, and validates every root affected by the changed RAML file. A library is never assumed to be a root. Parsing errors, unresolved references, and AMF validation errors return nonzero and include the available file, location, and diagnostic message.

`hooks/hooks.json` runs a Stop hook after an agent turn. In a Git worktree, it detects uncommitted `.raml` additions, edits, renames, moves, and deletions, determines their affected entry points, and blocks task completion until AMF succeeds. The hook only reads source files; it never writes application files and does not recurse into itself. A change after a successful run is detected from Git status and triggers fresh validation.

Codex requires users to review and trust plugin hooks before execution. Claude Code runs the bundled plugin hook when the plugin is enabled. The bundled hook resolves the shared plugin path from `CLAUDE_PLUGIN_ROOT`, so Windows paths with spaces are supported. If the hook cannot determine the plugin root, Git worktree, entry points, or AMF runtime, it blocks completion and reports the problem. The development skill imposes the same explicit gate for environments where hooks are unavailable.

## Anypoint Platform MCP

The plugin packages MuleSoft Platform MCP Server as the OAuth-protected Streamable HTTP endpoint `https://omni.mulesoft.com/mcp` (US Cloud). The connection is defined in [mcp.json](mcp.json) and has no credentials in the repository.

Before connecting, create an Anypoint connected app that acts on behalf of a user, allow the `full` and `offline_access` scopes, and register the callback URL shown by your MCP client. MuleSoft Platform MCP currently requires manual client registration, so enter the connected-app client ID and secret in the client’s OAuth connection flow; do not add them to either MCP manifest.

For a non-US control plane, replace only the host with the equivalent Anypoint control-plane URL (for example, `https://eu1.omni.mulesoft.com/mcp`). See MuleSoft’s [Platform MCP setup guide](https://docs.mulesoft.com/mulesoft-mcp-server/getting-started-platform) for regions, callback URLs, and required permissions.

## Install or import

Use this repository directory as the plugin root; do not point an installer at the `skills/` directory.

- **Codex:** add the folder to a local or repository plugin marketplace, then install `mulesoft-development-harness` from the Plugins directory. The portable `plugin.json` is canonical; `.codex-plugin/plugin.json` supports compatibility tooling.
- **Claude Code:** add or install the repository as a local plugin through its plugin manager. Claude Code reads `.claude-plugin/plugin.json` and the bundled `skills/` directory.

No MCP server or credentials are required. Installing the AMF dependency requires npm registry access; normal validation is local and does not require Anypoint Design Center or network access.

## Developing the harness

Keep skills focused on a recognizable MuleSoft goal. Place conditional, detailed material under the owning skill's `references/` directory and link to it from `SKILL.md`. Test a new or changed skill against a real Mule repository before broadening its instructions.

Run the validator integration suite from the plugin root:

```powershell
node tools/raml-validator/test/integration.cjs
```

It creates and deletes an isolated temporary RAML project, including a path with spaces; no test files or dependencies are added to a MuleSoft source repository.
