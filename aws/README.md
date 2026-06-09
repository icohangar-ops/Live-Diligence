# AWS deployment (Bedrock + Lambda)

This stack mirrors the agent runtime on AWS as the SuperAI NEXT "Top-5" qualifying deployment path.

## What it provisions

- **Lambda** (`runner.ts`) — Node 20, runs the agent loop end-to-end.
- **API Gateway HTTP API** — POST `/run-report`.
- **DynamoDB** — `Reports` + `Events` tables.
- **Bedrock** — Claude 3.5 Sonnet as the synthesizer (alt to Gemini).
- **Secrets Manager** — `live-diligence/exa-api-key`, `live-diligence/stripe-secret`.

## Deploy

```bash
cd aws
bun install

# one-time
bunx cdk bootstrap

# put your keys in secrets manager
aws secretsmanager put-secret-value --secret-id live-diligence/exa-api-key --secret-string "$EXA_API_KEY"
aws secretsmanager put-secret-value --secret-id live-diligence/stripe-secret --secret-string "$STRIPE_SECRET_KEY"

bunx cdk deploy
```

## Invoke

```bash
curl -X POST "$API_URL/run-report" \
  -H 'content-type: application/json' \
  -d '{"reportId":"<uuid>", "query":"NVDA latest 10-Q analysis"}'
```

Poll DynamoDB or wire the AWS path into the Lovable frontend by pointing `PUBLIC_APP_URL` at the API Gateway URL.
