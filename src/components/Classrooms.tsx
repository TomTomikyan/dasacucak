import React, { useState } from 'react';
// Իկոնների ներմուծում UI-ի տեսողական բաղադրիչների համար
import { Plus, MapPin, Monitor, Trash2, BookOpen, CreditCard as Edit, Save, X, Users } from 'lucide-react';
// Տիպերի և լոկալիզացիայի (բազմալեզվության) հուքերի ներմուծում
import { Classroom, Subject, ClassGroup } from '../types';
import { useLocalization } from '../hooks/useLocalization';

// Component-ի Props-ի ինտերֆեյսի սահմանում
interface ClassroomsProps {
  classrooms: Classroom[]; // Առկա բոլոր լսարանների ցուցակը
  addClassroom: (classroom: Omit<Classroom, 'id'>) => void; // Նոր լսարան ավելացնելու ֆունկցիա
  setClassrooms: (classrooms: Classroom[]) => void; // Լսարանների state-ը թարմացնելու ֆունկցիա
  generateClassrooms: (floors: number, roomsPerFloor: number) => void; // Լսարանների ավտոմատ (bulk) գեներացման ֆունկցիա
  subjects: Subject[]; // Առարկաների ցուցակը՝ լաբորատորիաների մասնագիտացման համար
  classGroups: ClassGroup[]; // Ուսանողական խմբերի ցուցակը՝ universal լսարաններին կցելու համար
  showToast: { // Ծանուցումների (Toasts) համակարգ
    showSuccess: (title: string, message: string, duration?: number) => void;
    showError: (title: string, message: string, duration?: number) => void;
    showWarning: (title: string, message: string, duration?: number) => void;
    showInfo: (title: string, message: string, duration?: number) => void;
  };
}

/**
 * Tooltip Component -Ցուցադրում է լրացուցիչ տեղեկատվություն հուշման տեսքով,
 * երբ մկնիկը պահվում է համապատասխան էլեմենտի վրա:
 */
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false); // Tooltip-ի տեսանելիության state
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Tooltip-ի դիրքը էկրանի վրա

  // Մկնիկը էլեմենտի վրա բերելիս դիրքի հաշվարկ
  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2, // Կենտրոնացում էլեմենտի նկատմամբ
      y: rect.top - 10 // Ցուցադրում էլեմենտից մի փոքր վերև
    });
    setIsVisible(true);
  };

  // Մկնիկը հեռացնելիս թաքցնել tooltip-ը
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
          {/* Tooltip-ի սլաքը (arrow) */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#03524f]"></div>
        </div>
      )}
    </div>
  );
};

/**
 * Classrooms Component - Լսարանների կառավարման հիմնական մոդուլը
 */
const Classrooms: React.FC<ClassroomsProps> = ({
  classrooms,
  addClassroom,
  setClassrooms,
  generateClassrooms,
  subjects,
  classGroups,
  showToast,
}) => {
  const { t } = useLocalization(); // Լեզվական թարգմանությունների հուք

  // Մոդալ պատուհանների տեսանելիության state-եր
  const [showForm, setShowForm] = useState(false); // Ավելացնելու/Խմբագրելու ձևաթուղթ
  const [showBulkForm, setShowBulkForm] = useState(false); // Ավտոմատ գեներացման ձևաթուղթ
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null); // Խմբագրվող լսարանի օբյեկտը
  const [deletingClassroom, setDeletingClassroom] = useState<Classroom | null>(null); // Հեռացման հաստատման սպասող լսարանը

  // Լսարանի ձևաթղթի (Form) սկզբնական state
  const [formData, setFormData] = useState({
    number: '',
    floor: 1,
    type: 'theory' as 'theory' | 'lab' | 'teacher_lab' | 'universal',
    hasComputers: false,
    selectedSubjects: [] as string[], // Մասնագիտացված առարկաների ID-ներ
    capacity: 30,
    assignedGroupId: '', // Կցված խմբի ID-ն (միայն universal տիպի համար)
  });

  // Ավտոմատ գեներացման (Bulk generation) սկզբնական տվյալներ
  const [bulkData, setBulkData] = useState({
    floors: 3,
    roomsPerFloor: 10,
  });

  /**
   * Ստուգում է՝ արդյոք տվյալ համարով լսարան արդեն գոյություն ունի, թե ոչ
   * @param roomNumber Ստուգվող լսարանի համարը
   * @param excludeId Լսարանի ID, որը պետք է բացառել ստուգումից (խմբագրման ժամանակ)
   */
  const isRoomNumberTaken = (roomNumber: string, excludeId?: string) => {
    return classrooms.some(classroom => 
      classroom.number.toLowerCase() === roomNumber.toLowerCase() && 
      classroom.id !== excludeId
    );
  };

  /**
   * Ակտիվացնում է լսարանի խմբագրման ռեժիմը և լրացնում ձևաթուղթը տվյալներով
   */
  const startEditing = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      number: classroom.number,
      floor: classroom.floor,
      type: classroom.type,
      hasComputers: classroom.hasComputers,
      selectedSubjects: classroom.specialization ? classroom.specialization.split(', ').filter(Boolean) : [],
      capacity: classroom.capacity,
      assignedGroupId: classroom.assignedGroupId || '',
    });
    setShowForm(true);
  };

  /**
   *Չեղարկում է խմբագրման ռեժիմը և մաքրում ձևաթղթի տվյալները
   */
  const cancelEdit = () => {
    setEditingClassroom(null);
    setFormData({
      number: '',
      floor: 1,
      type: 'theory',
      hasComputers: false,
      selectedSubjects: [],
      capacity: 30,
      assignedGroupId: '',
    });
    setShowForm(false);
  };

  /**
   * Լսարանի ավելացման կամ խմբագրման հաստատում (Form Submit)
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Վալիդացիա: Համարի դաշտը դատարկ լինել չի կարող
    if (!formData.number.trim()) {
      showToast.showWarning(t('validation.required'), t('classrooms.numberRequired'));
      return;
    }
    
    // Վալիդացիա: Կրկնվող լսարանի համարի ստուգում
    if (isRoomNumberTaken(formData.number, editingClassroom?.id)) {
      showToast.showWarning(t('validation.duplicateName'), t('validation.roomNumberExists'));
      return;
    }

    // Տվյալների օբյեկտի պատրաստում պահպանման համար
    const classroomData = {
      number: formData.number,
      floor: formData.floor,
      type: formData.type,
      hasComputers: formData.hasComputers,
      specialization: formData.selectedSubjects.join(', '), // ID-ները պահվում են ստորակետով բաժանված string-ով
      capacity: formData.capacity,
      // Խումբը կցվում է միայն այն դեպքում, երբ լսարանը 'universal' տիպի է
      assignedGroupId: formData.type === 'universal' ? formData.assignedGroupId : undefined,
    };

    if (editingClassroom) {
      // Գոյություն ունեցող լսարանի տվյալների թարմացում
      const updatedClassrooms = classrooms.map(classroom =>
        classroom.id === editingClassroom.id ? { ...classroom, ...classroomData } : classroom
      );
      setClassrooms(updatedClassrooms);
      setEditingClassroom(null);
      showToast.showSuccess(
        t('toast.classroomUpdated'),
        t('toast.classroomUpdatedDesc', { number: formData.number })
      );
    } else {
      // Նոր լսարանի ավելացում
      addClassroom(classroomData);
      showToast.showSuccess(
        t('toast.classroomAdded'),
        t('toast.classroomAddedDesc', { number: formData.number })
      );
    }

    // Ձևաթղթի state-ի մաքրում (Reset)
    setFormData({
      number: '',
      floor: 1,
      type: 'theory',
      hasComputers: false,
      selectedSubjects: [],
      capacity: 30,
      assignedGroupId: '',
    });
    setShowForm(false);
  };

  /**
   * Լսարանների ավտոմատ/զանգվածային ստեղծման հաստատում
   */
  const handleBulkGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateClassrooms(bulkData.floors, bulkData.roomsPerFloor);
    setShowBulkForm(false);
    showToast.showSuccess(
      t('toast.generationSuccessful'), 
      t('toast.generationSuccessfulDesc', { count: bulkData.floors * bulkData.roomsPerFloor })
    );
  };

  /**
   * Լսարանի հեռացում ըստ ID-ի
   */
  const deleteClassroom = (id: string) => {
    const classroom = classrooms.find(c => c.id === id);
    if (classroom) {
      setClassrooms(classrooms.filter(classroom => classroom.id !== id));
      showToast.showSuccess(
        t('toast.classroomDeleted'),
        t('toast.classroomDeletedDesc', { number: classroom.number })
      );
    }
  };

  /**
   * Լաբորատորիայի համար առարկաների ընտրության (Checkbox) փոփոխության կառավարում
   */
  const handleSubjectSelection = (subjectId: string, checked: boolean) => {
    setFormData({
      ...formData,
      selectedSubjects: checked
        ? [...formData.selectedSubjects, subjectId] // Ավելացնել ID-ն ցուցակում
        : formData.selectedSubjects.filter(id => id !== subjectId) // Հեռացնել ID-ն ցուցակից
    });
  };

  /**
   * Վերադարձնում է առարկայի անունը ըստ ID-ի
   */
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
  };

  /**
   * Ձևափոխում է ստորակետներով տարանջատված ID-ների տեքստը հասկանալի առարկաների անունների
   */
  const getSpecializationDisplay = (specialization: string) => {
    if (!specialization) return '';
    const subjectIds = specialization.split(', ').filter(Boolean);
    const subjectNames = subjectIds.map(id => getSubjectName(id));
    return subjectNames.join(', ');
  };

  // --- UI Օժանդակ ֆունկցիաներ (Իկոններ, Գույներ, Տեքստեր) ---

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lab':
      case 'teacher_lab':
        return <Monitor className="h-4 w-4" />;
      case 'universal':
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lab':
        return 'bg-green-100 text-green-800';
      case 'teacher_lab':
        return 'bg-[#03524f] bg-opacity-10 text-[#03524f]';
      case 'universal':
        return 'bg-blue-100 text-blue-800';
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
      case 'universal':
        return t('classrooms.universalClassroom');
      default:
        return t('classrooms.theoryClassroom');
    }
  };

  // --- Tooltip-ների բովանդակության ստացում ---

  const getClassroomTooltip = (classroom: Classroom) => {
    const typeText = getTypeText(classroom.type);
    const computerText = classroom.hasComputers ? 'Ունի համակարգիչներ' : 'Համակարգիչներ չկան';
    
    let tooltip = `🏫 Դասարան ${classroom.number}\n`;
    tooltip += `🏢 ${t('common.floor')} ${classroom.floor}\n`;
    tooltip += `📋 ${typeText}\n`;
    tooltip += `💻 ${computerText}\n`;
    tooltip += `👥 ${t('common.capacity')}: ${classroom.capacity}`;
    
    if (classroom.type === 'lab' && classroom.specialization) {
      const specializedSubjects = getSpecializationDisplay(classroom.specialization);
      tooltip += `\n\n🔬 Մասնագիտացված առարկաներ:\n${specializedSubjects}`;
    }
    
    return tooltip;
  };

  const getSpecializationTooltip = (classroom: Classroom) => {
    if (classroom.type === 'lab' && classroom.specialization) {
      const subjects = getSpecializationDisplay(classroom.specialization);
      return `🔬 Մասնագիտացված լաբորատորիա\n\nԱռարկաներ:\n${subjects}`;
    } else if (classroom.type === 'teacher_lab') {
      return '👨‍🏫 Ուսուցչի անձնական լաբորատորիա\nԿարող է օգտագործվել միայն նշանակված ուսուցչի կողմից';
    } else if (classroom.type === 'lab') {
      return '🔬 Ունիվերսալ լաբորատորիա\nԿարող է օգտագործվել ցանկացած լաբորատոր առարկայի համար';
    }
    return '';
  };

  // Ֆիլտրում ենք միայն այն առարկաները, որոնք ունեն 'lab' տիպը
  const labSubjects = subjects.filter(subject => subject.type === 'lab');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* --- HEADER (Գլխամաս) --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MapPin className="h-6 w-6 text-[#03524f]" />
          <h2 className="text-2xl font-bold text-gray-900">{t('classrooms.title')}</h2>
        </div>
        <div className="flex space-x-2">
          {/* Ավտոմատ գեներացման կոճակ (Կարող ես ակտիվացնել ըստ անհրաժեշտության) */}
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('classrooms.addClassroom')}
          </button>
        </div>
      </div>

      {/* --- ՄՈԴԱԼ ՊԱՏՈՒՀԱՆ: Զանգվածային ավտոմատ գեներացում --- */}
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
                {/* Հարկերի քանակի մուտքագրում */}
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

                {/* Մեկ հարկում լսարանների քանակի մուտքագրում */}
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

                {/* Ինֆորմացիոն տեղեկատվություն ընդհանուր քանակի մասին */}
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

      {/* --- ՄՈԴԱԼ ՊԱՏՈՒՀԱՆ: Լսարանի Ավելացում / Խմբագրում --- */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingClassroom ? t('classrooms.editClassroom') : t('classrooms.addNewClassroom')}
                </h3>
                <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Լսարանի Համար */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('classrooms.roomNumber')}</label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        formData.number && isRoomNumberTaken(formData.number, editingClassroom?.id)
                          ? 'border-red-300 focus:ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-[#03524f]'
                      }`}
                      placeholder={t('classrooms.roomNumberPlaceholder')}
                    />
                    {/* Սխալի հաղորդագրություն, եթե համարը զբաղված է */}
                    {formData.number && isRoomNumberTaken(formData.number, editingClassroom?.id) && (
                      <p className="mt-1 text-sm text-red-600">{t('classrooms.roomExists')}</p>
                    )}
                  </div>

                  {/* Հարկ */}
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

                {/* Լսարանի Տիպի ընտրություն */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('classrooms.classroomType')}</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'theory' | 'lab' | 'teacher_lab' | 'universal' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                  >
                    <option value="theory">{t('classrooms.theoryClassroom')}</option>
                    <option value="lab">{t('subjects.laboratory')}</option>
                    <option value="teacher_lab">{t('classrooms.teacherLab')}</option>
                    <option value="universal">{t('classrooms.universalClassroom')} </option>
                  </select>
                </div>

                {/* Տարողություն (Capacity) */}
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

                {/* Դինամիկ դաշտեր՝ կախված ընտրված լսարանի տիպից */}
                {formData.type === 'universal' && (
                  <div className="space-y-4">
                    {/* Համակարգիչների առկայության Checkbox */}
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

                    {/* Ուսանողական խմբի կցում (Universal լսարանի դեպքում) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {t('classrooms.assignedGroup')}
                      </label>
                      <select
                        value={formData.assignedGroupId}
                        onChange={(e) => setFormData({ ...formData, assignedGroupId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                      >
                        <option value="">{t('classrooms.noGroupAssigned')}</option>
                        {classGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}{group.specialization ? ` — ${group.specialization}` : ''}
                          </option>
                        ))}
                      </select>
                      {formData.assignedGroupId && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm text-blue-700">{t('classrooms.universalGroupDesc')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Լաբորատորիաների և Դասախոսական լաբորատորիաների լրացուցիչ դաշտեր */}
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

                    {/* Մասնագիտացված առարկաների բազմակի ընտրություն (միայն սովորական լաբորատորիաների համար) */}
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
                              <p className="text-sm text-[#03524f] opacity-80 mt-1">{t('classrooms.specializedLabDesc')}</p>
                            </div>
                          </div>
                        </div>
                        {/* Առարկաների Checkbox-ների ցուցակը scroll-ով */}
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
                        {/* Ընտրված առարկաների քանակի ցուցադրում */}
                        {formData.selectedSubjects.length > 0 && (
                          <div className="mt-2 p-2 bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-md">
                            <p className="text-sm text-[#03524f]">
                              {t('classrooms.selectedSubjects', { count: formData.selectedSubjects.length })}
                            </p>
                          </div>
                        )}
                        {formData.selectedSubjects.length === 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-700">{t('classrooms.noSubjectsSelected')}</p>
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

              {/* Ձևաթղթի Գործողությունների Կոճակներ */}
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

      {/* --- ՄՈԴԱԼ ՊԱՏՈՒՀԱՆ: Հեռացման հաստատում --- */}
      {deletingClassroom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('common.confirmDelete')}</h3>
              <p className="text-sm text-gray-500 mb-6">
                {t('common.confirmDeleteQuestion')} "{deletingClassroom.number}" դասարանը:
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingClassroom(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    deleteClassroom(deletingClassroom.id);
                    setDeletingClassroom(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ԼՍԱՐԱՆՆԵՐԻ ԱՂՅՈՒՍԱԿ (Table View) --- */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {classrooms.length === 0 ? (
          /* Դատարկ վիճակ (Empty State) */
          <div className="p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('classrooms.noClassrooms')}</h3>
            <p className="text-gray-500 mb-4">{t('classrooms.noClassroomsDesc')}</p>
          </div>
        ) : (
          /* Հիմնական Աղյուսակ */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.room')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.floor')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.capacity')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.subject')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classrooms.map((classroom) => (
                  <tr key={classroom.id} className="hover:bg-gray-50">
                    {/* Լսարանի համարն ու տիպի իկոնը */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Tooltip content={getClassroomTooltip(classroom)}>
                        <div className="flex items-center cursor-help">
                          <div className="h-8 w-8 rounded-full bg-[#03524f] bg-opacity-10 flex items-center justify-center mr-3">
                            {getTypeIcon(classroom.type)}
                          </div>
                          <span className="font-medium text-gray-900">{classroom.number}</span>
                        </div>
                      </Tooltip>
                    </td>
                    {/* Հարկ */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Tooltip content={`${t('common.floor')} ${classroom.floor}`}>
                        <span className="cursor-help">{t('common.floor')} {classroom.floor}</span>
                      </Tooltip>
                    </td>
                    {/* Տիպի Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Tooltip content={`${getTypeText(classroom.type)}\n${classroom.hasComputers ? 'Ունի համակարգիչներ' : 'Համակարգիչներ չկան'}`}>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-help ${getTypeColor(classroom.type)}`}>
                          {getTypeText(classroom.type)}
                        </span>
                      </Tooltip>
                    </td>
                    {/* Տարողություն */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Tooltip content={`Տարողություն: ${classroom.capacity} ուսանող\nԴասարանում կարող են նստել առավելագույնը ${classroom.capacity} ուսանող`}>
                        <span className="cursor-help">{classroom.capacity} {t('common.students')}</span>
                      </Tooltip>
                    </td>
                    {/* Մասնագիտացում / Կցված առարկաներ */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col space-y-1">
                        {classroom.specialization && classroom.type === 'lab' && (
                          <Tooltip content={getSpecializationTooltip(classroom)}>
                            <div className="flex flex-wrap gap-1 cursor-help">
                              {getSpecializationDisplay(classroom.specialization).split(', ').map((subject, index) => (
                                <span key={index} className="inline-flex px-2 py-1 text-xs bg-[#03524f] bg-opacity-10 text-[#03524f] rounded">
                                  {subject}
                                </span>
                              ))}
                            </div>
                          </Tooltip>
                        )}
                        {classroom.type === 'lab' && !classroom.specialization && (
                          <Tooltip content="Ունիվերսալ լաբորատորիա - կարող է օգտագործվել ցանկացած լաբորատոր առարկայի համար">
                            <span className="text-xs text-gray-400 italic cursor-help">{t('classrooms.universalLab')}</span>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    {/* Գործողությունների կոճակներ (Խմբագրել, Հեռացնել) */}
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
                          onClick={() => setDeletingClassroom(classroom)}
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