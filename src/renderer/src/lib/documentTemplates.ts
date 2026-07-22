export type TemplateCategory = 'General' | 'Work' | 'Study' | 'Development'

export interface DocumentTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  suggestedName: string
  createContent: (title: string) => string
}

function today(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

function heading(title: string): string {
  return `# ${title.trim() || 'Untitled'}`
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'blank',
    name: 'Blank document',
    description: 'Start with a clean page.',
    category: 'General',
    suggestedName: 'Untitled.md',
    createContent: () => ''
  },
  {
    id: 'meeting',
    name: 'Meeting notes',
    description: 'Agenda, attendees, discussion, decisions, and action items.',
    category: 'Work',
    suggestedName: 'Meeting Notes.md',
    createContent: (title) => `${heading(title)}

**Date:** ${today()}  
**Attendees:**

## Agenda

1. 

## Discussion

- 

## Decisions

- 

## Action items

- [ ] Action — Owner — Due date
`
  },
  {
    id: 'programming',
    name: 'Programming notes',
    description: 'Problem, approach, implementation, examples, and follow-ups.',
    category: 'Development',
    suggestedName: 'Programming Notes.md',
    createContent: (title) => `${heading(title)}

## Problem

Describe the problem and expected behavior.

## Approach

- 

## Implementation

\`\`\`text
code here
\`\`\`

## Test cases

- [ ] Happy path
- [ ] Edge cases
- [ ] Error handling

## References

- 
`
  },
  {
    id: 'daily',
    name: 'Daily journal',
    description: 'Priorities, notes, wins, blockers, and tomorrow’s focus.',
    category: 'General',
    suggestedName: `${today()} Daily Note.md`,
    createContent: () => `# Daily Note — ${today()}

## Top priorities

- [ ] 
- [ ] 
- [ ] 

## Notes

- 

## Wins

- 

## Blockers

- None

## Tomorrow

- 
`
  },
  {
    id: 'project-plan',
    name: 'Project plan',
    description: 'Goals, scope, milestones, risks, and tasks.',
    category: 'Work',
    suggestedName: 'Project Plan.md',
    createContent: (title) => `${heading(title)}

## Overview

Briefly describe the project.

## Goals

- 

## Out of scope

- 

## Milestones

| Milestone | Owner | Due | Status |
| --- | --- | --- | --- |
| Planning |  |  | Not started |

## Tasks

- [ ] 

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
|  |  |  |
`
  },
  {
    id: 'research',
    name: 'Research notes',
    description: 'Question, sources, findings, evidence, and conclusions.',
    category: 'Study',
    suggestedName: 'Research Notes.md',
    createContent: (title) => `${heading(title)}

## Research question


## Key findings

- 

## Evidence and notes

### Source 1

- **Link:**
- **Author / date:**
- **Notes:**

## Conclusions


## Open questions

- [ ] 
`
  },
  {
    id: 'class-notes',
    name: 'Class or lecture notes',
    description: 'Topics, key ideas, examples, questions, and review tasks.',
    category: 'Study',
    suggestedName: 'Class Notes.md',
    createContent: (title) => `${heading(title)}

**Date:** ${today()}  
**Course:**  
**Topic:**

## Key ideas

- 

## Detailed notes


## Examples


## Questions

- [ ] 

## Summary


## Review

- [ ] Create flashcards
- [ ] Review before next class
`
  },
  {
    id: 'reading',
    name: 'Reading notes',
    description: 'Capture a book or article summary, insights, and quotations.',
    category: 'Study',
    suggestedName: 'Reading Notes.md',
    createContent: (title) => `${heading(title)}

**Author:**  
**Started:** ${today()}  
**Status:** Reading

## Summary


## Key ideas

- 

## Notes by section

### Section 1

- 

## Quotations

> 

## Takeaways

- 
`
  },
  {
    id: 'bug-report',
    name: 'Bug report',
    description: 'Reproduction steps, expected behavior, evidence, and fix checklist.',
    category: 'Development',
    suggestedName: 'Bug Report.md',
    createContent: (title) => `${heading(title)}

## Summary


## Environment

- **Version:**
- **Operating system:**
- **Browser / runtime:**

## Steps to reproduce

1. 
2. 
3. 

## Expected behavior


## Actual behavior


## Logs or screenshots

\`\`\`text
Paste logs here
\`\`\`

## Fix checklist

- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Regression test added
`
  },
  {
    id: 'design-doc',
    name: 'Software design document',
    description: 'Context, requirements, architecture, alternatives, and rollout.',
    category: 'Development',
    suggestedName: 'Design Document.md',
    createContent: (title) => `${heading(title)}

**Status:** Draft  
**Author:**  
**Last updated:** ${today()}

## Context


## Goals and non-goals

### Goals

- 

### Non-goals

- 

## Proposed design

\`\`\`mermaid
flowchart LR
  A[Client] --> B[Service]
  B --> C[(Data store)]
\`\`\`

## Alternatives considered

- 

## Risks and mitigations

- 

## Rollout plan

- [ ] 
`
  },
  {
    id: 'api-docs',
    name: 'API documentation',
    description: 'Endpoint purpose, request, response, errors, and examples.',
    category: 'Development',
    suggestedName: 'API Documentation.md',
    createContent: (title) => `${heading(title)}

## Overview


## Authentication


## Endpoint

\`POST /api/resource\`

### Request

\`\`\`json
{
  "name": "example"
}
\`\`\`

### Response

\`\`\`json
{
  "id": "123",
  "name": "example"
}
\`\`\`

### Errors

| Status | Meaning |
| --- | --- |
| 400 | Invalid request |
| 401 | Unauthorized |
`
  },
  {
    id: 'decision',
    name: 'Decision record',
    description: 'Document context, options, decision, and consequences.',
    category: 'Work',
    suggestedName: 'Decision Record.md',
    createContent: (title) => `${heading(title)}

**Date:** ${today()}  
**Status:** Proposed  
**Decision makers:**

## Context


## Options considered

### Option 1

- **Benefits:**
- **Trade-offs:**

### Option 2

- **Benefits:**
- **Trade-offs:**

## Decision


## Consequences

- 
`
  },
  {
    id: 'retrospective',
    name: 'Retrospective',
    description: 'What went well, what did not, lessons, and action items.',
    category: 'Work',
    suggestedName: 'Retrospective.md',
    createContent: (title) => `${heading(title)}

**Date:** ${today()}

## What went well

- 

## What could be improved

- 

## What we learned

- 

## Action items

- [ ] Action — Owner — Due date
`
  },
  {
    id: 'readme',
    name: 'Project README',
    description: 'Overview, installation, usage, development, and license.',
    category: 'Development',
    suggestedName: 'README.md',
    createContent: (title) => `${heading(title)}

Briefly explain what this project does and why it is useful.

## Features

- 

## Installation

\`\`\`bash
# Add installation commands
\`\`\`

## Usage

\`\`\`bash
# Add usage example
\`\`\`

## Development


## Contributing

Contributions are welcome. Please open an issue before submitting a large change.

## License

Add license information here.
`
  },
  {
    id: 'checklist',
    name: 'Reusable checklist',
    description: 'A simple grouped checklist with notes and completion criteria.',
    category: 'General',
    suggestedName: 'Checklist.md',
    createContent: (title) => `${heading(title)}

**Owner:**  
**Due:**

## Before starting

- [ ] Define the desired outcome
- [ ] Gather required information

## Tasks

- [ ] 
- [ ] 
- [ ] 

## Final checks

- [ ] Work reviewed
- [ ] Outcome documented

## Notes


`
  }
]

export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.(md|markdown|mdx)$/i, '').trim() || 'Untitled'
}

