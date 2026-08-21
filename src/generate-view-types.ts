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
import { convertSpecType } from "./base-type-converter.ts";
import { Emit } from "./emit.ts";
import { typeTmpl } from "./resources/view-types.ts";

class Generator extends Emit {
  from(deterministic: IDeterministic): GenerateEntry[] {
    const expandedByName = new Map(
      deterministic.expandedViewTypes.map((v) => [v.name, v]),
    );
    return deterministic.viewTypes.map((view) =>
      this.view(view, expandedByName.get(view.name)),
    );
  }

  private csTypeFor(field: ViewField): string {
    let base =
      field.kind === "primitive"
        ? convertSpecType(field.base)
        : field.kind === "datasource"
          ? this.imports.datasourceQual(field.base)
          : this.casing.convertTypes(field.base);
    if (field.isArray) base = `List<${base}>`;
    return field.isNullable ? `${base}?` : base;
  }

  private view(view: ViewType, expanded: ViewType | undefined): GenerateEntry {
    const className = this.casing.convertTypes(view.name);
    const isUnion = view.kind === "union";
    const fields = isUnion
      ? []
      : emitViewFields(view, expanded).map((f) => ({
          ident: this.casing.convertFields(f.name),
          csType: this.csTypeFor(f),
        }));
    const hasExtends =
      !isUnion && view.inherits !== null && !inlinesParent(view);
    const needsList =
      !isUnion && view.kind === "shaped" && view.fields.some((f) => f.isArray);
    return content(
      this.imports.view(view.name),
      fill(typeTmpl, {
        schemaVersion: this.settings.schemaVersion,
        needsList,
        simpleDoc: this.settings.simpleDoc,
        descriptionDoc: this.settings.descriptionDoc,
        className,
        datasourceType: isUnion ? "standard" : (view.inherits ?? "standard"),
        target: isUnion ? "UnionView" : "ShapedView",
        fieldCount: String(isUnion ? view.members.length : fields.length),
        isUnion,
        isShaped: !isUnion,
        hasExtends,
        extendsType:
          hasExtends && view.kind === "shaped" && view.inherits !== null
            ? this.imports.datasourceQual(view.inherits)
            : "",
        fields,
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
