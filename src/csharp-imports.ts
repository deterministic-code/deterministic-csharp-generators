import { needsListImport } from "@deterministic-code/generator-sdk/codegen/lib/generate-view-shared";
import type { CodegenNames } from "@deterministic-code/generator-sdk/codegen-naming";

interface CsharpImportsCtx {
  opts: { datasourceNamespace: string };
  names: Pick<CodegenNames, "className">;
}

/** The C# lane's import renderer, injected into an generator as `ctx.imports`. C# references other types by namespace-qualified name and brings namespaces into scope with `using` directives. */
export class CsharpImports {
  ctx: CsharpImportsCtx;

  constructor(ctx: CsharpImportsCtx) {
    this.ctx = ctx;
  }

  qualified(base: string): string {
    return `${this.ctx.opts.datasourceNamespace}.${this.ctx.names.className(base)}`;
  }

  using(namespace: string): string {
    return `using ${namespace};`;
  }

  collections(view: Parameters<typeof needsListImport>[0]): string {
    return needsListImport(view) ? "using System.Collections.Generic;\n\n" : "";
  }
}
