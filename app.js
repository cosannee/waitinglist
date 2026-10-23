(() => {
  'use strict';
  const { quote } = window.MarkovPricing;
  const $ = (id) => document.getElementById(id);
  const form = $('order-form');
  const fabricNames = [
    'тёмно-пудровый', 'бежевый с сердечками', 'фисташковая полоска', 'фисташковый в мушку',
    'голубой батист', 'розовый в точку', 'жёлтый в мушку', 'молочный с сердечками',
    'голубой воздушный', 'голубо-серый в точку', 'белый воздушный', 'молочный воздушный'
  ];
  const selected = { outfit: null, collar: null };
  const money = (amount) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ₽';
  const text = (id) => $(id).value.trim();
  const valueOrLine = (value) => value || '—';
  const draftKey = 'markovtoys-waitinglist-order-v1';
  const draftFields = ['fullName', 'phone', 'height', 'weight', 'sex', 'toyColor', 'address', 'embroideryName'];

  function setFabric(kind, number) {
    selected[kind] = number;
    $(kind + '-grid').querySelectorAll('button').forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index + 1 === number));
    });
    $(kind + '-choice').textContent = number
      ? `№${number} · ${fabricNames[number - 1]}`
      : 'Ткань не выбрана';
  }

  function saveDraft() {
    const fields = Object.fromEntries(draftFields.map((id) => [id, $(id).value]));
    const animal = form.querySelector('input[name="animal"]:checked')?.value || '';
    const extras = { embroidery: $('embroidery').checked, hat: $('hat').checked, bow: $('bow').checked };
    const hasData = Object.values(fields).some((value) => value.trim()) || animal ||
      Object.values(extras).some(Boolean) || selected.outfit || selected.collar;
    const draft = { version: 1, fields, animal, extras, fabrics: { ...selected } };
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
      if (!draft || draft.version !== 1 || !draft.fields) return false;
      for (const id of draftFields) {
        if (typeof draft.fields[id] === 'string') $(id).value = draft.fields[id];
      }
      const animal = [...form.querySelectorAll('input[name="animal"]')]
        .find((input) => input.value === draft.animal);
      if (animal) animal.checked = true;
      for (const id of ['embroidery', 'hat', 'bow']) $(id).checked = draft.extras?.[id] === true;
      for (const kind of ['outfit', 'collar']) {
        const number = draft.fabrics?.[kind];
        if (Number.isInteger(number) && number >= 1 && number <= 12) setFabric(kind, number);
      }
      return true;
    } catch {
      return false;
    }
  }

  for (const kind of ['outfit', 'collar']) {
    const grid = $(kind + '-grid');
    for (let number = 1; number <= 12; number++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fabric-card';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `Ткань №${number}: ${fabricNames[number - 1]}`);
      button.innerHTML = `<img src="fabric-${String(number).padStart(2, '0')}.png" alt="" loading="lazy"><span>№${number}</span>`;
      button.addEventListener('click', () => {
        setFabric(kind, number);
        update();
      });
      grid.appendChild(button);
    }
  }

  function readOrder() {
    const weight = Number(text('weight'));
    const extras = { embroidery: $('embroidery').checked, hat: $('hat').checked, bow: $('bow').checked };
    return {
      fullName: text('fullName'), phone: text('phone'), height: text('height'), weight,
      sex: text('sex'), animal: form.querySelector('input[name="animal"]:checked')?.value || '',
      toyColor: text('toyColor'), address: text('address'), embroideryName: text('embroideryName'),
      extras, selected, price: quote(weight, extras)
    };
  }

  function message(order) {
    const { price, extras } = order;
    const options = [];
    if (extras.embroidery) options.push(`Вышивка имени «${valueOrLine(order.embroideryName)}» — 400 ₽`);
    if (extras.hat) options.push('Праздничный колпачок — 300 ₽');
    if (extras.bow) options.push('Повязка-бантик на голову — 200 ₽');
    return [
      'Здравствуйте! Хочу оформить заказ Markov Toys из листа ожидания 🤍', '',
      `ФИО: ${valueOrLine(order.fullName)}`,
      `Телефон: ${valueOrLine(order.phone)}`,
      `Мерки малыша: рост ${valueOrLine(order.height)} см, вес ${Number.isFinite(order.weight) && order.weight > 0 ? order.weight : '—'} г`,
      `Пол малыша: ${valueOrLine(order.sex)}`,
      `Зверёк: ${valueOrLine(order.animal)}`,
      `Цвет игрушки: ${valueOrLine(order.toyColor)}`,
      `Комбинезон: ткань ${order.selected.outfit ? `№${order.selected.outfit} (${fabricNames[order.selected.outfit - 1]})` : '—'}`,
      `Воротничок: ткань ${order.selected.collar ? `№${order.selected.collar} (${fabricNames[order.selected.collar - 1]})` : '—'}`,
      `Дополнения: ${options.length ? '\n— ' + options.join('\n— ') : 'нет'}`,
      `Доставка СДЭК: ${valueOrLine(order.address)}`, '',
      `Игрушка с нарядом: ${price ? money(price.base) : '—'}`,
      `Дополнения: ${price ? money(price.options) : '—'}`,
      `Итого: ${price ? money(price.total) : '—'}`,
      `Предоплата 30%: ${price ? money(price.deposit) : '—'}`,
      `Остаток после готовности: ${price ? money(price.balance) : '—'}`,
      'Доставка СДЭК оплачивается отдельно при получении.'
    ].join('\n');
  }

  function valid(order) {
    const digits = order.phone.replace(/\D/g, '');
    return form.checkValidity() && digits.length >= 10 && digits.length <= 15 &&
      Number(order.height) > 0 && order.price !== null &&
      selected.outfit !== null && selected.collar !== null &&
      (!order.extras.embroidery || order.embroideryName.length > 0);
  }

  function update() {
    $('embroidery-field').hidden = !$('embroidery').checked;
    $('embroideryName').required = $('embroidery').checked;
    const order = readOrder();
    const { price } = order;
    $('base-price').textContent = price ? money(price.base) : '—';
    $('options-price').textContent = money((order.extras.embroidery ? 400 : 0) + (order.extras.hat ? 300 : 0) + (order.extras.bow ? 200 : 0));
    $('total-price').textContent = price ? money(price.total) : '—';
    $('deposit-price').textContent = price ? money(price.deposit) : '—';
    $('message-preview').value = message(order);
    $('copy-button').disabled = !valid(order);
    const note = $('weight-note');
    note.classList.toggle('error', order.weight > 5500);
    note.textContent = order.weight > 5500
      ? 'Вес больше 5500 г. Стоимость уточним индивидуально — напишите нам в чат.'
      : 'Стоимость зависит от веса малыша. Доступный диапазон — до 5500 г включительно.';
    $('copy-status').className = 'copy-status';
    $('copy-status').textContent = valid(order) ? 'Сообщение готово — скопируйте и отправьте его в чат.' : 'Заполните обязательные поля, чтобы скопировать заказ.';
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
    setFabric('outfit', null);
    setFabric('collar', null);
    update();
    $('draft-status').textContent = 'Черновик удалён с этого устройства.';
  });
  const restored = restoreDraft();
  update();
  if (restored) $('draft-status').textContent = 'Черновик восстановлен. Можно продолжить оформление.';
})();
