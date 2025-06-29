import React, { useState, useEffect } from 'react';
import { Calendar, Play, RotateCcw, Download, Filter, Users, BookOpen, GraduationCap, MapPin, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
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

  // Filter schedule by selected group
  const filteredSchedule = selectedGroup === 'all' 
    ? schedule 
    : schedule.filter(slot => slot.classGroupId === selectedGroup);

  // Get entity names
  const getGroupName = (groupId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    return group ? group.name : t('common.unknown');
  };

  // 🔥 AUTOMATIC: Enhanced subject name lookup - no manual updates needed
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      return subject.name; // Return current subject name
    }
    
    // If subject not found by ID, it might have been deleted or renamed
    // Try to find by checking if the subjectId might be an old name
    const subjectByName = subjects.find(s => s.name === subjectId);
    if (subjectByName) {
      return subjectByName.name;
    }
    
    // Last resort: return the ID itself (might be the old name)
    return subjectId || t('common.unknown');
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : t('common.unknown');
  };

  const getClassroomName = (classroomId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? classroom.number : t('common.unknown');
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

  // Create schedule grid - CORRECT STRUCTURE: Days as rows, Groups as columns
  const createScheduleGrid = () => {
    const grid: { [key: string]: ScheduleSlot | null } = {};
    
    // Get groups to display (filtered or all)
    const groupsToShow = selectedGroup === 'all' 
      ? classGroups 
      : classGroups.filter(g => g.id === selectedGroup);

    institution.workingDays.forEach(day => {
      for (let lesson = 1; lesson <= institution.lessonsPerDay; lesson++) {
        groupsToShow.forEach(group => {
          const key = `${day}-${lesson}-${group.id}`;
          const slot = filteredSchedule.find(s => 
            s.day === day && 
            s.lessonNumber === lesson && 
            s.classGroupId === group.id
          );
          grid[key] = slot || null;
        });
      }
    });

    return grid;
  };

  const scheduleGrid = createScheduleGrid();

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
          {schedule.length > 0 && (
            <button
              onClick={handleExportSchedule}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? t('schedule.exporting') : t('schedule.export')}
            </button>
          )}
          
          <button
            onClick={() => handleGenerateSchedule(schedule.length > 0)}
            disabled={!canGenerate || isGenerating}
            className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] disabled:opacity-50 transition-colors"
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
        </div>
      </div>

      {/* Automatic Update Info */}
      {schedule.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <h3 className="text-sm font-medium text-green-800">Автоматическое обновление</h3>
              <p className="text-sm text-green-700 mt-1">
                Расписание автоматически обновляется при изменении названий предметов. 
                Все связи сохраняются автоматически.
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Generation Logs */}
      {showLogs && generationLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Ստեղծման գործընթաց</h3>
            <button
              onClick={() => setShowLogs(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-md p-3">
            <div className="space-y-1 text-xs font-mono">
              {generationLogs.map((log, index) => (
                <div key={index} className="text-gray-700">{log}</div>
              ))}
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

      {/* Schedule Grid - FIXED HIERARCHY: Groups as proper column headers */}
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
                  {/* Group column headers - FIXED: Groups as main headers */}
                  {(selectedGroup === 'all' ? classGroups : classGroups.filter(g => g.id === selectedGroup)).map(group => (
                    <th key={group.id} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                      <div className="flex flex-col items-center">
                        <div className="font-bold text-[#03524f] text-lg">{group.name}</div>
                        <div className="text-xs text-gray-400 mt-1 normal-case">
                          {group.specialization || 'Ընդհանուր'} • {group.studentsCount} ուս.
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {institution.workingDays.map(day => (
                  <React.Fragment key={day}>
                    {lessonTimes.map((time, timeIndex) => (
                      <tr key={`${day}-${time.lesson}`} className="hover:bg-gray-50">
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
                          <div className="font-medium text-[#03524f]">{time.lesson}</div>
                          <div className="text-xs">{time.startTime}</div>
                          <div className="text-xs">{time.endTime}</div>
                        </td>

                        {/* Schedule slots for each group */}
                        {(selectedGroup === 'all' ? classGroups : classGroups.filter(g => g.id === selectedGroup)).map(group => {
                          const slot = filteredSchedule.find(s => 
                            s.day === day && 
                            s.lessonNumber === time.lesson && 
                            s.classGroupId === group.id
                          );

                          return (
                            <td key={group.id} className="px-2 py-2">
                              {slot ? (
                                <div className="bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-lg p-2 min-h-[70px]">
                                  <div className="space-y-1">
                                    <div className="font-medium text-[#03524f] text-xs truncate">
                                      {getSubjectName(slot.subjectId)}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-600">
                                      <GraduationCap className="h-3 w-3 mr-1" />
                                      <span className="truncate">{getTeacherName(slot.teacherId)}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-600">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      <span className="truncate">{getClassroomName(slot.classroomId)}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-2 min-h-[70px] flex items-center justify-center">
                                  <span className="text-xs text-gray-400">Դատարկ</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Add separator between days */}
                    {day !== institution.workingDays[institution.workingDays.length - 1] && (
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
              className="inline-flex items-center px-6 py-3 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] disabled:opacity-50 transition-colors"
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmRegenerate}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md hover:bg-[#024239]"
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