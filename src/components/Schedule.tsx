import React, { useState } from 'react';
import { Calendar, Play, Download, Upload, RefreshCw, Clock, Users, MapPin, AlertTriangle, CheckCircle, X, ArrowRight, ArrowLeftRight, RotateCcw, GraduationCap } from 'lucide-react';
import { ScheduleSlot, Institution, ClassGroup, Subject, Teacher, Classroom } from '../types';
import { ICSExporter, ICSEvent } from '../utils/icsExport';
import { ScheduleGenerator } from '../utils/scheduleGenerator';
import { useLocalization } from '../hooks/useLocalization';

interface ToastFunctions {
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, duration?: number) => void;
  showWarning: (title: string, message: string, duration?: number) => void;
  showInfo: (title: string, message: string, duration?: number) => void;
}

interface ScheduleProps {
  schedule: ScheduleSlot[];
  setSchedule: (schedule: ScheduleSlot[]) => void;
  institution: Institution;
  classGroups: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  classrooms: Classroom[];
  showToast: ToastFunctions;
}

interface SwapConfirmation {
  sourceSlot: ScheduleSlot;
  targetSlot: ScheduleSlot;
  isValid: boolean;
  conflicts: string[];
}

interface ValidDropTarget {
  day: string;
  lessonNumber: number;
  groupId: string;
  isValid: boolean;
  isSwappable: boolean;
  reason?: string;
}

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
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [draggedSlot, setDraggedSlot] = useState<ScheduleSlot | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{day: string, lessonNumber: number} | null>(null);
  const [validDropTargets, setValidDropTargets] = useState<ValidDropTarget[]>([]);
  const [swapConfirmation, setSwapConfirmation] = useState<SwapConfirmation | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const generateSchedule = async (isRegeneration = false) => {
    setIsGenerating(true);
    
    try {
      console.log('🧹 Clearing existing schedule before generation...');
      setSchedule([]);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log(`🚀 Starting ${isRegeneration ? 'regeneration' : 'generation'}...`);
      
      const generator = new ScheduleGenerator(
        institution,
        classGroups,
        subjects,
        teachers,
        classrooms
      );
      
      const result = await generator.generateSchedule();
      
      if (result.success) {
        console.log(`✅ ${isRegeneration ? 'Regeneration' : 'Generation'} successful:`, result.schedule.length, 'lessons');
        setSchedule(result.schedule);
        showToast.showSuccess(
          isRegeneration ? t('toast.regenerationSuccessful') : t('toast.generationSuccessful'),
          t(isRegeneration ? 'toast.regenerationSuccessfulDesc' : 'toast.generationSuccessfulDesc', { count: result.schedule.length })
        );
      } else {
        console.error(`❌ ${isRegeneration ? 'Regeneration' : 'Generation'} failed:`, result.error);
        showToast.showError(
          isRegeneration ? t('toast.regenerationFailed') : t('toast.generationFailed'),
          result.error || 'An unknown error occurred during schedule generation.'
        );
      }
    } catch (error) {
      console.error('Schedule generation error:', error);
      showToast.showError(
        t('toast.generationError'),
        t('toast.generationErrorDesc')
      );
    } finally {
      setIsGenerating(false);
      setShowRegenerateConfirm(false);
    }
  };

  const handleGenerateClick = () => {
    if (schedule.length > 0) {
      setShowRegenerateConfirm(true);
    } else {
      generateSchedule(false);
    }
  };

  const confirmRegenerate = () => {
    generateSchedule(true);
  };

  const exportToICS = async () => {
    if (schedule.length === 0) {
      showToast.showWarning(t('toast.noScheduleWarning'), t('toast.noScheduleWarningDesc'));
      return;
    }

    setIsExporting(true);

    try {
      const events: ICSEvent[] = [];
      const currentDate = new Date();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);

      const filteredSchedule = selectedGroup === 'all' 
        ? schedule 
        : schedule.filter(slot => slot.classGroupId === selectedGroup);

      filteredSchedule.forEach(slot => {
        const dayIndex = institution.workingDays.indexOf(slot.day);
        if (dayIndex === -1) return;

        const eventDate = new Date(startOfWeek);
        eventDate.setDate(startOfWeek.getDate() + dayIndex);

        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);

        const startDateTime = new Date(eventDate);
        startDateTime.setHours(startHour, startMinute, 0, 0);

        const endDateTime = new Date(eventDate);
        endDateTime.setHours(endHour, endMinute, 0, 0);

        const groupName = getEntityName(slot.classGroupId, 'group');
        const subjectName = getEntityName(slot.subjectId, 'subject');
        const teacherName = getEntityName(slot.teacherId, 'teacher');
        const classroomName = getEntityName(slot.classroomId, 'classroom');

        events.push({
          uid: `schedule-${slot.id}-${startDateTime.getTime()}@college-schedule.local`,
          summary: `${subjectName} - ${groupName}`,
          description: `Subject: ${subjectName}\nGroup: ${groupName}\nTeacher: ${teacherName}\nClassroom: ${classroomName}\nLesson: ${slot.lessonNumber}`,
          location: `Classroom ${classroomName}`,
          startDate: startDateTime,
          endDate: endDateTime,
          recurrence: `FREQ=WEEKLY;BYDAY=${getDayAbbreviation(slot.day)};COUNT=${institution.academicWeeks}`,
        });
      });

      const calendarName = selectedGroup === 'all' 
        ? `${institution.name} - Full Schedule`
        : `${institution.name} - ${getEntityName(selectedGroup, 'group')}`;

      const icsContent = ICSExporter.generateICS(events, calendarName);
      
      const filename = selectedGroup === 'all' 
        ? `${institution.name.replace(/\s+/g, '_')}_full_schedule.ics`
        : `${institution.name.replace(/\s+/g, '_')}_${getEntityName(selectedGroup, 'group')}_schedule.ics`;

      ICSExporter.downloadICS(icsContent, filename);

      showToast.showSuccess(
        t('schedule.exportSuccessTitle'),
        t('schedule.exportSuccessDesc', { filename, eventsCount: events.length }),
        8000
      );

    } catch (error) {
      console.error('Export error:', error);
      showToast.showError('Export Failed', 'An error occurred while exporting the schedule. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getDayAbbreviation = (day: string): string => {
    const dayMap: { [key: string]: string } = {
      'Monday': 'MO',
      'Tuesday': 'TU',
      'Wednesday': 'WE',
      'Thursday': 'TH',
      'Friday': 'FR',
      'Saturday': 'SA',
      'Sunday': 'SU',
    };
    return dayMap[day] || 'MO';
  };

  const calculateLessonTime = (lessonNumber: number, institution: Institution) => {
    const [startHour, startMinute] = institution.startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMinute;

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

  const getEntityName = (id: string, type: 'group' | 'subject' | 'teacher' | 'classroom') => {
    switch (type) {
      case 'group':
        return classGroups.find(g => g.id === id)?.name || 'Unknown';
      case 'subject':
        return subjects.find(s => s.id === id)?.name || 'Unknown';
      case 'teacher':
        const teacher = teachers.find(t => t.id === id);
        return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown';
      case 'classroom':
        return classrooms.find(c => c.id === id)?.number || 'Unknown';
      default:
        return 'Unknown';
    }
  };

  // Enhanced drag and drop functionality with highlighting
  const calculateValidDropTargets = (draggedSlot: ScheduleSlot): ValidDropTarget[] => {
    const targets: ValidDropTarget[] = [];
    
    // Get unique groups for the current view
    const uniqueGroups = [...new Set(filteredSchedule.map(slot => slot.classGroupId))]
      .map(groupId => ({
        id: groupId,
        name: getEntityName(groupId, 'group')
      }));

    // For each group, day, and lesson combination
    uniqueGroups.forEach(group => {
      institution.workingDays.forEach(day => {
        for (let lessonNumber = 1; lessonNumber <= institution.lessonsPerDay; lessonNumber++) {
          // Skip the current slot position
          if (draggedSlot.classGroupId === group.id && 
              draggedSlot.day === day && 
              draggedSlot.lessonNumber === lessonNumber) {
            return;
          }

          // Only allow drops within the same group
          if (draggedSlot.classGroupId !== group.id) {
            targets.push({
              day,
              lessonNumber,
              groupId: group.id,
              isValid: false,
              isSwappable: false,
              reason: 'Different group'
            });
            return;
          }

          // Check if there's an existing lesson at this slot
          const existingSlot = schedule.find(slot => 
            slot.classGroupId === group.id && 
            slot.day === day && 
            slot.lessonNumber === lessonNumber
          );

          if (existingSlot) {
            // This is a potential swap target - check if swap is valid
            const swapValidation = validateSwap(draggedSlot, existingSlot);
            targets.push({
              day,
              lessonNumber,
              groupId: group.id,
              isValid: swapValidation.valid,
              isSwappable: true,
              reason: swapValidation.valid ? 'Can swap' : swapValidation.conflicts.join(', ')
            });
          } else {
            // This is an empty slot - check if move is valid
            const validation = validateMove(draggedSlot, day, lessonNumber);
            targets.push({
              day,
              lessonNumber,
              groupId: group.id,
              isValid: validation.valid,
              isSwappable: false,
              reason: validation.error || undefined
            });
          }
        }
      });
    });

    return targets;
  };

  const handleDragStart = (e: React.DragEvent, slot: ScheduleSlot) => {
    setDraggedSlot(slot);
    e.dataTransfer.effectAllowed = 'move';
    
    // Calculate and set valid drop targets
    const targets = calculateValidDropTargets(slot);
    setValidDropTargets(targets);
  };

  const handleDragEnd = () => {
    setDraggedSlot(null);
    setValidDropTargets([]);
    setDragOverSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, day: string, lessonNumber: number, groupId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ day, lessonNumber });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: string, targetLessonNumber: number, targetGroupId?: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    setValidDropTargets([]);

    if (!draggedSlot) return;

    // Check if dropping on the same slot
    if (draggedSlot.day === targetDay && draggedSlot.lessonNumber === targetLessonNumber) {
      setDraggedSlot(null);
      return;
    }

    // If we have a target group ID, ensure we're only moving within the same group
    if (targetGroupId && draggedSlot.classGroupId !== targetGroupId) {
      const draggedGroupName = getEntityName(draggedSlot.classGroupId, 'group');
      const targetGroupName = getEntityName(targetGroupId, 'group');
      
      showToast.showError(
        t('schedule.moveError'),
        t('schedule.cannotMoveBetweenGroups', { sourceGroup: draggedGroupName, targetGroup: targetGroupName })
      );
      setDraggedSlot(null);
      return;
    }

    // Check if there's already a lesson at the target slot
    const targetSlot = schedule.find(slot => 
      slot.day === targetDay && 
      slot.lessonNumber === targetLessonNumber &&
      (!targetGroupId || slot.classGroupId === targetGroupId)
    );

    if (targetSlot) {
      // Check that both lessons belong to the same group
      if (draggedSlot.classGroupId !== targetSlot.classGroupId) {
        const draggedGroupName = getEntityName(draggedSlot.classGroupId, 'group');
        const targetGroupName = getEntityName(targetSlot.classGroupId, 'group');
        
        showToast.showError(
          t('schedule.swapError'),
          t('schedule.cannotSwapBetweenGroups', { sourceGroup: draggedGroupName, targetGroup: targetGroupName })
        );
        setDraggedSlot(null);
        return;
      }

      // If groups are the same - allow swap
      const swapValidation = validateSwap(draggedSlot, targetSlot);
      setSwapConfirmation({
        sourceSlot: draggedSlot,
        targetSlot: targetSlot,
        isValid: swapValidation.valid,
        conflicts: swapValidation.conflicts
      });
    } else {
      // Simple move to empty slot
      const validation = validateMove(draggedSlot, targetDay, targetLessonNumber);
      if (!validation.valid) {
        showToast.showError(t('schedule.moveError'), validation.error);
        setDraggedSlot(null);
        return;
      }

      performMove(draggedSlot, targetDay, targetLessonNumber);
    }

    setDraggedSlot(null);
  };

  const validateMove = (slot: ScheduleSlot, targetDay: string, targetLessonNumber: number) => {
    // Check if teacher is available at target time
    const teacher = teachers.find(t => t.id === slot.teacherId);
    if (teacher && (!teacher.availableHours[targetDay] || !teacher.availableHours[targetDay].includes(targetLessonNumber))) {
      return {
        valid: false,
        error: `Teacher ${getEntityName(slot.teacherId, 'teacher')} is not available on ${targetDay} at lesson ${targetLessonNumber}`
      };
    }

    // Check for teacher conflicts
    const teacherConflict = schedule.find(s => 
      s.id !== slot.id && 
      s.teacherId === slot.teacherId && 
      s.day === targetDay && 
      s.lessonNumber === targetLessonNumber
    );
    if (teacherConflict) {
      return {
        valid: false,
        error: `Teacher ${getEntityName(slot.teacherId, 'teacher')} already has a lesson at this time`
      };
    }

    // Check for classroom conflicts
    const classroomConflict = schedule.find(s => 
      s.id !== slot.id && 
      s.classroomId === slot.classroomId && 
      s.day === targetDay && 
      s.lessonNumber === targetLessonNumber
    );
    if (classroomConflict) {
      return {
        valid: false,
        error: `Classroom ${getEntityName(slot.classroomId, 'classroom')} is already occupied at this time`
      };
    }

    // Check for group conflicts
    const groupConflict = schedule.find(s => 
      s.id !== slot.id && 
      s.classGroupId === slot.classGroupId && 
      s.day === targetDay && 
      s.lessonNumber === targetLessonNumber
    );
    if (groupConflict) {
      return {
        valid: false,
        error: `Group ${getEntityName(slot.classGroupId, 'group')} already has a lesson at this time`
      };
    }

    return { valid: true, error: null };
  };

  const validateSwap = (sourceSlot: ScheduleSlot, targetSlot: ScheduleSlot) => {
    const conflicts: string[] = [];

    // Check if source teacher can work at target time
    const sourceTeacher = teachers.find(t => t.id === sourceSlot.teacherId);
    if (sourceTeacher && (!sourceTeacher.availableHours[targetSlot.day] || !sourceTeacher.availableHours[targetSlot.day].includes(targetSlot.lessonNumber))) {
      conflicts.push(`${getEntityName(sourceSlot.teacherId, 'teacher')} is not available on ${targetSlot.day} at lesson ${targetSlot.lessonNumber}`);
    }

    // Check if target teacher can work at source time
    const targetTeacher = teachers.find(t => t.id === targetSlot.teacherId);
    if (targetTeacher && (!targetTeacher.availableHours[sourceSlot.day] || !targetTeacher.availableHours[sourceSlot.day].includes(sourceSlot.lessonNumber))) {
      conflicts.push(`${getEntityName(targetSlot.teacherId, 'teacher')} is not available on ${sourceSlot.day} at lesson ${sourceSlot.lessonNumber}`);
    }

    // Create schedule without the two slots being swapped for conflict checking
    const scheduleWithoutSwappingSlots = schedule.filter(s => s.id !== sourceSlot.id && s.id !== targetSlot.id);

    // Check source slot conflicts at target position
    const sourceAtTargetConflicts = scheduleWithoutSwappingSlots.filter(s => 
      (s.teacherId === sourceSlot.teacherId || 
       s.classroomId === sourceSlot.classroomId || 
       s.classGroupId === sourceSlot.classGroupId) &&
      s.day === targetSlot.day && 
      s.lessonNumber === targetSlot.lessonNumber
    );

    sourceAtTargetConflicts.forEach(conflict => {
      if (conflict.teacherId === sourceSlot.teacherId) {
        conflicts.push(`Teacher ${getEntityName(sourceSlot.teacherId, 'teacher')} already has another lesson at target time`);
      }
      if (conflict.classroomId === sourceSlot.classroomId) {
        conflicts.push(`Classroom ${getEntityName(sourceSlot.classroomId, 'classroom')} is already occupied at target time`);
      }
      if (conflict.classGroupId === sourceSlot.classGroupId) {
        conflicts.push(`Group ${getEntityName(sourceSlot.classGroupId, 'group')} already has another lesson at target time`);
      }
    });

    // Check target slot conflicts at source position
    const targetAtSourceConflicts = scheduleWithoutSwappingSlots.filter(s => 
      (s.teacherId === targetSlot.teacherId || 
       s.classroomId === targetSlot.classroomId || 
       s.classGroupId === targetSlot.classGroupId) &&
      s.day === sourceSlot.day && 
      s.lessonNumber === sourceSlot.lessonNumber
    );

    targetAtSourceConflicts.forEach(conflict => {
      if (conflict.teacherId === targetSlot.teacherId) {
        conflicts.push(`Teacher ${getEntityName(targetSlot.teacherId, 'teacher')} already has another lesson at source time`);
      }
      if (conflict.classroomId === targetSlot.classroomId) {
        conflicts.push(`Classroom ${getEntityName(targetSlot.classroomId, 'classroom')} is already occupied at source time`);
      }
      if (conflict.classGroupId === targetSlot.classGroupId) {
        conflicts.push(`Group ${getEntityName(targetSlot.classGroupId, 'group')} already has another lesson at source time`);
      }
    });

    return { valid: conflicts.length === 0, conflicts };
  };

  const performMove = (slot: ScheduleSlot, targetDay: string, targetLessonNumber: number) => {
    const { startTime, endTime } = calculateLessonTime(targetLessonNumber, institution);
    
    const updatedSchedule = schedule.map(s => {
      if (s.id === slot.id) {
        return {
          ...s,
          day: targetDay,
          lessonNumber: targetLessonNumber,
          startTime,
          endTime,
        };
      }
      return s;
    });

    setSchedule(updatedSchedule);
    showToast.showSuccess(t('schedule.lessonMoved'), t('schedule.lessonMovedDesc'));
  };

  const performSwap = () => {
    if (!swapConfirmation) return;

    const { sourceSlot, targetSlot } = swapConfirmation;

    // Calculate new times
    const sourceNewTime = calculateLessonTime(targetSlot.lessonNumber, institution);
    const targetNewTime = calculateLessonTime(sourceSlot.lessonNumber, institution);

    const updatedSchedule = schedule.map(slot => {
      if (slot.id === sourceSlot.id) {
        return {
          ...slot,
          day: targetSlot.day,
          lessonNumber: targetSlot.lessonNumber,
          startTime: sourceNewTime.startTime,
          endTime: sourceNewTime.endTime,
        };
      }
      if (slot.id === targetSlot.id) {
        return {
          ...slot,
          day: sourceSlot.day,
          lessonNumber: sourceSlot.lessonNumber,
          startTime: targetNewTime.startTime,
          endTime: targetNewTime.endTime,
        };
      }
      return slot;
    });

    setSchedule(updatedSchedule);
    setSwapConfirmation(null);
    showToast.showSuccess(t('schedule.lessonsSwapped'), t('schedule.lessonsSwappedDesc'));
  };

  const cancelSwap = () => {
    setSwapConfirmation(null);
  };

  // Helper function to check if a cell is a valid drop target (empty slot)
  const isValidDropTarget = (day: string, lessonNumber: number, groupId: string): boolean => {
    if (!draggedSlot) return false;
    
    const target = validDropTargets.find(t => 
      t.day === day && 
      t.lessonNumber === lessonNumber && 
      t.groupId === groupId
    );
    
    return target?.isValid && !target?.isSwappable || false;
  };

  // Helper function to check if a cell is a valid swap target (occupied slot)
  const isValidSwapTarget = (day: string, lessonNumber: number, groupId: string): boolean => {
    if (!draggedSlot) return false;
    
    const target = validDropTargets.find(t => 
      t.day === day && 
      t.lessonNumber === lessonNumber && 
      t.groupId === groupId
    );
    
    return target?.isValid && target?.isSwappable || false;
  };

  // Helper function to check if a cell is an invalid target
  const isInvalidTarget = (day: string, lessonNumber: number, groupId: string): boolean => {
    if (!draggedSlot) return false;
    
    const target = validDropTargets.find(t => 
      t.day === day && 
      t.lessonNumber === lessonNumber && 
      t.groupId === groupId
    );
    
    return target ? !target.isValid : false;
  };

  const filteredSchedule = selectedGroup === 'all' 
    ? schedule 
    : schedule.filter(slot => slot.classGroupId === selectedGroup);

  // Get unique groups for columns
  const uniqueGroups = [...new Set(filteredSchedule.map(slot => slot.classGroupId))]
    .map(groupId => ({
      id: groupId,
      name: getEntityName(groupId, 'group')
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group schedule by group, day and lesson
  const scheduleByGroup = uniqueGroups.reduce((acc, group) => {
    acc[group.id] = {};
    institution.workingDays.forEach(day => {
      acc[group.id][day] = {};
      for (let lesson = 1; lesson <= institution.lessonsPerDay; lesson++) {
        acc[group.id][day][lesson] = filteredSchedule.find(slot => 
          slot.classGroupId === group.id && 
          slot.day === day && 
          slot.lessonNumber === lesson
        ) || null;
      }
    });
    return acc;
  }, {} as Record<string, Record<string, Record<number, ScheduleSlot | null>>>);

  // Check if we have the minimum required data for generation
  const canGenerate = classGroups.length > 0 && subjects.length > 0 && teachers.length > 0 && classrooms.length > 0;
  const hasAssignedSubjects = classGroups.some(group => Object.keys(group.subjectHours || {}).length > 0);
  const hasAssignedTeachers = subjects.some(subject => subject.teacherIds.length > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('schedule.title')}</h2>
        </div>
        <div className="flex space-x-2">
          {/* Generate/Regenerate Button */}
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating || !canGenerate || !hasAssignedSubjects || !hasAssignedTeachers}
            className={`inline-flex items-center px-3 py-2 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              schedule.length > 0 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
          
          {/* Export Button */}
          <button 
            onClick={exportToICS}
            disabled={isExporting || schedule.length === 0}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? t('schedule.exporting') : t('schedule.export')}
          </button>
        </div>
      </div>

      {/* Regenerate Confirmation Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{t('schedule.regenerateConfirm')}</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">{t('schedule.regenerateWarning')}</h4>
                    <div className="text-sm text-yellow-700 mt-1">
                      {t('schedule.regenerateWarningItems').map((item: string, index: number) => (
                        <p key={index}>• {item}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    {t('schedule.currentSchedule')} <strong>{schedule.length} {t('common.lessons')}</strong>
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRegenerateConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmRegenerate}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700"
                >
                  {t('schedule.yesRegenerate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Swap Confirmation Modal */}
      {swapConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <ArrowLeftRight className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  {t('schedule.swapLessons', { group: getEntityName(swapConfirmation.sourceSlot.classGroupId, 'group') })}
                </h3>
              </div>

              <div className="space-y-4">
                {/* Source Lesson */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">{t('schedule.moving')}</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>{t('common.subject')}:</strong> {getEntityName(swapConfirmation.sourceSlot.subjectId, 'subject')}</div>
                    <div><strong>{t('common.group')}:</strong> {getEntityName(swapConfirmation.sourceSlot.classGroupId, 'group')}</div>
                    <div><strong>{t('common.teacher')}:</strong> {getEntityName(swapConfirmation.sourceSlot.teacherId, 'teacher')}</div>
                    <div><strong>{t('common.room')}:</strong> {getEntityName(swapConfirmation.sourceSlot.classroomId, 'classroom')}</div>
                    <div><strong>{t('common.time')}:</strong> {swapConfirmation.sourceSlot.day}, {t('common.lesson')} {swapConfirmation.sourceSlot.lessonNumber} ({swapConfirmation.sourceSlot.startTime}-{swapConfirmation.sourceSlot.endTime})</div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowLeftRight className="h-6 w-6 text-gray-400" />
                </div>

                {/* Target Lesson */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">{t('schedule.swappingWith')}</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>{t('common.subject')}:</strong> {getEntityName(swapConfirmation.targetSlot.subjectId, 'subject')}</div>
                    <div><strong>{t('common.group')}:</strong> {getEntityName(swapConfirmation.targetSlot.classGroupId, 'group')}</div>
                    <div><strong>{t('common.teacher')}:</strong> {getEntityName(swapConfirmation.targetSlot.teacherId, 'teacher')}</div>
                    <div><strong>{t('common.room')}:</strong> {getEntityName(swapConfirmation.targetSlot.classroomId, 'classroom')}</div>
                    <div><strong>{t('common.time')}:</strong> {swapConfirmation.targetSlot.day}, {t('common.lesson')} {swapConfirmation.targetSlot.lessonNumber} ({swapConfirmation.targetSlot.startTime}-{swapConfirmation.targetSlot.endTime})</div>
                  </div>
                </div>

                {/* Conflicts */}
                {!swapConfirmation.isValid && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-900 mb-2">{t('schedule.conflictsDetected')}</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {swapConfirmation.conflicts.map((conflict, index) => (
                        <li key={index}>• {conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Success message */}
                {swapConfirmation.isValid && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">{t('schedule.swapPossible')}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={cancelSwap}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={performSwap}
                  disabled={!swapConfirmation.isValid}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  {swapConfirmation.isValid ? t('schedule.confirmSwap') : t('schedule.cannotSwap')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Requirements Check */}
      {(!canGenerate || !hasAssignedSubjects || !hasAssignedTeachers) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-3 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <h3 className="text-sm font-medium text-yellow-900">{t('schedule.requirementsCheck')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              {classGroups.length > 0 ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
              <span className={classGroups.length > 0 ? 'text-green-700' : 'text-red-700'}>
                {t('navigation.groups')}: {classGroups.length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {subjects.length > 0 ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
              <span className={subjects.length > 0 ? 'text-green-700' : 'text-red-700'}>
                {t('navigation.subjects')}: {subjects.length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {teachers.length > 0 ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
              <span className={teachers.length > 0 ? 'text-green-700' : 'text-red-700'}>
                {t('navigation.teachers')}: {teachers.length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {classrooms.length > 0 ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
              <span className={classrooms.length > 0 ? 'text-green-700' : 'text-red-700'}>
                {t('navigation.classrooms')}: {classrooms.length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {hasAssignedSubjects ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
              <span className={hasAssignedSubjects ? 'text-green-700' : 'text-red-700'}>
                {t('schedule.subjectAssignments')}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {hasAssignedTeachers ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
              <span className={hasAssignedTeachers ? 'text-green-700' : 'text-red-700'}>
                {t('schedule.teacherAssignments')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('schedule.filterByGroup')}</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('schedule.allGroups')}</option>
                {classGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {t('schedule.totalLessons')} {filteredSchedule.length}
            {schedule.length > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                {selectedGroup === 'all' ? t('schedule.allGroups') : `${t('common.group')}: ${getEntityName(selectedGroup, 'group')}`} • {t('schedule.dragToMove')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Display */}
      {schedule.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('schedule.noSchedule')}</h3>
          <p className="text-gray-500 text-sm">
            {t('schedule.noScheduleDesc')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Schedule Table with Group Columns - Enhanced with highlighting */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 z-10 w-8">
                    {t('common.day')}
                  </th>
                  <th className="sticky left-8 bg-gray-50 px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 z-10 w-8">
                    #
                  </th>
                  {uniqueGroups.map(group => (
                    <th key={group.id} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 w-20">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-blue-900">{group.name}</span>
                        <span className="text-xs text-gray-500 mt-1">
                          {filteredSchedule.filter(s => s.classGroupId === group.id).length} {t('common.lessons')}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {institution.workingDays.map((day, dayIndex) => {
                  const dayLessons = Array.from({ length: institution.lessonsPerDay }, (_, i) => i + 1);
                  
                  return dayLessons.map((lessonNumber, lessonIndex) => {
                    const { startTime, endTime } = calculateLessonTime(lessonNumber, institution);
                    
                    return (
                      <tr key={`${day}-${lessonNumber}`} className="hover:bg-gray-50">
                        {/* Day Column - only show for first lesson of the day */}
                        {lessonIndex === 0 ? (
                          <td 
                            className="sticky left-0 bg-white px-1 py-1 text-xs font-medium text-gray-900 border-r border-gray-200 z-10"
                            rowSpan={institution.lessonsPerDay}
                          >
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-blue-900 text-xs transform -rotate-90 whitespace-nowrap">
                                {t(`days.${day.toLowerCase()}`)}
                              </span>
                            </div>
                          </td>
                        ) : null}
                        
                        {/* Lesson Number Column */}
                        <td className="sticky left-8 bg-white px-1 py-1 text-center border-r border-gray-200 z-10">
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">{lessonNumber}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {startTime}
                            </div>
                            <div className="text-xs text-gray-500">
                              {endTime}
                            </div>
                          </div>
                        </td>
                        
                        {/* Group Columns - Enhanced with highlighting */}
                        {uniqueGroups.map(group => {
                          const slot = scheduleByGroup[group.id]?.[day]?.[lessonNumber];
                          const isDragOver = dragOverSlot?.day === day && dragOverSlot?.lessonNumber === lessonNumber;
                          const isValidTarget = isValidDropTarget(day, lessonNumber, group.id);
                          const isValidSwap = isValidSwapTarget(day, lessonNumber, group.id);
                          const isInvalid = isInvalidTarget(day, lessonNumber, group.id);
                          
                          // Enhanced cell styling based on drag state
                          let cellClasses = `px-1 py-1 border-r border-gray-200 w-20 transition-all duration-200 `;
                          
                          if (draggedSlot) {
                            if (isValidTarget) {
                              // Empty slot that can accept the dragged lesson
                              cellClasses += 'bg-green-100 border-green-300 shadow-inner ';
                            } else if (isValidSwap) {
                              // Occupied slot that can be swapped with
                              cellClasses += 'bg-blue-100 border-blue-300 shadow-inner ';
                            } else if (isInvalid) {
                              // Invalid target
                              cellClasses += 'bg-red-50 border-red-200 ';
                            } else {
                              // Neutral state
                              cellClasses += 'bg-gray-100 ';
                            }
                          }
                          
                          if (isDragOver) {
                            if (isValidTarget) {
                              cellClasses += 'bg-green-200 border-green-400 shadow-lg ';
                            } else if (isValidSwap) {
                              cellClasses += 'bg-blue-200 border-blue-400 shadow-lg ';
                            } else if (isInvalid) {
                              cellClasses += 'bg-red-100 border-red-300 ';
                            }
                          }
                          
                          return (
                            <td 
                              key={group.id}
                              className={cellClasses}
                              onDragOver={(e) => handleDragOver(e, day, lessonNumber, group.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, day, lessonNumber, group.id)}
                            >
                              {slot ? (
                                <div 
                                  className={`px-1 py-0.5 border rounded cursor-move transition-all duration-200 ${
                                    draggedSlot && isValidSwap 
                                      ? 'bg-blue-100 border-blue-300 shadow-md hover:bg-blue-200' 
                                      : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                  }`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, slot)}
                                  onDragEnd={handleDragEnd}
                                >
                                  {/* Subject Name */}
                                  <div className="font-semibold text-gray-900 text-center text-xs leading-tight truncate">
                                    {getEntityName(slot.subjectId, 'subject')}
                                  </div>
                                  
                                  {/* Teacher */}
                                  <div className="flex items-center justify-center text-xs text-gray-600">
                                    <GraduationCap className="h-2 w-2 mr-1 text-gray-400 flex-shrink-0" />
                                    <span className="truncate text-xs">{getEntityName(slot.teacherId, 'teacher')}</span>
                                  </div>
                                  
                                  {/* Classroom */}
                                  <div className="flex items-center justify-center text-xs text-gray-600">
                                    <MapPin className="h-2 w-2 mr-1 text-gray-400 flex-shrink-0" />
                                    <span className="text-xs">{getEntityName(slot.classroomId, 'classroom')}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className={`h-6 flex items-center justify-center text-xs border-2 border-dashed rounded transition-all duration-200 ${
                                  draggedSlot && isValidTarget 
                                    ? 'border-green-400 bg-green-50 text-green-600 font-medium' 
                                    : draggedSlot && isInvalid
                                    ? 'border-red-300 bg-red-50 text-red-500'
                                    : isDragOver && isValidTarget 
                                    ? 'border-green-500 bg-green-100 text-green-700 font-medium' 
                                    : 'border-gray-200 text-gray-400'
                                }`}>
                                  {draggedSlot && isValidTarget ? '✓' : draggedSlot && isInvalid ? '✗' : t('schedule.drop')}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enhanced Drag and Drop Instructions */}
      {schedule.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="h-4 w-4 text-blue-600" />
            <div>
              <h3 className="text-xs font-medium text-blue-900">{t('schedule.dragDropInstructions')}</h3>
              <p className="text-xs text-blue-700 mt-1">
                <strong>{t('schedule.moveWithinGroup')}</strong> {t('schedule.moveWithinGroupDesc')}<br/>
                <strong>{t('schedule.swapLessonsDesc')}</strong> {t('schedule.swapLessonsDescText')}<br/>
                <strong>{t('schedule.restriction')}</strong> {t('schedule.restrictionDesc')}<br/>
                <span className="inline-flex items-center mt-1 space-x-3">
                  <span className="inline-flex items-center">
                    <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></span>
                    <span className="text-xs">Հասանելի տեղ</span>
                  </span>
                  <span className="inline-flex items-center">
                    <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-1"></span>
                    <span className="text-xs">Փոխանակելի դաս</span>
                  </span>
                  <span className="inline-flex items-center">
                    <span className="inline-block w-3 h-3 bg-red-50 border border-red-200 rounded mr-1"></span>
                    <span className="text-xs">Անհասանելի տեղ</span>
                  </span>
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;