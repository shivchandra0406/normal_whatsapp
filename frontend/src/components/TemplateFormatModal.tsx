import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface TemplateFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFormatSelect: (format: string) => void;
}

const formats = [
  {
    id: 'xlsx',
    name: 'Excel (XLSX)',
    description: 'Spreadsheet format compatible with Microsoft Excel, Google Sheets, etc.',
    icon: '📊',
    color: 'bg-green-50 hover:bg-green-100 border-green-200'
  },
  {
    id: 'csv',
    name: 'CSV File',
    description: 'Simple text format that can be opened in any spreadsheet program or text editor',
    icon: '📝',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
  }
];

export const TemplateFormatModal = ({ isOpen, onClose, onFormatSelect }: TemplateFormatModalProps) => {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        {/* Modal */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-xl">
              <Dialog.Title className="text-xl font-semibold mb-4">
                Choose Template Format
              </Dialog.Title>

              <div className="space-y-4">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => {
                      onFormatSelect(format.id);
                      onClose();
                    }}
                    className={`w-full p-4 rounded-lg border ${format.color} transition-colors flex items-start space-x-4 text-left`}
                  >
                    <span className="text-2xl">{format.icon}</span>
                    <div>
                      <h3 className="font-medium">{format.name}</h3>
                      <p className="text-sm text-gray-600">{format.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
};
