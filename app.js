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
        selected[kind] = number;
        grid.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        $(kind + '-choice').textContent = `№${number} · ${fabricNames[number - 1]}`;
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
  update();
})();
