import {
  datasourceSettings,
  nativeFieldType,
  tableFields,
  type DatasourceSettings,
} from "./common/datasource-settings.ts";
import { commentStyle, type CommentStyle } from "./common/doc-comment.ts";
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
import { typeTmpl } from "./resources/view-types.ts";

type EmitOptions = {
  ds: DatasourceSettings;
  naming: ArtifactNaming;
  schemaVersion: string;
  style: CommentStyle;
  tables: Map<string, DatasourceType>;
};

const emitBase = (settings: SettingsDict) => ({
  ds: datasourceSettings(settings),
  naming: csharpNaming(settings),
  schemaVersion: settingsStr(settings, "codegen.schema_version") ?? "1.0",
  style: commentStyle(settingsStr(settings, "comments")),
});

const inlinesParent = (view: ShapedView): boolean =>
  view.inherits !== null &&
  (view.enrichments.length > 0 || view.omit.length > 0);

const csTypeFor = (field: ViewField, opts: EmitOptions): string => {
  let base =
    field.kind === "primitive"
      ? convertSpecType(field.base, opts.ds.datetimeRepr)
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
  return tableFields(table.fields, opts.ds)
    .filter((f) => !omit.has(f.name))
    .map((f) => {
      const native = nativeFieldType(opts.ds, f);
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
      simpleDoc: opts.style === "simple",
      descriptionDoc: opts.style === "description",
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
  };
  return views.map((view) => renderView(view, opts));
};
