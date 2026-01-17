#!/bin/bash

# Vai nella directory
cd /home/spi/YouJazz/server || exit 1

# Esegui lo script
/usr/bin/node scripts/daily-notification.js >> logs/daily-notifications.log 2>&1

EXIT_CODE=$?

# Log di fine
echo "$(date): Fine esecuzione - Exit code: $EXIT_CODE" >> logs/cron-execution.log
echo "" >> logs/cron-execution.log

exit $EXIT_CODE