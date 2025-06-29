import React, { useState } from 'react';
import { Plus, BookOpen, Users, Trash2, Monitor, Edit, Save, X, GraduationCap, CheckCircle } from 'lucide-react';
import { Subject, ClassGroup, Teacher } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface SubjectsProps {
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  setSubjects: (subjects: Subject[]) => void;
  classGroups: ClassGroup[];
  teachers: Teacher[];
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

const Subjects: React.FC<SubjectsProps> = ({
  subjects,
  addSubject,
  setSubjects,
  classGroups,
  teachers,
}) => {
  const { t } = useLocalization();
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'theory' as 'theory' | 'lab',
    course: 1,
    teacherIds: [] as string[],
  });

  const getCourseText = (courseNumber: number) => {
    return t(`courses.${courseNumber}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubject) {
      // Update existing subject
      const updatedSubjects = subjects.map(subject =>
        subject.id === editingSubject.id
          ? { ...subject, ...formData, specializationRequired: '' }
          : subject
      );
      setSubjects(updatedSubjects);
      setEditingSubject(null);
    } else {
      // Add new subject - teachers will be auto-assigned in useScheduleData hook
      addSubject({
        ...formData,
        specializationRequired: '',
        teacherIds: [], // Will be auto-populated by the hook
      });
    }
    setFormData({
      name: '',
      type: 'theory',
      course: 1,
      teacherIds: [],
    });
    setShowForm(false);
  };

  const startEditing = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      type: subject.type,
      course: subject.course,
      teacherIds: subject.teacherIds,
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      type: 'theory',
      course: 1,
      teacherIds: [],
    });
    setShowForm(false);
  };

  const deleteSubject = (id: string) => {
    setSubjects(subjects.filter(subject => subject.id !== id));
  };

  const handleTeacherSelection = (teacherId: string, checked: boolean) => {
    setFormData({
      ...formData,
      teacherIds: checked
        ? [...formData.teacherIds, teacherId]
        : formData.teacherIds.filter(id => id !== teacherId)
    });
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : t('common.unknown');
  };

  const getAssignedGroups = (subjectId: string) => {
    return classGroups.filter(group => group.subjectHours[subjectId] > 0);
  };

  const getTotalHoursForSubject = (subjectId: string) => {
    return classGroups.reduce((total, group) => {
      return total + (group.subjectHours[subjectId] || 0);
    }, 0);
  };

  // Get teachers who can teach this subject (based on their subjects list)
  const getAvailableTeachersForSubject = (subjectName: string) => {
    return teachers.filter(teacher => teacher.subjects.includes(subjectName));
  };

  // Get detailed tooltip content for each cell
  const getSubjectTooltip = (subject: Subject) => {
    const typeText = subject.type === 'theory' ? t('subjects.theory') : t('subjects.laboratory');
    const courseText = getCourseText(subject.course);
    const assignedGroups = getAssignedGroups(subject.id);
    const totalHours = getTotalHoursForSubject(subject.id);
    
    let tooltip = `📚 ${subject.name}\n`;
    tooltip += `📖 ${typeText}\n`;
    tooltip += `🎓 ${courseText}\n`;
    tooltip += `👥 ${assignedGroups.length} խումբ\n`;
    tooltip += `⏰ ${totalHours}ժ/տարի`;
    
    if (assignedGroups.length > 0) {
      tooltip += `\n\nԽմբեր:\n${assignedGroups.map(g => `• ${g.name}`).join('\n')}`;
    }
    
    return tooltip;
  };

  const getTeachersTooltip = (teacherIds: string[]) => {
    if (teacherIds.length === 0) {
      return 'Ուսուցիչներ չեն նշանակված';
    }
    
    const teacherNames = teacherIds.map(id => getTeacherName(id));
    return `👨‍🏫 Ուսուցիչներ:\n${teacherNames.map(name => `• ${name}`).join('\n')}`;
  };

  const getGroupsTooltip = (subjectId: string) => {
    const assignedGroups = getAssignedGroups(subjectId);
    if (assignedGroups.length === 0) {
      return 'Խմբեր չեն նշանակված';
    }
    
    let tooltip = `👥 Նշանակված խմբեր (${assignedGroups.length}):\n`;
    assignedGroups.forEach(group => {
      const hours = group.subjectHours[subjectId] || 0;
      const courseText = getCourseText(group.course || 1);
      tooltip += `• ${group.name} (${courseText}) - ${hours}ժ/տարի\n`;
    });
    
    return tooltip.trim();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-6 w-6 text-[#03524f]" />
          <h2 className="text-2xl font-bold text-gray-900">{t('subjects.title')}</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('subjects.addSubject')}
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSubject ? t('subjects.editSubject') : t('subjects.addNewSubject')}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjects.subjectName')}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    placeholder={t('subjects.subjectNamePlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjects.subjectType')}</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="theory"
                          checked={formData.type === 'theory'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'theory' | 'lab' })}
                          className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('subjects.theory')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="lab"
                          checked={formData.type === 'lab'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'theory' | 'lab' })}
                          className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('subjects.laboratory')}</span>
                      </label>
                    </div>
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
                </div>

                {/* Auto-assignment preview */}
                {!editingSubject && formData.name && (
                  <div className="bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-md p-3">
                    <h4 className="text-sm font-medium text-[#03524f] mb-2">
                      <CheckCircle className="inline h-4 w-4 mr-1" />
                      {t('subjects.autoAssignmentPreview')}
                    </h4>
                    {(() => {
                      const availableTeachers = getAvailableTeachersForSubject(formData.name);
                      return availableTeachers.length > 0 ? (
                        <div>
                          <p className="text-sm text-[#03524f] mb-2">
                            {t('subjects.autoAssignedTeachers')}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {availableTeachers.map(teacher => (
                              <span key={teacher.id} className="inline-flex px-2 py-1 text-xs bg-[#03524f] bg-opacity-10 text-[#03524f] rounded">
                                {teacher.firstName} {teacher.lastName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[#03524f]">
                          {t('subjects.noTeachersForSubject', { subject: formData.name })}
                        </p>
                      );
                    })()}
                  </div>
                )}

                {/* Manual teacher assignment for editing */}
                {editingSubject && teachers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('subjects.manualAssignment')}
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {teachers.map((teacher) => (
                        <label key={teacher.id} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            checked={formData.teacherIds.includes(teacher.id)}
                            onChange={(e) => handleTeacherSelection(teacher.id, e.target.checked)}
                            className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {teacher.firstName} {teacher.lastName}
                            {teacher.subjects.includes(formData.name) && (
                              <span className="ml-1 text-xs text-[#03524f]">({t('subjects.teachesThisSubject')})</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('subjects.manualAssignmentNote')}
                    </p>
                  </div>
                )}
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
                  {editingSubject ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('common.save')}
                    </>
                  ) : (
                    t('subjects.addSubject')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subjects List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {subjects.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('subjects.noSubjects')}</h3>
            <p className="text-gray-500 mb-4">{t('subjects.noSubjectsDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.subject')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.course')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('subjects.teachers')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('subjects.assignedGroups')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('subjects.totalHours')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map((subject) => {
                  const assignedGroups = getAssignedGroups(subject.id);
                  const totalHours = getTotalHoursForSubject(subject.id);
                  
                  return (
                    <tr key={subject.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={getSubjectTooltip(subject)}>
                          <div className="flex items-center cursor-help">
                            <div className="h-8 w-8 rounded-full bg-[#03524f] bg-opacity-10 flex items-center justify-center mr-3">
                              {subject.type === 'lab' ? (
                                <Monitor className="h-4 w-4 text-[#03524f]" />
                              ) : (
                                <BookOpen className="h-4 w-4 text-[#03524f]" />
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{subject.name}</span>
                              {subject.teacherIds.length > 0 && (
                                <div className="flex items-center mt-1">
                                  <CheckCircle className="h-3 w-3 text-[#03524f] mr-1" />
                                  <span className="text-xs text-[#03524f]">{t('subjects.autoAssigned')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={`${getCourseText(subject.course)}\nԱռարկա նախատեսված է ${subject.course}-րդ կուրսի համար`}>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[#03524f] bg-opacity-10 text-[#03524f] rounded-full cursor-help">
                            <GraduationCap className="h-3 w-3 mr-1" />
                            {getCourseText(subject.course)}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={subject.type === 'theory' ? 'Տեսական առարկա\nԴասավանդվում է սովորական դասարանում' : 'Լաբորատոր առարկա\nԴասավանդվում է լաբորատորիայում'}>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-help ${
                            subject.type === 'theory' 
                              ? 'bg-[#03524f] bg-opacity-10 text-[#03524f]' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {subject.type === 'theory' ? t('subjects.theory') : t('subjects.laboratory')}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Tooltip content={getTeachersTooltip(subject.teacherIds)}>
                          <div className="flex flex-wrap gap-1 cursor-help">
                            {subject.teacherIds.slice(0, 2).map(teacherId => (
                              <span key={teacherId} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                {getTeacherName(teacherId)}
                              </span>
                            ))}
                            {subject.teacherIds.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{subject.teacherIds.length - 2} {t('common.more')}
                              </span>
                            )}
                            {subject.teacherIds.length === 0 && (
                              <span className="text-xs text-gray-400 italic">{t('subjects.noTeachersAssigned')}</span>
                            )}
                          </div>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Tooltip content={getGroupsTooltip(subject.id)}>
                          <div className="flex items-center cursor-help">
                            <Users className="h-4 w-4 mr-1 text-gray-400" />
                            {assignedGroups.length} {t('subjects.groups')}
                          </div>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Tooltip content={`Ընդամենը ${totalHours} ժամ տարեկան\nԲաշխված բոլոր խմբերի միջև`}>
                          <span className="font-medium cursor-help">{totalHours}ժ/{t('common.year')}</span>
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditing(subject)}
                            className="text-[#03524f] hover:text-[#024239] transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteSubject(subject.id)}
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
        )}
      </div>
    </div>
  );
};

export default Subjects;