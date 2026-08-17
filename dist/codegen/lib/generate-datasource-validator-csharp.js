import { entryOf, isFiniteInt, isFiniteNumber, } from "@deterministic-code/generator-sdk/generator-shared";
import { EntityGenerator } from "@deterministic-code/generator-sdk/codegen-context";
import { validatorOptionsFromSettings } from "@deterministic-code/generator-sdk/codegen/lib/generate-settings-options";
import { datasourceSettingsFor } from "@deterministic-code/generator-sdk/codegen/lib/ts-datasource-settings";
import { csharpConverter } from "./csharp-literals.js";
import { STANDARD_COLUMNS, } from "@deterministic-code/generator-sdk/codegen/lib/datasource-validator-generate-types";
export const DEFAULT_GENERATE_OPTIONS = {
    schemaVersion: "1.0",
    namespace: "Backend.Validators.Datasource",
    typesNamespace: "Backend.Types.Datasource",
};
const UUID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
function validatorName(name, ctx) {
    return `Datasource${ctx.names.className(name)}Validator`;
}
function tightenString(fdef) {
    const rules = [];
    if (isFiniteInt(fdef.min_size) && fdef.min_size >= 0) {
        rules.push(`MinimumLength(${fdef.min_size})`);
    }
    if (isFiniteInt(fdef.size) && fdef.size >= 0) {
        rules.push(`MaximumLength(${fdef.size})`);
    }
    return rules;
}
function tightenNumber(fdef, fieldName) {
    const rules = [];
    const lit = (v) => csharpConverter.numericLiteral(fdef, v);
    const isFk = typeof fdef.references === "string" && fdef.references.length > 0;
    const isIdLike = fieldName === "id" || fieldName.endsWith("_id");
    if (isFk || isIdLike) {
        rules.push(`GreaterThanOrEqualTo(${lit(0)})`);
    }
    else if (isFiniteInt(fdef.min_size)) {
        rules.push(`GreaterThanOrEqualTo(${lit(fdef.min_size)})`);
    }
    if (isFiniteInt(fdef.size)) {
        rules.push(`LessThanOrEqualTo(${lit(fdef.size)})`);
    }
    return rules;
}
function tightenFloat(fdef) {
    const rules = [];
    if (isFiniteNumber(fdef.min_size)) {
        rules.push(`GreaterThanOrEqualTo(${csharpConverter.numericLiteral(fdef, fdef.min_size)})`);
    }
    if (isFiniteNumber(fdef.size)) {
        rules.push(`LessThanOrEqualTo(${csharpConverter.numericLiteral(fdef, fdef.size)})`);
    }
    return rules;
}
function tightenedRulesFor(fieldName, fdef) {
    switch (fdef.type) {
        case "string":
        case "character":
            return tightenString(fdef);
        case "uuid":
            return [`Matches("${UUID_PATTERN}")`];
        case "number":
        case "integer":
        case "smallinteger":
        case "biginteger":
        case "reference":
            return tightenNumber(fdef, fieldName);
        case "float":
            return tightenFloat(fdef);
        default:
            return [];
    }
}
function ruleLine(fieldName, fdef, ctx) {
    const prop = ctx.fields.name(fieldName);
    const tightened = tightenedRulesFor(fieldName, fdef);
    const parts = [];
    if (fdef.is_nullable !== true)
        parts.push("NotNull()");
    for (const r of tightened)
        parts.push(r);
    if (parts.length === 0) {
        return `        RuleFor(x => x.${prop});`;
    }
    const head = `        RuleFor(x => x.${prop})`;
    const chain = parts.map((p) => `            .${p}`).join("\n");
    if (fdef.is_nullable === true && tightened.length > 0) {
        return `${head}\n${chain}\n            .When(x => x.${prop} != null);`;
    }
    return `${head}\n${chain};`;
}
function standardRuleLine(name, ctx, ds) {
    const prop = ctx.fields.name(name);
    if (name === "id") {
        const bound = csharpConverter.numericLiteralForNative(ds.csharpIdType(), 0);
        const numeric = bound
            ? `\n            .GreaterThanOrEqualTo(${bound})`
            : "";
        return `        RuleFor(x => x.${prop})\n            .NotNull()${numeric};`;
    }
    return `        RuleFor(x => x.${prop})\n            .NotNull();`;
}
function standardRuleLines(ctx, userFieldNames) {
    const ds = datasourceSettingsFor(ctx.opts);
    return STANDARD_COLUMNS.filter(({ name }) => (ds.withUuidColumn || name !== "uuid") &&
        !userFieldNames.has(ctx.fields.name(name))).map(({ name }) => standardRuleLine(name, ctx, ds));
}
function renderTable(tableEntry, ctx) {
    const { names, opts } = ctx;
    const [tableName, tableDefRaw] = entryOf(tableEntry);
    const tableDef = tableDefRaw;
    const fields = Array.isArray(tableDef.fields) ? tableDef.fields : [];
    const userFieldNames = new Set(fields.map((f) => ctx.fields.name(entryOf(f)[0])));
    const cls = names.className(tableName);
    const vcls = validatorName(tableName, ctx);
    const rules = [
        ...standardRuleLines(ctx, userFieldNames),
        ...fields.map((f) => {
            const [fname, fdef] = entryOf(f);
            return ruleLine(fname, fdef, ctx);
        }),
    ].join("\n");
    const body = [
        `public class ${vcls} : AbstractValidator<${opts.typesNamespace}.${cls}>`,
        `{`,
        `    public ${vcls}()`,
        `    {`,
        rules,
        `    }`,
        `}`,
    ].join("\n");
    const header = [
        `// schema-version: ${opts.schemaVersion}`,
        `using FluentValidation;`,
        ``,
        `namespace ${opts.namespace};`,
        ``,
    ].join("\n");
    return {
        path: `Datasource${names.fileBase(tableName, "datasource-validator")}Validator${names.ext}`,
        content: `${header}${body}\n`,
    };
}
export const createGenerator = () => {
    const base = new EntityGenerator({
        normalize: (config) => Array.isArray(config.datasourceTypes?.types)
            ? config.datasourceTypes.types
            : [],
        render: renderTable,
    });
    return {
        generate: (config) => base.generate({
            ...DEFAULT_GENERATE_OPTIONS,
            ...validatorOptionsFromSettings(config.settings),
            ...config,
        }),
    };
};
