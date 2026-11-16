#!/bin/sh
set -eu
if [ -f /transfer/restore-complete ]; then
  echo 'Base ya restaurada; se conservan los datos actuales.'
  exit 0
fi
test -s /transfer/restore-pending
test -s /transfer/database.sql
MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 -hdb -u"$MYSQL_USER" "$MYSQL_DATABASE" < /transfer/database.sql
rm /transfer/database.sql
mv /transfer/restore-pending /transfer/restore-complete
echo 'Base de datos restaurada correctamente.'
