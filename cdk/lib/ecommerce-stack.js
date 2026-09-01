const path = require("path");
const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const cognito = require("aws-cdk-lib/aws-cognito");

class EcommerceStack extends cdk.Stack {
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "EcommerceTableL2", {
      tableName: "northstar-market-data",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "entityType", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "entityId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false }
    });

    const adminTable = new dynamodb.Table(this, "AdminTableL2", {
      tableName: "northstar-market-admins",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "entityType", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "entityId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    const userPool = new cognito.UserPool(this, "AdminUserPool", {
      userPoolName: "northstar-market-admins",
      selfSignUpEnabled: true,
      signInAliases: { username: true, email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true
      }
    });
    const userPoolClient = new cognito.UserPoolClient(this, "AdminUserPoolClient", {
      userPool,
      authFlows: { userPassword: true, userSrp: true },
      generateSecret: false
    });

    const commonEnvironment = {
      TABLE_NAME: table.tableName,
      ADMIN_TABLE_NAME: adminTable.tableName,
      ALLOWED_ORIGIN: props.frontendOrigin || "*",
      COGNITO_USER_POOL_ID: userPool.userPoolId,
      COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      ADMIN_USERNAME: props.adminUsername || "eyong",
      ADMIN_PASSWORD: new cdk.CfnParameter(this, "AdminPassword", {
        type: "String",
        noEcho: true,
        description: "Demo admin password. Supply a strong value at deploy time."
      }).valueAsString,
      ADMIN_EMAIL: props.adminEmail || "admin@example.com"
    };
    const momoEnvironment = {
      MOMO_BASE_URL: "https://sandbox.momodeveloper.mtn.com",
      MOMO_COLLECTION_SUBSCRIPTION_KEY: new cdk.CfnParameter(this, "MomoSubscriptionKey", { type: "String", noEcho: true }).valueAsString,
      MOMO_API_USER: new cdk.CfnParameter(this, "MomoApiUser", { type: "String", noEcho: true }).valueAsString,
      MOMO_API_KEY: new cdk.CfnParameter(this, "MomoApiKey", { type: "String", noEcho: true }).valueAsString
    };

    const makeFunction = (id, handler) => new lambda.Function(this, id, {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: `index.${handler}`,
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda")),
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: commonEnvironment
    });

    const catalogFunction = makeFunction("CatalogFunctionL2", "catalogRouter");
    const authFunction = makeFunction("AuthFunctionL2", "authRouter");
    const ordersFunction = makeFunction("OrdersFunctionL2", "ordersRouter");
    const momoFunction = makeFunction("MomoFunctionL2", "momoRouter");
    for (const [key, value] of Object.entries(momoEnvironment)) {
      momoFunction.addEnvironment(key, value);
    }
    // Grant DynamoDB access through the built-in CDK grant methods instead of
    // hand-written IAM statements. This puts the permissions on each Lambda
    // execution role (the correct place) and produces no risky resource-policy diffs.
    [catalogFunction, authFunction, ordersFunction].forEach(fn => table.grantReadWriteData(fn));
    table.grantReadWriteData(momoFunction);
    adminTable.grantReadWriteData(authFunction);
    // grantReadWriteData doesn't include TransactWriteItems; grant it explicitly.
    [catalogFunction, authFunction, ordersFunction, momoFunction].forEach(fn =>
      table.grant(fn, "dynamodb:TransactWriteItems"));

    const api = new apigateway.RestApi(this, "EcommerceApiL2", {
      restApiName: "Northstar Market API",
      defaultCorsPreflightOptions: {
        allowOrigins: [props.frontendOrigin || "*"],
        allowHeaders: ["Content-Type"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      }
    });
    const products = api.root.addResource("api").addResource("products");
    const product = products.addResource("{id}");
    const catalogIntegration = new apigateway.LambdaIntegration(catalogFunction);
    products.addMethod("GET", catalogIntegration); products.addMethod("POST", catalogIntegration);
    product.addMethod("GET", catalogIntegration); product.addMethod("PUT", catalogIntegration); product.addMethod("DELETE", catalogIntegration);
    const admin = api.root.getResource("api").addResource("admin");
    const authIntegration = new apigateway.LambdaIntegration(authFunction);
    admin.addResource("config").addMethod("GET", authIntegration);
    admin.addResource("login").addMethod("POST", authIntegration);
    admin.addResource("register").addMethod("POST", authIntegration);
    const orders = api.root.getResource("api").addResource("orders");
    const orderIntegration = new apigateway.LambdaIntegration(ordersFunction);
    orders.addMethod("GET", orderIntegration); orders.addMethod("POST", orderIntegration);
    const momo = api.root.getResource("api").addResource("payments").addResource("momo");
    const momoIntegration = new apigateway.LambdaIntegration(momoFunction);
    momo.addMethod("POST", momoIntegration);
    momo.addResource("{reference}").addMethod("GET", momoIntegration);

    const website = new s3.Bucket(this, "FrontendBucketL2", { blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS, publicReadAccess: true, websiteIndexDocument: "index.html", websiteErrorDocument: "index.html", removalPolicy: cdk.RemovalPolicy.RETAIN, autoDeleteObjects: false });
    new s3deploy.BucketDeployment(this, "FrontendDeploymentL2", { destinationBucket: website, sources: [s3deploy.Source.asset(path.join(__dirname, "../../FrontEnd"))] });

    new cdk.CfnOutput(this, "ApiUrl", { value: `${api.url}api`, description: "API Gateway URL for FrontEnd/index.html" });
    new cdk.CfnOutput(this, "FrontendWebsiteUrl", { value: website.bucketWebsiteUrl });
    new cdk.CfnOutput(this, "FrontendBucketName", { value: website.bucketName });
    new cdk.CfnOutput(this, "DynamoTableName", { value: table.tableName });
    new cdk.CfnOutput(this, "AdminTableName", { value: adminTable.tableName });
    new cdk.CfnOutput(this, "CognitoUserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "CognitoClientId", { value: userPoolClient.userPoolClientId });
  }
}

module.exports = { EcommerceStack };
