import {
  generateRoutesTestsFiles,
  dispatchRoutesTestsStep,
  routesStepGenerate,
} from "@deterministic-code/generator-sdk/codegen/lib/routes-generate";
import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
import type { CodegenNames } from "@deterministic-code/generator-sdk/codegen-naming";
import {
  namesFor,
  type NamesForOptions,
} from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import type {
  GeneratedFile,
  RoutesGenerateConfig,
} from "@deterministic-code/generator-sdk/codegen/lib/routes-generate-types";

interface CsharpTestOptions extends NamesForOptions {
  schemaVersion?: string;
  apiBase?: string;
  fileFormat?: CaseFormat;
}

interface TestCandidate {
  name: string;
}

export const DEFAULT_GENERATE_OPTIONS: CsharpTestOptions = {
  schemaVersion: "1.0",
  apiBase: "/api",
  fileFormat: "Camel",
};

const csharpNames = (options: CsharpTestOptions): CodegenNames =>
  namesFor({ ...DEFAULT_GENERATE_OPTIONS, ...options, language: "csharp" });

function generateTestClass(testClass: string): string {
  return `namespace Routes.Views.Tests;

public class ${testClass} { }
`;
}

function generateRouterTest(
  candidate: TestCandidate,
  options: CsharpTestOptions = DEFAULT_GENERATE_OPTIONS,
): GeneratedFile {
  const names = csharpNames(options);
  const testClass = `${names.classNamePlural(candidate.name)}RouterTests`;
  const fileBase = names.fileBasePlural(candidate.name, "_router_tests");
  return { path: `${fileBase}.cs`, content: generateTestClass(testClass) };
}

export const generateReadOnlyRouterTest = generateRouterTest;
export const generateCrudRouterTest = generateRouterTest;

/** Catalog `routes_tests` step (csharp). */
export const generate = (ctx: unknown) =>
  routesStepGenerate(
    {
      dispatchStep: dispatchRoutesTestsStep,
      generator: { createGenerator },
      language: "csharp",
    },
    ctx,
  );

export const createGenerator = () => ({
  generate: (config: RoutesGenerateConfig) =>
    generateRoutesTestsFiles({
      ...config,
      primitives: {
        generateReadOnlyRouterTest,
        generateCrudRouterTest,
        defaultGenerateOptions: DEFAULT_GENERATE_OPTIONS,
      },
    }),
});
