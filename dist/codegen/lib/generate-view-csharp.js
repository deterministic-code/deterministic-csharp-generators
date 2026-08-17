import { DEFAULT_COMMENT_STYLE, renderDocComment, } from "@deterministic-code/generator-sdk/generate-doc-comment";
import { buildViewGenerator, classifyViewShape, inheritedDatasourceFields, shapedViewDocLines, unionViewDocLines, } from "@deterministic-code/generator-sdk/codegen/lib/generate-view-shared";
import { viewGenerator } from "@deterministic-code/generator-sdk/codegen-context";
import { CsharpImports } from "./csharp-imports.js";
import { datetimeOptionFromSettings } from "@deterministic-code/generator-sdk/codegen/lib/generate-settings-options";
import { createTypeMapper } from "@deterministic-code/generator-sdk/codegen/lib/type-mapper";
const mapCsharpType = createTypeMapper("csharp");
export const DEFAULT_GENERATE_OPTIONS = {
    baseClass: null,
    schemaVersion: "1.0",
    namespace: "Backend.Types.View",
    datasourceNamespace: "Backend.Types.Datasource",
    style: DEFAULT_COMMENT_STYLE,
};
function generateInlinedField(field, ctx) {
    const csType = mapCsharpType(field.type);
    const nullable = field.isNullable ? "?" : "";
    return `    public ${csType}${nullable} ${ctx.fields.name(field.name)} { get; set; }`;
}
function csTypeForField(field, ctx) {
    const { parsed } = field;
    let baseType;
    switch (parsed.kind) {
        case "primitive":
            baseType = mapCsharpType(parsed.base);
            break;
        case "datasource":
            baseType = ctx.imports.qualified(parsed.base);
            break;
        case "view":
            baseType = ctx.names.className(parsed.base);
            break;
        default:
            throw new Error(`Unknown field kind: ${parsed.kind}`);
    }
    return parsed.isArray ? `List<${baseType}>` : baseType;
}
function generateField(field, ctx) {
    const type = csTypeForField(field, ctx);
    const nullable = field.isNullable ? "?" : "";
    return `    public ${type}${nullable} ${ctx.fields.name(field.name)} { get; set; }`;
}
function inlineBodyLines(view, omit, ctx) {
    const parentFields = inheritedDatasourceFields(ctx.opts.datasource, view.inherits).filter((f) => !omit.has(f.name));
    return [
        ...parentFields.map((f) => generateInlinedField(f, ctx)),
        ...view.fields.map((f) => generateField(f, ctx)),
    ];
}
function shapedViewParts(view, ctx) {
    const { opts, imports } = ctx;
    const { enrichments, inlineParent, inlineForOmit, omitList } = classifyViewShape(view);
    if (inlineParent) {
        return {
            extendsClause: "",
            bodyLines: inlineBodyLines(view, new Set(enrichments.map((e) => e.fkColumn)), ctx),
        };
    }
    if (inlineForOmit) {
        return {
            extendsClause: "",
            bodyLines: inlineBodyLines(view, new Set(omitList), ctx),
        };
    }
    const extendsTarget = view.inherits
        ? imports.qualified(view.inherits)
        : opts.baseClass;
    return {
        extendsClause: extendsTarget ? ` : ${extendsTarget}` : "",
        bodyLines: view.fields.map((f) => generateField(f, ctx)),
    };
}
function renderView(view, ctx) {
    const { names, opts, imports } = ctx;
    const className = names.className(view.name);
    const path = `${names.fileBase(view.name, "view-type")}${names.ext}`;
    const header = `// schema-version: ${opts.schemaVersion}\n${imports.collections(view)}namespace ${opts.namespace};\n\n`;
    if (view.kind === "union") {
        const doc = renderDocComment({
            style: opts.style,
            summary: `View ${className}.`,
            lines: unionViewDocLines(view),
            language: "csharp",
        });
        const content = `${header}${doc}public interface ${className} {}\n`;
        return { path, content };
    }
    const { extendsClause, bodyLines } = shapedViewParts(view, ctx);
    const body = bodyLines.join("\n");
    const bodyBlock = body ? `\n${body}\n` : "";
    const doc = renderDocComment({
        style: opts.style,
        summary: `View ${className}.`,
        lines: shapedViewDocLines(view),
        language: "csharp",
    });
    const content = `${header}${doc}public class ${className}${extendsClause}\n{${bodyBlock}}\n`;
    return { path, content };
}
const baseCreateGenerator = viewGenerator(renderView);
/** Generator owns its options: DEFAULT_GENERATE_OPTIONS + datetime from settings; casing from CodegenNames; imports via CsharpImports. */
export const createGenerator = () => buildViewGenerator({
    baseCreateGenerator,
    imports: CsharpImports,
    defaults: DEFAULT_GENERATE_OPTIONS,
    optionsFromSettings: datetimeOptionFromSettings,
});
