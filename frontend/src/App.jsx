import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, setCsrfToken } from './api.js'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const blankRehearsal = () => ({
  title: '',
  rehearsal_date: today(),
  start_time: '18:00',
  end_time: '20:00',
  location: '',
  group_id: '',
})
const blankUser = () => ({ name: '', email: '', role: 'member', password: '', group_ids: [] })
const blankGroup = () => ({ group_name: '', description: '' })
const dateLabel = (value, options = { weekday: 'short', month: 'short', day: 'numeric' }) => {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', options).format(date)
}
const timeLabel = (value) => {
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date)
}

function Brand({ compact = false }) {
  return (
    <a className={`brand${compact ? ' brand-compact' : ''}`} href="/" aria-label="EntabladoTanaw home">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span className="brand-name">entablado<span>tanaw</span></span>
    </a>
  )
}

function Login({ setupNeeded, onSuccess }) {
  const [setup, setSetup] = useState({ name: '', email: '', password: '' })
  const [login, setLogin] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = setupNeeded
        ? await api.post('auth.php', { ...setup, action: 'setup' })
        : await api.post('auth.php', { ...login, action: 'login' })
      setCsrfToken(result.csrf_token)
      onSuccess(result.user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration decoration-one" />
      <div className="auth-decoration decoration-two" />
      <header className="auth-header"><Brand /><span className="auth-kicker">THEATER, IN GOOD COMPANY</span></header>
      <section className="auth-layout">
        <div className="auth-intro">
          <div className="eyebrow"><span /> THE SHOW STARTS HERE</div>
          <h1>Make room<br />for <em>the magic.</em></h1>
          <p>One shared stage, one thoughtful schedule. Bring your cast and crew together, one rehearsal at a time.</p>
          <div className="auth-note"><span className="note-star">✳</span><span>Every great performance<br />begins with a gathering.</span></div>
        </div>
        <div className="auth-card">
          <div className="auth-card-top"><span className="auth-icon">✦</span><span className="secure-label"><span /> SECURE MEMBER PORTAL</span></div>
          <h2>{setupNeeded ? 'Set up your theater' : 'Welcome back'}</h2>
          <p className="auth-subtitle">{setupNeeded ? 'Create the first administrator account to get started.' : 'Sign in to find your next time on stage.'}</p>
          <form onSubmit={submit} className="auth-form">
            {setupNeeded && <label>Your name<input autoComplete="name" maxLength={120} required value={setup.name} onChange={(e) => setSetup({ ...setup, name: e.target.value })} placeholder="e.g. Alex Rivera" /></label>}
            <label>Email address<input type="email" autoComplete="email" maxLength={190} required value={setupNeeded ? setup.email : login.email} onChange={(e) => setupNeeded ? setSetup({ ...setup, email: e.target.value }) : setLogin({ ...login, email: e.target.value })} placeholder="you@theater.com" /></label>
            <label>Password<input type="password" autoComplete={setupNeeded ? 'new-password' : 'current-password'} minLength={setupNeeded ? 10 : undefined} maxLength={72} required value={setupNeeded ? setup.password : login.password} onChange={(e) => setupNeeded ? setSetup({ ...setup, password: e.target.value }) : setLogin({ ...login, password: e.target.value })} placeholder={setupNeeded ? '10–72 characters' : 'Enter your password'} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" disabled={submitting}>{submitting ? 'Please wait…' : setupNeeded ? 'Create administrator account' : 'Sign in'}<span aria-hidden="true">↗</span></button>
          </form>
          <p className="auth-footnote"><span>♧</span> Your account is managed by your theater administrator.</p>
        </div>
      </section>
      <footer className="auth-footer"><span>ENTABLADOTANAW</span><span>FOR THE LOVE OF THE STAGE</span></footer>
    </main>
  )
}

function Modal({ title, eyebrow, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div><span className="modal-eyebrow">{eyebrow}</span><h2 id="modal-title">{title}</h2></div>
          <button className="icon-button close-button" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>
        {children}
      </section>
    </div>
  )
}

function ScheduleForm({ initial, groups, onSave, onClose, busy, error }) {
  const [form, setForm] = useState(initial)
  return (
    <form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...form, group_id: Number(form.group_id) }) }}>
      <label>Rehearsal title<input required maxLength={180} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Act II — blocking" /></label>
      <div className="form-grid">
        <label>Date<input type="date" required value={form.rehearsal_date} onChange={(e) => setForm({ ...form, rehearsal_date: e.target.value })} /></label>
        <label>Theater group<select required value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}><option value="">Choose a group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.group_name}</option>)}</select></label>
        <label>Start time<input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
        <label>End time<input type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
      </div>
      <label>Location<input required maxLength={180} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Studio, room, or venue" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="quiet-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy || !groups.length}>{busy ? 'Saving…' : 'Save rehearsal'}<span aria-hidden="true">↗</span></button></div>
      {!groups.length && <p className="inline-hint">Create a theater group before scheduling a rehearsal.</p>}
    </form>
  )
}

function UserForm({ initial, groups, onSave, onClose, busy, error }) {
  const [form, setForm] = useState(initial)
  function toggleGroup(id) {
    const selected = form.group_ids.includes(id)
    setForm({ ...form, group_ids: selected ? form.group_ids.filter((groupId) => groupId !== id) : [...form.group_ids, id] })
  }
  return (
    <form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSave(form) }}>
      <label>Full name<input required maxLength={120} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Member name" /></label>
      <label>Email address<input required type="email" maxLength={190} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="member@theater.com" /></label>
      <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="member">Theater member</option><option value="admin">Administrator</option></select></label>
      <label>Password<input type="password" minLength={10} maxLength={72} required={!initial.id} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={initial.id ? 'Leave blank to keep current' : '10–72 characters'} /></label>
      <fieldset className="group-picker"><legend>Assigned theater groups</legend>{groups.length ? groups.map((group) => <label className="check-option" key={group.id}><input type="checkbox" checked={form.group_ids.includes(group.id)} onChange={() => toggleGroup(group.id)} /><span>{group.group_name}</span></label>) : <p className="inline-hint">Create a group to assign schedules.</p>}</fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="quiet-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : initial.id ? 'Save changes' : 'Create account'}<span aria-hidden="true">↗</span></button></div>
    </form>
  )
}

function GroupForm({ initial, onSave, onClose, busy, error }) {
  const [form, setForm] = useState(initial)
  return (
    <form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSave(form) }}>
      <label>Group name<input required maxLength={120} value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} placeholder="e.g. Mainstage Company" /></label>
      <label>Description<textarea maxLength={500} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A little about this ensemble…" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="quiet-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : initial.id ? 'Save changes' : 'Create group'}<span aria-hidden="true">↗</span></button></div>
    </form>
  )
}

export default function App() {
  const [session, setSession] = useState({ loading: true, user: null, setupNeeded: false })
  const [view, setView] = useState('schedule')
  const [data, setData] = useState({ rehearsals: [], groups: [], users: [] })
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [modalError, setModalError] = useState('')
  const [dateFilter, setDateFilter] = useState('upcoming')

  const loadData = useCallback(async (user) => {
    setLoadingData(true)
    setError('')
    try {
      const [rehearsals, groups, users] = await Promise.all([
        api.get('rehearsals.php'),
        api.get('groups.php'),
        user.role === 'admin' ? api.get('users.php') : Promise.resolve([]),
      ])
      setData({ rehearsals, groups, users })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    api.get('auth.php').then((result) => {
      if (!active) return
      setCsrfToken(result.csrf_token)
      setSession({ loading: false, user: result.user, setupNeeded: result.setup_needed })
      if (result.user) loadData(result.user)
    }).catch((requestError) => {
      if (active) {
        setError(requestError.message)
        setSession({ loading: false, user: null, setupNeeded: false })
      }
    })
    return () => { active = false }
  }, [loadData])

  const upcoming = useMemo(() => data.rehearsals.filter((rehearsal) => rehearsal.rehearsal_date >= today()), [data.rehearsals])
  const visibleRehearsals = useMemo(() => {
    const list = dateFilter === 'all' ? data.rehearsals : upcoming
    return [...list].sort((a, b) => `${a.rehearsal_date}T${a.start_time}`.localeCompare(`${b.rehearsal_date}T${b.start_time}`))
  }, [data.rehearsals, dateFilter, upcoming])

  async function signOut() {
    try {
      await api.del('auth.php')
      setCsrfToken('')
      setData({ rehearsals: [], groups: [], users: [] })
      setSession({ loading: false, user: null, setupNeeded: false })
    } catch (requestError) { setError(requestError.message) }
  }

  function openModal(value) {
    setModalError('')
    setModal(value)
  }

  async function saveRehearsal(form) {
    setBusy(true); setModalError('')
    try {
      if (modal.id) await api.put(`rehearsals.php?id=${modal.id}`, form)
      else await api.post('rehearsals.php', form)
      setModal(null)
      await loadData(session.user)
    } catch (requestError) { setModalError(requestError.message) }
    finally { setBusy(false) }
  }

  async function deleteRehearsal(rehearsal) {
    if (!window.confirm(`Delete “${rehearsal.title}”? This cannot be undone.`)) return
    try { await api.del(`rehearsals.php?id=${rehearsal.id}`); await loadData(session.user) }
    catch (requestError) { setError(requestError.message) }
  }

  async function saveUser(form) {
    setBusy(true); setModalError('')
    const payload = { ...form, group_ids: form.group_ids.map(Number) }
    try {
      if (modal.id) await api.put(`users.php?id=${modal.id}`, payload)
      else await api.post('users.php', payload)
      setModal(null)
      await loadData(session.user)
    } catch (requestError) { setModalError(requestError.message) }
    finally { setBusy(false) }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Remove ${user.name}'s account?`)) return
    try { await api.del(`users.php?id=${user.id}`); await loadData(session.user) }
    catch (requestError) { setError(requestError.message) }
  }

  async function saveGroup(form) {
    setBusy(true); setModalError('')
    try {
      if (modal.id) await api.put(`groups.php?id=${modal.id}`, form)
      else await api.post('groups.php', form)
      setModal(null)
      await loadData(session.user)
    } catch (requestError) { setModalError(requestError.message) }
    finally { setBusy(false) }
  }

  async function deleteGroup(group) {
    if (!window.confirm(`Delete the group “${group.group_name}”?`)) return
    try { await api.del(`groups.php?id=${group.id}`); await loadData(session.user) }
    catch (requestError) { setError(requestError.message) }
  }

  if (session.loading) return <main className="loading-screen"><Brand /><span className="loading-orbit" /><p>Finding the wings…</p></main>
  if (!session.user) return <Login setupNeeded={session.setupNeeded} onSuccess={(user) => { setSession({ loading: false, user, setupNeeded: false }); loadData(user) }} />

  const isAdmin = session.user.role === 'admin'
  const navItems = [{ id: 'schedule', label: 'Rehearsals', icon: '▦' }, ...(isAdmin ? [{ id: 'members', label: 'Members', icon: '♧' }, { id: 'groups', label: 'Theater groups', icon: '✳' }] : [])]
  const pageTitles = { schedule: isAdmin ? 'Rehearsals' : 'My rehearsals', members: 'People of the theater', groups: 'Our theater groups' }
  const pageDescriptions = { schedule: isAdmin ? 'A little planning makes room for a lot of magic.' : 'Your next gathering, your next step toward opening night.', members: 'The people who bring every story to life.', groups: 'The ensembles, crews, and creative homes on our stage.' }
  const dateNow = new Date()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><Brand /></div>
        <div className="workspace-label">YOUR THEATER</div>
        <div className="workspace-card"><span className="workspace-icon">✺</span><span><strong>EntabladoTanaw</strong><small>Rehearsal space</small></span><span className="workspace-chevron">⌄</span></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.id} className={`nav-item${view === item.id ? ' active' : ''}`} onClick={() => { setView(item.id); setError('') }}><span className="nav-icon">{item.icon}</span>{item.label}{view === item.id && <span className="nav-active-mark" />}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span>✦</span><p>Great performances<br />start with showing up.</p><small>— THE HOUSE NOTE</small></div>
          <div className="profile-row"><span className="avatar">{session.user.name.slice(0, 1).toUpperCase()}</span><span className="profile-info"><strong>{session.user.name}</strong><small>{isAdmin ? 'Administrator' : 'Theater member'}</small></span><button className="icon-button signout-button" onClick={signOut} title="Sign out" aria-label="Sign out">↗</button></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header"><Brand compact /><button className="mobile-signout" onClick={signOut}>Sign out ↗</button></header>
        <div className="content-inner">
          <div className="page-topline"><span>THEATER / {view === 'schedule' ? 'SCHEDULE' : view === 'members' ? 'PEOPLE' : 'GROUPS'}</span><span>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(dateNow)}</span></div>
          <section className="page-heading">
            <div><div className="page-overline"><span /> {isAdmin ? 'A WELL-REHEARSED PLAN' : 'YOUR TIME ON STAGE'}</div><h1>{pageTitles[view]}</h1><p>{pageDescriptions[view]}</p></div>
            {isAdmin && view === 'schedule' && <button className="primary-button heading-action" onClick={() => openModal({ type: 'rehearsal', initial: blankRehearsal() })}><span className="plus-mark">＋</span> New rehearsal</button>}
            {isAdmin && view === 'members' && <button className="primary-button heading-action" onClick={() => openModal({ type: 'user', initial: blankUser() })}><span className="plus-mark">＋</span> Add a member</button>}
            {isAdmin && view === 'groups' && <button className="primary-button heading-action" onClick={() => openModal({ type: 'group', initial: blankGroup() })}><span className="plus-mark">＋</span> New group</button>}
          </section>

          {error && <p className="dashboard-error" role="alert"><span>!</span>{error}<button onClick={() => loadData(session.user)}>Try again</button></p>}

          {view === 'schedule' && (
            <>
              <section className="summary-grid" aria-label="Schedule summary">
                <article className="summary-card"><span className="summary-symbol symbol-lilac">▦</span><div><span className="summary-label">UPCOMING</span><strong>{upcoming.length.toString().padStart(2, '0')}</strong><small>scheduled gatherings</small></div><span className="summary-decoration">01</span></article>
                <article className="summary-card"><span className="summary-symbol symbol-peach">✳</span><div><span className="summary-label">ON STAGE</span><strong>{data.groups.length.toString().padStart(2, '0')}</strong><small>theater {data.groups.length === 1 ? 'group' : 'groups'}</small></div><span className="summary-decoration">02</span></article>
                <article className="summary-card"><span className="summary-symbol symbol-green">♧</span><div><span className="summary-label">NEXT UP</span><strong className="next-up-value">{upcoming[0] ? dateLabel(upcoming[0].rehearsal_date, { month: 'short', day: 'numeric' }) : '—'}</strong><small>{upcoming[0]?.title || 'waiting in the wings'}</small></div><span className="summary-decoration">03</span></article>
              </section>
              <section className="schedule-panel">
                <div className="panel-heading"><div><h2>{dateFilter === 'all' ? 'All rehearsals' : 'Coming up'}</h2><p>{isAdmin ? 'The rhythm of your theater, all in one place.' : 'Only the rehearsals assigned to your groups.'}</p></div><div className="filter-tabs"><button className={dateFilter === 'upcoming' ? 'selected' : ''} onClick={() => setDateFilter('upcoming')}>Upcoming</button><button className={dateFilter === 'all' ? 'selected' : ''} onClick={() => setDateFilter('all')}>All dates</button></div></div>
                {loadingData ? <div className="empty-state"><span className="empty-icon">✳</span><strong>Setting the stage…</strong><p>Gathering the rehearsal schedule.</p></div> : visibleRehearsals.length ? <div className="rehearsal-list">{visibleRehearsals.map((rehearsal) => (
                  <article className="rehearsal-row" key={rehearsal.id}>
                    <div className="date-tile"><span>{dateLabel(rehearsal.rehearsal_date, { month: 'short' }).toUpperCase()}</span><strong>{new Date(`${rehearsal.rehearsal_date}T12:00:00`).getDate().toString().padStart(2, '0')}</strong><small>{dateLabel(rehearsal.rehearsal_date, { weekday: 'short' }).toUpperCase()}</small></div>
                    <div className="rehearsal-main"><h3>{rehearsal.title}</h3><span className="group-pill"><span />{rehearsal.group_name}</span></div>
                    <div className="rehearsal-details"><span><span className="detail-icon">◷</span>{timeLabel(rehearsal.start_time)} – {timeLabel(rehearsal.end_time)}</span><span><span className="detail-icon">⌖</span>{rehearsal.location}</span></div>
                    {isAdmin && <div className="row-actions"><button className="icon-button" title="Edit rehearsal" aria-label={`Edit ${rehearsal.title}`} onClick={() => openModal({ type: 'rehearsal', id: rehearsal.id, initial: { ...rehearsal, group_id: String(rehearsal.group_id) } })}>✎</button><button className="icon-button delete-icon" title="Delete rehearsal" aria-label={`Delete ${rehearsal.title}`} onClick={() => deleteRehearsal(rehearsal)}>⌫</button></div>}
                  </article>
                ))}</div> : <div className="empty-state"><span className="empty-icon">✳</span><strong>{dateFilter === 'all' ? 'The stage is clear.' : 'Nothing on the calendar just yet.'}</strong><p>{isAdmin ? 'Add a rehearsal and bring everyone together.' : 'When your group has a rehearsal, it will appear here.'}</p>{isAdmin && <button className="quiet-button" onClick={() => openModal({ type: 'rehearsal', initial: blankRehearsal() })}>Schedule a rehearsal ↗</button>}</div>}
              </section>
              <div className="dashboard-footnote"><span>✦</span> A schedule is a promise to make something wonderful together.</div>
            </>
          )}

          {view === 'members' && <section className="management-panel"><div className="panel-heading"><div><h2>The company</h2><p>Manage accounts, roles, and group assignments.</p></div><span className="count-badge">{data.users.length} {data.users.length === 1 ? 'person' : 'people'}</span></div>{data.users.length ? <div className="management-list">{data.users.map((user) => <article className="management-row" key={user.id}><span className="avatar large-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div className="management-main"><h3>{user.name}</h3><p>{user.email}</p><div className="user-groups">{user.groups.length ? user.groups.map((group) => <span className="mini-pill" key={group.id}>{group.group_name}</span>) : <span className="unassigned">No group assigned</span>}</div></div><span className={`role-badge ${user.role}`}>{user.role === 'admin' ? 'Administrator' : 'Member'}</span><div className="row-actions"><button className="icon-button" title="Edit account" aria-label={`Edit ${user.name}`} onClick={() => openModal({ type: 'user', id: user.id, initial: { ...user, password: '', group_ids: user.groups.map((group) => group.id) } })}>✎</button><button className="icon-button delete-icon" title="Remove account" aria-label={`Remove ${user.name}`} onClick={() => deleteUser(user)}>⌫</button></div></article>)}</div> : <div className="empty-state"><span className="empty-icon">♧</span><strong>No accounts yet</strong><p>Add theater members so they can view assigned rehearsals.</p></div>}</section>}

          {view === 'groups' && <section className="group-card-grid">{data.groups.length ? data.groups.map((group, index) => <article className="theater-group-card" key={group.id}><div className={`group-card-art art-${index % 3}`}><span>{['✳', '✷', '✦'][index % 3]}</span><small>ENSEMBLE {String(index + 1).padStart(2, '0')}</small></div><div className="group-card-content"><div className="group-card-heading"><h2>{group.group_name}</h2><div className="row-actions"><button className="icon-button" title="Edit group" aria-label={`Edit ${group.group_name}`} onClick={() => openModal({ type: 'group', id: group.id, initial: { group_name: group.group_name, description: group.description } })}>✎</button><button className="icon-button delete-icon" title="Delete group" aria-label={`Delete ${group.group_name}`} onClick={() => deleteGroup(group)}>⌫</button></div></div><p>{group.description || 'A new creative home is taking shape.'}</p><div className="group-card-footer"><span>▦ &nbsp;{group.rehearsal_count ?? 0} rehearsals</span><span className="group-card-link">THEATER GROUP</span></div></div></article>) : <div className="empty-state groups-empty"><span className="empty-icon">✳</span><strong>No groups yet</strong><p>Create a theater group before adding members and rehearsals.</p><button className="primary-button" onClick={() => openModal({ type: 'group', initial: blankGroup() })}>Create your first group ↗</button></div>}</section>}

          <footer className="main-footer"><span>ENTABLADOTANAW <i>✦</i></span><span>MADE FOR THE MOMENTS BEFORE THE CURTAIN RISES</span></footer>
        </div>
      </main>

      {modal?.type === 'rehearsal' && <Modal title={modal.id ? 'Shape the schedule' : 'Gather the company'} eyebrow={modal.id ? 'UPDATE REHEARSAL' : 'ADD TO THE CALENDAR'} onClose={() => setModal(null)}><ScheduleForm initial={modal.initial} groups={data.groups} onSave={saveRehearsal} onClose={() => setModal(null)} busy={busy} error={modalError} /></Modal>}
      {modal?.type === 'user' && <Modal title={modal.id ? 'Update their details' : 'Welcome someone in'} eyebrow={modal.id ? 'EDIT ACCOUNT' : 'ADD TO THE COMPANY'} onClose={() => setModal(null)}><UserForm initial={modal.initial} groups={data.groups} onSave={saveUser} onClose={() => setModal(null)} busy={busy} error={modalError} /></Modal>}
      {modal?.type === 'group' && <Modal title={modal.id ? 'Make it feel like home' : 'Create a new home'} eyebrow={modal.id ? 'EDIT THEATER GROUP' : 'GROW YOUR THEATER'} onClose={() => setModal(null)}><GroupForm initial={modal.initial} onSave={saveGroup} onClose={() => setModal(null)} busy={busy} error={modalError} /></Modal>}
    </div>
  )
}
