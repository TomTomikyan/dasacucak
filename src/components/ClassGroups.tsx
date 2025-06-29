import React, { useState } from 'react';
import { Plus, Users, GraduationCap, Trash2, Edit, BookOpen, Clock, Save, X, MapPin } from 'lucide-react';
import { ClassGroup, Institution, Subject, Classroom } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface ClassGroupsProps {
  classGroups: ClassGroup[];
  addClassGroup: (classGroup: Omit<ClassGroup, 'id'>) => void;
  setClassGroups: (classGroups: ClassGroup[]) => void;
  updateClassGroupSubjects: (groupId: string, subjectHours: { [subjectId: string]: number }) => void;
  institution: Institution;
  generateCollegeGroups: (years: number[], specializations: string[]) => void;
  subjects: Subject[];
  classrooms: Classroom[];
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

const ClassGroups: React.FC<ClassGroupsProps> = ({
  classGroups,
  addClassGroup,
  setClassGroups,
  updateClassGroupSubjects,
  institution,
  generateCollegeGroups,
  subjects,
  classrooms,
  showToast,
}) => {
  const { t } = useLocalization();
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [editingSubjects, setEditingSubjects] = useState<string | null>(null);
  const [tempSubjectHours, setTempSubjectHours] = useState<{ [subjectId: string]: number }>({});
  const [formData, setFormData] = useState({
    name: '',
    type: 'college_group',
    course: 1,
    specialization: '',
    homeRoom: '',
    subjectHours: {} as { [subjectId: string]: number },
    studentsCount: 25,
  });
  const [bulkData, setBulkData] = useState({
    years: [] as number[],
    specializations: [] as string[],
  });

  const getCourseText = (courseNumber: number) => {
    return t(`courses.${courseNumber}`);
  };

  // Get available classrooms for assignment (theory classrooms not used by other groups)
  const getAvailableClassrooms = (excludeGroupId?: string) => {
    const usedClassrooms = classGroups
      .filter(group => group.homeRoom && group.id !== excludeGroupId) // Exclude current group when editing
      .map(group => group.homeRoom);
    
    return classrooms.filter(classroom => 
      classroom.type === 'theory' && // Only theory classrooms
      !usedClassrooms.includes(classroom.id) // Not already assigned to another group
    );
  };

  const getClassroomName = (classroomId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? `${classroom.number} (${t('common.floor')} ${classroom.floor})` : t('common.unknown');
  };

  const startEditingGroup = (group: ClassGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      type: group.type,
      course: group.course || 1,
      specialization: group.specialization || '',
      homeRoom: group.homeRoom || '',
      subjectHours: { ...group.subjectHours },
      studentsCount: group.studentsCount,
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      type: 'college_group',
      course: 1,
      specialization: '',
      homeRoom: '',
      subjectHours: {},
      studentsCount: 25,
    });
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingGroup) {
      // Update existing group
      const updatedGroups = classGroups.map(group =>
        group.id === editingGroup.id
          ? {
              ...group,
              name: formData.name,
              course: formData.course,
              specialization: formData.specialization,
              homeRoom: formData.homeRoom || undefined,
              studentsCount: formData.studentsCount,
              subjectHours: formData.subjectHours,
            }
          : group
      );
      setClassGroups(updatedGroups);
      setEditingGroup(null);
      showToast.showSuccess(
        t('toast.groupUpdated'), 
        t('toast.groupUpdatedDesc', { name: formData.name })
      );
    } else {
      // Create new group
      const newGroup: Omit<ClassGroup, 'id'> = {
        name: formData.name,
        type: 'college_group',
        course: formData.course,
        specialization: formData.specialization,
        homeRoom: formData.homeRoom || undefined,
        studentsCount: formData.studentsCount,
        subjectHours: formData.subjectHours,
      };
      
      addClassGroup(newGroup);
      showToast.showSuccess(
        t('toast.groupAdded'), 
        t('toast.groupAddedDesc', { name: formData.name })
      );
    }
    
    setFormData({
      name: '',
      type: 'college_group',
      course: 1,
      specialization: '',
      homeRoom: '',
      subjectHours: {},
      studentsCount: 25,
    });
    setShowForm(false);
  };

  const handleBulkGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkData.years.length === 0 || bulkData.specializations.length === 0) {
      showToast.showError(t('validation.selectAtLeastOne'), t('groups.selectYears'));
      return;
    }
    
    generateCollegeGroups(bulkData.years, bulkData.specializations);
    setShowBulkForm(false);
    showToast.showSuccess(
      t('toast.generationSuccessful'), 
      t('toast.generationSuccessfulDesc', { count: bulkData.years.length * bulkData.specializations.length * 3 })
    );
  };

  const deleteClassGroup = (id: string) => {
    const group = classGroups.find(g => g.id === id);
    if (group && confirm(t('common.confirmDelete'))) {
      setClassGroups(classGroups.filter(group => group.id !== id));
      showToast.showSuccess(
        t('toast.groupDeleted'), 
        t('toast.groupDeletedDesc', { name: group.name })
      );
    }
  };

  const startEditingSubjects = (groupId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    if (group) {
      setTempSubjectHours({ ...group.subjectHours });
      setEditingSubjects(groupId);
    }
  };

  const saveSubjectHours = () => {
    if (editingSubjects) {
      updateClassGroupSubjects(editingSubjects, tempSubjectHours);
      setEditingSubjects(null);
      setTempSubjectHours({});
      showToast.showSuccess(
        t('toast.subjectUpdated'), 
        t('subjects.assignSubjects')
      );
    }
  };

  const cancelEditingSubjects = () => {
    setEditingSubjects(null);
    setTempSubjectHours({});
  };

  const updateSubjectHours = (subjectId: string, hours: number) => {
    if (hours <= 0) {
      const newHours = { ...tempSubjectHours };
      delete newHours[subjectId];
      setTempSubjectHours(newHours);
    } else {
      setTempSubjectHours({
        ...tempSubjectHours,
        [subjectId]: hours
      });
    }
  };

  const updateFormSubjectHours = (subjectId: string, hours: number) => {
    if (hours <= 0) {
      const newHours = { ...formData.subjectHours };
      delete newHours[subjectId];
      setFormData({
        ...formData,
        subjectHours: newHours
      });
    } else {
      setFormData({
        ...formData,
        subjectHours: {
          ...formData.subjectHours,
          [subjectId]: hours
        }
      });
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : t('common.unknown');
  };

  const getTotalHours = (subjectHours: { [subjectId: string]: number }) => {
    return Object.values(subjectHours).reduce((sum, hours) => sum + hours, 0);
  };

  // Filter subjects based on the group's course when editing subjects
  const getAvailableSubjectsForGroup = (groupId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    if (!group || !group.course) return subjects;
    
    return subjects.filter(subject => subject.course === group.course);
  };

  // Filter subjects for form based on selected course
  const getAvailableSubjectsForForm = () => {
    return subjects.filter(subject => subject.course === formData.course);
  };

  const handleYearSelection = (year: number, checked: boolean) => {
    setBulkData({
      ...bulkData,
      years: checked
        ? [...bulkData.years, year]
        : bulkData.years.filter(y => y !== year)
    });
  };

  const handleSpecializationSelection = (spec: string, checked: boolean) => {
    setBulkData({
      ...bulkData,
      specializations: checked
        ? [...bulkData.specializations, spec]
        : bulkData.specializations.filter(s => s !== spec)
    });
  };

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Get detailed tooltip content for each cell
  const getGroupTooltip = (group: ClassGroup) => {
    const courseText = getCourseText(group.course || 1);
    const totalHours = getTotalHours(group.subjectHours || {});
    const subjectCount = Object.keys(group.subjectHours || {}).length;
    
    let tooltip = `👥 ${group.name}\n`;
    tooltip += `🎓 ${courseText}\n`;
    tooltip += `📚 ${group.specialization || 'Ընդհանուր'}\n`;
    tooltip += `👨‍🎓 ${group.studentsCount} ուսանող\n`;
    tooltip += `📖 ${subjectCount} առարկա\n`;
    tooltip += `⏰ ${totalHours}ժ/տարի`;
    
    if (group.homeRoom) {
      const classroom = classrooms.find(c => c.id === group.homeRoom);
      if (classroom) {
        tooltip += `\n🏫 Հիմնական դասարան: ${classroom.number}`;
      }
    }
    
    return tooltip;
  };

  const getSubjectsTooltip = (group: ClassGroup) => {
    const subjectHours = group.subjectHours || {};
    const subjectCount = Object.keys(subjectHours).length;
    
    if (subjectCount === 0) {
      return 'Առարկաներ չեն նշանակված';
    }
    
    let tooltip = `📚 Նշանակված առարկաներ (${subjectCount}):\n`;
    Object.entries(subjectHours).forEach(([subjectId, hours]) => {
      const subjectName = getSubjectName(subjectId);
      tooltip += `• ${subjectName} - ${hours}ժ/տարի\n`;
    });
    
    const totalHours = getTotalHours(subjectHours);
    tooltip += `\nԸնդամենը: ${totalHours}ժ/տարի`;
    
    return tooltip.trim();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-[#03524f]" />
          <h2 className="text-2xl font-bold text-gray-900">{t('groups.title')}</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('groups.addGroup')}
          </button>
        </div>
      </div>

      {/* Bulk Generation Form Modal */}
      {showBulkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleBulkGenerate} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{t('groups.generateCollegeGroups')}</h3>
                <button
                  type="button"
                  onClick={() => setShowBulkForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">{t('groups.entryYears')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {availableYears.map((year) => (
                      <label key={year} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulkData.years.includes(year)}
                          onChange={(e) => handleYearSelection(year, e.target.checked)}
                          className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{year}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">{t('groups.selectSpecializations')}</label>
                  {institution.specializations.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {institution.specializations.map((spec) => (
                        <label key={spec} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bulkData.specializations.includes(spec)}
                            onChange={(e) => handleSpecializationSelection(spec, e.target.checked)}
                            className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{spec}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-700">
                        {t('setup.noSpecializations')}
                      </p>
                    </div>
                  )}
                </div>

                {bulkData.years.length > 0 && bulkData.specializations.length > 0 && (
                  <div className="bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-md p-3">
                    <p className="text-sm text-[#03524f]">
                      {t('groups.generateGroups')}: {bulkData.years.length} {t('groups.entryYears')} × {bulkData.specializations.length} {t('common.specializations')} × 3 = {bulkData.years.length * bulkData.specializations.length * 3} {t('groups.title').toLowerCase()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBulkForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={bulkData.years.length === 0 || bulkData.specializations.length === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md hover:bg-[#024239] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.generate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingGroup ? t('groups.editGroup') : t('groups.addNewGroup')}
                </h3>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.name')}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    placeholder={t('groups.groupNamePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <GraduationCap className="inline h-4 w-4 mr-1" />
                    {t('common.course')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    placeholder={getCourseText(formData.course)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.specialization')}</label>
                  {institution.specializations.length > 0 ? (
                    <select
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    >
                      <option value="">{t('groups.selectSpecializations')}</option>
                      {institution.specializations.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                        placeholder="Ծրագրավորում"
                      />
                      <p className="mt-1 text-xs text-yellow-600">
                        {t('setup.noSpecializations')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Home Classroom Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    {t('groups.homeClassroom')}
                  </label>
                  {getAvailableClassrooms(editingGroup?.id).length > 0 ? (
                    <select
                      value={formData.homeRoom}
                      onChange={(e) => setFormData({ ...formData, homeRoom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    >
                      <option value="">{t('groups.noAssignedClassroom')}</option>
                      {getAvailableClassrooms(editingGroup?.id).map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.number} - {t('common.floor')} {classroom.floor} ({t('common.capacity')}: {classroom.capacity})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                        {t('classrooms.noAvailableRooms')}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {t('classrooms.noAvailableRoomsDesc')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Subject Selection with Hours - filtered by course */}
                {getAvailableSubjectsForForm().length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <BookOpen className="inline h-4 w-4 mr-1" />
                      {t('groups.selectSubjects', { course: getCourseText(formData.course) })}
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                      <div className="space-y-3">
                        {getAvailableSubjectsForForm().map((subject) => (
                          <div key={subject.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-700">{subject.name}</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                subject.type === 'theory' 
                                  ? 'bg-[#03524f] bg-opacity-10 text-[#03524f]' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {subject.type === 'theory' ? t('subjects.theory') : t('subjects.lab')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                max="200"
                                value={formData.subjectHours[subject.id] || 0}
                                onChange={(e) => updateFormSubjectHours(subject.id, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                                placeholder="0"
                              />
                              <span className="text-sm text-gray-500">ժ/{t('common.year')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Total Hours Display */}
                    <div className="mt-3 p-2 bg-[#03524f] bg-opacity-10 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#03524f]">{t('groups.totalHoursPerYear')}:</span>
                        <span className="text-lg font-bold text-[#03524f]">
                          {getTotalHours(formData.subjectHours)} {t('common.hours')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {getAvailableSubjectsForForm().length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">
                      {t('groups.noSubjectsForCourse', { course: getCourseText(formData.course) })}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('groups.studentsCount')}</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.studentsCount}
                    onChange={(e) => setFormData({ ...formData, studentsCount: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md hover:bg-[#024239]"
                >
                  {editingGroup ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('common.save')}
                    </>
                  ) : (
                    t('groups.addGroup')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Hours Editing Modal */}
      {editingSubjects && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('groups.assignSubjects')} - {classGroups.find(g => g.id === editingSubjects)?.name}
                  <span className="ml-2 text-sm text-gray-500">
                    ({getCourseText(classGroups.find(g => g.id === editingSubjects)?.course || 1)})
                  </span>
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={saveSubjectHours}
                    className="inline-flex items-center px-3 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239]"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {t('common.save')}
                  </button>
                  <button
                    onClick={cancelEditingSubjects}
                    className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {getAvailableSubjectsForGroup(editingSubjects).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {t('groups.noSubjectsForCourse', { course: getCourseText(classGroups.find(g => g.id === editingSubjects)?.course || 1) })}
                  </p>
                ) : (
                  getAvailableSubjectsForGroup(editingSubjects).map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-5 w-5 text-[#03524f]" />
                        <div>
                          <span className="font-medium text-gray-900">{subject.name}</span>
                          <div className="text-sm text-gray-500">
                            {subject.type === 'theory' ? t('subjects.theory') : t('subjects.laboratory')} • {getCourseText(subject.course)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="200"
                          value={tempSubjectHours[subject.id] || 0}
                          onChange={(e) => updateSubjectHours(subject.id, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-500">ժամ/{t('common.year')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {getAvailableSubjectsForGroup(editingSubjects).length > 0 && (
                <div className="mt-4 p-3 bg-[#03524f] bg-opacity-10 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#03524f]">{t('groups.totalHoursPerYear')}:</span>
                    <span className="text-lg font-bold text-[#03524f]">
                      {getTotalHours(tempSubjectHours)} {t('common.hours')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {classGroups.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('groups.noGroups')}
            </h3>
            <p className="text-gray-500 mb-4">
              {t('groups.noGroupsDesc')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.course')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.specialization')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('groups.homeClassroom')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.students')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('subjects.title')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Tooltip content={getGroupTooltip(group)}>
                        <div className="flex items-center cursor-help">
                          <div className="h-8 w-8 rounded-full bg-[#03524f] bg-opacity-10 flex items-center justify-center mr-3">
                            <span className="text-xs font-medium text-[#03524f]">
                              {group.name.substring(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{group.name}</span>
                        </div>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Tooltip content={`${getCourseText(group.course || 1)}\nԽումբը սովորում է ${group.course || 1}-րդ կուրսում`}>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full cursor-help">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {getCourseText(group.course || 1)}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Tooltip content={group.specialization ? `Մասնագիտացում: ${group.specialization}` : 'Մասնագիտացում նշանակված չէ'}>
                        <span className="cursor-help">{group.specialization || 'N/A'}</span>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.homeRoom ? (
                        <Tooltip content={`Հիմնական դասարան: ${getClassroomName(group.homeRoom)}\nԽումբը հիմնականում սովորում է այս դասարանում`}>
                          <div className="flex items-center cursor-help">
                            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                            <span>{getClassroomName(group.homeRoom)}</span>
                          </div>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Հիմնական դասարան նշանակված չէ">
                          <span className="text-gray-400 italic cursor-help">{t('groups.noAssignedRoom')}</span>
                        </Tooltip>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Tooltip content={`Ուսանողների քանակ: ${group.studentsCount}\nԽմբում սովորում է ${group.studentsCount} ուսանող`}>
                        <span className="cursor-help">{group.studentsCount}</span>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Tooltip content={getSubjectsTooltip(group)}>
                        <div className="flex items-center space-x-2 cursor-help">
                          <div className="flex items-center space-x-1">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {Object.keys(group.subjectHours || {}).length} {t('subjects.title').toLowerCase()}
                            </span>
                          </div>
                          {getTotalHours(group.subjectHours || {}) > 0 && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {getTotalHours(group.subjectHours || {})}ժ/{t('common.year')}
                              </span>
                            </div>
                          )}
                        </div>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditingGroup(group)}
                          className="text-[#03524f] hover:text-[#024239] transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => startEditingSubjects(group.id)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title={t('groups.editSubjects')}
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteClassGroup(group.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassGroups;