import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, X, GraduationCap, ChevronDown, ChevronUp, Clock } from 'lucide-react';
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
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [course, setCourse] = useState(1);
  const [academicWeeks, setAcademicWeeks] = useState(institution.academicWeeks || 36);
  const [subjectHours, setSubjectHours] = useState<{ [subjectId: string]: number }>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingSubjectHours, setEditingSubjectHours] = useState<{ [subjectId: string]: number }>({});

  const codePattern = /^[0-9 .]+$/;

  const isDuplicateCode = (c: string) =>
    specializations.some((s) => s.code.trim() === c.trim());

  const availableSubjects = subjects.filter(
    (s) => s.course === course || !s.course
  );

  const canAdd =
    code.trim().length > 0 &&
    codePattern.test(code.trim()) &&
    name.trim().length > 0 &&
    !isDuplicateCode(code) &&
    Object.keys(subjectHours).length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    addSpecialization({
      code: code.trim(),
      name: name.trim(),
      course,
      academicWeeks,
      subjectHours,
    });
    showToast.showSuccess('Ավելացված է', `«${name.trim()}» մասնագիտությունը ավելացված է`);
    setCode('');
    setName('');
    setCourse(1);
    setAcademicWeeks(institution.academicWeeks || 36);
    setSubjectHours({});
  };

  const handleRemove = (id: string) => {
    setSpecializations(specializations.filter((s) => s.id !== id));
    showToast.showSuccess('Հեռացված է', 'Մասնագիտությունը հեռացված է');
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      const spec = specializations.find((s) => s.id === id);
      setEditingSubjectHours(spec ? { ...spec.subjectHours } : {});
      setExpandedId(id);
    }
  };

  const saveSubjectHours = (id: string) => {
    setSpecializations(
      specializations.map((s) =>
        s.id === id ? { ...s, subjectHours: editingSubjectHours } : s
      )
    );
    showToast.showSuccess('Պահպանված է', 'Ժամաքանակները թարմացված են');
    setExpandedId(null);
  };

  const setSubjectHour = (subjectId: string, val: number) => {
    if (val <= 0) {
      const copy = { ...subjectHours };
      delete copy[subjectId];
      setSubjectHours(copy);
    } else {
      setSubjectHours({ ...subjectHours, [subjectId]: val });
    }
  };

  const setEditHour = (subjectId: string, val: number) => {
    if (val <= 0) {
      const copy = { ...editingSubjectHours };
      delete copy[subjectId];
      setEditingSubjectHours(copy);
    } else {
      setEditingSubjectHours({ ...editingSubjectHours, [subjectId]: val });
    }
  };

  const codeError =
    code.trim().length > 0 && !codePattern.test(code.trim())
      ? 'Կոդը կարող է պարունակել միայն թվեր, բացատներ և կետեր'
      : isDuplicateCode(code)
      ? 'Այս կոդով մասնագիտությունն արդեն գոյություն ունի'
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#03524f] to-[#047a75]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Մասնագիտություններ
          </h2>
          <p className="text-sm text-white/70 mt-1">
            Ավելացրեք մասնագիտություններ, կոդ, կուրս, ուս. շաբաթ և կապեք առարկաների հետ
          </p>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Մասնագիտության կոդ <span className="text-red-400">*</span>
                <span className="text-gray-400 font-normal ml-1">(թվեր, բացատ, կետ)</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Օր.՝ 04.01 կամ 0401"
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] ${
                  codeError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {codeError && (
                <p className="text-xs text-red-500 mt-1">{codeError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Անվանում <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Օր.՝ Ծրագրային ապահովում"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Կուրս</label>
              <select
                value={course}
                onChange={(e) => {
                  setCourse(parseInt(e.target.value));
                  setSubjectHours({});
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
              >
                {[1, 2, 3, 4, 5, 6].map((c) => (
                  <option key={c} value={c}>{c}-ին կուրս</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Ուս. շաբաթ <span className="text-gray-400 font-normal">(ընդամենը)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={academicWeeks}
                  onChange={(e) => setAcademicWeeks(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] text-center"
                />
                <span className="text-sm text-gray-500">շաբաթ</span>
                {institution.academicWeeks !== academicWeeks && (
                  <button
                    type="button"
                    onClick={() => setAcademicWeeks(institution.academicWeeks)}
                    className="text-xs text-[#03524f] underline"
                  >
                    վերականգնել ({institution.academicWeeks})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Subject hours */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Կապել առարկաների հետ <span className="text-red-400">*</span>
              <span className="text-gray-400 font-normal ml-1">({course}-ին կուրս)</span>
            </label>
            {subjects.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Նախ ավելացրեք առարկաներ «Առարկաներ» բաժնում
              </div>
            ) : availableSubjects.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                {course}-ին կուրսի առարկաներ չկան
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-52 overflow-y-auto">
                {availableSubjects.map((subj) => (
                  <div key={subj.id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-gray-700 truncate">{subj.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${subj.type === 'lab' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {subj.type === 'lab' ? 'Լաբ.' : 'Տես.'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      placeholder="0"
                      value={subjectHours[subj.id] || ''}
                      onChange={(e) => setSubjectHour(subj.id, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                    />
                    <span className="text-xs text-gray-400 w-6">ժ.</span>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(subjectHours).length === 0 && subjects.length > 0 && (
              <p className="text-xs text-red-500 mt-1">Ավելացրեք առնվազն մեկ առարկայի ժամ</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="inline-flex items-center px-5 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Ավելացնել մասնագիտությունը
          </button>
        </div>
      </div>

      {/* List */}
      {specializations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <GraduationCap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Մասնագիտություններ դեռ չեն ավելացված</p>
        </div>
      ) : (
        <div className="space-y-3">
          {specializations.map((spec) => {
            const specSubjects = subjects.filter((s) => spec.subjectHours[s.id]);
            const totalHours = Object.values(spec.subjectHours).reduce((a, b) => a + b, 0);
            const isExpanded = expandedId === spec.id;

            return (
              <div key={spec.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#03524f]/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-[#03524f]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{spec.code}</span>
                      <span className="font-semibold text-gray-900 text-sm">{spec.name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{spec.course}-ին կուրս</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {spec.academicWeeks} շաբ.
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {specSubjects.length} առարկա · {totalHours} ժ.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(spec.id)}
                      className="p-1.5 text-gray-400 hover:text-[#03524f] transition-colors"
                      title="Խմբագրել առարկաների ժամերը"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(spec.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Առարկաների ժամաքանակ</span>
                    </div>
                    {subjects.length === 0 ? (
                      <p className="text-sm text-gray-500">Առարկաներ չկան</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {subjects.map((subj) => (
                          <div key={subj.id} className="flex items-center gap-3">
                            <span className="flex-1 text-sm text-gray-700 truncate">{subj.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${subj.type === 'lab' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {subj.type === 'lab' ? 'Լաբ.' : 'Տես.'}
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="500"
                              placeholder="0"
                              value={editingSubjectHours[subj.id] || ''}
                              onChange={(e) => setEditHour(subj.id, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                            />
                            <span className="text-xs text-gray-400 w-6">ժ.</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => saveSubjectHours(spec.id)}
                        className="px-4 py-1.5 bg-[#03524f] text-white text-sm rounded-md hover:bg-[#024239] transition-colors"
                      >
                        Պահպանել
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <X className="h-3.5 w-3.5 inline mr-1" />
                        Չեղարկել
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Specializations;
