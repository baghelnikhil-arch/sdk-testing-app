/**
 * Central image helper.
 *
 * Every product image goes through here, so swapping the placeholder host for a
 * real CDN later is a one-line change.
 */
const HOST = "https://images.unsplash.com";

export function img(id: string, width = 900, height = 1125) {
  return `${HOST}/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}
