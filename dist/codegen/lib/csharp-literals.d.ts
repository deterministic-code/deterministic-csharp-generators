/** The shared C# field converter (from `field-converters/csharp.ts`) — the one place the C# validator + test generators resolve native types and numeric literals, so both read the same catalog-backed mapping tables the type generator derives its property types from. */
export declare const csharpConverter: import("@deterministic-code/generator-sdk/lib/field-converter").FieldConverter;
