import React from 'react';
import { 
  Eye, 
  Download, 
  Building2, 
  Users, 
  BookOpen, 
  MapPin, 
  GraduationCap, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Settings,
  Database
} from 'lucide-react';
import { 
  Institution, 
  ClassGroup, 
  Subject, 
  Classroom, 
  Teacher, 
  ScheduleSlot 
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
  showToast,
}) => {
  const { t } = useLocalization();

  // Calculate statistics
  const stats = {
    totalGroups: classGroups.length,
    totalSubjects: subjects.length,
    totalTeachers: teachers.length,
    totalClassrooms: classrooms.length,
    totalLessons: schedule.length,
    theorySubjects: subjects.filter(s => s.type === 'theory').length,
    labSubjects: subjects.filter(s => s.type === 'lab').length,
    theoryClassrooms: classrooms.filter(c => c.type === 'theory').length,
    laboratories: classrooms.filter(c => c.type === 'lab').length,
    teacherLabs: classrooms.filter(c => c.type === 'teacher_lab').length,
    averageStudentsPerGroup: classGroups.length > 0 
      ? Math.round(classGroups.reduce((sum, g) => sum + g.studentsCount, 0) / classGroups.length)
      : 0,
    averageSubjectsPerGroup: classGroups.length > 0
      ? Math.round(classGroups.reduce((sum, g) => sum + Object.keys(g.subjectHours || {}).length, 0) / classGroups.length)
      : 0,
    averageGroupsPerTeacher: teachers.length > 0
      ? Math.round(teachers.reduce((sum, t) => sum + t.assignedClassGroups.length, 0) / teachers.length)
      : 0,
  };

  // Calculate potential lessons (what should be scheduled)
  const potentialLessons = classGroups.reduce((total, group) => {
    return total + Object.values(group.subjectHours || {}).reduce((groupTotal, hours) => {
      return groupTotal + Math.ceil(hours / institution.academicWeeks);
    }, 0);
  }, 0) * institution.workingDays.length;

  const scheduleCompleteness = potentialLessons > 0 
    ? Math.round((schedule.length / potentialLessons) * 100)
    : 0;

  // System health checks
  const warnings = [];
  const recommendations = [];

  if (classGroups.length === 0) warnings.push(t('overview.noGroups'));
  if (subjects.length === 0) warnings.push(t('overview.noSubjects'));
  if (teachers.length === 0) warnings.push(t('overview.noTeachers'));
  if (classrooms.length === 0) warnings.push(t('overview.noClassrooms'));

  const subjectsWithoutTeachers = subjects.filter(s => s.teacherIds.length === 0);
  if (subjectsWithoutTeachers.length > 0) {
    warnings.push(t('toast.noTeachersAssignedDesc'));
  }

  const groupsWithoutSubjects = classGroups.filter(g => Object.keys(g.subjectHours || {}).length === 0);
  if (groupsWithoutSubjects.length > 0) {
    warnings.push(t('toast.noSubjectsAssignedDesc'));
  }

  if (scheduleCompleteness < 80 && schedule.length > 0) {
    recommendations.push(t('overview.improveScheduleCompleteness'));
  }

  if (stats.averageGroupsPerTeacher > 5) {
    recommendations.push(t('overview.considerMoreTeachers'));
  }

  const handleExport = () => {
    try {
      exportConfiguration();
      showToast.showSuccess(
        t('toast.exportSuccessful'),
        t('toast.exportSuccessfulDesc')
      );
    } catch (error) {
      showToast.showError(
        t('toast.exportFailed'),
        t('toast.exportFailedDesc')
      );
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color} mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Eye className="h-6 w-6 text-[#03524f]" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('overview.title')}</h2>
            <p className="text-sm text-gray-500">{t('overview.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          {t('overview.exportConfig')}
        </button>
      </div>

      {/* Institution Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Building2 className="h-5 w-5 text-[#03524f]" />
          <h3 className="text-lg font-medium text-gray-900">{t('overview.institutionInfo')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">{t('setup.collegeName')}</p>
            <p className="font-medium text-gray-900">{institution.name || t('common.notSet')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('overview.workingDaysCount')}</p>
            <p className="font-medium text-gray-900">{institution.workingDays.length} {t('common.days')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('overview.lessonsPerDay')}</p>
            <p className="font-medium text-gray-900">{institution.lessonsPerDay} {t('common.lessons')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('overview.lessonDuration')}</p>
            <p className="font-medium text-gray-900">{institution.lessonDuration} րոպե</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('overview.academicWeeks')}</p>
            <p className="font-medium text-gray-900">{institution.academicWeeks} շաբաթ</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('overview.specializations')}</p>
            <p className="font-medium text-gray-900">{institution.specializations.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('setup.startTime')}</p>
            <p className="font-medium text-gray-900">{institution.startTime}</p>
          </div>
        </div>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('overview.totalGroups')}
          value={stats.totalGroups}
          icon={<Users className="h-6 w-6 text-white" />}
          color="bg-[#03524f]"
          subtitle={`${stats.averageStudentsPerGroup} ${t('common.students')}/խումբ`}
        />
        <StatCard
          title={t('overview.totalSubjects')}
          value={stats.totalSubjects}
          icon={<BookOpen className="h-6 w-6 text-white" />}
          color="bg-[#03524f]"
          subtitle={`${stats.theorySubjects} տեսական, ${stats.labSubjects} լաբ`}
        />
        <StatCard
          title={t('overview.totalTeachers')}
          value={stats.totalTeachers}
          icon={<GraduationCap className="h-6 w-6 text-white" />}
          color="bg-[#03524f]"
          subtitle={`${stats.averageGroupsPerTeacher} խումբ/ուսուցիչ`}
        />
        <StatCard
          title={t('overview.totalClassrooms')}
          value={stats.totalClassrooms}
          icon={<MapPin className="h-6 w-6 text-white" />}
          color="bg-[#03524f]"
          subtitle={`${stats.theoryClassrooms} տեսական, ${stats.laboratories} լաբ`}
        />
      </div>

      {/* Schedule Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="h-5 w-5 text-[#03524f]" />
            <h3 className="text-lg font-medium text-gray-900">{t('overview.scheduleInfo')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('overview.scheduledLessons')}</span>
              <span className="font-medium text-gray-900">{stats.totalLessons}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('overview.scheduleCompleteness')}</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      scheduleCompleteness >= 80 ? 'bg-[#03524f]' : 
                      scheduleCompleteness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(scheduleCompleteness, 100)}%` }}
                  />
                </div>
                <span className="font-medium text-gray-900">{scheduleCompleteness}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="h-5 w-5 text-[#03524f]" />
            <h3 className="text-lg font-medium text-gray-900">{t('overview.dataStatistics')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('overview.averageSubjectsPerGroup')}</span>
              <span className="font-medium text-gray-900">{stats.averageSubjectsPerGroup}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('classrooms.teacherLab')}</span>
              <span className="font-medium text-gray-900">{stats.teacherLabs}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('overview.laboratories')}</span>
              <span className="font-medium text-gray-900">{stats.laboratories}</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-medium text-gray-900">{t('overview.warnings')}</h3>
          </div>
          {warnings.length === 0 ? (
            <div className="flex items-center space-x-2 text-[#03524f]">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{t('overview.noWarnings')}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div key={index} className="flex items-start space-x-2 text-yellow-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-5 w-5 text-[#03524f]" />
            <h3 className="text-lg font-medium text-gray-900">{t('overview.recommendations')}</h3>
          </div>
          {recommendations.length === 0 ? (
            <div className="flex items-center space-x-2 text-[#03524f]">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{t('overview.noRecommendations')}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-2 text-[#03524f]">
                  <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Configuration Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="h-5 w-5 text-[#03524f]" />
          <h3 className="text-lg font-medium text-gray-900">{t('overview.configurationStatus')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${institution.name ? 'bg-[#03524f]' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">{t('overview.institutionSettings')}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              institution.name ? 'bg-[#03524f] bg-opacity-10 text-[#03524f]' : 'bg-red-100 text-red-800'
            }`}>
              {institution.name ? t('overview.complete') : t('overview.incomplete')}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${classGroups.length > 0 ? 'bg-[#03524f]' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">{t('groups.title')}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              classGroups.length > 0 ? 'bg-[#03524f] bg-opacity-10 text-[#03524f]' : 'bg-red-100 text-red-800'
            }`}>
              {classGroups.length > 0 ? t('overview.complete') : t('overview.incomplete')}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${subjects.length > 0 ? 'bg-[#03524f]' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">{t('subjects.title')}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              subjects.length > 0 ? 'bg-[#03524f] bg-opacity-10 text-[#03524f]' : 'bg-red-100 text-red-800'
            }`}>
              {subjects.length > 0 ? t('overview.complete') : t('overview.incomplete')}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${teachers.length > 0 ? 'bg-[#03524f]' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">{t('teachers.title')}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              teachers.length > 0 ? 'bg-[#03524f] bg-opacity-10 text-[#03524f]' : 'bg-red-100 text-red-800'
            }`}>
              {teachers.length > 0 ? t('overview.complete') : t('overview.incomplete')}
            </span>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="h-5 w-5 text-[#03524f]" />
          <h3 className="text-lg font-medium text-gray-900">{t('overview.dataManagement')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('overview.lastModified')}</p>
            <p className="font-medium text-gray-900">{new Date().toLocaleDateString('hy-AM')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('overview.version')}</p>
            <p className="font-medium text-gray-900">1.0.0</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('common.total')} {t('overview.dataStatistics')}</p>
            <p className="font-medium text-gray-900">
              {stats.totalGroups + stats.totalSubjects + stats.totalTeachers + stats.totalClassrooms} {t('common.items')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;