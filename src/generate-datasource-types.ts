import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { datasourcePaths, type ArtifactPaths } from "./common/paths.ts";
import {
  declaredFields,
  inheritedIdType,
  SpecificationParser,
  type DatasourceType,
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
  naming: ArtifactPaths;
  schemaVersion: string;
  simpleDoc: boolean;
  descriptionDoc: boolean;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  idType: settings["datasource.id_type"] ?? "integer",
  naming: datasourcePaths(settings),
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
  const { idType, naming, schemaVersion, simpleDoc, descriptionDoc } = opts;
  const fields = declaredFields(table.fields, idType);
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
      idType: convertSpecType(inheritedIdType(idType)),
      datetimeType: convertSpecType("datetime"),
      fields: fields.map((f) => ({
        ident: naming.fieldName(f.name),
        csType: csTypeFor(f),
      })),
    }),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const opts = emitOptions(ctx.settings);
  const types = await new SpecificationParser(ctx.reader).loadDatasourceTypes(
    opts.idType,
  );
  return types.map((table) => renderType(table, opts));
};
