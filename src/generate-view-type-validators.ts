import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { emitViewFields, inlinesParent } from "./common/view-shape.ts";
import {
  DeterministicParser,
  VIEW_TYPES_YAML,
  type ViewField,
  type ViewType,
  type IDeterministic,
} from "./specification-parser.ts";
import { Emit } from "./emit.ts";
import { typeTmpl } from "./resources/view-type-validators.ts";

class Generator extends Emit {
  private viewValidator(name: string): string {
    return this.casing.convertTypes(`${name}_validator`);
  }

  private datasourceValidator(name: string): string {
    return this.casing.convertTypes(`datasource_${name}_validator`);
  }

  private nestedValidator(field: ViewField): string {
    return field.kind === "datasource"
      ? this.datasourceValidator(field.base)
      : this.viewValidator(field.base);
  }

  private ruleLine(field: ViewField): string {
    const prop = this.casing.convertFields(field.name);
    const notNull = field.isNullable ? "" : "\n            .NotNull()";
    if (field.isArray) {
      const each =
        field.kind === "primitive"
          ? ""
          : `\n            .ForEach(x => x.SetValidator(new ${this.nestedValidator(field)}()))`;
      return `        RuleFor(x => x.${prop})${notNull}${each};`;
    }
    if (field.kind === "primitive") {
      return `        RuleFor(x => x.${prop})${notNull};`;
    }
    return `        RuleFor(x => x.${prop})${notNull}\n            .SetValidator(new ${this.nestedValidator(field)}());`;
  }

  from(deterministic: IDeterministic): GenerateEntry[] {
    const expandedByName = new Map(
      deterministic.expandedViewTypes.map((v) => [v.name, v]),
    );
    return deterministic.viewTypes.map((view) =>
      this.view(view, expandedByName.get(view.name)),
    );
  }

  private view(view: ViewType, expanded: ViewType | undefined): GenerateEntry {
    const className = this.casing.convertTypes(view.name);
    const validatorClass = this.viewValidator(view.name);
    if (view.kind === "union") {
      return content(
        this.imports.viewValidator(view.name),
        fill(typeTmpl, {
          schemaVersion: this.settings.schemaVersion,
          isUnion: true,
          isShaped: false,
          className,
          validatorClass,
          branches: view.members.map((m) => {
            const alias = this.casing.convertFields(`as_${m}`);
            return {
              line: `if (obj is ${this.imports.viewQual(m)} ${alias}) { new ${this.viewValidator(m)}().ValidateAndThrow(${alias}); return; }`,
            };
          }),
          rules: [],
        }),
      );
    }
    const include =
      view.inherits && !inlinesParent(view)
        ? `        Include(new ${this.datasourceValidator(view.inherits)}());`
        : null;
    const rules = [
      include,
      ...emitViewFields(view, expanded).map((f) => this.ruleLine(f)),
    ].filter((x): x is string => x !== null && x !== "");
    return content(
      this.imports.viewValidator(view.name),
      fill(typeTmpl, {
        schemaVersion: this.settings.schemaVersion,
        isUnion: false,
        isShaped: true,
        className,
        validatorClass,
        rules: rules.map((line) => ({ line })),
        branches: [],
      }),
    );
  }
}

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  await ctx.reader.read(VIEW_TYPES_YAML);
  return new Generator(ctx.settings).from(
    await DeterministicParser(ctx.reader).parse(ctx.settings),
  );
};
