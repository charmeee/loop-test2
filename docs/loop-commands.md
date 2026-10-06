# 실제 명령과 구성

## 빠른 사용

```sh
# 공식 Loop Engineering 설정을 생성합니다. 이 프로젝트에서는 실행 완료했습니다.
npm run loop:setup
# GitHub 이슈와 연결된 PR을 조회하고 상태만 기록합니다.
npm run loop:report
# 열린 loop:ready 이슈 전체를 순차 처리합니다. PR 머지·이슈 종료는 하지 않습니다.
npm run loop
# 전체 대상을 조회하되 AI 작업은 실행하지 않습니다.
npm run loop -- --mode report
# 이슈 하나를 실제 구현·검증하고 PR을 생성하거나 기존 PR을 관리합니다.
npm run loop:start
# 특정 이슈를 선택해 실행합니다. 머지나 이슈 종료는 하지 않습니다.
npm run loop:start -- --issue 1
# 일시 중지합니다. 이후 실행은 이 파일이 있으면 중단합니다.
touch LOOP_PAUSED
# 일시 중지를 해제합니다.
rm LOOP_PAUSED
```

`loop:start`는 무한 실행 서비스가 아니라 **한 번의 작업 사이클**입니다. 기본 repair 모드이며 최대 이슈 하나를 처리하고 종료합니다. 다시 실행하면 다음 작업을 선택합니다. CI 대기와 이전 시도는 로컬 상태에서 이어갑니다. 예약은 등록하지 않았습니다.

## setup이 실행한 명령

`scripts/setup-loop.mjs`가 패턴별 임시 폴더를 만들어 다음 공식 명령을 실행했습니다.

```sh
# 이슈 분류·입력 명확화 skills와 초기 state를 생성합니다.
npx --yes @cobusgreyling/loop-init@1.7.0 <임시-이슈-폴더> --pattern issue-triage --tool codex
# PR 분류·최소 수정·재시도 제한 skills와 초기 state를 생성합니다.
npx --yes @cobusgreyling/loop-init@1.7.0 <임시-PR-폴더> --pattern pr-babysitter --tool codex
```

원본을 패턴별로 보존하고 공통 설정을 연결합니다. 전용 Codex starter가 없는 패턴에서는 공식 도구가 공통 starter를 사용했습니다. 실제 생성된 skills를 `.agents/skills`에 연결했습니다. 재실행은 파일 존재를 확인하며 기존 내용을 덮어쓰지 않습니다. 버전 업그레이드·자동 복구 명령은 아닙니다.

| 위치 | 의미 |
|---|---|
| `.loop-engineering/patterns/` | 공식 패턴별 생성 결과 원본 |
| `.loop-engineering/setup.json` | 생성 파일 목록과 loop-init 버전 |
| `.agents/skills/` | 실제 에이전트 지시로 읽는 공식 skills |
| `AGENTS.md`, `LOOP.md` | 프로젝트 실행 순서와 운영 계약 |
| `loop-constraints.md` | 변경 경로·머지 금지·이슈 종료 금지 |
| `loop-budget.md` | 로컬 정책: 시도 3회·도구 작업 20회·10분·일일 288회; 토큰은 관측만 |
| `issue-triage-state.md` | 최근 이슈 큐 조회 결과 |
| `pr-babysitter-state.md` | 최근 처리한 PR 상태 |
| `loop-ledger.json` | 공식 초기 ledger; 작업별 실행 ledger는 아래에 저장 |
| `loop-run-log.md` | 사이클 실행 기록 |
| `.loop-runtime/` | 로컬 실행 잠금·이슈별 상태·실제 agent 출력·PR 본문·ledger |

`.loop-runtime`은 Git에서 제외됩니다. **현재 runner는 같은 로컬 프로젝트에서 재사용하는 방식**입니다. 새 컴퓨터나 매번 초기화되는 GitHub Actions에서 사용하려면 상태 저장소를 따로 연결해야 합니다. 여러 컴퓨터 사이의 분산 잠금은 아직 구현하지 않았습니다.

## start의 실제 처리 순서

1. 설정·pause·constraints·budget 확인, 로컬 동시 실행 잠금 획득.
2. GitHub에서 ready/in-progress 이슈와 PR 조회, 연결된 PR·리뷰·댓글 확인.
3. report라면 목록 기록 후 종료. repair라면 최대 이슈 하나 선택.
4. 이슈별 누적 시도 3회 및 공식 `loop-context`로 제한 검사. 토큰 cap은 적용하지 않습니다.
5. 최신 main 또는 현재 PR head에서 별도 worktree 생성.
6. 실제 Codex maker 실행: 요구사항 구현과 테스트 추가. GitHub 작업 금지.
7. 프로그램이 허용 파일·기존 테스트 보존·npm test/lint 검사.
8. 새 Codex checker 세션이 독립 검증. read-only sandbox 사용.
9. 로컬 승인 시 coordinator만 commit·push, 연결된 PR이 없다면 생성.
10. 정확한 SHA의 CI를 최대 약 3분 확인합니다. 이 프로젝트의 애플리케이션 검사인 verify가 존재해야 성공으로 판단합니다. 성공하면 CI 체크리스트 갱신.
11. PR·SHA·실제 측정 tokens·시도 결과를 저장, worktree와 잠금 정리.

실패하면 한 사이클 안에서 무한 재시도하지 않습니다. 실패를 needs-human으로 저장하고 종료합니다. 기본 실행은 그 항목을 건너뛰고, 사람이 원인을 확인한 뒤 --issue 번호로 지정하면 남은 시도 안에서 다시 처리합니다. 누적 3회 이후에는 사람의 확인이 필요합니다. 에이전트는 도구 작업 20회 또는 10분 제한을 초과하면 종료됩니다. 프로세스가 강제로 종료돼 lock이 남으면 `.loop-runtime/lock/owner.json`의 PID가 아직 실행 중인지 확인한 뒤 수동 복구하세요. 비용을 측정할 수 없는 실행은 null이며 0으로 취급하지 않습니다. 그런 실행에도 횟수·시간 제한은 적용합니다. 현재는 토큰을 중단 기준으로 사용하지 않습니다.

## Codex 실행 명령

아래 명령은 runner가 자식 프로세스로 실행하는 형태입니다. 프롬프트는 stdin으로 전달하며 사용자 모델 설정을 읽지 않는 독립 실행을 사용합니다. 로컬 Codex 로그인은 사용합니다.

```sh
# maker: 해당 worktree 안에서 구현·테스트를 수행합니다.
codex exec --ignore-user-config --ephemeral -c 'approval_policy="never"' \
  -C <worktree> --sandbox workspace-write --json \
  --output-schema <maker-schema.json> -o <maker-answer.json> -
# checker: 새 세션에서 읽기·테스트 검증만 수행합니다.
codex exec --ignore-user-config --ephemeral -c 'approval_policy="never"' \
  -C <worktree> --sandbox read-only --json \
  --output-schema <checker-schema.json> -o <checker-answer.json> -
# 매 구현 시도 전에 공식 circuit breaker를 실행합니다.
npx --yes @cobusgreyling/loop-context@1.5.0 --check \
  --ledger <이슈별-ledger.json> --max-iterations 3
```

checker가 APPROVE를 반환해도 프로그램의 diff·테스트·SHA 검사가 실패하면 PR을 생성하지 않습니다. 기존 테스트 파일은 그대로 유지하고 새 테스트 파일을 추가합니다. 사람의 리뷰 완료는 체크하지 않습니다.

## 사전 조건과 권한

Node.js 22 이상, 로그인된 Codex CLI, 로그인된 gh CLI, git, 네트워크가 필요합니다. 이 로컬 구현은 branch push에 `git@github.com:charmeee/loop-test2.git`을 사용하므로 GitHub SSH 인증도 필요합니다. GitHub에서 push/PR CI가 실행되는 것을 확인합니다.

AI maker/checker는 GitHub 쓰기 작업을 지시받지 않으며 coordinator가 쓰기를 수행합니다. sandbox와 diff 검사로 역할을 제한합니다. 이 구성은 호스트 로그인 자격증명을 완전히 격리한 별도 컨테이너 보안 경계는 아닙니다.

PR 본문에 `Closes #N`을 사용하지만 **프로그램에는 PR merge/issue close 호출이 없습니다.** 나중에 사람이 PR을 머지하면 GitHub가 연결된 이슈를 닫을 수 있습니다. runner는 직접 머지·종료하지 않습니다.

공식 근거: [Loop Engineering init](https://github.com/cobusgreyling/loop-engineering/tree/main/tools/loop-init), [PR Babysitter](https://github.com/cobusgreyling/loop-engineering/blob/main/patterns/pr-babysitter.md), [Codex 비대화형 실행](https://learn.chatgpt.com/docs/non-interactive-mode).

## 전체 이슈 실행과 용어

`npm run loop`는 `scripts/run-loop.mjs`를 실행합니다. 시작 시 모든 페이지의 열린 loop:ready 이슈를 조회하고 번호순으로 기존 단일 이슈 runner를 호출합니다. 동시에 처리하지 않고 순차 실행합니다. 기존 검증 완료 PR은 재확인하며 새 PR을 중복 생성하지 않습니다. needs-human 항목은 건너뛰고 요약에 남깁니다. 한 이슈 실패가 다른 이슈 처리를 막지는 않습니다. pause나 일일 예산처럼 공통 제한은 이후 작업에도 적용됩니다.

결과는 `.loop-runtime/batch-summary.json`에 저장합니다. 보류·실패·pause가 있으면 전체 명령의 종료 코드는 1입니다. CI가 아직 대기라면 성공으로 표시하지 않고 waiting_ci로 남겨 다음 실행에서 확인합니다. 실행 중 추가된 새 이슈는 다음 실행 대상입니다.

**실행 한도 검사**는 AI의 무한 반복을 막는 제한입니다. 사용자 요청에 따라 토큰 cap은 제거하고 이슈별 시도 횟수를 공식 loop-context로 확인합니다. 에이전트별 도구 작업·시간과 로컬 일일 실행 횟수도 제한합니다. 실제 결제 금액, ChatGPT 구독의 잔여 사용량이나 은행 잔액을 조회하는 기능은 아닙니다. 토큰은 AI가 읽고 생성한 텍스트 사용량이며, 기록된 토큰 수가 곧 원화·달러 비용은 아닙니다.

이슈 #1에 적용된 23,050 토큰은 공식 도구가 패턴으로부터 계산한 한도입니다. 실제 Codex 실행 기록 281,048과 맞지 않아 재시도가 차단됐습니다. 기능 실패가 아니라 초기 검증 단계 오류와 예산 설정의 차이로 보류된 것입니다. 이것은 이전 정책의 결과입니다. 현재 토큰 cap은 해제했고, 실패 횟수와 기록은 그대로 유지했습니다. 자세한 내용은 [토큰 분석](token-analysis.md)을 확인하세요.

**원격 CI**는 코드를 GitHub에 push하거나 PR을 만들었을 때 GitHub Actions 서버가 테스트를 실행하는 것입니다. 이 저장소의 `.github/workflows/test.yml`이 npm ci, npm test, npm run lint를 실행합니다. 로컬 checker 검증 후 PR을 생성하고, 해당 커밋 SHA의 원격 CI 성공을 별도로 확인합니다. CI 성공은 PR 머지를 뜻하지 않습니다.
