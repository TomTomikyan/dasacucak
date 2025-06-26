import React, { useState } from 'react';
import { Plus, GraduationCap, Mail, Trash2, Clock, BookOpen, MapPin, Edit, Save, X, Users } from 'lucide-react';
import { Teacher, Subject, Classroom, ClassGroup, Institution } from '../types';

interface TeachersProps {
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  setTeachers: (teachers: Teacher[]) => void;
  subjects: Subject[];
  classrooms: Classroom[];
  classGroups: ClassGroup[];
  institution: Institution;
}

const Teachers: React.FC<TeachersProps> = ({
  teachers,
  addTeacher,
  setTeachers,
  subjects,
  classrooms,
  classGroups,
  institution,
}) => {
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
    return classroom ? `${classroom.number} (Floor ${classroom.floor})` : 'Unknown';
  };

  const getGroupName = (groupId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown';
  };

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
    } else {
      // Create new teacher
      addTeacher({
        ...formData,
        homeClassroom: formData.homeClassroom || undefined,
      });
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
    if (confirm('Are you sure you want to delete this teacher?')) {
      setTeachers(teachers.filter(teacher => teacher.id !== id));
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

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Teachers</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Teacher
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                </h3>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jane"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Smith"
                    />
                  </div>
                </div>

                {/* Teacher's Own Classroom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Teacher's Own Classroom/Office (Optional)
                  </label>
                  {getAvailableClassrooms(editingTeacher?.id).length > 0 ? (
                    <select
                      value={formData.homeClassroom}
                      onChange={(e) => setFormData({ ...formData, homeClassroom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No assigned classroom</option>
                      {getAvailableClassrooms(editingTeacher?.id).map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.number} - Floor {classroom.floor} (Teacher Lab, Capacity: {classroom.capacity})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                        No available teacher labs for assignment
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        All teacher labs are already assigned or no teacher labs available. Add more teacher labs in the Classrooms section.
                      </p>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    This will be the teacher's personal classroom/office where they can conduct consultations or have their own workspace. Only teacher labs are available for assignment.
                  </p>
                </div>

                {/* Subjects */}
                {subjects.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <BookOpen className="inline h-4 w-4 mr-1" />
                      Teaching Subjects
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {subjects.map((subject) => (
                          <label key={subject.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.subjects.includes(subject.name)}
                              onChange={(e) => handleSubjectSelection(subject.name, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                      Assigned Groups <span className="text-red-500">*</span>
                    </label>
                    <div className={`max-h-40 overflow-y-auto border-2 rounded-md p-3 transition-colors ${
                      showValidationError && formData.assignedClassGroups.length === 0
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      <div className="space-y-2">
                        {classGroups.map((group) => (
                          <label key={group.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.assignedClassGroups.includes(group.id)}
                                onChange={(e) => handleGroupSelection(group.id, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="ml-3">
                                <span className="text-sm font-medium text-gray-900">{group.name}</span>
                                <div className="text-xs text-gray-500">
                                  {getCourseText(group.course || 1)} • {group.specialization || 'No specialization'} • {group.studentsCount} students
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
                           Please select at least one group for this teacher.
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Teachers must be assigned to groups to generate schedules properly.
                        </p>
                      </div>
                    ) : formData.assignedClassGroups.length > 0 ? (
                      <p className="mt-1 text-sm text-green-600">
                        ✓ {formData.assignedClassGroups.length} group{formData.assignedClassGroups.length !== 1 ? 's' : ''} selected
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        Select which groups this teacher will be teaching. This helps with schedule generation and organization.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-yellow-600 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">No Groups Available</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          You need to create groups first before adding teachers. Go to the Groups section to add groups.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Available Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Available Hours ({institution.lessonsPerDay} lessons per day)
                  </label>
                  <div className="space-y-3">
                    {institution.workingDays.map((day) => (
                      <div key={day} className="flex items-center space-x-3">
                        <div className="w-20 text-sm font-medium text-gray-700">{day}</div>
                        <div className="flex space-x-2">
                          {lessonHours.map((hour) => (
                            <label key={hour} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.availableHours[day]?.includes(hour) || false}
                                onChange={(e) => handleAvailableHourToggle(day, hour, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-1 text-xs text-gray-600">{hour}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Select the lesson hours when this teacher is available. Based on your institution settings: {institution.lessonsPerDay} lessons per day on {institution.workingDays.join(', ')}.
                  </p>
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
                  disabled={classGroups.length === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingTeacher ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    'Add Teacher'
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers yet</h3>
            <p className="text-gray-500 mb-4">Start by adding your first teacher.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subjects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Own Classroom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weekly Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teachers.map((teacher) => {
                  const totalHours = Object.values(teacher.availableHours).reduce((sum, hours) => sum + hours.length, 0);
                  return (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-blue-600">
                              {teacher.firstName[0]}{teacher.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {teacher.firstName} {teacher.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.slice(0, 2).map(subject => (
                            <span key={subject} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                              {subject}
                            </span>
                          ))}
                          {teacher.subjects.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{teacher.subjects.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedClassGroups.slice(0, 3).map(groupId => (
                            <span key={groupId} className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                              {getGroupName(groupId)}
                            </span>
                          ))}
                          {teacher.assignedClassGroups.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{teacher.assignedClassGroups.length - 3} more
                            </span>
                          )}
                          {teacher.assignedClassGroups.length === 0 && (
                            <span className="text-xs text-red-500 font-medium">⚠ No groups assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {teacher.homeClassroom ? (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                            <span>{getClassroomName(teacher.homeClassroom)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No assigned room</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Object.keys(teacher.availableHours).filter(day => teacher.availableHours[day].length > 0).length} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="h-4 w-4 mr-1 text-gray-400" />
                          {totalHours}h/week
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditing(teacher)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit teacher"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTeacher(teacher.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete teacher"
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