import ExcelJS from 'exceljs';
import type {
  ScheduleSlot,
  Institution,
  ClassGroup,
  Subject,
  Teacher,
  Classroom,
  Specialization,
} from '../types';

// ─── ՇԱԲԱԹՎԱ ՕՐԵՐԻ ԱՄԲՈՂՋԱԿԱՆ ԱՆՎԱՆՈՒՄՆԵՐԸ ─────────────────────────────────────
const ORDERED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DAY_NAMES_HY: Record<string, string> = {
  Monday:    'Երկուշաբթի',
  Tuesday:   'Երեքշաբթի',
  Wednesday: 'Չորեքշաբթի',
  Thursday:  'Հինգշաբթի',
  Friday:    'Ուրբաթ',
  Saturday:  'Շաբաթ',
  Sunday:    'Կիրակի',
};

// ─── ՄՈՆՈԽՐՈՄ ՈՃԱՎՈՐՈՒՄ (ՍԵՎ Ու ՍՊԻՏԱԿ) ──────────────────────────────────────
const BG_HEADER  = 'FFFFFFFF'; 
const BG_WHITE   = 'FFFFFFFF'; 

const THIN: ExcelJS.BorderStyle = 'thin';   
const MED:  ExcelJS.BorderStyle = 'medium'; 

// ─── ՃՇԳՐԻՏ ՉԱՓՍԵՐ ──────────────────────────────────────────────────────────
const W_DAY      = 5;   
const W_PAIR     = 4;   
const W_SUBJECT  = 20;  
const W_ROOM     = 6;   

const H_HEADER   = 22;  
const H_ROW_A    = 48.75; 
const H_ROW_B    = 25.5;  
const H_FOOTER   = 18;  

// ─── ՈՃԱՎՈՐՄԱՆ ՕԺԱԴԱԿ ՖՈՒՆԿՑԻԱՆԵՐ ────────────────────────────────────────────

function solidFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function uniformBorder(cell: ExcelJS.Cell, style: ExcelJS.BorderStyle = THIN) {
  const s = { style };
  cell.border = { top: s, left: s, bottom: s, right: s };
}

function medBorder(cell: ExcelJS.Cell) {
  const s = { style: MED };
  cell.border = { top: s, left: s, bottom: s, right: s };
}

// "X" Խաչ առարկայի համար
function crossCell(cell: ExcelJS.Cell) {
  const b: any = {
    top:      { style: THIN },
    left:     { style: THIN },
    bottom:   { style: THIN },
    right:    { style: THIN },
    diagonal: { style: THIN, up: true, down: true }
  };
  cell.border = b;
}

// Անկյունագծով կիսում համարիչ/հայտարարի համար
function splitDiagonalCell(cell: ExcelJS.Cell) {
  const b: any = {
    top:      { style: THIN },
    left:     { style: THIN },
    bottom:   { style: THIN },
    right:    { style: THIN },
    diagonal: { style: THIN, up: false, down: true }
  };
  cell.border = b;
}

function setFont(cell: ExcelJS.Cell, bold = false, size = 8) {
  cell.font = { name: 'Arial', size, bold };
}

function tryMerge(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number) {
  if (r1 === r2 && c1 === c2) return;
  try { ws.mergeCells(r1, c1, r2, c2); } catch { /* արդեն միացված է */ }
}

function cell(ws: ExcelJS.Worksheet, row: number, col: number): ExcelJS.Cell {
  return ws.getCell(row, col);
}

// ─── ԱՐՏԱՀԱՆՄԱՆ ՀԻՄՆԱԿԱՆ ՖՈՒՆԿՑԻԱՆ ───────────────────────────────────────────
export async function exportScheduleToExcel(
  schedule:        ScheduleSlot[],
  institution:     Institution,
  classGroups:     ClassGroup[],
  subjects:        Subject[],
  teachers:        Teacher[],
  classrooms:      Classroom[],
  specializations: Specialization[] = [],
): Promise<void> {

  const subjName = (id: string) => subjects.find(s => s.id === id)?.name ?? id;
  const teachName = (id: string) => {
    const t = teachers.find(x => x.id === id);
    return t ? `${t.firstName} ${t.lastName}` : id;
  };
  const roomNum = (id: string) => classrooms.find(c => c.id === id)?.number ?? id;
  const homeRoom = (g: ClassGroup): string => g.homeRoom ? roomNum(g.homeRoom) : '';

  const workingDays = ORDERED_DAYS.filter(d => institution.workingDays.includes(d));

  // 4 ՖԻՔՍՎԱԾ ԶՈՒՅԳԵՐԸ ԵՎ ԻՐԵՆՑ ՀՆԱՐԱՎՈՐ ԺԱՄԵՐԻ ՀԱՄԱՐՆԵՐԸ ԲԱԶԱՅՈՒՄ
  const staticPairs = [
    { pairIndex: 1, first: 1, second: 2, label: '1-2' },
    { pairIndex: 2, first: 3, second: 4, label: '3-4' },
    { pairIndex: 3, first: 5, second: 6, label: '5-6' },
    { pairIndex: 4, first: 7, second: 8, label: '7-8' },
  ];

  // Սլոթերի Lookup Մեփ՝ արագ գտնելու համար
  const slotMap = new Map<string, ScheduleSlot>();
  schedule.forEach(s => {
    slotMap.set(`${s.classGroupId}|${s.day}|${s.lessonNumber}`, s);
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = institution.name;

  const ws = wb.addWorksheet('Ժամ.ցույց', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const COL_DAY   = 1;
  const COL_PAIR  = 2;
  const GRP_START = 3;

  ws.getColumn(COL_DAY).width  = W_DAY;
  ws.getColumn(COL_PAIR).width = W_PAIR;

  const grpCols = classGroups.map((_, i) => ({
    sc: GRP_START + i * 2,     
    rc: GRP_START + i * 2 + 1, 
  }));

  classGroups.forEach((_, i) => {
    ws.getColumn(grpCols[i].sc).width = W_SUBJECT;
    ws.getColumn(grpCols[i].rc).width = W_ROOM;
  });

  const ROW_WEEKS = 1;
  const ROW_NAMES = 2; 
  const ROW_SEM   = 3; // 3-րդ տող (Կիսամյակի տող)
  const DATA_ROW0 = 4;

  ws.getRow(ROW_WEEKS).height = H_HEADER;
  ws.getRow(ROW_NAMES).height = H_HEADER;
  ws.getRow(ROW_SEM).height   = 14;

  tryMerge(ws, ROW_WEEKS, COL_DAY, ROW_WEEKS, COL_PAIR);
  tryMerge(ws, ROW_NAMES, COL_DAY, ROW_NAMES, COL_PAIR);
  tryMerge(ws, ROW_SEM,   COL_DAY, ROW_SEM,   COL_PAIR);
  uniformBorder(cell(ws, ROW_WEEKS, COL_DAY));
  uniformBorder(cell(ws, ROW_NAMES, COL_DAY));
  uniformBorder(cell(ws, ROW_SEM,   COL_DAY));

  // Գլխամասի լրացում՝ ԱՌԱՆՑ սյունակների merge անելու
  classGroups.forEach((grp, gi) => {
    const { sc, rc } = grpCols[gi];
    
    // Տող 1 - Ուսումնական շաբաթներ (Միայն խմբի սյունակում)
    const wCell = cell(ws, ROW_WEEKS, sc);
    wCell.value = specializations.find(s => s.name === grp.specialization || s.code === grp.specialization || s.id === grp.specialization)?.academicWeeks ?? institution.academicWeeks;
    solidFill(wCell, BG_HEADER);
    setFont(wCell, false, 8);
    wCell.alignment = { horizontal: 'center', vertical: 'middle' };
    uniformBorder(wCell);

    // Լսարանի սյունակի վերևի դատարկ վանդակը
    const wRoomCell = cell(ws, ROW_WEEKS, rc);
    solidFill(wRoomCell, BG_HEADER);
    uniformBorder(wRoomCell);

    // Տող 2 - Խմբի անունը և «Լսարան» բառը (կողք-կողքի)
    const nameC = cell(ws, ROW_NAMES, sc);
    nameC.value = grp.name;
    solidFill(nameC, BG_HEADER);
    setFont(nameC, true, 8);
    nameC.alignment = { horizontal: 'center', vertical: 'middle' };
    uniformBorder(nameC);

    const roomLabelC = cell(ws, ROW_NAMES, rc);
    roomLabelC.value = 'Լսարան';
    solidFill(roomLabelC, BG_HEADER);
    setFont(roomLabelC, false, 7);
    roomLabelC.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 }; // ՄԻԱՅՆ ՍԱ Է ՎԵՐՏԻԿԱԼ
    uniformBorder(roomLabelC);

    // Տող 3 - Սովորական առանձին սպիտակ վանդակներ (առանց merge-ի)
    const semC = cell(ws, ROW_SEM, sc);
    solidFill(semC, BG_WHITE);
    uniformBorder(semC);

    const semRC = cell(ws, ROW_SEM, rc);
    solidFill(semRC, BG_WHITE);
    uniformBorder(semRC);
  });

  let currentRow = DATA_ROW0;
  const lastDataCol = GRP_START + classGroups.length * 2 - 1;

  workingDays.forEach(day => {
    const dayLabel   = DAY_NAMES_HY[day] ?? day;
    const dayRowTop  = currentRow;

    staticPairs.forEach(pair => {
      const rowA = currentRow;     
      const rowB = currentRow + 1; 
      ws.getRow(rowA).height = H_ROW_A; // 48.75
      ws.getRow(rowB).height = H_ROW_B; // 25.5

      tryMerge(ws, rowA, COL_PAIR, rowB, COL_PAIR);
      const pairCell = cell(ws, rowA, COL_PAIR);
      pairCell.value = pair.label;
      solidFill(pairCell, BG_WHITE);
      pairCell.alignment = { horizontal: 'center', vertical: 'middle' };
      setFont(pairCell, false, 8);
      uniformBorder(pairCell);

      classGroups.forEach((grp, gi) => {
        const { sc, rc } = grpCols[gi];

        // ԽԵԼԱՑԻ ՈՐՈՆՈՒՄ (SMART LOOKUP)՝ 3-ՐԴ ԵՎ 4-ՐԴ ԺԱՄԵՐԻ ՉԿՈՐՉԵԼՈՒ ՀԱՄԱՐ
        const slot =
          slotMap.get(`${grp.id}|${day}|${pair.first}`) ??       // Օրինակ՝ 5 կամ 7
          slotMap.get(`${grp.id}|${day}|${pair.second}`) ??      // Օրինակ՝ 6 կամ 8
          slotMap.get(`${grp.id}|${day}|${pair.pairIndex}`);     // Օրինակ՝ 3 կամ 4 (եթե զույգի հերթական համարն է)

        // 1. ԱԶԱՏ ԺԱՄ -> Առարկան խաչվում է, լսարանը սովորական հորիզոնական ու դատարկ է
        if (!slot) {
          tryMerge(ws, rowA, sc, rowB, sc);
          const eSubj = cell(ws, rowA, sc);
          solidFill(eSubj, BG_WHITE);
          crossCell(eSubj);

          tryMerge(ws, rowA, rc, rowB, rc);
          const eRoom = cell(ws, rowA, rc);
          eRoom.value = ''; 
          solidFill(eRoom, BG_WHITE);
          eRoom.alignment = { horizontal: 'center', vertical: 'middle' }; // Հորիզոնական
          uniformBorder(eRoom);
        } 
        // 2. ՀԱՄԱՐԻՉ / ՀԱՅՏԱՐԱՐ -> Անկյունագծով կիսում, լսարանը՝ հորիզոնական
        else if (slot.pairSubjectId) {
          tryMerge(ws, rowA, sc, rowB, sc); 
          const splitCell = cell(ws, rowA, sc);
          
          const numText = `${subjName(slot.subjectId)}\n(${teachName(slot.teacherId)})`;
          const denText = `${subjName(slot.pairSubjectId)}\n(${teachName(slot.pairTeacherId ?? slot.teacherId)})`;
          
          splitCell.value = `${numText}\n\n                                     ${denText}`;
          solidFill(splitCell, BG_WHITE);
          splitDiagonalCell(splitCell); 
          setFont(splitCell, false, 7.5);
          splitCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

          tryMerge(ws, rowA, rc, rowB, rc);
          const rCell = cell(ws, rowA, rc);
          rCell.value = roomNum(slot.classroomId);
          solidFill(rCell, BG_WHITE);
          rCell.alignment = { horizontal: 'center', vertical: 'middle' }; // Հորիզոնական
          setFont(rCell, false, 8);
          uniformBorder(rCell);
        } 
        // 3. ԿԻՍԱՄՅԱԿԱՅԻՆ ՇԱԲԱԹՆԵՐԻ ՓՈՓՈԽՈՒԹՅՈՒՆ
        else if (slot.subjectId2 && slot.weekSwitch) {
          tryMerge(ws, rowA, sc, rowB, sc);
          const splitCell = cell(ws, rowA, sc);
          
          const s1Text = `${subjName(slot.subjectId)}\n(${teachName(slot.teacherId)})`;
          const s2Text = `${subjName(slot.subjectId2)}\n(${teachName(slot.teacherId2 ?? slot.teacherId)})`;
          
          splitCell.value = `${s1Text}\n\n                                     ${s2Text}`;
          solidFill(splitCell, BG_WHITE);
          splitDiagonalCell(splitCell);
          setFont(splitCell, false, 7.5);
          splitCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

          tryMerge(ws, rowA, rc, rowB, rc);
          const rCell = cell(ws, rowA, rc);
          rCell.value = roomNum(slot.classroomId);
          solidFill(rCell, BG_WHITE);
          rCell.alignment = { horizontal: 'center', vertical: 'middle' }; // Հորիզոնական
          setFont(rCell, false, 8);
          uniformBorder(rCell);
        } 
        // 4. ՍՈՎՈՐԱԿԱՆ ԴԱՍ
        else {
          const subjC = cell(ws, rowA, sc);
          subjC.value = subjName(slot.subjectId);
          solidFill(subjC, BG_WHITE);
          subjC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          setFont(subjC, false, 8);
          uniformBorder(subjC);

          const teachC = cell(ws, rowB, sc);
          teachC.value = teachName(slot.teacherId);
          solidFill(teachC, BG_WHITE);
          teachC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          setFont(teachC, false, 8);
          uniformBorder(teachC);

          tryMerge(ws, rowA, rc, rowB, rc);
          const rCell = cell(ws, rowA, rc);
          rCell.value = roomNum(slot.classroomId);
          solidFill(rCell, BG_WHITE);
          rCell.alignment = { horizontal: 'center', vertical: 'middle' }; // Հորիզոնական
          setFont(rCell, false, 8);
          uniformBorder(rCell);
        }
      });

      currentRow += 2;
    }); 

    const dayRowBottom = currentRow - 1;
    tryMerge(ws, dayRowTop, COL_DAY, dayRowBottom, COL_DAY);
    const dayC = cell(ws, dayRowTop, COL_DAY);
    dayC.value = dayLabel;
    solidFill(dayC, BG_HEADER);
    dayC.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: false };
    setFont(dayC, true, 8);
    medBorder(dayC);

    for (let c = COL_PAIR; c <= lastDataCol; c++) {
      const topC = cell(ws, dayRowTop, c);
      const existing = topC.border ?? {};
      topC.border = { ...existing, top: { style: MED } };
    }

  }); 

  // ── ԱՄԵՆԱՆԵՐՔԵՎԻ ՏՈՂ (FOOTER) ──────────────────────────────────────────────
  const footerRow = currentRow;
  ws.getRow(footerRow).height = H_FOOTER;

  tryMerge(ws, footerRow, COL_DAY, footerRow, COL_PAIR);
  const fLabel = cell(ws, footerRow, COL_DAY);
  fLabel.value = 'Կաբ.';
  solidFill(fLabel, BG_HEADER);
  setFont(fLabel, true, 8);
  fLabel.alignment = { horizontal: 'center', vertical: 'middle' };
  uniformBorder(fLabel);
  uniformBorder(cell(ws, footerRow, COL_PAIR));

  classGroups.forEach((grp, gi) => {
    const { sc, rc } = grpCols[gi];
    tryMerge(ws, footerRow, sc, footerRow, rc);
    const fCell = cell(ws, footerRow, sc);
    fCell.value = homeRoom(grp);
    solidFill(fCell, BG_HEADER);
    setFont(fCell, true, 8);
    fCell.alignment = { horizontal: 'center', vertical: 'middle' };
    uniformBorder(fCell);
    uniformBorder(cell(ws, footerRow, rc));
  });

  // ── ՆԵՐԲԵՌՆՈՒՄ ──────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `${institution.name.replace(/\s+/g, '_')}_schedule_${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// import ExcelJS from 'exceljs';
// import type {
//   ScheduleSlot,
//   Institution,
//   ClassGroup,
//   Subject,
//   Teacher,
//   Classroom,
//   Specialization,
// } from '../types';

// // ─── ՇԱԲԱԹՎԱ ՕՐԵՐԻ ԱՄԲՈՂՋԱԿԱՆ ԱՆՎԱՆՈՒՄՆԵՐԸ ─────────────────────────────────────
// const ORDERED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// const DAY_NAMES_HY: Record<string, string> = {
//   Monday:    'Երկուշաբթի',
//   Tuesday:   'Երեքշաբթի',
//   Wednesday: 'Չորեքշաբթի',
//   Thursday:  'Հինգշաբթի',
//   Friday:    'Ուրբաթ',
//   Saturday:  'Շաբաթ',
//   Sunday:    'Կիրակի',
// };

// // ─── ՄՈՆՈԽՐՈՄ ՈՃԱՎՈՐՈՒՄ (ՍԵՎ Ու ՍՊԻՏԱԿ) ──────────────────────────────────────
// const BG_HEADER  = 'FFFFFFFF'; 
// const BG_WHITE   = 'FFFFFFFF'; 

// const THIN: ExcelJS.BorderStyle = 'thin';   
// const MED:  ExcelJS.BorderStyle = 'medium'; 

// // ─── ՃՇԳՐԻՏ ՉԱՓՍԵՐ ԸՍՏ ՊԱՀԱՆՋԻ ──────────────────────────────────────────────
// const W_DAY      = 5;   // Օրվա սյունակ (տեքստը պտտված է 90°)
// const W_PAIR     = 4;   // Զույգի սյունակ ("1-2", "3-4")
// const W_SUBJECT  = 20;  // Առարկայի սյունակի լայնություն
// const W_ROOM     = 6;   // Լսարանի սյունակի լայնություն (ընդհանուր խումբ+լսարան = 26)

// const H_HEADER   = 22;  
// const H_ROW_A    = 48.75; // Վերևի տողի (Առարկա) բարձրությունը ըստ ձեր Excel-ի format-ի
// const H_ROW_B    = 25.5;  // Ներքևի տողի (Դասախոս) բարձրությունը ըստ ձեր Excel-ի format-ի
// const H_FOOTER   = 18;  

// // ─── ՈՃԱՎՈՐՄԱՆ ՕԺԱԴԱԿ ՖՈՒՆԿՑԻԱՆԵՐ (HELPERS) ───────────────────────────────────

// function solidFill(cell: ExcelJS.Cell, argb: string) {
//   cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
// }

// function uniformBorder(cell: ExcelJS.Cell, style: ExcelJS.BorderStyle = THIN) {
//   const s = { style };
//   cell.border = { top: s, left: s, bottom: s, right: s };
// }

// function medBorder(cell: ExcelJS.Cell) {
//   const s = { style: MED };
//   cell.border = { top: s, left: s, bottom: s, right: s };
// }

// // Առարկայի սյունակի խաչում ("X"), երբ դաս չկա
// function crossCell(cell: ExcelJS.Cell) {
//   cell.border = {
//     top:      { style: THIN },
//     left:     { style: THIN },
//     bottom:   { style: THIN },
//     right:    { style: THIN },
//     // @ts-ignore
//     diagonal: { style: THIN, up: true, down: true },
//   };
// }

// // Համարիչ / Հայտարարի համար անկյունագծով կիսվող վանդակ (\)
// function splitDiagonalCell(cell: ExcelJS.Cell) {
//   cell.border = {
//     top:      { style: THIN },
//     left:     { style: THIN },
//     bottom:   { style: THIN },
//     right:    { style: THIN },
//     // @ts-ignore
//     diagonal: { style: THIN, up: false, down: true }, // Անկյունագիծ վերևի ձախից ներքևի աջ
//   };
// }

// function setFont(cell: ExcelJS.Cell, bold = false, size = 8) {
//   cell.font = { name: 'Arial', size, bold };
// }

// function tryMerge(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number) {
//   if (r1 === r2 && c1 === c2) return;
//   try { ws.mergeCells(r1, c1, r2, c2); } catch { /* արդեն միացված է */ }
// }

// function cell(ws: ExcelJS.Worksheet, row: number, col: number): ExcelJS.Cell {
//   return ws.getCell(row, col);
// }

// // ─── ԱՐՏԱՀԱՆՄԱՆ ՀԻՄՆԱԿԱՆ ՖՈՒՆԿՑԻԱՆ ───────────────────────────────────────────
// export async function exportScheduleToExcel(
//   schedule:        ScheduleSlot[],
//   institution:     Institution,
//   classGroups:     ClassGroup[],
//   subjects:        Subject[],
//   teachers:        Teacher[],
//   classrooms:      Classroom[],
//   specializations: Specialization[] = [],
// ): Promise<void> {

//   const subjName = (id: string) => subjects.find(s => s.id === id)?.name ?? id;
//   const teachName = (id: string) => {
//     const t = teachers.find(x => x.id === id);
//     return t ? `${t.firstName} ${t.lastName}` : id;
//   };
//   const roomNum = (id: string) => classrooms.find(c => c.id === id)?.number ?? id;
//   const homeRoom = (g: ClassGroup): string => g.homeRoom ? roomNum(g.homeRoom) : '';

//   const workingDays = ORDERED_DAYS.filter(d => institution.workingDays.includes(d));

//   const staticPairs = [
//     { first: 1, second: 2, label: '1-2' },
//     { first: 3, second: 4, label: '3-4' },
//     { first: 5, second: 6, label: '5-6' },
//     { first: 7, second: 8, label: '7-8' },
//   ];

//   const slotMap = new Map<string, ScheduleSlot>();
//   schedule.forEach(s => {
//     slotMap.set(`${s.classGroupId}|${s.day}|${s.lessonNumber}`, s);
//   });

//   const wb = new ExcelJS.Workbook();
//   wb.creator = institution.name;

//   const ws = wb.addWorksheet('Ժամ.ցույց', {
//     views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }],
//     pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
//   });

//   const COL_DAY   = 1;
//   const COL_PAIR  = 2;
//   const GRP_START = 3;

//   ws.getColumn(COL_DAY).width  = W_DAY;
//   ws.getColumn(COL_PAIR).width = W_PAIR;

//   const grpCols = classGroups.map((_, i) => ({
//     sc: GRP_START + i * 2,     
//     rc: GRP_START + i * 2 + 1, 
//   }));

//   classGroups.forEach((_, i) => {
//     ws.getColumn(grpCols[i].sc).width = W_SUBJECT;
//     ws.getColumn(grpCols[i].rc).width = W_ROOM;
//   });

//   const ROW_WEEKS = 1;
//   const ROW_NAMES = 2; // Խմբի անունների և «Լսարան» բառի տողը
//   const ROW_SEM   = 3; // Ուսումնական տարվա կիսամյակի տողը
//   const DATA_ROW0 = 4;

//   ws.getRow(ROW_WEEKS).height = H_HEADER;
//   ws.getRow(ROW_NAMES).height = H_HEADER;
//   ws.getRow(ROW_SEM).height   = 14;

//   // Ձախ անկյունի գլխամասերի դատարկում
//   tryMerge(ws, ROW_WEEKS, COL_DAY, ROW_WEEKS, COL_PAIR);
//   tryMerge(ws, ROW_NAMES, COL_DAY, ROW_NAMES, COL_PAIR);
//   tryMerge(ws, ROW_SEM,   COL_DAY, ROW_SEM,   COL_PAIR);
//   uniformBorder(cell(ws, ROW_WEEKS, COL_DAY));
//   uniformBorder(cell(ws, ROW_NAMES, COL_DAY));
//   uniformBorder(cell(ws, ROW_SEM,   COL_DAY));

//   // Խմբերի Գլխամասերի Կառուցում (Խումբ | Լսարան ձևաչափով)
//   classGroups.forEach((grp, gi) => {
//     const { sc, rc } = grpCols[gi];
    
//     // Տող 1 - Շաբաթների քանակը (միացված խմբի ու լսարանի վրա)
//     tryMerge(ws, ROW_WEEKS, sc, ROW_WEEKS, rc);
//     const wCell = cell(ws, ROW_WEEKS, sc);
//     wCell.value = specializations.find(s => s.name === grp.specialization || s.code === grp.specialization || s.id === grp.specialization)?.academicWeeks ?? institution.academicWeeks;
//     solidFill(wCell, BG_HEADER);
//     setFont(wCell, false, 8);
//     wCell.alignment = { horizontal: 'center', vertical: 'middle' };
//     uniformBorder(wCell);
//     uniformBorder(cell(ws, ROW_WEEKS, rc));

//     // Տող 2 - Ձախ կողմում Խմբի անունը, Աջ կողմում՝ «Լսարան» բառը (ՉԵՆ ՄԻԱՑՎՈՒՄ)
//     const nameC = cell(ws, ROW_NAMES, sc);
//     nameC.value = grp.name;
//     solidFill(nameC, BG_HEADER);
//     setFont(nameC, true, 8);
//     nameC.alignment = { horizontal: 'center', vertical: 'middle' };
//     uniformBorder(nameC);

//     const roomLabelC = cell(ws, ROW_NAMES, rc);
//     roomLabelC.value = 'Լսարան';
//     solidFill(roomLabelC, BG_HEADER);
//     setFont(roomLabelC, false, 7);
//     roomLabelC.alignment = { horizontal: 'center', vertical: 'middle' textRotation: 90};
//     uniformBorder(roomLabelC);

//     // Տող 3 - Կիսամյակի տողը (մաքուր սպիտակ)
//     tryMerge(ws, ROW_SEM, sc, ROW_SEM, rc);
//     const semC = cell(ws, ROW_SEM, sc);
//     solidFill(semC, BG_WHITE);
//     uniformBorder(semC);
//     uniformBorder(cell(ws, ROW_SEM, rc));
//   });

//   // Բուն Դասացուցակի տողերի լրացում
//   let currentRow = DATA_ROW0;
//   const lastDataCol = GRP_START + classGroups.length * 2 - 1;

//   workingDays.forEach(day => {
//     const dayLabel   = DAY_NAMES_HY[day] ?? day;
//     const dayRowTop  = currentRow;

//     staticPairs.forEach(pair => {
//       const rowA = currentRow;     
//       const rowB = currentRow + 1; 
//       ws.getRow(rowA).height = H_ROW_A; // 48.75 ըստ պահանջի
//       ws.getRow(rowB).height = H_ROW_B; // 25.5 ըստ պահանջի

//       // Ժամերի սյունակ (1-2)
//       tryMerge(ws, rowA, COL_PAIR, rowB, COL_PAIR);
//       const pairCell = cell(ws, rowA, COL_PAIR);
//       pairCell.value = pair.label;
//       solidFill(pairCell, BG_WHITE);
//       pairCell.alignment = { horizontal: 'center', vertical: 'middle' };
//       setFont(pairCell, false, 8);
//       uniformBorder(pairCell);

//       classGroups.forEach((grp, gi) => {
//         const { sc, rc } = grpCols[gi];

//         const slot =
//           slotMap.get(`${grp.id}|${day}|${pair.first}`) ??
//           slotMap.get(`${grp.id}|${day}|${pair.second}`);

//         // 1. ԱԶԱՏ ԺԱՄ -> ԱՌԱՐԿԱՆ ԽԱՉՎՈՒՄ Է, ԼՍԱՐԱՆԸ ՄՆՈՒՄ Է ԼԻՈՎԻՆ ԴԱՏԱՐԿ
//         if (!slot) {
//           tryMerge(ws, rowA, sc, rowB, sc);
//           const eSubj = cell(ws, rowA, sc);
//           solidFill(eSubj, BG_WHITE);
//           crossCell(eSubj);

//           tryMerge(ws, rowA, rc, rowB, rc);
//           const eRoom = cell(ws, rowA, rc);
//           eRoom.value = ''; // Լիովին դատարկ
//           solidFill(eRoom, BG_WHITE);
//           uniformBorder(eRoom); // Սովորական սահմանագծեր առանց խաչի
//         } 
//         // 2. ՀԱՄԱՐԻՉ / ՀԱՅՏԱՐԱՐԻ ԴԵՊՔ -> ԱՆԿՅՈՒՆԱԳԾՈՎ ԿԻՍՈՒՄ
//         else if (slot.pairSubjectId) {
//           tryMerge(ws, rowA, sc, rowB, sc); // Միացնում ենք վանդակը, որ ստանանք մեծ դաշտ
//           const splitCell = cell(ws, rowA, sc);
          
//           const numText = `${subjName(slot.subjectId)}\n(${teachName(slot.teacherId)})`;
//           const denText = `${subjName(slot.pairSubjectId)}\n(${teachName(slot.pairTeacherId ?? slot.teacherId)})`;
          
//           // Տեքստային հնարք՝ Համարիչը ձախից, Հայտարարը աջից տողադարձերով
//           splitCell.value = `${numText}\n\n                                     ${denText}`;
//           solidFill(splitCell, BG_WHITE);
//           splitDiagonalCell(splitCell); // Քաշում է անկյունագծային գիծը (\)
//           setFont(splitCell, false, 7.5);
//           splitCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

//           // Լսարանը մնում է ընդհանուր ու մաքուր
//           tryMerge(ws, rowA, rc, rowB, rc);
//           const rCell = cell(ws, rowA, rc);
//           rCell.value = roomNum(slot.classroomId);
//           solidFill(rCell, BG_WHITE);
//           rCell.alignment = { horizontal: 'center', vertical: 'middle' };
//           setFont(rCell, false, 8);
//           uniformBorder(rCell);
//         } 
//         // 3. ԿԻՍԱՄՅԱԿԱՅԻՆ ՇԱԲԱԹՆԵՐԻ ՓՈՓՈԽՈՒԹՅՈՒՆ (weekSwitch)
//         else if (slot.subjectId2 && slot.weekSwitch) {
//           tryMerge(ws, rowA, sc, rowB, sc);
//           const splitCell = cell(ws, rowA, sc);
          
//           const s1Text = `${subjName(slot.subjectId)}\n(${teachName(slot.teacherId)})`;
//           const s2Text = `${subjName(slot.subjectId2)}\n(${teachName(slot.teacherId2 ?? slot.teacherId)})`;
          
//           splitCell.value = `${s1Text}\n\n                                     ${s2Text}`;
//           solidFill(splitCell, BG_WHITE);
//           splitDiagonalCell(splitCell);
//           setFont(splitCell, false, 7.5);
//           splitCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

//           tryMerge(ws, rowA, rc, rowB, rc);
//           const rCell = cell(ws, rowA, rc);
//           rCell.value = roomNum(slot.classroomId);
//           solidFill(rCell, BG_WHITE);
//           rCell.alignment = { horizontal: 'center', vertical: 'middle' };
//           setFont(rCell, false, 8);
//           uniformBorder(rCell);
//         } 
//         // 4. ՍՈՎՈՐԱԿԱՆ ՄԻԱՏԵՍԱԿ ԴԱՍ (Row A = Առարկա, Row B = Դասախոս)
//         else {
//           const subjC = cell(ws, rowA, sc);
//           subjC.value = subjName(slot.subjectId);
//           solidFill(subjC, BG_WHITE);
//           subjC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
//           setFont(subjC, false, 8);
//           uniformBorder(subjC);

//           const teachC = cell(ws, rowB, sc);
//           teachC.value = teachName(slot.teacherId);
//           solidFill(teachC, BG_WHITE);
//           teachC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
//           setFont(teachC, false, 8);
//           uniformBorder(teachC);

//           tryMerge(ws, rowA, rc, rowB, rc);
//           const rCell = cell(ws, rowA, rc);
//           rCell.value = roomNum(slot.classroomId);
//           solidFill(rCell, BG_WHITE);
//           rCell.alignment = { horizontal: 'center', vertical: 'middle' };
//           setFont(rCell, false, 8);
//           uniformBorder(rCell);
//         }
//       });

//       currentRow += 2;
//     }); 

//     // Օրվա անվան ուղղահայաց միացում (Ամբողջական անուններով)
//     const dayRowBottom = currentRow - 1;
//     tryMerge(ws, dayRowTop, COL_DAY, dayRowBottom, COL_DAY);
//     const dayC = cell(ws, dayRowTop, COL_DAY);
//     dayC.value = dayLabel;
//     solidFill(dayC, BG_HEADER);
//     dayC.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90, wrapText: false };
//     setFont(dayC, true, 8);
//     medBorder(dayC);

//     // Օրերի միջև հաստ սահմանագիծ (Separator)
//     for (let c = COL_PAIR; c <= lastDataCol; c++) {
//       const topC = cell(ws, dayRowTop, c);
//       const existing = topC.border ?? {};
//       topC.border = { ...existing, top: { style: MED } };
//     }

//   }); 

//   // ── ԱՄԵՆԱՆԵՐՔԵՎԻ ՏՈՂ. ՀԻՄՆԱԿԱՆ ԼՍԱՐԱՆՆԵՐ (FOOTER) ───────────────────────────
//   const footerRow = currentRow;
//   ws.getRow(footerRow).height = H_FOOTER;

//   tryMerge(ws, footerRow, COL_DAY, footerRow, COL_PAIR);
//   const fLabel = cell(ws, footerRow, COL_DAY);
//   fLabel.value = 'Կաբ.';
//   solidFill(fLabel, BG_HEADER);
//   setFont(fLabel, true, 8);
//   fLabel.alignment = { horizontal: 'center', vertical: 'middle' };
//   uniformBorder(fLabel);
//   uniformBorder(cell(ws, footerRow, COL_PAIR));

//   classGroups.forEach((grp, gi) => {
//     const { sc, rc } = grpCols[gi];
//     tryMerge(ws, footerRow, sc, footerRow, rc);
//     const fCell = cell(ws, footerRow, sc);
//     fCell.value = homeRoom(grp);
//     solidFill(fCell, BG_HEADER);
//     setFont(fCell, true, 8);
//     fCell.alignment = { horizontal: 'center', vertical: 'middle' };
//     uniformBorder(fCell);
//     uniformBorder(cell(ws, footerRow, rc));
//   });

//   // ── ՆԵՐԲԵՌՆՈՒՄ ──────────────────────────────────────────────────────────────
//   const buffer = await wb.xlsx.writeBuffer();
//   const blob   = new Blob([buffer], {
//     type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//   });
//   const url = URL.createObjectURL(blob);
//   const a   = document.createElement('a');
//   a.href     = url;
//   const date = new Date().toISOString().split('T')[0];
//   a.download = `${institution.name.replace(/\s+/g, '_')}_schedule_${date}.xlsx`;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   URL.revokeObjectURL(url);
// }
