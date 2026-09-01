# AWS deployment

This project now has a SAM template for the API, Lambda functions, DynamoDB, and S3 frontend hosting.

## Deploy

Prerequisites: AWS CLI, AWS SAM CLI, and an AWS account configured with `aws configure`.

```powershell
sam build
sam deploy --guided --parameter-overrides AdminPassword=1234 FrontendOrigin='*'
```

If SAM CLI is unavailable, use the authenticated `Eyong` profile and the generated packaged template:

```powershell
aws cloudformation package --template-file template.yaml --s3-bucket cdk-hnb659fds-assets-793593623274-us-east-1 --output-template-file packaged-template.yaml --profile Eyong
aws cloudformation deploy --template-file packaged-template.yaml --stack-name northstar-market --capabilities CAPABILITY_IAM --parameter-overrides AdminPassword=REPLACE_WITH_A_STRONG_PASSWORD FrontendOrigin='*' --profile Eyong
```

Replace the password placeholder directly in your terminal. Do not commit it to this repository.

Use a real admin password for any shared or production account. The template creates:

- `CatalogFunction`: product list, lookup, create, update, and delete routes
- `AuthFunction`: admin login route
- `OrdersFunction`: checkout and order listing routes
- `EcommerceTable`: single DynamoDB table with `PRODUCT` and `ORDER` entity partitions
- `AdminTable`: dedicated DynamoDB table for admin names, email addresses, and hashed passwords
- `FrontendBucket`: S3 static website bucket
- `EcommerceApi`: API Gateway REST API with CORS

After deployment, copy the `ApiUrl` output and update `API_URL` in `FrontEnd/index.html` to that value. For example:

```js
const API_URL = "https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/api";
```

The DynamoDB table starts empty. Load the existing catalog through the admin screen after deployment, or add a seed script that writes your chosen inventory before opening the storefront.

## Mobile Money

The checkout uses the MTN MoMo Collection API in sandbox mode. Supply the provider values at deploy time; never commit them:

```powershell
aws cloudformation deploy --template-file packaged-template.yaml --stack-name northstar-market --capabilities CAPABILITY_IAM --parameter-overrides AdminUsername=eyong AdminPassword=YOUR_PASSWORD MomoSubscriptionKey=YOUR_MOMO_SUBSCRIPTION_KEY MomoApiUser=YOUR_MOMO_API_USER MomoApiKey=YOUR_MOMO_API_KEY --profile Eyong
```

The frontend sends the XAF amount and Cameroon MSISDN to `/api/payments/momo`, polls `/api/payments/momo/{reference}`, and only submits `/api/orders` after MoMo returns `SUCCESSFUL`. The order transaction then decrements inventory atomically.

Admin access uses `/api/admin/register` for account creation and `/api/admin/login` for database-backed sign-in. The seeded administrator is `eyong` with password `1234`.

Upload the frontend:

```powershell
aws s3 sync FrontEnd s3://YOUR_FRONTEND_BUCKET --delete
```

Open the `FrontendWebsiteUrl` CloudFormation output. The current S3 website configuration is intentionally simple for this learning project; use CloudFront and HTTPS before production use.
