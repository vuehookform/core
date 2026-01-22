# Changelog

## [0.4.7](https://github.com/vuehookform/core/compare/v0.4.6...v0.4.7) (2026-01-22)


### Bug Fixes

* improve field array operations and error handling ([4e8322f](https://github.com/vuehookform/core/commit/4e8322f3f1f379abb1d157a3dd0818b61d443773))

## [0.4.6](https://github.com/vuehookform/core/compare/v0.4.5...v0.4.6) (2026-01-20)


### Bug Fixes

* isValid now true initially when form has no errors ([8dcca74](https://github.com/vuehookform/core/commit/8dcca7410229cbf0c4d7188e144d73c6c6febc6d))
* isValid now true initially when form has no errors ([6b9b86f](https://github.com/vuehookform/core/commit/6b9b86ff757f1cdfdf2ded677642d358636852fe))

## [0.4.5](https://github.com/vuehookform/core/compare/v0.4.4...v0.4.5) (2026-01-18)


### Bug Fixes

* **ci:** add build step before npm publish ([887459b](https://github.com/vuehookform/core/commit/887459b3a2e99d287bfc6773560d857f7a229ed2))

## [0.4.4](https://github.com/vuehookform/core/compare/v0.4.3...v0.4.4) (2026-01-18)


### Bug Fixes

* correct parameter order and add null safety to path utilities ([4b3d844](https://github.com/vuehookform/core/commit/4b3d84464f939121b2e3e8b995f882395a8bf7f7))
* improve docs demos and add null safety to path utilities ([54a120e](https://github.com/vuehookform/core/commit/54a120e9ef19a65241db2fd42b1af1a39f39ef6d))

## [0.4.3](https://github.com/vuehookform/core/compare/v0.4.2...v0.4.3) (2026-01-17)


### Bug Fixes

* support Vue component libraries in uncontrolled mode ([be8da78](https://github.com/vuehookform/core/commit/be8da7818cfc496b62e0f37bafa8790cf07193bf))
* update field array index cache before triggering Vue reactivity ([52c14fd](https://github.com/vuehookform/core/commit/52c14fdf3ea7fcc0cc9969b0854a869b74498aae))

## [0.4.2](https://github.com/vuehookform/core/compare/v0.4.1...v0.4.2) (2026-01-16)


### Bug Fixes

* field array insert rejects out-of-bounds indices ([2e85f9a](https://github.com/vuehookform/core/commit/2e85f9a632637bb6e980d22a262220e5e97fd7ce))
* improve error handling and validation cache ([ab8b3d2](https://github.com/vuehookform/core/commit/ab8b3d2d8f8225900f08e63420999f402d96a683))
* improve robustness of utility functions ([30c3af9](https://github.com/vuehookform/core/commit/30c3af9b37aa2b5f26c8320eb5c2a6fdcde7d7e4))
* refactor dirty tracking to value-comparison and fix memory leaks ([b0e7486](https://github.com/vuehookform/core/commit/b0e7486e0eb68fcf389f530f7704f108991fc099))
* refactor useFieldArray validation and export TriggerOptions type ([962c6bc](https://github.com/vuehookform/core/commit/962c6bc275b709eb2dc3b49baeea6d1771606a3b))
* use valueAsNumber for number/range inputs ([5ad6355](https://github.com/vuehookform/core/commit/5ad6355101deb810d00b1dc0d47c6d00fc71ffcc))
* useController now respects form validation modes ([8b10a22](https://github.com/vuehookform/core/commit/8b10a22c54c9a38af134c290e12abef276ee62bf))
* useFieldArray now respects form validation modes ([6114959](https://github.com/vuehookform/core/commit/6114959e2377fef6125445584f0b9d8bc701f17b))
* validation modes, value-comparison dirty tracking, and memory leak fixes ([fb12c02](https://github.com/vuehookform/core/commit/fb12c02dc5bcace93448635a45607d2f0f478933))

## [0.4.1](https://github.com/vuehookform/core/compare/v0.4.0...v0.4.1) (2026-01-15)


### Bug Fixes

* ensure useController onBlur properly marks field as touched ([56cd38d](https://github.com/vuehookform/core/commit/56cd38d3368f8f85f061b4c82dc3a755de39d157))
* ensure useController onBlur properly marks field as touched ([4a8b140](https://github.com/vuehookform/core/commit/4a8b140668b1e7e10235ca0324cdd0c193b4ac76))

## [0.4.0](https://github.com/vuehookform/core/compare/v0.3.3...v0.4.0) (2025-12-31)


### Features

* optimize form state management and validation performance ([6c950b0](https://github.com/vuehookform/core/commit/6c950b040bf6cf07b01fdb34b18dc8544d88a651))
* optimize form state management and validation performance ([41ad36d](https://github.com/vuehookform/core/commit/41ad36de4622fa08b432c79392a2604651d8fb11))


### Performance Improvements

* optimize form state management and field operations ([4b1464d](https://github.com/vuehookform/core/commit/4b1464dee63f5a73bd74093db57d8ab1b6620198))

## [0.3.3](https://github.com/vuehookform/core/compare/v0.3.2...v0.3.3) (2025-12-28)


### Bug Fixes

* add missing test commands to CLAUDE.md ([f3446a7](https://github.com/vuehookform/core/commit/f3446a77b5440c155ad687162c8e34c33f9b1039))
* publish ([914cf11](https://github.com/vuehookform/core/commit/914cf11cdc14291c74602378cb4ee6ef6d15fede))
* publish ([34d5457](https://github.com/vuehookform/core/commit/34d5457b5a2eba6efd57d9db63376fd90666bfe6))
* replace import.meta with process.env for CJS compatibility ([bd2b189](https://github.com/vuehookform/core/commit/bd2b189bd093a1c5e9692f319dd6fb34388bb21a))
* use PAT token for release-please to trigger CI ([3cd3247](https://github.com/vuehookform/core/commit/3cd32474640d83f5490c33cf278b24a75845d139))
* use PAT token for release-please to trigger CI ([5f51a6b](https://github.com/vuehookform/core/commit/5f51a6b508af57038d17c5d672f49be56497b3f6))
