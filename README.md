# MuleSoft Development Harness

Portable, skills-only guidance for implementing and reviewing Mule 4 applications. It packages the MuleSoft conventions as focused workflows rather than a repository-wide instruction file, so the same rules can travel with Codex and Claude Code.

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
└── skills/
    ├── mulesoft-development/
    │   ├── SKILL.md
    │   └── references/design-conventions.md
    └── mulesoft-review/
        └── SKILL.md
```

## Install or import

Use this repository directory as the plugin root; do not point an installer at the `skills/` directory.

- **Codex:** add the folder to a local or repository plugin marketplace, then install `mulesoft-development-harness` from the Plugins directory. The portable `plugin.json` is canonical; `.codex-plugin/plugin.json` supports compatibility tooling.
- **Claude Code:** add or install the repository as a local plugin through its plugin manager. Claude Code reads `.claude-plugin/plugin.json` and the bundled `skills/` directory.

No MCP server, credentials, hooks, or network access are required. Add those only when a future skill needs an external capability.

## Developing the harness

Keep skills focused on a recognizable MuleSoft goal. Place conditional, detailed material under the owning skill's `references/` directory and link to it from `SKILL.md`. Test a new or changed skill against a real Mule repository before broadening its instructions.
