import React, { useState, useRef } from 'react';
// Lucide-react գրադարանից ներմուծում ենք անհրաժեշտ սիրուն պատկերակները (icons)
import { Save, Building2, Clock, Calendar, Plus, Minus, Download, Trash2, CheckCircle, FileText } from 'lucide-react';
import { Institution } from '../types';
import { useLocalization } from '../hooks/useLocalization';

// Սահմանում ենք Toast (ծանուցումների) ֆունկցիաների տիպերը
interface ToastFunctions {
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, duration?: number) => void;
  showWarning: (title: string, message: string, duration?: number) => void;
  showInfo: (title: string, message: string, duration?: number) => void;
}

// Սահմանում ենք, թե ինչ տվյալներ (props) պետք է այս կոմպոնենտը ստանա դրսից
interface SetupProps {
  institution: Institution; // Բուհի/դպրոցի ընթացիկ կարգավորումների օբյեկտը
  setInstitution: (institution: Partial<Institution>) => void; // Կարգավորումները փոխելու ֆունկցիան
  importConfiguration: (file: File) => Promise<void>; // JSON ֆայլից տվյալներ ներմուծելու ֆունկցիան
  clearAllData: () => void; // Բոլոր տվյալները համակարգից ջնջելու ֆունկցիան
  showToast: ToastFunctions; // Էկրանին ծանուցումներ ցույց տալու օբյեկտը
}

const Setup: React.FC<SetupProps> = ({
  institution,
  setInstitution,
  importConfiguration,
  clearAllData,
  showToast
}) => {
  // Լոկալիզացիայի (բազմալեզվության) հուքը
  const { t } = useLocalization();
  
  // Լոկալ վիճակներ (States) էջի ինտերֆեյսը կառավարելու համար
  const [isImporting, setIsImporting] = useState(false); // Ցույց է տալիս՝ ֆայլի իմպորտ գնո՞ւմ է, թե ոչ
  const [showClearConfirm, setShowClearConfirm] = useState(false); // Մոդալ պատուհանի բաց/փակ լինելը
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle'); // Պահպանման կոճակի կարգավիճակը
  const [isDragOver, setIsDragOver] = useState(false); // Արդյո՞ք ֆայլը պահել են էկրանի վրա (Drag & Drop)
  
  // Ռեֆերենս՝ թաքնված input-ին հասնելու համար (ֆայլ ընտրելիս)
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Շաբաթվա օրերի ցուցակը՝ թարգմանված տարբերակներով
  const workingDaysOptions = [
    { key: 'Monday', label: t('days.monday') },
    { key: 'Tuesday', label: t('days.tuesday') },
    { key: 'Wednesday', label: t('days.wednesday') },
    { key: 'Thursday', label: t('days.thursday') },
    { key: 'Friday', label: t('days.friday') },
    { key: 'Saturday', label: t('days.saturday') },
    { key: 'Sunday', label: t('days.sunday') }
  ];

  // Աշխատանքային օրերը փոխելու ֆունկցիա (երբ checkbox-ը նշում կամ հանում ենք)
  const handleWorkingDaysChange = (day: string, checked: boolean) => {
    setInstitution({
      workingDays: checked
        ? [...institution.workingDays, day] // Եթե նշվել է, ավելացնում ենք զանգվածի մեջ
        : institution.workingDays.filter(d => d !== day) // Եթե հանվել է, ջնջում ենք զանգվածից
    });
  };

  // Օրական դասերի քանակը փոխելու կարևոր ֆունկցիան
  const handleLessonsPerDayChange = (newLessonsPerDay: number) => {
    const currentBreaks = institution.breakDurations;
    let newBreakDurations: number[];

    // Եթե դասերի քանակը ավելացնում ենք
    if (newLessonsPerDay > institution.lessonsPerDay) {
      const defaultBreak = 10; // Նոր դասամիջոցների լռելյայն տևողությունը՝ 10 րոպե
      // Հաշվում ենք քանի նոր դասամիջոց է պետք ու ստեղծում ենք զանգված
      const additionalBreaks = Array(newLessonsPerDay - institution.lessonsPerDay).fill(defaultBreak);
      newBreakDurations = [...currentBreaks, ...additionalBreaks]; // Միացնում ենք հին ու նոր դասամիջոցները
    } 
    // Եթե դասերի քանակը պակասեցնում ենք
    else if (newLessonsPerDay < institution.lessonsPerDay) {
      // Կտրում ենք զանգվածը, որպեսզի ավելորդ դասամիջոցները ջնջվեն
      newBreakDurations = currentBreaks.slice(0, newLessonsPerDay - 1);
    } else {
      newBreakDurations = currentBreaks;
    }

    // Թարմացնում ենք գլխավոր օբյեկտը
    setInstitution({
      lessonsPerDay: newLessonsPerDay,
      breakDurations: newBreakDurations
    });
  };

  // Կոնկրետ դասամիջոցի տևողությունը փոխելու ֆունկցիա
  const handleBreakDurationChange = (index: number, duration: number) => {
    const newBreakDurations = [...institution.breakDurations];
    newBreakDurations[index] = duration; // Փոխում ենք միայն տվյալ ինդեքսի արժեքը
    setInstitution({ breakDurations: newBreakDurations });
  };

  // Կոնֆիգուրացիան ձեռքով պահպանելու իմիտացիա (Animation-ի համար)
  const handleSaveConfiguration = () => {
    setSaveStatus('saving'); // Միացնում ենք loading էֆեկտը
    
    setTimeout(() => {
      setSaveStatus('saved'); // Ցույց ենք տալիս, որ պահպանվեց
      showToast.showSuccess(
        t('toast.configurationSaved'), 
        t('toast.configurationSavedDesc')
      );
      setTimeout(() => setSaveStatus('idle'), 2000); // 2 վայրկյան անց վերադառնում ենք սովորական տեսքին
    }, 500);
  };

  // Երբ սեղմում ենք «Ներմուծել», ծրագրային կերպով սեղմում է թաքնված ֆայլի input-ի վրա
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Ֆայլի ներմուծման հիմնական տրամաբանությունը
  const handleFileImport = async (file: File) => {
    // Ստուգում ենք՝ արդյո՞ք ֆայլը .json ձևաչափի է
    if (!file.name.endsWith('.json')) {
      showToast.showError(t('toast.invalidFileFormat'), t('toast.selectJsonFile'));
      return;
    }

    setIsImporting(true);
    try {
      await importConfiguration(file); // Կանչում ենք դրսից եկած ներմուծման ֆունկցիան
      showToast.showSuccess(t('toast.importSuccessful'), t('toast.importSuccessfulDesc'));
    } catch (error) {
      console.error('Import error:', error);
      showToast.showError(t('toast.importFailed'), t('toast.importFailedDesc'));
    } finally {
      setIsImporting(false);
    }
  };

  // Երբ ֆայլը ընտրում ենք սովորական կոճակով
  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleFileImport(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Մաքրում ենք input-ը, որ նույն ֆայլը նորից կարողանանք ընտրել
    }
  };

  // Drag and Drop (Մկնիկով ֆայլը բերել և էկրանին գցելու) մշակողներ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true); // Միացնում է էկրանի կանաչ շերտը
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false); // Անջատում է կանաչ շերտը, եթե մկնիկը հեռացավ
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

  // Բոլոր տվյալները ջնջելու ֆունկցիա
  const handleClearData = () => {
    clearAllData(); // Ջնջում է ամեն ինչ
    setShowClearConfirm(false); // Փակում է հաստատման մոդալ պատուհանը
  };

  // Մաթեմատիկական հաշվարկ՝ դասերի սկզբի և ավարտի ժամերը որոշելու համար
  const calculateLessonTimes = () => {
    const times: { lesson: number; startTime: string; endTime: string; breakDuration?: number }[] = [];
    // Տրոհում ենք սկզբնական ժամը (օրինակ "09:00" -> ժամ: 9, րոպե: 0)
    const [startHour, startMinute] = institution.startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMinute; // Վերածում ենք ընդհանուր րոպեների

    // Ցիկլով անցնում ենք բոլոր դասերով
    for (let i = 1; i <= institution.lessonsPerDay; i++) {
      // Ստեղծում ենք սկզբի ժամի տեքստը (ձևաչափը՝ 09:00)
      const startTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      
      currentMinutes += institution.lessonDuration; // Գումարում ենք դասի տևողությունը
      
      // Ստեղծում ենք ավարտի ժամի տեքստը
      const endTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      
      // Որոշում ենք՝ արդյո՞ք այս դասից հետո դասամիջոց կա (վերջին դասից հետո չկա)
      const breakDuration = i < institution.lessonsPerDay ? institution.breakDurations[i - 1] : undefined;
      
      times.push({
        lesson: i,
        startTime,
        endTime,
        breakDuration
      });

      // Եթե դասամիջոց կա, դրա րոպեները նույնպես գումարում ենք ընդհանուր ժամանակին
      if (breakDuration) {
        currentMinutes += breakDuration;
      }
    }

    return times; // Վերադարձնում ենք բոլոր դասերի ժամերի զանգվածը
  };

  // Կանչում ենք հաշվարկի ֆունկցիան
  const lessonTimes = calculateLessonTimes();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Գլխավոր բլոկը, որն ունի նաև Drag and Drop իրադարձությունները */}
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
        {/* Drag Overlay - Սա հայտնվում է միայն այն պահին, երբ ֆայլը մկնիկով բերում ենք էջի վրա */}
        {isDragOver && (
          <div className="absolute inset-0 bg-[#03524f] bg-opacity-10 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <FileText className="h-16 w-16 text-[#03524f] mx-auto mb-4" />
              <p className="text-xl font-semibold text-[#03524f]">{t('setup.dropFileToImport')}</p>
              <p className="text-[#03524f] opacity-80 mt-2">{t('setup.onlyJsonSupported')}</p>
            </div>
          </div>
        )}

        {/* Էջի Վերնագիրը (Header) և Գլխավոր Կոճակները */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Building2 className="h-6 w-6 text-[#03524f] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{t('setup.title')}</h2>
                <p className="text-sm text-gray-500 truncate">{t('setup.subtitle')}</p>
              </div>
            </div>
            
            {/* Իմպորտի և Մաքրման կոճակները */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-[#03524f] border border-[#03524f] rounded-md hover:bg-[#024239] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
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

          {/* Աշխատանքային օրերի ընտրության բաժին (Checkboxes) */}
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
                    style={{ accentColor: '#03524f' }}
                  />
                  <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Ժամանակային Կարգավորումներ (Դասի սկիզբ, քանակ, տևողություն) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Դասերի սկիզբը */}
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

            {/* Դասերի քանակը օրական (+ և - կոճակներով) */}
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

            {/* Մեկ դասի տևողությունը րոպեներով */}
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

          {/* Դասամիջոցների Դինամիկ Ցուցակ (Break Configuration) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('setup.breakConfiguration')}
            </label>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {/* Քարտեզագրում (map) ենք հաշվարկված ժամերը և ցույց տալիս էկրանին */}
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
                    
                    {/* Եթե այս դասից հետո կա ընդմիջում, ապա ցույց տալ տևողությունը փոխելու input-ը */}
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
                    
                    {/* Եթե վերջին դասն է և ընդմիջում չկա */}
                    {time.breakDuration === undefined && (
                      <span className="text-sm text-gray-400 italic">Ընդմիջում չկա</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Էջի Ներքևի Մասը (Footer) - Պահպանման կոճակով */}
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
              {/* Կոճակի տեքստի դինամիկ փոփոխություն՝ կախված saveStatus-ից */}
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

      {/* Թաքնված input ֆայլերի ներբեռնման համար */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Հաստատման Մոդալ Պատուհան (Clear Confirmation Modal) */}
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
              
              {/* Ցուցակ, թե ինչեր են ջնջվելու */}
              <ul className="text-sm text-gray-600 mb-6 space-y-1">
                {t('setup.clearAllItems').map((item: string, index: number) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              {/* Մոդալի կոճակները */}
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