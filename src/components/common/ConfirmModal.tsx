import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'নিশ্চিত করুন',
  cancelLabel = 'বাতিল',
  isDestructive = true,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-[#FAF7F2] rounded-2xl max-w-md w-full border border-[#DFD3C2] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-full bg-red-100 text-red-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif-bn text-lg font-bold text-[#2C2621]">
              {title}
            </h3>
            <p className="font-serif-bn text-sm text-[#6F6052] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[#E8DEC8]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg font-serif-bn text-sm border border-[#D5C7B7] text-[#5A4B3D] hover:bg-[#F2E8DC] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg font-serif-bn text-sm text-white transition-colors disabled:opacity-50 ${
              isDestructive
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-[#8C4A32] hover:bg-[#723925]'
            }`}
          >
            {isProcessing ? 'প্রক্রিয়াধীন...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConfirmationModal = ConfirmModal;
