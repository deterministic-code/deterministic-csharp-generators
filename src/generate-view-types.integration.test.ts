import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryReader } from "@deterministic-code/generators-common/deterministic-reader";
import {
  DATASOURCE_TYPES_YAML,
  VIEW_TYPES_YAML,
} from "./specification-parser.ts";
import type { GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { generate } from "./generate-view-types.ts";

const DS_YAML = `types:
  - user:
      datasource_type: audit
      fields:
        - email:
            type: string
        - role_id:
            type: number
            references: role.id
        - nick_name:
            type: string
            is_nullable: true
  - role:
      datasource_type: readonly-lookup
      fields:
        - name:
            type: string
  - tag:
      fields:
        - label:
            type: string
`;

const VIEW_YAML = `includes:
  - datasource_types:
      include: "*"
      auto_enrich: true
types:
  - user_summary:
      inherits: datasource_types.user
      omit:
        - nick_name
      fields:
        - display_name:
            type: string
  - payment:
      one_of:
        - card_payment
        - cash_payment
  - card_payment:
      fields:
        - amount:
            type: decimal
        - tags:
            type: datasource_types.tag[]
        - note:
            type: string
            is_nullable: true
  - cash_payment:
      fields:
        - amount:
            type: decimal
`;

const fixtureReader = () =>
  memoryReader({
    [VIEW_TYPES_YAML]: VIEW_YAML,
    [DATASOURCE_TYPES_YAML]: DS_YAML,
  });

const entryBody = (entry: GenerateEntry): string => {
  if ("contents" in entry) return String(entry.contents);
  return entry.content;
};

const indexEntries = (entries: GenerateEntry[]): Map<string, GenerateEntry> => {
  const map = new Map<string, GenerateEntry>();
  for (const entry of entries) {
    assert.equal(
      map.has(entry.filename),
      false,
      `duplicate generate entry: ${entry.filename}`,
    );
    map.set(entry.filename, entry);
  }
  return map;
};

const requireEntry = (
  map: Map<string, GenerateEntry>,
  filename: string,
): GenerateEntry => {
  const entry = map.get(filename);
  if (entry === undefined) {
    throw new Error(`missing generate entry: ${filename}`);
  }
  return entry;
};

describe("generate view types", () => {
  const bodyOf = async (
    suffix: string,
    settings: Record<string, string> = {},
  ) => {
    const map = indexEntries(
      await generate({ reader: fixtureReader(), settings }),
    );
    const file = [...map.keys()].find((name) => name.endsWith(suffix));
    assert.ok(file, `missing ${suffix} generate entry`);
    return entryBody(requireEntry(map, file));
  };

  it("rejects a missing view_types.yaml", async () => {
    await assert.rejects(
      () => generate({ reader: memoryReader({}), settings: {} }),
      /missing view_types\.yaml/,
    );
  });

  it("renders a shaped view, a union interface, and an inlined inherit", async () => {
    const card = await bodyOf("CardPayment.cs");
    assert.match(card, /namespace Backend\.Types\.View;/);
    assert.match(card, /public class CardPayment/);
    assert.match(card, /public string Amount \{ get; set; \}/);
    assert.match(
      card,
      /public List<Backend\.Types\.Datasource\.Tag> Tags \{ get; set; \}/,
    );
    assert.match(card, /public string\? Note \{ get; set; \}/);
    assert.match(card, /using System\.Collections\.Generic;/);
    const payment = await bodyOf("Payment.cs");
    assert.match(payment, /public interface Payment \{\}/);
    const summary = await bodyOf("UserSummary.cs");
    assert.match(summary, /public class UserSummary/);
    assert.doesNotMatch(summary, /: Backend\.Types\.Datasource\.User/);
    assert.match(summary, /public string DisplayName \{ get; set; \}/);
    assert.match(summary, /public string Email \{ get; set; \}/);
    assert.doesNotMatch(summary, /NickName/);
    assert.doesNotMatch(summary, /RoleId/);
  });

  it("extends the datasource type when inherit is a pass-through", async () => {
    const role = await bodyOf("Role.cs");
    assert.match(
      role,
      /public class Role : Backend\.Types\.Datasource\.Role/,
    );
  });
});
