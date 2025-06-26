export interface Institution {
  id: string;
  name: string;
  type: 'college';
  workingDays: string[];
  lessonsPerDay: number;
  lessonDuration: number; // in minutes
  breakDurations: number[]; // array of break durations after each lesson
  startTime: string; // "08:00"
  academicWeeks: number;
  specializations: string[]; // Available specializations in the college
}

export interface ClassGroup {
  id: string;
  name: string;
  type: 'college_group';
  course?: number; // for college: 1-6 (which course/year they are in)
  specialization?: string;
  homeRoom?: string;
  studentsCount: number;
  subjectHours: { [subjectId: string]: number }; // subject ID -> hours per year for this group
}

export interface Subject {
  id: string;
  name: string;
  type: 'theory' | 'lab';
  course: number; // which course this subject is for (1-6)
  specializationRequired?: string;
  teacherIds: string[];
}

export interface Classroom {
  id: string;
  number: string;
  floor: number;
  type: 'theory' | 'lab' | 'teacher_lab';
  hasComputers: boolean;
  specialization?: string;
  assignedTeacherId?: string;
  capacity: number;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  subjects: string[];
  availableHours: { [day: string]: number[] }; // day -> available lesson numbers
  assignedClassGroups: string[];
  homeClassroom?: string; // Teacher's own classroom/office
}

export interface ScheduleSlot {
  id: string;
  day: string;
  lessonNumber: number;
  classGroupId: string;
  subjectId: string;
  teacherId: string;
  classroomId: string;
  startTime: string;
  endTime: string;
}

export interface GenerationConstraints {
  maxSameSubjectPerDay: number;
  preferConsecutiveLessons: boolean;
  balanceWeeklyLoad: boolean;
  preserveLabSchedule: boolean;
}