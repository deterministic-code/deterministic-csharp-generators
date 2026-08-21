import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryReader } from "@deterministic-code/generators-common/deterministic-reader";
import type { GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { generate } from "../src/generate-services.ts";

const DS_YAML = `types:
  - notification_type:
      fields:
        - channel_name:
            type: string
            is_unique: true
`;

const VIEW_YAML = `includes:
  - datasource_types:
      include: "*"
types: []
`;

const SERVICES_YAML = `includes:
  - view_type_services:
      filter: 'type is view_type'
services: []
`;

const entryBody = (entry: GenerateEntry): string => {
  if ("contents" in entry) return String(entry.contents);
  return entry.content;
};

const byFilename = async (settings: Record<string, string>) => {
  const map = new Map<string, string>();
  for (const entry of await generate({
    reader: memoryReader({
      "datasource_types.yaml": DS_YAML,
      "view_types.yaml": VIEW_YAML,
      "services.yaml": SERVICES_YAML,
    }),
    settings,
  })) {
    map.set(entry.filename, entryBody(entry));
  }
  return map;
};

describe("generate services casing", () => {
  it("Auto uses Camel files and Pascal types", async () => {
    const files = await byFilename({});
    assert.ok(files.has("notificationTypeService.cs"));
    const body = files.get("notificationTypeService.cs")!;
    assert.match(body, /public class NotificationTypeService /);
  });

  it("Pascal file names", async () => {
    const files = await byFilename({
      "languages.csharp.casing.file_names": "Pascal",
    });
    assert.ok(files.has("NotificationTypeService.cs"));
  });

  it("Snake file names", async () => {
    const files = await byFilename({
      "languages.csharp.casing.file_names": "Snake",
    });
    assert.ok(files.has("notification_type_service.cs"));
  });
});
