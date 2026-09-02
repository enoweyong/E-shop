'use strict';

const cdk = require('aws-cdk-lib');
const { Stack, CfnOutput, Duration, RemovalPolicy } = cdk;

const apigateway = require('aws-cdk-lib/aws-apigateway');
const cognito = require('aws-cdk-lib/aws-cognito');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const iam = require('aws-cdk-lib/aws-iam');
const lambda = require('aws-cdk-lib/aws-lambda');
const s3 = require('aws-cdk-lib/aws-s3');

class EcommerceStack extends Stack {
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    /*
     * ============================================================
     * PARAMETERS
     * ============================================================
     */

    const adminPassword = new cdk.CfnParameter(this, 'AdminPassword', {
      type: 'String',
      noEcho: true,
      description:
        'Demo admin password. Use a strong password when deploying.',
      minLength: 8,
    });

    const momoSubscriptionKey = new cdk.CfnParameter(
      this,
      'MomoSubscriptionKey',
      {
        type: 'String',
        noEcho: true,
        default: '',
        description: 'MTN MoMo subscription key.',
      }
    );

    const momoApiUser = new cdk.CfnParameter(this, 'MomoApiUser', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'MTN MoMo API user.',
    });

    const momoApiKey = new cdk.CfnParameter(this, 'MomoApiKey', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'MTN MoMo API key.',
    });

    /*
     * ============================================================
     * DYNAMODB - PRODUCTS / ORDERS
     * ============================================================
     */

    const ecommerceTable = new dynamodb.Table(this, 'EcommerceTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },

      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      encryption: dynamodb.TableEncryption.AWS_MANAGED,

      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },

      removalPolicy: RemovalPolicy.RETAIN,
    });

    /*
     * ============================================================
     * DYNAMODB - ADMIN DATA
     * ============================================================
     */

    const adminTable = new dynamodb.Table(this, 'AdminTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },

      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      encryption: dynamodb.TableEncryption.AWS_MANAGED,

      removalPolicy: RemovalPolicy.RETAIN,
    });

    /*
     * ============================================================
     * COGNITO USER POOL
     * ============================================================
     */

    const adminUserPool = new cognito.UserPool(this, 'AdminUserPool', {
      userPoolName: `${this.stackName}-admin-users`,

      selfSignUpEnabled: true,

      signInAliases: {
        email: true,
        username: true,
      },

      autoVerify: {
        email: false,
      },

      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },

      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      selfSignUpEnabled: true,

      removalPolicy: RemovalPolicy.RETAIN,
    });

    /*
     * Cognito domain for the Hosted UI (used by Google sign-in
     * and the self-service "Forgot password" flow).
     */
    const cognitoDomain = adminUserPool.addDomain('AdminUserPoolDomain', {
      cognitoDomain: {
        domainPrefix: `nsm-${this.stackName.toLowerCase()}`.replace(/[^a-z0-9-]/g, '').slice(0, 60),
      },
    });

    /*
     * Google as a federated identity provider. Provide the real
     * client id/secret at deploy time via:
     *   --context googleClientId=... --context googleClientSecret=...
     * A placeholder secret lets the stack synthesize/deploy before
     * Google credentials are configured.
     */
    const googleClientId =
      this.node.tryGetContext('googleClientId') || 'GOOGLE_CLIENT_ID_PLACEHOLDER';
    const googleClientSecret =
      this.node.tryGetContext('googleClientSecret') || 'GOOGLE_CLIENT_SECRET_PLACEHOLDER';

    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      'GoogleProvider',
      {
        userPool: adminUserPool,
        clientId: googleClientId,
        clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        },
      }
    );

    const adminUserPoolClient = new cognito.UserPoolClient(
      this,
      'AdminUserPoolClient',
      {
        userPool: adminUserPool,

        generateSecret: false,

        authFlows: {
          userPassword: true,
          userSrp: true,
        },

        supportedIdentityProviders: [
          cognito.UserPoolClientIdentityProvider.COGNITO,
          cognito.UserPoolClientIdentityProvider.GOOGLE,
        ],

        oAuth: {
          flows: {
            authorizationCodeGrant: true,
            implicitCodeGrant: true,
          },
          scopes: [
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.PROFILE,
          ],
          callbackUrls: [
            'http://localhost:3000/callback.html',
            'http://localhost:5500/callback.html',
          ],
          logoutUrls: [
            'http://localhost:3000/',
            'http://localhost:5500/',
          ],
        },

        preventUserExistenceErrors: true,
      }
    );

    adminUserPoolClient.node.addDependency(googleProvider);

    /*
     * ============================================================
     * FRONTEND S3 BUCKET
     *
     * IMPORTANT:
     * We intentionally do not use CDK BucketDeployment here.
     * That prevents the generated AWS CLI deployment Lambda and
     * its associated bootstrap/layer problems from your previous
     * stack.
     * ============================================================
     */

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',

      publicReadAccess: true,

      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),

      encryption: s3.BucketEncryption.S3_MANAGED,

      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    /*
     * ============================================================
     * COMMON LAMBDA ENVIRONMENT
     * ============================================================
     */

    const commonEnvironment = {
      TABLE_NAME: ecommerceTable.tableName,
      ADMIN_TABLE_NAME: adminTable.tableName,

      USER_POOL_ID: adminUserPool.userPoolId,
      USER_POOL_CLIENT_ID: adminUserPoolClient.userPoolClientId,
      COGNITO_DOMAIN: cognitoDomain.baseUrl(),

      MOMO_SUBSCRIPTION_KEY: momoSubscriptionKey.valueAsString,
      MOMO_API_USER: momoApiUser.valueAsString,
      MOMO_API_KEY: momoApiKey.valueAsString,

      ADMIN_PASSWORD_PARAM: adminPassword.valueAsString,

      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    /*
     * ============================================================
     * AUTH LAMBDA
     *
     * Handles:
     * POST /api/admin/login
     * POST /api/admin/register
     * GET  /api/admin/config
     * ============================================================
     */

    const authFunction = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,

      handler: 'index.handler',

      timeout: Duration.seconds(30),

      memorySize: 256,

      environment: commonEnvironment,

      code: lambda.Code.fromInline(`
const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  ListUsersCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand
} = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient({});

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  },
  body: JSON.stringify(body)
});

const getBody = (event) => {
  try {
    return typeof event.body === "string"
      ? JSON.parse(event.body || "{}")
      : (event.body || {});
  } catch {
    return {};
  }
};

exports.handler = async (event) => {
  try {
    const path = event.rawPath || event.path || "";
    const method =
      event.requestContext?.http?.method ||
      event.httpMethod ||
      "GET";

    if (method === "GET" && path.endsWith("/config")) {
      return response(200, {
        success: true,
        userPoolId: process.env.USER_POOL_ID,
        clientId: process.env.USER_POOL_CLIENT_ID,
        cognitoDomain: process.env.COGNITO_DOMAIN || null
      });
    }

    if (method === "POST" && path.endsWith("/register")) {
      const body = getBody(event);

      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const name = String(body.name || body.username || "").trim();

      if (!email || !password) {
        return response(400, {
          success: false,
          message: "Email and password are required."
        });
      }

      if (password.length < 8) {
        return response(400, {
          success: false,
          message: "Password must contain at least 8 characters."
        });
      }

      const command = new SignUpCommand({
        ClientId: process.env.USER_POOL_CLIENT_ID,
        Username: name || email.split("@")[0] + "-" + Date.now(),
        Password: password,
        UserAttributes: [
          {
            Name: "email",
            Value: email
          },
          ...(name
            ? [{
                Name: "name",
                Value: name
              }]
            : [])
        ]
      });

      const result = await client.send(command);

      return response(201, {
        success: true,
        message: "Registration successful.",
        userSub: result.UserSub,
        confirmed: result.UserConfirmed
      });
    }

    if (method === "POST" && path.endsWith("/login")) {
      const body = getBody(event);

      const username = String(
        body.email || body.username || ""
      ).trim().toLowerCase();

      const password = String(body.password || "");

      if (!username || !password) {
        return response(400, {
          success: false,
          message: "Username/email and password are required."
        });
      }

      const command = new InitiateAuthCommand({
        ClientId: process.env.USER_POOL_CLIENT_ID,

        AuthFlow: "USER_PASSWORD_AUTH",

        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      });

      const result = await client.send(command);

      return response(200, {
        success: true,
        message: "Login successful.",
        authenticationResult: result.AuthenticationResult || null,
        challengeName: result.ChallengeName || null
      });
    }

    /*
     * FORGOT PASSWORD
     *
     * Step 1: admin gives name + email. Both must match the same
     * Cognito user. Cognito then emails a confirmation code that
     * is valid for 2 hours. If the code expires, calling this
     * endpoint again re-sends the same message with a fresh code.
     */
    if (method === "POST" && path.endsWith("/forgot-password")) {
      const body = getBody(event);

      const name = String(body.name || body.username || "").trim();
      const email = String(body.email || "").trim().toLowerCase();

      if (!name || !email) {
        return response(400, {
          success: false,
          message: "Name and email are both required."
        });
      }

      /* Look up the user by email and verify the name matches. */
      let found = null;

      try {
        const list = await client.send(
          new ListUsersCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Filter: 'email = "' + email + '"',
          })
        );

        found = (list.Users || [])[0] || null;
      } catch {
        found = null;
      }

      if (!found) {
        return response(404, {
          success: false,
          message: "No account found with that name and email."
        });
      }

      const attrs = {};
      (found.Attributes || []).forEach((a) => {
        attrs[a.Name] = a.Value;
      });

      const userName = (attrs.name || attrs["preferred_username"] || found.Username || "")
        .toLowerCase();

      if (!userName.includes(name.toLowerCase())) {
        return response(403, {
          success: false,
          message: "Name and email do not match any account."
        });
      }

      try {
        await client.send(
          new ForgotPasswordCommand({
            ClientId: process.env.USER_POOL_CLIENT_ID,
            Username: found.Username,
          })
        );
      } catch {
        /* Already-pending codes are re-sent by Cognito itself. */
        await client.send(
          new ForgotPasswordCommand({
            ClientId: process.env.USER_POOL_CLIENT_ID,
            Username: found.Username,
          })
        );
      }

      return response(200, {
        success: true,
        message:
          "Confirmation code sent to your email. It is valid for 2 hours. " +
          "If it expires, submit this form again and a new code will be sent."
      });
    }

    /*
     * CONFIRM FORGOT PASSWORD (step 2: code + new password)
     */
    if (method === "POST" && path.endsWith("/reset-password")) {
      const body = getBody(event);

      const email = String(body.email || "").trim().toLowerCase();
      const code = String(body.code || "").trim();
      const password = String(body.password || "");

      if (!email || !code || !password) {
        return response(400, {
          success: false,
          message: "Email, confirmation code and new password are required."
        });
      }

      if (password.length < 8) {
        return response(400, {
          success: false,
          message: "Password must contain at least 8 characters."
        });
      }

      try {
        await client.send(
          new ConfirmForgotPasswordCommand({
            ClientId: process.env.USER_POOL_CLIENT_ID,
            Username: email,
            ConfirmationCode: code,
            Password: password,
          })
        );
      } catch (error) {
        const expired =
          error.name === "ExpiredCodeException" ||
          error.name === "CodeMismatchException";

        return response(expired ? 410 : 400, {
          success: false,
          expired,
          message: expired
            ? "The confirmation code has expired or is invalid. " +
              "Submit the forgot-password form again to receive a new code."
            : error.message || "Unable to reset password."
        });
      }

      return response(200, {
        success: true,
        message: "Password reset successful. You can now sign in."
      });
    }

    return response(404, {
      success: false,
      message: "Authentication route not found."
    });

  } catch (error) {
    console.error(error);

    return response(
      error.name === "NotAuthorizedException" ? 401 : 500,
      {
        success: false,
        message: error.message || "Authentication error."
      }
    );
  }
};
`),
    });

    adminUserPool.grant(
      authFunction,
      'cognito-idp:InitiateAuth',
      'cognito-idp:SignUp'
    );

    authFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:InitiateAuth',
          'cognito-idp:SignUp',
        ],
        resources: [adminUserPool.userPoolArn],
      })
    );

    /*
     * ============================================================
     * ORDERS LAMBDA
     *
     * GET  /api/orders
     * POST /api/orders
     * ============================================================
     */

    const ordersFunction = new lambda.Function(this, 'OrdersFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,

      handler: 'index.handler',

      timeout: Duration.seconds(30),

      memorySize: 256,

      environment: commonEnvironment,

      code: lambda.Code.fromInline(`
const {
  DynamoDBClient
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand
} = require("@aws-sdk/lib-dynamodb");

const dynamo = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dynamo);

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  },
  body: JSON.stringify(body)
});

const bodyOf = (event) => {
  try {
    return typeof event.body === "string"
      ? JSON.parse(event.body || "{}")
      : (event.body || {});
  } catch {
    return {};
  }
};

exports.handler = async (event) => {
  try {
    const method =
      event.requestContext?.http?.method ||
      event.httpMethod ||
      "GET";

    if (method === "GET") {
      const result = await db.send(
        new ScanCommand({
          TableName: process.env.TABLE_NAME
        })
      );

      return response(200, {
        success: true,
        items: result.Items || []
      });
    }

    if (method === "POST") {
      const body = bodyOf(event);

      const id =
        String(body.id || "").trim() ||
        crypto.randomUUID();

      const item = {
        id,
        type: body.type || "order",
        customerId: body.customerId || null,
        customerEmail: body.customerEmail || null,
        items: body.items || [],
        total: Number(body.total || 0),
        currency: body.currency || "XAF",
        status: body.status || "PENDING",
        createdAt: new Date().toISOString(),
        ...body
      };

      await db.send(
        new PutCommand({
          TableName: process.env.TABLE_NAME,
          Item: item
        })
      );

      return response(201, {
        success: true,
        item
      });
    }

    return response(405, {
      success: false,
      message: "Method not allowed."
    });

  } catch (error) {
    console.error(error);

    return response(500, {
      success: false,
      message: error.message || "Orders service error."
    });
  }
};
`),
    });

    /*
     * ============================================================
     * PAYMENT / MOMO LAMBDA
     *
     * POST /api/payments/momo
     * GET  /api/payments/momo/{reference}
     * ============================================================
     */

    const momoFunction = new lambda.Function(this, 'MomoFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,

      handler: 'index.handler',

      timeout: Duration.seconds(30),

      memorySize: 256,

      environment: commonEnvironment,

      code: lambda.Code.fromInline(`
const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  },
  body: JSON.stringify(body)
});

const bodyOf = (event) => {
  try {
    return typeof event.body === "string"
      ? JSON.parse(event.body || "{}")
      : (event.body || {});
  } catch {
    return {};
  }
};

exports.handler = async (event) => {
  try {
    const method =
      event.requestContext?.http?.method ||
      event.httpMethod ||
      "POST";

    const reference =
      event.pathParameters?.reference ||
      event.pathParameters?.Reference ||
      null;

    /*
     * GET PAYMENT STATUS
     *
     * This endpoint intentionally returns a safe status response.
     * Replace the external MoMo API call with your exact MTN
     * environment/API product when your credentials are ready.
     */

    if (method === "GET" && reference) {
      return response(200, {
        success: true,
        reference,
        status: "PENDING",
        message: "Payment status endpoint is available."
      });
    }

    /*
     * CREATE PAYMENT
     */

    if (method === "POST") {
      const body = bodyOf(event);

      const generatedReference =
        String(
          body.reference ||
          ("NSM-" + Date.now())
        );

      const amount = Number(body.amount || 0);

      if (!amount || amount <= 0) {
        return response(400, {
          success: false,
          message: "A valid payment amount is required."
        });
      }

      return response(200, {
        success: true,
        reference: generatedReference,
        amount,
        currency: body.currency || "XAF",
        status: "PENDING",
        message:
          "Payment request created. Configure the MoMo API request in this Lambda for live collection."
      });
    }

    return response(405, {
      success: false,
      message: "Method not allowed."
    });

  } catch (error) {
    console.error(error);

    return response(500, {
      success: false,
      message: error.message || "Payment service error."
    });
  }
};
`),
    });

    /*
     * ============================================================
     * PRODUCTS LAMBDA
     *
     * GET    /api/products            (public: only PUBLIC products)
     * GET    /api/admin/products     (per-admin dashboard: own products)
     * POST   /api/admin/products     (upload, visibility PUBLIC/PRIVATE)
     * PUT    /api/admin/products/{id}
     * DELETE /api/admin/products/{id}
     * ============================================================
     */

    const productsFunction = new lambda.Function(this, 'ProductsFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,

      handler: 'index.handler',

      timeout: Duration.seconds(30),

      memorySize: 256,

      environment: commonEnvironment,

      code: lambda.Code.fromInline(`
const {
  DynamoDBClient
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand
} = require("@aws-sdk/lib-dynamodb");

const {
  CognitoIdentityProviderClient,
  GetUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");

const dynamo = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dynamo);
const cognito = new CognitoIdentityProviderClient({});

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  },
  body: JSON.stringify(body)
});

const bodyOf = (event) => {
  try {
    return typeof event.body === "string"
      ? JSON.parse(event.body || "{}")
      : (event.body || {});
  } catch {
    return {};
  }
};

const methodOf = (event) =>
  event.requestContext?.http?.method ||
  event.httpMethod ||
  "GET";

/* Validate the Bearer access token against Cognito.
   Returns { sub, username, email, isSuperAdmin } or throws. */
async function verifyAdmin(authorization) {
  const token = String(authorization || "")
    .replace(/^Bearer\\s+/i, "")
    .trim();

  if (!token) {
    const error = new Error("Authorization token is required.");
    error.statusCode = 401;
    throw error;
  }

  try {
    const result = await cognito.send(
      new GetUserCommand({ AccessToken: token })
    );

    const attributes = {};
    (result.UserAttributes || []).forEach((attribute) => {
      attributes[attribute.Name] = attribute.Value;
    });

    const sub = attributes.sub || result.Username;

    /* Super admin flag is stored in the admin table:
       item { id: "superAdmins", subs: [ "<sub>", ... ] } */
    let isSuperAdmin = false;

    try {
      const config = await db.send(
        new GetCommand({
          TableName: process.env.ADMIN_TABLE_NAME,
          Key: { id: "superAdmins" }
        })
      );

      const subs = (config.Item && config.Item.subs) || [];
      isSuperAdmin = subs.includes(sub);
    } catch {
      isSuperAdmin = false;
    }

    return {
      sub,
      username: attributes["preferred_username"] || result.Username,
      email: attributes.email || null,
      isSuperAdmin
    };
  } catch {
    const error = new Error("Invalid or expired admin token.");
    error.statusCode = 401;
    throw error;
  }
}

/* Scan all product items (small demo dataset). */
async function allProducts() {
  const result = await db.send(
    new ScanCommand({
      TableName: process.env.TABLE_NAME,
      FilterExpression: "#t = :product",
      ExpressionAttributeNames: { "#t": "type" },
      ExpressionAttributeValues: { ":product": "product" }
    })
  );

  return result.Items || [];
}

exports.handler = async (event) => {
  try {
    const method = methodOf(event);
    const path = event.rawPath || event.path || "";
    const productId =
      event.pathParameters?.id ||
      event.pathParameters?.productId ||
      null;

    /* ---------- PUBLIC CATALOG ---------- */
    if (method === "GET" && !path.includes("/admin/")) {
      const availableOnly =
        (event.queryStringParameters?.availableOnly || "") === "true";

      const items = await allProducts();

      const publicItems = items.filter(
        (item) =>
          item.visibility === "PUBLIC" &&
          (!availableOnly || Number(item.stock || 0) > 0)
      );

      return response(200, publicItems);
    }

    /* ---------- ADMIN (TOKEN REQUIRED) ---------- */
    const admin = await verifyAdmin(
      event.headers?.Authorization ||
      event.headers?.authorization
    );

    /* Dashboard: own products, or ALL products for a super admin */
    if (method === "GET" && path.endsWith("/admin/products")) {
      const items = await allProducts();

      if (admin.isSuperAdmin) {
        return response(200, items);
      }

      return response(200,
        items.filter((item) => item.ownerSub === admin.sub)
      );
    }

    /* Upload */
    if (method === "POST" && path.endsWith("/admin/products")) {
      const body = bodyOf(event);

      if (!body.name || body.price === undefined) {
        return response(400, {
          success: false,
          message: "Product name and price are required."
        });
      }

      const visibility =
        String(body.visibility || "PRIVATE").toUpperCase() === "PUBLIC"
          ? "PUBLIC"
          : "PRIVATE";

      const numericId = Number(body.productId);
      const id = String(body.id || body.productId || crypto.randomUUID());

      const item = {
        id,
        type: "product",
        productId: Number.isFinite(numericId) && body.productId !== undefined
          ? numericId
          : Date.now(),
        name: body.name,
        description: body.description || "",
        price: Number(body.price || 0),
        stock: Number(body.stock || 0),
        category: body.category || "General",
        imageUrl: body.imageUrl || "",
        visibility,
        ownerSub: admin.sub,
        ownerName: admin.username,
        ownerEmail: admin.email,
        createdAt: new Date().toISOString()
      };

      await db.send(
        new PutCommand({
          TableName: process.env.TABLE_NAME,
          Item: item
        })
      );

      return response(201, { success: true, item });
    }

    if (productId && (method === "PUT" || method === "DELETE")) {
      const key = { id: String(productId) };

      const existing = await db.send(
        new GetCommand({
          TableName: process.env.TABLE_NAME,
          Key: key
        })
      );

      if (!existing.Item || existing.Item.type !== "product") {
        return response(404, {
          success: false,
          message: "Product not found."
        });
      }

      if (existing.Item.ownerSub !== admin.sub && !admin.isSuperAdmin) {
        return response(403, {
          success: false,
          message: "You can only manage your own products."
        });
      }

      if (method === "DELETE") {
        await db.send(
          new DeleteCommand({
            TableName: process.env.TABLE_NAME,
            Key: key
          })
        );

        return response(200, { success: true });
      }

      const body = bodyOf(event);

      const visibility = body.visibility
        ? (String(body.visibility).toUpperCase() === "PUBLIC"
            ? "PUBLIC"
            : "PRIVATE")
        : existing.Item.visibility;

      const updated = {
        name: body.name || existing.Item.name,
        description: body.description ?? existing.Item.description,
        price: body.price !== undefined ? Number(body.price) : existing.Item.price,
        stock: body.stock !== undefined ? Number(body.stock) : existing.Item.stock,
        category: body.category || existing.Item.category,
        imageUrl: body.imageUrl || existing.Item.imageUrl,
        visibility,
        updatedAt: new Date().toISOString()
      };

      await db.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: key,
          UpdateExpression:
            "SET #n = :n, #d = :d, price = :price, stock = :stock, " +
            "category = :category, imageUrl = :imageUrl, " +
            "visibility = :visibility, updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#n": "name",
            "#d": "description"
          },
          ExpressionAttributeValues: {
            ":n": updated.name,
            ":d": updated.description,
            ":price": updated.price,
            ":stock": updated.stock,
            ":category": updated.category,
            ":imageUrl": updated.imageUrl,
            ":visibility": updated.visibility,
            ":updatedAt": updated.updatedAt
          }
        })
      );

      return response(200, { success: true, item: { ...existing.Item, ...updated } });
    }

    return response(405, {
      success: false,
      message: "Method not allowed."
    });

  } catch (error) {
    console.error(error);

    return response(error.statusCode || 500, {
      success: false,
      message: error.message || "Products service error."
    });
  }
};
`),
    });

    ecommerceTable.grantReadWriteData(productsFunction);

    /*
     * ============================================================
     * LAMBDA PERMISSIONS
     * ============================================================
     */

    ecommerceTable.grantReadWriteData(ordersFunction);

    adminTable.grantReadWriteData(authFunction);

    /*
     * ============================================================
     * API GATEWAY
     *
     * CDK creates the OPTIONS/CORS behavior automatically.
     * This avoids manually creating dozens of OPTIONS resources.
     * ============================================================
     */

    const api = new apigateway.RestApi(this, 'EcommerceApi', {
      restApiName: `${this.stackName}-api`,

      description: 'Northstar Market Ecommerce API',

      endpointTypes: [apigateway.EndpointType.REGIONAL],

      deployOptions: {
        stageName: 'prod',

        metricsEnabled: true,

        loggingLevel: apigateway.MethodLoggingLevel.INFO,

        dataTraceEnabled: false,

        tracingEnabled: false,
      },

      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,

        allowMethods: apigateway.Cors.ALL_METHODS,

        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
          'Origin',
        ],

        maxAge: Duration.days(1),
      },

      binaryMediaTypes: [
        'multipart/form-data',
        'application/octet-stream',
      ],
    });

    /*
     * ============================================================
     * /api
     * ============================================================
     */

    const apiResource = api.root.addResource('api');

    /*
     * ============================================================
     * /api/admin
     * ============================================================
     */

    const adminResource = apiResource.addResource('admin');

    /*
     * /api/admin/login
     */

    const loginResource = adminResource.addResource('login');

    loginResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(authFunction, {
        proxy: true,
      })
    );

    /*
     * /api/admin/register
     */

    const registerResource = adminResource.addResource('register');

    registerResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(authFunction, {
        proxy: true,
      })
    );

    /*
     * /api/admin/config
     */

    const configResource = adminResource.addResource('config');

    configResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(authFunction, {
        proxy: true,
      })
    );

    /*
     * /api/admin/forgot-password
     */

    const forgotPasswordResource =
      adminResource.addResource('forgot-password');

    forgotPasswordResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(authFunction, {
        proxy: true,
      })
    );

    /*
     * /api/admin/reset-password
     */

    const resetPasswordResource =
      adminResource.addResource('reset-password');

    resetPasswordResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(authFunction, {
        proxy: true,
      })
    );

    /*
     * /api/products (public catalog - PUBLIC products only)
     */

    const productsResource = apiResource.addResource('products');

    productsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(productsFunction, {
        proxy: true,
      })
    );

    /*
     * /api/admin/products (per-admin dashboard, token required)
     */

    const adminProductsResource =
      adminResource.addResource('products');

    adminProductsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(productsFunction, {
        proxy: true,
      })
    );

    adminProductsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(productsFunction, {
        proxy: true,
      })
    );

    /*
     * /api/admin/products/{id} (update/delete own product)
     */

    const adminProductIdResource =
      adminProductsResource.addResource('{id}');

    adminProductIdResource.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(productsFunction, {
        proxy: true,
      })
    );

    adminProductIdResource.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(productsFunction, {
        proxy: true,
      })
    );

    /*
     * ============================================================
     * /api/orders
     * ============================================================
     */

    const ordersResource = apiResource.addResource('orders');

    ordersResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(ordersFunction, {
        proxy: true,
      })
    );

    ordersResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(ordersFunction, {
        proxy: true,
      })
    );

    /*
     * ============================================================
     * /api/payments
     * ============================================================
     */

    const paymentsResource =
      apiResource.addResource('payments');

    /*
     * /api/payments/momo
     */

    const momoResource =
      paymentsResource.addResource('momo');

    momoResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(momoFunction, {
        proxy: true,
      })
    );

    /*
     * /api/payments/momo/{reference}
     */

    const momoReferenceResource =
      momoResource.addResource('{reference}');

    momoReferenceResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(momoFunction, {
        proxy: true,
      })
    );

    /*
     * ============================================================
     * API GATEWAY LAMBDA PERMISSIONS
     *
     * LambdaIntegration normally creates these automatically.
     * We deliberately do not create manual AWS::Lambda::Permission
     * resources, avoiding the duplicated permission resources seen
     * in your generated template.
     * ============================================================
     */

    /*
     * ============================================================
     * OUTPUTS
     * ============================================================
     */

    new CfnOutput(this, 'ApiUrl', {
      description: 'Ecommerce API base URL',
      value: api.url,
    });

    new CfnOutput(this, 'FrontendWebsiteUrl', {
      description: 'S3 frontend website URL',
      value: frontendBucket.bucketWebsiteUrl,
    });

    new CfnOutput(this, 'FrontendBucketName', {
      description: 'Frontend S3 bucket name',
      value: frontendBucket.bucketName,
    });

    new CfnOutput(this, 'DynamoTableName', {
      description: 'Ecommerce DynamoDB table',
      value: ecommerceTable.tableName,
    });

    new CfnOutput(this, 'AdminTableName', {
      description: 'Admin DynamoDB table',
      value: adminTable.tableName,
    });

    new CfnOutput(this, 'CognitoUserPoolId', {
      description: 'Cognito User Pool ID',
      value: adminUserPool.userPoolId,
    });

    new CfnOutput(this, 'CognitoClientId', {
      description: 'Cognito User Pool Client ID',
      value: adminUserPoolClient.userPoolClientId,
    });

    new CfnOutput(this, 'Region', {
      description: 'AWS deployment region',
      value: this.region,
    });

    /*
     * Keep the parameter referenced so CloudFormation retains it.
     *
     * The password is intentionally not used to create a Cognito
     * user automatically. Putting a plaintext/temporary admin
     * password into a Lambda environment is unsafe.
     *
     * Use the Cognito registration endpoint after deployment.
     */
    this.templateOptions.metadata = {
      'CloudFormation-Validate::W2001':
        "Parameter 'AdminPassword' is reserved for initial admin password configuration.",
      AdminPasswordRef: adminPassword.valueAsString,
    };
  }
}

module.exports = {
  EcommerceStack,
};
