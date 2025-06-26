import React, { useState } from 'react';
import { 
  Calendar, 
  Play, 
  Trash2, 
  Download, 
  Filter, 
  Grid, 
  List, 
  Clock, 
  Users, 
  BookOpen, 
  MapPin, 
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Edit,
  Save,
  X
} from 'lucide-react';
import { 
  Institution, 
  ClassGroup, 
  Subject, 
  Teacher, 
  Classroom, 
  ScheduleSlot 
} from '../types';
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
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [editFormData, setEditFormData] = useState({
    teacherId: '',
    classroomId: '',
    startTime: '',
    endTime: '',
  });

  const getCourseText = (courseNumber: number) => {
    return t(`courses.${courseNumber}`);
  };

  const getEntityName = (entityId: string, entityType: 'group' | 'subject' | 'teacher' | 'classroom') => {
    switch (entityType) {
      case 'group':
        return classGroups.find(g => g.id === entityId)?.name || t('common.unknown');
      case 'subject':
        return subjects.find(s => s.id === entityId)?.name || t('common.unknown');
      case 'teacher':
        const teacher = teachers.find(t => t.id === entityId);
        return teacher ? `${teacher.firstName} ${teacher.lastName}` : t('common.unknown');
      case 'classroom':
        return classrooms.find(c => c.id === entityId)?.number || t('common.unknown');
      default:
        return t('common.unknown');
    }
  };

  const startEditingSlot = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setEditFormData({
      teacherId: slot.teacherId,
      classroomId: slot.classroomId,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  };

  const cancelEditingSlot = () => {
    setEditingSlot(null);
    setEditFormData({
      teacherId: '',
      classroomId: '',
      startTime: '',
      endTime: '',
    });
  };

  const saveSlotChanges = () => {
    if (!editingSlot) return;

    const updatedSchedule = schedule.map(slot =>
      slot.id === editingSlot.id
        ? {
            ...slot,
            teacherId: editFormData.teacherId,
            classroomId: editFormData.classroomId,
            startTime: editFormData.startTime,
            endTime: editFormData.endTime,
          }
        : slot
    );

    setSchedule(updatedSchedule);
    
    const groupName = getEntityName(editingSlot.classGroupId, 'group');
    const subjectName = getEntityName(editingSlot.subjectId, 'subject');
    
    showToast.showSuccess(
      t('toast.scheduleSlotUpdated'),
      t('toast.scheduleSlotUpdatedDesc', { 
        subject: subjectName, 
        group: groupName,
        day: editingSlot.day,
        lesson: editingSlot.lessonNumber
      })
    );
    
    cancelEditingSlot();
  };

  const deleteScheduleSlot = (slotId: string) => {
    const slot = schedule.find(s => s.id === slotId);
    if (!slot) return;

    if (confirm(t('common.confirmDelete'))) {
      const updatedSchedule = schedule.filter(s => s.id !== slotId);
      setSchedule(updatedSchedule);
      
      const groupName = getEntityName(slot.classGroupId, 'group');
      const subjectName = getEntityName(slot.subjectId, 'subject');
      
      showToast.showSuccess(
        t('toast.scheduleSlotDeleted'),
        t('toast.scheduleSlotDeletedDesc', { 
          subject: subjectName, 
          group: groupName,
          day: slot.day,
          lesson: slot.lessonNumber
        })
      );
    }
  };

  const clearSchedule = () => {
    if (schedule.length === 0) {
      showToast.showWarning(t('schedule.noSchedule'), t('schedule.noScheduleDesc'));
      return;
    }

    if (confirm(t('schedule.confirmClearSchedule'))) {
      setSchedule([]);
      showToast.showSuccess(
        t('toast.scheduleCleared'),
        t('toast.scheduleClearedDesc')
      );
    }
  };

  const generateSchedule = async () => {
    // Validation
    if (classGroups.length === 0) {
      showToast.showError(t('validation.required'), t('overview.noGroups'));
      return;
    }

    if (subjects.length === 0) {
      showToast.showError(t('validation.required'), t('overview.noSubjects'));
      return;
    }

    if (teachers.length === 0) {
      showToast.showError(t('validation.required'), t('overview.noTeachers'));
      return;
    }

    if (classrooms.length === 0) {
      showToast.showError(t('validation.required'), t('overview.noClassrooms'));
      return;
    }

    // Check if groups have subjects assigned
    const groupsWithSubjects = classGroups.filter(group => 
      Object.keys(group.subjectHours || {}).length > 0
    );
    if (groupsWithSubjects.length === 0) {
      showToast.showError(t('validation.required'), t('toast.noSubjectsAssignedDesc'));
      return;
    }

    // Check if subjects have teachers assigned
    const subjectsWithTeachers = subjects.filter(subject => 
      subject.teacherIds.length > 0
    );
    if (subjectsWithTeachers.length === 0) {
      showToast.showError(t('validation.required'), t('toast.noTeachersAssignedDesc'));
      return;
    }

    setIsGenerating(true);
    setGenerationLogs([]);
    setShowLogs(true);

    try {
      const generator = new ScheduleGenerator(
        institution,
        classGroups,
        subjects,
        teachers,
        classrooms
      );

      const result = await generator.generateSchedule((log: string) => {
        setGenerationLogs(prev => [...prev, log]);
      });

      if (result.success) {
        setSchedule(result.schedule);
        showToast.showSuccess(
          t('toast.scheduleGenerated'),
          t('toast.scheduleGeneratedDesc', { count: result.schedule.length })
        );
      } else {
        showToast.showError(
          t('toast.scheduleGenerationFailed'),
          result.error || t('toast.scheduleGenerationFailedDesc')
        );
      }
    } catch (error) {
      console.error('Schedule generation error:', error);
      showToast.showError(
        t('toast.scheduleGenerationFailed'),
        error instanceof Error ? error.message : t('toast.scheduleGenerationFailedDesc')
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToICS = () => {
    if (schedule.length === 0) {
      showToast.showWarning(t('schedule.noSchedule'), t('schedule.noScheduleDesc'));
      return;
    }

    try {
      const events: ICSEvent[] = schedule.map(slot => {
        const group = classGroups.find(g => g.id === slot.classGroupId);
        const subject = subjects.find(s => s.id === slot.subjectId);
        const teacher = teachers.find(t => t.id === slot.teacherId);
        const classroom = classrooms.find(c => c.id === slot.classroomId);

        // Create a date for this week (you might want to make this configurable)
        const today = new Date();
        const dayIndex = institution.workingDays.indexOf(slot.day);
        const lessonDate = new Date(today);
        lessonDate.setDate(today.getDate() - today.getDay() + 1 + dayIndex); // Monday = 1

        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);

        const startDate = new Date(lessonDate);
        startDate.setHours(startHour, startMinute, 0, 0);

        const endDate = new Date(lessonDate);
        endDate.setHours(endHour, endMinute, 0, 0);

        return {
          uid: `schedule-${slot.id}@college-schedule.local`,
          summary: `${subject?.name || 'Unknown Subject'} - ${group?.name || 'Unknown Group'}`,
          description: `Teacher: ${teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown'}\nGroup: ${group?.name || 'Unknown'}\nType: ${subject?.type === 'lab' ? t('subjects.laboratory') : t('subjects.theory')}`,
          location: `Room ${classroom?.number || 'Unknown'}, Floor ${classroom?.floor || '?'}`,
          startDate,
          endDate,
          recurrence: 'FREQ=WEEKLY;COUNT=40', // 40 weeks in academic year
        };
      });

      const icsContent = ICSExporter.generateICS(events, `${institution.name} Schedule`);
      ICSExporter.downloadICS(icsContent, `${institution.name.replace(/\s+/g, '_')}_schedule.ics`);
      
      showToast.showSuccess(
        t('toast.exportSuccessful'),
        t('toast.icsExportSuccessfulDesc')
      );
    } catch (error) {
      console.error('ICS export error:', error);
      showToast.showError(
        t('toast.exportFailed'),
        t('toast.icsExportFailedDesc')
      );
    }
  };

  // Filter schedule based on selected filters
  const filteredSchedule = schedule.filter(slot => {
    if (selectedGroup !== 'all' && slot.classGroupId !== selectedGroup) return false;
    if (selectedDay !== 'all' && slot.day !== selectedDay) return false;
    return true;
  });

  // Group schedule by day for grid view
  const scheduleByDay = institution.workingDays.reduce((acc, day) => {
    acc[day] = filteredSchedule
      .filter(slot => slot.day === day)
      .sort((a, b) => a.lessonNumber - b.lessonNumber);
    return acc;
  }, {} as { [key: string]: ScheduleSlot[] });

  // Get available teachers for a subject
  const getAvailableTeachersForSlot = (slot: ScheduleSlot) => {
    const subject = subjects.find(s => s.id === slot.subjectId);
    return teachers.filter(teacher => 
      subject?.teacherIds.includes(teacher.id) &&
      teacher.availableHours[slot.day]?.includes(slot.lessonNumber)
    );
  };

  // Get available classrooms for a subject type
  const getAvailableClassroomsForSlot = (slot: ScheduleSlot) => {
    const subject = subjects.find(s => s.id === slot.subjectId);
    if (!subject) return [];

    if (subject.type === 'lab') {
      // For lab subjects, get specialized classrooms or general labs
      const specializedClassrooms = classrooms.filter(c => 
        c.type === 'lab' && 
        c.specialization && 
        c.specialization.split(', ').includes(subject.id)
      );
      
      if (specializedClassrooms.length > 0) {
        return specializedClassrooms;
      }
      
      return classrooms.filter(c => 
        c.type === 'lab' && 
        (!c.specialization || c.specialization.trim() === '')
      );
    } else {
      // For theory subjects, get theory classrooms and teacher labs
      return classrooms.filter(c => 
        c.type === 'theory' || c.type === 'teacher_lab'
      );
    }
  };

  const renderSlotCard = (slot: ScheduleSlot) => {
    const group = classGroups.find(g => g.id === slot.classGroupId);
    const subject = subjects.find(s => s.id === slot.subjectId);
    const teacher = teachers.find(t => t.id === slot.teacherId);
    const classroom = classrooms.find(c => c.id === slot.classroomId);

    const isEditing = editingSlot?.id === slot.id;

    return (
      <div
        key={slot.id}
        className={`p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md ${
          subject?.type === 'lab' 
            ? 'bg-green-50 border-green-400 hover:bg-green-100' 
            : 'bg-blue-50 border-blue-400 hover:bg-blue-100'
        }`}
      >
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-900">
                {subject?.name} - {group?.name}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={saveSlotChanges}
                  className="text-green-600 hover:text-green-800 transition-colors"
                  title={t('common.save')}
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEditingSlot}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                  title={t('common.cancel')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('teachers.title')}
                </label>
                <select
                  value={editFormData.teacherId}
                  onChange={(e) => setEditFormData({ ...editFormData, teacherId: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getAvailableTeachersForSlot(slot).map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('classrooms.title')}
                </label>
                <select
                  value={editFormData.classroomId}
                  onChange={(e) => setEditFormData({ ...editFormData, classroomId: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getAvailableClassroomsForSlot(slot).map(classroom => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.number} (Floor {classroom.floor})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('schedule.startTime')}
                  </label>
                  <input
                    type="time"
                    value={editFormData.startTime}
                    onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('schedule.endTime')}
                  </label>
                  <input
                    type="time"
                    value={editFormData.endTime}
                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-gray-900">
                {subject?.name}
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => startEditingSlot(slot)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title={t('common.edit')}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteScheduleSlot(slot.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                <span>{group?.name}</span>
                {group?.course && (
                  <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1 rounded">
                    {getCourseText(group.course)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center">
                <GraduationCap className="h-3 w-3 mr-1" />
                <span>{teacher ? `${teacher.firstName} ${teacher.lastName}` : t('common.unknown')}</span>
              </div>
              
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{classroom?.number || t('common.unknown')}</span>
                {classroom?.type === 'lab' && (
                  <span className="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded">
                    {t('subjects.laboratory')}
                  </span>
                )}
              </div>
              
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>{slot.startTime} - {slot.endTime}</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('schedule.title')}</h2>
            <p className="text-sm text-gray-500">
              {schedule.length > 0 
                ? t('schedule.lessonsScheduled', { count: schedule.length })
                : t('schedule.noLessonsScheduled')
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {schedule.length > 0 && (
            <>
              <button
                onClick={exportToICS}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('schedule.exportICS')}
              </button>
              
              <button
                onClick={clearSchedule}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('schedule.clearSchedule')}
              </button>
            </>
          )}
          
          <button
            onClick={generateSchedule}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('schedule.generating')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('schedule.generateSchedule')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generation Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {t('schedule.generationLogs')}
              </h3>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2 font-mono text-sm">
                {generationLogs.map((log, index) => (
                  <div key={index} className="text-gray-700">
                    {log}
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex items-center text-blue-600">
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t('schedule.generating')}...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and View Controls */}
      {schedule.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{t('common.filters')}:</span>
              </div>
              
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('schedule.allGroups')}</option>
                {classGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('schedule.allDays')}</option>
                {institution.workingDays.map(day => (
                  <option key={day} value={day}>
                    {t(`days.${day.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title={t('schedule.gridView')}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title={t('schedule.listView')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Display */}
      {schedule.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('schedule.noSchedule')}
          </h3>
          <p className="text-gray-500 mb-4">
            {t('schedule.noScheduleDesc')}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {institution.workingDays.map(day => (
            <div key={day} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">
                  {t(`days.${day.toLowerCase()}`)}
                </h3>
                <p className="text-sm text-gray-500">
                  {scheduleByDay[day].length} {t('schedule.lessons')}
                </p>
              </div>
              
              <div className="p-4 space-y-3">
                {scheduleByDay[day].length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('schedule.noLessons')}</p>
                  </div>
                ) : (
                  scheduleByDay[day].map(slot => renderSlotCard(slot))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.day')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('schedule.lesson')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.time')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.group')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.subject')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.teacher')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.classroom')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSchedule
                  .sort((a, b) => {
                    const dayComparison = institution.workingDays.indexOf(a.day) - institution.workingDays.indexOf(b.day);
                    if (dayComparison !== 0) return dayComparison;
                    return a.lessonNumber - b.lessonNumber;
                  })
                  .map(slot => {
                    const group = classGroups.find(g => g.id === slot.classGroupId);
                    const subject = subjects.find(s => s.id === slot.subjectId);
                    const teacher = teachers.find(t => t.id === slot.teacherId);
                    const classroom = classrooms.find(c => c.id === slot.classroomId);

                    return (
                      <tr key={slot.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {t(`days.${slot.day.toLowerCase()}`)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slot.lessonNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slot.startTime} - {slot.endTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">{group?.name}</span>
                            {group?.course && (
                              <span className="ml-2 inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                {getCourseText(group.course)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">{subject?.name}</span>
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs rounded-full ${
                              subject?.type === 'lab' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {subject?.type === 'lab' ? t('subjects.laboratory') : t('subjects.theory')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {teacher ? `${teacher.firstName} ${teacher.lastName}` : t('common.unknown')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900">{classroom?.number}</span>
                            {classroom?.type === 'lab' && (
                              <span className="ml-2 inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                {t('subjects.laboratory')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEditingSlot(slot)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteScheduleSlot(slot.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;