import { emitServiceTestsFiles, dispatchServiceTestsStep, servicesStepEmit, } from "@deterministic-code/generator-sdk/codegen/lib/services-emit";
import { toCase, } from "@deterministic-code/generator-sdk/case";
import { namesFor } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
export const DEFAULT_EMIT_OPTIONS = {
    schemaVersion: "1.0",
    servicePath: ".",
    fileFormat: "Camel",
};
export function emitGenericServiceTest(candidate, options = DEFAULT_EMIT_OPTIONS) {
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
export const emit = (ctx) => servicesStepEmit({
    dispatchStep: dispatchServiceTestsStep,
    emitter: { createEmitter },
    language: "csharp",
}, ctx);
export const createEmitter = () => ({
    emit: (config) => emitServiceTestsFiles({
        ...config,
        primitives: {
            emitGenericServiceTest,
            defaultEmitOptions: DEFAULT_EMIT_OPTIONS,
        },
    }),
});
