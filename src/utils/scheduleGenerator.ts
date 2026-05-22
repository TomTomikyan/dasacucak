/**
 * ScheduleGenerator - Ժամանակացույցի գեներատոր
 *
 * Զրո-բախման ճարտարապետություն.
 * - Պահվում են կոնֆլիկտների 3 արագ ինդեքսներ՝ խմբի, դասախոսի և լսարանի համար։
 * - this.schedule-ը թույլատրվում է փոխել միայն addSlot() և removeSlot() մեթոդներով։
 *   Այդպես դասը ավելացնելիս կամ հեռացնելիս ինդեքսները միշտ թարմացվում են նույն պահին։
 * - isSlotAvailable-ը ստուգում է զբաղվածությունը O(1) արագությամբ՝ Map/Set lookup-ներով,
 *   ոչ թե ամբողջ schedule-ը հերթով անցնելով։
 * - applyNumeratorDenominator-ի դեպքում երկրորդ դասախոսը/լսարանը նախ գրանցվում են ինդեքսներում,
 *   հետո միայն դրվում են դասի մեջ, որպեսզի գաղտնի բախումներ չառաջանան։
 * - applyParityPairing-ի դեպքում զույգ դասախոսը նույնպես անմիջապես գրանցվում է ինդեքսում։
 * - Վերջում auditCollisions-ը մեկ անգամ ստուգում է ամբողջ գրաֆիկը և GenerationResult-ում վերադարձնում
 *   մնացած հնարավոր բախումների քանակը և հաղորդագրությունները։
 */

import { Institution, ClassGroup, Subject, Teacher, Classroom, ScheduleSlot, Specialization } from '../types';

export interface GenerationResult {
  success: boolean;
  schedule: ScheduleSlot[];
  error?: string;
  collisions: number;
  warnings: string[];
}

export function calculateSubjectWeeks(
  totalHours: number,
  academicWeeks: number,
  pairsPerWeek: number
): { totalPairs: number; weeksCovered: number } {
  const totalPairs = Math.ceil(totalHours / 2);
  const weeksCovered = pairsPerWeek > 0 ? Math.ceil(totalPairs / pairsPerWeek) : academicWeeks;
  return { totalPairs, weeksCovered };
}

export function findParityPairs(
  subjectHoursMap: { subjectId: string; hours: number }[]
): Array<{ subjectId1: string; subjectId2: string }> {
  const oddSubjects = subjectHoursMap.filter(s => s.hours % 2 !== 0);
  const pairs: Array<{ subjectId1: string; subjectId2: string }> = [];
  const used = new Set<string>();
  for (let i = 0; i < oddSubjects.length; i++) {
    if (used.has(oddSubjects[i].subjectId)) continue;
    for (let j = i + 1; j < oddSubjects.length; j++) {
      if (used.has(oddSubjects[j].subjectId)) continue;
      pairs.push({ subjectId1: oddSubjects[i].subjectId, subjectId2: oddSubjects[j].subjectId });
      used.add(oddSubjects[i].subjectId);
      used.add(oddSubjects[j].subjectId);
      break;
    }
  }
  return pairs;
}

interface LessonRequirement {
  id: string;
  groupId: string;
  groupName: string;
  groupObj: ClassGroup;
  subjectId: string;
  subjectName: string;
  subjectType: 'theory' | 'lab';
  availableTeacherIds: string[];
  priority: number;
  lessonIndex: number;
  totalHours: number;
  retries: number;
}

// ---------------------------------------------------------------------------
// Կոնֆլիկտների ինդեքսների օգնական ֆունկցիաներ
// ---------------------------------------------------------------------------

function slotKey(id: string, day: string, lessonNumber: number): string {
  // Բոլոր ինդեքսները նույն ձևաչափի բանալի են օգտագործում։
  // Այդպես խումբը, դասախոսը կամ լսարանը կարող ենք արագ գտնել նույն օր/դասաժամի համար։
  return `${id}|${day}|${lessonNumber}`;
}

export class ScheduleGenerator {
  private institution: Institution;
  private classGroups: ClassGroup[];
  private subjects: Subject[];
  private teachers: Teacher[];
  private classrooms: Classroom[];
  private specializations: Specialization[];

  private schedule: ScheduleSlot[] = [];

  // Կոնֆլիկտների ինդեքսներ՝ reference-count մոտեցմամբ։
  // Այստեղ պահվում է ոչ թե պարզապես զբաղված է/ազատ է, այլ քանի անգամ է տվյալ ռեսուրսը զբաղված։
  // Սա կարևոր է backtracking-ի ժամանակ, որպեսզի մեկ դաս հեռացնելիս պատահաբար չազատենք
  // այն ռեսուրսը, որը դեռ զբաղված է մեկ այլ դասով։
  private groupIndex: Map<string, number> = new Map();     // groupId|օր|դասաժամ -> զբաղվածության քանակ
  private teacherIndex: Map<string, number> = new Map();   // teacherId|օր|դասաժամ -> զբաղվածության քանակ
  private classroomIndex: Map<string, number> = new Map(); // classroomId|օր|դասաժամ -> զբաղվածության քանակ

  private randomSeed: number;
  private requirementMap: Map<string, LessonRequirement> = new Map();

  constructor(
    institution: Institution,
    classGroups: ClassGroup[],
    subjects: Subject[],
    teachers: Teacher[],
    classrooms: Classroom[],
    specializations: Specialization[] = []
  ) {
    this.institution = institution;
    this.classGroups = classGroups;
    this.subjects = subjects;
    this.teachers = teachers;
    this.classrooms = classrooms;
    this.specializations = specializations;
    this.randomSeed = Date.now();
  }

  // Գտնում է խմբի ուսումնական շաբաթների ճիշտ քանակը՝ կապված մասնագիտությունից
  private resolveGroupWeeks(group: ClassGroup): number {
    if (group.specialization) {
      const spec = this.specializations.find(s =>
        s.name === group.specialization ||
        s.code === group.specialization ||
        s.id   === group.specialization
      );
      if (spec?.academicWeeks) return spec.academicWeeks;
    }
    return this.institution.academicWeeks;
  }

  // -------------------------------------------------------------------------
  // Դասի ատոմար փոփոխություն — միայն այս երկու մեթոդները կարող են փոխել this.schedule-ը
  // -------------------------------------------------------------------------

  // ── Ինդեքսների օգնական մեթոդներ ──────────────────────────────────────────────────────────

  private idxAdd(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  private idxDel(map: Map<string, number>, key: string): void {
    const n = (map.get(key) ?? 0) - 1;
    if (n <= 0) map.delete(key);
    else map.set(key, n);
  }

  private idxHas(map: Map<string, number>, key: string): boolean {
    return (map.get(key) ?? 0) > 0;
  }

  // ── Դասերի ատոմար ավելացում/հեռացում ───────────────────────────────────────────────────

  private addSlot(slot: ScheduleSlot): void {
    // Դասը ավելացնելիս միաժամանակ զբաղեցնում ենք խումբը, դասախոսին և լսարանը։
    // Սա պահում է schedule-ը և ինդեքսները նույն վիճակում։
    this.schedule.push(slot);
    this.idxAdd(this.groupIndex,    slotKey(slot.classGroupId, slot.day, slot.lessonNumber));
    this.idxAdd(this.teacherIndex,  slotKey(slot.teacherId,    slot.day, slot.lessonNumber));
    this.idxAdd(this.classroomIndex,slotKey(slot.classroomId,  slot.day, slot.lessonNumber));
    if (slot.teacherId2)    this.idxAdd(this.teacherIndex, slotKey(slot.teacherId2,    slot.day, slot.lessonNumber));
    if (slot.pairTeacherId) this.idxAdd(this.teacherIndex, slotKey(slot.pairTeacherId, slot.day, slot.lessonNumber));
  }

  private removeSlot(slotId: string): void {
    // Դասը հեռացնելիս պարտադիր ազատում ենք նույն ռեսուրսները ինդեքսներից։
    // Եթե դասը չկա, ոչինչ չենք անում։
    const slot = this.schedule.find(s => s.id === slotId);
    if (!slot) return;
    this.schedule = this.schedule.filter(s => s.id !== slotId);
    this.idxDel(this.groupIndex,    slotKey(slot.classGroupId, slot.day, slot.lessonNumber));
    this.idxDel(this.teacherIndex,  slotKey(slot.teacherId,    slot.day, slot.lessonNumber));
    this.idxDel(this.classroomIndex,slotKey(slot.classroomId,  slot.day, slot.lessonNumber));
    if (slot.teacherId2)    this.idxDel(this.teacherIndex, slotKey(slot.teacherId2,    slot.day, slot.lessonNumber));
    if (slot.pairTeacherId) this.idxDel(this.teacherIndex, slotKey(slot.pairTeacherId, slot.day, slot.lessonNumber));
  }

  private clearSchedule(): void {
    // Նոր գեներացում սկսելուց առաջ ամբողջ գրաֆիկը և բոլոր ինդեքսները մաքրում ենք։
    this.schedule = [];
    this.groupIndex.clear();
    this.teacherIndex.clear();
    this.classroomIndex.clear();
  }

  // -------------------------------------------------------------------------
  // Պատահականության / խառնելու օգնական մեթոդներ
  // -------------------------------------------------------------------------

  private seededRandom(): number {
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    return this.randomSeed / 233280;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getOrderedWorkingDays(): string[] {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayOrder.filter(day => this.institution.workingDays.includes(day));
  }

  // -------------------------------------------------------------------------
  // Գրաֆիկի գեներացման գլխավոր մուտքակետ
  // -------------------------------------------------------------------------

  async generateSchedule(logCallback?: (message: string) => void): Promise<GenerationResult> {
    const log = (message: string) => {
      console.log(message);
      if (logCallback) logCallback(message);
    };

    const warnings: string[] = [];

    try {
      this.randomSeed = Date.now() + Math.floor(Math.random() * 10000);
      log(`Using random seed: ${this.randomSeed}`);
      log('Starting smart schedule generation...');

      this.clearSchedule();
      this.requirementMap.clear();

      const validation = this.validateInputData();
      if (!validation.valid) {
        return { success: false, schedule: [], error: validation.error, collisions: 0, warnings };
      }
      log('Input validation passed');

      const teacherGroupValidation = this.validateTeacherGroupAssignments();
      if (!teacherGroupValidation.valid) {
        const msg = `Teacher-group assignment warnings: ${teacherGroupValidation.warnings?.join(', ')}`;
        log(msg);
        warnings.push(...(teacherGroupValidation.warnings ?? []));
      }

      this.logClassroomInfo(log);

      const lessonRequirements = this.generateLessonRequirements();
      log(`Generated ${lessonRequirements.length} lesson requirements`);

      lessonRequirements.forEach(r => this.requirementMap.set(r.id, r));

      const sortedRequirements = this.prioritizeRequirementsWithRandomization(lessonRequirements);
      log('Prioritized and randomized lesson requirements (Most-Constrained-First)');

      const remaining = [...sortedRequirements];
      let scheduledCount = 0;
      let failedCount = 0;

      // Յուրաքանչյուր պահանջի համար փորձերի ընդհանուր սահմանափակում։
      // Այն չի reset լինում, որպեսզի չստացվի անվերջ ցիկլ։
      // Ընդամենը 4 փորձ՝ սովորական փորձ, desperate փորձ, նույն խմբի backtrack, այլ խմբերի backtrack։
      const MAX_GLOBAL_ATTEMPTS = 4;
      const attemptBudget = new Map<string, number>();

      const useAttempt = (id: string): boolean => {
        const used = (attemptBudget.get(id) ?? 0) + 1;
        attemptBudget.set(id, used);
        return used <= MAX_GLOBAL_ATTEMPTS;
      };

      const budgetLeft = (id: string): boolean =>
        (attemptBudget.get(id) ?? 0) < MAX_GLOBAL_ATTEMPTS;

      // Watchdog՝ ցիկլերի կոշտ սահմանափակում։
      // Եթե ալգորիթմը շատ երկար պտտվի, գեներացումը կանգնեցվում է՝ անվերջ ցիկլից խուսափելու համար։
      const WATCHDOG_LIMIT = sortedRequirements.length * (MAX_GLOBAL_ATTEMPTS * 2 + 2);
      let iterations = 0;

      while (remaining.length > 0) {
        iterations++;
        if (iterations > WATCHDOG_LIMIT) {
          log(`WATCHDOG: iteration limit (${WATCHDOG_LIMIT}) reached — aborting remaining ${remaining.length} requirement(s)`);
          remaining.forEach(r => {
            failedCount++;
            warnings.push(`Watchdog aborted: ${r.subjectName} for ${r.groupName}`);
          });
          break;
        }

        const requirement = remaining.shift()!;

        // Եթե այս պահանջի փորձերի սահմանը սպառվել է, այն բաց ենք թողնում։
        if (!budgetLeft(requirement.id)) {
          failedCount++;
          warnings.push(`Failed to schedule: ${requirement.subjectName} for ${requirement.groupName}`);
          this.analyzeSchedulingFailure(requirement, log);
          continue;
        }

        useAttempt(requirement.id);
        const success = await this.scheduleLesson(requirement, log);

        if (success) {
          scheduledCount++;
        } else if (budgetLeft(requirement.id)) {
          // 2-րդ փորձ՝ փորձում ենք տեղադրել ավելի ազատ կանոններով, դեռ առանց backtracking-ի։
          useAttempt(requirement.id);
          const desperate = await this.scheduleLessonDesperate(requirement, log);
          if (desperate) {
            scheduledCount++;
          } else if (budgetLeft(requirement.id)) {
            // 3-րդ փորձ՝ նույն խմբի backtracking․ հեռացնում ենք խմբի վերջին մի քանի դասերը և նորից փորձում։
            useAttempt(requirement.id);
            const requeued = this.backtrackForGroup(requirement.groupId, 3, log);
            if (requeued.length > 0) {
              // Հեռացված դասերը դնում ենք հերթի ՎԵՐՋՈՒՄ, ոչ թե սկզբում, որպեսզի ալգորիթմը չսկսի տեղում պտտվել։
              // Նրանց փորձերի քանակը նախապես ավելացնում ենք, որ նույն ձևով անվերջ չվերադառնան։
              requeued.forEach(r => {
                attemptBudget.set(r.id, (attemptBudget.get(r.id) ?? 0) + 1);
              });
              remaining.push(...requeued, requirement);
            } else if (budgetLeft(requirement.id)) {
              // 4-րդ փորձ՝ այլ խմբերի դասերի backtracking, եթե հենց դրանք են խանգարում տեղադրմանը։
              useAttempt(requirement.id);
              const displaced = this.backtrackForBlockers(requirement, log);
              if (displaced.length > 0) {
                // Նույն տրամաբանությամբ՝ հեռացված դասերը գնում են հերթի վերջ, իսկ փորձերի քանակը ավելացվում է։
                displaced.forEach(r => {
                  attemptBudget.set(r.id, (attemptBudget.get(r.id) ?? 0) + 1);
                });
                remaining.push(...displaced, requirement);
              } else {
                failedCount++;
                warnings.push(`Failed to schedule: ${requirement.subjectName} for ${requirement.groupName}`);
                this.analyzeSchedulingFailure(requirement, log);
              }
            } else {
              failedCount++;
              warnings.push(`Failed to schedule: ${requirement.subjectName} for ${requirement.groupName}`);
              this.analyzeSchedulingFailure(requirement, log);
            }
          } else {
            failedCount++;
            warnings.push(`Failed to schedule: ${requirement.subjectName} for ${requirement.groupName}`);
            this.analyzeSchedulingFailure(requirement, log);
          }
        } else {
          failedCount++;
          warnings.push(`Failed to schedule: ${requirement.subjectName} for ${requirement.groupName}`);
          this.analyzeSchedulingFailure(requirement, log);
        }
      }

      log(`Scheduling complete: ${scheduledCount} scheduled, ${failedCount} failed`);

      if (scheduledCount === 0) {
        return {
          success: false,
          schedule: [],
          error: 'No lessons could be scheduled. Check teacher availability and classroom assignments.',
          collisions: 0,
          warnings,
        };
      }

      this.optimizeScheduleDistribution(log);
      this.applyParityPairing(log);

      const collisionReport = this.auditCollisions(log);
      warnings.push(...collisionReport.messages);

      log(`Audit complete: ${collisionReport.count} collision(s) found`);

      return {
        success: true,
        schedule: this.schedule,
        collisions: collisionReport.count,
        warnings,
      };
    } catch (error) {
      log(`Generation error: ${error}`);
      return {
        success: false,
        schedule: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        collisions: 0,
        warnings,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Վերջնական ստուգում՝ բախումների հայտնաբերում
  // -------------------------------------------------------------------------

  private auditCollisions(log: (m: string) => void): { count: number; messages: string[] } {
    const messages: string[] = [];

    // Կառուցում ենք ցուցակներ յուրաքանչյուր ռեսուրսի համար՝ entity + օր + դասաժամ բանալիով։
    // Ներառում ենք նաև երկրորդ դասախոսներին և զույգ դասախոսներին։
    const groupMap = new Map<string, string[]>();    // բանալի -> դասերի id-ներ
    const teacherMap = new Map<string, string[]>();
    const classroomMap = new Map<string, string[]>();

    const register = (map: Map<string, string[]>, key: string, slotId: string) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slotId);
    };

    this.schedule.forEach(slot => {
      const gk = slotKey(slot.classGroupId, slot.day, slot.lessonNumber);
      const tk = slotKey(slot.teacherId, slot.day, slot.lessonNumber);
      const rk = slotKey(slot.classroomId, slot.day, slot.lessonNumber);
      register(groupMap, gk, slot.id);
      register(teacherMap, tk, slot.id);
      register(classroomMap, rk, slot.id);

      // Երկրորդ դասախոս՝ numerator/denominator դեպքերի համար
      if (slot.teacherId2) {
        register(teacherMap, slotKey(slot.teacherId2, slot.day, slot.lessonNumber), slot.id);
      }
      // Զույգ դասախոս՝ parity pairing-ի համար
      if (slot.pairTeacherId) {
        register(teacherMap, slotKey(slot.pairTeacherId, slot.day, slot.lessonNumber), slot.id);
      }
    });

    let count = 0;

    groupMap.forEach((ids, key) => {
      if (ids.length > 1) {
        count++;
        const [gid, day, ln] = key.split('|');
        const group = this.classGroups.find(g => g.id === gid);
        const msg = `COLLISION: Group ${group?.name ?? gid} has ${ids.length} lessons on ${day} lesson ${ln}`;
        log(msg);
        messages.push(msg);
      }
    });

    teacherMap.forEach((ids, key) => {
      if (ids.length > 1) {
        count++;
        const [tid, day, ln] = key.split('|');
        const teacher = this.teachers.find(t => t.id === tid);
        const name = teacher ? `${teacher.firstName} ${teacher.lastName}` : tid;
        const msg = `COLLISION: Teacher ${name} has ${ids.length} lessons on ${day} lesson ${ln}`;
        log(msg);
        messages.push(msg);
      }
    });

    classroomMap.forEach((ids, key) => {
      if (ids.length > 1) {
        count++;
        const [cid, day, ln] = key.split('|');
        const room = this.classrooms.find(c => c.id === cid);
        const msg = `COLLISION: Room ${room?.number ?? cid} has ${ids.length} lessons on ${day} lesson ${ln}`;
        log(msg);
        messages.push(msg);
      }
    });

    return { count, messages };
  }

  // -------------------------------------------------------------------------
  // Backtracking՝ արդեն դրված դասերի ժամանակավոր հեռացում
  // -------------------------------------------------------------------------

  private backtrackForGroup(
    groupId: string,
    removeCount: number,
    log: (m: string) => void
  ): LessonRequirement[] {
    const groupSlots = this.schedule.filter(s => s.classGroupId === groupId);
    if (groupSlots.length === 0) return [];

    const toRemove = groupSlots.slice(-Math.min(removeCount, groupSlots.length));
    if (toRemove.length > 0) {
      log(`Backtracked: removing ${toRemove.length} slots for group ${groupId}`);
    }

    const subjectIndexCounter = new Map<string, number>();
    const requeued: LessonRequirement[] = [];

    toRemove.forEach(slot => {
      this.removeSlot(slot.id);

      const remaining = this.schedule.filter(s => s.classGroupId === groupId && s.subjectId === slot.subjectId).length;
      const nextIndex = subjectIndexCounter.get(slot.subjectId) ?? remaining;
      subjectIndexCounter.set(slot.subjectId, nextIndex + 1);

      const reqId = `${groupId}-${slot.subjectId}-${nextIndex}`;
      const original = this.requirementMap.get(reqId);

      if (original) {
        requeued.push({ ...original, retries: 0 });
      } else {
        const subject = this.subjects.find(s => s.id === slot.subjectId);
        const group = this.classGroups.find(g => g.id === groupId);
        if (subject && group) {
          const validTeacherIds = subject.teacherIds.filter(tid => {
            const t = this.teachers.find(x => x.id === tid);
            return t && t.assignedClassGroups.includes(groupId);
          });
          const yearlyHours = group.subjectHours?.[slot.subjectId] ?? 0;
          requeued.push({
            id: reqId,
            groupId,
            groupName: group.name,
            groupObj: group,
            subjectId: slot.subjectId,
            subjectName: subject.name,
            subjectType: subject.type,
            availableTeacherIds: validTeacherIds,
            priority: this.calcPriority(subject, group, validTeacherIds, yearlyHours),
            lessonIndex: nextIndex,
            totalHours: yearlyHours,
            retries: 0,
          });
        }
      }
    });

    return requeued;
  }

  // -------------------------------------------------------------------------
  // Cross-group backtracking — հեռացնում ենք ԱՅԼ խմբերի այն դասերը, որոնք խանգարում են տվյալ պահանջին
  // -------------------------------------------------------------------------

  private backtrackForBlockers(
    req: LessonRequirement,
    log: (m: string) => void
  ): LessonRequirement[] {
    // Հավաքում ենք լսարանները, որոնք կարող են օգտագործվել այս առարկայի համար
    const neededRoomIds = new Set(
      this.getSuitableClassroomsForSubjectType(req.subjectType, req.subjectId, req.groupObj)
        .map(c => c.id)
    );
    if (neededRoomIds.size === 0) return [];

    const days = this.getOrderedWorkingDays();
    const blockingSlotIds = new Set<string>();

    // Փնտրում ենք օր/դասաժամ զույգեր, որտեղ խումբը ազատ է, բայց անհրաժեշտ լսարանները զբաղված են
    for (const day of days) {
      for (let ln = 1; ln <= this.institution.lessonsPerDay; ln++) {
        // Խումբը տվյալ ժամին պետք է ազատ լինի
        if (this.idxHas(this.groupIndex, slotKey(req.groupId, day, ln))) continue;
        // Գոնե մեկ նշանակված դասախոս պետք է այդ ժամին հասանելի և ազատ լինի
        const teacherFree = req.availableTeacherIds.some(tid => {
          const t = this.teachers.find(x => x.id === tid);
          return t?.availableHours[day]?.includes(ln) && !this.idxHas(this.teacherIndex, slotKey(tid, day, ln));
        });
        if (!teacherFree) continue;

        // Եթե տվյալ օր/դասաժամին բոլոր անհրաժեշտ լսարանները զբաղված են, հավաքում ենք խանգարող դասերը
        for (const roomId of neededRoomIds) {
          if (this.idxHas(this.classroomIndex, slotKey(roomId, day, ln))) {
            // Գտնում ենք այն դասը, որը այլ խմբից է և զբաղեցրել է այս լսարանը
            const blocker = this.schedule.find(
              s => s.classroomId === roomId && s.day === day && s.lessonNumber === ln
                && s.classGroupId !== req.groupId
            );
            if (blocker) blockingSlotIds.add(blocker.id);
          }
        }
      }
    }

    if (blockingSlotIds.size === 0) return [];

    log(`Cross-group backtrack for ${req.subjectName} (${req.groupName}): evicting ${blockingSlotIds.size} blocking slot(s)`);

    const requeued: LessonRequirement[] = [];
    const subjectIndexCounter = new Map<string, number>();

    for (const slotId of blockingSlotIds) {
      const slot = this.schedule.find(s => s.id === slotId);
      if (!slot) continue;

      const gid = slot.classGroupId;
      const subId = slot.subjectId;

      this.removeSlot(slotId);

      const remaining = this.schedule.filter(s => s.classGroupId === gid && s.subjectId === subId).length;
      const key = `${gid}-${subId}`;
      const nextIndex = subjectIndexCounter.get(key) ?? remaining;
      subjectIndexCounter.set(key, nextIndex + 1);

      const reqId = `${gid}-${subId}-${nextIndex}`;
      const original = this.requirementMap.get(reqId);

      if (original) {
        requeued.push({ ...original, retries: 0 });
      } else {
        const subject = this.subjects.find(s => s.id === subId);
        const group = this.classGroups.find(g => g.id === gid);
        if (subject && group) {
          const validTeacherIds = subject.teacherIds.filter(tid => {
            const t = this.teachers.find(x => x.id === tid);
            return t && t.assignedClassGroups.includes(gid);
          });
          const yearlyHours = group.subjectHours?.[subId] ?? 0;
          requeued.push({
            id: reqId,
            groupId: gid,
            groupName: group.name,
            groupObj: group,
            subjectId: subId,
            subjectName: subject.name,
            subjectType: subject.type,
            availableTeacherIds: validTeacherIds,
            priority: this.calcPriority(subject, group, validTeacherIds, yearlyHours),
            lessonIndex: nextIndex,
            totalHours: yearlyHours,
            retries: 0,
          });
        }
      }
    }

    return requeued;
  }

  // -------------------------------------------------------------------------
  // Մուտքային տվյալների վավերացում
  // -------------------------------------------------------------------------

  private validateInputData(): { valid: boolean; error?: string } {
    if (this.classGroups.length === 0) return { valid: false, error: 'No class groups configured' };
    if (this.subjects.length === 0) return { valid: false, error: 'No subjects configured' };
    if (this.teachers.length === 0) return { valid: false, error: 'No teachers configured' };
    if (this.classrooms.length === 0) return { valid: false, error: 'No classrooms configured' };
    const groupsWithSubjects = this.classGroups.filter(g => Object.keys(g.subjectHours || {}).length > 0);
    if (groupsWithSubjects.length === 0) return { valid: false, error: 'No subjects assigned to any groups' };
    const subjectsWithTeachers = this.subjects.filter(s => s.teacherIds.length > 0);
    if (subjectsWithTeachers.length === 0) return { valid: false, error: 'No teachers assigned to any subjects' };
    return { valid: true };
  }

  private validateTeacherGroupAssignments(): { valid: boolean; warnings?: string[] } {
    const warnings: string[] = [];
    this.teachers.forEach(teacher => {
      if (teacher.assignedClassGroups.length === 0)
        warnings.push(`Teacher ${teacher.firstName} ${teacher.lastName} has no assigned groups`);
    });
    this.classGroups.forEach(group => {
      if (!this.teachers.some(t => t.assignedClassGroups.includes(group.id)))
        warnings.push(`Group ${group.name} has no assigned teachers`);
    });
    return { valid: warnings.length === 0, warnings: warnings.length > 0 ? warnings : undefined };
  }

  private logClassroomInfo(log: (message: string) => void): void {
    const specializedLabs = this.classrooms.filter(c => c.type === 'lab' && c.specialization);
    if (specializedLabs.length > 0) {
      log('Specialized laboratories detected:');
      specializedLabs.forEach(lab => {
        const names = (lab.specialization?.split(', ').filter(Boolean) || []).map(id => {
          const s = this.subjects.find(x => x.id === id);
          return s ? s.name : id;
        });
        log(`   Room ${lab.number}: ${names.join(', ')}`);
      });
    }
    const teacherLabs = this.classrooms.filter(c => c.type === 'teacher_lab');
    if (teacherLabs.length > 0) {
      log('Teacher labs detected:');
      teacherLabs.forEach(lab => {
        const owner = this.teachers.find(t => t.homeClassroom === lab.id);
        log(`   Room ${lab.number}: ${owner ? `Owned by ${owner.firstName} ${owner.lastName}` : 'No assigned owner'}`);
      });
    }
    const groupsWithHomeRooms = this.classGroups.filter(g => g.homeRoom);
    if (groupsWithHomeRooms.length > 0) {
      log('Group home classrooms:');
      groupsWithHomeRooms.forEach(group => {
        const hc = this.classrooms.find(c => c.id === group.homeRoom);
        if (hc) log(`   Group ${group.name}: Home room ${hc.number}`);
      });
    }
    log('Teacher-group assignments:');
    this.teachers.forEach(teacher => {
      if (teacher.assignedClassGroups.length > 0) {
        const names = teacher.assignedClassGroups.map(gid => this.classGroups.find(x => x.id === gid)?.name ?? gid);
        log(`   ${teacher.firstName} ${teacher.lastName}: Groups ${names.join(', ')}`);
      } else {
        log(`   ${teacher.firstName} ${teacher.lastName}: No assigned groups`);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Դասերի պահանջների գեներացում
  // -------------------------------------------------------------------------

  private generateLessonRequirements(): LessonRequirement[] {
    const requirements: LessonRequirement[] = [];
    this.classGroups.forEach(group => {
      Object.entries(group.subjectHours || {}).forEach(([subjectId, yearlyHours]) => {
        if (yearlyHours <= 0) return;
        const subject = this.subjects.find(s => s.id === subjectId);
        if (!subject || subject.teacherIds.length === 0) return;
        const validTeacherIds = subject.teacherIds.filter(tid => {
          const t = this.teachers.find(x => x.id === tid);
          return t && t.assignedClassGroups.includes(group.id);
        });
        if (validTeacherIds.length === 0) {
          console.warn(`No valid teachers for ${subject.name} in group ${group.name} - skipping`);
          return;
        }
        const groupWeeks = this.resolveGroupWeeks(group);
        const weeklyHours = Math.ceil(yearlyHours / groupWeeks);
        for (let i = 0; i < weeklyHours; i++) {
          requirements.push({
            id: `${group.id}-${subjectId}-${i}`,
            groupId: group.id,
            groupName: group.name,
            groupObj: group,
            subjectId: subject.id,
            subjectName: subject.name,
            subjectType: subject.type,
            availableTeacherIds: validTeacherIds,
            priority: this.calcPriority(subject, group, validTeacherIds, yearlyHours),
            lessonIndex: i,
            totalHours: yearlyHours,
            retries: 0,
          });
        }
      });
    });
    return requirements;
  }

  private calcPriority(subject: Subject, group: ClassGroup, validTeacherIds: string[], yearlyHours: number): number {
    let p = 0;
    if (subject.type === 'lab') p -= 200;
    if (this.classrooms.some(c => c.type === 'lab' && c.specialization?.split(', ').includes(subject.id))) p -= 400;
    const maxT = Math.max(1, ...this.subjects.map(s => s.teacherIds.length));
    p -= (maxT - validTeacherIds.length) * 150;
    p -= Math.ceil(yearlyHours / 2) * 10;
    return p;
  }

  private prioritizeRequirementsWithRandomization(reqs: LessonRequirement[]): LessonRequirement[] {
    const sorted = [...reqs].sort((a, b) => a.priority - b.priority);
    const groups = new Map<number, LessonRequirement[]>();
    sorted.forEach(r => {
      if (!groups.has(r.priority)) groups.set(r.priority, []);
      groups.get(r.priority)!.push(r);
    });
    const result: LessonRequirement[] = [];
    Array.from(groups.keys()).sort((a, b) => a - b).forEach(p => result.push(...this.shuffleArray(groups.get(p)!)));
    return result;
  }

  // -------------------------------------------------------------------------
  // Գրաֆիկի կառուցման հիմնական մաս
  // -------------------------------------------------------------------------

  private async scheduleLesson(req: LessonRequirement, log: (m: string) => void): Promise<boolean> {
    // Սովորական տեղադրում․ նախ գտնում ենք բոլոր հնարավոր տարբերակները, հետո ընտրում ենք լավագույնը։
    const slots = this.findAvailableSlots(req);
    if (slots.length === 0) { log(`No slots for ${req.subjectName} - ${req.groupName}`); return false; }
    const best = this.selectBestSlot(slots, req, false);
    if (!best) return false;
    this.addSlot(best);
    const room = this.classrooms.find(c => c.id === best.classroomId);
    const teacher = this.teachers.find(t => t.id === best.teacherId);
    log(`Scheduled ${req.subjectName} for ${req.groupName} on ${best.day} L${best.lessonNumber} room ${room?.number} with ${teacher?.firstName} ${teacher?.lastName}`);
    return true;
  }

  private async scheduleLessonDesperate(req: LessonRequirement, log: (m: string) => void): Promise<boolean> {
    const slots = this.findAvailableSlots(req);
    if (slots.length === 0) return false;
    const best = this.selectBestSlot(slots, req, true);
    if (!best) return false;
    this.addSlot(best);
    const room = this.classrooms.find(c => c.id === best.classroomId);
    const teacher = this.teachers.find(t => t.id === best.teacherId);
    log(`[Desperate] Scheduled ${req.subjectName} for ${req.groupName} on ${best.day} L${best.lessonNumber} room ${room?.number} with ${teacher?.firstName} ${teacher?.lastName}`);
    return true;
  }

  // -------------------------------------------------------------------------
  // Հասանելի դասաժամերի որոնում
  // -------------------------------------------------------------------------

  private findAvailableSlots(req: LessonRequirement): ScheduleSlot[] {
    // Այս մեթոդը չի փոխում schedule-ը․ միայն հավաքում է հնարավոր տարբերակները։
    // Իրական ավելացումը կատարվում է միայն addSlot()-ով։
    const seen = new Set<string>();
    const slots: ScheduleSlot[] = [];
    const days = this.shuffleArray(this.getOrderedWorkingDays());
    const lessons = this.shuffleArray(Array.from({ length: this.institution.lessonsPerDay }, (_, i) => i + 1));

    days.forEach(day => {
      lessons.forEach(ln => {
        this.shuffleArray(req.availableTeacherIds).forEach(tid => {
          const teacher = this.teachers.find(t => t.id === tid);
          if (!teacher) return;
          if (!teacher.assignedClassGroups.includes(req.groupId)) return;
          if (!teacher.availableHours[day]?.includes(ln)) return;

          this.shuffleArray(
            this.getSuitableClassroomsForTeacher(req.subjectType, req.subjectId, tid, req.groupObj)
          ).forEach(classroom => {
            if (!this.isSlotAvailable(req.groupId, tid, classroom.id, day, ln, req.subjectId)) return;
            // Կրկնությունները հեռացնում ենք օր + դասաժամ + դասախոս + լսարան կոմբինացիայով։
            // Այս կոմբինացիան պետք է եզակի լինի։
            const key = `${day}-${ln}-${tid}-${classroom.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            const { startTime, endTime } = this.calculateLessonTime(ln);
            // Ստեղծում ենք կայուն և գլոբալ եզակի ID, որպեսզի կրկնակի փորձերի ժամանակ ID-ները չբախվեն։
            slots.push({
              id: `${req.groupId}-${req.subjectId}-${req.lessonIndex}-${day}-${ln}-${tid}-${classroom.id}`,
              day, lessonNumber: ln,
              classGroupId: req.groupId,
              subjectId: req.subjectId,
              teacherId: tid, classroomId: classroom.id,
              startTime, endTime,
            });
          });
        });
      });
    });

    return slots;
  }

  // -------------------------------------------------------------------------
  // Դասաժամի հասանելիության O(1) ստուգում՝ երեք ինդեքսների միջոցով
  // -------------------------------------------------------------------------

  private isSlotAvailable(
    groupId: string,
    teacherId: string,
    classroomId: string,
    day: string,
    lessonNumber: number,
    subjectId: string
  ): boolean {
    // Արագ O(1) կոնֆլիկտի ստուգումներ
    if (this.idxHas(this.groupIndex,    slotKey(groupId,    day, lessonNumber))) return false;
    if (this.idxHas(this.teacherIndex,  slotKey(teacherId,  day, lessonNumber))) return false;
    if (this.idxHas(this.classroomIndex,slotKey(classroomId,day, lessonNumber))) return false;

    const classroom = this.classrooms.find(c => c.id === classroomId);

    // Դասախոսի անձնական լաբորատորիայի ստուգում
    if (classroom?.type === 'teacher_lab') {
      const owner = this.teachers.find(t => t.homeClassroom === classroom.id);
      if (owner && owner.id !== teacherId) return false;
    }

    // Ունիվերսալ լսարանի խմբային սահմանափակման ստուգում
    if (classroom?.type === 'universal' && classroom.assignedGroupId) {
      if (classroom.assignedGroupId !== groupId) return false;
    }

    // Մասնագիտացված լսարան․ առարկան պետք է լինի թույլատրվածների ցանկում։
    // Սա ստուգվում է ՄԻՆՉԵՎ լսարանը զբաղեցնելը։
    if ((classroom?.type === 'lab' || classroom?.type === 'universal') && classroom.specialization) {
      const allowed = classroom.specialization.split(', ').filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(subjectId)) return false;
    }

    return true;
  }

  // -------------------------------------------------------------------------
  // Դասաժամի ընտրություն և գնահատում
  // -------------------------------------------------------------------------

  private selectBestSlot(slots: ScheduleSlot[], req: LessonRequirement, desperate: boolean): ScheduleSlot | null {
    if (slots.length === 0) return null;
    const scored = slots.map(s => ({ slot: s, score: this.scoreSlot(s, req, desperate) }));
    scored.sort((a, b) => b.score - a.score);
    // Ընտրում ենք լավագույն մոտ 10 տարբերակներից պատահականը։
    // Այսպես գրաֆիկը միօրինակ չի ստացվում, բայց լավ տարբերակները մնում են առաջնային։
    const topN = Math.min(10, scored.length);
    const pool = scored.slice(0, topN);
    return pool[Math.floor(this.seededRandom() * pool.length)].slot;
  }

  private scoreSlot(slot: ScheduleSlot, req: LessonRequirement, desperate: boolean): number {
    // Որքան բարձր է score-ը, այնքան ավելի լավ է տվյալ դասաժամը։
    // Հաշվի ենք առնում օրերի բաշխումը, փոսերը, լսարանի նախընտրությունը և դասախոսի հարմարությունը։
    let score = 0;
    const days = this.getOrderedWorkingDays();
    score += (days.length - days.indexOf(slot.day)) * 2;

    const groupDayLessons = this.schedule
      .filter(s => s.classGroupId === slot.classGroupId && s.day === slot.day)
      .map(s => s.lessonNumber)
      .sort((a, b) => a - b);

    if (groupDayLessons.length === 0) {
      // Եթե օրը դատարկ է, նախընտրում ենք վաղ դասաժամերը։
      if (slot.lessonNumber === 1) score += 300;
      else if (slot.lessonNumber === 2) score += 200;
      else score -= (slot.lessonNumber - 2) * 20;
    } else {
      const min = groupDayLessons[0];
      const max = groupDayLessons[groupDayLessons.length - 1];
      if (slot.lessonNumber === max + 1 || slot.lessonNumber === min - 1) {
        // Եթե դասաժամը կպնում է արդեն եղած բլոկին, դա լավագույն տարբերակ է։
        score += 400;
      } else {
        // «Փոսերի» համար տրվում է միայն մեղմ տուգանք, ոչ թե կոշտ արգելք։
        // Desperate ռեժիմում այս տուգանքը ամբողջությամբ հանվում է։
        if (this.wouldIntroduceGap(groupDayLessons, slot.lessonNumber)) {
          score += desperate ? 0 : -200;
        } else {
          // Նույն առարկայի հարակից երկու դասաժամը նույն օրը ընդունելի է։
          const sameSubjOnDay = this.schedule.filter(
            s => s.classGroupId === slot.classGroupId && s.subjectId === slot.subjectId && s.day === slot.day
          );
          if (sameSubjOnDay.some(l => Math.abs(l.lessonNumber - slot.lessonNumber) === 1)) {
            score += 50;
          }
        }
      }
    }

    // Մեղմ տուգանք՝ մեկ օրը չափից շատ ծանրաբեռնելու համար։
    score -= groupDayLessons.length * 10;

    // Լսարանի նախընտրություններ
    if (slot.classroomId === req.groupObj.homeRoom) score += 150;
    const teacher = this.teachers.find(t => t.id === slot.teacherId);
    if (teacher?.homeClassroom === slot.classroomId) score += 100;
    const classroom = this.classrooms.find(c => c.id === slot.classroomId);
    if ((classroom?.type === 'lab' || classroom?.type === 'universal') && classroom.specialization?.split(', ').includes(req.subjectId)) score += 50;

    score += this.calcSameSubjectDistribution(slot, req);
    score += this.calcConsecutiveTeacher(slot);
    score += this.seededRandom() * 5;
    return score;
  }

  private wouldIntroduceGap(existing: number[], candidate: number): boolean {
    if (existing.length === 0) return false;
    const sorted = [...existing, candidate].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] > 1) return true;
    return false;
  }

  private calcSameSubjectDistribution(slot: ScheduleSlot, req: LessonRequirement): number {
    const same = this.schedule.filter(s => s.classGroupId === slot.classGroupId && s.subjectId === slot.subjectId && s.day === slot.day);
    if (same.length === 0) {
      // Եթե հնարավոր է, նույն առարկայի դասերը տարածում ենք տարբեր օրերի վրա։
      const alreadyOnOtherDays = this.schedule.filter(s => s.classGroupId === slot.classGroupId && s.subjectId === slot.subjectId && s.day !== slot.day).length;
      return alreadyOnOtherDays > 0 ? 100 : 200;
    }
    if (same.length === 1) {
      // Նույն օրվա հարակից դասաժամերը ընդունելի են՝ որպես կրկնակի դասաժամ։
      return Math.abs(same[0].lessonNumber - slot.lessonNumber) === 1 ? 30 : -80;
    }
    // Նույն առարկայի 3 կամ ավելի դասաժամը մեկ օրում ցանկալի չէ, բայց ամբողջությամբ չի արգելվում։
    return -120;
  }

  private calcConsecutiveTeacher(slot: ScheduleSlot): number {
    const same = this.schedule.filter(s => s.classGroupId === slot.classGroupId && s.teacherId === slot.teacherId && s.day === slot.day);
    if (same.length === 0) return 0;
    return same.some(l => Math.abs(l.lessonNumber - slot.lessonNumber) === 1) ? 30 : -10;
  }

  // -------------------------------------------------------------------------
  // Լսարանների ընտրության օգնական մեթոդներ
  // -------------------------------------------------------------------------

  private getSuitableClassroomsForTeacher(
    subjectType: 'theory' | 'lab',
    subjectId: string,
    teacherId: string,
    group: ClassGroup
  ): Classroom[] {
    const universal = this.classrooms.find(c => c.type === 'universal' && c.assignedGroupId === group.id);
    if (universal) return [universal];

    if (subjectType === 'lab') {
      const specialized = this.getSpecializedClassrooms(subjectId);
      if (specialized.length > 0) return specialized;
      const genericLabs = this.classrooms.filter(c =>
        (c.type === 'lab' || (c.type === 'universal' && !c.assignedGroupId)) &&
        (!c.specialization || c.specialization.trim() === '')
      );
      if (genericLabs.length > 0) return genericLabs;
      // Պահուստային տարբերակ․ օգտագործում ենք ցանկացած հասանելի լսարան, որպեսզի դասը չկորչի։
      return this.classrooms.filter(c => c.type !== 'universal' || !c.assignedGroupId);
    }

    const result: Classroom[] = [];
    if (group.homeRoom) {
      const hc = this.classrooms.find(c => c.id === group.homeRoom);
      if (hc && (hc.type === 'theory' || hc.type === 'universal')) result.push(hc);
    }
    const teacher = this.teachers.find(t => t.id === teacherId);
    if (teacher?.homeClassroom) {
      const tl = this.classrooms.find(c => c.id === teacher.homeClassroom);
      if (tl && tl.type === 'teacher_lab' && !result.some(x => x.id === tl.id)) result.push(tl);
    }
    result.push(...this.classrooms.filter(c =>
      (c.type === 'theory' || (c.type === 'universal' && !c.assignedGroupId)) && !result.some(x => x.id === c.id)
    ));
    result.push(...this.classrooms.filter(c =>
      c.type === 'teacher_lab' && !result.some(x => x.id === c.id) && !this.teachers.some(t => t.homeClassroom === c.id)
    ));
    // Պահուստային տարբերակ․ եթե ոչինչ չհամապատասխանեց, ավելացնում ենք բոլոր հնարավոր լսարանները, որպեսզի դասը չկորչի։
    if (result.length === 0) {
      result.push(...this.classrooms.filter(c => c.type !== 'universal' || !c.assignedGroupId));
    }
    return result;
  }

  private getSuitableClassroomsForSubjectType(subjectType: string, subjectId: string, group: ClassGroup): Classroom[] {
    const universal = this.classrooms.find(c => c.type === 'universal' && c.assignedGroupId === group.id);
    if (universal) return [universal];
    if (subjectType === 'lab') {
      const specialized = this.getSpecializedClassrooms(subjectId);
      if (specialized.length > 0) return specialized;
      const genericLabs = this.classrooms.filter(c =>
        (c.type === 'lab' || (c.type === 'universal' && !c.assignedGroupId)) &&
        (!c.specialization || c.specialization.trim() === '')
      );
      if (genericLabs.length > 0) return genericLabs;
      return this.classrooms.filter(c => c.type !== 'universal' || !c.assignedGroupId);
    }
    const result: Classroom[] = [];
    if (group.homeRoom) {
      const hc = this.classrooms.find(c => c.id === group.homeRoom);
      if (hc && (hc.type === 'theory' || hc.type === 'universal')) result.push(hc);
    }
    result.push(...this.classrooms.filter(c =>
      (c.type === 'theory' || (c.type === 'universal' && !c.assignedGroupId)) && !result.some(x => x.id === c.id)
    ));
    result.push(...this.classrooms.filter(c => c.type === 'teacher_lab' && !result.some(x => x.id === c.id)));
    if (result.length === 0) {
      result.push(...this.classrooms.filter(c => c.type !== 'universal' || !c.assignedGroupId));
    }
    return result;
  }

  private getSpecializedClassrooms(subjectId: string): Classroom[] {
    return this.classrooms.filter(c =>
      (c.type === 'lab' || c.type === 'universal') && c.specialization?.split(', ').includes(subjectId)
    );
  }

  // -------------------------------------------------------------------------
  // Դասաժամի ժամերի հաշվարկ
  // -------------------------------------------------------------------------

  private calculateLessonTime(lessonNumber: number): { startTime: string; endTime: string } {
    // Դասաժամի համարը վերածում ենք իրական startTime/endTime-ի՝ հաշվի առնելով դասերի տևողությունը և ընդմիջումները։
    const [h, m] = this.institution.startTime.split(':').map(Number);
    let mins = h * 60 + m;
    for (let i = 1; i < lessonNumber; i++) {
      mins += this.institution.lessonDuration;
      if (i < this.institution.lessonsPerDay && this.institution.breakDurations[i - 1])
        mins += this.institution.breakDurations[i - 1];
    }
    return { startTime: this.fmtTime(mins), endTime: this.fmtTime(mins + this.institution.lessonDuration) };
  }

  private fmtTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // -------------------------------------------------------------------------
  // Գեներացումից հետո բաշխման օպտիմալացում
  // -------------------------------------------------------------------------

  private optimizeScheduleDistribution(log: (m: string) => void): void {
    log('Optimizing schedule distribution...');
    const days = this.getOrderedWorkingDays();
    this.classGroups.forEach(group => {
      const counts = days.map(d => this.schedule.filter(s => s.classGroupId === group.id && s.day === d).length);
      const max = Math.max(...counts), min = Math.min(...counts);
      if (max - min > 2) log(`Uneven distribution for group ${group.name}: ${min}-${max} lessons/day`);
    });
    this.analyzeSameSubjectDistribution(log);
    this.validateFinalScheduleAssignments(log);
    this.classGroups.filter(g => g.homeRoom).forEach(group => {
      const hc = this.classrooms.find(c => c.id === group.homeRoom);
      if (!hc) return;
      const inHome = this.schedule.filter(s => s.classGroupId === group.id && s.classroomId === group.homeRoom).length;
      const total = this.schedule.filter(s => s.classGroupId === group.id).length;
      log(`Group ${group.name} home room: ${inHome}/${total} (${total > 0 ? Math.round(inHome / total * 100) : 0}%) in room ${hc.number}`);
    });
    this.classrooms.filter(c => c.type === 'lab' && c.specialization).forEach(lab => {
      const allowed = lab.specialization?.split(', ').filter(Boolean) ?? [];
      const unauth = Array.from(new Set(this.schedule.filter(s => s.classroomId === lab.id).map(s => s.subjectId))).filter(id => !allowed.includes(id));
      log(unauth.length > 0 ? `Room ${lab.number}: Unauthorized subjects detected!` : `Room ${lab.number}: Only authorized subjects scheduled`);
    });
    log('Distribution optimization complete');
  }

  private validateFinalScheduleAssignments(log: (m: string) => void): void {
    log('Validating teacher-group assignments...');
    let v = 0;
    this.schedule.forEach(slot => {
      const teacher = this.teachers.find(t => t.id === slot.teacherId);
      const group = this.classGroups.find(g => g.id === slot.classGroupId);
      if (teacher && group && !teacher.assignedClassGroups.includes(group.id)) {
        v++;
        log(`VIOLATION: ${teacher.firstName} ${teacher.lastName} in group ${group.name} (not assigned)`);
      }
    });
    log(v === 0 ? `Perfect compliance: all ${this.schedule.length} lessons follow rules` : `Found ${v} violations`);
  }

  private analyzeSameSubjectDistribution(log: (m: string) => void): void {
    log('Analyzing subject distribution...');
    const stats = { perfect: 0, acceptable: 0, problematic: 0, overloaded: 0 };
    this.classGroups.forEach(group => {
      const bySubject = new Map<string, ScheduleSlot[]>();
      this.schedule.filter(s => s.classGroupId === group.id).forEach(l => {
        if (!bySubject.has(l.subjectId)) bySubject.set(l.subjectId, []);
        bySubject.get(l.subjectId)!.push(l);
      });
      bySubject.forEach((lessons, subjectId) => {
        if (lessons.length <= 1) return;
        const name = this.subjects.find(s => s.id === subjectId)?.name ?? subjectId;
        const byDay = new Map<string, ScheduleSlot[]>();
        lessons.forEach(l => { if (!byDay.has(l.day)) byDay.set(l.day, []); byDay.get(l.day)!.push(l); });
        if (byDay.size === lessons.length) { stats.perfect++; return; }
        let bad = false;
        byDay.forEach((dl, day) => {
          if (dl.length <= 1) return;
          const s = [...dl].sort((a, b) => a.lessonNumber - b.lessonNumber);
          if (dl.length > 2) { stats.overloaded++; log(`Overloaded: ${name} for ${group.name} on ${day}`); bad = true; }
          else if (s[1].lessonNumber !== s[0].lessonNumber + 1) { stats.problematic++; log(`Non-consecutive: ${name} for ${group.name} on ${day}`); bad = true; }
        });
        if (!bad) stats.acceptable++;
      });
    });
    log(`Distribution - perfect: ${stats.perfect}, acceptable: ${stats.acceptable}, problematic: ${stats.problematic}, overloaded: ${stats.overloaded}`);
  }

  // -------------------------------------------------------------------------
  // Parity pairing — անվտանգ զուգավորում՝ ինդեքսով ստուգմամբ և գրանցմամբ
  // -------------------------------------------------------------------------

  private applyParityPairing(log: (m: string) => void): void {
    log('Applying parity pairing...');

    this.classGroups.forEach(group => {
      const subjectHours = group.subjectHours || {};
      const odd = Object.entries(subjectHours)
        .filter(([, h]) => h > 0 && h % 2 !== 0)
        .map(([id]) => id);
      if (odd.length < 2) return;

      const used = new Set<string>();

      for (let i = 0; i < odd.length; i++) {
        if (used.has(odd[i])) continue;
        for (let j = i + 1; j < odd.length; j++) {
          if (used.has(odd[j])) continue;
          const s1 = this.subjects.find(s => s.id === odd[i]);
          const s2 = this.subjects.find(s => s.id === odd[j]);
          if (!s1 || !s2) continue;

          const s1Slots = this.schedule.filter(s => s.classGroupId === group.id && s.subjectId === s1.id && !s.pairSubjectId);
          const boundary = s1Slots.find(slot => {
            const ds = this.schedule.filter(s => s.classGroupId === group.id && s.day === slot.day).map(s => s.lessonNumber).sort((a, b) => a - b);
            return ds[0] === slot.lessonNumber || ds[ds.length - 1] === slot.lessonNumber;
          });
          if (!boundary) continue;

          // Գտնում ենք ազատ դասախոս՝ ստուգելով կենդանի/թարմ ինդեքսը։
          const t2Id = s2.teacherIds.find(tid => {
            const t = this.teachers.find(x => x.id === tid);
            if (!t || !t.assignedClassGroups.includes(group.id)) return false;
            return !this.idxHas(this.teacherIndex, slotKey(tid, boundary.day, boundary.lessonNumber));
          });
          if (!t2Id) continue;

          // Նշանակում ենք և անմիջապես գրանցում ինդեքսում։ Լսարանը մնում է նույնը, քանի որ դասաժամը ընդհանուր է։
          // Բայց pairTeacherId-ը պետք է գրանցվի teacherIndex-ում, որպեսզի ուրիշ դաս նույն ժամին չդրվի այդ դասախոսի վրա։
          boundary.pairSubjectId = s2.id;
          boundary.pairTeacherId = t2Id;
          boundary.pairMinutes = 35;
          this.idxAdd(this.teacherIndex, slotKey(t2Id, boundary.day, boundary.lessonNumber));
          // classroomIndex-ում լսարանը արդեն գրանցված է սկզբնական addSlot-ի ժամանակ, դրա համար կրկին ավելացնելու կարիք չկա։
          used.add(s1.id);
          used.add(s2.id);
          log(`Parity pair: ${s1.name} + ${s2.name} (35+35 min) for ${group.name}`);
          break;
        }
      }
    });

    log('Parity pairing complete');
  }

  // -------------------------------------------------------------------------
  // Չտեղադրված դասի պատճառների վերլուծություն
  // -------------------------------------------------------------------------

  private analyzeSchedulingFailure(req: LessonRequirement, log: (m: string) => void): void {
    log(`Failed: ${req.subjectName} for ${req.groupName}`);
    if (!req.availableTeacherIds.length) {
      log(`  CRITICAL: No teachers for ${req.subjectName} in group ${req.groupName}`);
      const s = this.subjects.find(x => x.id === req.subjectId);
      if (s?.teacherIds.length) {
        const names = s.teacherIds.map(tid => { const t = this.teachers.find(x => x.id === tid); return t ? `${t.firstName} ${t.lastName}` : tid; });
        log(`  HINT: Subject has teachers (${names.join(', ')}) but none assigned to this group`);
      }
      return;
    }
    const existing = req.availableTeacherIds.map(tid => this.teachers.find(t => t.id === tid)).filter(Boolean) as Teacher[];
    if (!existing.length) { log(`  CRITICAL: Assigned teachers don't exist`); return; }
    const withHours = existing.filter(t => Object.values(t.availableHours).some(h => h.length > 0));
    if (!withHours.length) { log(`  CRITICAL: No teachers with available hours`); return; }
    const rooms = this.getSuitableClassroomsForSubjectType(req.subjectType, req.subjectId, req.groupObj);
    if (!rooms.length) { log(`  CRITICAL: No suitable classrooms`); return; }

    let potential = 0;
    for (const day of this.getOrderedWorkingDays()) {
      for (let ln = 1; ln <= this.institution.lessonsPerDay; ln++) {
        if (this.idxHas(this.groupIndex, slotKey(req.groupId, day, ln))) continue;
        const freeT = withHours.filter(t => t.availableHours[day]?.includes(ln) && !this.idxHas(this.teacherIndex, slotKey(t.id, day, ln)));
        if (!freeT.length) continue;
        if (rooms.some(c => !this.idxHas(this.classroomIndex, slotKey(c.id, day, ln)))) potential++;
      }
    }
    log(`  Potential slots: ${potential}`);
    log(potential > 0 ? `  MYSTERY: Slots exist but could not schedule (gap-avoidance or room restriction)` : `  RECOMMENDATION: Add more teacher availability or classrooms`);
  }
}
