import { createEmitter } from "./emit-datasource-tests-csharp.js";
import { makeDatasourceEmit } from "@deterministic-code/generator-sdk/codegen/lib/datasource-emit-config";
/** Self-describing emit for the csharp datasource-type tests — wraps the shared `emit-datasource-tests-csharp` render via `makeDatasourceEmit`. */
export const emit = makeDatasourceEmit(createEmitter, "csharp");
