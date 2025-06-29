import { useState, useCallback, useEffect } from 'react';
import { Institution, ClassGroup, Subject, Classroom, Teacher, ScheduleSlot } from '../types';

const getDefaultBreakDurations = (lessonsPerDay: number): number[] => {
  // College default: short breaks (5 min) and long breaks (20 min)
  return Array.from({ length: lessonsPerDay - 1 }, (_, i) => {
    // Long break after 2nd lesson
    return i === 1 ? 20 : 10;
  });
};

const defaultInstitution: Institution = {
  id: '1',
  name: '',
  type: 'college',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  lessonsPerDay: 4,
  lessonDuration: 70,
  breakDurations: getDefaultBreakDurations(4),
  startTime: '09:00',
  academicWeeks: 40,
  specializations: [], // Initialize empty specializations array
};

// Local storage keys
const STORAGE_KEYS = {
  INSTITUTION: 'college_schedule_institution',
  CLASS_GROUPS: 'college_schedule_class_groups',
  SUBJECTS: 'college_schedule_subjects',
  CLASSROOMS: 'college_schedule_classrooms',
  TEACHERS: 'college_schedule_teachers',
  SCHEDULE: 'college_schedule_schedule',
  SUBJECT_NAME_MAPPING: 'college_schedule_subject_name_mapping',
};

// Helper functions for localStorage
const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

export const useScheduleData = () => {
  // Load initial data from localStorage
  const [institution, setInstitution] = useState<Institution>(() => 
    loadFromStorage(STORAGE_KEYS.INSTITUTION, defaultInstitution)
  );
  const [classGroups, setClassGroups] = useState<ClassGroup[]>(() => 
    loadFromStorage(STORAGE_KEYS.CLASS_GROUPS, [])
  );
  const [subjects, setSubjects] = useState<Subject[]>(() => 
    loadFromStorage(STORAGE_KEYS.SUBJECTS, [])
  );
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => 
    loadFromStorage(STORAGE_KEYS.CLASSROOMS, [])
  );
  const [teachers, setTeachers] = useState<Teacher[]>(() => 
    loadFromStorage(STORAGE_KEYS.TEACHERS, [])
  );
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(() => 
    loadFromStorage(STORAGE_KEYS.SCHEDULE, [])
  );

  // Track subject name changes to maintain relationships
  const [subjectNameMapping, setSubjectNameMapping] = useState<{ [oldName: string]: string }>(() => 
    loadFromStorage(STORAGE_KEYS.SUBJECT_NAME_MAPPING, {})
  );

  // Auto-save to localStorage when data changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.INSTITUTION, institution);
  }, [institution]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CLASS_GROUPS, classGroups);
  }, [classGroups]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SUBJECTS, subjects);
  }, [subjects]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CLASSROOMS, classrooms);
  }, [classrooms]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TEACHERS, teachers);
  }, [teachers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SCHEDULE, schedule);
  }, [schedule]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SUBJECT_NAME_MAPPING, subjectNameMapping);
  }, [subjectNameMapping]);

  // 🔥 AUTOMATIC: Update teacher subjects when subjects change
  useEffect(() => {
    if (teachers.length > 0 && subjects.length > 0) {
      let hasUpdates = false;
      
      const updatedTeachers = teachers.map(teacher => {
        const updatedSubjects: string[] = [];
        let teacherHasChanges = false;

        teacher.subjects.forEach(subjectName => {
          // First, check if subject exists with current name
          const currentSubject = subjects.find(s => s.name === subjectName);
          if (currentSubject) {
            updatedSubjects.push(currentSubject.name);
            return;
          }

          // If not found, try to find by partial match (renamed subject)
          const possibleSubject = subjects.find(s => 
            s.name.toLowerCase().includes(subjectName.toLowerCase()) ||
            subjectName.toLowerCase().includes(s.name.toLowerCase())
          );
          
          if (possibleSubject) {
            updatedSubjects.push(possibleSubject.name);
            teacherHasChanges = true;
          }
          // If no match found, the subject was deleted - don't add it
        });

        if (teacherHasChanges || updatedSubjects.length !== teacher.subjects.length) {
          hasUpdates = true;
          return { ...teacher, subjects: updatedSubjects };
        }

        return teacher;
      });

      if (hasUpdates) {
        setTeachers(updatedTeachers);
      }
    }
  }, [subjects]); // Run when subjects change

  // 🔥 AUTOMATIC: Auto-assign teachers to subjects when teachers change
  useEffect(() => {
    if (teachers.length > 0 && subjects.length > 0) {
      const updatedSubjects = subjects.map(subject => {
        // Find teachers who teach this subject
        const matchingTeachers = teachers.filter(teacher => 
          teacher.subjects.includes(subject.name)
        );
        
        // Get current teacher IDs for this subject
        const currentTeacherIds = subject.teacherIds || [];
        
        // Get IDs of matching teachers
        const matchingTeacherIds = matchingTeachers.map(teacher => teacher.id);
        
        // Only update if there are changes
        const shouldUpdate = 
          matchingTeacherIds.length !== currentTeacherIds.length ||
          !matchingTeacherIds.every(id => currentTeacherIds.includes(id));
        
        if (shouldUpdate) {
          return {
            ...subject,
            teacherIds: matchingTeacherIds
          };
        }
        
        return subject;
      });
      
      // Check if any subjects were actually updated
      const hasChanges = updatedSubjects.some((subject, index) => 
        JSON.stringify(subject.teacherIds) !== JSON.stringify(subjects[index].teacherIds)
      );
      
      if (hasChanges) {
        setSubjects(updatedSubjects);
      }
    }
  }, [teachers]); // Only depend on teachers, not subjects to avoid infinite loop

  // 🔥 AUTOMATIC: Update schedule when subjects change
  useEffect(() => {
    if (schedule.length > 0 && subjects.length > 0) {
      let hasUpdates = false;
      
      const updatedSchedule = schedule.map(slot => {
        const subject = subjects.find(s => s.id === slot.subjectId);
        if (subject) {
          return slot; // Subject found, no update needed
        }
        
        // Try to find subject by name (in case the ID changed)
        const subjectByName = subjects.find(s => s.name === slot.subjectId);
        if (subjectByName) {
          hasUpdates = true;
          return {
            ...slot,
            subjectId: subjectByName.id // Update to use correct ID
          };
        }
        
        return slot; // Keep as is if no match found
      });
      
      if (hasUpdates) {
        setSchedule(updatedSchedule);
      }
    }
  }, [subjects]); // Run when subjects change

  const updateInstitution = useCallback((updates: Partial<Institution>) => {
    setInstitution(prev => {
      const newInstitution = { ...prev, ...updates };
      
      // Update break durations when lessons per day changes
      if (updates.lessonsPerDay !== undefined) {
        const lessonsPerDay = updates.lessonsPerDay;
        newInstitution.breakDurations = getDefaultBreakDurations(lessonsPerDay);
      }
      
      return newInstitution;
    });
  }, []);

  const addClassGroup = useCallback((classGroup: Omit<ClassGroup, 'id'>) => {
    const newClassGroup: ClassGroup = {
      ...classGroup,
      id: Date.now().toString(),
      subjectHours: classGroup.subjectHours || {}, // Use provided subjectHours or empty object
    };
    setClassGroups(prev => [...prev, newClassGroup]);
  }, []);

  const updateClassGroupSubjects = useCallback((groupId: string, subjectHours: { [subjectId: string]: number }) => {
    setClassGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, subjectHours }
        : group
    ));
  }, []);

  const addSubject = useCallback((subject: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      ...subject,
      id: Date.now().toString(),
    };
    
    // Auto-assign teachers who teach this subject
    const matchingTeachers = teachers.filter(teacher => 
      teacher.subjects.includes(subject.name)
    );
    newSubject.teacherIds = matchingTeachers.map(teacher => teacher.id);
    
    setSubjects(prev => [...prev, newSubject]);
  }, [teachers]);

  const addClassroom = useCallback((classroom: Omit<Classroom, 'id'>) => {
    const newClassroom: Classroom = {
      ...classroom,
      id: Date.now().toString(),
    };
    setClassrooms(prev => [...prev, newClassroom]);
  }, []);

  const addTeacher = useCallback((teacher: Omit<Teacher, 'id'>) => {
    const newTeacher: Teacher = {
      ...teacher,
      id: Date.now().toString(),
    };
    setTeachers(prev => [...prev, newTeacher]);
  }, []);

  const generateClassrooms = useCallback((floors: number, roomsPerFloor: number) => {
    const newClassrooms: Classroom[] = [];
    
    for (let floor = 1; floor <= floors; floor++) {
      for (let room = 1; room <= roomsPerFloor; room++) {
        const roomNumber = `${floor}${room.toString().padStart(2, '0')}`;
        newClassrooms.push({
          id: `${floor}-${room}`,
          number: roomNumber,
          floor,
          type: 'theory',
          hasComputers: false,
          capacity: 30,
        });
      }
    }
    
    setClassrooms(newClassrooms);
  }, []);

  const generateCollegeGroups = useCallback((years: number[], specializations: string[]) => {
    const newGroups: ClassGroup[] = [];
    
    years.forEach(year => {
      specializations.forEach((spec, specIndex) => {
        for (let stream = 1; stream <= 3; stream++) {
          const groupName = `${year.toString().slice(-1)}${specIndex + 1}${stream}`;
          // Calculate course based on current year vs entry year
          const currentYear = new Date().getFullYear();
          const course = Math.min(Math.max(currentYear - year + 1, 1), 4);
          
          newGroups.push({
            id: `${year}-${specIndex}-${stream}`,
            name: groupName,
            type: 'college_group',
            course: course,
            specialization: spec,
            studentsCount: 25,
            subjectHours: {},
          });
        }
      });
    });
    
    setClassGroups(newGroups);
  }, []);

  // Export/Import functions
  const exportConfiguration = useCallback(() => {
    const configData = {
      institution,
      classGroups,
      subjects,
      classrooms,
      teachers,
      schedule,
      subjectNameMapping,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(configData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${institution.name || 'college'}_configuration_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [institution, classGroups, subjects, classrooms, teachers, schedule, subjectNameMapping]);

  const importConfiguration = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const configData = JSON.parse(e.target?.result as string);
          
          // Validate the structure
          if (!configData.institution || !configData.version) {
            throw new Error('Invalid configuration file format');
          }

          // Import data
          setInstitution(configData.institution);
          setClassGroups(configData.classGroups || []);
          setSubjects(configData.subjects || []);
          setClassrooms(configData.classrooms || []);
          setTeachers(configData.teachers || []);
          setSchedule(configData.schedule || []);
          setSubjectNameMapping(configData.subjectNameMapping || {});
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  const clearAllData = useCallback(() => {
    setInstitution(defaultInstitution);
    setClassGroups([]);
    setSubjects([]);
    setClassrooms([]);
    setTeachers([]);
    setSchedule([]);
    setSubjectNameMapping({});
    
    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }, []);

  return {
    institution,
    setInstitution: updateInstitution,
    classGroups,
    setClassGroups,
    addClassGroup,
    updateClassGroupSubjects,
    subjects,
    setSubjects,
    addSubject,
    classrooms,
    setClassrooms,
    addClassroom,
    generateClassrooms,
    teachers,
    setTeachers,
    addTeacher,
    schedule,
    setSchedule,
    generateCollegeGroups,
    exportConfiguration,
    importConfiguration,
    clearAllData,
  };
}