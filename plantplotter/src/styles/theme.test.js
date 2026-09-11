import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const stylesheetPath = resolve('src/styles/globals.css');
const frontendPath = resolve('.');
let compiled;

beforeAll(async () => {
  const stylesheet = await readFile(stylesheetPath, 'utf8');
  compiled = await postcss([
    tailwindcss({ base: frontendPath, optimize: { minify: false } })
  ]).process(stylesheet, { from: stylesheetPath });
});

afterEach(() => {
  document.documentElement.classList.remove('dark');
  document.body.replaceChildren();
});

describe('application theme activation', () => {
  it('does not generate styles driven by the operating system color scheme', () => {
    const systemThemeQueries = [];
    compiled.root.walkAtRules('media', (rule) => {
      if (rule.params.includes('prefers-color-scheme')) {
        systemThemeQueries.push(rule.params);
      }
    });

    expect(systemThemeQueries).toEqual([]);
  });

  it.each(['bg-gray-800', 'text-white'])(
    'keeps dark:%s dormant until the root explicitly enables dark mode',
    (utility) => {
      const selectors = [];
      compiled.root.walkRules((rule) => {
        if (rule.selector.includes(`.dark\\:${utility}`)) {
          selectors.push(rule.selector);
        }
      });
      expect(selectors.length).toBeGreaterThan(0);

      const wrapper = document.createElement('div');
      const panel = document.createElement('div');
      panel.className = `dark:${utility}`;
      wrapper.append(panel);
      document.body.append(wrapper);
      const matchesDarkUtility = () => selectors.some((selector) => panel.matches(selector));

      expect(matchesDarkUtility()).toBe(false);
      wrapper.className = 'dark';
      expect(matchesDarkUtility()).toBe(false);
      document.documentElement.classList.add('dark');
      expect(matchesDarkUtility()).toBe(true);
      document.documentElement.classList.remove('dark');
      expect(matchesDarkUtility()).toBe(false);
    }
  );
});
