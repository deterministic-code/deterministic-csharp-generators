import { createEmitter } from "./emit-datasource-validator-csharp.ts";
import { makeDatasourceEmit } from "@deterministic-code/generator-sdk/codegen/lib/datasource-emit-config";

/** Self-describing emit for the csharp datasource-type validators — wraps the shared `emit-datasource-validator-csharp` render via `makeDatasourceEmit`. */
export const emit = makeDatasourceEmit(createEmitter, "csharp");
