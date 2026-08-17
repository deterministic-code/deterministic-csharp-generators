import { generateRoutesTestsFiles, dispatchRoutesTestsStep, routesStepGenerate, } from "@deterministic-code/generator-sdk/codegen/lib/routes-generate";
import { namesFor, } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
export const DEFAULT_GENERATE_OPTIONS = {
    schemaVersion: "1.0",
    apiBase: "/api",
    fileFormat: "Camel",
};
const csharpNames = (options) => namesFor({ ...DEFAULT_GENERATE_OPTIONS, ...options, language: "csharp" });
function generateTestClass(testClass) {
    return `namespace Routes.Views.Tests;

public class ${testClass} { }
`;
}
function generateRouterTest(candidate, options = DEFAULT_GENERATE_OPTIONS) {
    const names = csharpNames(options);
    const testClass = `${names.classNamePlural(candidate.name)}RouterTests`;
    const fileBase = names.fileBasePlural(candidate.name, "_router_tests");
    return { path: `${fileBase}.cs`, content: generateTestClass(testClass) };
}
export const generateReadOnlyRouterTest = generateRouterTest;
export const generateCrudRouterTest = generateRouterTest;
/** Catalog `routes_tests` step (csharp). */
export const generate = (ctx) => routesStepGenerate({
    dispatchStep: dispatchRoutesTestsStep,
    generator: { createGenerator },
    language: "csharp",
}, ctx);
export const createGenerator = () => ({
    generate: (config) => generateRoutesTestsFiles({
        ...config,
        primitives: {
            generateReadOnlyRouterTest,
            generateCrudRouterTest,
            defaultGenerateOptions: DEFAULT_GENERATE_OPTIONS,
        },
    }),
});
