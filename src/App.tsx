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
  const [activeTab, setActiveTab] = useState('setup');
  const { t } = useLocalization();
  const {
    institution,
    setInstitution,
    classGroups,
    setClassGroups,
    addClassGroup,
    updateClassGroupSubjects,
    subjects,
    setSubjects,
    addSubject,
    classrooms,
    setClassrooms,
    addClassroom,
    generateClassrooms,
    teachers,
    setTeachers,
    addTeacher,
    schedule,
    setSchedule,
    generateCollegeGroups,
    exportConfiguration,
    importConfiguration,
    clearAllData,
  } = useScheduleData();

  const {
    toasts,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  } = useToast();

  // Enhanced functions with toast notifications
  const handleExportConfiguration = () => {
    try {
      exportConfiguration();
      showSuccess(t('toast.exportSuccessful'), t('toast.exportSuccessfulDesc'));
    } catch (error) {
      showError(t('toast.exportFailed'), t('toast.exportFailedDesc'));
    }
  };

  const handleImportConfiguration = async (file: File) => {
    try {
      await importConfiguration(file);
      showSuccess(t('toast.importSuccessful'), t('toast.importSuccessfulDesc'));
    } catch (error) {
      showError(t('toast.importFailed'), t('toast.importFailedDesc'));
    }
  };

  const handleClearAllData = () => {
    try {
      clearAllData();
      showSuccess(t('toast.dataCleared'), t('toast.dataClearedDesc'));
    } catch (error) {
      showError(t('toast.exportFailed'), t('toast.exportFailedDesc'));
    }
  };

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