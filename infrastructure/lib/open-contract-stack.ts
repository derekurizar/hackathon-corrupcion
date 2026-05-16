import { fileURLToPath } from 'node:url';
import { Duration, RemovalPolicy, Stack, CfnOutput, Fn } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

// CDK requires a Stack subclass; this is the documented exception to the
// codebase "no classes" rule.
export class OpenContractStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ── S3 Buckets ────────────────────────────────────────────────────────────

    const webBucket = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const audioBucket = new s3.Bucket(this, 'AudioBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ── API Gateway HTTP API + Lambda handlers ────────────────────────────────
    // The MongoUri secret is declared here (ahead of the Secrets Manager block
    // below) because the API Lambdas + HttpApi origin must exist BEFORE the
    // CloudFront Distribution that references the API hostname.

    const mongoUri = new secretsmanager.Secret(this, 'MongoUri', {
      secretName: 'open-contract/MONGODB_URI',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Deviation from plan: the plan used `../node_modules/backend`, but pnpm
    // copies the `backend` package WITHOUT its `pnpm-lock.yaml` (lockfiles are
    // not part of a published package) and without the full transitive
    // dependency tree esbuild needs to bundle the mongodb driver. Point at the
    // canonical sibling `backend/` source (the `file:../backend` model used
    // elsewhere in this repo) which has the lockfile + installed node_modules.
    const backendRoot = fileURLToPath(
      new URL('../../backend', import.meta.url),
    );
    const handlersDir = `${backendRoot}/src/handlers`;
    const backendLockFile = `${backendRoot}/pnpm-lock.yaml`;

    const makeApiFn = (
      id: string,
      entryFile: string,
    ): lambdaNode.NodejsFunction =>
      new lambdaNode.NodejsFunction(this, id, {
        entry: `${handlersDir}/${entryFile}`,
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        projectRoot: backendRoot,
        depsLockFilePath: backendLockFile,
        timeout: Duration.seconds(15),
        memorySize: 512,
        environment: {
          MONGODB_URI: mongoUri.secretValue.unsafeUnwrap(),
        },
        bundling: {
          // bundle everything (mongodb driver included); overrides CDK default
          // that externalizes @aws-sdk/*
          externalModules: [],
          minify: true,
        },
      });

    const statsFn = makeApiFn('StatsFn', 'stats.ts');
    const investigationsFn = makeApiFn('InvestigationsFn', 'investigations.ts');
    const investigationFn = makeApiFn('InvestigationFn', 'investigation.ts');
    const editionsFn = makeApiFn('EditionsFn', 'editions.ts');
    const filtersFn = makeApiFn('FiltersFn', 'filters.ts');

    // grant each Lambda IAM read access to the secret
    [statsFn, investigationsFn, investigationFn, editionsFn, filtersFn].forEach(
      (fn) => mongoUri.grantRead(fn),
    );

    // ── HTTP API v2 ───────────────────────────────────────────────────────────

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'open-contract-api',
      // required: throttle lives on the stage, not HttpApiProps
      createDefaultStage: false,
    });

    new apigwv2.HttpStage(this, 'DefaultStage', {
      httpApi,
      stageName: '$default',
      autoDeploy: true,
      throttle: { rateLimit: 100, burstLimit: 200 },
    });

    httpApi.addRoutes({
      path: '/stats',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('StatsInt', statsFn),
    });
    httpApi.addRoutes({
      path: '/investigations',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('InvestigationsInt', investigationsFn),
    });
    httpApi.addRoutes({
      path: '/investigations/{caseKey}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('InvestigationInt', investigationFn),
    });
    httpApi.addRoutes({
      path: '/editions/current',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('EditionsInt', editionsFn),
    });
    httpApi.addRoutes({
      path: '/filters',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('FiltersInt', filtersFn),
    });

    // derive the API hostname for CloudFront (strips "https://" and trailing "/")
    const apiHost = Fn.select(2, Fn.split('/', httpApi.apiEndpoint));

    // ── CloudFront Distribution ───────────────────────────────────────────────

    // The API Gateway routes have NO `/api` prefix (e.g. `/stats`,
    // `/investigations`). CloudFront forwards the FULL viewer URI to the
    // origin (it does not strip the `/api/*` behavior's path pattern), so we
    // rewrite the URI at the viewer-request stage to drop the leading `/api`.
    // (`originPath` is the wrong tool — it PREPENDS, producing `/api/api/...`.)
    const apiPathRewrite = new cloudfront.Function(this, 'ApiPathRewrite', {
      comment: 'Strip /api prefix before forwarding to the API Gateway origin',
      code: cloudfront.FunctionCode.fromInline(
        `function handler(event) {
  var request = event.request;
  if (request.uri.indexOf('/api/') === 0) {
    request.uri = request.uri.substring(4);
  } else if (request.uri === '/api') {
    request.uri = '/';
  }
  return request;
}`,
      ),
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      additionalBehaviors: {
        '/audio/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(audioBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        '/api/*': {
          origin: new origins.HttpOrigin(apiHost),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          functionAssociations: [
            {
              function: apiPathRewrite,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
      ],
    });

    // ── Secrets Manager (no value — set out-of-band) ──────────────────────────
    // Note: the MongoUri secret is declared earlier in the API Gateway block
    // (ordering: API Lambdas/origin must exist before the CloudFront Distribution).

    new secretsmanager.Secret(this, 'AnthropicKey', {
      secretName: 'open-contract/ANTHROPIC_API_KEY',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new secretsmanager.Secret(this, 'ElevenLabsKey', {
      secretName: 'open-contract/ELEVENLABS_API_KEY',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ── SSM Parameters ────────────────────────────────────────────────────────
    // Note: SSM rejects empty-string values at deploy time.
    // ELEVENLABS_VOICE_ES/EN and BRAND_TAGLINE use ' ' (single space) as placeholder.

    const ssmParams: Record<string, string> = {
      ELEVENLABS_VOICE_ES: ' ',
      ELEVENLABS_VOICE_EN: ' ',
      MAX_INVESTIGATIONS_PER_RUN: '20',
      RUN_BENCHMARKS: 'true',
      RUN_DETECTION: 'true',
      RUN_STORY: 'true',
      RUN_AUDIO: 'true',
      RUN_PUBLISH: 'true',
      INGEST_ONLY: 'false',
      BRAND_NAME: 'Expediente Público',
      BRAND_TAGLINE: ' ',
    };

    for (const [key, value] of Object.entries(ssmParams)) {
      new ssm.StringParameter(this, `Param${key}`, {
        parameterName: `/open-contract/${key}`,
        stringValue: value,
      });
    }

    // ── Placeholder SPA Deployment ────────────────────────────────────────────
    // Uses fileURLToPath + import.meta.url instead of __dirname (NodeNext ESM)

    new s3deploy.BucketDeployment(this, 'PlaceholderDeployment', {
      sources: [s3deploy.Source.asset(fileURLToPath(new URL('../web-placeholder', import.meta.url)))],
      destinationBucket: webBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ── Outputs ───────────────────────────────────────────────────────────────

    new CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution URL',
    });

    new CfnOutput(this, 'WebBucketName', {
      value: webBucket.bucketName,
    });

    new CfnOutput(this, 'AudioBucketName', {
      value: audioBucket.bucketName,
    });

    new CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.apiEndpoint,
      description: 'HTTP API v2 base URL (also available at <CloudFront>/api/*)',
    });
  }
}
