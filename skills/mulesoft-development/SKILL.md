---
name: mulesoft-development
description: Implement or modify Mule 4 application flows, clients, connector configuration, properties, or DataWeave mappings while preserving reusable architecture and established conventions. Use for requested MuleSoft application changes; not for MUnit work unless explicitly requested.
---

# MuleSoft development

Apply this workflow to Mule 4 application changes in the current repository.

## Establish context

- Read only the repository files relevant to the requested change.
- Preserve existing naming, connector versions, project structure, and error-handling conventions unless the user asks to change them.
- Before creating an artifact, search `src/main/mule` and `src/main/resources/dw` for equivalent flows, sub-flows, client operations, mappings, and properties. Reuse an existing artifact when it satisfies the need.
- Do not create or modify MUnit tests unless the user explicitly requests it.
- Treat every creation, edit, rename, move, or deletion of a `.raml` file as a validation-affecting change. This includes RAML changes made while performing a larger MuleSoft task.

## Place artifacts deliberately

Use this layout for new artifacts unless the repository already establishes a different compatible convention:

```text
src/main/mule/global.xml                  # Connector configuration objects only
src/main/mule/clients/<system>-client.xml # Reusable external-system sub-flows
src/main/mule/<domain>/                   # Domain or API orchestration flows
src/main/resources/config/                # Environment and shared properties
src/main/resources/dw/                    # Reusable DataWeave modules and mappings
```

Declare connector configuration elements only in `src/main/mule/global.xml`, including `http:request-config`, `db:config`, `sfdc:config`, and `ftp:config`. Client files contain operations and sub-flows only, and reference configurations from `global.xml`.

## Design the change

- Keep orchestration flows thin: validate input, assemble context, call reusable business or client sub-flows, and map the response.
- Extract business, lookup, integration, or mapping logic reused in more than one place into a sub-flow, DataWeave module, or mapping as appropriate.
- Move a static value used in more than one location to `src/main/resources/config/`. Do not externalize a one-off solely for this rule.
- Keep environment-specific, secret, and deploy-time values out of Mule XML. Use property files and the repository's approved secure-property mechanism.

For flow state, DataWeave, and external-system boundary conventions, read [design conventions](references/design-conventions.md) before implementation.

## Validate RAML changes

The bundled Stop hook invokes the shared AMF validator after any uncommitted RAML change in a Git worktree. Do not disable, bypass, or treat its output as optional. It is a completion gate, not a formatter.

Before reporting a task that changes a `.raml` file as successful:

1. Identify the changed RAML files and the affected main API entry points. A RAML library, trait, resource type, data type, or include is not necessarily an entry point.
2. Run the shared validator for the affected entry points, or run the affected-entry-point command from the repository root:

   ```text
   node <plugin-root>/tools/raml-validator/validate-affected-raml.cjs --project <project-root> --changed <raml-path> [...]
   ```

3. If validation fails, inspect the AMF diagnostics, correct problems introduced by the change, and rerun it. A subsequent RAML change invalidates prior validation.
4. If no entry point can be discovered or the validator cannot run, report that blocker explicitly. Do not claim completion.

The validator resolves imports from each source file's directory and validates every discoverable affected `#%RAML 1.0` API entry point. It handles local `!include` and `uses` dependency graphs; it intentionally does not assume every `.raml` file is an API root.

## Verify before handoff

Inspect changed Mule XML and DataWeave for duplicate logic, repeated hard-coded values, connector configurations outside `global.xml`, and `flow-ref` display names that differ from their target names.

Run the repository's relevant existing validation or Maven command when available. State what you ran and anything you could not run, including RAML validation when RAML changed.
