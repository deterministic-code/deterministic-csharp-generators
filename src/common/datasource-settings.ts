import type { SettingsDict } from "./generate-context.ts";
import { settingsStr } from "./settings.ts";

const ID_CSHARP: Record<string, string> = {
  integer: "int",
  smallinteger: "short",
  biginteger: "long",
  uuid: "System.Guid",
  string: "string",
};

const REFERENCE_SHAPE: Record<string, { type: string; size: number | undefined }> =
  {
    integer: { type: "number", size: undefined },
    biginteger: { type: "biginteger", size: undefined },
    uuid: { type: "uuid", size: undefined },
    string: { type: "string", size: 64 },
  };

export type DatasourceSettings = {
  idType: string;
  datetimeRepr: string;
  withUuidColumn: boolean;
  csharpIdType: string;
};

export const datasourceSettings = (
  settings: SettingsDict,
): DatasourceSettings => {
  const idType = settingsStr(settings, "datasource.id_type") ?? "integer";
  return {
    idType,
    datetimeRepr: settingsStr(settings, "datasource.datetime") ?? "native",
    withUuidColumn: idType !== "uuid",
    csharpIdType: ID_CSHARP[idType] ?? "int",
  };
};

export const referenceFieldShape = (
  idType: string,
): { type: string; size: number | undefined } =>
  REFERENCE_SHAPE[idType] ?? REFERENCE_SHAPE.integer;
