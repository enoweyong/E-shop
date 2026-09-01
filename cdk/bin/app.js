#!/usr/bin/env node
const cdk = require("aws-cdk-lib");
const { EcommerceStack } = require("../lib/ecommerce-stack");

const app = new cdk.App();
new EcommerceStack(app, "NorthstarMarketCdkStack", {
  env: { account: "793593623274", region: "us-east-1" },
  adminUsername: app.node.tryGetContext("adminUsername") || "eyong",
  adminEmail: app.node.tryGetContext("adminEmail") || "admin@example.com",
  frontendOrigin: app.node.tryGetContext("frontendOrigin") || "*"
});
