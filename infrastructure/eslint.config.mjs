// Local flat-config for the `infrastructure` project.
//
// It re-uses the single shared root config (the same toolchain backend/ and
// data-integestion/ lint against) and only adds CDK-specific global ignores:
// `cdk.out/` is the synth output dir and contains CDK's vendored Lambda
// bundles (e.g. the BucketDeployment handler) which are not our source and
// must not be linted. The shared config only ignores `**/dist/`, which a CDK
// consumer does not produce — hence this thin local extension rather than a
// change to the shared root config.
import sharedConfig from '../eslint.config.mjs';

export default [{ ignores: ['cdk.out/'] }, ...sharedConfig];
