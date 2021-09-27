#!/bin/bash
set -e;

# a default non-root role
MONGO_NON_ROOT_ROLE="${MONGO_NON_ROOT_ROLE:-readWrite}"

if [ -n "${DATABASE_USERNAME:-}" ] && [ -n "${DATABASE_PWD:-}" ]; then
	"${mongo[@]}" "$MONGO_INITDB_DATABASE" <<-EOJS
		db.createUser({
			user: $(_js_escape "$DATABASE_USERNAME"),
			pwd: $(_js_escape "$DATABASE_PWD"),
			roles: [ { role: $(_js_escape "$MONGO_NON_ROOT_ROLE"), db: $(_js_escape "$MONGO_INITDB_DATABASE") } ]
			})
	EOJS
    echo "Custom user ${DATABASE_USERNAME} created"
else
    echo "No username or password detected for mongodb custom user"
fi
