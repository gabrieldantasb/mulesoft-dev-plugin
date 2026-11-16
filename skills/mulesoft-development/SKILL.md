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

## Verify before handoff

Inspect changed Mule XML and DataWeave for duplicate logic, repeated hard-coded values, connector configurations outside `global.xml`, and `flow-ref` display names that differ from their target names.

Run the repository's relevant existing validation or Maven command when available. State what you ran and anything you could not run.
