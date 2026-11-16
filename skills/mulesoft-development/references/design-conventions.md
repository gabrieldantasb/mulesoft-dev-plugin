# Mule flow design conventions

## Variables and payload state

- If two or more consecutive variables are independent, set them in one `ee:transform` with multiple `ee:set-variable` targets instead of consecutive `set-variable` components.
- Keep values for the same concern in one purpose-named object variable. For example, prefer `vars.dbConfig = { tableName, query, inputParameters }` to separate `tableName`, `query`, and `inputParameters` variables.
- Name context objects for their purpose, such as `httpRequest`, `dbConfig`, or `orderLookup`; avoid generic names like `data` and `temp`.
- Make payload contracts explicit at flow boundaries. Do not rely silently on incidental payload changes inside another flow.

## DataWeave

- For parsing, optional fields, casts, indexing, and other nullable paths, use `default` when it prevents a runtime error and there is a meaningful fallback. Do not use arbitrary defaults that conceal a required-field validation error.
- Move mappings or DataWeave logic that grow beyond roughly 50 lines into a named `.dwl` module or mapping in `src/main/resources/dw/`. Reference it with a Transform Message `resource` or import it from a short inline script.
- Keep short, local transforms inline only when that is clearer than extracting a file. Reuse shared mappings and helper functions rather than copying them.
- Declare input and output MIME types when material to the transformation.
- In XML attribute expressions, never use literal `\\n` sequences to format DataWeave. Keep a simple expression on one line, or use a `.dwl` resource or Transform Message CDATA block for multiline logic. Validate the result with Maven.

## External-system clients

- Place each interaction in `src/main/mule/clients/<system>-client.xml`. Expose a focused reusable sub-flow for each operation, such as `erp-get-order` or `salesforce-upsert-account`.
- Receive dynamic operation inputs through a documented context object or explicit variables. Paths, query parameters, headers, bodies, SQL, and input parameters must come from the caller; credentials and endpoints remain property-driven in `global.xml`.
- At client boundaries, log the operation name, safe parameters, a status or result summary, and the correlation ID. Never log secrets, authorization headers, tokens, passwords, or sensitive payload fields.
- Invoke a reusable client sub-flow with `flow-ref`. Its `doc:name` must exactly match the target flow or sub-flow name.
