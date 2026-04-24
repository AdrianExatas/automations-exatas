import fs from "node:fs";
import { SaxesParser, type SaxesTag } from "saxes";

export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  text: string;
  children: XmlNode[];
}

export interface ParsedXmlTree {
  root: XmlNode;
  rawXml: string;
}

function createNode(tag: SaxesTag): XmlNode {
  const attributes: Record<string, string> = {};

  Object.values(tag.attributes).forEach((attribute) => {
    const key = "local" in attribute && attribute.local ? attribute.local : attribute.name;
    attributes[key] = attribute.value;
  });

  return {
    name: tag.local || tag.name,
    attributes,
    text: "",
    children: [],
  };
}

export function parseXmlFile(filePath: string): ParsedXmlTree {
  const rawXml = fs.readFileSync(filePath, "utf8");
  const parser = new SaxesParser({ xmlns: true });
  const stack: XmlNode[] = [];
  let root: XmlNode | null = null;
  let parserError: Error | null = null;

  parser.on("error", (error) => {
    parserError = error;
  });

  parser.on("opentag", (tag) => {
    const node = createNode(tag);
    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(node);
    } else {
      root = node;
    }
    stack.push(node);
  });

  parser.on("text", (text) => {
    const current = stack[stack.length - 1];
    if (current) {
      current.text += text;
    }
  });

  parser.on("cdata", (text) => {
    const current = stack[stack.length - 1];
    if (current) {
      current.text += text;
    }
  });

  parser.on("closetag", () => {
    stack.pop();
  });

  parser.write(rawXml).close();

  if (parserError) {
    throw parserError;
  }
  if (!root) {
    throw new Error("XML sem elemento raiz.");
  }

  return { root, rawXml };
}

export function getChild(node: XmlNode | undefined, name: string): XmlNode | undefined {
  return node?.children.find((child) => child.name === name);
}

export function getNodeText(node: XmlNode | undefined): string {
  return node?.text.trim() ?? "";
}

export function getPath(node: XmlNode | undefined, path: string[]): XmlNode | undefined {
  let current = node;
  for (const segment of path) {
    current = getChild(current, segment);
    if (!current) return undefined;
  }
  return current;
}

export function getPathText(node: XmlNode | undefined, path: string[]): string {
  return getNodeText(getPath(node, path));
}
