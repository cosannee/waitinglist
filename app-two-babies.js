(() => {
  'use strict';

  const { quote } = window.MarkovPricing;
  const $ = (id) => document.getElementById(id);
  const form = $('order-form');
  const secondContainer = $('second-baby');
  const secondToggle = $('second-baby-toggle');
  const prefixes = ['', 'baby2-'];
  const kinds = ['outfit', 'collar'];
  const extrasIds = ['embroidery', 'hat', 'bow'];
  const babyFields = ['height', 'weight', 'sex', 'toyColor', 'embroideryName'];
  const draftFields = ['fullName', 'phone', 'address', ...babyFields, ...babyFields.map((id) => 'baby2-' + id)];
  const draftKey = 'markovtoys-waitinglist-order-v1';
  const fabricNames = [
    'тёмно-пудровый', 'бежевый с сердечками', 'фисташковая полоска', 'фисташковый в мушку',
    'голубой батист', 'розовый в точку', 'жёлтый в мушку', 'молочный с сердечками',
    'голубой воздушный', 'голубо-серый в точку', 'белый воздушный', 'молочный воздушный',
    'хлопковая ткань в клетку', 'бежевый жатый хлопок', 'коричневый воздушный муслин',
    'прозрачная сетка фатин с блёстками'
  ];
  const selected = { outfit: null, collar: null, 'baby2-outfit': null, 'baby2-collar': null };
  const money = (amount) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ₽';
  const text = (id) => $(id).value.trim();
  const valueOrLine = (value) => value || '—';

  for (const heading of ['heading-2', 'heading-3', 'heading-4', 'heading-5']) {
    const original = form.querySelector(`section[aria-labelledby="${heading}"]`);
    const copy = original.cloneNode(true);
    copy.setAttribute('aria-labelledby', 'baby2-' + heading);
    copy.querySelectorAll('[id]').forEach((element) => { element.id = 'baby2-' + element.id; });
    copy.querySelectorAll('[name]').forEach((element) => { element.name = 'baby2-' + element.name; });
    copy.querySelectorAll('[for]').forEach((element) => { element.htmlFor = 'baby2-' + element.htmlFor; });
    secondContainer.appendChild(copy);
  }

  function setSecondVisible() {
    const enabled = secondToggle.checked;
    secondContainer.hidden = !enabled;
    $('first-baby-title').hidden = !enabled;
    $('baby1-price-row').hidden = !enabled;
    $('baby2-price-row').hidden = !enabled;
    secondContainer.querySelectorAll('input, select, textarea').forEach((element) => {
      element.disabled = !enabled;
    });
  }

  function setFabric(prefix, kind, number) {
    selected[prefix + kind] = number;
    $(prefix + kind + '-grid').querySelectorAll('button').forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index + 1 === number));
    });
    $(prefix + kind + '-choice').textContent = number
      ? `№${number} · ${fabricNames[number - 1]}`
      : 'Ткань не выбрана';
  }

  for (const prefix of prefixes) {
    for (const kind of kinds) {
      const grid = $(prefix + kind + '-grid');
      for (let number = 1; number <= fabricNames.length; number++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'fabric-card';
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', `Ткань №${number}: ${fabricNames[number - 1]}`);
        button.innerHTML = `<img src="fabric-${String(number).padStart(2, '0')}.png" alt="" loading="lazy"><span>№${number}</span>`;
        button.addEventListener('click', () => {
          setFabric(prefix, kind, number);
          update();
        });
        grid.appendChild(button);
      }
    }
  }

  function getExtras(prefix) {
    return Object.fromEntries(extrasIds.map((id) => [id, $(prefix + id).checked]));
  }

  function extrasCost(extras) {
    return (extras.embroidery ? 400 : 0) + (extras.hat ? 300 : 0) + (extras.bow ? 200 : 0);
  }

  function saveDraft() {
    const fields = Object.fromEntries(draftFields.map((id) => [id, $(id).value]));
    const animals = Object.fromEntries(prefixes.map((prefix, index) => [
      index === 0 ? 'first' : 'second',
      form.querySelector(`input[name="${prefix}animal"]:checked`)?.value || ''
    ]));
    const extras = { first: getExtras(''), second: getExtras('baby2-') };
    const hasData = secondToggle.checked || Object.values(fields).some((value) => value.trim()) ||
      Object.values(animals).some(Boolean) ||
      Object.values(extras).some((group) => Object.values(group).some(Boolean)) ||
      Object.values(selected).some((number) => number !== null);
    const draft = {
      version: 2, secondBaby: secondToggle.checked, fields, animals, extras, fabrics: { ...selected }
    };
    try {
      if (hasData) localStorage.setItem(draftKey, JSON.stringify(draft));
      else localStorage.removeItem(draftKey);
      $('draft-status').textContent = hasData
        ? 'Черновик сохранён на этом устройстве.'
        : 'Данные сохранятся на этом устройстве автоматически.';
    } catch {
      $('draft-status').textContent = 'Браузер не разрешил сохранить черновик. Не закрывайте страницу до отправки.';
    }
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (!draft || ![1, 2].includes(draft.version) || !draft.fields) return false;
      for (const id of draftFields) {
        if (typeof draft.fields[id] === 'string') $(id).value = draft.fields[id];
      }
      const animals = draft.version === 1
        ? { first: draft.animal, second: '' }
        : draft.animals || {};
      for (const [index, prefix] of prefixes.entries()) {
        const value = animals[index === 0 ? 'first' : 'second'];
        const radio = [...form.querySelectorAll(`input[name="${prefix}animal"]`)]
          .find((input) => input.value === value);
        if (radio) radio.checked = true;
      }
      const extras = draft.version === 1
        ? { first: draft.extras || {}, second: {} }
        : draft.extras || {};
      for (const [index, prefix] of prefixes.entries()) {
        const group = extras[index === 0 ? 'first' : 'second'] || {};
        for (const id of extrasIds) $(prefix + id).checked = group[id] === true;
      }
      for (const prefix of prefixes) {
        for (const kind of kinds) {
          const number = draft.fabrics?.[prefix + kind];
          if (Number.isInteger(number) && number >= 1 && number <= fabricNames.length) {
            setFabric(prefix, kind, number);
          }
        }
      }
      secondToggle.checked = draft.version === 2 && draft.secondBaby === true;
      return true;
    } catch {
      return false;
    }
  }

  function readBaby(prefix) {
    const weight = Number(text(prefix + 'weight'));
    const extras = getExtras(prefix);
    return {
      height: text(prefix + 'height'), weight, sex: text(prefix + 'sex'),
      animal: form.querySelector(`input[name="${prefix}animal"]:checked`)?.value || '',
      toyColor: text(prefix + 'toyColor'), embroideryName: text(prefix + 'embroideryName'),
      extras,
      fabrics: { outfit: selected[prefix + 'outfit'], collar: selected[prefix + 'collar'] },
      price: quote(weight, extras)
    };
  }

  function readOrder() {
    const babies = [readBaby('')];
    if (secondToggle.checked) babies.push(readBaby('baby2-'));
    const priced = babies.every((baby) => baby.price !== null);
    const total = priced ? babies.reduce((sum, baby) => sum + baby.price.total, 0) : null;
    const totals = total === null ? null : {
      total,
      options: babies.reduce((sum, baby) => sum + baby.price.options, 0),
      deposit: total * 0.3,
      balance: total * 0.7
    };
    return { fullName: text('fullName'), phone: text('phone'), address: text('address'), babies, totals };
  }

  function babyLines(baby, index, multiple) {
    const options = [];
    if (baby.extras.embroidery) options.push(`Вышивка имени «${valueOrLine(baby.embroideryName)}» — 400 ₽`);
    if (baby.extras.hat) options.push('Праздничный колпачок — 300 ₽');
    if (baby.extras.bow) options.push('Повязка-бантик на голову (для девочек) — 200 ₽');
    const lines = multiple ? [`Малыш ${index + 1}:`] : [];
    lines.push(
      `Мерки малыша: рост ${valueOrLine(baby.height)} см, вес ${Number.isFinite(baby.weight) && baby.weight > 0 ? baby.weight : '—'} г`,
      `Пол малыша: ${valueOrLine(baby.sex)}`,
      `Игрушка: ${valueOrLine(baby.animal)}`,
      `Цвет игрушки: ${valueOrLine(baby.toyColor)}`,
      `Комбинезон: ткань ${baby.fabrics.outfit ? `№${baby.fabrics.outfit} (${fabricNames[baby.fabrics.outfit - 1]})` : '—'}`,
      `Воротничок: ткань ${baby.fabrics.collar ? `№${baby.fabrics.collar} (${fabricNames[baby.fabrics.collar - 1]})` : '—'}`,
      `Дополнения:${options.length ? '\n— ' + options.join('\n— ') : ' нет'}`
    );
    if (multiple) lines.push(`Итого за малыша ${index + 1}: ${baby.price ? money(baby.price.total) : '—'}`);
    return lines;
  }

  function message(order) {
    const lines = [
      'Здравствуйте! Хочу оформить заказ Markov Toys из листа ожидания 🤍', '',
      `ФИО: ${valueOrLine(order.fullName)}`,
      `Телефон: ${valueOrLine(order.phone)}`, ''
    ];
    order.babies.forEach((baby, index) => {
      if (index > 0) lines.push('');
      lines.push(...babyLines(baby, index, order.babies.length > 1));
    });
    lines.push(
      '', `Доставка СДЭК: ${valueOrLine(order.address)}`, '',
      `Стоимость дополнений (включена в итог): ${order.totals ? money(order.totals.options) : '—'}`,
      `Итого: ${order.totals ? money(order.totals.total) : '—'}`,
      `Предоплата 30%: ${order.totals ? money(order.totals.deposit) : '—'}`,
      `Остаток после готовности: ${order.totals ? money(order.totals.balance) : '—'}`,
      'Доставка СДЭК оплачивается отдельно при получении.'
    );
    return lines.join('\n');
  }

  function valid(order) {
    const digits = order.phone.replace(/\D/g, '');
    return form.checkValidity() && digits.length >= 10 && digits.length <= 15 && order.totals !== null &&
      order.babies.every((baby) => Number(baby.height) > 0 &&
        baby.fabrics.outfit !== null && baby.fabrics.collar !== null &&
        (!baby.extras.embroidery || baby.embroideryName.length > 0));
  }

  function updateWeightNote(prefix, weight) {
    const note = $(prefix + 'weight-note');
    note.classList.toggle('error', weight > 5500);
    note.textContent = weight > 5500
      ? 'Вес больше 5500 г. Стоимость уточним индивидуально — напишите нам в чат.'
      : 'Стоимость зависит от веса малыша. Доступный диапазон — до 5500 г включительно.';
  }

  function update() {
    setSecondVisible();
    for (const prefix of prefixes) {
      $(prefix + 'embroidery-field').hidden = !$(prefix + 'embroidery').checked;
      $(prefix + 'embroideryName').required = $(prefix + 'embroidery').checked;
    }
    const order = readOrder();
    const options = order.babies.reduce((sum, baby) => sum + extrasCost(baby.extras), 0);
    $('options-price').textContent = money(options);
    $('baby1-price').textContent = order.babies[0].price ? money(order.babies[0].price.total) : '—';
    $('baby2-price').textContent = order.babies[1]?.price ? money(order.babies[1].price.total) : '—';
    $('total-price').textContent = order.totals ? money(order.totals.total) : '—';
    $('deposit-price').textContent = order.totals ? money(order.totals.deposit) : '—';
    $('message-preview').value = message(order);
    order.babies.forEach((baby, index) => updateWeightNote(index === 0 ? '' : 'baby2-', baby.weight));
    const isValid = valid(order);
    $('copy-button').disabled = !isValid;
    $('copy-status').className = 'copy-status';
    $('copy-status').textContent = isValid
      ? 'Сообщение готово — скопируйте и отправьте его в чат.'
      : 'Заполните обязательные поля, чтобы скопировать заказ.';
    saveDraft();
  }

  async function copyMessage() {
    const order = readOrder();
    if (!valid(order)) return;
    const content = message(order);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const helper = document.createElement('textarea');
        helper.value = content;
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        const success = document.execCommand('copy');
        helper.remove();
        if (!success) throw new Error('Copy unavailable');
      }
      $('copy-status').className = 'copy-status success';
      $('copy-status').textContent = 'Скопировано! Теперь отправьте сообщение нам в чат 🤍';
    } catch {
      $('message-preview').focus();
      $('message-preview').select();
      $('copy-status').className = 'copy-status error';
      $('copy-status').textContent = 'Не удалось скопировать автоматически. Текст выделен — скопируйте его вручную.';
    }
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (event) => event.preventDefault());
  $('copy-button').addEventListener('click', copyMessage);
  $('clear-draft').addEventListener('click', () => {
    if (!window.confirm('Очистить все заполненные данные на этом устройстве?')) return;
    form.reset();
    secondToggle.checked = false;
    for (const prefix of prefixes) {
      for (const kind of kinds) setFabric(prefix, kind, null);
    }
    update();
    $('draft-status').textContent = 'Черновик удалён с этого устройства.';
  });

  const restored = restoreDraft();
  update();
  if (restored) $('draft-status').textContent = 'Черновик восстановлен. Можно продолжить оформление.';
})();
