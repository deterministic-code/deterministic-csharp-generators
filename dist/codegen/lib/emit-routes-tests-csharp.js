import { emitRoutesTestsFiles, dispatchRoutesTestsStep, routesStepEmit, } from "@deterministic-code/generator-sdk/codegen/lib/routes-emit";
import { namesFor, } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
export const DEFAULT_EMIT_OPTIONS = {
    schemaVersion: "1.0",
    apiBase: "/api",
    fileFormat: "Camel",
};
const csharpNames = (options) => namesFor({ ...DEFAULT_EMIT_OPTIONS, ...options, language: "csharp" });
function emitTestClass(testClass) {
    return `namespace Routes.Views.Tests;

public class ${testClass} { }
`;
}
function emitRouterTest(candidate, options = DEFAULT_EMIT_OPTIONS) {
    const names = csharpNames(options);
    const testClass = `${names.classNamePlural(candidate.name)}RouterTests`;
    const fileBase = names.fileBasePlural(candidate.name, "_router_tests");
    return { path: `${fileBase}.cs`, content: emitTestClass(testClass) };
}
export const emitReadOnlyRouterTest = emitRouterTest;
export const emitCrudRouterTest = emitRouterTest;
/** Catalog `routes_tests` step (csharp). */
export const emit = (ctx) => routesStepEmit({
    dispatchStep: dispatchRoutesTestsStep,
    emitter: { createEmitter },
    language: "csharp",
}, ctx);
export const createEmitter = () => ({
    emit: (config) => emitRoutesTestsFiles({
        ...config,
        primitives: {
            emitReadOnlyRouterTest,
            emitCrudRouterTest,
            defaultEmitOptions: DEFAULT_EMIT_OPTIONS,
        },
    }),
});
