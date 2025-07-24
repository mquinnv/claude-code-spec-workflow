export function getRequirementsTemplate(): string {
  return `# Requirements Document

## Introduction

[Provide a brief overview of the feature, its purpose, and its value to users]

## Requirements

### Requirement 1

**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN [system] SHALL [response]
2. IF [precondition] THEN [system] SHALL [response]
3. WHEN [event] AND [condition] THEN [system] SHALL [response]

### Requirement 2

**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN [system] SHALL [response]
2. IF [precondition] THEN [system] SHALL [response]

## Non-Functional Requirements

### Performance
- [Performance requirements]

### Security
- [Security requirements]

### Reliability
- [Reliability requirements]

### Usability
- [Usability requirements]

---

<!-- Approval marker will be added here when approved -->
`;
}

export function getDesignTemplate(): string {
  return `# Design Document

## Overview

[High-level description of the feature and its place in the overall system]

## Architecture

[Describe the overall architecture and design patterns used]

\`\`\`mermaid
graph TD
    A[Component A] --> B[Component B]
    B --> C[Component C]
\`\`\`

## Components and Interfaces

### Component 1
- **Purpose:** [What this component does]
- **Interfaces:** [Public methods/APIs]
- **Dependencies:** [What it depends on]

### Component 2
- **Purpose:** [What this component does]
- **Interfaces:** [Public methods/APIs]
- **Dependencies:** [What it depends on]

## Data Models

### Model 1
\`\`\`typescript
interface Model1 {
  id: string;
  name: string;
  // Additional properties
}
\`\`\`

### Model 2
\`\`\`typescript
interface Model2 {
  id: string;
  // Additional properties
}
\`\`\`

## Error Handling

### Error Scenarios
1. **Scenario 1:** [Description]
   - **Handling:** [How to handle]
   - **User Impact:** [What user sees]

2. **Scenario 2:** [Description]
   - **Handling:** [How to handle]
   - **User Impact:** [What user sees]

## Testing Strategy

### Unit Testing
- [Unit testing approach]
- [Key components to test]

### Integration Testing
- [Integration testing approach]
- [Key flows to test]

### End-to-End Testing
- [E2E testing approach]
- [User scenarios to test]

---

<!-- Approval marker will be added here when approved -->
`;
}

export function getTasksTemplate(): string {
  return `# Implementation Plan

## Task Overview
[Brief description of the implementation approach]

## Tasks

- [ ] 1. Set up project structure and core interfaces
  - Create directory structure for components
  - Define core interfaces and types
  - Set up basic configuration
  - _Requirements: 1.1_

- [ ] 2. Implement data models and validation
- [ ] 2.1 Create base model classes
  - Define TypeScript interfaces
  - Implement validation methods
  - Write unit tests for models
  - _Requirements: 2.1, 2.2_

- [ ] 2.2 Implement specific model classes
  - Create concrete model implementations
  - Add relationship handling
  - Test model interactions
  - _Requirements: 2.3_

- [ ] 3. Create service layer
- [ ] 3.1 Implement core service interfaces
  - Define service contracts
  - Create base service classes
  - Add dependency injection
  - _Requirements: 3.1_

- [ ] 3.2 Implement business logic services
  - Create specific service implementations
  - Add error handling
  - Write service unit tests
  - _Requirements: 3.2, 3.3_

- [ ] 4. Create API endpoints
- [ ] 4.1 Set up routing and middleware
  - Configure Express/Fastify routes
  - Add authentication middleware
  - Set up error handling middleware
  - _Requirements: 4.1_

- [ ] 4.2 Implement CRUD endpoints
  - Create REST API endpoints
  - Add request validation
  - Write API integration tests
  - _Requirements: 4.2, 4.3_

- [ ] 5. Add frontend components
- [ ] 5.1 Create base UI components
  - Set up component structure
  - Implement reusable components
  - Add styling and theming
  - _Requirements: 5.1_

- [ ] 5.2 Implement feature-specific components
  - Create feature components
  - Add state management
  - Connect to API endpoints
  - _Requirements: 5.2, 5.3_

- [ ] 6. Integration and testing
- [ ] 6.1 Write end-to-end tests
  - Set up E2E testing framework
  - Write user journey tests
  - Add test automation
  - _Requirements: All_

- [ ] 6.2 Final integration and cleanup
  - Integrate all components
  - Fix any integration issues
  - Clean up code and documentation
  - _Requirements: All_

---

<!-- Approval marker will be added here when approved -->
`;
}