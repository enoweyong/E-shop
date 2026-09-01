const path = require("path");
const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const iam = require("aws-cdk-lib/aws-iam");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");

class EcommerceStack extends cdk.Stack {
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    const table = new dynamodb.CfnTable(this, "EcommerceTableL1", {
      tableName: "northstar-market-data",
      billingMode: "PAY_PER_REQUEST",
      attributeDefinitions: [
        { attributeName: "entityType", attributeType: "S" },
        { attributeName: "entityId", attributeType: "S" }
      ],
      keySchema: [
        { attributeName: "entityType", keyType: "HASH" },
        { attributeName: "entityId", keyType: "RANGE" }
      ],
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false }
    });
    table.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    const adminTable = new dynamodb.CfnTable(this, "AdminTableL1", {
      tableName: "northstar-market-admins",
      billingMode: "PAY_PER_REQUEST",
      attributeDefinitions: [
        { attributeName: "entityType", attributeType: "S" },
        { attributeName: "entityId", attributeType: "S" }
      ],
      keySchema: [
        { attributeName: "entityType", keyType: "HASH" },
        { attributeName: "entityId", keyType: "RANGE" }
      ]
    });
    adminTable.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    const commonEnvironment = {
      TABLE_NAME: table.ref,
      ADMIN_TABLE_NAME: adminTable.ref,
      ALLOWED_ORIGIN: props.frontendOrigin || "*",
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
    const tableArn = cdk.Stack.of(this).formatArn({ service: "dynamodb", resource: table.ref });
    const adminTableArn = cdk.Stack.of(this).formatArn({ service: "dynamodb", resource: adminTable.ref });
    const tablePolicy = new iam.PolicyStatement({ actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:TransactWriteItems"], resources: [tableArn] });
    [catalogFunction, authFunction, ordersFunction].forEach(fn => fn.addToRolePolicy(tablePolicy));
    authFunction.addToRolePolicy(new iam.PolicyStatement({ actions: ["dynamodb:GetItem", "dynamodb:PutItem"], resources: [adminTableArn] }));

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
    new cdk.CfnOutput(this, "DynamoTableName", { value: table.ref });
    new cdk.CfnOutput(this, "AdminTableName", { value: adminTable.ref });
  }
}

module.exports = { EcommerceStack };
