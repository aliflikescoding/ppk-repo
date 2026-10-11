import PageHeading from '../components/PageHeading.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { readUsers, updateUser } from '../api/index.js'
import { roles } from '../auth/auth.js'

export default function ApproveUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [approvingId, setApprovingId] = useState(null)
  const [approvalError, setApprovalError] = useState(null)
  const approvalPending = useRef(false)

  useEffect(() => {
    let active = true

    async function loadPendingUsers() {
      try {
        const pending = []
        for (let page = 1; active; page += 1) {
          const batch = await readUsers(page, 100)
          if (!active) return
          pending.push(...batch.filter((user) => user.isActive === false))
          if (batch.length < 100) break
        }
        if (active) setUsers(pending)
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Unable to load pending users. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPendingUsers()
    return () => { active = false }
  }, [attempt])

  function refresh() {
    setLoading(true)
    setError('')
    setApprovalError(null)
    setAttempt((value) => value + 1)
  }

  async function approve(user) {
    if (approvalPending.current) return
    approvalPending.current = true
    setApprovingId(user.id)
    setApprovalError(null)
    try {
      await updateUser(user.id, { isActive: true })
      setUsers((current) => current.filter((item) => item.id !== user.id))
      toast.success(`${user.user_name} approved. They can now sign in.`)
    } catch (err) {
      setApprovalError({ id: user.id, message: err.response?.data?.message || 'Unable to approve user. Please try again.' })
    } finally {
      approvalPending.current = false
      setApprovingId(null)
    }
  }

  return (
    <div className="workspace-page workspace-list-page">
      <Link to="/admin" className="auth-back">← Back to dashboard</Link>
      <div className="workspace-toolbar">
        <div>
          <PageHeading>Approve users</PageHeading>
          <p className="mt-2">Activate inactive accounts so they can sign in.</p>
        </div>
        <button type="button" className="btn" disabled={loading || approvingId !== null} onClick={refresh}>Refresh</button>
      </div>

      <section className="workspace-panel mt-6" aria-label="Users awaiting approval" aria-busy={loading}>
        {loading ? <p role="status">Loading pending users…</p> : error ? (
          <div role="alert">
            <p>{error}</p>
            <button type="button" className="btn auth-submit btn-sm mt-3" onClick={refresh}>Try again</button>
          </div>
        ) : users.length === 0 ? <p role="status">No users awaiting approval.</p> : (
          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <caption className="sr-only">Inactive users awaiting admin approval</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.user_name}</td>
                    <td>{user.email}</td>
                    <td>{roles[user.role]?.label || user.role}</td>
                    <td><span className="badge badge-warning">Inactive</span></td>
                    <td className="text-right">
                      <button type="button" className="btn workspace-success btn-sm" disabled={approvingId !== null}
                        onClick={() => approve(user)} aria-label={`Approve ${user.user_name}`}>
                        {approvingId === user.id ? 'Approving…' : 'Approve'}
                      </button>
                      {approvalError?.id === user.id && <p role="alert" className="mt-2 text-sm text-error">{approvalError.message}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
