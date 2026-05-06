# Design token tools (dtcg-tools)

CLI for validating DTCG 2025.10 JSON design tokens and converting them to CSS.

## Requirements

Node.js >=18

## Quick start

Run without install:

```bash
npx dtcg-tools validate tokens.json
```

Or install globally:

```bash
npm install -g dtcg-tools
dtcg-tools validate tokens.json
```

## Validate

Validate one file (default engine: `dispersa`):

```bash
npx dtcg-tools validate tokens.json
```

Validate multiple files:

```bash
npx dtcg-tools validate tokens.json dark.tokens.json
```

Use specific engines:

```bash
npx dtcg-tools validate tokens.json --engine ajv
npx dtcg-tools validate tokens.json --engine ajv --engine dispersa
npx dtcg-tools validate tokens.json --engine all
```

Supported engine values:

```text
ajv
terrazzo
dispersa
all
```

## Convert to CSS

`convert` validates input before conversion. If validation fails, CSS is not generated.

Print CSS to stdout:

```bash
npx dtcg-tools convert tokens.json
```

Write CSS to a file:

```bash
npx dtcg-tools convert tokens.json --output ./tokens/generated.css
```

CSS conversion currently uses:

```text
dispersa
```

## Stdin

Validate from stdin:

```bash
cat tokens.json | npx dtcg-tools validate
```

Convert from stdin:

```bash
cat tokens.json | npx dtcg-tools convert
```

## License

MIT
