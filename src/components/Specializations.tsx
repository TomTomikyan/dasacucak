import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Trash2, BookOpen, X, GraduationCap, Clock,
  CreditCard as Edit, Save, Search, Award, ChevronDown,
} from 'lucide-react';
import { Specialization, Subject, Institution } from '../types';

interface SpecializationsProps {
  specializations: Specialization[];
  addSpecialization: (s: Omit<Specialization, 'id'>) => void;
  setSpecializations: (s: Specialization[]) => void;
  subjects: Subject[];
  institution: Institution;
  showToast: {
    showSuccess: (title: string, message: string, duration?: number) => void;
    showError: (title: string, message: string, duration?: number) => void;
    showWarning: (title: string, message: string, duration?: number) => void;
  };
}

const Specializations: React.FC<SpecializationsProps> = ({
  specializations,
  addSpecialization,
  setSpecializations,
  subjects,
  institution,
  showToast,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specialization | null>(null);
  const [deletingSpec, setDeletingSpec] = useState<Specialization | null>(null);
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);

  const emptyForm = () => ({
    code: '',
    name: '',
    course: 1,
    academicWeeks: institution.academicWeeks || 36,
    subjectHours: {} as { [subjectId: string]: number },
  });

  const [formData, setFormData] = useState(emptyForm());
  const [subjectSearch, setSubjectSearch] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSubjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchableSubjects = subjects.filter((s) => {
    const alreadyAdded = s.id in formData.subjectHours;
    const matchesSearch = s.name.toLowerCase().includes(subjectSearch.toLowerCase());
    const matchesCourse = s.course === formData.course;
    return !alreadyAdded && matchesSearch && matchesCourse;
  });

  const addedSubjects = subjects.filter((s) => s.id in formData.subjectHours);

  const isDuplicateCode = (code: string, excludeId?: string) =>
    specializations.some((s) => s.code.trim() === code.trim() && s.id !== excludeId);

  const codeError = isDuplicateCode(formData.code, editingSpec?.id ?? undefined)
    ? 'Այս կոդով մասնագիտությունն արդեն գոյություն ունի'
    : null;

  const setSubjectHour = (subjectId: string, val: number) => {
    if (val < 0) {
      const copy = { ...formData.subjectHours };
      delete copy[subjectId];
      setFormData({ ...formData, subjectHours: copy });
    } else {
      setFormData({ ...formData, subjectHours: { ...formData.subjectHours, [subjectId]: val } });
    }
  };

  const removeSubject = (subjectId: string) => {
    const copy = { ...formData.subjectHours };
    delete copy[subjectId];
    setFormData({ ...formData, subjectHours: copy });
  };

  const openAdd = () => {
    setEditingSpec(null);
    setFormData(emptyForm());
    setSubjectSearch('');
    setShowSubjectDropdown(false);
    setShowForm(true);
  };

  const openEdit = (spec: Specialization) => {
    setEditingSpec(spec);
    setFormData({
      code: spec.code,
      name: spec.name,
      course: spec.course,
      academicWeeks: spec.academicWeeks,
      subjectHours: { ...spec.subjectHours },
    });
    setSubjectSearch('');
    setShowSubjectDropdown(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSpec(null);
    setFormData(emptyForm());
    setSubjectSearch('');
    setShowSubjectDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      showToast.showWarning('Կոդը բացակայում է', 'Մուտքագրեք մասնագիտության կոդը');
      return;
    }
    if (!formData.name.trim()) {
      showToast.showWarning('Անվանումը բացակայում է', 'Մուտքագրեք մասնագիտության անվանումը');
      return;
    }
    if (codeError) {
      showToast.showWarning('Կրկնվող կոդ', codeError);
      return;
    }
    if (!Object.values(formData.subjectHours).some((h) => h > 0)) {
      showToast.showWarning('Առարկաներ չկան', 'Ավելացրեք առնվազն մեկ առարկա ժամաքանակով (> 0)');
      return;
    }

    // Strip zero-hour entries before saving
    const cleanedHours = Object.fromEntries(
      Object.entries(formData.subjectHours).filter(([, h]) => h > 0)
    );

    if (editingSpec) {
      setSpecializations(
        specializations.map((s) =>
          s.id === editingSpec.id
            ? {
                ...s,
                code: formData.code.trim(),
                name: formData.name.trim(),
                course: formData.course,
                academicWeeks: formData.academicWeeks,
                subjectHours: cleanedHours,
              }
            : s
        )
      );
      showToast.showSuccess('Թարմացված է', `«${formData.name.trim()}» մասնագիտությունը թարմացված է`);
    } else {
      addSpecialization({
        code: formData.code.trim(),
        name: formData.name.trim(),
        course: formData.course,
        academicWeeks: formData.academicWeeks,
        subjectHours: cleanedHours,
      });
      showToast.showSuccess('Ավելացված է', `«${formData.name.trim()}» մասնագիտությունը ավելացված է`);
    }
    closeForm();
  };

  const handleDelete = (spec: Specialization) => {
    setSpecializations(specializations.filter((s) => s.id !== spec.id));
    showToast.showSuccess('Հեռացված է', `«${spec.name}» մասնագիտությունը հեռացված է`);
    setDeletingSpec(null);
  };

  const getTotalHours = (subjectHours: { [id: string]: number }) =>
    Object.values(subjectHours).reduce((a, b) => a + b, 0);

  const getCourseLabel = (c: number) => `${c}-ին կուրս`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Award className="h-6 w-6 text-[#03524f]" />
          <h2 className="text-2xl font-bold text-gray-900">Մասնագիտություններ</h2>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ավելացնել մասնագիտություն
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingSpec ? 'Խմբագրել մասնագիտությունը' : 'Ավելացնել մասնագիտություն'}
                </h3>
                <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Code & Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Կոդ <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Օր.՝ 04.01"
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] ${
                        codeError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {codeError && <p className="text-xs text-red-500 mt-1">{codeError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Անվանում <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Օր.՝ Ծրագրային ապահովում"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    />
                  </div>
                </div>

                {/* Course & Weeks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Կուրս</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={formData.course}
                      onChange={(e) =>
                        setFormData({ ...formData, course: parseInt(e.target.value) || 1, subjectHours: {} })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ուս. շաբաթ</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={formData.academicWeeks}
                        onChange={(e) => setFormData({ ...formData, academicWeeks: parseInt(e.target.value) || 1 })}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] text-center"
                      />
                      <span className="text-sm text-gray-500">շաբաթ</span>
                      {institution.academicWeeks !== formData.academicWeeks && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, academicWeeks: institution.academicWeeks })}
                          className="text-xs text-[#03524f] underline"
                        >
                          վերականգնել ({institution.academicWeeks})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BookOpen className="inline h-4 w-4 mr-1" />
                    Առարկաների ժամաքանակ <span className="text-red-400">*</span>
                  </label>

                  {subjects.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                      Նախ ավելացրեք առարկաներ «Առարկաներ» բաժնում
                    </div>
                  ) : (
                    <>
                      {/* Search & Add */}
                      <div ref={searchRef} className="relative mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={subjectSearch}
                            onChange={(e) => { setSubjectSearch(e.target.value); setShowSubjectDropdown(true); }}
                            onFocus={() => setShowSubjectDropdown(true)}
                            placeholder="Փնտրել և ավելացնել առարկա..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                          />
                        </div>
                        {showSubjectDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {searchableSubjects.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-gray-400">
                                {subjectSearch
                                  ? 'Ոչինչ չգտնվեց'
                                  : subjects.filter(s => s.course === formData.course).length === 0
                                    ? `${formData.course}-ին կուրսի առարկաներ չկան`
                                    : 'Բոլոր առարկաները ավելացված են'}
                              </div>
                            ) : (
                              searchableSubjects.map((subj) => (
                                <button
                                  key={subj.id}
                                  type="button"
                                  onClick={() => {
                                    setSubjectHour(subj.id, 0);
                                    setSubjectSearch('');
                                    setShowSubjectDropdown(false);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                                >
                                  <span className="flex-1 text-sm text-gray-700 truncate">{subj.name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                    subj.type === 'lab' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {subj.type === 'lab' ? 'Լաբ.' : 'Տես.'}
                                  </span>
                                  <Plus className="h-3.5 w-3.5 text-[#03524f] flex-shrink-0" />
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Added subjects with hour inputs */}
                      {addedSubjects.length > 0 ? (
                        <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto">
                          {addedSubjects.map((subj) => (
                            <div key={subj.id} className="flex items-center gap-3 px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-gray-800 font-medium truncate block">{subj.name}</span>
                                <span className={`text-xs ${subj.type === 'lab' ? 'text-blue-600' : 'text-green-600'}`}>
                                  {subj.type === 'lab' ? 'Լաբ.' : 'Տես.'} · {getCourseLabel(subj.course)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  max="500"
                                  placeholder="0"
                                  value={formData.subjectHours[subj.id] || ''}
                                  onChange={(e) => setSubjectHour(subj.id, parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                                />
                                <span className="text-xs text-gray-400 w-6">ժ.</span>
                                <button
                                  type="button"
                                  onClick={() => removeSubject(subj.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-300 rounded-md p-4 text-center">
                          <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Ավելացրեք առնվազն մեկ առարկա</p>
                        </div>
                      )}

                      {/* Summary */}
                      {addedSubjects.length > 0 && (
                        <div className="mt-2 p-2.5 bg-[#03524f] bg-opacity-5 border border-[#03524f] border-opacity-20 rounded-md flex items-center justify-between">
                          <span className="text-sm text-[#03524f]">{addedSubjects.length} առարկա</span>
                          <span className="text-sm font-semibold text-[#03524f]">
                            {getTotalHours(formData.subjectHours)} ժ/տարի
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Չեղարկել
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#03524f] border border-transparent rounded-md hover:bg-[#024239] transition-colors"
                >
                  {editingSpec ? (
                    <><Save className="h-4 w-4 mr-2" />Պահպանել</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" />Ավելացնել</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSpec && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Հաստատել ջնջումը</h3>
              <p className="text-sm text-gray-500 mb-6">
                Վստա՞հ եք, որ ցանկանում եք ջնջել «{deletingSpec.name}» մասնագիտությունը:
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingSpec(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Չեղարկել
                </button>
                <button
                  onClick={() => handleDelete(deletingSpec)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors"
                >
                  Ջնջել
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Specializations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {specializations.length === 0 ? (
          <div className="p-8 text-center">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Մասնագիտություններ չեն ավելացված</h3>
            <p className="text-gray-500">Ավելացրեք մասնագիտություններ՝ սեղմելով «Ավելացնել մասնագիտություն» կոճակը</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Կոդ / Անվանում</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Կուրս</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ուս. շաբաթ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Առարկաներ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ընդ. ժամ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Գործողություններ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {specializations.map((spec) => {
                  const specSubjects = subjects.filter((s) => (spec.subjectHours[s.id] ?? 0) > 0);
                  const totalHours = getTotalHours(spec.subjectHours);
                  const isExpanded = expandedSpec === spec.id;

                  return (
                    <React.Fragment key={spec.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        {/* Code / Name */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#03524f] bg-opacity-10 flex items-center justify-center flex-shrink-0">
                              <GraduationCap className="h-5 w-5 text-[#03524f]" />
                            </div>
                            <div>
                              <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {spec.code}
                              </span>
                              <div className="font-medium text-gray-900 text-sm mt-0.5">{spec.name}</div>
                            </div>
                          </div>
                        </td>

                        {/* Course */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[#03524f] bg-opacity-10 text-[#03524f] rounded-full">
                            <GraduationCap className="h-3 w-3 mr-1" />
                            {getCourseLabel(spec.course)}
                          </span>
                        </td>

                        {/* Academic weeks */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {spec.academicWeeks} շ.
                          </div>
                        </td>

                        {/* Subjects */}
                        <td className="px-6 py-4">
                          {specSubjects.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">չկան</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 items-center">
                              {specSubjects.slice(0, 3).map((s) => (
                                <span
                                  key={s.id}
                                  className="inline-flex px-2 py-0.5 text-xs bg-[#03524f] bg-opacity-10 text-[#03524f] rounded"
                                >
                                  {s.name}
                                </span>
                              ))}
                              {specSubjects.length > 3 && (
                                <button
                                  onClick={() => setExpandedSpec(isExpanded ? null : spec.id)}
                                  className="inline-flex items-center gap-0.5 text-xs text-gray-500 hover:text-[#03524f] transition-colors"
                                >
                                  +{specSubjects.length - 3} ևս
                                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Total hours */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            {totalHours} ժ.
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEdit(spec)}
                              className="text-[#03524f] hover:text-[#024239] transition-colors"
                              title="Խմբագրել"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingSpec(spec)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Ջնջել"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded subjects detail row */}
                      {isExpanded && specSubjects.length > 3 && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {specSubjects.map((s) => (
                                <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-md">
                                  <div className="min-w-0">
                                    <div className="text-sm text-gray-700 truncate">{s.name}</div>
                                    <div className={`text-xs ${s.type === 'lab' ? 'text-blue-600' : 'text-green-600'}`}>
                                      {s.type === 'lab' ? 'Լաբ.' : 'Տես.'}
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold text-[#03524f] ml-2 flex-shrink-0">
                                    {spec.subjectHours[s.id]} ժ.
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

export default Specializations;
