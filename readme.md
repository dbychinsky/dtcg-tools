# Design token tools (dtsg-tools)

CLI for validating DTCG JSON design tokens and converting them to CSS.

## Requirements

Node.js >=18

## Quick start

Run without install:

```bash
npx dtsg-tools validate tokens.json --engine ajv
```

Or install globally:

```bash
npm install -g dtsg-tools
dtsg-tools validate tokens.json --engine ajv
```

## Validate

Validate one file (default engine):

```bash
npx dtsg-tools validate tokens.json
```

Validate multiple files:

```bash
npx dtsg-tools validate tokens.json dark.tokens.json
```

Use specific engines:

```bash
npx dtsg-tools validate tokens.json --engine ajv
npx dtsg-tools validate tokens.json --engine ajv --engine dispersa
```

Supported engine values:

```text
ajv
terrazzo
dispersa
all
```

## Convert to CSS

Convert to a CSS file:

```bash
npx dtsg-tools convert tokens.json --output ./tokens/generated.css
```

Print CSS to stdout:

```bash
npx dtsg-tools convert tokens.json --stdout
```

Default output:

```text
single input   -> src/css/<input-name>.css
multiple input -> src/css/tokens.css
```

CSS conversion currently uses:

```text
dispersa
```

## Stdin

Validate from stdin:

```bash
cat tokens.json | npx dtsg-tools validate --stdin tokens.json --engine ajv
```

Convert from stdin:

```bash
cat tokens.json | npx dtsg-tools convert --stdin tokens.json --stdout
```

In stdin mode, `tokens.json` is a virtual file name used for diagnostics and temporary files.

## License

MIT
