# Raw SQL Rules v0.3

## Scope

These Rules apply to application paths where Raw SQL is the selected query
representation. For covered paths, application data access is expressed as
directly reviewable ordinary SQL and executed through the selected database
driver.

Connections and pools, transactions, retries, logging, result mapping,
migrations, tests, deployment and execution integration, and business semantics
remain application-owned. Application architecture and framework remain
application choices.

## Safety Contract

Runtime input must not supply arbitrary SQL syntax. The application retains
control of SQL syntax and structural choices. Application-controlled, reviewed
structural variation remains permitted.

## Requirements

### 1. Executable application SQL has one authoritative reviewable source

Each executable application SQL statement has one authoritative definition that
a reviewer can locate from its execution sites and read directly as ordinary
SQL. The definition may be in a dedicated source or colocated with the operation
that binds or executes it. A runtime `.sql` asset is not required: host-language
source is acceptable when the SQL remains directly visible. Do not hide it
behind query construction, generated output, or another opaque representation,
and do not maintain a generated mirror or duplicate canonical source.

CTEs and subqueries remain part of one statement. When an operation executes
multiple executable application statements, each has its own identifiable
authoritative definition; they may share the operation's source file. Multiple
callers may reference the same definition. File extension and directory layout
are application choices.

This requirement applies only to executable application SQL. It does not
prescribe placement for migrations, current or canonical schema sources, driver
or control statements, non-application health or probe statements, or
non-executable documentation and examples. These boundaries do not permit
application query logic to be reclassified to avoid review.

### 2. Parameters use named definitions and named bindings

The authoritative application SQL uses meaningful named parameters, and the
calling code binds values by those names. Positional or anonymous parameters,
such as `$1`, `$2`, `?`, or `:1`, do not satisfy this requirement when comments,
aliases, or manual value-array ordering are used to maintain the correspondence.
For example, `$1 AS tenant_id` does not make a positional parameter named.

A selected driver may require a positional or anonymous representation at its
boundary. That representation is permitted only when the correspondence and
value array are mechanically derived from the authoritative names, without a
second manually maintained authoritative source or mapping table. Values are
passed as bound values, never embedded into SQL syntax.

These Rules do not require a particular named-marker notation, DBMS, driver,
library, file extension, or lowering implementation.

### 3. Current schema is directly inspectable

The current relevant database structure is directly inspectable without requiring
a reviewer to mentally reconstruct current state by replaying migration history.
A canonical current DDL source, a schema definition, or another directly
inspectable current-schema representation may satisfy this requirement. Migration
history alone does not satisfy it when current state cannot be determined
directly.

### 4. DB/driver-dependent behavior is verifiable with the target DB engine and driver

When correctness depends on database-engine or driver behavior, the project has
a path to verify that behavior through the target database engine and selected
driver. Verification may use an isolated or disposable test database; production
access or production data is not required. These Rules do not prescribe a test
framework, test architecture, or execution environment. Having that path does
not mean every change has already been verified through it.
