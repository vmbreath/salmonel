/* Salmonel search. No scientific matching is performed in the browser. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fields = [
    { key: 'OAntigen', source: 'o_antigen', label: 'O', title: 'Соматический антиген' },
    { key: 'H1Antigen', source: 'h_antigen1', label: 'H1', title: 'Жгутиковый антиген · фаза 1' },
    { key: 'H2Antigen', source: 'h_antigen2', label: 'H2', title: 'Жгутиковый антиген · фаза 2' }
  ];
  const groups = ['find', 'exclude'];
  const blank = () => ({ find: { OAntigen: [], H1Antigen: [], H2Antigen: [] }, exclude: { OAntigen: [], H1Antigen: [], H2Antigen: [] } });
  const copy = (filter) => JSON.parse(JSON.stringify(filter));
  const total = (filter) => groups.reduce((n, group) => n + fields.reduce((sum, field) => sum + filter[group][field.key].length, 0), 0);
  const same = (a, b) => groups.every((g) => fields.every((f) => a[g][f.key].length === b[g][f.key].length && a[g][f.key].every((v) => b[g][f.key].includes(v))));
  const mobile = matchMedia('(max-width: 959px)');
  const state = { seed: null, rows: [], hasResults: false, applied: blank(), requested: blank(), draft: blank(), mode: 'find', field: 'OAntigen', page: 1, size: 25, query: '', view: mobile.matches ? 'cards' : 'table', viewChosen: false, loading: false, failed: false, controller: null, sequence: 0 };
  const variants = new Map();
  const panels = new Map();
  let returnFocus = null;
  let timeoutId = null;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function button(text, className, callback) {
    const element = node('button', className, text);
    element.type = 'button';
    element.addEventListener('click', callback);
    return element;
  }
  function tell(text) { $('selection-message').textContent = text; }
  function changed() { return !same(state.draft, state.applied); }

  // Preserve the original application's single boundary-bracket removal and comma
  // splitting exactly: no recursive stripping, trimming or scientific interpretation.
  function splitVariant(value) {
    let text = value;
    if ('[{('.includes(text[0]) && text.length) {
      text = ']})'.includes(text[text.length - 1]) ? text.slice(1, -1) : text.slice(1);
    } else if (text.length && ']})'.includes(text[text.length - 1])) {
      text = text.slice(0, -1);
    }
    return text.includes(',') ? text.split(',') : [text];
  }
  function buildVariants(rows) {
    for (const field of fields) {
      const values = new Set();
      rows.forEach((row) => row[field.source].forEach((value) => splitVariant(value).forEach((part) => values.add(part))));
      const sorted = [...values];
      if (field.key === 'OAntigen') {
        const numeric = (s) => s.includes('Vi') ? 99999 : Number(s.includes('!') ? s.slice(0, -1) : s);
        sorted.sort((a, b) => numeric(a) - numeric(b));
      } else sorted.sort();
      variants.set(field.key, sorted);
    }
  }
  function validateRows(rows) {
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || !Object.hasOwn(row, 'id') || typeof row.serovar !== 'string' || typeof row.allgroups !== 'string' || fields.some((field) => !Array.isArray(row[field.source]) || row[field.source].some((v) => typeof v !== 'string')))) {
      throw new Error('Сервер вернул данные в неизвестном формате. Попробуйте обновить результаты.');
    }
    return rows;
  }
  function buildGroups() {
    const root = $('antigen-groups');
    const selector = node('div', 'group-selector');
    selector.id = 'group-selector';
    selector.setAttribute('role', 'group');
    selector.setAttribute('aria-label', 'Поле антигена');
    fields.forEach((field) => {
      const tab = button(field.label, 'group-button', () => {
        state.field = field.key;
        updateGroups();
      });
      tab.id = 'group-' + field.key;
      tab.dataset.field = field.key;
      tab.setAttribute('aria-controls', 'panel-' + field.key);
      selector.append(tab);
    });
    root.replaceChildren(selector);
    fields.forEach((field) => {
      const section = node('section', 'antigen-section');
      section.id = 'panel-' + field.key;
      section.setAttribute('aria-label', field.label + ': ' + field.title);
      const heading = node('h3', '', field.title);
      const label = node('label', 'antigen-search-label', 'Найти антиген ' + field.label);
      label.htmlFor = 'search-' + field.key;
      const input = node('input');
      input.type = 'search';
      input.id = 'search-' + field.key;
      input.placeholder = 'Поиск в списке ' + field.label;
      input.autocomplete = 'off';
      input.spellcheck = false;
      const grid = node('div', 'antigen-grid');
      grid.id = 'grid-' + field.key;
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Антигены ' + field.label);
      const empty = node('p', 'muted', 'В списке нет такого антигена.');
      empty.hidden = true;
      input.addEventListener('input', () => {
        const query = input.value.toLocaleLowerCase('ru');
        let shown = 0;
        for (const antigen of grid.children) {
          antigen.hidden = !antigen.dataset.value.toLocaleLowerCase('ru').includes(query);
          if (!antigen.hidden) shown++;
        }
        empty.hidden = shown !== 0;
      });
      section.append(heading, label, input, grid, empty);
      panels.set(field.key, { section, grid });
      root.append(section);
    });
    updateGroups();
  }
  function populateGroups() {
    for (const field of fields) {
      const grid = panels.get(field.key).grid;
      const fragment = document.createDocumentFragment();
      for (const value of variants.get(field.key)) {
        const antigen = button('', 'antigen-button', () => select(field, value));
        antigen.dataset.value = value;
        antigen.dataset.field = field.key;
        antigen.append(node('span', 'antigen-sign'), node('span', 'antigen-value', value));
        fragment.append(antigen);
      }
      grid.replaceChildren(fragment);
    }
    updateDraft();
  }
  function updateGroups() {
    for (const field of fields) {
      const active = state.field === field.key;
      $('group-' + field.key).setAttribute('aria-pressed', String(active));
      panels.get(field.key).section.hidden = !active;
    }
  }
  function select(field, value) {
    const values = state.draft[state.mode][field.key];
    const other = state.mode === 'find' ? 'exclude' : 'find';
    const position = values.indexOf(value);
    if (position >= 0) values.splice(position, 1);
    else {
      const replaces = state.draft[other][field.key].includes(value);
      if (values.length >= 24) { tell('В этом поле уже выбрано 24 антигена для текущего режима. Снимите один из них.'); return; }
      if (!replaces && total(state.draft) >= 48) { tell('Достигнут предел: 48 антигенов. Снимите один из выбранных.'); return; }
      if (value.length > 40) { tell('Это обозначение превышает допустимую сервером длину: 40 символов.'); return; }
      state.draft[other][field.key] = state.draft[other][field.key].filter((v) => v !== value);
      values.push(value);
    }
    tell('');
    updateDraft();
  }
  function updateDraft() {
    const count = total(state.draft);
    const pending = changed();
    $('draft-count').textContent = 'Выбрано: ' + count + ' из 48';
    $('mobile-filter-count').textContent = String(count);
    $('apply-filters').disabled = !state.seed;
    $('reset-filters').disabled = count === 0;
    $('apply-filters').textContent = mobile.matches ? 'Показать результаты' : pending ? 'Применить фильтры' : 'Показать результаты';
    $('pending-label').hidden = !pending;
    $('apply-pending').hidden = !pending;
    $('selection-bar').hidden = !count && !pending;
    for (const field of fields) {
      for (const antigen of panels.get(field.key).grid.children) {
        const value = antigen.dataset.value;
        const mode = state.draft.find[field.key].includes(value) ? 'find' : state.draft.exclude[field.key].includes(value) ? 'exclude' : '';
        antigen.dataset.mode = mode;
        antigen.setAttribute('aria-pressed', String(Boolean(mode)));
        antigen.setAttribute('aria-label', field.label + ' ' + value + (mode === 'find' ? ': включён' : mode === 'exclude' ? ': исключён' : ': не выбран') + '. ' + (mode === state.mode ? 'Снять выбор' : state.mode === 'find' ? 'Включить' : 'Исключить'));
        antigen.firstChild.textContent = mode === 'find' ? '+' : mode === 'exclude' ? '−' : '';
      }
    }
    const fragment = document.createDocumentFragment();
    for (const group of groups) for (const field of fields) for (const value of state.draft[group][field.key]) {
      const chip = button((group === 'find' ? '+ ' : '− ') + field.label + ': ' + value + ' ×', 'chip ' + group, () => {
        state.draft[group][field.key] = state.draft[group][field.key].filter((v) => v !== value);
        tell('Антиген снят. Примените изменения для обновления результатов.');
        updateDraft();
        const next = $('active-chips').querySelector('button');
        (next || $('apply-pending')).focus();
      });
      chip.setAttribute('aria-label', 'Убрать ' + (group === 'find' ? 'включение ' : 'исключение ') + field.label + ': ' + value + '. Требуется применение');
      fragment.append(chip);
    }
    $('active-chips').replaceChildren(fragment);
  }
  function showFeedback(title, detail) {
    $('feedback').hidden = false;
    $('feedback-title').textContent = title;
    $('feedback-detail').textContent = detail;
  }
  async function request(filter, initial = false) {
    if (state.controller) state.controller.abort();
    clearTimeout(timeoutId);
    const controller = new AbortController();
    const sequence = ++state.sequence;
    state.controller = controller;
    state.requested = copy(filter);
    state.loading = true;
    state.failed = false;
    $('feedback').hidden = true;
    let timedOut = false;
    timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
    render();
    try {
      const url = initial ? '/test' : '/filter?' + new URLSearchParams({ filter: JSON.stringify(filter) });
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 429) throw new Error('Слишком много запросов. Подождите немного и нажмите «Повторить».');
        if (response.status === 400 || response.status === 414) throw new Error('Сервер не принял фильтр. Уменьшите число антигенов и примените его снова.');
        throw new Error('Не удалось получить данные (код ' + response.status + '). Попробуйте ещё раз позже.');
      }
      const rows = validateRows(await response.json());
      if (sequence !== state.sequence) return;
      if (initial) {
        state.seed = rows;
        buildVariants(rows);
        populateGroups();
      }
      state.rows = rows;
      state.hasResults = true;
      state.applied = copy(filter);
      state.page = 1;
      state.failed = false;
    } catch (error) {
      if (sequence !== state.sequence || (error.name === 'AbortError' && !timedOut)) return;
      state.failed = true;
      const detail = timedOut ? 'Сервер не ответил за 30 секунд. Проверьте соединение и попробуйте снова.' : error instanceof TypeError || error instanceof SyntaxError ? 'Проверьте соединение с сервером и повторите запрос.' : error.message;
      showFeedback(state.hasResults ? 'Фильтр не применён — результаты не обновлены' : 'Не удалось загрузить справочник', detail + (state.hasResults ? ' Ниже сохранены результаты последнего успешного запроса, а не текущего выбора.' : ''));
    } finally {
      if (sequence === state.sequence) {
        clearTimeout(timeoutId);
        state.loading = false;
        updateDraft();
        render();
      }
    }
  }
  function apply() {
    if (!state.seed) return;
    closeDrawer();
    request(copy(state.draft));
  }
  function reset() {
    // Reset never issues a query; cancel an in-flight apply so it cannot
    // unexpectedly replace the last successful result after the reset.
    if (state.loading && state.seed) {
      state.controller.abort();
      state.sequence++;
      clearTimeout(timeoutId);
      state.loading = false;
      state.failed = false;
      state.requested = copy(state.applied);
      $('feedback').hidden = true;
      render();
    }
    state.draft = blank();
    tell('Выбор сброшен. Нажмите «Применить фильтры», чтобы обновить результаты.');
    updateDraft();
  }
  function formatAntigens(values) { return values.join(', '); }
  function render() {
    const matching = state.rows.filter((row) => row.serovar.toLocaleLowerCase('ru').includes(state.query));
    const pages = Math.max(1, Math.ceil(matching.length / state.size));
    state.page = Math.min(state.page, pages);
    const offset = (state.page - 1) * state.size;
    const rows = matching.slice(offset, offset + state.size);
    const count = matching.length.toLocaleString('ru-RU');
    $('results-title').textContent = state.hasResults ? 'Найдено записей: ' + count : 'Записи справочника';
    // Stable machine-readable count supplements the fully Russian visual label.
    $('results-title').dataset.count = String(matching.length);
    $('result-context').textContent = !state.hasResults ? 'База сероваров Salmonella' : 'В ответе сервера: ' + state.rows.length.toLocaleString('ru-RU') + ' · применено антигенов: ' + total(state.applied) + (state.query ? ' · поиск по названию' : '');
    let status = state.loading ? (state.hasResults ? 'Обновляем результаты. Пока показан предыдущий успешный ответ.' : 'Загружаем записи…') : state.failed ? (state.hasResults ? 'Результаты не обновлены: показан последний успешный ответ.' : 'Справочник недоступен. Повторите загрузку.') : 'Найдено записей: ' + count + '.';
    if (state.hasResults && !state.loading) status += ' Страница ' + state.page + ' из ' + pages + '.';
    $('live-status').textContent = status;
    $('result-body').setAttribute('aria-busy', String(state.loading));
    $('results').classList.toggle('is-stale', state.hasResults && (state.failed || state.loading));
    $('empty-state').hidden = !state.hasResults || matching.length > 0;
    $('clear-search').hidden = !state.query;
    $('empty-state').querySelector('h3').textContent = state.query ? 'Название не найдено' : 'Записей не найдено';
    const tableView = state.view === 'table';
    $('table-wrapper').hidden = !tableView || !rows.length;
    $('cards').hidden = tableView || !rows.length;
    $('view-table').setAttribute('aria-pressed', String(tableView));
    $('view-cards').setAttribute('aria-pressed', String(!tableView));
    const tableFragment = document.createDocumentFragment();
    const cardFragment = document.createDocumentFragment();
    for (const row of rows) {
      if (tableView) {
        const tr = node('tr');
        tr.dataset.id = String(row.id);
        const name = node('th', 'serovar-name', row.serovar);
        name.scope = 'row';
        tr.append(name, node('td', 'group-cell', row.allgroups));
        fields.forEach((field) => tr.append(node('td', 'formula', formatAntigens(row[field.source]))));
        tableFragment.append(tr);
      } else {
        const card = node('article', 'result-card');
        card.dataset.id = String(row.id);
        card.append(node('h3', '', row.serovar));
        const group = node('p', 'card-group');
        group.append(node('span', '', 'Группа: '), node('span', '', row.allgroups));
        card.append(group);
        const dl = node('dl', 'card-antigens');
        for (const field of fields) {
          const cell = node('div');
          cell.append(node('dt', '', field.label), node('dd', 'formula', formatAntigens(row[field.source])));
          dl.append(cell);
        }
        card.append(dl);
        cardFragment.append(card);
      }
    }
    $('table-body').replaceChildren(tableFragment);
    $('cards').replaceChildren(cardFragment);
    $('pagination').hidden = !state.hasResults || !matching.length;
    $('page-range').textContent = (matching.length ? offset + 1 : 0) + '–' + Math.min(offset + state.size, matching.length) + ' из ' + count;
    $('page-number').textContent = state.page + ' / ' + pages;
    $('prev-page').disabled = state.page <= 1;
    $('next-page').disabled = state.page >= pages;
  }
  function openDrawer() {
    if (!mobile.matches) return;
    returnFocus = document.activeElement;
    document.documentElement.classList.add('drawer-open');
    $('filter-dialog').showModal();
    $('close-filters').focus();
  }
  function closeDrawer() {
    if ($('filter-dialog').open) $('filter-dialog').close();
  }
  function drawerClosed() {
    document.documentElement.classList.remove('drawer-open');
    if (returnFocus && returnFocus.isConnected && mobile.matches) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }
  function responsiveLayout() {
    if (!mobile.matches) closeDrawer();
    const destination = mobile.matches ? $('filter-dialog') : $('sidebar');
    destination.append($('filter-panel'));
    updateDraft();
    if (!state.viewChosen) { state.view = mobile.matches ? 'cards' : 'table'; render(); }
  }
  function pageChange(delta) {
    state.page += delta;
    render();
    $('results').focus({ preventScroll: true });
    $('results').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  buildGroups();
  updateDraft();
  responsiveLayout();
  mobile.addEventListener('change', responsiveLayout);
  $('filters-form').addEventListener('submit', (event) => { event.preventDefault(); apply(); });
  $('apply-pending').addEventListener('click', apply);
  $('reset-filters').addEventListener('click', reset);
  document.querySelectorAll('input[name="mode"]').forEach((input) => input.addEventListener('change', () => { state.mode = input.value; tell(''); updateDraft(); }));
  $('serovar-search').addEventListener('input', (event) => { state.query = event.target.value.toLocaleLowerCase('ru'); state.page = 1; render(); });
  $('clear-search').addEventListener('click', () => { $('serovar-search').value = ''; state.query = ''; state.page = 1; render(); $('serovar-search').focus(); });
  $('retry').addEventListener('click', () => request(copy(state.requested), !state.seed));
  for (const view of ['cards', 'table']) $('view-' + view).addEventListener('click', () => { state.viewChosen = true; state.view = view; render(); });
  $('page-size').addEventListener('change', (event) => { state.size = Number(event.target.value); state.page = 1; render(); });
  $('prev-page').addEventListener('click', () => pageChange(-1));
  $('next-page').addEventListener('click', () => pageChange(1));
  $('open-filters').addEventListener('click', openDrawer);
  $('close-filters').addEventListener('click', closeDrawer);
  $('filter-dialog').addEventListener('cancel', (event) => { event.preventDefault(); closeDrawer(); });
  $('filter-dialog').addEventListener('close', drawerClosed);
  $('filter-dialog').addEventListener('click', (event) => { if (event.target === $('filter-dialog')) closeDrawer(); });
  $('filter-dialog').addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...$('filter-dialog').querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter((element) => element.getClientRects().length);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  request(blank(), true);
})();
