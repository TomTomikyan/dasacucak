import React, { useState } from 'react';
import { Plus, MapPin, Monitor, Trash2, Building, BookOpen, Edit, Save, X } from 'lucide-react';
import { Classroom, Subject } from '../types';

interface ClassroomsProps {
  classrooms: Classroom[];
  addClassroom: (classroom: Omit<Classroom, 'id'>) => void;
  setClassrooms: (classrooms: Classroom[]) => void;
  generateClassrooms: (floors: number, roomsPerFloor: number) => void;
  subjects: Subject[];
}

const Classrooms: React.FC<ClassroomsProps> = ({
  classrooms,
  addClassroom,
  setClassrooms,
  generateClassrooms,
  subjects,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    number: '',
    floor: 1,
    type: 'theory' as 'theory' | 'lab' | 'teacher_lab',
    hasComputers: false,
    selectedSubjects: [] as string[],
    capacity: 30,
  });

  // Check if room number already exists
  const isRoomNumberTaken = (roomNumber: string, excludeId?: string) => {
    return classrooms.some(classroom => 
      classroom.number.toLowerCase() === roomNumber.toLowerCase() && 
      classroom.id !== excludeId
    );
  };

  const startEditing = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      number: classroom.number,
      floor: classroom.floor,
      type: classroom.type,
      hasComputers: classroom.hasComputers,
      selectedSubjects: classroom.specialization ? classroom.specialization.split(', ').filter(Boolean) : [],
      capacity: classroom.capacity,
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingClassroom(null);
    setFormData({
      number: '',
      floor: 1,
      type: 'theory',
      hasComputers: false,
      selectedSubjects: [],
      capacity: 30,
    });
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate room number uniqueness
    if (isRoomNumberTaken(formData.number, editingClassroom?.id)) {
      alert(`Room number "${formData.number}" already exists. Please choose a different number.`);
      return;
    }
    
    if (editingClassroom) {
      // Update existing classroom
      const updatedClassrooms = classrooms.map(classroom =>
        classroom.id === editingClassroom.id
          ? {
              ...classroom,
              number: formData.number,
              floor: formData.floor,
              type: formData.type,
              hasComputers: formData.hasComputers,
              specialization: formData.selectedSubjects.join(', '),
              capacity: formData.capacity,
            }
          : classroom
      );
      setClassrooms(updatedClassrooms);
      setEditingClassroom(null);
    } else {
      // Create new classroom
      addClassroom({
        number: formData.number,
        floor: formData.floor,
        type: formData.type,
        hasComputers: formData.hasComputers,
        specialization: formData.selectedSubjects.join(', '),
        capacity: formData.capacity,
      });
    }
    
    setFormData({
      number: '',
      floor: 1,
      type: 'theory',
      hasComputers: false,
      selectedSubjects: [],
      capacity: 30,
    });
    setShowForm(false);
  };

  const deleteClassroom = (id: string) => {
    setClassrooms(classrooms.filter(classroom => classroom.id !== id));
  };

  const handleSubjectSelection = (subjectId: string, checked: boolean) => {
    setFormData({
      ...formData,
      selectedSubjects: checked
        ? [...formData.selectedSubjects, subjectId]
        : formData.selectedSubjects.filter(id => id !== subjectId)
    });
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
  };

  // Function to display specialization with subject names instead of IDs
  const getSpecializationDisplay = (specialization: string) => {
    if (!specialization) return '';
    
    const subjectIds = specialization.split(', ').filter(Boolean);
    const subjectNames = subjectIds.map(id => getSubjectName(id));
    return subjectNames.join(', ');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lab':
        return <Monitor className="h-4 w-4" />;
      case 'teacher_lab':
        return <Building className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lab':
        return 'bg-green-100 text-green-800';
      case 'teacher_lab':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Filter subjects for lab selection (only lab subjects)
  const labSubjects = subjects.filter(subject => subject.type === 'lab');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MapPin className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Classrooms</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Classroom
          </button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                    <input
                      type="text"
                      required
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        formData.number && isRoomNumberTaken(formData.number, editingClassroom?.id)
                          ? 'border-red-300 focus:ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="101"
                    />
                    {formData.number && isRoomNumberTaken(formData.number, editingClassroom?.id) && (
                      <p className="mt-1 text-sm text-red-600">
                        Room number already exists
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Classroom Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'theory' | 'lab' | 'teacher_lab' })}
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
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Computer availability for both lab and teacher_lab */}
                {(formData.type === 'lab' || formData.type === 'teacher_lab') && (
                  <>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="hasComputers"
                        checked={formData.hasComputers}
                        onChange={(e) => setFormData({ ...formData, hasComputers: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="hasComputers" className="ml-2 text-sm text-gray-700 flex items-center">
                        <Monitor className="h-4 w-4 mr-1" />
                        Has Computers
                      </label>
                    </div>

                    {/* Subject Selection for Labs only (not teacher labs) */}
                    {formData.type === 'lab' && labSubjects.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <BookOpen className="inline h-4 w-4 mr-1" />
                          Dedicated Laboratory Subjects
                        </label>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0">
                              <Monitor className="h-5 w-5 text-blue-600 mt-0.5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-blue-900">Специализированная лаборатория</h4>
                              <p className="text-sm text-blue-700 mt-1">
                                Выберите предметы, для которых эта аудитория будет использоваться <strong>исключительно</strong>. 
                                В этой лаборатории будут проводиться только занятия по выбранным предметам.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                          <div className="space-y-2">
                            {labSubjects.map((subject) => (
                              <label key={subject.id} className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.selectedSubjects.includes(subject.id)}
                                  onChange={(e) => handleSubjectSelection(subject.id, e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700 font-medium">{subject.name}</span>
                                <span className="ml-auto text-xs text-gray-500">Лабораторная работа</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {formData.selectedSubjects.length > 0 && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-700">
                              <strong>Выбрано:</strong> {formData.selectedSubjects.length} предмет(ов). 
                              Эта лаборатория будет использоваться только для этих предметов.
                            </p>
                          </div>
                        )}
                        {formData.selectedSubjects.length === 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-700">
                              Если не выбрать предметы, лаборатория будет доступна для всех лабораторных работ.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.type === 'teacher_lab' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-700">
                          <Building className="inline h-4 w-4 mr-1" />
                          Teacher's Lab: This classroom can be assigned to a teacher as their personal workspace/office.
                        </p>
                      </div>
                    )}
                  </>
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
                  disabled={formData.number && isRoomNumberTaken(formData.number, editingClassroom?.id)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingClassroom ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    'Add Classroom'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Classrooms List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {classrooms.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classrooms yet</h3>
            <p className="text-gray-500 mb-4">Start by adding classrooms or use bulk generation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Floor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classrooms.map((classroom) => (
                  <tr key={classroom.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          {getTypeIcon(classroom.type)}
                        </div>
                        <span className="font-medium text-gray-900">{classroom.number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Floor {classroom.floor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(classroom.type)}`}>
                        {classroom.type === 'theory' ? 'Theory' : classroom.type === 'lab' ? 'Laboratory' : 'Teacher Lab'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {classroom.capacity} students
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col space-y-1">
                        {(classroom.type === 'lab' || classroom.type === 'teacher_lab') && (
                          <span className={`inline-flex px-2 py-1 text-xs rounded w-fit ${
                            classroom.hasComputers 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Monitor className="h-3 w-3 mr-1" />
                            {classroom.hasComputers ? 'Computers' : 'No computers'}
                          </span>
                        )}
                        {classroom.specialization && classroom.type === 'lab' && (
                          <div className="flex flex-wrap gap-1">
                            {getSpecializationDisplay(classroom.specialization).split(', ').map((subject, index) => (
                              <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                {subject}
                              </span>
                            ))}
                          </div>
                        )}
                        {classroom.type === 'lab' && !classroom.specialization && (
                          <span className="text-xs text-gray-400 italic">Universal lab</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(classroom)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit classroom"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteClassroom(classroom.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete classroom"
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

export default Classrooms;