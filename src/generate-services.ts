import { datasourceSettings } from "./common/datasource-settings.ts";
import { commentStyle, type CommentStyle } from "./common/doc-comment.ts";
import { fill } from "./common/fill.ts";
import type { GenerateContext, SettingsDict } from "./common/generate-context.ts";
import { content, type GenerateEntry } from "./common/generate-entry.ts";
import {
  csharpServiceNaming,
  type ServiceNaming,
} from "./common/naming.ts";
import {
  loadServices,
  type CustomServiceEntry,
  type ServiceCandidate,
} from "./common/parse-services.ts";
import { settingsStr } from "./common/settings.ts";
import { customStubTmpl, genericTmpl } from "./resources/services.ts";

type EmitOptions = {
  naming: ServiceNaming;
  style: CommentStyle;
};

const emitOptions = (settings: SettingsDict): EmitOptions => ({
  naming: csharpServiceNaming(settings),
  style: commentStyle(settingsStr(settings, "comments")),
});

const docFlags = (style: CommentStyle) => ({
  simpleDoc: style === "simple",
  descriptionDoc: style === "description",
});

const renderGeneric = (
  candidate: ServiceCandidate,
  opts: EmitOptions,
): GenerateEntry => {
  const className = opts.naming.serviceClassName(candidate.name);
  return content(
    opts.naming.filePath(candidate.name),
    fill(genericTmpl, {
      ...docFlags(opts.style),
      className,
      datasourceType: candidate.datasourceType ?? "standard",
    }),
  );
};

const renderCustom = (
  entry: CustomServiceEntry,
  opts: EmitOptions,
): GenerateEntry => {
  const className = entry.name;
  const interfaceName = `I${className}`;
  return content(
    opts.naming.customStubPath(entry.name),
    fill(customStubTmpl, {
      ...docFlags(opts.style),
      interfaceName,
      className,
    }),
  );
};

export const generate = async (
  ctx: GenerateContext,
): Promise<GenerateEntry[]> => {
  const opts = emitOptions(ctx.settings);
  const ds = datasourceSettings(ctx.settings);
  const { generics, customs } = await loadServices(ctx.reader, {
    idType: ds.idType,
    serviceClassName: opts.naming.serviceClassName,
  });
  return [
    ...generics.map((c) => renderGeneric(c, opts)),
    ...customs.map((c) => renderCustom(c, opts)),
  ];
};
