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

  return (
    left.length === right.length &&
    left.every(
      (score, index) =>
        Number(score.home) === Number(right[index]?.home) &&
        Number(score.away) === Number(right[index]?.away)
    )
  );
}
