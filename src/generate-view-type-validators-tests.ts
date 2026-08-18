import { pascalCase } from "change-case";
import {
  datasourceSettings,
  nativeFieldType,
  tableFields,
  type DatasourceSettings,
} from "./common/datasource-settings.ts";
import { fill } from "./common/fill.ts";
import type { GenerateContext, SettingsDict } from "./common/generate-context.ts";
import { content, type GenerateEntry } from "./common/generate-entry.ts";
import { csharpNaming, type ArtifactNaming } from "./common/naming.ts";
import {
  DATASOURCE_TYPES_YAML,
  parseDatasourceTypes,
  type DatasourceType,
} from "./common/parse-datasource-types.ts";
import {
  loadViewTypes,
  type ShapedView,
  type ViewField,
  type ViewType,
} from "./common/parse-view-types.ts";
import { settingsStr } from "./common/settings.ts";
import { convertSpecType } from "./common/type-converter.ts";
import { typeTestTmpl } from "./resources/view-type-validators-tests.ts";

type EmitOptions = {
  ds: DatasourceSettings;
  naming: ArtifactNaming;
  schemaVersion: string;
  tables: Map<string, DatasourceType>;
  views: Map<string, ViewType>;
};

type FieldTok = {
  ident: string;
  sampleExpr: string;
  nullable: boolean;
};

type CaseTok = {
  ident: string;
  fixture: string;
  assertion: string;
};

const emitBase = (settings: SettingsDict) => ({
  ds: datasourceSettings(settings),
  naming: csharpNaming(settings),
  schemaVersion: settingsStr(settings, "codegen.schema_version") ?? "1.0",
});

const samplesForNative = (
  native: string,
  fieldType: string,
): { sample: string; next: string } => {
  switch (native) {
    case "int":
      return { sample: "1", next: "2" };
    case "long":
      return { sample: "1L", next: "2L" };
    case "short":
      return { sample: "(short)1", next: "(short)2" };
    case "uint":
      return { sample: "1U", next: "2U" };
    case "ulong":
      return { sample: "1UL", next: "2UL" };
    case "ushort":
      return { sample: "(ushort)1", next: "(ushort)2" };
    case "double":
      return { sample: "1.0", next: "2.0" };
    case "bool":
      return { sample: "false", next: "true" };
    case "System.Guid":
      return {
        sample: 'System.Guid.Parse("00000000-0000-0000-0000-000000000000")',
        next: 'System.Guid.Parse("00000000-0000-0000-0000-000000000001")',
      };
    case "byte[]":
      return { sample: "new byte[] { }", next: "new byte[] { 1 }" };
    case "System.DateTime":
      return {
        sample: 'System.DateTime.Parse("2024-01-01T00:00:00.000Z")',
        next: 'System.DateTime.Parse("2024-01-02T00:00:00.000Z")',
      };
    case "string":
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
    default:
      throw new Error(`Unknown csharp native type: ${native}`);
  }
};

const dsType = (name: string, naming: ArtifactNaming): string =>
  `Backend.Types.Datasource.${naming.className(name)}`;

const viewType = (name: string, naming: ArtifactNaming): string =>
  `Backend.Types.View.${naming.className(name)}`;

const wrapValue = (
  expr: string,
  field: { isArray: boolean },
  elemType: string,
): string => (field.isArray ? `new List<${elemType}> { ${expr} }` : expr);

const objectLiteral = (
  cls: string,
  fields: Array<{ ident: string; expr: string }>,
): string =>
  `new ${cls} { ${fields.map((f) => `${f.ident} = ${f.expr}`).join(", ")} }`;

const renderDs = (name: string, opts: EmitOptions): string => {
  const table = opts.tables.get(name);
  const cls = dsType(name, opts.naming);
  if (table === undefined) return `new ${cls}()`;
  return objectLiteral(
    cls,
    tableFields(table.fields, opts.ds).map((f) => {
      const { sample } = samplesForNative(nativeFieldType(opts.ds, f), f.type);
      return { ident: opts.naming.fieldName(f.name), expr: sample };
    }),
  );
};

const parentToks = (view: ShapedView, opts: EmitOptions): FieldTok[] => {
  if (view.inherits === null) return [];
  const table = opts.tables.get(view.inherits);
  if (table === undefined) return [];
  const inline = view.enrichments.length > 0 || view.omit.length > 0;
  const omit = inline
    ? new Set([
        ...view.omit,
        ...view.enrichments.map((e) => e.fkColumn),
      ])
    : new Set<string>();
  return tableFields(table.fields, opts.ds)
    .filter((f) => !omit.has(f.name))
    .map((f) => {
      const native = nativeFieldType(opts.ds, f);
      const { sample } = samplesForNative(native, f.type);
      return {
        ident: opts.naming.fieldName(f.name),
        sampleExpr: sample,
        nullable: f.isNullable,
      };
    });
};

const viewFieldTok = (
  field: ViewField,
  opts: EmitOptions,
  visited: Set<string>,
): FieldTok => {
  const ident = opts.naming.fieldName(field.name);
  let sample: string;
  let elemType: string;
  if (field.kind === "primitive") {
    const native = convertSpecType(field.base, opts.ds.datetimeRepr);
    sample = samplesForNative(native, field.base).sample;
    elemType = native;
  } else if (field.kind === "datasource") {
    sample = renderDs(field.base, opts);
    elemType = dsType(field.base, opts.naming);
  } else {
    sample = viewFixture(field.base, opts, visited);
    elemType = viewType(field.base, opts.naming);
  }
  return {
    ident,
    sampleExpr: wrapValue(sample, field, elemType),
    nullable: field.isNullable,
  };
};

const shapedToks = (
  view: ShapedView,
  opts: EmitOptions,
  visited: Set<string>,
): FieldTok[] => {
  const declared = view.fields.map((f) => viewFieldTok(f, opts, visited));
  if (view.inherits === null) return declared;
  return [...parentToks(view, opts), ...declared];
};

const viewFixture = (
  name: string,
  opts: EmitOptions,
  visited: Set<string>,
): string => {
  const cls = viewType(name, opts.naming);
  if (visited.has(name)) return `new ${cls}()`;
  const view = opts.views.get(name);
  if (view === undefined) return `new ${cls}()`;
  const next = new Set(visited).add(name);
  if (view.kind === "union") {
    const member = view.members[0];
    return member === undefined ? `new ${cls}()` : viewFixture(member, opts, next);
  }
  return objectLiteral(
    cls,
    shapedToks(view, opts, next).map((f) => ({
      ident: f.ident,
      expr: f.sampleExpr,
    })),
  );
};

const shapedCases = (view: ShapedView, opts: EmitOptions): CaseTok[] => {
  const fields = shapedToks(view, opts, new Set([view.name]));
  const cls = viewType(view.name, opts.naming);
  const cases: CaseTok[] = [
    {
      ident: "ParsesAValidPayload",
      fixture: objectLiteral(
        cls,
        fields.map((f) => ({ ident: f.ident, expr: f.sampleExpr })),
      ),
      assertion: "True",
    },
  ];
  if (fields.some((f) => f.nullable)) {
    cases.push({
      ident: "AcceptsNullForNullableFields",
      fixture: objectLiteral(
        cls,
        fields.map((f) => ({
          ident: f.ident,
          expr: f.nullable ? "null" : f.sampleExpr,
        })),
      ),
      assertion: "True",
    });
  }
  for (const field of view.fields) {
    if (field.kind !== "primitive" || field.isNullable || field.isArray) {
      continue;
    }
    const native = convertSpecType(field.base, opts.ds.datetimeRepr);
    if (native !== "string") continue;
    const ident = opts.naming.fieldName(field.name);
    cases.push({
      ident: `RejectsNullFor${pascalCase(ident)}`,
      fixture: objectLiteral(
        cls,
        fields.map((f) => ({
          ident: f.ident,
          expr: f.ident === ident ? "null" : f.sampleExpr,
        })),
      ),
      assertion: "False",
    });
  }
  return cases;
};

const unionCases = (
  view: Extract<ViewType, { kind: "union" }>,
  opts: EmitOptions,
): CaseTok[] =>
  view.members.map((name) => ({
    ident: `Accepts${opts.naming.className(name)}Member`,
    fixture: viewFixture(name, opts, new Set([view.name])),
    assertion: "True",
  }));

const renderTests = (view: ViewType, opts: EmitOptions): GenerateEntry => {
  const cases =
    view.kind === "union" ? unionCases(view, opts) : shapedCases(view, opts);
  return content(
    opts.naming.filePath(view.name).replace(/\.cs$/, "ValidatorTests.cs"),
    fill(typeTestTmpl, {
      schemaVersion: opts.schemaVersion,
      className: opts.naming.className(view.name),
      validatorClass: `${opts.naming.className(view.name)}Validator`,
      isUnion: view.kind === "union",
      needsList: cases.some((c) => c.fixture.includes("new List<")),
      cases,
    }),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const base = emitBase(ctx.settings);
  const views = await loadViewTypes(ctx.reader);
  const tables = (await ctx.reader.exists(DATASOURCE_TYPES_YAML))
    ? parseDatasourceTypes({
        yaml: await ctx.reader.read(DATASOURCE_TYPES_YAML),
        idType: base.ds.idType,
      })
    : [];
  const opts: EmitOptions = {
    ...base,
    tables: new Map(tables.map((t) => [t.name, t])),
    views: new Map(views.map((v) => [v.name, v])),
  };
  return views.map((view) => renderTests(view, opts));
};
