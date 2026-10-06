# 이슈 처리 프로그램 구현 설계

이 문서는 **앞으로 구현할 프로그램의 설계**입니다. 아래 파일·함수·adapter는 제안하는 인터페이스이며 현재 구현되어 있지 않습니다. Loop Engineering이 제공하는 API 이름도 아닙니다. 현재 저장소에는 프로젝트, 이슈, 일반 CI와 공식 설정 생성 스크립트가 있습니다. `npm run loop:setup`으로 설정을 생성하며, 이 문서의 개발 runner는 별도 구현 대상입니다.

## 1. 무엇을 구현하는가

`run-issue-loop.mjs`는 Node.js로 만드는 작업 조정 프로그램입니다. GitHub에서 작업을 읽고, 실제 코딩 에이전트를 실행하고, 결과를 검증해 PR을 생성하거나 기존 PR을 관리합니다.

예약/이벤트는 GitHub Actions가 담당합니다. 프로그램은 한 번 호출되면 처리하고 종료합니다. 프로그램 내부에 무한 반복 타이머를 만들지 않습니다. 다음 호출에서 저장된 상태를 읽어 이어갑니다.

```text
GitHub Actions / 로컬 실행
  → run-issue-loop.mjs
  → GitHub 이슈·PR 조회 + 상태 복원
  → 작업 선택
  → 코딩 에이전트 실행
  → 별도 검증 에이전트 실행 + 프로그램의 기계적 검사
  → 브랜치 push / PR 생성 또는 수정
  → CI 확인 / 체크리스트 갱신
  → 상태 저장 / 종료
```

## 2. 파일과 책임

다음 구조를 새로 구현합니다. 현재 `src/`의 견적 계산 코드와 자동화 코드는 구분합니다.

| 파일 | 책임 |
|---|---|
| `scripts/run-issue-loop.mjs` | 인자 검증, report/repair 분기, 작업 순서 조정 |
| `scripts/loop/github.mjs` | gh CLI 호출, JSON 파싱, 이슈·PR·CI 조회와 갱신 |
| `scripts/loop/state.mjs` | 지속 저장소에서 상태 읽기·저장, 이슈 소유권 획득 |
| `scripts/loop/worktree.mjs` | 최신 main 기반 브랜치·worktree 생성과 정리 |
| `scripts/loop/agent.mjs` | 선택한 실제 AI 실행 환경을 호출하는 adapter |
| `scripts/loop/verify.mjs` | 허용 diff, 테스트, checker 결과, 후보 SHA 검증 |
| `scripts/loop/policy.mjs` | pause·예산·시도 제한·대상 라벨 검사 |
| `scripts/loop/pr.mjs` | PR 생성·중복 확인·체크리스트의 근거 있는 갱신 |
| `prompts/issue-maker.md` | 이슈 구현 역할에 전달할 고정 지시 |
| `prompts/issue-checker.md` | 독립 검증 역할에 전달할 고정 지시 |
| `tests/loop/*.test.mjs` | 중복 PR, SHA 변경, 예산, 실패 복구 등 자동화 테스트 |

새 자동화 코드가 하위 폴더에 생기면 기존 `scripts/lint.mjs`도 재귀 검사로 확장해야 합니다. 현재 lint는 각 폴더의 바로 아래 `.mjs`만 검사합니다. 자동화 테스트 역시 npm test가 발견하도록 테스트 경로를 확장합니다.

## 3. 실제 AI 호출은 어떻게 연결하는가

첫 구현은 **비대화형 코딩 에이전트 CLI를 자식 프로세스로 실행하는 방식**이 적합합니다. 기존 코딩 에이전트가 파일 읽기·수정·명령 실행을 담당하고 Node 프로그램은 상태와 권한, 결과를 관리합니다.

구현 시 선택한 CLI의 공식 문서에서 비대화형 실행법, 인증, 작업 디렉터리 지정, 구조화된 출력, 시간 제한을 확인하고 adapter 하나에만 반영합니다. 이 문서에는 특정 제품의 실행 옵션을 추정해서 적지 않습니다. 인증 정보를 소스나 프롬프트에 넣지 말고 실행 환경에서 전달합니다.

대안으로 모델 API를 직접 호출할 수 있지만, 이 경우 파일 읽기·수정·명령 실행 도구와 도구 호출 반복 처리까지 직접 구현해야 합니다. 단순히 모델에 프롬프트를 보내 문자열 답변을 받는 것만으로는 코드가 수정되지 않습니다.

제안하는 내부 인터페이스:

```js
// 우리 프로그램에서 새로 구현할 함수 계약입니다.
const result = await runAgent({
  role: 'maker', // checker는 별도 호출과 새 세션을 사용합니다.
  cwd: issueWorktree,
  prompt: issuePrompt,
  allowedPaths: ['src/**', 'tests/**'],
  timeoutMs: 10 * 60 * 1000,
});
// result: { status, summary, evidence, usage, sessionId }
```

`allowedPaths` 인자를 전달한다고 권한이 자동 제한되지는 않습니다. 실제 실행 환경의 파일·명령 권한과 실행 후 diff 검사를 구현해야 합니다. 최초 설계에서는 AI에게 GitHub 쓰기 토큰을 전달하지 않고, commit·push·PR 쓰기는 coordinator가 수행합니다. maker는 구현·테스트를 하고 checker는 별도 세션에서 읽기·검증합니다.

자식 프로세스는 executable과 인자 배열로 실행합니다. 이슈 본문을 shell 명령 문자열로 이어 붙이지 않습니다. 시간 초과 시 프로세스를 종료하고 실패 결과를 저장합니다. CLI 종료 코드 0만으로 구현 완료를 승인하지 않습니다.

## 4. 한 번 실행할 때의 처리 순서

아래 코드는 동작 순서를 설명하는 의사 코드입니다. 실제 함수 구현이 필요합니다.

```js
async function runOnce(options) {
  const state = await loadPersistentState();
  await enforcePauseAndBudget(state);
  const issues = await listReadyIssues();
  const prs = await listOpenPRs();
  const plan = await selectOneAction({ issues, prs, state });

  if (options.mode === 'report') {
    await saveReport(plan); // GitHub·프로젝트 변경 없이 계획만 저장
    return;
  }
  if (!plan) return; // 할 일 없으면 AI를 호출하지 않음

  const lease = await acquireIssueLease(plan.issueNumber);
  try {
    await refreshIssueAndLinkedPR(plan);
    if (plan.linkedPR) {
      await babysitExistingPR(plan);
    } else {
      await implementVerifyAndCreatePR(plan);
    }
  } finally {
    await persistLatestState();
    await releaseLease(lease);
  }
}
```

기존 PR이 있는 경우에도 이슈가 계속 대상이 되도록 ready와 in-progress 상태를 함께 관리합니다. ready 라벨을 제거한 이슈의 PR을 놓치지 않도록 state의 진행 중 항목과 열린 PR을 별도로 조회합니다.

### 새 이슈를 구현할 때

1. 이슈 본문·완료 조건·댓글을 읽고 변경 범위를 확정합니다. 모호하면 needs-human으로 전달합니다.
2. 이슈 번호에 대한 소유권을 확보하고 연결된 PR을 다시 확인합니다.
3. 최신 main에서 `issue/<번호>-<주제>` 브랜치와 격리 worktree를 만듭니다.
4. maker에게 이슈 요구사항, 기존 코드, 허용 경로, 테스트 작성 의무를 전달합니다.
5. 수정 후 프로그램이 허용 diff와 기존 테스트 삭제·약화 여부를 검사합니다.
6. npm test/lint와 요구사항별 검사를 실행합니다. 다른 이슈 변경이 섞이지 않았는지 확인합니다.
7. 별도 checker가 새 세션에서 요구사항과 diff를 읽고 독립 검증합니다.
8. 결과가 승인이고 정책이 통과하면 coordinator가 커밋합니다. 커밋 SHA와 검증한 작업 트리가 일치하는지 확인합니다.
9. 소유권·중복 PR을 다시 확인하고 브랜치를 push합니다. `Closes #번호`와 요구사항별 체크리스트를 담은 PR을 생성합니다.
10. PR 번호·후보 SHA·검증 결과를 저장하고 정확한 SHA의 원격 CI를 확인합니다.

### 기존 PR을 관리할 때

- CI 실패와 실행 가능한 리뷰 의견을 분류합니다.
- CI가 pending이면 상태를 저장하고 다음 실행에서 이어갑니다. CI 없음은 성공이 아닙니다.
- 수정이 필요하면 해당 브랜치의 현재 SHA를 worktree에서 검증·수정합니다.
- maker와 checker를 분리하고, 검증 후 coordinator가 commit·push합니다.
- 체크리스트를 요구사항별 증거와 매칭합니다. 새 SHA에서는 이전 검증을 재사용하지 않습니다.
- 본문 갱신 직전에 최신 본문과 SHA를 읽어 사람의 편집을 보존합니다.
- PR이 머지·닫힘 상태면 진행 상태를 정리합니다. 이슈의 실제 종료 여부도 조회합니다.

## 5. 상태와 재시도 저장

이슈별 상태 예시입니다. `null` 비용은 미측정이며 0으로 바꾸지 않습니다.

```json
{
  "schemaVersion": 1,
  "issueNumber": 1,
  "phase": "waiting_ci",
  "branch": "issue/1-discount",
  "prNumber": 4,
  "verifiedSha": "<실제 후보 SHA>",
  "attempts": 1,
  "tokensUsed": null,
  "lastFailureSignature": null,
  "evidence": [],
  "updatedAt": "<실제 UTC 시각>"
}
```

PR 번호 4는 예시이며 현재 생성된 PR이 아닙니다. 상태는 별도 상태 브랜치나 외부 DB 등에 지속 저장합니다. 실행 중 생성한 로컬 JSON만으로는 Actions 다음 실행을 이어갈 수 없습니다. 저장 성공을 확인하고 종료하며, 소유권에는 만료 시간과 소유자를 기록합니다. 갱신은 원자적으로 수행해 경쟁 실행을 막습니다.

재시도 제한은 실행 한 번마다 초기화하지 않습니다. 같은 이슈의 작업에 최대 3회를 누적 적용하고, 초과하면 needs-human으로 멈춥니다. 사람이 명시적으로 재개할 때만 새 작업 세대로 초기화합니다. 같은 SHA·같은 실패를 반복 처리하지 않습니다.

원격 PR 생성 후 상태 저장 전에 프로그램이 죽을 수 있습니다. 복구 시 이슈 연결·정해진 브랜치·저장된 PR 번호를 재조회해서 기존 PR을 찾아야 합니다. 임시 장애 후 무조건 새 PR을 생성하면 안 됩니다.

## 6. GitHub 인증과 CI

GitHub 조회·쓰기 작업은 coordinator가 gh CLI로 수행합니다. 요청별 JSON을 파싱하고 실패 상태를 처리합니다. PR 생성 전에 연결된 PR이 없는지 다시 확인합니다.

`GITHUB_TOKEN`으로 만든 push/PR 이벤트는 일반적으로 다른 workflow를 자동 실행하지 않습니다. 적절한 GitHub App/PAT로 변경을 push하거나 `test.yml`을 후보 브랜치에 workflow_dispatch하고, 반환된 실행의 head SHA가 후보 SHA와 일치하는지 확인하는 방식으로 연결합니다. 필요한 저장소 권한과 Actions 실행 권한을 확인해야 합니다.

근거: [GitHub workflow 트리거와 토큰](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

## 7. 구현 완료를 확인할 테스트

| 상황 | 기대 동작 |
|---|---|
| report 모드 | AI 구현·프로젝트 수정·GitHub 쓰기 없음 |
| ready 이슈 없음 | AI 호출 없이 종료 |
| 이미 연결된 PR 존재 | 새 PR 생성 없이 기존 PR 관리 |
| maker 성공, 테스트 실패 | PR 생성 금지, 제한 내 재시도 |
| checker 거절 | 완료 체크 금지, 제한 내 재시도 |
| 검증 뒤 head SHA 변경 | 승인 무효화 후 재검증 |
| 현재 SHA의 CI 없음/대기 | 성공 처리 금지 |
| 기존 테스트 약화 또는 정책 파일 변경 | 정책 거절 |
| PR 생성 후 상태 저장 실패 | 다음 실행에서 기존 PR 발견·복구 |
| 동시 실행 | 하나만 소유권 확보·구현 |
| 재시도 3회 또는 budget 초과 | 상태를 저장하고 needs-human으로 중지 |
| 사람의 본문 수정 | 기존 내용을 보존하며 검증 항목만 갱신 |

최초 검증은 GitHub 작업을 가짜 adapter로 대체한 단위 테스트 → 로컬 report → 이슈 하나의 수동 repair → PR/CI 검증 → 예약 실행 순서로 진행합니다. 기본은 사람의 리뷰·머지이며 자동 머지는 별도 구현·정책으로 추가합니다.

## 8. 현재와 구현 후의 차이

현재: 이슈 3개, 기본 계산기, 애플리케이션 CI, 공식 loop-init을 호출하는 설정 스크립트, README와 이 설계 문서.

추가 구현 필요: coordinator·실제 AI adapter·지속 상태·소유권·독립 검증·PR 관리·자동화 테스트·트리거 workflow.

문서의 예시 파일을 실제로 만들고 인증과 실행 환경을 연결하기 전에는 자동 개발이 동작하지 않습니다.
