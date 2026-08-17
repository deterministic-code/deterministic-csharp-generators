import { datasourceSettings } from "./common/datasource-settings.ts";
import type { IDeterministicReader } from "./common/deterministic-reader.ts";
import { commentStyle, renderDocComment } from "./common/doc-comment.ts";
import type { GenerateContext } from "./common/generate-context.ts";
import { content, type GenerateEntry } from "./common/generate-entry.ts";
import { csharpNaming } from "./common/naming.ts";
import { settingsStr } from "./common/settings.ts";
import { convertSpecType } from "./common/type-converter.ts";

export type { GenerateEntry };

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const ds = datasourceSettings(ctx.settings);
  const naming = csharpNaming(ctx.settings);
  const schemaVersion =
    settingsStr(ctx.settings, "codegen.schema_version") ?? "1.0";
  const style = commentStyle(settingsStr(ctx.settings, "comments"));
  const tables = await ctx.reader.loadDatasourceTypes(ds.idType);
  return tables.map((table) => {
    const className = naming.className(table.name);
    const base = ds.withUuidColumn
      ? "StandardDataSourceWithUuid"
      : "StandardDataSource";
    const dt = convertSpecType("datetime", ds.datetimeRepr);
    const typeArgs = ds.withUuidColumn
      ? [ds.csharpIdType, "string", dt]
      : [ds.csharpIdType, dt];
    const fields = [
      { name: "id", type: ds.idType, isNullable: false },
      { name: "uuid", type: "uuid", isNullable: false },
      { name: "created", type: "datetime", isNullable: false },
      { name: "updated", type: "datetime", isNullable: false },
      ...table.fields,
    ].filter((f) => ds.withUuidColumn || f.name !== "uuid");
    const body = fields
      .map((f) => {
        const t =
          f.name === "id"
            ? ds.csharpIdType
            : convertSpecType(f.type, ds.datetimeRepr);
        return `    public ${t}${f.isNullable ? "?" : ""} ${naming.fieldName(f.name)} { get; set; }`;
      })
      .join("\n");
    const doc = renderDocComment({
      style,
      summary: `Type ${className}.`,
      lines: [
        `Datasource type: ${table.datasourceType}.`,
        `Target: StandardCrud.`,
        `Fields: ${fields.length}.`,
      ],
      language: "csharp",
    });
    return content(
      naming.filePath(table.name),
      `// schema-version: ${schemaVersion}
using Deterministic.Types;

namespace Backend.Types.Datasource;

${doc}public class ${className} : ${base}<${typeArgs.join(", ")}>
{
${body}
}
`,
    );
  });
};

export const generateDatasourceTypes = async (args: {
  reader: IDeterministicReader;
  settings: GenerateContext["settings"];
}): Promise<GenerateEntry[]> =>
  generate({
    reader: args.reader,
    settings: args.settings,
  });
