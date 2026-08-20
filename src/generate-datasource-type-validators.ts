import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { datasourcePaths, type ArtifactPaths } from "./common/paths.ts";
import {
  inheritedIdType,
  DeterministicParser,
  DATASOURCE_TYPES_YAML,
  type DatasourceField,
  type DatasourceType,
  type IDeterministic,
} from "./specification-parser.ts";
import { convertSpecType } from "./base-type-converter.ts";
import { isFiniteInt, isFiniteNumber } from "@deterministic-code/generators-common/yaml-entry";
import { typeTmpl } from "./resources/datasource-type-validators.ts";

type EmitOptions = {
  idType: string;
  naming: ArtifactPaths;
  schemaVersion: string;
  namespace: string;
  typesNamespace: string;
};

type FieldShape = {
  name: string;
  type: string;
  isNullable: boolean;
  references?: string;
  minSize?: number;
  size?: number;
};

const STANDARD_COLUMN_NAMES = new Set(["id", "uuid", "created", "updated"]);

const UUID_PATTERN =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  idType: settings["datasource.id_type"] ?? "integer",
  naming: datasourcePaths(settings),
  schemaVersion: settings["codegen.schema_version"] ?? "1.0",
  namespace: "Backend.Validators.Datasource",
  typesNamespace: "Backend.Types.Datasource",
});

const numericLiteralForNative = (
  native: string,
  value: number,
): string | null => {
  switch (native) {
    case "int":
      return String(value);
    case "long":
      return `${value}L`;
    case "short":
      return `(short)${value}`;
    case "uint":
      return `${value}U`;
    case "ulong":
      return `${value}UL`;
    case "ushort":
      return `(ushort)${value}`;
    case "double":
      return Number.isInteger(value) ? `${value}.0` : String(value);
    default:
      return null;
  }
};

const numericLiteral = (fieldType: string, value: number): string => {
  const native = convertSpecType(fieldType);
  return numericLiteralForNative(native, value) ?? String(value);
};

const tightenString = (field: FieldShape): string[] => {
  const rules: string[] = [];
  if (isFiniteInt(field.minSize) && field.minSize! >= 0) {
    rules.push(`MinimumLength(${field.minSize})`);
  }
  if (isFiniteInt(field.size) && field.size! >= 0) {
    rules.push(`MaximumLength(${field.size})`);
  }
  return rules;
};

const tightenNumber = (field: FieldShape): string[] => {
  const rules: string[] = [];
  const lit = (v: number) => numericLiteral(field.type, v);
  const isFk =
    typeof field.references === "string" && field.references.length > 0;
  const isIdLike = field.name === "id" || field.name.endsWith("_id");
  if (isFk || isIdLike) {
    rules.push(`GreaterThanOrEqualTo(${lit(0)})`);
  } else if (isFiniteInt(field.minSize)) {
    rules.push(`GreaterThanOrEqualTo(${lit(field.minSize!)})`);
  }
  if (isFiniteInt(field.size)) {
    rules.push(`LessThanOrEqualTo(${lit(field.size!)})`);
  }
  return rules;
};

const tightenFloat = (field: FieldShape): string[] => {
  const rules: string[] = [];
  if (isFiniteNumber(field.minSize)) {
    rules.push(
      `GreaterThanOrEqualTo(${numericLiteral(field.type, field.minSize!)})`,
    );
  }
  if (isFiniteNumber(field.size)) {
    rules.push(
      `LessThanOrEqualTo(${numericLiteral(field.type, field.size!)})`,
    );
  }
  return rules;
};

const tightenedRulesFor = (field: FieldShape): string[] => {
  switch (field.type) {
    case "string":
    case "character":
      return tightenString(field);
    case "uuid":
      return [`Matches("${UUID_PATTERN}")`];
    case "number":
    case "integer":
    case "smallinteger":
    case "biginteger":
    case "reference":
      return tightenNumber(field);
    case "float":
      return tightenFloat(field);
    default:
      return [];
  }
};

const ruleLine = (field: FieldShape, opts: EmitOptions): string => {
  const prop = opts.naming.fieldName(field.name);
  const tightened = tightenedRulesFor(field);
  const parts: string[] = [];
  if (!field.isNullable) parts.push("NotNull()");
  for (const r of tightened) parts.push(r);
  if (parts.length === 0) {
    return `        RuleFor(x => x.${prop});`;
  }
  const head = `        RuleFor(x => x.${prop})`;
  const chain = parts.map((p) => `            .${p}`).join("\n");
  if (field.isNullable && tightened.length > 0) {
    return `${head}\n${chain}\n            .When(x => x.${prop} != null);`;
  }
  return `${head}\n${chain};`;
};

const standardRuleLine = (name: string, opts: EmitOptions): string => {
  const prop = opts.naming.fieldName(name);
  if (name === "id") {
    const bound = numericLiteralForNative(
      convertSpecType(inheritedIdType(opts.idType)),
      0,
    );
    const numeric = bound
      ? `\n            .GreaterThanOrEqualTo(${bound})`
      : "";
    return `        RuleFor(x => x.${prop})\n            .NotNull()${numeric};`;
  }
  return `        RuleFor(x => x.${prop})\n            .NotNull();`;
};

const validatorPath = (entity: string, naming: ArtifactPaths): string =>
  `Datasource${naming.filePath(entity).replace(/\.cs$/, "")}Validator.cs`;

const renderValidator = (
  table: DatasourceType,
  opts: EmitOptions,
): GenerateEntry => {
  const className = opts.naming.className(table.name);
  const rules = table.fields.map((field: DatasourceField) =>
    STANDARD_COLUMN_NAMES.has(field.name)
      ? standardRuleLine(field.name, opts)
      : ruleLine(field, opts),
  );
  return content(
    validatorPath(table.name, opts.naming),
    fill(typeTmpl, {
      schemaVersion: opts.schemaVersion,
      namespace: opts.namespace,
      typesNamespace: opts.typesNamespace,
      className,
      validatorClass: `Datasource${className}Validator`,
      rules: rules.map((line) => ({ line })),
    }),
  );
};

const generateFrom = (
  deterministic: IDeterministic,
  settings: Record<string, string>,
): GenerateEntry[] => {
  const opts = emitOptions(settings);
  return deterministic.expandedDatasourceTypes.map((table) =>
    renderValidator(table, opts),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  await ctx.reader.read(DATASOURCE_TYPES_YAML);
  return generateFrom(
    await DeterministicParser(ctx.reader).parse(ctx.settings),
    ctx.settings,
  );
};
