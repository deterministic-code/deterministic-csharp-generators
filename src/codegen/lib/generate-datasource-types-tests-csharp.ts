import { createGenerator } from "./generate-datasource-tests-csharp.ts";
import { makeDatasourceGenerate } from "@deterministic-code/generator-sdk/codegen/lib/datasource-generate-config";

/** Self-describing generate for the csharp datasource-type tests — wraps the shared `generate-datasource-tests-csharp` render via `makeDatasourceGenerate`. */
export const generate = makeDatasourceGenerate(createGenerator, "csharp");
