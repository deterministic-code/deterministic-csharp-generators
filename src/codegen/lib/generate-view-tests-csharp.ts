import type { ParsedSettings } from "@deterministic-code/generator-sdk/read-settings";
import {
  toCase,
  type CaseFormat,
} from "@deterministic-code/generator-sdk/case";
import { testCasingOptionsFromSettings } from "@deterministic-code/generator-sdk/codegen/lib/generate-settings-options";
import {
  namesFor,
  type NamesForOptions,
} from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import { normalizeAll } from "@deterministic-code/generator-sdk/view-expand";
import { viewGenerator } from "@deterministic-code/generator-sdk/codegen-context";
import { CsharpImports } from "./csharp-imports.ts";
import { entryOf } from "@deterministic-code/generator-sdk/generator-shared";
import { generateCsharpTestClass } from "./generate-csharp-tests-shared.ts";
import { INLINED_VIEW_AUDIT_FIELDS as STANDARD_COLUMNS } from "@deterministic-code/generator-sdk/codegen/lib/standard-columns";
import type { CodegenNames } from "@deterministic-code/generator-sdk/codegen-naming";
import type {
  Datasource,
  ShapedView,
  UnionView,
  View,
  ViewField,
} from "@deterministic-code/generator-sdk/codegen/lib/generate-view-shared";

type Flatten<T> = { [K in keyof T]: T[K] };

export type CsharpGenerateOptions = Flatten<
  NamesForOptions & {
    schemaVersion: string;
    namespace: string;
    typesNamespace: string;
    datasourceNamespace: string;
    validatorsNamespace: string;
    datetime?: string;
  }
>;

interface CsTypeInfo {
  type: string;
  isValue: boolean;
  nextLiteral: string;
}

interface AccessorField {
  name: string;
  isNullable: boolean;
  isValue: boolean;
  nextLiteral: string;
}

interface CsFieldDef {
  type: string;
  is_nullable?: boolean;
}

interface GeneratedFile {
  path: string;
  content: string;
}

export const DEFAULT_GENERATE_OPTIONS: CsharpGenerateOptions = {
  schemaVersion: "1.0",
  namespace: "Backend.Tests.View",
  typesNamespace: "Backend.Types.View",
  datasourceNamespace: "Backend.Types.Datasource",
  validatorsNamespace: "Backend.Validators.View",
};

const VALUE_TYPES = new Set(["number", "reference", "boolean", "datetime"]);

function csharpNames(opts: CsharpGenerateOptions): CodegenNames {
  return namesFor({ ...opts, language: "csharp" });
}

function typeName(name: string, opts: CsharpGenerateOptions): string {
  return csharpNames(opts).className(name);
}

function viewValidator(name: string, opts: CsharpGenerateOptions): string {
  return `${csharpNames(opts).className(name)}Validator`;
}

function testClassName(name: string, opts: CsharpGenerateOptions): string {
  return `${toCase(name, opts.fileFormat as CaseFormat)}Tests`; // lint-generator-casing-allow: toCase
}

function propName(fieldName: string, opts: CsharpGenerateOptions): string {
  return toCase(fieldName, opts.fieldFormat as CaseFormat); // lint-generator-casing-allow: toCase
}

function dsQualified(base: string, opts: CsharpGenerateOptions): string {
  return `${opts.datasourceNamespace}.${csharpNames(opts).className(base)}`;
}

function csharpRefTypeInfo(base: string, isArray: boolean): CsTypeInfo {
  return isArray
    ? {
        type: `List<${base}>`,
        isValue: false,
        nextLiteral: `new List<${base}>()`,
      }
    : { type: base, isValue: false, nextLiteral: `new ${base}()` };
}

function viewFieldCsInfo(
  field: ViewField,
  opts: CsharpGenerateOptions,
): CsTypeInfo {
  const { parsed } = field;
  if (parsed.kind === "primitive") {
    const base =
      parsed.base === "string"
        ? "string"
        : parsed.base === "number"
          ? "long"
          : "bool";
    if (parsed.isArray) {
      return {
        type: `List<${base}>`,
        isValue: false,
        nextLiteral: `new List<${base}>()`,
      };
    }
    const isValue = parsed.base !== "string";
    return {
      type: base,
      isValue,
      nextLiteral:
        parsed.base === "string"
          ? '"next"'
          : parsed.base === "number"
            ? "42L"
            : "false",
    };
  }
  if (parsed.kind === "datasource") {
    return csharpRefTypeInfo(dsQualified(parsed.base, opts), parsed.isArray);
  }
  return csharpRefTypeInfo(
    csharpNames(opts).className(parsed.base),
    parsed.isArray,
  );
}

function datasourceInheritedFields(
  inherits: string,
  datasource: Datasource | undefined,
): AccessorField[] {
  const entry = (datasource?.types ?? []).find(
    (e) => Object.keys(e)[0] === inherits,
  );
  if (!entry) return [];
  const def = Object.values(entry)[0];
  const declared: AccessorField[] = (def.fields ?? []).map((f) => {
    const [fname, fdefRaw] = entryOf(f);
    const fdef = fdefRaw as CsFieldDef;
    const type = fdef.type;
    const isValue = VALUE_TYPES.has(type);
    const isNullable = fdef.is_nullable === true;
    const nextLiteral =
      type === "string"
        ? '"next"'
        : type === "number" || type === "reference"
          ? "42L"
          : type === "boolean"
            ? "false"
            : type === "datetime"
              ? "System.DateTime.UtcNow.AddDays(1)"
              : "new byte[] { 1 }";
    return { name: fname, isNullable, isValue, nextLiteral };
  });
  const standard: AccessorField[] = STANDARD_COLUMNS.map((c) => ({
    name: c.name,
    isNullable: false,
    isValue: VALUE_TYPES.has(c.type),
    nextLiteral:
      c.type === "number"
        ? "42L"
        : c.type === "datetime"
          ? "System.DateTime.UtcNow.AddDays(1)"
          : '"next"',
  }));
  return [...standard, ...declared];
}

function shapedAccessorFields(
  view: ShapedView,
  datasource: Datasource | undefined,
  opts: CsharpGenerateOptions,
): AccessorField[] {
  const omit = new Set((view.enrichments ?? []).map((e) => e.fkColumn));
  const inherited = view.inherits
    ? datasourceInheritedFields(view.inherits, datasource).filter(
        (f) => !omit.has(f.name),
      )
    : [];
  const declared: AccessorField[] = view.fields.map((f) => {
    const info = viewFieldCsInfo(f, opts);
    return {
      name: f.name,
      isNullable: f.isNullable === true,
      isValue: info.isValue,
      nextLiteral: info.nextLiteral,
    };
  });
  return [...inherited, ...declared];
}

function renderShapedValidatorFacts(
  view: ShapedView,
  opts: CsharpGenerateOptions,
): string[] {
  const cls = `${opts.typesNamespace}.${typeName(view.name, opts)}`;
  const vcls = viewValidator(view.name, opts);

  const facts = [
    [
      `    [Fact]`,
      `    public void ParsesValidPayload()`,
      `    {`,
      `        var value = new ${cls}();`,
      `        var result = new ${vcls}().Validate(value);`,
      `        Assert.NotNull(result);`,
      `    }`,
    ].join("\n"),
  ];

  if (view.fields.some((f) => f.isNullable)) {
    facts.push(
      [
        `    [Fact]`,
        `    public void AcceptsNullForNullableFields()`,
        `    {`,
        `        var value = new ${cls}();`,
        `        var result = new ${vcls}().Validate(value);`,
        `        Assert.NotNull(result);`,
        `    }`,
      ].join("\n"),
    );
  }

  return facts;
}

function renderShapedAccessorFacts(
  view: ShapedView,
  datasource: Datasource | undefined,
  opts: CsharpGenerateOptions,
): string[] {
  const cls = `${opts.typesNamespace}.${typeName(view.name, opts)}`;
  const fields = shapedAccessorFields(view, datasource, opts);
  const facts: string[] = [];

  for (const f of fields) {
    const prop = propName(f.name, opts);
    facts.push(
      [
        `    [Fact]`,
        `    public void GetsAndSets${prop}()`,
        `    {`,
        `        var value = new ${cls}();`,
        `        var next = ${f.nextLiteral};`,
        `        value.${prop} = next;`,
        `        Assert.Equal(next, value.${prop});`,
        `    }`,
      ].join("\n"),
    );
  }

  for (const f of fields) {
    if (f.isNullable) {
      const prop = propName(f.name, opts);
      facts.push(
        [
          `    [Fact]`,
          `    public void AllowsSetting${prop}ToNull()`,
          `    {`,
          `        var value = new ${cls}();`,
          `        value.${prop} = null;`,
          `        Assert.Null(value.${prop});`,
          `    }`,
        ].join("\n"),
      );
    }
  }

  return facts;
}

function renderUnionFacts(view: UnionView, opts: CsharpGenerateOptions): string[] {
  const vcls = viewValidator(view.name, opts);

  const facts = view.members.map((member) => {
    const memberCls = `${opts.typesNamespace}.${typeName(member, opts)}`;
    const methodName = `DispatchesTo${toCase(member, "Pascal")}Member`; // lint-generator-casing-allow: toCase
    return [
      `    [Fact]`,
      `    public void ${methodName}()`,
      `    {`,
      `        var value = new ${memberCls}();`,
      `        var ex = Record.Exception(() => new ${vcls}().ValidateAndThrow(value));`,
      `        Assert.True(ex == null || ex is FluentValidation.ValidationException, $"dispatch surfaced unexpected exception type: {ex?.GetType().FullName}");`,
      `    }`,
    ].join("\n");
  });

  facts.push(
    [
      `    [Fact]`,
      `    public void RejectsNeitherMember()`,
      `    {`,
      `        Assert.Throws<FluentValidation.ValidationException>(() =>`,
      `        {`,
      `            object value = new object();`,
      `            new ${vcls}().ValidateAndThrow(value);`,
      `        });`,
      `    }`,
    ].join("\n"),
  );

  return facts;
}

export function generateForView(
  view: View,
  datasource: Datasource | undefined,
  options: Partial<CsharpGenerateOptions> = DEFAULT_GENERATE_OPTIONS,
): GeneratedFile {
  const opts: CsharpGenerateOptions = { ...DEFAULT_GENERATE_OPTIONS, ...options };
  const testClass = testClassName(view.name, opts);
  let facts: string[];
  if (view.kind === "union") {
    facts = renderUnionFacts(view, opts);
  } else {
    facts = [
      ...renderShapedValidatorFacts(view, opts),
      ...renderShapedAccessorFacts(view, datasource, opts),
    ];
  }

  const header = [
    `// schema-version: ${opts.schemaVersion}`,
    `using System.Collections.Generic;`,
    `using Xunit;`,
    `using FluentValidation;`,
    `using ${opts.typesNamespace};`,
    `using ${opts.datasourceNamespace};`,
    `using ${opts.validatorsNamespace};`,
    ``,
    `namespace ${opts.namespace};`,
    ``,
  ].join("\n");

  return generateCsharpTestClass(testClass, header, facts);
}

export function generateFromSchema(
  { viewTypes, datasource }: { viewTypes: unknown; datasource?: Datasource },
  options: Partial<CsharpGenerateOptions> = DEFAULT_GENERATE_OPTIONS,
): GeneratedFile[] {
  const opts: CsharpGenerateOptions = { ...DEFAULT_GENERATE_OPTIONS, ...options };
  return (normalizeAll(viewTypes ?? { types: [] }) as View[]).map((v) =>
    generateForView(v, datasource, opts),
  );
}

const baseCreateGenerator = viewGenerator((view, ctx) =>
  generateForView(view, ctx.opts.datasourceTypes, ctx.opts),
);

export const createGenerator = () => {
  const base = baseCreateGenerator(CsharpImports);
  return {
    generate: (config: { settings: ParsedSettings; language: string }) =>
      base.generate({
        ...DEFAULT_GENERATE_OPTIONS,
        ...testCasingOptionsFromSettings(config),
        ...config,
      }),
  };
};
