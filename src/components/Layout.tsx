import React, { ReactNode } from 'react';
import { GraduationCap, Calendar, Users, BookOpen, MapPin, Settings, Eye } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { t } = useLocalization();

  const tabs = [
    { id: 'setup', label: t('navigation.setup'), icon: Settings },
    { id: 'subjects', label: t('navigation.subjects'), icon: BookOpen },
    { id: 'classrooms', label: t('navigation.classrooms'), icon: MapPin },
    { id: 'groups', label: t('navigation.groups'), icon: Users },
    { id: 'teachers', label: t('navigation.teachers'), icon: GraduationCap },
    { id: 'overview', label: t('navigation.overview'), icon: Eye },
    { id: 'schedule', label: t('navigation.schedule'), icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-8 w-8 text-[#03524f]" />
              <h1 className="text-xl font-bold text-gray-900">Քոլեջի Ժամանակացույցի Ստեղծիչ</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#03524f] text-[#03524f]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;