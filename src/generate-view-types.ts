import { pascalCase } from "change-case";
import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import {
  createImportGenerator,
  type CsharpImportGenerator,
} from "./import-generator.ts";
import { emitViewFields, inlinesParent } from "./common/view-shape.ts";
import {
  DeterministicParser,
  VIEW_TYPES_YAML,
  type ViewField,
  type ViewType,
  type IDeterministic,
} from "./specification-parser.ts";
import { convertSpecType } from "./base-type-converter.ts";
import { typeTmpl } from "./resources/view-types.ts";

const docTokens = (settings: Record<string, string>) => {
  const comments = settings["comments"];
  return {
    simpleDoc: comments !== "none" && comments !== "description",
    descriptionDoc: comments === "description",
  };
};

type EmitOptions = {
  imports: CsharpImportGenerator;
  schemaVersion: string;
  simpleDoc: boolean;
  descriptionDoc: boolean;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  imports: createImportGenerator(".", settings),
  schemaVersion: settings["codegen.schema_version"] ?? "1.0",
  ...docTokens(settings),
});

const csTypeFor = (field: ViewField, opts: EmitOptions): string => {
  let base =
    field.kind === "primitive"
      ? convertSpecType(field.base)
      : field.kind === "datasource"
        ? opts.imports.datasourceQual(field.base)
        : pascalCase(field.base);
  if (field.isArray) base = `List<${base}>`;
  return field.isNullable ? `${base}?` : base;
};

const renderView = (
  view: ViewType,
  expanded: ViewType | undefined,
  opts: EmitOptions,
): GenerateEntry => {
  const className = pascalCase(view.name);
  const isUnion = view.kind === "union";
  const fields = isUnion
    ? []
    : emitViewFields(view, expanded).map((f) => ({
        ident: pascalCase(f.name),
        csType: csTypeFor(f, opts),
      }));
  const hasExtends =
    !isUnion && view.inherits !== null && !inlinesParent(view);
  const needsList =
    !isUnion && view.kind === "shaped" && view.fields.some((f) => f.isArray);
  return content(
    opts.imports.view(view.name),
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
          ? opts.imports.datasourceQual(view.inherits)
          : "",
      fields,
    }),
  );
};

const generateFrom = (
  deterministic: IDeterministic,
  settings: Record<string, string>,
): GenerateEntry[] => {
  const opts = emitOptions(settings);
  const expandedByName = new Map(
    deterministic.expandedViewTypes.map((v) => [v.name, v]),
  );
  return deterministic.viewTypes.map((view) =>
    renderView(view, expandedByName.get(view.name), opts),
  );
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
