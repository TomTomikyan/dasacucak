/**
 * App - Գլխավոր հավելվածի կոմպոնենտ
 *
 * Սա հավելվածի կենտրոնական կոմպոնենտն է, որը կառավարում է՝
 * - Էկրանների փոխարկումը (Setup, Classrooms, Subjects, Groups, Teachers, Overview, Schedule)
 * - Տվյալների ընդհանուր հոսքը բոլոր կոմպոնենտներին
 * - Ծանուցումների ցուցադրումը (Toast notifications)
 * - Կոնֆիգուրացիայի արտահանում/ներմուծում
 *
 * ԷԿՐԱՆՆԵՐԻ ՀԵՐԹԱԿԱՆՈՒԹՅՈՒՆ՝
 * 1. Setup - Հաստատության հիմնական կարգավորումներ
 * 2. Classrooms - Սենյակների կարգավորում
 * 3. Subjects - Առարկաների ավելացում
 * 4. Groups - Խմբերի ստեղծում և առարկաների հատկացում
 * 5. Teachers - Ուսուցիչների ավելացում և հասանելի ժամերի կարգավորում
 * 6. Overview - Ընդհանուր տեսարան և կարգավորումների վերանայում
 * 7. Schedule - Ժամանակացույցի գեներացում և դիտում
 */

import React, { useState } from 'react';
import Layout from './components/Layout';
import Setup from './components/Setup';
import ClassGroups from './components/ClassGroups';
import Subjects from './components/Subjects';
import Classrooms from './components/Classrooms';
import Teachers from './components/Teachers';
import Overview from './components/Overview';
import Schedule from './components/Schedule';
import { ToastContainer } from './components/Toast';
import { useScheduleData } from './hooks/useScheduleData';
import { useToast } from './hooks/useToast';
import { useLocalization } from './hooks/useLocalization';

function App() {
  // Ակտիվ էկրանի վիճակ - որոշում է թե որ էկրանն է ցուցադրվում
  const [activeTab, setActiveTab] = useState('setup');

  // Տեղայնացում - ներկայումս միայն հայերեն
  const { t } = useLocalization();
  // Տվյալների հուկ - կառավարում է բոլոր տվյալները և ապահովում localStorage-ում պահպանում
  // Տվյալների այս հուկը տրամադրում է բոլոր CRUD գործողությունները (Create, Read, Update, Delete)
  const {
    institution,           // Հաստատության տվյալներ
    setInstitution,        // Թարմացնել հաստատությունը
    classGroups,           // Խմբերի ցանկ
    setClassGroups,        // Թարմացնել խմբերը
    addClassGroup,         // Ավելացնել նոր խումբ
    updateClassGroupSubjects, // Թարմացնել խմբի առարկաները
    subjects,              // Առարկաների ցանկ
    setSubjects,           // Թարմացնել առարկաները
    addSubject,            // Ավելացնել նոր առարկա
    classrooms,            // Սենյակների ցանկ
    setClassrooms,         // Թարմացնել սենյակները
    addClassroom,          // Ավելացնել նոր սենյակ
    generateClassrooms,    // Ավտոմատ ստեղծել սենյակներ
    teachers,              // Ուսուցիչների ցանկ
    setTeachers,           // Թարմացնել ուսուցիչներին
    addTeacher,            // Ավելացնել նոր ուսուցիչ
    schedule,              // Ժամանակացույց
    setSchedule,           // Թարմացնել ժամանակացույցը
    generateCollegeGroups, // Ավտոմատ ստեղծել քոլեջի խմբեր
    exportConfiguration,   // Արտահանել կոնֆիգուրացիան JSON ֆայլ
    importConfiguration,   // Ներմուծել կոնֆիգուրացիան JSON ֆայլից
    clearAllData,          // Մաքրել բոլոր տվյալները
  } = useScheduleData();

  // Ծանուցումների հուկ - ցուցադրում է հաջողության/սխալի հաղորդագրություններ
  const {
    toasts,         // Ակտիվ ծանուցումների ցանկ
    removeToast,    // Հեռացնել ծանուցում
    showSuccess,    // Ցուցադրել հաջողության հաղորդագրություն
    showError,      // Ցուցադրել սխալի հաղորդագրություն
    showWarning,    // Ցուցադրել նախազգուշացման հաղորդագրություն
    showInfo,       // Ցուցադրել տեղեկատվական հաղորդագրություն
  } = useToast();

  // ԱՐՏԱՀԱՆՄԱՆ ՄՇԱԿՈՒՄ - Պահպանել կոնֆիգուրացիան և ցուցադրել ծանուցում
  const handleExportConfiguration = () => {
    try {
      exportConfiguration();
      showSuccess(t('toast.exportSuccessful'), t('toast.exportSuccessfulDesc'));
    } catch (error) {
      showError(t('toast.exportFailed'), t('toast.exportFailedDesc'));
    }
  };

  // ՆԵՐՄՈՒԾՄԱՆ ՄՇԱԿՈՒՄ - Բեռնել կոնֆիգուրացիան և ցուցադրել ծանուցում
  const handleImportConfiguration = async (file: File) => {
    try {
      await importConfiguration(file);
      showSuccess(t('toast.importSuccessful'), t('toast.importSuccessfulDesc'));
    } catch (error) {
      showError(t('toast.importFailed'), t('toast.importFailedDesc'));
    }
  };

  // ՏՎՅԱԼՆԵՐԻ ՄԱՔՐՄԱՆ ՄՇԱԿՈՒՄ - Ջնջել բոլոր տվյալները և ցուցադրել ծանուցում
  const handleClearAllData = () => {
    try {
      clearAllData();
      showSuccess(t('toast.dataCleared'), t('toast.dataClearedDesc'));
    } catch (error) {
      showError(t('toast.exportFailed'), t('toast.exportFailedDesc'));
    }
  };

  // ՑՈՒՑԱԴՐԵԼ ԲՈՎԱՆԴԱԿՈՒԹՅՈՒՆԸ - Ակտիվ էկրանին համապատասխան կոմպոնենտի ցուցադրում
  // Յուրաքանչյուր կոմպոնենտ ստանում է անհրաժեշտ տվյալները և ֆունկցիաները որպես props
  const renderContent = () => {
    switch (activeTab) {
      case 'setup':
        return (
          <Setup 
            institution={institution} 
            setInstitution={setInstitution}
            importConfiguration={handleImportConfiguration}
            clearAllData={handleClearAllData}
            showToast={{ showSuccess, showError, showWarning, showInfo }}
          />
        );
      case 'classrooms':
        return (
          <Classrooms
            classrooms={classrooms}
            addClassroom={addClassroom}
            setClassrooms={setClassrooms}
            generateClassrooms={generateClassrooms}
            subjects={subjects}
            showToast={{ showSuccess, showError, showWarning, showInfo }}
          />
        );
      case 'subjects':
        return (
          <Subjects
            subjects={subjects}
            addSubject={addSubject}
            setSubjects={setSubjects}
            classGroups={classGroups}
            teachers={teachers}
            showToast={{ showSuccess, showError, showWarning, showInfo }}
          />
        );
      case 'groups':
        return (
          <ClassGroups
            classGroups={classGroups}
            addClassGroup={addClassGroup}
            setClassGroups={setClassGroups}
            updateClassGroupSubjects={updateClassGroupSubjects}
            institution={institution}
            generateCollegeGroups={generateCollegeGroups}
            subjects={subjects}
            classrooms={classrooms}
            showToast={{ showSuccess, showError, showWarning, showInfo }}
          />
        );
      case 'teachers':
        return (
          <Teachers
            teachers={teachers}
            addTeacher={addTeacher}
            setTeachers={setTeachers}
            subjects={subjects}
            classrooms={classrooms}
            classGroups={classGroups}
            institution={institution}
            showToast={{ showSuccess, showError, showWarning, showInfo }}
          />
        );
      case 'overview':
        return (
          <Overview
            institution={institution}
            setInstitution={setInstitution}
            classGroups={classGroups}
            setClassGroups={setClassGroups}
            subjects={subjects}
            setSubjects={setSubjects}
            classrooms={classrooms}
            setClassrooms={setClassrooms}
            teachers={teachers}
            setTeachers={setTeachers}
            schedule={schedule}
            exportConfiguration={handleExportConfiguration}
            importConfiguration={handleImportConfiguration}
            clearAllData={handleClearAllData}
            showToast={{ showSuccess, showError, showWarning, showInfo }}
          />
        );
      case 'schedule':
        return (
          <Schedule
            schedule={schedule}
            setSchedule={setSchedule}
            institution={institution}
            classGroups={classGroups}
            subjects={subjects}
            teachers={teachers}
            classrooms={classrooms}
            showToast={{ showSuccess, showError, showWarning, showInfo }}
          />
        );
      default:
        return (
          <Setup 
            institution={institution} 
            setInstitution={setInstitution}
            importConfiguration={handleImportConfiguration}
            clearAllData={handleClearAllData}
            showToast={{ showSuccess, showError, showWarning, showInfo }}
          />
        );
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </>
  );
}

export default App;