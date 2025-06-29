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
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Activity,
  Upload,
  Trash2,
  BarChart3
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

  // Calculate key metrics
  const metrics = {
    totalGroups: classGroups.length,
    totalSubjects: subjects.length,
    totalTeachers: teachers.length,
    totalClassrooms: classrooms.length,
    totalLessons: schedule.length,
    averageStudentsPerGroup: classGroups.length > 0 
      ? Math.round(classGroups.reduce((sum, g) => sum + g.studentsCount, 0) / classGroups.length)
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

  // System health assessment
  const healthChecks = {
    hasInstitution: !!institution.name,
    hasGroups: classGroups.length > 0,
    hasSubjects: subjects.length > 0,
    hasTeachers: teachers.length > 0,
    hasClassrooms: classrooms.length > 0,
    hasGroupSubjects: classGroups.some(g => Object.keys(g.subjectHours || {}).length > 0),
    hasSubjectTeachers: subjects.some(s => s.teacherIds.length > 0),
    hasSchedule: schedule.length > 0,
  };

  const healthScore = Object.values(healthChecks).filter(Boolean).length;
  const totalChecks = Object.keys(healthChecks).length;
  const healthPercentage = Math.round((healthScore / totalChecks) * 100);

  const getHealthStatus = () => {
    if (healthPercentage >= 80) return { status: 'excellent', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle };
    if (healthPercentage >= 60) return { status: 'good', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle };
    return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  // Key issues
  const issues = [];
  if (!healthChecks.hasInstitution) issues.push(t('overview.issues.noInstitution'));
  if (!healthChecks.hasGroups) issues.push(t('overview.issues.noGroups'));
  if (!healthChecks.hasSubjects) issues.push(t('overview.issues.noSubjects'));
  if (!healthChecks.hasTeachers) issues.push(t('overview.issues.noTeachers'));
  if (!healthChecks.hasClassrooms) issues.push(t('overview.issues.noClassrooms'));
  if (!healthChecks.hasGroupSubjects) issues.push(t('overview.issues.noGroupSubjects'));
  if (!healthChecks.hasSubjectTeachers) issues.push(t('overview.issues.noSubjectTeachers'));

  // Handle file import
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast.showError(t('toast.invalidFileFormat'), t('toast.selectJsonFile'));
      return;
    }

    try {
      await importConfiguration(file);
      showToast.showSuccess(t('toast.importSuccessful'), t('toast.importSuccessfulDesc'));
    } catch (error) {
      showToast.showError(t('toast.importFailed'), t('toast.importFailedDesc'));
    }

    // Clear the input
    event.target.value = '';
  };

  const handleClearData = () => {
    if (confirm(t('overview.confirmClearAll'))) {
      clearAllData();
      showToast.showSuccess(t('toast.dataCleared'), t('toast.dataClearedDesc'));
    }
  };

  const MetricCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    subtitle?: string;
    trend?: 'up' | 'down' | 'stable';
  }> = ({ title, value, icon, subtitle, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-lg bg-[#03524f] bg-opacity-10">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className={`p-2 rounded-full ${
            trend === 'up' ? 'bg-green-100' : 
            trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <TrendingUp className={`h-4 w-4 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600 transform rotate-180' : 'text-gray-600'
            }`} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Eye className="h-8 w-8 text-[#03524f]" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('overview.title')}</h1>
            <p className="text-gray-600">{institution.name || t('overview.noInstitutionName')}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('overview.import')}
          </label>
          
          <button
            onClick={handleClearData}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('overview.clearAll')}
          </button>
          
          <button
            onClick={exportConfiguration}
            className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-lg hover:bg-[#024239] transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('overview.export')}
          </button>
        </div>
      </div>

      {/* System Health Card */}
      <div className={`rounded-xl border-2 p-6 ${healthStatus.bgColor} ${healthStatus.color.replace('text-', 'border-')}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <HealthIcon className={`h-8 w-8 ${healthStatus.color}`} />
            <div>
              <h2 className={`text-xl font-bold ${healthStatus.color}`}>
                {t(`overview.health.${healthStatus.status}`)}
              </h2>
              <p className={`text-sm ${healthStatus.color} opacity-80`}>
                {t('overview.systemHealth')}: {healthScore}/{totalChecks} {t('overview.checksCompleted')}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-3xl font-bold ${healthStatus.color}`}>
              {healthPercentage}%
            </div>
            <div className="w-32 bg-white bg-opacity-50 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  healthPercentage >= 80 ? 'bg-green-600' : 
                  healthPercentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${healthPercentage}%` }}
              />
            </div>
          </div>
        </div>
        
        {issues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-current border-opacity-20">
            <p className={`text-sm font-medium ${healthStatus.color} mb-2`}>
              {t('overview.keyIssues')}:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {issues.slice(0, 4).map((issue, index) => (
                <div key={index} className={`text-sm ${healthStatus.color} opacity-80`}>
                  • {issue}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title={t('overview.groups')}
          value={metrics.totalGroups}
          icon={<Users className="h-6 w-6 text-[#03524f]" />}
          subtitle={`${metrics.averageStudentsPerGroup} ${t('overview.avgStudents')}`}
          trend={metrics.totalGroups > 0 ? 'up' : undefined}
        />
        
        <MetricCard
          title={t('overview.subjects')}
          value={metrics.totalSubjects}
          icon={<BookOpen className="h-6 w-6 text-[#03524f]" />}
          subtitle={`${subjects.filter(s => s.type === 'lab').length} ${t('overview.laboratories')}`}
          trend={metrics.totalSubjects > 0 ? 'up' : undefined}
        />
        
        <MetricCard
          title={t('overview.teachers')}
          value={metrics.totalTeachers}
          icon={<GraduationCap className="h-6 w-6 text-[#03524f]" />}
          subtitle={`${teachers.filter(t => t.homeClassroom).length} ${t('overview.withOwnLabs')}`}
          trend={metrics.totalTeachers > 0 ? 'up' : undefined}
        />
        
        <MetricCard
          title={t('overview.classrooms')}
          value={metrics.totalClassrooms}
          icon={<MapPin className="h-6 w-6 text-[#03524f]" />}
          subtitle={`${classrooms.filter(c => c.type === 'lab').length} ${t('overview.labRooms')}`}
          trend={metrics.totalClassrooms > 0 ? 'up' : undefined}
        />
      </div>

      {/* Schedule Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="h-6 w-6 text-[#03524f]" />
            <h3 className="text-lg font-semibold text-gray-900">{t('overview.scheduleStatus')}</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('overview.scheduledLessons')}</span>
              <span className="text-2xl font-bold text-gray-900">{metrics.totalLessons}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('overview.completeness')}</span>
              <div className="flex items-center space-x-3">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      scheduleCompleteness >= 80 ? 'bg-[#03524f]' : 
                      scheduleCompleteness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(scheduleCompleteness, 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-gray-900">{scheduleCompleteness}%</span>
              </div>
            </div>
            
            {scheduleCompleteness < 100 && potentialLessons > 0 && (
              <div className="text-sm text-gray-500">
                {potentialLessons - metrics.totalLessons} {t('overview.lessonsRemaining')}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="h-6 w-6 text-[#03524f]" />
            <h3 className="text-lg font-semibold text-gray-900">{t('overview.quickStats')}</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('overview.workingDays')}</span>
              <span className="font-medium">{institution.workingDays.length} {t('overview.days')}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('overview.dailyLessons')}</span>
              <span className="font-medium">{institution.lessonsPerDay}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('overview.lessonDuration')}</span>
              <span className="font-medium">{institution.lessonDuration} {t('overview.minutes')}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('overview.specializations')}</span>
              <span className="font-medium">{institution.specializations.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-[#03524f] to-[#024239] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">{t('overview.readyToStart')}</h3>
            <p className="text-white text-opacity-90">
              {healthPercentage >= 80 
                ? t('overview.systemReady')
                : t('overview.completeSetup')
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-white text-opacity-80" />
              <div className="text-2xl font-bold">{healthPercentage}%</div>
              <div className="text-xs text-white text-opacity-80">{t('overview.complete')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;