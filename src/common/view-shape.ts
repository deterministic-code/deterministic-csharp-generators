import type {
  ShapedView,
  ViewField,
  ViewType,
} from "../specification-parser.ts";

export const inlinesParent = (view: ShapedView): boolean =>
  view.inherits !== null &&
  (view.enrichments.length > 0 || view.omit.length > 0);

/** Field list to emit: expanded when inlining, otherwise authored extras. */
export const emitViewFields = (
  view: ShapedView,
  expanded: ViewType | undefined,
): ViewField[] =>
  inlinesParent(view) && expanded?.kind === "shaped"
    ? expanded.fields
    : view.fields;
