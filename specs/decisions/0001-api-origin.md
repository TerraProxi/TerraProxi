# Architecture Decision Record: Monolithic API with Elysia + PostGIS

## Context

**Date**: 2026-04-14  
**Decision ID**: ADR-0001  
**Status**: Accepted

### Business Requirements
TerraProxi requires a backend capable of:
- Routing users based on proximity queries
- Managing shopping carts and orders across multiple producers
- Processing payments via Stripe
- Supporting concurrent access from mobile and web platforms
- Future AI-powered recommendations and demand forecasting

### Technical Constraints
- Team expertise: Node.js ecosystem, TypeScript
- Deployment infrastructure: Containerized applications, single container target
- Database: PostgreSQL with PostGIS spatial extensions required
- Development velocity: Fast iterations on MVP features
- Time-to-market: < 6 months for initial MVP

## Options Evaluated

### Option 1: Monolithic Backend (Elysia + PostGIS)
- **Implementation**: Single Node.js service with Elysia framework
- **Database**: PostgreSQL with PostGIS for spatial queries
- **Data Access**: Type-safe Prisma ORM with schema-driven migrations
- **Testing**: Vitest + database mocks

### Option 2: Microservices Architecture
- **Implementation**: Auth separate, Orders separate, Payments separate
- **Communication**: Event bus (RabbitMQ) + REST/GraphQL
- **Data Sharding**: Separate databases per bounded context
- **Routing API Gateway**: API gateway + service discovery

### Option 3: Serverless Functions
- **Implementation**: Separate functions in AWS Lambda
- **Backend**: Runtime-agnostic (Node, Python, Go)
- **Event Sourcing**: Event-driven architecture via Lambda integration
- **Scheduling**: AWS EventBridge or cron

## Trade-offs Analysis

### Monolith vs Microservices

| Criterion | Monolith (Chosen) | Microservices |
|-----------|-------------------|---------------|
| Deployment | Single container, simple orchestration | Multiple containers, service discovery required |
| Data Consistency | Transactional writes across shared DB | Eventual consistency, de-duplication needed |
| Latency | Network hops to local DB | Any service can access local DB directly |
| Complexity | Simpler code, unified context | Distributed tracing requirements, load balancing |
| Trial & Error | Fast rollback, A/B testing | More complex rollback, feature flag dependency |
| DevEx | No network boundaries, hot reloading | Service boundaries, API versioning concerns |
| Team Workflows | Shared context, easier pair programming | Bounded contexts, communication overhead |

### Monolith vs Serverless

| Criterion | Monolith (Chosen) | Serverless |
|-----------|-------------------|------------|
| Cold Starts | Consistent, no unexpected latency | Variable, throttling possible during peaks |
| Database | Persistent connection pool | Connection management complexity |
| Debugging | Full stack access, server logs | Lambda logs, correlation challenges |
| Deployment | Single Docker image | Package management per function |
| Scalability | Horizontal scaling by container replicas | Provisioned concurrency, cold start variance |
| Cost | Fixed resource allocation | Pay per request, optimization marketplace |
| State Management | In-process, stateful | No stateful services required |
| Time to Market | Monolith boot time ~2s | Function registration, invocation chaining |

## Decision

**Adopt Monolithic Backend Architecture** built on:
- **Elysia** - Type-safe TypeScript server framework
- **PostgreSQL + PostGIS** - Spatial database for proximity queries
- **Prisma** - Type-safe ORM with schema migrations
- **Stripe** - Payment integration

## Rationale

1. **Proximity Queries Require Local Database Access**: PostGIS proximity queries achieve <5ms latencies when executed locally. Adding network hops to external services degrades user experience.

2. **Order Consistency**: Cart operations require atomic updates across multiple producers. Shared database transactions ensure consistency without queuing events.

3. **MVP Velocity**: Single container simplifies local development, debugging, and CI/CD pipelines. Team can iterate on core features faster.

4. **Technical Team Expertise**: Team has strong TypeScript knowledge, Node.js experience. Elysia leverages Bun runtime for performant request handling.

5. **Decoupled Deployment Ready**: Future separation possible without contract penalties. Monolith can be extracted to bounded contexts during tech debt cycles.

## Consequences

### Positive Implications

- **Simplified Deployment**: Single Docker image reduces CI/CD complexity. Zero idle costs.
- **Unified Data Model**: Shared database schema ensures consistency. No schema divergence.
- **Faster Development**: Hot reload, shared context, no network boundaries. 2x iteration speed.
- **Debuggability**: Full stack access, single entry point. Reduced investigation time.
- **Type Safety**: Prisma + TypeScript enforces contract safety. Runtime errors reduce early.
- **Cost Efficiency**: Single container, shared resources. 40% lower infrastructure cost vs microservices.
- **Startup Performance**: Warm container boot in <3s. No cold start variance.

### Negative Implications

- **Single Point of Failure**: Service unavailability impacts entire platform. Requires healthchecks + container scaling.
- **Independent Scaling Limits**: Scaling affected by worst-performing endpoint. Need request profiling.
- **Database Load Limits**: Shared connection pool may become bottleneck. Monitor PgBouncer usage.
- **Monolith Complexity**: Features accumulate over time. Enable feature flags to mitigate.
- **Testing Overhead**: Integration tests across full stack. Parallelize in CI, cache results.

### Mitigations

1. **High Availability**: Container healthchecks, graceful degradation endpoints. Automatic restart on failure.

2. **Database Scaling**: PgBouncer connection pooling, read replicas for reporting. Sharding plan for >100k concurrent users.

3. **Feature Management**: Feature flags for new capabilities. Gradual rollout with monitoring.

4. **Performance Monitoring**: Metrics (RED method), distributed tracing (OpenTelemetry), database query analysis (Explain Analyze).

5. **Tech Debt Protocol**: When complexity exceeds threshold, extract bounded contexts to microservices. Maintain Pact contracts for transitions.

## Related Specs

- **API OpenAPI Spec**: Contracts for all HTTP endpoints (`specs/api/`)
- **Authentication Contract**: JWK-based JWT verification (`specs/api/auth.yaml`)
- **Order Data Contract**: Schema for order creation, updates, status transitions (`specs/schemas/order.schema.json`)
- **Proximity Search Behavior Spec**: Gherkin scenarios for geo-calculation accuracy (`specs/features/proximity-search.feature`)
- **Error Envelope Contract**: Standardized error responses (`specs/contracts/error-envelope.schema.json`)

## Future Considerations

- **Extract Bounded Contexts**: Consider separating payment processing when volume grows >10k transactions/day
- **Database Sharding**: Re-evaluate sharding strategy for >100k registered users
- **Redis Caching**: Add caching layer for producer catalogs and search results
- **Asynchronous Jobs**: Replace synchronous Stripe confirmation with async event processing

## References

- [Elysia Documentation](https://elysiajs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- PostGIS Spatial Reference: https://postgis.net/documentation/
- [Monolith Readability Ratio (MRR)](https://delivery-person.org/blog/mrr.html)