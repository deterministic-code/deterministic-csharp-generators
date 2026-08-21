import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import {
  DeterministicParser,
  DATASOURCE_TYPES_YAML,
  type ExpandedDatasourceType,
  type IDeterministic,
} from "./specification-parser.ts";
import { convertSpecType } from "./base-type-converter.ts";
import { Emit } from "./emit.ts";
import { typeTmpl } from "./resources/datasource-types.ts";

const csTypeFor = (field: {
  type: string;
  isNullable: boolean;
}): string => {
  const t = convertSpecType(field.type);
  return field.isNullable ? `${t}?` : t;
};

class Generator extends Emit {
  from(deterministic: IDeterministic): GenerateEntry[] {
    return deterministic.expandedDatasourceTypes.map((table) =>
      this.type(table),
    );
  }

  private type(table: ExpandedDatasourceType): GenerateEntry {
    const { schemaVersion, simpleDoc, descriptionDoc } = this.settings;
    const fields = table.fields.map((f) => ({
      name: f.name,
      ident: this.casing.convertFields(f.name),
      csType: csTypeFor(f),
      isPrimaryKey: f.isPrimaryKey === true,
    }));
    const idField =
      fields.find((f) => f.isPrimaryKey) ?? fields.find((f) => f.name === "id");
    const datetimeField =
      fields.find((f) => f.name === "created") ??
      fields.find((f) => f.name === "updated");
    const className = this.casing.convertTypes(table.name);
    return content(
      this.imports.datasource(table.name),
      fill(typeTmpl, {
        schemaVersion,
        simpleDoc,
        descriptionDoc,
        className,
        datasourceType: table.datasourceType,
        fieldCount: String(fields.length),
        idType: idField?.csType,
        datetimeType: datetimeField?.csType,
        fields,
      }),
    );
  }
}

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  await ctx.reader.read(DATASOURCE_TYPES_YAML);
  return new Generator(ctx.settings).from(
    await DeterministicParser(ctx.reader).parse(ctx.settings),
  );
};
