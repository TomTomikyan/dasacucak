import React, { useEffect, useState } from 'react';
import { Undo2, X, Trash2, Edit, Plus } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';

// Գործողությունը հետարկելու (Undo Action) տվյալների կառուցվածքը (Interface)
export interface UndoAction {
  id: string;
  type: 'delete' | 'update' | 'create';
  entityType: 'group' | 'subject' | 'classroom' | 'teacher' | 'schedule';
  entityName: string;
  onUndo: () => void;      // Ֆունկցիա, որը կանչվում է հետարկելու ժամանակ
  onConfirm: () => void;   // Ֆունկցիա, որը կանչվում է ժամանակը սպառվելուց հետո (հաստատում)
  duration?: number;       // Ծանուցման տևողությունը միլիվայրկյաններով
}

// UndoToast բաղադրիչի Props-երի կառուցվածքը
interface UndoToastProps {
  action: UndoAction;
  onRemove: (id: string) => void;
}

// Առանձին հետարկման ծանուցման (Toast) բաղադրիչը
const UndoToast: React.FC<UndoToastProps> = ({ action, onRemove }) => {
  const { t } = useLocalization();
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(100); // Ժամանակի ընթացքի տոկոսը (Progress bar)

  const duration = action.duration || 5000;

  useEffect(() => {
    // Ծանուցման հայտնվելու անիմացիան (Animate in)
    setTimeout(() => setIsVisible(true), 100);

    // Ժամանակի ընթացքի անիմացիան (յուրաքանչյուր 100 մվ-ը մեկ թարմացնում է տոկոսը)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 100));
        return Math.max(0, newProgress);
      });
    }, 100);

    // Ավտոմատ հաստատում (onConfirm) սահմանված ժամանակը լրանալուց հետո
    const timer = setTimeout(() => {
      action.onConfirm();
      handleRemove();
    }, duration);

    // Մաքրման (Cleanup) ֆունկցիա
    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, []);

  // Ծանուցումը էկրանից հեռացնող ֆունկցիա (անիմացիայով)
  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(action.id);
    }, 300);
  };

  // Հետարկման կոճակը սեղմելու ֆունկցիա
  const handleUndo = () => {
    action.onUndo();
    handleRemove();
  };

  // Վերադարձնում է համապատասխան պատկերակը (Icon) ըստ գործողության տեսակի
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

  // Վերադարձնում է ֆոնի գույնի դասերը (CSS classes) ըստ գործողության տեսակի
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

  // Վերադարձնում է progress bar-ի գույնը ըստ գործողության տեսակի
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

  // Վերադարձնում է տեքստի գույնը ըստ գործողության տեսակի
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

  // Կառուցում է գործողության մասին տեղեկատվական տեքստը լոկալիզացիայով
  const getActionText = () => {
    const entityType = t(`undo.${action.entityType}`);
    const actionType = t(`undo.${action.type}d`);
    return `${entityType} "${action.entityName}" ${actionType}`;
  };

  // Վերադարձնում է հետարկման կոճակի տեքստը (չօգտագործված օժանդակ մեթոդ)
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
      {/* Ժամանակի ընթացքի գիծը (Progress bar) */}
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
            {/* Հետարկման կոճակ */}
            <button
              onClick={handleUndo}
              className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                action.type === 'delete' 
                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                  : action.type === 'create'
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              }`}
            >
              <Undo2 className="h-3 w-3 mr-1" />
              {t('undo.undo')}
            </button>
            {/* Ծանուցումը փակելու կոճակ (առանց հետարկելու) */}
            <button
              onClick={handleRemove}
              className={`inline-flex ${getTextColor()} hover:opacity-75 transition-opacity`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// UndoToastContainerProps բաղադրիչի Props-երի կառուցվածքը
interface UndoToastContainerProps {
  actions: UndoAction[];
  onRemoveAction: (id: string) => void;
}

// Ծանուցումների կոնտեյներ, որը դասավորում է ակտիվ Toast-երը էկրանի անկյունում
export const UndoToastContainer: React.FC<UndoToastContainerProps> = ({ actions, onRemoveAction }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {actions.map((action) => (
        <UndoToast key={action.id} action={action} onRemove={onRemoveAction} />
      ))}
    </div>
  );
};