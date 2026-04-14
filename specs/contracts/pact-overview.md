# TerraProxi Integration Contracts Overview

## Purpose

Pact contracts define integration boundaries between microservices or external dependencies. They ensure consumers and providers maintain compatible API contracts through executable verification.

## Current Status

**Active** - Pact is part of the CI pipeline. All API endpoints include OpenAPI specs with x-pact annotations for consumer-driven contract testing.

## Mock Services Required

### Consumer Mocks
- **Cart Service**: Simulate product addition, validation, invalid configurations
- **Stripe Gateway**: Mock payment success/failure scenarios with states
- **AI Recommendation Engine**: Return patterned recommendations with varied datasets
- **Geolocation Service**: Simulate distance queries and coordinate validation

### Provider Mocks
- **External Payment Gateway**: Stripe webhook responses and HTTP patterns
- **Email Service**: Bounce, open, and delivery event simulation

## CI Integration

### Pipeline Stages

1. **Spec Validation** (`npm run spec:lint`)
   - Check contracts conform to schema definitions
   - Validate YAML headers and merge requests

2. **Contract Testing** (`npm run pact:test`)
   - Run consumer tests against provider mock servers
   - Generate Pact files on pass, fail on divergence
   - Matrix build for cross-version compatibility

3. **Contract Verification** (`npm run pact:verify`)
   - Publish Pact consumer contracts to broker
   - Fetch provider contracts for integration testing
   - Verify provider implementation matches contract

4. **Code Generation** (`npm run pact:generate`)
   - Type-safe interfaces from Pact contracts
   - Request/response mocking utilities
   - API client generators for mobile/web

### CI Commands

```bash
# Lint contract schemas
npm run spec:lint

# Run Pact integration tests
npm run pact:test

# Generate TypeScript interfaces from contracts
npm run pact:generate

# Run conformance healthchecks
npm run spec:health
```

## Contract Types

### Service Contracts
- OpenAPI 3.1 specifications in `specs/api/`
- x-pact annotations for contract boundaries
- Request/response validation schemas

### Data Contracts
- JSON Schema definitions in `specs/schemas/`
- Validation rules for request bodies
- Response shape guarantees

### Behavior Contracts
- Gherkin scenarios in `specs/features/`
- Given-When-Then executable tests
- Integration test coverage targets

### Configuration Contracts
- Environment variable definitions
- Service-level configuration schemas
- Feature flag contracts for gradual rollout

## Provider Registration

### Development Environment
```bash
npm run pact:setup:dev
```

### Production Environment
```bash
npm run pact:setup:prod
```

## Contract Publishing

Automated publishing to Pact broker during CI:

```yaml
- name: Publish Pact Files
  run: npx pact-broker publish pact-results \
    --pact-broker-url=$PACT_BROKER_URL \
    --directory= \
    --consumer-version=$CI_COMMIT_SHA
```

## Compliance Gates

- All endpoints have OpenAPI 3.1 specs (spectral validation)
- 100% of endpoints covered by consumer tests
- Contract tests must pass in CI before merge
- Breaking changes require contract approval
- Failed Pact runs block feature deployment

## Documentation

- [OpenAPI Schema Reference](../api)
- [JSON Schema Definitions](../schemas)
- [Gherkin Behavior Scenarios](../features)
- [Contract Templates](../../tests/conformance/spec-templates)