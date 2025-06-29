import React, { useEffect, useState } from 'react';
import { Undo2, X, Trash2, Edit, Plus } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';

export interface UndoAction {
  id: string;
  type: 'delete' | 'update' | 'create';
  entityType: 'group' | 'subject' | 'classroom' | 'teacher' | 'schedule';
  entityName: string;
  onUndo: () => void;
  onConfirm: () => void;
  duration?: number;
}

interface UndoToastProps {
  action: UndoAction;
  onRemove: (id: string) => void;
}

const UndoToast: React.FC<UndoToastProps> = ({ action, onRemove }) => {
  const { t } = useLocalization();
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = action.duration || 5000;

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 100));
        return Math.max(0, newProgress);
      });
    }, 100);

    // Auto confirm after duration
    const timer = setTimeout(() => {
      action.onConfirm();
      handleRemove();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(action.id);
    }, 300);
  };

  const handleUndo = () => {
    action.onUndo();
    handleRemove();
  };

  const getIcon = () => {
    switch (action.type) {
      case 'delete':
        return <Trash2 className="h-5 w-5 text-red-600" />;
      case 'update':
        return <Edit className="h-5 w-5 text-blue-600" />;
      case 'create':
        return <Plus className="h-5 w-5 text-green-600" />;
      default:
        return <Edit className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (action.type) {
      case 'delete':
        return 'bg-red-50 border-red-200';
      case 'update':
        return 'bg-blue-50 border-blue-200';
      case 'create':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getProgressColor = () => {
    switch (action.type) {
      case 'delete':
        return 'bg-red-500';
      case 'update':
        return 'bg-blue-500';
      case 'create':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getTextColor = () => {
    switch (action.type) {
      case 'delete':
        return 'text-red-900';
      case 'update':
        return 'text-blue-900';
      case 'create':
        return 'text-green-900';
      default:
        return 'text-blue-900';
    }
  };

  const getActionText = () => {
    const entityType = t(`undo.${action.entityType}`);
    const actionType = t(`undo.${action.type}d`);
    return `${entityType} "${action.entityName}" ${actionType}`;
  };

  const getUndoText = () => {
    switch (action.type) {
      case 'delete':
        return t('undo.undoDelete');
      case 'update':
        return t('undo.undoUpdate');
      case 'create':
        return t('undo.undoCreate');
      default:
        return t('undo.undo');
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isRemoving ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        max-w-sm w-full ${getBackgroundColor()} border rounded-lg shadow-lg mb-3 overflow-hidden
      `}
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className={`h-full transition-all duration-100 ease-linear ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${getTextColor()}`}>
              {getActionText()}
            </p>
          </div>
          <div className="ml-4 flex space-x-2">
            <button
              onClick={handleUndo}
              className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-md ${
                action.type === 'delete' 
                  ? 'bg-red-100 text-red-800'
                  : action.type === 'create'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              <Undo2 className="h-3 w-3 mr-1" />
              {t('undo.undo')}
            </button>
            <button
              onClick={handleRemove}
              className={`inline-flex ${getTextColor()}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface UndoToastContainerProps {
  actions: UndoAction[];
  onRemoveAction: (id: string) => void;
}

export const UndoToastContainer: React.FC<UndoToastContainerProps> = ({ actions, onRemoveAction }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {actions.map((action) => (
        <UndoToast key={action.id} action={action} onRemove={onRemoveAction} />
      ))}
    </div>
  );
};