/**
 * @description Programmatically add spaces to strings.
 */
export function space(spaces = 2) {
  let str = ``;

  for (let index = 0; index < spaces; index++) {
    str += ` `;
  }

  return str;
}
