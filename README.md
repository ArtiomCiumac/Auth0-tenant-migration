# Auth0-tenant-migration

Demo scripts and apps that show how two tenants can be chained together so that users migrate over time from the old to the new one.

# Notes

The password are hashed and cannot be exported, so users migrate over time when they log in. Inactive users that never log in will not be migrated using this method.

# Deployment

For the purposes of this demo:
Old tenant: artex-old
New tenant: artex-new

* Create two tenants
* In the old tenant, create a non-interactive client, connect it to the management API and grant read permissions for users and users app metadata
* For newly created client in prev step:
	* set the "Token endpoint authentication" to "Basic",
	* in advanced settings, modify grant types to include only "Client credentials"
* In the new tenant, create a custom database connection and set it to import users to Auth0
* Clone this repository to your own on github
* Adjust the naming of connection folders to match the custom database connection name
* In the new tenant, install the `github-deployments` extension
* Configure to deploy from the cloned repository

Demo

* Make sure the old tenant has a few users
* Adjust configuration for the included ASP.NET Core project to use the new tenant
* Run and try to log in with an user existing in the old tenant - it should be migrated automatically

## Remarks

Another source control system can be used or all scripts can be deployed manually