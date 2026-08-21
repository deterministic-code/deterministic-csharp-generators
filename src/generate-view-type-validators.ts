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
import { typeTmpl } from "./resources/view-type-validators.ts";

type EmitOptions = {
  imports: CsharpImportGenerator;
  schemaVersion: string;
};

const emitOptions = (settings: Record<string, string>): EmitOptions => ({
  imports: createImportGenerator(".", settings),
  schemaVersion: settings["codegen.schema_version"] ?? "1.0",
});

const viewValidator = (name: string): string => `${pascalCase(name)}Validator`;

const datasourceValidator = (name: string): string =>
  `Datasource${pascalCase(name)}Validator`;

const nestedValidator = (field: ViewField): string =>
  field.kind === "datasource"
    ? datasourceValidator(field.base)
    : viewValidator(field.base);

const ruleLine = (field: ViewField): string => {
  const prop = pascalCase(field.name);
  const notNull = field.isNullable ? "" : "\n            .NotNull()";
  if (field.isArray) {
    const each =
      field.kind === "primitive"
        ? ""
        : `\n            .ForEach(x => x.SetValidator(new ${nestedValidator(field)}()))`;
    return `        RuleFor(x => x.${prop})${notNull}${each};`;
  }
  if (field.kind === "primitive") {
    return `        RuleFor(x => x.${prop})${notNull};`;
  }
  return `        RuleFor(x => x.${prop})${notNull}\n            .SetValidator(new ${nestedValidator(field)}());`;
};

const renderView = (
  view: ViewType,
  expanded: ViewType | undefined,
  opts: EmitOptions,
): GenerateEntry => {
  const className = pascalCase(view.name);
  const validatorClass = viewValidator(view.name);
  if (view.kind === "union") {
    return content(
      opts.imports.viewValidator(view.name),
      fill(typeTmpl, {
        schemaVersion: opts.schemaVersion,
        isUnion: true,
        isShaped: false,
        className,
        validatorClass,
        branches: view.members.map((m) => {
          const memberCls = pascalCase(m);
          const alias = `as${pascalCase(m)}`;
          return {
            line: `if (obj is ${opts.imports.viewQual(m)} ${alias}) { new ${viewValidator(m)}().ValidateAndThrow(${alias}); return; }`,
          };
        }),
        rules: [],
      }),
    );
  }
  const include =
    view.inherits && !inlinesParent(view)
      ? `        Include(new ${datasourceValidator(view.inherits)}());`
      : null;
  const rules = [
    include,
    ...emitViewFields(view, expanded).map((f) => ruleLine(f)),
  ].filter((x): x is string => x !== null && x !== "");
  return content(
    opts.imports.viewValidator(view.name),
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
