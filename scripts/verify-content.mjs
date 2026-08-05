export const contentScriptViolations = (content) => {
  const checks = [
    ['static ESM import', /(^|[;}]\s*)import\s*(?:["'{*]|[A-Za-z_$])/m],
    ['dynamic import', /\bimport\s*\(/],
    ['ESM export', /(^|[;}]\s*)export\s*(?:default\b|\{|\*|const\b|let\b|var\b|function\b|class\b)/m],
    ['local JavaScript dependency', /["'](?:\.\.?\/|\/)?[^"']+\.js(?:[?#][^"']*)?["']/i],
    ['remote JavaScript dependency', /https?:\/\/[^\s"']+\.js(?:[?#][^\s"']*)?/i]
  ];
  return checks.filter(([, pattern]) => pattern.test(content)).map(([label]) => label);
};
