/** Map a `backend/types.yaml` field type to a C# type. */
const NATIVE: Record<string, string> = {
  string: "string",
  character: "string",
  number: "long",
  integer: "long",
  unsignedinteger: "uint",
  smallinteger: "short",
  unsignedsmallinteger: "ushort",
  biginteger: "long",
  unsignedbiginteger: "ulong",
  float: "double",
  decimal: "string",
  boolean: "bool",
  datetime: "System.DateTime",
  binary: "byte[]",
  uuid: "string",
  reference: "long",
};

/** `datasource.id_type` → C# id type. */
const ID_NATIVE: Record<string, string> = {
  integer: "int",
  smallinteger: "short",
  biginteger: "long",
  uuid: "System.Guid",
  string: "string",
};

export const convertSpecType = (
  specType: string,
  datetimeRepr: string,
): string => {
  if (specType === "datetime" && datetimeRepr === "string") return "string";
  const native = NATIVE[specType];
  if (!native) throw new Error(`Unknown spec field type: ${specType}`);
  return native;
};

export const idTypeToNative = (idType: string): string =>
  ID_NATIVE[idType] ?? ID_NATIVE.integer;
