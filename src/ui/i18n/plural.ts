export function plural(n: number, forms: readonly [one: string, few: string, many: string]): string {
  const abs = Math.abs(Math.trunc(n));
  const tens = abs % 100;
  const ones = abs % 10;
  if (tens >= 11 && tens <= 19) return forms[2];
  if (ones === 1) return forms[0];
  if (ones >= 2 && ones <= 4) return forms[1];
  return forms[2];
}

export const count = (n: number, forms: readonly [string, string, string]) => `${n} ${plural(n, forms)}`;

export const formatGrade = (grade: string | number) => `${String(grade).replace("-", "–")} класс`;

export const formatYear = (year: number) => `${year} год`;
