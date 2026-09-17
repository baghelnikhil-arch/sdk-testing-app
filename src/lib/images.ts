/**
 * Builds image URLs for the placeholder photography used by the marketing pages
 * and the seed catalogue.
 *
 * One host, in one place, so pointing at a real CDN later is a single edit.
 * Product images imported from a spreadsheet do not come through here — those
 * are whatever URL the operator typed.
 */
const HOST = "https://images.unsplash.com";

export function img(id: string, width = 900, height = 1125) {
  return `${HOST}/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}
