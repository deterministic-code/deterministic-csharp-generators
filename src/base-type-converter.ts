import type { NativeInfo } from "@deterministic-code/generators-common/base-type-converter";
import { hexToBytes } from "@deterministic-code/generators-common/default-token";

const csString = (value: string): string => JSON.stringify(value);

const numeric: NativeInfo["defaults"] = {
  Numeric: (arg: string) => arg,
  String: (arg: string) => arg,
};

const stringy: NativeInfo["defaults"] = {
  String: csString,
  Numeric: csString,
};

export const conversions: Record<string, NativeInfo> = {
  string: { to: "string", defaults: stringy },
  character: { to: "string", defaults: stringy },
  number: { to: "long", defaults: numeric },
  integer: { to: "long", defaults: numeric },
  unsignedinteger: { to: "uint", defaults: numeric },
  smallinteger: { to: "short", defaults: numeric },
  unsignedsmallinteger: { to: "ushort", defaults: numeric },
  biginteger: { to: "long", defaults: numeric },
  unsignedbiginteger: { to: "ulong", defaults: numeric },
  float: { to: "double", defaults: numeric },
  decimal: { to: "string", defaults: { ...numeric, String: csString } },
  boolean: {
    to: "bool",
    defaults: {
      Boolean: (arg: string) => (arg === "true" ? "true" : "false"),
    },
  },
  datetime: {
    to: "System.DateTime",
    defaults: {
      Now: () => "DateTime.Now",
      UtcNow: () => "DateTime.UtcNow",
      DateTime: (arg: string) => `DateTime.Parse(${csString(arg)})`,
    },
  },
  binary: {
    to: "byte[]",
    defaults: {
      Hex: (arg: string) =>
        `new byte[] { ${hexToBytes(arg).join(", ")} }`,
    },
  },
  uuid: {
    to: "string",
    defaults: {
      NewId: () => "Guid.NewGuid()",
      Empty: () => "Guid.Empty.ToString()",
      Uuid: csString,
    },
  },
  reference: { to: "long", defaults: {} },
};

export const toNative = (specType: string): string => {
  const info = conversions[specType];
  if (info === undefined) {
    throw new Error(`Unknown spec field type: ${specType}`);
  }
  return info.to;
};

export const convertSpecType = toNative;
