export default [{
  rules: {
    'no-restricted-syntax': ['error', { selector: "Property[key.name='dangerouslyAllowBrowser']", message: 'Keep AI keys on the server.' }],
  },
}];
