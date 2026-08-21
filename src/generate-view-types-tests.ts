import { pascalCase } from "change-case";
import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import {
  createImportGenerator,
  type CsharpImportGenerator,
} from "./import-generator.ts";
import {
  DeterministicParser,
  VIEW_TYPES_YAML,
  type ViewField,
  type ViewType,
  type IDeterministic,
} from "./specification-parser.ts";
import { convertSpecType } from "./base-type-converter.ts";
import { typeTestTmpl } from "./resources/view-types-tests.ts";

type EmitOptions = {
  imports: CsharpImportGenerator;
  schemaVersion: string;
};

type FieldTok = {
  ident: string;
  sampleExpr: string;
  nextExpr: string;
  nullable: boolean;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  imports: createImportGenerator(".", settings),
  schemaVersion: settings["codegen.schema_version"] ?? "1.0",
});

const samplesForNative = (
  native: string,
  fieldType: string,
): { sample: string; next: string } => {
  switch (native) {
    case "long":
      return { sample: "1L", next: "2L" };
    case "short":
      return { sample: "(short)1", next: "(short)2" };
    case "double":
      return { sample: "1.0", next: "2.0" };
    case "bool":
      return { sample: "false", next: "true" };
    case "byte[]":
      return { sample: "new byte[] { }", next: "new byte[] { 1 }" };
    case "System.DateTime":
      return {
        sample: 'System.DateTime.Parse("2024-01-01T00:00:00.000Z")',
        next: 'System.DateTime.Parse("2024-01-02T00:00:00.000Z")',
      };
    default:
      if (fieldType === "decimal") return { sample: '"0"', next: '"1"' };
      if (fieldType === "uuid") {
        return {
          sample: '"00000000-0000-0000-0000-000000000000"',
          next: '"00000000-0000-0000-0000-000000000001"',
        };
      }
      if (fieldType === "datetime") {
        return {
          sample: '"2024-01-01T00:00:00.000Z"',
          next: '"2024-01-02T00:00:00.000Z"',
        };
      }
      return { sample: '"sample"', next: '"sample-next"' };
  }
};

const listElemType = (field: ViewField, opts: EmitOptions): string =>
  field.kind === "primitive"
    ? convertSpecType(field.base)
    : pascalCase(field.base);

const fieldTokens = (field: ViewField, opts: EmitOptions): FieldTok => {
  const ident = pascalCase(field.name);
  if (field.kind === "primitive") {
    const pair = samplesForNative(
      convertSpecType(field.base),
      field.base,
    );
    const elem = listElemType(field, opts);
    return {
      ident,
      sampleExpr: field.isArray
        ? `new List<${elem}> { ${pair.sample} }`
        : pair.sample,
      nextExpr: field.isArray
        ? `new List<${elem}> { ${pair.next} }`
        : pair.next,
      nullable: field.isNullable,
    };
  }
  const cls = pascalCase(field.base);
  const obj = `new ${cls}()`;
  return {
    ident,
    sampleExpr: field.isArray ? `new List<${cls}> { ${obj} }` : obj,
    nextExpr: field.isArray ? `new List<${cls}> { ${obj} }` : obj,
    nullable: field.isNullable,
  };
};

const testPath = (entity: string, imports: CsharpImportGenerator): string =>
  imports.test(imports.view(entity), entity);

const renderTests = (view: ViewType, opts: EmitOptions): GenerateEntry => {
  const fields =
    view.kind === "shaped"
      ? view.fields.map((f) => fieldTokens(f, opts))
      : [];
  return content(
    testPath(view.name, opts.imports),
    fill(typeTestTmpl, {
      schemaVersion: opts.schemaVersion,
      className: pascalCase(view.name),
      isShaped: view.kind === "shaped",
      isUnion: view.kind === "union",
      needsList: view.kind === "shaped" && view.fields.some((f) => f.isArray),
      fields,
      members:
        view.kind === "union"
          ? view.members.map((name) => ({
              ident: pascalCase(name),
              memberClass: pascalCase(name),
            }))
          : [],
    }),
  );
};

const generateFrom = (
  deterministic: IDeterministic,
  settings: Record<string, string>,
): GenerateEntry[] => {
  const opts = emitOptions(settings);
  return deterministic.expandedViewTypes.map((view) => renderTests(view, opts));
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  await ctx.reader.read(VIEW_TYPES_YAML);
  return generateFrom(
    await DeterministicParser(ctx.reader).parse(ctx.settings),
    ctx.settings,
  );
};
