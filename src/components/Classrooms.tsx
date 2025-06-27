import React, { useState } from 'react';
import { Plus, MapPin, Monitor, Trash2, BookOpen, Edit, Save, X } from 'lucide-react';
import { Classroom, Subject } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface ClassroomsProps {
  classrooms: Classroom[];
  addClassroom: (classroom: Omit<Classroom, 'id'>) => void;
  setClassrooms: (classrooms: Classroom[]) => void;
  generateClassrooms: (floors: number, roomsPerFloor: number) => void;
  subjects: Subject[];
  showToast: {
    showSuccess: (title: string, message: string, duration?: number) => void;
    showError: (title: string, message: string, duration?: number) => void;
    showWarning: (title: string, message: string, duration?: number) => void;
    showInfo: (title: string, message: string, duration?: number) => void;
  };
}

const Classrooms: React.FC<ClassroomsProps> = ({
  classrooms,
  addClassroom,
  setClassrooms,
  generateClassrooms,
  subjects,
  showToast,
}) => {
  const { t } = useLocalization();
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    number: '',
    floor: 1,
    type: 'theory' as 'theory' | 'lab' | 'teacher_lab',
    hasComputers: false,
    selectedSubjects: [] as string[],
    capacity: 30,
  });
  const [bulkData, setBulkData] = useState({
    floors: 3,
    roomsPerFloor: 10,
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
      showToast.showError(t('validation.duplicateName'), t('validation.roomNumberExists'));
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
      showToast.showSuccess(
        t('toast.classroomUpdated'), 
        t('toast.classroomUpdatedDesc', { number: formData.number })
      );
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
      showToast.showSuccess(
        t('toast.classroomAdded'), 
        t('toast.classroomAddedDesc', { number: formData.number })
      );
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

  const handleBulkGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateClassrooms(bulkData.floors, bulkData.roomsPerFloor);
    setShowBulkForm(false);
    showToast.showSuccess(
      t('toast.generationSuccessful'), 
      t('toast.generationSuccessfulDesc', { count: bulkData.floors * bulkData.roomsPerFloor })
    );
  };

  const deleteClassroom = (id: string) => {
    const classroom = classrooms.find(c => c.id === id);
    if (classroom && confirm(t('common.confirmDelete'))) {
      setClassrooms(classrooms.filter(classroom => classroom.id !== id));
      showToast.showSuccess(
        t('toast.classroomDeleted'), 
        t('toast.classroomDeletedDesc', { number: classroom.number })
      );
    }
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
        return <MapPin className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lab':
        return 'bg-green-100 text-green-800';
      case 'teacher_lab':
        return 'bg-[#03524f] bg-opacity-10 text-[#03524f]';
      default:
        return 'bg-[#03524f] bg-opacity-10 text-[#03524f]';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'lab':
        return t('subjects.laboratory');
      case 'teacher_lab':
        return t('classrooms.teacherLab');
      default:
        return t('classrooms.theoryClassroom');
    }
  };

  // Filter subjects for lab selection (only lab subjects)
  const labSubjects = subjects.filter(subject => subject.type === 'lab');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MapPin className="h-6 w-6 text-[#03524f]" />
          <h2 className="text-2xl font-bold text-gray-900">{t('classrooms.title')}</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('classrooms.addClassroom')}
          </button>
        </div>
      </div>

      {/* Bulk Generation Form Modal */}
      {showBulkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <form onSubmit={handleBulkGenerate} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{t('classrooms.generateClassrooms')}</h3>
                <button
                  type="button"
                  onClick={() => setShowBulkForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('classrooms.floors')}</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={bulkData.floors}
                    onChange={(e) => setBulkData({ ...bulkData, floors: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('classrooms.roomsPerFloor')}</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={bulkData.roomsPerFloor}
                    onChange={(e) => setBulkData({ ...bulkData, roomsPerFloor: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                  />
                </div>

                <div className="bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-md p-3">
                  <p className="text-sm text-[#03524f]">
                    {t('classrooms.generateRooms')}: {bulkData.floors} {t('common.floor')} × {bulkData.roomsPerFloor} = {bulkData.floors * bulkData.roomsPerFloor} {t('classrooms.title').toLowerCase()}
                  </p>
                </div>
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
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md hover:bg-[#024239]"
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingClassroom ? t('classrooms.editClassroom') : t('classrooms.addNewClassroom')}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('classrooms.roomNumber')}</label>
                    <input
                      type="text"
                      required
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        formData.number && isRoomNumberTaken(formData.number, editingClassroom?.id)
                          ? 'border-red-300 focus:ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-[#03524f]'
                      }`}
                      placeholder={t('classrooms.roomNumberPlaceholder')}
                    />
                    {formData.number && isRoomNumberTaken(formData.number, editingClassroom?.id) && (
                      <p className="mt-1 text-sm text-red-600">
                        {t('classrooms.roomExists')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.floor')}</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('classrooms.classroomType')}</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'theory' | 'lab' | 'teacher_lab' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                  >
                    <option value="theory">{t('classrooms.theoryClassroom')}</option>
                    <option value="lab">{t('subjects.laboratory')}</option>
                    <option value="teacher_lab">{t('classrooms.teacherLab')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.capacity')}</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
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
                        className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                      />
                      <label htmlFor="hasComputers" className="ml-2 text-sm text-gray-700 flex items-center">
                        <Monitor className="h-4 w-4 mr-1" />
                        {t('classrooms.hasComputers')}
                      </label>
                    </div>

                    {/* Subject Selection for Labs only (not teacher labs) */}
                    {formData.type === 'lab' && labSubjects.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <BookOpen className="inline h-4 w-4 mr-1" />
                          {t('classrooms.dedicatedLabSubjects')}
                        </label>
                        <div className="bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-md p-3 mb-3">
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0">
                              <Monitor className="h-5 w-5 text-[#03524f] mt-0.5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-[#03524f]">{t('classrooms.specializedLab')}</h4>
                              <p className="text-sm text-[#03524f] opacity-80 mt-1">
                                {t('classrooms.specializedLabDesc')}
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
                                  className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700 font-medium">{subject.name}</span>
                                <span className="ml-auto text-xs text-gray-500">{t('subjects.laboratory')}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {formData.selectedSubjects.length > 0 && (
                          <div className="mt-2 p-2 bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-md">
                            <p className="text-sm text-[#03524f]">
                              {t('classrooms.selectedSubjects', { count: formData.selectedSubjects.length })}
                            </p>
                          </div>
                        )}
                        {formData.selectedSubjects.length === 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-700">
                              {t('classrooms.noSubjectsSelected')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.type === 'teacher_lab' && (
                      <div className="bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-md p-3">
                        <p className="text-sm text-[#03524f]">
                          <MapPin className="inline h-4 w-4 mr-1" />
                          {t('classrooms.teacherLabDesc')}
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={formData.number && isRoomNumberTaken(formData.number, editingClassroom?.id)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md hover:bg-[#024239] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingClassroom ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('common.save')}
                    </>
                  ) : (
                    t('classrooms.addClassroom')
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('classrooms.noClassrooms')}</h3>
            <p className="text-gray-500 mb-4">{t('classrooms.noClassroomsDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.room')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.floor')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.capacity')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.specialization')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classrooms.map((classroom) => (
                  <tr key={classroom.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-[#03524f] bg-opacity-10 flex items-center justify-center mr-3">
                          {getTypeIcon(classroom.type)}
                        </div>
                        <span className="font-medium text-gray-900">{classroom.number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {t('common.floor')} {classroom.floor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(classroom.type)}`}>
                        {getTypeText(classroom.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {classroom.capacity} {t('common.students')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col space-y-1">
                        {(classroom.type === 'lab' || classroom.type === 'teacher_lab') && (
                          <span className={`inline-flex px-2 py-1 text-xs rounded w-fit ${
                            classroom.hasComputers 
                              ? 'bg-[#03524f] bg-opacity-10 text-[#03524f]' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Monitor className="h-3 w-3 mr-1" />
                            {classroom.hasComputers ? t('classrooms.computers') : t('classrooms.noComputers')}
                          </span>
                        )}
                        {classroom.specialization && classroom.type === 'lab' && (
                          <div className="flex flex-wrap gap-1">
                            {getSpecializationDisplay(classroom.specialization).split(', ').map((subject, index) => (
                              <span key={index} className="inline-flex px-2 py-1 text-xs bg-[#03524f] bg-opacity-10 text-[#03524f] rounded">
                                {subject}
                              </span>
                            ))}
                          </div>
                        )}
                        {classroom.type === 'lab' && !classroom.specialization && (
                          <span className="text-xs text-gray-400 italic">{t('classrooms.universalLab')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(classroom)}
                          className="text-[#03524f] hover:text-[#024239] transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteClassroom(classroom.id)}
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

export default Classrooms;