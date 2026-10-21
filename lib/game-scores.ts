export type IndividualGameScore = {
  home: number;
  away: number;
};

export function gameScoresMatch(
  left: IndividualGameScore[] | null | undefined,
  right: IndividualGameScore[] | null | undefined
) {
  if (left == null || right == null) {
    return left == null && right == null;
  }

  if (left.length !== right.length) {
    return false;
  }

  const sortScores = (scores: IndividualGameScore[]) =>
    scores
      .map((score) => ({ home: Number(score.home), away: Number(score.away) }))
      .sort((first, second) => first.home - second.home || first.away - second.away);
  const sortedLeft = sortScores(left);
  const sortedRight = sortScores(right);

  return sortedLeft.every(
    (score, index) =>
      score.home === sortedRight[index].home && score.away === sortedRight[index].away
  );
}
