import { discardHtml, escapeHtml, isMath, leafTags, renderMarkup } from "./content-markup.mjs";

const blockTags = new Set([...leafTags, "table", "ul", "ol", "blockquote", "tr", "tbody"]);
const children = (node) => node.childNodes ?? [];
const bold = (node) => node.tagName === "b" || node.tagName === "strong";
const blank = (node) => node.nodeName === "#comment" || (node.nodeName === "#text" && !node.value.trim()) || node.tagName === "br";
const plainText = (node) => isMath(node) || discardHtml(node) ? "" : node.value ?? children(node).map(plainText).join("");
const hasBlock = (node) => children(node).some((child) => blockTags.has(child.tagName) || hasBlock(child));
const hasPictureOrTable = (node) => node.tagName === "img" || node.tagName === "table" || children(node).some(hasPictureOrTable);
const hasContent = (node) => !discardHtml(node) && (node.tagName === "math" || !!node.value?.trim() || children(node).some(hasContent));

function* leaves(nodes) {
  for (const node of nodes) {
    if (discardHtml(node)) continue;
    if (leafTags.has(node.tagName) && !hasBlock(node)) yield node;
    else yield* leaves(children(node));
  }
}

// A complete run of bold-labelled options can move out of the statement.
// This covers one leaf with multiple options and consecutive labelled leaves.
function liftOptions(nodes, labels, readLabel) {
  const blocks = [];
  let ended = false;
  for (const leaf of leaves(nodes)) {
    const first = children(leaf).find((node) => !blank(node));
    if (first && readLabel(first)) {
      if (ended) return null;
      blocks.push(leaf);
    } else if (blocks.length && plainText(leaf).trim()) {
      ended = true;
    }
  }
  const ordered = [];
  const segments = new Map();
  let segment;
  for (const block of blocks) {
    if (hasPictureOrTable(block)) return null;
    for (const piece of children(block)) {
      const label = readLabel(piece);
      if (label) {
        ordered.push(label);
        segment = [];
        segments.set(label, segment);
      } else {
        segment?.push(piece);
      }
    }
  }
  if (ordered.length !== labels.length || labels.some((label, i) => label !== ordered[i] || !segments.get(label).some(hasContent))) return null;
  for (const block of blocks) {
    const siblings = block.parentNode.childNodes;
    const index = siblings.indexOf(block);
    const preceding = siblings[index - 1];
    if (preceding?.nodeName === "#text" && blank(preceding)) siblings.splice(index - 1, 2);
    else siblings.splice(index, 1);
  }
  return segments;
}

function namedOptions(nodes, expected, readLabel, normalize) {
  const marked = [];
  const walk = (node) => {
    if (isMath(node) || discardHtml(node)) return "";
    const label = readLabel(node, true);
    if (label) marked.push(label);
    const text = node.value ?? children(node).map(walk).join("");
    return leafTags.has(node.tagName) || node.tagName === "br" || node.tagName === "hr" ? `${text} ` : text;
  };
  const text = nodes.map(walk).join("");
  if (marked.join("") === expected) return expected;
  const labels = Array.from(text.matchAll(/(?:^|\s)([AАБВГДЕ])[).]/g), ([, label]) => normalize(label)).filter(Boolean);
  const named = labels.join("");
  return named === expected || new Set(labels).size > 1 ? named : "";
}

export function presentOptions(nodes, choices, { where, picture }) {
  const labels = choices.map(({ label }) => label).sort();
  const normalize = (label) => {
    const normalized = label === "A" && !labels.includes("A") ? "А" : label;
    return labels.includes(normalized) ? normalized : "";
  };
  const readLabel = (node, direct = false) => {
    if (!bold(node)) return "";
    const text = (direct ? children(node).map((child) => child.value ?? "").join("") : plainText(node)).trim();
    const match = /^([AАБВГДЕ])\s*[).]$/.exec(text);
    return match ? normalize(match[1]) : "";
  };
  const lifted = nodes && !picture && liftOptions(nodes, labels, readLabel);
  const expected = labels.join("");
  const named = nodes && !picture && !lifted ? namedOptions(nodes, expected, readLabel, normalize) : "";
  if (named && named !== expected) throw new Error(`${where}: ambiguous choice markers ${named}`);

  return choices.map(({ id, label, text }) => {
    if (picture || named) return { id, label, text: "", html: "" };
    if (!lifted) return { id, label, text, html: escapeHtml(text) };
    const option = renderMarkup(lifted.get(label), { where: `${where} option ${label}`, tile: true });
    return { id, label, text: option.text, html: option.html.trim().replaceAll("\u00a0", " ") };
  });
}
