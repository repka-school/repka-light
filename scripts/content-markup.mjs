import { defaultTreeAdapter, html, parseFragment } from "parse5";

const { NS } = html;

const htmlTags = new Set("p div span br strong b em i u s sub sup ul ol li table thead tbody tfoot tr th td caption blockquote hr img".split(" "));
const droppedTags = new Set("script style iframe frame frameset object embed svg form input button textarea select link meta base template noscript".split(" "));
export const leafTags = new Set(["p", "div", "li", "td"]);
export const attr = (node, name) => node.attrs?.find((attribute) => !attribute.namespace && attribute.name === name)?.value;
const isHtml = (node, name) => node?.namespaceURI === NS.HTML && node.tagName === name;
export const isMath = (node) => node.namespaceURI === NS.MATHML;
export const discardHtml = (node) => !!node.tagName && !isMath(node) && (node.namespaceURI !== NS.HTML || droppedTags.has(node.tagName));
export const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const match = (pattern) => (value) => pattern.test(value) ? value : "";
const oneOf = (...values) => (value) => values.includes(value) ? value : "";
const listOf = (...values) => (value) => {
  const words = value.split(/\s+/);
  return words.every((word) => values.includes(word)) ? words.join(" ") : "";
};
const span = (value) => /^[+-]?\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 100 ? String(Number(value)) : "";
const length = match(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|px|%)?$/);
const bool = oneOf("true", "false");
const grouping = { displaystyle: bool, scriptlevel: match(/^[+-]?\d+$/) };
const sizes = { width: length, height: length, depth: length };
const accents = { accent: bool, accentunder: bool };
const align = { columnalign: listOf("left", "center", "right"), rowalign: listOf("top", "bottom", "center", "baseline", "axis") };
const lines = ["none", "solid", "dashed"];

// Repka's content/item-schema, “Mathematics in a body”. Every emitted attribute
// comes from this table or is computed by the renderer for a formula's layout.
const mathTags = new Map(Object.entries({
  math: { display: oneOf("block", "inline") },
  mrow: grouping, mstyle: grouping, mphantom: grouping,
  mpadded: { ...grouping, ...sizes, lspace: length, voffset: length },
  mi: { mathvariant: oneOf("normal") }, mn: {}, mtext: {}, mspace: sizes,
  mo: { form: oneOf("prefix", "infix", "postfix"), fence: bool, separator: bool, stretchy: bool, symmetric: bool,
    largeop: bool, movablelimits: bool, accent: bool, lspace: length, rspace: length, minsize: length, maxsize: length },
  mfrac: { linethickness: length }, msqrt: {}, mroot: {},
  msub: {}, msup: {}, msubsup: {}, munder: accents, mover: accents, munderover: accents, mmultiscripts: {}, mprescripts: {},
  mtable: { ...align, columnlines: listOf(...lines), rowlines: listOf(...lines), frame: oneOf(...lines) },
  mtr: align, mtd: { columnspan: span, rowspan: span, ...align },
  semantics: {}, annotation: { encoding: oneOf("application/x-tex") },
}));
const otherMathTags = new Set("annotation-xml maction maligngroup malignmark menclose merror mfenced mglyph mlabeledtr mlongdiv ms mscarries mscarry msgroup msline mstack msrow".split(" "));

export function parseMarkup(source, where, imported = false) {
  const context = defaultTreeAdapter.createElement("div", NS.HTML, []);
  const root = parseFragment(context, source, {
    sourceCodeLocationInfo: true,
    onParseError({ code }) {
      if (imported) return;
      if (["eof-before-tag-name", "eof-in-tag"].includes(code)) {
        throw new Error(`${where}: a stray "<" in markup`);
      }
      if (code === "duplicate-attribute") throw new Error(`${where}: duplicate attribute in markup`);
    },
  });
  // MathML's HTML integration points can move an HTML element outside the
  // formula during parsing. Require explicit roots so such markup fails too.
  const check = (node, inMath = false) => {
    const tag = node.tagName;
    if (inMath || isMath(node)) {
      const isRoot = tag === "math";
      if (!isMath(node) || !mathTags.has(tag) || (inMath && isRoot)) throw new Error(`${where}: <${tag}> is not allowed in MathML`);
      const location = node.sourceCodeLocation;
      if (isRoot && !location?.endTag && !source.slice(location?.startOffset, location?.endOffset).endsWith("/>")) {
        throw new Error(`${where}: <math> must close inside its formula`);
      }
      mathAttributes(node, where);
      if (tag === "annotation" && node.childNodes.some((child) => child.tagName)) throw new Error(`${where}: <annotation> holds only text`);
    } else if (mathTags.has(tag) || otherMathTags.has(tag)) {
      throw new Error(`${where}: <${tag}> is formula markup outside <math>`);
    }
    for (const child of node.childNodes ?? []) {
      if (child.tagName) check(child, inMath || isMath(node));
    }
  };
  check(root);
  return root.childNodes;
}

function mathAttributes(node, where) {
  const rules = mathTags.get(node.tagName);
  const attributes = {};
  for (const { namespace, name, value } of node.attrs) {
    if (namespace || !Object.hasOwn(rules, name)) throw new Error(`${where}: attribute ${name} is not allowed on <${node.tagName}>`);
    const normalized = rules[name](value.trim());
    if (!normalized) throw new Error(`${where}: invalid ${name} on <${node.tagName}>`);
    attributes[name] = normalized;
  }
  if (node.tagName === "annotation" && !attributes.encoding) throw new Error(`${where}: <annotation> requires encoding="application/x-tex"`);
  return attributes;
}

const element = (tag, attributes, content) => {
  const attrs = Object.entries(attributes).map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join("");
  return `<${tag}${attrs}>${content}</${tag}>`;
};

const formulaSigns = { mfrac: ["/"], msub: ["_"], msup: ["^"], msubsup: ["_", "^"] };
const tokenTags = new Set(["mi", "mn", "mo", "mtext"]);
const pick = (value, index) => {
  const words = value?.split(" ") ?? [];
  return words[Math.min(index, words.length - 1)];
};

function cellAttributes(attributes, { table, row, rowIndex, column }) {
  const { columnspan, rowspan, columnalign, rowalign } = attributes;
  const horizontal = pick(columnalign, 0) ?? pick(row.columnalign, column) ?? pick(table.columnalign, column);
  const vertical = pick(rowalign, 0) ?? pick(row.rowalign, 0) ?? pick(table.rowalign, rowIndex);
  const left = pick(table.columnlines, column - 1);
  const top = pick(table.rowlines, rowIndex - 1);
  const borders = [left && left !== "none" && `ml-l-${left}`, top && top !== "none" && `ml-t-${top}`].filter(Boolean);
  return Object.fromEntries(Object.entries({ columnspan, rowspan, columnalign: horizontal, rowalign: vertical, class: borders.join(" ") }).filter(([, value]) => value));
}

function renderMath(node, where, tile, position) {
  if (!node.tagName) {
    const value = node.value ?? "";
    return { html: escapeHtml(value), text: value.trim(), tokens: 0 };
  }
  const tag = node.tagName;
  let attributes = mathAttributes(node, where);
  if (tile && tag === "math") delete attributes.display;
  if (tag === "mtd" && position) attributes = cellAttributes(attributes, position);

  let children = node.childNodes;
  if (tag === "semantics") {
    const formula = children.find((child) => child.tagName && child.tagName !== "annotation");
    children = children.filter((child) => !child.tagName || child === formula || child.tagName === "annotation");
  }
  let rowIndex = 0;
  let column = 0;
  const parts = children.map((child) => {
    let at;
    if (tag === "mtable" && child.tagName === "mtr") at = { table: attributes, rowIndex: rowIndex++ };
    if (tag === "mtr" && position && child.tagName === "mtd") {
      at = { ...position, row: attributes, column };
      column += Number(attr(child, "columnspan") ?? 1);
    }
    return renderMath(child, where, tile, at);
  });
  const operands = parts.filter((_, index) => children[index].tagName && children[index].tagName !== "annotation");
  const markup = element(tag, attributes, parts.map((part) => part.html).join(""));
  let text = parts.map((part) => part.text).join("");
  let tokens = parts.reduce((count, part) => count + part.tokens, 0);
  if (tokenTags.has(tag)) tokens = 1;
  if (tag === "mphantom" || tag === "annotation") return { html: markup, text: "", tokens: 0 };
  if (Object.hasOwn(formulaSigns, tag)) {
    const signs = formulaSigns[tag];
    text = operands.map((part, index) => (index ? signs[Math.min(index - 1, signs.length - 1)] : "") + (part.tokens > 1 ? `(${part.text})` : part.text)).join("");
  }
  if (tag === "msqrt") text = `√(${text})`;
  if (tag === "mroot") text = operands.length >= 2 ? `√[${operands[1].text}](${operands[0].text})` : `√(${text})`;
  if (tag === "mtable" || tag === "mtr") text = operands.map((part) => part.text).join("; ");
  return { html: markup, text, tokens };
}

function isWrapper(node, tag, className, childTag) {
  if (!isHtml(node, tag) || node.attrs.length !== 1 || attr(node, "class") !== className) return false;
  const children = node.childNodes.filter((child) => child.tagName);
  return children.length === 1 && children[0].tagName === childTag;
}

export function renderMarkup(nodes, { where, renderImage, tile = false } = {}) {
  const text = [];
  const render = (node, inTable = false) => {
    if (node.nodeName === "#text") {
      text.push(node.value);
      return escapeHtml(node.value);
    }
    if (node.nodeName === "#comment") return "";
    const tag = node.tagName;
    if (discardHtml(node)) return "";
    if (isMath(node)) {
      const formula = renderMath(node, where, tile);
      text.push(formula.text);
      return (!tile && attr(node, "display")?.trim() === "block") || isWrapper(node.parentNode, "span", "formula", "math")
        ? formula.html : `<span class="formula">${formula.html}</span>`;
    }
    if (!htmlTags.has(tag)) return node.childNodes.map((child) => render(child, inTable)).join("");
    if (tag === "img") {
      if (!renderImage) throw new Error(`${where}: tag <img> is not allowed`);
      if (!attr(node, "src")) throw new Error(`${where}: expected an image with src and optional alt`);
      return renderImage(attr(node, "src"), attr(node, "alt"));
    }
    const attributes = {};
    const framed = !inTable && isWrapper(node, "div", "scroll-frame", "table");
    for (const { name, value, namespace } of node.attrs) {
      if (!namespace && name === "class" && (framed || isWrapper(node, "span", "formula", "math"))) attributes.class = value;
      else if (!namespace && (tag === "td" || tag === "th") && (name === "colspan" || name === "rowspan") && span(value.trim())) attributes[name] = span(value.trim());
    }
    if (tag === "br" || tag === "hr") {
      text.push(" ");
      return `<${tag}>`;
    }
    const inner = node.childNodes.map((child) => render(child, inTable || tag === "table")).join("");
    if (leafTags.has(tag)) text.push(" ");
    const markup = element(tag, attributes, inner);
    return tag === "table" && !inTable && !isWrapper(node.parentNode, "div", "scroll-frame", "table")
      ? `<div class="scroll-frame">${markup}</div>` : markup;
  };
  const markup = nodes.map((node) => render(node)).join("");
  return { html: markup, text: text.join("").trim().replace(/\s+/g, " ") };
}

