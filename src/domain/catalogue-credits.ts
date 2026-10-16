import type { CatalogueSnapshot, Licence } from "./catalogue";

export type CatalogueLicenceCredit = Licence & {
  exerciseCount: number;
  mediaCount: number;
};

export type CatalogueCreditSummary = {
  exercises: number;
  media: number;
  exerciseContributors: number;
  mediaContributors: number;
  licences: CatalogueLicenceCredit[];
};

const contributorKey = (value: string) => value.trim().toLocaleLowerCase("en-GB");

export function summariseCatalogueCredits(snapshot: CatalogueSnapshot): CatalogueCreditSummary {
  const licences = new Map<string, CatalogueLicenceCredit>();
  const exerciseContributors = new Set<string>();
  const mediaContributors = new Set<string>();
  let media = 0;

  const creditFor = (licence: Licence) => {
    const key = licence.url || licence.id;
    const current = licences.get(key);
    if (current) return current;
    const created = { ...licence, exerciseCount: 0, mediaCount: 0 };
    licences.set(key, created);
    return created;
  };

  for (const exercise of snapshot.exercises) {
    creditFor(exercise.licence).exerciseCount += 1;
    if (exercise.author.trim()) exerciseContributors.add(contributorKey(exercise.author));

    for (const item of exercise.media) {
      media += 1;
      creditFor(item.licence).mediaCount += 1;
      if (item.author.trim()) mediaContributors.add(contributorKey(item.author));
    }
  }

  return {
    exercises: snapshot.exercises.length,
    media,
    exerciseContributors: exerciseContributors.size,
    mediaContributors: mediaContributors.size,
    licences: [...licences.values()].sort(
      (a, b) => b.exerciseCount + b.mediaCount - (a.exerciseCount + a.mediaCount),
    ),
  };
}
