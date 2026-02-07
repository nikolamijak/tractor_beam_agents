'use client';

import { useState, FormEvent } from 'react';

interface DynamicWorkflowFormProps {
  workflow: {
    name: string;
    requiredInputs: string[];
    optionalInputs: string[];
  };
  onSubmit: (values: Record<string, string>) => void;
  loading?: boolean;
}

export function DynamicWorkflowForm({ workflow, onSubmit, loading }: DynamicWorkflowFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const getFieldType = (fieldName: string): 'text' | 'textarea' | 'select' => {
    if (
      fieldName.includes('Content') ||
      fieldName.includes('Description') ||
      fieldName.includes('Criteria') ||
      fieldName.includes('Prompt')
    ) {
      return 'textarea';
    }
    if (fieldName === 'technology') return 'select';
    return 'text';
  };

  const formatLabel = (fieldName: string): string => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, (str) => str.toUpperCase());
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const renderField = (fieldName: string, required: boolean) => {
    const type = getFieldType(fieldName);
    const label = formatLabel(fieldName);
    const id = `field-${fieldName}`;

    if (type === 'textarea') {
      return (
        <div key={fieldName} className="mb-4">
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id={id}
            value={values[fieldName] || ''}
            onChange={(e) => setValues({ ...values, [fieldName]: e.target.value })}
            required={required}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </div>
      );
    }

    if (type === 'select' && fieldName === 'technology') {
      return (
        <div key={fieldName} className="mb-4">
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            id={id}
            value={values[fieldName] || ''}
            onChange={(e) => setValues({ ...values, [fieldName]: e.target.value })}
            required={required}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select technology...</option>
            <option value="dotnet">.NET</option>
            <option value="nodejs">Node.js</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="go">Go</option>
          </select>
        </div>
      );
    }

    return (
      <div key={fieldName} className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          id={id}
          type="text"
          value={values[fieldName] || ''}
          onChange={(e) => setValues({ ...values, [fieldName]: e.target.value })}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Workflow:</strong> {workflow.name}
        </p>
      </div>

      {workflow.requiredInputs.map((field) => renderField(field, true))}
      {workflow.optionalInputs.map((field) => renderField(field, false))}

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2 rounded-md font-medium transition-all duration-300 shadow-lg hover:shadow-xl ${
            loading
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
          }`}
        >
          {loading ? 'Launching...' : 'Launch Workflow'}
        </button>
      </div>
    </form>
  );
}
