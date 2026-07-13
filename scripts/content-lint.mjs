#!/usr/bin/env node
/**
 * Modular content gate. Fails the build if banned text patterns appear in the
 * project's source/content. Add a rule to RULES to ban something new.
 *
 * Usage:
 *   node scripts/content-lint.mjs         check (exit 1 on any violation)
 *   node scripts/content-lint.mjs --fix   rewrite files, applying each rule's fix
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// ---- config -------------------------------------------------------------
const ROOTS = ['src']; // directories scanned, relative to repo root
const EXTENSIONS = new Set(['.ts', '.js', '.svelte', '.html', '.css', '.md']);

// Each rule: id, human message, a global RegExp, and a `fix` replacement used
// by --fix. Keep replacements ASCII-safe. This array is the whole gate.
const RULES = [
	{
		id: 'no-em-dash',
		message: 'Em dash (U+2014) is banned. Use " - " or rephrase.',
		regex: /—/g,
		fix: ' - '
	},
	{
		id: 'no-en-dash',
		message: 'En dash (U+2013) is banned. Use "-" or "to".',
		regex: /–/g,
		fix: '-'
	}
	// Add more rules here, e.g. smart quotes, non-breaking spaces, banned words.
];

// ---- walk ---------------------------------------------------------------
function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const s = statSync(p);
		if (s.isDirectory()) {
			if (['node_modules', '.svelte-kit', 'build', '.git'].includes(name)) continue;
			walk(p, out);
		} else if (EXTENSIONS.has(extname(name))) {
			out.push(p);
		}
	}
	return out;
}

function lineCol(content, index) {
	const before = content.slice(0, index);
	const line = before.split('\n').length;
	const col = index - before.lastIndexOf('\n');
	return { line, col };
}

// ---- run ----------------------------------------------------------------
const fix = process.argv.includes('--fix');
const files = ROOTS.flatMap((r) => {
	try {
		return walk(r);
	} catch {
		return [];
	}
});

let violations = 0;
let fixedFiles = 0;

for (const file of files) {
	let content = readFileSync(file, 'utf8');
	let updated = content;

	for (const rule of RULES) {
		if (fix) {
			updated = updated.replace(rule.regex, rule.fix);
		} else {
			for (const m of content.matchAll(rule.regex)) {
				const { line, col } = lineCol(content, m.index);
				console.error(`${file}:${line}:${col}  [${rule.id}]  ${rule.message}`);
				violations++;
			}
		}
	}

	if (fix && updated !== content) {
		writeFileSync(file, updated);
		fixedFiles++;
		console.log(`fixed  ${file}`);
	}
}

if (fix) {
	console.log(`\ncontent-lint --fix: updated ${fixedFiles} file(s).`);
	process.exit(0);
}

if (violations > 0) {
	console.error(`\ncontent-lint: ${violations} violation(s). Run "pnpm lint:content:fix" to auto-fix.`);
	process.exit(1);
}
console.log(`content-lint: clean (${files.length} files, ${RULES.length} rules).`);
