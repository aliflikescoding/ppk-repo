import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { deleteUser, readUsers } from '../api/index.js'
import { roles } from '../auth/auth.js'

const pageSize = 20

export default function Users() {
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const deleteDialog = useRef(null)

  function openDelete(user) {
    setSelectedUser(user)
    setDeleteError('')
    deleteDialog.current.showModal()
  }

  async function confirmDelete() {
    if (!selectedUser || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteUser(selectedUser.id)
      deleteDialog.current.close()
      setSelectedUser(null)
      toast.success('User deleted successfully.')
      if (users.length === 1 && page > 1) changePage(page - 1)
      else retry()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Unable to delete user. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadUsers() {
      try {
        const data = await readUsers(page, pageSize)
        if (active) setUsers(data)
      } catch (err) {
        if (active) {
          setError(err.response?.status === 403
            ? 'Only admins can view users.'
            : 'Unable to load users. Please try again.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUsers()
    return () => { active = false }
  }, [page, attempt])

  function changePage(nextPage) {
    setLoading(true)
    setError('')
    setPage(nextPage)
  }

  function retry() {
    setLoading(true)
    setError('')
    setAttempt((value) => value + 1)
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link to="/admin" className="link link-primary">
        Back to dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="mt-2">View registered users and their roles.</p>
        </div>
        <div>
          <Link to="/admin/createUser" className="btn">
            Create User
          </Link>
        </div>
      </div>

      <section
        className="mt-6 rounded-box border border-base-300 bg-base-100 p-4"
        aria-label="Users list"
        aria-busy={loading}
      >
        {loading ? (
          <p role="status">Loading users…</p>
        ) : error ? (
          <div role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={retry}
              className="btn btn-primary btn-sm mt-3"
            >
              Try again
            </button>
          </div>
        ) : users.length === 0 ? (
          <p role="status">
            {page === 1 ? "No users found." : "No more users on this page."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <caption className="sr-only">
                Registered users, page {page}
              </caption>
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
                    <td>
                      <span className="badge badge-outline">
                        {roles[user.role]?.label || user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive === true ? 'badge-success' : user.isActive === false ? 'badge-error' : 'badge-outline'}`}>
                        {user.isActive === true ? 'Active' : user.isActive === false ? 'Inactive' : 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/updateUser/${user.id}`} className="btn btn-sm" aria-label={`Edit ${user.user_name}`}>Edit</Link>
                        <button type="button" className="btn btn-error btn-sm" onClick={() => openDelete(user)} aria-label={`Delete ${user.user_name}`}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <nav
        className="mt-4 flex items-center justify-center gap-3"
        aria-label="Users pagination"
      >
        <button
          type="button"
          className="btn btn-sm"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
        >
          Previous
        </button>
        <span aria-live="polite">Page {page}</span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={loading || Boolean(error) || users.length < pageSize}
          onClick={() => changePage(page + 1)}
        >
          Next
        </button>
      </nav>
      <dialog ref={deleteDialog} className="modal" aria-labelledby="delete-title" aria-describedby="delete-description"
        onCancel={(event) => { if (deleting) event.preventDefault() }}>
        <div className="modal-box">
          <h2 id="delete-title" className="text-xl font-bold">Delete user</h2>
          <p id="delete-description" className="mt-3">
            Delete {selectedUser?.user_name} ({selectedUser?.email})? This cannot be undone.
          </p>
          {deleteError && <p role="alert" className="mt-3 text-error">{deleteError}</p>}
          <div className="modal-action">
            <button type="button" className="btn" autoFocus disabled={deleting} onClick={() => deleteDialog.current.close()}>Cancel</button>
            <button type="button" className="btn btn-error" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Deleting…' : 'Delete user'}</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
