import React, { useState, useRef, useEffect } from 'react';
// UI-ի տարբեր գործողությունների և տեսողական նշանների համար անհրաժեշտ իկոնների ներմուծում
import { Plus, Users, GraduationCap, Trash2, CreditCard as Edit, BookOpen, Clock, Save, X, MapPin, Search, ChevronDown } from 'lucide-react';
// Համակարգի տիպերի (Types) ներմուծում
import { ClassGroup, Institution, Subject, Classroom, Specialization } from '../types';
// Բազմալեզվության (Localization) ապահովման հուքի ներմուծում
import { useLocalization } from '../hooks/useLocalization';

// Component-ի Props-ի ինտերֆեյսի սահմանում
interface ClassGroupsProps {
  classGroups: ClassGroup[]; // Գոյություն ունեցող բոլոր ուսանողական խմբերի ցուցակը
  addClassGroup: (classGroup: Omit<ClassGroup, 'id'>) => void; // Նոր խումբ ավելացնելու ֆունկցիա
  setClassGroups: (classGroups: ClassGroup[]) => void; // Խմբերի state-ը թարմացնելու ֆունկցիա
  updateClassGroupSubjects: (groupId: string, subjectHours: { [subjectId: string]: number }) => void; // Խմբի առարկաների ժամաքանակը թարմացնելու ֆունկցիա
  institution: Institution; // Հաստատության (քոլեջի/բուհի) ընդհանուր տվյալները
  generateCollegeGroups: (years: number[], specializations: string[]) => void; // Խմբերի ավտոմատ (bulk) գեներացման ֆունկցիա
  subjects: Subject[]; // Առկա առարկաների ցուցակը
  classrooms: Classroom[]; // Լսարանների ցուցակը՝ հիմնական դասարան (home room) կցելու համար
  specializations: Specialization[]; // Մասնագիտությունների ցուցակը՝ ժամաքանակի շաբլոններով
  showToast: { // Ծանուցումների (Toasts) համակարգ
    showSuccess: (title: string, message: string, duration?: number) => void;
    showError: (title: string, message: string, duration?: number) => void;
    showWarning: (title: string, message: string, duration?: number) => void;
    showInfo: (title: string, message: string, duration?: number) => void;
  };
}

/**
 * Tooltip Component - Ցուցադրում է լրացուցիչ տեղեկատվություն հուշման տեսքով,
 * երբ մկնիկը պահվում է համապատասխան էլեմենտի վրա:
 */
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false); // Տեսանելիության state
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Դիրքի կոորդինատներ

  // Մկնիկը էլեմենտի վրա բերելիս դիրքի դինամիկ հաշվարկ
  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2, // Կենտրոնացում էլեմենտի նկատմամբ
      y: rect.top - 10 // Ցուցադրում էլեմենտից մի փոքր վերև
    });
    setIsVisible(true);
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && (
        <div
          className="fixed z-50 px-3 py-2 text-sm text-white bg-[#03524f] rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: position.x, top: position.y, maxWidth: '300px', whiteSpace: 'pre-wrap' }}
        >
          {content}
          {/* Սլաքի ձևավորում */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#03524f]" />
        </div>
      )}
    </div>
  );
};

// SpecializationPicker Component-ի Props-ի ինտերֆեյսը
interface SpecPickerProps {
  specializations: Specialization[]; // Մասնագիտությունների ցուցակը
  value: string; // Ընտրված մասնագիտության ID-ն
  onChange: (specId: string, spec: Specialization | null) => void; // Փոփոխության event handler
  placeholder: string; // Նախնական տեքստ դաշտի համար
}

/**
 * SpecializationPicker - Մասնագիտությունների ընտրության հարմարեցված բաղադրիչ (Custom Dropdown)
 * ներկառուցված որոնման (Search) և ֆիլտրման համակարգով:
 */
const SpecializationPicker: React.FC<SpecPickerProps> = ({ specializations, value, onChange, placeholder }) => {
  const { t } = useLocalization();
  const [search, setSearch] = useState(''); // Որոնման տեքստի state
  const [open, setOpen] = useState(false); // Ցուցակի բաց/փակ լինելու state
  const ref = useRef<HTMLDivElement>(null); // Բաղադրիչից դուրս կտտոցները (click) որսալու հղում

  // Բաղադրիչից դուրս սեղմելիս dropdown-ը փակելու տրամաբանությունը (Outside Click)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Ընտրված մասնագիտության օբյեկտի որոնում
  const selected = specializations.find(s => s.id === value);
  
  // Մասնագիտությունների ֆիլտրում ըստ կոդի կամ անվանման
  const filtered = specializations.filter(s =>
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      {/* Ընտրության հիմնական կոճակ */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f] bg-white text-left flex items-center justify-between"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#03524f] bg-opacity-10 text-[#03524f]">
              {selected.code}
            </span>
            <span className="text-sm text-gray-800 truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Բացվող որոնման պատուհան և ցուցակ */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-hidden">
          {/* Որոնման ներդիր (Search input) */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-md bg-gray-50">
              <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Կոդ կամ անվանում..."
                className="flex-1 text-sm bg-transparent outline-none"
                autoFocus
              />
            </div>
          </div>
          {/* Ֆիլտրված արդյունքների ցուցադրում */}
          <div className="overflow-y-auto max-h-40">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-400 text-center">Ոչինչ չի գտնվել</div>
            ) : (
              filtered.map(spec => (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => { onChange(spec.id, spec); setOpen(false); setSearch(''); }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${spec.id === value ? 'bg-[#03524f] bg-opacity-5' : ''}`}
                >
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#03524f] bg-opacity-10 text-[#03524f] flex-shrink-0 min-w-[3rem] justify-center">
                    {spec.code}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{spec.name}</div>
                    <div className="text-xs text-gray-400">
                      {t(`courses.${spec.course}`)} · {Object.keys(spec.subjectHours || {}).length} {t('subjects.title').toLowerCase()}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * ClassGroups Component - Ուսանողական խմբերի կառավարման, կուրսերի,
 * մասնագիտացումների և ժամաքանակի բաշխման հիմնական մոդուլը:
 */
const ClassGroups: React.FC<ClassGroupsProps> = ({
  classGroups,
  addClassGroup,
  setClassGroups,
  updateClassGroupSubjects,
  institution,
  generateCollegeGroups,
  subjects,
  classrooms,
  specializations,
  showToast,
}) => {
  const { t } = useLocalization();

  // Մոդալ պատուհանների և խմբագրման վիճակների (states) կառավարում
  const [showForm, setShowForm] = useState(false); // Ավելացնելու/Խմբագրելու ձևաթուղթ
  const [showBulkForm, setShowBulkForm] = useState(false); // Ավտոմատ մասսայական գեներացման ձևաթուղթ
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null); // Այս պահին խմբագրվող խումբը
  const [deletingGroup, setDeletingGroup] = useState<ClassGroup | null>(null); // Հեռացման սպասող խումբը
  const [editingSubjects, setEditingSubjects] = useState<string | null>(null); // Խմբի ID-ն, որի առարկաների ժամերն են փոխվում
  const [tempSubjectHours, setTempSubjectHours] = useState<{ [subjectId: string]: number }>({}); // Ժամերի ժամանակավոր պահպանում

  // Խմբի հիմնական ձևաթղթի սկզբնական տվյալները
  const [formData, setFormData] = useState({
    name: '',
    course: 1,
    specialization: '',
    specializationId: '',
    homeRoom: '',
    subjectHours: {} as { [subjectId: string]: number },
    studentsCount: 25,
  });

  // Ավտոմատ գեներացման ձևաթղթի սկզբնական տվյալները
  const [bulkData, setBulkData] = useState({
    years: [] as number[],
    specializations: [] as string[],
  });

  // Օժանդակ ֆունկցիա՝ կուրսի տեքստը լոկալիզացված ստանալու համար
  const getCourseText = (courseNumber: number) => t(`courses.${courseNumber}`);

  /**
   * Վերադարձնում է ազատ տեսական լսարանները, որոնք դեռ կցված չեն որևէ խմբի որպես հիմնական դասարան
   */
  const getAvailableClassrooms = (excludeGroupId?: string) => {
    const usedClassrooms = classGroups
      .filter(group => group.homeRoom && group.id !== excludeGroupId)
      .map(group => group.homeRoom);
    return classrooms.filter(c => c.type === 'theory' && !usedClassrooms.includes(c.id));
  };

  /**
   * Լսարանի անվանման և հարկի ձևավորում ըստ ID-ի
   */
  const getClassroomName = (classroomId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? `${classroom.number} (${t('common.floor')} ${classroom.floor})` : t('common.unknown');
  };

  /**
   * Ակտիվացնում է խմբի խմբագրման ռեժիմը և լրացնում ձևաթուղթը գոյություն ունեցող տվյալներով
   */
  const startEditingGroup = (group: ClassGroup) => {
    const spec = specializations.find(s => s.name === group.specialization || s.id === group.specialization);
    setEditingGroup(group);
    setFormData({
      name: group.name,
      course: group.course || 1,
      specialization: group.specialization || '',
      specializationId: spec?.id || '',
      homeRoom: group.homeRoom || '',
      subjectHours: { ...group.subjectHours },
      studentsCount: group.studentsCount,
    });
    setShowForm(true);
  };

  /**
   * Չեղարկում է խմբագրումը և մաքրում ձևաթղթի state-ը
   */
  const cancelEdit = () => {
    setEditingGroup(null);
    setFormData({ name: '', course: 1, specialization: '', specializationId: '', homeRoom: '', subjectHours: {}, studentsCount: 25 });
    setShowForm(false);
  };

  /**
   * Կառավարում է մասնագիտության ընտրությունը և ավտոմատ լրացնում կուրսն ու առարկաների շաբլոնային ժամերը
   */
  const handleSpecializationSelect = (specId: string, spec: Specialization | null) => {
    if (!spec) {
      setFormData(f => ({ ...f, specializationId: '', specialization: '', course: 1, subjectHours: {} }));
      return;
    }
    setFormData(f => ({
      ...f,
      specializationId: spec.id,
      specialization: spec.name,
      course: spec.course,
      subjectHours: { ...spec.subjectHours }, // Ժամերի ավտոմատ ժառանգում շաբլոնից
    }));
  };

  /**
   * Խմբի ավելացման կամ խմբագրման հաստատում (Submit)
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Վալիդացիա՝ Անվանման ստուգում
    if (!formData.name.trim()) {
      showToast.showWarning(t('validation.required'), t('groups.nameRequired'));
      return;
    }
    // Վալիդացիա՝ Մասնագիտության ստուգում
    if (!formData.specialization) {
      showToast.showWarning(t('validation.required'), t('groups.specializationRequired'));
      return;
    }

    if (editingGroup) {
      // Գոյություն ունեցող խմբի տվյալների թարմացում
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
      showToast.showSuccess(t('toast.groupUpdated'), t('toast.groupUpdatedDesc', { name: formData.name }));
    } else {
      // Նոր խմբի ստեղծում
      addClassGroup({
        name: formData.name,
        type: 'college_group',
        course: formData.course,
        specialization: formData.specialization,
        homeRoom: formData.homeRoom || undefined,
        studentsCount: formData.studentsCount,
        subjectHours: formData.subjectHours,
      });
      showToast.showSuccess(t('toast.groupAdded'), t('toast.groupAddedDesc', { name: formData.name }));
    }

    // Ձևաթղթի մաքրում
    setFormData({ name: '', course: 1, specialization: '', specializationId: '', homeRoom: '', subjectHours: {}, studentsCount: 25 });
    setShowForm(false);
  };

  /**
   * Խմբերի մասսայական/ավտոմատ գեներացման հաստատում
   */
  const handleBulkGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkData.years.length === 0 || bulkData.specializations.length === 0) {
      showToast.showWarning(t('validation.selectAtLeastOne'), t('groups.selectYearsRequired'));
      return;
    }
    generateCollegeGroups(bulkData.years, bulkData.specializations);
    setShowBulkForm(false);
    showToast.showSuccess(
      t('toast.generationSuccessful'),
      t('toast.generationSuccessfulDesc', { count: bulkData.years.length * bulkData.specializations.length * 3 })
    );
  };

  /**
   * Խմբի հեռացում ըստ ID-ի
   */
  const deleteClassGroup = (id: string) => {
    const group = classGroups.find(g => g.id === id);
    if (group) {
      setClassGroups(classGroups.filter(g => g.id !== id));
      showToast.showSuccess(t('toast.groupDeleted'), t('toast.groupDeletedDesc', { name: group.name }));
    }
  };

  /**
   * Առարկաների ժամերի խմբագրման պատուհանի ակտիվացում
   */
  const startEditingSubjects = (groupId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    if (group) {
      setTempSubjectHours({ ...group.subjectHours }); // Պատճենում ենք ընթացիկ ժամերը ժամանակավոր պահեստում
      setEditingSubjects(groupId);
    }
  };

  /**
   * Խմբագրված առարկայական ժամերի վերջնական պահպանում
   */
  const saveSubjectHours = () => {
    if (editingSubjects) {
      updateClassGroupSubjects(editingSubjects, tempSubjectHours);
      setEditingSubjects(null);
      setTempSubjectHours({});
      showToast.showSuccess(t('toast.subjectUpdated'), t('subjects.assignSubjects'));
    }
  };

  /**
   * Ժամանակավոր state-ում կոնկրետ առարկայի ժամի թարմացում (եթե 0 է, հեռացվում է)
   */
  const updateSubjectHours = (subjectId: string, hours: number) => {
    if (hours <= 0) {
      const newHours = { ...tempSubjectHours };
      delete newHours[subjectId];
      setTempSubjectHours(newHours);
    } else {
      setTempSubjectHours({ ...tempSubjectHours, [subjectId]: hours });
    }
  };

  // Ստանում է առարկայի անունը ըստ ID-ի
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : t('common.unknown');
  };

  // Հաշվում է խմբի ընդհանուր տարեկան ժամաքանակը
  const getTotalHours = (subjectHours: { [subjectId: string]: number }) =>
    Object.values(subjectHours).reduce((sum, h) => sum + h, 0);

  // Ֆիլտրում է միայն տվյալ կուրսին համապատասխանող առարկաները
  const getAvailableSubjectsForGroup = (groupId: string) => {
    const group = classGroups.find(g => g.id === groupId);
    if (!group || !group.course) return subjects;
    return subjects.filter(s => s.course === group.course);
  };

  // Զանգվածային գեներացման համար տարեթվերի ընտրություն
  const handleYearSelection = (year: number, checked: boolean) => {
    setBulkData({
      ...bulkData,
      years: checked ? [...bulkData.years, year] : bulkData.years.filter(y => y !== year),
    });
  };

  // Զանգվածային գեներացման համար մասնագիտությունների ընտրություն
  const handleSpecializationSelection = (spec: string, checked: boolean) => {
    setBulkData({
      ...bulkData,
      specializations: checked
        ? [...bulkData.specializations, spec]
        : bulkData.specializations.filter(s => s !== spec),
    });
  };

  // Ավտոմատ գեներացման տարեթվերի շարքի ստացում (վերջին 6 տարիները)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i);

  /**
   * Խմբի Tooltip-ի բովանդակության գեներացում (Ընդհանուր տեղեկատվություն)
   */
  const getGroupTooltip = (group: ClassGroup) => {
    const totalHours = getTotalHours(group.subjectHours || {});
    const subjectCount = Object.keys(group.subjectHours || {}).length;
    let tooltip = `👥 ${group.name}\n`;
    tooltip += `📅 ${getCourseText(group.course || 1)}\n`;
    tooltip += `🎓 ${group.specialization || t('groups.noSpecialization')}\n`;
    tooltip += `👨‍🎓 ${group.studentsCount} ${t('common.students').toLowerCase()}\n`;
    tooltip += `📚 ${subjectCount} ${t('subjects.title').toLowerCase()}`;
    tooltip += `, ⏱️ ${totalHours} ${t('common.hours')}/${t('common.year')}`;
    if (group.homeRoom) {
      const classroom = classrooms.find(c => c.id === group.homeRoom);
      if (classroom) tooltip += `\n🏫 ${t('groups.homeClassroom')}: ${classroom.number}`;
    }
    return tooltip;
  };

  /**
   * Առարկաների և դրանց ժամերի Tooltip-ի բովանդակության ստացում
   */
  const getSubjectsTooltip = (group: ClassGroup) => {
    const subjectHours = group.subjectHours || {};
    const subjectCount = Object.keys(subjectHours).length;
    if (subjectCount === 0) return t('teachers.noSubjectsAssigned');
    let tooltip = `📚 ${t('subjects.title')} (${subjectCount}):\n`;
    Object.entries(subjectHours).forEach(([subjectId, hours]) => {
      tooltip += `  • ${getSubjectName(subjectId)} — ${hours} ժամ\n`;
    });
    tooltip += `\n⏱️ ${t('groups.totalHoursPerYear')}: ${getTotalHours(subjectHours)} ժամ/տարի`;
    return tooltip.trim();
  };

  // Ընտրված մասնագիտությանը պատկանող առարկաների ֆիլտրում ձևաթղթի ինֆո-բլոկի համար
  const selectedSpec = specializations.find(s => s.id === formData.specializationId);
  const formSpecSubjects = selectedSpec
    ? subjects.filter(s => Object.keys(selectedSpec.subjectHours || {}).includes(s.id))
    : [];

  return (
    <div className="max-w-full mx-auto space-y-6">
      
      {/* --- HEADER (Գլխամաս) --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-[#03524f]" />
          <h2 className="text-2xl font-bold text-gray-900">{t('groups.title')}</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('groups.addGroup')}
        </button>
      </div>

      {/* --- ՄՈԴԱԼ ՊԱՏՈՒՀԱՆ: Զանգվածային ավտոմատ գեներացում --- */}
      {showBulkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleBulkGenerate} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{t('groups.generateCollegeGroups')}</h3>
                <button type="button" onClick={() => setShowBulkForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-6">
                {/* Ընդունելության տարեթվերի ընտրություն */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">{t('groups.entryYears')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {availableYears.map(year => (
                      <label key={year} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulkData.years.includes(year)}
                          onChange={e => handleYearSelection(year, e.target.checked)}
                          className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{year}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* Մասնագիտությունների ընտրություն */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">{t('groups.selectSpecializations')}</label>
                  {institution.specializations.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {institution.specializations.map(spec => (
                        <label key={spec} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bulkData.specializations.includes(spec)}
                            onChange={e => handleSpecializationSelection(spec, e.target.checked)}
                            className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{spec}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-700">{t('setup.noSpecializations')}</p>
                    </div>
                  )}
                </div>
                {/* Գեներացման ընդհանուր քանակի հաշվիչ */}
                {bulkData.years.length > 0 && bulkData.specializations.length > 0 && (
                  <div className="bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20 rounded-md p-3">
                    <p className="text-sm text-[#03524f]">
                      {t('groups.generateGroups')}: {bulkData.years.length} × {bulkData.specializations.length} × 3 = {bulkData.years.length * bulkData.specializations.length * 3} {t('groups.title').toLowerCase()}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowBulkForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md hover:bg-[#024239]">
                  {t('common.generate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ՄՈԴԱԼ ՊԱՏՈՒՀԱՆ: Խմբի Ավելացում / Խմբագրում --- */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingGroup ? t('groups.editGroup') : t('groups.addNewGroup')}
                </h3>
                <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Խմբի Անվանում */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('common.name')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f] text-sm"
                    placeholder={t('groups.groupNamePlaceholder')}
                  />
                </div>

                {/* Ուսանողների քանակ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('groups.studentsCount')}</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.studentsCount}
                    onChange={e => setFormData({ ...formData, studentsCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f] text-sm"
                  />
                </div>

                {/* Հիմնական լսարանի (Home Classroom) կցում */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    {t('groups.homeClassroom')}
                  </label>
                  {getAvailableClassrooms(editingGroup?.id).length > 0 ? (
                    <select
                      value={formData.homeRoom}
                      onChange={e => setFormData({ ...formData, homeRoom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f] text-sm"
                    >
                      <option value="">{t('groups.noAssignedClassroom')}</option>
                      {getAvailableClassrooms(editingGroup?.id).map(classroom => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.number} — {t('common.floor')} {classroom.floor} ({t('common.capacity')}: {classroom.capacity})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-400">
                      {t('classrooms.noAvailableRooms')}
                    </div>
                  )}
                </div>

                {/* Մասնագիտության ընտրություն (Custom Picker-ով) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <GraduationCap className="inline h-4 w-4 mr-1" />
                    {t('common.specialization')}
                  </label>
                  {specializations.length > 0 ? (
                    <SpecializationPicker
                      specializations={specializations}
                      value={formData.specializationId}
                      onChange={handleSpecializationSelect}
                      placeholder={t('groups.selectSpecializations')}
                    />
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-700">{t('setup.noSpecializations')}</p>
                    </div>
                  )}

                  {/* Ընտրված մասնագիտության վերաբերյալ համառոտ տեղեկատվության բլոկ */}
                  {selectedSpec && (
                    <div className="mt-2 p-3 bg-white bg-opacity-5 border border-[#03524f] border-opacity-20 rounded-md bg-[#03524f] bg-opacity-5">
                      <div className="flex items-center gap-4 flex-wrap text-sm text-[#03524f]">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {getCourseText(selectedSpec.course)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {formSpecSubjects.length} {t('subjects.title').toLowerCase()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {getTotalHours(selectedSpec.subjectHours || {})} {t('common.hours')}/{t('common.year')}
                        </span>
                      </div>
                      {/* Նախնական 5 առարկաների ցուցադրումը */}
                      {formSpecSubjects.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {formSpecSubjects.slice(0, 5).map(s => (
                            <span key={s.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-white border border-[#03524f] border-opacity-20 text-[#03524f]">
                              {s.name}
                            </span>
                          ))}
                          {formSpecSubjects.length > 5 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-gray-400">
                              +{formSpecSubjects.length - 5} {t('common.more')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Գործողությունների կոճակներ */}
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={cancelEdit} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md hover:bg-[#024239]">
                  {editingGroup ? (
                    <><Save className="h-4 w-4 mr-2" />{t('common.save')}</>
                  ) : (
                    t('groups.addGroup')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ՄՈԴԱԼ ՊԱՏՈՒՀԱՆ: Հեռացման հաստատում --- */}
      {deletingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('common.confirmDelete')}</h3>
              <p className="text-sm text-gray-500 mb-6">
                {t('common.confirmDeleteQuestion')} "{deletingGroup.name}"?
              </p>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setDeletingGroup(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => { deleteClassGroup(deletingGroup.id); setDeletingGroup(null); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ՄՈԴԱԼ ՊԱՏՈՒՀԱՆ: Առարկայական Ժամերի Բաշխում / Խմբագրում --- */}
      {editingSubjects && (() => {
        const editingGroupData = classGroups.find(g => g.id === editingSubjects);
        // Փնտրում ենք նույն մասնագիտության և կուրսի մյուս խմբերը (հոսքերը/stream-ները հայտնաբերելու համար)
        const sameSpecGroups = classGroups.filter(g =>
          g.specialization === editingGroupData?.specialization &&
          g.course === editingGroupData?.course
        );
        const showStreams = sameSpecGroups.length > 1; // Եթե կան զուգահեռ խմբեր, ակտիվանում է հոսքային տեսքը

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Վերնագիր և վերին կառավարման կոճակներ */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {t('groups.assignSubjects')} — {editingGroupData?.name}
                      <span className="ml-2 text-sm text-gray-500">({getCourseText(editingGroupData?.course || 1)})</span>
                    </h3>
                    {showStreams && (
                      <p className="text-xs text-[#03524f] mt-1">
                        {t('groups.streamHint', { spec: editingGroupData?.specialization || '', count: sameSpecGroups.length })}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={saveSubjectHours} className="inline-flex items-center px-3 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239]">
                      <Save className="h-4 w-4 mr-1" />{t('common.save')}
                    </button>
                    <button onClick={() => { setEditingSubjects(null); setTempSubjectHours({}); }} className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700">
                      <X className="h-4 w-4 mr-1" />{t('common.cancel')}
                    </button>
                  </div>
                </div>

                {/* Հոսքերի առկայության դեպքում ցուցադրվող տեղեկատվական բլոկ */}
                {showStreams && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      {t('groups.streamsDetected')}: <strong>{sameSpecGroups.map(g => g.name).join(', ')}</strong>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">{t('groups.streamsNote')}</p>
                  </div>
                )}

                {/* Առարկաների ցուցակը և ժամերի ներմուծման դաշտերը */}
                <div className="space-y-3">
                  {getAvailableSubjectsForGroup(editingSubjects).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      {t('groups.noSubjectsForCourse', { course: getCourseText(editingGroupData?.course || 1) })}
                    </p>
                  ) : (
                    getAvailableSubjectsForGroup(editingSubjects).map(subject => (
                      <div key={subject.id} className="border border-gray-200 rounded-md p-3">
                        <div className="flex items-center space-x-3 mb-2">
                          <BookOpen className="h-5 w-5 text-[#03524f]" />
                          <div>
                            <span className="font-medium text-gray-900">{subject.name}</span>
                            <div className="text-sm text-gray-500">
                              {subject.type === 'theory' ? t('subjects.theory') : t('subjects.laboratory')} · {getCourseText(subject.course)}
                            </div>
                          </div>
                        </div>

                        {/* Եթե կան զուգահեռ հոսքեր, ապա ցուցադրվում են նաև մյուս խմբերի համեմատական ժամերը */}
                        {showStreams ? (
                          <div className="ml-8 grid grid-cols-2 gap-2">
                            {sameSpecGroups.map(streamGroup => (
                              <div key={streamGroup.id} className={`flex items-center justify-between p-2 rounded-md ${streamGroup.id === editingSubjects ? 'bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-30' : 'bg-gray-50 border border-gray-200'}`}>
                                <span className={`text-sm font-medium ${streamGroup.id === editingSubjects ? 'text-[#03524f]' : 'text-gray-600'}`}>
                                  {streamGroup.name}
                                  {streamGroup.id === editingSubjects && <span className="ml-1 text-xs">(*)</span>}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="200"
                                    value={streamGroup.id === editingSubjects ? tempSubjectHours[subject.id] || 0 : streamGroup.subjectHours[subject.id] || 0}
                                    onChange={e => {
                                      if (streamGroup.id === editingSubjects) updateSubjectHours(subject.id, parseInt(e.target.value) || 0);
                                    }}
                                    disabled={streamGroup.id !== editingSubjects} // Թույլատրվում է փոփոխել միայն ընթացիկ ակտիվ խմբի ժամը
                                    className={`w-16 px-2 py-1 text-center border rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f] text-sm ${streamGroup.id !== editingSubjects ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                                  />
                                  <span className="text-xs text-gray-500">{t('common.hours')}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Սովորական մեկ խմբի համար ժամի ներմուծման դաշտ */
                          <div className="ml-8 flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              max="200"
                              value={tempSubjectHours[subject.id] || 0}
                              onChange={e => updateSubjectHours(subject.id, parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                            />
                            <span className="text-sm text-gray-500">{t('common.hours')}/{t('common.year')}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Ընդհանուր ժամերի ամփոփիչ հաշվիչ */}
                {getAvailableSubjectsForGroup(editingSubjects).length > 0 && (
                  <div className="mt-4 p-3 bg-[#03524f] bg-opacity-10 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#03524f]">{t('groups.totalHoursPerYear')} ({editingGroupData?.name}):</span>
                      <span className="text-lg font-bold text-[#03524f]">{getTotalHours(tempSubjectHours)} {t('common.hours')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- ԽՄԲԵՐԻ ԱՂՅՈՒՍԱԿ (Table View) --- */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {classGroups.length === 0 ? (
          /* Դատարկ վիճակ (Empty State) */
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('groups.noGroups')}</h3>
            <p className="text-gray-500 mb-4">{t('groups.noGroupsDesc')}</p>
          </div>
        ) : (
          /* Հիմնական Աղյուսակ */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.students')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('groups.homeClassroom')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.specialization')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('subjects.title')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classGroups.map(group => {
                  const spec = specializations.find(s => s.name === group.specialization || s.id === group.specialization);
                  return (
                    <tr key={group.id} className="hover:bg-gray-50">
                      {/* Խմբի Անվանում և Կուրս */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={getGroupTooltip(group)}>
                          <div className="flex items-center cursor-help">
                            <div className="h-8 w-8 rounded-full bg-[#03524f] bg-opacity-10 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="text-xs font-semibold text-[#03524f]">{group.name.substring(0, 2)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{group.name}</span>
                              <div className="text-xs text-gray-400">{getCourseText(group.course || 1)}</div>
                            </div>
                          </div>
                        </Tooltip>
                      </td>

                      {/* Ուսանողների Քանակ */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span>{group.studentsCount}</span>
                      </td>

                      {/* Հիմնական լսարան */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {group.homeRoom ? (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                            <span>{getClassroomName(group.homeRoom)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">{t('groups.noAssignedRoom')}</span>
                        )}
                      </td>

                      {/* Մասնագիտացում և կոդ */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {group.specialization ? (
                          <div className="flex items-center gap-2">
                            {spec && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#03524f] bg-opacity-10 text-[#03524f]">
                                {spec.code}
                              </span>
                            )}
                            <span className="text-sm text-gray-700">{group.specialization}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-sm">{t('groups.noSpecialization')}</span>
                        )}
                      </td>

                      {/* Կցված առարկաների և տարեկան ընդհանուր ժամերի քանակ */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={getSubjectsTooltip(group)}>
                          <div className="flex items-center space-x-2 cursor-help">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {Object.keys(group.subjectHours || {}).length} {t('subjects.title').toLowerCase()}
                            </span>
                            {getTotalHours(group.subjectHours || {}) > 0 && (
                              <>
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{getTotalHours(group.subjectHours || {})}{t('common.hours')}/{t('common.year')}</span>
                              </>
                            )}
                          </div>
                        </Tooltip>
                      </td>

                      {/* Գործողությունների կոճակներ (Խմբագրել, Բաշխել ժամեր, Հեռացնել) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {/* Հիմնական տվյալների խմբագրում */}
                          <button onClick={() => startEditingGroup(group)} className="text-[#03524f] hover:text-[#024239] transition-colors" title={t('common.edit')}>
                            <Edit className="h-4 w-4" />
                          </button>
                          {/* Առարկայական ժամերի բաշխման խմբագրում */}
                          <button onClick={() => startEditingSubjects(group.id)} className="text-green-600 hover:text-green-900 transition-colors" title={t('groups.editSubjects')}>
                            <BookOpen className="h-4 w-4" />
                          </button>
                          {/* Խմբի հեռացում */}
                          <button onClick={() => setDeletingGroup(group)} className="text-red-600 hover:text-red-900 transition-colors" title={t('common.delete')}>
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

export default ClassGroups;