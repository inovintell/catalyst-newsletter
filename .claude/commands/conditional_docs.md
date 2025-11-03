# Conditional Documentation Guide

This prompt helps you determine what documentation you should read based on the specific changes you need to make in the codebase. Review the conditions below and read the relevant documentation before proceeding with your task.

## Instructions
- Review the task you've been asked to perform
- Check each documentation path in the Conditional Documentation section
- For each path, evaluate if any of the listed conditions apply to your task
  - IMPORTANT: Only read the documentation if any one of the conditions match your task
- IMPORTANT: You don't want to excessively read documentation. Only read the documentation if it's relevant to your task.

## Conditional Documentation

- README.md
  - Conditions:
    - When operating on anything under app/server
    - When operating on anything under app/client
    - When first understanding the project structure
    - When you want to learn the commands to start or stop the server or client

- .claude/commands/classify_adw.md
  - Conditions:
    - When adding or removing new `adws/adw_*.py` files

- adws/README.md
  - Conditions:
    - When you're operating in the `adws/` directory

- app_docs/feature-9698c8e8-production-mode-llm-extraction.md
  - Conditions:
    - When working with extraction service API defaults or configuration
    - When implementing or modifying LLM vs mock extraction modes
    - When updating service descriptions, documentation, or Swagger examples
    - When troubleshooting default behavior of extraction requests
    - When working with schema version configuration

- app_docs/feature-ebb9b10a-env-var-validation-healthcheck.md
  - Conditions:
    - When working with environment variable validation or configuration
    - When implementing or modifying health check endpoints
    - When troubleshooting service startup or readiness issues
    - When working with OpenAI API key configuration or deployment
    - When implementing environment-specific behavior (development vs staging vs production)

- app_docs/feature-94413a81-mock-response-structure.md
  - Conditions:
    - When working with mock extraction response structures
    - When implementing or modifying the extract_mock method in extractor.py
    - When troubleshooting differences between mock and LLM extraction responses
    - When working with ground truth JSON file structures
    - When adding tests for extraction response consistency
    - When investigating API response format issues between use_mock=True and use_mock=False

- app_docs/feature-5d7c4463-enhanced-extraction-logging.md
  - Conditions:
    - When working with logging infrastructure or debugging extraction pipeline issues
    - When implementing or modifying any extraction agent (PlannerAgent, ExtractorAgent, VerifierAgent, RepairerAgent)
    - When troubleshooting schema validation errors or OpenAI API errors
    - When investigating zero snippet extraction or empty container results
    - When adding structured logging to new pipeline stages or components
    - When working with observability, log aggregation, or monitoring
    - When debugging production extraction failures or performance issues
    - When implementing error handling or error context enhancement

- app_docs/feature-d2928fc0-model-tier-hierarchy.md
  - Conditions:
    - When working with model configuration or LLM settings
    - When implementing or modifying extraction agents (PlannerAgent, ExtractorAgent, VerifierAgent, RepairerAgent)
    - When configuring or updating policy.json files for any agency
    - When troubleshooting model selection or tier resolution issues
    - When adding new models or updating model pricing
    - When implementing cost optimization or performance tuning for extraction
    - When working with environment variable configuration for LLM models
    - When migrating from hardcoded model names to semantic tier names
    - When debugging tier fallback behavior or backward compatibility issues
