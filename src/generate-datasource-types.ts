import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { datasourcePaths, type ArtifactPaths } from "./common/paths.ts";
import {
  SpecificationParser,
  type DatasourceType,
} from "./specification-parser.ts";
import { convertSpecType, idTypeToNative, nativeFieldType } from "./common/type-converter.ts";
import { typeTmpl } from "./resources/datasource-types.ts";

type Datasource = {
  idType: string;
  datetimeRepr: string;
  withUuidColumn: boolean;
};

const datasource = (settings: Record<string, string>): Datasource => {
  const idType = settings["datasource.id_type"] ?? "integer";
  return {
    idType,
    datetimeRepr: settings["datasource.datetime"] ?? "native",
    withUuidColumn: idType !== "uuid",
  };
};

const docTokens = (settings: Record<string, string>) => {
  const comments = settings["comments"];
  return {
    simpleDoc: comments !== "none" && comments !== "description",
    descriptionDoc: comments === "description",
  };
};

type EmitOptions = {
  ds: Datasource;
  naming: ArtifactPaths;
  schemaVersion: string;
  simpleDoc: boolean;
  descriptionDoc: boolean;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => {
  const ds = datasource(settings);
  return {
    ds,
    naming: datasourcePaths(settings),
    schemaVersion: settings["codegen.schema_version"] ?? "1.0",
    ...docTokens(settings),
  };
};

const tableFields = (
  table: DatasourceType,
  ds: Datasource,
): Array<{ name: string; type: string; isNullable: boolean }> =>
  [
    { name: "id", type: ds.idType, isNullable: false },
    { name: "uuid", type: "uuid", isNullable: false },
    { name: "created", type: "datetime", isNullable: false },
    { name: "updated", type: "datetime", isNullable: false },
    ...table.fields,
  ].filter((f) => ds.withUuidColumn || f.name !== "uuid");

const csTypeFor = (
  field: {
    name: string;
    type: string;
    isNullable: boolean;
    references?: string;
  },
  ds: Datasource,
): string => {
  const t = nativeFieldType(ds, field);
  return field.isNullable ? `${t}?` : t;
};

const renderType = (
  table: DatasourceType,
  opts: EmitOptions,
): GenerateEntry => {
  const { ds, naming, schemaVersion, simpleDoc, descriptionDoc } = opts;
  const fields = tableFields(table, ds);
  const dt = convertSpecType("datetime", ds.datetimeRepr);
  const className = naming.className(table.name);
  return content(
    naming.filePath(table.name),
    fill(typeTmpl, {
      schemaVersion,
      simpleDoc,
      descriptionDoc,
      className,
      datasourceType: table.datasourceType,
      fieldCount: String(fields.length),
      base: ds.withUuidColumn
        ? "StandardDataSourceWithUuid"
        : "StandardDataSource",
      typeArgs: ds.withUuidColumn
        ? `${idTypeToNative(ds.idType)}, string, ${dt}`
        : `${idTypeToNative(ds.idType)}, ${dt}`,
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
  const types = await new SpecificationParser(ctx.reader).loadDatasourceTypes(opts.ds.idType);
  return types.map((table) => renderType(table, opts));
};
