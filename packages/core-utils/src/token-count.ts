const wordLikeSegmentPattern = /[\p{L}\p{N}_]+(?:['-][\p{L}\p{N}_]+)*/gu;

export function countApproximateTokens(input: string): number {
  const matches = input.match(wordLikeSegmentPattern);

  if (matches == null) {
    return 0;
  }

  return Math.ceil(matches.length * 1.3);
}
