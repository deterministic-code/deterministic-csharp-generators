import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { createCasing, type PackCasing } from "./common/default-casing.ts";
import {
  DeterministicParser,
  DATASOURCE_TYPES_YAML,
  inheritedIdType,
  type DatasourceType,
  type IDeterministic,
} from "./specification-parser.ts";
import { convertSpecType } from "./base-type-converter.ts";
import { typeTmpl } from "./resources/datasource-types.ts";

const docTokens = (settings: Record<string, string>) => {
  const comments = settings["comments"];
  return {
    simpleDoc: comments !== "none" && comments !== "description",
    descriptionDoc: comments === "description",
  };
};

type EmitOptions = {
  idType: string;
  casing: PackCasing;
  schemaVersion: string;
  simpleDoc: boolean;
  descriptionDoc: boolean;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  idType: settings["datasource.id_type"] ?? "integer",
  casing: createCasing(settings),
  schemaVersion: settings["codegen.schema_version"] ?? "1.0",
  ...docTokens(settings),
});

const csTypeFor = (field: {
  type: string;
  isNullable: boolean;
}): string => {
  const t = convertSpecType(field.type);
  return field.isNullable ? `${t}?` : t;
};

const renderType = (
  table: DatasourceType,
  opts: EmitOptions,
): GenerateEntry => {
  const { idType, casing, schemaVersion, simpleDoc, descriptionDoc } = opts;
  const fields = table.fields;
  const className = casing.convertTypes(table.name);
  return content(
    casing.filePath(table.name),
    fill(typeTmpl, {
      schemaVersion,
      simpleDoc,
      descriptionDoc,
      className,
      datasourceType: table.datasourceType,
      fieldCount: String(fields.length),
      idType: convertSpecType(inheritedIdType(idType)),
      datetimeType: convertSpecType("datetime"),
      fields: fields.map((f) => ({
        ident: casing.convertFields(f.name),
        csType: csTypeFor(f),
      })),
    }),
  );
};

const generateFrom = (
  deterministic: IDeterministic,
  settings: Record<string, string>,
): GenerateEntry[] => {
  const opts = emitOptions(settings);
  return deterministic.expandedDatasourceTypes.map((table) =>
    renderType(table, opts),
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
