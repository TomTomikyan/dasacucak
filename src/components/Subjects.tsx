import React, { useState } from 'react';
// Lucide-react գրադարանից ներմուծում ենք անհրաժեշտ icons-ները՝ UI-ի համար  
import { Plus, BookOpen, Users, Trash2, Monitor, CreditCard as Edit, Save, X, GraduationCap, CheckCircle } from 'lucide-react';
// Ներմուծում ենք տիպերի (Types/Interfaces) սահմանումները համակարգի ընդհանուր տիպավորման ֆայլից
import { Subject, ClassGroup, Teacher } from '../types';
// Ներմուծում ենք լոկալիզացիայի (բազմալեզվության) հուկը՝ թարգմանությունների կառավարման համար
import { useLocalization } from '../hooks/useLocalization';

// Սահմանում ենք գլխավոր կոմպոնենտի Props-ի կառուցվածքը և տիպերը
interface SubjectsProps {
  subjects: Subject[]; // Առարկաների զանգված
  addSubject: (subject: Omit<Subject, 'id'>) => void; // Նոր առարկա ավելացնելու ֆունկցիա (առանց ID-ի, քանի որ այն գեներացվում է hook-ում)
  setSubjects: (subjects: Subject[]) => void; // Առարկաների state-ը թարմացնելու ֆունկցիա
  classGroups: ClassGroup[]; // Ուսումնական խմբերի զանգված
  teachers: Teacher[]; // Դասախոսների զանգված
  showToast: { // Ծանուցումների (Toast) կառավարման օբյեկտ
    showSuccess: (title: string, message: string, duration?: number) => void;
    showError: (title: string, message: string, duration?: number) => void;
    showWarning: (title: string, message: string, duration?: number) => void;
    showInfo: (title: string, message: string, duration?: number) => void;
  };
}

// --- TOOLTIP (ՀՈՒՇՈՂ ՊԱՏՈՒՀԱՆ) ԿՈՄՊՈՆԵՆՏ ---
// Ցուցադրում է լրացուցիչ տեղեկատվություն, երբ մկնիկը պահվում է տարրի վրա
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  // Կառավարում է Tooltip-ի տեսանելիությունը
  const [isVisible, setIsVisible] = useState(false);
  // Պահպանում է Tooltip-ի էկրանային x և y կոորդինատները
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Ֆունկցիա, որը կանչվում է, երբ մկնիկը մտնում է տարրի տարածք
  const handleMouseEnter = (e: React.MouseEvent) => {
    // Ստանում ենք տարրի դիրքը էկրանի նկատմամբ
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      // Տեղադրում ենք Tooltip-ը հորիզոնական առանցքով տարրի մեջտեղում
      x: rect.left + rect.width / 2,
      // Ուղղահայաց առանցքով տարրից 10px դեպի վերև
      y: rect.top - 10
    });
    setIsVisible(true); // Դարձնում ենք տեսանելի
  };

  // Ֆունկցիա, որը կանչվում է, երբ մկնիկը հեռանում է տարրի տարածքից
  const handleMouseLeave = () => {
    setIsVisible(false); // Թաքցնում ենք Tooltip-ը
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children} {/* Բնօրինակ տարրը, որի վրա պահվելու է մկնիկը */}
      {/* Եթե տեսանելի է, արտածում ենք Tooltip-ի պատուհանը fixed դիրքով */}
      {isVisible && (
        <div
          className="fixed z-50 px-3 py-2 text-sm text-white bg-[#03524f] rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: position.x,
            top: position.y,
            maxWidth: '300px',
            whiteSpace: 'pre-wrap' // Պահպանում է տողադարձերը (\n) տեքստի մեջ
          }}
        >
          {content}
          {/* Tooltip-ի ներքևի փոքրիկ սլաքը/եռանկյունը */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#03524f]"></div>
        </div>
      )}
    </div>
  );
};

// --- ԳԼԽԱՎՈՐ «SUBJECTS» ԿՈՄՊՈՆԵՆՏ ---
const Subjects: React.FC<SubjectsProps> = ({
  subjects,
  addSubject,
  setSubjects,
  classGroups,
  teachers,
  showToast,
}) => {
  // Օգտագործում ենք լոկալիզացիայի թարգմանական 't' ֆունկցիան
  const { t } = useLocalization();
  
  // State-եր՝ մոդալ պատուհանների և ձևաթղթերի (forms) ղեկավարման համար
  const [showForm, setShowForm] = useState(false); // Ավելացման/Խմբագրման ֆորմայի տեսանելիությունը
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null); // Ընթացիկ խմբագրվող առարկան
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null); // Ջնջման հաստատման փուլում գտնվող առարկան
  
  // Ֆորմայի ներքին state-ը տվյալների ժամանակավոր պահպանման համար
  const [formData, setFormData] = useState({
    name: '',
    type: 'theory' as 'theory' | 'lab', // Առարկայի տեսակը՝ տեսական կամ լաբորատոր
    course: 1, // Կուրսի համարը
    teacherIds: [] as string[], // Կցված դասախոսների ID-ների զանգվածը
  });

  // Օժանդակ ֆունկցիա՝ կուրսի թարգմանված տեքստը ստանալու համար (օր.՝ «1-ին կուրս»)
  const getCourseText = (courseNumber: number) => {
    return t(`courses.${courseNumber}`);
  };

  // Ֆորմայի հաստատման (submit) ժամանակ կանչվող լոկալ ֆունկցիա
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Կանխում ենք էջի վերաբեռնումը
    
    // Վալիդացիա. ստուգում ենք՝ արդյոք անվանումը դատարկ չէ
    if (!formData.name.trim()) {
      showToast.showWarning(t('validation.required'), t('subjects.nameRequired'));
      return;
    }
    
    if (editingSubject) {
      // Գոյություն ունեցող առարկայի թարմացման տրամաբանություն
      const updatedSubjects = subjects.map(subject =>
        subject.id === editingSubject.id
          ? { ...subject, ...formData, specializationRequired: '' } // Թարմացնում ենք տվյալները
          : subject
      );
      setSubjects(updatedSubjects); // Թարմացնում ենք գլխավոր state-ը
      showToast.showSuccess(
        t('toast.subjectUpdated'),
        t('toast.subjectUpdatedDesc', { name: formData.name })
      );
      setEditingSubject(null); // Մաքրում ենք խմբագրման վիճակը
    } else {
      // Նոր առարկայի ավելացում
      // Դասախոսները ավտոմատ կկցվեն 'useScheduleData' հուկի ներսում՝ ըստ իրենց նախասիրությունների
      addSubject({
        ...formData,
        specializationRequired: '',
        teacherIds: [], // Ուղարկվում է դատարկ, քանի որ հուկը ավտոմատ կլրացնի այն
      });
      showToast.showSuccess(
        t('toast.subjectAdded'),
        t('toast.subjectAddedDesc', { name: formData.name })
      );
    }
    
    // Ֆորմայի տվյալների զրոյացում (Reset) սկզբնական վիճակի
    setFormData({
      name: '',
      type: 'theory',
      course: 1,
      teacherIds: [],
    });
    setShowForm(false); // Փակում ենք մոդալ պատուհանը
  };

  // Խմբագրման գործընթացի մեկնարկ. տվյալները ներբեռնվում են ֆորմայի մեջ
  const startEditing = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      type: subject.type,
      course: subject.course,
      teacherIds: subject.teacherIds,
    });
    setShowForm(true); // Բացում ենք մոդալ պատուհանը խմբագրման ռեժիմով
  };

  // Խմբագրման չեղարկում և ֆորմայի մաքրում
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

  // Առարկայի ջնջման ֆունկցիա ըստ ID-ի
  const deleteSubject = (id: string) => {
    const subject = subjects.find(s => s.id === id);
    if (subject) {
      // Ֆիլտրում ենք զանգվածը՝ հեռացնելով համապատասխան ID-ով առարկան
      setSubjects(subjects.filter(subject => subject.id !== id));
      showToast.showSuccess(
        t('toast.subjectDeleted'),
        t('toast.subjectDeletedDesc', { name: subject.name })
      );
    }
  };

  // Խմբագրման ժամանակ դասախոսների ընտրության (Checkbox) փոփոխության կառավարում
  const handleTeacherSelection = (teacherId: string, checked: boolean) => {
    setFormData({
      ...formData,
      teacherIds: checked
        ? [...formData.teacherIds, teacherId] // Եթե նշված է (checked), ավելացնում ենք ID-ն զանգվածում
        : formData.teacherIds.filter(id => id !== teacherId) // Եթե հանված է նշումը, հեռացնում ենք ID-ն
    });
  };

  // Ստանում ենք դասախոսի լրիվ անունը ըստ իր ID-ի
  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : t('common.unknown');
  };

  // Ֆիլտրում և վերադարձնում է այն խմբերը, որոնք ունեն այս առարկան (ժամաքանակը մեծ է 0-ից)
  const getAssignedGroups = (subjectId: string) => {
    return classGroups.filter(group => group.subjectHours[subjectId] > 0);
  };

  // Հաշվում է տվյալ առարկայի ընդհանուր ժամաքանակը բոլոր խմբերում միասին (reduce մեթոդով)
  const getTotalHoursForSubject = (subjectId: string) => {
    return classGroups.reduce((total, group) => {
      return total + (group.subjectHours[subjectId] || 0);
    }, 0);
  };

  // Գտնում է այն դասախոսներին, ովքեր կարող են դասավանդել այս առարկան (ըստ իրենց որակավորման ցուցակի)
  const getAvailableTeachersForSubject = (subjectName: string) => {
    return teachers.filter(teacher => teacher.subjects.includes(subjectName));
  };

  // --- TOOLTIP-ՆԵՐԻ ՏԵՔՍՏԵՐԻ ԳԵՆԵՐԱՑՈՒՄ ---

  // Գեներացնում է առարկայի բջջի մանրամասն տեղեկատվությունը
  const getSubjectTooltip = (subject: Subject) => {
    const typeText = subject.type === 'theory' ? t('subjects.theory') : t('subjects.laboratory');
    const courseText = getCourseText(subject.course);
    const assignedGroups = getAssignedGroups(subject.id);
    
    let tooltip = `📚 ${subject.name}\n`;
    tooltip += `📖 ${typeText}\n`;
    tooltip += `🎓 ${courseText}\n`;
    tooltip += `👥 ${assignedGroups.length} խումբ\n`;
    
    if (assignedGroups.length > 0) {
      tooltip += `\n\nԽմբեր:\n${assignedGroups.map(g => `• ${g.name}`).join('\n')}`;
    }
    
    return tooltip;
  };

  // Գեներացնում է դասախոսների սյունակի Tooltip-ի տեքստը
  const getTeachersTooltip = (teacherIds: string[]) => {
    if (teacherIds.length === 0) {
      return 'Ուսուցիչներ չեն նշանակված';
    }
    
    const teacherNames = teacherIds.map(id => getTeacherName(id));
    return `👨‍🏫 Ուսուցիչներ:\n${teacherNames.map(name => `• ${name}`).join('\n')}`;
  };

  // Գեներացնում է խմբերի սյունակի Tooltip-ի տեքստը՝ ներառելով տարեկան ժամաքանակները
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
    <div className="w-full space-y-6">
      {/*  (Header) */}
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

      {/* ԱՎԵԼԱՑՄԱՆ / ԽՄԲԱԳՐՄԱՆ ՄՈԴԱԼ ՊԱՏՈՒՀԱՆ */}
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
                {/* Առարկայի անվան մուտքագրում */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjects.subjectName')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    placeholder={t('subjects.subjectNamePlaceholder')}
                  />
                </div>

                {/* Տեսակի և կուրսի ընտրության ցանց (Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Տեսակի ընտրություն (Radio Buttons) */}
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

                  {/* Կուրսի ընտրություն (Number Input) */}
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

                {/* Ժամաքանակների բաշխում ըստ խմբերի/հոսքերի (Ինքնականչվող ֆունկցիա - IIFE) */}
                {(() => {
                  // Ֆիլտրում ենք միայն այն խմբերը, որոնք համապատասխանում են ընտրված կուրսին
                  const relevantGroups = classGroups.filter(g => g.course === formData.course);
                  if (relevantGroups.length === 0) return null;

                  // Խմբավորում ենք ըստ մասնագիտացման (Specialization)
                  const bySpec: Record<string, ClassGroup[]> = {};
                  relevantGroups.forEach(g => {
                    const spec = g.specialization || 'Ընդհանուր';
                    if (!bySpec[spec]) bySpec[spec] = [];
                    bySpec[spec].push(g);
                  });

                  const subjectId = editingSubject?.id;

                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Users className="inline h-4 w-4 mr-1" />
                        Ժամաքանակ ըստ խմբերի / հոսքերի
                      </label>
                      <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
                        {Object.entries(bySpec).map(([spec, groups]) => (
                          <div key={spec} className="p-3">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{spec}</div>
                            <div className="grid grid-cols-2 gap-2">
                              {groups.map(group => {
                                // Եթե խմբագրման ռեժիմ է, վերցնում ենք խմբի ժամերը այս առարկայի համար
                                const hrs = subjectId
                                  ? group.subjectHours[subjectId] || 0
                                  : 0;
                                return (
                                  <div key={group.id} className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${hrs > 0 ? 'bg-[#03524f] bg-opacity-10 border border-[#03524f] border-opacity-20' : 'bg-gray-50 border border-gray-200'}`}>
                                    <span className={`font-medium ${hrs > 0 ? 'text-[#03524f]' : 'text-gray-500'}`}>{group.name}</span>
                                    <span className={`text-xs font-bold ${hrs > 0 ? 'text-[#03524f]' : 'text-gray-400'}`}>
                                      {hrs > 0 ? `${hrs} ժ` : '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Ժամաքանակները խմբերի բաժնում են կարգավորվում</p>
                    </div>
                  );
                })()}

                {/* Ավտոմատ կցման նախադիտում (Auto-assignment preview) - Երևում է միայն նոր առարկա ստեղծելիս */}
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

                {/* Դասախոսների ձեռքով կցում (Manual teacher assignment) - Երևում է միայն խմբագրման ժամանակ */}
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
                            {/* Նշում ենք, եթե դասախոսի հմտությունների մեջ արդեն կա այս առարկան */}
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

              {/* Ֆորմայի ներքևի կոճակները */}
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

      {/* ՋՆՋՄԱՆ ՀԱՍՏԱՏՄԱՆ ՄՈԴԱԼ ՊԱՏՈՒՀԱՆ (Delete Confirmation Modal) */}
      {deletingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('common.confirmDelete')}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {t('common.confirmDeleteQuestion')} "{deletingSubject.name}" առարկան:
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingSubject(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    deleteSubject(deletingSubject.id);
                    setDeletingSubject(null);
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

      {/* ԱՌԱՐԿԱՆԵՐԻ ՑՈՒՑԱԿ / ԱՂՅՈՒՍԱԿ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {subjects.length === 0 ? (
          // Դատարկ վիճակ (Empty State) - երբ առարկաներ չկան
          <div className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('subjects.noSubjects')}</h3>
            <p className="text-gray-500 mb-4">{t('subjects.noSubjectsDesc')}</p>
          </div>
        ) : (
          // Աղյուսակի արտածումը (Table View)
          <div className="w-full">
            <table className="w-full divide-y divide-gray-200">
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
                      {/* Սյունակ 1: Առարկայի անվանում + Սրբապատկեր + Tooltip */}
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

                      {/* Սյունակ 2: Կուրսի տեղեկություն (Badge) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Tooltip content={`${getCourseText(subject.course)}\nԱռարկա նախատեսված է ${subject.course}-րդ կուրսի համար`}>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[#03524f] bg-opacity-10 text-[#03524f] rounded-full cursor-help">
                            <GraduationCap className="h-3 w-3 mr-1" />
                            {getCourseText(subject.course)}
                          </span>
                        </Tooltip>
                      </td>

                      {/* Սյունակ 3: Առարկայի տեսակ (Տեսական/Լաբորատոր) */}
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

                      {/* Սյունակ 4: Կցված դասախոսներ (Առաջին 2-ը արտածվում են, իսկ մնացածը՝ +X ձևաչափով) */}
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

                      {/* Սյունակ 5: Կից խմբերի քանակը */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Tooltip content={getGroupsTooltip(subject.id)}>
                          <div className="flex items-center cursor-help">
                            <Users className="h-4 w-4 mr-1 text-gray-400" />
                            {assignedGroups.length} {t('subjects.groups')}
                          </div>
                        </Tooltip>
                      </td>

                      {/* Սյունակ 6: Գործողությունների կոճակներ (Խմբագրել / Ջնջել) */}
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
                            onClick={() => setDeletingSubject(subject)}
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