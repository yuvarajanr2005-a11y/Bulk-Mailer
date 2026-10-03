import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

async function apiRequest(path, options) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'Cannot reach the mail server. Start the backend locally, or set VITE_API_URL to your deployed backend URL ending in /api.',
        { cause: error },
      )
    }
    throw error
  }

  const responseText = await response.text()
  let data = null
  if (responseText.trim()) {
    try {
      data = JSON.parse(responseText)
    } catch (error) {
      if (response.ok) {
        throw new Error(`The mail server returned an invalid response (HTTP ${response.status}).`, {
          cause: error,
        })
      }
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || `The mail server returned HTTP ${response.status}.`)
  }
  if (data === null) throw new Error('The mail server returned an empty response.')
  return data
}

function Icon({ name, size = 20 }) {
  const paths = {
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    inbox: <><path d="M4 4h16v16H4z" /><path d="M4 13h4l2 3h4l2-3h4" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    arrow: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    alert: <><path d="M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
    close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

function App() {
  const [page, setPage] = useState('compose')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [recipients, setRecipients] = useState('')
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null)

  const recipientCount = useMemo(
    () => recipients.split(/[\s,;]+/).filter(Boolean).length,
    [recipients],
  )

  async function loadHistory() {
    try {
      const data = await apiRequest('/emails')
      setHistory(data.emails)
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setLoadingHistory(false)
    }
  }

  function openHistory() {
    setPage('history')
    setLoadingHistory(true)
    loadHistory()
  }

  useEffect(() => {
    let active = true
    apiRequest('/emails')
      .then((data) => {
        if (active) setHistory(data.emails)
      })
      .catch((error) => {
        if (active) setNotice({ type: 'error', text: error.message })
      })
      .finally(() => {
        if (active) setLoadingHistory(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setNotice(null)
    setSending(true)

    try {
      const data = await apiRequest('/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, recipients }),
      })

      setNotice({
        type: data.status === 'sent' ? 'success' : 'warning',
        text: data.message,
      })
      setSubject('')
      setBody('')
      setRecipients('')
      setLoadingHistory(true)
      await loadHistory()
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setPage('compose')} aria-label="Postmail home">
          <span className="brand-mark"><Icon name="send" size={19} /></span>
          <span>postmail<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="navigation" aria-label="Main navigation">
          <button
            className={`nav-link ${page === 'compose' ? 'active' : ''}`}
            onClick={() => setPage('compose')}
          >
            <Icon name="plus" size={18} />
            <span>Compose</span>
          </button>
          <button
            className={`nav-link ${page === 'history' ? 'active' : ''}`}
            onClick={openHistory}
          >
            <Icon name="inbox" size={18} />
            <span>Sent history</span>
            {history.length > 0 && <span className="nav-count">{history.length}</span>}
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-spark">✳</span>
            <p>Thoughtful emails, delivered at scale.</p>
          </div>
          <div className="profile">
            <div className="avatar">Y</div>
            <div className="profile-copy">
              <strong>Your workspace</strong>
              <span>Mail administrator</span>
            </div>
            <span className="online-dot" aria-label="Online" />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{page === 'compose' ? 'New campaign' : 'Sent history'}</strong></div>
          <div className="topbar-right"><span className="system-status"><span /> All systems operational</span></div>
        </header>

        <div className="content">
          {page === 'compose' ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR OUTBOX, REIMAGINED</div>
                  <h1>Write something<br className="mobile-break" /> worth opening<span className="heading-period">.</span></h1>
                  <p className="heading-subtitle">One thoughtful message. Everyone who needs to hear it.</p>
                </div>
                <div className="heading-decoration" aria-hidden="true">
                  <span className="decoration-ring ring-one" />
                  <span className="decoration-ring ring-two" />
                  <span className="decoration-star">✳</span>
                </div>
              </div>

              {notice && (
                <div className={`notice notice-${notice.type}`} role="status">
                  <Icon name={notice.type === 'error' ? 'alert' : 'check'} size={18} />
                  <span>{notice.text}</span>
                  <button aria-label="Dismiss message" onClick={() => setNotice(null)}><Icon name="close" size={16} /></button>
                </div>
              )}

              <div className="composer-layout">
                <form className="composer-card" onSubmit={handleSubmit}>
                  <div className="card-topline">
                    <span className="card-overline">NEW MESSAGE</span>
                    <span className="draft-indicator"><span /> READY TO SEND</span>
                  </div>

                  <div className="field-group">
                    <label htmlFor="recipients">TO <span className="label-hint">· Recipients</span></label>
                    <textarea
                      id="recipients"
                      className="recipient-input"
                      value={recipients}
                      onChange={(event) => setRecipients(event.target.value)}
                      placeholder="alex@example.com, sam@example.com"
                      rows="3"
                      required
                    />
                    <div className="field-foot">
                      <span>Separate email addresses with commas or new lines</span>
                      <span className="recipient-count">{recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}</span>
                    </div>
                  </div>

                  <div className="field-group subject-group">
                    <label htmlFor="subject">SUBJECT <span className="label-hint">· Give it a good one</span></label>
                    <input
                      id="subject"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="A little something for your inbox"
                      maxLength="200"
                      required
                    />
                    <span className="character-count">{subject.length}/200</span>
                  </div>

                  <div className="field-group body-group">
                    <label htmlFor="body">MESSAGE <span className="label-hint">· Plain text</span></label>
                    <textarea
                      id="body"
                      className="body-input"
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder={'Hi there,\n\nWrite your message here...'}
                      rows="9"
                      maxLength="20000"
                      required
                    />
                    <span className="character-count body-count">{body.length.toLocaleString()} / 20,000</span>
                  </div>

                  <div className="composer-footer">
                    <span className="privacy-note"><span className="privacy-dot" /> Sent privately to each recipient</span>
                    <button type="submit" className="send-button" disabled={sending}>
                      <span>{sending ? 'Sending...' : 'Send campaign'}</span>
                      <Icon name="arrow" size={17} />
                    </button>
                  </div>
                </form>

                <aside className="side-column">
                  <div className="send-preview">
                    <div className="preview-top"><span className="preview-kicker">CAMPAIGN PREVIEW</span><span className="preview-live"><i /> LIVE</span></div>
                    <div className="preview-envelope"><Icon name="send" size={23} /></div>
                    <h2>{subject || 'Your subject line'}</h2>
                    <p>{body || 'Your message will show up here as you write. Keep it clear, kind, and worth their time.'}</p>
                    <div className="preview-divider" />
                    <div className="preview-to"><span>DELIVERING TO</span><strong>{recipientCount || '—'} <span>{recipientCount === 1 ? 'person' : 'people'}</span></strong></div>
                  </div>

                  <div className="tip-card">
                    <span className="tip-icon">✳</span>
                    <div><strong>A small note</strong><p>Every email is sent individually, so your recipients never see each other’s addresses.</p></div>
                  </div>

                  <button className="history-link" onClick={openHistory}>
                    <span className="history-icon"><Icon name="clock" size={17} /></span>
                    <span><strong>View sent history</strong><small>Keep track of your campaigns</small></span>
                    <Icon name="arrow" size={16} />
                  </button>
                </aside>
              </div>
            </>
          ) : (
            <section className="history-page">
              <div className="page-heading history-heading">
                <div>
                  <div className="eyebrow">A LOOK BACK</div>
                  <h1>Your sent<br className="mobile-break" /> campaigns<span className="heading-period">.</span></h1>
                  <p className="heading-subtitle">Every message you’ve put out into the world.</p>
                </div>
                <button className="new-campaign-button" onClick={() => { setPage('compose'); setNotice(null) }}><Icon name="plus" size={18} /> New campaign</button>
              </div>

              {notice && (
                <div className={`notice notice-${notice.type}`} role="status">
                  <Icon name={notice.type === 'error' ? 'alert' : 'check'} size={18} />
                  <span>{notice.text}</span>
                  <button aria-label="Dismiss message" onClick={() => setNotice(null)}><Icon name="close" size={16} /></button>
                </div>
              )}

              <div className="history-card">
                <div className="history-card-head"><div><span className="card-overline">CAMPAIGN LOG</span><h2>All messages</h2></div><span className="history-total">{history.length} {history.length === 1 ? 'campaign' : 'campaigns'}</span></div>
                {loadingHistory ? (
                  <div className="history-empty"><span className="loading-spinner" /><p>Loading your campaigns...</p></div>
                ) : history.length === 0 ? (
                  <div className="history-empty"><div className="empty-icon"><Icon name="inbox" size={22} /></div><h3>Nothing sent just yet</h3><p>Your sent campaigns will find a home here.</p><button className="empty-cta" onClick={() => setPage('compose')}><Icon name="plus" size={16} /> Write your first campaign</button></div>
                ) : (
                  <div className="history-list">
                    {history.map((email) => (
                      <article className="history-row" key={email._id}>
                        <div className={`history-status ${email.status}`}><Icon name={email.status === 'sent' ? 'check' : email.status === 'partial' ? 'alert' : 'close'} size={17} /></div>
                        <div className="history-message"><strong>{email.subject}</strong><span>{email.sentCount} of {email.recipients.length} delivered · {formatDate(email.createdAt)}</span></div>
                        <span className={`status-pill ${email.status}`}>{email.status}</span>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <footer className="footer"><span>Made for the messages that matter.</span><span>POSTMAIL <i>✳</i> BULK MAIL</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
