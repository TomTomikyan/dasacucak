import React, { useState, useRef } from 'react';
import { Save, Building2, Clock, Calendar, Plus, Minus, X, BookOpen, Upload, Trash2, CheckCircle, FileText } from 'lucide-react';
import { Institution } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface ToastFunctions {
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, duration?: number) => void;
  showWarning: (title: string, message: string, duration?: number) => void;
  showInfo: (title: string, message: string, duration?: number) => void;
}

interface SetupProps {
  institution: Institution;
  setInstitution: (institution: Partial<Institution>) => void;
  importConfiguration: (file: File) => Promise<void>;
  clearAllData: () => void;
  showToast: ToastFunctions;
}

const MONTHS_AM = [
  'Հունվար', 'Փետրվար', 'Մարտ', 'Ապրիլ', 'Մայիս', 'Հունիս',
  'Հուլիս', 'Օգոստոս', 'Սեպտեմբեր', 'Հոկտեմբեր', 'Նոյեմբեր', 'Դեկտեմբեր'
];

const buildDate = (year: number, month: number, day: number): string => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const parseMonthDay = (dateStr: string): { month: number; day: number } => {
  if (!dateStr) return { month: 9, day: 1 };
  const parts = dateStr.split('-');
  return { month: parseInt(parts[1]) || 9, day: parseInt(parts[2]) || 1 };
};

const calculateAcademicWeeks = (
  sem1Start: string,
  sem1End: string,
  sem2Start: string,
  sem2End: string
): number => {
  if (!sem1Start || !sem1End || !sem2Start || !sem2End) return 40;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const s1 = new Date(sem1Start).getTime();
  const e1 = new Date(sem1End).getTime();
  const s2 = new Date(sem2Start).getTime();
  const e2 = new Date(sem2End).getTime();
  const sem1Weeks = Math.max(0, Math.round((e1 - s1) / msPerWeek));
  const sem2Weeks = Math.max(0, Math.round((e2 - s2) / msPerWeek));
  return Math.max(1, sem1Weeks + sem2Weeks);
};

const Setup: React.FC<SetupProps> = ({
  institution,
  setInstitution,
  importConfiguration,
  clearAllData,
  showToast
}) => {
  const { t } = useLocalization();
  const [newSpecialization, setNewSpecialization] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const workingDaysOptions = [
    { key: 'Monday', label: t('days.monday') },
    { key: 'Tuesday', label: t('days.tuesday') },
    { key: 'Wednesday', label: t('days.wednesday') },
    { key: 'Thursday', label: t('days.thursday') },
    { key: 'Friday', label: t('days.friday') },
    { key: 'Saturday', label: t('days.saturday') },
    { key: 'Sunday', label: t('days.sunday') }
  ];

  const handleWorkingDaysChange = (day: string, checked: boolean) => {
    setInstitution({
      workingDays: checked
        ? [...institution.workingDays, day]
        : institution.workingDays.filter(d => d !== day)
    });
  };

  const handleLessonsPerDayChange = (newLessonsPerDay: number) => {
    const currentBreaks = institution.breakDurations;
    let newBreakDurations: number[];

    if (newLessonsPerDay > institution.lessonsPerDay) {
      const defaultBreak = 10;
      const additionalBreaks = Array(newLessonsPerDay - institution.lessonsPerDay).fill(defaultBreak);
      newBreakDurations = [...currentBreaks, ...additionalBreaks];
    } else if (newLessonsPerDay < institution.lessonsPerDay) {
      newBreakDurations = currentBreaks.slice(0, newLessonsPerDay - 1);
    } else {
      newBreakDurations = currentBreaks;
    }

    setInstitution({
      lessonsPerDay: newLessonsPerDay,
      breakDurations: newBreakDurations
    });
  };

  const handleBreakDurationChange = (index: number, duration: number) => {
    const newBreakDurations = [...institution.breakDurations];
    newBreakDurations[index] = duration;
    setInstitution({ breakDurations: newBreakDurations });
  };

  const handleAddSpecialization = () => {
    if (newSpecialization.trim() && !institution.specializations.includes(newSpecialization.trim())) {
      setInstitution({
        specializations: [...institution.specializations, newSpecialization.trim()]
      });
      setNewSpecialization('');
      showToast.showSuccess(
        t('toast.specializationAdded'), 
        t('toast.specializationAddedDesc', { name: newSpecialization.trim() })
      );
    }
  };

  const handleRemoveSpecialization = (specializationToRemove: string) => {
    setInstitution({
      specializations: institution.specializations.filter(spec => spec !== specializationToRemove)
    });
    showToast.showInfo(
      t('toast.specializationRemoved'), 
      t('toast.specializationRemovedDesc', { name: specializationToRemove })
    );
  };

  const handleSpecializationKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSpecialization();
    }
  };

  const handleSaveConfiguration = () => {
    setSaveStatus('saving');
    
    setTimeout(() => {
      setSaveStatus('saved');
      showToast.showSuccess(
        t('toast.configurationSaved'), 
        t('toast.configurationSavedDesc')
      );
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      showToast.showError(t('toast.invalidFileFormat'), t('toast.selectJsonFile'));
      return;
    }

    setIsImporting(true);
    try {
      await importConfiguration(file);
      showToast.showSuccess(t('toast.importSuccessful'), t('toast.importSuccessfulDesc'));
    } catch (error) {
      console.error('Import error:', error);
      showToast.showError(t('toast.importFailed'), t('toast.importFailedDesc'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleFileImport(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.name.endsWith('.json'));

    if (!jsonFile) {
      showToast.showError(t('toast.invalidFileFormat'), t('toast.selectJsonFile'));
      return;
    }

    await handleFileImport(jsonFile);
  };

  const handleClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
  };

  const calculateLessonTimes = () => {
    const times: { lesson: number; startTime: string; endTime: string; breakDuration?: number }[] = [];
    const [startHour, startMinute] = institution.startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMinute;

    for (let i = 1; i <= institution.lessonsPerDay; i++) {
      const startTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      currentMinutes += institution.lessonDuration;
      const endTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      
      const breakDuration = i < institution.lessonsPerDay ? institution.breakDurations[i - 1] : undefined;
      
      times.push({
        lesson: i,
        startTime,
        endTime,
        breakDuration
      });

      if (breakDuration) {
        currentMinutes += breakDuration;
      }
    }

    return times;
  };

  const lessonTimes = calculateLessonTimes();

  return (
    <div className="max-w-6xl mx-auto">
      <div 
        className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 relative ${
          isDragOver 
            ? 'border-[#03524f] border-dashed bg-green-50' 
            : 'border-gray-200'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-[#03524f] bg-opacity-10 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <FileText className="h-16 w-16 text-[#03524f] mx-auto mb-4" />
              <p className="text-xl font-semibold text-[#03524f]">{t('setup.dropFileToImport')}</p>
              <p className="text-[#03524f] opacity-80 mt-2">{t('setup.onlyJsonSupported')}</p>
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Building2 className="h-6 w-6 text-[#03524f] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{t('setup.title')}</h2>
                <p className="text-sm text-gray-500 truncate">
                  {t('setup.subtitle')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-[#03524f] border border-[#03524f] rounded-md hover:bg-[#024239] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? t('setup.importing') : t('setup.importConfig')}
              </button>
              
              <button
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('setup.clearAll')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Institution Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('setup.collegeName')}
            </label>
            <input
              type="text"
              value={institution.name}
              onChange={(e) => setInstitution({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] focus:border-[#03524f]"
              placeholder={t('setup.collegeNamePlaceholder')}
            />
          </div>

          {/* Specializations Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <BookOpen className="inline h-4 w-4 mr-1" />
              {t('setup.specializations')}
            </label>
            
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newSpecialization}
                onChange={(e) => setNewSpecialization(e.target.value)}
                onKeyPress={handleSpecializationKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f] focus:border-[#03524f]"
                placeholder={t('setup.specializationsPlaceholder')}
              />
              <button
                type="button"
                onClick={handleAddSpecialization}
                disabled={!newSpecialization.trim() || institution.specializations.includes(newSpecialization.trim())}
                className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('setup.addSpecialization')}
              </button>
            </div>

            {institution.specializations.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {institution.specializations.map((specialization, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center px-3 py-2 bg-[#03524f] bg-opacity-10 text-[#03524f] text-sm font-medium rounded-full"
                    >
                      <span>{specialization}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialization(specialization)}
                        className="ml-2 text-[#03524f] hover:text-[#024239] transition-colors"
                        title={t('setup.removeSpecialization')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {institution.specializations.length} {t('setup.specializationsConfigured')}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">
                  {t('setup.noSpecializations')}
                </p>
              </div>
            )}
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              {t('setup.workingDays')}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {workingDaysOptions.map((day) => (
                <label key={day.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={institution.workingDays.includes(day.key)}
                    onChange={(e) => handleWorkingDaysChange(day.key, e.target.checked)}
                    className="h-4 w-4 text-[#03524f] focus:ring-[#03524f] border-gray-300 rounded"
                    style={{
                      accentColor: '#03524f'
                    }}
                  />
                  <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Time Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                {t('setup.startTime')}
              </label>
              <input
                type="time"
                value={institution.startTime}
                onChange={(e) => setInstitution({ startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] focus:border-[#03524f]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('setup.lessonsPerDay')}
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleLessonsPerDayChange(Math.max(1, institution.lessonsPerDay - 1))}
                  className="p-1 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={institution.lessonsPerDay}
                  onChange={(e) => handleLessonsPerDayChange(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                />
                <button
                  type="button"
                  onClick={() => handleLessonsPerDayChange(Math.min(8, institution.lessonsPerDay + 1))}
                  className="p-1 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('setup.lessonDuration')}
              </label>
              <input
                type="number"
                min="45"
                max="90"
                step="5"
                value={institution.lessonDuration}
                onChange={(e) => setInstitution({ lessonDuration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] focus:border-[#03524f]"
              />
            </div>
          </div>

          {/* Break Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('setup.breakConfiguration')}
            </label>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {lessonTimes.map((time, index) => (
                  <div key={time.lesson} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-[#03524f] bg-opacity-10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-[#03524f]">{time.lesson}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {time.startTime} - {time.endTime}
                        </span>
                      </div>
                    </div>
                    
                    {time.breakDuration !== undefined && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Ընդմիջում:</span>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="5"
                          value={time.breakDuration || 10}
                          onChange={(e) => handleBreakDurationChange(index, parseInt(e.target.value) || 10)}
                          className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                        />
                        <span className="text-sm text-gray-500">րոպե</span>
                      </div>
                    )}
                    
                    {time.breakDuration === undefined && (
                      <span className="text-sm text-gray-400 italic">Ընդմիջում չկա</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Semester Date Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="inline h-4 w-4 mr-1" />
              {t('setup.semesterDates')}
            </label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Semester 1 */}
              <div>
                <div className="text-xs font-semibold text-[#03524f] uppercase tracking-wide mb-2">1-ին կիսամյակ</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Sem1 Start */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('setup.semester1Start')} <span className="text-gray-400">(ֆիքսված Սեպ. 1)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={parseMonthDay(institution.semester1StartDate || '').month}
                        onChange={(e) => {
                          const y = institution.semester1StartDate
                            ? parseInt(institution.semester1StartDate.split('-')[0])
                            : new Date().getFullYear();
                          const m = parseInt(e.target.value);
                          const d = parseMonthDay(institution.semester1StartDate || '').day;
                          const newDate = buildDate(y, m, d);
                          const s2 = institution.semester2StartDate || buildDate(y + 1, 1, 26);
                          const s2e = institution.semester2EndDate || buildDate(parseInt(s2.split('-')[0]), 6, 15);
                          setInstitution({ semester1StartDate: newDate });
                          if (institution.semester1EndDate) {
                            setInstitution({ academicWeeks: calculateAcademicWeeks(newDate, institution.semester1EndDate, s2, s2e) });
                          }
                        }}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                      >
                        {MONTHS_AM.map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={parseMonthDay(institution.semester1StartDate || buildDate(new Date().getFullYear(), 9, 1)).day}
                        onChange={(e) => {
                          const y = institution.semester1StartDate
                            ? parseInt(institution.semester1StartDate.split('-')[0])
                            : new Date().getFullYear();
                          const m = parseMonthDay(institution.semester1StartDate || '').month || 9;
                          const newDate = buildDate(y, m, parseInt(e.target.value) || 1);
                          const s2 = institution.semester2StartDate || buildDate(y + 1, 1, 26);
                          const s2e = institution.semester2EndDate || buildDate(parseInt(s2.split('-')[0]), 6, 15);
                          setInstitution({ semester1StartDate: newDate });
                          if (institution.semester1EndDate) {
                            setInstitution({ academicWeeks: calculateAcademicWeeks(newDate, institution.semester1EndDate, s2, s2e) });
                          }
                        }}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] text-center"
                      />
                    </div>
                  </div>
                  {/* Sem1 End */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('setup.semester1End')} <span className="text-gray-400">(ֆիքսված Դեկ. 26)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={parseMonthDay(institution.semester1EndDate || '').month || 12}
                        onChange={(e) => {
                          const s1 = institution.semester1StartDate || buildDate(new Date().getFullYear(), 9, 1);
                          const y = parseInt(s1.split('-')[0]);
                          const m = parseInt(e.target.value);
                          const d = parseMonthDay(institution.semester1EndDate || '').day || 26;
                          const newDate = buildDate(m >= 9 ? y : y + 1, m, d);
                          const s2 = institution.semester2StartDate || buildDate(y + 1, 1, 26);
                          const s2e = institution.semester2EndDate || buildDate(parseInt(s2.split('-')[0]), 6, 15);
                          setInstitution({ semester1EndDate: newDate, academicWeeks: calculateAcademicWeeks(s1, newDate, s2, s2e) });
                        }}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                      >
                        {MONTHS_AM.map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={parseMonthDay(institution.semester1EndDate || buildDate(new Date().getFullYear(), 12, 26)).day}
                        onChange={(e) => {
                          const s1 = institution.semester1StartDate || buildDate(new Date().getFullYear(), 9, 1);
                          const y = parseInt(s1.split('-')[0]);
                          const m = parseMonthDay(institution.semester1EndDate || '').month || 12;
                          const newDate = buildDate(m >= 9 ? y : y + 1, m, parseInt(e.target.value) || 1);
                          const s2 = institution.semester2StartDate || buildDate(y + 1, 1, 26);
                          const s2e = institution.semester2EndDate || buildDate(parseInt(s2.split('-')[0]), 6, 15);
                          setInstitution({ semester1EndDate: newDate, academicWeeks: calculateAcademicWeeks(s1, newDate, s2, s2e) });
                        }}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Semester 2 */}
              <div>
                <div className="text-xs font-semibold text-[#03524f] uppercase tracking-wide mb-2">2-րդ կիսամյակ</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Sem2 Start */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('setup.semester2Start')} <span className="text-gray-400">(ֆիքսված Հուն. 26)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={parseMonthDay(institution.semester2StartDate || '').month || 1}
                        onChange={(e) => {
                          const s1 = institution.semester1StartDate || buildDate(new Date().getFullYear(), 9, 1);
                          const y = parseInt(s1.split('-')[0]) + 1;
                          const m = parseInt(e.target.value);
                          const d = parseMonthDay(institution.semester2StartDate || '').day || 26;
                          const newDate = buildDate(y, m, d);
                          const s2e = institution.semester2EndDate || buildDate(y, 6, 15);
                          const s1e = institution.semester1EndDate || buildDate(parseInt(s1.split('-')[0]), 12, 26);
                          setInstitution({ semester2StartDate: newDate, academicWeeks: calculateAcademicWeeks(s1, s1e, newDate, s2e) });
                        }}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                      >
                        {MONTHS_AM.map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={parseMonthDay(institution.semester2StartDate || buildDate(new Date().getFullYear() + 1, 1, 26)).day}
                        onChange={(e) => {
                          const s1 = institution.semester1StartDate || buildDate(new Date().getFullYear(), 9, 1);
                          const y = parseInt(s1.split('-')[0]) + 1;
                          const m = parseMonthDay(institution.semester2StartDate || '').month || 1;
                          const newDate = buildDate(y, m, parseInt(e.target.value) || 1);
                          const s2e = institution.semester2EndDate || buildDate(y, 6, 15);
                          const s1e = institution.semester1EndDate || buildDate(parseInt(s1.split('-')[0]), 12, 26);
                          setInstitution({ semester2StartDate: newDate, academicWeeks: calculateAcademicWeeks(s1, s1e, newDate, s2e) });
                        }}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] text-center"
                      />
                    </div>
                  </div>
                  {/* Sem2 End */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('setup.semester2EndNote')} <span className="text-gray-400">(ֆիքսված Հուն. 15)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={parseMonthDay(institution.semester2EndDate || '').month || 6}
                        onChange={(e) => {
                          const s1 = institution.semester1StartDate || buildDate(new Date().getFullYear(), 9, 1);
                          const s2 = institution.semester2StartDate || buildDate(parseInt(s1.split('-')[0]) + 1, 1, 26);
                          const y = parseInt(s2.split('-')[0]);
                          const m = parseInt(e.target.value);
                          const d = parseMonthDay(institution.semester2EndDate || '').day || 15;
                          const newDate = buildDate(y, m, d);
                          const s1e = institution.semester1EndDate || buildDate(parseInt(s1.split('-')[0]), 12, 26);
                          setInstitution({ semester2EndDate: newDate, academicWeeks: calculateAcademicWeeks(s1, s1e, s2, newDate) });
                        }}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                      >
                        {MONTHS_AM.map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={parseMonthDay(institution.semester2EndDate || buildDate(new Date().getFullYear() + 1, 6, 15)).day}
                        onChange={(e) => {
                          const s1 = institution.semester1StartDate || buildDate(new Date().getFullYear(), 9, 1);
                          const s2 = institution.semester2StartDate || buildDate(parseInt(s1.split('-')[0]) + 1, 1, 26);
                          const y = parseInt(s2.split('-')[0]);
                          const m = parseMonthDay(institution.semester2EndDate || '').month || 6;
                          const newDate = buildDate(y, m, parseInt(e.target.value) || 1);
                          const s1e = institution.semester1EndDate || buildDate(parseInt(s1.split('-')[0]), 12, 26);
                          setInstitution({ semester2EndDate: newDate, academicWeeks: calculateAcademicWeeks(s1, s1e, s2, newDate) });
                        }}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03524f] text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Weeks summary */}
              <div className="bg-[#03524f] bg-opacity-5 border border-[#03524f] border-opacity-15 rounded-md p-3 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  <span className="font-medium text-[#03524f]">{t('setup.calculatedWeeks')}: </span>
                  <span className="font-bold text-[#03524f] text-sm">{institution.academicWeeks} {t('common.week')}</span>
                  {(() => {
                    const s1 = institution.semester1StartDate || buildDate(new Date().getFullYear(), 9, 1);
                    const s1e = institution.semester1EndDate || buildDate(new Date().getFullYear(), 12, 26);
                    const s2 = institution.semester2StartDate || buildDate(new Date().getFullYear() + 1, 1, 26);
                    const s2e = institution.semester2EndDate || buildDate(new Date().getFullYear() + 1, 6, 15);
                    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                    const sem1w = Math.max(0, Math.round((new Date(s1e).getTime() - new Date(s1).getTime()) / msPerWeek));
                    const sem2w = Math.max(0, Math.round((new Date(s2e).getTime() - new Date(s2).getTime()) / msPerWeek));
                    return (
                      <span className="ml-3 text-gray-500">
                        (1-ին՝ {sem1w} շ. + 2-րդ՝ {sem2w} շ.)
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Ձեռքով՝</span>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={institution.academicWeeks}
                    onChange={(e) => setInstitution({ academicWeeks: parseInt(e.target.value) || 1 })}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#03524f]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {t('setup.autoSaved')}
            </div>
            <button 
              onClick={handleSaveConfiguration}
              disabled={saveStatus === 'saving'}
              className="inline-flex items-center px-4 py-2 bg-[#03524f] text-white text-sm font-medium rounded-md hover:bg-[#024239] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#03524f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saveStatus === 'saving' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('setup.saving')}
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('setup.saved')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('setup.saveConfiguration')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{t('setup.clearAllData')}</h3>
                  <p className="text-sm text-gray-500">{t('setup.clearAllConfirm')}</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-6">
                {t('setup.clearAllQuestion')}
              </p>
              
              <ul className="text-sm text-gray-600 mb-6 space-y-1">
                {t('setup.clearAllItems').map((item: string, index: number) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleClearData}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  {t('setup.clearAllData')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Setup;