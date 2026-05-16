import { fileURLToPath } from 'node:url';
import { Duration, RemovalPolicy, Stack, CfnOutput } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';

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

    // ── CloudFront Distribution ───────────────────────────────────────────────

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

    new secretsmanager.Secret(this, 'MongoUri', {
      secretName: 'open-contract/MONGODB_URI',
      removalPolicy: RemovalPolicy.DESTROY,
    });

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
  }
}
