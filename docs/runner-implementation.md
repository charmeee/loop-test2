# 구현된 이슈 runner

현재 실행 프로그램은 `scripts/run-issue-loop.mjs`입니다. 상세 명령·구성·제약은 [loop-commands.md](loop-commands.md)를 확인하세요. 이전의 설계 전용 문서를 실제 구현 설명으로 갱신했습니다.

| 파일 | 구현된 책임 |
|---|---|
| `scripts/run-loop.mjs` | 모든 열린 loop:ready 이슈 조회·순차 처리·전체 결과 요약 |
| `scripts/setup-loop.mjs` | 공식 loop-init 호출, 두 패턴 분리·연결, 기존 설정 보존 |
| `scripts/run-issue-loop.mjs` | GitHub 조회, 로컬 잠금·상태, Codex maker/checker, 검사, PR 쓰기·CI 대기 |
| `scripts/loop/policy.mjs` | 실행 인자, 허용 경로, CI 판정, 이슈·PR 연결 판단 |
| `scripts/lint.mjs` | 하위 폴더까지 JavaScript 문법 검사 |
| `tests/loop-policy.test.mjs` | CI 없음·대기, 정책 위반, 잘못된 인자, 잘못된 이슈 연결 방지 |

## Loop Engineering과 실제 연결

- setup이 공식 issue-triage/pr-babysitter 설정을 실제 생성합니다.
- runner가 LOOP·constraints·budget와 공식 skills 내용을 읽습니다.
- maker 프롬프트에는 constraints·intake·minimal-fix를 전달합니다.
- 독립 checker에는 loop-verifier·PR review triage를 전달합니다.
- 매 구현 시도 직전 공식 loop-context를 이슈별 ledger와 함께 실행합니다.
- 종료 시 패턴별 상태와 run log, 실제 Codex 출력·검증 결과를 저장합니다.

이슈 목록 발견과 GitHub 작업은 Node coordinator가 결정적으로 처리합니다. AI를 분류만을 위해 불필요하게 호출하지 않습니다. 요구사항이 모호하면 maker/checker가 ESCALATE_HUMAN을 반환하도록 계약을 전달합니다.

## 역할 분리

maker와 checker는 서로 다른 `codex exec` 프로세스·세션입니다. maker는 workspace-write, checker는 read-only입니다. AI가 스스로 commit/push/PR 생성/머지하지 않습니다. 프로그램이 허용 diff·테스트 결과·checker 판정·후보 SHA를 확인한 뒤 GitHub 쓰기를 수행합니다.

기존 PR에서는 정확한 SHA의 CI와 리뷰·인라인 댓글·일반 댓글을 확인합니다. 이전 검증 SHA와 피드백이 같고 CI가 성공이면 중복 구현을 생략합니다. CI pending/없음이면 대기 상태로 종료합니다. 실패·변경된 피드백·새 SHA는 다시 수정·검증 대상입니다.

## 현재 범위

- 대상 저장소는 charmeee/loop-test2로 고정합니다.
- 한 사이클에 이슈 하나, 누적 3회 시도 제한입니다.
- 같은 로컬 폴더의 상태와 잠금을 재사용합니다. 분산 실행·예약은 별도입니다.
- 자동 rebase, 충돌 해결, 장기 서비스, 원격 상태 DB는 아직 없습니다.
- CI는 실패를 성공으로 바꾸지 않으며, 사람의 리뷰·머지는 수행하지 않습니다.
- 일시 중단 시 저장된 상태·PR·브랜치를 확인해 복구해야 합니다. 새로운 PR을 무조건 생성하지 않습니다.
