import { needsListImport } from "@deterministic-code/generator-sdk/codegen/lib/generate-view-shared";
/** The C# lane's import renderer, injected into an generator as `ctx.imports`. C# references other types by namespace-qualified name and brings namespaces into scope with `using` directives. */
export class CsharpImports {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    qualified(base) {
        return `${this.ctx.opts.datasourceNamespace}.${this.ctx.names.className(base)}`;
    }
    using(namespace) {
        return `using ${namespace};`;
    }
    collections(view) {
        return needsListImport(view) ? "using System.Collections.Generic;\n\n" : "";
    }
}
