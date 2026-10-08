(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const input = $('#json-input');
  const output = $('#formatted-output');
  const status = $('#status');
  const parseState = $('#parse-state');
  const tree = $('#tree-view');
  const stats = $('#stats');
  const searchInput = $('#search-input');
  const searchResults = $('#search-results');
  let parsed;
  let valid = false;
  let toastTimer;
  let treeExpanded = false;

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 1900);
  }

  function byteLength(value) { return new TextEncoder().encode(value).length; }
  function setStatus(message, kind = '') {
    status.textContent = message;
    status.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : '';
  }
  function metrics(text) {
    const lines = text ? text.split('\n').length : 0;
    const bytes = byteLength(text);
    $('#input-metrics').textContent = `${lines} line${lines === 1 ? '' : 's'} · ${bytes.toLocaleString()} bytes`;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function syntaxHighlight(value) {
    const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return escapeHtml(json).replace(/(&quot;(?:\\.|[^&])*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g, match => {
      if (match.startsWith('&quot;')) return `<span style="color:${match.endsWith(':') || match.endsWith(': ') ? '#aebcff' : '#88d6b5'}">${match}</span>`;
      if (match === 'true' || match === 'false') return `<span style="color:#e89aaa">${match}</span>`;
      if (match === 'null') return `<span style="color:#8998b0">${match}</span>`;
      return `<span style="color:#e8c677">${match}</span>`;
    });
  }
  function countShape(value) {
    const result = { keys: 0, arrays: 0, maxDepth: 0 };
    const visit = (node, depth) => {
      result.maxDepth = Math.max(result.maxDepth, depth);
      if (Array.isArray(node)) { result.arrays++; node.forEach(child => visit(child, depth + 1)); }
      else if (node && typeof node === 'object') { const entries = Object.entries(node); result.keys += entries.length; entries.forEach(([, child]) => visit(child, depth + 1)); }
    };
    visit(value, 0);
    return result;
  }
  function renderStats(value, source) {
    const shape = countShape(value);
    const size = byteLength(source);
    const prettySize = size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(2)} MB`;
    const values = [shape.keys.toLocaleString(), shape.arrays.toLocaleString(), shape.maxDepth.toLocaleString(), prettySize];
    stats.innerHTML = ['Keys', 'Arrays', 'Depth', 'Size'].map((label, index) => `<div class="stat"><span>${label}</span><b>${values[index]}</b></div>`).join('');
  }
  function jsonPath(path) {
    return '$' + path.map(part => typeof part === 'number' ? `[${part}]` : /^[A-Za-z_$][\w$]*$/.test(part) ? `.${part}` : `[${JSON.stringify(part)}]`).join('');
  }
  function buildTree(value) {
    tree.replaceChildren();
    const root = document.createElement('div');
    root.className = 'tree-node';
    renderNode(root, null, value, [], true);
    tree.append(root);
  }
  function renderNode(parent, key, value, path, root = false) {
    const node = document.createElement('div'); node.className = 'tree-node';
    const row = document.createElement('div'); row.className = 'tree-row';
    const expandable = value !== null && typeof value === 'object';
    const count = expandable ? Object.keys(value).length : 0;
    const toggle = document.createElement('button'); toggle.className = 'tree-toggle'; toggle.type = 'button'; toggle.textContent = expandable ? (treeExpanded ? '▾' : '▸') : '·'; toggle.disabled = !expandable; toggle.setAttribute('aria-label', expandable ? 'Toggle nested values' : 'Value');
    row.append(toggle);
    if (!root) { const k = document.createElement('span'); k.className = typeof key === 'number' ? 'tree-index' : 'tree-key'; k.textContent = typeof key === 'number' ? `[${key}]` : JSON.stringify(key); row.append(k, Object.assign(document.createElement('span'), {className:'tree-colon',textContent:':'})); }
    const text = expandable ? (Array.isArray(value) ? `Array(${count})` : `Object(${count})`) : JSON.stringify(value);
    const val = document.createElement('span'); val.className = expandable ? 'tree-type' : `tree-value ${value === null ? 'null' : typeof value}`; val.textContent = text; row.append(val);
    const copy = document.createElement('button'); copy.type='button'; copy.className='path-button'; copy.textContent='path'; copy.title='Copy JSON path'; copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(jsonPath(path)); toast(`Copied ${jsonPath(path)}`); } catch { toast('Clipboard access is unavailable'); } }); row.append(copy); node.append(row);
    if (expandable && count) {
      const children = document.createElement('div'); children.className='tree-children';
      Object.entries(value).forEach(([childKey, child]) => { const normalized = Array.isArray(value) ? Number(childKey) : childKey; renderNode(children, normalized, child, [...path, normalized]); }); node.append(children);
      toggle.addEventListener('click', () => { node.classList.toggle('collapsed'); toggle.textContent = node.classList.contains('collapsed') ? '▸' : '▾'; });
      if (!treeExpanded) node.classList.add('collapsed');
    }
    parent.append(node);
  }
  function updateSearch() {
    const term = searchInput.value.trim().toLocaleLowerCase();
    if (!valid) { searchResults.textContent = 'Enter valid JSON first.'; return; }
    if (!term) { searchResults.textContent = 'Enter a term to search your document.'; return; }
    const found = [];
    function visit(value, path) {
      if (found.length >= 100) return;
      if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
          const part = Array.isArray(value) ? Number(key) : key;
          const childPath = [...path, part];
          if (String(key).toLocaleLowerCase().includes(term)) found.push({path:childPath, value:child, match:'key'});
          else if (child === null ? 'null'.includes(term) : String(child).toLocaleLowerCase().includes(term) && (typeof child !== 'object')) found.push({path:childPath,value:child,match:'value'});
          visit(child, childPath);
        }
      }
    }
    visit(parsed, []);
    if (!found.length) { searchResults.textContent='No matching keys or values.'; return; }
    const fragment = document.createDocumentFragment();
    found.slice(0,3).forEach(item => { const line=document.createElement('div'); line.className='search-hit'; line.append(`${item.match} `); const code=document.createElement('code'); code.textContent=jsonPath(item.path); line.append(code); fragment.append(line); });
    if(found.length>3){const more=document.createElement('span');more.className='search-more';more.textContent=`+${found.length-3} more`;fragment.append(more);}
    searchResults.replaceChildren(fragment);
  }
  function update() {
    const raw = input.value;
    metrics(raw);
    if (!raw.trim()) {
      valid = false; parsed = undefined; parseState.className='parse-state'; parseState.innerHTML='<i></i> Waiting for JSON'; output.innerHTML='<code class="placeholder-code">Your formatted JSON will appear here.</code>'; $('#output-metrics').textContent='—'; stats.innerHTML=['Keys','Arrays','Depth','Size'].map(x=>`<div class="stat"><span>${x}</span><b>—</b></div>`).join(''); tree.innerHTML='<div class="tree-empty">Your document outline will appear here after you enter valid JSON.</div>'; searchResults.textContent='Enter a term to search your document.'; setStatus('Ready'); updateSearch(); return;
    }
    try {
      parsed=JSON.parse(raw); valid=true;
      const formatted=JSON.stringify(parsed,null,2);
      output.innerHTML=`<code>${syntaxHighlight(formatted)}</code>`;
      $('#output-metrics').textContent=`${formatted.split('\n').length} lines · ${byteLength(formatted).toLocaleString()} bytes`;
      parseState.className='parse-state valid';parseState.innerHTML='<i></i> Valid JSON';setStatus('Valid JSON','success');
      renderStats(parsed,raw);treeExpanded=false;buildTree(parsed);updateSearch();
    } catch(error) {
      valid=false;parsed=undefined;parseState.className='parse-state invalid';parseState.innerHTML='<i></i> Invalid JSON';setStatus(error.message,'error');
      output.innerHTML=`<code class="placeholder-code">Fix the input to see the formatted document.\n\n${escapeHtml(error.message)}</code>`;
      $('#output-metrics').textContent='—';stats.innerHTML=['Keys','Arrays','Depth','Size'].map(x=>`<div class="stat"><span>${x}</span><b>—</b></div>`).join('');tree.innerHTML='<div class="tree-empty">A structure preview appears when the JSON is valid.</div>';updateSearch();
    }
  }
  function setInput(value) { input.value=value; update(); }
  input.addEventListener('input',update);
  $('#format-json').addEventListener('click',()=>{if(!valid)return toast('Enter valid JSON first');setInput(JSON.stringify(parsed,null,2));toast('JSON formatted');});
  $('#minify-json').addEventListener('click',()=>{if(!valid)return toast('Enter valid JSON first');setInput(JSON.stringify(parsed));toast('JSON minified');});
  $('#clear-input').addEventListener('click',()=>{setInput('');input.focus();});
  $('#copy-json').addEventListener('click',async()=>{if(!valid)return toast('Enter valid JSON first');try{await navigator.clipboard.writeText(JSON.stringify(parsed,null,2));toast('Formatted JSON copied');}catch{toast('Clipboard access is unavailable');}});
  $('#download-json').addEventListener('click',()=>{if(!valid)return toast('Enter valid JSON first');const blob=new Blob([JSON.stringify(parsed,null,2)+'\n'],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='formatted.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);});
  $('#open-file').addEventListener('click',()=>$('#file-input').click());
  $('#file-input').addEventListener('change',async(event)=>{const file=event.target.files?.[0];if(!file)return;if(file.size>25*1024*1024){toast('File is larger than 25 MB');event.target.value='';return;}try{setInput(await file.text());toast(`Opened ${file.name}`);}catch{toast('Could not read this file');}event.target.value='';});
  $('#search-button').addEventListener('click',updateSearch);searchInput.addEventListener('keydown',event=>{if(event.key==='Enter')updateSearch();});
  $('#expand-tree').addEventListener('click',()=>{if(!valid)return toast('Enter valid JSON first');treeExpanded=!treeExpanded;$('#expand-tree').textContent=treeExpanded?'Collapse all':'Expand all';buildTree(parsed);});
  $$('.tab').forEach(button=>button.addEventListener('click',()=>{$$('.tab').forEach(tab=>{const active=tab===button;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));});$('#panel-explore').hidden=button.id!=='tab-explore';$('#panel-diff').hidden=button.id!=='tab-diff';}));
  $('.diff-clear').addEventListener('click',event=>{$(`#${event.currentTarget.dataset.target}`).value='';});
  $$('.diff-clear').forEach(button=>button.addEventListener('click',()=>{$('#diff-summary').innerHTML='<span class="diff-empty">Add two JSON documents to compare.</span>';$('#diff-results').replaceChildren();}));
  function compareValues(before,after,path,changes){
    if(Object.is(before,after))return;
    const bothObjects=before!==null&&after!==null&&typeof before==='object'&&typeof after==='object'&&Array.isArray(before)===Array.isArray(after);
    if(bothObjects){const keys=new Set([...Object.keys(before),...Object.keys(after)]);for(const key of keys){const hasA=Object.prototype.hasOwnProperty.call(before,key),hasB=Object.prototype.hasOwnProperty.call(after,key),part=Array.isArray(after)||Array.isArray(before)?Number(key):key;const next=[...path,part];if(!hasA)changes.push({kind:'added',path:next,after:after[key]});else if(!hasB)changes.push({kind:'removed',path:next,before:before[key]});else compareValues(before[key],after[key],next,changes);}return;}
    changes.push({kind:'changed',path,before,after});
  }
  function preview(value){let s=JSON.stringify(value);if(s===undefined)s='undefined';return s.length>150?s.slice(0,147)+'…':s;}
  $('#compare-json').addEventListener('click',()=>{
    const aText=$('#original-json').value,bText=$('#updated-json').value;
    try{
      const a=JSON.parse(aText),b=JSON.parse(bText),changes=[];compareValues(a,b,[],changes);
      const summary=$('#diff-summary'),results=$('#diff-results');results.replaceChildren();
      const counts={added:0,removed:0,changed:0};changes.forEach(item=>counts[item.kind]++);
      summary.innerHTML=`<span class="diff-count added">+ ${counts.added} added</span><span class="diff-count removed">− ${counts.removed} removed</span><span class="diff-count changed">↔ ${counts.changed} changed</span>`;
      if(!changes.length){results.innerHTML='<div class="diff-none">The documents are identical.</div>';return;}
      changes.slice(0,1000).forEach(change=>{const row=document.createElement('div');row.className=`diff-row ${change.kind}`;const kind=document.createElement('span');kind.className='diff-kind';kind.textContent=change.kind;const path=document.createElement('code');path.textContent=jsonPath(change.path);const left=document.createElement('pre');left.textContent=change.kind==='added'?'—':preview(change.before);const right=document.createElement('pre');right.textContent=change.kind==='removed'?'—':preview(change.after);row.append(kind,path,left,right);results.append(row);});
      if(changes.length>1000){const more=document.createElement('div');more.className='diff-none';more.textContent=`Showing first 1,000 of ${changes.length.toLocaleString()} changes.`;results.append(more);}
    }catch(error){$('#diff-summary').innerHTML=`<span class="diff-empty" style="color:var(--red)">Invalid JSON: ${escapeHtml(error.message)}</span>`;$('#diff-results').replaceChildren();}
  });
  $('#theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('light');try{localStorage.setItem('json-compass-theme',document.body.classList.contains('light')?'light':'dark');}catch{}});
  try{if(localStorage.getItem('json-compass-theme')==='light')document.body.classList.add('light');}catch{}
  let fileDrag=0;
  window.addEventListener('dragenter',event=>{if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();fileDrag++;document.body.classList.add('file-drag');}});
  window.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files'))event.preventDefault();});
  window.addEventListener('dragleave',event=>{if(event.dataTransfer?.types?.includes('Files')&&--fileDrag<=0){fileDrag=0;document.body.classList.remove('file-drag');}});
  window.addEventListener('drop',async event=>{if(!event.dataTransfer?.files?.length)return;event.preventDefault();fileDrag=0;document.body.classList.remove('file-drag');const file=event.dataTransfer.files[0];if(file.size>25*1024*1024)return toast('File is larger than 25 MB');try{setInput(await file.text());toast(`Opened ${file.name}`);}catch{toast('Could not read this file');}});
  update();
})();
