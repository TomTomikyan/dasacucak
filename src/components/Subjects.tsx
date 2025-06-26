import React, { useState } from 'react';
import { Plus, BookOpen, Users, Trash2, Monitor, Edit, Save, X, GraduationCap, CheckCircle } from 'lucide-react';
import { Subject, ClassGroup, Teacher } from '../types';

interface SubjectsProps {
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  setSubjects: (subjects: Subject[]) => void;
  classGroups: ClassGroup[];
  teachers: Teacher[];
}

const Subjects: React.FC<SubjectsProps> = ({
  subjects,
  addSubject,
  setSubjects,
  classGroups,
  teachers,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'theory' as 'theory' | 'lab',
    course: 1,
    teacherIds: [] as string[],
  });

  const getCourseText = (courseNumber: number) => {
    const courseNames = {
      1: '1st Course',
      2: '2nd Course', 
      3: '3rd Course',
      4: '4th Course',
      5: '5th Course',
      6: '6th Course'
    };
    return courseNames[courseNumber as keyof typeof courseNames] || `${courseNumber} Course`;
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
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown';
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Subjects</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </button>
      </div>

      {/* Auto-assignment info */}
      {teachers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Automatic Teacher Assignment</h3>
              <p className="text-sm text-blue-700 mt-1">
                Teachers are automatically assigned to subjects based on their teaching subjects. 
                When you add or edit a subject, teachers who can teach it will be automatically assigned.
              </p>
            </div>
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
                  {editingSubject ? 'Edit Subject' : 'Add New Subject'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mathematics"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject Type</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="theory"
                          checked={formData.type === 'theory'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'theory' | 'lab' })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Theory</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="lab"
                          checked={formData.type === 'lab'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'theory' | 'lab' })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Laboratory</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <GraduationCap className="inline h-4 w-4 mr-1" />
                      Course
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={getCourseText(formData.course)}
                    />
                  </div>
                </div>

                {/* Auto-assignment preview */}
                {!editingSubject && formData.name && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-green-900 mb-2">
                      <CheckCircle className="inline h-4 w-4 mr-1" />
                      Auto-assignment Preview
                    </h4>
                    {(() => {
                      const availableTeachers = getAvailableTeachersForSubject(formData.name);
                      return availableTeachers.length > 0 ? (
                        <div>
                          <p className="text-sm text-green-700 mb-2">
                            The following teachers will be automatically assigned to this subject:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {availableTeachers.map(teacher => (
                              <span key={teacher.id} className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                {teacher.firstName} {teacher.lastName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-green-700">
                          No teachers currently teach "{formData.name}". You can assign teachers to this subject in the Teachers section.
                        </p>
                      );
                    })()}
                  </div>
                )}

                {/* Manual teacher assignment for editing */}
                {editingSubject && teachers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manually Assign Teachers (Optional)
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {teachers.map((teacher) => (
                        <label key={teacher.id} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            checked={formData.teacherIds.includes(teacher.id)}
                            onChange={(e) => handleTeacherSelection(teacher.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {teacher.firstName} {teacher.lastName}
                            {teacher.subjects.includes(formData.name) && (
                              <span className="ml-1 text-xs text-green-600">(teaches this subject)</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Note: Teachers are automatically assigned based on their teaching subjects. Manual assignment overrides automatic assignment.
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {editingSubject ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    'Add Subject'
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects yet</h3>
            <p className="text-gray-500 mb-4">Start by adding your first subject.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teachers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            {subject.type === 'lab' ? (
                              <Monitor className="h-4 w-4 text-blue-600" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{subject.name}</span>
                            {subject.teacherIds.length > 0 && (
                              <div className="flex items-center mt-1">
                                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                                <span className="text-xs text-green-600">Auto-assigned</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {getCourseText(subject.course)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          subject.type === 'theory' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {subject.type === 'theory' ? 'Theory' : 'Laboratory'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-wrap gap-1">
                          {subject.teacherIds.slice(0, 2).map(teacherId => (
                            <span key={teacherId} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {getTeacherName(teacherId)}
                            </span>
                          ))}
                          {subject.teacherIds.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{subject.teacherIds.length - 2} more
                            </span>
                          )}
                          {subject.teacherIds.length === 0 && (
                            <span className="text-xs text-gray-400 italic">No teachers assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-gray-400" />
                          {assignedGroups.length} groups
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{totalHours}h/year</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditing(subject)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit subject"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteSubject(subject.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete subject"
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