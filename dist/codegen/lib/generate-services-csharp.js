import { generateServicesFiles, dispatchServicesStep, servicesStepGenerate, } from "@deterministic-code/generator-sdk/codegen/lib/services-generate";
import { DEFAULT_COMMENT_STYLE, renderDocComment, } from "@deterministic-code/generator-sdk/generate-doc-comment";
import { namesFor } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
export const DEFAULT_GENERATE_OPTIONS = {
    fileFormat: "Camel",
    style: DEFAULT_COMMENT_STYLE,
};
function serviceDoc(args) {
    return renderDocComment({
        style: args.style,
        summary: `Service ${args.className}.`,
        lines: [
            `Datasource type: ${args.datasourceType}.`,
            `Target: ${args.target}.`,
            `Fields: 0.`,
        ],
        language: "csharp",
    });
}
export function generateGenericService(candidate, options = {}) {
    const { fileFormat = "Camel", style = DEFAULT_COMMENT_STYLE } = options;
    const names = namesFor({ fileFormat, language: "csharp" });
    const className = names.className(candidate.name, "service");
    const fileBase = names.fileBase(candidate.name, "service");
    const doc = serviceDoc({
        className,
        style,
        datasourceType: candidate.datasourceType ?? "standard",
        target: "StandardCrud",
    });
    const content = `namespace Backend.Services.Views;

${doc}public class ${className} { }
`;
    return { path: `${fileBase}.cs`, content };
}
export function generateCustomServiceStub(entry, options = {}) {
    const { fileFormat = "Camel", style = DEFAULT_COMMENT_STYLE } = options;
    const names = namesFor({ fileFormat, language: "csharp" });
    const className = entry.name;
    const interfaceName = `I${className}`;
    const fileBase = names.casedFileStem(entry.name);
    const doc = serviceDoc({
        className,
        style,
        datasourceType: "standard",
        target: "Custom",
    });
    const content = `namespace Backend.Services.Custom;

${doc}public interface ${interfaceName} { }

${doc}public class ${className} : ${interfaceName} { }
`;
    return { path: `../custom/${fileBase}.cs`, content };
}
/** Catalog `services` step (csharp). */
export const generate = (ctx) => servicesStepGenerate({
    dispatchStep: dispatchServicesStep,
    generator: { createGenerator },
    language: "csharp",
}, ctx);
/** Generator owns its render primitives + options; the shared orchestration in services-generate.ts does the rest. */
export const createGenerator = () => ({
    generate: (config) => generateServicesFiles({
        ...config,
        primitives: {
            generateGenericService,
            generateCustomServiceStub,
            defaultGenerateOptions: DEFAULT_GENERATE_OPTIONS,
        },
    }),
});
