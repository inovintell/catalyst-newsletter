---
allowed-tools: Bash(git ls-files:*), Read, Bash(gh: *), Write
description: Write HTML report about recent progress on the project
---

# Weekly review report

List github issues created and closed between current date and `LOOKBACK_DAYS` days before. Follow `Instructions` , take care of `Standards` and than use `Report` section to shape up the report and store it on locally.

# Variables
LOOKBACK_DAYS: $1 (default 7 days)
OUTPUT_PATH: /Users/clazz/Desktop
FILENAME_FORMATTED: `weekly-issue-report-{YYYY-MM-DD}.html` (use current date)

# Instructions
- Use `gh issue list` with `--state`, `--json`, and `--search` flags to query issues by creation/closure dates
- Use `gh issue view` to get detailed issue information including body content
- Use `gh pr list` with similar flags to query pull requests
- Filter by date using `--search "created:>=YYYY-MM-DD"` or `--search "closed:>=YYYY-MM-DD"`

# Standards

Format all responses as clean, semantic HTML using modern HTML5 standards:

## Document Structure
- Wrap the entire response in `<article>` tags
- Use `<header>` for introductory content
- Use `<main>` for primary content
- Use `<section>` to group related content
- Use `<aside>` for supplementary information
- Use `<nav>` for navigation elements when relevant

## Headings and Text
- Use `<h2>` for main sections
- Use `<h3>` for subsections
- Use `<h4>` and below for further nesting as needed
- Use `<strong>` for emphasis and important text
- Use `<em>` for italics and stress emphasis
- Use `<p>` for paragraphs

## Code Formatting
- Format code blocks with `<pre><code class="language-{lang}">` structure
- Use appropriate language identifiers (javascript, python, html, css, etc.)
- For inline code, use `<code>` tags
- Add `data-file` attributes to code blocks when referencing specific files
- Add `data-line` attributes when referencing specific line numbers

## Lists and Tables
- Use `<ul>` for unordered lists, `<ol>` for ordered lists
- Always use `<li>` for list items
- Structure tables with `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
- Add `scope` attributes to table headers for accessibility
- Use `<caption>` for table descriptions when helpful

## Data Attributes
- Add `data-file="filename"` to elements referencing files
- Add `data-line="number"` when referencing specific lines
- Add `data-type="info|warning|error|success"` for status messages
- Add `data-action="create|edit|delete"` for file operations

## Inline Styles (Minimal)
Include basic inline styles for readability:
- `style="font-family: monospace; background: #f5f5f5; padding: 2px 4px;"` for inline code
- `style="margin: 1em 0; padding: 1em; background: #f8f9fa; border-left: 3px solid #007acc;"` for code blocks
- `style="margin: 1em 0;"` for sections

# Report

- Write report to the location `OUTPUT_PATH`/`FILENAME_FORMATTED`

## Output Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Issue Report: {Date Range}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2em;
      background: #ffffff;
      color: #333;
    }
    h2, h3, h4 {
      color: #1a1a1a;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      padding: 0.75em;
      border: 1px solid #ddd;
    }
    th {
      background: #f5f5f5;
      text-align: left;
    }
    code {
      font-family: monospace;
      background: #f5f5f5;
      padding: 2px 4px;
    }
  </style>
</head>
<body>
<article>
  <header>
    <h2>Weekly Issue Report: {Date Range}</h2>
    <p style="margin: 0.5em 0; color: #666;">{Service Name} - Week Ending {Date}</p>
  </header>

  <main>
    <section data-type="info" style="margin: 2em 0; padding: 1.5em; background: #f0f7ff; border-left: 4px solid #0066cc;">
      <h3>Executive Summary for Management</h3>
      <p><strong>Overall Activity:</strong> {Summary of work completed}</p>

      <p><strong>Key Accomplishments:</strong></p>
      <ul style="margin: 0.5em 0;">
        <li><strong>{Category}:</strong> {Description}</li>
      </ul>

      <p><strong>Strategic Initiatives in Progress:</strong></p>
      <ul style="margin: 0.5em 0;">
        <li><strong>{Initiative Name}:</strong> {Description}</li>
      </ul>

      <p><strong>Business Impact:</strong> {Impact summary}</p>
    </section>

    <section style="margin: 2em 0;">
      <h3>Activity Metrics</h3>
      <table style="border-collapse: collapse; width: 100%; margin: 1em 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 0.75em; text-align: left; border: 1px solid #ddd;">Metric</th>
            <th style="padding: 0.75em; text-align: center; border: 1px solid #ddd;">Count</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 0.75em; border: 1px solid #ddd;">Issues Created</td>
            <td style="padding: 0.75em; text-align: center; border: 1px solid #ddd;">{count}</td>
          </tr>
          <tr>
            <td style="padding: 0.75em; border: 1px solid #ddd;">Issues Closed</td>
            <td style="padding: 0.75em; text-align: center; border: 1px solid #ddd;">{count}</td>
          </tr>
          <tr>
            <td style="padding: 0.75em; border: 1px solid #ddd;">Currently Open</td>
            <td style="padding: 0.75em; text-align: center; border: 1px solid #ddd;">{count}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 0.75em; border: 1px solid #ddd;"><strong>Closure Rate</strong></td>
            <td style="padding: 0.75em; text-align: center; border: 1px solid #ddd;"><strong>{percentage}%</strong></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section style="margin: 2em 0;">
      <h3>Open Issues (In Progress)</h3>

      <article style="margin: 1.5em 0; padding: 1em; background: #fffbf0; border-left: 3px solid #ff9800;">
        <header>
          <h4 style="margin: 0 0 0.5em 0;">
            <a href="{issue_url}" style="color: #0066cc; text-decoration: none;">#{number} - {title}</a>
          </h4>
          <p style="margin: 0; font-size: 0.9em; color: #666;">
            Created: <time datetime="{iso_date}">{display_date}</time> |
            Status: <span style="color: #ff9800; font-weight: bold;">OPEN</span>
          </p>
        </header>
        <p style="margin: 1em 0;"><strong>Description:</strong> {description}</p>
        <p style="margin: 1em 0;"><strong>Business Value:</strong> {value}</p>
      </article>
    </section>

    <section style="margin: 2em 0;">
      <h3>Closed Issues (Completed This Week)</h3>

      <article style="margin: 1.5em 0; padding: 1em; background: #f0fff4; border-left: 3px solid #22c55e;">
        <header>
          <h4 style="margin: 0 0 0.5em 0;">
            <a href="{issue_url}" style="color: #0066cc; text-decoration: none;">#{number} - {title}</a>
          </h4>
          <p style="margin: 0; font-size: 0.9em; color: #666;">
            Created: <time datetime="{iso_date}">{display_date}</time> |
            Closed: <time datetime="{iso_date}">{display_date}</time> |
            <span style="color: #22c55e; font-weight: bold;">CLOSED</span> |
            Duration: <strong>{duration}</strong>
          </p>
        </header>
        <p style="margin: 1em 0;"><strong>Description:</strong> {description}</p>
        <p style="margin: 1em 0;"><strong>Business Value:</strong> {value}</p>
      </article>
    </section>

    <section style="margin: 2em 0; padding: 1.5em; background: #f9fafb; border: 1px solid #e5e7eb;">
      <h3>Work Distribution by Category</h3>
      <ul style="margin: 1em 0;">
        <li><strong>{Category}:</strong> {count} issues ({percentage}%) - {description}</li>
      </ul>
      <p style="margin: 1em 0; font-style: italic; color: #666;">Note: Percentages exceed 100% due to issues spanning multiple categories.</p>
    </section>

    <section style="margin: 2em 0; padding: 1.5em; background: #fef3c7; border-left: 4px solid #f59e0b;">
      <h3>Key Takeaways</h3>
      <ol style="margin: 0.5em 0;">
        <li><strong>{Takeaway Title}:</strong> {Description}</li>
      </ol>
    </section>
  </main>

  <footer style="margin: 3em 0 1em 0; padding: 1em 0; border-top: 1px solid #e5e7eb; color: #666; font-size: 0.9em;">
    <p>Generated: {date} | Repository: <a href="{repo_url}">{repo_path}</a></p>
  </footer>
</article>
</body>
</html>
```

Keep HTML clean, readable, and semantically meaningful. Avoid unnecessary nesting and maintain consistent indentation.

