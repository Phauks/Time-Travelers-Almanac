import { error } from '@sveltejs/kit';
import { RULE_META } from '$lib/data';
import type { Rule } from '$lib/types';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

const RULES: Rule[] = ['fixed', 'mutable', 'branching'];

export const entries: EntryGenerator = () => RULES.map((rule) => ({ rule }));

export const load: PageLoad = ({ params }) => {
	if (!(params.rule in RULE_META)) throw error(404, `No rule called "${params.rule}".`);
	return { rule: params.rule as Rule };
};
