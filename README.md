# Pastoral Mind v1.1 — GitHub Pages 배포용

목회자의 사고방식과 목회철학을 기록하는 24문항 서술형 인터뷰입니다. **AI 분석은 포함하지 않습니다.** 작성한 결과는 나중에 사용자 본인이 ChatGPT에 분석을 요청하는 자료입니다.

## 1. GitHub Pages에 게시하기

1. GitHub에서 **새 공개 저장소**를 만듭니다. 추천 이름: `pastoral-mind` (기존 저장소도 사용 가능).
2. **이 폴더의 내용물** `index.html`, `drive.js`, `config.js`, `.nojekyll`을 저장소 최상위 경로에 업로드하고 커밋합니다. ZIP 자체를 업로드하면 배포되지 않습니다.
3. 저장소의 **Settings → Pages**로 이동합니다. `Source: Deploy from a branch` → `Branch: main` → `/(root)` → **Save**를 선택합니다.
4. Pages 설정에 표시되는 게시된 사이트 주소에서 설문을 사용합니다. 웹사이트가 공개되더라도 응답 원문은 GitHub에 업로드되지 않습니다.

공식 문서: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 2. 작성 완료 기능

- 8개 영역 × 3문항 = **24개 문항**의 답변이 모두 입력되어야 `작성 완료`가 활성화됩니다.
- 버튼을 누르면 완료 시각이 **현재 브라우저에 기록**됩니다.
- Google Drive 연결이 설정되지 않았으면 자동으로 **Markdown 백업을 다운로드**합니다. 이 경우 Drive 저장까지 완료된 것은 아닙니다.
- 답변을 수정하면 다시 `작성 완료` 버튼을 누를 수 있습니다.
- 현재 기기의 브라우저 `localStorage`에 초안이 저장됩니다. 다른 기기와 자동 동기화되지 않습니다.

## 3. GitHub Pages에서 Google Drive에 직접 저장하기 (초기 1회 설정)

사이트 코드는 공개되므로 **개인 액세스 토큰, OAuth Client Secret, API Key를 절대 업로드하지 마세요.** 아래에는 공개 가능한 OAuth **Client ID**만 입력합니다.

1. https://console.cloud.google.com/ 에서 본인 계정으로 프로젝트를 생성합니다.
2. **Google Drive API**를 활성화합니다.
3. **Google Auth Platform → Branding / Audience**에서 OAuth 동의 화면을 구성합니다. 개인 테스트라면 테스트 사용자에 본인 Google 계정을 넣습니다.
4. **Google Auth Platform → Clients → Create client → Web application**에서 OAuth 클라이언트를 만듭니다.
5. **Authorized JavaScript origins**에 GitHub Pages의 **출처만** 입력합니다. 예: `https://YOUR-GITHUB-USERNAME.github.io` (뒤에 `/pastoral-mind`를 붙이지 않습니다).
6. 발급된 **Client ID**를 저장소의 `config.js`에 입력합니다.
   ```js
   window.PASTORAL_MIND_GOOGLE_CLIENT_ID = 'YOUR-CLIENT-ID.apps.googleusercontent.com';
   ```
7. 수정한 파일을 커밋하고 Pages가 갱신된 뒤, 웹페이지에서 **동의 체크 → Google Drive에 저장**을 누릅니다. Google 계정 로그인/동의 화면이 나타납니다.

저장 시 Google Drive의 내 드라이브 루트 아래에 **`Pastoral Mind 응답`** 폴더를 만들고, 응답 내용을 **Google 문서**로 저장합니다. 이것은 본인의 Drive에 비공개로 저장되며 GitHub에는 전송되지 않습니다. 이 방식은 `drive.file` 최소 권한을 사용하기 때문에 이전 대화에서 생성한 별도의 Drive 폴더와는 **다른 폴더**를 사용합니다.

**중요:** GitHub Pages 버전은 저장 버튼을 누를 때마다 새로운 Google 문서를 만듭니다. 기존 문서를 덮어쓰는 기능은 향후 버전에서 구현할 수 있습니다. 클라우드 OAuth 저장 흐름은 실제 Google 인증이 없으면 끝까지 검증할 수 없으므로, 실제 동작은 위 설정 후 테스트하세요.

공식 문서: https://developers.google.com/workspace/drive/api/quickstart/js

## 4. 개인정보 보호

- GitHub Pages의 **설문 페이지 자체는 공개**됩니다. **응답 내용은 공개 저장소에 넣지 마세요.**
- 구글 OAuth 액세스 토큰은 브라우저 메모리에서만 사용하며 코드로 기록하거나 영구 저장하지 않습니다.
- 초안은 브라우저의 로컬 저장소에 남으므로 **개인 기기**에서 사용하세요.
- 실명, 상담 대상자의 식별정보, 상세한 심방 기록을 답변에 포함하지 마세요.
- Google Drive 로그인이나 백업 다운로드가 실패하면 페이지의 오류 메시지를 확인하세요.

## 구성 파일

- `index.html` — 설문 화면, 응답 완료 버튼, Markdown 백업, 로컬 임시 저장
- `config.js` — 구글 OAuth 클라이언트 ID (공개용 ID만)
- `drive.js` — Google 계정 인증과 본인 Drive 문서 생성
- `.nojekyll` — GitHub Pages 정적 파일 배포를 위한 설정

## Apps Script 대안

Google Cloud OAuth 설정이 어렵다면 별도 제공되는 **Apps Script 버전** (`Code.gs`, `Index.html`)을 개인 전용 웹 앱으로 배포해도 됩니다. 이 경우 설문이 Apps Script URL에서 실행되고, Google Drive 폴더에 기존 Google 문서를 갱신하는 기능을 지원합니다. **GitHub Pages에서 Apps Script의 `google.script.run`을 바로 사용할 수는 없습니다.**
