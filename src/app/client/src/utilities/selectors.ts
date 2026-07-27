import invariant from "tiny-invariant";

export function invariantById<ElementType extends HTMLElement = HTMLElement>(id: string): ElementType {
  const element = document.getElementById(id);
  invariant(element, `Element #${id} was not found.`);

  // The caller owns the element id and supplies its corresponding concrete DOM type.
  return element as ElementType;
}
