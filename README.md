# texture-mcp

A procedural texture generation tool exposed via MCP, converting high-level semantic presets into executable recipes — enabling controllable, AI-driven texture creation without relying on generative image models.

## Development

```bash
npm install
npm run build
```

Run the compiled MCP entry:

```bash
npm start
```

Run the current smoke test:

```bash
npm test
```

## Use As MCP

This package is currently configured as a CLI-style MCP tool through the `texture-mcp` command.

For local development, build first and then register the compiled entry:

```bash
codex mcp add texture -- node /path/to/dist/mcp/index.js
```

After publishing to npm, it can also be used through the package command:

```bash
codex mcp add texture -- npx -y texture-mcp
```

## Status

The package metadata is ready for npm publishing. It can still be used locally through the compiled entry or, after publishing, through `npx -y texture-mcp`.
