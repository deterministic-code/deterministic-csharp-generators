import type {
  GeneratedFile,
  ServiceTestsGenerateConfig,
} from "@deterministic-code/generator-sdk/codegen/lib/service-tests-generate-types";
import {
  generateServiceTestsFiles,
  dispatchServiceTestsStep,
  servicesStepGenerate,
} from "@deterministic-code/generator-sdk/codegen/lib/services-generate";
import {
  toCase,
  type CaseFormat,
} from "@deterministic-code/generator-sdk/case";
import { namesFor } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";

interface CsharpTestCandidate {
  name: string;
}

interface CsharpTestGenerateOptions {
  schemaVersion?: string;
  servicePath?: string;
  fileFormat?: CaseFormat;
}

export const DEFAULT_GENERATE_OPTIONS = {
  schemaVersion: "1.0",
  servicePath: ".",
  fileFormat: "Camel",
} as const;

export function generateGenericServiceTest(
  candidate: CsharpTestCandidate,
  options: CsharpTestGenerateOptions = DEFAULT_GENERATE_OPTIONS,
): GeneratedFile {
  const { fileFormat = "Camel" } = options;
  const names = namesFor({ fileFormat, language: "csharp" });
  const testClass = names.className(candidate.name, "service_tests");
  // lint-generator-casing-allow: toCase
  const fileBase = toCase(`${candidate.name}_service_tests`, fileFormat);
  const content = `namespace Backend.Services.Views.Tests;

public class ${testClass} { }
`;
  return { path: `${fileBase}.cs`, content };
}

/** Catalog `service_tests` step (csharp). */
export const generate = (ctx: unknown) =>
  servicesStepGenerate(
    {
      dispatchStep: dispatchServiceTestsStep,
      generator: { createGenerator },
      language: "csharp",
    },
    ctx,
  );

export const createGenerator = () => ({
  generate: (config: ServiceTestsGenerateConfig) =>
    generateServiceTestsFiles({
      ...config,
      primitives: {
        generateGenericServiceTest,
        defaultGenerateOptions: DEFAULT_GENERATE_OPTIONS,
      },
    }),
});
