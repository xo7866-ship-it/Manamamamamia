/**
 * Pastoral Mind — GitHub Pages -> private Google Drive integration.
 * This runs only in the browser, asks the user for Google OAuth consent,
 * and uses the minimum drive.file scope. Access tokens are never persisted.
 * The browser cannot access files belonging to other users unless that user
 * authenticates and explicitly grants consent.
 */
(() => {
  'use strict';
  let accessToken = null;
  const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const DRIVE_ROOT = 'https://www.googleapis.com/drive/v3';
  const FOLDER_NAME = 'Pastoral Mind 응답';

  function getToken() {
    return new Promise((resolve, reject) => {
      const clientId = String(window.PASTORAL_MIND_GOOGLE_CLIENT_ID || '').trim();
      if (!clientId) {
        reject(new Error('Google OAuth 클라이언트 ID가 설정되지 않았습니다. 저장소의 config.js를 설정해 주세요.'));
        return;
      }
      if (!window.google || !google.accounts || !google.accounts.oauth2) {
        reject(new Error('Google 계정 인증 모듈을 불러오지 못했습니다. 네트워크와 브라우저의 팝업 차단 설정을 확인해 주세요.'));
        return;
      }
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: (response) => {
          if (!response || response.error || !response.access_token) {
            reject(new Error(response && (response.error_description || response.error) || 'Google 계정 인증이 취소되었거나 실패했습니다.'));
            return;
          }
          accessToken = response.access_token;
          resolve(accessToken);
        }
      });
      // Called as part of an explicit save/complete button interaction.
      // The OAuth popup must be triggered by a user gesture.
      tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    });
  }

  async function api(url, options={}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`
      }
    });
    let result = null;
    try { result = await response.json(); } catch (_) { /* Some errors have no JSON body. */ }
    if (!response.ok) {
      const message = result && result.error && result.error.message;
      throw new Error(message || `Google Drive 오류 (HTTP ${response.status})`);
    }
    return result;
  }

  async function ensureFolder() {
    // The drive.file permission lists only files this app has permission to use;
    // a new app-owned folder is created if none is visible.
    const q = `name = '${FOLDER_NAME.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const params = new URLSearchParams({ q, fields: 'nextPageToken,files(id,name,mimeType)', pageSize: '100' });
    const found = await api(`${DRIVE_ROOT}/files?${params}`);
    if (Array.isArray(found.files) && found.files[0]) return found.files[0].id;
    const created = await api(`${DRIVE_ROOT}/files?fields=id,name`, {
      method: 'POST',
      headers: {'Content-Type':'application/json; charset=UTF-8'},
      body: JSON.stringify({ name:FOLDER_NAME, mimeType:'application/vnd.google-apps.folder' })
    });
    if(!created || !created.id) throw new Error('응답 폴더 생성 결과를 확인하지 못했습니다.');
    return created.id;
  }

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function paragraphs(value) {
    return String(value || '').trim().split(/\n{2,}/)
      .map(piece => `<p>${escapeHTML(piece).replace(/\n/g, '<br>')}</p>`).join('');
  }
  function documentHTML(payload) {
    let html = '<!doctype html><html lang="ko"><head><meta charset="UTF-8"></head><body>';
    html += '<h1>Pastoral Mind · 목회자 제2의 두뇌</h1>';
    html += '<p>자체 제작 심층 인터뷰 원문 (AI 분석 아님)</p>';
    html += `<p><strong>이름 또는 별명:</strong> ${escapeHTML(payload.displayName||'익명')}</p>`;
    html += `<p><strong>주요 사역:</strong> ${escapeHTML(payload.ministry||'-')}</p>`;
    html += `<p><strong>목회 경력:</strong> ${escapeHTML(payload.career||'-')}</p>`;
    html += `<p><strong>작성 완료:</strong> ${escapeHTML(payload.completedAt || '진행 중')}</p>`;
    let section = '';
    for(const a of payload.answers || []){
      if(a.section!==section){ section=a.section;html+=`<h2>${escapeHTML(section)}</h2>`; }
      html+=`<h3>${escapeHTML(a.id)}. ${escapeHTML(a.question)}</h3>`;
      html+=paragraphs(a.answer||'(미응답)');
    }
    html+='<hr><p>분석 시 답변 근거와 AI의 추론을 구분하고, 불확실한 부분은 반드시 질문으로 확인할 것.</p></body></html>';
    return html;
  }

  async function uploadGoogleDoc(folderId,payload) {
    const d = new Date();
    const stamp = [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');
    const title = `[Pastoral Mind] ${(payload.displayName || '익명').replace(/[\\/<>:"|?*]/g,' ').slice(0,30)} · ${stamp}`;
    const metadata = { name:title, mimeType:'application/vnd.google-apps.document', parents:[folderId], description:'목회자 자기보고 심층 인터뷰 응답' };
    const boundary = `pastoralmind_${Date.now().toString(16)}`;
    const body = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${documentHTML(payload)}\r\n`,
      `--${boundary}--`
    ].join('');
    const params = new URLSearchParams({uploadType:'multipart',fields:'id,name,mimeType,webViewLink'});
    const created = await api(`https://www.googleapis.com/upload/drive/v3/files?${params}`,{
      method:'POST',
      headers:{'Content-Type':`multipart/related; boundary=${boundary}`},
      body
    });
    if(!created || !created.id) throw new Error('문서 생성 결과를 확인하지 못했습니다.');
    return {ok:true,updated:false,docId:created.id,url:created.webViewLink||`https://docs.google.com/document/d/${encodeURIComponent(created.id)}/edit`,savedAt:new Date().toLocaleString('ko-KR')};
  }

  window.PastoralDrive = {
    // markdownContent may be used by future storage adapters; Google Docs import
    // currently uses the structured question/answer payload.
    async save(payload, markdownContent){
      if(!payload || payload.consent!==true)throw new Error('저장 동의가 필요합니다.');
      if(!(payload.answers||[]).some(a=>String(a.answer||'').trim()))throw new Error('답변이 없습니다.');
      await getToken();
      const folderId = await ensureFolder();
      return await uploadGoogleDoc(folderId,payload);
    }
  };
})();
