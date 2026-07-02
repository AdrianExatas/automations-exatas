import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Footer,
  PageNumber,
} from "docx";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { PopDocument } from "../types/pop";
import { buildFeedbackUrl } from "../feedback/token";

function heading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: "Calibri", size: 22 })],
    spacing: { after: 120 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: "Calibri", size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

export async function exportPopToDocx(
  pop: PopDocument,
  outputPath: string,
  feedbackUrl: string,
): Promise<string> {
  const dir = join(outputPath, "..");
  mkdirSync(dir, { recursive: true });

  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: pop.header.title,
          bold: true,
          size: 32,
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    body(`Versão: ${pop.header.version}`),
    body(`Responsável: ${pop.header.responsible}`),
    body(`Data de revisão: ${pop.header.reviewDate}`),
    heading("Objetivo"),
    body(pop.objective),
    heading("Pré-requisitos"),
    ...pop.prerequisites.map(bullet),
    heading("Passo a Passo"),
    ...pop.steps.flatMap((step) => [
      subheading(`${step.order}. ${step.action}`),
      body(step.detail),
    ]),
    heading("Controle de Qualidade"),
    ...pop.qualityControl.map(bullet),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Enviar sugestões ou revisões: ",
                    font: "Calibri",
                    size: 18,
                  }),
                  new TextRun({
                    text: feedbackUrl,
                    font: "Calibri",
                    size: 18,
                    color: "0563C1",
                    underline: {},
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Página ", font: "Calibri", size: 16 }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "Calibri",
                    size: 16,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  await Bun.write(outputPath, buffer);
  return outputPath;
}

export function getOutputPath(jobId: string, outputsDir: string): string {
  return join(outputsDir, `${jobId}.docx`);
}

export function getFeedbackUrlForJob(baseUrl: string, token: string): string {
  return buildFeedbackUrl(baseUrl, token);
}
