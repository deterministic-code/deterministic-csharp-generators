import { toCase, } from "@deterministic-code/generator-sdk/case";
import { datasourceTestsModule } from "@deterministic-code/generator-sdk/codegen/lib/generate-settings-options";
import { namesFor, } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import { buildDatasourceFixture, enumerateInvalidMutations, } from "@deterministic-code/generator-sdk/codegen/lib/fixture-builder";
import { entryOf } from "@deterministic-code/generator-sdk/generator-shared";
import { generateCsharpTestClass } from "./generate-csharp-tests-shared.js";
import { RuntimeValue } from "@deterministic-code/generator-sdk/codegen/lib/ts-sample-literal";
import { INLINED_VIEW_AUDIT_FIELDS } from "@deterministic-code/generator-sdk/codegen/lib/standard-columns";
import { csharpConverter } from "./csharp-literals.js";
export const DEFAULT_GENERATE_OPTIONS = {
    schemaVersion: "1.0",
    namespace: "Backend.Tests.Datasource",
    typesNamespace: "Backend.Types.Datasource",
    validatorsNamespace: "Backend.Validators.Datasource",
};
const STANDARD_COLUMNS = INLINED_VIEW_AUDIT_FIELDS;
function csharpNames(opts) {
    const named = { ...opts, language: "csharp" };
    return namesFor(named);
}
function className(name, opts) {
    return csharpNames(opts).className(name);
}
function validatorName(name, opts) {
    return `Datasource${csharpNames(opts).className(name)}Validator`;
}
function testClassName(name, opts) {
    return `${toCase(name, opts.fileFormat)}Tests`; // lint-generator-casing-allow: toCase
}
function propName(name, opts) {
    return toCase(name, opts.fieldFormat); // lint-generator-casing-allow: toCase
}
function declaredFieldsOf(tableDef) {
    return (tableDef.fields ?? []).map((f) => {
        const [fname, fdefRaw] = entryOf(f);
        const fdef = fdefRaw;
        return {
            name: fname,
            type: fdef.type,
            isNullable: fdef.is_nullable === true,
            hasDefault: Object.prototype.hasOwnProperty.call(fdef, "default_value"),
        };
    });
}
function allFieldsOf(tableDef) {
    return [...STANDARD_COLUMNS, ...declaredFieldsOf(tableDef)];
}
function hasAnyNullable(tableDef) {
    return declaredFieldsOf(tableDef).some((f) => f.isNullable);
}
/** The C# runtime expression for a {@link RuntimeValue} — baked into generated xUnit fixtures so they use real Guid/DateTime values, not hardcoded placeholders; size-bounded strings stay within maxLength. */
function runtimeValueCsharp(value) {
    switch (value.kind) {
        case "uuid":
            return "Guid.NewGuid().ToString()";
        case "datetime":
        case "date":
            return "System.DateTime.UtcNow";
        case "email":
            return '$"{Guid.NewGuid()}@example.com"';
        case "string": {
            const size = value.size;
            const n = size !== undefined && Number.isFinite(size) && size < 36 ? size : null;
            return n != null
                ? `Guid.NewGuid().ToString().Substring(0, ${n})`
                : "Guid.NewGuid().ToString()";
        }
        default:
            throw new Error(`runtimeValueCsharp: unmapped kind ${JSON.stringify(value.kind)}`);
    }
}
function literalForValue(value, typeHint) {
    if (value === null || value === undefined)
        return "null";
    if (value instanceof RuntimeValue)
        return runtimeValueCsharp(value);
    if (value instanceof Uint8Array) {
        return `new byte[] { ${Array.from(value).join(", ")} }`;
    }
    if (typeof value === "boolean")
        return value ? "true" : "false";
    if (typeof value === "number") {
        const literal = typeHint
            ? csharpConverter.numericLiteral({ type: typeHint }, value)
            : null;
        return literal ?? String(value);
    }
    if (value instanceof Date) {
        return `System.DateTime.Parse(${JSON.stringify(value.toISOString())})`;
    }
    if (typeof value === "string") {
        if (typeHint === "datetime") {
            return `System.DateTime.Parse(${JSON.stringify(value)})`;
        }
        return JSON.stringify(value);
    }
    return JSON.stringify(value);
}
function buildInitializer(fixture, fieldMap, opts) {
    return Object.entries(fixture)
        .map(([k, v]) => {
        const info = fieldMap.get(k);
        const hint = info?.type ?? null;
        return `            ${propName(k, opts)} = ${literalForValue(v, hint)},`;
    })
        .join("\n");
}
function buildFieldMap(tableDef) {
    return new Map(allFieldsOf(tableDef).map((f) => [f.name, f]));
}
function sanitizeMutationName(description) {
    const tokens = description
        .replace(/"/g, "")
        .split(/[^A-Za-z0-9]+/)
        .filter((t) => t.length > 0)
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
    return tokens.join("");
}
/** The `var value = new <Namespace>.<Class> { … };` declaration lines shared by the valid/nullable and per-field accessor facts. */
function valueDeclLines(args) {
    return [
        `        var value = new ${args.opts.typesNamespace}.${args.cls}`,
        `        {`,
        buildInitializer(args.fixture, args.fieldMap, args.opts),
        `        };`,
    ];
}
/** A `[Fact]` that constructs the fixture and asserts the validator accepts it — the valid-payload and nullable-fields facts differ only in `methodName`. */
function renderValidatingFact(methodName, args) {
    return [
        `    [Fact]`,
        `    public void ${methodName}()`,
        `    {`,
        ...valueDeclLines(args),
        `        var result = new ${args.vcls}().Validate(value);`,
        `        Assert.True(result.IsValid);`,
        `    }`,
    ].join("\n");
}
function renderValidFact(args) {
    return renderValidatingFact("ParsesValidPayload", args);
}
function renderNullableFact(args) {
    return renderValidatingFact("AcceptsNullForNullableFields", args);
}
function renderMutationFact(args) {
    const methodName = `RejectsWhen${sanitizeMutationName(args.description)}`;
    return [
        `    [Fact]`,
        `    public void ${methodName}()`,
        `    {`,
        `        // ${args.description}`,
        `        var payload = new System.Collections.Generic.Dictionary<string, object?>`,
        `        {`,
        ...Object.entries(args.mutated).map(([k, v]) => {
            const info = args.fieldMap.get(k);
            const hint = info?.type ?? null;
            return `            [${JSON.stringify(k)}] = ${literalForValue(v, hint)},`;
        }),
        `        };`,
        `        var result = new ${args.vcls}().Validate(payload);`,
        `        Assert.False(result.IsValid);`,
        `    }`,
    ].join("\n");
}
function renderGetsAndSetsFact(args) {
    const prop = propName(args.field.name, args.opts);
    const nextValue = nextSampleFor(args.field);
    return [
        `    [Fact]`,
        `    public void GetsAndSets${prop}()`,
        `    {`,
        ...valueDeclLines(args),
        `        var next = ${nextValue};`,
        `        value.${prop} = next;`,
        `        Assert.Equal(next, value.${prop});`,
        `    }`,
    ].join("\n");
}
function renderAllowsNullFact(args) {
    const prop = propName(args.field.name, args.opts);
    return [
        `    [Fact]`,
        `    public void AllowsSetting${prop}ToNull()`,
        `    {`,
        ...valueDeclLines(args),
        `        value.${prop} = null;`,
        `        Assert.Null(value.${prop});`,
        `    }`,
    ].join("\n");
}
function nextSampleFor(field) {
    switch (field.type) {
        case "string":
        case "character":
            return '"next"';
        case "decimal":
            return '"1.00"';
        case "uuid":
            return "Guid.NewGuid().ToString()";
        case "number":
        case "integer":
        case "biginteger":
        case "smallinteger":
        case "reference":
            return "42L";
        case "float":
            return "42.0";
        case "boolean":
            return "false";
        case "datetime":
            return "System.DateTime.UtcNow.AddDays(1)";
        case "binary":
            return "new byte[] { 1 }";
        default:
            throw new Error(`nextSampleFor: unknown type "${field.type}"`);
    }
}
function buildTableFacts(args) {
    const { cls, vcls, tableName, tableDef, datasource, fieldMap, opts } = args;
    const validFixture = buildDatasourceFixture({
        table: tableName,
        datasource,
        datetime: opts.datetime,
    });
    const baseArgs = {
        cls,
        vcls,
        fixture: validFixture,
        fieldMap,
        opts,
    };
    const facts = [renderValidFact(baseArgs)];
    if (hasAnyNullable(tableDef)) {
        const nullableFixture = buildDatasourceFixture({
            table: tableName,
            datasource,
            nullableVariant: true,
            datetime: opts.datetime,
        });
        facts.push(renderNullableFact({ ...baseArgs, fixture: nullableFixture }));
    }
    const mutations = enumerateInvalidMutations({
        table: tableName,
        datasource,
    });
    for (const m of mutations) {
        const mutated = m.mutate({ ...validFixture });
        facts.push(renderMutationFact({
            vcls,
            description: m.description,
            mutated,
            fieldMap,
        }));
    }
    facts.push(...renderFieldFacts(allFieldsOf(tableDef), {
        cls,
        fixture: validFixture,
        fieldMap,
        opts,
    }));
    return facts;
}
function renderFieldFacts(fields, ctx) {
    const { cls, fixture, fieldMap, opts } = ctx;
    const out = [];
    for (const field of fields) {
        out.push(renderGetsAndSetsFact({ cls, field, fixture, fieldMap, opts }));
    }
    for (const field of fields) {
        if (field.isNullable) {
            out.push(renderAllowsNullFact({ cls, field, fixture, fieldMap, opts }));
        }
    }
    return out;
}
export function generateForTable(entry, datasource, options = DEFAULT_GENERATE_OPTIONS) {
    const opts = { ...DEFAULT_GENERATE_OPTIONS, ...options };
    const [tableName, tableDefRaw] = entryOf(entry);
    const tableDef = tableDefRaw;
    const cls = className(tableName, opts);
    const vcls = validatorName(tableName, opts);
    const testClass = testClassName(tableName, opts);
    const fieldMap = buildFieldMap(tableDef);
    const facts = buildTableFacts({
        cls,
        vcls,
        tableName,
        tableDef,
        datasource,
        fieldMap,
        opts,
    });
    const header = [
        `// schema-version: ${opts.schemaVersion}`,
        `using Xunit;`,
        `using ${opts.validatorsNamespace};`,
        ``,
        `namespace ${opts.namespace};`,
        ``,
        ``,
    ].join("\n");
    return generateCsharpTestClass(testClass, header, facts);
}
export const { generateFromSchema, createGenerator } = datasourceTestsModule({
    generateForTable,
    defaultGenerateOptions: DEFAULT_GENERATE_OPTIONS,
});
