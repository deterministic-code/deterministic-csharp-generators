import { createGenerator } from "./generate-datasource-validator-csharp.js";
import { makeDatasourceGenerate } from "@deterministic-code/generator-sdk/codegen/lib/datasource-generate-config";
/** Self-describing generate for the csharp datasource-type validators — wraps the shared `generate-datasource-validator-csharp` render via `makeDatasourceGenerate`. */
export const generate = makeDatasourceGenerate(createGenerator, "csharp");
