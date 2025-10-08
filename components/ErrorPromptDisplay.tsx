'use client';

import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ClipboardIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ClaudeAPIError {
  type: 'authentication' | 'insufficient_credits' | 'rate_limit' | 'network' | 'unknown';
  message: string;
  status?: number;
  prompt?: string;
  details?: string;
}

interface ErrorPromptDisplayProps {
  error: ClaudeAPIError;
  className?: string;
}

/**
 * Map error types to user-friendly messages and actionable next steps
 */
const errorMessages: Record<ClaudeAPIError['type'], {
  title: string;
  description: string;
  actions: string[];
}> = {
  authentication: {
    title: 'Authentication Failed',
    description: 'Unable to authenticate with the Claude API. Please check your API key configuration.',
    actions: [
      'Verify your ANTHROPIC_API_KEY in the environment variables',
      'Ensure the API key has not expired or been revoked',
      'Check that the API key has proper permissions',
      'Contact support if the issue persists'
    ]
  },
  insufficient_credits: {
    title: 'Insufficient Credits',
    description: 'Your Claude API account does not have enough credits to complete this request.',
    actions: [
      'Add credits to your Anthropic account at console.anthropic.com',
      'Check your current usage and billing at console.anthropic.com/settings/billing',
      'Consider upgrading to a higher tier plan',
      'Contact sales for enterprise pricing options'
    ]
  },
  rate_limit: {
    title: 'Rate Limit Exceeded',
    description: 'Too many requests have been made in a short period. Please wait before trying again.',
    actions: [
      'Wait a few minutes before retrying',
      'Check your rate limits at console.anthropic.com/settings/limits',
      'Consider implementing request queuing or batching',
      'Upgrade to a higher tier for increased rate limits'
    ]
  },
  network: {
    title: 'Network Error',
    description: 'Unable to connect to the Claude API due to a network issue.',
    actions: [
      'Check your internet connection',
      'Verify that the API endpoint is accessible',
      'Check if there are any firewall or proxy issues',
      'Try again in a few moments'
    ]
  },
  unknown: {
    title: 'Unknown Error',
    description: 'An unexpected error occurred while generating the newsletter.',
    actions: [
      'Review the error details below',
      'Check the Claude API status at status.anthropic.com',
      'Try generating the newsletter again',
      'Contact support with the error details if the issue persists'
    ]
  }
};

/**
 * ErrorPromptDisplay component
 * Displays detailed error information when Claude API calls fail
 * Includes the agent prompt that was used and actionable next steps
 */
const ErrorPromptDisplay: React.FC<ErrorPromptDisplayProps> = ({ error, className = '' }) => {
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const errorInfo = errorMessages[error.type] || errorMessages.unknown;

  const handleCopyPrompt = async () => {
    if (!error.prompt) return;

    try {
      await navigator.clipboard.writeText(error.prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  return (
    <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-6 ${className}`}>
      {/* Error Header */}
      <div className="flex items-start mb-4">
        <ExclamationTriangleIcon className="w-8 h-8 text-red-600 mr-3 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-red-800 mb-2">
            {errorInfo.title}
          </h2>
          <p className="text-red-700 mb-2">
            {errorInfo.description}
          </p>
          {error.status && (
            <p className="text-sm text-red-600">
              Status Code: {error.status}
            </p>
          )}
          {error.message && (
            <p className="text-sm text-red-600 mt-1 font-mono bg-red-100 p-2 rounded">
              {error.message}
            </p>
          )}
        </div>
      </div>

      {/* Agent Prompt Display (Collapsible) */}
      {error.prompt && (
        <div className="border-t-2 border-red-300 pt-4">
          <button
            onClick={() => setIsPromptExpanded(!isPromptExpanded)}
            className="flex items-center justify-between w-full text-left font-semibold text-red-800 hover:text-red-900 transition-colors"
          >
            <span className="flex items-center">
              {isPromptExpanded ? (
                <ChevronUpIcon className="w-5 h-5 mr-2" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 mr-2" />
              )}
              View Agent Prompt
            </span>
            {!isPromptExpanded && (
              <span className="text-sm text-red-600">
                (Click to expand)
              </span>
            )}
          </button>

          {isPromptExpanded && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-red-600">
                  This is the prompt that was sent to Claude when the error occurred:
                </p>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                >
                  {isCopied ? (
                    <>
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className="w-4 h-4 mr-1" />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                  {error.prompt}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Support Link */}
      <div className="mt-4 pt-4 border-t-2 border-red-300 text-sm text-red-700">
        <p>
          Need help?{' '}
          <a
            href="https://support.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-800 underline font-semibold"
          >
            Contact Anthropic Support
          </a>
          {' '}or{' '}
          <a
            href="https://status.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-800 underline font-semibold"
          >
            Check API Status
          </a>
        </p>
      </div>
    </div>
  );
};

export default ErrorPromptDisplay;
