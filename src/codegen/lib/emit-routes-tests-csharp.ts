import {
  emitRoutesTestsFiles,
  dispatchRoutesTestsStep,
  routesStepEmit,
} from "@deterministic-code/generator-sdk/codegen/lib/routes-emit";
import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
import type { CodegenNames } from "@deterministic-code/generator-sdk/codegen-naming";
import {
  namesFor,
  type NamesForOptions,
} from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import type {
  EmittedFile,
  RoutesEmitConfig,
} from "@deterministic-code/generator-sdk/codegen/lib/routes-emit-types";

interface CsharpTestOptions extends NamesForOptions {
  schemaVersion?: string;
  apiBase?: string;
  fileFormat?: CaseFormat;
}

interface TestCandidate {
  name: string;
}

export const DEFAULT_EMIT_OPTIONS: CsharpTestOptions = {
  schemaVersion: "1.0",
  apiBase: "/api",
  fileFormat: "Camel",
};

const csharpNames = (options: CsharpTestOptions): CodegenNames =>
  namesFor({ ...DEFAULT_EMIT_OPTIONS, ...options, language: "csharp" });

function emitTestClass(testClass: string): string {
  return `namespace Routes.Views.Tests;

public class ${testClass} { }
`;
}

function emitRouterTest(
  candidate: TestCandidate,
  options: CsharpTestOptions = DEFAULT_EMIT_OPTIONS,
): EmittedFile {
  const names = csharpNames(options);
  const testClass = `${names.classNamePlural(candidate.name)}RouterTests`;
  const fileBase = names.fileBasePlural(candidate.name, "_router_tests");
  return { path: `${fileBase}.cs`, content: emitTestClass(testClass) };
}

export const emitReadOnlyRouterTest = emitRouterTest;
export const emitCrudRouterTest = emitRouterTest;

/** Catalog `routes_tests` step (csharp). */
export const emit = (ctx: unknown) =>
  routesStepEmit(
    {
      dispatchStep: dispatchRoutesTestsStep,
      emitter: { createEmitter },
      language: "csharp",
    },
    ctx,
  );

export const createEmitter = () => ({
  emit: (config: RoutesEmitConfig) =>
    emitRoutesTestsFiles({
      ...config,
      primitives: {
        emitReadOnlyRouterTest,
        emitCrudRouterTest,
        defaultEmitOptions: DEFAULT_EMIT_OPTIONS,
      },
    }),
});
