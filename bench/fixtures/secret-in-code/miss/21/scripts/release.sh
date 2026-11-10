#!/usr/bin/env bash
: "${GH_TOKEN:?set GH_TOKEN to a ghp_ token with repo scope}"
gh release create "$1"
