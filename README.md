# Auth0-tenant-migration

Demo scripts for a custom DB connection that shows how two tenants can be
 chained together so that users migrate over time from the old to the new one.

For security purposes, hashed passwords cannot be exported from the system,
 therefore a different approach is required to migrate the users with minimal
 interruption and at the same time not requiring users to reset their
 passwords.

To achieve this, a custom connection database can be created in the new tenant
 that works in [migration mode](https://auth0.com/docs/connections/database/migrating)
 to connect programmatically to the old tenant. This way consumer apps can be
 redirected to the new tenant and users can log in as before without
 interruption.

Note that the users records in the old tenant will not be affected. While old
 tenant remains fully functional, it is not recommended to perform any updates
 on the users who were already imported as their state will diverge. To avoid
 this all old tenant consumer clients should be redirected to the new tenant.


## Prerequisites

Two tenants are required for this scenario. The first tenant will act as a
 source of accounts to migrate ("old tenant"). The second one will act as the
 destination of accounts to migrate to ("new tenant"). This scenario assumes
 that the old tenant already contains some users to migrate.


## Setup

Both tenants require administrative access to set up this scenario.
 Tenant-specific configuration is described below.


### Old tenant setup

An API client is required to access the old users database programmatically.
 This client should be capable to perform the
 [resource owner password](https://auth0.com/docs/api-auth/grant/password)
 flow to check user credentials on login, as well as
 [client credentials](https://auth0.com/docs/api-auth/grant/client-credentials)
 flow to import user's profile and check user existence if a password reset is
 requested for a non-imported user.

To create the client with required settings perform the following:

_Note: all actions should be performed in the old tenant account._

1. Navigate to clients dashboard section and create a new non-interactive 
   [client](https://auth0.com/docs/clients).

2. In the client properties, take a note of the following properties that will
   be used in the new tenant:

   * Domain - will be used for authentication purposes and to construct
     API access URLs.
   * Client ID - will be used for authentication purposes.
   * Client Secret - will be used for authentication purposes. Make sure to
     keep this value safe.

3. On the same page in client properties make sure the following settings
   are set:

   * Client Type - Non Interactive Client
   * Token Endpoint Authentication Method - Post

4. On the same page in client properties, open the "Advanced Settings":
   
   * On "Grant Types" page check "Client Credentials" and "Password" and
     uncheck everything else.
   * Save the changes.

5. In client properties, on top of the page go to "Connections" and
   [connect](https://auth0.com/docs/clients/connections) it to the database
   containing old users.


### New tenant setup

A custom database should be created with enabled automatic migration so that
 the users from old tenant can be imported automatically and transparently.
 In this configuration, the database requires "Login" and "GetUser" scripts
 from this repository.

The deployment of these scritps can be set up to be performed automatically
 from source code or manually via management UI. This document describes the
 steps necessary for automatic deployment from a Github repository, however
 this is not mandatory.

_Note: all actions should be performed in the new tenant account._

1. Create a new
   [custom database](https://auth0.com/docs/connections/database/migrating#enable-automatic-migration)
   and set it up for automatic user account migration.

2. In the new database settings, go to "Custom database" section and fill the
   following settings at the bottom of the page with the values obtained
   during the old tenant setup at step 2:

   * `domain` - set to the client "Domain" prefixed with "https".
     For example `https://old-tenant.auth0.com`.
   * `client_id` - set to "Client ID".
   * `client_secret` - set to "Client Secret".

3. Clone this repository and rename the database name subfolder
   `artex-old-import` to match the database name you created in step 1.

4. In the new tenant, install and configure the
   [github deployments](https://auth0.com/docs/extensions/github-deploy)
   extension to point to the cloned repository. This way any changes in the
   source code will be deployed automatically.

5. Trigger a deployment manually or by pushing changes to github and ensure
   that the database "Login" and "GetUser" scripts were deployed.


## Usage

Connect a client to the new tenant's database and try to log in with an user
 that exists only in the old tenant. If everything was done correctly - the
 user should be able to log in successfully. After this event his full profile
 should be imported automatically to the new database.


## Further development

When a user is saved in Auth0 database, the system adds the `auth0|` prefix to
 his ID, however if such prefix is already present - it gets duplicated which
 essentially changes user's ID. This behavior may break existing clients which
 rely on user ID to store additional data in their internal database. To
 workaround this, the Login script strips the prefix from user ID on profile
 import.

The reset password feature requires an exact search by email. The current
 implementation of the "GetUser" script uses an API whose search is based
 on Lucene search syntax and it does not allow exact match specification.
 Essentially this means that searching for `a@example.com` potentially can
 match `aa@example.com` as well. To minimize the impact of such behavior, the
 "GetUser" script performs a check and if an incorrect user profile was found
 it raises an error. For end user this may fail the password reset flow.
