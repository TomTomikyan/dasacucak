import React, { useState } from 'react';
import { Plus, Users, GraduationCap, Trash2, Edit, BookOpen, Clock, Save, X, MapPin } from 'lucide-react';
import { ClassGroup, Institution, Subject, Classroom } from '../types';

interface ClassGroupsProps {
  classGroups: ClassGroup[];
  addClassGroup: (classGroup: Omit<ClassGroup, 'id'>) => void;
  setClassGroups: (classGroups: ClassGroup[]) => void;
  updateClassGroupSubjects: (groupId: string, subjectHours: { [subjectId: string]: number }) => void;
  institution: Institution;
  generateCollegeGroups: (years: number[], specializations: string[]) => void;
  subjects: Subject[];
  classrooms: Classroom[];
}

const ClassGroups: React.FC<ClassGroupsProps> = ({
  classGroups,
  addClassGroup,
  setClassGroups,
  updateClassGroupSubjects,
  institution,
  generateCollegeGroups,
  subjects,
  classrooms,
}) => {
  const [showForm, setShowForm] = useState(false);
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
    return classroom ? `${classroom.number} (Floor ${classroom.floor})` : 'Unknown';
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

  const deleteClassGroup = (id: string) => {
    setClassGroups(classGroups.filter(group => group.id !== id));
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
    return subject ? subject.name : 'Unknown Subject';
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Groups</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Group
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingGroup ? 'Edit Group' : 'Add New Group'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="216"
                  />
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                  {institution.specializations.length > 0 ? (
                    <select
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select specialization</option>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Programming"
                      />
                      <p className="mt-1 text-xs text-yellow-600">
                        No specializations configured in Setup. You can enter manually or configure them in Setup first.
                      </p>
                    </div>
                  )}
                </div>

                {/* Home Classroom Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Home Classroom (Optional)
                  </label>
                  {getAvailableClassrooms(editingGroup?.id).length > 0 ? (
                    <select
                      value={formData.homeRoom}
                      onChange={(e) => setFormData({ ...formData, homeRoom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No assigned classroom</option>
                      {getAvailableClassrooms(editingGroup?.id).map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.number} - Floor {classroom.floor} (Capacity: {classroom.capacity})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                        No available theory classrooms
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        All theory classrooms are already assigned or no classrooms available. Add more classrooms in the Classrooms section.
                      </p>
                    </div>
                  )}
                </div>

                {/* Subject Selection with Hours - filtered by course */}
                {getAvailableSubjectsForForm().length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <BookOpen className="inline h-4 w-4 mr-1" />
                      Select Subjects for {getCourseText(formData.course)}
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                      <div className="space-y-3">
                        {getAvailableSubjectsForForm().map((subject) => (
                          <div key={subject.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-700">{subject.name}</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                subject.type === 'theory' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {subject.type === 'theory' ? 'Theory' : 'Lab'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                max="200"
                                value={formData.subjectHours[subject.id] || 0}
                                onChange={(e) => updateFormSubjectHours(subject.id, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                              />
                              <span className="text-sm text-gray-500">h/year</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Total Hours Display */}
                    <div className="mt-3 p-2 bg-blue-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">Total Hours per Year:</span>
                        <span className="text-lg font-bold text-blue-900">
                          {getTotalHours(formData.subjectHours)} hours
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {getAvailableSubjectsForForm().length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">
                      No subjects available for {getCourseText(formData.course)}. Please add subjects for this course first.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Students Count</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.studentsCount}
                    onChange={(e) => setFormData({ ...formData, studentsCount: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  {editingGroup ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    'Add Group'
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
                  Assign Subjects - {classGroups.find(g => g.id === editingSubjects)?.name}
                  <span className="ml-2 text-sm text-gray-500">
                    ({getCourseText(classGroups.find(g => g.id === editingSubjects)?.course || 1)})
                  </span>
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={saveSubjectHours}
                    className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={cancelEditingSubjects}
                    className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {getAvailableSubjectsForGroup(editingSubjects).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No subjects available for this course. Please add subjects for {getCourseText(classGroups.find(g => g.id === editingSubjects)?.course || 1)} first.
                  </p>
                ) : (
                  getAvailableSubjectsForGroup(editingSubjects).map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <div>
                          <span className="font-medium text-gray-900">{subject.name}</span>
                          <div className="text-sm text-gray-500">
                            {subject.type === 'theory' ? 'Theory' : 'Laboratory'} • {getCourseText(subject.course)}
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
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-500">hours/year</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {getAvailableSubjectsForGroup(editingSubjects).length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">Total Hours per Year:</span>
                    <span className="text-lg font-bold text-blue-900">
                      {getTotalHours(tempSubjectHours)} hours
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
              No groups yet
            </h3>
            <p className="text-gray-500 mb-4">
              Start by adding your first group.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Home Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subjects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-blue-600">
                            {group.name.substring(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{group.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {getCourseText(group.course || 1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.specialization || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.homeRoom ? (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{getClassroomName(group.homeRoom)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No assigned room</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.studentsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {Object.keys(group.subjectHours || {}).length} subjects
                          </span>
                        </div>
                        {getTotalHours(group.subjectHours || {}) > 0 && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {getTotalHours(group.subjectHours || {})}h/year
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditingGroup(group)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit group"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => startEditingSubjects(group.id)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="Edit subjects"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteClassGroup(group.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete group"
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