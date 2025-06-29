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

  // 🔥 NEW: Get properly ordered working days (Monday first)
  private getOrderedWorkingDays(): string[] {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Filter and sort working days according to proper week order
    return dayOrder.filter(day => this.institution.workingDays.includes(day));
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

      // 🔥 NEW: Validate teacher-group assignments
      const teacherGroupValidation = this.validateTeacherGroupAssignments();
      if (!teacherGroupValidation.valid) {
        log(`⚠️ Teacher-group assignment warnings: ${teacherGroupValidation.warnings?.join(', ')}`);
      }

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
          // 🔥 Enhanced failure analysis
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

  // 🔥 NEW: Validate teacher-group assignments
  private validateTeacherGroupAssignments(): { valid: boolean; warnings?: string[] } {
    const warnings: string[] = [];

    this.teachers.forEach(teacher => {
      if (teacher.assignedClassGroups.length === 0) {
        warnings.push(`Teacher ${teacher.firstName} ${teacher.lastName} has no assigned groups`);
      }
    });

    this.classGroups.forEach(group => {
      const teachersForGroup = this.teachers.filter(t => 
        t.assignedClassGroups.includes(group.id)
      );
      
      if (teachersForGroup.length === 0) {
        warnings.push(`Group ${group.name} has no assigned teachers`);
      }
    });

    return { 
      valid: warnings.length === 0, 
      warnings: warnings.length > 0 ? warnings : undefined 
    };
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

    // Log group home classrooms
    const groupsWithHomeRooms = this.classGroups.filter(g => g.homeRoom);
    if (groupsWithHomeRooms.length > 0) {
      log('🏠 Group home classrooms detected:');
      groupsWithHomeRooms.forEach(group => {
        const homeClassroom = this.classrooms.find(c => c.id === group.homeRoom);
        if (homeClassroom) {
          log(`   🎓 Group ${group.name}: Home room ${homeClassroom.number}`);
        }
      });
    }

    // 🔥 NEW: Log teacher-group assignments
    log('👥 Teacher-group assignments:');
    this.teachers.forEach(teacher => {
      if (teacher.assignedClassGroups.length > 0) {
        const groupNames = teacher.assignedClassGroups.map(groupId => {
          const group = this.classGroups.find(g => g.id === groupId);
          return group ? group.name : groupId;
        });
        log(`   👨‍🏫 ${teacher.firstName} ${teacher.lastName}: Groups ${groupNames.join(', ')}`);
      } else {
        log(`   ⚠️ ${teacher.firstName} ${teacher.lastName}: No assigned groups`);
      }
    });
  }

  private generateLessonRequirements(): LessonRequirement[] {
    const requirements: LessonRequirement[] = [];

    this.classGroups.forEach(group => {
      Object.entries(group.subjectHours || {}).forEach(([subjectId, yearlyHours]) => {
        if (yearlyHours > 0) {
          const subject = this.subjects.find(s => s.id === subjectId);
          if (subject && subject.teacherIds.length > 0) {
            // 🔥 CRITICAL: Filter teachers to only those assigned to this group
            const validTeacherIds = subject.teacherIds.filter(teacherId => {
              const teacher = this.teachers.find(t => t.id === teacherId);
              return teacher && teacher.assignedClassGroups.includes(group.id);
            });

            if (validTeacherIds.length === 0) {
              console.warn(`⚠️ No valid teachers for subject ${subject.name} in group ${group.name} - skipping`);
              return; // Skip this subject-group combination
            }

            // Calculate weekly hours
            const weeklyHours = Math.ceil(yearlyHours / this.institution.academicWeeks);
            
            // Create requirements for each weekly lesson
            for (let i = 0; i < weeklyHours; i++) {
              requirements.push({
                id: `${group.id}-${subjectId}-${i}`,
                groupId: group.id,
                groupName: group.name,
                groupObj: group,
                subjectId: subject.id,
                subjectName: subject.name,
                subjectType: subject.type,
                availableTeacherIds: validTeacherIds, // 🔥 Use filtered teacher IDs
                priority: this.calculatePriority(subject, group),
                lessonIndex: i,
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
      } else if (classroom?.id === requirement.groupObj.homeRoom) {
        roomInfo += ` (${requirement.groupName}'s home room)`;
      }
      
      log(`✅ Scheduled ${requirement.subjectName} for ${requirement.groupName} on ${bestSlot.day} lesson ${bestSlot.lessonNumber} in ${roomInfo} with ${teacher?.firstName} ${teacher?.lastName}`);
      return true;
    }

    return false;
  }

  private analyzeSchedulingFailure(requirement: LessonRequirement, log: (message: string) => void): void {
    log(`❌ Failed to schedule: ${requirement.subjectName} for ${requirement.groupName}`);
    
    // 1. Check if teachers are assigned to this subject
    if (!requirement.availableTeacherIds.length) {
      log(`   🚫 CRITICAL: No teachers assigned to subject "${requirement.subjectName}" for group "${requirement.groupName}"`);
      
      // 🔥 NEW: Check if there are teachers for this subject but not assigned to this group
      const subject = this.subjects.find(s => s.id === requirement.subjectId);
      if (subject && subject.teacherIds.length > 0) {
        const allSubjectTeachers = subject.teacherIds.map(teacherId => {
          const teacher = this.teachers.find(t => t.id === teacherId);
          return teacher ? `${teacher.firstName} ${teacher.lastName}` : teacherId;
        });
        log(`   💡 HINT: Subject "${requirement.subjectName}" has teachers (${allSubjectTeachers.join(', ')}) but none are assigned to group "${requirement.groupName}"`);
        log(`   💡 SOLUTION: Assign these teachers to group "${requirement.groupName}" or assign different teachers to this subject`);
      }
      return;
    }
    
    // 2. Check if assigned teachers exist in the system
    const existingTeachers = requirement.availableTeacherIds
      .map(teacherId => this.teachers.find(t => t.id === teacherId))
      .filter(Boolean) as Teacher[];
    
    if (!existingTeachers.length) {
      log(`   🚫 CRITICAL: None of the assigned teachers exist in the system`);
      return;
    }
    
    // 3. Check teacher availability
    const teachersWithAvailability = existingTeachers.filter(teacher => {
      const totalAvailableHours = Object.values(teacher.availableHours).reduce((sum, hours) => sum + hours.length, 0);
      return totalAvailableHours > 0;
    });
    
    if (!teachersWithAvailability.length) {
      log(`   🚫 CRITICAL: None of the assigned teachers have any available hours`);
      existingTeachers.forEach(teacher => {
        log(`   📅 Teacher ${teacher.firstName} ${teacher.lastName}: No available hours set`);
      });
      return;
    }
    
    // 4. Check classroom availability for this subject type
    const suitableClassrooms = this.getSuitableClassroomsForSubjectType(requirement.subjectType, requirement.subjectId, requirement.groupObj);
    if (!suitableClassrooms.length) {
      if (requirement.subjectType === 'lab') {
        const specializedLabs = this.getSpecializedClassroomsForSubject(requirement.subjectId);
        if (specializedLabs.length > 0) {
          log(`   🚫 CRITICAL: Subject requires specialized lab but all ${specializedLabs.length} specialized labs are unavailable`);
        } else {
          log(`   🚫 CRITICAL: No laboratory classrooms available for this subject`);
        }
      } else {
        log(`   🚫 CRITICAL: No suitable theory classrooms available`);
      }
      return;
    }
    
    // 5. Check for time slot conflicts
    this.analyzeTimeSlotConflicts(requirement, teachersWithAvailability, suitableClassrooms, log);
  }

  private getSuitableClassroomsForSubjectType(subjectType: string, subjectId: string, group: ClassGroup): Classroom[] {
    if (subjectType === 'lab') {
      // Check for specialized classrooms first
      const specialized = this.getSpecializedClassroomsForSubject(subjectId);
      if (specialized.length > 0) {
        return specialized;
      }
      // Fall back to general labs
      return this.classrooms.filter(c => c.type === 'lab' && (!c.specialization || c.specialization.trim() === ''));
    } else {
      // 🔥 NEW: Prioritized classroom selection for theory subjects
      const prioritizedClassrooms: Classroom[] = [];
      
      // 1. HIGHEST PRIORITY: Group's home classroom (if it's a theory classroom)
      if (group.homeRoom) {
        const homeClassroom = this.classrooms.find(c => c.id === group.homeRoom);
        if (homeClassroom && homeClassroom.type === 'theory') {
          prioritizedClassrooms.push(homeClassroom);
        }
      }
      
      // 2. General theory classrooms (excluding already added home classroom)
      const theoryClassrooms = this.classrooms.filter(c => 
        c.type === 'theory' && 
        !prioritizedClassrooms.some(pc => pc.id === c.id)
      );
      prioritizedClassrooms.push(...theoryClassrooms);
      
      // 3. Teacher labs and unassigned teacher labs
      const teacherLabs = this.classrooms.filter(c => 
        c.type === 'teacher_lab' && 
        !prioritizedClassrooms.some(pc => pc.id === c.id)
      );
      prioritizedClassrooms.push(...teacherLabs);
      
      return prioritizedClassrooms;
    }
  }

  private analyzeTimeSlotConflicts(
    requirement: LessonRequirement, 
    availableTeachers: Teacher[], 
    suitableClassrooms: Classroom[], 
    log: (message: string) => void
  ): void {
    log(`   🔍 Analyzing time conflicts for ${availableTeachers.length} teachers and ${suitableClassrooms.length} classrooms`);
    
    const conflictSummary = {
      teacherConflicts: 0,
      classroomConflicts: 0,
      groupConflicts: 0,
      teacherUnavailable: 0,
      teacherLabOwnership: 0,
      totalSlotsChecked: 0,
      potentialSlots: 0
    };
    
    // 🔥 Use properly ordered working days
    const orderedWorkingDays = this.getOrderedWorkingDays();
    
    for (const day of orderedWorkingDays) {
      for (let lessonNumber = 1; lessonNumber <= this.institution.lessonsPerDay; lessonNumber++) {
        conflictSummary.totalSlotsChecked++;
        
        // Check if group is already scheduled at this time
        const groupBusy = this.schedule.some(s => 
          s.classGroupId === requirement.groupId && 
          s.day === day && 
          s.lessonNumber === lessonNumber
        );
        if (groupBusy) {
          conflictSummary.groupConflicts++;
          continue;
        }
        
        // Check teacher availability
        const availableTeachersForSlot = availableTeachers.filter(teacher => {
          // Check if teacher has this time slot available
          if (!teacher.availableHours[day]?.includes(lessonNumber)) {
            conflictSummary.teacherUnavailable++;
            return false;
          }
          
          // Check if teacher is already scheduled
          const teacherBusy = this.schedule.some(s => 
            s.teacherId === teacher.id && 
            s.day === day && 
            s.lessonNumber === lessonNumber
          );
          if (teacherBusy) {
            conflictSummary.teacherConflicts++;
            return false;
          }
          
          return true;
        });
        
        if (availableTeachersForSlot.length === 0) continue;
        
        // Check classroom availability
        const availableClassroomsForSlot = suitableClassrooms.filter(classroom => {
          // Check if classroom is already scheduled
          const classroomBusy = this.schedule.some(s => 
            s.classroomId === classroom.id && 
            s.day === day && 
            s.lessonNumber === lessonNumber
          );
          if (classroomBusy) {
            conflictSummary.classroomConflicts++;
            return false;
          }
          
          // 🔥 Check teacher lab ownership
          if (classroom.type === 'teacher_lab') {
            const owner = this.teachers.find(t => t.homeClassroom === classroom.id);
            if (owner && !availableTeachersForSlot.some(t => t.id === owner.id)) {
              conflictSummary.teacherLabOwnership++;
              return false;
            }
          }
          
          return true;
        });
        
        if (availableClassroomsForSlot.length > 0) {
          conflictSummary.potentialSlots++;
          log(`   ✅ Found potential slot: ${day} lesson ${lessonNumber} with ${availableTeachersForSlot.length} teachers and ${availableClassroomsForSlot.length} classrooms`);
          // Continue analysis instead of returning to get full picture
        }
      }
    }
    
    // Provide detailed conflict analysis
    log(`   📊 Conflict analysis results:`);
    log(`      • Total time slots checked: ${conflictSummary.totalSlotsChecked}`);
    log(`      • Potential valid slots found: ${conflictSummary.potentialSlots}`);
    log(`      • Group already scheduled: ${conflictSummary.groupConflicts} slots`);
    log(`      • Teachers already scheduled: ${conflictSummary.teacherConflicts} conflicts`);
    log(`      • Teachers not available: ${conflictSummary.teacherUnavailable} conflicts`);
    log(`      • Classrooms already scheduled: ${conflictSummary.classroomConflicts} conflicts`);
    log(`      • Teacher lab ownership conflicts: ${conflictSummary.teacherLabOwnership} conflicts`);
    
    // Provide specific recommendations
    if (conflictSummary.potentialSlots > 0) {
      log(`   🤔 MYSTERY: Found ${conflictSummary.potentialSlots} potential slots but still couldn't schedule - this suggests a complex scoring/selection issue`);
    } else if (conflictSummary.teacherUnavailable > conflictSummary.teacherConflicts) {
      log(`   💡 RECOMMENDATION: Increase teacher availability hours for this subject`);
    } else if (conflictSummary.classroomConflicts > conflictSummary.teacherConflicts) {
      log(`   💡 RECOMMENDATION: Add more ${requirement.subjectType} classrooms or reduce classroom usage`);
    } else if (conflictSummary.teacherLabOwnership > 0) {
      log(`   💡 RECOMMENDATION: Assign more teachers to this subject or adjust teacher lab ownership`);
    } else if (conflictSummary.groupConflicts > 0) {
      log(`   💡 RECOMMENDATION: The group schedule is too dense, consider reducing total lessons`);
    } else {
      log(`   💡 RECOMMENDATION: Complex scheduling conflict - try adjusting teacher hours or adding resources`);
    }
  }

  private findAvailableSlots(requirement: LessonRequirement): ScheduleSlot[] {
    const availableSlots: ScheduleSlot[] = [];

    // 🔥 Use properly ordered working days (Monday first)
    const orderedWorkingDays = this.getOrderedWorkingDays();
    const randomizedDays = this.shuffleArray(orderedWorkingDays);
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

          // 🔥 CRITICAL: Double-check teacher is assigned to this group
          if (!teacher.assignedClassGroups.includes(requirement.groupId)) {
            return; // Skip this teacher - not assigned to this group
          }

          // Check if teacher is available at this time
          if (!teacher.availableHours[day]?.includes(lessonNumber)) return;

          // 🔥 NEW: Get suitable classrooms with prioritization
          const suitableClassrooms = this.getSuitableClassroomsForTeacher(
            requirement.subjectType, 
            requirement.subjectId, 
            teacherId,
            requirement.groupObj // Pass the full group object
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

  private getSuitableClassroomsForTeacher(subjectType: 'theory' | 'lab', subjectId: string, teacherId: string, group: ClassGroup): Classroom[] {
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
      // 🔥 NEW: Enhanced prioritization for theory subjects
      const prioritizedClassrooms: Classroom[] = [];
      
      // 1. HIGHEST PRIORITY: Group's home classroom (if it's a theory classroom)
      if (group.homeRoom) {
        const homeClassroom = this.classrooms.find(c => c.id === group.homeRoom);
        if (homeClassroom && homeClassroom.type === 'theory') {
          prioritizedClassrooms.push(homeClassroom);
        }
      }
      
      // 2. SECOND PRIORITY: Teacher's own lab (if they have one)
      const teacher = this.teachers.find(t => t.id === teacherId);
      if (teacher?.homeClassroom) {
        const teacherLab = this.classrooms.find(c => c.id === teacher.homeClassroom);
        if (teacherLab && teacherLab.type === 'teacher_lab' && !prioritizedClassrooms.some(pc => pc.id === teacherLab.id)) {
          prioritizedClassrooms.push(teacherLab);
        }
      }
      
      // 3. General theory classrooms (excluding already added)
      const theoryClassrooms = this.classrooms.filter(c => 
        c.type === 'theory' && 
        !prioritizedClassrooms.some(pc => pc.id === c.id)
      );
      prioritizedClassrooms.push(...theoryClassrooms);
      
      // 4. Unassigned teacher labs (teacher labs without owners)
      const unassignedTeacherLabs = this.classrooms.filter(c => {
        if (c.type !== 'teacher_lab') return false;
        if (prioritizedClassrooms.some(pc => pc.id === c.id)) return false;
        
        // Check if this teacher lab is assigned to any teacher
        const isAssigned = this.teachers.some(t => t.homeClassroom === c.id);
        return !isAssigned;
      });
      prioritizedClassrooms.push(...unassignedTeacherLabs);
      
      return prioritizedClassrooms;
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

    // 🔥 Check teacher lab ownership
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

    // 🔥 Use properly ordered working days for scoring
    const orderedWorkingDays = this.getOrderedWorkingDays();
    const dayIndex = orderedWorkingDays.indexOf(slot.day);
    
    // Prefer earlier in the week for important subjects
    score += (orderedWorkingDays.length - dayIndex) * 2;

    // Prefer middle lessons (not too early, not too late)
    const middleLesson = Math.ceil(this.institution.lessonsPerDay / 2);
    const lessonDistance = Math.abs(slot.lessonNumber - middleLesson);
    score += (this.institution.lessonsPerDay - lessonDistance) * 3;

    // Check for balanced distribution for this group
    const groupLessonsOnDay = this.schedule.filter(s => 
      s.classGroupId === slot.classGroupId && s.day === slot.day
    ).length;
    score -= groupLessonsOnDay * 5; // Penalty for overloading a day

    // 🔥 HUGE bonus for group using their home classroom
    if (slot.classroomId === requirement.groupObj.homeRoom) {
      score += 150; // Highest priority for group's home classroom
    }

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

    // 🔥 NEW: Enhanced same subject distribution logic
    const sameSubjectDistributionScore = this.calculateSameSubjectDistributionScore(slot, requirement);
    score += sameSubjectDistributionScore;

    // 🔥 NEW: Consecutive lesson logic for same teacher
    const consecutiveTeacherScore = this.calculateConsecutiveTeacherScore(slot, requirement);
    score += consecutiveTeacherScore;

    // 🎲 Add small random factor to break ties
    score += this.seededRandom() * 5;

    return score;
  }

  // 🔥 NEW: Calculate score for same subject distribution
  private calculateSameSubjectDistributionScore(slot: ScheduleSlot, requirement: LessonRequirement): number {
    let score = 0;

    // Count how many lessons of the same subject this group already has on this day
    const sameSubjectSameDay = this.schedule.filter(s => 
      s.classGroupId === slot.classGroupId && 
      s.subjectId === slot.subjectId && 
      s.day === slot.day
    ).length;

    // 🔥 MAIN RULE: Prefer different days for same subject
    if (sameSubjectSameDay === 0) {
      // No lessons of this subject on this day - HUGE bonus
      score += 200;
    } else if (sameSubjectSameDay === 1) {
      // Already 1 lesson of this subject on this day
      // Check if they would be consecutive
      const existingLesson = this.schedule.find(s => 
        s.classGroupId === slot.classGroupId && 
        s.subjectId === slot.subjectId && 
        s.day === slot.day
      );
      
      if (existingLesson && Math.abs(existingLesson.lessonNumber - slot.lessonNumber) === 1) {
        // Would be consecutive - this is acceptable
        score += 50;
      } else {
        // Would NOT be consecutive - heavy penalty
        score -= 150;
      }
    } else {
      // Already 2+ lessons of this subject on this day - very heavy penalty
      score -= 300;
    }

    return score;
  }

  // 🔥 NEW: Calculate score for consecutive lessons with same teacher
  private calculateConsecutiveTeacherScore(slot: ScheduleSlot, requirement: LessonRequirement): number {
    let score = 0;

    // Find existing lessons for this group and teacher on the same day
    const sameDayTeacherLessons = this.schedule.filter(s => 
      s.classGroupId === slot.classGroupId && 
      s.teacherId === slot.teacherId && 
      s.day === slot.day
    );

    if (sameDayTeacherLessons.length > 0) {
      // Check if any lesson is adjacent (consecutive)
      const hasAdjacentLesson = sameDayTeacherLessons.some(lesson => 
        Math.abs(lesson.lessonNumber - slot.lessonNumber) === 1
      );

      if (hasAdjacentLesson) {
        // Same teacher consecutive lessons - moderate bonus
        score += 30;
      } else {
        // Same teacher but not consecutive - small penalty
        score -= 10;
      }
    }

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

    // 🔥 Use properly ordered working days
    const orderedWorkingDays = this.getOrderedWorkingDays();

    // Check for groups with uneven daily distribution
    this.classGroups.forEach(group => {
      const dailyLessons = new Map<string, number>();
      
      orderedWorkingDays.forEach(day => {
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

    // 🔥 NEW: Analyze same subject distribution
    this.analyzeSameSubjectDistribution(log);

    // 🔥 NEW: Validate teacher-group assignments in final schedule
    this.validateFinalScheduleAssignments(log);

    // Log home classroom usage
    const groupsWithHomeRooms = this.classGroups.filter(g => g.homeRoom);
    groupsWithHomeRooms.forEach(group => {
      const homeClassroom = this.classrooms.find(c => c.id === group.homeRoom);
      if (homeClassroom) {
        const lessonsInHomeRoom = this.schedule.filter(s => 
          s.classGroupId === group.id && s.classroomId === group.homeRoom
        );
        const totalGroupLessons = this.schedule.filter(s => s.classGroupId === group.id);
        const homeRoomUsagePercent = totalGroupLessons.length > 0 
          ? Math.round((lessonsInHomeRoom.length / totalGroupLessons.length) * 100)
          : 0;
        
        log(`🏠 Group ${group.name} home room usage: ${lessonsInHomeRoom.length}/${totalGroupLessons.length} lessons (${homeRoomUsagePercent}%) in room ${homeClassroom.number}`);
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

  // 🔥 NEW: Validate final schedule assignments
  private validateFinalScheduleAssignments(log: (message: string) => void): void {
    log('🔍 Validating teacher-group assignments in final schedule...');
    
    let violationCount = 0;
    const violations: string[] = [];

    this.schedule.forEach(slot => {
      const teacher = this.teachers.find(t => t.id === slot.teacherId);
      const group = this.classGroups.find(g => g.id === slot.classGroupId);
      
      if (teacher && group) {
        if (!teacher.assignedClassGroups.includes(group.id)) {
          violationCount++;
          const violation = `Teacher ${teacher.firstName} ${teacher.lastName} assigned to group ${group.name} but not in their assigned groups list`;
          violations.push(violation);
          log(`   ❌ VIOLATION: ${violation}`);
        }
      }
    });

    if (violationCount === 0) {
      log(`   ✅ Perfect teacher-group assignment compliance: All ${this.schedule.length} lessons follow assignment rules`);
    } else {
      log(`   ⚠️ Found ${violationCount} teacher-group assignment violations:`);
      violations.forEach(violation => {
        log(`      • ${violation}`);
      });
      log(`   💡 RECOMMENDATION: Review teacher assignments to groups in the Teachers section`);
    }
  }

  // 🔥 NEW: Analyze same subject distribution across days
  private analyzeSameSubjectDistribution(log: (message: string) => void): void {
    log('📅 Analyzing same subject distribution across days...');

    const distributionStats = {
      perfectDistribution: 0, // All lessons on different days
      acceptableDistribution: 0, // Max 2 consecutive lessons per day
      problematicDistribution: 0, // Non-consecutive same subject on same day
      overloadedDays: 0 // 3+ lessons of same subject on same day
    };

    this.classGroups.forEach(group => {
      // Group lessons by subject
      const subjectLessons = new Map<string, ScheduleSlot[]>();
      this.schedule
        .filter(s => s.classGroupId === group.id)
        .forEach(lesson => {
          if (!subjectLessons.has(lesson.subjectId)) {
            subjectLessons.set(lesson.subjectId, []);
          }
          subjectLessons.get(lesson.subjectId)!.push(lesson);
        });

      subjectLessons.forEach((lessons, subjectId) => {
        if (lessons.length <= 1) return; // Skip subjects with only 1 lesson

        const subject = this.subjects.find(s => s.id === subjectId);
        const subjectName = subject?.name || subjectId;

        // Group lessons by day
        const dayGroups = new Map<string, ScheduleSlot[]>();
        lessons.forEach(lesson => {
          if (!dayGroups.has(lesson.day)) {
            dayGroups.set(lesson.day, []);
          }
          dayGroups.get(lesson.day)!.push(lesson);
        });

        // Analyze distribution
        const daysWithLessons = dayGroups.size;
        const totalLessons = lessons.length;

        if (daysWithLessons === totalLessons) {
          // Perfect: all lessons on different days
          distributionStats.perfectDistribution++;
          log(`   ✅ Perfect distribution: ${subjectName} for ${group.name} - all ${totalLessons} lessons on different days`);
        } else {
          // Check each day with multiple lessons
          let hasProblems = false;
          dayGroups.forEach((dayLessons, day) => {
            if (dayLessons.length > 1) {
              // Sort lessons by lesson number
              const sortedLessons = dayLessons.sort((a, b) => a.lessonNumber - b.lessonNumber);
              
              if (dayLessons.length > 2) {
                // 3+ lessons on same day
                distributionStats.overloadedDays++;
                log(`   ❌ Overloaded day: ${subjectName} for ${group.name} - ${dayLessons.length} lessons on ${day}`);
                hasProblems = true;
              } else {
                // Exactly 2 lessons - check if consecutive
                const areConsecutive = sortedLessons[1].lessonNumber === sortedLessons[0].lessonNumber + 1;
                if (areConsecutive) {
                  log(`   ✅ Acceptable: ${subjectName} for ${group.name} - 2 consecutive lessons on ${day}`);
                } else {
                  distributionStats.problematicDistribution++;
                  log(`   ⚠️ Problematic: ${subjectName} for ${group.name} - 2 non-consecutive lessons on ${day} (lessons ${sortedLessons[0].lessonNumber} and ${sortedLessons[1].lessonNumber})`);
                  hasProblems = true;
                }
              }
            }
          });

          if (!hasProblems) {
            distributionStats.acceptableDistribution++;
          }
        }
      });
    });

    log(`📊 Same subject distribution statistics:`);
    log(`   • Perfect distribution (all different days): ${distributionStats.perfectDistribution} subjects`);
    log(`   • Acceptable distribution (max 2 consecutive per day): ${distributionStats.acceptableDistribution} subjects`);
    log(`   • Problematic distribution (non-consecutive same day): ${distributionStats.problematicDistribution} subjects`);
    log(`   • Overloaded days (3+ lessons same day): ${distributionStats.overloadedDays} subjects`);

    if (distributionStats.problematicDistribution > 0 || distributionStats.overloadedDays > 0) {
      log(`   💡 RECOMMENDATION: Consider adjusting schedule to improve same-subject distribution`);
    } else {
      log(`   ✅ Excellent same-subject distribution across all groups!`);
    }
  }
}

interface LessonRequirement {
  id: string;
  groupId: string;
  groupName: string;
  groupObj: ClassGroup; // 🔥 NEW: Full group object for access to homeRoom
  subjectId: string;
  subjectName: string;
  subjectType: 'theory' | 'lab';
  availableTeacherIds: string[];
  priority: number;
  lessonIndex: number; // 🔥 NEW: Track lesson index for same subject
}