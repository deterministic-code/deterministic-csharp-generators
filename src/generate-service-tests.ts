import { fill } from "@deterministic-code/generators-common/fill";
import type { GenerateContext } from "@deterministic-code/generators-common/generate-context";
import { content, type GenerateEntry } from "@deterministic-code/generators-common/generate-entry";
import { servicePaths } from "./common/paths.ts";
import {
  SpecificationParser,
} from "./specification-parser.ts";
import { genericTmpl } from "./resources/service-tests.ts";

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const naming = servicePaths(ctx.settings);
  const { generics } = await new SpecificationParser(ctx.reader).loadServices({
    idType: ctx.settings["datasource.id_type"] ?? "integer",
    serviceClassName: naming.serviceClassName,
  });
  return generics.map((c) =>
    content(
      `${naming.casedFileStem(`${c.name}_service_tests`)}.cs`,
      fill(genericTmpl, {
        testClass: naming.serviceClassName(c.name).replace(
          /Service$/,
          "ServiceTests",
        ),
      }),
    ),
  );
};
