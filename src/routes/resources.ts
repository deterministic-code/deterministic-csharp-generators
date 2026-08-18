import { readFile } from "node:fs/promises";

const resource = (rel: string): Promise<string> =>
  readFile(
    new URL(`../templates/create-routes/${rel}`, import.meta.url),
    "utf8",
  );

export const [routerTmpl, customStubTmpl, nameEnrichmentTmpl] =
  await Promise.all([
    resource("router.cs.tmpl"),
    resource("custom-stub.cs.tmpl"),
    resource("name-enrichment.cs.tmpl"),
  ]);
