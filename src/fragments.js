/**
 * Generates a list fragment
 */
const listFragmentWrapper = (field: string, args: string, fragment: string): string =>
`${field} ${args} {
  ${fragment}
}`;

/**
 * Generates a connection fragment
 */
const connectionFragmentWrapper = (field: string, args: string, fragment: string): string =>
`${field} ${args} {
  edges {
    node {
      ${fragment}
    }
  }
}`;

/**
 * Generates an object fragment
 */
const objectFragmentWrapper = (field: string, args: string, fragment: string): string =>
`${field} ${args} {
  ${fragment}
}`;

export {
  listFragmentWrapper,
  objectFragmentWrapper,
  connectionFragmentWrapper,
};
