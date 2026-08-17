import { DEFAULT_COMMENT_STYLE } from "@deterministic-code/generator-sdk/generate-doc-comment";
import { datasourceTypesGenerator } from "@deterministic-code/generator-sdk/codegen-context";
import { datasourceTypesModule } from "@deterministic-code/generator-sdk/codegen/lib/generate-settings-options";
import { normalizeDatasourceTable } from "@deterministic-code/generator-sdk/codegen/lib/datasource-normalize";
import { CsharpImports } from "./csharp-imports.js";
import { createTypeMapper } from "@deterministic-code/generator-sdk/codegen/lib/type-mapper";
import { datasourceSettingsFor } from "@deterministic-code/generator-sdk/codegen/lib/ts-datasource-settings";
import { datasourceTypeDoc } from "@deterministic-code/generator-sdk/codegen/lib/datasource-types-generate-types";
export const DEFAULT_GENERATE_OPTIONS = {
    baseClass: "StandardDataSource",
    schemaVersion: "1.0",
    namespace: "Backend.Types.Datasource",
    baseNamespace: "Deterministic.Types",
    style: DEFAULT_COMMENT_STYLE,
};
const mapAbstractType = createTypeMapper("csharp");
function normalizeTable(entry) {
    return normalizeDatasourceTable(entry, (fdef) => ({
        size: fdef.size,
        isUnique: fdef.is_unique === true,
    }));
}
function mapType(field, datetime = "native") {
    return mapAbstractType(field.type, { datetime });
}
function generateField(field, ctx) {
    const csType = mapType(field, ctx.opts.datetime);
    const nullable = field.isNullable ? "?" : "";
    return `    public ${csType}${nullable} ${ctx.fields.name(field.name)} { get; set; }`;
}
function buildBaseSpec(opts) {
    const ds = datasourceSettingsFor(opts);
    const withUuid = ds.withUuidColumn && opts.withUuidColumn;
    const baseName = withUuid ? `${opts.baseClass}WithUuid` : `${opts.baseClass}`;
    const typeArgs = [ds.csharpIdType()];
    if (withUuid)
        typeArgs.push("string");
    typeArgs.push(opts.datetime === "string" ? "string" : "System.DateTime");
    return { baseName, typeArgs };
}
function standardFieldsFor(idType) {
    return [
        { name: "id", type: idType, isNullable: false, isStandard: true },
        { name: "uuid", type: "uuid", isNullable: false, isStandard: true },
        { name: "created", type: "datetime", isNullable: false, isStandard: true },
        { name: "updated", type: "datetime", isNullable: false, isStandard: true },
    ];
}
function bodyLineFor(field, ctx) {
    if (field.isStandard && field.name === "id") {
        const csType = datasourceSettingsFor(ctx.opts).csharpIdType();
        return `    public ${csType} ${ctx.fields.name(field.name)} { get; set; }`;
    }
    return generateField(field, ctx);
}
function renderTable(table, ctx) {
    const { names, opts, imports } = ctx;
    const className = names.className(table.name);
    const path = `${names.fileBase(table.name, "datasource-type")}${names.ext}`;
    const withUuidColumn = datasourceSettingsFor(opts).withUuidColumn && opts.withUuidColumn;
    const { baseName, typeArgs } = buildBaseSpec(opts);
    const allFields = [
        ...standardFieldsFor(opts.idType),
        ...table.fields,
    ].filter((f) => withUuidColumn || f.name !== "uuid");
    const body = allFields.map((f) => bodyLineFor(f, ctx)).join("\n");
    const doc = datasourceTypeDoc({
        className,
        datasourceType: table.datasourceType,
        fieldCount: allFields.length,
        style: opts.style,
        language: "csharp",
    });
    const typeArgsStr = `<${typeArgs.join(", ")}>`;
    const content = `// schema-version: ${opts.schemaVersion}
${imports.using(opts.baseNamespace)}

namespace ${opts.namespace};

${doc}public class ${className} : ${baseName}${typeArgsStr}
{
${body}
}
`;
    return { path, content };
}
const baseGenerate = datasourceTypesGenerator(normalizeTable, renderTable)(CsharpImports);
export const { render, createGenerator, generate } = datasourceTypesModule({
    baseGenerate,
    defaultGenerateOptions: DEFAULT_GENERATE_OPTIONS,
    language: "csharp",
});
