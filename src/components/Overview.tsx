import React, { useState } from 'react';
import { 
  Eye, 
  Edit, 
  Save, 
  X, 
  Building2, 
  BookOpen, 
  MapPin, 
  Users, 
  GraduationCap, 
  Calendar,
  Clock,
  Monitor,
  CheckCircle,
  AlertCircle,
  Info,
  Trash2,
  Plus,
  Download
} from 'lucide-react';
import { Institution, ClassGroup, Subject, Classroom, Teacher, ScheduleSlot } from '../types';

interface ToastFunctions {
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, duration?: number) => void;
  showWarning: (title: string, message: string, duration?: number) => void;
  showInfo: (title: string, message: string, duration?: number) => void;
}

interface OverviewProps {
  institution: Institution;
  setInstitution: (institution: Partial<Institution>) => void;
  classGroups: ClassGroup[];
  setClassGroups: (classGroups: ClassGroup[]) => void;
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;
  classrooms: Classroom[];
  setClassrooms: (classrooms: Classroom[]) => void;
  teachers: Teacher[];
  setTeachers: (teachers: Teacher[]) => void;
  schedule: ScheduleSlot[];
  exportConfiguration: () => void;
  showToast: ToastFunctions;
}

const Overview: React.FC<OverviewProps> = ({
  institution,
  setInstitution,
  classGroups,
  setClassGroups,
  subjects,
  setSubjects,
  classrooms,
  setClassrooms,
  teachers,
  setTeachers,
  schedule,
  exportConfiguration,
  showToast,
}) => {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Statistics
  const stats = {
    totalGroups: classGroups.length,
    totalSubjects: subjects.length,
    totalClassrooms: classrooms.length,
    totalTeachers: teachers.length,
    totalScheduleSlots: schedule.length,
    theoryClassrooms: classrooms.filter(c => c.type === 'theory').length,
    labClassrooms: classrooms.filter(c => c.type === 'lab').length,
    theorySubjects: subjects.filter(s => s.type === 'theory').length,
    labSubjects: subjects.filter(s => s.type === 'lab').length,
    teachersWithClassrooms: teachers.filter(t => t.homeClassroom).length,
  };

  // Validation checks
  const validationIssues = [];
  
  if (!institution.name) {
    validationIssues.push({ type: 'error', message: 'Institution name is not set' });
  }
  
  if (classGroups.length === 0) {
    validationIssues.push({ type: 'warning', message: 'No class groups configured' });
  }
  
  if (subjects.length === 0) {
    validationIssues.push({ type: 'warning', message: 'No subjects configured' });
  }
  
  if (teachers.length === 0) {
    validationIssues.push({ type: 'warning', message: 'No teachers configured' });
  }
  
  if (classrooms.length === 0) {
    validationIssues.push({ type: 'warning', message: 'No classrooms configured' });
  }

  // Check for groups without subjects
  const groupsWithoutSubjects = classGroups.filter(group => 
    Object.keys(group.subjectHours || {}).length === 0
  );
  
  if (groupsWithoutSubjects.length > 0) {
    validationIssues.push({ 
      type: 'warning', 
      message: `${groupsWithoutSubjects.length} groups have no assigned subjects` 
    });
  }

  // Check for subjects without teachers
  const subjectsWithoutTeachers = subjects.filter(subject => 
    subject.teacherIds.length === 0
  );
  
  if (subjectsWithoutTeachers.length > 0) {
    validationIssues.push({ 
      type: 'warning', 
      message: `${subjectsWithoutTeachers.length} subjects have no assigned teachers` 
    });
  }

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

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown';
  };

  const getClassroomName = (classroomId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? `${classroom.number} (Floor ${classroom.floor})` : 'Unknown';
  };

  // Get available classrooms for teacher assignment
  const getAvailableClassrooms = (excludeTeacherId?: string) => {
    const assignedClassrooms = teachers
      .filter(teacher => teacher.homeClassroom && teacher.id !== excludeTeacherId)
      .map(teacher => teacher.homeClassroom);
    
    return classrooms.filter(classroom => 
      (classroom.type === 'teacher_lab' || classroom.type === 'theory') && 
      !assignedClassrooms.includes(classroom.id)
    );
  };

  const startEditing = (section: string, item?: any) => {
    setEditingSection(section);
    setEditingItem(item || null);
    
    // Initialize form data based on section and item
    switch (section) {
      case 'institution':
        setFormData({
          name: institution.name,
          workingDays: [...institution.workingDays],
          lessonsPerDay: institution.lessonsPerDay,
          lessonDuration: institution.lessonDuration,
          startTime: institution.startTime,
          academicWeeks: institution.academicWeeks,
          specializations: [...institution.specializations],
        });
        break;
      case 'groups':
        if (item) {
          setFormData({
            name: item.name,
            course: item.course || 1,
            specialization: item.specialization || '',
            studentsCount: item.studentsCount,
            homeRoom: item.homeRoom || '',
          });
        }
        break;
      case 'subjects':
        if (item) {
          setFormData({
            name: item.name,
            type: item.type,
            course: item.course,
            teacherIds: [...item.teacherIds],
          });
        }
        break;
      case 'classrooms':
        if (item) {
          setFormData({
            number: item.number,
            floor: item.floor,
            type: item.type,
            capacity: item.capacity,
            hasComputers: item.hasComputers,
            specialization: item.specialization || '',
          });
        }
        break;
      case 'teachers':
        if (item) {
          setFormData({
            firstName: item.firstName,
            lastName: item.lastName,
            subjects: [...item.subjects],
            homeClassroom: item.homeClassroom || '',
            availableHours: { ...item.availableHours },
          });
        }
        break;
    }
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditingItem(null);
    setFormData({});
  };

  const saveChanges = () => {
    try {
      switch (editingSection) {
        case 'institution':
          setInstitution(formData);
          showToast.showSuccess('Institution Updated', 'Institution settings have been updated successfully!');
          break;
        case 'groups':
          if (editingItem) {
            const updatedGroups = classGroups.map(group =>
              group.id === editingItem.id
                ? { ...group, ...formData }
                : group
            );
            setClassGroups(updatedGroups);
            showToast.showSuccess('Group Updated', `Group "${formData.name}" has been updated successfully!`);
          }
          break;
        case 'subjects':
          if (editingItem) {
            const updatedSubjects = subjects.map(subject =>
              subject.id === editingItem.id
                ? { ...subject, ...formData }
                : subject
            );
            setSubjects(updatedSubjects);
            showToast.showSuccess('Subject Updated', `Subject "${formData.name}" has been updated successfully!`);
          }
          break;
        case 'classrooms':
          if (editingItem) {
            const updatedClassrooms = classrooms.map(classroom =>
              classroom.id === editingItem.id
                ? { ...classroom, ...formData }
                : classroom
            );
            setClassrooms(updatedClassrooms);
            showToast.showSuccess('Classroom Updated', `Classroom "${formData.number}" has been updated successfully!`);
          }
          break;
        case 'teachers':
          if (editingItem) {
            const updatedTeachers = teachers.map(teacher =>
              teacher.id === editingItem.id
                ? { ...teacher, ...formData, homeClassroom: formData.homeClassroom || undefined }
                : teacher
            );
            setTeachers(updatedTeachers);
            showToast.showSuccess('Teacher Updated', `Teacher "${formData.firstName} ${formData.lastName}" has been updated successfully!`);
          }
          break;
      }
      cancelEditing();
    } catch (error) {
      showToast.showError('Update Failed', 'Failed to update the item. Please try again.');
    }
  };

  const deleteItem = (section: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      switch (section) {
        case 'groups':
          const groupToDelete = classGroups.find(g => g.id === id);
          setClassGroups(classGroups.filter(g => g.id !== id));
          showToast.showSuccess('Group Deleted', `Group "${groupToDelete?.name}" has been deleted successfully!`);
          break;
        case 'subjects':
          const subjectToDelete = subjects.find(s => s.id === id);
          setSubjects(subjects.filter(s => s.id !== id));
          showToast.showSuccess('Subject Deleted', `Subject "${subjectToDelete?.name}" has been deleted successfully!`);
          break;
        case 'classrooms':
          const classroomToDelete = classrooms.find(c => c.id === id);
          setClassrooms(classrooms.filter(c => c.id !== id));
          showToast.showSuccess('Classroom Deleted', `Classroom "${classroomToDelete?.number}" has been deleted successfully!`);
          break;
        case 'teachers':
          const teacherToDelete = teachers.find(t => t.id === id);
          setTeachers(teachers.filter(t => t.id !== id));
          showToast.showSuccess('Teacher Deleted', `Teacher "${teacherToDelete?.firstName} ${teacherToDelete?.lastName}" has been deleted successfully!`);
          break;
      }
    } catch (error) {
      showToast.showError('Delete Failed', 'Failed to delete the item. Please try again.');
    }
  };

  const handleTeacherSelection = (subjectName: string, checked: boolean) => {
    setFormData({
      ...formData,
      subjects: checked
        ? [...formData.subjects, subjectName]
        : formData.subjects.filter((s: string) => s !== subjectName)
    });
  };

  const handleTeacherIdSelection = (teacherId: string, checked: boolean) => {
    setFormData({
      ...formData,
      teacherIds: checked
        ? [...formData.teacherIds, teacherId]
        : formData.teacherIds.filter((id: string) => id !== teacherId)
    });
  };

  const handleWorkingDaysChange = (day: string, checked: boolean) => {
    setFormData({
      ...formData,
      workingDays: checked
        ? [...formData.workingDays, day]
        : formData.workingDays.filter((d: string) => d !== day)
    });
  };

  const handleSpecializationAdd = (specialization: string) => {
    if (specialization.trim() && !formData.specializations.includes(specialization.trim())) {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, specialization.trim()]
      });
    }
  };

  const handleSpecializationRemove = (specialization: string) => {
    setFormData({
      ...formData,
      specializations: formData.specializations.filter((s: string) => s !== specialization)
    });
  };

  const workingDaysOptions = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Eye className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            Complete system overview and quick edit access
          </div>
          <button
            onClick={exportConfiguration}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Configuration
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Groups</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSubjects}</p>
              <p className="text-xs text-gray-400">{stats.theorySubjects} theory, {stats.labSubjects} lab</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Classrooms</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClassrooms}</p>
              <p className="text-xs text-gray-400">{stats.theoryClassrooms} theory, {stats.labClassrooms} lab</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Teachers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTeachers}</p>
              <p className="text-xs text-gray-400">{stats.teachersWithClassrooms} with own classroom</p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-medium text-gray-900">System Status</h3>
          </div>
          <div className="space-y-2">
            {validationIssues.map((issue, index) => (
              <div key={index} className={`flex items-center space-x-2 p-3 rounded-md ${
                issue.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
                {issue.type === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                <span className="text-sm">{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Institution Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Institution Settings</h3>
            </div>
            <button
              onClick={() => startEditing('institution')}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-lg text-gray-900">{institution.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Working Days</p>
              <p className="text-lg text-gray-900">{institution.workingDays.length} days</p>
              <p className="text-xs text-gray-400">{institution.workingDays.join(', ')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Schedule</p>
              <p className="text-lg text-gray-900">{institution.lessonsPerDay} lessons/day</p>
              <p className="text-xs text-gray-400">Starting at {institution.startTime}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Lesson Duration</p>
              <p className="text-lg text-gray-900">{institution.lessonDuration} minutes</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Academic Weeks</p>
              <p className="text-lg text-gray-900">{institution.academicWeeks} weeks</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Specializations</p>
              <p className="text-lg text-gray-900">{institution.specializations.length}</p>
              <p className="text-xs text-gray-400">{institution.specializations.join(', ') || 'None'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Groups Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Groups ({classGroups.length})</h3>
            </div>
          </div>
        </div>
        <div className="p-6">
          {classGroups.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No groups configured</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classGroups.map((group) => (
                <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{group.name}</h4>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startEditing('groups', group)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteItem('groups', group.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>{getCourseText(group.course || 1)}</p>
                    <p>{group.specialization || 'No specialization'}</p>
                    <p>{group.studentsCount} students</p>
                    <p>{Object.keys(group.subjectHours || {}).length} subjects assigned</p>
                    {group.homeRoom && (
                      <p>Home: {getClassroomName(group.homeRoom)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subjects Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">Subjects ({subjects.length})</h3>
            </div>
          </div>
        </div>
        <div className="p-6">
          {subjects.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No subjects configured</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <div key={subject.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{subject.name}</h4>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startEditing('subjects', subject)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteItem('subjects', subject.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      {subject.type === 'lab' ? (
                        <Monitor className="h-4 w-4 text-green-600" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      )}
                      <span>{subject.type === 'theory' ? 'Theory' : 'Laboratory'}</span>
                    </div>
                    <p>{getCourseText(subject.course)}</p>
                    <p>{subject.teacherIds.length} teachers assigned</p>
                    {subject.teacherIds.length > 0 && (
                      <p className="text-xs">
                        {subject.teacherIds.slice(0, 2).map(id => getTeacherName(id)).join(', ')}
                        {subject.teacherIds.length > 2 && ` +${subject.teacherIds.length - 2} more`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Classrooms Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">Classrooms ({classrooms.length})</h3>
            </div>
          </div>
        </div>
        <div className="p-6">
          {classrooms.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No classrooms configured</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {classrooms.map((classroom) => (
                <div key={classroom.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{classroom.number}</h4>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startEditing('classrooms', classroom)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteItem('classrooms', classroom.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Floor {classroom.floor}</p>
                    <p>{classroom.type === 'theory' ? 'Theory' : classroom.type === 'lab' ? 'Laboratory' : 'Teacher Lab'}</p>
                    <p>{classroom.capacity} capacity</p>
                    {classroom.type === 'lab' && (
                      <p>{classroom.hasComputers ? 'Has computers' : 'No computers'}</p>
                    )}
                    {classroom.specialization && (
                      <p className="text-xs">{classroom.specialization}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Teachers Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-medium text-gray-900">Teachers ({teachers.length})</h3>
            </div>
          </div>
        </div>
        <div className="p-6">
          {teachers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No teachers configured</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map((teacher) => {
                const totalHours = Object.values(teacher.availableHours).reduce((sum, hours) => sum + hours.length, 0);
                return (
                  <div key={teacher.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {teacher.firstName} {teacher.lastName}
                      </h4>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => startEditing('teachers', teacher)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteItem('teachers', teacher.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>{teacher.subjects.length} subjects</p>
                      <p>{totalHours}h/week available</p>
                      {teacher.homeClassroom && (
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="text-xs">Own: {getClassroomName(teacher.homeClassroom)}</span>
                        </div>
                      )}
                      <p className="text-xs">
                        {teacher.subjects.slice(0, 2).join(', ')}
                        {teacher.subjects.length > 2 && ` +${teacher.subjects.length - 2} more`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Overview */}
      {schedule.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-medium text-gray-900">Generated Schedule</h3>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-600">Ready</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Lessons</p>
                <p className="text-2xl font-bold text-gray-900">{schedule.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Working Days</p>
                <p className="text-2xl font-bold text-gray-900">{institution.workingDays.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Lessons per Day</p>
                <p className="text-2xl font-bold text-gray-900">{institution.lessonsPerDay}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit {editingSection === 'institution' ? 'Institution' : 
                        editingSection === 'groups' ? 'Group' :
                        editingSection === 'subjects' ? 'Subject' :
                        editingSection === 'classrooms' ? 'Classroom' :
                        editingSection === 'teachers' ? 'Teacher' : ''}
                </h3>
                <button
                  onClick={cancelEditing}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Institution Form */}
                {editingSection === 'institution' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Institution Name</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                      <div className="grid grid-cols-4 gap-3">
                        {workingDaysOptions.map((day) => (
                          <label key={day} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.workingDays?.includes(day) || false}
                              onChange={(e) => handleWorkingDaysChange(day, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Lessons per Day</label>
                        <input
                          type="number"
                          min="1"
                          max="8"
                          value={formData.lessonsPerDay || 4}
                          onChange={(e) => setFormData({ ...formData, lessonsPerDay: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Duration (min)</label>
                        <input
                          type="number"
                          min="45"
                          max="90"
                          value={formData.lessonDuration || 70}
                          onChange={(e) => setFormData({ ...formData, lessonDuration: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                        <input
                          type="time"
                          value={formData.startTime || '09:00'}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Academic Weeks</label>
                        <input
                          type="number"
                          min="30"
                          max="52"
                          value={formData.academicWeeks || 40}
                          onChange={(e) => setFormData({ ...formData, academicWeeks: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Group Form */}
                {editingSection === 'groups' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                        <input
                          type="number"
                          min="1"
                          max="6"
                          value={formData.course || 1}
                          onChange={(e) => setFormData({ ...formData, course: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Students Count</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={formData.studentsCount || 25}
                          onChange={(e) => setFormData({ ...formData, studentsCount: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                      {institution.specializations.length > 0 ? (
                        <select
                          value={formData.specialization || ''}
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
                            value={formData.specialization || ''}
                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter specialization manually"
                          />
                          <p className="mt-1 text-xs text-yellow-600">
                            No specializations configured in Institution Settings. You can enter manually or configure them in Setup first.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Subject Form */}
                {editingSection === 'subjects' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <select
                          value={formData.type || 'theory'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="theory">Theory</option>
                          <option value="lab">Laboratory</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                        <input
                          type="number"
                          min="1"
                          max="6"
                          value={formData.course || 1}
                          onChange={(e) => setFormData({ ...formData, course: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Teachers Selection */}
                    {teachers.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assign Teachers</label>
                        <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                          {teachers.map((teacher) => (
                            <label key={teacher.id} className="flex items-center py-1">
                              <input
                                type="checkbox"
                                checked={formData.teacherIds?.includes(teacher.id) || false}
                                onChange={(e) => handleTeacherIdSelection(teacher.id, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {teacher.firstName} {teacher.lastName}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Classroom Form */}
                {editingSection === 'classrooms' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                        <input
                          type="text"
                          value={formData.number || ''}
                          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={formData.floor || 1}
                          onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <select
                          value={formData.type || 'theory'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="theory">Theory Classroom</option>
                          <option value="lab">Laboratory</option>
                          <option value="teacher_lab">Teacher's Lab</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.capacity || 30}
                          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {formData.type === 'lab' && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.hasComputers || false}
                          onChange={(e) => setFormData({ ...formData, hasComputers: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Has Computers</label>
                      </div>
                    )}
                  </>
                )}

                {/* Teacher Form */}
                {editingSection === 'teachers' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        <input
                          type="text"
                          value={formData.firstName || ''}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          value={formData.lastName || ''}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Teacher's Own Classroom */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="inline h-4 w-4 mr-1" />
                        Teacher's Own Classroom/Office
                      </label>
                      {getAvailableClassrooms(editingItem?.id).length > 0 ? (
                        <select
                          value={formData.homeClassroom || ''}
                          onChange={(e) => setFormData({ ...formData, homeClassroom: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">No assigned classroom</option>
                          {getAvailableClassrooms(editingItem?.id).map((classroom) => (
                            <option key={classroom.id} value={classroom.id}>
                              {classroom.number} - Floor {classroom.floor} ({classroom.type === 'teacher_lab' ? 'Teacher Lab' : 'Theory'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div>
                          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                            No available classrooms for assignment
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            All suitable classrooms are already assigned. Add more teacher labs or theory classrooms.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Subjects Selection */}
                    {subjects.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Teaching Subjects</label>
                        <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                          {subjects.map((subject) => (
                            <label key={subject.id} className="flex items-center py-1">
                              <input
                                type="checkbox"
                                checked={formData.subjects?.includes(subject.name) || false}
                                onChange={(e) => handleTeacherSelection(subject.name, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">{subject.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveChanges}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;