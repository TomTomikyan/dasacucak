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

  // ... rest of the class implementation ...
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