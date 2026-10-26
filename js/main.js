// Island Taste — small interactions (mobile menu + dish pictures)
(function () {
  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Dish picture popup: hover (desktop), tap (phone), focus (keyboard)
  var pop = document.getElementById('dish-pop');
  var popImg = pop.querySelector('img');
  var popName = pop.querySelector('span');
  var current = null;

  function show(btn) {
    current = btn;
    popImg.src = btn.getAttribute('data-img');
    popImg.alt = btn.getAttribute('data-name');
    popName.textContent = btn.getAttribute('data-name');
    pop.hidden = false;
    var r = btn.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = r.left + window.scrollX;
    left = Math.max(10, Math.min(left, window.scrollX + document.documentElement.clientWidth - w - 10));
    var top = r.top + window.scrollY - h - 16;
    if (r.top - h - 16 < 0) top = r.bottom + window.scrollY + 16; // flip below if no room
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function hide() { pop.hidden = true; current = null; }

  document.querySelectorAll('.dish').forEach(function (btn) {
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-describedby', 'dish-pop');
    btn.addEventListener('mouseenter', function () { show(btn); });
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('focus', function () { show(btn); });
    btn.addEventListener('blur', hide);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (current === btn && !pop.hidden) hide(); else show(btn);
    });
  });
  document.addEventListener('click', hide);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  window.addEventListener('resize', hide);

  // Touch devices: popup note says "tap"
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
    var note = document.querySelector('.pop-note');
    if (note) note.textContent = 'Tap another dish to preview it.';
  }

  // Open-now status (Easton, MD time)
  try {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    var get = function (t) { var p = parts.find(function (x) { return x.type === t; }); return p ? p.value : ''; };
    var dayIdx = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday'));
    var mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
    var openDay = dayIdx >= 2 && dayIdx <= 5;
    var isOpen = openDay && mins >= 690 && mins < 960;
    var status = document.querySelector('[data-open-status]');
    if (status) {
      var txt = status.querySelector('.open-text');
      if (isOpen) {
        status.classList.add('is-open');
        txt.textContent = 'Open now until 4:00 PM';
      } else {
        status.classList.add('is-closed');
        var next;
        if (openDay && mins < 690) next = 'today at 11:30 AM';
        else if (dayIdx >= 1 && dayIdx <= 4) next = ['','Tuesday','Wednesday','Thursday','Friday'][dayIdx] + ' at 11:30 AM';
        else next = 'Tuesday at 11:30 AM';
        txt.textContent = 'Closed now. Opens ' + next + '.';
      }
    }
  } catch (err) { /* leave default text */ }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
