import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  UnderlineType
} from 'docx';
import { saveAs } from 'file-saver';
import { PersonalMeetingItem, DepartmentMeetingItem, UserAccount } from '../types';

/**
 * Escapes special HTML characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extracts day, month, year from YYYY-MM-DD or returns defaults
 */
function parseDateParts(dateStr?: string): { day: string; month: string; year: string; fullFormatted: string } {
  if (!dateStr) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    return {
      day,
      month,
      year,
      fullFormatted: `ngày ${day} tháng ${month} năm ${year}`
    };
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return {
      day: parts[2],
      month: parts[1],
      year: parts[0],
      fullFormatted: `ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`
    };
  }

  return {
    day: '...',
    month: '...',
    year: '...',
    fullFormatted: `ngày ${dateStr}`
  };
}

/**
 * Converts raw multi-line user input into administrative HTML paragraphs per Nghị định 30/2020/NĐ-CP.
 * PRESERVES ALL LINE BREAKS, indents first line of standard paragraphs, and aligns bullet points.
 */
export function formatAdministrativeHtmlText(text: string): string {
  if (!text || !text.trim()) {
    return '<p style="margin: 4pt 0; text-align: justify; font-style: italic; color: #4b5563; font-family: \'Times New Roman\', serif; font-size: 13pt;">(Chưa có nội dung ghi chép)</p>';
  }

  const lines = text.split(/\r?\n/);
  const htmlParts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      // Empty line / newline between paragraphs -> visual paragraph gap
      htmlParts.push('<div style="height: 6pt;"></div>');
      continue;
    }

    const escaped = escapeHtml(trimmed);

    // Check if line is a major section title / heading (e.g., "1.", "I.", "A.", "Phần 1:", "Bước 1:")
    const isSectionHeading = /^(?:[I|V|X]+\.|\d+\.|\b(?:Phần|Bước|Mục)\s+\d+[:.]|[A-Z]\.)\s+/i.test(trimmed);

    // Check if line is a bullet / dash list item (e.g., "-", "+", "*", "•")
    const isBulletItem = /^[-+*•–—]\s+/.test(trimmed);

    // Check if line is a sub-numbering item (e.g., "a)", "b)", "1.1", "1)")
    const isSubItem = /^(?:[a-z]\)|\d+\.\d+|\d+\))\s+/i.test(trimmed);

    if (isSectionHeading) {
      htmlParts.push(
        `<p style="margin: 6pt 0 3pt 0; text-align: justify; font-weight: bold; line-height: 1.35; font-family: 'Times New Roman', serif; font-size: 13pt;">${escaped}</p>`
      );
    } else if (isBulletItem) {
      htmlParts.push(
        `<p style="margin: 2.5pt 0 2.5pt 0; text-align: justify; line-height: 1.35; padding-left: 28pt; text-indent: -14pt; font-family: 'Times New Roman', serif; font-size: 13pt;">${escaped}</p>`
      );
    } else if (isSubItem) {
      htmlParts.push(
        `<p style="margin: 3pt 0 3pt 0; text-align: justify; line-height: 1.35; padding-left: 24pt; text-indent: -12pt; font-family: 'Times New Roman', serif; font-size: 13pt;">${escaped}</p>`
      );
    } else {
      // Normal paragraph text: first line indent 1.27cm per Nghị định 30/2020/NĐ-CP
      htmlParts.push(
        `<p style="margin: 3.5pt 0 3.5pt 0; text-align: justify; text-indent: 1.27cm; line-height: 1.35; font-family: 'Times New Roman', serif; font-size: 13pt;">${escaped}</p>`
      );
    }
  }

  return htmlParts.join('\n');
}

/**
 * Parses raw text into docx Paragraph objects, preserving all line breaks and indents.
 */
function parseTextToDocxParagraphs(text: string): Paragraph[] {
  if (!text || !text.trim()) {
    return [
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 60, after: 60, line: 276 },
        children: [
          new TextRun({
            text: '(Chưa có nội dung ghi chép)',
            italics: true,
            font: 'Times New Roman',
            size: 26 // 13pt
          })
        ]
      })
    ];
  }

  const lines = text.split(/\r?\n/);
  const paragraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      // Empty line -> empty spacing paragraph
      paragraphs.push(
        new Paragraph({
          spacing: { before: 80, after: 80, line: 276 },
          children: []
        })
      );
      continue;
    }

    const isSectionHeading = /^(?:[I|V|X]+\.|\d+\.|\b(?:Phần|Bước|Mục)\s+\d+[:.]|[A-Z]\.)\s+/i.test(trimmed);
    const isBulletItem = /^[-+*•–—]\s+/.test(trimmed);
    const isSubItem = /^(?:[a-z]\)|\d+\.\d+|\d+\))\s+/i.test(trimmed);

    if (isSectionHeading) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 120, after: 60, line: 276 },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              font: 'Times New Roman',
              size: 26 // 13pt
            })
          ]
        })
      );
    } else if (isBulletItem) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 567, hanging: 283 }, // 1cm left indent, 0.5cm hanging
          spacing: { before: 40, after: 40, line: 276 },
          children: [
            new TextRun({
              text: trimmed,
              font: 'Times New Roman',
              size: 26 // 13pt
            })
          ]
        })
      );
    } else if (isSubItem) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 450, hanging: 225 },
          spacing: { before: 50, after: 50, line: 276 },
          children: [
            new TextRun({
              text: trimmed,
              font: 'Times New Roman',
              size: 26 // 13pt
            })
          ]
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 720 }, // 1.27cm (0.5 inch = 720 twips)
          spacing: { before: 60, after: 60, line: 276 },
          children: [
            new TextRun({
              text: trimmed,
              font: 'Times New Roman',
              size: 26 // 13pt
            })
          ]
        })
      );
    }
  }

  return paragraphs;
}

const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

/**
 * EXPORT 1: Personal Meeting to native Microsoft Word (.docx) per Nghị định 30/2020/NĐ-CP
 */
export async function exportPersonalMeetingToDocx(
  item: PersonalMeetingItem,
  currentUser?: UserAccount | null
): Promise<void> {
  const { day, month, year, fullFormatted } = parseDateParts(item.meetingDate);

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: 'TRƯỜNG TIỂU HỌC THẠNH YÊN 1',
                    font: 'Times New Roman',
                    size: 24 // 12pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 60 },
                children: [
                  new TextRun({
                    text: (item.category || 'SỔ GHI CHÉP HỌP').toUpperCase(),
                    bold: true,
                    font: 'Times New Roman',
                    size: 24 // 12pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 120 },
                children: [
                  new TextRun({
                    text: '--------------------',
                    font: 'Times New Roman',
                    size: 20
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24 // 12pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: 'Độc lập - Tự do - Hạnh phúc',
                    bold: true,
                    font: 'Times New Roman',
                    size: 26 // 13pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 80 },
                children: [
                  new TextRun({
                    text: '-----------------------',
                    font: 'Times New Roman',
                    size: 20
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 120 },
                children: [
                  new TextRun({
                    text: `Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}`,
                    italics: true,
                    font: 'Times New Roman',
                    size: 24 // 12pt
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  const bodyChildren: (Paragraph | Table)[] = [
    headerTable,
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 180, line: 276 },
      children: [
        new TextRun({
          text: (item.title || 'SỔ GHI CHÉP HỌP').toUpperCase(),
          bold: true,
          font: 'Times New Roman',
          size: 30 // 15pt
        })
      ]
    }),

    // Section I: Thông tin chung
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 140, after: 60, line: 276 },
      children: [
        new TextRun({
          text: 'I. THÔNG TIN CHUNG',
          bold: true,
          font: 'Times New Roman',
          size: 26 // 13pt
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 40, line: 276 },
      children: [
        new TextRun({ text: '1. Thời gian họp: ', bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({ text: fullFormatted, font: 'Times New Roman', size: 26 })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 40, line: 276 },
      children: [
        new TextRun({ text: '2. Địa điểm: ', bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({ text: item.location || 'Phòng họp', font: 'Times New Roman', size: 26 })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 40, line: 276 },
      children: [
        new TextRun({ text: '3. Chủ trì cuộc họp: ', bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({ text: item.chairperson || 'Chủ tọa cuộc họp', font: 'Times New Roman', size: 26 })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 80, line: 276 },
      children: [
        new TextRun({ text: '4. Thành phần tham dự: ', bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({ text: item.attendees || 'Toàn thể giáo viên theo triệu tập', font: 'Times New Roman', size: 26 })
      ]
    }),

    // Section II: Nội dung ghi chép cuộc họp (Preserving every newline)
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 160, after: 60, line: 276 },
      children: [
        new TextRun({
          text: 'II. NỘI DUNG GHI CHÉP CUỘC HỌP',
          bold: true,
          font: 'Times New Roman',
          size: 26
        })
      ]
    }),
    ...parseTextToDocxParagraphs(item.content)
  ];

  // Section III: Nhiệm vụ trọng tâm
  if (item.actionItems && item.actionItems.trim()) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 160, after: 60, line: 276 },
        children: [
          new TextRun({
            text: 'III. NHIỆM VỤ VÀ TRỌNG TÂM CẦN THỰC HIỆN',
            bold: true,
            font: 'Times New Roman',
            size: 26
          })
        ]
      }),
      ...parseTextToDocxParagraphs(item.actionItems)
    );
  }

  // Ghi chú nếu có
  if (item.note && item.note.trim()) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 720 },
        spacing: { before: 100, after: 100, line: 276 },
        children: [
          new TextRun({ text: 'Ghi chú: ', bold: true, italics: true, font: 'Times New Roman', size: 24 }),
          new TextRun({ text: item.note, italics: true, font: 'Times New Roman', size: 24 })
        ]
      })
    );
  }

  // Signatures Table
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: []
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, before: 160, after: 40 },
                children: [
                  new TextRun({
                    text: `Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}`,
                    italics: true,
                    font: 'Times New Roman',
                    size: 24 // 12pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: 'NGƯỜI GHI SỔ',
                    bold: true,
                    font: 'Times New Roman',
                    size: 26 // 13pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 500 }, // Signature space
                children: [
                  new TextRun({
                    text: '(Ký và ghi rõ họ tên)',
                    italics: true,
                    font: 'Times New Roman',
                    size: 22 // 11pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: currentUser?.name || 'Giáo viên',
                    bold: true,
                    font: 'Times New Roman',
                    size: 26 // 13pt
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  bodyChildren.push(signatureTable);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips (210mm)
              height: 16838 // A4 height in twips (297mm)
            },
            margin: {
              top: 1134, // 20mm
              bottom: 1134, // 20mm
              left: 1701, // 30mm
              right: 850 // 15mm
            }
          }
        },
        children: bodyChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanFileName = (item.title || 'SoHopCaNhan').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9 -]/g, '_');
  saveAs(blob, `${cleanFileName}.docx`);
}

/**
 * EXPORT 2: Department Meeting to native Microsoft Word (.docx) per Nghị định 30/2020/NĐ-CP
 */
export async function exportDepartmentMeetingToDocx(item: DepartmentMeetingItem): Promise<void> {
  const { day, month, year, fullFormatted } = parseDateParts(item.meetingDate);

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: 'TRƯỜNG TIỂU HỌC THẠNH YÊN 1',
                    font: 'Times New Roman',
                    size: 24 // 12pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: (item.department || 'TỔ KHỐI').toUpperCase(),
                    bold: true,
                    font: 'Times New Roman',
                    size: 24 // 12pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: 'Số: ....../BB-TK',
                    italics: true,
                    font: 'Times New Roman',
                    size: 22 // 11pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 120 },
                children: [
                  new TextRun({
                    text: '--------------------',
                    font: 'Times New Roman',
                    size: 20
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24 // 12pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: 'Độc lập - Tự do - Hạnh phúc',
                    bold: true,
                    font: 'Times New Roman',
                    size: 26 // 13pt
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 80 },
                children: [
                  new TextRun({
                    text: '-----------------------',
                    font: 'Times New Roman',
                    size: 20
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 120 },
                children: [
                  new TextRun({
                    text: `Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}`,
                    italics: true,
                    font: 'Times New Roman',
                    size: 24 // 12pt
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  const bodyChildren: (Paragraph | Table)[] = [
    headerTable,
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60, line: 276 },
      children: [
        new TextRun({
          text: (item.title || 'BIÊN BẢN HỌP TỔ CHUYÊN MÔN').toUpperCase(),
          bold: true,
          font: 'Times New Roman',
          size: 30 // 15pt
        })
      ]
    })
  ];

  if (item.purpose && item.purpose.trim()) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 160, line: 276 },
        children: [
          new TextRun({
            text: `(V/v: ${item.purpose})`,
            italics: true,
            font: 'Times New Roman',
            size: 24 // 12pt
          })
        ]
      })
    );
  }

  // Section I: Thời gian, địa điểm, thành phần
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 140, after: 60, line: 276 },
      children: [
        new TextRun({
          text: 'I. THỜI GIAN, ĐỊA ĐIỂM VÀ THÀNH PHẦN THAM DỰ',
          bold: true,
          font: 'Times New Roman',
          size: 26
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 40, line: 276 },
      children: [
        new TextRun({ text: '1. Thời gian: ', bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({
          text: `Từ ${item.timeStart || '14:00'} đến ${item.timeEnd || '16:00'}, ${fullFormatted}`,
          font: 'Times New Roman',
          size: 26
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 40, line: 276 },
      children: [
        new TextRun({ text: '2. Địa điểm: ', bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({ text: item.location || 'Phòng họp chuyên môn', font: 'Times New Roman', size: 26 })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 40, line: 276 },
      children: [
        new TextRun({ text: '3. Chủ trì cuộc họp: ', bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({ text: `Đồng chí ${item.chairperson} - Tổ trưởng`, font: 'Times New Roman', size: 26 })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 40, line: 276 },
      children: [
        new TextRun({ text: '4. Thư ký cuộc họp: ', bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({ text: `Đồng chí ${item.secretary}`, font: 'Times New Roman', size: 26 })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 80, line: 276 },
      children: [
        new TextRun({ text: '5. Thành phần tham dự: ', bold: true, font: 'Times New Roman', size: 26 }),
        new TextRun({
          text: `Tổng số ${item.totalMembers || 6} đồng chí. Có mặt: ${item.presentMembers || 6} đ/c. Vắng mặt: ${item.absentMembers || 'Không'}.`,
          font: 'Times New Roman',
          size: 26
        })
      ]
    }),

    // Section II: Nội dung cuộc họp
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 160, after: 60, line: 276 },
      children: [
        new TextRun({
          text: 'II. NỘI DUNG CUỘC HỌP',
          bold: true,
          font: 'Times New Roman',
          size: 26
        })
      ]
    }),

    // Part 1
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 80, after: 40, line: 276 },
      children: [
        new TextRun({
          text: '1. Đánh giá công tác thời gian qua:',
          bold: true,
          font: 'Times New Roman',
          size: 26
        })
      ]
    }),
    ...parseTextToDocxParagraphs(item.reviewPastWork),

    // Part 2
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 80, after: 40, line: 276 },
      children: [
        new TextRun({
          text: '2. Triển khai kế hoạch thời gian tới / Sinh hoạt chuyên môn theo NCBH:',
          bold: true,
          font: 'Times New Roman',
          size: 26
        })
      ]
    }),
    ...parseTextToDocxParagraphs(item.upcomingPlan)
  );

  // Part 3: Discussions
  if (item.discussions && item.discussions.trim()) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 720 },
        spacing: { before: 80, after: 40, line: 276 },
        children: [
          new TextRun({
            text: '3. Ý kiến thảo luận của các thành viên tham dự:',
            bold: true,
            font: 'Times New Roman',
            size: 26
          })
        ]
      }),
      ...parseTextToDocxParagraphs(item.discussions)
    );
  }

  // Part 4: Resolutions
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 80, after: 40, line: 276 },
      children: [
        new TextRun({
          text: '4. Kết luận & Quyết nghị của Tổ khối:',
          bold: true,
          font: 'Times New Roman',
          size: 26
        })
      ]
    }),
    ...parseTextToDocxParagraphs(item.resolutions || '100% thành viên tham dự nhất trí thông qua nội dung cuộc họp.'),

    // Section III: Kết thúc cuộc họp
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 160, after: 60, line: 276 },
      children: [
        new TextRun({
          text: 'III. KẾT THÚC CUỘC HỌP',
          bold: true,
          font: 'Times New Roman',
          size: 26
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { before: 40, after: 120, line: 276 },
      children: [
        new TextRun({
          text: `Biên bản cuộc họp đã được đọc lại cho toàn thể các thành viên tham dự cùng nghe, nhất trí hoàn toàn với các nội dung đã ghi và không có ý kiến bổ sung. Cuộc họp kết thúc vào lúc ${item.timeEnd || '16:00'} cùng ngày.`,
          font: 'Times New Roman',
          size: 26
        })
      ]
    })
  );

  // Signatures Table: Nơi nhận (left) + Thư ký (center) + Tổ trưởng (right)
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 240, after: 30 },
                children: [
                  new TextRun({ text: 'Nơi nhận:', bold: true, italics: true, font: 'Times New Roman', size: 22 })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 240, after: 20 },
                children: [
                  new TextRun({ text: '- BGH nhà trường (để b/c);', font: 'Times New Roman', size: 20 })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 240, after: 20 },
                children: [
                  new TextRun({ text: '- Các thành viên trong tổ;', font: 'Times New Roman', size: 20 })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 240, after: 20 },
                children: [
                  new TextRun({ text: '- Lưu: VT, Hồ sơ Tổ.', font: 'Times New Roman', size: 20 })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 31, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 30 },
                children: [
                  new TextRun({ text: 'THƯ KÝ', bold: true, font: 'Times New Roman', size: 26 })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 500 },
                children: [
                  new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true, font: 'Times New Roman', size: 22 })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({ text: item.secretary || 'Thư ký', bold: true, font: 'Times New Roman', size: 26 })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 31, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 30 },
                children: [
                  new TextRun({ text: 'CHỦ TRÌ / TỔ TRƯỞNG', bold: true, font: 'Times New Roman', size: 26 })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 500 },
                children: [
                  new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true, font: 'Times New Roman', size: 22 })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({ text: item.chairperson || 'Tổ trưởng', bold: true, font: 'Times New Roman', size: 26 })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  bodyChildren.push(signatureTable);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838
            },
            margin: {
              top: 1134,
              bottom: 1134,
              left: 1701,
              right: 850
            }
          }
        },
        children: bodyChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanFileName = (item.title || 'BienBanHopToKhoi').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9 -]/g, '_');
  saveAs(blob, `${cleanFileName}.docx`);
}

/**
 * EXPORT 3: Personal Meeting to Word (.doc) with XML headers and full paragraph formatting per Nghị định 30/2020/NĐ-CP
 */
export function exportPersonalMeetingToWordHtml(item: PersonalMeetingItem, currentUser?: UserAccount | null): void {
  const { day, month, year, fullFormatted } = parseDateParts(item.meetingDate);

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${escapeHtml(item.title)}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 595.3pt 841.9pt; /* A4 Standard */
          margin: 2.0cm 2.0cm 2.0cm 3.0cm; /* Nghị định 30/2020/NĐ-CP margins: Top 2cm, Bottom 2cm, Right 2cm, Left 3cm */
        }
        div.WordSection1 { page: WordSection1; }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 13pt;
          line-height: 1.35;
          color: #000000;
        }
        table.admin-header {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 14pt;
        }
        table.admin-header td {
          border: none;
          vertical-align: top;
          padding: 0;
        }
        .header-left {
          text-align: center;
          font-size: 12pt;
        }
        .header-right {
          text-align: center;
          font-size: 12pt;
        }
        .header-bold {
          font-weight: bold;
          text-transform: uppercase;
        }
        .header-line {
          width: 45%;
          border-bottom: 1px solid #000;
          margin: 3pt auto 5pt auto;
        }
        .doc-title {
          text-align: center;
          font-weight: bold;
          font-size: 15pt;
          text-transform: uppercase;
          margin-top: 14pt;
          margin-bottom: 14pt;
        }
        .section-heading {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 13pt;
          margin-top: 12pt;
          margin-bottom: 4pt;
        }
        .field-row {
          margin-top: 3pt;
          margin-bottom: 3pt;
          text-align: justify;
          text-indent: 1.27cm;
          font-size: 13pt;
        }
      </style>
    </head>
    <body>
      <div class="WordSection1">
        <table class="admin-header">
          <tr>
            <td style="width: 45%;" class="header-left">
              TRƯỜNG TIỂU HỌC THẠNH YÊN 1<br/>
              <span class="header-bold">${escapeHtml((item.category || 'SỔ GHI CHÉP HỌP').toUpperCase())}</span>
              <div class="header-line"></div>
            </td>
            <td style="width: 55%;" class="header-right">
              <span class="header-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br/>
              <span style="font-weight: bold; font-size: 13pt;">Độc lập - Tự do - Hạnh phúc</span>
              <div class="header-line" style="width: 55%;"></div>
              <span style="font-style: italic; font-size: 12pt;">Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}</span>
            </td>
          </tr>
        </table>

        <div class="doc-title">${escapeHtml((item.title || 'SỔ GHI CHÉP HỌP').toUpperCase())}</div>

        <div class="section-heading">I. THÔNG TIN CHUNG</div>
        <div class="field-row">1. <b>Thời gian họp:</b> ${fullFormatted}</div>
        <div class="field-row">2. <b>Địa điểm:</b> ${escapeHtml(item.location || 'Phòng họp')}</div>
        <div class="field-row">3. <b>Chủ trì cuộc họp:</b> ${escapeHtml(item.chairperson || 'Chủ tọa cuộc họp')}</div>
        <div class="field-row">4. <b>Thành phần tham dự:</b> ${escapeHtml(item.attendees || 'Toàn thể giáo viên')}</div>

        <div class="section-heading">II. NỘI DUNG GHI CHÉP CUỘC HỌP</div>
        ${formatAdministrativeHtmlText(item.content)}

        ${
          item.actionItems && item.actionItems.trim()
            ? `
        <div class="section-heading">III. NHIỆM VỤ VÀ TRỌNG TÂM CẦN THỰC HIỆN</div>
        ${formatAdministrativeHtmlText(item.actionItems)}
        `
            : ''
        }

        ${
          item.note && item.note.trim()
            ? `
        <div style="margin-top: 10pt; font-style: italic; text-indent: 1.27cm;">
          <b>Ghi chú:</b> ${escapeHtml(item.note)}
        </div>
        `
            : ''
        }

        <table style="width: 100%; border-collapse: collapse; margin-top: 28pt; border: none;">
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: center; vertical-align: top;">
              <span style="font-style: italic; font-size: 12pt;">Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}</span><br/>
              <b style="font-size: 13pt;">NGƯỜI GHI SỔ</b><br/>
              <span style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</span>
              <br/><br/><br/><br/>
              <b style="font-size: 13pt;">${escapeHtml(currentUser?.name || 'Giáo viên')}</b>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], {
    type: 'application/msword;charset=utf-8'
  });
  const link = document.createElement('a');
  const cleanFileName = (item.title || 'SoHopCaNhan').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9 -]/g, '_');
  link.href = URL.createObjectURL(blob);
  link.download = `${cleanFileName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * EXPORT 4: Department Meeting to Word (.doc) with XML headers and full paragraph formatting per Nghị định 30/2020/NĐ-CP
 */
export function exportDepartmentMeetingToWordHtml(item: DepartmentMeetingItem): void {
  const { day, month, year, fullFormatted } = parseDateParts(item.meetingDate);

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${escapeHtml(item.title)}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 2.0cm 2.0cm 2.0cm 3.0cm; /* Nghị định 30/2020/NĐ-CP margins */
        }
        div.WordSection1 { page: WordSection1; }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 13pt;
          line-height: 1.35;
          color: #000000;
        }
        table.admin-header {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 14pt;
        }
        table.admin-header td {
          border: none;
          vertical-align: top;
          padding: 0;
        }
        .header-left {
          text-align: center;
          font-size: 12pt;
        }
        .header-right {
          text-align: center;
          font-size: 12pt;
        }
        .header-bold {
          font-weight: bold;
          text-transform: uppercase;
        }
        .header-line {
          width: 45%;
          border-bottom: 1px solid #000;
          margin: 3pt auto 5pt auto;
        }
        .doc-title {
          text-align: center;
          font-weight: bold;
          font-size: 15pt;
          text-transform: uppercase;
          margin-top: 14pt;
          margin-bottom: 4pt;
        }
        .doc-subtitle {
          text-align: center;
          font-style: italic;
          font-size: 12pt;
          margin-bottom: 14pt;
        }
        .section-heading {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 13pt;
          margin-top: 12pt;
          margin-bottom: 4pt;
        }
        .field-row {
          margin-top: 3pt;
          margin-bottom: 3pt;
          text-align: justify;
          text-indent: 1.27cm;
          font-size: 13pt;
        }
        table.sign-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-top: 24pt;
        }
        table.sign-table td {
          border: none;
          vertical-align: top;
          padding: 0;
        }
      </style>
    </head>
    <body>
      <div class="WordSection1">
        <!-- Header -->
        <table class="admin-header">
          <tr>
            <td style="width: 45%;" class="header-left">
              TRƯỜNG TIỂU HỌC THẠNH YÊN 1<br/>
              <span class="header-bold">${escapeHtml((item.department || 'TỔ KHỐI').toUpperCase())}</span><br/>
              <span style="font-size: 11pt; font-style: italic;">Số: ....../BB-TK</span>
              <div class="header-line"></div>
            </td>
            <td style="width: 55%;" class="header-right">
              <span class="header-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br/>
              <span style="font-weight: bold; font-size: 13pt;">Độc lập - Tự do - Hạnh phúc</span>
              <div class="header-line" style="width: 55%;"></div>
              <span style="font-style: italic; font-size: 12pt;">Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}</span>
            </td>
          </tr>
        </table>

        <!-- Document Title -->
        <div class="doc-title">${escapeHtml((item.title || 'BIÊN BẢN HỌP TỔ CHUYÊN MÔN').toUpperCase())}</div>
        ${item.purpose ? `<div class="doc-subtitle">(V/v: ${escapeHtml(item.purpose)})</div>` : '<div style="margin-bottom: 10pt;"></div>'}

        <!-- Section I -->
        <div class="section-heading">I. THỜI GIAN, ĐỊA ĐIỂM VÀ THÀNH PHẦN THAM DỰ</div>
        <div class="field-row">1. <b>Thời gian:</b> Từ ${escapeHtml(item.timeStart || '14:00')} đến ${escapeHtml(item.timeEnd || '16:00')}, ${fullFormatted}</div>
        <div class="field-row">2. <b>Địa điểm:</b> ${escapeHtml(item.location || 'Phòng họp chuyên môn')}</div>
        <div class="field-row">3. <b>Chủ trì:</b> Đồng chí ${escapeHtml(item.chairperson)} - Tổ trưởng</div>
        <div class="field-row">4. <b>Thư ký:</b> Đồng chí ${escapeHtml(item.secretary)}</div>
        <div class="field-row">5. <b>Thành phần tham dự:</b> Tổng số ${item.totalMembers || 6} đồng chí. Có mặt: ${item.presentMembers || 6} đ/c, Vắng mặt: ${escapeHtml(item.absentMembers || 'Không')}.</div>

        <!-- Section II -->
        <div class="section-heading">II. NỘI DUNG CUỘC HỌP</div>

        <div style="font-weight: bold; margin-top: 6pt; margin-bottom: 3pt; text-indent: 1.27cm;">1. Đánh giá công tác thời gian qua:</div>
        ${formatAdministrativeHtmlText(item.reviewPastWork)}

        <div style="font-weight: bold; margin-top: 8pt; margin-bottom: 3pt; text-indent: 1.27cm;">2. Triển khai kế hoạch thời gian tới / Sinh hoạt chuyên môn theo NCBH:</div>
        ${formatAdministrativeHtmlText(item.upcomingPlan)}

        ${
          item.discussions && item.discussions.trim()
            ? `
        <div style="font-weight: bold; margin-top: 8pt; margin-bottom: 3pt; text-indent: 1.27cm;">3. Ý kiến thảo luận của các thành viên tham dự:</div>
        ${formatAdministrativeHtmlText(item.discussions)}
        `
            : ''
        }

        <div style="font-weight: bold; margin-top: 8pt; margin-bottom: 3pt; text-indent: 1.27cm;">4. Kết luận & Quyết nghị của Tổ khối:</div>
        ${formatAdministrativeHtmlText(item.resolutions || '100% thành viên tham dự nhất trí thông qua nội dung cuộc họp.')}

        <!-- Section III -->
        <div class="section-heading" style="margin-top: 14pt;">III. KẾT THÚC CUỘC HỌP</div>
        <div style="text-align: justify; text-indent: 1.27cm; margin-bottom: 12pt;">
          Biên bản cuộc họp đã được đọc lại cho toàn thể các thành viên tham dự cùng nghe, nhất trí hoàn toàn với các nội dung đã ghi và không có ý kiến bổ sung. Cuộc họp kết thúc vào lúc ${escapeHtml(item.timeEnd || '16:00')} cùng ngày.
        </div>

        <!-- Signatures Table -->
        <table class="sign-table">
          <tr>
            <td style="width: 38%; text-align: left; font-size: 11pt;">
              <b><i>Nơi nhận:</i></b><br/>
              - BGH nhà trường (để b/c);<br/>
              - Các thành viên trong tổ;<br/>
              - Lưu: VT, Hồ sơ Tổ.
            </td>
            <td style="width: 31%; text-align: center;">
              <b style="font-size: 13pt;">THƯ KÝ</b><br/>
              <span style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</span>
              <br/><br/><br/><br/>
              <b style="font-size: 13pt;">${escapeHtml(item.secretary || 'Thư ký')}</b>
            </td>
            <td style="width: 31%; text-align: center;">
              <b style="font-size: 13pt;">CHỦ TRÌ / TỔ TRƯỞNG</b><br/>
              <span style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</span>
              <br/><br/><br/><br/>
              <b style="font-size: 13pt;">${escapeHtml(item.chairperson || 'Tổ trưởng')}</b>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], {
    type: 'application/msword;charset=utf-8'
  });
  const link = document.createElement('a');
  const cleanFileName = (item.title || 'BienBanHopToKhoi').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9 -]/g, '_');
  link.href = URL.createObjectURL(blob);
  link.download = `${cleanFileName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Dedicated clean print window or printable iframe for A4 printing
 */
export function printAdministrativeMeeting(
  type: 'personal' | 'department',
  item: PersonalMeetingItem | DepartmentMeetingItem,
  currentUser?: UserAccount | null
): void {
  const isPersonal = type === 'personal';
  const persItem = item as PersonalMeetingItem;
  const deptItem = item as DepartmentMeetingItem;

  const { day, month, year, fullFormatted } = parseDateParts(item.meetingDate);

  const title = (item.title || (isPersonal ? 'SỔ GHI CHÉP HỌP' : 'BIÊN BẢN HỌP TỔ CHUYÊN MÔN')).toUpperCase();

  let bodyHtml = '';

  if (isPersonal) {
    bodyHtml = `
      <table class="admin-header">
        <tr>
          <td style="width: 45%;" class="header-left">
            TRƯỜNG TIỂU HỌC THẠNH YÊN 1<br/>
            <span class="header-bold">${escapeHtml((persItem.category || 'SỔ GHI CHÉP HỌP').toUpperCase())}</span>
            <div class="header-line"></div>
          </td>
          <td style="width: 55%;" class="header-right">
            <span class="header-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br/>
            <span style="font-weight: bold; font-size: 13pt;">Độc lập - Tự do - Hạnh phúc</span>
            <div class="header-line" style="width: 55%;"></div>
            <span style="font-style: italic; font-size: 12pt;">Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}</span>
          </td>
        </tr>
      </table>

      <div class="doc-title">${escapeHtml(title)}</div>

      <div class="section-heading">I. THÔNG TIN CHUNG</div>
      <div class="field-row">1. <b>Thời gian họp:</b> ${fullFormatted}</div>
      <div class="field-row">2. <b>Địa điểm:</b> ${escapeHtml(persItem.location || 'Phòng họp')}</div>
      <div class="field-row">3. <b>Chủ trì cuộc họp:</b> ${escapeHtml(persItem.chairperson || 'Chủ tọa cuộc họp')}</div>
      <div class="field-row">4. <b>Thành phần tham dự:</b> ${escapeHtml(persItem.attendees || 'Toàn thể giáo viên')}</div>

      <div class="section-heading">II. NỘI DUNG GHI CHÉP CUỘC HỌP</div>
      ${formatAdministrativeHtmlText(persItem.content)}

      ${
        persItem.actionItems && persItem.actionItems.trim()
          ? `
      <div class="section-heading">III. NHIỆM VỤ VÀ TRỌNG TÂM CẦN THỰC HIỆN</div>
      ${formatAdministrativeHtmlText(persItem.actionItems)}
      `
          : ''
      }

      ${
        persItem.note && persItem.note.trim()
          ? `
      <div style="margin-top: 10pt; font-style: italic; text-indent: 1.27cm;">
        <b>Ghi chú:</b> ${escapeHtml(persItem.note)}
      </div>
      `
          : ''
      }

      <table style="width: 100%; border-collapse: collapse; margin-top: 30pt; border: none; page-break-inside: avoid;">
        <tr>
          <td style="width: 50%;"></td>
          <td style="width: 50%; text-align: center; vertical-align: top;">
            <span style="font-style: italic; font-size: 12pt;">Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}</span><br/>
            <b style="font-size: 13pt;">NGƯỜI GHI SỔ</b><br/>
            <span style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</span>
            <br/><br/><br/><br/>
            <b style="font-size: 13pt;">${escapeHtml(currentUser?.name || 'Giáo viên')}</b>
          </td>
        </tr>
      </table>
    `;
  } else {
    bodyHtml = `
      <table class="admin-header">
        <tr>
          <td style="width: 45%;" class="header-left">
            TRƯỜNG TIỂU HỌC THẠNH YÊN 1<br/>
            <span class="header-bold">${escapeHtml((deptItem.department || 'TỔ KHỐI').toUpperCase())}</span><br/>
            <span style="font-size: 11pt; font-style: italic;">Số: ....../BB-TK</span>
            <div class="header-line"></div>
          </td>
          <td style="width: 55%;" class="header-right">
            <span class="header-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br/>
            <span style="font-weight: bold; font-size: 13pt;">Độc lập - Tự do - Hạnh phúc</span>
            <div class="header-line" style="width: 55%;"></div>
            <span style="font-style: italic; font-size: 12pt;">Thạnh Yên 1, ngày ${day} tháng ${month} năm ${year}</span>
          </td>
        </tr>
      </table>

      <div class="doc-title">${escapeHtml(title)}</div>
      ${deptItem.purpose ? `<div class="doc-subtitle">(V/v: ${escapeHtml(deptItem.purpose)})</div>` : '<div style="margin-bottom: 10pt;"></div>'}

      <div class="section-heading">I. THỜI GIAN, ĐỊA ĐIỂM VÀ THÀNH PHẦN THAM DỰ</div>
      <div class="field-row">1. <b>Thời gian:</b> Từ ${escapeHtml(deptItem.timeStart || '14:00')} đến ${escapeHtml(deptItem.timeEnd || '16:00')}, ${fullFormatted}</div>
      <div class="field-row">2. <b>Địa điểm:</b> ${escapeHtml(deptItem.location || 'Phòng họp chuyên môn')}</div>
      <div class="field-row">3. <b>Chủ trì:</b> Đồng chí ${escapeHtml(deptItem.chairperson)} - Tổ trưởng</div>
      <div class="field-row">4. <b>Thư ký:</b> Đồng chí ${escapeHtml(deptItem.secretary)}</div>
      <div class="field-row">5. <b>Thành phần tham dự:</b> Tổng số ${deptItem.totalMembers || 6} đồng chí. Có mặt: ${deptItem.presentMembers || 6} đ/c, Vắng mặt: ${escapeHtml(deptItem.absentMembers || 'Không')}.</div>

      <div class="section-heading">II. NỘI DUNG CUỘC HỌP</div>

      <div style="font-weight: bold; margin-top: 6pt; margin-bottom: 3pt; text-indent: 1.27cm;">1. Đánh giá công tác thời gian qua:</div>
      ${formatAdministrativeHtmlText(deptItem.reviewPastWork)}

      <div style="font-weight: bold; margin-top: 8pt; margin-bottom: 3pt; text-indent: 1.27cm;">2. Triển khai kế hoạch thời gian tới / Sinh hoạt chuyên môn theo NCBH:</div>
      ${formatAdministrativeHtmlText(deptItem.upcomingPlan)}

      ${
        deptItem.discussions && deptItem.discussions.trim()
          ? `
      <div style="font-weight: bold; margin-top: 8pt; margin-bottom: 3pt; text-indent: 1.27cm;">3. Ý kiến thảo luận của các thành viên tham dự:</div>
      ${formatAdministrativeHtmlText(deptItem.discussions)}
      `
          : ''
      }

      <div style="font-weight: bold; margin-top: 8pt; margin-bottom: 3pt; text-indent: 1.27cm;">4. Kết luận & Quyết nghị của Tổ khối:</div>
      ${formatAdministrativeHtmlText(deptItem.resolutions || '100% thành viên tham dự nhất trí thông qua nội dung cuộc họp.')}

      <div class="section-heading" style="margin-top: 14pt;">III. KẾT THÚC CUỘC HỌP</div>
      <div style="text-align: justify; text-indent: 1.27cm; margin-bottom: 12pt;">
        Biên bản cuộc họp đã được đọc lại cho toàn thể các thành viên tham dự cùng nghe, nhất trí hoàn toàn với các nội dung đã ghi và không có ý kiến bổ sung. Cuộc họp kết thúc vào lúc ${escapeHtml(deptItem.timeEnd || '16:00')} cùng ngày.
      </div>

      <table class="sign-table" style="page-break-inside: avoid;">
        <tr>
          <td style="width: 38%; text-align: left; font-size: 11pt;">
            <b><i>Nơi nhận:</i></b><br/>
            - BGH nhà trường (để b/c);<br/>
            - Các thành viên trong tổ;<br/>
            - Lưu: VT, Hồ sơ Tổ.
          </td>
          <td style="width: 31%; text-align: center;">
            <b style="font-size: 13pt;">THƯ KÝ</b><br/>
            <span style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</span>
            <br/><br/><br/><br/>
            <b style="font-size: 13pt;">${escapeHtml(deptItem.secretary || 'Thư ký')}</b>
          </td>
          <td style="width: 31%; text-align: center;">
            <b style="font-size: 13pt;">CHỦ TRÌ / TỔ TRƯỞNG</b><br/>
            <span style="font-style: italic; font-size: 11pt;">(Ký và ghi rõ họ tên)</span>
            <br/><br/><br/><br/>
            <b style="font-size: 13pt;">${escapeHtml(deptItem.chairperson || 'Tổ trưởng')}</b>
          </td>
        </tr>
      </table>
    `;
  }

  // Create an iframe to print cleanly without UI disturbance
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 20mm 15mm 20mm 25mm; /* Nghị định 30/2020/NĐ-CP */
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 13pt;
          line-height: 1.35;
          color: #000000;
          margin: 0;
          padding: 10mm 15mm;
          background: #ffffff;
        }
        table.admin-header {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 14pt;
        }
        table.admin-header td {
          border: none;
          vertical-align: top;
          padding: 0;
        }
        .header-left {
          text-align: center;
          font-size: 12pt;
        }
        .header-right {
          text-align: center;
          font-size: 12pt;
        }
        .header-bold {
          font-weight: bold;
          text-transform: uppercase;
        }
        .header-line {
          width: 45%;
          border-bottom: 1px solid #000;
          margin: 3pt auto 5pt auto;
        }
        .doc-title {
          text-align: center;
          font-weight: bold;
          font-size: 15pt;
          text-transform: uppercase;
          margin-top: 14pt;
          margin-bottom: 4pt;
        }
        .doc-subtitle {
          text-align: center;
          font-style: italic;
          font-size: 12pt;
          margin-bottom: 14pt;
        }
        .section-heading {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 13pt;
          margin-top: 12pt;
          margin-bottom: 4pt;
        }
        .field-row {
          margin-top: 3pt;
          margin-bottom: 3pt;
          text-align: justify;
          text-indent: 1.27cm;
          font-size: 13pt;
        }
        table.sign-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-top: 24pt;
        }
        table.sign-table td {
          border: none;
          vertical-align: top;
          padding: 0;
        }
      </style>
    </head>
    <body>
      ${bodyHtml}
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch (e) {
      console.warn('Frame print error:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 2000);
    }
  }, 350);
}

/**
 * Normalizes text in input fields to comply with Vietnamese administrative writing rules:
 * - Proper line breaks and paragraph structure
 * - Uppercase first letters of sentences
 * - Proper punctuation spacing (no space before comma/period, one space after)
 * - Standard bullet symbols
 */
export function normalizeAdministrativeText(raw: string): string {
  if (!raw) return '';
  const lines = raw.split(/\r?\n/);
  const cleanedLines = lines.map((line) => {
    let t = line.trim();
    if (!t) return '';

    // Standardize bullet points
    if (/^[*•–—]\s*/.test(t)) {
      t = '- ' + t.replace(/^[*•–—]\s*/, '');
    }

    // Capitalize first letter if it's a new sentence or bullet
    if (/^-\s+[a-zà-ỹ]/.test(t)) {
      t = '- ' + t.charAt(2).toUpperCase() + t.slice(3);
    } else if (/^[a-zà-ỹ]/.test(t)) {
      t = t.charAt(0).toUpperCase() + t.slice(1);
    }

    // Fix punctuation spacing: remove space before comma/dot/semicolon/colon
    t = t.replace(/\s+([.,;:!?])/g, '$1');
    // Ensure space after punctuation if followed by a letter
    t = t.replace(/([.,;:!?])([a-zA-ZÀ-ỹ])/g, '$1 $2');

    return t;
  });

  return cleanedLines.join('\n');
}
