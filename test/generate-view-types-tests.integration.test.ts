import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryReader } from "@deterministic-code/generators-common/deterministic-reader";
import {
  DATASOURCE_TYPES_YAML,
  VIEW_TYPES_YAML,
} from "../src/specification-parser.ts";
import type { GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { generate } from "../src/generate-view-types-tests.ts";

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
            is_unique: true
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
        - paid_at:
            type: datetime
        - count:
            type: number
        - rank:
            type: integer
        - small_rank:
            type: smallinteger
        - big_rank:
            type: biginteger
        - score:
            type: float
        - active:
            type: boolean
        - token:
            type: uuid
        - avatar:
            type: binary
        - initial:
            type: character
        - ref_id:
            type: reference
        - tags:
            type: datasource_types.tag[]
        - owner:
            type: user_summary
        - note:
            type: string
            is_nullable: true
        - flags:
            type: boolean[]
  - cash_payment:
      fields:
        - amount:
            type: decimal
  - empty_view:
      fields: []
  - empty_union:
      one_of: []
`;

const SIMPLE_VIEW_YAML = `types:
  - card_payment:
      fields:
        - amount:
            type: decimal
        - paid_at:
            type: datetime
`;

const fixtureReader = (
  viewYaml: string = VIEW_YAML,
  dsYaml: string | undefined = DS_YAML,
) =>
  memoryReader({
    [VIEW_TYPES_YAML]: viewYaml,
    ...(dsYaml === undefined ? {} : { [DATASOURCE_TYPES_YAML]: dsYaml }),
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

describe("generate view types tests", () => {
  const generateWith = (
    settings: Record<string, string> = {},
    viewYaml?: string,
    dsYaml?: string,
  ) =>
    generate({
      reader: fixtureReader(viewYaml, dsYaml),
      settings,
    });

  const bodyOf = async (
    suffix: string,
    settings: Record<string, string> = {},
    viewYaml?: string,
    dsYaml?: string,
  ) => {
    const map = indexEntries(await generateWith(settings, viewYaml, dsYaml));
    const file = [...map.keys()].find((name) => name.endsWith(suffix));
    assert.ok(file, `missing ${suffix} generate entry`);
    return entryBody(requireEntry(map, file));
  };

  it("rejects a missing view_types.yaml", async () => {
    await assert.rejects(
      () =>
        generate({
          reader: memoryReader({}),
          settings: {},
        }),
      /missing view_types\.yaml/,
    );
  });

  it("rejects a datasource_types include without datasource_types.yaml", async () => {
    await assert.rejects(
      () =>
        generate({
          reader: memoryReader({
            [VIEW_TYPES_YAML]: `includes:
  - datasource_types:
      include: "*"
types: []
`,
          }),
          settings: {},
        }),
      /no datasource_types\.yaml was provided/,
    );
  });

  it("emits one test file per expanded view", async () => {
    const byName = indexEntries(await generateWith({}));
    assert.deepEqual(
      [...byName.keys()].sort(),
      [
        "CardPaymentTests.cs",
        "CashPaymentTests.cs",
        "EmptyUnionTests.cs",
        "EmptyViewTests.cs",
        "PaymentTests.cs",
        "RoleTests.cs",
        "TagTests.cs",
        "UpdateTagTests.cs",
        "UpdateUserSummaryTests.cs",
        "UpdateUserTests.cs",
        "UserSummaryTests.cs",
        "UserTests.cs",
      ],
    );
  });

  it("renders primitive, array, nested, and nullable accessor cases", async () => {
    const card = await bodyOf("CardPaymentTests.cs");
    assert.match(card, /schema-version: 1\.0/);
    assert.match(card, /using Backend\.Types\.View;/);
    assert.match(card, /using System\.Collections\.Generic;/);
    assert.match(card, /private static CardPayment Sample\(\) => new CardPayment/);
    assert.match(card, /Amount = "0"/);
    assert.match(
      card,
      /PaidAt = System\.DateTime\.Parse\("2024-01-01T00:00:00.000Z"\)/,
    );
    assert.match(card, /Count = 1L/);
    assert.match(card, /SmallRank = \(short\)1/);
    assert.match(card, /Score = 1\.0/);
    assert.match(card, /Active = false/);
    assert.match(card, /Token = "00000000-0000-0000-0000-000000000000"/);
    assert.match(card, /Avatar = new byte\[\] \{ \}/);
    assert.match(card, /Tags = new List<Tag> \{ new Tag\(\) \}/);
    assert.match(card, /Owner = new UserSummary\(\)/);
    assert.match(card, /Flags = new List<bool> \{ false \}/);
    assert.match(card, /public void GetsNote\(/);
    assert.match(card, /public void AllowsSettingNoteToNull\(/);
    assert.doesNotMatch(card, /public void AllowsSettingAmountToNull\(/);
  });

  it("renders a union view with member constructors", async () => {
    const payment = await bodyOf("PaymentTests.cs");
    assert.match(payment, /public void AcceptsCardPaymentMember\(/);
    assert.match(payment, /public void AcceptsCashPaymentMember\(/);
    assert.match(payment, /var value = new CardPayment\(\);/);
  });

  it("renders declared fields on an inherited view and empty views", async () => {
    const summary = await bodyOf("UserSummaryTests.cs");
    assert.match(summary, /public void GetsDisplayName\(/);
    assert.match(summary, /public void GetsRoleName\(/);
    assert.match(summary, /public void GetsEmail\(/);
    const empty = await bodyOf("EmptyViewTests.cs");
    assert.match(empty, /private static EmptyView Sample\(\) => new EmptyView/);
    assert.doesNotMatch(empty, /public void Gets/);
    const union = await bodyOf("EmptyUnionTests.cs");
    assert.doesNotMatch(union, /public void Accepts/);
  });

  it("omits the List import when a view has no array fields", async () => {
    const cash = await bodyOf("CashPaymentTests.cs");
    assert.doesNotMatch(cash, /using System\.Collections\.Generic;/);
  });

  it("writes codegen.schema_version into the file header", async () => {
    const card = await bodyOf("CardPaymentTests.cs", {
      "codegen.schema_version": "9.9",
    });
    assert.match(card, /schema-version: 9.9/);
  });

});
