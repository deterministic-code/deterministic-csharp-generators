import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { viewPaths, type ArtifactPaths } from "./common/paths.ts";
import {
  SpecificationParser,
  type ViewField,
  type ViewType,
} from "./specification-parser.ts";
import { convertSpecType } from "./common/type-converter.ts";
import { typeTestTmpl } from "./resources/view-types-tests.ts";

type EmitOptions = {
  naming: ArtifactPaths;
  schemaVersion: string;
  datetimeRepr: string;
};

type FieldTok = {
  ident: string;
  sampleExpr: string;
  nextExpr: string;
  nullable: boolean;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  naming: viewPaths(settings),
  schemaVersion: settings["codegen.schema_version"] ?? "1.0",
  datetimeRepr: settings["datasource.datetime"] ?? "native",
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
    ? convertSpecType(field.base, opts.datetimeRepr)
    : opts.naming.className(field.base);

const fieldTokens = (field: ViewField, opts: EmitOptions): FieldTok => {
  const ident = opts.naming.fieldName(field.name);
  if (field.kind === "primitive") {
    const pair = samplesForNative(
      convertSpecType(field.base, opts.datetimeRepr),
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
  const cls = opts.naming.className(field.base);
  const obj = `new ${cls}()`;
  return {
    ident,
    sampleExpr: field.isArray ? `new List<${cls}> { ${obj} }` : obj,
    nextExpr: field.isArray ? `new List<${cls}> { ${obj} }` : obj,
    nullable: field.isNullable,
  };
};

const testPath = (entity: string, naming: ArtifactPaths): string =>
  naming.filePath(entity).replace(/\.cs$/, "Tests.cs");

const renderTests = (view: ViewType, opts: EmitOptions): GenerateEntry => {
  const fields =
    view.kind === "shaped"
      ? view.fields.map((f) => fieldTokens(f, opts))
      : [];
  return content(
    testPath(view.name, opts.naming),
    fill(typeTestTmpl, {
      schemaVersion: opts.schemaVersion,
      className: opts.naming.className(view.name),
      isShaped: view.kind === "shaped",
      isUnion: view.kind === "union",
      needsList: view.kind === "shaped" && view.fields.some((f) => f.isArray),
      fields,
      members:
        view.kind === "union"
          ? view.members.map((name) => ({
              ident: opts.naming.fieldName(name),
              memberClass: opts.naming.className(name),
            }))
          : [],
    }),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const opts = emitOptions(ctx.settings);
  const views = await new SpecificationParser(ctx.reader).loadViewTypes();
  return views.map((view) => renderTests(view, opts));
};
