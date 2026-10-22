#!/bin/sh
set -eu

./node_modules/.bin/prisma migrate deploy
ALLOW_CATALOG_SEED=true node ./catalog-seed.mjs
