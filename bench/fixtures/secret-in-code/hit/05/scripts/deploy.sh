#!/usr/bin/env bash
set -e
GITHUB_TOKEN=ghp_sFXgTEvYEAkaXALUB0BMW0w2eoRJFyyzRUJC
gh release create "v$1" --notes "release $1"
