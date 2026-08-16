#!/bin/bash
pg_ctlcluster 18 main start
redis-server --protected-mode no --bind 0.0.0.0
