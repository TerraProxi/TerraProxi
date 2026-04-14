# Specification Files Directory

## Overview

This directory contains all machine-readable specifications that define TerraProxi API behavior, data contracts, and integration boundaries. These specs serve as the single source of truth for developers, QA engineers, and automated conformance testing pipelines.

## Purpose

Specifications provide:
- **Contract Definitions**: Formal agreements between API producers and consumers
- **Implementation Guidance**: Verifiable acceptance criteria and behavior expectations
- **QA Automation**: Test generation from behavioral and data contracts
- **Documentation**: Auto-generated API documentation and type definitions
- **Change Management**: Traceability for feature evolution and technical debt

## File Structure

```
specs/
├── contracts/              # Integration contracts
│   ├── error-envelope.schema.json   # Standard error response format
│   ├── pact-overview.md              # Pact integration overview
│   └── core-spec-templates/          # Contract templates baseline
├── api/                    # API specifications
│   ├── openapi.yaml           # API contract (Swagger/OpenAPI 3.1)
│   ├── authentication.yaml    # Auth flow contract
│   └── api-versioning.yaml    # Version control policy
├── schemas/                # Data contracts
│   ├── user.schema.json      # User entity validation rules
│   ├── product.schema.json   # Product data contract
│   ├── order.schema.json     # Order state transitions
│   ├── payment.schema.json   # Payment processor contract
│   └── product-category.enum.json
├── features/               # Behavior specifications
│   ├── auth.feature          # Authentication scenarios
│   ├── proximity-search.feature
│   ├── cart-management.feature
│   └── order-fulfillment.feature
├── decisions/              # Architecture decision records
│   ├── 0001-api-origin.md
│   ├── 0002-spatial-indexing.md
│   └── 0003-stripe-integration.md
└── slos/                   # Service level objectives
    ├── performance.slo.yaml  # Response time targets
    ├── availability.slo.yaml # Uptime SLAs
    └── accuracy.slo.yaml     # Search precision metrics
```

## Reading Specifications

Each spec file follows Bootstrap IA's Spec-Driven Development methodology:

### API Contracts (OpenAPI YAML)
- `{method} /{path}/{operation_id}` - HTTP endpoints with request/response schemas
- `x-description`, `x-errors`, `x-tags` - Contract metadata for tools
- Use `@name`, `@ref` annotations from Sangria GraphQL or Pact frameworks

**How to Read**: Start with `openapi.yaml`. Map operations to internal code:
1. Locate `GET /api/producers/proximity` 
2. Check `parameters`, `requestBody`, `responses`
3. Validate schema compliance before writing tests

### Data Contracts (JSON Schema)
- `required`, `type`, `format`, `pattern` - Validation rules
- `anyOf`, `oneOf`, `allOf` - Union and intersection types
- `examples`, `default` - Production-ready payloads

**How to Read**: Extract type definitions for frontend:
1. Use `ajv` CLI to validate payloads: `ajv validate -d schemas/product.schema.json -s tests/fixtures/product-valid.json`
2. Generate TypeScript interfaces from schema

### Behavior Contracts (Gherkin Feature Files)
- `Feature:`, `Scenario:`, `Given`, `When`, `Then` execution flow
- Scenario outlines with `| data |` for parameterized tests
- Examples with title: `@description` for clarity

**How to Read**: Write test assertions after implementation:
1. Map `Given` to database setup
2. Map `When` to API call
3. Map `Then` to response validation

### Architecture Decisions (ADR)
- `Context`, `Options`, `Trade-offs`, `Decision`, `Consequences` sections
- Pro/con tables with objective justification
- Related spec references for impact analysis

**How to Read**: Review before feature implementation:
1. Identify which decision impacts current work
2. Check compliance prerequisites
3. Add ADR to stack if analysis needed

### Service Level Objectives (SLOs)
- `target`, `duration`, `error_budget` definitions
- Time window aggregation (P95, P99, mean)
- Failure domain correlation

**How to Read**: Define test thresholds
1. Extract `duration` for smoke test timeout
2. Use `target` as acceptance criteria for performance tests

## Using Specs for Conformance Testing

### Test Generation Pipeline

```bash
# 1. Validate contract schemas
npm run spec:validate

# 2. Generate TypeScript interfaces
npx openapi-generator-cli generate -g typescript -i specs/api/openapi.yaml

# 3. Generate request/response mock data
npx json-schema-faker -s specs/schemas/user.schema.json -o tests/fixtures/user-response.json

# 4. Parse Gherkin to runnable tests
npm run features:parse

# 5. Run conformance healthchecks
npm run spec:health
```

### Developer Workflow

1. **Author spec changes first**: Modify contract before implementing feature
2. **Generate conformance tests**: Create automated gates from spec updates
3. **Run spec validation**: Ensure compliance before code review
4. **Pass conformance tests**: Only merge when test suite passes

### QA/Test Engineer Workflow

1. **Read behavior specs**: Understand user journeys and edge cases
2. **Generate test scenarios**: Expand scenarios for coverage analysis
3. **Run contract tests**: Verify API implementation against spec
4. **Report gaps**: Document non-conforming behavior for developers

### CI/CD Integration

```yaml
# .github/workflows/spec-conformance.yml
- name: Lint Contracts
  run: npm run spec:lint

- name: Validate Schemas
  run: ajv validate -s specs/schemas/order.schema.json -d tests/fixtures/order-get.json

- name: Run Pact Tests  
  run: npx pact-mockman test --pact-url specs/contracts/ --parallel

- name: Generate Types
  run: openapi-generator-cli generate -g typescript

- name: Run Gherkin Tests
  run: cucumber-js --format json:artifacts/cucumber-report.json

- name: Check SLO Coverage
  run: cypress verify --spec Cypress/slo/**/*.spec.ts
```

## Contract-First Development Workflow

1. **Write OpenAPI spec for new features**
   - Document request schemas, response codes, error cases
   - Add `x-contract-test` annotations

2. **Generate conformance tests**
   - Create unit tests from contract scenarios
   - Create integration tests with API mock servers
   - Create Gherkin scenarios if behavior specifications exist

3. **Implement feature to pass tests**
   - Refactor endpoints to match documentation
   - Update DTOs to align with schemas
   - Add error handling per spec

4. **Validate in CI**
   - Run all conformance tests
   - Ensure 100% contract pass rate
   - No breaking schema violations

5. **Document deviations**
   - Create ADR if spec implementation is impossible
   - Update contract with field-level rationale
   - Add examples to schema for clarity

## Spec Quality Standards

- **Machine-Readable**: Valid JSON/YAML, conforms to standards (OpenAPI 3.1, JSON Schema draft-07)
- **Human-Readable**: Clear descriptions, organized sections, examples
- **Versioned**: Semantic versioning for spec releases, migration versioning across major versions
- **Cross-Reference**: Links between specs, ADRs, and code locations
- **Testable**: Executable From behavior specs, declarative, has clear assertions

## Open Source Sync

All specs follow Bootstrap IA templates:
- [Starlight Template](https://github.com/anomalyco/bootstrap-ia) - Core formats
- [OpenAPI Spec Reference](https://swagger.io/specification/)
- [JSON Schema Validation](https://json-schema.org/understanding-json-schema/)
- [Cucumber Gherkin Reference](https://cucumber.io/docs/gherkin/)
- [Pact Specification](https://docs.pact.io/)

## Getting Help

- **Schema validation issues**: Run `npm run spec:validate` for diagnostic errors
- **API documentation**: Access via Swagger UI at `http://localhost:3002/swagger`
- **Contract questions**: Check related ADRs in `specs/decisions/`
- **Behavior specs**: See examples in `examples/` directory
- **Test failures**: Build artifacts and logs in `artifacts/` directory

## File Naming Conventions

- **Kayaks**: `entry-point/sequence-part.yaml` (e.g., `contracts/`, `api/`, `schemas/`)
- **OpenAPI**: `openapi.yaml`, versioned `openapi.v1.0.0.yaml`, diff compatible
- **JSON Schema**: `{entity}.schema.json`, cross-referenced foundations
- **Gherkin**: `{feature}.feature`, short imperative names
- **ADRs**: `{sequence}-{title}.md` sequential numbering, descriptive title
- **ALITs**: `adviceLabeledInTitle.md` (ALIT), cross-reference spec sources

## Continuous Improvement

- **Spec PRs**: Follow bootstrap IA conventions, run `npm run spec:lint` before submitting
- **Add to tech debt backlog**: Tag specs with `@debt` for extraction
- **Deprecation workflow**: Add `status: deprecated` prefix to 6-month transition period
- **Major version bumps**: Increment major version in filename, create migration guide in ADR