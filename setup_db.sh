#!/usr/bin/env bash
set -e
service postgresql restart
service redis-server restart

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/18/main/postgresql.conf || true
echo "host all all 0.0.0.0/0 trust" >> /etc/postgresql/18/main/pg_hba.conf
echo "host all all 127.0.0.1/32 trust" >> /etc/postgresql/18/main/pg_hba.conf
echo "host all all ::1/128 trust" >> /etc/postgresql/18/main/pg_hba.conf
echo "host all all all trust" >> /etc/postgresql/18/main/pg_hba.conf
service postgresql reload

su - postgres -c "psql -c \"DROP DATABASE IF EXISTS autowork_db;\"" || true
su - postgres -c "psql -c \"DROP USER IF EXISTS autowork;\"" || true
su - postgres -c "psql -c \"CREATE USER autowork WITH LOGIN SUPERUSER PASSWORD 'autoworkpass';\""
su - postgres -c "psql -c \"CREATE DATABASE autowork_db OWNER autowork;\""

echo "POSTGRES_READY"
redis-cli ping
