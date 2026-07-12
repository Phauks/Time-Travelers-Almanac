import { error } from '@sveltejs/kit';
import { getSpecimen, specimens } from '$lib/data';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => specimens.map((s) => ({ slug: s.slug }));

export const load: PageLoad = ({ params }) => {
	const specimen = getSpecimen(params.slug);
	if (!specimen) throw error(404, `No specimen catalogued under "${params.slug}".`);
	return { specimen };
};
