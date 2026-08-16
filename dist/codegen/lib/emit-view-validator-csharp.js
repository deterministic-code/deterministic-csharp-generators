import { toCase } from "@deterministic-code/generator-sdk/case";
import { buildViewEmitter, renderByViewKind, } from "@deterministic-code/generator-sdk/codegen/lib/emit-view-shared";
import { viewEmitter } from "@deterministic-code/generator-sdk/codegen-context";
import { CsharpImports } from "./csharp-imports.js";
import { datetimeOptionFromSettings } from "@deterministic-code/generator-sdk/codegen/lib/emit-settings-options";
export const DEFAULT_EMIT_OPTIONS = {
    schemaVersion: "1.0",
    namespace: "Backend.Validators.View",
    typesNamespace: "Backend.Types.View",
    datasourceNamespace: "Backend.Types.Datasource",
    datasourceValidatorsNamespace: "Backend.Validators.Datasource",
};
function viewValidator(name, ctx) {
    return `${ctx.names.className(name)}Validator`;
}
function datasourceValidator(name, ctx) {
    return `Datasource${ctx.names.className(name)}Validator`;
}
function nestedValidatorName(field, ctx) {
    return field.parsed.kind === "datasource"
        ? datasourceValidator(field.parsed.base, ctx)
        : viewValidator(field.parsed.base, ctx);
}
function ruleLine(field, ctx) {
    const prop = ctx.fields.name(field.name);
    const notNull = field.isNullable ? "" : "\n            .NotNull()";
    if (field.parsed.isArray) {
        const eachValidator = field.parsed.kind === "primitive"
            ? ""
            : `\n            .ForEach(x => x.SetValidator(new ${nestedValidatorName(field, ctx)}()))`;
        return `        RuleFor(x => x.${prop})${notNull}${eachValidator};`;
    }
    if (field.parsed.kind === "primitive") {
        return `        RuleFor(x => x.${prop})${notNull};`;
    }
    return `        RuleFor(x => x.${prop})${notNull}\n            .SetValidator(new ${nestedValidatorName(field, ctx)}());`;
}
function emitShapedValidator(view, ctx) {
    const cls = `${ctx.opts.typesNamespace}.${ctx.names.className(view.name)}`;
    const vcls = viewValidator(view.name, ctx);
    const inlinedParent = (view.enrichments?.length ?? 0) > 0;
    const include = view.inherits && !inlinedParent
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
function emitUnionValidator(view, ctx) {
    const cls = ctx.names.className(view.name);
    const vcls = viewValidator(view.name, ctx);
    const branches = view.members
        .map((m) => {
        const memberCls = `${ctx.opts.typesNamespace}.${ctx.names.className(m)}`;
        const alias = `as${toCase(m, "Pascal")}`; // lint-emitter-casing-allow: toCase
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
function renderView(view, ctx) {
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
    const body = renderByViewKind(view, ctx, {
        shaped: (v, c) => emitShapedValidator(v, c),
        union: (v, c) => emitUnionValidator(v, c),
    });
    return {
        path: `${names.fileBase(view.name, "view-validator")}Validator${names.ext}`,
        content: `${header}${body}\n`,
    };
}
const baseCreateEmitter = viewEmitter(renderView);
/** Emitter owns its options: DEFAULT_EMIT_OPTIONS + datetime from settings; casing from CodegenNames; validators via CsharpImports. */
export const createEmitter = () => buildViewEmitter({
    baseCreateEmitter,
    imports: CsharpImports,
    defaults: DEFAULT_EMIT_OPTIONS,
    optionsFromSettings: datetimeOptionFromSettings,
});
