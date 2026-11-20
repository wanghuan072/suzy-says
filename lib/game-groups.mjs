/** @param {import('../types/game').Game[]} records */
export function newestFirst(records) {
  return [...records].sort(
    (a, b) =>
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") ||
      a.id.localeCompare(b.id),
  );
}
/** @param {import('../types/game').Game[]} records */
export function homepageGroups(records) {
  const all = records.filter((game) => game.status === "published");
  const select = (key) => all.filter((game) => game.flags[key]);
  const groups = {
    recommended: select("isRecommendedHome"),
    featured: select("isFeaturedHome"),
    fresh: newestFirst(select("isNewHome")),
  };
  if (
    groups.recommended.length !== 6 ||
    groups.featured.length < 6 ||
    groups.featured.length > 8 ||
    groups.fresh.length < 6 ||
    groups.fresh.length > 8
  )
    throw Error("Invalid homepage group membership");
  return groups;
}
/** @param {import('../types/game').Game[]} records @param {import('../types/game').Game} current @param {string} mainId */
export function gameGroups(records, current, mainId) {
  if (current.id === mainId) return homepageGroups(records);
  const all = records.filter(
    (game) => game.status === "published" && game.id !== current.id,
  );
  if (all.length < 6) throw Error("Six distinct peer games required");
  const stable = [...all].sort((a, b) => a.id.localeCompare(b.id));
  const used = new Set();
  const take = (preference) => {
    const ordered = [
      ...preference.filter((game) => !used.has(game.id)),
      ...preference.filter((game) => used.has(game.id)),
    ].slice(0, 6);
    ordered.forEach((game) => used.add(game.id));
    return ordered;
  };
  const related = current.relatedGameIds
    .map((id) => stable.find((game) => game.id === id))
    .filter(Boolean);
  const recommendationOrder = [
    ...related,
    ...stable.filter((game) => !related.some((peer) => peer.id === game.id)),
  ].sort((a, b) => {
    const ai = current.relatedGameIds.indexOf(a.id),
      bi = current.relatedGameIds.indexOf(b.id);
    return (
      (ai >= 0 ? ai : 100 + (a.flags.isRecommendedHome ? 0 : 1)) -
      (bi >= 0 ? bi : 100 + (b.flags.isRecommendedHome ? 0 : 1))
    );
  });
  const recommended = take(recommendationOrder);
  const featured = take([
    ...stable.filter((game) => game.flags.isFeaturedHome),
    ...stable.filter((game) => !game.flags.isFeaturedHome),
  ]);
  const fresh = newestFirst(take(newestFirst(all)));
  return { recommended, featured, fresh };
}
