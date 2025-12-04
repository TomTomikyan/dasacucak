// Հաստատություն - Ուսումնական հաստատության հիմնական տվյալներ
// Պահում է բոլոր ընդհանուր կարգավորումները՝ աշխատանքային օրեր, դասերի քանակ, տևողություն
export interface Institution {
  id: string; // Եզակի նույնականացուցիչ
  name: string; // Հաստատության անվանում
  type: 'college'; // Տիպ (միայն քոլեջ)
  workingDays: string[]; // Աշխատանքային օրեր (օրինակ՝ ['Monday', 'Tuesday', ...])
  lessonsPerDay: number; // Դասերի քանակ մեկ օրում
  lessonDuration: number; // Մեկ դասի տևողությունը (րոպեով)
  breakDurations: number[]; // Դասամիջոցների տևողությունը յուրաքանչյուր դասից հետո (րոպեով)
  startTime: string; // Դասերի սկիզբի ժամը (ձևաչափ՝ "08:00")
  academicWeeks: number; // Ուսումնական շաբաթների քանակ տարեկան
  specializations: string[]; // Մասնագիտությունների ցանկ քոլեջում
}

// Ուսումնական խումբ - Ուսանողների խումբ որոշակի մասնագիտությամբ և դասընթացով
// Պարունակում է տեղեկություններ խմբի մասին և առարկաների ժամաքանակը
export interface ClassGroup {
  id: string; // Եզակի նույնականացուցիչ
  name: string; // Խմբի անվանում (օրինակ՝ "211")
  type: 'college_group'; // Տիպ (միայն քոլեջային խումբ)
  course?: number; // Դասընթաց (1-6), որը ցույց է տալիս որ կուրսում են
  specialization?: string; // Մասնագիտություն
  homeRoom?: string; // Խմբի հիմնական սենյակի ID (եթե կա)
  studentsCount: number; // Ուսանողների քանակ
  subjectHours: { [subjectId: string]: number }; // Առարկա ID -> ժամաքանակ տարեկան այս խմբի համար
}

// Առարկա - Դասավանդվող առարկա (տեսական կամ լաբորատոր)
// Սահմանում է առարկայի տեսակը և դասավանդող ուսուցիչներին
export interface Subject {
  id: string; // Եզակի նույնականացուցիչ
  name: string; // Առարկայի անվանում
  type: 'theory' | 'lab'; // Տիպ՝ տեսական կամ լաբորատոր աշխատանք
  course: number; // Որ կուրսի համար է այս առարկան (1-6)
  specializationRequired?: string; // Անհրաժեշտ մասնագիտություն (եթե առարկան կոնկրետ մասնագիտության համար է)
  teacherIds: string[]; // Ուսուցիչների ID-ների ցանկ, ովքեր դասավանդում են այս առարկան
}

// Սենյակ - Դասասենյակ կամ լաբորատորիա
// Սահմանում է սենյակի տիպը, տեղակայությունը և հատուկացումը
export interface Classroom {
  id: string; // Եզակի նույնականացուցիչ
  number: string; // Սենյակի համար (օրինակ՝ "101")
  floor: number; // Հարկ
  type: 'theory' | 'lab' | 'teacher_lab'; // Տիպ՝ տեսական, լաբորատոր կամ ուսուցչի լաբորատոր
  hasComputers: boolean; // Արդյոք ունի համակարգիչներ
  specialization?: string; // Հատուկացում առարկաներին (առարկաների ID-ներ, ստորակետով բաժանված)
  assignedTeacherId?: string; // Հատկացված ուսուցչի ID (ուսուցչի սեփական սենյակի համար)
  capacity: number; // Տարողություն (քանի հոգի տեղավորում է)
}

// Ուսուցիչ - Դասավանդող անձնակազմ
// Պարունակում է տեղեկություններ ուսուցչի, նրա առարկաների և հասանելի ժամանակի մասին
export interface Teacher {
  id: string; // Եզակի նույնականացուցիչ
  firstName: string; // Անուն
  lastName: string; // Ազգանուն
  subjects: string[]; // Դասավանդվող առարկաների ցանկ (առարկաների անուններ)
  availableHours: { [day: string]: number[] }; // Հասանելի ժամեր՝ օր -> դասերի համարներ (օրինակ՝ Monday: [1,2,3])
  assignedClassGroups: string[]; // Հատկացված խմբերի ID-ներ, որոնց դասավանդում է
  homeClassroom?: string; // Ուսուցչի սեփական սենյակի/գրասենյակի ID (եթե ունի)
}

// Ժամանակացույց ուղղի - Մեկ կոնկրետ դաս ժամանակացույցում
// Սահմանում է ճիշտ ե՞րբ, որտե՞ղ, ո՞վ և ի՞նչ դաս կլինի
export interface ScheduleSlot {
  id: string; // Եզակի նույնականացուցիչ
  day: string; // Շաբաթվա օր (օրինակ՝ "Monday")
  lessonNumber: number; // Դասի համար (1, 2, 3, ...)
  classGroupId: string; // Խմբի ID
  subjectId: string; // Առարկայի ID
  teacherId: string; // Ուսուցչի ID
  classroomId: string; // Սենյակի ID
  startTime: string; // Սկիզբի ժամ (ձևաչափ՝ "08:00")
  endTime: string; // Ավարտի ժամ (ձևաչափ՝ "09:10")
}

// Գեներացիայի սահմանափակումներ - Կարգավորումներ ժամանակացույցի ստեղծման համար
// Սահմանում է ինչպես պետք է բաշխվեն դասերը
export interface GenerationConstraints {
  maxSameSubjectPerDay: number; // Առավելագույն քանակ նույն առարկայի մեկ օրում
  preferConsecutiveLessons: boolean; // Նախընտրել անընդհատ դասեր
  balanceWeeklyLoad: boolean; // Հավասարակշռել շաբաթական բեռնվածությունը
  preserveLabSchedule: boolean; // Պահպանել լաբորատոր աշխատանքների ժամանակացույցը
}