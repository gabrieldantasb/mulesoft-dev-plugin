---
name: mulesoft-review
description: Review Mule 4 XML and DataWeave changes for architecture, reuse, configuration placement, safe client boundaries, and validation gaps. Use for code review, pre-merge checks, or diagnosis; do not modify MUnit tests unless explicitly requested.
---

# MuleSoft review

Review only the files relevant to the request and assess changes against the repository's established naming, connector versions, project layout, and error-handling conventions.

## Review checklist

- Look for an existing equivalent in `src/main/mule` or `src/main/resources/dw` before recommending a duplicate flow, sub-flow, client operation, mapping, or property.
- Ensure connector configurations are declared only in `src/main/mule/global.xml`; client files should contain reusable operations and sub-flows that reference those configurations.
- Check that orchestration flows validate input, assemble context, call reusable sub-flows, and map a response without absorbing reusable integration or mapping logic.
- Flag values repeated across locations when they should be shared properties, but do not require properties for one-off values.
- Verify environment-specific, secret, and deploy-time values are property-driven and use the approved secure-property mechanism.
- Inspect client boundaries for dynamic caller-provided request inputs, safe request/response metadata logging, and no secret or sensitive-payload logging.
- Verify each `flow-ref` `doc:name` exactly matches its target flow or sub-flow.
- Check DataWeave nullable paths for meaningful `default` handling, duplicated mapping logic, material MIME types, and literal `\\n` sequences in XML attribute expressions.
- Check related variables for unnecessary consecutive `set-variable` components, generic names, fragmented context, and implicit payload contracts.
- If the diff creates, edits, renames, moves, or deletes `.raml` files, identify the affected API roots and require AMF validation after the final RAML change. Treat an unavailable validator or undiscoverable entry point as a blocker, not a passing result.

Report only actionable findings, ordered by impact, with file and line references when available. If no issues are found, state that clearly and identify any validation that was not run. Do not modify tests unless explicitly asked.
