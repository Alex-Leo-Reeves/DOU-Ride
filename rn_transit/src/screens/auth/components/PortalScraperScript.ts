export const SCRAPER_JS = `
(function() {
  try {
    let name = ''; let matric = ''; let dept = '';
    let faculty = ''; let level = ''; let email = '';
    let profileImage = '';

    // Find profile images
    document.querySelectorAll('img').forEach(img => {
      const s = (img.src||'').toLowerCase();
      const a = (img.alt||'').toLowerCase();
      if ((s.includes('profile')||s.includes('photo')||a.includes('profile')||a.includes('photo')||a.includes('student')) && !s.includes('logo'))
        profileImage = img.src;
    });

    // If no profile image found, try to capture avatar/img in student profile area
    if (!profileImage) {
      document.querySelectorAll('.profile-area img, .student-card img, .avatar img').forEach(img => {
        profileImage = img.src;
      });
    }

    // Layout 1: Tables
    document.querySelectorAll('table tr').forEach(tr => {
      const cells = tr.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const l = cells[0].innerText.trim().toLowerCase();
        const v = cells[cells.length-1].innerText.trim();
        if (l.includes('name')||l.includes('full name')||l.includes('student name')) name = v;
        if (l.includes('matric')||l.includes('reg no')||l.includes('reg number')||l.includes('admission')) matric = v;
        if (l.includes('department')||l.includes('dept')) dept = v;
        if (l.includes('faculty')) faculty = v;
        if (l.includes('level')||l.includes('year')) level = v;
        if (l.includes('email')) email = v;
      }
    });

    // Layout 2: DL/dt/dd
    if (!name) document.querySelectorAll('dt, .label, .field-label').forEach(el => {
      const l = el.innerText.trim().toLowerCase();
      const v = (el.nextElementSibling?.innerText||el.querySelector('dd, .value')?.innerText||'').trim();
      if (l.includes('name')||l.includes('student name')) name = v;
      if (l.includes('matric')||l.includes('reg')) matric = v;
      if (l.includes('department')||l.includes('dept')) dept = v;
      if (l.includes('faculty')) faculty = v;
      if (l.includes('level')||l.includes('year')) level = v;
      if (l.includes('email')) email = v;
    });

    // Layout 3: Key: value divs
    if (!name) document.querySelectorAll('.info-row, .detail-row, .field-row, .profile-row').forEach(row => {
      const l = (row.querySelector('.label, .field-label, dt')?.innerText||'').trim().toLowerCase();
      const v = (row.querySelector('.value, .field-value, dd')?.innerText||'').trim();
      if (l.includes('name')) name = v;
      if (l.includes('matric')||l.includes('reg')) matric = v;
      if (l.includes('department')||l.includes('dept')) dept = v;
      if (l.includes('faculty')) faculty = v;
      if (l.includes('level')||l.includes('year')) level = v;
      if (l.includes('email')) email = v;
    });

    // Layout 4: Input values
    if (!name) document.querySelectorAll('input[name], input[id]').forEach(inp => {
      const id = (inp.id||'').toLowerCase();
      const n = (inp.name||'').toLowerCase();
      const v = inp.value.trim();
      if (id.includes('name')||n.includes('name')) name = v;
      if (id.includes('matric')||n.includes('matric')||id.includes('regno')) matric = v;
      if (id.includes('department')||n.includes('department')) dept = v;
      if (id.includes('faculty')||n.includes('faculty')) faculty = v;
      if (id.includes('level')||n.includes('level')) level = v;
      if (id.includes('email')||n.includes('email')) email = v;
    });

    // Layout 5: Card/panel text with colons
    if (!name) document.querySelectorAll('.card, .panel, .box, .student-card, .profile-panel').forEach(card => {
      card.innerText.split('\\n').forEach(line => {
        const p = line.split(':');
        if (p.length===2) {
          const l = p[0].trim().toLowerCase();
          const v = p[1].trim();
          if (l.includes('name')) name = v;
          if (l.includes('matric')||l.includes('reg')) matric = v;
          if (l.includes('department')||l.includes('dept')) dept = v;
          if (l.includes('faculty')) faculty = v;
          if (l.includes('level')||l.includes('year')) level = v;
          if (l.includes('email')) email = v;
        }
      });
    });

    // Layout 6: Heading
    if (!name) {
      const h = document.querySelector('h1, h2, .page-title, .student-name');
      if (h) name = h.innerText.trim();
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({
      name, matric, department: dept, faculty, level, email, profileImage,
      pageTitle: document.title
    }));
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({error: e.message}));
  }
})();
`;
