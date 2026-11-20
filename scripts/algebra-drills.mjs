import { parseMarkup, renderMarkup } from "./content-markup.mjs";

const range = (first, last) => Array.from({ length: last - first + 1 }, (_, index) => first + index);
const signed = (n) => String(n).replace("-", "−");
const number = (n) => `<mn>${signed(n)}</mn>`;
const root = (radicand) => `<msqrt>${radicand}</msqrt>`;
const fraction = (top, bottom) => `<mfrac>${top}${bottom}</mfrac>`;
const product = (...factors) => `<mrow>${factors.join("<mo>·</mo>")}</mrow>`;
const x = "<mi>x</mi>";

function mathFact(markup, answer) {
  const { text, html } = renderMarkup(parseMarkup(`<math>${markup}</math>`, "algebra drill"));
  return { prompt: text, promptHtml: html, answer };
}

function multipleOfX(n) {
  if (n === 0) return "0";
  const coefficient = Math.abs(n) === 1 ? "" : Math.abs(n);
  return `${n < 0 ? "−" : ""}${coefficient}x`;
}

function cancelFactors() {
  const facts = range(1, 15).map((answer) =>
    mathFact(fraction(product(x, number(2 * answer)), number(2)), answer));
  const alternateFacts = range(2, 5).flatMap((divisor) => range(2, 8).map((factor) => {
    const multiplier = divisor - 1;
    const top = product(x, number(factor), number(divisor * multiplier));
    return mathFact(fraction(top, number(divisor)), factor * multiplier);
  }));
  return { column: "Выражение", answerLabel: multipleOfX, facts, alternateFacts };
}

function likeTerms() {
  const facts = range(2, 8).flatMap((left) => range(1, 6).flatMap((right) => [
    { prompt: `${multipleOfX(left)} + ${multipleOfX(right)}`, answer: left + right },
    { prompt: `${multipleOfX(left)} − ${multipleOfX(right)}`, answer: left - right },
  ]));
  const alternateFacts = range(2, 6).flatMap((a) => range(2, 7).flatMap((b) => [
    { prompt: `${a}x − x + ${b}x`, answer: a - 1 + b },
    { prompt: `${a}x − (x + ${b}x)`, answer: a - 1 - b },
  ]));
  return { column: "Выражение", answerLabel: multipleOfX, facts, alternateFacts };
}

function squareRoots() {
  const facts = range(0, 20).map((answer) => mathFact(root(number(answer ** 2)), answer));
  const alternateFacts = range(2, 5).flatMap((a) => range(2, 5).map((b) =>
    mathFact(root(product(number(a ** 2), number(b ** 2))), a * b)));
  return { column: "Корень", facts, alternateFacts };
}

function rootQuotients() {
  const facts = [];
  const alternateFacts = [];
  for (const divisor of range(2, 5)) {
    for (const answer of range(1, Math.floor(20 / divisor))) {
      const numerator = divisor * answer;
      facts.push(mathFact(fraction(root(number(numerator ** 2)), number(divisor)), answer));
      alternateFacts.push(mathFact(fraction(number(numerator), root(number(divisor ** 2))), answer));
    }
  }
  return { column: "Выражение", facts, alternateFacts };
}

function equations(twoSteps) {
  const facts = [];
  const alternateFacts = [];
  for (const factor of range(2, 6)) {
    for (const answer of range(-5, 10)) {
      if (twoSteps) {
        for (const offset of [factor - 1, -factor - 1]) {
          const sign = offset > 0 ? "+" : "−";
          const term = `${sign} ${Math.abs(offset)}`;
          facts.push({ prompt: `${factor}x ${term} = ${signed(factor * answer + offset)}`, answer });
          alternateFacts.push({ prompt: `${factor}(x ${term}) = ${signed(factor * (answer + offset))}`, answer });
        }
      } else {
        facts.push({ prompt: `${factor}x = ${signed(factor * answer)}`, answer });
        alternateFacts.push(
          { prompt: `x + ${factor} = ${signed(answer + factor)}`, answer },
          { prompt: `${signed(answer - factor)} = x − ${factor}`, answer },
        );
      }
    }
  }
  return { column: "Уравнение", equation: true, answerLabel: (n) => `x = ${signed(n)}`, facts, alternateFacts };
}

export function algebraContent(id, skill) {
  switch (skill) {
    case "cancel-factors": return cancelFactors();
    case "like-terms": return likeTerms();
    case "square-roots": return squareRoots();
    case "root-quotients": return rootQuotients();
    case "one-step": return equations(false);
    case "two-step": return equations(true);
    default: throw new Error(`${id}: unknown algebra drill ${skill}`);
  }
}
