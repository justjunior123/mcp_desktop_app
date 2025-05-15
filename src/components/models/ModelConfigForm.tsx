import React, { useState, useEffect } from 'react';
import { Model } from '@prisma/client';
import { isValidJson } from '../../lib/utils';

interface ModelConfigFormProps {
  model: Model;
  onSave: (modelId: string, parameters: string) => Promise<void>;
  onCancel: () => void;
}

export const ModelConfigForm: React.FC<ModelConfigFormProps> = ({
  model,
  onSave,
  onCancel,
}) => {
  const [parameters, setParameters] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    // Initialize the parameters from the model
    if (model.parameters) {
      try {
        const parsed = JSON.parse(model.parameters);
        setParameters(JSON.stringify(parsed, null, 2));
        setIsValid(true);
      } catch (e) {
        setParameters('{}');
        setIsValid(false);
        setErrorMessage('Invalid JSON in the model parameters');
      }
    } else {
      // Default parameters
      setParameters(JSON.stringify({
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
      }, null, 2));
    }
  }, [model]);

  // Validate the parameters as JSON
  const validateParameters = (value: string) => {
    if (!value.trim()) {
      setIsValid(false);
      setErrorMessage('Parameters cannot be empty');
      return false;
    }

    try {
      JSON.parse(value);
      setIsValid(true);
      setErrorMessage('');
      return true;
    } catch (e) {
      setIsValid(false);
      setErrorMessage('Invalid JSON format');
      return false;
    }
  };

  const handleParametersChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setParameters(value);
    validateParameters(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateParameters(parameters)) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave(model.id, parameters);
    } catch (e) {
      setErrorMessage(`Error saving parameters: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Predefined parameter templates
  const templates = [
    {
      name: 'Default',
      parameters: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
      }
    },
    {
      name: 'Creative',
      parameters: {
        temperature: 0.9,
        top_p: 0.95,
        top_k: 60,
        repeat_penalty: 1.0,
      }
    },
    {
      name: 'Precise',
      parameters: {
        temperature: 0.3,
        top_p: 0.85,
        top_k: 20,
        repeat_penalty: 1.2,
      }
    }
  ];

  const applyTemplate = (template: typeof templates[0]) => {
    setParameters(JSON.stringify(template.parameters, null, 2));
    setIsValid(true);
    setErrorMessage('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Configure Model: {model.name}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
        >
          ← Back
        </button>
      </div>

      <div className="mb-6">
        <div className="text-gray-600 dark:text-gray-300 mb-4">
          Configure the model parameters that will be used when generating text with this model.
          These parameters affect how the model generates responses.
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Templates
          </h3>
          <div className="flex gap-2 flex-wrap">
            {templates.map((template, index) => (
              <button
                key={index}
                onClick={() => applyTemplate(template)}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 text-sm rounded"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="parameters"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Parameters (JSON format)
            </label>
            <textarea
              id="parameters"
              name="parameters"
              rows={10}
              className={`w-full p-3 border ${
                isValid
                  ? 'border-gray-300 dark:border-gray-600'
                  : 'border-red-500 dark:border-red-500'
              } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 block dark:bg-gray-900`}
              value={parameters}
              onChange={handleParametersChange}
              placeholder='{"temperature": 0.7, "top_p": 0.9, ...}'
            />
            {!isValid && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errorMessage}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSaving}
              className={`${
                isValid && !isSaving
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed'
              } text-white px-4 py-2 rounded flex items-center`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Parameters'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Parameter Descriptions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200">temperature</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Controls randomness. Higher values (e.g., 0.8) make output more random, lower values (e.g., 0.2) make it more focused and deterministic.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200">top_p</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Nucleus sampling. Only consider tokens whose cumulative probability exceeds this threshold (0.0-1.0).
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200">top_k</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Only sample from the top K most likely tokens (1-100). Helps filter out unlikely tokens.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200">repeat_penalty</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Penalizes repetition. Higher values (e.g., 1.5) prevent the model from repeating the same text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 