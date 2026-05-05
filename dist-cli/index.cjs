#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli/index.ts
var import_commander = require("commander");

// src/cli/commands/convert.ts
var import_node_path6 = __toESM(require("path"), 1);

// src/core/conversion/convertSources.ts
async function convertSources(converters, sources) {
  const results = await Promise.all(converters.map((converter) => converter.convert(sources)));
  return {
    results,
    success: results.every((result) => result.success)
  };
}

// src/core/conversion/dispersaCssConverter.ts
var import_dispersa = require("dispersa");
var import_transforms = require("dispersa/transforms");
var import_node_path = __toESM(require("path"), 1);
function toResolverSourceReference(filePath) {
  const relativePath = import_node_path.default.relative(process.cwd(), filePath);
  const normalized = relativePath.split(import_node_path.default.sep).join("/");
  if (normalized.startsWith("../") || normalized.startsWith("./")) {
    return normalized;
  }
  return `./${normalized}`;
}
function toErrorMessages(errors) {
  return errors && errors.length > 0 ? errors : ["CSS conversion failed."];
}
var dispersaCssConverter = {
  name: "dispersa",
  /**
   * Конвертирует источники в CSS с помощью Dispersa
   * @param sources - Массив источников для конвертации
   * @returns Результат конвертации
   */
  async convert(sources) {
    const resolver = {
      version: "2025.10",
      sets: {
        base: {
          sources: sources.map((source) => ({
            $ref: toResolverSourceReference(source.tempPath)
          }))
        }
      },
      resolutionOrder: [{ $ref: "#/sets/base" }]
    };
    const result = await (0, import_dispersa.build)({
      resolver,
      outputs: [
        (0, import_dispersa.css)({
          name: "css",
          preset: "bundle",
          selector: ":root",
          transforms: [
            (0, import_transforms.nameKebabCase)(),
            (0, import_transforms.colorToHex)(),
            (0, import_transforms.dimensionToPx)(),
            (0, import_transforms.durationToMs)(),
            (0, import_transforms.fontWeightToNumber)()
          ]
        })
      ],
      validation: { mode: "error" }
    });
    if (!result.success) {
      return {
        engineName: "dispersa",
        success: false,
        css: "",
        errors: toErrorMessages(result.errors?.map((error) => error.message))
      };
    }
    return {
      engineName: "dispersa",
      success: true,
      css: result.outputs.map((output) => output.content).join("\n"),
      errors: []
    };
  }
};

// src/core/input/collectSources.ts
var import_node_path3 = __toESM(require("path"), 1);

// src/core/input/types.ts
var CliInputError = class extends Error {
  /**
   * Создаёт новую ошибку ввода CLI
   * @param message - Сообщение об ошибке
   */
  constructor(message) {
    super(message);
    this.name = "CliInputError";
  }
};

// src/utils/fileSystem.ts
var import_promises = require("fs/promises");
var import_node_path2 = __toESM(require("path"), 1);
var import_node_fs = require("fs");
async function readTextFile(filePath) {
  return (0, import_promises.readFile)(filePath, "utf8");
}
async function writeTextFile(filePath, content) {
  await (0, import_promises.mkdir)(import_node_path2.default.dirname(filePath), { recursive: true });
  await (0, import_promises.writeFile)(filePath, content, "utf8");
}
async function assertFileExists(filePath) {
  try {
    await (0, import_promises.access)(filePath, import_node_fs.constants.F_OK);
  } catch {
    throw new CliInputError(`File not found: ${filePath}`);
  }
}
function assertJsonFilePath(filePath) {
  if (!filePath.toLowerCase().endsWith(".json")) {
    throw new CliInputError(`Expected .json file: ${filePath}`);
  }
}
async function listFilesRecursively(directoryPath) {
  const entries = await (0, import_promises.readdir)(directoryPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = import_node_path2.default.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await listFilesRecursively(entryPath);
      files.push(...nestedFiles);
      continue;
    }
    if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}
async function isDirectory(directoryPath) {
  try {
    return (await (0, import_promises.stat)(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}

// src/core/input/collectSources.ts
var NO_INPUT_MESSAGE = [
  "No input provided.",
  "Use files or stdin:",
  "",
  "npm run cli -- validate tokens.json",
  "npm run cli -- validate tokens.json dark.tokens.json",
  "cat tokens.json | npm run cli -- validate --stdin tokens.json"
].join("\n");
async function readStdinText() {
  return new Promise((resolve, reject) => {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => {
      resolve(buffer);
    });
    process.stdin.on("error", (error) => {
      reject(error);
    });
  });
}
async function collectSources(options) {
  const fileInputs = [...options.positionalFiles];
  const shouldReadStdin = options.useStdin || fileInputs.length === 0 && !process.stdin.isTTY;
  const sources = [];
  for (const fileInput of fileInputs) {
    const absolutePath = import_node_path3.default.resolve(fileInput);
    await assertFileExists(absolutePath);
    assertJsonFilePath(absolutePath);
    const fileContent = await readTextFile(absolutePath);
    try {
      JSON.parse(fileContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
      throw new CliInputError(`Invalid JSON file "${fileInput}": ${message}`);
    }
    sources.push({
      type: "file",
      name: import_node_path3.default.basename(absolutePath),
      filePath: absolutePath
    });
  }
  if (shouldReadStdin) {
    const stdinContent = (await readStdinText()).trim();
    if (!stdinContent) {
      if (sources.length === 0) {
        throw new CliInputError(NO_INPUT_MESSAGE);
      }
    } else {
      try {
        JSON.parse(stdinContent);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
        throw new CliInputError(`Invalid JSON from stdin: ${message}`);
      }
      sources.push({
        type: "content",
        name: options.stdinName?.trim() || "stdin.json",
        content: stdinContent
      });
    }
  }
  if (sources.length === 0) {
    throw new CliInputError(NO_INPUT_MESSAGE);
  }
  return sources;
}

// src/core/input/createTempFiles.ts
var import_node_path4 = __toESM(require("path"), 1);
function toSafeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
async function createValidationSources(sourceInputs, tempDirectoryPath) {
  const validationSources = [];
  let index = 0;
  for (const sourceInput of sourceInputs) {
    if (sourceInput.type === "file") {
      validationSources.push({
        name: sourceInput.name,
        originalType: "file",
        originalPath: sourceInput.filePath,
        tempPath: sourceInput.filePath
      });
      continue;
    }
    const fileBaseName = import_node_path4.default.basename(sourceInput.name);
    const safeFileName = toSafeFileName(fileBaseName);
    const tempFilePath = import_node_path4.default.join(tempDirectoryPath, `${index}-${safeFileName}`);
    await writeTextFile(tempFilePath, sourceInput.content);
    validationSources.push({
      name: sourceInput.name,
      originalType: "content",
      tempPath: tempFilePath
    });
    index += 1;
  }
  return validationSources;
}

// src/utils/logger.ts
function logInfo(message) {
  console.log(message);
}
function logError(message) {
  console.error(message);
}

// src/utils/tempDirectory.ts
var import_promises2 = require("fs/promises");
var import_node_os = __toESM(require("os"), 1);
var import_node_path5 = __toESM(require("path"), 1);
async function createTempDirectory(prefix) {
  return (0, import_promises2.mkdtemp)(import_node_path5.default.join(import_node_os.default.tmpdir(), prefix));
}
async function removeDirectory(directoryPath) {
  await (0, import_promises2.rm)(directoryPath, { recursive: true, force: true });
}

// src/cli/commands/convert.ts
function getLayerOrder(customPropertyName) {
  if (customPropertyName.startsWith("--primitive-")) {
    return 0;
  }
  if (customPropertyName.startsWith("--semantic-")) {
    return 1;
  }
  if (customPropertyName.startsWith("--component-")) {
    return 2;
  }
  return 3;
}
function reorderRootBlockDeclarations(rootBlockContent) {
  const rawLines = rootBlockContent.split("\n");
  const declarations = [];
  const nonDeclarationLines = [];
  let currentDeclarationStart = -1;
  let currentDeclarationLines = [];
  for (let index = 0; index < rawLines.length; index += 1) {
    const line = rawLines[index];
    const trimmed = line.trim();
    if (currentDeclarationStart >= 0) {
      currentDeclarationLines.push(line);
      if (trimmed.endsWith(";")) {
        const declarationText = currentDeclarationLines.join("\n");
        const match = declarationText.match(/--[a-zA-Z0-9_-]+/);
        if (match) {
          declarations.push({
            name: match[0],
            text: declarationText,
            index: currentDeclarationStart
          });
        } else {
          nonDeclarationLines.push({
            line: declarationText,
            index: currentDeclarationStart
          });
        }
        currentDeclarationStart = -1;
        currentDeclarationLines = [];
      }
      continue;
    }
    if (trimmed.startsWith("--")) {
      currentDeclarationStart = index;
      currentDeclarationLines = [line];
      if (trimmed.endsWith(";")) {
        const declarationText = currentDeclarationLines.join("\n");
        const match = declarationText.match(/--[a-zA-Z0-9_-]+/);
        if (match) {
          declarations.push({
            name: match[0],
            text: declarationText,
            index: currentDeclarationStart
          });
        } else {
          nonDeclarationLines.push({
            line: declarationText,
            index: currentDeclarationStart
          });
        }
        currentDeclarationStart = -1;
        currentDeclarationLines = [];
      }
      continue;
    }
    nonDeclarationLines.push({ line, index });
  }
  if (currentDeclarationStart >= 0 && currentDeclarationLines.length > 0) {
    nonDeclarationLines.push({
      line: currentDeclarationLines.join("\n"),
      index: currentDeclarationStart
    });
  }
  const sortedDeclarations = [...declarations].sort((left, right) => {
    const layerDiff = getLayerOrder(left.name) - getLayerOrder(right.name);
    if (layerDiff !== 0) {
      return layerDiff;
    }
    return left.name.localeCompare(right.name);
  });
  if (sortedDeclarations.length === 0) {
    return rootBlockContent;
  }
  const firstDeclarationIndex = Math.min(...sortedDeclarations.map((declaration) => declaration.index));
  const lastDeclarationIndex = Math.max(...sortedDeclarations.map((declaration) => declaration.index));
  const leading = nonDeclarationLines.filter((entry) => entry.index < firstDeclarationIndex).sort((left, right) => left.index - right.index).map((entry) => entry.line);
  const trailing = nonDeclarationLines.filter((entry) => entry.index > lastDeclarationIndex).sort((left, right) => left.index - right.index).map((entry) => entry.line);
  const sortedDeclarationTexts = sortedDeclarations.map((declaration) => declaration.text);
  return [...leading, ...sortedDeclarationTexts, ...trailing].join("\n");
}
function reorderCssByTokenLayer(css2) {
  return css2.replace(/:root\s*\{([\s\S]*?)\}/g, (fullMatch, blockContent) => {
    const reordered = reorderRootBlockDeclarations(blockContent);
    return fullMatch.replace(blockContent, reordered);
  });
}
function toCliErrorMessage(error) {
  if (error instanceof CliInputError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected CLI error.";
}
function formatCombinedCss(results) {
  if (results.length === 1) {
    return reorderCssByTokenLayer(results[0].css);
  }
  const combined = results.map((result) => [`/* Engine: ${result.engineName} */`, result.css].join("\n")).join("\n\n");
  return reorderCssByTokenLayer(combined);
}
function toDefaultCssFileName(sourceInputs) {
  if (sourceInputs.length !== 1) {
    return "tokens.css";
  }
  const parsedName = import_node_path6.default.parse(sourceInputs[0].name);
  const baseName = parsedName.name.trim().length > 0 ? parsedName.name : "tokens";
  return `${baseName}.css`;
}
function resolveOutputPath(sourceInputs, outFile) {
  if (outFile) {
    return import_node_path6.default.resolve(outFile);
  }
  const fileName = toDefaultCssFileName(sourceInputs);
  return import_node_path6.default.resolve("src", "css", fileName);
}
async function runConvertCommand(positionalFiles, options) {
  let tempDirectoryPath;
  try {
    const sourceInputs = await collectSources({
      positionalFiles,
      useStdin: options.useStdin,
      stdinName: options.stdinName
    });
    const converters = [dispersaCssConverter];
    tempDirectoryPath = await createTempDirectory("dt-tools-");
    const validationSources = await createValidationSources(sourceInputs, tempDirectoryPath);
    const runResult = await convertSources(converters, validationSources);
    if (!runResult.success) {
      for (const result of runResult.results) {
        for (const error of result.errors) {
          logError(`${result.engineName}: ${error}`);
        }
      }
      return 1;
    }
    const css2 = formatCombinedCss(runResult.results);
    if (options.useStdout) {
      process.stdout.write(css2.endsWith("\n") ? css2 : `${css2}
`);
    } else {
      const outputPath = resolveOutputPath(sourceInputs, options.outFile);
      await writeTextFile(outputPath, css2);
      logInfo(`Generated CSS: ${outputPath}`);
    }
    return 0;
  } catch (error) {
    logError(toCliErrorMessage(error));
    return 2;
  } finally {
    if (tempDirectoryPath) {
      await removeDirectory(tempDirectoryPath);
    }
  }
}

// src/core/engines/ajvEngine.ts
var import_ajv = __toESM(require("ajv"), 1);
var import_ajv_formats = __toESM(require("ajv-formats"), 1);
var import_node_path7 = __toESM(require("path"), 1);
var SCHEMA_DIRECTORY_FROM_REPO = "src/dtcg/schema/2025.10";
var FORMAT_SCHEMA_ID = "https://www.designtokens.org/schemas/2025.10/format.json";
async function loadAjvValidator() {
  const schemaDirectoryPath = process.env.DT_TOOLS_DTCG_SCHEMA_DIR ? import_node_path7.default.resolve(process.env.DT_TOOLS_DTCG_SCHEMA_DIR) : import_node_path7.default.resolve(process.cwd(), SCHEMA_DIRECTORY_FROM_REPO);
  if (!await isDirectory(schemaDirectoryPath)) {
    return null;
  }
  const schemaFilePaths = (await listFilesRecursively(schemaDirectoryPath)).filter(
    (filePath) => filePath.toLowerCase().endsWith(".json")
  );
  const ajv = new import_ajv.default({ allErrors: true, strict: false });
  (0, import_ajv_formats.default)(ajv);
  for (const schemaFilePath of schemaFilePaths) {
    const rawSchema = await readTextFile(schemaFilePath);
    const schema = JSON.parse(rawSchema);
    const schemaKey = schema.$id ?? schemaFilePath;
    ajv.addSchema(schema, schemaKey);
  }
  return ajv;
}
function toAjvDiagnostic(sourceName, error) {
  const instancePath = error.instancePath || "/";
  const message = error.message ?? "Validation error.";
  return {
    sourceName,
    severity: "error",
    message: `${instancePath}: ${message}`,
    raw: error
  };
}
var ajvEngine = {
  name: "ajv",
  /**
   * Валидирует источники с помощью AJV и DTCG JSON Schema
   * @param sources - Массив источников для валидации
   * @returns Результат валидации
   */
  async validate(sources) {
    const ajv = await loadAjvValidator();
    if (!ajv) {
      return {
        engineName: "ajv",
        success: false,
        diagnostics: [
          {
            sourceName: sources[0]?.name ?? "unknown",
            severity: "error",
            message: "DTCG schema directory was not found. Set DT_TOOLS_DTCG_SCHEMA_DIR or use repository schema path."
          }
        ]
      };
    }
    const validate = ajv.getSchema(FORMAT_SCHEMA_ID);
    if (!validate) {
      return {
        engineName: "ajv",
        success: false,
        diagnostics: [
          {
            sourceName: sources[0]?.name ?? "unknown",
            severity: "error",
            message: `AJV schema "${FORMAT_SCHEMA_ID}" was not loaded.`
          }
        ]
      };
    }
    const diagnostics = [];
    for (const source of sources) {
      const sourceContent = await readTextFile(source.tempPath);
      const sourceJson = JSON.parse(sourceContent);
      const isValid = validate(sourceJson);
      if (isValid) {
        continue;
      }
      const errors = validate.errors ?? [];
      for (const error of errors) {
        diagnostics.push(toAjvDiagnostic(source.name, error));
      }
    }
    return {
      engineName: "ajv",
      success: diagnostics.length === 0,
      diagnostics
    };
  }
};

// src/core/engines/dispersaEngine.ts
var import_dispersa2 = require("dispersa");
var import_node_path8 = __toESM(require("path"), 1);
function toErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown dispersa error.";
}
function uniqueNonEmptyLines(messages) {
  const unique = /* @__PURE__ */ new Set();
  for (const message of messages) {
    const lines = message.split(/\r?\n/g).map((line) => line.trim()).filter((line) => line.length > 0);
    for (const line of lines) {
      unique.add(line);
    }
  }
  return [...unique];
}
async function collectValidationMessages(resolver) {
  const originalWarn = console.warn;
  const captured = [];
  console.warn = (...args) => {
    const text = args.map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(" ").trim();
    if (text.length > 0) {
      captured.push(text);
    }
  };
  try {
    await (0, import_dispersa2.resolveTokens)(resolver, void 0, { mode: "warn" });
  } finally {
    console.warn = originalWarn;
  }
  return uniqueNonEmptyLines(captured);
}
function toResolverSourceReference2(filePath) {
  const relativePath = import_node_path8.default.relative(process.cwd(), filePath);
  const normalized = relativePath.split(import_node_path8.default.sep).join("/");
  if (normalized.startsWith("../") || normalized.startsWith("./")) {
    return normalized;
  }
  return `./${normalized}`;
}
var dispersaEngine = {
  name: "dispersa",
  /**
   * Валидирует источники с помощью библиотеки Dispersa
   * @param sources - Массив источников для валидации
   * @returns Результат валидации
   */
  async validate(sources) {
    const diagnostics = [];
    for (const source of sources) {
      const resolver = {
        version: "2025.10",
        sets: {
          base: {
            sources: [{ $ref: toResolverSourceReference2(source.tempPath) }]
          }
        },
        resolutionOrder: [{ $ref: "#/sets/base" }]
      };
      try {
        await (0, import_dispersa2.resolveTokens)(resolver, void 0, { mode: "error" });
      } catch (error) {
        const validationMessages = await collectValidationMessages(resolver);
        if (validationMessages.length > 0) {
          diagnostics.push(
            ...validationMessages.map((message) => ({
              sourceName: source.name,
              severity: "error",
              message,
              raw: error
            }))
          );
        } else {
          diagnostics.push({
            sourceName: source.name,
            severity: "error",
            message: toErrorMessage(error),
            raw: error
          });
        }
      }
    }
    return {
      engineName: "dispersa",
      success: diagnostics.length === 0,
      diagnostics
    };
  }
};

// src/utils/processRunner.ts
var import_node_child_process = require("child_process");
function runProcess(command, args) {
  return new Promise((resolve) => {
    const childProcess = (0, import_node_child_process.spawn)(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let failedToStart = false;
    let startErrorMessage;
    childProcess.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    childProcess.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    childProcess.on("error", (error) => {
      failedToStart = true;
      startErrorMessage = error.message;
    });
    childProcess.on("close", (exitCode) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
        failedToStart,
        startErrorMessage
      });
    });
  });
}

// src/core/engines/terrazzoEngine.ts
var import_node_path9 = __toESM(require("path"), 1);
function resolveNpmCommand() {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return {
      command: process.execPath,
      argsPrefix: [npmExecPath]
    };
  }
  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    argsPrefix: []
  };
}
function buildFailureMessage(stdout, stderr) {
  if (stderr) {
    return stderr;
  }
  if (stdout) {
    return stdout;
  }
  return "terrazzo returned a non-zero exit code.";
}
var terrazzoEngine = {
  name: "terrazzo",
  /**
   * Валидирует источники с помощью Terrazzo CLI
   * @param sources - Массив источников для валидации
   * @returns Результат валидации
   */
  async validate(sources) {
    const diagnostics = [];
    const npmCommand = resolveNpmCommand();
    for (const source of sources) {
      const relativeSourcePath = import_node_path9.default.relative(process.cwd(), source.tempPath) || source.tempPath;
      const result = await runProcess(npmCommand.command, [
        ...npmCommand.argsPrefix,
        "exec",
        "--no",
        "--",
        "tz",
        "check",
        relativeSourcePath
      ]);
      if (result.failedToStart) {
        diagnostics.push({
          sourceName: source.name,
          severity: "error",
          message: `Failed to run local Terrazzo CLI. Install it in devDependencies: npm i -D @terrazzo/cli. Details: ${result.startErrorMessage ?? "unknown start error."}`
        });
        continue;
      }
      if (result.exitCode !== 0) {
        diagnostics.push({
          sourceName: source.name,
          severity: "error",
          message: buildFailureMessage(result.stdout, result.stderr),
          raw: {
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr
          }
        });
      }
    }
    return {
      engineName: "terrazzo",
      success: diagnostics.length === 0,
      diagnostics
    };
  }
};

// src/core/engines/index.ts
var ALL_ENGINES = [ajvEngine, terrazzoEngine, dispersaEngine];
function resolveEngines(engineInputs) {
  if (engineInputs.length === 0 || engineInputs.includes("all")) {
    return ALL_ENGINES;
  }
  const selected = /* @__PURE__ */ new Map();
  for (const engineInput of engineInputs) {
    const engine = ALL_ENGINES.find((candidate) => candidate.name === engineInput);
    if (!engine) {
      throw new CliInputError(
        `Unknown engine "${engineInput}". Allowed values: ajv, terrazzo, dispersa, all.`
      );
    }
    selected.set(engine.name, engine);
  }
  return [...selected.values()];
}

// src/core/validation/validateSources.ts
async function validateSources(engines, sources) {
  const results = await Promise.all(engines.map((engine) => engine.validate(sources)));
  return {
    results,
    success: results.every((result) => result.success)
  };
}

// src/cli/commands/validate.ts
function formatDiagnosticsBySource(diagnostics) {
  const diagnosticsBySource = /* @__PURE__ */ new Map();
  for (const diagnostic of diagnostics) {
    const sourceDiagnostics = diagnosticsBySource.get(diagnostic.sourceName) ?? [];
    sourceDiagnostics.push(diagnostic);
    diagnosticsBySource.set(diagnostic.sourceName, sourceDiagnostics);
  }
  return diagnosticsBySource;
}
function printEngineResult(result, sources) {
  const diagnosticsBySource = formatDiagnosticsBySource(result.diagnostics);
  for (const source of sources) {
    const sourceDiagnostics = diagnosticsBySource.get(source.name) ?? [];
    if (sourceDiagnostics.length === 0) {
      logInfo(`\u2713 ${result.engineName}: ${source.name} is valid`);
      continue;
    }
    logInfo(`\u2717 ${result.engineName}: ${source.name}`);
    for (const diagnostic of sourceDiagnostics) {
      logInfo(`  - ${diagnostic.message}`);
    }
  }
}
function toCliErrorMessage2(error) {
  if (error instanceof CliInputError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected CLI error.";
}
async function runValidateCommand(positionalFiles, options) {
  let tempDirectoryPath;
  try {
    const sourceInputs = await collectSources({
      positionalFiles,
      useStdin: options.useStdin,
      stdinName: options.stdinName
    });
    const engines = resolveEngines(options.engines);
    tempDirectoryPath = await createTempDirectory("dt-tools-");
    const validationSources = await createValidationSources(sourceInputs, tempDirectoryPath);
    const runResult = await validateSources(engines, validationSources);
    for (const engineResult of runResult.results) {
      printEngineResult(engineResult, validationSources);
    }
    return runResult.success ? 0 : 1;
  } catch (error) {
    logError(toCliErrorMessage2(error));
    return 2;
  } finally {
    if (tempDirectoryPath) {
      await removeDirectory(tempDirectoryPath);
    }
  }
}

// src/cli/index.ts
function appendValue(value, previous) {
  previous.push(value);
  return previous;
}
function normalizeValidateArguments(positionalInputs, optionEngines, useStdin, stdinName) {
  const positionalFiles = [];
  const engines = [...optionEngines];
  for (const positionalInput of positionalInputs) {
    if (positionalInput === "ajv" || positionalInput === "terrazzo" || positionalInput === "dispersa" || positionalInput === "all") {
      engines.push(positionalInput);
      continue;
    }
    positionalFiles.push(positionalInput);
  }
  return {
    positionalFiles,
    normalizedOptions: {
      engines,
      useStdin,
      stdinName
    }
  };
}
function normalizeConvertArguments(positionalInputs, useStdin, stdinName, outFile, useStdout) {
  const positionalFiles = [];
  let normalizedOutFile = outFile;
  const normalizedUseStdout = Boolean(useStdout);
  for (const positionalInput of positionalInputs) {
    if (!normalizedOutFile && positionalInput.toLowerCase().endsWith(".css")) {
      normalizedOutFile = positionalInput;
      continue;
    }
    positionalFiles.push(positionalInput);
  }
  return {
    positionalFiles,
    normalizedOptions: {
      useStdin,
      stdinName,
      outFile: normalizedOutFile,
      useStdout: normalizedUseStdout
    }
  };
}
async function run() {
  const program = new import_commander.Command();
  program.name("dt-tools");
  program.command("validate").description("Validate DTCG tokens using configured engines").argument("[files...]", "Positional JSON files").option("--stdin [name]", "Read JSON from stdin with optional virtual file name").option(
    "--engine <name>",
    "Validation engine: ajv|terrazzo|dispersa|all (repeatable)",
    appendValue,
    []
  ).action(async (positionalInputs, options) => {
    const normalized = normalizeValidateArguments(
      positionalInputs,
      options.engine ?? [],
      Boolean(options.stdin),
      typeof options.stdin === "string" ? options.stdin : void 0
    );
    const exitCode = await runValidateCommand(normalized.positionalFiles, {
      engines: normalized.normalizedOptions.engines,
      useStdin: normalized.normalizedOptions.useStdin,
      stdinName: normalized.normalizedOptions.stdinName
    });
    process.exitCode = exitCode;
  });
  program.command("convert").description("Convert valid DTCG JSON tokens to CSS").argument("[files...]", "Positional JSON files").option("--stdin [name]", "Read JSON from stdin with optional virtual file name").option("--stdout", "Print generated CSS to stdout").option("-o, --out <file>", "Write generated CSS to a file instead of stdout").option("--output <file>", "Write generated CSS to a file instead of stdout").action(async (positionalInputs, options) => {
    const normalized = normalizeConvertArguments(
      positionalInputs,
      Boolean(options.stdin),
      typeof options.stdin === "string" ? options.stdin : void 0,
      typeof options.output === "string" ? options.output : typeof options.out === "string" ? options.out : void 0,
      Boolean(options.stdout)
    );
    const exitCode = await runConvertCommand(normalized.positionalFiles, {
      useStdin: normalized.normalizedOptions.useStdin,
      stdinName: normalized.normalizedOptions.stdinName,
      outFile: normalized.normalizedOptions.outFile,
      useStdout: normalized.normalizedOptions.useStdout
    });
    process.exitCode = exitCode;
  });
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof import_commander.CommanderError) {
      if (error.code === "commander.help" || error.code === "commander.helpDisplayed") {
        process.exitCode = 0;
        return;
      }
      logError(error.message);
      process.exitCode = typeof error.exitCode === "number" ? error.exitCode : 2;
      return;
    }
    throw error;
  }
}
run().catch((error) => {
  if (error instanceof Error) {
    logError(error.message);
  } else {
    logError("Unexpected CLI error.");
  }
  process.exitCode = 2;
});
