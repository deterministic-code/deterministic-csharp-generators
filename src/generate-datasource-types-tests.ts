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
import { settingsStr } from "./common/settings.ts";
import { typeTestTmpl } from "./resources/datasource-types-tests.ts";

type EmitOptions = {
  ds: DatasourceSettings;
  naming: ArtifactNaming;
  schemaVersion: string;
};

const emitOptions = (settings: SettingsDict): EmitOptions => ({
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
      if (fieldType === "decimal") {
        return { sample: '"0"', next: '"1"' };
      }
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
      if (fieldType === "date") {
        return { sample: '"2024-01-01"', next: '"2024-01-02"' };
      }
      if (fieldType === "email") {
        return {
          sample: '"sample@example.com"',
          next: '"next@example.com"',
        };
      }
      return { sample: '"sample"', next: '"sample-next"' };
    default:
      throw new Error(`Unknown csharp native type: ${native}`);
  }
};

const fieldTokens = (
  field: { name: string; type: string; isNullable: boolean },
  opts: EmitOptions,
) => {
  const ident = opts.naming.fieldName(field.name);
  const native = nativeFieldType(opts.ds, field);
  const { sample, next } = samplesForNative(native, field.type);
  return {
    ident,
    sampleExpr: sample,
    nextExpr: next,
    nullable: field.isNullable,
  };
};

const testPath = (entity: string, naming: ArtifactNaming): string =>
  naming.filePath(entity).replace(/\.cs$/, "Tests.cs");

const renderTests = (
  table: DatasourceType,
  opts: EmitOptions,
): GenerateEntry => {
  const fields = tableFields(table.fields, opts.ds).map((f) =>
    fieldTokens(f, opts),
  );
  return content(
    testPath(table.name, opts.naming),
    fill(typeTestTmpl, {
      schemaVersion: opts.schemaVersion,
      className: opts.naming.className(table.name),
      fields,
    }),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const opts = emitOptions(ctx.settings);
  const types = parseDatasourceTypes({
    yaml: await ctx.reader.read(DATASOURCE_TYPES_YAML),
    idType: opts.ds.idType,
  });
  return types.map((table) => renderTests(table, opts));
};
