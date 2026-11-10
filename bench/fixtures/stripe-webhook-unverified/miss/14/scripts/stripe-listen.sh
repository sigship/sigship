#!/usr/bin/env bash
stripe listen --events checkout.session.completed,invoice.paid --forward-to localhost:3000/api/webhooks/stripe
