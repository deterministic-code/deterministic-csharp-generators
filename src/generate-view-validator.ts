import { toCase } from "@deterministic-code/generator-sdk/case";
import {
  buildViewGenerator,
  renderByViewKind,
  type ShapedView,
  type UnionView,
  type View,
  type ViewField,
} from "@deterministic-code/generator-sdk/codegen/lib/generate-view-shared";
import { viewGenerator } from "@deterministic-code/generator-sdk/codegen-context";
import { CsharpImports } from "./csharp-imports.ts";
import { datetimeOptionFromSettings } from "@deterministic-code/generator-sdk/codegen/lib/generate-settings-options";

export const DEFAULT_GENERATE_OPTIONS = {
  schemaVersion: "1.0",
  namespace: "Backend.Validators.View",
  typesNamespace: "Backend.Types.View",
  datasourceNamespace: "Backend.Types.Datasource",
  datasourceValidatorsNamespace: "Backend.Validators.Datasource",
};

interface CsharpValidatorOpts {
  schemaVersion: string;
  namespace: string;
  typesNamespace: string;
  datasourceNamespace: string;
  datasourceValidatorsNamespace: string;
}

interface CsharpValidatorCtx {
  names: {
    className(n: string): string;
    fileBase(n: string, a: string): string;
    ext: string;
  };
  fields: { name(n: string): string };
  opts: CsharpValidatorOpts;
}

function viewValidator(name: string, ctx: CsharpValidatorCtx): string {
  return `${ctx.names.className(name)}Validator`;
}

function datasourceValidator(name: string, ctx: CsharpValidatorCtx): string {
  return `Datasource${ctx.names.className(name)}Validator`;
}

function nestedValidatorName(
  field: ViewField,
  ctx: CsharpValidatorCtx,
): string {
  return field.parsed.kind === "datasource"
    ? datasourceValidator(field.parsed.base, ctx)
    : viewValidator(field.parsed.base, ctx);
}

function ruleLine(field: ViewField, ctx: CsharpValidatorCtx): string {
  const prop = ctx.fields.name(field.name);
  const notNull = field.isNullable ? "" : "\n            .NotNull()";
  if (field.parsed.isArray) {
    const eachValidator =
      field.parsed.kind === "primitive"
        ? ""
        : `\n            .ForEach(x => x.SetValidator(new ${nestedValidatorName(field, ctx)}()))`;
    return `        RuleFor(x => x.${prop})${notNull}${eachValidator};`;
  }
  if (field.parsed.kind === "primitive") {
    return `        RuleFor(x => x.${prop})${notNull};`;
  }
  return `        RuleFor(x => x.${prop})${notNull}\n            .SetValidator(new ${nestedValidatorName(field, ctx)}());`;
}

function generateShapedValidator(
  view: ShapedView,
  ctx: CsharpValidatorCtx,
): string {
  const cls = `${ctx.opts.typesNamespace}.${ctx.names.className(view.name)}`;
  const vcls = viewValidator(view.name, ctx);
  const inlinedParent = (view.enrichments?.length ?? 0) > 0;
  const include =
    view.inherits && !inlinedParent
      ? `        Include(new ${datasourceValidator(view.inherits, ctx)}());`
      : null;
  const rules = view.fields.map((f) => ruleLine(f, ctx));
  const lines = [include, ...rules]
    .filter((x) => x !== null && x !== "")
    .join("\n");
  const ctorBody = lines ? `\n${lines}\n    ` : "";
  return [
    `public class ${vcls} : AbstractValidator<${cls}>`,
    `{`,
    `    public ${vcls}()`,
    `    {${ctorBody}}`,
    `}`,
  ].join("\n");
}

function generateUnionValidator(view: UnionView, ctx: CsharpValidatorCtx): string {
  const cls = ctx.names.className(view.name);
  const vcls = viewValidator(view.name, ctx);
  const branches = view.members
    .map((m) => {
      const memberCls = `${ctx.opts.typesNamespace}.${ctx.names.className(m)}`;
      const alias = `as${toCase(m, "Pascal")}`; // lint-generator-casing-allow: toCase
      return `        if (obj is ${memberCls} ${alias}) { new ${viewValidator(m, ctx)}().ValidateAndThrow(${alias}); return; }`;
    })
    .join("\n");
  return [
    `public class ${vcls}`,
    `{`,
    `    public void ValidateAndThrow(object obj)`,
    `    {`,
    branches,
    `        throw new ValidationException("Unknown union variant for ${cls}.");`,
    `    }`,
    `}`,
  ].join("\n");
}

function renderView(view: View, ctx: CsharpValidatorCtx) {
  const { names, opts } = ctx;
  const header = [
    `// schema-version: ${opts.schemaVersion}`,
    `using FluentValidation;`,
    `using ${opts.typesNamespace};`,
    `using ${opts.datasourceNamespace};`,
    `using ${opts.datasourceValidatorsNamespace};`,
    ``,
    `namespace ${opts.namespace};`,
    ``,
  ].join("\n");
  const body = renderByViewKind<View, CsharpValidatorCtx, string>(view, ctx, {
    shaped: (v, c) => generateShapedValidator(v as ShapedView, c),
    union: (v, c) => generateUnionValidator(v as UnionView, c),
  });
  return {
    path: `${names.fileBase(view.name, "view-validator")}Validator${names.ext}`,
    content: `${header}${body}\n`,
  };
}

const baseCreateGenerator = viewGenerator(renderView);

/** Generator owns its options: DEFAULT_GENERATE_OPTIONS + datetime from settings; casing from CodegenNames; validators via CsharpImports. */
export const createGenerator = () =>
  buildViewGenerator({
    baseCreateGenerator,
    imports: CsharpImports,
    defaults: DEFAULT_GENERATE_OPTIONS,
    optionsFromSettings: datetimeOptionFromSettings,
  });
