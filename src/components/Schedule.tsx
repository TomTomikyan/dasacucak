import React, { useState, useEffect } from 'react';
import { Calendar, Play, RotateCcw, Download, Filter, Users, BookOpen, GraduationCap, MapPin, Clock, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp, Eye, EyeOff, Move, ArrowRightLeft, X } from 'lucide-react';
import { ScheduleSlot, Institution, ClassGroup, Subject, Teacher, Classroom } from '../types';
import { ScheduleGenerator } from '../utils/scheduleGenerator';
import { ICSExporter, ICSEvent } from '../utils/icsExport';
import { useLocalization } from '../hooks/useLocalization';

interface ScheduleProps {
  schedule: ScheduleSlot[];
  setSchedule: (schedule: ScheduleSlot[]) => void;
  institution: Institution;
  classGroups: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  classrooms: Classroom[];
  showToast: {
    showSuccess: (title: string, message: string, duration?: number) => void;
    showError: (title: string, message: string, duration?: number) => void;
    showWarning: (title: string, message: string, duration?: number) => void;
    showInfo: (title: string, message: string, duration?: number) => void;
  };
}

// Enhanced Tooltip component with side positioning
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate tooltip dimensions (approximate)
    const tooltipWidth = 320; // Max width
    const tooltipHeight = 200; // Approximate height
    
    let x = rect.right + 10; // Default: show to the right
    let y = rect.top + rect.height / 2; // Center vertically
    
    // Check if tooltip would go off the right edge
    if (x + tooltipWidth > viewportWidth) {
      x = rect.left - tooltipWidth - 10; // Show to the left instead
    }
    
    // Check if tooltip would go off the bottom edge
    if (y + tooltipHeight / 2 > viewportHeight) {
      y = viewportHeight - tooltipHeight - 10;
    }
    
    // Check if tooltip would go off the top edge
    if (y - tooltipHeight / 2 < 10) {
      y = 10 + tooltipHeight / 2;
    }
    
    setPosition({ x, y });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className="fixed z-50 px-4 py-3 text-sm text-white bg-[#03524f] rounded-lg shadow-xl pointer-events-none border border-[#024239]"
          style={{
            left: position.x,
            top: position.y - 100, // Offset to center vertically
            maxWidth: '320px',
            whiteSpace: 'pre-wrap',
            transform: 'translateY(-50%)', // Center vertically
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(3, 82, 79, 0.95)'
          }}
        >
          {content}
          {/* Arrow pointing to the element */}
          <div 
            className="absolute top-1/2 w-0 h-0 border-t-4 border-b-4 border-transparent transform -translate-y-1/2"
            style={{
              left: position.x > window.innerWidth / 2 ? '100%' : '-8px', // Arrow on left if tooltip is on right side
              borderRightColor: position.x > window.innerWidth / 2 ? 'transparent' : 'rgba(3, 82, 79, 0.95)',
              borderLeftColor: position.x > window.innerWidth / 2 ? 'rgba(3, 82, 79, 0.95)' : 'transparent',
              borderRightWidth: position.x > window.innerWidth / 2 ? '0' : '8px',
              borderLeftWidth: position.x > window.innerWidth / 2 ? '8px' : '0'
            }}
          />
        </div>
      )}
    </div>
  );
};

const Schedule: React.FC<ScheduleProps> = ({
  schedule,
  setSchedule,
  institution,
  classGroups,
  subjects,
  teachers,
  classrooms,
  showToast,
}) => {
  const { t } = useLocalization();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(true);

  // 🔥 ENHANCED: Drag and Drop states with better validation
  const [draggedSlot, setDraggedSlot] = useState<ScheduleSlot | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: string; lesson: number; groupId: string } | null>(null);
  const [isDropValid, setIsDropValid] = useState(false);
  const [dragValidationMessage, setDragValidationMessage] = useState<string>('');

  // 🔥 NEW: Get properly ordered working days (Monday first)
  const getOrderedWorkingDays = (): string[] => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Filter and sort working days according to proper week order
    return dayOrder.filter(day => institution.workingDays.includes(day));
  };

  // Filter schedule by selected group
  const filteredSchedule = selectedGroup === 'all' 
    ? schedule 
    : schedule.filter(slot => slot.classGroupId === selectedGroup);

  // Get entity names and details
  const getGroupName = (groupId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    return group ? group.name : t('common.unknown');
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      return subject.name;
    }
    
    const subjectByName = subjects.find(s => s.name === subjectId);
    if (subjectByName) {
      return subjectByName.name;
    }
    
    return subjectId || t('common.unknown');
  };

  const getSubjectDetails = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId) || subjects.find(s => s.name === subjectId);
    if (!subject) return getSubjectName(subjectId);
    
    const typeText = subject.type === 'theory' ? t('subjects.theory') : t('subjects.laboratory');
    const courseText = t(`courses.${subject.course}`);
    return `${subject.name}\n${typeText}\n${courseText}`;
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : t('common.unknown');
  };

  const getTeacherDetails = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return t('common.unknown');
    
    const subjectsList = teacher.subjects.length > 0 
      ? teacher.subjects.join(', ') 
      : 'Առարկաներ չեն նշանակված';
    
    return `${teacher.firstName} ${teacher.lastName}\nԱռարկաներ: ${subjectsList}`;
  };

  const getClassroomName = (classroomId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? classroom.number : t('common.unknown');
  };

  const getClassroomDetails = (classroomId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) return t('common.unknown');
    
    const typeText = classroom.type === 'theory' 
      ? t('classrooms.theoryClassroom')
      : classroom.type === 'lab'
      ? t('subjects.laboratory')
      : t('classrooms.teacherLab');
    
    const computerText = classroom.hasComputers ? 'Ունի համակարգիչներ' : 'Համակարգիչներ չկան';
    
    return `Դասարան ${classroom.number}\n${t('common.floor')} ${classroom.floor}\n${typeText}\n${computerText}\n${t('common.capacity')}: ${classroom.capacity}`;
  };

  const getGroupDetails = (groupId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    if (!group) return '';
    
    const courseText = t(`courses.${group.course || 1}`);
    return `${group.name}\n${courseText}\n${group.specialization || 'Ընդհանուր'}\n${group.studentsCount} ուսանող`;
  };

  // Get full lesson details for tooltip
  const getLessonTooltip = (slot: ScheduleSlot) => {
    const subject = getSubjectDetails(slot.subjectId);
    const teacher = getTeacherDetails(slot.teacherId);
    const classroom = getClassroomDetails(slot.classroomId);
    const group = getGroupDetails(slot.classGroupId);
    
    return `📚 ${subject}\n\n👨‍🏫 ${teacher}\n\n🏫 ${classroom}\n\n👥 ${group}\n\n⏰ ${slot.startTime} - ${slot.endTime}`;
  };

  // 🔥 ENHANCED: Drag and Drop handlers with better validation
  const handleDragStart = (e: React.DragEvent, slot: ScheduleSlot) => {
    setDraggedSlot(slot);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slot.id);
    
    // Add visual feedback to the dragged element
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedSlot(null);
    setDragOverCell(null);
    setIsDropValid(false);
    setDragValidationMessage('');
  };

  // 🔥 ENHANCED: Better validation logic
  const validateDragOperation = (targetDay: string, targetLesson: number, targetGroupId: string): { valid: boolean; message: string } => {
    if (!draggedSlot) return { valid: false, message: 'Ոչ մի դաս չի ընտրված' };

    // 1. Check if trying to move between different groups
    if (draggedSlot.classGroupId !== targetGroupId) {
      const sourceGroupName = getGroupName(draggedSlot.classGroupId);
      const targetGroupName = getGroupName(targetGroupId);
      return { 
        valid: false, 
        message: `Չի կարող տեղափոխել ${sourceGroupName}-ից ${targetGroupName}` 
      };
    }

    // 2. Check if trying to move to the same position
    if (draggedSlot.day === targetDay && draggedSlot.lessonNumber === targetLesson) {
      return { valid: true, message: 'Նույն դիրքը' };
    }

    // 3. Check teacher availability
    const teacher = teachers.find(t => t.id === draggedSlot.teacherId);
    if (teacher && (!teacher.availableHours[targetDay] || !teacher.availableHours[targetDay].includes(targetLesson))) {
      return { 
        valid: false, 
        message: `Ուսուցիչ ${getTeacherName(draggedSlot.teacherId)} հասանելի չէ ${t(`days.${targetDay.toLowerCase()}`)} օրվա ${targetLesson}-րդ դասին` 
      };
    }

    // 4. Check for teacher conflicts (excluding current slot and target slot if swapping)
    const existingSlot = schedule.find(s => 
      s.day === targetDay && 
      s.lessonNumber === targetLesson && 
      s.classGroupId === targetGroupId
    );

    const teacherConflict = schedule.find(s => 
      s.id !== draggedSlot.id && 
      s.id !== existingSlot?.id &&
      s.teacherId === draggedSlot.teacherId && 
      s.day === targetDay && 
      s.lessonNumber === targetLesson
    );

    if (teacherConflict) {
      return { 
        valid: false, 
        message: `Ուսուցիչ ${getTeacherName(draggedSlot.teacherId)} արդեն զբաղված է այս ժամին` 
      };
    }

    // 5. Check for classroom conflicts
    const classroomConflict = schedule.find(s => 
      s.id !== draggedSlot.id && 
      s.id !== existingSlot?.id &&
      s.classroomId === draggedSlot.classroomId && 
      s.day === targetDay && 
      s.lessonNumber === targetLesson
    );

    if (classroomConflict) {
      return { 
        valid: false, 
        message: `Դասարան ${getClassroomName(draggedSlot.classroomId)} արդեն զբաղված է այս ժամին` 
      };
    }

    // 6. If there's an existing slot, validate the swap
    if (existingSlot) {
      // Check if the existing slot's teacher is available at the dragged slot's original time
      const existingTeacher = teachers.find(t => t.id === existingSlot.teacherId);
      if (existingTeacher && (!existingTeacher.availableHours[draggedSlot.day] || !existingTeacher.availableHours[draggedSlot.day].includes(draggedSlot.lessonNumber))) {
        return { 
          valid: false, 
          message: `Փոխանակումը անհնար է: Ուսուցիչ ${getTeacherName(existingSlot.teacherId)} հասանելի չէ ${t(`days.${draggedSlot.day.toLowerCase()}`)} օրվա ${draggedSlot.lessonNumber}-րդ դասին` 
        };
      }

      return { valid: true, message: `Փոխանակել ${getSubjectName(existingSlot.subjectId)}-ի հետ` };
    }

    return { valid: true, message: 'Տեղափոխել դատարկ վանդակ' };
  };

  const handleDragOver = (e: React.DragEvent, day: string, lesson: number, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedSlot) return;
    
    const validation = validateDragOperation(day, lesson, groupId);
    setIsDropValid(validation.valid);
    setDragValidationMessage(validation.message);
    setDragOverCell({ day, lesson, groupId });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the cell (not moving to a child element)
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverCell(null);
      setIsDropValid(false);
      setDragValidationMessage('');
    }
  };

  const handleDrop = (e: React.DragEvent, targetDay: string, targetLesson: number, targetGroupId: string) => {
    e.preventDefault();
    
    if (!draggedSlot) return;
    
    const validation = validateDragOperation(targetDay, targetLesson, targetGroupId);
    
    if (!validation.valid) {
      showToast.showError(
        t('schedule.cannotSwap'),
        validation.message
      );
      setDraggedSlot(null);
      setDragOverCell(null);
      setIsDropValid(false);
      setDragValidationMessage('');
      return;
    }

    // Check if there's already a lesson at the target position
    const existingSlot = schedule.find(s => 
      s.day === targetDay && 
      s.lessonNumber === targetLesson && 
      s.classGroupId === targetGroupId
    );

    if (existingSlot && existingSlot.id !== draggedSlot.id) {
      // Swap lessons
      handleSwapLessons(draggedSlot, existingSlot);
    } else {
      // Move lesson to empty slot
      handleMoveLesson(draggedSlot, targetDay, targetLesson);
    }

    setDraggedSlot(null);
    setDragOverCell(null);
    setIsDropValid(false);
    setDragValidationMessage('');
  };

  const handleMoveLesson = (slot: ScheduleSlot, newDay: string, newLesson: number) => {
    // Calculate new times
    const { startTime, endTime } = calculateLessonTime(newLesson);

    // Update the schedule
    const updatedSchedule = schedule.map(s => 
      s.id === slot.id 
        ? { ...s, day: newDay, lessonNumber: newLesson, startTime, endTime }
        : s
    );

    setSchedule(updatedSchedule);
    showToast.showSuccess(
      t('schedule.lessonMoved'),
      t('schedule.lessonMovedDesc')
    );
  };

  const handleSwapLessons = (slot1: ScheduleSlot, slot2: ScheduleSlot) => {
    // Calculate new times for both lessons
    const { startTime: startTime1, endTime: endTime1 } = calculateLessonTime(slot2.lessonNumber);
    const { startTime: startTime2, endTime: endTime2 } = calculateLessonTime(slot1.lessonNumber);

    // Swap the lessons
    const updatedSchedule = schedule.map(s => {
      if (s.id === slot1.id) {
        return { 
          ...s, 
          day: slot2.day, 
          lessonNumber: slot2.lessonNumber, 
          startTime: startTime1, 
          endTime: endTime1 
        };
      }
      if (s.id === slot2.id) {
        return { 
          ...s, 
          day: slot1.day, 
          lessonNumber: slot1.lessonNumber, 
          startTime: startTime2, 
          endTime: endTime2 
        };
      }
      return s;
    });

    setSchedule(updatedSchedule);
    showToast.showSuccess(
      t('schedule.lessonsSwapped'),
      t('schedule.lessonsSwappedDesc')
    );
  };

  const calculateLessonTime = (lessonNumber: number): { startTime: string; endTime: string } => {
    const [startHour, startMinute] = institution.startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMinute;

    // Add time for previous lessons and breaks
    for (let i = 1; i < lessonNumber; i++) {
      currentMinutes += institution.lessonDuration;
      if (i < institution.lessonsPerDay && institution.breakDurations[i - 1]) {
        currentMinutes += institution.breakDurations[i - 1];
      }
    }

    const startTime = formatTime(currentMinutes);
    const endTime = formatTime(currentMinutes + institution.lessonDuration);

    return { startTime, endTime };
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Generate schedule
  const handleGenerateSchedule = async (regenerate = false) => {
    if (regenerate && schedule.length > 0) {
      setShowRegenerateConfirm(true);
      return;
    }

    setIsGenerating(true);
    setGenerationLogs([]);
    setShowLogs(true);
    setLogsExpanded(true); // Auto-expand when generation starts

    try {
      const generator = new ScheduleGenerator(
        institution,
        classGroups,
        subjects,
        teachers,
        classrooms
      );

      const result = await generator.generateSchedule((message: string) => {
        setGenerationLogs(prev => [...prev, message]);
      });

      if (result.success) {
        setSchedule(result.schedule);
        showToast.showSuccess(
          regenerate ? t('toast.regenerationSuccessful') : t('toast.generationSuccessful'),
          t('toast.generationSuccessfulDesc', { count: result.schedule.length })
        );
      } else {
        showToast.showError(
          regenerate ? t('toast.regenerationFailed') : t('toast.generationFailed'),
          result.error || t('toast.generationErrorDesc')
        );
      }
    } catch (error) {
      showToast.showError(
        t('toast.generationError'),
        error instanceof Error ? error.message : t('toast.generationErrorDesc')
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmRegenerate = () => {
    setShowRegenerateConfirm(false);
    setSchedule([]); // Clear existing schedule
    handleGenerateSchedule(false);
  };

  // Export schedule as ICS
  const handleExportSchedule = () => {
    if (schedule.length === 0) {
      showToast.showWarning(t('toast.noScheduleWarning'), t('toast.noScheduleWarningDesc'));
      return;
    }

    setIsExporting(true);

    try {
      const events: ICSEvent[] = schedule.map(slot => {
        const startDate = new Date();
        startDate.setHours(parseInt(slot.startTime.split(':')[0]), parseInt(slot.startTime.split(':')[1]), 0, 0);
        
        const endDate = new Date();
        endDate.setHours(parseInt(slot.endTime.split(':')[0]), parseInt(slot.endTime.split(':')[1]), 0, 0);

        return {
          uid: slot.id,
          summary: `${getSubjectName(slot.subjectId)} - ${getGroupName(slot.classGroupId)}`,
          description: `Ուսուցիչ: ${getTeacherName(slot.teacherId)}\nԽումբ: ${getGroupName(slot.classGroupId)}\nԱռարկա: ${getSubjectName(slot.subjectId)}`,
          location: `Դասարան ${getClassroomName(slot.classroomId)}`,
          startDate,
          endDate,
          recurrence: 'FREQ=WEEKLY;COUNT=40' // Repeat for academic weeks
        };
      });

      const icsContent = ICSExporter.generateICS(events, `${institution.name} - Ժամանակացույց`);
      const filename = `${institution.name.replace(/\s+/g, '_')}_schedule_${new Date().toISOString().split('T')[0]}.ics`;
      
      ICSExporter.downloadICS(icsContent, filename);
      
      showToast.showSuccess(
        t('schedule.exportSuccessTitle'),
        t('schedule.exportSuccessDesc', { filename, eventsCount: events.length })
      );
    } catch (error) {
      showToast.showError(
        t('toast.icsExportFailedDesc'),
        error instanceof Error ? error.message : t('toast.icsExportFailedDesc')
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Check requirements
  const checkRequirements = () => {
    const issues = [];
    
    if (classGroups.length === 0) issues.push(t('overview.noGroups'));
    if (subjects.length === 0) issues.push(t('overview.noSubjects'));
    if (teachers.length === 0) issues.push(t('overview.noTeachers'));
    if (classrooms.length === 0) issues.push(t('overview.noClassrooms'));

    const groupsWithoutSubjects = classGroups.filter(g => Object.keys(g.subjectHours || {}).length === 0);
    if (groupsWithoutSubjects.length > 0) {
      issues.push(t('toast.noSubjectsAssignedDesc'));
    }

    const subjectsWithoutTeachers = subjects.filter(s => s.teacherIds.length === 0);
    if (subjectsWithoutTeachers.length > 0) {
      issues.push(t('toast.noTeachersAssignedDesc'));
    }

    return issues;
  };

  const requirements = checkRequirements();
  const canGenerate = requirements.length === 0;

  // Calculate lesson times
  const calculateLessonTimes = () => {
    const times: { lesson: number; startTime: string; endTime: string }[] = [];
    const [startHour, startMinute] = institution.startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMinute;

    for (let i = 1; i <= institution.lessonsPerDay; i++) {
      const startTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      currentMinutes += institution.lessonDuration;
      const endTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      
      times.push({ lesson: i, startTime, endTime });

      if (i < institution.lessonsPerDay && institution.breakDurations[i - 1]) {
        currentMinutes += institution.breakDurations[i - 1];
      }
    }

    return times;
  };

  const lessonTimes = calculateLessonTimes();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-[#03524f]" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('schedule.title')}</h2>
            <p className="text-sm text-gray-500">
              {schedule.length > 0 
                ? `${schedule.length} ${t('schedule.totalLessons')}`
                : t('schedule.noSchedule')
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleGenerateSchedule(schedule.length > 0)}
            disabled={!canGenerate || isGenerating}
            className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : schedule.length > 0 ? (
              <RotateCcw className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isGenerating 
              ? t('schedule.generating')
              : schedule.length > 0 
                ? t('schedule.regenerate')
                : t('schedule.generate')
            }
          </button>
          
          {schedule.length > 0 && (
            <button
              onClick={handleExportSchedule}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? t('schedule.exporting') : t('schedule.export')}
            </button>
          )}
        </div>
      </div>

      {/* Requirements Check */}
      {requirements.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">{t('schedule.requirementsCheck')}</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 ENHANCED: Drag and Drop Instructions with better visual design */}
      {schedule.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Move className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">{t('schedule.dragDropInstructions')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start space-x-3 p-3 bg-white bg-opacity-60 rounded-lg">
                  <Move className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-blue-900 text-sm">{t('schedule.moveWithinGroup')}</div>
                    <div className="text-blue-700 text-xs mt-1">{t('schedule.moveWithinGroupDesc')}</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-white bg-opacity-60 rounded-lg">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-blue-900 text-sm">{t('schedule.swapLessonsDesc')}</div>
                    <div className="text-blue-700 text-xs mt-1">{t('schedule.swapLessonsDescText')}</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-white bg-opacity-60 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-amber-900 text-sm">{t('schedule.restriction')}</div>
                    <div className="text-amber-700 text-xs mt-1">{t('schedule.restrictionDesc')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Logs - COLLAPSIBLE */}
      {showLogs && generationLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Collapsible Header */}
          <div 
            className="flex items-center justify-between p-4 bg-[#03524f] bg-opacity-5 border-b border-[#03524f] border-opacity-10 cursor-pointer transition-colors"
            onClick={() => setLogsExpanded(!logsExpanded)}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 text-[#03524f] animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-[#03524f]" />
                )}
                <h3 className="text-sm font-medium text-[#03524f]">
                  {isGenerating ? 'Ստեղծման գործընթաց...' : 'Ստեղծման գործընթաց ավարտված'}
                </h3>
              </div>
              <div className="text-xs text-[#03524f] bg-[#03524f] bg-opacity-10 px-2 py-1 rounded-full">
                {generationLogs.length} գրառում
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogs(false);
                }}
                className="text-[#03524f] transition-colors p-1"
                title="Փակել"
              >
                <EyeOff className="h-4 w-4" />
              </button>
              <div className="text-[#03524f] transition-transform duration-200" style={{ transform: logsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
          
          {/* Collapsible Content */}
          <div className={`transition-all duration-300 ease-in-out ${logsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
            <div className="p-4">
              <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-md p-3 border border-gray-200">
                <div className="space-y-1 text-xs font-mono">
                  {generationLogs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`text-gray-700 py-1 px-2 rounded transition-colors ${
                        log.includes('✅') ? 'bg-green-50 text-green-700' :
                        log.includes('❌') ? 'bg-red-50 text-red-700' :
                        log.includes('⚠️') ? 'bg-yellow-50 text-yellow-700' :
                        log.includes('🚀') || log.includes('🎲') ? 'bg-blue-50 text-blue-700' :
                        ''
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex items-center space-x-2 py-2 px-2 bg-blue-50 text-blue-700 rounded">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Գործընթացը շարունակվում է...</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Summary when collapsed */}
              {!isGenerating && (
                <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                  <span>Ավարտված: {new Date().toLocaleTimeString('hy-AM')}</span>
                  <span>Ընդամենը {generationLogs.filter(log => log.includes('✅')).length} հաջող գործողություն</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      {schedule.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-[#03524f]" />
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">{t('schedule.filterByGroup')}:</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
              >
                <option value="all">{t('schedule.allGroups')}</option>
                {classGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Grid - 🔥 COMPLETELY REMOVED ALL HOVER EFFECTS */}
      {schedule.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {/* Day column header */}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    {t('common.day')}
                  </th>
                  {/* Time column header */}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    {t('common.time')}
                  </th>
                  {/* Group column headers */}
                  {(selectedGroup === 'all' ? classGroups : classGroups.filter(g => g.id === selectedGroup)).map(group => (
                    <th key={group.id} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                      <Tooltip content={getGroupDetails(group.id)}>
                        <div className="flex flex-col items-center cursor-help">
                          <div className="font-bold text-[#03524f] text-lg">{group.name}</div>
                          <div className="text-xs text-gray-400 mt-1 normal-case">
                            {group.specialization || 'Ընդհանուր'} • {group.studentsCount} ուս.
                          </div>
                        </div>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getOrderedWorkingDays().map(day => (
                  <React.Fragment key={day}>
                    {lessonTimes.map((time, timeIndex) => (
                      <tr key={`${day}-${time.lesson}`}>
                        {/* Day name - only show on first lesson of the day */}
                        {timeIndex === 0 && (
                          <td 
                            rowSpan={institution.lessonsPerDay} 
                            className="px-4 py-4 whitespace-nowrap border-r border-gray-200 bg-gray-50 text-center"
                          >
                            <div className="font-semibold text-[#03524f] text-sm transform -rotate-90 whitespace-nowrap">
                              {t(`days.${day.toLowerCase()}`)}
                            </div>
                          </td>
                        )}

                        {/* Lesson time */}
                        <td className="px-2 py-2 text-xs text-gray-500 border-r border-gray-200 bg-gray-50 text-center">
                          <Tooltip content={`${time.lesson}-րդ դաս\n${time.startTime} - ${time.endTime}\nՏևողություն: ${institution.lessonDuration} րոպե`}>
                            <div className="cursor-help">
                              <div className="font-medium text-[#03524f]">{time.lesson}</div>
                              <div className="text-xs">{time.startTime}</div>
                              <div className="text-xs">{time.endTime}</div>
                            </div>
                          </Tooltip>
                        </td>

                        {/* Schedule slots for each group - 🔥 NO HOVER EFFECTS AT ALL */}
                        {(selectedGroup === 'all' ? classGroups : classGroups.filter(g => g.id === selectedGroup)).map(group => {
                          const slot = filteredSchedule.find(s => 
                            s.day === day && 
                            s.lessonNumber === time.lesson && 
                            s.classGroupId === group.id
                          );

                          const isDragOver = dragOverCell?.day === day && 
                                           dragOverCell?.lesson === time.lesson && 
                                           dragOverCell?.groupId === group.id;

                          return (
                            <td 
                              key={group.id} 
                              className={`px-2 py-2 transition-all duration-200 relative ${
                                isDragOver 
                                  ? isDropValid 
                                    ? 'bg-green-100 border-2 border-green-400 border-dashed' 
                                    : 'bg-red-100 border-2 border-red-400 border-dashed'
                                  : ''
                              }`}
                              onDragOver={(e) => handleDragOver(e, day, time.lesson, group.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, day, time.lesson, group.id)}
                            >
                              {slot ? (
                                <Tooltip content={getLessonTooltip(slot)}>
                                  <div 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, slot)}
                                    onDragEnd={handleDragEnd}
                                    className="bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-lg p-2 min-h-[70px] cursor-move transition-all duration-200 relative"
                                  >
                                    <div className="space-y-1">
                                      <div className="font-medium text-[#03524f] text-xs truncate">
                                        {getSubjectName(slot.subjectId)}
                                      </div>
                                      <div className="flex items-center text-xs text-gray-600">
                                        <GraduationCap className="h-3 w-3 mr-1 flex-shrink-0" />
                                        <span className="truncate">{getTeacherName(slot.teacherId)}</span>
                                      </div>
                                      <div className="flex items-center text-xs text-gray-600">
                                        <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                        <span className="truncate">{getClassroomName(slot.classroomId)}</span>
                                      </div>
                                    </div>
                                    {/* Drag indicator - always visible */}
                                    <div className="absolute top-1 right-1">
                                      <Move className="h-3 w-3 text-[#03524f] opacity-60" />
                                    </div>
                                  </div>
                                </Tooltip>
                              ) : (
                                <div className={`border-2 border-dashed rounded-lg p-2 min-h-[70px] flex flex-col items-center justify-center transition-all duration-200 ${
                                  isDragOver && isDropValid
                                    ? 'border-green-400 bg-green-50'
                                    : isDragOver && !isDropValid
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-gray-200'
                                }`}>
                                  {isDragOver ? (
                                    <div className="text-center">
                                      <div className={`text-xs font-medium ${isDropValid ? 'text-green-700' : 'text-red-700'}`}>
                                        {isDropValid ? (
                                          <div className="flex items-center space-x-1">
                                            <CheckCircle className="h-3 w-3" />
                                            <span>{dragValidationMessage}</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center space-x-1">
                                            <X className="h-3 w-3" />
                                            <span>Չի կարող</span>
                                          </div>
                                        )}
                                      </div>
                                      {!isDropValid && dragValidationMessage && (
                                        <div className="text-xs text-red-600 mt-1 max-w-[140px] break-words">
                                          {dragValidationMessage}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">Դատարկ</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Add separator between days */}
                    {day !== getOrderedWorkingDays()[getOrderedWorkingDays().length - 1] && (
                      <tr className="bg-gray-100">
                        <td colSpan={(selectedGroup === 'all' ? classGroups.length : 1) + 2} className="h-1"></td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('schedule.noSchedule')}</h3>
          <p className="text-gray-500 mb-6">{t('schedule.noScheduleDesc')}</p>
          {canGenerate && (
            <button
              onClick={() => handleGenerateSchedule(false)}
              disabled={isGenerating}
              className="inline-flex items-center px-6 py-3 bg-[#03524f] text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Play className="h-5 w-5 mr-2" />
              )}
              {isGenerating ? t('schedule.generating') : t('schedule.generate')}
            </button>
          )}
        </div>
      )}

      {/* Regenerate Confirmation Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{t('schedule.regenerateConfirm')}</h3>
                  <p className="text-sm text-gray-500">{t('schedule.regenerateWarning')}</p>
                </div>
              </div>
              
              <ul className="text-sm text-gray-700 mb-6 space-y-1">
                {t('schedule.regenerateWarningItems').map((item: string, index: number) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRegenerateConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmRegenerate}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md"
                >
                  {t('schedule.yesRegenerate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;