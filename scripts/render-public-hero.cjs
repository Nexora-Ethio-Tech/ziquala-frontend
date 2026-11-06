// Render the same small React hero components at build time, without a browser,
// router, API, or runtime translation catalogue. Only public copy is exposed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const aliases = require('../src/locales/public.sources.json');
const component = ts.transpileModule(fs.readFileSync(path.join(root, 'src/pages/PublicHeroes.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
module.exports = function renderHero(pathname, imageUrl, logoUrl) {
  const heroes = ['en', 'am', 'om'].map(language => {
    const copy = require(`../src/locales/public.${language}.json`);
    const text = value => {
      if (typeof value !== 'string') return value;
      const key = value.trim();
      const read = key => key.split('.').reduce((v, part) => v?.[part], copy);
      const translated = read(key) || read(aliases[key] || '') || value;
      return (value.match(/^\s*/)?.[0] || '') + translated + (value.match(/\s*$/)?.[0] || '');
    };
    const exports = {};
    vm.runInNewContext(component, { exports, require: id => {
      if (id === 'react-i18next') return { useTranslation: () => ({}) };
      if (id === '../publicLocalization') return { publicText: text };
      if (id === 'react-router-dom') return { Link: ({ to, children, ...props }) => React.createElement('a', { ...props, href: to }, children) };
      if (id.endsWith('school-building.webp')) return imageUrl;
      if (id.endsWith('school-logo.webp')) return logoUrl;
      return require(id);
    } });
    const Hero = pathname === '/school' ? exports.SchoolHero : exports.HomeHero;
    return `<div data-hero-language="${language}" lang="${language}">${renderToStaticMarkup(React.createElement(Hero))}</div>`;
  });
  // Bootstrap selects the saved language before the stylesheet and hero paint.
  const css = '<style>[data-hero-language]{display:none}html:not([data-lang]) [data-hero-language="en"],html[data-lang="en"] [data-hero-language="en"],html[data-lang="am"] [data-hero-language="am"],html[data-lang="om"] [data-hero-language="om"]{display:block}</style>';
  return `${css}<div class="public-site min-h-screen bg-brand-canvas"><div class="h-[4.75rem]"></div>${heroes.join('')}</div>`;
};
