import { loadFieldTypeCatalog } from "@deterministic-code/generator-sdk/lib/field-type-catalog";
import { fieldConverterFor } from "@deterministic-code/generator-sdk/lib/field-converter";
/** The shared C# field converter (from `field-converters/csharp.ts`) — the one place the C# validator + test emitters resolve native types and numeric literals, so both read the same catalog-backed mapping tables the type emitter derives its property types from. */
export const csharpConverter = fieldConverterFor({
    targetKind: "language",
    target: "csharp",
    catalog: await loadFieldTypeCatalog(),
    datetimeRepr: "native",
});
