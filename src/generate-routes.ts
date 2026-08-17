import {
  generateRoutesFiles,
  dispatchRoutesStep,
  routesStepGenerate,
} from "@deterministic-code/generator-sdk/codegen/lib/routes-generate";
import {
  DEFAULT_COMMENT_STYLE,
  renderDocComment,
  type CommentStyle,
} from "@deterministic-code/generator-sdk/generate-doc-comment";
import type { CodegenNames } from "@deterministic-code/generator-sdk/codegen-naming";
import type { CaseFormat } from "@deterministic-code/generator-sdk/case";
import { namesFor } from "@deterministic-code/generator-sdk/codegen/lib/ts-codegen-naming";
import type {
  GeneratedFile,
  RoutesGenerateConfig,
} from "@deterministic-code/generator-sdk/codegen/lib/routes-generate-types";

interface CsharpGenerateOptions {
  fileFormat?: CaseFormat;
  style?: CommentStyle;
  language?: string;
}

interface RouteCandidate {
  name: string;
}

interface EnrichmentDescriptor {
  targetTable: string;
}

type RouteEntry = Record<string, unknown>;

export const DEFAULT_GENERATE_OPTIONS: CsharpGenerateOptions = {
  fileFormat: "Camel",
  style: DEFAULT_COMMENT_STYLE,
};

const csharpNames = (options: CsharpGenerateOptions): CodegenNames =>
  namesFor({ ...DEFAULT_GENERATE_OPTIONS, ...options, language: "csharp" });

function generateRouterClass(
  className: string,
  style: CommentStyle = DEFAULT_COMMENT_STYLE,
): string {
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

function generateRouterFile(
  candidate: RouteCandidate,
  options: CsharpGenerateOptions,
): GeneratedFile {
  const { style = DEFAULT_COMMENT_STYLE } = options;
  const names = csharpNames(options);
  const className = `${names.classNamePlural(candidate.name)}Router`;
  const fileBase = names.fileBasePlural(candidate.name, "_router");
  return {
    path: `${fileBase}.cs`,
    content: generateRouterClass(className, style),
  };
}

export function generateReadOnlyRouter(
  candidate: RouteCandidate,
  options: CsharpGenerateOptions = {},
): GeneratedFile {
  return generateRouterFile(candidate, options);
}

export function generateCrudRouter(
  candidate: RouteCandidate,
  options: CsharpGenerateOptions = {},
): GeneratedFile {
  return generateRouterFile(candidate, options);
}

export function generateNameEnrichmentHelper(
  { targetTable }: EnrichmentDescriptor,
  options: CsharpGenerateOptions = {},
): GeneratedFile {
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

export function generateCustomRouteStub(
  entry: RouteEntry,
  options: CsharpGenerateOptions = {},
): GeneratedFile {
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
export const generate = (ctx: unknown) =>
  routesStepGenerate(
    {
      dispatchStep: dispatchRoutesStep,
      generator: { createGenerator },
      language: "csharp",
    },
    ctx,
  );

export const createGenerator = () => ({
  generate: (config: RoutesGenerateConfig) =>
    generateRoutesFiles({
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
