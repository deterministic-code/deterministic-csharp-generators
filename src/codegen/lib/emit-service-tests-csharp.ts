import type {
  EmittedFile,
  ServiceTestsEmitConfig,
} from "@deterministic-code/generator-sdk/codegen/lib/service-tests-emit-types";
import {
  emitServiceTestsFiles,
  dispatchServiceTestsStep,
  servicesStepEmit,
} from "@deterministic-code/generator-sdk/codegen/lib/services-emit";
import {
  toCase,
  type CaseFormat,
} from "@deterministic-code/generator-sdk/case";
import { namesFor } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";

interface CsharpTestCandidate {
  name: string;
}

interface CsharpTestEmitOptions {
  schemaVersion?: string;
  servicePath?: string;
  fileFormat?: CaseFormat;
}

export const DEFAULT_EMIT_OPTIONS = {
  schemaVersion: "1.0",
  servicePath: ".",
  fileFormat: "Camel",
} as const;

export function emitGenericServiceTest(
  candidate: CsharpTestCandidate,
  options: CsharpTestEmitOptions = DEFAULT_EMIT_OPTIONS,
): EmittedFile {
  const { fileFormat = "Camel" } = options;
  const names = namesFor({ fileFormat, language: "csharp" });
  const testClass = names.className(candidate.name, "service_tests");
  // lint-emitter-casing-allow: toCase
  const fileBase = toCase(`${candidate.name}_service_tests`, fileFormat);
  const content = `namespace Backend.Services.Views.Tests;

public class ${testClass} { }
`;
  return { path: `${fileBase}.cs`, content };
}

/** Catalog `service_tests` step (csharp). */
export const emit = (ctx: unknown) =>
  servicesStepEmit(
    {
      dispatchStep: dispatchServiceTestsStep,
      emitter: { createEmitter },
      language: "csharp",
    },
    ctx,
  );

export const createEmitter = () => ({
  emit: (config: ServiceTestsEmitConfig) =>
    emitServiceTestsFiles({
      ...config,
      primitives: {
        emitGenericServiceTest,
        defaultEmitOptions: DEFAULT_EMIT_OPTIONS,
      },
    }),
});
