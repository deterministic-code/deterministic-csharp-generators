import { generateRoutesFiles, dispatchRoutesStep, routesStepGenerate, } from "@deterministic-code/generator-sdk/codegen/lib/routes-generate";
import { DEFAULT_COMMENT_STYLE, renderDocComment, } from "@deterministic-code/generator-sdk/generate-doc-comment";
import { namesFor } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
export const DEFAULT_GENERATE_OPTIONS = {
    fileFormat: "Camel",
    style: DEFAULT_COMMENT_STYLE,
};
const csharpNames = (options) => namesFor({ ...DEFAULT_GENERATE_OPTIONS, ...options, language: "csharp" });
function generateRouterClass(className, style = DEFAULT_COMMENT_STYLE) {
    const interfaceName = `I${className}`;
    const descLines = [
        `Route ${className}.`,
        `Datasource type: standard.`,
        `Target: StandardCrud.`,
    ];
    const doc = renderDocComment({
        style,
        summary: `Route ${className}.`,
        lines: descLines,
        language: "csharp",
    });
    return `namespace Routes.Views;

${doc}public interface ${interfaceName} { }

${doc}public class ${className} : ${interfaceName} { }
`;
}
function generateRouterFile(candidate, options) {
    const { style = DEFAULT_COMMENT_STYLE } = options;
    const names = csharpNames(options);
    const className = `${names.classNamePlural(candidate.name)}Router`;
    const fileBase = names.fileBasePlural(candidate.name, "_router");
    return {
        path: `${fileBase}.cs`,
        content: generateRouterClass(className, style),
    };
}
export function generateReadOnlyRouter(candidate, options = {}) {
    return generateRouterFile(candidate, options);
}
export function generateCrudRouter(candidate, options = {}) {
    return generateRouterFile(candidate, options);
}
export function generateNameEnrichmentHelper({ targetTable }, options = {}) {
    const names = csharpNames(options);
    const targetPascal = names.className(targetTable);
    const className = `${targetPascal}NameEnrichment`;
    const fkProp = `${targetPascal}Id`;
    const nameProp = `${targetPascal}Name`;
    const fileBase = names.fileBase(targetTable, "enrichment");
    const content = `using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Routes.Enrichment;

public static class ${className}
{
    public static async Task<IList<T>> EnrichItemsWith${targetPascal}NameAsync<T>(
        IList<T> items,
        I${targetPascal}NameSource source)
    {
        if (items.Count == 0) return items;
        var rows = await source.FindAllAsync();
        var map = rows.ToDictionary(r => r.Id, r => r.Name);
        foreach (var item in items)
        {
            var id = (long)(item!.GetType().GetProperty("${fkProp}")!.GetValue(item)!);
            if (!map.TryGetValue(id, out var name))
            {
                throw new InvalidOperationException(
                    $"EnrichItemsWith${targetPascal}NameAsync: no ${targetTable} row for id {id}");
            }
            item.GetType().GetProperty("${nameProp}")?.SetValue(item, name);
        }
        return items;
    }

    public static async Task<T> EnrichItemWith${targetPascal}NameAsync<T>(
        T item,
        I${targetPascal}NameSource source)
    {
        var id = (long)(item!.GetType().GetProperty("${fkProp}")!.GetValue(item)!);
        var row = await source.FindAsync(id)
            ?? throw new InvalidOperationException(
                $"EnrichItemWith${targetPascal}NameAsync: no ${targetTable} row for id {id}");
        item.GetType().GetProperty("${nameProp}")?.SetValue(item, row.Name);
        return item;
    }
}

public interface I${targetPascal}NameSource
{
    Task<IReadOnlyList<${targetPascal}NameRow>> FindAllAsync();
    Task<${targetPascal}NameRow?> FindAsync(long id);
}

public sealed record ${targetPascal}NameRow(long Id, string Name);
`;
    return {
        path: `${fileBase}.cs`,
        content,
    };
}
export function generateCustomRouteStub(entry, options = {}) {
    const [name] = Object.keys(entry);
    const names = csharpNames(options);
    const className = `${names.className(name)}Route`;
    const interfaceName = `I${className}`;
    const fileBase = names.customRouteFileBase(name);
    const content = `namespace Routes.Custom;

public interface ${interfaceName} { }

public class ${className} : ${interfaceName} { }
`;
    return { path: `../custom/${fileBase}.cs`, content };
}
/** Catalog `routes` step (csharp). */
export const generate = (ctx) => routesStepGenerate({
    dispatchStep: dispatchRoutesStep,
    generator: { createGenerator },
    language: "csharp",
}, ctx);
export const createGenerator = () => ({
    generate: (config) => generateRoutesFiles({
        ...config,
        primitives: {
            generateCrudRouter,
            generateReadOnlyRouter,
            generateCustomRouteStub,
            generateNameEnrichmentHelper,
            nestedRouterGenerators: {},
        },
    }),
});
