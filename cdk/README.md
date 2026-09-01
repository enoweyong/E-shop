# Northstar Market CDK

This is the CDK version of the serverless infrastructure. It uses:

- L1: `dynamodb.CfnTable` for the ecommerce and dedicated admin DynamoDB tables
- L2: Lambda functions, API Gateway REST API, S3 bucket, IAM policy statements, and S3 deployment
- Existing handlers from `../lambda/index.js`

## Commands

From this folder:

```powershell
npm install
npx cdk synth --profile Eyong
npx cdk diff --profile Eyong
npx cdk deploy --profile Eyong --parameters AdminPassword=YOUR_STRONG_PASSWORD
```

The stack targets account `793593623274` in `us-east-1`. CDK deploy creates a separate stack named `NorthstarMarketCdkStack`; remove the older SAM stack first only if you intend CDK to become the sole owner of the resources.

The app uses the existing frontend in `../FrontEnd` and Lambda source in `../lambda`. The S3 deployment uploads the frontend automatically. Use the CDK outputs for the API, website, ecommerce table, and AdminTable names.
