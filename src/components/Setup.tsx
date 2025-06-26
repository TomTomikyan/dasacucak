import React, { useState, useRef } from 'react';
import { Save, Building2, Clock, Calendar, Plus, Minus, X, BookOpen, Upload, Trash2, CheckCircle } from 'lucide-react';
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

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      await importConfiguration(file);
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('setup.title')}</h2>
                <p className="text-sm text-gray-500">
                  {t('setup.subtitle')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? t('setup.importing') : t('setup.importConfig')}
              </button>
              
              <button
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('setup.specializationsPlaceholder')}
              />
              <button
                type="button"
                onClick={handleAddSpecialization}
                disabled={!newSpecialization.trim() || institution.specializations.includes(newSpecialization.trim())}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                    >
                      <span>{specialization}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialization(specialization)}
                        className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
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
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{time.lesson}</span>
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
                          className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Academic Weeks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('setup.academicWeeks')}
            </label>
            <input
              type="number"
              min="30"
              max="52"
              value={institution.academicWeeks}
              onChange={(e) => setInstitution({ academicWeeks: parseInt(e.target.value) })}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="40"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('setup.academicWeeksNote')}
            </p>
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
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        onChange={handleFileImport}
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