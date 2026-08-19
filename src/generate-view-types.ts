import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { viewPaths, type ArtifactPaths } from "./common/paths.ts";
import {
  tableFields,
  SpecificationParser,
  DATASOURCE_TYPES_YAML,
  type DatasourceType,
  type ShapedView,
  type ViewField,
  type ViewType,
} from "./specification-parser.ts";
import { convertSpecType } from "./base-type-converter.ts";
import { typeTmpl } from "./resources/view-types.ts";

type Datasource = {
  idType: string;
  withUuidColumn: boolean;
};

const datasource = (settings: Record<string, string>): Datasource => {
  const idType = settings["datasource.id_type"] ?? "integer";
  return {
    idType,
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
  tables: Map<string, DatasourceType>;
};

const emitBase = (settings: Record<string, string>) => ({
  ds: datasource(settings),
  naming: viewPaths(settings),
  schemaVersion: settings["codegen.schema_version"] ?? "1.0",
  ...docTokens(settings),
});

const inlinesParent = (view: ShapedView): boolean =>
  view.inherits !== null &&
  (view.enrichments.length > 0 || view.omit.length > 0);

const csTypeFor = (field: ViewField, opts: EmitOptions): string => {
  let base =
    field.kind === "primitive"
      ? convertSpecType(field.base)
      : field.kind === "datasource"
        ? `Backend.Types.Datasource.${opts.naming.className(field.base)}`
        : opts.naming.className(field.base);
  if (field.isArray) base = `List<${base}>`;
  return field.isNullable ? `${base}?` : base;
};

const parentFields = (view: ShapedView, opts: EmitOptions) => {
  if (view.inherits === null) return [];
  const table = opts.tables.get(view.inherits);
  if (table === undefined) return [];
  const omit = new Set([
    ...view.omit,
    ...view.enrichments.map((e) => e.fkColumn),
  ]);
  return tableFields(table.fields, opts.ds.idType)
    .filter((f) => !omit.has(f.name))
    .map((f) => {
      const native = convertSpecType(f.type);
      return {
        ident: opts.naming.fieldName(f.name),
        csType: f.isNullable ? `${native}?` : native,
      };
    });
};

const classFields = (view: ShapedView, opts: EmitOptions) => {
  const declared = view.fields.map((f) => ({
    ident: opts.naming.fieldName(f.name),
    csType: csTypeFor(f, opts),
  }));
  if (view.inherits === null || !inlinesParent(view)) return declared;
  return [...parentFields(view, opts), ...declared];
};

const renderView = (view: ViewType, opts: EmitOptions): GenerateEntry => {
  const className = opts.naming.className(view.name);
  const isUnion = view.kind === "union";
  const fields = isUnion ? [] : classFields(view, opts);
  const hasExtends =
    !isUnion && view.inherits !== null && !inlinesParent(view);
  const needsList =
    !isUnion && view.kind === "shaped" && view.fields.some((f) => f.isArray);
  return content(
    opts.naming.filePath(view.name),
    fill(typeTmpl, {
      schemaVersion: opts.schemaVersion,
      needsList,
      simpleDoc: opts.simpleDoc,
      descriptionDoc: opts.descriptionDoc,
      className,
      datasourceType: isUnion ? "standard" : (view.inherits ?? "standard"),
      target: isUnion ? "UnionView" : "ShapedView",
      fieldCount: String(isUnion ? view.members.length : fields.length),
      isUnion,
      isShaped: !isUnion,
      hasExtends,
      extendsType:
        hasExtends && view.kind === "shaped" && view.inherits !== null
          ? `Backend.Types.Datasource.${opts.naming.className(view.inherits)}`
          : "",
      fields,
    }),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const base = emitBase(ctx.settings);
  const views = await new SpecificationParser(ctx.reader).loadViewTypes();
  const tables = (await ctx.reader.exists(DATASOURCE_TYPES_YAML))
    ? new SpecificationParser().parseDatasourceTypes({
        yaml: await ctx.reader.read(DATASOURCE_TYPES_YAML),
        idType: base.ds.idType,
      })
    : [];
  const opts: EmitOptions = {
    ...base,
    tables: new Map(tables.map((t) => [t.name, t])),
  };
  return views.map((view) => renderView(view, opts));
};
