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
  VerticalAlign,
  VerticalMergeType
} from 'docx';
import { saveAs } from 'file-saver';
import { SchoolConfig, LessonPlanRow } from '../types';
import { getDayOfWeekName, getWeekDateRange, formatCleanActivityTitle, abbreviateIntegrationText } from './dateUtils';
import { cleanLessonTitle, cleanSubSubjectLessonTitle } from './helpers';
import { getPeriodOfWeekNumber, formatTopicWithWeekPeriod } from './ppctMatcher';

export async function exportLessonPlanToDocx(
  config: SchoolConfig,
  weekNumber: number,
  startDate: string,
  endDate: string,
  rows: LessonPlanRow[],
  teacherType: 'GVCN' | 'GVBM' = 'GVCN'
): Promise<void> {
  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  const tableHeaderCell = (text: string, widthPercent: number) => {
    const lines = text.split('\n');
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      children: lines.map(
        (line) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: line,
                bold: true,
                size: 24, // Cỡ chữ 12pt
                font: 'Times New Roman'
              })
            ]
          })
      )
    });
  };

  // Header Table (School name & Department on left, Republic Title & Motto on right)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (config.schoolName || 'TRƯỜNG TIỂU HỌC THẠNH YÊN 1').toUpperCase(),
                    size: 24, // 12pt
                    font: 'Times New Roman'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (config.departmentName || 'TỔ CHUYÊN MÔN 4+5').toUpperCase(),
                    bold: true,
                    underline: {},
                    size: 24, // 12pt
                    font: 'Times New Roman'
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (config.republicTitleTop || 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM').toUpperCase(),
                    bold: true,
                    size: 24, // 12pt
                    font: 'Times New Roman'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: config.republicTitleSub || 'Độc lập – Tự do – Hạnh phúc',
                    bold: true,
                    underline: {},
                    size: 24, // 12pt
                    font: 'Times New Roman'
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  // Sort rows consistently by dayOfWeek, session, and period
  const sortedRows = [...rows].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    const sessionOrder = (s: string) => (s === 'Sáng' || s === 'morning' ? 1 : 2);
    if (sessionOrder(a.session) !== sessionOrder(b.session)) {
      return sessionOrder(a.session) - sessionOrder(b.session);
    }
    return a.period - b.period;
  });

  // Main table header matching the attached PDF
  const isGvcn = teacherType === 'GVCN';
  const homeClassName = sortedRows.find((r) => r.className && r.className !== 'Chào cờ' && r.className !== 'Sinh hoạt lớp')?.className || '3A1';

  const headerCells = isGvcn
    ? [
        tableHeaderCell('THỨ', 9),
        tableHeaderCell('BUỔI', 8),
        tableHeaderCell('TIẾT', 6),
        tableHeaderCell('MÔN', 14),
        tableHeaderCell('PHÂN MÔN', 15),
        tableHeaderCell('TÊN BÀI DẠY', 28),
        tableHeaderCell('ĐIỀU CHỈNH/\nTÍCH HỢP', 20)
      ]
    : [
        tableHeaderCell('THỨ', 9),
        tableHeaderCell('BUỔI', 9),
        tableHeaderCell('TIẾT', 7),
        tableHeaderCell('LỚP', 9),
        tableHeaderCell('MÔN', 13),
        tableHeaderCell('TÊN BÀI DẠY', 33),
        tableHeaderCell('ĐIỀU CHỈNH/\nTÍCH HỢP', 20)
      ];

  const tableRows: TableRow[] = [
    new TableRow({ children: headerCells })
  ];

  const getPureSubject = (s: string) => (s || '').split(' (')[0].trim();

  // Populate data rows with vertical merges for Day and Session
  sortedRows.forEach((row, idx) => {
    const isFirstOfDay = idx === 0 || row.dayOfWeek !== sortedRows[idx - 1].dayOfWeek;
    const isFirstOfSession = isFirstOfDay || row.session !== sortedRows[idx - 1].session;
    const isFirstOfSubject = isFirstOfSession || getPureSubject(row.subject) !== getPureSubject(sortedRows[idx - 1].subject);

    const dayCellChildren: Paragraph[] = [];
    if (isFirstOfDay) {
      dayCellChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: getDayOfWeekName(row.dayOfWeek),
              bold: true,
              size: 24, // Cỡ chữ 12pt
              font: 'Times New Roman'
            })
          ]
        })
      );
      if (row.dateStr) {
        dayCellChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `(${row.dateStr})`,
                size: 20, // 10pt
                font: 'Times New Roman'
              })
            ]
          })
        );
      }
    } else {
      dayCellChildren.push(new Paragraph({ text: '' }));
    }

    const dayCell = new TableCell({
      width: { size: 9, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      verticalMerge: isFirstOfDay ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE,
      children: dayCellChildren
    });

    const sessionCell = new TableCell({
      width: { size: 9, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      verticalMerge: isFirstOfSession ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE,
      children: isFirstOfSession
        ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: row.session,
                  bold: true,
                  size: 24, // Cỡ chữ 12pt
                  font: 'Times New Roman'
                })
              ]
            })
          ]
        : [new Paragraph({ text: '' })]
    });

    const periodCell = new TableCell({
      width: { size: 7, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: String(row.period),
              bold: true,
              size: 24, // Cỡ chữ 12pt
              font: 'Times New Roman'
            })
          ]
        })
      ]
    });

    const classCell = new TableCell({
      width: { size: 9, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: row.className || '',
              bold: true,
              size: 24, // Cỡ chữ 12pt
              font: 'Times New Roman'
            })
          ]
        })
      ]
    });

    const subjectCell = new TableCell({
      width: { size: isGvcn ? 14 : 13, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      verticalMerge: isGvcn
        ? (isFirstOfSubject ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE)
        : undefined,
      children: (isGvcn ? isFirstOfSubject : true)
        ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: getPureSubject(row.subject),
                  bold: isGvcn,
                  size: 24, // Cỡ chữ 12pt
                  font: 'Times New Roman'
                })
              ]
            })
          ]
        : [new Paragraph({ text: '' })]
    });

    const subSubjectCell = new TableCell({
      width: { size: 15, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: row.subSubject || '',
              size: 24, // Cỡ chữ 12pt
              font: 'Times New Roman'
            })
          ]
        })
      ]
    });

    const lessonLines = (row.lessonName || '').split('\n');
    const lessonParagraphs = lessonLines.map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: line,
              size: 24, // Cỡ chữ 12pt
              font: 'Times New Roman'
            })
          ]
        })
    );

    const lessonCell = new TableCell({
      width: { size: isGvcn ? 28 : 33, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      children: lessonParagraphs.length > 0 ? lessonParagraphs : [new Paragraph({ text: '' })]
    });

    const integrationLines = (row.integrationNote || '').split('\n');
    const integrationParagraphs = integrationLines.map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: line,
              size: 24, // Cỡ chữ 12pt
              font: 'Times New Roman'
            })
          ]
        })
    );

    const integrationCell = new TableCell({
      width: { size: 20, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      children: integrationParagraphs.length > 0 ? integrationParagraphs : [new Paragraph({ text: '' })]
    });

    const rowCells = isGvcn
      ? [dayCell, sessionCell, periodCell, subjectCell, subSubjectCell, lessonCell, integrationCell]
      : [dayCell, sessionCell, periodCell, classCell, subjectCell, lessonCell, integrationCell];

    tableRows.push(
      new TableRow({
        children: rowCells
      })
    );
  });

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });

  // Footer Signatures matching attached PDF:
  // Date on right, then 3 columns: DUYỆT CỦA P.HIỆU TRƯỜNG | TỔ TRƯỜNG | GIÁO VIÊN
  const footerDateParagraph = new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [
      new TextRun({
        text: `${config.location || 'Vĩnh Hòa'}, ngày .... tháng .... năm ....`,
        italics: true,
        size: 24, // Cỡ chữ 12pt
        font: 'Times New Roman'
      })
    ]
  });

  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (config.principalTitle || 'DUYỆT CỦA P.HIỆU TRƯỜNG').toUpperCase(),
                    bold: true,
                    size: 24, // Cỡ chữ 12pt
                    font: 'Times New Roman'
                  })
                ]
              }),
              new Paragraph({ text: '\n\n\n\n' }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: config.principalName || '',
                    bold: true,
                    size: 24, // Cỡ chữ 12pt
                    font: 'Times New Roman'
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (config.headTeacherTitle || 'TỔ TRƯỜNG').toUpperCase(),
                    bold: true,
                    size: 24, // Cỡ chữ 12pt
                    font: 'Times New Roman'
                  })
                ]
              }),
              new Paragraph({ text: '\n\n\n\n' }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: config.headTeacherName || '',
                    bold: true,
                    size: 24, // Cỡ chữ 12pt
                    font: 'Times New Roman'
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (config.teacherTitle || 'GIÁO VIÊN').toUpperCase(),
                    bold: true,
                    size: 24, // Cỡ chữ 12pt
                    font: 'Times New Roman'
                  })
                ]
              }),
              new Paragraph({ text: '\n\n\n\n' }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: config.teacherName || '',
                    bold: true,
                    size: 24, // Cỡ chữ 12pt
                    font: 'Times New Roman'
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  const docChildren: (Paragraph | Table)[] = [
    headerTable,
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: (
            teacherType === 'GVCN'
              ? `LỊCH BÁO GIẢNG LỚP ${homeClassName.toUpperCase()}`
              : (config.documentTitle || 'KẾ HOẠCH DẠY HỌC')
          ).toUpperCase(),
          bold: true,
          size: 28, // Cỡ chữ 14pt
          font: 'Times New Roman'
        })
      ]
    })
  ];

  const showSubTitle = isGvcn ? false : true;

  if (showSubTitle) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: (isGvcn ? config.subjectTitle : (config.subjectTitle || 'MÔN: TIN HỌC - CÔNG NGHỆ')).toUpperCase(),
            bold: true,
            size: 26, // Cỡ chữ 13pt
            font: 'Times New Roman'
          })
        ]
      })
    );
  }

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Tuần ${weekNumber} thực hiện từ ngày ${startDate} đến ngày ${endDate}`,
          italics: true,
          size: 26, // Cỡ chữ 13pt
          font: 'Times New Roman'
        })
      ]
    }),
    new Paragraph({ text: '' }),
    mainTable,
    new Paragraph({ text: '' }),
    footerDateParagraph,
    new Paragraph({ text: '' }),
    footerTable
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 1000,
              right: 720
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `KHDH_Tuan_${weekNumber}_${(config.teacherName || 'GV').replace(/\s+/g, '_')}.docx`;
  saveAs(blob, fileName);
}

/**
 * Xuất Kế hoạch bài dạy (Giáo án) chi tiết ra file Word (.docx)
 * Bảng 2 cột chuẩn Bộ GD&ĐT: Hoạt động của Giáo viên & Hoạt động của Học sinh
 */
export async function exportDetailedLessonPlanToDocx(
  plan: import('../types').DetailedLessonPlan,
  selectedPeriodIndex?: number,
  config?: SchoolConfig,
  ppctList: import('../types').PpctItem[] = []
): Promise<void> {
  const periodsToExport = selectedPeriodIndex
    ? plan.periodPlans.filter((p) => p.periodIndex === selectedPeriodIndex)
    : plan.periodPlans;

  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  const docChildren: (Paragraph | Table)[] = [];

  for (let idx = 0; idx < periodsToExport.length; idx++) {
    const period = periodsToExport[idx];
    const periodWeek = Number(period.weekNumber || period.header?.weekNumber) || (plan.weekNumber || 1);
    const dateRangeObj = getWeekDateRange(config?.startDateWeek1 || '2024-09-09', periodWeek);
    const periodTimeRange = `từ ngày ${dateRangeObj.startDate} đến ngày ${dateRangeObj.endDate}`;
    const weekPeriodNum = getPeriodOfWeekNumber(
      period.ppctPeriodIndex,
      period.periodIndex || (idx + 1),
      periodWeek,
      plan.subject,
      plan.grade,
      ppctList
    );

    if (idx > 0) {
      docChildren.push(new Paragraph({ text: '' }));
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '----------------------------------------------------------------------------------------------------',
              color: '888888',
              font: 'Times New Roman'
            })
          ]
        })
      );
      docChildren.push(new Paragraph({ text: '' }));
    }

    // 1. Tiêu đề: KẾ HOẠCH BÀI DẠY - TUẦN X
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `KẾ HOẠCH BÀI DẠY - TUẦN ${periodWeek}`,
            bold: true,
            size: 28,
            font: 'Times New Roman'
          })
        ]
      })
    );

    // 2. MÔN: ... - LỚP ...
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `MÔN: ${plan.subject.toUpperCase()} - LỚP ${plan.grade}`,
            bold: true,
            size: 28,
            font: 'Times New Roman'
          })
        ]
      })
    );

    // 3. Tên bài dạy & Tiết thứ mấy của tuần đó nằm ngay sau tên bài dạy
    const rawMainTopic = period.header?.title || plan.topic;
    const mainTopicHeader = formatTopicWithWeekPeriod(rawMainTopic, weekPeriodNum);

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: mainTopicHeader,
            bold: true,
            size: 28,
            font: 'Times New Roman'
          })
        ]
      })
    );

    // 4. Thời gian thực hiện: ... (Xóa hoàn toàn tiết theo PPCT nằm dưới thời gian thực hiện theo yêu cầu của giáo viên)
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Thời gian thực hiện: ${periodTimeRange}`,
            italics: true,
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );

    docChildren.push(new Paragraph({ text: '' }));

    // I. YÊU CẦU CẦN ĐẠT
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'I. YÊU CẦU CẦN ĐẠT:',
            bold: true,
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );

    // 1. Năng lực đặc thù
    docChildren.push(
      new Paragraph({
        indent: { left: 360 },
        children: [
          new TextRun({
            text: '1. Năng lực đặc thù:',
            bold: true,
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );
    period.objectives.specificCompetencies?.forEach((item) => {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 720 },
          children: [
            new TextRun({
              text: `- ${item}`,
              size: 26,
              font: 'Times New Roman'
            })
          ]
        })
      );
    });

    // 2. Năng lực chung
    docChildren.push(
      new Paragraph({
        indent: { left: 360 },
        children: [
          new TextRun({
            text: '2. Năng lực chung:',
            bold: true,
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );
    period.objectives.generalCompetencies?.forEach((item) => {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 720 },
          children: [
            new TextRun({
              text: `- ${item}`,
              size: 26,
              font: 'Times New Roman'
            })
          ]
        })
      );
    });

    // 3. Phẩm chất
    docChildren.push(
      new Paragraph({
        indent: { left: 360 },
        children: [
          new TextRun({
            text: '3. Phẩm chất:',
            bold: true,
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );
    period.objectives.qualities?.forEach((item) => {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 720 },
          children: [
            new TextRun({
              text: `- ${item}`,
              size: 26,
              font: 'Times New Roman'
            })
          ]
        })
      );
    });

    // 4. Nội dung tích hợp
    if (period.objectives.integrationContent && period.objectives.integrationContent.length > 0) {
      docChildren.push(
        new Paragraph({
          indent: { left: 360 },
          children: [
            new TextRun({
              text: '4. Nội dung tích hợp (NLS CV 3456, STEM CV 909, Công dân số CV 3899):',
              bold: true,
              size: 26,
              font: 'Times New Roman'
            })
          ]
        })
      );
      period.objectives.integrationContent.forEach((item) => {
        docChildren.push(
          new Paragraph({
            indent: { left: 720 },
            children: [
              new TextRun({
                text: `- ${abbreviateIntegrationText(item)}`,
                size: 26,
                font: 'Times New Roman'
              })
            ]
          })
        );
      });
    }

    docChildren.push(new Paragraph({ text: '' }));

    // II. ĐỒ DÙNG DẠY HỌC
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'II. ĐỒ DÙNG DẠY HỌC:',
            bold: true,
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 360 },
        children: [
          new TextRun({
            text: '1. Giáo viên: ',
            bold: true,
            size: 26,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: period.teachingTools.teacher.join(', '),
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 360 },
        children: [
          new TextRun({
            text: '2. Học sinh: ',
            bold: true,
            size: 26,
            font: 'Times New Roman'
          }),
          new TextRun({
            text: period.teachingTools.student.join(', '),
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );

    docChildren.push(new Paragraph({ text: '' }));

    // III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU:',
            bold: true,
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );

    // Chuẩn bảng 2 cột: Hoạt động của Giáo viên & Hoạt động của Học sinh
    const tableBorder = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' }
    };

    const stepDashedBorder = {
      top: { style: BorderStyle.DASHED, size: 4, color: 'A0A0A0' },
      bottom: { style: BorderStyle.DASHED, size: 4, color: 'A0A0A0' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
    };

    const activityTableRows: TableRow[] = [];

    // Header Row của bảng 2 cột
    activityTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            shading: { fill: 'F2F4F7' },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'HOẠT ĐỘNG CỦA GIÁO VIÊN',
                    bold: true,
                    size: 26,
                    font: 'Times New Roman'
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            shading: { fill: 'F2F4F7' },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'HOẠT ĐỘNG CỦA HỌC SINH',
                    bold: true,
                    size: 26,
                    font: 'Times New Roman'
                  })
                ]
              })
            ]
          })
        ]
      })
    );

    // Render 4 hoạt động và các nhiệm vụ
    period.activities.forEach((act) => {
      // Dòng tiêu đề Hoạt động (Khởi động / Khám phá / Luyện tập / Vận dụng)
      let titleText = formatCleanActivityTitle(act.activityName, act.timeEstimate).toUpperCase();

      const actCellChildren: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({
              text: titleText,
              bold: true,
              size: 26,
              font: 'Times New Roman'
            })
          ]
        })
      ];

      if (act.integrationNote) {
        actCellChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `✦ ${abbreviateIntegrationText(act.integrationNote)}`,
                bold: true,
                italics: true,
                size: 24,
                font: 'Times New Roman'
              })
            ]
          })
        );
      }

      activityTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              columnSpan: 2,
              borders: tableBorder,
              shading: { fill: 'EAEAEA' },
              children: actCellChildren
            })
          ]
        })
      );

      // Render từng Task trong Activity
      act.tasks?.forEach((task) => {
        // Dòng Tiêu đề Task in nghiêng (vd: * Nhiệm vụ 1: ...)
        const taskCellChildren: Paragraph[] = [
          new Paragraph({
            children: [
              new TextRun({
                text: task.taskTitle,
                bold: true,
                italics: true,
                size: 21,
                font: 'Times New Roman'
              })
            ]
          })
        ];

        if (task.integrationNote) {
          taskCellChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `✦ ${abbreviateIntegrationText(task.integrationNote)}`,
                  bold: true,
                  italics: true,
                  size: 20,
                  font: 'Times New Roman'
                })
              ]
            })
          );
        }

        activityTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnSpan: 2,
                borders: tableBorder,
                shading: { fill: 'F9FAFB' },
                children: taskCellChildren
              })
            ]
          })
        );

        // Các bước trong Task (Bước 1 -> Bước 4)
        task.steps?.forEach((step) => {
          // Xử lý xuống dòng cho hoạt động của Giáo viên
          const teacherLines = (step.teacherAction || '')
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          const teacherParagraphs: Paragraph[] = [];
          if (teacherLines.length === 0) {
            teacherParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${step.stepName}: `,
                    bold: true,
                    size: 26,
                    font: 'Times New Roman'
                  })
                ]
              })
            );
          } else {
            teacherLines.forEach((line, lIdx) => {
              teacherParagraphs.push(
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  children: [
                    ...(lIdx === 0
                      ? [
                          new TextRun({
                            text: `${step.stepName}: `,
                            bold: true,
                            size: 26,
                            font: 'Times New Roman'
                          })
                        ]
                      : []),
                    new TextRun({
                      text: line,
                      size: 26,
                      font: 'Times New Roman'
                    })
                  ]
                })
              );
            });
          }

          // Xử lý xuống dòng cho hoạt động của Học sinh
          const studentLines = (step.studentAction || '')
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          const studentParagraphs: Paragraph[] = [];
          if (studentLines.length === 0) {
            studentParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Thao tác / Phản hồi của HS: ',
                    bold: true,
                    italics: true,
                    size: 26,
                    font: 'Times New Roman'
                  })
                ]
              })
            );
          } else {
            studentLines.forEach((line, lIdx) => {
              studentParagraphs.push(
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  children: [
                    ...(lIdx === 0
                      ? [
                          new TextRun({
                            text: 'Thao tác / Phản hồi của HS: ',
                            bold: true,
                            italics: true,
                            size: 26,
                            font: 'Times New Roman'
                          })
                        ]
                      : []),
                    new TextRun({
                      text: line,
                      size: 26,
                      font: 'Times New Roman'
                    })
                  ]
                })
              );
            });
          }

          activityTableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: stepDashedBorder,
                  children: teacherParagraphs
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: stepDashedBorder,
                  children: studentParagraphs
                })
              ]
            })
          );
        });
      });
    });

    const activityTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorder,
      rows: activityTableRows
    });

    docChildren.push(activityTable);
    docChildren.push(new Paragraph({ text: '' }));

    // IV. ĐIỀU CHỈNH SAU BÀI DẠY (nếu có)
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'IV. ĐIỀU CHỈNH SAU BÀI DẠY (nếu có):',
            bold: true,
            size: 26,
            font: 'Times New Roman'
          })
        ]
      })
    );

    const adjustmentText = period.postLessonAdjustment?.trim() || '';
    const isDefaultDots = !adjustmentText || adjustmentText.includes('....') || adjustmentText.includes('...');

    if (isDefaultDots) {
      // Dấu chấm căn đều vừa đủ hàng ngang trang giấy A4 (chuẩn 13pt Times New Roman)
      const fullA4Dots = '...........................................................................................................................................................';
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 360 },
          children: [
            new TextRun({
              text: fullA4Dots,
              size: 26,
              font: 'Times New Roman'
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 360 },
          children: [
            new TextRun({
              text: fullA4Dots,
              size: 26,
              font: 'Times New Roman'
            })
          ]
        })
      );
    } else {
      adjustmentText.split('\n').forEach((line) => {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: 360 },
            children: [
              new TextRun({
                text: line,
                size: 26,
                font: 'Times New Roman'
              })
            ]
          })
        );
      });
    }

    docChildren.push(new Paragraph({ text: '' }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              bottom: 1134,
              left: 1417, // ~2.5cm
              right: 1134 // ~2cm
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = (plan.topic || 'Giao_An').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
  const fileName = `Giao_An_${plan.subject}_Lop_${plan.grade}_${cleanTitle}.docx`;
  saveAs(blob, fileName);
}

