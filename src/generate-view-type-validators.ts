import { pascalCase } from "change-case";
import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { viewPaths, type ArtifactPaths } from "./common/paths.ts";
import {
  SpecificationParser,
  type ShapedView,
  type ViewField,
  type ViewType,
} from "./specification-parser.ts";
import { typeTmpl } from "./resources/view-type-validators.ts";

type EmitOptions = {
  naming: ArtifactPaths;
  schemaVersion: string;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  naming: viewPaths(settings),
  schemaVersion: settings["codegen.schema_version"] ?? "1.0",
});

const viewValidator = (name: string, naming: ArtifactPaths): string =>
  `${naming.className(name)}Validator`;

const datasourceValidator = (name: string, naming: ArtifactPaths): string =>
  `Datasource${naming.className(name)}Validator`;

const nestedValidator = (field: ViewField, naming: ArtifactPaths): string =>
  field.kind === "datasource"
    ? datasourceValidator(field.base, naming)
    : viewValidator(field.base, naming);

const ruleLine = (field: ViewField, opts: EmitOptions): string => {
  const prop = opts.naming.fieldName(field.name);
  const notNull = field.isNullable ? "" : "\n            .NotNull()";
  if (field.isArray) {
    const each =
      field.kind === "primitive"
        ? ""
        : `\n            .ForEach(x => x.SetValidator(new ${nestedValidator(field, opts.naming)}()))`;
    return `        RuleFor(x => x.${prop})${notNull}${each};`;
  }
  if (field.kind === "primitive") {
    return `        RuleFor(x => x.${prop})${notNull};`;
  }
  return `        RuleFor(x => x.${prop})${notNull}\n            .SetValidator(new ${nestedValidator(field, opts.naming)}());`;
};

const inlinesParent = (view: ShapedView): boolean =>
  view.inherits !== null &&
  (view.enrichments.length > 0 || view.omit.length > 0);

const validatorPath = (entity: string, naming: ArtifactPaths): string =>
  naming.filePath(entity).replace(/\.cs$/, "Validator.cs");

const renderView = (view: ViewType, opts: EmitOptions): GenerateEntry => {
  const className = opts.naming.className(view.name);
  const validatorClass = viewValidator(view.name, opts.naming);
  if (view.kind === "union") {
    return content(
      validatorPath(view.name, opts.naming),
      fill(typeTmpl, {
        schemaVersion: opts.schemaVersion,
        isUnion: true,
        isShaped: false,
        className,
        validatorClass,
        branches: view.members.map((m) => {
          const memberCls = opts.naming.className(m);
          const alias = `as${pascalCase(m)}`;
          return {
            line: `if (obj is Backend.Types.View.${memberCls} ${alias}) { new ${viewValidator(m, opts.naming)}().ValidateAndThrow(${alias}); return; }`,
          };
        }),
        rules: [],
      }),
    );
  }
  const include =
    view.inherits && !inlinesParent(view)
      ? `        Include(new ${datasourceValidator(view.inherits, opts.naming)}());`
      : null;
  const rules = [include, ...view.fields.map((f) => ruleLine(f, opts))].filter(
    (x): x is string => x !== null && x !== "",
  );
  return content(
    validatorPath(view.name, opts.naming),
    fill(typeTmpl, {
      schemaVersion: opts.schemaVersion,
      isUnion: false,
      isShaped: true,
      className,
      validatorClass,
      rules: rules.map((line) => ({ line })),
      branches: [],
    }),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const opts = emitOptions(ctx.settings);
  const views = await new SpecificationParser(ctx.reader).loadViewTypes();
  return views.map((view) => renderView(view, opts));
};
