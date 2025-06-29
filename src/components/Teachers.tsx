import React, { useState } from 'react';
import { Plus, GraduationCap, Trash2, Clock, BookOpen, MapPin, Edit, Save, X, Users } from 'lucide-react';
import { Teacher, Subject, Classroom, ClassGroup, Institution } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface TeachersProps {
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  setTeachers: (teachers: Teacher[]) => void;
  subjects: Subject[];
  classrooms: Classroom[];
  classGroups: ClassGroup[];
  institution: Institution;
  showToast: {
    showSuccess: (title: string, message: string, duration?: number) => void;
    showError: (title: string, message: string, duration?: number) => void;
    showWarning: (title: string, message: string, duration?: number) => void;
    showInfo: (title: string, message: string, duration?: number) => void;
  };
}

// Tooltip component
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
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
          className="fixed z-50 px-3 py-2 text-sm text-white bg-[#03524f] rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: position.x,
            top: position.y,
            maxWidth: '300px',
            whiteSpace: 'pre-wrap'
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#03524f]"></div>
        </div>
      )}
    </div>
  );
};

const Teachers: React.FC<TeachersProps> = ({
  teachers,
  addTeacher,
  setTeachers,
  subjects,
  classrooms,
  classGroups,
  institution,
  showToast,
}) => {
  const { t } = useLocalization();
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  
  // Generate default available hours based on institution settings
  const getDefaultAvailableHours = () => {
    const defaultHours: { [key: string]: number[] } = {};
    institution.workingDays.forEach(day => {
      defaultHours[day] = Array.from({ length: institution.lessonsPerDay }, (_, i) => i + 1);
    });
    return defaultHours;
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    subjects: [] as string[],
    homeClassroom: '',
    availableHours: getDefaultAvailableHours(),
    assignedClassGroups: [] as string[],
  });

  // Generate lesson hours array based on institution settings
  const lessonHours = Array.from({ length: institution.lessonsPerDay }, (_, i) => i + 1);

  // Get available classrooms for teacher assignment (only teacher_lab type)
  const getAvailableClassrooms = (excludeTeacherId?: string) => {
    const assignedClassrooms = teachers
      .filter(teacher => teacher.homeClassroom && teacher.id !== excludeTeacherId)
      .map(teacher => teacher.homeClassroom);
    
    return classrooms.filter(classroom => 
      classroom.type === 'teacher_lab' && 
      !assignedClassrooms.includes(classroom.id)
    );
  };

  const getClassroomName = (classroomId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? `${classroom.number} (${t('common.floor')} ${classroom.floor})` : t('common.unknown');
  };

  const getGroupName = (groupId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    return group ? group.name : t('common.unknown');
  };

  const getCourseText = (courseNumber: number) => {
    return t(`courses.${courseNumber}`);
  };

  // Get current subject names - automatic updates handled by useScheduleData
  const getTeacherSubjectNames = (teacherSubjects: string[]) => {
    return teacherSubjects.map(subjectName => {
      const currentSubject = subjects.find(s => s.name === subjectName);
      return currentSubject ? currentSubject.name : subjectName;
    }).filter(Boolean);
  };

  const startEditing = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowValidationError(false);
    
    // Ensure teacher's available hours match current institution settings
    const updatedAvailableHours = { ...teacher.availableHours };
    institution.workingDays.forEach(day => {
      if (!updatedAvailableHours[day]) {
        updatedAvailableHours[day] = Array.from({ length: institution.lessonsPerDay }, (_, i) => i + 1);
      } else {
        // Filter out hours that exceed current lessons per day
        updatedAvailableHours[day] = updatedAvailableHours[day].filter(hour => hour <= institution.lessonsPerDay);
      }
    });
    
    setFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      subjects: [...teacher.subjects],
      homeClassroom: teacher.homeClassroom || '',
      availableHours: updatedAvailableHours,
      assignedClassGroups: [...teacher.assignedClassGroups],
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingTeacher(null);
    setShowValidationError(false);
    setFormData({
      firstName: '',
      lastName: '',
      subjects: [],
      homeClassroom: '',
      availableHours: getDefaultAvailableHours(),
      assignedClassGroups: [],
    });
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (formData.assignedClassGroups.length === 0) {
      setShowValidationError(true);
      showToast.showError(t('validation.required'), t('teachers.selectGroupsRequired'));
      return;
    }
    
    setShowValidationError(false);
    
    if (editingTeacher) {
      // Update existing teacher
      const updatedTeachers = teachers.map(teacher =>
        teacher.id === editingTeacher.id
          ? {
              ...teacher,
              firstName: formData.firstName,
              lastName: formData.lastName,
              subjects: formData.subjects,
              homeClassroom: formData.homeClassroom || undefined,
              availableHours: formData.availableHours,
              assignedClassGroups: formData.assignedClassGroups,
            }
          : teacher
      );
      setTeachers(updatedTeachers);
      setEditingTeacher(null);
      showToast.showSuccess(
        t('toast.teacherUpdated'), 
        t('toast.teacherUpdatedDesc', { name: `${formData.firstName} ${formData.lastName}` })
      );
    } else {
      // Create new teacher
      addTeacher({
        ...formData,
        homeClassroom: formData.homeClassroom || undefined,
      });
      showToast.showSuccess(
        t('toast.teacherAdded'), 
        t('toast.teacherAddedDesc', { name: `${formData.firstName} ${formData.lastName}` })
      );
    }
    
    setFormData({
      firstName: '',
      lastName: '',
      subjects: [],
      homeClassroom: '',
      availableHours: getDefaultAvailableHours(),
      assignedClassGroups: [],
    });
    setShowForm(false);
  };

  const deleteTeacher = (id: string) => {
    const teacher = teachers.find(t => t.id === id);
    if (teacher && confirm(t('common.confirmDelete'))) {
      setTeachers(teachers.filter(teacher => teacher.id !== id));
      showToast.showSuccess(
        t('toast.teacherDeleted'), 
        t('toast.teacherDeletedDesc', { name: `${teacher.firstName} ${teacher.lastName}` })
      );
    }
  };

  const handleSubjectSelection = (subjectName: string, checked: boolean) => {
    setFormData({
      ...formData,
      subjects: checked
        ? [...formData.subjects, subjectName]
        : formData.subjects.filter(s => s !== subjectName)
    });
  };

  const handleGroupSelection = (groupId: string, checked: boolean) => {
    setFormData({
      ...formData,
      assignedClassGroups: checked
        ? [...formData.assignedClassGroups, groupId]
        : formData.assignedClassGroups.filter(id => id !== groupId)
    });
    
    // Clear validation error when user selects a group
    if (checked && showValidationError) {
      setShowValidationError(false);
    }
  };

  const handleAvailableHourToggle = (day: string, hour: number, checked: boolean) => {
    setFormData({
      ...formData,
      availableHours: {
        ...formData.availableHours,
        [day]: checked
          ? [...formData.availableHours[day], hour].sort((a, b) => a - b)
          : formData.availableHours[day].filter(h => h !== hour)
      }
    });
  };

  // Get detailed tooltip content for each cell
  const getTeacherTooltip = (teacher: Teacher) => {
    const totalHours = Object.values(teacher.availableHours).reduce((sum, hours) => sum + hours.length, 0);
    const currentSubjectNames = getTeacherSubjectNames(teacher.subjects);
    
    let tooltip = `👨‍🏫 ${teacher.firstName} ${teacher.lastName}\n`;
    tooltip += `📚 Առարկաներ: ${currentSubjectNames.length > 0 ? currentSubjectNames.join(', ') : 'չեն նշանակված'}\n`;
    tooltip += `👥 Խմբեր: ${teacher.assignedClassGroups.length}\n`;
    tooltip += `⏰ Հասանելի: ${totalHours}ժ/շաբաթ`;
    
    if (teacher.homeClassroom) {
      const classroom = classrooms.find(c => c.id === teacher.homeClassroom);
      if (classroom) {
        tooltip += `\n🏫 Սեփական դասարան: ${classroom.number}`;
      }
    }
    
    return tooltip;
  };

  const getSubjectsTooltip = (teacher: Teacher) => {
    const currentSubjectNames = getTeacherSubjectNames(teacher.subjects);
    
    if (currentSubjectNames.length === 0) {
      return 'Առարկաներ չեն նշանակված';
    }
    
    return `📚 Ուսուցանող առարկաներ:\n${currentSubjectNames.map(name => `• ${name}`).join('\n')}`;
  };

  const getGroupsTooltip = (teacher: Teacher) => {
    if (teacher.assignedClassGroups.length === 0) {
      return 'Խմբեր չեն նշանակված';
    }
    
    let tooltip = `👥 Նշանակված խմբեր (${teacher.assignedClassGroups.length}):\n`;
    teacher.assignedClassGroups.forEach(groupId => {
      const group = classGroups.find(g => g.id === groupId);
      if (group) {
        const courseText = getCourseText(group.course || 1);
        tooltip += `• ${group.name} (${courseText}) - ${group.studentsCount} ուս.\n`;
      }
    });
    
    return tooltip.trim();
  };

  const getClassroomTooltip = (teacher: Teacher) => {
    if (!teacher.homeClassroom) {
      return 'Սեփական դասարան չունի';
    }
    
    const classroom = classrooms.find(c => c.id === teacher.homeClassroom);
    if (!classroom) {
      return 'Դասարանը չի գտնվել';
    }
    
    return `🏫 Սեփական դասարան\n${classroom.number} - ${t('common.floor')} ${classroom.floor}\n${t('classrooms.teacherLab')}\n${t('common.capacity')}: ${classroom.capacity}`;
  };

  const getAvailabilityTooltip = (teacher: Teacher) => {
    const totalHours = Object.values(teacher.availableHours).reduce((sum, hours) => sum + hours.length, 0);
    const availableDays = Object.keys(teacher.availableHours).filter(day => teacher.availableHours[day].length > 0);
    
    let tooltip = `⏰ Հասանելիություն:\n`;
    tooltip += `📅 ${availableDays.length} օր\n`;
    tooltip += `🕐 ${totalHours} ժամ/շաբաթ\n\n`;
    
    availableDays.forEach(day => {
      const dayName = t(`days.${day.toLowerCase()}`);
      const hours = teacher.availableHours[day];
      tooltip += `${dayName}: ${hours.join(', ')}-րդ դասեր\n`;
    });
    
    return tooltip.trim();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-6 w-6 text-[#03524f]" />
          <h2 className="text-2xl font-bold text-gray-900">{t('teachers.title')}</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('teachers.addTeacher')}
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTeacher ? t('teachers.editTeacher') : t('teachers.addNewTeacher')}
                </h3>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('teachers.firstName')}</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                      placeholder={t('teachers.firstNamePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('teachers.lastName')}</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                      placeholder={t('teachers.lastNamePlaceholder')}
                    />
                  </div>
                </div>

                {/* Teacher's Own Classroom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    {t('teachers.ownClassroom')}
                  </label>
                  {getAvailableClassrooms(editingTeacher?.id).length > 0 ? (
                    <select
                      value={formData.homeClassroom}
                      onChange={(e) => setFormData({ ...formData, homeClassroom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    >
                      <option value="">չունի</option>
                      {getAvailableClassrooms(editingTeacher?.id).map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.number} - {t('common.floor')} {classroom.floor} ({t('classrooms.teacherLab')}, {t('common.capacity')}: {classroom.capacity})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                        {t('teachers.noAvailableTeacherLabs')}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {t('teachers.noAvailableTeacherLabsDesc')}
                      </p>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {t('teachers.ownClassroomDesc')}
                  </p>
                </div>

                {/* Subjects */}
                {subjects.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <BookOpen className="inline h-4 w-4 mr-1" />
                      {t('teachers.teachingSubjects')}
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {subjects.map((subject) => (
                          <label key={subject.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.subjects.includes(subject.name)}
                              onChange={(e) => handleSubjectSelection(subject.name, e.target.checked)}
                              className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{subject.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Assigned Groups - REQUIRED */}
                {classGroups.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="inline h-4 w-4 mr-1" />
                      {t('teachers.assignedGroupsRequired')}
                    </label>
                    <div className={`max-h-40 overflow-y-auto border-2 rounded-md p-3 transition-colors ${
                      showValidationError &&formData.assignedClassGroups.length === 0
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      <div className="space-y-2">
                        {classGroups.map((group) => (
                          <label key={group.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md cursor-pointer">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.assignedClassGroups.includes(group.id)}
                                onChange={(e) => handleGroupSelection(group.id, e.target.checked)}
                                className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                              />
                              <div className="ml-3">
                                <span className="text-sm font-medium text-gray-900">{group.name}</span>
                                <div className="text-xs text-gray-500">
                                  {getCourseText(group.course || 1)} • {group.specialization || t('groups.noSpecialization')} • {group.studentsCount} {t('common.students')}
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Validation Messages */}
                    {showValidationError && formData.assignedClassGroups.length === 0 ? (
                      <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-md">
                        <p className="text-sm text-red-700 font-medium">
                          {t('teachers.selectGroupsRequired')}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {t('teachers.groupsRequiredDesc')}
                        </p>
                      </div>
                    ) : formData.assignedClassGroups.length > 0 ? (
                      <p className="mt-1 text-sm text-[#03524f]">
                        {t('teachers.groupsSelected', { count: formData.assignedClassGroups.length })}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        {t('teachers.selectGroupsDesc')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-yellow-600 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">{t('teachers.noGroupsAvailable')}</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          {t('teachers.noGroupsAvailableDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Available Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Clock className="inline h-4 w-4 mr-1" />
                    {t('teachers.availableHours', { lessonsPerDay: institution.lessonsPerDay })}
                  </label>
                  <div className="space-y-3">
                    {institution.workingDays.map((day) => (
                      <div key={day} className="flex items-center space-x-3">
                        <div className="w-20 text-sm font-medium text-gray-700">{t(`days.${day.toLowerCase()}`)}</div>
                        <div className="flex space-x-2">
                          {lessonHours.map((hour) => (
                            <label key={hour} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.availableHours[day]?.includes(hour) || false}
                                onChange={(e) => handleAvailableHourToggle(day, hour, e.target.checked)}
                                className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                              />
                              <span className="ml-1 text-xs text-gray-600">{hour}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {t('teachers.availableHoursDesc', { 
                      lessonsPerDay: institution.lessonsPerDay, 
                      workingDays: institution.workingDays.map(day => t(`days.${day.toLowerCase()}`)).join(', ')
                    })}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={classGroups.length === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingTeacher ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('common.save')}
                    </>
                  ) : (
                    t('teachers.addTeacher')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teachers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {teachers.length === 0 ? (
          <div className="p-8 text-center">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('teachers.noTeachers')}</h3>
            <p className="text-gray-500 mb-4">{t('teachers.noTeachersDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.teacher')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('subjects.title')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teachers.assignedGroups')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teachers.ownClassroom')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teachers.availableDays')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teachers.weeklyHours')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teachers.map((teacher) => {
                  const totalHours = Object.values(teacher.availableHours).reduce((sum, hours) => sum + hours.length, 0);
                  const currentSubjectNames = getTeacherSubjectNames(teacher.subjects);
                  
                  return (
                    <tr key={teacher.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={getTeacherTooltip(teacher)}>
                          <div className="flex items-center cursor-help">
                            <div className="h-10 w-10 rounded-full bg-[#03524f] bg-opacity-10 flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-[#03524f]">
                                {teacher.firstName[0]}{teacher.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {teacher.firstName} {teacher.lastName}
                              </div>
                            </div>
                          </div>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={getSubjectsTooltip(teacher)}>
                          <div className="flex flex-wrap gap-1 cursor-help">
                            {currentSubjectNames.slice(0, 2).map((subjectName, index) => (
                              <span key={index} className="inline-flex px-2 py-1 text-xs bg-[#03524f] bg-opacity-10 text-[#03524f] rounded">
                                {subjectName}
                              </span>
                            ))}
                            {currentSubjectNames.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{currentSubjectNames.length - 2} {t('common.more')}
                              </span>
                            )}
                            {currentSubjectNames.length === 0 && (
                              <span className="text-xs text-gray-400 italic">Предметы не назначены</span>
                            )}
                          </div>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={getGroupsTooltip(teacher)}>
                          <div className="flex flex-wrap gap-1 cursor-help">
                            {teacher.assignedClassGroups.slice(0, 3).map(groupId => (
                              <span key={groupId} className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                {getGroupName(groupId)}
                              </span>
                            ))}
                            {teacher.assignedClassGroups.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{teacher.assignedClassGroups.length - 3} {t('common.more')}
                              </span>
                            )}
                            {teacher.assignedClassGroups.length === 0 && (
                              <span className="text-xs text-red-500 font-medium">{t('teachers.noGroupsAssigned')}</span>
                            )}
                          </div>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {teacher.homeClassroom ? (
                          <Tooltip content={getClassroomTooltip(teacher)}>
                            <div className="flex items-center cursor-help">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              <span>{getClassroomName(teacher.homeClassroom)}</span>
                            </div>
                          </Tooltip>
                        ) : (
                          <Tooltip content="Սեփական դասարան չունի">
                            <span className="text-gray-400 italic cursor-help">չունի</span>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Tooltip content={getAvailabilityTooltip(teacher)}>
                          <span className="cursor-help">{Object.keys(teacher.availableHours).filter(day => teacher.availableHours[day].length > 0).length} {t('teachers.days')}</span>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={`Շաբաթական հասանելիություն: ${totalHours} ժամ\nԱվտոմատ հաշվարկված ըստ ընտրված ժամերի`}>
                          <div className="flex items-center text-sm text-gray-900 cursor-help">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            {totalHours}ժ/{t('common.week')}
                          </div>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditing(teacher)}
                            className="text-[#03524f] transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTeacher(teacher.id)}
                            className="text-red-600 transition-colors"
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
        )}
      </div>
    </div>
  );
};

export default Teachers;