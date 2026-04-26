import React, { useState } from 'react';
import {
  Download,
  Upload,
  Users,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Circle,
  AlertCircle,
  Trash2,
  Clock,
  Building2,
  LayoutDashboard,
} from 'lucide-react';
import {
  Institution,
  ClassGroup,
  Subject,
  Classroom,
  Teacher,
  ScheduleSlot,
} from '../types';
import { useLocalization } from '../hooks/useLocalization';

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
  importConfiguration: (file: File) => Promise<void>;
  clearAllData: () => void;
  showToast: {
    showSuccess: (title: string, message: string, duration?: number) => void;
    showError: (title: string, message: string, duration?: number) => void;
    showWarning: (title: string, message: string, duration?: number) => void;
    showInfo: (title: string, message: string, duration?: number) => void;
  };
}

const Overview: React.FC<OverviewProps> = ({
  institution,
  classGroups,
  subjects,
  classrooms,
  teachers,
  schedule,
  exportConfiguration,
  importConfiguration,
  clearAllData,
  showToast,
}) => {
  const { t } = useLocalization();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const importRef = React.useRef<HTMLInputElement>(null);

  const getTotalHours = (subjectHours: { [id: string]: number }) =>
    Object.values(subjectHours).reduce((s, h) => s + h, 0);

  const subjectsWithoutTeachers = subjects.filter(s => !s.teacherIds || s.teacherIds.length === 0);
  const groupsWithoutSubjects = classGroups.filter(g => !g.subjectHours || Object.keys(g.subjectHours).length === 0);
  const teachersWithNoHours = teachers.filter(tc => !tc.availableHours || Object.keys(tc.availableHours).length === 0);
  const unassignedClassrooms = classrooms.filter(c => c.type === 'theory' && !classGroups.some(g => g.homeRoom === c.id));
  const totalStudents = classGroups.reduce((s, g) => s + g.studentsCount, 0);

  const checklist = [
    {
      label: t('subjects.title'),
      done: subjects.length > 0,
      hint: t('overview.issues.noSubjects'),
    },
    {
      label: t('classrooms.title'),
      done: classrooms.length > 0,
      hint: t('overview.issues.noClassrooms'),
    },
    {
      label: t('groups.title'),
      done: classGroups.length > 0,
      hint: t('overview.issues.noGroups'),
    },
    {
      label: t('overview.issues.noGroupSubjects'),
      done: groupsWithoutSubjects.length === 0 && classGroups.length > 0,
      hint: groupsWithoutSubjects.length > 0
        ? `${groupsWithoutSubjects.map(g => g.name).join(', ')}`
        : '',
    },
    {
      label: t('teachers.title'),
      done: teachers.length > 0,
      hint: t('overview.issues.noTeachers'),
    },
    {
      label: t('overview.issues.noSubjectTeachers'),
      done: subjectsWithoutTeachers.length === 0 && subjects.length > 0,
      hint: subjectsWithoutTeachers.length > 0
        ? subjectsWithoutTeachers.map(s => s.name).join(', ')
        : '',
    },
  ];

  const specMap: Record<string, ClassGroup[]> = {};
  classGroups.forEach(g => {
    const key = g.specialization || t('common.notSet');
    if (!specMap[key]) specMap[key] = [];
    specMap[key].push(g);
  });

  const teacherLoad = teachers.map(tc => {
    const totalHours = classGroups.reduce((sum, group) => {
      return sum + Object.entries(group.subjectHours || {}).reduce((gSum, [subjectId, hours]) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (subject && tc.subjects.includes(subject.name)) return gSum + hours;
        return gSum;
      }, 0);
    }, 0);
    const weeklyLessons = institution.academicWeeks > 0 ? Math.ceil(totalHours / institution.academicWeeks) : 0;
    const weeklyAvailable = Object.values(tc.availableHours || {}).flat().length;
    return { teacher: tc, totalHours, weeklyLessons, weeklyAvailable };
  });

  const doneCount = checklist.filter(c => c.done).length;
  const allDone = doneCount === checklist.length;

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importConfiguration(file)
      .then(() => showToast.showSuccess(t('toast.importSuccessful'), t('toast.importSuccessfulDesc')))
      .catch(() => showToast.showError(t('toast.importFailed'), t('toast.importFailedDesc')));
    e.target.value = '';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header — matches other sections exactly */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <LayoutDashboard className="h-6 w-6 text-[#03524f]" />
          <h2 className="text-2xl font-bold text-gray-900">{t('navigation.overview')}</h2>
        </div>
        <div className="flex items-center gap-2">
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button
            onClick={() => importRef.current?.click()}
            className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('overview.import')}
          </button>
          <button
            onClick={exportConfiguration}
            className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('overview.export')}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('overview.clearAll')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Checklist + Problems */}
        <div className="space-y-4">
          {/* Checklist */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Checklist</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {doneCount}/{checklist.length}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  {item.done
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    : <Circle className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <div className={`text-sm ${item.done ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
                      {item.label}
                    </div>
                    {!item.done && item.hint && (
                      <div className="text-xs text-amber-600 mt-0.5 truncate">{item.hint}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Problems */}
          {(subjectsWithoutTeachers.length > 0 || groupsWithoutSubjects.length > 0 || teachersWithNoHours.length > 0) && (
            <div className="bg-white rounded-lg border border-amber-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <h3 className="text-base font-semibold text-gray-900">{t('overview.keyIssues')}</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {subjectsWithoutTeachers.map(s => (
                  <div key={s.id} className="px-5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-800 truncate">{s.name}</div>
                      <div className="text-xs text-amber-600">{t('common.noTeacherAssigned')}</div>
                    </div>
                    <BookOpen className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  </div>
                ))}
                {groupsWithoutSubjects.map(g => (
                  <div key={g.id} className="px-5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-800">{g.name}</div>
                      <div className="text-xs text-amber-600">{t('common.noSubjectsAssigned')}</div>
                    </div>
                    <Users className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  </div>
                ))}
                {teachersWithNoHours.map(tc => (
                  <div key={tc.id} className="px-5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-800">{tc.firstName} {tc.lastName}</div>
                      <div className="text-xs text-amber-600">{t('common.noAvailableHours')}</div>
                    </div>
                    <GraduationCap className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Data panels */}
        <div className="lg:col-span-2 space-y-4">
          {/* 4 stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: Users,
                label: t('groups.title'),
                value: classGroups.length,
                sub: `${totalStudents} ${t('common.students')}`,
              },
              {
                icon: BookOpen,
                label: t('subjects.title'),
                value: subjects.length,
                sub: `${subjects.filter(s => s.type === 'lab').length} ${t('subjects.lab')}`,
              },
              {
                icon: GraduationCap,
                label: t('teachers.title'),
                value: teachers.length,
                sub: subjectsWithoutTeachers.length > 0
                  ? `${subjectsWithoutTeachers.length} ${t('subjects.title').toLowerCase()} ${t('common.notSet').toLowerCase()}`
                  : `${t('overview.scheduledLessons')} —`,
              },
              {
                icon: Building2,
                label: t('classrooms.title'),
                value: classrooms.length,
                sub: `${unassignedClassrooms.length} ${t('common.free')}`,
              },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <Icon className="h-5 w-5 text-[#03524f] mb-2" />
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {/* Groups by specialization */}
          {classGroups.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#03524f]" />
                <h3 className="text-base font-semibold text-gray-900">
                  {t('groups.title')} — {t('common.specialization').toLowerCase()}ների բաշխում
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('common.specialization')}</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('groups.title')}</th>
                      <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">{t('common.students')}</th>
                      <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">{t('subjects.title')}</th>
                      <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">{t('common.hours')}/{t('common.year')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(specMap).map(([spec, groups]) => {
                      const totalSt = groups.reduce((s, g) => s + g.studentsCount, 0);
                      const allSubjectIds = new Set(groups.flatMap(g => Object.keys(g.subjectHours || {})));
                      const avgHours = groups.length > 0
                        ? Math.round(groups.reduce((s, g) => s + getTotalHours(g.subjectHours || {}), 0) / groups.length)
                        : 0;
                      return (
                        <tr key={spec} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-sm font-medium text-gray-800">
                            <span className="block max-w-[160px] truncate">{spec}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {groups.map(g => (
                                <span key={g.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#03524f] bg-opacity-10 text-[#03524f]">
                                  {g.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600 text-right">{totalSt}</td>
                          <td className="px-5 py-3 text-sm text-gray-600 text-right">{allSubjectIds.size}</td>
                          <td className="px-5 py-3 text-sm text-gray-600 text-right">{avgHours}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Teacher workload */}
          {teachers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#03524f]" />
                <h3 className="text-base font-semibold text-gray-900">
                  {t('teachers.title')} — {t('common.hoursPerYear')}
                </h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {teacherLoad.map(({ teacher: tc, totalHours, weeklyLessons, weeklyAvailable }) => {
                  const overloaded = weeklyLessons > weeklyAvailable && weeklyAvailable > 0;
                  return (
                    <div key={tc.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-[#03524f] bg-opacity-10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-[#03524f]">
                            {tc.firstName[0]}{tc.lastName[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">{tc.firstName} {tc.lastName}</div>
                          <div className="text-xs text-gray-400 truncate">
                            {tc.subjects.length > 0
                              ? tc.subjects.slice(0, 2).join(', ') + (tc.subjects.length > 2 ? ` +${tc.subjects.length - 2}` : '')
                              : t('subjects.noSubjects')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${overloaded ? 'text-red-600' : 'text-gray-800'}`}>
                            {weeklyLessons} {t('common.lessonsPerWeek')}
                          </div>
                          <div className="text-xs text-gray-400">{totalHours} {t('common.hoursPerYear')}</div>
                        </div>
                        {overloaded && <AlertCircle className="h-4 w-4 text-red-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schedule summary */}
          {schedule.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-[#03524f]" />
                <h3 className="text-base font-semibold text-gray-900">{t('navigation.schedule')}</h3>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-3xl font-bold text-gray-900">{schedule.length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t('overview.scheduledLessons')}</div>
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-[#03524f] rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('common.confirmDelete')}</h3>
              <p className="text-sm text-gray-500 mb-6">{t('overview.confirmClearAll')}</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => { clearAllData(); setShowDeleteConfirm(false); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  {t('common.delete')}
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
