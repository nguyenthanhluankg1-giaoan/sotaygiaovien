
// FIX: Replaced TabStopLeader with TabStopPosition in the import, as TabStopLeader is not an exported member.
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, VerticalAlign, TabStopType, TabStopPosition } from 'docx';
import saveAs from 'file-saver';
import type { LessonPlan, Activity } from '../types';

const FONT_FAMILY = "Times New Roman";
const FONT_SIZE = 26; // 13pt * 2

// FIX: To resolve a TypeScript error ("'AlignmentType' refers to a value..."),
// TAlignmentType is derived from the enum's values using `typeof`. This gets the
// type of the enum object itself, which can then be correctly indexed.
type TAlignmentType = (typeof AlignmentType)[keyof typeof AlignmentType];

const createParagraph = (text: string, options: { bold?: boolean; isTitle?: boolean; alignment?: TAlignmentType } = {}) => {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: options.isTitle ? 32 : FONT_SIZE,
        bold: options.bold || options.isTitle,
      }),
    ],
    spacing: { after: 120 },
    alignment: options.alignment ?? AlignmentType.JUSTIFIED,
  });
};

const createRichParagraph = (
    parts: { text: string; bold?: boolean; italics?: boolean }[], 
    options: { alignment?: TAlignmentType; indent?: { firstLine?: number } } = {}
) => {
  const { alignment = AlignmentType.JUSTIFIED, indent } = options;
  return new Paragraph({
    children: parts.map(part => new TextRun({
        text: part.text,
        font: FONT_FAMILY,
        size: FONT_SIZE,
        bold: part.bold,
        italics: part.italics,
    })),
    spacing: { after: 120 },
    alignment: alignment,
    indent: indent,
  });
}

const createActivitiesTable = (activities: Activity[]) => {
    const cellMargins = { left: 100, right: 100, top: 80, bottom: 80 };
    const rows = [
        new TableRow({
            children: [
                new TableCell({
                    children: [createParagraph("Hoạt động của Giáo viên", { bold: true, alignment: AlignmentType.LEFT })],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: cellMargins,
                }),
                new TableCell({
                    children: [createParagraph("Hoạt động của Học sinh", { bold: true, alignment: AlignmentType.LEFT })],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: cellMargins,
                }),
            ],
            tableHeader: true,
        }),
    ];

    activities.forEach(activity => {
        rows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            createParagraph(activity.activityName, { bold: true, alignment: AlignmentType.LEFT }),
                            createRichParagraph([{ text: "a) Mục tiêu: ", bold: true, italics: true }, { text: activity.objective, italics: true }]),
                        ],
                        columnSpan: 2,
                        margins: cellMargins,
                    }),
                ],
            })
        );
        
        const teacherActivityParas = activity.teacherActivity.split('\n').map(line => new Paragraph({
            children: [new TextRun({ text: line, font: FONT_FAMILY, size: FONT_SIZE })],
            spacing: { after: 100 },
            alignment: AlignmentType.JUSTIFIED,
        }));

        const studentActivityParas = activity.studentActivity.split('\n').map(line => new Paragraph({
            children: [new TextRun({ text: line, font: FONT_FAMILY, size: FONT_SIZE })],
            spacing: { after: 100 },
            alignment: AlignmentType.JUSTIFIED,
        }));

        rows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [createParagraph("b) Cách tổ chức dạy học:", { bold: true, alignment: AlignmentType.LEFT }), ...teacherActivityParas],
                        verticalAlign: VerticalAlign.TOP,
                        margins: cellMargins,
                    }),
                     new TableCell({
                        children: [...studentActivityParas],
                        verticalAlign: VerticalAlign.TOP,
                        margins: cellMargins,
                    }),
                ],
            })
        );
    });

    return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        },
    });
};


export const exportToDocx = async (plans: LessonPlan[]) => {
    const children: (Paragraph | Table)[] = [];
    const INDENT_FIRST_LINE = 720; // Corresponds to a 0.5-inch indent

    plans.forEach((plan, index) => {
        if (index > 0) {
            children.push(new Paragraph({ pageBreakBefore: true }));
        }

        children.push(
          new Paragraph({
            text: `KẾ HOẠCH BÀI DẠY (TIẾT ${index + 1})`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            style: "Title",
          }),
          createRichParagraph([
              {text: "Môn học: ", bold: true}, {text: `${plan.subject}; `},
              {text: "Lớp: ", bold: true}, {text: plan.grade},
          ], { alignment: AlignmentType.CENTER }),
          createRichParagraph([
              {text: "Tên bài học: ", bold: true}, {text: `${plan.lessonTitle}; `},
              {text: "Số tiết: ", bold: true}, {text: String(plan.periods)},
          ], { alignment: AlignmentType.CENTER }),
          createRichParagraph([{text: "Thời gian thực hiện: ", bold: true}, {text: plan.executionTime}], { alignment: AlignmentType.CENTER }),
          createRichParagraph([{ text: `Thứ ......, ngày ...... tháng ...... năm ......`, italics: true }], { alignment: AlignmentType.CENTER }),
          
          new Paragraph({
            text: "I. Yêu cầu cần đạt:",
            heading: HeadingLevel.HEADING_2,
            style: "Heading2",
            alignment: AlignmentType.JUSTIFIED,
          }),
          createRichParagraph(
              [{text: "1. Năng lực chung: ", bold: true}, {text: plan.requiredOutcomes.generalCompetencies}],
              { indent: { firstLine: INDENT_FIRST_LINE } }
          ),
          createRichParagraph(
              [{text: "2. Năng lực đặc thù: ", bold: true}, {text: plan.requiredOutcomes.specificCompetencies}],
              { indent: { firstLine: INDENT_FIRST_LINE } }
          ),
          createRichParagraph(
              [{text: "3. Phẩm chất: ", bold: true}, {text: plan.requiredOutcomes.qualities}],
              { indent: { firstLine: INDENT_FIRST_LINE } }
          ),
          createRichParagraph(
              [{text: "4. Nội dung tích hợp: ", bold: true}, {text: plan.requiredOutcomes.integratedContent}],
              { indent: { firstLine: INDENT_FIRST_LINE } }
          ),

          new Paragraph({
            text: "II. Đồ dùng dạy học:",
            heading: HeadingLevel.HEADING_2,
            style: "Heading2",
            alignment: AlignmentType.JUSTIFIED,
          }),
          createRichParagraph(
              [{text: "1. Giáo viên: ", bold: true}, {text: plan.teachingAids.teacher}],
              { indent: { firstLine: INDENT_FIRST_LINE } }
          ),
          createRichParagraph(
              [{text: "2. Học sinh: ", bold: true}, {text: plan.teachingAids.student}],
              { indent: { firstLine: INDENT_FIRST_LINE } }
          ),
          
          new Paragraph({
            text: "III. Các hoạt động dạy học:",
            heading: HeadingLevel.HEADING_2,
            style: "Heading2",
            alignment: AlignmentType.JUSTIFIED,
          }),
          createActivitiesTable(plan.teachingActivities),

          new Paragraph({
            text: "IV. Điều chỉnh sau bài dạy:",
            heading: HeadingLevel.HEADING_2,
            style: "Heading2",
            alignment: AlignmentType.JUSTIFIED,
          }),
          ...[...Array(3)].map(() => new Paragraph({
              children: [new TextRun("\t")],
              tabStops: [
                  {
                      type: TabStopType.RIGHT,
                      // FIX: The `position` property expects a number or a TabStopPosition value, not the string "max".
                      position: TabStopPosition.MAX,
                      // FIX: The `TabStopLeader` enum is not exported. Use the string literal 'dot' for the leader.
                      leader: 'dot',
                  },
              ],
              spacing: { after: 360 },
          }))
        );
    });
    
  const doc = new Document({
    sections: [{ children }],
    styles: {
        paragraphStyles: [
            {
                id: "Title",
                name: "Title",
                basedOn: "Normal",
                next: "Normal",
                run: { font: FONT_FAMILY, size: 32, bold: true },
            },
            {
                id: "Heading2",
                name: "Heading 2",
                basedOn: "Normal",
                next: "Normal",
                run: { font: FONT_FAMILY, size: FONT_SIZE, bold: true },
            },
        ]
    }
  });

  const firstPlan = plans[0];
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `GiaoAn_${firstPlan.subject.replace(/\s/g, '_')}_${firstPlan.lessonTitle.replace(/\s/g, '_')}.docx`);
};
