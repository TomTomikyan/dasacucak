import { Institution, ClassGroup, Subject, Teacher, Classroom, ScheduleSlot } from '../types';

export interface GenerationResult {
  success: boolean;
  schedule: ScheduleSlot[];
  error?: string;
}

export class ScheduleGenerator {
  private institution: Institution;
  private classGroups: ClassGroup[];
  private subjects: Subject[];
  private teachers: Teacher[];
  private classrooms: Classroom[];
  private schedule: ScheduleSlot[] = [];
  private conflicts: Map<string, Set<string>> = new Map(); // Track conflicts
  private randomSeed: number; // Add randomization seed

  constructor(
    institution: Institution,
    classGroups: ClassGroup[],
    subjects: Subject[],
    teachers: Teacher[],
    classrooms: Classroom[]
  ) {
    this.institution = institution;
    this.classGroups = classGroups;
    this.subjects = subjects;
    this.teachers = teachers;
    this.classrooms = classrooms;
    this.randomSeed = Date.now(); // Initialize with current timestamp
  }

  // Simple seeded random number generator
  private seededRandom(): number {
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    return this.randomSeed / 233280;
  }

  // Shuffle array using seeded random
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async generateSchedule(logCallback?: (message: string) => void): Promise<GenerationResult> {
    const log = (message: string) => {
      console.log(message);
      if (logCallback) logCallback(message);
    };

    try {
      // 🎲 Generate new random seed for each generation
      this.randomSeed = Date.now() + Math.floor(Math.random() * 10000);
      log(`🎲 Using random seed: ${this.randomSeed}`);
      
      log('🚀 Starting smart schedule generation...');
      
      // 🔥 CRITICAL: Always reset state completely
      this.schedule = [];
      this.conflicts.clear();

      // Validate input data
      const validation = this.validateInputData();
      if (!validation.valid) {
        return { success: false, schedule: [], error: validation.error };
      }

      log('✅ Input validation passed');

      // Log classroom specializations and teacher labs
      this.logClassroomInfo(log);

      // Generate lesson requirements
      const lessonRequirements = this.generateLessonRequirements();
      log(`📋 Generated ${lessonRequirements.length} lesson requirements`);

      // 🎲 Randomize requirements order while maintaining priority
      const sortedRequirements = this.prioritizeRequirementsWithRandomization(lessonRequirements);
      log('🔄 Prioritized and randomized lesson requirements');

      // Attempt to schedule each lesson
      let scheduledCount = 0;
      let failedCount = 0;

      for (const requirement of sortedRequirements) {
        const success = await this.scheduleLesson(requirement, log);
        if (success) {
          scheduledCount++;
        } else {
          failedCount++;
          // 🔥 NEW: Detailed failure analysis
          this.analyzeSchedulingFailure(requirement, log);
        }
      }

      log(`✅ Scheduling complete: ${scheduledCount} scheduled, ${failedCount} failed`);

      if (scheduledCount === 0) {
        return { 
          success: false, 
          schedule: [], 
          error: 'No lessons could be scheduled. Check teacher availability and classroom assignments.' 
        };
      }

      // Optimize schedule distribution
      this.optimizeScheduleDistribution(log);

      return { 
        success: true, 
        schedule: this.schedule 
      };

    } catch (error) {
      log(`💥 Generation error: ${error}`);
      return { 
        success: false, 
        schedule: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private validateInputData(): { valid: boolean; error?: string } {
    if (this.classGroups.length === 0) {
      return { valid: false, error: 'No class groups configured' };
    }

    if (this.subjects.length === 0) {
      return { valid: false, error: 'No subjects configured' };
    }

    if (this.teachers.length === 0) {
      return { valid: false, error: 'No teachers configured' };
    }

    if (this.classrooms.length === 0) {
      return { valid: false, error: 'No classrooms configured' };
    }

    // Check if groups have assigned subjects
    const groupsWithSubjects = this.classGroups.filter(group => 
      Object.keys(group.subjectHours || {}).length > 0
    );
    if (groupsWithSubjects.length === 0) {
      return { valid: false, error: 'No subjects assigned to any groups' };
    }

    // Check if subjects have assigned teachers
    const subjectsWithTeachers = this.subjects.filter(subject => 
      subject.teacherIds.length > 0
    );
    if (subjectsWithTeachers.length === 0) {
      return { valid: false, error: 'No teachers assigned to any subjects' };
    }

    return { valid: true };
  }

  private logClassroomInfo(log: (message: string) => void): void {
    // Log specialized laboratories
    const specializedLabs = this.classrooms.filter(c => c.type === 'lab' && c.specialization);
    if (specializedLabs.length > 0) {
      log('🏫 Specialized laboratories detected:');
      specializedLabs.forEach(lab => {
        const subjects = lab.specialization?.split(', ').filter(Boolean) || [];
        const subjectNames = subjects.map(subjectId => {
          const subject = this.subjects.find(s => s.id === subjectId);
          return subject ? subject.name : subjectId;
        });
        log(`   📍 Room ${lab.number}: ${subjectNames.join(', ')}`);
      });
    }

    // Log teacher labs and their owners
    const teacherLabs = this.classrooms.filter(c => c.type === 'teacher_lab');
    if (teacherLabs.length > 0) {
      log('👨‍🏫 Teacher labs detected:');
      teacherLabs.forEach(lab => {
        const owner = this.teachers.find(t => t.homeClassroom === lab.id);
        if (owner) {
          log(`   🏠 Room ${lab.number}: Owned by ${owner.firstName} ${owner.lastName}`);
        } else {
          log(`   🏠 Room ${lab.number}: No assigned owner (available for any teacher)`);
        }
      });
    }
  }

  private generateLessonRequirements(): LessonRequirement[] {
    const requirements: LessonRequirement[] = [];

    this.classGroups.forEach(group => {
      Object.entries(group.subjectHours || {}).forEach(([subjectId, yearlyHours]) => {
        if (yearlyHours > 0) {
          const subject = this.subjects.find(s => s.id === subjectId);
          if (subject && subject.teacherIds.length > 0) {
            // Calculate weekly hours
            const weeklyHours = Math.ceil(yearlyHours / this.institution.academicWeeks);
            
            // Create requirements for each weekly lesson
            for (let i = 0; i < weeklyHours; i++) {
              requirements.push({
                id: `${group.id}-${subjectId}-${i}`,
                groupId: group.id,
                groupName: group.name,
                subjectId: subject.id,
                subjectName: subject.name,
                subjectType: subject.type,
                availableTeacherIds: subject.teacherIds,
                priority: this.calculatePriority(subject, group),
              });
            }
          }
        }
      });
    });

    return requirements;
  }

  private calculatePriority(subject: Subject, group: ClassGroup): number {
    // Higher priority = lower number (scheduled first)
    let priority = 0;

    // Lab subjects get higher priority (need specific classrooms)
    if (subject.type === 'lab') priority -= 10;

    // Subjects with specialized classrooms get even higher priority
    const hasSpecializedClassroom = this.classrooms.some(c => 
      c.type === 'lab' && 
      c.specialization && 
      c.specialization.split(', ').includes(subject.id)
    );
    if (hasSpecializedClassroom) priority -= 20;

    // Fewer available teachers = higher priority
    priority += subject.teacherIds.length;

    // Larger groups get slightly higher priority
    priority -= Math.floor(group.studentsCount / 10);

    return priority;
  }

  private prioritizeRequirementsWithRandomization(requirements: LessonRequirement[]): LessonRequirement[] {
    // First, sort by priority
    const sorted = requirements.sort((a, b) => a.priority - b.priority);
    
    // 🎲 Then add randomization within priority groups
    const priorityGroups = new Map<number, LessonRequirement[]>();
    
    // Group by priority
    sorted.forEach(req => {
      if (!priorityGroups.has(req.priority)) {
        priorityGroups.set(req.priority, []);
      }
      priorityGroups.get(req.priority)!.push(req);
    });
    
    // Shuffle within each priority group and combine
    const randomizedRequirements: LessonRequirement[] = [];
    Array.from(priorityGroups.keys()).sort((a, b) => a - b).forEach(priority => {
      const group = priorityGroups.get(priority)!;
      const shuffledGroup = this.shuffleArray(group);
      randomizedRequirements.push(...shuffledGroup);
    });
    
    return randomizedRequirements;
  }

  private async scheduleLesson(requirement: LessonRequirement, log: (message: string) => void): Promise<boolean> {
    const availableSlots = this.findAvailableSlots(requirement);
    
    if (availableSlots.length === 0) {
      log(`⚠️ No available slots for ${requirement.subjectName} - ${requirement.groupName}`);
      return false;
    }

    // 🎲 Randomize available slots before selecting the best one
    const randomizedSlots = this.shuffleArray(availableSlots);
    
    // Try to find the best slot from randomized options
    const bestSlot = this.selectBestSlot(randomizedSlots, requirement);
    
    if (bestSlot) {
      this.schedule.push(bestSlot);
      const classroom = this.classrooms.find(c => c.id === bestSlot.classroomId);
      const teacher = this.teachers.find(t => t.id === bestSlot.teacherId);
      
      let roomInfo = `room ${classroom?.number}`;
      if (classroom?.type === 'teacher_lab') {
        const owner = this.teachers.find(t => t.homeClassroom === classroom.id);
        if (owner) {
          roomInfo += ` (${owner.firstName} ${owner.lastName}'s lab)`;
        }
      }
      
      log(`✅ Scheduled ${requirement.subjectName} for ${requirement.groupName} on ${bestSlot.day} lesson ${bestSlot.lessonNumber} in ${roomInfo} with ${teacher?.firstName} ${teacher?.lastName}`);
      return true;
    }

    return false;
  }

  private analyzeSchedulingFailure(requirement: LessonRequirement, log: (message: string) => void): void {
    log(`❌ Failed to schedule: ${requirement.subjectName} for ${requirement.groupName}`);
    
    // Check if it's a specialized lab issue
    if (requirement.subjectType === 'lab') {
      const specializedClassrooms = this.getSpecializedClassroomsForSubject(requirement.subjectId);
      if (specializedClassrooms.length > 0) {
        const roomNumbers = specializedClassrooms.map(c => c.number).join(', ');
        log(`   🔒 Subject requires specialized lab(s): ${roomNumbers}`);
        
        // Check if specialized labs are occupied
        const occupiedSlots = this.schedule.filter(slot => 
          specializedClassrooms.some(lab => lab.id === slot.classroomId)
        );
        if (occupiedSlots.length > 0) {
          log(`   📅 Specialized labs have ${occupiedSlots.length} occupied slots`);
        }
      }
    }
    
    // Check teacher availability
    const availableTeachers = requirement.availableTeacherIds.filter(teacherId => {
      const teacher = this.teachers.find(t => t.id === teacherId);
      if (!teacher) return false;
      
      const totalAvailableHours = Object.values(teacher.availableHours).reduce((sum, hours) => sum + hours.length, 0);
      const teacherScheduledHours = this.schedule.filter(slot => slot.teacherId === teacherId).length;
      
      return totalAvailableHours > teacherScheduledHours;
    });
    
    if (availableTeachers.length === 0) {
      log(`   👨‍🏫 No available teachers (all ${requirement.availableTeacherIds.length} teachers are fully booked)`);
    } else {
      log(`   👨‍🏫 ${availableTeachers.length}/${requirement.availableTeacherIds.length} teachers still available`);
    }
  }

  private findAvailableSlots(requirement: LessonRequirement): ScheduleSlot[] {
    const availableSlots: ScheduleSlot[] = [];

    // 🎲 Randomize the order of days and lessons
    const randomizedDays = this.shuffleArray(this.institution.workingDays);
    const randomizedLessons = this.shuffleArray(
      Array.from({ length: this.institution.lessonsPerDay }, (_, i) => i + 1)
    );

    randomizedDays.forEach(day => {
      randomizedLessons.forEach(lessonNumber => {
        // 🎲 Randomize teacher order
        const randomizedTeachers = this.shuffleArray(requirement.availableTeacherIds);
        
        randomizedTeachers.forEach(teacherId => {
          const teacher = this.teachers.find(t => t.id === teacherId);
          if (!teacher) return;

          // Check if teacher is available at this time
          if (!teacher.availableHours[day]?.includes(lessonNumber)) return;

          // Get suitable classrooms for this teacher and subject
          const suitableClassrooms = this.getSuitableClassroomsForTeacher(
            requirement.subjectType, 
            requirement.subjectId, 
            teacherId
          );

          // 🎲 Randomize classroom order
          const randomizedClassrooms = this.shuffleArray(suitableClassrooms);

          // Try each suitable classroom
          randomizedClassrooms.forEach(classroom => {
            // Check all conflicts
            if (this.isSlotAvailable(requirement.groupId, teacherId, classroom.id, day, lessonNumber)) {
              const { startTime, endTime } = this.calculateLessonTime(lessonNumber);
              
              availableSlots.push({
                id: `${Date.now()}-${Math.random()}`,
                day,
                lessonNumber,
                classGroupId: requirement.groupId,
                subjectId: requirement.subjectId,
                teacherId,
                classroomId: classroom.id,
                startTime,
                endTime,
              });
            }
          });
        });
      });
    });

    return availableSlots;
  }

  private getSuitableClassroomsForTeacher(subjectType: 'theory' | 'lab', subjectId: string, teacherId: string): Classroom[] {
    if (subjectType === 'lab') {
      // First, check for specialized classrooms for this specific subject
      const specializedClassrooms = this.getSpecializedClassroomsForSubject(subjectId);
      
      if (specializedClassrooms.length > 0) {
        // If there are specialized classrooms for this subject, use ONLY those
        return specializedClassrooms;
      }
      
      // If no specialized classrooms, use general lab classrooms (without specialization)
      return this.classrooms.filter(c => 
        c.type === 'lab' && 
        (!c.specialization || c.specialization.trim() === '')
      );
    } else {
      // For theory subjects, get available classrooms for this teacher
      const availableClassrooms: Classroom[] = [];
      
      // 1. Teacher's own lab (if they have one) - HIGHEST PRIORITY
      const teacher = this.teachers.find(t => t.id === teacherId);
      if (teacher?.homeClassroom) {
        const teacherLab = this.classrooms.find(c => c.id === teacher.homeClassroom);
        if (teacherLab && teacherLab.type === 'teacher_lab') {
          availableClassrooms.push(teacherLab);
        }
      }
      
      // 2. General theory classrooms
      const theoryClassrooms = this.classrooms.filter(c => c.type === 'theory');
      availableClassrooms.push(...theoryClassrooms);
      
      // 3. Unassigned teacher labs (teacher labs without owners)
      const unassignedTeacherLabs = this.classrooms.filter(c => {
        if (c.type !== 'teacher_lab') return false;
        
        // Check if this teacher lab is assigned to any teacher
        const isAssigned = this.teachers.some(t => t.homeClassroom === c.id);
        return !isAssigned;
      });
      availableClassrooms.push(...unassignedTeacherLabs);
      
      return availableClassrooms;
    }
  }

  private getSpecializedClassroomsForSubject(subjectId: string): Classroom[] {
    return this.classrooms.filter(classroom => 
      classroom.type === 'lab' && 
      classroom.specialization && 
      classroom.specialization.split(', ').includes(subjectId)
    );
  }

  private isSlotAvailable(groupId: string, teacherId: string, classroomId: string, day: string, lessonNumber: number): boolean {
    // Check for any conflicts in the current schedule
    const hasConflict = this.schedule.some(slot => 
      (slot.classGroupId === groupId || 
       slot.teacherId === teacherId || 
       slot.classroomId === classroomId) &&
      slot.day === day && 
      slot.lessonNumber === lessonNumber
    );

    if (hasConflict) return false;

    // 🔥 NEW: Check teacher lab ownership
    const classroom = this.classrooms.find(c => c.id === classroomId);
    if (classroom?.type === 'teacher_lab') {
      // Find the owner of this teacher lab
      const owner = this.teachers.find(t => t.homeClassroom === classroom.id);
      
      if (owner && owner.id !== teacherId) {
        // This teacher lab belongs to another teacher - cannot use it
        return false;
      }
    }

    // Additional check: if this is a specialized classroom, ensure only allowed subjects can use it
    if (classroom?.type === 'lab' && classroom.specialization) {
      const allowedSubjects = classroom.specialization.split(', ').filter(Boolean);
      if (allowedSubjects.length > 0) {
        // Check if any other subject (not in the allowed list) is trying to use this classroom
        const currentSubjectId = this.schedule.find(slot => 
          slot.classroomId === classroomId && 
          slot.day === day && 
          slot.lessonNumber === lessonNumber
        )?.subjectId;
        
        if (currentSubjectId && !allowedSubjects.includes(currentSubjectId)) {
          return false;
        }
      }
    }

    return true;
  }

  private selectBestSlot(availableSlots: ScheduleSlot[], requirement: LessonRequirement): ScheduleSlot | null {
    if (availableSlots.length === 0) return null;

    // Score each slot based on various factors
    const scoredSlots = availableSlots.map(slot => ({
      slot,
      score: this.scoreSlot(slot, requirement)
    }));

    // Sort by score (higher is better)
    scoredSlots.sort((a, b) => b.score - a.score);

    // 🎲 Add some randomization to top choices
    const topScores = scoredSlots.filter(s => s.score >= scoredSlots[0].score * 0.9);
    const randomIndex = Math.floor(this.seededRandom() * topScores.length);

    return topScores[randomIndex].slot;
  }

  private scoreSlot(slot: ScheduleSlot, requirement: LessonRequirement): number {
    let score = 0;

    // Prefer earlier in the week for important subjects
    const dayIndex = this.institution.workingDays.indexOf(slot.day);
    score += (this.institution.workingDays.length - dayIndex) * 2;

    // Prefer middle lessons (not too early, not too late)
    const middleLesson = Math.ceil(this.institution.lessonsPerDay / 2);
    const lessonDistance = Math.abs(slot.lessonNumber - middleLesson);
    score += (this.institution.lessonsPerDay - lessonDistance) * 3;

    // Check for balanced distribution for this group
    const groupLessonsOnDay = this.schedule.filter(s => 
      s.classGroupId === slot.classGroupId && s.day === slot.day
    ).length;
    score -= groupLessonsOnDay * 5; // Penalty for overloading a day

    // 🔥 HUGE bonus for teacher using their own lab
    const teacher = this.teachers.find(t => t.id === slot.teacherId);
    if (teacher?.homeClassroom === slot.classroomId) {
      score += 100; // Very high priority for teacher's own classroom
    }

    // HUGE bonus for using specialized classroom for the correct subject
    const classroom = this.classrooms.find(c => c.id === slot.classroomId);
    if (classroom?.type === 'lab' && classroom.specialization) {
      const allowedSubjects = classroom.specialization.split(', ').filter(Boolean);
      if (allowedSubjects.includes(requirement.subjectId)) {
        score += 50; // Very high priority for correct specialization
      }
    }

    // Bonus for consecutive lessons of the same subject (for labs)
    if (requirement.subjectType === 'lab') {
      const hasConsecutive = this.schedule.some(s => 
        s.classGroupId === slot.classGroupId &&
        s.subjectId === slot.subjectId &&
        s.day === slot.day &&
        Math.abs(s.lessonNumber - slot.lessonNumber) === 1
      );
      if (hasConsecutive) score += 15;
    }

    // 🎲 Add small random factor to break ties
    score += this.seededRandom() * 5;

    return score;
  }

  private calculateLessonTime(lessonNumber: number): { startTime: string; endTime: string } {
    const [startHour, startMinute] = this.institution.startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMinute;

    // Add time for previous lessons and breaks
    for (let i = 1; i < lessonNumber; i++) {
      currentMinutes += this.institution.lessonDuration;
      if (i < this.institution.lessonsPerDay && this.institution.breakDurations[i - 1]) {
        currentMinutes += this.institution.breakDurations[i - 1];
      }
    }

    const startTime = this.formatTime(currentMinutes);
    const endTime = this.formatTime(currentMinutes + this.institution.lessonDuration);

    return { startTime, endTime };
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private optimizeScheduleDistribution(log: (message: string) => void): void {
    log('🔧 Optimizing schedule distribution...');

    // Check for groups with uneven daily distribution
    this.classGroups.forEach(group => {
      const dailyLessons = new Map<string, number>();
      
      this.institution.workingDays.forEach(day => {
        const lessonsOnDay = this.schedule.filter(s => 
          s.classGroupId === group.id && s.day === day
        ).length;
        dailyLessons.set(day, lessonsOnDay);
      });

      const maxLessons = Math.max(...dailyLessons.values());
      const minLessons = Math.min(...dailyLessons.values());
      
      if (maxLessons - minLessons > 2) {
        log(`⚠️ Uneven distribution for group ${group.name}: ${minLessons}-${maxLessons} lessons per day`);
      }
    });

    // Log specialized classroom usage
    const specializedLabs = this.classrooms.filter(c => c.type === 'lab' && c.specialization);
    specializedLabs.forEach(lab => {
      const lessonsInLab = this.schedule.filter(s => s.classroomId === lab.id);
      const subjects = new Set(lessonsInLab.map(s => s.subjectId));
      const allowedSubjects = lab.specialization?.split(', ').filter(Boolean) || [];
      
      log(`🏫 Specialized Lab ${lab.number}: ${lessonsInLab.length} lessons`);
      
      // Check if only allowed subjects are using this lab
      const unauthorizedSubjects = Array.from(subjects).filter(subjectId => 
        !allowedSubjects.includes(subjectId)
      );
      
      if (unauthorizedSubjects.length > 0) {
        log(`⚠️ Room ${lab.number}: Unauthorized subjects detected!`);
      } else {
        log(`✅ Room ${lab.number}: Only authorized subjects scheduled`);
      }
    });

    // Log teacher lab usage
    const teacherLabs = this.classrooms.filter(c => c.type === 'teacher_lab');
    teacherLabs.forEach(lab => {
      const owner = this.teachers.find(t => t.homeClassroom === lab.id);
      const lessonsInLab = this.schedule.filter(s => s.classroomId === lab.id);
      
      if (owner) {
        const ownerLessons = lessonsInLab.filter(s => s.teacherId === owner.id);
        const otherTeacherLessons = lessonsInLab.filter(s => s.teacherId !== owner.id);
        
        log(`👨‍🏫 Teacher Lab ${lab.number} (${owner.firstName} ${owner.lastName}): ${lessonsInLab.length} total lessons`);
        log(`   📚 Owner's lessons: ${ownerLessons.length}`);
        
        if (otherTeacherLessons.length > 0) {
          log(`   ⚠️ Other teachers' lessons: ${otherTeacherLessons.length} (This should not happen!)`);
        } else {
          log(`   ✅ Only owner uses this lab`);
        }
      } else {
        log(`🏫 Unassigned Teacher Lab ${lab.number}: ${lessonsInLab.length} lessons (available to all)`);
      }
    });

    log('✅ Distribution optimization complete');
  }
}

interface LessonRequirement {
  id: string;
  groupId: string;
  groupName: string;
  subjectId: string;
  subjectName: string;
  subjectType: 'theory' | 'lab';
  availableTeacherIds: string[];
  priority: number;
}