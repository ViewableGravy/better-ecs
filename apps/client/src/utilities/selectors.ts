import invariant from 'tiny-invariant';

/**
 * Gets an element by id and throws an error if it is not found.
 * @param id - The id of the element to get.
 * @returns The element with the specified id.
 * @throws Will throw an error if the element is not found.
 */
export const invariantById = (id: string) => {
    const element = document.getElementById(id);
    invariant(element, `Element with id ${id} not found`);
    return element;
}
