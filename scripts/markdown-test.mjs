import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const directory=mkdtempSync(resolve('scripts/.markdown-test-'));
try {
 for(const name of ['code-content','quiz-markdown']) {
  const source=readFileSync('src/components/'+name+'.tsx','utf8').replace('"./code-content"','"./code-content.mjs"');
  writeFileSync(join(directory,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);
 }
 const {QuizMarkdown}=await import(pathToFileURL(join(directory,'quiz-markdown.mjs')));
 const html=renderToStaticMarkup(createElement(QuizMarkdown,{text:'**Warning:** Read carefully.\n\n### Quiz Rules\n\n1. **One attempt**\n2. Use `x`.\n\n- Stay focused\n\n<script>alert(1)</script>\n\n```python\nif True:\n    print(1)\n```'}));
 assert.match(html,/<strong>Warning:<\/strong>/);
 assert.match(html,/<h4>Quiz Rules<\/h4>/);
 assert.match(html,/<ol/);assert.match(html,/<ul/);
 assert.match(html,/<code>x<\/code>/);
 assert.ok(!html.includes('<script>'));
 assert.ok(html.includes('    print(1)'));
 console.log('Passed: bold, headings, ordered/bullet lists, inline code, Python indentation, and HTML escaping.');
} finally {
 if(!directory.startsWith(resolve('scripts')+sep))throw new Error('Unexpected test path');
 rmSync(directory,{recursive:true,force:true});
}
