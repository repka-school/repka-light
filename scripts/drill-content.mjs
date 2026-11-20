/** Pick examples across the range of the lesson, keeping the published pool compact. */
function spread(facts, count) {
  if (facts.length <= count) return facts;
  return Array.from({ length: count }, (_, index) => facts[Math.round(index * (facts.length - 1) / (count - 1))]);
}

function additionPairs(limit, regroup) {
  const lower = limit === 10 ? 0 : limit === 20 ? 10 : 20;
  const smallestLeft = limit === 100 ? 10 : 1;
  const smallestRight = limit === 10 ? 0 : smallestLeft;
  const largestOperand = limit === 100 ? limit - smallestLeft : 10;
  const pairs = [];
  for (let left = smallestLeft; left <= largestOperand; left++) {
    for (let right = smallestRight; right <= Math.min(largestOperand, limit - left); right++) {
      const sum = left + right;
      if (sum <= lower) continue;
      const carries = left % 10 + right % 10 >= 10;
      if (limit === 100 && (carries !== regroup || (!regroup && sum === 100))) continue;
      pairs.push({ left, right, sum });
    }
  }
  return spread(pairs, 72);
}

function additiveContent(operation, limit, regroup) {
  const pairs = additionPairs(limit, regroup);
  const addition = () => pairs.map(({ left, right, sum }) => ({ prompt: `${left} + ${right}`, answer: sum }));
  const subtraction = () => pairs.map(({ left, right, sum }) => ({ prompt: `${sum} − ${left}`, answer: right }));
  if (operation === "mixed") {
    const facts = addition();
    const alternateFacts = subtraction();
    const subtractExamples = spread(alternateFacts, 4);
    const examples = spread(facts, 4).flatMap((fact, index) => [fact, subtractExamples[index]]);
    return { column: "Пример", facts, alternateFacts, examples };
  }
  const facts = operation === "add" ? addition() : subtraction();
  return { column: operation === "add" ? "Сложение" : "Вычитание", facts, examples: spread(facts, 8) };
}

const tableOfTen = (fact) => Array.from({ length: 10 }, (_, index) => fact(index + 1));
const tableNumber = (value) => Number.isInteger(value) && value >= 2 && value <= 10;

function drillContent(id, drill) {
  const { factor, divisor, squares, operation, limit, regroup } = drill;
  const keys = Object.keys(drill);
  if (keys.length === 1) {
    if (tableNumber(factor)) return { column: "Умножение", facts: tableOfTen((n) => ({ prompt: `${factor} × ${n}`, answer: factor * n })) };
    if (tableNumber(divisor)) return { column: "Деление", facts: tableOfTen((n) => ({ prompt: `${divisor * n} ÷ ${divisor}`, answer: n })) };
    if (squares === true) {
      const facts = Array.from({ length: 20 }, (_, index) => {
        const n = index + 1;
        return { prompt: `${n}²`, answer: n * n };
      });
      return { column: "Квадрат", facts };
    }
  }
  const additive = ["add", "subtract", "mixed"].includes(operation);
  const basic = (limit === 10 || limit === 20) && keys.length === 2;
  const advanced = limit === 100 && typeof regroup === "boolean" && keys.length === 3;
  if (additive && (basic || advanced)) return additiveContent(operation, limit, regroup);
  throw new Error(`${id}: expected a factor or divisor from 2 to 10, squares: true, or an addition/subtraction drill with a supported limit`);
}

export function drillCards(id, title, drill) {
  const { column, facts, alternateFacts, examples = facts } = drillContent(id, drill);
  const rows = examples.map(({ prompt, answer }) => `<tr><th scope="row">${prompt}</th><td>${answer}</td></tr>`).join("");
  const body = `<table><thead><tr><th scope="col">${column}</th><th scope="col">Результат</th></tr></thead><tbody>${rows}</tbody></table>`;
  return [
    { kind: "theory", id: `${id}/table`, title, body, blocks: [] },
    { kind: "drill", id: `${id}/game`, facts, ...(alternateFacts ? { alternateFacts } : {}) },
  ];
}
