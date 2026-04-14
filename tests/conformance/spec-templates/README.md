# Conformance Test Template Documentation

## Overview

This directory contains templates and tools for generating executable tests from specification files. The spec-driven development workflow requires tests to be generated from contracts, not the other way around.

## Test Generation Strategies

All test generation follows contract-to-test precedence. Follow templates to ensure consistency across all test suites.

## 1. OpenAPI to Test Cases

### Purpose
Generate conformance tests from API specifications, ensuring endpoints match documented contracts exactly.

### Tools
- **openapi-generator-cli**: Server-side test generation
- **dredd**: Consumer-driven contract verification  
- **spectral**: Schema validation during generation

### Generation Pipeline

```bash
# Install generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript server tests
openapi-generator-cli generate \
  -i specs/api/openapi.yaml \
  -g typescript-tests \
  -o ./tests/conformance/generated/api-tests \
  -p npmName=@terraproxi/frontend-api \
  --additional-properties=.openapitools.json
```

### Generated Test Structure

```
tests/conformance/generated/api-tests/
├── .openapitools.json
├── README.md
├── test/
│   ├── protected/
│   ├── public/
│   └── util/
├── request-mocks/
└── predefined-response.json
```

### Command Examples

```bash
# Build TypeScript types from spec
openapi-generator-cli generate \
  -i specs/api/openapi.yaml \
  -g typescript-axios \
  -o ./src/types/generated

# Validate spec before test generation
npx spectral lint specs/api/openapi.yaml

# Run contract tests on live API
npx dredd specs/api/openapi.yaml http://localhost:3002

# Compare implementation against spec
npx bridge-openapi openapi.yaml -k
```

### Customization Flags

```json
{
  "specificationDialect": "swagger_2_0",
  "useSingleRequestParameter": false,
  "withCredentials": true,
  "withNamespace": true,
  "disableSingularParams": false,
  "supportMarkdown": true,
  "strictSpec": false,
  "enableExamples": true,
  "enumNamesAsStrings": false
}
```

## 2. JSON Schema to Test Generation

### Purpose
Create type-safe request validation and mocking from JSON Schema contracts.

### Tools
- **ajv-cli**: JSON schema validation engine
- **json-schema-faker**: Test data generation
- **zod-ist**: TypeScript schema generation

### Generation Pipeline

```bash
# Install CLI tools
npm install -g ajv-cli jest json-schema-faker zod-ist

# Validate request schema compliance
ajv validate \
  -s specs/schemas/product.schema.json \
  -d tests/fixtures/product-create-payload-valid.json

# Generate request/response mock data
json-schema-faker \
  --config depth=10,selected=False,requiredOnly=False \
  --schema specs/schemas/order.schema.json \
  --out tests/fixtures/order-valid.json

# Generate TypeScript interfaces
zodist --schema ./specs/schemas/order.schema.json \
  -o ./src/types/generated/orders.ts
```

### Test File Templates

```typescript
// test/conformance/data-contracts/order.spec.ts
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import schema from '@/specs/schemas/order.schema.json'
import validPayload from '@/tests/fixtures/order-valid.json'

const ajv = new Ajv({ strict: true, allErrors: true })
addFormats(ajv)

describe('Order Data Contract', () => {
  const validate = ajv.compile(schema)

  test('valid payload should pass', () => {
    const result = validate(validPayload)
    expect(result).toBe(true)
  })

  test.each([
    { invalid: 'missing-field', expected: false },
    { invalid: { invalid_field: 'bad-value' }, expected: false }
  ])('invalid payload should fail', ({ invalid, expected }) => {
    const result = validate(invalid)
    expect(result).toBe(expected)
  })
})
```

### Code Examples

```bash
# Generate Zod schema for validation
npx zodist --schema specs/schemas/user.schema.json -o src/validation/schemas.ts

# Use in Express validation middleware
import userSchema from '@/src/validation/schemas'
import { zodResolver } from 'express-zod-resolver'

app.post('/api/users', zodResolver(userSchema), createUserHandler)
```

## 3. Gherkin to Runnable Tests

### Purpose
Translate behavior specifications into executable integration tests using Cucumber.js.

### Tools
- **cucumber-js**: BDD test runner for Gherkin
- **cucumber-pyreport**: HTML report generation
- **cucumber-boilerplate**: Template library

### Generation Pipeline

```bash
# Install Cucumber
npm install -D cucumber cucumber-gherkin cucumber-parallel

# Parse Gherkin scenarios
npm run features:parse

# Run feature tests
npx cucumber-js \
  --require cucumber/hooks/ \
  --require cucumber/steps/ \
  --format \
    json:artifacts/cucumber-report.json \
    pretty \
  specs/features/auth.feature
```

### Feature Template

```gherkin
# specs/features/auth.feature
Feature: Authentication

  Scenario: Successful login with valid credentials
    Given the user exists in the database with email "user@example.com" and password "hashed_password123"
    When the user POSTS /api/auth/login with body {
      "email": "user@example.com",
      "password": "password123"
    }
    Then the response should have status 200
    And the response body should contain "token"
    And the response header "x-session-id" should be present

  Scenario: Login with invalid email does not authenticate
    When the user POSTS /api/auth/login with body {
      "email": "invalid@example.com",
      "password": "password123"
    }
    Then the response should have status 401
    And the response body should contain error "Identifiants invalides"
```

### Step Definition Template

```typescript
// test/conformance/steps/auth.steps.ts
import { Given, When, Then } from 'cucumber'
import { request } from '@/tests/fixtures/http-client'

Given('the user exists in the database', { timeout: 30000 }, async function() {
  const user = await database.users.create({
    email: this.data.email,
    password_hash: await bcrypt.hash(this.data.password, 10),
    role: 'CONSUMER'
  })
  this.userId = user.id
})

When('the user POSTS /api/auth/login', async function() {
  const response = await request.post('/api/auth/login', {
    data: {
      email: this.email,
      password: this.password
    }
  })
  this.response = response
  this.statusCode = response.status()
})

Then('the response should have status {int}', function(status) {
  expect(this.statusCode).toBe(status)
})

Then('the response body should contain', async function(string) {
  const body = await this.response.json()
  expect(body.error).toContain(string)
})
```

### Command Examples

```bash
# Parse to JSON format
npx gherkin-parser specs/features/auth.feature --format json

# Convert to XUnit format for CI
npx cucumber-js --format cucumberJUnit
```

## 4. Pact Integration Testing

### Purpose
Consumer-driven contract testing ensuring provider implementations remain compatible.

### Tools
- **Pact CLI**: Consumer provisioning with Pact mock servers
- **Pact Broker**: Contract publishing and verification
- **Cypress-Pact**: Frontend contract testing

### Generation Pipeline

```bash
# Install Pact tools
npm install -D @pact-foundation/pact-cli @pact-io/pact-mock-service

# Generate Pact consumer test
pact write provider-n pact \
  --consumer TerraProxi-WebApp \
  --provider TerraProxi-Api \
  --branch main \
  --loglevel info

# Generate provider tests
pact-broker contract testing \
  --pact-broker-url https://pacts.determinate.io \
  --directory .pact pledges \
  --time-to-live 24h \
  --verify

# Run pact tests
npm run pact:test
```

### Consumer Pact Template

```bash
npx pact write consumer <consumer_name> \
  --apiVersion "v1" \
  --pactDir "./pacts" \
  --outputDir "./src/generated/pact"
```

### Provider Pact Template

```bash
npx pact-broker create-provider-pact \
  --name TerraProxi-Api \
  --pact-url "https://pact-broker.example.com" \
  --repository "github.com/terraproxi/frontend" \
  --branch main \
  --tag latest
```

### Command Examples

```bash
# Create mock provider service
npx pact-mock-service --port 1234 --log level=info

# Start provider mock in CI
npm run pact:setup:provider

# Verify provider implementation
npx pact-cli verify \
  --provider TerraProxi-Api \
  --pact-broker-url https://pact-broker.example.com \
  --provider-states-url http://localhost:1234/states

# Publish contract to broker
npm run pact:publish
```

## 5. Common Command Line Tools

### Spectral (Linting)

```bash
npm install -g @stoplight/spectral-cli
spectral lint specs/api/openapi.yaml
spectral lint specs/schemas/*.json
```

### Typebox Validation (JS runtime)

```bash
npm install -g typebox
npx typebox validate specs/schemas/order.schema.json
```

### Caddy Templating (Dev)

```bash
npx caddy adapt --config Caddyfile
```

### Bridge OpenAPI (Verification)

```bash
npm install -g @stoplightio/bridge-openapi
bridge-openapi openapi.yaml
```

## CI/CD Integration

```yaml
# .github/workflows/test-generation.yml
- name: Install Generator Tools
  run: npm install -g @stoplight/spectral-cli @openapitools/openapi-generator-cli

- name: Lint OpenAPI Spec
  run: spectral lint specs/api/openapi.yaml

- name: Validate JSON Schemas
  run: ajv validate -s specs/schemas/**/*.json

- name: Generate TypeScript Types
  run: openapi-generator-cli generate -g typescript-axios -i specs/api/openapi.yaml -o ./src/types/generated

- name: Generate Test Cases
  run: npx json-schema-faker -s specs/schemas/order.schema.json -o tests/fixtures/

- name: Run Gherkin Tests
  run: cucumber-js specs/features/*.feature

- name: Run Pact Tests
  run: npm run pact:test

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: artifacts/
```

## Template Structure

```
tests/conformance/
├── spec-templates/
│   ├── README.md                  # This file
│   ├── openapi-generation.md      # OpenAPI → Tests pipeline
│   ├── jsonschema-generation.md   # JSON Schema → Mocks
│   ├── gherkin-generation.md      # Gherkin → Integration tests
│   ├── pact-generation.md         # Pact → Contract tests
│   ├── generation-pipelines.yaml  # CI pipeline definitions
│   └── hooks/                     # Test lifecycle hooks
├── generated/                      # Auto-generated test files
│   ├── api-tests/
│   ├── type-tests/
│   └── integration-tests/
└── fixtures/                       # Shared test data
    ├── valid/                     # Valid payloads by contract
    └── invalid/                   # Invalid payloads for validation
```

## Best Practices

1. **Generate from sources, not twice**: Always run generators from git-tracked spec files to ensure reproducibility
2. **Fail fast in CI**: Contract linting checks must fail builds before test execution
3. **Cache generated artifacts**: Use CI caching for generated TypeScript types
4. **Parallelize test suites**: Multiple contract suites can run concurrently with matrix builds
5. **Version controlled generated code**: Commit generated files to reduce noise in PRs

## Troubleshooting

```bash
# Failed schema validation: check Key-Value pairs
# Error: "keyword" is incorrect

# Fix by running:
ajv compile -s specs/schemas/order.schema.json > /dev/null

# Generator fails: check OpenAPI spec syntax
npx openapi-validator openapi.yaml

# Pact test fails: verify provider states
pact-broker contract testing --verify

# Cucumber test fails: check step definitions
npx cucumber-js --dry-run
```

## Documentation Links

- [OpenAPI Generator CLI](https://openapi-generator.tech/docs/generators/typescript-axios)
- [Ajv CLI Validation](https://ajv.js.org/cli.html)
- [Cucumber.js Documentation](https://cucumber.io/docs/running-tests/integrate-with-code/)
- [Pact Documentation](https://docs.pact.io/)
- [spectral CLI](https://www.npmjs.com/package/@stoplight/spectral-cli)