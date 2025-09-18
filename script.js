document.addEventListener('DOMContentLoaded', () => {
  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }

  // Simple client-side store using localStorage
  const STORAGE_KEYS = {
    users: 'sj_users',
    session: 'sj_session',
    jobs: 'sj_jobs',
    applications: 'sj_applications'
  };

  const ROLE = {
    student: 'student',
    recruiter: 'recruiter',
    admin: 'admin'
  };

  function readUsers() {
    const raw = localStorage.getItem(STORAGE_KEYS.users);
    return raw ? JSON.parse(raw) : [];
  }

  function writeUsers(users) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  }

  function readSession() {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  }

  function writeSession(session) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.session);
  }

  function generateId() {
    return 'id_' + Math.random().toString(36).slice(2, 10);
  }

  function seedDefaultAdmin() {
    const users = readUsers();
    const exists = users.some(u => u.role === ROLE.admin);
    if (!exists) {
      users.push({
        id: generateId(),
        role: ROLE.admin,
        name: 'Administrator',
        email: 'admin@smartjob.local',
        password: 'admin123',
        active: true
      });
      writeUsers(users);
    }
  }

  // UI helpers
  function show(el) { el.removeAttribute('hidden'); }
  function hide(el) { el.setAttribute('hidden', 'true'); }
  function setActiveTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
    });
    document.querySelectorAll('.tab-content').forEach(panel => {
      const isMatch = panel.id === `tab-${tabName}`;
      panel.toggleAttribute('hidden', !isMatch);
    });
  }

  // Auth flows
  function signup({ role, profile }) {
    const users = readUsers();
    const email = profile.email.toLowerCase();
    if (users.some(u => u.email.toLowerCase() === email)) {
      throw new Error('Email already registered');
    }
    const id = generateId();
    const user = { id, role, active: true, ...profile };
    users.push(user);
    writeUsers(users);
    return user;
  }

  function login({ email, password, role }) {
    const users = readUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.role === role);
    if (!user) throw new Error('Invalid credentials');
    if (!user.active) throw new Error('Account is deactivated');
    writeSession({ userId: user.id, role: user.role });
    return user;
  }

  function logout() {
    clearSession();
    routeToAuth();
  }

  function getCurrentUser() {
    const session = readSession();
    if (!session) return null;
    return readUsers().find(u => u.id === session.userId) || null;
  }

  // Rendering
  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const adminPanelSection = document.getElementById('adminPanelSection');

  const dashboardTitle = document.getElementById('dashboardTitle');
  const currentUserLabel = document.getElementById('currentUserLabel');
  const dashboardContent = document.getElementById('dashboardContent');
  const adminUserLabel = document.getElementById('adminUserLabel');

  function routeToAuth() {
    show(authSection);
    hide(dashboardSection);
    hide(adminPanelSection);
    setActiveTab('student');
  }

  function routeToDashboard(user) {
    hide(authSection);
    show(dashboardSection);
    hide(adminPanelSection);
    dashboardTitle.textContent = user.role === ROLE.student ? 'Student Dashboard' : 'Recruiter Dashboard';
    currentUserLabel.textContent = `${user.name || user.company} • ${user.email}`;
    renderDashboard(user);
  }

  function routeToAdmin(user) {
    hide(authSection);
    hide(dashboardSection);
    show(adminPanelSection);
    adminUserLabel.textContent = `${user.name} • ${user.email}`;
    renderUsersTable();
    renderAnalyticsCards();
    renderJobsApprovalTable();
  }

  function renderDashboard(user) {
    if (user.role === ROLE.student) {
      renderStudentDashboard(user);
    } else if (user.role === ROLE.recruiter) {
      renderRecruiterDashboard(user);
    }
  }

  // ============================
  // Jobs & Applications storage
  // ============================
  function readJobs() {
    const raw = localStorage.getItem(STORAGE_KEYS.jobs);
    return raw ? JSON.parse(raw) : [];
  }

  function writeJobs(jobs) {
    localStorage.setItem(STORAGE_KEYS.jobs, JSON.stringify(jobs));
  }

  function readApplications() {
    const raw = localStorage.getItem(STORAGE_KEYS.applications);
    return raw ? JSON.parse(raw) : [];
  }

  function writeApplications(apps) {
    localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(apps));
  }

  function seedSampleJobs() {
    const jobs = readJobs();
    if (jobs.length > 0) return;
    const sample = [
      {
        id: generateId(),
        title: 'Frontend Intern',
        company: 'PixelWorks',
        type: 'Internship',
        location: 'Remote',
        requiredSkills: ['JavaScript', 'HTML', 'CSS', 'React'],
        description: 'Work with the UI team to build components.',
        status: 'approved'
      },
      {
        id: generateId(),
        title: 'Backend Developer',
        company: 'DataForge',
        type: 'Full-time',
        location: 'Hybrid - Lagos',
        requiredSkills: ['Node.js', 'Express', 'MongoDB', 'REST'],
        description: 'Build APIs and services at scale.',
        status: 'approved'
      },
      {
        id: generateId(),
        title: 'ML Intern',
        company: 'InsightAI',
        type: 'Internship',
        location: 'Remote',
        requiredSkills: ['Python', 'Pandas', 'Machine Learning'],
        description: 'Assist with data pipelines and model training.',
        status: 'approved'
      }
    ];
    writeJobs(sample);
  }

  function hasApplied(userId, jobId) {
    return readApplications().some(a => a.userId === userId && a.jobId === jobId);
  }

  function applyToJob(userId, jobId) {
    if (hasApplied(userId, jobId)) return false;
    const apps = readApplications();
    apps.push({ id: generateId(), userId, jobId, appliedAt: new Date().toISOString(), shortlisted: false });
    writeApplications(apps);
    return true;
  }

  // ============================
  // Student Dashboard
  // ============================
  function parseSkills(input) {
    const raw = String(input || '');
    // Prefer splitting by commas/semicolons/newlines. If none, split by whitespace.
    const hasComma = /[,;\n]/.test(raw);
    const parts = (hasComma ? raw.split(/[;,\n]+/) : raw.split(/\s+/))
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.replace(/\s+/g, ' '));
    // De-duplicate case-insensitively and cap
    const seen = new Set();
    const result = [];
    for (const p of parts) {
      const k = p.toLowerCase();
      if (!seen.has(k)) { seen.add(k); result.push(p); }
      if (result.length >= 30) break;
    }
    return result;
  }

  function renderStudentDashboard(user) {
    const profileSkills = Array.isArray(user.skills) ? user.skills : [];
    const resumeUrl = user.resumeUrl || '';
    const portfolioUrl = user.portfolioUrl || '';

    const jobs = readJobs().filter(j => j.status === 'approved');
    const applications = readApplications().filter(a => a.userId === user.id);
    const appliedJobIds = new Set(applications.map(a => a.jobId));

    const recommended = recommendJobsForSkills(profileSkills, jobs).slice(0, 6);

    dashboardContent.innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <h3>My Profile</h3>
        <form id="studentProfileForm">
          <label>Name<input name="name" value="${user.name || ''}" required /></label>
          <label>Resume URL<input name="resumeUrl" type="url" placeholder="https://..." value="${resumeUrl}" /></label>
          <label>Portfolio URL<input name="portfolioUrl" type="url" placeholder="https://..." value="${portfolioUrl}" /></label>
          <label>Skills (comma-separated)
            <input name="skills" placeholder="e.g. JavaScript, React, CSS" value="${profileSkills.join(', ')}" />
          </label>
          <div class="row">
            <button type="submit">Save Profile</button>
            <span class="muted">Tip: use commas to add multiple skills</span>
          </div>
        </form>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <h3>Recommended for You</h3>
        ${recommended.length === 0 ? '<p class="muted">Add skills to get recommendations.</p>' : ''}
        <div class="jobs-grid">
          ${recommended.map(j => renderJobCard(j, appliedJobIds)).join('')}
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <h3>All Jobs & Internships</h3>
        <div class="row" style="margin:8px 0 12px;">
          <input id="jobsSearchInput" placeholder="Search jobs by keyword" style="flex:1;min-width:220px;" />
          <input id="jobsSkillsInput" placeholder="Filter skills (comma)" style="flex:1;min-width:220px;" />
          <button id="jobsApplyFilterBtn" class="secondary">Filter</button>
        </div>
        <div class="jobs-grid">
          ${jobs.map(j => renderJobCard(j, appliedJobIds)).join('')}
        </div>
      </div>

      <div class="card">
        <h3>My Applications</h3>
        ${applications.length === 0 ? '<p class="muted">No applications yet.</p>' : ''}
        <div class="table-responsive">
          ${applications.length > 0 ? renderApplicationsTable(applications, jobs) : ''}
        </div>
      </div>
    `;

    // Wire profile save
    document.getElementById('studentProfileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const users = readUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx === -1) return;
      users[idx] = {
        ...users[idx],
        name: fd.get('name').toString(),
        resumeUrl: fd.get('resumeUrl').toString(),
        portfolioUrl: fd.get('portfolioUrl').toString(),
        skills: parseSkills(fd.get('skills').toString())
      };
      writeUsers(users);
      alert('Profile saved');
      routeToDashboard(users[idx]);
    });

    // Wire job apply buttons
    dashboardContent.querySelectorAll('[data-action="apply"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const jobId = btn.getAttribute('data-id');
        if (!jobId) return;
        const ok = applyToJob(user.id, jobId);
        if (ok) {
          alert('Application submitted');
          renderStudentDashboard(getCurrentUser());
        } else {
          alert('Already applied to this job');
        }
      });
    });

    // Wire jobs filter
    const searchInput = document.getElementById('jobsSearchInput');
    const skillsInput = document.getElementById('jobsSkillsInput');
    const applyFilterBtn = document.getElementById('jobsApplyFilterBtn');
    const jobsGrid = dashboardContent.querySelector('.card:nth-of-type(3) .jobs-grid');
    function applyJobsFilter() {
      const kw = (searchInput.value || '').toLowerCase().trim();
      const skills = parseSkills(skillsInput.value).map(s => s.toLowerCase());
      const filtered = jobs.filter(j => {
        const text = `${j.title} ${j.company} ${j.type} ${j.location} ${j.description}`.toLowerCase();
        const kwOk = kw ? text.includes(kw) : true;
        const skillOk = skills.length > 0 ? j.requiredSkills.some(s => skills.includes(s.toLowerCase())) : true;
        return kwOk && skillOk;
      });
      jobsGrid.innerHTML = filtered.map(j => renderJobCard(j, appliedJobIds)).join('');
      // reattach apply handlers for filtered list
      jobsGrid.querySelectorAll('[data-action="apply"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const jobId = btn.getAttribute('data-id');
          if (!jobId) return;
          const ok = applyToJob(user.id, jobId);
          if (ok) {
            alert('Application submitted');
            renderStudentDashboard(getCurrentUser());
          } else {
            alert('Already applied to this job');
          }
        });
      });
    }
    applyFilterBtn.addEventListener('click', applyJobsFilter);
  }

  function renderJobCard(job, appliedJobIds) {
    const tags = job.requiredSkills.map(s => `<span class="tag">${s}</span>`).join(' ');
    const applied = appliedJobIds.has(job.id);
    const recruiter = job.ownerId ? (readUsers().find(u => u.id === job.ownerId) || null) : null;
    const givenBy = recruiter ? (recruiter.company || recruiter.name || 'Recruiter') : (job.company || 'Company');
    return `
      <div class="card job-card">
        <h4>${job.title}</h4>
        <p class="job-meta">${job.company || givenBy} • ${job.type} • ${job.location}</p>
        <p class="muted">Given by: ${givenBy}</p>
        <p>${job.description}</p>
        <div class="tags">${tags}</div>
        <div class="job-actions">
          <button data-action="apply" data-id="${job.id}" ${applied ? 'disabled class="secondary"' : ''}>${applied ? 'Applied' : 'Apply'}</button>
        </div>
      </div>
    `;
  }

  function renderApplicationsTable(applications, jobs) {
    const jobIdToJob = new Map(jobs.map(j => [j.id, j]));
    return `
      <table>
        <thead>
          <tr>
            <th>Job</th>
            <th>Company</th>
            <th>Type</th>
            <th>Applied</th>
          </tr>
        </thead>
        <tbody>
          ${applications.map(a => {
            const j = jobIdToJob.get(a.jobId);
            if (!j) return '';
            const date = new Date(a.appliedAt).toLocaleString();
            return `<tr><td>${j.title}</td><td>${j.company}</td><td>${j.type}</td><td>${date}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function recommendJobsForSkills(skills, jobs) {
    if (!skills || skills.length === 0) return [];
    const studentSkills = skills.map(s => s.toLowerCase());
    const scored = jobs.map(job => {
      const jobSkills = (job.requiredSkills || []).map(s => String(s).toLowerCase());
      // Count overlap with partial match tolerance
      let score = 0;
      for (const ss of studentSkills) {
        if (!ss) continue;
        const has = jobSkills.some(js => js.includes(ss) || ss.includes(js));
        if (has) score += 1;
      }
      // Bonus for title/description keyword presence
      const text = `${job.title} ${job.description}`.toLowerCase();
      for (const ss of studentSkills) {
        if (ss.length >= 3 && text.includes(ss)) score += 0.5;
      }
      return { job, score };
    }).filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
    // Return unique jobs in ranked order
    return scored.map(x => x.job);
  }

  // ============================
  // Recruiter Dashboard
  // ============================
  function addJob(ownerId, payload) {
    const jobs = readJobs();
    const job = {
      id: generateId(),
      ownerId,
      title: payload.title,
      company: payload.company,
      type: payload.type,
      location: payload.location,
      requiredSkills: payload.requiredSkills,
      description: payload.description,
      status: 'approved'
    };
    jobs.unshift(job);
    writeJobs(jobs);
    return job;
  }

  function deleteJob(jobId) {
    const jobs = readJobs().filter(j => j.id !== jobId);
    writeJobs(jobs);
    const apps = readApplications().filter(a => a.jobId !== jobId);
    writeApplications(apps);
  }

  function getApplicants(jobId) {
    const apps = readApplications().filter(a => a.jobId === jobId);
    const users = readUsers();
    return apps.map(a => ({
      application: a,
      student: users.find(u => u.id === a.userId) || null
    })).filter(x => x.student && x.student.role === ROLE.student);
  }

  function toggleShortlist(appId) {
    const apps = readApplications();
    const idx = apps.findIndex(a => a.id === appId);
    if (idx !== -1) {
      apps[idx].shortlisted = !apps[idx].shortlisted;
      writeApplications(apps);
      // Simulate email notification when shortlisted
      if (apps[idx].shortlisted) {
        const users = readUsers();
        const student = users.find(u => u.id === apps[idx].userId);
        if (student) {
          alert(`Email notification sent to ${student.email}: You have been shortlisted!`);
          console.log('Email notification (simulated):', {
            to: student.email,
            subject: 'You have been shortlisted',
            body: 'Congrats! A recruiter shortlisted your application.'
          });
        }
      }
    }
  }

  function filterApplicants(applicants, { keyword, skills }) {
    const kw = (keyword || '').trim().toLowerCase();
    const skillsSet = new Set((skills || []).map(s => s.toLowerCase()));
    return applicants.filter(({ student }) => {
      const text = [student.name, student.email, student.resumeUrl, student.portfolioUrl].filter(Boolean).join(' ').toLowerCase();
      const kwOk = kw ? text.includes(kw) : true;
      const studentSkills = Array.isArray(student.skills) ? student.skills.map(s => s.toLowerCase()) : [];
      const skillsOk = skillsSet.size > 0 ? studentSkills.some(s => skillsSet.has(s)) : true;
      return kwOk && skillsOk;
    });
  }

  function renderRecruiterDashboard(user) {
    const jobs = readJobs();
    const myJobs = jobs.filter(j => j.ownerId === user.id);
    dashboardContent.innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <h3>Post a Job/Internship</h3>
        <form id="recruiterPostJobForm">
          <label>Title<input name="title" required /></label>
          <label>Type<input name="type" placeholder="e.g. Full-time, Internship" required /></label>
          <label>Location<input name="location" placeholder="e.g. Remote, Onsite" required /></label>
          <label>Required Skills (comma-separated)
            <input name="requiredSkills" placeholder="e.g. JavaScript, Node.js, MongoDB" />
          </label>
          <label>Description<textarea name="description" rows="3" placeholder="Describe the role" ></textarea></label>
          <div class="row">
            <button type="submit">Publish Job</button>
            <span class="muted">Jobs will appear below and to students</span>
          </div>
        </form>
      </div>

      <div class="card">
        <h3>My Jobs</h3>
        ${myJobs.length === 0 ? '<p class="muted">No jobs yet. Post your first role above.</p>' : ''}
        <div class="jobs-grid">
          ${myJobs.map(j => renderRecruiterJobCard(j)).join('')}
        </div>
      </div>
    `;

    document.getElementById('recruiterPostJobForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      addJob(user.id, {
        title: fd.get('title').toString(),
        company: user.company || user.name || 'Company',
        type: fd.get('type').toString(),
        location: fd.get('location').toString(),
        requiredSkills: parseSkills(fd.get('requiredSkills').toString()),
        description: (fd.get('description') || '').toString()
      });
      e.target.reset();
      renderRecruiterDashboard(user);
    });

    // Wire per-job actions
    dashboardContent.querySelectorAll('[data-action="view-applicants"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const jobId = btn.getAttribute('data-id');
        if (!jobId) return;
        const container = dashboardContent.querySelector(`[data-applicants-container="${jobId}"]`);
        if (!container) return;
        const applicants = getApplicants(jobId);
        container.innerHTML = renderApplicantsBlock(jobId, applicants);
        wireApplicantsBlock(container, user, jobId);
      });
    });

    dashboardContent.querySelectorAll('[data-action="delete-job"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const jobId = btn.getAttribute('data-id');
        if (!jobId) return;
        if (confirm('Delete this job and its applications?')) {
          deleteJob(jobId);
          renderRecruiterDashboard(user);
        }
      });
    });
  }

  function renderRecruiterJobCard(job) {
    const applicantsCount = readApplications().filter(a => a.jobId === job.id).length;
    const tags = job.requiredSkills.map(s => `<span class=\"tag\">${s}</span>`).join(' ');
    return `
      <div class="card job-card">
        <h4>${job.title}</h4>
        <p class="job-meta">${job.company} • ${job.type} • ${job.location}</p>
        <p>${job.description}</p>
        <div class="tags">${tags}</div>
        <div class="job-actions">
          <button data-action="view-applicants" data-id="${job.id}">View Applicants (${applicantsCount})</button>
          <button class="secondary" data-action="delete-job" data-id="${job.id}">Delete</button>
        </div>
        <div class="divider"></div>
        <div data-applicants-container="${job.id}"></div>
      </div>
    `;
  }

  function renderApplicantsBlock(jobId, applicants) {
    return `
      <div class="card" style="background:#f8fafc;border:1px dashed #e2e8f0;">
        <div class="row space-between">
          <h4>Applicants</h4>
          <div class="row">
            <input placeholder="Search keyword" data-role="app-kw" style="min-width:200px;" />
            <input placeholder="Filter skills (comma)" data-role="app-skills" style="min-width:220px;" />
            <button class="secondary" data-role="app-apply-filter">Filter</button>
          </div>
        </div>
        ${applicants.length === 0 ? '<p class="muted">No applicants yet.</p>' : ''}
        ${applicants.length > 0 ? renderApplicantsTable(applicants) : ''}
      </div>
    `;
  }

  function renderApplicantsTable(applicants) {
    return `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Skills</th>
              <th>Resume</th>
              <th>Portfolio</th>
              <th>Applied</th>
              <th>Shortlist</th>
            </tr>
          </thead>
          <tbody>
            ${applicants.map(({ application, student }) => `
              <tr>
                <td>${student.name} <span class="muted">(${student.email})</span></td>
                <td>${(student.skills || []).join(', ')}</td>
                <td>${student.resumeUrl ? `<a href="${student.resumeUrl}" target="_blank">View</a>` : '-'}</td>
                <td>${student.portfolioUrl ? `<a href="${student.portfolioUrl}" target="_blank">Open</a>` : '-'}</td>
                <td>${new Date(application.appliedAt).toLocaleString()}</td>
                <td>
                  <button data-action="shortlist" data-app-id="${application.id}" class="${application.shortlisted ? '' : 'secondary'}">${application.shortlisted ? 'Shortlisted' : 'Shortlist'}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function wireApplicantsBlock(container, user, jobId) {
    container.querySelectorAll('[data-action="shortlist"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = btn.getAttribute('data-app-id');
        if (!appId) return;
        toggleShortlist(appId);
        const refreshed = getApplicants(jobId);
        container.innerHTML = renderApplicantsBlock(jobId, refreshed);
        wireApplicantsBlock(container, user, jobId);
      });
    });

    const applyFilterBtn = container.querySelector('[data-role="app-apply-filter"]');
    applyFilterBtn.addEventListener('click', () => {
      const kw = container.querySelector('[data-role="app-kw"]').value;
      const skillsInput = container.querySelector('[data-role="app-skills"]').value;
      const applicants = getApplicants(jobId);
      const filtered = filterApplicants(applicants, { keyword: kw, skills: parseSkills(skillsInput) });
      container.innerHTML = renderApplicantsBlock(jobId, filtered);
      wireApplicantsBlock(container, user, jobId);
    });
  }

  // Admin users table
  function renderUsersTable() {
    const users = readUsers().filter(u => u.role !== ROLE.admin);
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.id}</td>
        <td>${user.role}</td>
        <td>${user.role === ROLE.student ? user.name : (user.company || user.name)}</td>
        <td>${user.email}</td>
        <td>${user.active ? 'Active' : 'Inactive'}</td>
        <td>
          <button data-action="toggle" data-id="${user.id}" class="secondary">${user.active ? 'Deactivate' : 'Activate'}</button>
          <button data-action="delete" data-id="${user.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function handleAdminAction(evt) {
    const target = evt.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute('data-action');
    const id = target.getAttribute('data-id');
    if (!action || !id) return;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return;
    if (action === 'toggle') {
      users[idx].active = !users[idx].active;
    } else if (action === 'delete') {
      users.splice(idx, 1);
    }
    writeUsers(users);
    renderUsersTable();
  }

  // Admin analytics
  function renderAnalyticsCards() {
    const users = readUsers();
    const jobs = readJobs();
    const apps = readApplications();
    const students = users.filter(u => u.role === ROLE.student).length;
    const recruiters = users.filter(u => u.role === ROLE.recruiter).length;
    const jobsApproved = jobs.filter(j => j.status === 'approved').length;
    const jobsPending = jobs.filter(j => j.status !== 'approved').length;
    const shortlisted = apps.filter(a => a.shortlisted).length;
    const container = document.getElementById('analyticsCards');
    if (!container) return;
    container.innerHTML = `
      <div class="card">
        <h4>Total Users</h4>
        <p class="muted">Students / Recruiters</p>
        <strong>${students + recruiters}</strong>
        <p class="muted">${students} / ${recruiters}</p>
      </div>
      <div class="card">
        <h4>Jobs</h4>
        <p class="muted">Approved / Pending</p>
        <strong>${jobsApproved + jobsPending}</strong>
        <p class="muted">${jobsApproved} / ${jobsPending}</p>
      </div>
      <div class="card">
        <h4>Applications</h4>
        <p class="muted">Total / Shortlisted</p>
        <strong>${apps.length}</strong>
        <p class="muted">${shortlisted}</p>
      </div>
      <div class="card" style="grid-column: 1 / -1;">
        <h4>Applications per Job</h4>
        <canvas id="analyticsChart" width="800" height="240"></canvas>
      </div>
    `;
    drawAnalyticsChart(apps, jobs);
  }

  function drawAnalyticsChart(apps, jobs) {
    const counts = new Map();
    apps.forEach(a => { counts.set(a.jobId, (counts.get(a.jobId) || 0) + 1); });
    const jobIdToJob = new Map(jobs.map(j => [j.id, j]));
    const data = Array.from(counts.entries()).map(([jobId, count]) => ({
      label: (jobIdToJob.get(jobId)?.title || 'Job'),
      count
    })).sort((a, b) => b.count - a.count).slice(0, 6);

    const canvas = document.getElementById('analyticsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const padding = 40;
    const barWidth = 60;
    const gap = 30;
    const max = Math.max(1, ...data.map(d => d.count));
    const chartHeight = canvas.height - padding * 2;
    const startX = padding;

    // axes
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // bars
    data.forEach((d, i) => {
      const x = startX + i * (barWidth + gap);
      const h = (d.count / max) * chartHeight;
      const y = canvas.height - padding - h;
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(x, y, barWidth, h);
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px sans-serif';
      ctx.fillText(String(d.count), x + barWidth / 2 - 6, y - 6);
      const label = d.label.length > 12 ? d.label.slice(0, 12) + '…' : d.label;
      ctx.save();
      ctx.translate(x + barWidth / 2, canvas.height - padding + 14);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
  }

  // Admin job approvals
  function setJobStatus(jobId, status) {
    const jobs = readJobs();
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx !== -1) {
      jobs[idx].status = status;
      writeJobs(jobs);
    }
  }

  function renderJobsApprovalTable() {
    const jobs = readJobs();
    const tbody = document.querySelector('#jobsApprovalTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    jobs.forEach(job => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${job.title}</td>
        <td>${job.company}</td>
        <td>${job.type}</td>
        <td>${job.status || 'pending'}</td>
        <td>
          <button data-job-id="${job.id}" data-job-action="approve">Approve</button>
          <button class="secondary" data-job-id="${job.id}" data-job-action="reject">Reject</button>
          <button class="secondary" data-job-id="${job.id}" data-job-action="delete">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    // Delegate actions
    tbody.onclick = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute('data-job-action');
      const jobId = target.getAttribute('data-job-id');
      if (!action || !jobId) return;
      if (action === 'approve') setJobStatus(jobId, 'approved');
      else if (action === 'reject') setJobStatus(jobId, 'rejected');
      else if (action === 'delete') deleteJob(jobId);
      renderJobsApprovalTable();
      renderAnalyticsCards();
    };
  }

  // Wire tabs
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  // Hero CTA: jump to tabs
  document.querySelectorAll('[data-tab-jump]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = el.getAttribute('data-tab-jump');
      if (tab) setActiveTab(tab);
      const section = document.getElementById('authSection');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Wire forms
  const studentSignupForm = document.getElementById('studentSignupForm');
  studentSignupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    try {
      const user = signup({
        role: ROLE.student,
        profile: {
          name: formData.get('name').toString(),
          email: formData.get('email').toString(),
          password: formData.get('password').toString()
        }
      });
      alert('Student account created. You can now log in.');
      form.reset();
    } catch (err) {
      alert(err.message || 'Signup failed');
    }
  });

  const studentLoginForm = document.getElementById('studentLoginForm');
  studentLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const user = login({ email: fd.get('email').toString(), password: fd.get('password').toString(), role: ROLE.student });
      routeToDashboard(user);
    } catch (err) { alert(err.message || 'Login failed'); }
  });

  const recruiterSignupForm = document.getElementById('recruiterSignupForm');
  recruiterSignupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      signup({
        role: ROLE.recruiter,
        profile: {
          company: fd.get('company').toString(),
          email: fd.get('email').toString(),
          password: fd.get('password').toString()
        }
      });
      alert('Recruiter account created. You can now log in.');
      e.target.reset();
    } catch (err) { alert(err.message || 'Signup failed'); }
  });

  const recruiterLoginForm = document.getElementById('recruiterLoginForm');
  recruiterLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const user = login({ email: fd.get('email').toString(), password: fd.get('password').toString(), role: ROLE.recruiter });
      routeToDashboard(user);
    } catch (err) { alert(err.message || 'Login failed'); }
  });

  const adminLoginForm = document.getElementById('adminLoginForm');
  adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const user = login({ email: fd.get('email').toString(), password: fd.get('password').toString(), role: ROLE.admin });
      routeToAdmin(user);
    } catch (err) { alert(err.message || 'Login failed'); }
  });

  // Wire logout buttons
  document.getElementById('logoutButton').addEventListener('click', logout);
  document.getElementById('adminLogoutButton').addEventListener('click', logout);

  // Admin actions
  document.getElementById('usersTable').addEventListener('click', handleAdminAction);

  // Init
  seedDefaultAdmin();
  seedSampleJobs();
  const current = getCurrentUser();
  if (current) {
    if (current.role === ROLE.admin) routeToAdmin(current);
    else routeToDashboard(current);
  } else {
    routeToAuth();
  }
});

