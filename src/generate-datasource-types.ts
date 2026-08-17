import {
  datasourceSettings,
  type DatasourceSettings,
} from "./common/datasource-settings.ts";
import { commentStyle, type CommentStyle } from "./common/doc-comment.ts";
import { fill } from "./common/fill.ts";
import type { GenerateContext, SettingsDict } from "./common/generate-context.ts";
import { content, type GenerateEntry } from "./common/generate-entry.ts";
import { csharpNaming, type ArtifactNaming } from "./common/naming.ts";
import {
  loadDatasourceTypes,
  type DatasourceType,
} from "./common/parse-datasource-types.ts";
import { settingsStr } from "./common/settings.ts";
import { convertSpecType } from "./common/type-converter.ts";
import { typeTmpl } from "./datasource-types/resources.ts";

type EmitOptions = {
  ds: DatasourceSettings;
  naming: ArtifactNaming;
  schemaVersion: string;
  style: CommentStyle;
};

const emitOptions = (settings: SettingsDict): EmitOptions => {
  const ds = datasourceSettings(settings);
  return {
    ds,
    naming: csharpNaming(settings),
    schemaVersion: settingsStr(settings, "codegen.schema_version") ?? "1.0",
    style: commentStyle(settingsStr(settings, "comments")),
  };
};

const tableFields = (
  table: DatasourceType,
  ds: DatasourceSettings,
): Array<{ name: string; type: string; isNullable: boolean }> =>
  [
    { name: "id", type: ds.idType, isNullable: false },
    { name: "uuid", type: "uuid", isNullable: false },
    { name: "created", type: "datetime", isNullable: false },
    { name: "updated", type: "datetime", isNullable: false },
    ...table.fields,
  ].filter((f) => ds.withUuidColumn || f.name !== "uuid");

const csTypeFor = (
  field: { name: string; type: string; isNullable: boolean },
  ds: DatasourceSettings,
): string => {
  const t =
    field.name === "id"
      ? ds.csharpIdType
      : convertSpecType(field.type, ds.datetimeRepr);
  return field.isNullable ? `${t}?` : t;
};

const renderType = (
  table: DatasourceType,
  opts: EmitOptions,
): GenerateEntry => {
  const { ds, naming, schemaVersion, style } = opts;
  const fields = tableFields(table, ds);
  const dt = convertSpecType("datetime", ds.datetimeRepr);
  const className = naming.className(table.name);
  return content(
    naming.filePath(table.name),
    fill(typeTmpl, {
      schemaVersion,
      simpleDoc: style === "simple",
      descriptionDoc: style === "description",
      className,
      datasourceType: table.datasourceType,
      fieldCount: String(fields.length),
      base: ds.withUuidColumn
        ? "StandardDataSourceWithUuid"
        : "StandardDataSource",
      typeArgs: ds.withUuidColumn
        ? `${ds.csharpIdType}, string, ${dt}`
        : `${ds.csharpIdType}, ${dt}`,
      fields: fields.map((f) => ({
        ident: naming.fieldName(f.name),
        csType: csTypeFor(f, ds),
      })),
    }),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const opts = emitOptions(ctx.settings);
  const types = await loadDatasourceTypes(ctx.reader, opts.ds.idType);
  return types.map((table) => renderType(table, opts));
};
